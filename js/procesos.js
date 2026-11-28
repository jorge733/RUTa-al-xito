// ============================================================
//  RUTa al Éxito — Procesos realistas de cada trámite
//  Cada trámite es una secuencia de pasos: entregar documentos,
//  llenar formularios, crear e ingresar tu Clave Única, firmar, pagar…
// ============================================================

// ------------------------------------------------------------
//  Datos personales del jugador (cédula, correo, claves)
// ------------------------------------------------------------
function asegurarPersona() {
  if (G.persona) return G.persona;
  const nacimiento = new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
  G.persona = {
    run: generarRut(12000000, 9000000),
    documento: String(Math.floor(100000000 + Math.random() * 899999999)).replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3'),
    nacimiento: nacimiento.toLocaleDateString('es-CL'),
    vence: new Date(2031, nacimiento.getMonth(), nacimiento.getDate()).toLocaleDateString('es-CL'),
    correo: null, celular: null,
    claveHash: null, fallosClave: 0,
  };
  return G.persona;
}

// Las claves del juego no se guardan en texto plano (y no son claves reales)
function hashClave(s) {
  let h = 5381;
  for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return 'h' + (h >>> 0).toString(36);
}
const limpiarRut = s => String(s || '').replace(/[^0-9kK]/g, '').toUpperCase();
const mismoRut = (a, b) => !!a && !!b && limpiarRut(a) === limpiarRut(b);

function cedulaHtml() {
  const p = asegurarPersona();
  return `<div class="cedula" aria-label="Tu cédula de identidad">
    <div class="cedula-cab">REPÚBLICA DE CHILE <span>CÉDULA DE IDENTIDAD</span></div>
    <div class="cedula-cuerpo">
      <div class="cedula-foto">🙂</div>
      <dl>
        <dt>Nombre</dt><dd>${esc(G.jugador)}</dd>
        <dt>RUN</dt><dd class="cedula-run">${p.run}</dd>
        <dt>N° documento</dt><dd>${p.documento}</dd>
        <dt>Nacimiento</dt><dd>${p.nacimiento}</dd>
        <dt>Vencimiento</dt><dd>${p.vence}</dd>
      </dl>
    </div>
  </div>`;
}

// ------------------------------------------------------------
//  Catálogos
// ------------------------------------------------------------
const DOCUMENTOS = {
  cedula:       { nombre: '🪪 Cédula de identidad', tiene: () => true },
  licencia:     { nombre: '🚗 Licencia de conducir', tiene: () => true },
  nacimiento:   { nombre: '👶 Certificado de nacimiento', tiene: () => true },
  luz:          { nombre: '💡 Boleta de la luz', tiene: () => true },
  croquis:      { nombre: '📐 Croquis del local', tiene: () => hecho('arriendo') },
  estatutos:    { nombre: '📜 Estatutos de la empresa', tiene: () => hecho('constitucion') },
  erut:         { nombre: '🧾 e-RUT de la empresa', tiene: () => hecho('inicioActividades') },
  contrato:     { nombre: '📄 Contrato de arriendo', tiene: () => hecho('arriendo') },
  zonificacion: { nombre: '🗺️ Certificado de zonificación', tiene: () => hecho('zonificacion') },
  sanitaria:    { nombre: '🏥 Resolución sanitaria', tiene: () => hecho('sanitaria') },
  bnup:         { nombre: '🅿️ Permiso de espacio público', tiene: () => hecho('bnup') },
  carpeta:      { nombre: '📊 Carpeta tributaria', tiene: () => hecho('inicioActividades') },
};

const GIROS = {
  cafeteria: 'Venta de café, bebidas y alimentos preparados para consumo en el local',
  panaderia: 'Elaboración y venta de pan y productos de pastelería',
  taller:    'Mantención y reparación de vehículos motorizados',
  software:  'Desarrollo de software y consultoría informática',
  foodtruck: 'Venta de comida preparada en carro móvil',
  online:    'Venta al por menor de productos por internet',
};
const GIROS_RAROS = ['Extracción de cobre y otros minerales', 'Transporte aéreo de pasajeros', 'Cultivo de uva para vino'];

