/* MODO · Kiosco — Textos (ES / EN) · v2 (flujo de 4 pantallas)
   Los textos de la pantalla de inicio, billetes, confirmación y entrega siguen el
   documento "Observaciones de la prueba y mejoras propuestas" (14-nov-2026).
   Los de incidencias, fuera de servicio y motivos de rechazo son propuestas para revisión. */
(function (global) {
  'use strict';

  global.I18N = {
    es: {
      /* Marca */
      'brand.service': 'Servicio de Cambio de Divisas',
      'welcome.hello': '¡Bienvenido!',

      /* 1 · Inicio */
      'rate.lead': 'Te pagamos',
      'rate.unit': 'por cada dólar',
      'rate.noFee': 'Sin comisión',
      'rate.capNote': 'Hoy puedes cambiar hasta {max} USD',
      'table.usd': 'USD',
      'table.mxn': 'MXN',
      'video.label': 'Cómo insertar tu dinero',
      'video.placeholder': 'Video en loop · marcador de posición',
      'video.caption': 'Todo lo que ingreses será cambiado a pesos',
      'lang.prompt': 'Elige tu idioma',
      'privacy.line': 'Al continuar aceptas el aviso de privacidad',
      'privacy.qr': 'Aviso completo',
      'privacy.check': 'Acepto el aviso de privacidad',
      'btn.start': 'Aceptar y comenzar',

      /* Fuera de servicio (improvisado) */
      'oos.title': 'Kiosco fuera de servicio',
      'oos.text': 'Disculpa las molestias. Acude a la ventanilla para cambiar tus dólares.',

      /* 2 · Inserta tus dólares */
      'insert.title': 'Inserta tus dólares',
      'insert.sub': 'Un billete a la vez, con la cara hacia arriba',
      'insert.entered': 'Has ingresado',
      'insert.receive': 'Recibirás',
      'insert.limit': 'Tope de {max} USD',
      'insert.capReached': 'Llegaste al tope de {max} USD. Toca TERMINAR.',
      'insert.locked': 'Receptor bloqueado',
      'insert.empty': 'Esperando tu primer billete',
      'insert.rateLine': 'Tipo de cambio',
      'insert.target': 'Cada billete se cambia a pesos al instante',
      'reject.damaged': 'Billete dañado. Retíralo e intenta con otro en buen estado.',
      'reject.serial': 'Serie no aceptada. Retira ese billete e intenta con otro.',
      'reject.misplaced': 'Billete mal colocado. Insértalo con la cara hacia arriba.',
      'reject.cap': 'Ese billete supera el tope de {max} USD. Retíralo.',
      'btn.finish': 'Terminar',

      /* Validación (automática, entre Terminar y Confirmar) */
      'validating.title': 'Validando inventario...',
      'validating.text': 'Un momento, por favor.',

      /* 3 · Confirmación */
      'confirm.title': '¿Deseas confirmar esta operación?',
      'confirm.inserted': 'Ingresaste',
      'confirm.receive': 'Recibirás',
      'confirm.rate': 'Tipo de cambio aplicado',
      'confirm.coinsPlus': '+ monedas {amount}',
      'confirm.prefer200': 'Prefiero billetes de $200',
      'confirm.prefer500': 'Usar billetes de $500',
      'btn.confirm': 'Confirmar',
      'btn.cancel': 'Cancelar',

      /* 4 · Entrega */
      'deliver.title': 'Entregando tu efectivo',
      'deliver.bills': 'Retira tus billetes',
      'deliver.coins': 'Retira tus monedas',
      'deliver.ticket': 'Toma tu ticket',
      'deliver.printing': 'Imprimiendo ticket...',
      'deliver.ready': 'Listo. Gracias por tu operación.',
      'deliver.delivered': 'Entregado',
      'deliver.none': 'Sin monedas en esta operación',
      'deliver.done': 'Listo',
      'deliver.countdown': 'Volviendo al inicio en {n} s',
      'receipt.folio': 'Folio',
      'receipt.date': 'Fecha y hora',
      'receipt.usd': 'Monto USD',
      'receipt.rate': 'Tipo de cambio',

      /* Incidencia (improvisado): falla después de recibir dinero */
      'incident.title': 'No pudimos entregar tu efectivo',
      'incident.text': 'Conserva tu comprobante de incidencia. Te reembolsaremos al contactarnos.',
      'incident.folio': 'Folio de incidencia',
      'incident.phone': 'Contacto para reembolso',
      'incident.phoneValue': '(800) 000-0000',

      /* Modales */
      'cancel.title': '¿Cancelar la operación?',
      'cancel.text': 'Te devolveremos los billetes que ya insertaste.',
      'cancel.keep': 'Seguir',
      'cancel.yes': 'Sí, cancelar',
      'returning.title': 'Devolviendo tus billetes...',
      'returning.text': 'Retíralos de la ranura cuando terminemos.',
      'error.title': 'No pudimos completar la operación',
      'error.textEscrow': 'En este momento no hay efectivo suficiente para entregarte esta cantidad. Te devolveremos tus billetes.',
      'error.textNoEscrow': 'En este momento no hay efectivo suficiente para entregarte esta cantidad. Te daremos un comprobante de incidencia para tu reembolso.',
      'error.ok': 'Entendido',
      'idle.title': '¿Sigues ahí?',
      'idle.text': 'Por tu seguridad, cerraremos la sesión en {n} s.',
      'idle.ok': 'Sigo aquí',

      /* Botones genéricos */
      'btn.ready': 'Listo',
      'btn.done': 'Listo',

      /* Stepper */
      'step.start': 'Inicio',
      'step.bills': 'Billetes',
      'step.confirm': 'Confirmar',
      'step.delivery': 'Entrega',

      'clock.unit': 'h'
    },

    en: {
      'brand.service': 'Currency Exchange Service',
      'welcome.hello': 'Welcome!',

      'rate.lead': 'We pay you',
      'rate.unit': 'for each dollar',
      'rate.noFee': 'No fee',
      'rate.capNote': 'Today you can exchange up to {max} USD',
      'table.usd': 'USD',
      'table.mxn': 'MXN',
      'video.label': 'How to insert your cash',
      'video.placeholder': 'Looping video · placeholder',
      'video.caption': 'Everything you insert will be exchanged for pesos',
      'lang.prompt': 'Choose your language',
      'privacy.line': 'By continuing you accept the privacy notice',
      'privacy.qr': 'Full notice',
      'privacy.check': 'I accept the privacy notice',
      'btn.start': 'Accept and start',

      'oos.title': 'Kiosk out of service',
      'oos.text': 'Sorry for the inconvenience. Please visit the counter to exchange your dollars.',

      'insert.title': 'Insert your dollars',
      'insert.sub': 'One bill at a time, face up',
      'insert.entered': 'You have inserted',
      'insert.receive': 'You will receive',
      'insert.limit': '{max} USD limit',
      'insert.capReached': 'You reached the {max} USD limit. Tap FINISH.',
      'insert.locked': 'Acceptor locked',
      'insert.empty': 'Waiting for your first bill',
      'insert.rateLine': 'Exchange rate',
      'insert.target': 'Each bill is exchanged for pesos right away',
      'reject.damaged': 'Damaged bill. Take it back and try another one in good condition.',
      'reject.serial': 'Serial not accepted. Take that bill back and try another one.',
      'reject.misplaced': 'Bill inserted incorrectly. Insert it face up.',
      'reject.cap': 'That bill exceeds the {max} USD limit. Take it back.',
      'btn.finish': 'Finish',

      'validating.title': 'Checking inventory...',
      'validating.text': 'One moment, please.',

      'confirm.title': 'Do you want to confirm this transaction?',
      'confirm.inserted': 'You inserted',
      'confirm.receive': 'You will receive',
      'confirm.rate': 'Applied exchange rate',
      'confirm.coinsPlus': '+ coins {amount}',
      'confirm.prefer200': 'I prefer $200 bills',
      'confirm.prefer500': 'Use $500 bills',
      'btn.confirm': 'Confirm',
      'btn.cancel': 'Cancel',

      'deliver.title': 'Dispensing your cash',
      'deliver.bills': 'Take your bills',
      'deliver.coins': 'Take your coins',
      'deliver.ticket': 'Take your receipt',
      'deliver.printing': 'Printing receipt...',
      'deliver.ready': 'Done. Thank you for your transaction.',
      'deliver.delivered': 'Delivered',
      'deliver.none': 'No coins in this transaction',
      'deliver.done': 'Done',
      'deliver.countdown': 'Returning to start in {n} s',
      'receipt.folio': 'Receipt',
      'receipt.date': 'Date and time',
      'receipt.usd': 'Amount USD',
      'receipt.rate': 'Exchange rate',

      'incident.title': 'We couldn\u2019t dispense your cash',
      'incident.text': 'Keep your incident receipt. We will refund you when you contact us.',
      'incident.folio': 'Incident ID',
      'incident.phone': 'Refund contact',
      'incident.phoneValue': '(800) 000-0000',

      'cancel.title': 'Cancel the transaction?',
      'cancel.text': 'We will return the bills you already inserted.',
      'cancel.keep': 'Keep going',
      'cancel.yes': 'Yes, cancel',
      'returning.title': 'Returning your bills...',
      'returning.text': 'Take them from the slot when we finish.',
      'error.title': 'We couldn\u2019t complete the transaction',
      'error.textEscrow': 'There isn\u2019t enough cash available right now to dispense this amount. We will return your bills.',
      'error.textNoEscrow': 'There isn\u2019t enough cash available right now to dispense this amount. We will give you an incident receipt for your refund.',
      'error.ok': 'Got it',
      'idle.title': 'Are you still there?',
      'idle.text': 'For your security, the session will close in {n} s.',
      'idle.ok': 'I\u2019m here',

      'btn.ready': 'Done',
      'btn.done': 'Done',

      'step.start': 'Start',
      'step.bills': 'Bills',
      'step.confirm': 'Confirm',
      'step.delivery': 'Delivery',

      'clock.unit': 'h'
    }
  };
})(window);
