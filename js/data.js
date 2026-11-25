// ============================================================
//  RUTa al Éxito — Datos del juego
//  Los montos son aproximados y simplificados para el juego.
// ============================================================

const UTM = 69000;                 // Unidad Tributaria Mensual (aprox.)
const IVA = 0.19;                  // Impuesto al Valor Agregado
const PPM = 0.0025;                // Pago Provisional Mensual (tasa simplificada)
const COTIZACIONES_EMPLEADOR = 0.06; // Seguro cesantía, SIS, mutual, etc. (aprox.)
const CAPITAL_INICIAL = 8000000;   // Ahorros + préstamo familiar
const LIMITE_SOBREGIRO = 3000000;  // Si la caja baja de -esto, quiebras
const SEMANAS_PARA_GANAR = 52;     // Un año de operación
const FECHA_INICIO = new Date(2027, 2, 1); // Lunes 1 de marzo de 2027

// ------------------------------------------------------------
//  Rubros disponibles
// ------------------------------------------------------------
const RUBROS = {
  cafeteria: {
    id: 'cafeteria', nombre: 'Cafetería', emoji: '☕',
    desc: 'Café de especialidad y algo para picar. Mucho público, márgenes medios.',
    alimentos: true, local: 'local',
    unidad: 'cafés', precioBase: 3500, costoUnit: 1200,
    demandaBase: 300, capacidadPorPersona: 220, elasticidad: 1.4, sensMarketing: 1,
    equipamiento: 3500000, equipoNombre: 'Comprar máquina de café y mobiliario',
    arriendo: 650000, servicios: 150000, sueldo: 560000,
    dificultad: 'Media',
  },
  panaderia: {
    id: 'panaderia', nombre: 'Panadería', emoji: '🥖',
    desc: 'Marraquetas calentitas todos los días. Alto volumen, margen bajo.',
    alimentos: true, local: 'local',
    unidad: 'kilos de pan', precioBase: 2200, costoUnit: 800,
    demandaBase: 560, capacidadPorPersona: 350, elasticidad: 1.6, sensMarketing: 0.7,
    equipamiento: 4200000, equipoNombre: 'Comprar horno industrial y amasadora',
    arriendo: 550000, servicios: 220000, sueldo: 560000,
    dificultad: 'Media',
  },
  taller: {
    id: 'taller', nombre: 'Taller mecánico', emoji: '🔧',
    desc: 'Mantenciones y reparaciones. Pocos clientes, pero cada uno paga bien.',
    alimentos: false, local: 'local',
    unidad: 'servicios', precioBase: 55000, costoUnit: 20000,
    demandaBase: 30, capacidadPorPersona: 15, elasticidad: 1.2, sensMarketing: 0.8,
    equipamiento: 5000000, equipoNombre: 'Comprar elevador y herramientas',
    arriendo: 800000, servicios: 150000, sueldo: 650000,
    dificultad: 'Media',
  },
  software: {
    id: 'software', nombre: 'Agencia de software', emoji: '💻',
    desc: 'Desarrollas apps y webs para otras empresas. Poca inversión, clientes difíciles.',
    alimentos: false, local: 'cowork',
    unidad: 'horas facturadas', precioBase: 25000, costoUnit: 3000,
    demandaBase: 22, capacidadPorPersona: 40, elasticidad: 1.1, sensMarketing: 1.2,
    equipamiento: 2000000, equipoNombre: 'Comprar computadores y licencias',
    arriendo: 350000, servicios: 80000, sueldo: 1200000,
    dificultad: 'Fácil',
  },
  foodtruck: {
    id: 'foodtruck', nombre: 'Food truck', emoji: '🚚',
    desc: 'Comida rica sobre ruedas. Inversión alta: necesitarás financiamiento.',
    alimentos: true, local: 'carro',
    unidad: 'platos', precioBase: 6500, costoUnit: 2500,
    demandaBase: 165, capacidadPorPersona: 160, elasticidad: 1.3, sensMarketing: 1.1,
    equipamiento: 7500000, equipoNombre: 'Comprar y equipar el carro',
    arriendo: 250000, servicios: 120000, sueldo: 560000,
    dificultad: 'Difícil',
  },
  online: {
    id: 'online', nombre: 'Tienda online', emoji: '🛍️',
    desc: 'Vendes por internet y despachas a todo Chile. Vive del marketing.',
    alimentos: false, local: 'bodega',
    unidad: 'pedidos', precioBase: 18000, costoUnit: 9000,
    demandaBase: 60, capacidadPorPersona: 90, elasticidad: 1.5, sensMarketing: 1.7,
    equipamiento: 1500000, equipoNombre: 'Comprar stock inicial y estanterías',
    arriendo: 200000, servicios: 100000, sueldo: 560000,
    dificultad: 'Fácil',
  },
};