const COMUNAS = ['Santiago', 'Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'La Florida', 'Puente Alto', 'Estación Central', 'Recoleta', 'San Miguel'];

const LOCALES = {
  local:  [{ direccion: 'Av. Irarrázaval 2450', comuna: 'Ñuñoa', nota: 'Esquina con mucho paso de gente' },
           { direccion: 'San Diego 1120', comuna: 'Santiago', nota: 'Barrio comercial, algo ruidoso' },
           { direccion: 'Av. Vicuña Mackenna 7300', comuna: 'La Florida', nota: 'Frente a una estación de metro' }],
  cowork: [{ direccion: 'Av. Providencia 1980, of. 402', comuna: 'Providencia', nota: 'Cowork con café ilimitado' },
           { direccion: 'Av. Apoquindo 4500, piso 7', comuna: 'Las Condes', nota: 'Vista a la cordillera' },
           { direccion: 'Santa Isabel 350, of. 12', comuna: 'Santiago', nota: 'Céntrico y bien conectado' }],
  carro:  [{ direccion: 'Estacionamiento Av. Matta 820', comuna: 'Santiago', nota: 'Con enchufe y agua potable' },
           { direccion: 'Estacionamiento Gran Avenida 5400', comuna: 'San Miguel', nota: 'Techado' },
           { direccion: 'Estacionamiento Av. Pajaritos 2100', comuna: 'Maipú', nota: 'Barato y amplio' }],
  bodega: [{ direccion: 'Av. Departamental 1500, bodega 8', comuna: 'La Florida', nota: 'Rampa para camiones' },
           { direccion: 'Av. Matucana 900, bodega 3', comuna: 'Estación Central', nota: 'Cerca de la autopista' },
           { direccion: 'Av. Recoleta 1800, bodega 21', comuna: 'Recoleta', nota: 'Con oficina pequeña' }],
};
const direccionLocal = () => G.local ? `${G.local.direccion}, ${G.local.comuna}` : null;
const todasLasDirecciones = () => (LOCALES[rubro().local] || LOCALES.local).map(l => `${l.direccion}, ${l.comuna}`);

function mezclar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const codigoAlAzar = () => String(Math.floor(100000 + Math.random() * 900000));
const opcionesGiro = () => mezclar([GIROS[G.rubroId], ...mezclar(Object.values(GIROS).filter(g => g !== GIROS[G.rubroId])).slice(0, 2), azar(GIROS_RAROS)]);

// ------------------------------------------------------------
//  Pasos reutilizables
//  Un paso: { tipo, html, campos, boton, validar(v, d) -> null | 'error' | { grave: 'motivo' }, alAceptar(v, d) }
// ------------------------------------------------------------
const P = {
  info: (html, boton = 'Continuar') => ({ tipo: 'info', html, boton }),

  documentos: (requeridos, frase, { grave = true } = {}) => ({
    tipo: 'form',
    html: () => `<p class="cita">"${frase}"</p><p>Elige qué documentos le entregas:</p>`,
    campos: () => [{
      id: 'docs', tipo: 'checks',
      opciones: Object.entries(DOCUMENTOS).filter(([, d]) => d.tiene()).map(([id, d]) => ({ valor: id, texto: d.nombre })),
    }],
    boton: '📂 Entregar documentos',
    validar: v => {
      const falta = requeridos.filter(id => !v.docs.includes(id));
      if (!falta.length) return null;
      const motivo = `Le falta: ${falta.map(id => DOCUMENTOS[id].nombre.replace(/^\S+\s/, '')).join(', ')}. Sin eso no puedo seguir.`;
      return grave ? { grave: motivo } : motivo;
    },
  }),

  confirmarRun: () => ({
    tipo: 'form',
    html: () => `<p class="cita">"Muéstreme su cédula, por favor. ¿Me confirma su RUN?"</p>${cedulaHtml()}`,
    campos: [{ id: 'run', etiqueta: 'Tu RUN', tipo: 'text', placeholder: '12.345.678-9', autocomplete: 'off' }],
    validar: v => mismoRut(v.run, G.persona.run) ? null : 'Ese RUN no coincide con el de su cédula. Revíselo bien, con el dígito verificador.',
  }),

  contacto: () => ({
    tipo: 'form',
    html: '<p class="cita">"Necesito un correo y un celular. Ahí le llegará el código de activación."</p>',
    campos: [
      { id: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', placeholder: 'nombre@correo.cl', autocomplete: 'off' },
      { id: 'celular', etiqueta: 'Celular', tipo: 'tel', placeholder: '9 1234 5678', autocomplete: 'off' },
    ],
    validar: v => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.correo)) return 'Ese correo no es válido. Debe ser algo como nombre@correo.cl.';
      const cel = v.celular.replace(/\D/g, '').replace(/^56/, '');
      if (!/^9\d{8}$/.test(cel)) return 'El celular debe tener 9 dígitos y empezar con 9 (por ejemplo 9 1234 5678).';
      return null;
    },
    alAceptar: v => {
      G.persona.correo = v.correo.trim();
      G.persona.celular = '+56 ' + v.celular.replace(/\D/g, '').replace(/^56/, '').replace(/(\d)(\d{4})(\d{4})/, '$1 $2 $3');
    },
  }),

  codigo: (motivo = 'activación') => {
    const paso = {
      tipo: 'form',
      html: () => {
        paso._codigo = paso._codigo || codigoAlAzar();
        return `<p>Revisa tu correo: te llegó un mensaje.</p>
        <div class="correo-simulado">
          <div class="correo-cab">✉️ <b>Bandeja de entrada</b> · ${esc(G.persona.correo || 'tu correo')}</div>
          <div class="correo-msg"><b>Clave Única — código de ${motivo}</b>
            <p>Hola ${esc(G.jugador)}, tu código es:</p><div class="correo-codigo">${paso._codigo}</div>
            <small>Vence en 10 minutos. Nunca compartas este código.</small></div>
        </div>`;
      },
      campos: [{ id: 'codigo', etiqueta: `Código de ${motivo}`, tipo: 'text', placeholder: '6 dígitos', autocomplete: 'one-time-code', inputmode: 'numeric' }],
      validar: v => v.codigo.replace(/\D/g, '') === paso._codigo ? null : 'El código no es correcto. Cópialo tal cual aparece en el correo.',
    };
    return paso;
  },

  crearClave: () => ({
    tipo: 'form',
    html: `<p>Crea tu <b>Clave Única</b>. La usarás para entrar a los trámites por internet y para firmar.</p>
      <ul class="reglas"><li>Mínimo 8 caracteres</li><li>Al menos una mayúscula y una minúscula</li><li>Al menos un número</li></ul>
      <p class="aviso-clave">🔐 Es una clave del juego: <b>no uses tu Clave Única ni tus contraseñas reales</b>.</p>`,
    campos: [
      { id: 'clave', etiqueta: 'Nueva clave', tipo: 'password', autocomplete: 'new-password' },
      { id: 'repetir', etiqueta: 'Repite la clave', tipo: 'password', autocomplete: 'new-password' },
    ],
    boton: '🔐 Crear clave',
    validar: v => {
      const c = v.clave, falta = [];
      if (c.length < 8) falta.push('tener 8 caracteres o más');
      if (!/[A-ZÁÉÍÓÚÑ]/.test(c)) falta.push('una mayúscula');
      if (!/[a-záéíóúñ]/.test(c)) falta.push('una minúscula');
      if (!/\d/.test(c)) falta.push('un número');
      if (falta.length) return `La clave no cumple los requisitos. Le falta: ${falta.join(', ')}.`;
      if (c !== v.repetir) return 'Las dos claves no son iguales. Escríbelas de nuevo.';
      const nombre = G.jugador.toLowerCase().split(' ')[0];
      if ((nombre.length >= 4 && c.toLowerCase().includes(nombre)) || /1234|abcd|clave|qwerty/i.test(c)) return 'Esa clave es muy fácil de adivinar (no uses tu nombre ni secuencias como 1234). Elige otra.';
      return null;
    },
    alAceptar: v => { G.persona.claveHash = hashClave(v.clave); G.persona.fallosClave = 0; },
  }),

  // Iniciar sesión con RUN + Clave Única (lo resuelve el motor: maneja bloqueo y recuperación)
  login: sitio => ({ tipo: 'login', sitio }),

  // Firmar con la Clave Única (firma electrónica simple)
  firmarConClave: documento => ({
    tipo: 'form',
    html: () => `<div class="documento-firma">${documento()}</div><p>Para firmar electrónicamente, ingresa tu Clave Única.</p>`,
    campos: [{ id: 'clave', etiqueta: 'Clave Única', tipo: 'password', autocomplete: 'current-password' }],
    boton: '✍️ Firmar',
    validar: v => hashClave(v.clave) === G.persona.claveHash ? null : 'Clave incorrecta. La firma no se realizó.',
  }),

  // Firma a mano en papel (con el dedo o el mouse)
  firmaManual: documento => ({ tipo: 'firma', html: () => `<div class="documento-firma">${documento()}</div>`, boton: '✍️ Firmar' }),

  pago: (concepto, medios = ['💳 Tarjeta de débito', '💵 Efectivo', '🏦 Transferencia']) => ({
    tipo: 'form',
    html: () => `<div class="boleta"><span>${concepto}</span><b>${dinero(costoActual())}</b></div><p>¿Cómo vas a pagar?</p>`,
    campos: [{ id: 'medio', tipo: 'radio', opciones: medios.map(m => ({ valor: m, texto: m })) }],
    boton: '💰 Pagar',
    validar: v => v.medio ? null : 'Elige un medio de pago.',
  }),

  rutEmpresa: (frase = '¿Cuál es el RUT de la empresa?') => ({
    id: 'rut', etiqueta: 'RUT de la empresa', tipo: 'text', placeholder: '76.123.456-7', autocomplete: 'off', frase,
  }),
};
let tramiteActual = null;
const costoActual = () => tramiteActual ? costoTramite(tramiteActual) : 0;
const validarRutEmpresa = v => mismoRut(v.rut, G.rut) ? null : 'Ese RUT no corresponde a tu empresa. Lo puedes revisar en 🗂️ Mis documentos.';

