/* MODO · Kiosco — Textos (ES / EN)
   Los textos en español salen de las referencias; los de las pantallas de error
   y de los modales extra son propuestas ("improvisadas") para revisión. */
(function (global) {
  'use strict';

  global.I18N = {
    es: {
      'brand.service': 'Servicio de Cambio de Divisas',

      'welcome.hello': '¡Bienvenido!',
      'welcome.start': 'INICIAR',
      'welcome.note': 'Este Kiosco de Cambio de Divisas (CEK) realiza transacciones de compra (USD a MXN)',

      'privacy.title': 'Aviso de Privacidad',
      'privacy.p1': 'Por razones de cumplimiento, este Kiosco de Cambio de Divisas (CEK) captura una imagen de su rostro cuando se realiza una transacción.',
      'privacy.p2': 'Esta información se utiliza únicamente para hacer cumplir los límites diarios de transacción y prevenir el uso indebido del sistema.',
      'privacy.strong': 'Al continuar, usted consiente esta recopilación y uso.',
      'privacy.more': 'Consulta nuestro Aviso de Privacidad completo en:',

      'btn.decline': 'No acepto',
      'btn.accept': 'Yo acepto',
      'btn.back': 'VOLVER',
      'btn.cancel': 'CANCELAR',
      'btn.continue': 'CONTINUAR',
      'btn.confirm': 'CONFIRMAR',

      'step.amount': 'Monto',
      'step.bills': 'Billetes',
      'step.confirm': 'Confirmar',
      'step.delivery': 'Entrega',

      'rate.tag': 'COMPRA',

      'amount.title': '¿Cuántos dólares deseas cambiar?',
      'amount.entered': 'Monto ingresado',
      'amount.receive': 'Recibirás',
      'amount.placeholder': 'Ingresa un monto en USD',
      'amount.limit': 'Límite por operación: {min} a {max} USD',
      'amount.max': 'El monto máximo por operación es {max} USD',
      'key.back': 'Borrar',
      'key.clear': 'Limpiar',

      'bills.title': 'Inserta los billetes en el receptor',
      'bills.target': 'Monto objetivo',
      'bills.inserted': 'Total insertado',
      'bills.enough': '¡Cantidad suficiente!',
      'bills.empty': 'Comienza a insertar billetes',
      'bills.emptySub': 'Un billete a la vez, con la cara hacia arriba',
      'bills.receive': 'Recibirás',
      'bills.rejected': 'No pudimos leer ese billete. Retíralo e intenta con otro en buen estado.',
      'bills.limit': 'Ese billete superaría el máximo de {max} USD por operación. Retíralo.',

      'confirm.title': '¿Deseas confirmar esta operación?',
      'confirm.amount': 'Monto',
      'confirm.inserted': 'Insertaste',
      'confirm.receive': 'Recibirás',

      'delivering.title': 'Entregando...',
      'delivering.text': 'Estamos preparando tu efectivo',
      'delivering.sub': 'Por favor, no te retires',

      'done.title': 'Transacción Completada',
      'done.amount': 'Monto',
      'done.received': 'Recibido',
      'done.delivered': 'Entregado',
      'done.take': 'Retira tu efectivo de la bandeja',
      'done.folio': 'Folio:',
      'done.date': 'Fecha y hora:',
      'done.countdown': 'Volviendo al inicio en {n} s',

      'validating.title': 'Validando inventario...',
      'validating.text': 'Por favor, espera un momento...',

      'cancel.title': '¿Cancelar la operación?',
      'cancel.text': 'Se perderá el monto que ingresaste.',
      'cancel.textBills': 'Te devolveremos los billetes que ya insertaste.',
      'cancel.keep': 'Seguir',
      'cancel.yes': 'Sí, cancelar',

      'returning.title': 'Devolviendo tus billetes...',
      'returning.text': 'Retíralos de la ranura cuando terminemos.',

      'error.title': 'No pudimos completar la operación',
      'error.text': 'En este momento no hay efectivo suficiente para entregarte esta cantidad. Te devolveremos tus billetes.',
      'error.ok': 'Entendido',

      'idle.title': '¿Sigues ahí?',
      'idle.text': 'Por tu seguridad, cerraremos la sesión en {n} s.',
      'idle.ok': 'Sigo aquí'
    },

    en: {
      'brand.service': 'Currency Exchange Service',

      'welcome.hello': 'Welcome!',
      'welcome.start': 'START',
      'welcome.note': 'This Currency Exchange Kiosk (CEK) performs purchase transactions (USD to MXN)',

      'privacy.title': 'Privacy Notice',
      'privacy.p1': 'For compliance reasons, this Currency Exchange Kiosk (CEK) captures an image of your face when a transaction is made.',
      'privacy.p2': 'This information is used only to enforce daily transaction limits and prevent misuse of the system.',
      'privacy.strong': 'By continuing, you consent to this collection and use.',
      'privacy.more': 'See our full Privacy Notice at:',

      'btn.decline': 'I don\u2019t accept',
      'btn.accept': 'I accept',
      'btn.back': 'BACK',
      'btn.cancel': 'CANCEL',
      'btn.continue': 'CONTINUE',
      'btn.confirm': 'CONFIRM',

      'step.amount': 'Amount',
      'step.bills': 'Bills',
      'step.confirm': 'Confirm',
      'step.delivery': 'Delivery',

      'rate.tag': 'BUY',

      'amount.title': 'How many dollars do you want to exchange?',
      'amount.entered': 'Amount entered',
      'amount.receive': 'You will receive',
      'amount.placeholder': 'Enter an amount in USD',
      'amount.limit': 'Limit per transaction: {min} to {max} USD',
      'amount.max': 'The maximum amount per transaction is {max} USD',
      'key.back': 'Delete',
      'key.clear': 'Clear',

      'bills.title': 'Insert your bills into the acceptor',
      'bills.target': 'Target amount',
      'bills.inserted': 'Total inserted',
      'bills.enough': 'Enough amount!',
      'bills.empty': 'Start inserting bills',
      'bills.emptySub': 'One bill at a time, face up',
      'bills.receive': 'You will receive',
      'bills.rejected': 'We couldn\u2019t read that bill. Take it back and try another one in good condition.',
      'bills.limit': 'That bill would exceed the {max} USD limit per transaction. Take it back.',

      'confirm.title': 'Do you want to confirm this transaction?',
      'confirm.amount': 'Amount',
      'confirm.inserted': 'You inserted',
      'confirm.receive': 'You will receive',

      'delivering.title': 'Dispensing...',
      'delivering.text': 'We are preparing your cash',
      'delivering.sub': 'Please do not walk away',

      'done.title': 'Transaction Completed',
      'done.amount': 'Amount',
      'done.received': 'Received',
      'done.delivered': 'Delivered',
      'done.take': 'Take your cash from the tray',
      'done.folio': 'Receipt:',
      'done.date': 'Date and time:',
      'done.countdown': 'Returning to start in {n} s',

      'validating.title': 'Checking inventory...',
      'validating.text': 'Please wait a moment...',

      'cancel.title': 'Cancel the transaction?',
      'cancel.text': 'The amount you entered will be lost.',
      'cancel.textBills': 'We will return the bills you already inserted.',
      'cancel.keep': 'Keep going',
      'cancel.yes': 'Yes, cancel',

      'returning.title': 'Returning your bills...',
      'returning.text': 'Take them from the slot when we finish.',

      'error.title': 'We couldn\u2019t complete the transaction',
      'error.text': 'There isn\u2019t enough cash available right now to dispense this amount. We will return your bills.',
      'error.ok': 'Got it',

      'idle.title': 'Are you still there?',
      'idle.text': 'For your security, the session will close in {n} s.',
      'idle.ok': 'I\u2019m here'
    }
  };
})(window);