// ------------------------------------------------------------
//  Lugares del mapa
// ------------------------------------------------------------
// abre/cierra en minutos desde las 00:00. fila: hay que sacar número en un tótem.
// interior: tipo de sala que se ve al entrar. funcionarios: quiénes atienden.
const LUGARES = {
  registroCivil:   { nombre: 'Registro Civil', emoji: '🪪', online: false, abre: 540, cierra: 840, fila: true,
                     interior: 'oficina', modulos: 4, pared: 0xe8e2d0, letra: 'A',
                     funcionarios: ['Sra. Patricia', 'Don Hernán', 'Srta. Javiera', 'Don Luis'] },
  registroEmpresas:{ nombre: 'Registro de Empresas (online)', emoji: '🌐', online: true, abre: 0, cierra: 1440, fila: false,
                     interior: 'digital', modulos: 3, pared: 0xdbe9f6, letra: 'D',
                     funcionarios: ['Asistente virtual', 'Asistente virtual', 'Asistente virtual'] },
  sii:             { nombre: 'Servicio de Impuestos Internos', emoji: '🏛️', online: true, abre: 0, cierra: 1440, fila: false,
                     interior: 'digital', modulos: 3, pared: 0xe9e6dc, letra: 'S',
                     funcionarios: ['Asistente virtual', 'Don Rodrigo (mesa de ayuda)', 'Asistente virtual'] },
  banco:           { nombre: 'Banco', emoji: '🏦', online: false, abre: 540, cierra: 840, fila: true,
                     interior: 'banco', modulos: 3, pared: 0xdfe6ea, letra: 'B',
                     funcionarios: ['Ejecutiva Daniela', 'Ejecutivo Matías', 'Ejecutiva Carolina'] },
  corredora:       { nombre: 'Corredora de Propiedades', emoji: '🏠', online: false, abre: 540, cierra: 1080, fila: false,
                     interior: 'privado', modulos: 1, pared: 0xf3e3cf, letra: 'C',
                     funcionarios: ['Corredor Felipe'] },
  proveedor:       { nombre: 'Proveedor de Equipos', emoji: '📦', online: false, abre: 540, cierra: 1080, fila: false,
                     interior: 'bodega', modulos: 1, pared: 0xcfc6bb, letra: 'P',
                     funcionarios: ['Vendedor Jorge'] },
  municipalidad:   { nombre: 'Municipalidad', emoji: '🏢', online: false, abre: 510, cierra: 840, fila: true,
                     interior: 'oficina', modulos: 4, pared: 0xe3ecf7, letra: 'M',
                     funcionarios: ['Sra. Ximena', 'Don Ramón', 'Srta. Fernanda', 'Don Iván'] },
  seremi:          { nombre: 'SEREMI de Salud', emoji: '🏥', online: false, abre: 540, cierra: 840, fila: true,
                     interior: 'oficina', modulos: 3, pared: 0xeef4f1, letra: 'H',
                     funcionarios: ['Inspectora Gloria', 'Don Arturo', 'Srta. Camila'] },
  mutual:          { nombre: 'Mutual de Seguridad', emoji: '⛑️', online: false, abre: 510, cierra: 1050, fila: true,
                     interior: 'oficina', modulos: 2, pared: 0xfff3d6, letra: 'U',
                     funcionarios: ['Ejecutiva Marcela', 'Ejecutivo Tomás'] },
  fomento:         { nombre: 'Agencia de Fomento', emoji: '🚀', online: true, abre: 0, cierra: 1440, fila: false,
                     interior: 'digital', modulos: 2, pared: 0xebe4f7, letra: 'F',
                     funcionarios: ['Asistente virtual', 'Asesora Valentina'] },
};

