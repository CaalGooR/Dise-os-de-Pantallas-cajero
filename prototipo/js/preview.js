/* ==========================================================================
   Panel de revisión — NO forma parte del diseño del kiosco.
   Permite cambiar de resolución, saltar entre pantallas y simular el hardware.
   Parámetros URL:  ?res=landscape|portrait|free   ?kiosk  (oculta el panel y ocupa toda la ventana)
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
    var pad = pv.classList.contains('is-clean') ? 0 : 56;
    scale = Math.min((vp.width - pad) / w, (vp.height - pad - 28) / h, 1);
    if (pv.classList.contains('is-clean')) scale = Math.min(vp.width / w, vp.height / h);
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
    ['welcome', '1 · Bienvenida'],
    ['privacy', '2 · Aviso de privacidad'],
    ['amount', '3 · Monto en USD'],
    ['bills', '4a · Insertar billetes (vacío)'],
    ['bills-partial', '4b · Insertar billetes (parcial)'],
    ['bills-ok', '4c · Insertar billetes (suficiente)'],
    ['modal:validating', '4d · Validando inventario'],
    ['confirm', '5 · Confirmar operación'],
    ['delivering', '6 · Entregando'],
    ['done', '7 · Transacción completada'],
    ['modal:cancel', 'Extra · Cancelar operación'],
    ['modal:returning', 'Extra · Devolviendo billetes'],
    ['modal:error', 'Extra · Error de inventario'],
    ['modal:idle', 'Extra · Inactividad'],
    ['notice:reject', 'Extra · Billete rechazado']
  ];
  select.innerHTML = OPTIONS.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
  select.addEventListener('change', function () { K.jump(select.value); select.blur(); });

  K.onChange(function (s) {
    if (s.modal || document.activeElement === select) return;
    var v = s.screen;
    if (Array.prototype.some.call(select.options, function (o) { return o.value === v; })) select.value = v;
    updateBillButtons(s);
  });

  /* ---------------------------------------------------------------- Idioma */
  document.getElementById('pvLang').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    K.setLang(b.dataset.lang);
    syncLang();
  });
  function syncLang() {
    Array.prototype.forEach.call(document.querySelectorAll('#pvLang button'), function (b) {
      b.classList.toggle('is-active', b.dataset.lang === K.state.lang);
    });
  }
  K.onChange(syncLang);

  /* ---------------------------------------------------------------- Simulador de billetes */
  var billsBox = document.getElementById('pvBills');
  billsBox.innerHTML = K.CONFIG.denominations.map(function (d) {
    return '<button type="button" class="pv-bill" data-denom="' + d + '">$' + d + '</button>';
  }).join('');
  billsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) K.insertBill(Number(b.dataset.denom));
  });
  document.getElementById('pvReject').addEventListener('click', function () { K.rejectBill(false); });

  function updateBillButtons(s) {
    var on = s.screen === 'bills' && !s.modal;
    Array.prototype.forEach.call(document.querySelectorAll('.pv-bill, #pvReject'), function (b) { b.disabled = !on; });
  }

  /* ---------------------------------------------------------------- Condiciones */
  document.getElementById('pvFail').addEventListener('change', function (e) { K.CONFIG.failInventory = e.target.checked; });
  document.getElementById('pvIdle').addEventListener('change', function (e) {
    K.CONFIG.idleEnabled = e.target.checked;
    K.resetIdle();
  });
  document.getElementById('pvReset').addEventListener('click', function () { K.reset(); });

  /* ---------------------------------------------------------------- Mostrar / ocultar panel */
  function setClean(on) {
    pv.classList.toggle('is-clean', on);
    document.getElementById('pvShow').hidden = !on;
    setTimeout(fit, 0);
  }
  document.getElementById('pvHide').addEventListener('click', function () { setClean(true); });
  document.getElementById('pvShow').addEventListener('click', function () { setClean(false); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'p' || e.key === 'P') && !e.target.closest('input, select, textarea') && K.state.screen !== 'amount') {
      setClean(!pv.classList.contains('is-clean'));
    }
  });

  /* ---------------------------------------------------------------- Init */
  if (params.has('kiosk')) { mode = params.get('res') || 'free'; setClean(true); }
  setMode(mode);
  syncLang();
  updateBillButtons(K.state);
  select.value = K.state.screen;
  requestAnimationFrame(fit);
})(window);
