// ============================================================
//  RUTa al Éxito — Interfaz
// ============================================================

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let cajon = null;          // Panel lateral abierto: 'tramites' | 'negocio' | 'bitacora'
let ultimoSeqVisto = 0;    // Para mostrar avisos nuevos de la bitácora
const hay3D = typeof Escena3D !== 'undefined' && Escena3D.init({
  onInteractuar: ev => manejarInteraccion(ev),
  onPrompt: (texto) => actualizarPrompt(texto),
  onAviso: (texto, ms) => aviso(texto, ms),
  onFila: f => actualizarFila(f),
  onCambioModo: () => { if (G && G.fase !== 'fin') render(); },
});

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ------------------------------------------------------------
//  Modal con cola
// ------------------------------------------------------------
function mostrarSiguienteModal() {
  if (!colaModal.length) { modal.classList.add('oculto'); return; }
  const m = colaModal[0];
  const dialogo = !!m.hablante && hay3D;
  modal.classList.toggle('dialogo', dialogo);
  if (!m.mostrado) {
    m.mostrado = true;
    if (m.sonido && typeof Audio3D !== 'undefined') Audio3D.efecto(m.sonido);
    if (dialogo && typeof Audio3D !== 'undefined') {
      const tmp = document.createElement('div');
      tmp.innerHTML = m.voz || m.html;
      const primero = tmp.querySelector('.cita, p');
      if (primero) Audio3D.hablar(primero.textContent.slice(0, 220));
    }
  }
  modal.innerHTML = `
    <div class="modal-caja" role="dialog" aria-modal="true">
      ${dialogo ? `<div class="hablante">🗣️ ${esc(m.hablante)}</div>` : ''}
      <h2>${m.titulo}</h2>
      <div class="modal-cuerpo">${m.html}</div>
      <div class="modal-acciones">
        ${m.botones.map((b, i) => `<button class="btn ${b.clase || (i === 0 ? 'primario' : '')}" data-boton="${i}" ${b.deshabilitado ? 'disabled' : ''}>${b.texto}</button>`).join('')}
      </div>
    </div>`;
  modal.classList.remove('oculto');
  modal.querySelectorAll('[data-boton]').forEach(btn => {
    btn.onclick = () => {
      const b = m.botones[Number(btn.dataset.boton)];
      colaModal.shift();
      if (b.accion) b.accion();
      render();
    };
  });
  const primero = modal.querySelector('button:not([disabled])');
  if (primero) primero.focus();
}

function abrirModalAhora(titulo, html, botones, opciones = {}) {
  colaModal.unshift({ titulo, html, botones: botones || [{ texto: 'Cerrar' }], ...opciones });
  mostrarSiguienteModal();
}

// ------------------------------------------------------------
//  Render principal
// ------------------------------------------------------------
function render() {
  const modo3D = hay3D && G && G.fase !== 'fin';
  document.body.classList.toggle('modo-3d', !!modo3D);
  document.body.classList.toggle('cajon-abierto', !!(modo3D && cajon));
  if (!G) renderInicio();
  else if (G.fase === 'fin') renderFinal();
  else renderJuego();
  if (modo3D) {
    Escena3D.actualizar();
    Escena3D.setObjetivo(objetivoActual().lugar);
    mostrarAvisosNuevos();
  }
  mostrarSiguienteModal();
}

