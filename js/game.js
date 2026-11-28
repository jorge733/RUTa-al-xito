// ============================================================
//  RUTa al Éxito — Lógica del juego
// ============================================================

const SAVE_KEY = 'ruta-al-exito-v1';
let G = null;          // Estado de la partida
let colaModal = [];    // Mensajes pendientes por mostrar

// ------------------------------------------------------------
//  Utilidades
// ------------------------------------------------------------
const fmtCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function dinero(n) { return fmtCLP.format(Math.round(n)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function azar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
function rubro() { return RUBROS[G.rubroId]; }

function fechaDe(dia) {
  const f = new Date(FECHA_INICIO);
  f.setDate(f.getDate() + dia);
  return f;
}
function fechaActual() { return fechaDe(G.diaJuego); }
function textoFecha(f) {
  return f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function esFinDeSemana(f) { const d = f.getDay(); return d === 0 || d === 6; }

function log(texto, tipo = 'info') {
  G.seq = (G.seq || 0) + 1;
  G.bitacora.unshift({ fecha: textoFecha(fechaActual()), texto, tipo, seq: G.seq });
  if (G.bitacora.length > 120) G.bitacora.pop();
}

// opciones: { hablante } muestra el mensaje como diálogo con un personaje
function encolar(titulo, html, botones, opciones = {}) {
  colaModal.push({ titulo, html, botones: botones || [{ texto: 'Seguir' }], ...opciones });
}

// Reloj del día (minutos desde las 00:00). Cada día nuevo parte a las 8:00.
const HORA_INICIO_DIA = 8 * 60;
function horaTexto(min) {
  min = Math.floor(min);
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function lugarAbierto(id) {
  const l = LUGARES[id];
  if (l.online) return true;
  if (esFinDeSemana(fechaActual())) return false;
  const h = G.hora ?? HORA_INICIO_DIA;
  return h >= l.abre && h < l.cierra;
}

// Genera un RUT válido (con dígito verificador módulo 11).
// Por defecto, uno de empresa (76-78 millones); con otros límites, uno de persona.
function generarRut(desde = 76000000, rango = 2999999) {
  const cuerpo = desde + Math.floor(Math.random() * rango);
  let suma = 0, mult = 2;
  for (const c of String(cuerpo).split('').reverse()) {
    suma += Number(c) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  const dv = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return cuerpo.toLocaleString('es-CL') + '-' + dv;
}

// ------------------------------------------------------------
//  Partida
// ------------------------------------------------------------
function nuevoJuego(jugador, empresa, rubroId) {
  G = {
    version: 1, jugador, empresa, rubroId,
    diaJuego: 0, hora: HORA_INICIO_DIA,
    caja: CAPITAL_INICIAL,
    paciencia: 100,
    reputacion: 50,
    fase: 'tramites',          // 'tramites' | 'operacion' | 'fin'
    tramites: {},              // id -> { dia, resultado }
    intentos: {},              // id -> número de rechazos
    sociedad: null, parteSocio: 0,
    rut: null,
    empleados: 0, bonos: 0,
    precioFactor: 1, marketing: 0, costoFactor: 1,
    modificadores: [],         // { tipo, factor, dias, nombre }
    flags: {},
    credito: null,             // { saldo, cuota, cuotasRestantes }
    iva: { debito: 0, credito: 0, remanente: 0, ventasNetas: 0 },
    f29: [],                   // { periodo, monto, vence, multado }
    porCobrar: [],             // { monto, dia }
    bloqueoFacturacion: false,
    semana: nuevaSemana(),
    ultimaSemana: null,
    historial: [],
    semanasOperando: 0, diaApertura: null,
    bitacora: [],
    final: null,
  };
  log(`${jugador} decide emprender: nace la idea de "${empresa}" (${rubro().nombre}).`, 'bueno');
  log(`Tienes ${dinero(CAPITAL_INICIAL)} entre ahorros y un préstamo de la familia.`);
  guardar();
}

function nuevaSemana() { return { ventas: 0, demanda: 0, capacidad: 0, ingresos: 0, costos: 0, dias: 0 }; }

function guardar() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* sin almacenamiento */ }
}
function cargar() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return false;
    G = JSON.parse(data);
    return G && G.version === 1;
  } catch (e) { return false; }
}
function hayPartidaGuardada() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function borrarPartida() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ }
  G = null;
}