// ------------------------------------------------------------
//  Proceso de cada trámite
// ------------------------------------------------------------
const PROCESOS = {
  claveUnica: () => [
    P.documentos(['cedula'], 'Buenos días. Para la Clave Única necesito su cédula de identidad vigente.', { grave: false }),
    P.confirmarRun(),
    P.contacto(),
    P.codigo('activación'),
    P.crearClave(),
  ],

  constitucion: () => [
    P.login('Registro de Empresas y Sociedades'),
    {
      tipo: 'form',
      html: '<p><b>Formulario de constitución</b> · ¿Qué tipo de sociedad quieres crear?</p>',
      campos: [{ id: 'sociedad', tipo: 'radio', opciones: Object.entries(SOCIEDADES).map(([id, s]) => ({ valor: id, texto: `${s.nombre} — ${s.largo}`, desc: s.desc })) }],
      validar: v => v.sociedad ? null : 'Elige un tipo de sociedad.',
      alAceptar: (v, d) => { d.sociedad = v.sociedad; },
    },
    {
      tipo: 'form',
      html: d => `<p><b>Datos de la empresa</b></p>
        <p class="ayuda">La razón social es el nombre legal: debe terminar con el tipo de sociedad (<b>${SOCIEDADES[d.sociedad].nombre}</b>).</p>`,
      campos: d => [
        { id: 'razon', etiqueta: 'Razón social', tipo: 'text', placeholder: `${G.empresa} ${SOCIEDADES[d.sociedad].nombre}` },
        { id: 'objeto', etiqueta: 'Objeto social (a qué se dedicará)', tipo: 'select', opciones: [{ valor: '', texto: 'Elige una opción…' }].concat((d._giros || (d._giros = opcionesGiro())).map(g => ({ valor: g, texto: g }))) },
        { id: 'capital', etiqueta: 'Capital que aportas ($)', tipo: 'number', placeholder: '1000000', inputmode: 'numeric' },
        { id: 'comuna', etiqueta: 'Comuna del domicilio', tipo: 'select', opciones: [{ valor: '', texto: 'Elige una comuna…' }].concat(COMUNAS.map(c => ({ valor: c, texto: c }))) },
      ],
      validar: (v, d) => {
        const suf = SOCIEDADES[d.sociedad].nombre.replace(/\./g, '').toLowerCase();
        const razon = v.razon.trim().replace(/\./g, '').toLowerCase();
        if (razon.length < 4) return 'Escribe la razón social de la empresa.';
        if (!razon.endsWith(suf)) return `La razón social debe terminar en "${SOCIEDADES[d.sociedad].nombre}". Por ejemplo: "${G.empresa} ${SOCIEDADES[d.sociedad].nombre}".`;
        if (!v.objeto) return 'Elige el objeto social.';
        if (v.objeto !== GIROS[G.rubroId]) return `Ese objeto social no corresponde a una ${rubro().nombre.toLowerCase()}. Si lo dejas así, después no podrás vender lo que quieres.`;
        const cap = Number(v.capital);
        if (!cap || cap < 100000) return 'El capital debe ser de al menos $100.000.';
        if (cap > G.caja) return `No puedes aportar más de lo que tienes (${dinero(G.caja)}).`;
        if (!v.comuna) return 'Elige la comuna del domicilio de la empresa.';
        return null;
      },
      alAceptar: (v, d) => { d.razon = v.razon.trim(); d.capital = Number(v.capital); d.comuna = v.comuna; },
    },
    P.firmarConClave(() => {
      const d = procesoActivo.datos;
      return `<b>📜 Estatutos de ${esc(d.razon)}</b>
        <p>Tipo: ${SOCIEDADES[d.sociedad].largo}<br>Objeto: ${esc(GIROS[G.rubroId])}<br>Capital: ${dinero(d.capital)}<br>Domicilio: ${d.comuna}<br>Socio: ${esc(G.jugador)} (RUN ${G.persona.run})</p>`;
    }),
  ],

  inicioActividades: () => [
    P.login('Servicio de Impuestos Internos'),
    {
      tipo: 'form',
      html: `<p><b>Inicio de Actividades</b> · Declara qué va a hacer tu empresa.</p>`,
      campos: d => [
        { id: 'actividad', etiqueta: 'Actividad económica', tipo: 'select', opciones: [{ valor: '', texto: 'Busca tu actividad…' }].concat((d._giros || (d._giros = opcionesGiro())).map(g => ({ valor: g, texto: g }))) },
        { id: 'categoria', etiqueta: 'Categoría tributaria', tipo: 'radio', opciones: [
          { valor: '1', texto: 'Primera categoría', desc: 'Empresas: comercio, industria, servicios.' },
          { valor: '2', texto: 'Segunda categoría', desc: 'Trabajadores dependientes y a honorarios.' }] },
        { id: 'regimen', etiqueta: 'Régimen tributario', tipo: 'select', opciones: [
          { valor: '', texto: 'Elige un régimen…' }, { valor: 'propyme', texto: 'Pro Pyme General (14 D N°3)' },
          { valor: 'transparente', texto: 'Pro Pyme Transparente (14 D N°8)' }, { valor: 'semi', texto: 'Semi Integrado (14 A)' }] },
      ],
      validar: v => {
        if (!v.actividad) return 'Elige la actividad económica.';
        if (v.actividad !== GIROS[G.rubroId]) return 'El SII observa: esa actividad no corresponde al objeto social de tu empresa.';
        if (v.categoria !== '1') return v.categoria ? 'Segunda categoría es para personas que trabajan con sueldo u honorarios. Tu empresa es de primera categoría.' : 'Elige la categoría tributaria.';
        if (!v.regimen) return 'Elige un régimen tributario (para una pyme, lo típico es Pro Pyme).';
        return null;
      },
    },
    {
      tipo: 'form',
      html: '<p><b>Domicilio tributario</b> · Donde el SII te enviará notificaciones.</p>',
      campos: [
        { id: 'direccion', etiqueta: 'Dirección (calle y número)', tipo: 'text', placeholder: 'Av. Siempre Viva 742' },
        { id: 'comuna', etiqueta: 'Comuna', tipo: 'select', opciones: [{ valor: '', texto: 'Elige una comuna…' }].concat(COMUNAS.map(c => ({ valor: c, texto: c }))) },
      ],
      validar: v => {
        if (!/[a-záéíóúñ].*\d/i.test(v.direccion.trim())) return 'Escribe la calle y el número.';
        if (!v.comuna) return 'Elige la comuna.';
        if (G.comunaEmpresa && v.comuna !== G.comunaEmpresa) return `La comuna no coincide con la de la constitución de la empresa (${G.comunaEmpresa}).`;
        return null;
      },
    },
    {
      tipo: 'form',
      html: '<p><b>Declaración jurada</b></p>',
      campos: [{ id: 'jura', tipo: 'check', texto: 'Declaro bajo juramento que los datos ingresados son verdaderos.' }],
      boton: '📨 Enviar declaración',
      validar: v => v.jura ? null : 'Debes aceptar la declaración jurada para enviar.',
    },
  ],

  facturacion: () => [
    P.login('Servicio de Impuestos Internos'),
    {
      tipo: 'form',
      html: '<p><b>Postulación a facturación electrónica</b></p>',
      campos: [
        P.rutEmpresa(),
        { id: 'sistema', etiqueta: 'Sistema de facturación', tipo: 'radio', opciones: [
          { valor: 'sii', texto: 'Sistema gratuito del SII', desc: 'Emites boletas y facturas desde la página del SII.' },
          { valor: 'mercado', texto: 'Software de mercado', desc: 'Un proveedor privado (se paga aparte).' }] },
        { id: 'correo', etiqueta: 'Correo de intercambio (donde recibes facturas)', tipo: 'email', placeholder: 'facturas@miempresa.cl' },
      ],
      validar: v => validarRutEmpresa(v) || (!v.sistema ? 'Elige un sistema de facturación.' : null)
        || (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.correo) ? 'Ese correo de intercambio no es válido.' : null),
    },
    {
      tipo: 'form', html: '<p><b>Condiciones de uso</b></p>',
      campos: [{ id: 'acepta', tipo: 'check', texto: 'Acepto emitir y guardar mis documentos tributarios electrónicos según la normativa del SII.' }],
      validar: v => v.acepta ? null : 'Debes aceptar las condiciones.',
    },
  ],

  cuentaBanco: () => [
    P.documentos(['cedula', 'estatutos', 'erut'], 'Para abrir una cuenta corriente de empresa necesito su cédula, los estatutos y el e-RUT.'),
    {
      tipo: 'form',
      html: '<p class="cita">"Perfecto. Ahora completemos la solicitud."</p>',
      campos: [
        P.rutEmpresa(),
        { id: 'ventas', etiqueta: 'Ventas mensuales estimadas', tipo: 'select', opciones: [{ valor: '', texto: 'Elige un rango…' },
          { valor: 'a', texto: 'Menos de $2.000.000' }, { valor: 'b', texto: 'Entre $2.000.000 y $10.000.000' }, { valor: 'c', texto: 'Más de $10.000.000' }] },
      ],
      validar: v => validarRutEmpresa(v) || (!v.ventas ? 'Indique un rango de ventas estimadas.' : null),
    },
    {
      tipo: 'form',
      html: '<p class="cita">"Cree la clave de 4 dígitos de su tarjeta de débito."</p>',
      campos: [
        { id: 'pin', etiqueta: 'Clave de la tarjeta (4 dígitos)', tipo: 'password', inputmode: 'numeric', autocomplete: 'off' },
        { id: 'pin2', etiqueta: 'Repite la clave', tipo: 'password', inputmode: 'numeric', autocomplete: 'off' },
      ],
      validar: v => {
        if (!/^\d{4}$/.test(v.pin)) return 'La clave debe tener exactamente 4 números.';
        if (/^(\d)\1{3}$/.test(v.pin) || ['1234', '4321', '0123'].includes(v.pin)) return 'Esa clave es demasiado fácil. Elija otra.';
        if (v.pin !== v.pin2) return 'Las claves no coinciden.';
        return null;
      },
    },
    P.firmaManual(() => `<b>📄 Contrato de cuenta corriente</b><p>Titular: ${esc(G.empresa)} · RUT ${G.rut}<br>Representante: ${esc(G.jugador)}<br>Comisión de mantención: 0,3 UF mensual.</p>`),
  ],

  arriendo: () => {
    const opciones = LOCALES[rubro().local] || LOCALES.local;
    const nombre = { local: 'el local', cowork: 'la oficina', carro: 'el estacionamiento', bodega: 'la bodega' }[rubro().local] || 'el local';
    return [
      {
        tipo: 'form',
        html: `<p class="cita">"Tengo tres opciones disponibles. ¿Cuál le interesa?"</p>`,
        campos: [{ id: 'local', tipo: 'radio', opciones: opciones.map((l, i) => ({ valor: String(i), texto: `${l.direccion}, ${l.comuna}`, desc: `${l.nota} · ${dinero(rubro().arriendo)}/mes` })) }],
        validar: v => v.local ? null : `Elija ${nombre}.`,
        alAceptar: (v, d) => { d.local = opciones[Number(v.local)]; },
      },
      P.documentos(['cedula', 'estatutos'], 'Como arrienda la empresa, necesito su cédula y los estatutos de la sociedad.'),
      {
        tipo: 'form',
        html: () => `<div class="documento-firma"><b>📄 Contrato de arriendo</b><p>Renta mensual: <b>${dinero(rubro().arriendo)}</b> · Reajuste: IPC cada 6 meses<br>
          Garantía: un mes de renta · Pago: mes adelantado · Plazo: 1 año renovable</p></div>
          <p class="cita">"Antes de firmar, ¿sabe cuánto tiene que pagar hoy?"</p>`,
        campos: [{ id: 'cuanto', tipo: 'radio', opciones: [
          { valor: '1', texto: `${dinero(rubro().arriendo)} (un mes)` },
          { valor: '2', texto: `${dinero(rubro().arriendo * 2)} (garantía + mes adelantado)` },
          { valor: '3', texto: `${dinero(rubro().arriendo * 3)} (tres meses)` }] }],
        validar: v => v.cuanto === '2' ? null : (v.cuanto ? 'No. Hoy se paga la garantía (un mes) más el primer mes adelantado: dos meses en total.' : 'Elija una opción.'),
      },
      P.firmaManual(() => `<b>📄 Contrato de arriendo</b><p>Arrendatario: ${esc(G.empresa)} · Inmueble: ${esc(procesoActivo.datos.local.direccion)}, ${procesoActivo.datos.local.comuna}</p>`),
      {
        tipo: 'form',
        html: () => `<p class="cita">"Transfiérame la garantía y el primer mes a esta cuenta."</p>
          <div class="boleta"><span>Garantía + mes adelantado</span><b>${dinero(costoActual())}</b></div>`,
        campos: [{ id: 'monto', etiqueta: 'Monto a transferir ($)', tipo: 'number', inputmode: 'numeric', placeholder: '0' }],
        boton: '🏦 Transferir',
        validar: v => {
          const m = Number(String(v.monto).replace(/\D/g, ''));
          if (m === Math.round(costoActual())) return null;
          return m < costoActual() ? `Le faltan ${dinero(costoActual() - m)}.` : `Me transfirió de más (${dinero(m - costoActual())}). Revise el monto exacto.`;
        },
      },
    ];
  },

  equipamiento: () => [
    P.info(`<p class="cita">"Aquí tiene la cotización. ¿La revisamos?"</p>
      <div class="boleta"><span>${esc(nombreTramite(tramite('equipamiento')))}</span><b>${dinero(costoTramite(tramite('equipamiento')))}</b></div>
      <small>Precio con IVA incluido. Despacho e instalación a ${esc(direccionLocal() || 'tu local')}.</small>`, 'Me parece'),
    {
      tipo: 'form',
      html: '<p class="cita">"¿Le hago boleta o factura?"</p><p class="ayuda">Con <b>factura</b>, el IVA de la compra te sirve como crédito fiscal (pagas menos impuestos después). Para factura necesitas el RUT de la empresa.</p>',
      campos: [
        { id: 'doc', tipo: 'radio', opciones: [{ valor: 'factura', texto: '🧾 Factura' }, { valor: 'boleta', texto: '🧾 Boleta' }] },
        { ...P.rutEmpresa(), etiqueta: 'RUT de la empresa (solo para factura)' },
      ],
      validar: v => {
        if (!v.doc) return 'Elija boleta o factura.';
        if (v.doc === 'factura') {
          if (!G.rut) return 'Para hacer factura necesito el RUT de la empresa, y todavía no tiene. Pida boleta o haga primero el Inicio de Actividades en el SII.';
          return validarRutEmpresa(v);
        }
        return null;
      },
      alAceptar: (v, d) => { d.sinFactura = v.doc === 'boleta'; },
    },
    P.pago('Total de la compra'),
  ],

  zonificacion: () => [
    {
      tipo: 'form',
      html: '<p class="cita">"Dirección de Obras. ¿Para qué dirección necesita el certificado?"</p>',
      campos: () => [
        { id: 'direccion', etiqueta: 'Dirección del local', tipo: 'select', opciones: [{ valor: '', texto: 'Elige la dirección…' }].concat(todasLasDirecciones().map(x => ({ valor: x, texto: x }))) },
        { id: 'uso', etiqueta: 'Uso que le darás', tipo: 'select', opciones: [{ valor: '', texto: 'Elige el uso…' }].concat((procesoActivo.datos._giros || (procesoActivo.datos._giros = opcionesGiro())).map(g => ({ valor: g, texto: g }))) },
      ],
      validar: v => {
        if (!v.direccion) return 'Indique la dirección.';
        if (v.direccion !== direccionLocal()) return { grave: `Esa dirección no es la de su contrato de arriendo (${direccionLocal()}). Así no le puedo dar el certificado.` };
        if (v.uso !== GIROS[G.rubroId]) return 'Ese uso no corresponde a su rubro. Indique el uso real del local.';
        return null;
      },
    },
    P.pago('Derechos municipales'),
  ],

  sanitaria: () => [
    P.documentos(['cedula', 'contrato', 'croquis'], 'Para la resolución sanitaria traiga su cédula, el contrato de arriendo y el croquis del local.'),
    {
      tipo: 'form',
      html: '<p class="cita">"Un inspector visitará el local. Marque lo que ya tiene listo:"</p>',
      campos: [{ id: 'local', tipo: 'checks', opciones: [
        { valor: 'lavamanos', texto: '🚰 Lavamanos exclusivo para manipular alimentos' },
        { valor: 'piso', texto: '🧽 Piso y muros lavables' },
        { valor: 'frio', texto: '🧊 Refrigerador con termómetro' },
        { valor: 'bano', texto: '🚻 Baño para el personal' },
        { valor: 'basura', texto: '🗑️ Basureros con tapa y pedal' }] }],
      validar: v => {
        const falta = ['lavamanos', 'piso', 'frio', 'bano', 'basura'].filter(x => !v.local.includes(x));
        return falta.length ? { grave: 'Sin cumplir todos los requisitos sanitarios, el inspector va a rechazar el local. Prepárelo y vuelva.' } : null;
      },
    },
    P.pago('Arancel SEREMI de Salud'),
  ],

  bnup: () => [
    {
      tipo: 'form',
      html: '<p class="cita">"¿Dónde y cuándo quiere instalar el carro?"</p>',
      campos: [
        { id: 'lugar', etiqueta: 'Ubicación', tipo: 'select', opciones: [{ valor: '', texto: 'Elige…' }, { valor: 'plaza', texto: 'Costado de la plaza' }, { valor: 'feria', texto: 'Calle de la feria libre' }, { valor: 'u', texto: 'Frente a una universidad' }] },
        { id: 'metros', etiqueta: 'Metros cuadrados que ocupará', tipo: 'number', inputmode: 'numeric', placeholder: '6' },
      ],
      validar: v => !v.lugar ? 'Elija una ubicación.' : (!(Number(v.metros) >= 2 && Number(v.metros) <= 12) ? 'El carro debe ocupar entre 2 y 12 m².' : null),
    },
    P.documentos(['cedula', 'erut', 'sanitaria'], 'Necesito su cédula, el e-RUT y la resolución sanitaria del carro.'),
    P.pago('Derechos por uso de espacio público'),
  ],

  pasarela: () => [
    {
      tipo: 'form',
      html: '<p class="cita">"Para la pasarela de pagos necesito los datos de su tienda y de la cuenta donde le abonamos."</p>',
      campos: [
        { id: 'web', etiqueta: 'Dirección de tu tienda', tipo: 'text', placeholder: 'https://mitienda.cl' },
        { id: 'cuenta', etiqueta: 'N° de cuenta corriente', tipo: 'text', placeholder: '12-345678-9' },
      ],
      validar: v => {
        if (!/^https:\/\/[^\s.]+\.[^\s]{2,}/i.test(v.web.trim())) return 'La tienda debe tener una dirección segura que empiece con https://';
        if (v.cuenta.replace(/\D/g, '') !== String(G.cuentaNumero || '').replace(/\D/g, '')) return 'Esa no es su cuenta corriente. Revísela en 🗂️ Mis documentos.';
        return null;
      },
    },
    P.firmaManual(() => `<b>📄 Contrato de pasarela de pagos</b><p>Comercio: ${esc(G.empresa)} · Comisión: 2,9% + IVA por venta · Abono en 48 horas.</p>`),
    P.pago('Costo de habilitación', ['💳 Cargo en cuenta corriente']),
  ],

  patente: () => {
    const r = rubro();
    const req = ['cedula', 'erut', r.local === 'carro' ? 'bnup' : 'zonificacion'].concat(r.alimentos ? ['sanitaria'] : []).concat(r.local === 'carro' ? [] : ['contrato']);
    return [
      P.documentos(req, 'Para la patente traiga todos sus permisos: cédula, e-RUT, contrato y certificados. Todo junto, por favor.'),
      {
        tipo: 'form',
        html: '<p class="cita">"Complete la solicitud de patente."</p>',
        campos: [
          P.rutEmpresa(),
          { id: 'capital', etiqueta: 'Capital propio declarado ($)', tipo: 'number', inputmode: 'numeric', placeholder: '1000000' },
        ],
        validar: v => validarRutEmpresa(v) || (!(Number(v.capital) > 0) ? 'Indique el capital propio (el que declaró al SII).' : null),
      },
      P.pago('Patente municipal (semestre)'),
    ];
  },

  mutual: () => [
    {
      tipo: 'form',
      html: '<p class="cita">"Adherirse es gratis: la cotización se paga junto con los sueldos."</p>',
      campos: [
        P.rutEmpresa(),
        { id: 'trabajadores', etiqueta: '¿Cuántos trabajadores piensas contratar?', tipo: 'number', inputmode: 'numeric', placeholder: '1' },
      ],
      validar: v => validarRutEmpresa(v) || (!(Number(v.trabajadores) >= 1 && Number(v.trabajadores) <= 50) ? 'Indique entre 1 y 50 trabajadores.' : null),
    },
    P.firmaManual(() => `<b>📄 Solicitud de adhesión</b><p>Empleador: ${esc(G.empresa)} · RUT ${G.rut}<br>Seguro de accidentes del trabajo y enfermedades profesionales (Ley 16.744).</p>`),
  ],

  fondo: () => [
    P.login('Agencia de Fomento'),
    {
      tipo: 'form',
      html: '<p><b>Postulación "Semilla Emprende"</b> · Cuéntale al jurado tu proyecto.</p>',
      campos: [
        { id: 'proyecto', etiqueta: 'Nombre del proyecto', tipo: 'text', placeholder: `Crecimiento de ${G.empresa}` },
        { id: 'desc', etiqueta: '¿Qué harás con el dinero? (mínimo 80 caracteres)', tipo: 'textarea' },
        { id: 'monto', etiqueta: `Monto solicitado (máximo ${dinero(FONDO.monto)})`, tipo: 'number', inputmode: 'numeric', placeholder: String(FONDO.monto) },
      ],
      validar: v => {
        if (v.proyecto.trim().length < 5) return 'Ponle un nombre a tu proyecto.';
        if (v.desc.trim().length < 80) return `La descripción es muy corta (${v.desc.trim().length}/80). El jurado quiere detalles.`;
        const m = Number(v.monto);
        if (!(m > 0)) return 'Indica el monto solicitado.';
        if (m > FONDO.monto) return `El máximo del fondo es ${dinero(FONDO.monto)}.`;
        return null;
      },
    },
    {
      tipo: 'form', html: '<p><b>Declaración</b></p>',
      campos: [{ id: 'ok', tipo: 'check', texto: 'Declaro que la información es verdadera y que no he recibido este fondo antes.' }],
      boton: '📨 Enviar postulación',
      validar: v => v.ok ? null : 'Debes aceptar la declaración.',
    },
  ],

  credito: () => {
    const { monto, cuotas, tasa } = CREDITO;
    const cuota = Math.round(monto * tasa / (1 - Math.pow(1 + tasa, -cuotas)));
    return [
      P.documentos(['cedula', 'erut', 'carpeta'], 'Para evaluar el crédito necesito su cédula, el e-RUT y la carpeta tributaria de la empresa.'),
      {
        tipo: 'form',
        html: `<div class="boleta"><span>Crédito Pyme · ${cuotas} cuotas · ${String(tasa * 100).replace('.', ',')}% mensual</span><b>${dinero(cuota)}/mes</b></div>
          <p class="cita">"Antes de firmar, confirme: ¿cuánto pagará en total al final del crédito?"</p>`,
        campos: [{ id: 'total', tipo: 'radio', opciones: mezclar([
          { valor: 'ok', texto: dinero(cuota * cuotas) },
          { valor: 'no1', texto: dinero(monto) },
          { valor: 'no2', texto: dinero(monto * (1 + tasa)) }]) }],
        validar: v => v.total === 'ok' ? null : (v.total ? `No: son ${cuotas} cuotas de ${dinero(cuota)}, o sea ${dinero(cuota * cuotas)}. Los intereses suman.` : 'Elija una opción.'),
      },
      P.firmaManual(() => `<b>📄 Pagaré</b><p>Debo y pagaré a la orden del Banco la suma de ${dinero(monto)} en ${cuotas} cuotas de ${dinero(cuota)}.<br>Deudor: ${esc(G.empresa)} · Aval: ${esc(G.jugador)}</p>`),
    ];
  },
};