// ------------------------------------------------------------
//  Pantalla de inicio
// ------------------------------------------------------------
function renderInicio() {
  const guardada = hayPartidaGuardada();
  app.innerHTML = `
  <section class="inicio">
    <div class="hero">
      <div class="logo">RUT<span>a</span> al Éxito</div>
      <p class="lema">Tu empresa. Tus trámites. Tu paciencia. 🇨🇱</p>
      <p class="intro">Elige un rubro, constituye tu empresa, consigue todos los permisos y sobrevive un año
        pagando arriendo, sueldos e impuestos. ¿Llegarás a ser un magnate… o te quedarás en la fila del banco?</p>
      ${guardada ? `<div class="continuar"><button class="btn primario grande" id="btnContinuar">▶ Continuar partida</button>
        <button class="btn" id="btnBorrar">Borrar partida guardada</button></div>` : ''}
    </div>

    <form id="formInicio" class="tarjeta form-inicio">
      <h2>Nueva partida</h2>
      <div class="campos">
        <label>Tu nombre
          <input name="jugador" required maxlength="30" placeholder="Ej: Camila Rojas">
        </label>
        <label>Nombre de fantasía de tu empresa
          <input name="empresa" required maxlength="40" placeholder="Ej: Café del Cerro">
        </label>
      </div>
      <h3>Elige tu rubro</h3>
      <div class="rubros">
        ${Object.values(RUBROS).map((r, i) => `
          <label class="rubro">
            <input type="radio" name="rubro" value="${r.id}" ${i === 0 ? 'checked' : ''}>
            <span class="rubro-caja">
              <span class="rubro-emoji">${r.emoji}</span>
              <b>${r.nombre}</b>
              <small>${r.desc}</small>
              <span class="rubro-datos">
                <span>Inversión: ${dinero(r.equipamiento)}</span>
                <span>Arriendo: ${dinero(r.arriendo)}/mes</span>
                <span class="dif dif-${r.dificultad.toLowerCase()}">${r.dificultad}</span>
              </span>
            </span>
          </label>`).join('')}
      </div>
      <button class="btn primario grande" type="submit">🚀 ¡Emprender!</button>
    </form>
    <p class="nota">Los montos y plazos son aproximados y simplificados para el juego.</p>
  </section>`;

  const fc = document.getElementById('btnContinuar');
  if (fc) fc.onclick = () => { if (cargar()) { render(); window.scrollTo(0, 0); } };
  const fb = document.getElementById('btnBorrar');
  if (fb) fb.onclick = () => abrirModalAhora('¿Borrar partida?', '<p>Se perderá tu progreso.</p>', [
    { texto: 'Sí, borrar', clase: 'peligro', accion: () => borrarPartida() },
    { texto: 'Cancelar', clase: ' ' },
  ]);

  document.getElementById('formInicio').onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    nuevoJuego(d.get('jugador').trim(), d.get('empresa').trim(), d.get('rubro'));
    encolar('👋 ¡Bienvenido al mundo del emprendimiento!', `
      <p>Hola <b>${esc(G.jugador)}</b>. Para que <b>${esc(G.empresa)}</b> pueda abrir, necesitas completar varios trámites.</p>
      <ul>
        <li>Camina con <b>WASD</b> (Shift para correr) o haz <b>clic</b> donde quieras ir. Arrastra el mouse para mirar.</li>
        <li>Entra a los edificios y habla con los funcionarios (<b>E</b>). En las oficinas públicas primero <b>saca número</b> en el tótem.</li>
        <li>El haz de luz amarilla marca tu <b>próximo paso</b>. El sitio con el letrero <b>"SE ARRIENDA"</b> será tu negocio.</li>
        <li>Las oficinas públicas atienden de <b>lunes a viernes, de 9:00 a 14:00</b>. A las 21:00 te vas a casa.</li>
        <li>Si te rechazan, pierdes el día y <b>paciencia</b>. Si llega a cero, colapsas.</li>
        <li>Cuando arriendes el local, el <b>arriendo corre</b> todos los meses: ¡no te demores!</li>
        <li><b>T</b> trámites · <b>B</b> bitácora · <b>M</b> sonido.</li>
      </ul>`, [{ texto: '¡Vamos!' }]);
    render();
    window.scrollTo(0, 0);
  };
}

// ------------------------------------------------------------
//  Pantalla de juego
// ------------------------------------------------------------
function renderJuego() {
  if (hay3D) return renderJuego3D();
  app.innerHTML = `
    ${barraEstado()}
    <div class="layout">
      <aside class="col-izq">${panelTramites()}</aside>
      <section class="col-centro">
        ${G.fase === 'operacion' ? panelOperacion() : panelEspera()}
        ${mapa()}
      </section>
      <aside class="col-der">${panelBitacora()}</aside>
    </div>`;
  enlazarEventosJuego();
}