// ------------------------------------------------------------
//  Trámites
// ------------------------------------------------------------
function val(campo, r) { return typeof campo === 'function' ? campo(r) : campo; }

function tramitesAplicables() {
  const r = rubro();
  return TRAMITES.filter(t => !t.aplica || t.aplica(r));
}
function tramite(id) { return TRAMITES.find(t => t.id === id); }
function nombreTramite(t) { return val(t.nombre, rubro()); }
function costoTramite(t) { return val(t.costo, rubro()); }
function requisitos(t) { return val(t.requiere, rubro()); }
function hecho(id) { return !!G.tramites[id]; }
function faltantes(t) { return requisitos(t).filter(id => !hecho(id)); }
function esObligatorio(t) { return t.paraAbrir !== false; }

function estadoTramite(t) {
  if (hecho(t.id)) return 'hecho';
  if (faltantes(t).length) return 'bloqueado';
  return 'disponible';
}

function puedeAbrir() {
  return tramitesAplicables().filter(esObligatorio).every(t => hecho(t.id));
}

// Intentar un trámite. Devuelve true si se ejecutó (aunque lo rechacen).
function intentarTramite(id, opciones = {}) {
  const t = tramite(id);
  const r = rubro();
  const lugar = LUGARES[t.lugar];
  if (estadoTramite(t) !== 'disponible') return false;

  const costo = costoTramite(t);
  if (costo > 0 && G.caja - costo < -LIMITE_SOBREGIRO) {
    encolar('💸 No te alcanza', `<p>Este trámite cuesta <b>${dinero(costo)}</b> y no tienes cómo pagarlo.</p>
      <p>Prueba pidiendo un crédito en el banco o postulando a un fondo.</p>`);
    return false;
  }

  // Oficinas presenciales cerradas el fin de semana
  if (!lugar.online) {
    let espera = 0;
    while (esFinDeSemana(fechaActual())) { avanzarDia(); espera++; }
    if (espera) log(`${lugar.nombre} está cerrado el fin de semana. Esperas ${espera} día(s).`);
  }

  // Día de fila
  G.ausente = true;
  avanzarDia();

  // ¿Rechazo?
  const intentos = G.intentos[id] || 0;
  const prob = t.rechazo * Math.pow(0.5, intentos) * (opciones.procesoCompleto ? 0.35 : 1);
  if (Math.random() < prob) {
    G.intentos[id] = intentos + 1;
    G.ausente = false;
    const motivo = azar((RECHAZOS_ESPECIFICOS[t.lugar] || []).concat(RECHAZOS_GENERALES));
    G.paciencia -= 20;
    log(`Rechazado en ${lugar.nombre}: "${motivo}"`, 'malo');
    let html = `<p class="cita">"${motivo}"</p><p>Perdiste el día y algo de paciencia. La próxima vez será más fácil (ya sabes qué piden).</p>`;
    if (G.paciencia <= 0) {
      html += colapso();
    }
    encolar(`🙅 ${lugar.nombre}: vuelva mañana`, html, null, { hablante: opciones.hablante, sonido: 'rechazo' });
    guardar();
    return true;
  }

  // Aprobado: pagar y esperar los días que tarda
  if (costo > 0) {
    G.caja -= costo;
    // Solo las compras afectas a IVA generan crédito fiscal
    // (si pediste boleta en vez de factura, pierdes el crédito fiscal)
    if ((t.id === 'equipamiento' && !opciones.sinFactura) || t.id === 'pasarela') G.iva.credito += costo * IVA / (1 + IVA);
  }
  for (let i = 1; i < t.dias; i++) avanzarDia();
  G.ausente = false;
  G.tramites[id] = { dia: G.diaJuego };

  let html = `<p>${nombreTramite(t)}: <b>¡listo!</b></p>`;
  if (costo > 0) html += `<p>Pagaste ${dinero(costo)}.</p>`;
  if (opciones.sinFactura) html += '<p>⚠️ Pediste boleta: el IVA de esta compra <b>no</b> te sirve como crédito fiscal.</p>';
  html += efectoEspecial(t, opciones);
  log(`Trámite completado: ${nombreTramite(t)}${costo ? ' (' + dinero(costo) + ')' : ''}.`, 'bueno');
  encolar(`✅ ${lugar.nombre}`, html, null, { hablante: opciones.hablante, sonido: 'exito' });

  if (G.fase === 'tramites' && puedeAbrir() && !G.flags.avisoAbrir) {
    G.flags.avisoAbrir = true;
    encolar('🎉 ¡Todo en regla!', `<p>Tienes todos los permisos. Ya puedes <b>abrir las puertas</b> de ${G.empresa}.</p>
      <p>Ve a tu local (o usa la lista de trámites) para cortar la cinta.</p>`, null, { sonido: 'exito' });
  }
  guardar();
  return true;
}