// Texto de horario de un lugar
function horarioLugar(l) {
  if (l.online) return 'Online 24/7';
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  return `Lun a Vie ${hhmm(l.abre)}–${hhmm(l.cierra)}`;
}


// ------------------------------------------------------------
//  Trámites
//  nombre/costo/requiere/aplica pueden ser funciones del rubro.
//  paraAbrir: si es obligatorio para abrir el negocio.
// ------------------------------------------------------------
const TRAMITES = [
  {
    id: 'claveUnica', lugar: 'registroCivil', dias: 1, costo: 0, rechazo: 0.15,
    nombre: 'Obtener Clave Única',
    desc: 'Tu llave para hacer casi cualquier trámite del Estado por internet.',
    requiere: [],
  },
  {
    id: 'constitucion', lugar: 'registroEmpresas', dias: 1, costo: 0, rechazo: 0.2,
    nombre: 'Constituir la empresa', especial: 'sociedad',
    desc: 'Eliges el tipo de sociedad y firmas los estatutos con tu Clave Única. ¡Gratis!',
    requiere: ['claveUnica'],
  },
  {
    id: 'inicioActividades', lugar: 'sii', dias: 2, costo: 0, rechazo: 0.25,
    nombre: 'Obtener RUT e Inicio de Actividades',
    desc: 'Le avisas al SII que vas a empezar a vender. Te asignan el RUT de la empresa.',
    requiere: ['constitucion'],
  },
  {
    id: 'facturacion', lugar: 'sii', dias: 1, costo: 0, rechazo: 0.1,
    nombre: 'Habilitar boletas y facturas electrónicas',
    desc: 'Sin esto no puedes emitir boletas, o sea, no puedes vender.',
    requiere: ['inicioActividades'],
  },
  {
    id: 'cuentaBanco', lugar: 'banco', dias: 3, costo: 0, rechazo: 0.35,
    nombre: 'Abrir cuenta corriente de la empresa',
    desc: 'Para separar la plata de la empresa de la tuya. (Créeme, la vas a necesitar.)',
    requiere: ['inicioActividades'],
  },
  {
    id: 'arriendo', lugar: 'corredora', dias: 3, rechazo: 0.2,
    nombre: r => ({ local: 'Arrendar local comercial', cowork: 'Arrendar oficina en un cowork',
                    carro: 'Arrendar estacionamiento para el carro', bodega: 'Arrendar una bodega' })[r.local],
    costo: r => r.arriendo * 2,
    desc: 'Pagas mes de garantía + mes adelantado. Desde ahora el arriendo corre todos los meses.',
    requiere: ['constitucion'],
  },
  {
    id: 'equipamiento', lugar: 'proveedor', dias: 2, rechazo: 0.1,
    nombre: r => r.equipoNombre,
    costo: r => r.equipamiento,
    desc: 'Todo lo que necesitas para producir. El IVA de esta compra queda como crédito fiscal.',
    requiere: ['arriendo'],
  },
  {
    id: 'zonificacion', lugar: 'municipalidad', dias: 2, costo: 15000, rechazo: 0.25,
    nombre: 'Certificado de zonificación',
    desc: 'La Dirección de Obras confirma que tu rubro está permitido en esa dirección.',
    requiere: ['arriendo'],
    aplica: r => r.local !== 'carro',
  },
  {
    id: 'sanitaria', lugar: 'seremi', dias: 10, costo: 160000, rechazo: 0.4,
    nombre: 'Resolución sanitaria',
    desc: 'Obligatoria para manipular alimentos. Un inspector revisa tu local con lupa.',
    requiere: ['arriendo', 'equipamiento'],
    aplica: r => r.alimentos,
  },
  {
    id: 'bnup', lugar: 'municipalidad', dias: 5, costo: 120000, rechazo: 0.3,
    nombre: 'Permiso de uso de espacio público',
    desc: 'Para estacionar el carro y vender en la vía pública.',
    requiere: ['sanitaria'],
    aplica: r => r.local === 'carro',
  },
  {
    id: 'pasarela', lugar: 'banco', dias: 2, costo: 50000, rechazo: 0.15,
    nombre: 'Contratar pasarela de pagos web',
    desc: 'Para recibir pagos con tarjeta en tu tienda online.',
    requiere: ['cuentaBanco'],
    aplica: r => r.id === 'online',
  },
  {
    id: 'patente', lugar: 'municipalidad', dias: 3, costo: UTM * 2, rechazo: 0.3,
    nombre: 'Patente municipal',
    desc: 'El permiso final para funcionar. Se renueva cada semestre (enero y julio).',
    requiere: r => ['inicioActividades', r.local === 'carro' ? 'bnup' : 'zonificacion']
      .concat(r.alimentos ? ['sanitaria'] : []),
  },
  {
    id: 'mutual', lugar: 'mutual', dias: 1, costo: 0, rechazo: 0.05, paraAbrir: false,
    nombre: 'Adherirse a una mutual de seguridad',
    desc: 'Obligatorio antes de contratar trabajadores (seguro de accidentes laborales).',
    requiere: ['inicioActividades'],
  },
  {
    id: 'fondo', lugar: 'fomento', dias: 15, costo: 0, rechazo: 0, paraAbrir: false, especial: 'fondo',
    nombre: 'Postular al fondo concursable "Semilla Emprende"',
    desc: 'Puedes ganar $3.500.000 no reembolsables. Solo se postula una vez. Suerte.',
    requiere: ['inicioActividades'],
  },
  {
    id: 'credito', lugar: 'banco', dias: 5, costo: 0, rechazo: 0.3, paraAbrir: false, especial: 'credito',
    nombre: 'Pedir crédito Pyme de $5.000.000',
    desc: '24 cuotas mensuales al 1,5% mensual. La plata ahora, el dolor después.',
    requiere: ['cuentaBanco'],
  },
];