// ------------------------------------------------------------
//  Modo inmersivo: 3D a pantalla completa + HUD
// ------------------------------------------------------------
function renderJuego3D() {
  const r = rubro();
  const pac = clamp(G.paciencia, 0, 100);
  const obj = objetivoActual();
  const enNegocio = Escena3D.lugarActual === 'negocio';
  const titulosCajon = { tramites: '📋 Trámites', negocio: `📊 ${esc(G.empresa)}`, bitacora: '📰 Bitácora' };
  const contenidoCajon = cajon === 'tramites' ? panelTramites() : cajon === 'negocio' ? (G.fase === 'operacion' ? panelOperacion() : '') : cajon === 'bitacora' ? panelBitacora() : '';
  app.innerHTML = `
  <div class="juego3d">
    <div id="escena3d" class="lienzo"></div>

    <div class="hud-arriba">
      <div class="hud-chip reloj"><b id="hudReloj">${horaTexto(G.hora)}</b><small>${textoFecha(fechaActual())}</small></div>
      <div class="hud-chip ${G.caja < 0 ? 'neg' : ''}"><small>💰 Caja</small><b>${dinero(G.caja)}</b></div>
      <div class="hud-chip"><small>🧘 Paciencia</small><div class="barrita"><i style="width:${pac}%" class="${pac < 30 ? 'baja' : ''}"></i></div></div>
      <div class="hud-chip"><small>⭐ Reputación</small><div class="barrita"><i style="width:${G.reputacion}%" class="rep"></i></div></div>
      ${G.fase === 'operacion' ? `<div class="hud-chip"><small>📆 Semana</small><b>${G.semanasOperando}/${SEMANAS_PARA_GANAR}</b></div>` : ''}
    </div>

    <div class="hud-botones">
      <button class="hud-btn ${cajon === 'tramites' ? 'activo' : ''}" data-cajon="tramites" title="Trámites (T)">📋<span>Trámites</span></button>
      ${G.fase === 'operacion' ? `<button class="hud-btn ${cajon === 'negocio' ? 'activo' : ''}" data-cajon="negocio" title="Mi negocio (N)">📊<span>Negocio</span></button>` : ''}
      <button class="hud-btn ${cajon === 'bitacora' ? 'activo' : ''}" data-cajon="bitacora" title="Bitácora (B)">📰<span>Bitácora</span></button>
      <button class="hud-btn" data-accion="casa" title="Terminar el día">🛏️<span>Ir a casa</span></button>
      <button class="hud-btn" data-accion="sonido" title="Sonido (M)">${typeof Audio3D !== 'undefined' && Audio3D.silencio ? '🔇' : '🔊'}<span>Sonido</span></button>
      <button class="hud-btn" data-accion="menu" title="Menú">☰<span>Menú</span></button>
    </div>

    <div class="hud-objetivo" data-ir="${obj.lugar || ''}">🎯 <span>${obj.texto}</span></div>
    <div class="hud-fila" id="hudFila"></div>
    <button class="hud-prompt oculto" id="hudPrompt"></button>
    <div class="hud-ayuda">${enNegocio ? 'Acércate a la caja para gestionar · ' : ''}WASD caminar · Shift correr · arrastra para mirar · E interactuar · Q/R girar</div>

    <aside class="cajon ${cajon ? 'abierto' : ''}">
      <div class="cajon-cabecera"><b>${titulosCajon[cajon] || ''}</b><button class="btn chico" data-cajon="${cajon}">✕</button></div>
      <div class="cajon-cuerpo">${contenidoCajon}</div>
    </aside>
  </div>`;
  enlazarEventosJuego();
  Escena3D.montar(document.getElementById('escena3d'));
  actualizarFila(Escena3D.fila);
}

function alternarCajon(nombre) {
  cajon = cajon === nombre || !nombre ? null : nombre;
  render();
}

// Siguiente paso sugerido (y edificio a resaltar con el haz de luz)
function objetivoActual() {
  if (G.fase === 'operacion') {
    if (deudaF29() > 0) return { texto: 'Declara y paga el F29 en el SII antes del día 20', lugar: 'sii' };
    if (!hecho('mutual') && capacidadSemanal() < demandaSemanal()) return { texto: 'No das abasto: adhiérete a la mutual para poder contratar', lugar: 'mutual' };
    return { texto: `Semana ${G.semanasOperando + 1} de ${SEMANAS_PARA_GANAR} · Gestiona tu negocio desde la caja de tu local`, lugar: 'negocio' };
  }
  if (puedeAbrir()) return { texto: '¡Tienes todos los permisos! Ve a tu local y corta la cinta', lugar: 'negocio' };
  const t = tramitesAplicables().find(t => esObligatorio(t) && estadoTramite(t) === 'disponible');
  if (t) return { texto: `${nombreTramite(t)} — ${LUGARES[t.lugar].nombre.replace(' (online)', '')}`, lugar: t.lugar };
  return { texto: 'Revisa tus trámites (T)', lugar: null };
}

function actualizarPrompt(texto) {
  const el = document.getElementById('hudPrompt');
  if (!el) return;
  el.classList.toggle('oculto', !texto);
  el.innerHTML = texto ? `<kbd>E</kbd> ${esc(texto)}` : '';
}

function actualizarFila(f) {
  const el = document.getElementById('hudFila');
  if (!el) return;
  if (!f || Escena3D.lugarActual !== f.lugar) { el.innerHTML = ''; el.classList.remove('visible'); return; }
  el.classList.add('visible');
  el.innerHTML = f.llamado
    ? `<span class="ticket llamado">🎟️ ${f.letra}-${f.numero}</span><b>¡Es tu turno! Ve al módulo ${f.modulo}</b>`
    : `<span class="ticket">🎟️ ${f.letra}-${f.numero}</span><span>Atendiendo: <b>${f.letra}-${f.actual}</b></span><button class="btn chico" data-esperar>⏩ Esperar sentado</button>`;
  const b = el.querySelector('[data-esperar]');
  if (b) b.onclick = () => Escena3D.esperarTurno();
}

function aviso(texto, ms = 4500) {
  const cont = document.getElementById('toasts');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = texto;
  cont.appendChild(el);
  while (cont.children.length > 4) cont.firstChild.remove();
  setTimeout(() => el.classList.add('salir'), ms);
  setTimeout(() => el.remove(), ms + 600);
}