// Rechazo causado por un error del jugador durante el proceso (le faltó un documento, etc.)
function rechazarTramite(id, motivo, opciones = {}) {
  const t = tramite(id);
  const lugar = LUGARES[t.lugar];
  G.ausente = true;
  avanzarDia();
  G.ausente = false;
  G.intentos[id] = (G.intentos[id] || 0) + 1;
  G.paciencia -= 15;
  log(`Rechazado en ${lugar.nombre}: "${motivo}"`, 'malo');
  let html = `<p class="cita">"${motivo}"</p><p>Perdiste el día y algo de paciencia. Revisa bien qué te piden antes de volver.</p>`;
  if (G.paciencia <= 0) html += colapso();
  encolar(`🙅 ${lugar.nombre}: vuelva mañana`, html, null, { hablante: opciones.hablante, sonido: 'rechazo' });
  guardar();
  return true;
}

function efectoEspecial(t, opciones) {
  if (t.id === 'arriendo' && opciones.local) G.local = opciones.local;
  if (t.id === 'cuentaBanco') {
    G.cuentaNumero = String(Math.floor(10000000 + Math.random() * 89999999)).replace(/(\d{2})(\d{6})/, '$1-$2-') + Math.floor(Math.random() * 10);
    return `<p>Tu cuenta corriente es la <b>N° ${G.cuentaNumero}</b>. La tarjeta llega en 5 días hábiles.</p>`;
  }
  if (t.id === 'inicioActividades') {
    G.rut = generarRut();
    return `<p>El RUT de tu empresa es <b>${G.rut}</b>. ¡Ya existe para el SII!</p>`;
  }
  if (t.especial === 'sociedad') {
    const s = SOCIEDADES[opciones.sociedad] || SOCIEDADES.eirl;
    G.sociedad = opciones.sociedad || 'eirl';
    G.parteSocio = s.parteSocio;
    G.caja += s.capitalExtra;
    if (s.capitalExtra) log(`Tu socio aporta ${dinero(s.capitalExtra)}.`, 'bueno');
    return `<p>Constituiste <b>${G.empresa} ${s.nombre}</b> (${s.largo}).</p>` +
      (s.capitalExtra ? `<p>Tu socio aportó ${dinero(s.capitalExtra)}.</p>` : '');
  }
  if (t.especial === 'fondo') {
    if (Math.random() < FONDO.probabilidad) {
      G.caja += FONDO.monto;
      G.tramites[t.id].resultado = 'ganado';
      log(`¡Ganaste el fondo concursable! +${dinero(FONDO.monto)}`, 'bueno');
      return `<p>🏆 <b>¡Te adjudicaste el fondo!</b> Recibes ${dinero(FONDO.monto)}.</p>`;
    }
    G.tramites[t.id].resultado = 'perdido';
    log('No ganaste el fondo concursable.', 'malo');
    return '<p>😔 Tu proyecto quedó en lista de espera. Esta vez no se pudo.</p>';
  }
  if (t.especial === 'credito') {
    const { monto, cuotas, tasa } = CREDITO;
    const cuota = Math.round(monto * tasa / (1 - Math.pow(1 + tasa, -cuotas)));
    G.caja += monto;
    G.credito = { saldo: monto, cuota, cuotasRestantes: cuotas };
    log(`Crédito aprobado: +${dinero(monto)}. Cuota mensual: ${dinero(cuota)}.`, 'bueno');
    return `<p>Recibes <b>${dinero(monto)}</b>. Pagarás ${cuotas} cuotas de ${dinero(cuota)} cada mes.</p>`;
  }
  if (t.id === 'mutual') return '<p>Ahora puedes contratar trabajadores.</p>';
  return '';
}