const CREDITO = { monto: 5000000, cuotas: 24, tasa: 0.015 };
const FONDO = { monto: 3500000, probabilidad: 0.35 };

// ------------------------------------------------------------
//  Tipos de sociedad
// ------------------------------------------------------------
const SOCIEDADES = {
  eirl: {
    nombre: 'E.I.R.L.', largo: 'Empresa Individual de Responsabilidad Limitada',
    desc: 'Eres el único dueño. Simple y 100% tuya.',
    capitalExtra: 0, parteSocio: 0,
  },
  spa: {
    nombre: 'SpA', largo: 'Sociedad por Acciones',
    desc: 'Flexible. Permite recibir inversionistas más adelante.',
    capitalExtra: 0, parteSocio: 0,
  },
  ltda: {
    nombre: 'Ltda.', largo: 'Sociedad de Responsabilidad Limitada',
    desc: 'Entra un socio con $3.000.000, pero se queda con el 30% de la empresa.',
    capitalExtra: 3000000, parteSocio: 0.3,
  },
};

// ------------------------------------------------------------
//  Motivos de rechazo (¡vuelva mañana!)
// ------------------------------------------------------------
const RECHAZOS_GENERALES = [
  'Le falta una fotocopia del carnet por ambos lados.',
  'El sistema está caído. Vuelva mañana.',
  'Ese formulario es el antiguo; ahora se usa el "bis".',
  'La firma no coincide con la de su cédula.',
  'Sacó número en la fila equivocada.',
  'El funcionario que firma está de vacaciones.',
  'Falta un certificado de vigencia de menos de 30 días.',
  'Llegó dos minutos después del cierre de la ventanilla.',
  'El documento tiene que venir legalizado ante notario.',
  'Se le venció la cédula de identidad hace tres días.',
];