function mostrarAvisosNuevos() {
  const nuevos = G.bitacora.filter(b => (b.seq || 0) > ultimoSeqVisto).slice(0, 3).reverse();
  if (ultimoSeqVisto === 0) { ultimoSeqVisto = G.seq || 0; return; }
  ultimoSeqVisto = G.seq || 0;
  nuevos.forEach(b => aviso(`<span class="toast-${b.tipo}">${b.texto}</span>`));
}

// Lo que pasa al interactuar con el mundo 3D
function manejarInteraccion(ev) {
  if (!G || G.fase === 'fin') return;
  const l = ev.lugar ? LUGARES[ev.lugar] : null;
  switch (ev.tipo) {
    case 'negocio': return infoNegocio();
    case 'gestion':
      if (G.fase === 'operacion') { cajon = 'negocio'; render(); return; }
      return infoNegocio();
    case 'cerrado': {
      const finde = esFinDeSemana(fechaActual());
      const antes = !finde && G.hora < l.abre;
      const botones = [];
      if (antes) botones.push({ texto: `⏳ Esperar a que abra (${horaTexto(l.abre)})`, accion: () => { G.hora = l.abre; guardar(); } });
      botones.push({ texto: '🛏️ Ir a casa y volver mañana', accion: () => { esperarDia(); } });
      botones.push({ texto: 'OK', clase: ' ' });
      abrirModalAhora(`🔒 ${l.nombre} está cerrado`, `<p class="cita">"Horario de atención: ${horarioLugar(l)}."</p>
        <p>${finde ? 'Es fin de semana: vuelve el lunes.' : antes ? 'Todavía no abren.' : 'Ya cerraron por hoy.'}</p>`, botones, { hablante: 'Guardia' });
      return;
    }
    case 'cierreAtencion':
      abrirModalAhora('⌛ Se terminó la atención', `<p class="cita">"Señores, se terminó el horario de atención. Los números que quedan se atienden mañana."</p>
        <p>Te quedaste sin atención. Vuelve mañana más temprano.</p>`, [{ texto: 'Salir', accion: () => Escena3D.volverAlExterior() }], { hablante: 'Guardia', sonido: 'rechazo' });
      return;
    case 'sinNumero':
      abrirModalAhora(`${l.emoji} ${l.nombre}`, `<p class="cita">"Buenos días. Primero tiene que sacar número en el tótem de la entrada, por favor."</p>`,
        [{ texto: 'Ok, voy' }], { hablante: ev.hablante });
      return;
    case 'noEsTuTurno':
      abrirModalAhora(`${l.emoji} ${l.nombre}`, `<p class="cita">"Todavía no es su turno. Vamos en el ${ev.fila.letra}-${ev.fila.actual} y usted tiene el ${ev.fila.letra}-${ev.fila.numero}. Tome asiento, por favor."</p>`,
        [{ texto: 'Esperar', accion: () => Escena3D.esperarTurno() }, { texto: 'Cerrar', clase: ' ' }], { hablante: ev.hablante });
      return;
    case 'otroModulo':
      abrirModalAhora(`${l.emoji} ${l.nombre}`, `<p class="cita">"Su número lo atienden en el módulo ${ev.fila.modulo}, no en este."</p>`,
        [{ texto: 'Perdón' }], { hablante: ev.hablante });
      return;
    case 'atencion': return abrirLugar(ev.lugar, ev.hablante);
    case 'finDia':
      abrirModalAhora('🌙 Se hizo de noche', `<p>Ya son las ${horaTexto(G.hora)}. Te vas a casa a descansar.</p>`,
        [{ texto: '🛏️ Dormir hasta mañana', accion: () => { esperarDia(); Escena3D.volverAlExterior(); } }]);
      return;
  }
}

function infoNegocio() {
  const r = rubro();
  let html, botones = [];
  if (G.fase === 'operacion') {
    const s = G.ultimaSemana;
    html = `<p><b>${esc(G.empresa)}</b> está abierto. ${r.emoji}</p>
      <ul><li>Trabajadores: ${G.empleados} (+ tú)</li>
      <li>Precio: ${dinero(precioActual())}</li>
      <li>Última semana: ${s ? `${s.ventas} ${r.unidad}, ${dinero(s.ingresos)}` : 'aún sin cierre'}</li></ul>`;
    botones.push({ texto: '📊 Gestionar', accion: () => { cajon = 'negocio'; } });
    botones.push({ texto: '⏩ Trabajar una semana', clase: ' ', accion: () => avanzarSemana() });
  } else if (puedeAbrir()) {
    html = '<p>¡Tienes todos los permisos! ¿Cortamos la cinta?</p>';
    botones.push({ texto: '🎊 Cortar la cinta y abrir', accion: () => { abrirNegocio(); if (hay3D) Escena3D.refrescarInterior(); } });
  } else if (hecho('arriendo')) {
    html = `<p>Ya tienes el lugar, pero te faltan permisos para abrir:</p>
      <ul>${tramitesAplicables().filter(t => esObligatorio(t) && !hecho(t.id)).map(t => `<li>${nombreTramite(t)} <small>(${LUGARES[t.lugar].nombre})</small></li>`).join('')}</ul>`;
  } else {
    html = `<p>Aquí estará <b>${esc(G.empresa)}</b>. Por ahora es un sitio vacío.</p>
      <p>Arriéndalo en la <b>Corredora de Propiedades</b> (antes debes constituir la empresa).</p>`;
  }
  botones.push({ texto: 'Volver', clase: ' ' });
  abrirModalAhora(`${r.emoji} Tu negocio`, html, botones);
}