function colapso() {
  G.paciencia = 60;
  G.ausente = true;
  avanzarDia(); avanzarDia();
  G.ausente = false;
  log('Colapsaste de estrés y te tomaste 2 días de descanso.', 'malo');
  return '<p class="alerta">😵 Tu paciencia llegó a cero. Te tomas <b>2 días de descanso</b> obligado.</p>';
}

function esperarDia() {
  avanzarDia();
  guardar();
}

function abrirNegocio() {
  if (!puedeAbrir() || G.fase !== 'tramites') return;
  G.fase = 'operacion';
  G.diaApertura = G.diaJuego;
  G.semana = nuevaSemana();
  log(`🎊 ¡${G.empresa} abre sus puertas! Te tomó ${G.diaJuego} días.`, 'bueno');
  encolar('🎊 ¡Inauguración!', `<p><b>${G.empresa}</b> abre sus puertas después de <b>${G.diaJuego} días</b> de trámites.</p>
    <p>Ahora empieza lo difícil: vender, pagar sueldos, arriendo e impuestos. Tu meta es sobrevivir y crecer durante <b>${SEMANAS_PARA_GANAR} semanas</b>.</p>
    <p>Consejos:</p>
    <ul>
      <li>Ajusta el <b>precio</b> y el <b>marketing</b> en el panel de operación.</li>
      <li>Si no das abasto, <b>contrata</b> (primero adhiérete a una mutual).</li>
      <li>Cada mes debes declarar y pagar el <b>F29</b> en el SII antes del día 20.</li>
    </ul>`);
  guardar();
}

// ------------------------------------------------------------
//  Paso del tiempo
// ------------------------------------------------------------
function avanzarDia() {
  if (G.fase === 'fin') return;
  G.diaJuego++;
  G.hora = HORA_INICIO_DIA;
  const f = fechaActual();
  G.paciencia = clamp(G.paciencia + 4, -100, 100);

  if (f.getDate() === 1) inicioDeMes(f);
  revisarF29();
  cobrarPendientes();

  if (G.fase === 'operacion') simularDia();

  // Avanzar modificadores temporales
  G.modificadores.forEach(m => m.dias--);
  G.modificadores = G.modificadores.filter(m => m.dias > 0);

  G.reputacion = clamp(G.reputacion, 0, 100);
  if (G.caja < -LIMITE_SOBREGIRO) terminar('quiebra');
}

function avanzarSemana() {
  if (G.fase !== 'operacion') return;
  const objetivo = G.semanasOperando + 1;
  let guardia = 0;
  while (G.fase === 'operacion' && G.semanasOperando < objetivo && guardia++ < 10) avanzarDia();
  guardar();
}

function agregarModificador(tipo, factor, dias, nombre) {
  G.modificadores.push({ tipo, factor, dias, nombre });
}
function factorMods(tipo) {
  return G.modificadores.filter(m => m.tipo === tipo).reduce((a, m) => a * m.factor, 1);
}

