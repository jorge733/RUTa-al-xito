// ============================================================
//  RUTa al Éxito — Interfaz
// ============================================================

const app = document.getElementById('app');
const modal = document.getElementById('modal');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ------------------------------------------------------------
//  Modal con cola
// ------------------------------------------------------------
function mostrarSiguienteModal() {
  if (!colaModal.length) { modal.classList.add('oculto'); return; }
  const m = colaModal[0];
  modal.innerHTML = `
    <div class="modal-caja" role="dialog" aria-modal="true">
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

function abrirModalAhora(titulo, html, botones) {
  colaModal.unshift({ titulo, html, botones: botones || [{ texto: 'Cerrar' }] });
  mostrarSiguienteModal();
}

// ------------------------------------------------------------
//  Render principal
// ------------------------------------------------------------
function render() {
  if (!G) renderInicio();
  else if (G.fase === 'fin') renderFinal();
  else renderJuego();
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
  if (fc) fc.onclick = () => { if (cargar()) render(); };
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
        <li>Haz clic en los <b>lugares del mapa</b> para hacer trámites.</li>
        <li>Algunos trámites <b>requieren otros</b> primero. Revisa la lista de la izquierda.</li>
        <li>Las oficinas presenciales <b>cierran el fin de semana</b>.</li>
        <li>Si te rechazan, pierdes el día y <b>paciencia</b>. Si llega a cero, colapsas.</li>
        <li>Cuando arriendes el local, el <b>arriendo corre</b> todos los meses: ¡no te demores!</li>
      </ul>`, [{ texto: '¡Vamos!' }]);
    render();
  };
}

// ------------------------------------------------------------
//  Pantalla de juego
// ------------------------------------------------------------
function renderJuego() {
  const r = rubro();
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
          <small>${cerrado ? '🔒 Cerrado hoy' : l.horario}</small>
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
      render();
    };
  });
  app.querySelectorAll('[data-lugar-abrir]').forEach(el => {
    el.onclick = () => abrirLugar(el.dataset.lugarAbrir);
  });
  app.querySelectorAll('.tramite[data-lugar]').forEach(el => {
    el.onclick = () => abrirLugar(el.dataset.lugar);
  });
  app.querySelectorAll('[data-control]').forEach(el => {
    el.oninput = () => {
      if (el.dataset.control === 'precio') G.precioFactor = Number(el.value);
      if (el.dataset.control === 'marketing') G.marketing = Number(el.value);
    };
    el.onchange = () => { guardar(); render(); };
  });
}

function abrirLugar(id) {
  const l = LUGARES[id];
  const tramites = tramitesAplicables().filter(t => t.lugar === id);
  const cerrado = !l.online && esFinDeSemana(fechaActual());
  let html = `<p class="sub">${l.horario}${cerrado ? ' · <b>Hoy está cerrado</b>: si haces un trámite, esperarás hasta el lunes.' : ''}</p>`;
  const botones = [];

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
        accion: () => t.especial === 'sociedad' ? elegirSociedad() : intentarTramite(t.id),
      });
    }
  }
  if (id === 'sii' && !tramites.length && !G.f29.length) html += '<p>No tienes nada pendiente con el SII. 😌</p>';
  botones.push({ texto: 'Volver', clase: ' ' });
  abrirModalAhora(`${l.emoji} ${l.nombre}`, html, botones);
}

function elegirSociedad() {
  const html = `<p>¿Qué tipo de sociedad quieres crear?</p>
    <div class="sociedades">${Object.entries(SOCIEDADES).map(([id, s]) =>
      `<div class="tramite-detalle"><b>${s.nombre}</b> — ${s.largo}<p>${s.desc}</p></div>`).join('')}</div>`;
  abrirModalAhora('🏗️ Constituir la empresa', html, Object.entries(SOCIEDADES).map(([id, s]) => ({
    texto: `Crear ${s.nombre}`,
    accion: () => intentarTramite('constitucion', { sociedad: id }),
  })).concat([{ texto: 'Cancelar', clase: ' ' }]));
}

function abrirMenu() {
  abrirModalAhora('☰ Menú', `<p>Tu partida se guarda automáticamente en este navegador.</p>`, [
    { texto: 'Seguir jugando' },
    { texto: 'Rendirse y ver resultado', clase: ' ', accion: () => terminar(G.fase === 'operacion' ? 'tiempo' : 'quiebra') },
    { texto: 'Volver al inicio', clase: ' ', accion: () => { guardar(); G = null; } },
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
render();