// ------------------------------------------------------------
//  Motor: muestra los pasos en la ventana de diálogo
// ------------------------------------------------------------
let procesoActivo = null;

function iniciarProceso(t, hablante, { alTerminar, alRechazar } = {}) {
  asegurarPersona();
  const costo = costoTramite(t);
  if (costo > 0 && G.caja - costo < -LIMITE_SOBREGIRO) {
    abrirModalAhora('💸 No te alcanza', `<p>Este trámite cuesta <b>${dinero(costo)}</b> y no tienes cómo pagarlo.</p>
      <p>Prueba pidiendo un crédito en el banco o postulando a un fondo.</p>`, [{ texto: 'Entendido' }], { hablante });
    return;
  }
  tramiteActual = t;
  const crear = PROCESOS[t.id];
  const pasos = crear ? crear() : [];
  procesoActivo = { t, hablante, pasos, i: 0, datos: {}, alTerminar, alRechazar };
  if (!pasos.length) return terminarProceso();
  mostrarPaso();
}

function abandonarProceso() {
  procesoActivo = null; tramiteActual = null;
}

function terminarProceso() {
  const p = procesoActivo;
  procesoActivo = null;
  if (p.t.id === 'constitucion' && p.datos.comuna) G.comunaEmpresa = p.datos.comuna;
  const opciones = { procesoCompleto: true, sociedad: p.datos.sociedad, local: p.datos.local, sinFactura: p.datos.sinFactura };
  if (p.alTerminar) p.alTerminar(opciones);
  tramiteActual = null;
}