function inicioDeMes(f) {
  const r = rubro();
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });

  if (hecho('arriendo')) {
    G.caja -= r.arriendo;
    log(`Pagaste el arriendo de ${mes}: ${dinero(r.arriendo)}.`);
  }
  if (G.fase === 'operacion') {
    G.caja -= r.servicios;
    G.iva.credito += r.servicios * IVA / (1 + IVA);
    log(`Pagaste servicios básicos (luz, agua, internet): ${dinero(r.servicios)}.`);
  }
  if (G.empleados > 0) {
    const sueldos = G.empleados * r.sueldo * (1 + COTIZACIONES_EMPLEADOR) + G.bonos;
    G.caja -= sueldos;
    log(`Pagaste sueldos y cotizaciones de ${G.empleados} trabajador(es): ${dinero(sueldos)}.`);
  }
  if (G.credito && G.credito.cuotasRestantes > 0) {
    const c = G.credito;
    const interes = c.saldo * CREDITO.tasa;
    c.saldo = Math.max(0, c.saldo - (c.cuota - interes));
    c.cuotasRestantes--;
    G.caja -= c.cuota;
    log(`Pagaste la cuota del crédito: ${dinero(c.cuota)} (quedan ${c.cuotasRestantes}).`);
    if (c.cuotasRestantes === 0) { c.saldo = 0; log('¡Terminaste de pagar el crédito!', 'bueno'); }
  }
  if ((f.getMonth() === 0 || f.getMonth() === 6) && hecho('patente')) {
    const pat = UTM * 2;
    G.caja -= pat;
    log(`Renovaste la patente municipal semestral: ${dinero(pat)}.`);
  }

  // Declaración mensual de IVA (F29) del mes anterior
  if (hecho('inicioActividades')) {
    const prev = fechaDe(G.diaJuego - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const iva = G.iva;
    let neto = iva.debito - iva.credito - iva.remanente;
    let remanente = 0;
    if (neto < 0) { remanente = -neto; neto = 0; }
    const ppm = iva.ventasNetas * PPM;
    const total = Math.round(neto + ppm);
    if (total > 0) {
      G.f29.push({ periodo: prev, monto: total, vence: G.diaJuego + 19, multado: false });
      log(`F29 de ${prev}: debes pagar ${dinero(total)} antes del día 20.`, 'alerta');
      encolar('🧾 Llegó el F29', `<p>Ya puedes declarar el IVA de <b>${prev}</b>.</p>
        <ul><li>IVA de tus ventas (débito): ${dinero(iva.debito)}</li>
        <li>IVA de tus compras (crédito): ${dinero(iva.credito)}</li>
        <li>Remanente del mes anterior: ${dinero(iva.remanente)}</li>
        <li>PPM (adelanto de renta): ${dinero(ppm)}</li></ul>
        <p>Total a pagar: <b>${dinero(total)}</b>. Paga en el <b>SII</b> antes del día 20 o tendrás multa.</p>`);
    } else {
      log(`F29 de ${prev}: sin impuesto a pagar. Remanente de crédito: ${dinero(remanente)}.`);
    }
    G.iva = { debito: 0, credito: 0, remanente, ventasNetas: 0 };
  }
}

function revisarF29() {
  for (const d of G.f29) {
    if (!d.multado && G.diaJuego > d.vence) {
      d.multado = true;
      const multa = Math.round(d.monto * 0.1 + UTM * 0.5);
      d.monto += multa;
      G.reputacion -= 2;
      log(`¡No pagaste el F29 de ${d.periodo} a tiempo! Multa e intereses: ${dinero(multa)}.`, 'malo');
      encolar('⚠️ F29 atrasado', `<p>No pagaste el F29 de <b>${d.periodo}</b>. Se suma una multa de ${dinero(multa)}.</p>
        <p>Si lo dejas más de 60 días, el SII bloqueará tu facturación.</p>`);
    }
    if (G.diaJuego > d.vence + 60 && !G.bloqueoFacturacion) {
      G.bloqueoFacturacion = true;
      log('El SII bloqueó tu facturación por deudas tributarias.', 'malo');
      encolar('⛔ Facturación bloqueada', '<p>El SII bloqueó tu facturación: <b>no puedes vender</b> hasta pagar todas tus deudas de F29.</p>');
    }
  }
}

function deudaF29() { return G.f29.reduce((a, d) => a + d.monto, 0); }

function pagarF29() {
  const total = deudaF29();
  if (!total) return;
  G.caja -= total;
  log(`Pagaste el F29: ${dinero(total)}.`, 'bueno');
  G.f29 = [];
  if (G.bloqueoFacturacion) {
    G.bloqueoFacturacion = false;
    log('El SII desbloqueó tu facturación.', 'bueno');
  }
  encolar('🧾 F29 pagado', `<p>Pagaste <b>${dinero(total)}</b> al SII. Estás al día con tus impuestos.</p>`);
  guardar();
}

