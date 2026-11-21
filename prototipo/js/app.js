/* ==========================================================================
   MODO · Kiosco de Cambio de Divisas — Lógica del prototipo
   --------------------------------------------------------------------------
   Simula el flujo completo:
     welcome → privacy → amount → bills → (validando) → confirm → delivering → done
   Más estados "improvisados": cancelar, devolver billetes, error de inventario,
   billete rechazado, límite de monto e inactividad.

   Supuestos a validar con negocio (marcados con [SUPUESTO]):
     • El efectivo entregado se redondea hacia abajo a pesos enteros.
       (En las referencias: 5 USD × 18.38 = 91.90 → se entrega 91.00).
     • El kiosco compra TODO lo insertado (no devuelve USD sobrantes).
     • Límite por operación: 1 a 1,000 USD.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ Config */
  var CONFIG = {
    rate: 18.38,                 // MXN por 1 USD (compra)
    minUSD: 1,
    maxUSD: 1000,                // [SUPUESTO]
    denominations: [1, 2, 5, 10, 20, 50, 100],
    validatingMs: 2400,
    deliveringMs: 4800,
    returningMs: 2600,
    idleMs: 90000,
    idleCountdownS: 15,
    doneCountdownS: 30,
    idleEnabled: false,          // activar desde el panel (molesta al revisar diseño)
    failInventory: false         // simula error de inventario al validar
  };
  var RATE_CENTS = Math.round(CONFIG.rate * 100);

  /* ------------------------------------------------------------------ DOM */
  var kiosk = document.getElementById('kiosk');
  var modalLayer = document.getElementById('modalLayer');
  function $(sel, root) { return (root || kiosk).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || kiosk).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ Estado */
  var state = {
    screen: 'welcome',
    lang: 'es',
    amount: '',          // dígitos tecleados (string)
    bills: {},           // { denominacion: cantidad }
    lastBill: null,
    notice: null,        // { key, params }
    modal: null,
    holdModal: false,    // modal "fijo" (para revisión de diseño)
    hintError: false,
    folio: null,
    stamp: null
  };

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  /* ------------------------------------------------------------------ i18n */
  function t(key, params) {
    var dict = global.I18N[state.lang] || global.I18N.es;
    var s = dict[key] != null ? dict[key] : key;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
  }
  function applyI18n() {
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }

  /* ------------------------------------------------------------------ Formato / cálculo */
  var nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  function money(n, cur, approx) {
    return (approx ? '<span class="approx">\u2248</span>' : '') +
      '<span class="amt">$' + nf2.format(n) + '</span><span class="cur">' + cur + '</span>';
  }
  function moneyText(n, cur) { return '$' + nf2.format(n) + ' ' + cur; }

  function amountUSD() { return parseInt(state.amount || '0', 10); }
  function insertedUSD() {
    return Object.keys(state.bills).reduce(function (s, d) { return s + Number(d) * state.bills[d]; }, 0);
  }
  function mxnFor(usd) { return Math.floor(usd * RATE_CENTS / 100); }   // [SUPUESTO] redondeo hacia abajo
  function isEnough() { return amountUSD() > 0 && insertedUSD() >= amountUSD(); }

  /* ------------------------------------------------------------------ Bind */
  function bindHTML(name, html) { $$('[data-bind="' + name + '"]').forEach(function (el) { el.innerHTML = html; }); }
  function bindText(name, text) { $$('[data-bind="' + name + '"]').forEach(function (el) { el.textContent = text; }); }

  /* ------------------------------------------------------------------ Timers */
  var flowTimers = [];
  var idleTimer = null, idleTick = null, doneTick = null;

  function later(fn, ms) { var id = setTimeout(fn, ms); flowTimers.push(id); return id; }
  function clearFlowTimers() {
    flowTimers.forEach(clearTimeout); flowTimers = [];
    clearInterval(doneTick); doneTick = null;
  }

  /* ------------------------------------------------------------------ Reloj */
  function tick() {
    var now = new Date();
    var loc = state.lang === 'es' ? 'es-MX' : 'en-US';
    $('#clockDate').textContent = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    $('#clockTime').textContent = now.toLocaleTimeString('en-GB');
  }

  /* ------------------------------------------------------------------ Definición de pantallas */
  function setLang(lang) {
    state.lang = lang;
    document.documentElement.lang = lang;
    applyI18n();
    tick();
    render();
  }

  var SCREENS = {
    welcome: {
      step: 0,
      actions: function () {
        return {
          secondary: { label: 'ENGLISH', flag: 'us', variant: 'lang', active: state.lang === 'en', onClick: function () { setLang('en'); } },
          primary: { label: 'ESPA\u00d1OL', flag: 'mx', variant: 'lang', active: state.lang === 'es', onClick: function () { setLang('es'); } }
        };
      },
      onEnter: function () { resetSession(); }
    },
    privacy: {
      step: 0,
      actions: function () {
        return {
          secondary: { key: 'btn.decline', variant: 'ghost', onClick: function () { go('welcome'); } },
          primary: { key: 'btn.accept', variant: 'cyan', onClick: function () { go('amount'); } }
        };
      }
    },
    amount: {
      step: 1,
      actions: function () {
        return {
          secondary: { key: 'btn.back', variant: 'danger', onClick: function () { go('welcome'); } },
          primary: { key: 'btn.continue', variant: 'success', enabled: amountUSD() >= CONFIG.minUSD, onClick: toBills }
        };
      }
    },
    bills: {
      step: 2,
      actions: function () {
        return {
          secondary: { key: 'btn.cancel', variant: 'danger', onClick: requestCancel },
          primary: { key: 'btn.continue', variant: 'success', enabled: isEnough(), onClick: validate }
        };
      }
    },
    confirm: {
      step: 3,
      actions: function () {
        return {
          secondary: { key: 'btn.cancel', variant: 'danger', onClick: requestCancel },
          primary: { key: 'btn.confirm', variant: 'success', onClick: deliver }
        };
      }
    },
    delivering: {
      step: 4,
      actions: function () { return {}; },
      onEnter: function () { later(finish, CONFIG.deliveringMs); }
    },
    done: {
      step: 5,   // todos los pasos completados
      actions: function () {
        return { primary: { key: 'btn.continue', variant: 'cyan', onClick: function () { go('welcome'); } } };
      },
      onEnter: function () { startDoneCountdown(); }
    }
  };

  /* ------------------------------------------------------------------ Navegación */
  function go(screen) {
    clearFlowTimers();
    state.screen = screen;
    state.notice = null;
    kiosk.dataset.screen = screen;
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.dataset.id === screen); });
    var def = SCREENS[screen];
    $('#stepper').hidden = !def.step;
    if (def.onEnter) def.onEnter();
    render();
    resetIdle();
  }

  function resetSession() {
    state.amount = ''; state.bills = {}; state.lastBill = null;
    state.notice = null; state.hintError = false; state.folio = null; state.stamp = null;
  }

  function toBills() {
    if (amountUSD() < CONFIG.minUSD) return;
    state.bills = {};
    go('bills');
  }

  /* ------------------------------------------------------------------ Paso 3: teclado */
  var hintTimer = null;
  function pressKey(k) {
    if (state.screen !== 'amount' || state.modal) return;
    if (k === 'back') {
      state.amount = state.amount.slice(0, -1);
    } else if (k === 'clear') {
      state.amount = '';
    } else {
      var next = (state.amount + k).replace(/^0+/, '');
      if (next === '') return;
      if (parseInt(next, 10) > CONFIG.maxUSD) {
        state.hintError = true;
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { state.hintError = false; render(); }, 2600);
        render();
        return;
      }
      state.amount = next;
    }
    state.hintError = false;
    render();
  }

  /* ------------------------------------------------------------------ Paso 4: billetes */
  var noticeTimer = null;
  function showNotice(key, params, sticky) {
    state.notice = { key: key, params: params };
    clearTimeout(noticeTimer);
    if (!sticky) noticeTimer = setTimeout(function () { state.notice = null; render(); }, 4800);
    render();
  }

  function insertBill(d) {
    if (state.screen !== 'bills' || state.modal) return;
    if (insertedUSD() + d > CONFIG.maxUSD) {
      showNotice('bills.limit', { max: '$' + nf0.format(CONFIG.maxUSD) });
      return;
    }
    state.notice = null;
    state.bills[d] = (state.bills[d] || 0) + 1;
    state.lastBill = d;
    render();
    var tile = $('[data-bind="inserted.tile"]');
    tile.classList.remove('is-bump'); void tile.offsetWidth; tile.classList.add('is-bump');
    setTimeout(function () { state.lastBill = null; }, 700);
    resetIdle();
  }

  function rejectBill(sticky) {
    if (state.screen !== 'bills' || state.modal) return;
    showNotice('bills.rejected', null, !!sticky);
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

  function validate() {
    if (!isEnough()) return;
    openModal('validating');
    later(function () {
      if (CONFIG.failInventory) { openModal('error'); }
      else { closeModal(); go('confirm'); }
    }, CONFIG.validatingMs);
  }

  function requestCancel() {
    if (state.screen === 'bills' && insertedUSD() === 0) { go('welcome'); return; }
    bindText('cancel.text', insertedUSD() > 0 ? t('cancel.textBills') : t('cancel.text'));
    openModal('cancel');
  }

  function returnBills(hold) {
    clearFlowTimers();
    openModal('returning', { hold: hold });
    if (hold) return;
    later(function () { closeModal(); go('welcome'); }, CONFIG.returningMs);
  }

  function endSession() {
    closeModal();
    if (insertedUSD() > 0) returnBills(false); else go('welcome');
  }

  function deliver() { go('delivering'); }

  function finish() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    state.folio = 'MO101030' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
    state.stamp = p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    go('done');
  }

  function startDoneCountdown() {
    var el = $('[data-bind="done.countdown"]');
    el.hidden = !CONFIG.idleEnabled;
    if (!CONFIG.idleEnabled) return;
    var n = CONFIG.doneCountdownS;
    el.textContent = t('done.countdown', { n: n });
    doneTick = setInterval(function () {
      n -= 1;
      el.textContent = t('done.countdown', { n: n });
      if (n <= 0) { clearInterval(doneTick); go('welcome'); }
    }, 1000);
  }

  /* ------------------------------------------------------------------ Inactividad */
  var IDLE_SCREENS = ['privacy', 'amount', 'bills', 'confirm'];

  function resetIdle() {
    clearTimeout(idleTimer);
    if (state.modal === 'idle') return;
    if (!CONFIG.idleEnabled || IDLE_SCREENS.indexOf(state.screen) < 0 || state.modal) return;
    idleTimer = setTimeout(openIdle, CONFIG.idleMs);
  }

  function openIdle() {
    var n = CONFIG.idleCountdownS;
    bindText('idle.text', t('idle.text', { n: n }));
    openModal('idle');
    clearInterval(idleTick);
    idleTick = setInterval(function () {
      n -= 1;
      bindText('idle.text', t('idle.text', { n: n }));
      if (n <= 0) { clearInterval(idleTick); endSession(); }
    }, 1000);
  }

  function stopIdleCountdown() { clearInterval(idleTick); idleTick = null; }

  /* ------------------------------------------------------------------ Render */
  function setBtn(btn, cfg) {
    if (!cfg) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.className = 'btn btn--' + cfg.variant + (cfg.active ? ' is-active' : '');
    btn.disabled = cfg.enabled === false;
    btn.querySelector('.btn__label').textContent = cfg.label != null ? cfg.label : t(cfg.key);
    var flag = btn.querySelector('.btn__flag');
    // Los <svg> no tienen la propiedad .hidden: se usa el atributo directamente
    if (cfg.flag) { flag.removeAttribute('hidden'); flag.firstElementChild.setAttribute('href', '#flag-' + cfg.flag); }
    else { flag.setAttribute('hidden', ''); }
    btn.onclick = cfg.onClick;
  }

  function renderStepper() {
    var cur = SCREENS[state.screen].step;
    $$('.step').forEach(function (li) {
      var n = Number(li.dataset.step);
      var st = cur === 5 || n < cur ? 'done' : (n === cur ? 'active' : 'todo');
      li.dataset.state = st;
      li.querySelector('.step__dot').innerHTML = st === 'done'
        ? '<svg class="icon"><use href="#i-check"/></svg>'
        : String(n);
    });
  }

  function render() {
    var rate = CONFIG.rate.toFixed(2);
    bindText('rate', rate);

    /* Paso 3 — monto */
    var a = amountUSD();
    var entry = $('[data-bind="entry"]');
    entry.classList.toggle('is-empty', a === 0);
    entry.classList.toggle('is-error', state.hintError);
    bindText('entry.value', '$' + nf0.format(a));
    bindHTML('amount.usd', money(a, 'USD'));
    bindHTML('amount.mxn', money(mxnFor(a), 'MXN', true));
    var hint = $('[data-bind="amount.hint"]');
    hint.classList.toggle('is-error', state.hintError);
    hint.textContent = state.hintError
      ? t('amount.max', { max: '$' + nf0.format(CONFIG.maxUSD) })
      : t('amount.limit', { min: '$' + CONFIG.minUSD, max: '$' + nf0.format(CONFIG.maxUSD) });

    /* Paso 4 — billetes */
    var ins = insertedUSD();
    var enough = isEnough();
    bindHTML('bills.target', money(a, 'USD'));
    bindHTML('bills.inserted', money(ins, 'USD'));
    bindHTML('bills.mxn', money(mxnFor(ins), 'MXN', true));
    $('[data-bind="target.tile"]').classList.toggle('is-ok', enough);
    $('[data-bind="inserted.tile"]').classList.toggle('is-ok', enough);

    var dens = Object.keys(state.bills).map(Number).sort(function (x, y) { return y - x; });
    bindHTML('bill.list', dens.map(function (d) {
      var c = state.bills[d];
      return '<li class="bill-row' + (state.lastBill === d ? ' is-new' : '') + '">' +
        '<span class="bill" data-denom="' + d + '"><b>' + d + '</b></span>' +
        '<span class="bill-row__qty">\u00d7 ' + c + '</span>' +
        '<span class="bill-row__sub">= $' + nf0.format(d * c) + '</span></li>';
    }).join(''));
    $('[data-bind="feed"]').classList.toggle('is-empty', dens.length === 0);

    var notice = $('[data-bind="notice"]');
    notice.hidden = !state.notice;
    if (state.notice) bindText('notice.text', t(state.notice.key, state.notice.params));

    /* Paso 5 — confirmación / 6 — entrega / 7 — resultado */
    var mxn = mxnFor(ins);
    bindHTML('confirm.amount', money(a, 'USD'));
    bindHTML('confirm.inserted', money(ins, 'USD'));
    bindHTML('confirm.mxn', money(mxn, 'MXN'));
    bindHTML('deliver.mxn', money(mxn, 'MXN'));
    bindHTML('done.amount', money(a, 'USD'));
    bindHTML('done.inserted', money(ins, 'USD'));
    bindHTML('done.mxn', money(mxn, 'MXN'));
    bindText('done.folio', state.folio || '—');
    bindText('done.date', state.stamp || '—');

    /* Chrome común */
    renderStepper();
    var cfg = SCREENS[state.screen].actions();
    setBtn($('#btnSecondary'), cfg.secondary);
    setBtn($('#btnPrimary'), cfg.primary);
    emit();
  }

  /* ------------------------------------------------------------------ Salto directo (revisión de diseño) */
  function jump(id) {
    clearFlowTimers(); stopIdleCountdown(); closeModal();
    resetSession();
    var bills = {
      empty: { amount: '5', bills: {} },
      partial: { amount: '100', bills: { 20: 2, 5: 1, 1: 3 } },
      ok: { amount: '50', bills: { 20: 2, 10: 1 } },
      confirm: { amount: '5', bills: { 5: 1 } }
    };
    function setup(p) { state.amount = p.amount; state.bills = JSON.parse(JSON.stringify(p.bills)); }

    switch (id) {
      case 'welcome': case 'privacy': case 'amount': go(id); break;
      case 'bills': setup(bills.empty); go('bills'); break;
      case 'bills-partial': setup(bills.partial); go('bills'); break;
      case 'bills-ok': setup(bills.ok); go('bills'); break;
      case 'confirm': setup(bills.confirm); go('confirm'); break;
      case 'delivering': setup(bills.confirm); go('delivering'); clearFlowTimers(); break;   // se queda en "Entregando"
      case 'done': setup(bills.confirm); finish(); break;
      case 'modal:validating': setup(bills.ok); go('bills'); openModal('validating', { hold: true }); break;
      case 'modal:cancel': setup(bills.partial); go('bills'); bindText('cancel.text', t('cancel.textBills')); openModal('cancel', { hold: true }); break;
      case 'modal:returning': setup(bills.partial); go('bills'); returnBills(true); break;
      case 'modal:error': setup(bills.confirm); go('bills'); openModal('error', { hold: true }); break;
      case 'modal:idle': setup(bills.partial); go('bills'); bindText('idle.text', t('idle.text', { n: CONFIG.idleCountdownS })); openModal('idle', { hold: true }); break;
      case 'notice:reject': setup(bills.partial); go('bills'); showNotice('bills.rejected', null, true); break;
      default: go('welcome');
    }
  }

  /* ------------------------------------------------------------------ Eventos */
  kiosk.addEventListener('click', function (e) {
    var keyEl = e.target.closest('[data-key]');
    if (keyEl) { pressKey(keyEl.dataset.key); return; }

    var act = e.target.closest('[data-action]');
    if (!act) {
      if (e.target === modalLayer && state.holdModal) closeModal();
      return;
    }
    switch (act.dataset.action) {
      case 'start': go('privacy'); break;
      case 'cancel-keep': closeModal(); resetIdle(); break;
      case 'cancel-yes':
        closeModal();
        if (insertedUSD() > 0) returnBills(false); else go('welcome');
        break;
      case 'error-ok': closeModal(); returnBills(false); break;
      case 'idle-ok': stopIdleCountdown(); closeModal(); resetIdle(); break;
    }
  });

  kiosk.addEventListener('pointerdown', function () { if (state.modal !== 'idle') resetIdle(); });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (state.screen !== 'amount' || state.modal) return;
    if (/^\d$/.test(e.key)) { pressKey(e.key); }
    else if (e.key === 'Backspace') { pressKey('back'); e.preventDefault(); }
    else if (e.key === 'Escape' || e.key === 'Delete') { pressKey('clear'); }
    else if (e.key === 'Enter' && amountUSD() >= CONFIG.minUSD) { toBills(); }
    resetIdle();
  });

  /* ------------------------------------------------------------------ Init */
  applyI18n();
  tick();
  setInterval(tick, 1000);
  go('welcome');

  /* ------------------------------------------------------------------ API pública (panel de revisión) */
  global.Kiosk = {
    CONFIG: CONFIG,
    state: state,
    t: t,
    go: go,
    jump: jump,
    setLang: setLang,
    insertBill: insertBill,
    rejectBill: rejectBill,
    resetIdle: resetIdle,
    stopIdleCountdown: stopIdleCountdown,
    reset: function () { clearFlowTimers(); stopIdleCountdown(); closeModal(); go('welcome'); },
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