function pasoLogin(paso) {
  const p = asegurarPersona();
  // Partidas antiguas o clave nunca creada: primero hay que recuperarla
  if (!p.claveHash) return { necesitaRecuperar: true };
  return {
    tipo: 'form',
    html: `<div class="web-cab">🔒 Portal ${esc(paso.sitio)} · <b>Ingresa con tu Clave Única</b> <span>(simulación)</span></div>
      <details class="ver-cedula"><summary>🪪 Ver mi cédula</summary>${cedulaHtml()}</details>`,
    campos: [
      { id: 'run', etiqueta: 'RUN', tipo: 'text', placeholder: '12.345.678-9', autocomplete: 'off' },
      { id: 'clave', etiqueta: 'Clave Única', tipo: 'password', autocomplete: 'current-password' },
    ],
    boton: 'Ingresar',
    extra: { texto: '¿Olvidaste tu clave?', accion: () => insertarRecuperacion('Recupera tu clave con un código que te enviamos a tu correo.') },
    validar: v => {
      if (!mismoRut(v.run, p.run)) return 'RUN o clave incorrectos.';
      if (hashClave(v.clave) !== p.claveHash) {
        p.fallosClave = (p.fallosClave || 0) + 1;
        if (p.fallosClave >= 3) return { recuperar: '🔒 Tu Clave Única se bloqueó por 3 intentos fallidos. Para desbloquearla tienes que crear una nueva.' };
        return `RUN o clave incorrectos. Te quedan ${3 - p.fallosClave} intento(s) antes de que se bloquee.`;
      }
      p.fallosClave = 0;
      return null;
    },
  };
}