function cobrarPendientes() {
  const listos = G.porCobrar.filter(p => G.diaJuego >= p.dia);
  for (const p of listos) {
    G.caja += p.monto;
    G.iva.debito += p.monto * IVA / (1 + IVA);
    G.iva.ventasNetas += p.monto / (1 + IVA);
    log(`Te pagaron la factura del cliente grande: ${dinero(p.monto)}.`, 'bueno');
  }
  G.porCobrar = G.porCobrar.filter(p => G.diaJuego < p.dia);
}

// ------------------------------------------------------------
//  Simulación de ventas
// ------------------------------------------------------------
function precioActual() { return Math.round(rubro().precioBase * G.precioFactor / 10) * 10; }

function demandaSemanal() {
  const r = rubro();
  const fPrecio = Math.pow(1 / G.precioFactor, r.elasticidad);
  const fRep = 0.4 + G.reputacion / 80;
  const fMkt = 1 + 0.35 * r.sensMarketing * Math.log10(1 + G.marketing / 20000);
  const fArranque = Math.min(1, 0.55 + G.semanasOperando * 0.075);
  return r.demandaBase * fPrecio * fRep * fMkt * fArranque * factorMods('demanda');
}

function capacidadSemanal() {
  const personas = G.empleados + (G.ausente ? 0 : 1);
  return personas * rubro().capacidadPorPersona * factorMods('capacidad');
}

function simularDia() {
  const r = rubro();
  const demanda = demandaSemanal() / 7 * (0.8 + Math.random() * 0.4);
  const capacidad = capacidadSemanal() / 7;
  let ventas = Math.floor(Math.min(demanda, capacidad));
  if (G.bloqueoFacturacion) ventas = 0;

  const ingresos = ventas * precioActual();
  const costoNeto = ventas * r.costoUnit * G.costoFactor;
  const mkt = G.marketing / 7;
  const costos = (costoNeto + mkt) * (1 + IVA);

  G.caja += ingresos - costos;
  G.iva.debito += ingresos * IVA / (1 + IVA);
  G.iva.ventasNetas += ingresos / (1 + IVA);
  G.iva.credito += (costoNeto + mkt) * IVA;

  const s = G.semana;
  s.ventas += ventas; s.demanda += demanda; s.capacidad += capacidad;
  s.ingresos += ingresos; s.costos += costos; s.dias++;

  if (s.dias >= 7) cierreSemana();
}

function cierreSemana() {
  const s = G.semana;
  G.semanasOperando++;
  const servicio = s.demanda > 0 ? s.ventas / s.demanda : 1;
  const carga = s.capacidad > 0 ? s.ventas / s.capacidad : 1;

  // Reputación: precio justo + buen servicio
  let objetivo = 55 + 35 * (1 - G.precioFactor) + (Math.min(servicio, 1) - 0.9) * 120;
  if (carga > 0.97) objetivo -= 5;
  objetivo = clamp(objetivo, 5, 98);
  G.reputacion = clamp(G.reputacion + (objetivo - G.reputacion) * 0.25, 0, 100);

  G.ultimaSemana = { ...s, servicio, carga, utilidad: s.ingresos - s.costos };
  G.historial.push({ semana: G.semanasOperando, caja: Math.round(G.caja), ingresos: Math.round(s.ingresos) });
  if (G.historial.length > 60) G.historial.shift();
  log(`Semana ${G.semanasOperando}: vendiste ${s.ventas} ${rubro().unidad} por ${dinero(s.ingresos)}.`);
  if (servicio < 0.85 && !G.bloqueoFacturacion) {
    log(`No diste abasto: ${Math.round((1 - servicio) * 100)}% de los clientes se fue sin comprar.`, 'alerta');
  }
  G.semana = nuevaSemana();

  if (G.semanasOperando >= SEMANAS_PARA_GANAR) { terminar('tiempo'); return; }

  // Evento aleatorio
  if (G.semanasOperando >= 2 && Math.random() < 0.4) lanzarEvento();
}

