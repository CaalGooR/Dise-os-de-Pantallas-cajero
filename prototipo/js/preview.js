/* ==========================================================================
   Panel de revisión — NO forma parte del diseño del kiosco.
   Cambia de resolución, salta entre pantallas, mueve el tipo de cambio en vivo
   y simula el hardware (billetes, rechazos, escrow, fallas).
   Parámetros URL:  ?res=landscape|portrait|free   ?kiosk  (oculta el panel)
   ========================================================================== */
(function (global) {
  'use strict';

  var K = global.Kiosk;
  var RES = {
    landscape: { w: 1280, h: 1024, label: 'Horizontal' },
    portrait: { w: 1080, h: 1920, label: 'Vertical' }
  };

  var pv = document.getElementById('pv');
  var viewport = document.getElementById('pvViewport');
  var frame = document.getElementById('pvFrame');
  var stage = document.getElementById('stage');
  var meta = document.getElementById('pvMeta');
  var select = document.getElementById('pvScreen');
  var params = new URLSearchParams(location.search);

  var mode = params.get('res') || 'landscape';
  if (!RES[mode] && mode !== 'free') mode = 'landscape';

  /* ---------------------------------------------------------------- Escalado */
  function fit() {
    var scale = 1, w, h;
    if (mode === 'free') {
      frame.style.width = '100%'; frame.style.height = '100%';
      stage.style.width = '100%'; stage.style.height = '100%';
      stage.style.transform = 'none';
      var r = frame.getBoundingClientRect();
      meta.textContent = 'Libre · ' + Math.round(r.width) + ' × ' + Math.round(r.height);
      return;
    }
    w = RES[mode].w; h = RES[mode].h;
    var vp = viewport.getBoundingClientRect();
    var clean = pv.classList.contains('is-clean');
    var pad = clean ? 0 : 56;
    scale = Math.min((vp.width - pad) / w, (vp.height - pad - 28) / h, 1);
    if (clean) scale = Math.min(vp.width / w, vp.height / h);
    frame.style.width = Math.round(w * scale) + 'px';
    frame.style.height = Math.round(h * scale) + 'px';
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.transformOrigin = '0 0';
    stage.style.transform = 'scale(' + scale + ')';
    meta.textContent = RES[mode].label + ' · ' + w + ' × ' + h + ' · escala ' + Math.round(scale * 100) + '%';
  }

  function setMode(m) {
    mode = m;
    Array.prototype.forEach.call(document.querySelectorAll('#pvRes button'), function (b) {
      b.classList.toggle('is-active', b.dataset.res === m);
    });
    fit();
  }

  document.getElementById('pvRes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) setMode(b.dataset.res);
  });
  window.addEventListener('resize', fit);

  /* ---------------------------------------------------------------- Pantallas */
  var OPTIONS = [
    ['start', '1 · Inicio (tipo de cambio, idioma, privacidad)'],
    ['insert-empty', '2a · Inserta tus dólares (vacío)'],
    ['insert-partial', '2b · Inserta tus dólares (parcial)'],
    ['insert-cap', '2c · Tope alcanzado (receptor bloqueado)'],
    ['modal:validating', '2d · Validando inventario'],
    ['modal:convert', '3a · ¿Cambiar todo? (modal)'],
    ['modal:adjust', '3b · Ajustar monto (modal)'],
    ['deliver-run', '4a · Entrega en curso'],
    ['deliver', '4b · Entrega completa (ticket)'],
    ['incident', 'Extra · Incidencia (falla al entregar)'],
    ['oos', 'Extra · Fuera de servicio'],
    ['modal:cancel', 'Extra · Cancelar (con escrow)'],
    ['modal:returning', 'Extra · Devolviendo billetes'],
    ['modal:error', 'Extra · Error de inventario'],
    ['modal:idle', 'Extra · Inactividad'],
    ['notice:reject', 'Extra · Billete rechazado']
  ];
  var SCREEN_TO_OPTION = { start: 'start', insert: 'insert-partial', deliver: 'deliver', incident: 'incident', oos: 'oos' };

  select.innerHTML = OPTIONS.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
  select.addEventListener('change', function () { K.jump(select.value); select.blur(); });

  /* ---------------------------------------------------------------- Idioma */
  document.getElementById('pvLang').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !b.dataset.lang) return;
    K.setLang(b.dataset.lang);
    syncLang();
  });
  function syncLang() {
    var cur = K.state.lang || 'es';
    Array.prototype.forEach.call(document.querySelectorAll('#pvLang button'), function (b) {
      b.classList.toggle('is-active', b.dataset.lang === cur);
    });
  }

  /* ---------------------------------------------------------------- Tipo de cambio en vivo */
  var rateVal = document.getElementById('pvRateVal');
  function syncRate() { rateVal.textContent = K.CONFIG.rate.toFixed(2); }
  function nudge(delta) {
    K.setRate(Math.round((K.CONFIG.rate + delta) * 100) / 100);
    syncRate();
  }
  document.getElementById('pvRateDown').addEventListener('click', function () { nudge(-0.05); });
  document.getElementById('pvRateUp').addEventListener('click', function () { nudge(0.05); });

  /* ---------------------------------------------------------------- Simulador de billetes y rechazos */
  var billsBox = document.getElementById('pvBills');
  billsBox.innerHTML = K.CONFIG.denominations.map(function (d) {
    return '<button type="button" class="pv-bill" data-denom="' + d + '">$' + d + '</button>';
  }).join('');
  billsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) K.insertBill(Number(b.dataset.denom));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-reason]'), function (b) {
    b.addEventListener('click', function () { K.rejectBill(b.dataset.reason); });
  });

  function updateBillButtons(s) {
    var on = s.screen === 'insert' && !s.modal;
    Array.prototype.forEach.call(document.querySelectorAll('.pv-bill, [data-reason]'), function (b) { b.disabled = !on; });
  }

  /* ---------------------------------------------------------------- Configuración */
  function bindCheck(id, fn) {
    document.getElementById(id).addEventListener('change', function (e) { fn(e.target.checked); });
  }
  bindCheck('pvFee', function (on) { K.CONFIG.feeFree = on; K.render(); });
  bindCheck('pvTable', function (on) { K.CONFIG.showTable = on; K.render(); });
  bindCheck('pvDynCap', function (on) { K.CONFIG.dynamicCap = on; K.render(); });
  bindCheck('pvEscrow', function (on) { K.CONFIG.escrow = on; K.render(); });
  bindCheck('pvOos', function (on) { K.setOutOfService(on); });

  /* ---------------------------------------------------------------- Fallas y estados */
  bindCheck('pvFail', function (on) { K.CONFIG.failInventory = on; });
  bindCheck('pvFailDelivery', function (on) { K.CONFIG.failDelivery = on; });
  bindCheck('pvIdle', function (on) { K.CONFIG.idleEnabled = on; K.resetIdle(); });
  document.getElementById('pvReset').addEventListener('click', function () {
    K.reset();
    document.getElementById('pvOos').checked = false;
  });

  /* ---------------------------------------------------------------- Mostrar / ocultar panel */
  function setClean(on) {
    pv.classList.toggle('is-clean', on);
    document.getElementById('pvShow').hidden = !on;
    setTimeout(fit, 0);
  }
  document.getElementById('pvHide').addEventListener('click', function () { setClean(true); });
  document.getElementById('pvShow').addEventListener('click', function () { setClean(false); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'p' || e.key === 'P') && !e.target.closest('input, select, textarea')) {
      setClean(!pv.classList.contains('is-clean'));
    }
  });

  /* ---------------------------------------------------------------- Sincronización con el kiosco */
  K.onChange(function (s) {
    updateBillButtons(s);
    syncLang();
    syncRate();
    if (!s.modal && document.activeElement !== select) {
      var opt = SCREEN_TO_OPTION[s.screen];
      if (opt) select.value = opt;
    }
  });

  /* ---------------------------------------------------------------- Init */
  if (params.has('kiosk')) { mode = params.get('res') || 'free'; setClean(true); }
  setMode(mode);
  syncLang();
  syncRate();
  updateBillButtons(K.state);
  select.value = 'start';
  requestAnimationFrame(fit);
})(window);