function insertarRecuperacion(mensaje) {
  const pr = procesoActivo;
  if (!pr) return;
  G.persona.correo = G.persona.correo || `${G.jugador.toLowerCase().split(' ')[0].normalize('NFD').replace(/[^a-z]/g, '') || 'emprendedor'}@correo.cl`;
  pr.pasos.splice(pr.i, 0, P.info(`<p>${mensaje}</p>`), P.codigo('recuperación'), P.crearClave());
  mostrarPaso();
}

function camposHtml(campos, valores = {}) {
  return campos.map(c => {
    // Las claves nunca se vuelven a escribir en la página
    const val = c.tipo === 'password' ? '' : valores[c.id] !== undefined ? valores[c.id] : (c.valor || '');
    const attrs = `data-campo="${c.id}" id="campo-${c.id}" ${c.placeholder ? `placeholder="${esc(c.placeholder)}"` : ''} ${c.autocomplete ? `autocomplete="${c.autocomplete}"` : ''} ${c.inputmode ? `inputmode="${c.inputmode}"` : ''}`;
    const etiqueta = c.etiqueta ? `<span class="campo-etiqueta">${c.etiqueta}</span>` : '';
    switch (c.tipo) {
      case 'select':
        return `<label class="campo">${etiqueta}<select ${attrs}>${c.opciones.map(o => `<option value="${esc(o.valor)}" ${o.valor === val ? 'selected' : ''}>${esc(o.texto)}</option>`).join('')}</select></label>`;
      case 'textarea':
        return `<label class="campo">${etiqueta}<textarea ${attrs} rows="4">${esc(val)}</textarea></label>`;
      case 'radio':
        return `<fieldset class="campo opciones" data-campo="${c.id}" data-tipo="radio">${c.etiqueta ? `<legend>${c.etiqueta}</legend>` : ''}
          ${c.opciones.map(o => `<label class="opcion"><input type="radio" name="r-${c.id}" value="${esc(o.valor)}" ${o.valor === val ? 'checked' : ''}>
          <span><b>${esc(o.texto)}</b>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</span></label>`).join('')}</fieldset>`;
      case 'checks':
        return `<fieldset class="campo opciones" data-campo="${c.id}" data-tipo="checks">${c.etiqueta ? `<legend>${c.etiqueta}</legend>` : ''}
          ${c.opciones.map(o => `<label class="opcion"><input type="checkbox" value="${esc(o.valor)}" ${(val || []).includes(o.valor) ? 'checked' : ''}><span><b>${esc(o.texto)}</b></span></label>`).join('')}</fieldset>`;
      case 'check':
        return `<label class="opcion unica"><input type="checkbox" data-campo="${c.id}" data-tipo="check" ${val ? 'checked' : ''}><span>${esc(c.texto)}</span></label>`;
      default:
        return `<label class="campo">${etiqueta}<input type="${c.tipo}" ${attrs} value="${esc(val)}"></label>`;
    }
  }).join('');
}