function lanzarEvento() {
  const r = rubro();
  G.eventosVistos = G.eventosVistos || [];
  let posibles = EVENTOS.filter(e => (!e.cond || e.cond(G, r)) && !G.eventosVistos.slice(-4).includes(e.id));
  if (!posibles.length) return;
  const e = azar(posibles);
  G.eventosVistos.push(e.id);
  encolar(e.titulo, `<p>${e.texto}</p>`, e.opciones.map(o => ({
    texto: o.texto,
    accion: () => {
      const msg = o.efecto(G, r);
      G.reputacion = clamp(G.reputacion, 0, 100);
      log(`${e.titulo.replace(/^\S+\s/, '')}: ${msg}`, 'evento');
      if (G.caja < -LIMITE_SOBREGIRO) terminar('quiebra');
      guardar();
      encolar('Resultado', `<p>${msg}</p>`);
    },
  })));
}

// ------------------------------------------------------------
//  Decisiones de operación
// ------------------------------------------------------------
function contratar() {
  if (!hecho('mutual')) {
    encolar('⛑️ Primero la mutual', '<p>Para contratar debes estar adherido a una <b>mutual de seguridad</b>. Búscala en el mapa.</p>');
    return;
  }
  const r = rubro();
  G.empleados++;
  G.caja -= 50000; // examen preocupacional, uniforme, etc.
  log(`Contrataste a un trabajador. Sueldo: ${dinero(r.sueldo)} + cotizaciones.`, 'bueno');
  guardar();
}

function despedir() {
  if (G.empleados <= 0) return;
  const r = rubro();
  const finiquito = Math.round(r.sueldo * 0.5);
  G.empleados--;
  G.caja -= finiquito;
  G.paciencia -= 10;
  log(`Desvinculaste a un trabajador. Finiquito: ${dinero(finiquito)}.`, 'alerta');
  guardar();
}

// ------------------------------------------------------------
//  Final
// ------------------------------------------------------------
function terminar(motivo) {
  if (G.fase === 'fin') return;
  const r = rubro();
  const deudas = (G.credito ? G.credito.saldo : 0) + deudaF29();
  const activos = hecho('equipamiento') ? r.equipamiento * 0.4 : 0;
  // Valor de la clientela: utilidad mensual real (descontando costos fijos) x 6 meses, según reputación
  const fijos = r.arriendo + r.servicios + G.empleados * r.sueldo * (1 + COTIZACIONES_EMPLEADOR) + G.bonos;
  const utilMensual = (G.ultimaSemana ? G.ultimaSemana.utilidad : 0) * 4.3 - fijos;
  const goodwill = G.fase === 'operacion' ? Math.max(0, utilMensual) * 6 * (G.reputacion / 100) : 0;
  const valor = motivo === 'quiebra' ? G.caja - deudas : G.caja - deudas + activos + goodwill;
  const tuParte = valor * (1 - G.parteSocio);

  let nivel;
  if (motivo === 'quiebra' || valor <= 0) nivel = { titulo: 'Quiebra', emoji: '💀', texto: 'El banco cerró tu línea de crédito. Pero los grandes emprendedores también quebraron alguna vez.' };
  else if (tuParte < CAPITAL_INICIAL) nivel = { titulo: 'Sobreviviente', emoji: '😅', texto: 'Llegaste vivo al final del año, aunque con menos de lo que pusiste. ¡Algo es algo!' };
  else if (tuParte < CAPITAL_INICIAL * 3) nivel = { titulo: 'Pyme sólida', emoji: '💪', texto: 'Tu empresa es rentable y tiene futuro. ¡Bien hecho!' };
  else nivel = { titulo: 'Magnate', emoji: '👑', texto: '¡Multiplicaste tu inversión! Ya te llaman para dar charlas de emprendimiento.' };

  G.final = { motivo, valor, tuParte, nivel, deudas, activos, goodwill };
  G.fase = 'fin';
  log(`Fin del juego: ${nivel.titulo}.`, motivo === 'quiebra' ? 'malo' : 'bueno');
  guardar();
}