function barraEstado() {
  const r = rubro();
  const f = fechaActual();
  const pac = clamp(G.paciencia, 0, 100);
  return `
  <header class="barra">
    <div class="marca">RUT<span>a</span> al Éxito</div>
    <div class="empresa-info">
      <span class="emoji">${r.emoji}</span>
      <div><b>${esc(G.empresa)}</b>${G.sociedad ? ' ' + SOCIEDADES[G.sociedad].nombre : ''}
      <small>${G.rut ? 'RUT ' + G.rut : 'Sin RUT todavía'} · ${esc(G.jugador)}</small></div>
    </div>
    <div class="stats">
      <div class="stat"><small>📅 Fecha</small><b>${textoFecha(f)}</b></div>
      <div class="stat ${G.caja < 0 ? 'neg' : ''}"><small>💰 Caja</small><b>${dinero(G.caja)}</b></div>
      <div class="stat"><small>🧘 Paciencia</small><div class="barrita"><i style="width:${pac}%" class="${pac < 30 ? 'baja' : ''}"></i></div></div>
      <div class="stat"><small>⭐ Reputación</small><div class="barrita"><i style="width:${G.reputacion}%" class="rep"></i></div></div>
      ${G.fase === 'operacion' ? `<div class="stat"><small>📆 Semana</small><b>${G.semanasOperando} / ${SEMANAS_PARA_GANAR}</b></div>` : ''}
    </div>
    <button class="btn chico" data-accion="menu">☰ Menú</button>
  </header>`;
}

function panelTramites() {
  const lista = tramitesAplicables();
  const obligatorios = lista.filter(esObligatorio);
  const listos = obligatorios.filter(t => hecho(t.id)).length;
  const item = t => {
    const e = estadoTramite(t);
    const icono = e === 'hecho' ? '✅' : e === 'disponible' ? '🟡' : '🔒';
    const falta = e === 'bloqueado' ? `<small>Requiere: ${faltantes(t).map(id => nombreTramite(tramite(id))).join(', ')}</small>` : '';
    const res = G.tramites[t.id] && G.tramites[t.id].resultado === 'perdido' ? ' <small>(no ganado)</small>' : '';
    return `<li class="tramite ${e}" data-lugar="${t.lugar}">
      <span>${icono}</span>
      <div><b>${nombreTramite(t)}</b>${res}<small>${LUGARES[t.lugar].emoji} ${LUGARES[t.lugar].nombre}</small>${falta}</div>
    </li>`;
  };
  return `
  <div class="tarjeta">
    <h3>📋 Trámites para abrir <span class="contador">${listos}/${obligatorios.length}</span></h3>
    <div class="progreso"><i style="width:${listos / obligatorios.length * 100}%"></i></div>
    <ul class="lista-tramites">${obligatorios.map(item).join('')}</ul>
    ${G.fase === 'tramites' ? `<button class="btn primario grande ancho" data-accion="abrir" ${puedeAbrir() ? '' : 'disabled'}>
      🎊 Abrir el negocio</button>` : '<p class="ok">🎊 ¡Negocio abierto!</p>'}
    <h3>✨ Opcionales</h3>
    <ul class="lista-tramites">${lista.filter(t => !esObligatorio(t)).map(item).join('')}</ul>
  </div>`;
}

function panelEspera() {
  const f = fechaActual();
  return `
  <div class="tarjeta aviso">
    <div>
      <b>Fase 1: La burocracia</b>
      <p>Visita los lugares del mapa para completar tus trámites. ${esFinDeSemana(f) ? '<b>Hoy es fin de semana:</b> solo funcionan los trámites online.' : ''}</p>
    </div>
    <button class="btn" data-accion="esperar">⏭ Esperar un día</button>
  </div>`;
}