function leerCampos(campos) {
  const v = {};
  for (const c of campos) {
    const el = modal.querySelector(`[data-campo="${c.id}"]`);
    if (!el) { v[c.id] = c.tipo === 'checks' ? [] : ''; continue; }
    if (c.tipo === 'radio') v[c.id] = (el.querySelector('input:checked') || {}).value || '';
    else if (c.tipo === 'checks') v[c.id] = [...el.querySelectorAll('input:checked')].map(i => i.value);
    else if (c.tipo === 'check') v[c.id] = el.checked;
    else v[c.id] = el.value;
  }
  return v;
}

function mostrarPaso(error, valores) {
  const pr = procesoActivo;
  if (!pr) return;
  if (pr.i >= pr.pasos.length) return terminarProceso();
  let paso = pr.pasos[pr.i];
  if (paso.tipo === 'login') {
    const real = pasoLogin(paso);
    if (real.necesitaRecuperar) {
      return insertarRecuperacion('No tienes una Clave Única activa en este dispositivo. Recupérala con un código que llega a tu correo.');
    }
    paso = real;
  }
  const d = pr.datos;
  const campos = typeof paso.campos === 'function' ? paso.campos(d) : (paso.campos || []);
  const l = LUGARES[pr.t.lugar];
  const total = pr.pasos.length;
  const progreso = `<div class="pasos-progreso" aria-label="Paso ${pr.i + 1} de ${total}">${pr.pasos.map((_, k) =>
    `<i class="${k < pr.i ? 'hecho' : k === pr.i ? 'actual' : ''}"></i>`).join('')}<span>Paso ${pr.i + 1} de ${total}</span></div>`;
  const html = progreso
    + (error ? `<p class="error-paso" role="alert">⚠️ ${error}</p>` : '')
    + (typeof paso.html === 'function' ? paso.html(d) : (paso.html || ''))
    + (campos.length ? `<div class="formulario">${camposHtml(campos, valores)}</div>` : '')
    + (paso.tipo === 'firma' ? `<div class="firma-zona"><canvas id="firmaCanvas" width="600" height="180" aria-label="Firma aquí"></canvas>
        <div class="firma-pie"><span>Firma aquí con el dedo o el mouse</span><button type="button" class="btn chico" id="firmaBorrar">Borrar</button></div></div>` : '');

  const continuar = {
    texto: paso.boton || 'Continuar',
    accion: () => {
      const v = leerCampos(campos);
      if (paso.tipo === 'firma' && (pr.trazo || 0) < 120) return reintentar('Falta tu firma. Firma en el recuadro.', v);
      const res = paso.validar ? paso.validar(v, d) : null;
      if (res && res.grave) {
        const alRechazar = pr.alRechazar;
        procesoActivo = null; tramiteActual = null;
        rechazarTramite(pr.t.id, res.grave, { hablante: pr.hablante });
        if (alRechazar) alRechazar();
        return;
      }
      if (res && res.recuperar) return insertarRecuperacion(res.recuperar);
      if (res) return reintentar(res, v);
      if (paso.alAceptar) paso.alAceptar(v, d);
      pr.i++; pr.trazo = 0;
      guardar();
      mostrarPaso();
    },
  };
  const reintentar = (msg, v) => {
    G.paciencia = Math.max(5, G.paciencia - 2);
    if (typeof Audio3D !== 'undefined' && Audio3D.efecto) Audio3D.efecto('rechazo');
    mostrarPaso(msg, v);
  };
  const botones = [continuar];
  if (paso.extra) botones.push({ texto: paso.extra.texto, clase: ' ', accion: paso.extra.accion });
  botones.push({ texto: 'Abandonar trámite', clase: 'abandonar', accion: abandonarProceso });

  abrirModalAhora(`${l.emoji} ${nombreTramite(pr.t)}`, html, botones, {
    hablante: pr.hablante, proceso: true,
    alMostrar: () => { if (paso.tipo === 'firma') prepararFirma(); },
  });
}

