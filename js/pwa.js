// ============================================================
//  RUTa al Éxito — App instalable (PWA)
// ============================================================
const PWA = (() => {
  let eventoInstalar = null;
  const instalada = () => matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    eventoInstalar = ev;
    pintar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    pintar();
    if (typeof aviso === 'function') aviso('📲 ¡Listo! RUTa al Éxito quedó instalada en tu dispositivo.');
  });

  function instalar() {
    if (eventoInstalar) {
      eventoInstalar.prompt();
      eventoInstalar.userChoice.finally(() => { eventoInstalar = null; pintar(); });
    } else if (esIOS && typeof abrirModalAhora === 'function') {
      abrirModalAhora('📲 Instalar en iPhone / iPad', `
        <ol>
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> <span aria-hidden="true">⬆️</span> en la barra del navegador.</li>
          <li>Elige <b>"Agregar a pantalla de inicio"</b>.</li>
        </ol>
        <p>El juego aparecerá como una app más, a pantalla completa y sin conexión.</p>`, [{ texto: 'Entendido' }]);
    }
  }

  // Dibuja (o quita) el botón "Instalar" en el elemento #zonaInstalar si existe
  function pintar() {
    const el = document.getElementById('zonaInstalar');
    if (!el) return;
    const mostrar = !instalada() && (eventoInstalar || esIOS);
    el.innerHTML = mostrar ? '<button class="btn grande instalar" type="button">📲 Instalar la app</button>' : '';
    const b = el.querySelector('button');
    if (b) b.onclick = instalar;
  }

  return { pintar, instalar, get instalada() { return instalada(); } };
})();