function panelOperacion() {
  const r = rubro();
  const s = G.ultimaSemana;
  const dem = Math.round(demandaSemanal());
  const cap = Math.round(capacidadSemanal());
  const deuda = deudaF29();
  const proxF29 = G.f29.length ? Math.min(...G.f29.map(d => d.vence)) : null;
  const mods = G.modificadores.filter(m => m.dias < 9000);
  const maxCaja = Math.max(1, ...G.historial.map(h => Math.abs(h.caja)));

  return `
  <div class="tarjeta operacion">
    <div class="op-cabecera">
      <h3>📊 Operación de ${esc(G.empresa)}</h3>
      <div class="op-botones">
        <button class="btn" data-accion="dia">⏭ 1 día</button>
        <button class="btn primario" data-accion="semana">⏩ Avanzar semana</button>
      </div>
    </div>

    ${G.bloqueoFacturacion ? '<p class="alerta">⛔ Facturación bloqueada por el SII. Paga tus F29 atrasados para volver a vender.</p>' : ''}
    ${deuda ? `<p class="alerta">🧾 Debes ${dinero(deuda)} de F29. ${proxF29 !== null && G.diaJuego <= proxF29 ? 'Vence el ' + textoFecha(fechaDe(proxF29)) + '.' : '¡Está atrasado!'}
      <button class="btn chico" data-accion="f29">Pagar ahora</button></p>` : ''}

    <div class="kpis">
      <div class="kpi"><small>Demanda estimada</small><b>${dem}</b><small>${r.unidad}/semana</small></div>
      <div class="kpi ${cap < dem ? 'neg' : ''}"><small>Capacidad</small><b>${cap}</b><small>${r.unidad}/semana</small></div>
      <div class="kpi"><small>Ventas última semana</small><b>${s ? dinero(s.ingresos) : '—'}</b><small>${s ? s.ventas + ' ' + r.unidad : 'Aún no cierras una semana'}</small></div>
      <div class="kpi ${s && s.utilidad < 0 ? 'neg' : ''}"><small>Margen semana</small><b>${s ? dinero(s.utilidad) : '—'}</b><small>sin arriendo ni sueldos</small></div>
    </div>

    <div class="controles">
      <label>💲 Precio: <b>${dinero(precioActual())}</b> <small>(base ${dinero(r.precioBase)})</small>
        <input type="range" min="0.7" max="1.6" step="0.05" value="${G.precioFactor}" data-control="precio">
      </label>
      <label>📣 Marketing: <b>${dinero(G.marketing)}</b>/semana
        <input type="range" min="0" max="600000" step="20000" value="${G.marketing}" data-control="marketing">
      </label>
      <div class="equipo">
        <span>👥 Trabajadores: <b>${G.empleados}</b> <small>(+ tú)</small><br>
        <small>Sueldo: ${dinero(r.sueldo)} + ${Math.round(COTIZACIONES_EMPLEADOR * 100)}% cotizaciones</small></span>
        <div>
          <button class="btn chico" data-accion="despedir" ${G.empleados ? '' : 'disabled'}>➖</button>
          <button class="btn chico" data-accion="contratar">➕ Contratar</button>
        </div>
      </div>
    </div>

    ${mods.length ? `<div class="mods">${mods.map(m => `<span class="chip ${m.factor >= 1 ? 'pos' : 'neg'}">${m.nombre} (${m.dias}d)</span>`).join('')}</div>` : ''}

    ${G.historial.length ? `<div class="grafico" title="Caja al cierre de cada semana">
      ${G.historial.slice(-26).map(h => `<i class="${h.caja < 0 ? 'neg' : ''}" style="height:${Math.max(2, Math.abs(h.caja) / maxCaja * 100)}%" title="Semana ${h.semana}: ${dinero(h.caja)}"></i>`).join('')}
    </div><small class="leyenda">Caja al cierre de cada semana</small>` : ''}
  </div>`;
}