function prepararFirma() {
  const cv = document.getElementById('firmaCanvas');
  if (!cv || cv._listo) return;
  cv._listo = true;
  const ctx = cv.getContext('2d');
  ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#13307a';
  let ultimo = null;
  const pos = ev => {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height };
  };
  cv.addEventListener('pointerdown', ev => { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); ultimo = pos(ev); });
  cv.addEventListener('pointermove', ev => {
    if (!ultimo) return;
    const p = pos(ev);
    ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (procesoActivo) procesoActivo.trazo = (procesoActivo.trazo || 0) + Math.hypot(p.x - ultimo.x, p.y - ultimo.y);
    ultimo = p;
  });
  const fin = () => { ultimo = null; };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', fin);
  const b = document.getElementById('firmaBorrar');
  if (b) b.onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); if (procesoActivo) procesoActivo.trazo = 0; };
}

// ------------------------------------------------------------
//  Panel "Mis documentos"
// ------------------------------------------------------------
function panelDocumentos() {
  const p = asegurarPersona();
  const fila = (k, v) => `<div class="dato"><span>${k}</span><b>${v}</b></div>`;
  const docs = Object.entries(DOCUMENTOS).filter(([, d]) => d.tiene()).map(([, d]) => `<li>${d.nombre}</li>`).join('');
  return `
  <div class="tarjeta">
    ${cedulaHtml()}
    <div class="datos">
      ${fila('🔐 Clave Única', p.claveHash ? 'Activa' : (hecho('claveUnica') ? 'Sin activar' : 'Aún no la tienes'))}
      ${p.correo ? fila('✉️ Correo', esc(p.correo)) : ''}
      ${p.celular ? fila('📱 Celular', esc(p.celular)) : ''}
      ${G.sociedad ? fila('🏢 Empresa', `${esc(G.empresa)} ${SOCIEDADES[G.sociedad].nombre}`) : ''}
      ${G.rut ? fila('🧾 RUT empresa', G.rut) : ''}
      ${G.cuentaNumero ? fila('🏦 Cuenta corriente', G.cuentaNumero) : ''}
      ${G.local ? fila('📍 Local', esc(direccionLocal())) : ''}
    </div>
    <h4 class="grupo-tramites">📂 Documentos que tienes</h4>
    <ul class="lista-docs">${docs}</ul>
  </div>`;
}
