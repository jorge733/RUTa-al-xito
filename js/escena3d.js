// ============================================================
//  RUTa al Éxito — Ciudad en 3D (Three.js)
//  Una plaza con los edificios de los trámites alrededor.
//  El jugador camina con clic/toque o con WASD / flechas.
// ============================================================

const Escena3D = (() => {
  const R_EDIF = 27;       // Radio donde se ubican los edificios
  const R_CAMINAR = 22;    // Radio máximo por el que se puede caminar
  const R_FUENTE = 3.4;    // Radio de la pileta central (obstáculo)
  const VELOCIDAD = 11;

  let renderer, scene, camera, raycaster, reloj, canvas, contenedor;
  let ok = false, construidoPara = null, onEntrar = () => {};
  let jugador, objetivo = null, entrarEn = null, enZona = null;
  let suelo, zoom = 1, tiempo = 0, proximoCliente = 0;
  let camYaw = -Math.PI / 2;  // Dirección hacia la que mira la cámara (desde el centro hacia afuera)
  const edificios = {};    // id -> { grupo, puerta, etiqueta, marcador, clave }
  let pickables = [];
  let npcs = [], autos = [];
  const teclas = {};
  const tmp = new THREE.Vector3();

  // ----------------------------------------------------------
  //  Apariencia de cada lugar
  // ----------------------------------------------------------
  const ESTILOS = {
    registroCivil:    { w: 8,  d: 7, h: 6,  color: 0xe9d8b4, techo: 'plano', colorTecho: 0x9e8b6a },
    registroEmpresas: { w: 6,  d: 6, h: 12, color: 0x7fb3d5, techo: 'plano', colorTecho: 0x4a7fa3, vidrio: true },
    sii:              { w: 10, d: 7, h: 7,  color: 0xf2efe6, techo: 'fronton', colorTecho: 0xd8d2c0, columnas: true },
    banco:            { w: 8,  d: 7, h: 8,  color: 0xcfd8dc, techo: 'plano', colorTecho: 0xc9a227, columnas: true },
    corredora:        { w: 7,  d: 6, h: 4.5, color: 0xf6c89f, techo: 'dosAguas', colorTecho: 0xb5523b },
    proveedor:        { w: 10, d: 8, h: 5,  color: 0xa1887f, techo: 'dosAguas', colorTecho: 0x6d6d6d, porton: true },
    municipalidad:    { w: 10, d: 8, h: 8,  color: 0xffffff, techo: 'plano', colorTecho: 0x0b3d91, bandera: true, torre: true },
    seremi:           { w: 8,  d: 7, h: 7,  color: 0xfafafa, techo: 'plano', colorTecho: 0xd52b1e, cruz: true },
    mutual:           { w: 7,  d: 6, h: 6,  color: 0xffe082, techo: 'plano', colorTecho: 0xf57c00 },
    fomento:          { w: 7,  d: 6, h: 7,  color: 0xb39ddb, techo: 'plano', colorTecho: 0x5e35b1, cohete: true },
  };
  const COLOR_NEGOCIO = {
    cafeteria: 0x8d6e63, panaderia: 0xffcc80, taller: 0x90a4ae,
    software: 0x80cbc4, foodtruck: 0xef5350, online: 0xf48fb1,
  };

  // ----------------------------------------------------------
  //  Utilidades de geometría
  // ----------------------------------------------------------
  const mats = {};
  function mat(color, extra) {
    const clave = color + JSON.stringify(extra || {});
    if (!mats[clave]) mats[clave] = new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
    return mats[clave];
  }
  function caja(w, h, d, color, x = 0, y = 0, z = 0, extra) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function cilindro(rt, rb, h, color, seg = 16) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function texturaEtiqueta(titulo, sub, fondo = 'rgba(255,255,255,0.93)', colorTitulo = '#0b3d91') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 150;
    const x = c.getContext('2d');
    x.fillStyle = fondo;
    x.strokeStyle = 'rgba(11,61,145,0.35)';
    x.lineWidth = 4;
    const r = 30;
    x.beginPath();
    x.moveTo(r, 4); x.arcTo(508, 4, 508, 146, r); x.arcTo(508, 146, 4, 146, r);
    x.arcTo(4, 146, 4, 4, r); x.arcTo(4, 4, 508, 4, r); x.closePath();
    x.fill(); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = colorTitulo;
    let size = 46;
    x.font = `bold ${size}px system-ui, sans-serif`;
    while (x.measureText(titulo).width > 480 && size > 22) { size -= 2; x.font = `bold ${size}px system-ui, sans-serif`; }
    x.fillText(titulo, 256, sub ? 58 : 75);
    if (sub) {
      x.fillStyle = '#5b6475';
      x.font = '30px system-ui, sans-serif';
      x.fillText(sub, 256, 112);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function texturaMarcador(simbolo, color) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = color;
    x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = '#fff';
    x.font = 'bold 80px system-ui, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(simbolo, 64, 70);
    return new THREE.CanvasTexture(c);
  }
  function sprite(textura, ancho, alto) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, depthTest: true, transparent: true }));
    s.scale.set(ancho, alto, 1);
    return s;
  }

  // ----------------------------------------------------------
  //  Construcción de edificios
  // ----------------------------------------------------------
  function construirEdificio(e) {
    const g = new THREE.Group();
    g.add(caja(e.w, e.h, e.d, e.color, 0, e.h / 2, 0));

    // Techo
    if (e.techo === 'plano') {
      g.add(caja(e.w + 0.4, 0.5, e.d + 0.4, e.colorTecho, 0, e.h + 0.25, 0));
    } else if (e.techo === 'dosAguas' || e.techo === 'fronton') {
      const alto = e.techo === 'fronton' ? 1.8 : 2.6;
      const prisma = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, e.d + 0.4, 3), mat(e.colorTecho));
      prisma.rotation.x = Math.PI / 2;
      prisma.rotation.y = Math.PI / 2;
      prisma.scale.set(alto / 1.5, 1, (e.w + 0.6) / 1.732);
      prisma.position.y = e.h + alto / 3;
      prisma.castShadow = true;
      g.add(prisma);
    }

    // Puerta y ventanas en la fachada (+z)
    const fz = e.d / 2 + 0.05;
    if (e.porton) g.add(caja(4, 3.6, 0.2, 0x5d4037, 0, 1.8, fz));
    else g.add(caja(1.6, 2.6, 0.2, 0x4e342e, 0, 1.3, fz));
    const colorVentana = e.vidrio ? 0xd6f0ff : 0xbfe3ff;
    const pisos = Math.max(1, Math.floor((e.h - 1) / 3));
    for (let p = 0; p < pisos; p++) {
      for (let i = -1; i <= 1; i += 2) {
        const y = p === 0 ? 1.8 : 1.8 + p * 3;
        if (p === 0 && e.porton) continue;
        g.add(caja(1.3, 1.2, 0.15, colorVentana, i * (e.w / 2 - 1.5), y, fz, { emissive: 0x223344 }));
      }
      if (p > 0) g.add(caja(1.3, 1.2, 0.15, colorVentana, 0, 1.8 + p * 3, fz, { emissive: 0x223344 }));
    }

    // Detalles
    if (e.columnas) {
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const col = cilindro(0.3, 0.3, e.h - 0.4, 0xffffff, 10);
        col.position.set(i * (e.w / 5), (e.h - 0.4) / 2, e.d / 2 + 0.8);
        g.add(col);
      }
      g.add(caja(e.w, 0.4, 1.6, 0xeeeeee, 0, e.h - 0.2, e.d / 2 + 0.7));
      g.add(caja(e.w + 0.6, 0.3, 2, 0xdddddd, 0, 0.15, e.d / 2 + 0.8));
    }
    if (e.bandera) {
      const mastil = cilindro(0.08, 0.08, 6, 0x9e9e9e, 8);
      mastil.position.set(e.w / 2 - 0.5, e.h + 3, e.d / 2 - 0.5);
      g.add(mastil);
      const fx = e.w / 2 - 0.5 + 1.1, fy = e.h + 5.4, fzb = e.d / 2 - 0.5;
      g.add(caja(1.1, 0.6, 0.05, 0xffffff, fx + 0.5, fy + 0.3, fzb));
      g.add(caja(2.2, 0.6, 0.05, 0xd52b1e, fx, fy - 0.3, fzb));
      g.add(caja(1.1, 0.6, 0.06, 0x0b3d91, fx - 0.55, fy + 0.3, fzb));
    }
    if (e.torre) {
      g.add(caja(2.4, 3, 2.4, 0xffffff, 0, e.h + 1.5, 0));
      const reloj = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), mat(0xfff8e1));
      reloj.position.set(0, e.h + 1.8, 1.22);
      g.add(reloj);
      const punta = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2, 4), mat(0x0b3d91));
      punta.position.y = e.h + 4; punta.rotation.y = Math.PI / 4;
      g.add(punta);
    }
    if (e.cruz) {
      g.add(caja(2.4, 0.7, 0.2, 0xd52b1e, 0, e.h - 1.2, fz + 0.05));
      g.add(caja(0.7, 2.4, 0.2, 0xd52b1e, 0, e.h - 1.2, fz + 0.05));
    }
    if (e.cohete) {
      const cuerpo = cilindro(0.5, 0.5, 2.4, 0xffffff, 12);
      cuerpo.position.y = e.h + 1.8;
      const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 12), mat(0xd52b1e));
      nariz.position.y = e.h + 3.5;
      g.add(cuerpo, nariz);
    }
    return g;
  }

  function construirCamion(color) {
    const g = new THREE.Group();
    g.add(caja(5, 3, 2.6, color, -0.6, 2, 0));
    g.add(caja(1.8, 2.2, 2.4, 0xeeeeee, 2.8, 1.6, 0));
    g.add(caja(3, 1, 0.1, 0x37474f, -0.6, 2.4, 1.32)); // ventana de atención
    g.add(caja(3.4, 0.15, 0.8, 0xffffff, -0.6, 1.85, 1.6)); // mesón
    for (const [x, z] of [[-2.2, 1.3], [-2.2, -1.3], [2.6, 1.3], [2.6, -1.3]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), mat(0x212121));
      r.rotation.x = Math.PI / 2; r.position.set(x, 0.55, z);
      g.add(r);
    }
    g.rotation.y = 0;
    return g;
  }

  // ----------------------------------------------------------
  //  Personas
  // ----------------------------------------------------------
  function construirPersona(colorPolera, colorPantalon = 0x37474f, escala = 1) {
    const g = new THREE.Group();
    const piel = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524][Math.floor(Math.random() * 4)];
    const piernaI = caja(0.32, 0.9, 0.32, colorPantalon, -0.2, 0.45, 0);
    const piernaD = caja(0.32, 0.9, 0.32, colorPantalon, 0.2, 0.45, 0);
    const torso = caja(0.85, 1, 0.5, colorPolera, 0, 1.4, 0);
    const brazoI = caja(0.24, 0.85, 0.24, colorPolera, -0.56, 1.45, 0);
    const brazoD = caja(0.24, 0.85, 0.24, colorPolera, 0.56, 1.45, 0);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), mat(piel));
    cabeza.position.y = 2.15; cabeza.castShadow = true;
    // Pivotes para animar
    [piernaI, piernaD, brazoI, brazoD].forEach(p => { p.geometry.translate(0, -p.geometry.parameters.height / 2 + 0.05, 0); p.position.y += p.geometry.parameters.height / 2 - 0.05; });
    g.add(piernaI, piernaD, torso, brazoI, brazoD, cabeza);
    g.userData.partes = { piernaI, piernaD, brazoI, brazoD };
    g.scale.setScalar(escala);
    return g;
  }
  function animarCaminata(p, moviendo, t) {
    const { piernaI, piernaD, brazoI, brazoD } = p.userData.partes;
    const a = moviendo ? Math.sin(t * 11) * 0.6 : 0;
    piernaI.rotation.x = a; piernaD.rotation.x = -a;
    brazoI.rotation.x = -a * 0.8; brazoD.rotation.x = a * 0.8;
  }

  // ----------------------------------------------------------
  //  Mundo
  // ----------------------------------------------------------
  function construirMundo() {
    scene.background = new THREE.Color(0xbfe3ff);
    scene.fog = new THREE.Fog(0xbfe3ff, 60, 120);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa77, 0.75));
    const sol = new THREE.DirectionalLight(0xffffff, 0.75);
    sol.position.set(25, 40, 15);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
    scene.add(sol);

    // Pasto
    suelo = new THREE.Mesh(new THREE.CircleGeometry(120, 48), mat(0x8bc34a));
    suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true;
    scene.add(suelo);
    // Plaza
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(R_CAMINAR + 1.5, 64), mat(0xe8dcc6));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true;
    scene.add(plaza);
    const borde = new THREE.Mesh(new THREE.RingGeometry(R_CAMINAR + 1.5, R_CAMINAR + 2.2, 64), mat(0xbdb29e));
    borde.rotation.x = -Math.PI / 2; borde.position.y = 0.03;
    scene.add(borde);
    // Diseño de baldosas
    for (const r of [7, 13]) {
      const anillo = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.4, 64), mat(0xd4c6aa));
      anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.04;
      scene.add(anillo);
    }
    // Calle de circunvalación detrás de los edificios
    const calle = new THREE.Mesh(new THREE.RingGeometry(33, 38, 72), mat(0x555a60));
    calle.rotation.x = -Math.PI / 2; calle.position.y = 0.03; calle.receiveShadow = true;
    scene.add(calle);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      const linea = caja(0.25, 0.02, 1.6, 0xffffff, Math.cos(a) * 35.5, 0.05, Math.sin(a) * 35.5);
      linea.rotation.y = -a; linea.castShadow = false;
      scene.add(linea);
    }

    // Pileta
    const base = cilindro(3, 3.2, 0.8, 0xbdbdbd, 32); base.position.y = 0.4;
    const agua = cilindro(2.6, 2.6, 0.1, 0x4fc3f7, 32); agua.position.y = 0.8;
    const centro = cilindro(0.35, 0.5, 2.2, 0xbdbdbd, 12); centro.position.y = 1.5;
    const plato = cilindro(1.1, 0.6, 0.3, 0xbdbdbd, 20); plato.position.y = 2.5;
    scene.add(base, agua, centro, plato);

    // Faroles
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2;
      const poste = cilindro(0.1, 0.12, 4, 0x263238, 8);
      poste.position.set(Math.cos(a) * 16, 2, Math.sin(a) * 16);
      const luz = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), mat(0xfff59d, { emissive: 0x887700 }));
      luz.position.set(Math.cos(a) * 16, 4.2, Math.sin(a) * 16);
      scene.add(poste, luz);
    }
    // Bancas
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + Math.PI / 4;
      const banca = caja(2.4, 0.2, 0.7, 0x8d6e63, Math.cos(a) * 9.5, 0.6, Math.sin(a) * 9.5);
      banca.rotation.y = -a + Math.PI / 2;
      scene.add(banca);
    }
    // Árboles exteriores
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 30;
      const s = 0.8 + Math.random() * 0.8;
      const tronco = cilindro(0.25 * s, 0.35 * s, 2 * s, 0x6d4c41, 8);
      tronco.position.set(Math.cos(a) * r, s, Math.sin(a) * r);
      const copa = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 3.5 * s, 8), mat([0x388e3c, 0x43a047, 0x2e7d32][i % 3]));
      copa.position.set(Math.cos(a) * r, 2 * s + 1.5 * s, Math.sin(a) * r);
      copa.castShadow = true;
      scene.add(tronco, copa);
    }
    // Autos
    const coloresAuto = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.add(caja(1.8, 0.9, 3.6, coloresAuto[i], 0, 0.75, 0));
      g.add(caja(1.6, 0.7, 1.9, 0x90caf9, 0, 1.5, -0.2));
      g.userData = { angulo: i / 5 * Math.PI * 2, vel: 0.08 + Math.random() * 0.05, radio: i % 2 ? 34.3 : 36.7 };
      autos.push(g);
      scene.add(g);
    }

    // Jugador
    jugador = construirPersona(0x0b3d91, 0x263238, 1.1);
    jugador.position.set(0, 0, -9);
    jugador.rotation.y = Math.PI;
    scene.add(jugador);
    const aro = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 24), new THREE.MeshBasicMaterial({ color: 0xd52b1e, transparent: true, opacity: 0.8 }));
    aro.rotation.x = -Math.PI / 2; aro.position.y = 0.06;
    jugador.add(aro);
  }

  // ----------------------------------------------------------
  //  Edificios según el rubro de la partida
  // ----------------------------------------------------------
  function limpiarEdificios() {
    for (const id of Object.keys(edificios)) {
      scene.remove(edificios[id].grupo);
      delete edificios[id];
    }
    pickables = [];
    npcs.forEach(n => scene.remove(n)); npcs = [];
  }

  function construirCiudad() {
    limpiarEdificios();
    const ids = Object.keys(LUGARES).filter(id => tramitesAplicables().some(t => t.lugar === id) || id === 'sii');
    // El negocio del jugador queda al norte, frente a la cámara al empezar
    const orden = ['negocio'].concat(ids);
    const n = orden.length;
    orden.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const grupo = new THREE.Group();
      const pos = new THREE.Vector3(Math.cos(ang) * R_EDIF, 0, Math.sin(ang) * R_EDIF);
      grupo.position.copy(pos);
      grupo.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang));
      scene.add(grupo);

      const cont = new THREE.Group();
      grupo.add(cont);
      const prof = id === 'negocio' ? 7 : ESTILOS[id].d;
      const alto = id === 'negocio' ? 5 : ESTILOS[id].h + (ESTILOS[id].torre ? 5 : 0);
      if (id !== 'negocio') cont.add(construirEdificio(ESTILOS[id]));

      const haciaCentro = pos.clone().multiplyScalar(-1).normalize();
      const puerta = pos.clone().add(haciaCentro.clone().multiplyScalar(prof / 2 + 1.6));

      const etiqueta = sprite(texturaEtiqueta('', ''), 8, 2.35);
      etiqueta.position.set(0, alto + 2.4, 0);
      grupo.add(etiqueta);
      const marcador = sprite(texturaMarcador('!', '#f4b400'), 1.8, 1.8);
      marcador.position.set(0, alto + 4.8, 0);
      marcador.visible = false;
      grupo.add(marcador);

      edificios[id] = { grupo, cont, puerta, etiqueta, marcador, clave: null, alto, simbolo: '!' };
    });
    actualizarPickables();
  }

  function actualizarPickables() {
    pickables = [];
    for (const [id, e] of Object.entries(edificios)) {
      e.grupo.traverse(o => { if (o.isMesh || o.isSprite) { o.userData.lugar = id; pickables.push(o); } });
    }
  }

  function construirNegocio(estado) {
    const e = edificios.negocio;
    if (!e) return;
    while (e.cont.children.length) e.cont.remove(e.cont.children[0]);
    const r = rubro();
    const color = COLOR_NEGOCIO[r.id] || 0x90a4ae;

    if (estado === 'vacio') {
      // Sitio vacío con reja y letrero
      const piso = caja(9, 0.1, 7, 0xa5d6a7, 0, 0.05, 0);
      e.cont.add(piso);
      for (const [x, z, w, d] of [[0, -3.5, 9, 0.15], [-4.5, 0, 0.15, 7], [4.5, 0, 0.15, 7], [-3, 3.5, 3, 0.15], [3, 3.5, 3, 0.15]]) {
        e.cont.add(caja(w, 1, d, 0xbcaaa4, x, 0.5, z));
      }
      const letrero = sprite(texturaEtiqueta('SE ARRIENDA', 'Pregunta en la corredora', '#fff8e1', '#d52b1e'), 5, 1.5);
      letrero.position.set(0, 2, 2.5);
      e.cont.add(letrero);
    } else if (r.local === 'carro') {
      const piso = caja(9, 0.1, 7, 0x9e9e9e, 0, 0.05, 0);
      e.cont.add(piso);
      const camion = construirCamion(color);
      camion.position.set(0, 0, 0.5);
      e.cont.add(camion);
      if (estado === 'abierto') {
        for (const x of [-3, 3]) {
          const mesa = cilindro(0.7, 0.7, 0.1, 0xffffff, 14); mesa.position.set(x, 1, 3.3);
          const pata = cilindro(0.08, 0.08, 1, 0x757575, 6); pata.position.set(x, 0.5, 3.3);
          e.cont.add(mesa, pata);
        }
      }
    } else {
      const abierto = estado === 'abierto';
      e.cont.add(caja(9, 5, 7, color, 0, 2.5, 0));
      e.cont.add(caja(9.4, 0.5, 7.4, 0x5d4037, 0, 5.25, 0));
      e.cont.add(caja(1.8, 2.8, 0.2, abierto ? 0xfff3e0 : 0x4e342e, 0, 1.4, 3.55, abierto ? { emissive: 0x665533 } : undefined));
      for (const x of [-3, 3]) {
        e.cont.add(caja(2.4, 1.8, 0.15, abierto ? 0xfff59d : 0x90a4ae, x, 2, 3.55, abierto ? { emissive: 0x777722 } : undefined));
      }
      if (abierto) {
        // Toldo a rayas
        for (let i = 0; i < 6; i++) {
          const franja = caja(1.5, 0.12, 1.8, i % 2 ? 0xffffff : 0xd52b1e, -3.75 + i * 1.5, 3.9, 4.3);
          franja.rotation.x = 0.35;
          e.cont.add(franja);
        }
      }
    }
    actualizarPickables();
  }

  // ----------------------------------------------------------
  //  Sincronización con el estado del juego
  // ----------------------------------------------------------
  function actualizar() {
    if (!ok || !G) return;
    const claveCiudad = G.rubroId + '|' + G.empresa;
    if (construidoPara !== claveCiudad) {
      construidoPara = claveCiudad;
      construirCiudad();
      jugador.position.set(0, 0, -9);
      camYaw = -Math.PI / 2;
      objetivo = null; entrarEn = null;
      moverCamara(true);
    }
    const finde = esFinDeSemana(fechaActual());

    for (const [id, e] of Object.entries(edificios)) {
      let titulo, sub, marca = null, colorMarca = '#f4b400';
      if (id === 'negocio') {
        const estado = G.fase === 'operacion' ? 'abierto' : hecho('arriendo') ? 'arrendado' : 'vacio';
        if (e.estado !== estado) { e.estado = estado; construirNegocio(estado); }
        titulo = `${rubro().emoji} ${G.empresa}`;
        sub = estado === 'abierto' ? '¡Abierto!' : estado === 'arrendado' ? 'Próximamente' : 'Tu futuro negocio';
        if (G.fase === 'tramites' && puedeAbrir()) marca = '★';
      } else {
        const l = LUGARES[id];
        const disp = tramitesAplicables().filter(t => t.lugar === id && estadoTramite(t) === 'disponible').length;
        const f29 = id === 'sii' && deudaF29() > 0;
        const cerrado = !l.online && finde;
        titulo = `${l.emoji} ${l.nombre.replace(' (online)', '')}`;
        sub = cerrado ? '🔒 Cerrado hoy' : disp ? `${disp} trámite${disp > 1 ? 's' : ''} disponible${disp > 1 ? 's' : ''}` : l.horario;
        if (f29) { marca = '$'; colorMarca = '#d52b1e'; }
        else if (disp) marca = '!';
      }
      const clave = titulo + sub + marca;
      if (e.clave !== clave) {
        e.clave = clave;
        e.etiqueta.material.map.dispose();
        e.etiqueta.material.map = texturaEtiqueta(titulo, sub);
        e.etiqueta.material.needsUpdate = true;
        if (marca && marca !== e.simbolo) {
          e.marcador.material.map.dispose();
          e.marcador.material.map = texturaMarcador(marca, colorMarca);
          e.marcador.material.needsUpdate = true;
          e.simbolo = marca;
        }
        e.marcador.visible = !!marca;
      }
    }
  }

  // ----------------------------------------------------------
  //  Movimiento
  // ----------------------------------------------------------
  function limitar(p) {
    const r = Math.hypot(p.x, p.z);
    if (r > R_CAMINAR) { p.x *= R_CAMINAR / r; p.z *= R_CAMINAR / r; }
    if (r < R_FUENTE && r > 0.001) { p.x *= R_FUENTE / r; p.z *= R_FUENTE / r; }
    return p;
  }

  function irA(id) {
    if (!ok || !edificios[id]) return false;
    objetivo = edificios[id].puerta.clone();
    limitar(objetivo);
    entrarEn = id;
    return true;
  }

  function modalAbierto() {
    const m = document.getElementById('modal');
    return m && !m.classList.contains('oculto');
  }

  function moverJugador(dt) {
    if (modalAbierto()) { animarCaminata(jugador, false, tiempo); return; }
    let dx = 0, dz = 0;
    if (teclas.w || teclas.arrowup) dz -= 1;
    if (teclas.s || teclas.arrowdown) dz += 1;
    if (teclas.a || teclas.arrowleft) dx -= 1;
    if (teclas.d || teclas.arrowright) dx += 1;
    let moviendo = false;
    const p = jugador.position;

    if (dx || dz) {
      objetivo = null; entrarEn = null;
      // Movimiento relativo a la cámara: W = hacia adelante en pantalla
      const fx = Math.cos(camYaw), fz = Math.sin(camYaw);
      const mx = -dz * fx + dx * -fz, mz = -dz * fz + dx * fx;
      const len = Math.hypot(mx, mz);
      p.x += mx / len * VELOCIDAD * dt;
      p.z += mz / len * VELOCIDAD * dt;
      jugador.rotation.y = Math.atan2(mx, mz);
      moviendo = true;
    } else if (objetivo) {
      tmp.set(objetivo.x - p.x, 0, objetivo.z - p.z);
      const dist = tmp.length();
      if (dist < 0.25) {
        objetivo = null;
        if (entrarEn) { const id = entrarEn; entrarEn = null; enZona = id; onEntrar(id); }
      } else {
        const paso = Math.min(dist, VELOCIDAD * dt);
        tmp.normalize();
        // Rodear la pileta si el camino pasa por el centro
        const futuro = new THREE.Vector3(p.x + tmp.x * paso, 0, p.z + tmp.z * paso);
        if (Math.hypot(futuro.x, futuro.z) < R_FUENTE + 0.3) {
          const tang = new THREE.Vector3(-p.z, 0, p.x).normalize();
          if (tang.dot(tmp) < 0) tang.multiplyScalar(-1);
          tmp.copy(tang);
        }
        p.x += tmp.x * paso;
        p.z += tmp.z * paso;
        jugador.rotation.y = Math.atan2(tmp.x, tmp.z);
        moviendo = true;
      }
    }
    limitar(p);

    // Entrar caminando con el teclado
    if (dx || dz) {
      for (const [id, e] of Object.entries(edificios)) {
        const d = Math.hypot(e.puerta.x - p.x, e.puerta.z - p.z);
        if (d < 1.8 && enZona !== id) { enZona = id; onEntrar(id); break; }
      }
    }
    if (enZona && edificios[enZona]) {
      const e = edificios[enZona];
      if (Math.hypot(e.puerta.x - p.x, e.puerta.z - p.z) > 3) enZona = null;
    }
    animarCaminata(jugador, moviendo, tiempo);
  }

  function moverNPCs(dt) {
    // Peatones que pasean
    while (npcs.filter(n => !n.userData.cliente).length < 7) {
      const n = construirPersona([0xe57373, 0x81c784, 0xffb74d, 0xba68c8, 0x4dd0e1, 0xf06292][Math.floor(Math.random() * 6)], 0x455a64, 0.95);
      n.position.copy(puntoAzar());
      n.userData.destino = puntoAzar();
      npcs.push(n); scene.add(n);
    }
    // Clientes que van a tu negocio
    if (G && G.fase === 'operacion' && edificios.negocio) {
      proximoCliente -= dt;
      if (proximoCliente <= 0) {
        const s = G.ultimaSemana;
        const k = s ? clamp(s.ventas / rubro().demandaBase, 0.2, 2) : 0.5;
        proximoCliente = 2.6 / k;
        if (npcs.length < 18) {
          const n = construirPersona([0xffffff, 0xfff176, 0xaed581, 0x90caf9][Math.floor(Math.random() * 4)], 0x37474f, 0.95);
          const a = Math.random() * Math.PI * 2;
          n.position.set(Math.cos(a) * (R_CAMINAR - 0.5), 0, Math.sin(a) * (R_CAMINAR - 0.5));
          n.userData.destino = edificios.negocio.puerta.clone();
          n.userData.cliente = true;
          npcs.push(n); scene.add(n);
        }
      }
    }
    for (const n of npcs.slice()) {
      const d = n.userData.destino;
      tmp.set(d.x - n.position.x, 0, d.z - n.position.z);
      const dist = tmp.length();
      if (dist < 0.3) {
        if (n.userData.cliente) { scene.remove(n); npcs.splice(npcs.indexOf(n), 1); continue; }
        n.userData.destino = puntoAzar();
        continue;
      }
      tmp.normalize();
      const futuro = Math.hypot(n.position.x + tmp.x, n.position.z + tmp.z);
      if (futuro < R_FUENTE + 0.3) {
        const tang = new THREE.Vector3(-n.position.z, 0, n.position.x).normalize();
        if (tang.dot(tmp) < 0) tang.multiplyScalar(-1);
        tmp.copy(tang);
      }
      const v = n.userData.cliente ? 4.5 : 2.2;
      n.position.x += tmp.x * v * dt;
      n.position.z += tmp.z * v * dt;
      n.rotation.y = Math.atan2(tmp.x, tmp.z);
      animarCaminata(n, true, tiempo + n.id);
    }
    // Autos
    for (const a of autos) {
      a.userData.angulo += a.userData.vel * dt;
      const ang = a.userData.angulo;
      a.position.set(Math.cos(ang) * a.userData.radio, 0, Math.sin(ang) * a.userData.radio);
      a.rotation.y = -ang;
    }
  }

  function puntoAzar() {
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * (R_CAMINAR - 7);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  // ----------------------------------------------------------
  //  Cámara y bucle
  // ----------------------------------------------------------
  function moverCamara(inmediato) {
    // La cámara se ubica entre el centro de la plaza y el jugador, mirando hacia afuera,
    // así siempre se ve la fachada del edificio al que te acercas.
    const p = jugador.position;
    const r = Math.hypot(p.x, p.z);
    if (r > 4) {
      const deseado = Math.atan2(p.z, p.x);
      let dif = deseado - camYaw;
      while (dif > Math.PI) dif -= Math.PI * 2;
      while (dif < -Math.PI) dif += Math.PI * 2;
      camYaw += inmediato ? dif : dif * 0.04;
    }
    const fx = Math.cos(camYaw), fz = Math.sin(camYaw);
    tmp.set(p.x - fx * 17 * zoom, 12 * zoom, p.z - fz * 17 * zoom);
    if (inmediato) camera.position.copy(tmp);
    else camera.position.lerp(tmp, 0.08);
    // Mira un poco por delante del jugador para ver los edificios
    camera.lookAt(p.x + fx * 7, 3, p.z + fz * 7);
  }

  function bucle() {
    requestAnimationFrame(bucle);
    if (!canvas.isConnected) { reloj.getDelta(); return; }
    const dt = Math.min(reloj.getDelta(), 0.05);
    tiempo += dt;
    moverJugador(dt);
    moverNPCs(dt);
    for (const e of Object.values(edificios)) {
      if (e.marcador.visible) {
        e.marcador.position.y = e.alto + 4.8 + Math.sin(tiempo * 3) * 0.35;
      }
    }
    moverCamara(false);
    renderer.render(scene, camera);
  }

  function ajustarTamano() {
    if (!contenedor || !canvas.isConnected) return;
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ----------------------------------------------------------
  //  Entrada
  // ----------------------------------------------------------
  function configurarEntrada() {
    let inicio = null;
    canvas.addEventListener('pointerdown', ev => { inicio = { x: ev.clientX, y: ev.clientY }; });
    canvas.addEventListener('pointerup', ev => {
      if (!inicio || Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 8) return;
      inicio = null;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const golpe = raycaster.intersectObjects(pickables, false)[0];
      if (golpe && golpe.object.userData.lugar) {
        const id = golpe.object.userData.lugar;
        const e = edificios[id];
        if (Math.hypot(e.puerta.x - jugador.position.x, e.puerta.z - jugador.position.z) < 1) { onEntrar(id); return; }
        irA(id);
        return;
      }
      const s = raycaster.intersectObject(suelo)[0];
      if (s) { objetivo = limitar(s.point.clone()); entrarEn = null; }
    });
    canvas.addEventListener('wheel', ev => {
      ev.preventDefault();
      zoom = clamp(zoom * (ev.deltaY > 0 ? 1.1 : 0.9), 0.55, 1.7);
    }, { passive: false });
    window.addEventListener('keydown', ev => {
      if (!canvas.isConnected || modalAbierto()) return;
      const tag = (ev.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        teclas[k] = true;
        ev.preventDefault();
      }
      if (k === 'e' || k === 'enter') {
        for (const [id, e] of Object.entries(edificios)) {
          if (Math.hypot(e.puerta.x - jugador.position.x, e.puerta.z - jugador.position.z) < 2.5) { onEntrar(id); break; }
        }
      }
    });
    window.addEventListener('keyup', ev => { teclas[ev.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });
    window.addEventListener('resize', ajustarTamano);
  }

  // ----------------------------------------------------------
  //  API pública
  // ----------------------------------------------------------
  function init(callbackEntrar) {
    onEntrar = callbackEntrar;
    try {
      if (typeof THREE === 'undefined') return false;
      canvas = document.createElement('canvas');
      canvas.className = 'canvas3d';
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return false;
      renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    } catch (e) {
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 300);
    raycaster = new THREE.Raycaster();
    reloj = new THREE.Clock();
    construirMundo();
    configurarEntrada();
    moverCamara(true);
    ok = true;
    bucle();
    return true;
  }

  function montar(div) {
    if (!ok || !div) return;
    contenedor = div;
    div.appendChild(canvas);
    ajustarTamano();
    if (typeof ResizeObserver !== 'undefined' && !div._observado) {
      div._observado = true;
      new ResizeObserver(ajustarTamano).observe(div);
    }
  }

  return { init, montar, actualizar, irA, get disponible() { return ok; } };
})();
