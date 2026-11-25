// ============================================================
//  RUTa al Éxito — Base 3D: ruido, texturas procedurales,
//  materiales PBR y modelos (personas, árboles, autos, mobiliario)
// ============================================================

const M3 = (() => {
  let renderer = null;
  const M = {};

  M.setRenderer = r => { renderer = r; };

  // ----------------------------------------------------------
  //  Ruido
  // ----------------------------------------------------------
  function hash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function ruido(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = t => t * t * (3 - 2 * t);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * ruido(x * f, y * f); amp *= 0.5; f *= 2; }
    return v;
  }
  M.ruido = ruido; M.fbm = fbm;

  let semilla = 12345;
  M.rnd = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  M.elegir = lista => lista[Math.floor(Math.random() * lista.length)];

  // ----------------------------------------------------------
  //  Texturas procedurales (canvas)
  // ----------------------------------------------------------
  function crearTextura(tam, dibujar, srgb = true) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const x = c.getContext('2d');
    dibujar(x, tam);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  // Aplica ruido por píxel a lo ya dibujado
  function granulado(x, tam, fuerza, escala = 0.05, oct = 4) {
    const img = x.getImageData(0, 0, tam, tam);
    const d = img.data;
    for (let j = 0; j < tam; j++) {
      for (let i = 0; i < tam; i++) {
        const n = (fbm(i * escala, j * escala, oct) - 0.5) * fuerza + (Math.random() - 0.5) * fuerza * 0.35;
        const k = (j * tam + i) * 4;
        d[k] = Math.max(0, Math.min(255, d[k] + n));
        d[k + 1] = Math.max(0, Math.min(255, d[k + 1] + n));
        d[k + 2] = Math.max(0, Math.min(255, d[k + 2] + n));
      }
    }
    x.putImageData(img, 0, 0);
  }

  const T = {};
  const fabricas = {
    pasto: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#5f8a3a'; x.fillRect(0, 0, n, n);
      granulado(x, n, 55, 0.04);
      for (let i = 0; i < 2500; i++) {
        x.fillStyle = `rgba(${40 + Math.random() * 60},${90 + Math.random() * 70},${20 + Math.random() * 30},0.5)`;
        x.fillRect(Math.random() * n, Math.random() * n, 1, 2 + Math.random() * 2);
      }
    }),
    adoquin: () => crearTextura(512, (x, n) => {
      x.fillStyle = '#6b6358'; x.fillRect(0, 0, n, n);
      const alto = 32;
      for (let fila = 0; fila < n / alto; fila++) {
        const desfase = (fila % 2) * 24;
        for (let col = -1; col < n / 48 + 1; col++) {
          const tono = 150 + Math.random() * 45;
          const cal = Math.random() * 18;
          x.fillStyle = `rgb(${tono + cal},${tono + cal * 0.7 - 4},${tono - 12})`;
          const px = col * 48 + desfase + 2, py = fila * alto + 2;
          x.beginPath();
          if (x.roundRect) x.roundRect(px, py, 44, alto - 4, 5); else x.rect(px, py, 44, alto - 4);
          x.fill();
        }
      }
      granulado(x, n, 30, 0.08, 3);
    }),
    vereda: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#b9b6ae'; x.fillRect(0, 0, n, n);
      granulado(x, n, 28, 0.06);
      x.strokeStyle = 'rgba(60,60,60,0.45)'; x.lineWidth = 2;
      for (let i = 0; i <= n; i += 128) {
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i, n); x.stroke();
        x.beginPath(); x.moveTo(0, i); x.lineTo(n, i); x.stroke();
      }
    }),
    asfalto: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#45474a'; x.fillRect(0, 0, n, n);
      granulado(x, n, 40, 0.09);
      for (let i = 0; i < 1500; i++) {
        const g = 80 + Math.random() * 60;
        x.fillStyle = `rgba(${g},${g},${g},0.6)`;
        x.fillRect(Math.random() * n, Math.random() * n, 1, 1);
      }
    }),
    estuco: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#eeeeee'; x.fillRect(0, 0, n, n);
      granulado(x, n, 22, 0.07);
    }),
    ladrillo: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#c9bfae'; x.fillRect(0, 0, n, n);
      const h = 16, w = 48;
      for (let f = 0; f < n / h; f++) {
        for (let c = -1; c < n / w + 1; c++) {
          const r = 150 + Math.random() * 50;
          x.fillStyle = `rgb(${r},${r * 0.45},${r * 0.32})`;
          x.fillRect(c * w + (f % 2) * (w / 2) + 1.5, f * h + 1.5, w - 3, h - 3);
        }
      }
      granulado(x, n, 25, 0.1, 3);
    }),
    teja: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#7a2f1d'; x.fillRect(0, 0, n, n);
      const h = 32, w = 32;
      for (let f = 0; f < n / h; f++) {
        for (let c = -1; c < n / w + 1; c++) {
          const r = 160 + Math.random() * 40;
          const grad = x.createLinearGradient(0, f * h, 0, f * h + h);
          grad.addColorStop(0, `rgb(${r},${r * 0.42},${r * 0.28})`);
          grad.addColorStop(1, `rgb(${r * 0.6},${r * 0.25},${r * 0.17})`);
          x.fillStyle = grad;
          x.beginPath();
          x.ellipse(c * w + (f % 2) * 16 + 16, f * h + 6, 15, h - 4, 0, 0, Math.PI);
          x.fill();
        }
      }
      granulado(x, n, 18, 0.1, 3);
    }),
    tierra: () => crearTextura(256, (x, n) => {
      x.fillStyle = '#8a7355'; x.fillRect(0, 0, n, n);
      granulado(x, n, 60, 0.05);
      for (let i = 0; i < 400; i++) {
        x.fillStyle = `rgba(${90 + Math.random() * 60},${110 + Math.random() * 50},50,0.5)`;
        x.fillRect(Math.random() * n, Math.random() * n, 2, 3);
      }
    }),
    baldosa: () => crearTextura(512, (x, n) => {
      x.fillStyle = '#d9d3c7'; x.fillRect(0, 0, n, n);
      for (let i = 0; i < 4000; i++) {
        const g = 120 + Math.random() * 120;
        x.fillStyle = `rgba(${g},${g * 0.95},${g * 0.9},0.55)`;
        x.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      granulado(x, n, 12, 0.05, 3);
      x.strokeStyle = 'rgba(120,110,100,0.7)'; x.lineWidth = 3;
      for (let i = 0; i <= n; i += 128) {
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i, n); x.stroke();
        x.beginPath(); x.moveTo(0, i); x.lineTo(n, i); x.stroke();
      }
    }),
    madera: () => crearTextura(256, (x, n) => {
      for (let p = 0; p < 8; p++) {
        const b = 110 + Math.random() * 40;
        x.fillStyle = `rgb(${b},${b * 0.66},${b * 0.42})`;
        x.fillRect(0, p * 32, n, 32);
        for (let l = 0; l < 14; l++) {
          x.strokeStyle = `rgba(60,35,20,${0.08 + Math.random() * 0.15})`;
          x.beginPath();
          const y0 = p * 32 + Math.random() * 32;
          x.moveTo(0, y0);
          for (let i = 0; i <= n; i += 32) x.lineTo(i, y0 + Math.sin(i * 0.03 + l) * 2);
          x.stroke();
        }
        x.fillStyle = 'rgba(40,25,15,0.6)'; x.fillRect(0, p * 32, n, 1.5);
      }
    }),
    metalCorrugado: () => crearTextura(128, (x, n) => {
      for (let i = 0; i < n; i++) {
        const v = 150 + Math.sin(i / n * Math.PI * 16) * 45;
        x.fillStyle = `rgb(${v},${v + 4},${v + 8})`;
        x.fillRect(i, 0, 1, n);
      }
      granulado(x, n, 10, 0.2, 2);
    }),
  };
  M.tex = nombre => (T[nombre] = T[nombre] || fabricas[nombre]());
  M.texRep = (nombre, rx, ry) => {
    const t = M.tex(nombre).clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
    return t;
  };

  // Fachada de edificio de fondo: muro + grilla de ventanas (y mapa de luces nocturnas)
  M.texFachada = (colorMuro, semillaLuz) => {
    const tam = 128;
    const dib = (x, n, noche) => {
      x.fillStyle = noche ? '#000' : colorMuro; x.fillRect(0, 0, n, n);
      if (!noche) granulado(x, n, 15, 0.1, 2);
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
          const encendida = hash(i + semillaLuz * 7, j + semillaLuz * 13) > 0.45;
          if (noche) x.fillStyle = encendida ? '#ffcf8a' : '#000';
          else {
            const g = x.createLinearGradient(0, j * 64 + 14, 0, j * 64 + 50);
            g.addColorStop(0, '#5d7486'); g.addColorStop(1, '#2c3a46');
            x.fillStyle = g;
          }
          x.fillRect(i * 64 + 16, j * 64 + 14, 32, 36);
          if (!noche) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(i * 64 + 14, j * 64 + 50, 36, 3); }
        }
      }
    };
    const map = crearTextura(tam, (x, n) => dib(x, n, false));
    const luz = crearTextura(tam, (x, n) => dib(x, n, true));
    return { map, luz };
  };

  // ----------------------------------------------------------
  //  Materiales
  // ----------------------------------------------------------
  const cacheMat = {};
  function color(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  M.color = color;

  // Material estándar cacheado. opts: map, roughness, metalness, emissive...
  M.std = (hex, opts = {}) => {
    const clave = hex + '|' + Object.entries(opts).map(([k, v]) => k + ':' + (v && v.uuid ? v.uuid : v)).join(',');
    if (cacheMat[clave]) return cacheMat[clave];
    const o = Object.assign({ roughness: 0.85, metalness: 0, envMapIntensity: 0.7 }, opts);
    if (o.emissive !== undefined && typeof o.emissive === 'number') o.emissive = color(o.emissive);
    const m = new THREE.MeshStandardMaterial(o);
    m.color = color(hex);
    return (cacheMat[clave] = m);
  };

  // Materiales compartidos que cambian con la hora (ventanas y faroles de noche)
  M.vidrio = new THREE.MeshStandardMaterial({ color: color(0x6f8ea3), metalness: 0.9, roughness: 0.06, envMapIntensity: 1.3, emissive: color(0xffc477), emissiveIntensity: 0 });
  M.vidrioClaro = new THREE.MeshStandardMaterial({ color: color(0xbfd8e6), metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.5 });
  M.luzFarol = new THREE.MeshStandardMaterial({ color: color(0xfff2cc), emissive: color(0xffd27a), emissiveIntensity: 0.2, roughness: 0.3 });
  M.fachadasNoche = []; // materiales de edificios de fondo para encender sus luces

  // ----------------------------------------------------------
  //  Primitivas
  // ----------------------------------------------------------
  function aMat(m) { return typeof m === 'number' ? M.std(m) : m; }
  M.caja = (w, h, d, m, x = 0, y = 0, z = 0, sombra = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), aMat(m));
    mesh.position.set(x, y, z);
    mesh.castShadow = sombra; mesh.receiveShadow = true;
    return mesh;
  };
  M.cil = (rt, rb, h, m, seg = 16, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), aMat(m));
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  };
  M.esfera = (r, m, x = 0, y = 0, z = 0, seg = 16) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), aMat(m));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  };
  M.plano = (w, h, m, sombra = false) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), aMat(m));
    mesh.receiveShadow = true; mesh.castShadow = sombra;
    return mesh;
  };

  // ----------------------------------------------------------
  //  Letreros y etiquetas (texto en canvas)
  // ----------------------------------------------------------
  M.texturaTexto = (texto, { ancho = 1024, alto = 160, fondo = '#0b3d91', colorTexto = '#ffffff', fuente = 'bold', sub = '', borde = null } = {}) => {
    const c = document.createElement('canvas');
    c.width = ancho; c.height = alto;
    const x = c.getContext('2d');
    if (fondo) { x.fillStyle = fondo; x.fillRect(0, 0, ancho, alto); }
    if (borde) { x.strokeStyle = borde; x.lineWidth = alto * 0.06; x.strokeRect(0, 0, ancho, alto); }
    x.fillStyle = colorTexto; x.textAlign = 'center'; x.textBaseline = 'middle';
    let size = alto * (sub ? 0.42 : 0.55);
    const fam = 'system-ui, "Segoe UI", Roboto, sans-serif';
    x.font = `${fuente} ${size}px ${fam}`;
    while (x.measureText(texto).width > ancho * 0.92 && size > 10) { size -= 2; x.font = `${fuente} ${size}px ${fam}`; }
    x.fillText(texto, ancho / 2, sub ? alto * 0.38 : alto / 2);
    if (sub) {
      x.globalAlpha = 0.85;
      x.font = `${alto * 0.22}px ${fam}`;
      x.fillText(sub, ancho / 2, alto * 0.76);
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  M.letrero = (texto, w, h, opts = {}) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: M.texturaTexto(texto, Object.assign({ ancho: Math.round(160 * w / h), alto: 160 }, opts)), roughness: 0.5, emissive: color(0xffffff), emissiveIntensity: 0, emissiveMap: null }));
    mesh.material.emissiveMap = mesh.material.map;
    if (opts.ilumina) M.letrerosNoche.push(mesh.material);
    return mesh;
  };
  M.letrerosNoche = [];

  M.texturaEtiqueta = (titulo, sub) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 140;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(15,22,40,0.72)';
    const r = 26;
    x.beginPath();
    x.moveTo(r, 0); x.arcTo(512, 0, 512, 140, r); x.arcTo(512, 140, 0, 140, r);
    x.arcTo(0, 140, 0, 0, r); x.arcTo(0, 0, 512, 0, r); x.closePath(); x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#fff';
    let size = 44;
    x.font = `600 ${size}px system-ui, sans-serif`;
    while (x.measureText(titulo).width > 480 && size > 20) { size -= 2; x.font = `600 ${size}px system-ui, sans-serif`; }
    x.fillText(titulo, 256, sub ? 52 : 70);
    if (sub) { x.fillStyle = '#ffd666'; x.font = '28px system-ui, sans-serif'; x.fillText(sub, 256, 104); }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  };
  M.texturaMarcador = (simbolo, fondo) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = fondo;
    x.beginPath(); x.arc(64, 64, 56, 0, Math.PI * 2); x.fill();
    x.lineWidth = 7; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = '#fff'; x.font = 'bold 76px system-ui, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(simbolo, 64, 68);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  };
  M.sprite = (textura, w, h) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, transparent: true, depthWrite: false }));
    s.scale.set(w, h, 1);
    return s;
  };

  // ----------------------------------------------------------
  //  Personas (proporciones humanas, ~1,75 m)
  // ----------------------------------------------------------
  const PIELES = [0xf3d0b0, 0xe8b48c, 0xc98e63, 0x9c6844, 0x6e4a33];
  const PELOS = [0x1d1612, 0x3b2a1e, 0x5b3b25, 0x8a6a45, 0xb9a48a, 0x2a2a2a, 0xd8d0c4];
  const ROPA = [0x2f4f7f, 0x8c2f39, 0x3f6b4a, 0xd8cfc0, 0x4a4a52, 0xc98a2e, 0x6c4f8a, 0xf2f2f2, 0x1f2933, 0x9bb7d4];
  const PANTALON = [0x26324a, 0x2b2b2b, 0x4b3b2f, 0x55606e, 0x1c2a3d, 0x6b6257];

  // Extremidad con pivote en la articulación superior
  function extremidad(rArriba, rAbajo, largo, mat) {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rArriba, rAbajo, largo, 10), mat);
    m.position.y = -largo / 2; m.castShadow = true;
    piv.add(m);
    return piv;
  }

  M.persona = (o = {}) => {
    const piel = M.std(o.piel ?? M.elegir(PIELES), { roughness: 0.7 });
    const ropa = M.std(o.ropa ?? M.elegir(ROPA), { roughness: 0.9 });
    const pant = M.std(o.pantalon ?? M.elegir(PANTALON), { roughness: 0.9 });
    const pelo = M.std(o.pelo ?? M.elegir(PELOS), { roughness: 0.75 });
    const zap = M.std(o.zapato ?? 0x1a1a1a, { roughness: 0.6 });
    const largo = o.pelolargo ?? Math.random() < 0.45;
    const g = new THREE.Group();
    const cuerpo = new THREE.Group();   // se mueve al respirar/caminar
    g.add(cuerpo);

    // Piernas
    const piernas = [-0.1, 0.1].map(x => {
      const muslo = extremidad(0.085, 0.065, 0.46, pant);
      muslo.position.set(x, 0.92, 0);
      const rodilla = extremidad(0.065, 0.05, 0.42, pant);
      rodilla.position.y = -0.46;
      muslo.add(rodilla);
      const zapato = M.caja(0.1, 0.08, 0.24, zap, 0, -0.44, 0.04);
      rodilla.add(zapato);
      cuerpo.add(muslo);
      return { muslo, rodilla };
    });
    // Cadera y torso
    const cadera = M.caja(0.3, 0.16, 0.18, pant, 0, 0.96, 0);
    cuerpo.add(cadera);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.56, 14), ropa);
    torso.scale.z = 0.62; torso.position.y = 1.31; torso.castShadow = true;
    cuerpo.add(torso);
    const hombros = M.esfera(0.1, ropa, 0, 1.55, 0, 10);
    hombros.scale.set(2.1, 0.7, 1.1);
    cuerpo.add(hombros);
    // Brazos
    const brazos = [-0.24, 0.24].map(x => {
      const hombro = extremidad(0.055, 0.045, 0.32, ropa);
      hombro.position.set(x, 1.55, 0);
      const codo = extremidad(0.042, 0.036, 0.28, piel);
      codo.position.y = -0.32;
      hombro.add(codo);
      const mano = M.esfera(0.045, piel, 0, -0.3, 0, 8);
      codo.add(mano);
      cuerpo.add(hombro);
      return { hombro, codo };
    });
    // Cuello y cabeza
    cuerpo.add(M.cil(0.045, 0.05, 0.1, piel, 8, 0, 1.64, 0));
    const cabeza = new THREE.Group();
    cabeza.position.y = 1.79;
    const craneo = M.esfera(0.105, piel, 0, 0, 0, 20);
    craneo.scale.set(1, 1.18, 1.08);
    cabeza.add(craneo);
    const nariz = M.esfera(0.018, piel, 0, -0.01, 0.11, 6);
    cabeza.add(nariz);
    for (const x of [-0.035, 0.035]) cabeza.add(M.esfera(0.012, 0x1a1a1a, x, 0.025, 0.098, 6));
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 12, 0, Math.PI * 2, 0, largo ? 1.9 : 1.45), pelo);
    casco.scale.set(1, 1.15, 1.1); casco.position.set(0, 0.012, -0.008); casco.rotation.x = -0.25;
    casco.castShadow = true;
    cabeza.add(casco);
    if (largo) {
      const melena = M.caja(0.2, 0.26, 0.08, pelo, 0, -0.1, -0.08);
      cabeza.add(melena);
    }
    cuerpo.add(cabeza);

    g.userData = { piernas, brazos, cuerpo, cabeza, fase: Math.random() * 10 };
    if (o.escala) g.scale.setScalar(o.escala);
    return g;
  };

  // vel: 0 = quieto, 1 = caminando
  M.animarPersona = (p, vel, t) => {
    const u = p.userData;
    if (u.sentado) return;
    const f = t * 8.5 + u.fase;
    const a = Math.sin(f) * 0.55 * vel;
    u.piernas[0].muslo.rotation.x = a;
    u.piernas[1].muslo.rotation.x = -a;
    u.piernas[0].rodilla.rotation.x = Math.max(0, -Math.sin(f + 1)) * 0.8 * vel;
    u.piernas[1].rodilla.rotation.x = Math.max(0, Math.sin(f + 1)) * 0.8 * vel;
    u.brazos[0].hombro.rotation.x = -a * 0.7;
    u.brazos[1].hombro.rotation.x = a * 0.7;
    u.brazos[0].codo.rotation.x = -0.25 - Math.abs(a) * 0.3;
    u.brazos[1].codo.rotation.x = -0.25 - Math.abs(a) * 0.3;
    u.cuerpo.position.y = Math.abs(Math.cos(f)) * 0.035 * vel + Math.sin(t * 1.7 + u.fase) * 0.004;
    u.brazos[0].hombro.rotation.z = -0.06; u.brazos[1].hombro.rotation.z = 0.06;
  };

  M.sentar = p => {
    const u = p.userData;
    u.sentado = true;
    for (const pi of u.piernas) { pi.muslo.rotation.x = -Math.PI / 2; pi.rodilla.rotation.x = Math.PI / 2; }
    u.cuerpo.position.y = -0.46;
    for (const b of u.brazos) { b.hombro.rotation.x = -0.5; b.codo.rotation.x = -0.9; }
  };

  // ----------------------------------------------------------
  //  Árboles (copa de esferas deformadas con ruido)
  // ----------------------------------------------------------
  const copas = [];
  function geoCopa(i) {
    if (copas[i]) return copas[i];
    const geo = new THREE.SphereGeometry(1, 14, 10);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const n = 0.75 + fbm(x * 1.7 + i * 5, y * 1.7 + z * 1.3 + i * 3, 3) * 0.6;
      p.setXYZ(k, x * n, y * n * 0.85, z * n);
    }
    geo.computeVertexNormals();
    geo.userData.compartida = true;
    return (copas[i] = geo);
  }
  const VERDES = [0x3f6b2a, 0x4c7a30, 0x35602a, 0x587f35, 0x2f5524];
  M.arbol = (escala = 1, tipo = 'frondoso') => {
    const g = new THREE.Group();
    const corteza = M.std(0x5a4636, { roughness: 1 });
    const alto = 2.6 * escala;
    const tronco = M.cil(0.12 * escala, 0.22 * escala, alto, corteza, 8, 0, alto / 2, 0);
    tronco.rotation.z = (Math.random() - 0.5) * 0.08;
    g.add(tronco);
    if (tipo === 'palmera') {
      tronco.scale.y = 2.2; tronco.position.y = alto * 1.1;
      const hoja = M.std(0x4d7a2a, { roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const h = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * escala, 2.6 * escala), hoja);
        h.geometry.translate(0, 1.3 * escala, 0);
        h.position.y = alto * 2.2;
        h.rotation.set(1.1 + Math.random() * 0.3, i / 9 * Math.PI * 2, 0, 'YXZ');
        h.castShadow = true;
        g.add(h);
      }
      return g;
    }
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geoCopa(i % 5), M.std(M.elegir(VERDES), { roughness: 0.95 }));
      const a = i / n * Math.PI * 2, rr = i === 0 ? 0 : 0.9 * escala;
      const s = (1.3 + Math.random() * 0.5) * escala;
      m.scale.setScalar(s);
      m.position.set(Math.cos(a) * rr, alto + 0.9 * escala + (i === 0 ? 0.7 * escala : Math.random() * 0.6 * escala), Math.sin(a) * rr);
      m.rotation.y = Math.random() * 6;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };

  // ----------------------------------------------------------
  //  Vehículos (silueta extruida)
  // ----------------------------------------------------------
  function perfil(puntos) {
    const s = new THREE.Shape();
    puntos.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
    return s;
  }
  const geoAuto = {};
  function geometriasAuto() {
    if (geoAuto.cuerpo) return geoAuto;
    const cuerpo = new THREE.ExtrudeGeometry(perfil([
      [-2.15, 0.32], [2.15, 0.32], [2.22, 0.6], [2.1, 0.86], [0.95, 0.98], [0.25, 1.42], [-1.05, 1.44], [-1.75, 1.0], [-2.2, 0.92], [-2.25, 0.55],
    ]), { depth: 1.62, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3 });
    cuerpo.translate(0, 0, -0.81);
    const vidrios = new THREE.ExtrudeGeometry(perfil([[0.88, 1.0], [0.24, 1.38], [-1.02, 1.4], [-1.68, 1.02]]), { depth: 1.8, bevelEnabled: false });
    vidrios.translate(0, 0, -0.9);
    geoAuto.cuerpo = cuerpo; geoAuto.vidrios = vidrios;
    geoAuto.rueda = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
    geoAuto.llanta = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12);
    Object.values(geoAuto).forEach(g => { g.userData.compartida = true; });
    return geoAuto;
  }
  M.auto = colorHex => {
    const ga = geometriasAuto();
    const g = new THREE.Group();
    const pintura = M.std(colorHex, { roughness: 0.28, metalness: 0.55, envMapIntensity: 1.2 });
    const c = new THREE.Mesh(ga.cuerpo, pintura); c.castShadow = true; c.receiveShadow = true;
    const v = new THREE.Mesh(ga.vidrios, M.vidrio);
    g.add(c, v);
    const caucho = M.std(0x161616, { roughness: 0.9 }), aro = M.std(0xb8bcc2, { metalness: 0.9, roughness: 0.3 });
    for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]]) {
      const r = new THREE.Mesh(ga.rueda, caucho); r.rotation.x = Math.PI / 2; r.position.set(x, 0.34, z); r.castShadow = true;
      const l = new THREE.Mesh(ga.llanta, aro); l.rotation.x = Math.PI / 2; l.position.set(x, 0.34, z);
      g.add(r, l);
    }
    for (const z of [0.55, -0.55]) {
      g.add(M.caja(0.06, 0.12, 0.3, M.std(0xffffff, { emissive: 0xfff1c8, emissiveIntensity: 0.6 }), 2.24, 0.68, z, false));
      g.add(M.caja(0.06, 0.12, 0.3, M.std(0xaa1111, { emissive: 0xff2200, emissiveIntensity: 0.5 }), -2.27, 0.75, z, false));
    }
    return g;
  };

  M.camion = colorHex => {
    const g = new THREE.Group();
    const pintura = M.std(colorHex, { roughness: 0.35, metalness: 0.4 });
    const caja = new THREE.Mesh(new THREE.ExtrudeGeometry(perfil([[-2.6, 0.45], [2.9, 0.45], [2.95, 1.4], [2.4, 2.0], [1.6, 2.05], [1.5, 3.0], [-2.6, 3.0]]),
      { depth: 2.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }), pintura);
    caja.geometry.translate(0, 0, -1.1); caja.castShadow = true; caja.receiveShadow = true;
    g.add(caja);
    const parabrisas = new THREE.Mesh(new THREE.ExtrudeGeometry(perfil([[2.42, 1.45], [2.38, 1.95], [1.65, 1.98], [1.65, 1.45]]), { depth: 2.32, bevelEnabled: false }), M.vidrio);
    parabrisas.geometry.translate(0, 0, -1.16);
    g.add(parabrisas);
    // Ventana de atención y toldo
    g.add(M.caja(2.6, 1.0, 0.05, M.std(0x2b2b2b), -0.6, 1.95, 1.17, false));
    g.add(M.caja(2.8, 0.08, 0.5, M.std(0xdddddd, { metalness: 0.8, roughness: 0.3 }), -0.6, 1.4, 1.38));
    const toldo = M.caja(3, 0.06, 1.1, M.std(0xffffff), -0.6, 2.7, 1.6);
    toldo.rotation.x = 0.25;
    g.add(toldo);
    const caucho = M.std(0x161616, { roughness: 0.9 });
    for (const [x, z] of [[1.9, 1.05], [1.9, -1.05], [-1.7, 1.05], [-1.7, -1.05]]) {
      const r = M.cil(0.45, 0.45, 0.3, caucho, 18, x, 0.45, z); r.rotation.x = Math.PI / 2;
      g.add(r);
    }
    return g;
  };

  // ----------------------------------------------------------
  //  Mobiliario urbano e interior
  // ----------------------------------------------------------
  M.banca = () => {
    const g = new THREE.Group();
    const madera = M.std(0x8a5a35, { map: M.tex('madera'), roughness: 0.8 });
    const fierro = M.std(0x1f2a24, { roughness: 0.5, metalness: 0.7 });
    for (let i = 0; i < 3; i++) g.add(M.caja(1.8, 0.04, 0.12, madera, 0, 0.46, -0.16 + i * 0.15));
    for (let i = 0; i < 2; i++) {
      const r = M.caja(1.8, 0.12, 0.035, madera, 0, 0.62 + i * 0.17, -0.27);
      r.rotation.x = -0.15; g.add(r);
    }
    for (const x of [-0.75, 0.75]) {
      g.add(M.caja(0.05, 0.46, 0.45, fierro, x, 0.23, -0.05));
      g.add(M.caja(0.05, 0.45, 0.05, fierro, x, 0.68, -0.28));
    }
    return g;
  };

  M.farol = () => {
    const g = new THREE.Group();
    const fierro = M.std(0x1d2b23, { roughness: 0.45, metalness: 0.7 });
    g.add(M.cil(0.14, 0.2, 0.5, fierro, 10, 0, 0.25, 0));
    g.add(M.cil(0.06, 0.08, 3.6, fierro, 10, 0, 2.1, 0));
    g.add(M.cil(0.22, 0.12, 0.15, fierro, 10, 0, 3.95, 0));
    const vidrio = M.cil(0.16, 0.2, 0.45, M.luzFarol, 10, 0, 4.25, 0);
    vidrio.castShadow = false;
    g.add(vidrio);
    g.add(M.cil(0.02, 0.26, 0.18, fierro, 10, 0, 4.55, 0));
    return g;
  };

  M.silla = colorHex => {
    const g = new THREE.Group();
    const plastico = M.std(colorHex, { roughness: 0.5 });
    const fierro = M.std(0x9aa0a6, { metalness: 0.8, roughness: 0.35 });
    g.add(M.caja(0.46, 0.04, 0.44, plastico, 0, 0.46, 0));
    const resp = M.caja(0.46, 0.42, 0.04, plastico, 0, 0.7, -0.21);
    resp.rotation.x = -0.1; g.add(resp);
    for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) g.add(M.cil(0.015, 0.015, 0.46, fierro, 6, x, 0.23, z));
    return g;
  };

  M.planta = () => {
    const g = new THREE.Group();
    g.add(M.cil(0.22, 0.16, 0.42, M.std(0xb5652e, { roughness: 0.9 }), 14, 0, 0.21, 0));
    const hojas = M.std(0x3f7d34, { roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.7), hojas);
      h.geometry.translate(0, 0.35, 0);
      h.position.y = 0.4;
      h.rotation.set(0.35 + Math.random() * 0.4, i / 10 * Math.PI * 2, 0, 'YXZ');
      g.add(h);
    }
    return g;
  };

  M.computador = () => {
    const g = new THREE.Group();
    const negro = M.std(0x1b1d21, { roughness: 0.4 });
    g.add(M.caja(0.2, 0.02, 0.15, negro, 0, 0.01, 0));
    g.add(M.caja(0.04, 0.3, 0.04, negro, 0, 0.16, -0.03));
    g.add(M.caja(0.56, 0.34, 0.03, negro, 0, 0.42, 0));
    const pantalla = M.caja(0.52, 0.3, 0.01, M.std(0x9fc4e8, { emissive: 0x5d8fc4, emissiveIntensity: 0.9 }), 0, 0.42, 0.018, false);
    g.add(pantalla);
    g.add(M.caja(0.45, 0.02, 0.15, M.std(0x2c2f35), 0, 0.01, 0.25));
    return g;
  };

  return M;
})();