const RECHAZOS_ESPECIFICOS = {
  registroEmpresas: ['La página se cayó justo cuando apretó "Firmar".', 'El sistema no reconoce su Clave Única. Pruebe más tarde.'],
  sii: ['El sistema pide acreditar el domicilio y su dirección "no existe".', 'Le pidieron un contrato de arriendo firmado ante notario.'],
  banco: ['El ejecutivo pide 3 meses de historial... de una empresa que tiene 3 días.', 'Necesitan la escritura y la publicación en el Diario Oficial.'],
  seremi: ['El inspector exige un lavamanos exclusivo para el personal.', 'Falta la certificación de la campana de extracción.', 'El piso no es lavable. Hay que cambiarlo.'],
  municipalidad: ['Falta el plano del local firmado por un arquitecto.', 'El certificado de número municipal está vencido.'],
  corredora: ['El dueño del local pide un aval con propiedades.', 'Otra persona ofreció más y le ganó el local.'],
  proveedor: ['El equipo viene en el próximo barco. Vuelva mañana.'],
};

// ------------------------------------------------------------
//  Eventos durante la operación
//  cond(G, r): si puede ocurrir. opciones: [{ texto, efecto(G, r) -> mensaje }]
// ------------------------------------------------------------
const EVENTOS = [
  {
    id: 'influencer', titulo: '📸 Un influencer pide canje',
    texto: 'Un influencer con 80 mil seguidores quiere probar tu producto gratis a cambio de una publicación.',
    opciones: [
      { texto: 'Aceptar (regalas productos por $80.000)', efecto: (G) => {
        G.caja -= 80000;
        if (Math.random() < 0.6) {
          agregarModificador('demanda', 1.25, 21, 'Efecto influencer');
          G.reputacion += 6;
          return '¡La publicación fue un éxito! Llegan clientes nuevos durante 3 semanas.';
        }
        G.reputacion -= 3;
        return 'Publicó una historia borrosa a las 3 AM. Nadie la vio.';
      } },
      { texto: 'Rechazar amablemente', efecto: () => 'Le dijiste que no. Sigues con tu plan.' },
    ],
  },
  {
    id: 'inspeccion', titulo: '🧑‍⚕️ Inspección sanitaria sorpresa',
    texto: 'Llegó un fiscalizador de la SEREMI de Salud sin avisar.',
    cond: (G, r) => r.alimentos,
    opciones: [
      { texto: 'Recibirlo tal como está', efecto: (G) => {
        const carga = G.ultimaSemana ? G.ultimaSemana.carga : 0.5;
        if (Math.random() < 0.35 + carga * 0.4) {
          const multa = UTM * 3;
          G.caja -= multa; G.reputacion -= 5;
          return `Encontró la basura destapada. Multa de ${dinero(multa)}. (Un equipo sobrecargado descuida la limpieza.)`;
        }
        G.reputacion += 2;
        return 'Todo impecable. El fiscalizador hasta se tomó un café.';
      } },
      { texto: 'Pedirle 1 hora para "ordenar" ($60.000 en horas extra)', efecto: (G) => {
        G.caja -= 60000;
        return 'Limpieza express. Pasaste la inspección sin problemas.';
      } },
    ],
  },
  {
    id: 'competencia', titulo: '😱 Abrió la competencia al frente',
    texto: 'Un negocio igual al tuyo abrió justo al frente, con un letrero gigante de "GRAN INAUGURACIÓN".',
    opciones: [
      { texto: 'Campaña de fidelización ($300.000)', efecto: (G) => {
        G.caja -= 300000;
        agregarModificador('demanda', 0.92, 28, 'Competencia');
        return 'Tus clientes fieles se quedan. La competencia solo te afecta un poco.';
      } },
      { texto: 'No hacer nada', efecto: () => {
        agregarModificador('demanda', 0.78, 42, 'Competencia');
        return 'Pierdes parte de tu clientela durante 6 semanas.';
      } },
    ],
  },
  {
    id: 'corteLuz', titulo: '🔌 Corte de luz',
    texto: 'Se cortó la luz en todo el barrio. La empresa eléctrica dice que "están trabajando".',
    cond: (G) => !G.flags.generador,
    opciones: [
      { texto: 'Comprar un generador ($450.000)', efecto: (G) => {
        G.caja -= 450000; G.flags.generador = true;
        return 'Con el generador no vuelves a perder ventas por cortes de luz.';
      } },
      { texto: 'Esperar a que vuelva', efecto: () => {
        agregarModificador('capacidad', 0.0, 2, 'Sin luz');
        return 'Pierdes dos días de ventas.';
      } },
    ],
  },
  {
    id: 'viral', titulo: '🔥 ¡Te volviste viral!',
    texto: 'Un video de tu negocio tiene medio millón de vistas. Mañana va a llegar una avalancha de gente.',
    opciones: [
      { texto: 'Contratar apoyo temporal ($350.000)', efecto: (G) => {
        G.caja -= 350000;
        agregarModificador('demanda', 1.5, 14, 'Viral');
        agregarModificador('capacidad', 1.5, 14, 'Apoyo temporal');
        G.reputacion += 5;
        return '¡Atiendes a todos! Ganas clientes y reputación.';
      } },
      { texto: 'Arreglárselas con lo que hay', efecto: () => {
        agregarModificador('demanda', 1.5, 14, 'Viral');
        return 'Llega mucha gente. Si no das abasto, tu reputación lo va a sentir.';
      } },
    ],
  },
  {
    id: 'proveedor', titulo: '📈 Tu proveedor sube los precios',
    texto: 'Tu proveedor principal anuncia un alza del 12% "por el dólar".',
    opciones: [
      { texto: 'Aceptar el alza', efecto: (G) => {
        G.costoFactor *= 1.12;
        return 'Tus costos por unidad suben un 12%.';
      } },
      { texto: 'Buscar otro proveedor (pierdes un día)', efecto: (G) => {
        agregarModificador('capacidad', 0.0, 1, 'Buscando proveedor');
        if (Math.random() < 0.55) return '¡Encontraste uno igual de bueno al mismo precio!';
        G.costoFactor *= 1.08;
        return 'El nuevo proveedor es un poco más barato, pero igual subes un 8%.';
      } },
    ],
  },
  {
    id: 'letrero', titulo: '🪧 La municipalidad revisa tu letrero',
    texto: 'Un inspector municipal dice que tu letrero requiere pagar derechos de publicidad.',
    cond: (G, r) => r.local !== 'bodega' && !G.flags.letrero,
    opciones: [
      { texto: `Pagar los derechos (${'$' + (UTM).toLocaleString('es-CL')})`, efecto: (G) => {
        G.caja -= UTM; G.flags.letrero = true;
        return 'Letrero regularizado. Ya no te molestarán por esto.';
      } },
      { texto: 'Retirar el letrero', efecto: (G) => {
        G.flags.letrero = true;
        agregarModificador('demanda', 0.95, 9999, 'Sin letrero');
        return 'Sin letrero, algo menos de gente te encuentra.';
      } },
    ],
  },
  {
    id: 'robo', titulo: '🚨 Entraron a robar',
    texto: 'En la noche forzaron la puerta y se llevaron la caja chica.',
    cond: (G) => !G.flags.alarma,
    opciones: [
      { texto: 'Instalar alarma ($280.000)', efecto: (G) => {
        const perdida = 150000 + Math.round(Math.random() * 250000);
        G.caja -= perdida + 280000; G.flags.alarma = true;
        return `Perdiste ${dinero(perdida)}. Con la alarma, no volverá a pasar.`;
      } },
      { texto: 'Hacer la denuncia y seguir', efecto: (G) => {
        const perdida = 150000 + Math.round(Math.random() * 250000);
        G.caja -= perdida;
        return `Perdiste ${dinero(perdida)}. La denuncia quedó en "investigación".`;
      } },
    ],
  },
  {
    id: 'resena', titulo: '⭐ Reseña de una estrella',
    texto: '"Pésimo. Me atendieron con cara de lunes." — Cliente anónimo',
    opciones: [
      { texto: 'Responder con humildad y ofrecer un cupón ($30.000)', efecto: (G) => {
        G.caja -= 30000; G.reputacion += 3;
        return 'El cliente cambió su reseña a 4 estrellas. ¡Bien manejado!';
      } },
      { texto: 'Responder a la defensiva', efecto: (G) => {
        G.reputacion -= 7;
        return 'Tu respuesta se hizo viral... para mal.';
      } },
      { texto: 'Ignorarla', efecto: (G) => {
        G.reputacion -= 2;
        return 'Queda ahí, para que todos la lean.';
      } },
    ],
  },
  {
    id: 'aumento', titulo: '🙋 Un trabajador pide aumento',
    texto: 'Uno de tus trabajadores dice que en otra parte le ofrecen más.',
    cond: (G) => G.empleados > 0,
    opciones: [
      { texto: 'Darle un bono permanente de $60.000 al mes', efecto: (G) => {
        G.bonos += 60000;
        agregarModificador('capacidad', 1.08, 9999, 'Equipo motivado');
        return 'Tu equipo está motivado y trabaja mejor.';
      } },
      { texto: 'Decirle que no se puede', efecto: (G) => {
        if (Math.random() < 0.45) {
          G.empleados -= 1;
          return 'Renunció. Tienes un trabajador menos.';
        }
        return 'Se quedó, pero no muy contento.';
      } },
    ],
  },
  {
    id: 'feriado', titulo: '🇨🇱 Se viene un fin de semana largo',
    texto: 'Feriado largo: mucha gente sale, pero otros se quedan buscando panorama.',
    opciones: [
      { texto: 'Abrir y pagar horas extra ($200.000)', efecto: (G) => {
        G.caja -= 200000;
        agregarModificador('demanda', 1.3, 4, 'Feriado largo');
        return 'Aprovechas el feriado con buenas ventas.';
      } },
      { texto: 'Cerrar y descansar', efecto: (G) => {
        agregarModificador('capacidad', 0.0, 3, 'Cerrado por feriado');
        G.paciencia = 100;
        return 'Recargaste energías. Tu paciencia está al máximo.';
      } },
    ],
  },
  {
    id: 'inversionista', titulo: '💼 Un inversionista ángel',
    texto: 'Una inversionista vio tu negocio y quiere entrar con $10.000.000 a cambio del 25% de tus acciones.',
    cond: (G) => G.sociedad === 'spa' && !G.flags.inversionista && G.semanasOperando >= 8,
    opciones: [
      { texto: 'Aceptar la inversión', efecto: (G) => {
        G.caja += 10000000; G.flags.inversionista = true;
        G.parteSocio = G.parteSocio + (1 - G.parteSocio) * 0.25;
        return 'Entran $10.000.000 a la caja. Ahora eres dueño de una parte menor, pero de algo más grande.';
      } },
      { texto: 'Rechazar: la empresa es mía', efecto: (G) => {
        G.flags.inversionista = true;
        return 'Sigues siendo dueño de todo.';
      } },
    ],
  },
  {
    id: 'cliente', titulo: '🤝 Un cliente grande',
    texto: 'Una empresa quiere un pedido grande, pero paga a 60 días.',
    opciones: [
      { texto: 'Aceptar el pedido', efecto: (G, r) => {
        const monto = Math.round(r.precioBase * r.capacidadPorPersona * 0.6);
        G.porCobrar.push({ monto, dia: G.diaJuego + 60 });
        agregarModificador('capacidad', 0.7, 7, 'Pedido grande');
        return `Esta semana produces menos para el público, pero en 60 días te pagan ${dinero(monto)}.`;
      } },
      { texto: 'Rechazar: la caja manda', efecto: () => 'Prefieres no financiar a otros.' },
    ],
  },
];
