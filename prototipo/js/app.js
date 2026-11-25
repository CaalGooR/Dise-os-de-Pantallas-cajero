/* ==========================================================================
   MODO · Kiosco de Cambio de Divisas — Lógica del prototipo (v2)
   --------------------------------------------------------------------------
   Flujo de 4 pantallas (según "Observaciones de la prueba", 14-nov-2026):
     1 · start    Inicio: tipo de cambio, tabla, idioma y privacidad
     2 · insert   Inserta tus dólares (contador en vivo, tope, rechazos)
     3 · confirm  Confirmación (tipo de cambio fijado; Cancelar solo con escrow)
     4 · deliver  Entrega: billetes → monedas → ticket
   Estados adicionales: fuera de servicio, incidencia, inventario, inactividad.

   [SUPUESTO] marcados en el código; ver resumen para confirmar con negocio.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ Configuración
     Una sola fuente: el tipo de cambio vive en CONFIG.rate y todas las pantallas
     lo leen desde aquí (letrero, inicio, tabla, contador, confirmación, ticket). */
  var CONFIG = {
    rate: 18.38,                 // MXN por 1 USD (compra) — tipo de cambio en vivo
    feeFree: true,               // "Sin comisión" visible en inicio
    showTable: false,            // tabla de equivalencias en inicio (propuesta B: sin tabla)
    capUSD: 800,                 // tope fijo por operación (documento)
    dynamicCap: false,           // tope dinámico (inventario bajo)
    dynamicCapUSD: 300,
    denominations: [1, 2, 5, 10, 20, 50, 100],   // billetes USD aceptados
    escrow: true,                // [SUPUESTO] receptor con escrow (pendiente de hardware)
    outOfService: false,
    failInventory: false,        // simula error de inventario al validar
    failDelivery: false,         // simula falla después de recibir el dinero
    idleEnabled: false,          // activar desde el panel
    validatingMs: 2400,
    billsMs: 2200,               // entrega: billetes
    coinsMs: 1800,               // entrega: monedas
    ticketMs: 1600,              // entrega: ticket
    returningMs: 2600,
    idleMs: 90000,
    idleCountdownS: 15,
    doneCountdownS: 30
  };

  var PREVIEW_AMOUNTS = [20, 100, 500, 800];   // tabla de equivalencias (documento)
  var USD_BILL_LABEL = function (d) { return '$' + d; };

  /* ------------------------------------------------------------------ DOM */
  var kiosk = document.getElementById('kiosk');
  var modalLayer = document.getElementById('modalLayer');
  function $(sel, root) { return (root || kiosk).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || kiosk).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ Estado */
  var state = {
    screen: 'start',
    lang: 'es',                  // español por defecto; las banderas solo cambian el idioma
    bills: {},                   // { denominación USD: cantidad }
    lastBill: null,
    notice: null,                // { key, params }
    deal: null,                  // { usd, rate } fijado al entrar a Confirmación
    phase: 0,                    // entrega: 0 billetes · 1 monedas · 2 ticket · 3 listo
    receipt: null,               // { folio, stamp, usd, rate, cents }
    incident: null,              // { folio, stamp, usd, reason }
    modal: null,
    holdModal: false
  };

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  /* ------------------------------------------------------------------ Utilidades */
  var nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function pad(n, w) { return String(n).padStart(w || 2, '0'); }
  function randDigits(n) { var s = ''; while (s.length < n) s += Math.floor(Math.random() * 10); return s; }
  function nowStamp() {
    var d = new Date();
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* Tipo de cambio y tope (fuente única) */
  function rateCents() { return Math.round(CONFIG.rate * 100); }
  function capUSD() { return CONFIG.dynamicCap ? CONFIG.dynamicCapUSD : CONFIG.capUSD; }
  function insertedUSD() {
    return Object.keys(state.bills).reduce(function (s, d) { return s + Number(d) * state.bills[d]; }, 0);
  }
  function isLocked() { return insertedUSD() >= capUSD(); }

  /* [SUPUESTO] Centavos: no hay monedas de 1 ni 2 centavos, así que el monto en MXN
     se redondea hacia abajo a múltiplos de 5 centavos (a favor del kiosco). */
  function mxnCents(usd, rc) { return Math.floor(usd * rc / 5) * 5; }

  /* Formato de montos: "$" + número mono + moneda */
  function money(cents, cur) {
    return '<span class="money"><span class="money__sym">$</span><span class="num">' + nf2.format(cents / 100) + '</span>' +
      (cur ? '<span class="money__cur">' + cur + '</span>' : '') + '</span>';
  }

  /* ------------------------------------------------------------------ i18n */
  function tIn(lang, key, params) {
    var dict = global.I18N[lang] || global.I18N.es;
    var s = dict[key] != null ? dict[key] : key;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
  }
  function t(key, params) { return tIn(state.lang || 'es', key, params); }
  function tHTML(key, params) { return t(key, params); }
  function applyI18n() {
    $$('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }

  /* ------------------------------------------------------------------ Bind */
  function bindHTML(name, html) { $$('[data-bind="' + name + '"]').forEach(function (el) { el.innerHTML = html; }); }
  function bindText(name, text) { $$('[data-bind="' + name + '"]').forEach(function (el) { el.textContent = text; }); }
  function bindHidden(name, hidden) { $$('[data-bind="' + name + '"]').forEach(function (el) { el.hidden = hidden; }); }

  /* ------------------------------------------------------------------ Timers */
  var flowTimers = [];
  var idleTimer = null, idleTick = null, doneTick = null;
  function later(fn, ms) { flowTimers.push(setTimeout(fn, ms)); }
  function clearFlowTimers() {
    flowTimers.forEach(clearTimeout); flowTimers = [];
    clearInterval(doneTick); doneTick = null;
  }

  /* ------------------------------------------------------------------ Reloj */
  function tick() {
    var now = new Date();
    var loc = state.lang === 'en' ? 'en-US' : 'es-MX';
    $('#clockDate').textContent = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    $('#clockTime').textContent = now.toLocaleTimeString('en-GB');
  }

  /* ------------------------------------------------------------------ Idioma */
  function setLang(lang) {
    state.lang = lang || 'es';
    document.documentElement.lang = state.lang;
    applyI18n();
    tick();
    render();
  }

  /* ------------------------------------------------------------------ Sesión */
  function resetSession() {
    state.bills = {}; state.lastBill = null; state.notice = null;
    state.deal = null; state.phase = 0; state.receipt = null; state.incident = null;
  }

  /* Fin de la sesión: el siguiente cliente empieza de nuevo, en español por defecto */
  function endFlow() {
    state.lang = 'es';
    document.documentElement.lang = 'es';
    go('start');
    applyI18n();
    tick();
    render();
  }

  /* ------------------------------------------------------------------ Acciones de pantalla */
  function startSession() {
    go('insert');
  }
  function validate() {
    if (insertedUSD() <= 0) return;
    openModal('validating');
    later(function () {
      if (CONFIG.failInventory) openError();
      else { closeModal(); go('confirm'); }
    }, CONFIG.validatingMs);
  }

  /* Cancelar en "Inserta tus dólares": sin billetes vuelve al inicio; con billetes pide confirmación
     y los devuelve (escrow). */
  function cancelInsert() {
    if (insertedUSD() > 0) openModal('cancel');
    else { clearFlowTimers(); endFlow(); }
  }

  function requestCancel() {
    if (!CONFIG.escrow) return;             // sin escrow no hay cancelación
    openModal('cancel');
  }

  function openError(hold) {
    bindText('error.text', t(CONFIG.escrow ? 'error.textEscrow' : 'error.textNoEscrow'));
    openModal('error', { hold: hold });
  }

  function afterFailure() {
    if (insertedUSD() > 0) returnOrExit('inventory');
    else endFlow();
  }

  /* Dinero ya recibido: con escrow se devuelve; sin escrow se entrega comprobante de incidencia */
  function returnOrExit(reason) {
    if (insertedUSD() <= 0) { endFlow(); return; }
    if (CONFIG.escrow) returnBills(false);
    else openIncident(reason || 'abandon');
  }

  function returnBills(hold) {
    clearFlowTimers();
    openModal('returning', { hold: hold });
    if (hold) return;
    later(function () { closeModal(); endFlow(); }, CONFIG.returningMs);
  }

  function openIncident(reason) {
    closeModal();
    var folio = 'INC' + randDigits(8);
    state.incident = { folio: folio, stamp: nowStamp(), usd: insertedUSD(), reason: reason };
    go('incident');
  }

  /* Entrega: billetes → monedas → ticket (el ticket se imprime durante la entrega) */
  function startDeliver(opts) {
    var deal = state.deal;
    var cents = mxnCents(deal.usd, deal.rate);
    state.receipt = {
      folio: 'MO101030' + randDigits(6),
      stamp: nowStamp(),
      usd: deal.usd,
      rate: deal.rate,
      cents: cents
    };
    state.phase = 0;
    if (opts && opts.hold) { state.phase = opts.phase || 0; render(); return; }
    later(function () { setPhase(1); }, CONFIG.billsMs);
    later(function () {
      if (CONFIG.failDelivery) openIncident('delivery');
      else setPhase(2);
    }, CONFIG.billsMs + CONFIG.coinsMs);
    later(function () { setPhase(3); }, CONFIG.billsMs + CONFIG.coinsMs + CONFIG.ticketMs);
  }
  function setPhase(p) {
    state.phase = p;
    render();
    if (p === 3 && CONFIG.idleEnabled) startDoneCountdown();
  }

  function finish() { endFlow(); }

  function startDoneCountdown() {
    var el = $('[data-bind="dv.count"]');
    var n = CONFIG.doneCountdownS;
    el.hidden = false;
    el.textContent = t('deliver.countdown', { n: n });
    clearInterval(doneTick);
    doneTick = setInterval(function () {
      n -= 1;
      el.textContent = t('deliver.countdown', { n: n });
      if (n <= 0) { clearInterval(doneTick); doneTick = null; endFlow(); }
    }, 1000);
  }

  /* ------------------------------------------------------------------ Definición de pantallas */
  var SCREENS = {
    start: {
      step: 0,
      onEnter: function () { resetSession(); },
      actions: function () {
        return {
          secondary: null,
          primary: { key: 'btn.start', variant: 'cyan', onClick: startSession }
        };
      }
    },
    insert: {
      step: 2,
      onEnter: function () { state.deal = null; },
      actions: function () {
        return {
          secondary: { key: 'btn.cancel', variant: 'danger', onClick: cancelInsert },
          primary: { key: 'btn.finish', variant: 'cyan', enabled: insertedUSD() > 0, onClick: validate }
        };
      }
    },
    confirm: {
      step: 3,
      onEnter: function () { state.deal = { usd: insertedUSD(), rate: rateCents() }; },   // tipo de cambio fijado
      actions: function () {
        return {
          secondary: CONFIG.escrow ? { key: 'btn.cancel', variant: 'ghost', onClick: requestCancel } : null,
          primary: { key: 'btn.confirm', variant: 'cyan', onClick: function () { go('deliver'); } }
        };
      }
    },
    deliver: {
      step: 4,
      onEnter: function (opts) { startDeliver(opts); },
      actions: function () {
        return {
          secondary: null,
          primary: state.phase === 3 ? { key: 'deliver.done', variant: 'cyan', onClick: finish } : null
        };
      }
    },
    incident: {
      step: 4,
      actions: function () {
        return { secondary: null, primary: { key: 'deliver.done', variant: 'cyan', onClick: finish } };
      }
    },
    oos: {
      step: 0,
      actions: function () { return { secondary: null, primary: null }; }
    }
  };

  /* ------------------------------------------------------------------ Navegación */
  function go(screen, opts) {
    clearFlowTimers();
    state.screen = screen;
    state.notice = null;
    kiosk.dataset.screen = screen;
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.dataset.id === screen); });
    var def = SCREENS[screen];
    $('#stepper').hidden = !def.step;
    if (def.onEnter) def.onEnter(opts);
    render();
    resetIdle();
  }

  /* ------------------------------------------------------------------ Billetes */
  var noticeTimer = null;
  function showNotice(key, params, sticky) {
    state.notice = { key: key, params: params };
    clearTimeout(noticeTimer);
    if (!sticky) noticeTimer = setTimeout(function () { state.notice = null; render(); }, 4800);
    render();
  }

  function insertBill(d) {
    if (state.screen !== 'insert' || state.modal) return;
    if (isLocked()) { showNotice('insert.capReached', { max: nf0.format(capUSD()) }); return; }
    if (insertedUSD() + d > capUSD()) { showNotice('reject.cap', { max: nf0.format(capUSD()) }); return; }
    state.notice = null;
    state.bills[d] = (state.bills[d] || 0) + 1;
    state.lastBill = d;
    render();
    var tile = $('[data-bind="ins.entered"]');
    if (tile) { tile.classList.remove('is-bump'); void tile.offsetWidth; tile.classList.add('is-bump'); }
    setTimeout(function () { state.lastBill = null; }, 700);
    resetIdle();
  }

  function rejectBill(reason) {
    if (state.screen !== 'insert' || state.modal) return;
    showNotice('reject.' + (reason || 'damaged'), null, false);
  }

  /* ------------------------------------------------------------------ Modales */
  function openModal(name, opts) {
    state.modal = name;
    state.holdModal = !!(opts && opts.hold);
    modalLayer.classList.add('is-open');
    $$('.modal').forEach(function (m) { m.classList.toggle('is-open', m.dataset.modalId === name); });
    emit();
  }
  function closeModal() {
    state.modal = null; state.holdModal = false;
    modalLayer.classList.remove('is-open');
    $$('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    emit();
  }

  /* ------------------------------------------------------------------ Inactividad */
  var IDLE_SCREENS = ['insert', 'confirm'];

  function resetIdle() {
    clearTimeout(idleTimer);
    if (state.modal === 'idle') return;
    if (!CONFIG.idleEnabled || IDLE_SCREENS.indexOf(state.screen) < 0 || state.modal) return;
    idleTimer = setTimeout(openIdle, CONFIG.idleMs);
  }

  function openIdle(opts) {
    var n = CONFIG.idleCountdownS;
    bindText('idle.text', t('idle.text', { n: n }));
    openModal('idle', opts);
    if (opts && opts.hold) return;
    clearInterval(idleTick);
    idleTick = setInterval(function () {
      n -= 1;
      bindText('idle.text', t('idle.text', { n: n }));
      if (n <= 0) { clearInterval(idleTick); idleTick = null; closeModal(); returnOrExit('abandon'); }
    }, 1000);
  }
  function stopIdleCountdown() { clearInterval(idleTick); idleTick = null; }

  /* ------------------------------------------------------------------ Render */
  function setBtn(btn, cfg) {
    if (!cfg) { btn.hidden = true; btn.onclick = null; return; }
    btn.hidden = false;
    btn.className = 'btn btn--' + cfg.variant;
    btn.disabled = cfg.enabled === false;
    btn.querySelector('.btn__label').innerHTML = cfg.label != null ? cfg.label : tHTML(cfg.key);
    btn.onclick = cfg.onClick;
  }

  function renderStepper() {
    var cur = SCREENS[state.screen].step;
    $$('.step').forEach(function (li) {
      var n = Number(li.dataset.step);
      var st = n < cur ? 'done' : (n === cur ? 'active' : 'todo');
      li.dataset.state = st;
      li.querySelector('.step__dot').innerHTML = st === 'done' ? '<svg class="icon"><use href="#i-check"/></svg>' : String(n);
    });
  }

  function renderStart() {
    var rc = rateCents();
    bindText('rate', (rc / 100).toFixed(2));
    $('[data-id="start"]').classList.toggle('is-notable', !CONFIG.showTable);
    bindHidden('fee', !CONFIG.feeFree);
    bindHidden('cap.note', !CONFIG.dynamicCap);
    bindHTML('cap.note', tHTML('rate.capNote', { max: nf0.format(CONFIG.dynamicCapUSD) }));
    bindHTML('table.rows', PREVIEW_AMOUNTS.map(function (usd) {
      return '<li class="tbl__row"><span class="tbl__usd"><span class="num">' + nf0.format(usd) + '</span><small>USD</small></span>' +
        '<span class="tbl__arrow" aria-hidden="true">\u2192</span>' +
        '<span class="tbl__mxn">' + money(mxnCents(usd, rc), 'MXN') + '</span></li>';
    }).join(''));
    $$('[data-lang]', $('#langGroup')).forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.lang === state.lang);
    });
  }

  function renderInsert() {
    var ins = insertedUSD();
    var cap = capUSD();
    var locked = isLocked();
    var rc = rateCents();
    bindHTML('ins.entered', money(ins * 100, 'USD'));
    bindHTML('ins.receive', money(mxnCents(ins, rc), 'MXN'));
    bindText('ins.rate', (rc / 100).toFixed(2));
    bindText('ins.limit', t('insert.limit', { max: nf0.format(cap) }));
    var bar = $('[data-bind="ins.bar"]');
    if (bar) bar.style.width = Math.min(100, (ins / cap) * 100) + '%';
    bindHidden('ins.banner', !locked);
    bindHTML('ins.banner', tHTML('insert.capReached', { max: nf0.format(cap) }));
    $('[data-id="insert"]').classList.toggle('is-locked', locked);
    // Receptor bloqueado (tope alcanzado): el clip se detiene y se apaga; se reanuda al desbloquear
    var clip = $('[data-id="insert"] .ins__art video');
    if (clip) {
      if (locked) clip.pause();
      else if (clip.paused) { var pr = clip.play(); if (pr && pr.catch) pr.catch(function () {}); }
    }
    var dens = Object.keys(state.bills).map(Number).sort(function (x, y) { return y - x; });
    $('[data-bind="ins.feed"]').classList.toggle('is-empty', dens.length === 0);
    bindHTML('ins.list', dens.map(function (d) {
      var c = state.bills[d];
      return '<li class="bill-row' + (state.lastBill === d ? ' is-new' : '') + '">' +
        '<span class="bill" data-denom="' + d + '"><b>' + USD_BILL_LABEL(d) + '</b></span>' +
        '<span class="bill-row__qty">\u00d7 ' + c + '</span>' +
        '<span class="bill-row__sub num">' + nf0.format(d * c) + '</span></li>';
    }).join(''));
    var notice = $('[data-bind="notice"]');
    notice.hidden = !state.notice;
    if (state.notice) bindHTML('notice.text', tHTML(state.notice.key, state.notice.params));
  }

  function renderConfirm() {
    var deal = state.deal || { usd: insertedUSD(), rate: rateCents() };
    var cents = mxnCents(deal.usd, deal.rate);
    bindHTML('cf.usd', money(deal.usd * 100, 'USD'));
    bindHTML('cf.mxn', money(cents, 'MXN'));
    bindText('cf.rate', (deal.rate / 100).toFixed(2));
  }

  function renderDeliver() {
    var r = state.receipt;
    var ph = state.phase;
    var done = ph === 3;
    bindText('dv.title', t(done ? 'deliver.ready' : 'deliver.title'));
    $('[data-bind="dv.spin"]').hidden = done;
    $('[data-bind="dv.ok"]').hidden = !done;
    if (!r) return;
    $$('[data-phase]', kiosk).forEach(function (li) {
      var p = Number(li.dataset.phase);
      var st = done || p < ph ? 'done' : (p === ph ? 'active' : 'todo');
      li.dataset.state = st;
      li.querySelector('.dv__dot').innerHTML = st === 'done' ? '<svg class="icon"><use href="#i-check"/></svg>' : '';
    });
    $('[data-bind="dv.printing"]').hidden = ph >= 2;
    $('[data-bind="dv.receipt"]').hidden = ph < 2;
    bindText('dv.folio', r.folio);
    bindText('dv.date', r.stamp);
    bindHTML('dv.usd', money(r.usd * 100, 'USD'));
    bindText('dv.rate', (r.rate / 100).toFixed(2));
    bindHTML('dv.mxn', money(r.cents, 'MXN'));
    if (!done) bindHidden('dv.count', true);
  }

  function renderIncident() {
    var inc = state.incident;
    if (!inc) return;
    bindText('inc.folio', inc.folio);
    bindText('inc.date', inc.stamp);
    bindHTML('inc.usd', money(inc.usd * 100, 'USD'));
  }

  function render() {
    applyI18n();
    /* Pantalla activa */
    var s = state.screen;
    if (s === 'start') renderStart();
    if (s === 'insert') renderInsert();
    if (s === 'confirm') renderConfirm();
    if (s === 'deliver') renderDeliver();
    if (s === 'incident') renderIncident();
    /* Chrome común */
    renderStepper();
    var cfg = SCREENS[s].actions();
    kiosk.classList.toggle('has-langs', s === 'start');
    setBtn($('#btnSecondary'), cfg.secondary);
    setBtn($('#btnPrimary'), cfg.primary);
    emit();
  }

  /* ------------------------------------------------------------------ Salto directo (revisión de diseño) */
  var SAMPLES = {
    partial: { 20: 2, 5: 1, 1: 3 },   // 48 USD
    confirm: { 5: 1 }                  // 5 USD
  };
  function fullCap() {
    var cap = capUSD(), n = Math.floor(cap / 100), b = {};
    if (n) b[100] = n;
    if (cap - n * 100) b[1] = cap - n * 100;
    return b;
  }
  function setBills(b) { state.bills = JSON.parse(JSON.stringify(b)); state.lastBill = null; }
  function makeDeal() { state.deal = { usd: insertedUSD(), rate: rateCents() }; }

  function jump(id) {
    clearFlowTimers(); stopIdleCountdown(); closeModal();
    resetSession();
    switch (id) {
      case 'start': go('start'); break;
      case 'insert-empty': go('insert'); break;
      case 'insert-partial': setBills(SAMPLES.partial); go('insert'); break;
      case 'insert-cap': setBills(fullCap()); go('insert'); break;
      case 'confirm': setBills(SAMPLES.confirm); go('confirm'); break;
      case 'deliver-run': setBills(SAMPLES.confirm); go('confirm'); go('deliver', { hold: true, phase: 1 }); break;
      case 'deliver': setBills(SAMPLES.confirm); go('confirm'); go('deliver', { hold: true, phase: 3 }); break;
      case 'incident': setBills(SAMPLES.confirm); go('insert'); openIncident('delivery'); break;
      case 'oos': go('oos'); break;
      case 'modal:validating': setBills(SAMPLES.partial); go('insert'); openModal('validating', { hold: true }); break;
      case 'modal:cancel': setBills(SAMPLES.partial); go('confirm'); openModal('cancel', { hold: true }); break;
      case 'modal:returning': setBills(SAMPLES.partial); go('insert'); returnBills(true); break;
      case 'modal:error': setBills(SAMPLES.partial); go('insert'); openError(true); break;
      case 'modal:idle': setBills(SAMPLES.partial); go('insert'); openIdle({ hold: true }); break;
      case 'notice:reject': setBills(SAMPLES.partial); go('insert'); showNotice('reject.misplaced', null, true); break;
      default: go('start');
    }
  }

  /* ------------------------------------------------------------------ Controles del panel */
  function setRate(v) {
    CONFIG.rate = Math.round(v * 100) / 100;
    render();
  }
  function setOutOfService(on) {
    CONFIG.outOfService = !!on;
    clearFlowTimers(); stopIdleCountdown(); closeModal(); resetSession();
    go(on ? 'oos' : 'start');
  }

  /* ------------------------------------------------------------------ Eventos */
  kiosk.addEventListener('click', function (e) {
    var langEl = e.target.closest('[data-lang]');
    if (langEl) { setLang(langEl.dataset.lang); return; }

    var act = e.target.closest('[data-action]');
    if (!act) {
      if (e.target === modalLayer && state.holdModal) closeModal();
      return;
    }
    switch (act.dataset.action) {
      case 'cancel-keep': closeModal(); resetIdle(); break;
      case 'cancel-yes': closeModal(); returnOrExit('cancel'); break;
      case 'error-ok': closeModal(); afterFailure(); break;
      case 'idle-ok': stopIdleCountdown(); closeModal(); resetIdle(); break;
    }
  });

  kiosk.addEventListener('pointerdown', function () { if (state.modal !== 'idle') resetIdle(); });

  /* ------------------------------------------------------------------ Init */
  applyI18n();
  tick();
  setInterval(tick, 1000);
  go('start');

  /* ------------------------------------------------------------------ API pública (panel de revisión) */
  global.Kiosk = {
    CONFIG: CONFIG,
    state: state,
    t: t,
    go: go,
    jump: jump,
    setLang: setLang,
    setRate: setRate,
    setOutOfService: setOutOfService,
    render: render,
    insertBill: insertBill,
    rejectBill: rejectBill,
    resetIdle: resetIdle,
    stopIdleCountdown: stopIdleCountdown,
    reset: function () { clearFlowTimers(); stopIdleCountdown(); closeModal(); CONFIG.outOfService = false; endFlow(); },
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