function mapa() {
  const r = rubro();
  const lugares = Object.entries(LUGARES).filter(([id]) =>
    tramitesAplicables().some(t => t.lugar === id) || id === 'sii');
  return `
  <div class="tarjeta">
    <h3>🗺️ La ciudad</h3>
    <div class="mapa">
      ${lugares.map(([id, l]) => {
        const disp = tramitesAplicables().filter(t => t.lugar === id && estadoTramite(t) === 'disponible').length;
        const f29 = id === 'sii' && deudaF29() > 0;
        const cerrado = !l.online && esFinDeSemana(fechaActual());
        return `<button class="edificio ${disp || f29 ? 'activo' : ''} ${cerrado ? 'cerrado' : ''}" data-lugar-abrir="${id}">
          <span class="ed-emoji">${l.emoji}</span>
          <b>${l.nombre}</b>
          <small>${cerrado ? '🔒 Cerrado hoy' : horarioLugar(l)}</small>
          ${disp || f29 ? `<span class="badge">${disp + (f29 ? 1 : 0)}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

function panelBitacora() {
  return `
  <div class="tarjeta bitacora">
    <h3>📰 Bitácora</h3>
    <ul>${G.bitacora.map(b => `<li class="${b.tipo}"><small>${b.fecha}</small>${b.texto}</li>`).join('')}</ul>
  </div>`;
}

// ------------------------------------------------------------
//  Interacciones
// ------------------------------------------------------------
function enlazarEventosJuego() {
  app.querySelectorAll('[data-accion]').forEach(el => {
    el.onclick = () => {
      const a = el.dataset.accion;
      if (a === 'esperar') esperarDia();
      if (a === 'abrir') abrirNegocio();
      if (a === 'dia') { avanzarDia(); guardar(); }
      if (a === 'semana') avanzarSemana();
      if (a === 'contratar') contratar();
      if (a === 'despedir') despedir();
      if (a === 'f29') pagarF29();
      if (a === 'menu') return abrirMenu();
      if (a === 'sonido') Audio3D.alternarSilencio();
      if (a === 'casa') {
        return abrirModalAhora('🛏️ ¿Terminar el día?', '<p>Te vas a casa y mañana partes a las 8:00.</p>', [
          { texto: 'Sí, ir a casa', accion: () => { esperarDia(); Escena3D.volverAlExterior(); } },
          { texto: 'Seguir', clase: ' ' }]);
      }
      if (a === 'abrir' && hay3D) Escena3D.refrescarInterior();
      render();
    };
  });
  app.querySelectorAll('[data-cajon]').forEach(el => { el.onclick = () => alternarCajon(el.dataset.cajon); });
  const obj = app.querySelector('.hud-objetivo[data-ir]');
  if (obj && obj.dataset.ir) obj.onclick = () => Escena3D.irA(obj.dataset.ir);
  const pr = document.getElementById('hudPrompt');
  if (pr) pr.onclick = () => Escena3D.interactuar();
  app.querySelectorAll('[data-lugar-abrir]').forEach(el => {
    el.onclick = () => abrirLugar(el.dataset.lugarAbrir);
  });
  app.querySelectorAll('.tramite[data-lugar]').forEach(el => {
    el.onclick = () => {
      if (hay3D && Escena3D.irA(el.dataset.lugar)) { cajon = null; render(); }
      else abrirLugar(el.dataset.lugar);
    };
  });
  app.querySelectorAll('[data-control]').forEach(el => {
    el.oninput = () => {
      if (el.dataset.control === 'precio') G.precioFactor = Number(el.value);
      if (el.dataset.control === 'marketing') G.marketing = Number(el.value);
    };
    el.onchange = () => { guardar(); render(); };
  });
}

function abrirLugar(id, hablante) {
  const l = LUGARES[id];
  const tramites = tramitesAplicables().filter(t => t.lugar === id);
  const cerrado = !l.online && esFinDeSemana(fechaActual());
  const saludos = ['Buenos días. ¿En qué le puedo ayudar?', 'Siguiente, por favor. ¿Qué trámite necesita?', 'Hola, cuénteme, ¿qué necesita?'];
  let html = hablante
    ? `<p class="cita">"${G.hora >= 12 * 60 ? saludos[0].replace('días', 'tardes') : azar(saludos)}"</p>`
    : `<p class="sub">${horarioLugar(l)}${cerrado ? ' · <b>Hoy está cerrado</b>: si haces un trámite, esperarás hasta el lunes.' : ''}</p>`;
  const botones = [];
  // Después de un trámite, se termina la atención y sales a la calle
  const tras = ok => { if (ok && hay3D && hablante) { Escena3D.terminarFila(); Escena3D.salirCuandoTermine('Al día siguiente...'); } };

  if (id === 'sii' && G.f29.length) {
    html += `<div class="tramite-detalle disponible"><b>🧾 Declarar y pagar F29</b>
      <p>Deuda: ${G.f29.map(d => `${d.periodo}: ${dinero(d.monto)}${d.multado ? ' (con multa)' : ''}`).join(' · ')}</p></div>`;
    botones.push({ texto: `Pagar F29 (${dinero(deudaF29())})`, accion: () => pagarF29() });
  }

  for (const t of tramites) {
    const e = estadoTramite(t);
    const costo = costoTramite(t);
    html += `<div class="tramite-detalle ${e}">
      <b>${e === 'hecho' ? '✅' : e === 'disponible' ? '🟡' : '🔒'} ${nombreTramite(t)}</b>
      <p>${t.desc}</p>
      <small>⏱ ${t.dias} día(s) · 💰 ${costo ? dinero(costo) : 'Gratis'}${G.intentos[t.id] ? ` · Intentos fallidos: ${G.intentos[t.id]}` : ''}</small>
      ${e === 'bloqueado' ? `<small class="falta">Antes necesitas: ${faltantes(t).map(i => nombreTramite(tramite(i))).join(', ')}</small>` : ''}
    </div>`;
    if (e === 'disponible') {
      botones.push({
        texto: `Hacer: ${nombreTramite(t)}`,
        accion: () => t.especial === 'sociedad' ? elegirSociedad(hablante, tras) : tras(intentarTramite(t.id, { hablante })),
      });
    }
  }
  if (!botones.length) html += hablante ? '<p>No tienes trámites pendientes aquí por ahora. 😌</p>' : '<p>No tienes nada pendiente aquí. 😌</p>';
  botones.push({ texto: hablante ? 'Nada más, gracias' : 'Volver', clase: ' ' });
  abrirModalAhora(`${l.emoji} ${l.nombre}`, html, botones, { hablante });
}

function elegirSociedad(hablante, tras = () => {}) {
  const html = `<p>¿Qué tipo de sociedad quieres crear?</p>
    <div class="sociedades">${Object.entries(SOCIEDADES).map(([id, s]) =>
      `<div class="tramite-detalle"><b>${s.nombre}</b> — ${s.largo}<p>${s.desc}</p></div>`).join('')}</div>`;
  abrirModalAhora('🏗️ Constituir la empresa', html, Object.entries(SOCIEDADES).map(([id, s]) => ({
    texto: `Crear ${s.nombre}`,
    accion: () => tras(intentarTramite('constitucion', { sociedad: id, hablante })),
  })).concat([{ texto: 'Cancelar', clase: ' ' }]), { hablante });
}

function abrirMenu() {
  abrirModalAhora('☰ Menú', `<p>Tu partida se guarda automáticamente en este navegador.</p>`, [
    { texto: 'Seguir jugando' },
    { texto: 'Rendirse y ver resultado', clase: ' ', accion: () => terminar(G.fase === 'operacion' ? 'tiempo' : 'quiebra') },
    { texto: 'Volver al inicio', clase: ' ', accion: () => { guardar(); if (hay3D) Escena3D.volverAlExterior(); cajon = null; G = null; } },
  ]);
}

// ------------------------------------------------------------
//  Pantalla final
// ------------------------------------------------------------
function renderFinal() {
  const fin = G.final;
  const r = rubro();
  app.innerHTML = `
  <section class="final">
    <div class="tarjeta final-caja">
      <div class="final-emoji">${fin.nivel.emoji}</div>
      <h1>${fin.nivel.titulo}</h1>
      <p>${fin.nivel.texto}</p>
      <table class="resumen">
        <tr><td>Empresa</td><td>${r.emoji} ${esc(G.empresa)} ${G.sociedad ? SOCIEDADES[G.sociedad].nombre : ''}</td></tr>
        <tr><td>Días de trámites hasta abrir</td><td>${G.diaApertura !== null ? G.diaApertura : 'Nunca abrió'}</td></tr>
        <tr><td>Semanas operando</td><td>${G.semanasOperando}</td></tr>
        <tr><td>Caja final</td><td>${dinero(G.caja)}</td></tr>
        <tr><td>Deudas (crédito + impuestos)</td><td>−${dinero(fin.deudas)}</td></tr>
        <tr><td>Valor de equipos</td><td>${dinero(fin.activos)}</td></tr>
        <tr><td>Valor de la clientela</td><td>${dinero(fin.goodwill)}</td></tr>
        <tr class="total"><td>Valor de la empresa</td><td>${dinero(fin.valor)}</td></tr>
        ${G.parteSocio ? `<tr><td>Tu parte (${Math.round((1 - G.parteSocio) * 100)}%)</td><td>${dinero(fin.tuParte)}</td></tr>` : ''}
        <tr><td>Capital inicial</td><td>${dinero(CAPITAL_INICIAL)}</td></tr>
      </table>
      <button class="btn primario grande" data-accion="reiniciar">🔁 Jugar de nuevo</button>
    </div>
    ${panelBitacora()}
  </section>`;
  app.querySelector('[data-accion="reiniciar"]').onclick = () => { borrarPartida(); render(); };
}

// ------------------------------------------------------------
//  Arranque
// ------------------------------------------------------------
window.addEventListener('keydown', ev => {
  if (!hay3D || !G || G.fase === 'fin') return;
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  if (!modal.classList.contains('oculto')) return;
  const k = ev.key.toLowerCase();
  if (k === 't') alternarCajon('tramites');
  if (k === 'b') alternarCajon('bitacora');
  if (k === 'n' && G.fase === 'operacion') alternarCajon('negocio');
  if (k === 'escape' && cajon) alternarCajon(null);
  if (k === 'm') { Audio3D.alternarSilencio(); render(); }
});

// Reloj del HUD y letreros (abierto/cerrado) sin redibujar todo
let ultimaHoraEntera = -1;
setInterval(() => {
  if (!hay3D || !G || G.fase === 'fin') return;
  const el = document.getElementById('hudReloj');
  if (el) el.textContent = horaTexto(G.hora);
  const h = Math.floor(G.hora / 30);
  if (h !== ultimaHoraEntera) { ultimaHoraEntera = h; Escena3D.actualizar(); guardar(); }
}, 500);

render();
