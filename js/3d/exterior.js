// ============================================================
//  RUTa al Éxito — Exterior: plaza, edificios, ciudad, cordillera,
//  cielo y ciclo de día/noche
// ============================================================

(() => {
  const M = M3;
  M.R_EDIF = 29;
  M.R_PLAZA = 23.5;

  // ----------------------------------------------------------
  //  Cielo
  // ----------------------------------------------------------
  function crearCielo(radio) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        arriba: { value: new THREE.Color(0x3a74c4) },
        horizonte: { value: new THREE.Color(0xd4e6f2) },
        dirSol: { value: new THREE.Vector3(0, 1, 0) },
        colorSol: { value: new THREE.Color(1, 0.95, 0.8) },
      },
      vertexShader: `varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 arriba; uniform vec3 horizonte; uniform vec3 dirSol; uniform vec3 colorSol; varying vec3 vDir;
        void main() {
          float h = max(vDir.y, 0.0);
          vec3 c = mix(horizonte, arriba, pow(h, 0.5));
          float s = max(dot(vDir, normalize(dirSol)), 0.0);
          c += colorSol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.18 + pow(s, 3.0) * 0.06 * (1.0 - h));
          if (vDir.y < 0.0) c = horizonte * 0.85;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radio, 32, 16), mat);
  }

  function crearEstrellas() {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.45 + 0.08;
      const r = 480;
      pos[i * 3] = Math.cos(u) * Math.cos(v) * r;
      pos[i * 3 + 1] = Math.sin(v) * r;
      pos[i * 3 + 2] = Math.sin(u) * Math.cos(v) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  }

  // Momentos del día: [hora, cielo arriba, horizonte, color sol, intensidad sol, ambiente, noche(0-1)]
  const MOMENTOS = [
    [0, 0x050a18, 0x111a2e, 0x9fb4ff, 0.12, 0.18, 1],
    [5.5, 0x0b1430, 0x2a3350, 0x9fb4ff, 0.12, 0.2, 1],
    [6.6, 0x2b4a7f, 0xf0a36b, 0xff9a52, 0.9, 0.35, 0.55],
    [7.6, 0x3f74b8, 0xf3d0a8, 0xffd2a0, 1.8, 0.5, 0.1],
    [9, 0x3a74c4, 0xd4e6f2, 0xfff1dd, 2.6, 0.6, 0],
    [13, 0x2f6fc4, 0xcfe3f3, 0xffffff, 3.0, 0.65, 0],
    [17.5, 0x3a72bd, 0xe3dccb, 0xffe2b8, 2.5, 0.58, 0],
    [19.6, 0x31528c, 0xf2a46d, 0xff8a45, 1.2, 0.42, 0.2],
    [20.6, 0x18264a, 0x7a5568, 0xd06a4a, 0.4, 0.28, 0.7],
    [21.5, 0x070d1f, 0x1a2238, 0x9fb4ff, 0.12, 0.18, 1],
    [24, 0x050a18, 0x111a2e, 0x9fb4ff, 0.12, 0.18, 1],
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function mezclar(hexA, hexB, t, destino) {
    cA.setHex(hexA); cB.setHex(hexB);
    return destino.copy(cA).lerp(cB, t);
  }
  M.estadoCielo = h => {
    h = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < MOMENTOS.length - 2 && MOMENTOS[i + 1][0] <= h) i++;
    const a = MOMENTOS[i], b = MOMENTOS[i + 1];
    const t = (h - a[0]) / (b[0] - a[0]);
    return {
      arriba: mezclar(a[1], b[1], t, new THREE.Color()),
      horizonte: mezclar(a[2], b[2], t, new THREE.Color()),
      colorSol: mezclar(a[3], b[3], t, new THREE.Color()),
      intSol: a[4] + (b[4] - a[4]) * t,
      ambiente: a[5] + (b[5] - a[5]) * t,
      noche: a[6] + (b[6] - a[6]) * t,
    };
  };

  // ----------------------------------------------------------
  //  Cordillera y cerros
  // ----------------------------------------------------------
  function sierra({ largo, alto, dist, angulo, nieve, semilla, tonos }) {
    const segX = 160, segY = 26;
    const geo = new THREE.PlaneGeometry(largo, 1, segX, segY);
    const pos = geo.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), v = pos.getY(k) + 0.5; // 0 abajo, 1 arriba
      const u = x / largo;
      const perfil = 0.45 + M.fbm(u * 6 + semilla, semilla * 0.7, 5) * 0.9 - Math.pow(Math.abs(u) * 1.6, 3) * 0.6;
      const cima = alto * Math.max(0.08, perfil);
      const y = v * cima * (1 + (M.fbm(u * 20 + semilla, v * 4, 3) - 0.5) * 0.25 * v);
      const z = (M.fbm(u * 14, v * 3 + semilla, 3) - 0.5) * 30 * v - v * 25;
      pos.setXYZ(k, x, y, z);
      const lineaNieve = alto * (nieve + (M.fbm(u * 30, semilla, 2) - 0.5) * 0.2);
      if (nieve < 1 && y > lineaNieve) c.setRGB(0.93, 0.95, 0.98);
      else {
        const t = Math.min(1, y / (alto * 0.8));
        c.setHex(tonos[0]).lerp(cB.setHex(tonos[1]), t);
        c.multiplyScalar(0.85 + M.fbm(u * 40, v * 10, 2) * 0.3);
      }
      c.convertSRGBToLinear();
      colores[k * 3] = c.r; colores[k * 3 + 1] = c.g; colores[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    m.position.set(Math.cos(angulo) * dist, -2, Math.sin(angulo) * dist);
    m.rotation.y = -angulo - Math.PI / 2;
    return m;
  }

  // ----------------------------------------------------------
  //  Bandera de Chile
  // ----------------------------------------------------------
  function texturaBandera() {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 300, 100);
    x.fillStyle = '#d52b1e'; x.fillRect(0, 100, 300, 100);
    x.fillStyle = '#0039a6'; x.fillRect(0, 0, 100, 100);
    x.fillStyle = '#ffffff';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 13 : 32, a = -Math.PI / 2 + i * Math.PI / 5;
      x.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r);
    }
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function crearBandera(ancho = 2.4) {
    const geo = new THREE.PlaneGeometry(ancho, ancho * 2 / 3, 16, 8);
    geo.translate(ancho / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texturaBandera(), side: THREE.DoubleSide, roughness: 0.9 }));
    m.castShadow = true;
    m.userData.base = Float32Array.from(geo.attributes.position.array);
    return m;
  }
  M.ondearBandera = (m, t) => {
    const p = m.geometry.attributes.position, b = m.userData.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      p.setZ(i, Math.sin(x * 2.6 - t * 4 + y * 0.8) * 0.12 * x);
    }
    p.needsUpdate = true;
    m.geometry.computeVertexNormals();
  };

  // ----------------------------------------------------------
  //  Mundo exterior
  // ----------------------------------------------------------
  M.crearExterior = scene => {
    const R = {};
    const obstaculos = [{ x: 0, z: 0, r: 4 }];
    R.obstaculos = obstaculos;

    R.cielo = crearCielo(500);
    R.estrellas = crearEstrellas();
    scene.add(R.cielo, R.estrellas);
    scene.fog = new THREE.Fog(0xd4e6f2, 90, 520);

    R.hemi = new THREE.HemisphereLight(0xdfefff, 0x5a5145, 0.6);
    scene.add(R.hemi);
    R.sol = new THREE.DirectionalLight(0xffffff, 2.6);
    R.sol.castShadow = true;
    R.sol.shadow.mapSize.set(2048, 2048);
    Object.assign(R.sol.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 });
    R.sol.shadow.bias = -0.0004;
    R.sol.shadow.normalBias = 0.03;
    scene.add(R.sol, R.sol.target);

    // Suelo: pasto, plaza, veredas y calle
    const suelos = [];
    const pasto = new THREE.Mesh(new THREE.CircleGeometry(600, 64), M.std(0x8fae6a, { map: M.texRep('pasto', 260, 260), roughness: 1 }));
    pasto.rotation.x = -Math.PI / 2; pasto.receiveShadow = true;
    scene.add(pasto); suelos.push(pasto);

    const plaza = new THREE.Mesh(new THREE.CircleGeometry(M.R_PLAZA, 96), M.std(0xffffff, { map: M.texRep('adoquin', 9, 9), roughness: 0.9 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true;
    scene.add(plaza); suelos.push(plaza);
    for (const [r1, r2, col] of [[7.6, 8.1, 0x8c8478], [14.8, 15.3, 0x8c8478]]) {
      const anillo = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 96), M.std(col, { roughness: 0.9 }));
      anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.03; anillo.receiveShadow = true;
      scene.add(anillo);
    }
    // Solera de la plaza
    const solera = new THREE.Mesh(new THREE.TorusGeometry(M.R_PLAZA, 0.12, 6, 96), M.std(0x9d9a92));
    solera.rotation.x = Math.PI / 2; solera.position.y = 0.04;
    scene.add(solera);

    const vereda = new THREE.Mesh(new THREE.RingGeometry(M.R_PLAZA, 34, 96, 1), M.std(0xffffff, { map: M.texRep('vereda', 14, 14), roughness: 0.95 }));
    vereda.rotation.x = -Math.PI / 2; vereda.position.y = 0.015; vereda.receiveShadow = true;
    scene.add(vereda); suelos.push(vereda);
    const calle = new THREE.Mesh(new THREE.RingGeometry(34, 41, 128, 1), M.std(0xffffff, { map: M.texRep('asfalto', 24, 24), roughness: 0.95 }));
    calle.rotation.x = -Math.PI / 2; calle.position.y = 0.02; calle.receiveShadow = true;
    scene.add(calle);
    const veredaExt = new THREE.Mesh(new THREE.RingGeometry(41, 44, 128, 1), M.std(0xffffff, { map: M.texRep('vereda', 18, 18), roughness: 0.95 }));
    veredaExt.rotation.x = -Math.PI / 2; veredaExt.position.y = 0.025; veredaExt.receiveShadow = true;
    scene.add(veredaExt);
    // Líneas de la calle
    const pintura = M.std(0xf2f2f2, { roughness: 0.7 });
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2;
      const l = M.caja(0.18, 0.01, 1.6, pintura, Math.cos(a) * 37.5, 0.03, Math.sin(a) * 37.5, false);
      l.rotation.y = -a; scene.add(l);
    }
    R.suelos = suelos;

    // Pileta
    const piedra = M.std(0xc9c3b6, { map: M.texRep('estuco', 2, 1), roughness: 0.8 });
    const base = M.cil(3.4, 3.6, 0.7, piedra, 32, 0, 0.35, 0);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.2, 10, 48), piedra);
    borde.rotation.x = Math.PI / 2; borde.position.y = 0.72; borde.castShadow = true;
    R.agua = new THREE.Mesh(new THREE.CircleGeometry(3.25, 48), new THREE.MeshStandardMaterial({ color: M.color(0x3f7f95), metalness: 0.3, roughness: 0.05, envMapIntensity: 1.6, transparent: true, opacity: 0.9 }));
    R.agua.rotation.x = -Math.PI / 2; R.agua.position.y = 0.62;
    const pilar = M.cil(0.35, 0.55, 2.2, piedra, 16, 0, 1.5, 0);
    const plato1 = M.cil(1.5, 0.6, 0.35, piedra, 24, 0, 2.5, 0);
    const pilar2 = M.cil(0.18, 0.28, 0.9, piedra, 12, 0, 3.1, 0);
    const plato2 = M.cil(0.75, 0.35, 0.25, piedra, 20, 0, 3.6, 0);
    const remate = M.esfera(0.22, piedra, 0, 3.9, 0);
    scene.add(base, borde, R.agua, pilar, plato1, pilar2, plato2, remate);
    const matChorro = new THREE.MeshStandardMaterial({ color: M.color(0xcfeaf5), transparent: true, opacity: 0.45, roughness: 0.1, envMapIntensity: 1.5 });
    R.chorros = [];
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 1.85, 32, 1, true), matChorro);
    c1.position.y = 1.55; scene.add(c1); R.chorros.push(c1);
    const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 1.0, 24, 1, true), matChorro);
    c2.position.y = 3.0; scene.add(c2); R.chorros.push(c2);

    // Jardineras con árboles grandes
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 13, z = Math.sin(a) * 13;
      const sol = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 8, 40), M.std(0xa9a296));
      sol.rotation.x = Math.PI / 2; sol.position.set(x, 0.2, z); sol.castShadow = true;
      const tierra = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), M.std(0x6f8f4a, { map: M.texRep('pasto', 2, 2) }));
      tierra.rotation.x = -Math.PI / 2; tierra.position.set(x, 0.18, z); tierra.receiveShadow = true;
      const arbol = M.arbol(1.35 + Math.random() * 0.2, i % 2 ? 'frondoso' : 'palmera');
      arbol.position.set(x, 0.18, z);
      scene.add(sol, tierra, arbol);
      obstaculos.push({ x, z, r: 2.9 });
    }
    // Bancas
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      const b = M.banca();
      b.position.set(Math.cos(a) * 9.4, 0, Math.sin(a) * 9.4);
      b.rotation.y = -a - Math.PI / 2;
      scene.add(b);
      obstaculos.push({ x: b.position.x, z: b.position.z, r: 1.0 });
    }
    // Faroles
    R.faroles = [];
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12 * Math.PI * 2;
      const f = M.farol();
      f.position.set(Math.cos(a) * 17, 0, Math.sin(a) * 17);
      scene.add(f);
      obstaculos.push({ x: f.position.x, z: f.position.z, r: 0.35 });
      R.faroles.push(f);
    }
    // Luces reales en algunos faroles (de noche)
    R.lucesNoche = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * 3 + 0.5) / 12 * Math.PI * 2;
      const l = new THREE.PointLight(0xffc47a, 0, 22, 1.6);
      l.position.set(Math.cos(a) * 17, 4.1, Math.sin(a) * 17);
      scene.add(l); R.lucesNoche.push(l);
    }
    // Mástil con bandera en la plaza
    const mastil = M.cil(0.07, 0.1, 9, M.std(0xd9d9d9, { metalness: 0.9, roughness: 0.25 }), 10, 0, 4.5, 21);
    scene.add(mastil);
    R.bandera = crearBandera(2.8);
    R.bandera.position.set(0.07, 8, 21);
    scene.add(R.bandera);
    obstaculos.push({ x: 0, z: 21, r: 0.4 });

    // Árboles de la calle exterior
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2 + 0.04;
      const t = M.arbol(0.9 + Math.random() * 0.4);
      t.position.set(Math.cos(a) * 42.5, 0, Math.sin(a) * 42.5);
      scene.add(t);
    }

    // Ciudad de fondo
    const paleta = ['#d9cbb3', '#c7d3d9', '#e6dcc8', '#b9b0a3', '#d7b8a0', '#cfd6c4', '#e8e4dc', '#a9b3bd'];
    const fachadas = paleta.map((col, i) => M.texFachada(col, i + 1));
    for (let i = 0; i < 70; i++) {
      const a = i / 70 * Math.PI * 2 + (Math.random() - 0.5) * 0.03;
      const r = 50 + Math.random() * 14 + (i % 3) * 8;
      const w = 7 + Math.random() * 7, d = 7 + Math.random() * 6;
      const pisos = 2 + Math.floor(Math.random() * (i % 5 === 0 ? 14 : 6));
      const h = pisos * 3;
      const f = fachadas[i % fachadas.length];
      const map = f.map.clone(); map.needsUpdate = true; map.repeat.set(Math.round(w / 3), pisos / 2);
      const luz = f.luz.clone(); luz.needsUpdate = true; luz.repeat.copy(map.repeat);
      const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: luz, emissive: M.color(0xffffff), emissiveIntensity: 0, roughness: 0.85, envMapIntensity: 0.5 });
      M.fachadasNoche.push(mat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, M.std(0x8a8a8a), M.std(0x8a8a8a), mat, mat]);
      b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      b.rotation.y = -a + Math.PI / 2;
      b.castShadow = true; b.receiveShadow = true;
      scene.add(b);
    }
    // Cordillera de los Andes (al oriente) y cerros alrededor
    scene.add(sierra({ largo: 900, alto: 150, dist: 330, angulo: 0, nieve: 0.62, semilla: 3.1, tonos: [0x6d6157, 0x8f8579] }));
    scene.add(sierra({ largo: 700, alto: 55, dist: 260, angulo: Math.PI, nieve: 2, semilla: 8.4, tonos: [0x6d7a4a, 0x8a7d5e] }));
    scene.add(sierra({ largo: 500, alto: 40, dist: 230, angulo: Math.PI / 2, nieve: 2, semilla: 5.2, tonos: [0x667548, 0x857a5a] }));
    scene.add(sierra({ largo: 500, alto: 45, dist: 240, angulo: -Math.PI / 2, nieve: 2, semilla: 1.7, tonos: [0x6a7449, 0x8b7f5f] }));

    // Autos
    R.autos = [];
    const colores = [0xb3261e, 0x1f4e8c, 0xe8e8e8, 0x2b2b2b, 0x8a8f96, 0x2f6b3f, 0xd9a521, 0x5a2a6e];
    for (let i = 0; i < 8; i++) {
      const auto = M.auto(colores[i]);
      const carril = i % 2;
      auto.userData.mov = { angulo: i / 8 * Math.PI * 2, vel: (carril ? -1 : 1) * (0.11 + Math.random() * 0.04), radio: carril ? 36 : 39 };
      scene.add(auto); R.autos.push(auto);
    }

    // Ajuste según la hora
    const dirSol = new THREE.Vector3();
    R.ajustarHora = (h, foco) => {
      const e = M.estadoCielo(h);
      const u = R.cielo.material.uniforms;
      u.arriba.value.copy(e.arriba); u.horizonte.value.copy(e.horizonte); u.colorSol.value.copy(e.colorSol);
      scene.fog.color.copy(e.horizonte);
      // Sale por la cordillera (oriente, +x) y se pone al poniente; algo al norte (-z)
      const ang = (h - 6.4) / (20.4 - 6.4) * Math.PI;
      if (ang > 0 && ang < Math.PI) dirSol.set(Math.cos(ang), Math.sin(ang) * 0.9, -0.38).normalize();
      else dirSol.set(-0.3, 0.8, 0.4).normalize(); // luna
      u.dirSol.value.copy(dirSol);
      R.sol.color.copy(e.colorSol);
      R.sol.intensity = e.intSol;
      R.sol.position.copy(foco).addScaledVector(dirSol, 80);
      R.sol.target.position.copy(foco);
      R.hemi.intensity = e.ambiente;
      R.hemi.color.copy(e.arriba).lerp(cA.setHex(0xffffff), 0.6);
      R.estrellas.material.opacity = e.noche * 0.9;
      const n = e.noche;
      M.vidrio.emissiveIntensity = n * 0.55;
      M.luzFarol.emissiveIntensity = 0.15 + n * 2.2;
      M.fachadasNoche.forEach(m => { m.emissiveIntensity = n * 1.1; });
      M.letrerosNoche.forEach(m => { m.emissiveIntensity = n * 0.8; });
      R.lucesNoche.forEach(l => { l.intensity = n * 1.4; });
      R.noche = n;
      return e;
    };
    return R;
  };

  // ----------------------------------------------------------
  //  Edificios de los trámites
  // ----------------------------------------------------------
  const ESTILOS = {
    registroCivil:    { w: 11, d: 8, pisos: 2, muro: 0xe3d3b2, tex: 'estuco', zocalo: 0x8a8174, techo: 'plano', corto: 'REGISTRO CIVIL', colorLetrero: '#1d3f8f' },
    registroEmpresas: { w: 8,  d: 8, pisos: 5, muro: 0xb9c7d2, tex: 'estuco', zocalo: 0x4b5560, techo: 'plano', cristal: true, corto: 'PUNTO DIGITAL · EMPRESAS', colorLetrero: '#0f6ab4' },
    sii:              { w: 12, d: 8, pisos: 2, muro: 0xefe9dc, tex: 'estuco', zocalo: 0x9b9384, techo: 'plano', columnas: true, corto: 'SII · IMPUESTOS INTERNOS', colorLetrero: '#123a6b' },
    banco:            { w: 10, d: 8, pisos: 3, muro: 0xcdd3d6, tex: 'estuco', zocalo: 0x3b3f44, techo: 'plano', fachadaVidrio: true, corto: 'BANCO DEL PACÍFICO', colorLetrero: '#b3261e' },
    corredora:        { w: 8,  d: 7, pisos: 1, muro: 0xf0d7b5, tex: 'estuco', zocalo: 0x7d6a55, techo: 'teja', corto: 'CORREDORA DE PROPIEDADES', colorLetrero: '#2f6b3f' },
    proveedor:        { w: 12, d: 9, pisos: 1, muro: 0x9fa6ab, tex: 'metalCorrugado', zocalo: 0x5a5f63, techo: 'plano', porton: true, corto: 'EQUIPOS & MAQUINARIAS', colorLetrero: '#d9a521' },
    municipalidad:    { w: 13, d: 9, pisos: 2, muro: 0xf4efe6, tex: 'estuco', zocalo: 0x9b9384, techo: 'teja', torre: true, columnas: true, corto: 'ILUSTRE MUNICIPALIDAD', colorLetrero: '#123a6b' },
    seremi:           { w: 10, d: 8, pisos: 3, muro: 0xf3f5f2, tex: 'estuco', zocalo: 0x6f7a73, techo: 'plano', cruz: true, corto: 'SEREMI DE SALUD', colorLetrero: '#1d6f5f' },
    mutual:           { w: 9,  d: 8, pisos: 2, muro: 0xe9e4da, tex: 'ladrillo', zocalo: 0x5a4c40, techo: 'plano', corto: 'MUTUAL DE SEGURIDAD', colorLetrero: '#e36414' },
    fomento:          { w: 9,  d: 8, pisos: 2, muro: 0xd9d3e6, tex: 'estuco', zocalo: 0x4b4360, techo: 'plano', cristal: true, corto: 'AGENCIA DE FOMENTO', colorLetrero: '#5e35b1' },
  };
  M.ESTILOS = ESTILOS;

  function ventana(g, x, y, z, rotY, w = 1.3, h = 1.6) {
    const marco = M.std(0xf4f4f0, { roughness: 0.5 });
    const v = new THREE.Group();
    v.add(M.caja(w + 0.16, h + 0.16, 0.08, marco, 0, 0, 0, false));
    v.add(M.caja(w, h, 0.04, M.vidrio, 0, 0, 0.05, false));
    v.add(M.caja(0.05, h, 0.06, marco, 0, 0, 0.07, false));
    v.add(M.caja(w + 0.35, 0.08, 0.25, M.std(0xd9d4c8), 0, -h / 2 - 0.1, 0.1));
    v.position.set(x, y, z); v.rotation.y = rotY;
    g.add(v);
  }

  M.edificioLugar = id => {
    const e = ESTILOS[id];
    const g = new THREE.Group();
    const h = e.pisos * 3.4 + 0.6;
    const matMuro = M.std(e.muro, { map: M.texRep(e.tex, Math.max(1, Math.round(e.w / 4)), Math.max(1, Math.round(h / 4))), roughness: e.tex === 'metalCorrugado' ? 0.5 : 0.9, metalness: e.tex === 'metalCorrugado' ? 0.4 : 0 });
    g.add(M.caja(e.w, h, e.d, matMuro, 0, h / 2, 0));
    g.add(M.caja(e.w + 0.1, 0.9, e.d + 0.1, M.std(e.zocalo, { roughness: 0.8 }), 0, 0.45, 0));
    const cornisa = M.std(0xf1eee6, { roughness: 0.7 });
    for (let p = 1; p < e.pisos; p++) g.add(M.caja(e.w + 0.25, 0.18, e.d + 0.25, cornisa, 0, p * 3.4 + 0.3, 0));
    g.add(M.caja(e.w + 0.5, 0.35, e.d + 0.5, cornisa, 0, h, 0));

    // Techo
    if (e.techo === 'plano') {
      for (const [w, d, x, z] of [[e.w, 0.2, 0, e.d / 2 - 0.1], [e.w, 0.2, 0, -e.d / 2 + 0.1], [0.2, e.d, e.w / 2 - 0.1, 0], [0.2, e.d, -e.w / 2 + 0.1, 0]]) {
        g.add(M.caja(w, 0.7, d, cornisa, x, h + 0.5, z));
      }
      g.add(M.caja(1.4, 0.9, 1, M.std(0xb0b4b8, { metalness: 0.6, roughness: 0.4 }), -e.w / 4, h + 0.6, -e.d / 4));
      g.add(M.cil(0.6, 0.6, 1.4, M.std(0x7b8794, { metalness: 0.5, roughness: 0.4 }), 14, e.w / 4, h + 0.85, -e.d / 4));
    } else {
      const techo = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), M.std(0xffffff, { map: M.texRep('teja', 3, 2), roughness: 0.85 }));
      techo.rotation.y = Math.PI / 4;
      techo.scale.set((e.w + 1) / Math.SQRT2, 2.6, (e.d + 1) / Math.SQRT2);
      techo.position.y = h + 1.45;
      techo.castShadow = true;
      g.add(techo);
    }

    // Fachada (+z) y laterales
    const fz = e.d / 2 + 0.02;
    if (e.fachadaVidrio || e.cristal) {
      const vidrioG = new THREE.Group();
      const ancho = e.w - 1.4, alto = h - 2.4;
      vidrioG.add(M.caja(ancho, alto, 0.06, M.vidrio, 0, 1.2 + alto / 2 + 0.6, fz, false));
      const mainel = M.std(0x2e353b, { metalness: 0.8, roughness: 0.35 });
      for (let i = 0; i <= Math.round(ancho / 1.6); i++) vidrioG.add(M.caja(0.08, alto, 0.12, mainel, -ancho / 2 + i * ancho / Math.round(ancho / 1.6), 1.8 + alto / 2, fz + 0.03, false));
      for (let p = 0; p <= e.pisos; p++) vidrioG.add(M.caja(ancho, 0.1, 0.12, mainel, 0, 1.8 + p * (alto / e.pisos), fz + 0.03, false));
      g.add(vidrioG);
    } else {
      for (let p = 0; p < e.pisos; p++) {
        const y = 2 + p * 3.4;
        const n = Math.max(1, Math.floor((e.w - 1.5) / 2.4));
        for (let i = 0; i < n; i++) {
          const x = -e.w / 2 + 1.2 + (i + 0.5) * (e.w - 2.4) / n;
          if (p === 0 && Math.abs(x) < 1.9) continue;
          if (e.porton && p === 0) continue;
          ventana(g, x, y, fz, 0);
        }
      }
    }
    for (const lado of [-1, 1]) {
      for (let p = 0; p < e.pisos; p++) {
        const n = Math.max(1, Math.floor((e.d - 2) / 2.6));
        for (let i = 0; i < n; i++) ventana(g, lado * (e.w / 2 + 0.02), 2 + p * 3.4, -e.d / 2 + 1.3 + (i + 0.5) * (e.d - 2.6) / n, lado * Math.PI / 2);
      }
    }

    // Puerta
    const marcoPuerta = M.std(0x3b2f2a, { roughness: 0.5, metalness: 0.2 });
    if (e.porton) {
      g.add(M.caja(5, 3.8, 0.12, M.std(0xc2c6ca, { map: M.texRep('metalCorrugado', 1, 6), metalness: 0.5, roughness: 0.5 }), -2.5, 1.9, fz + 0.02));
      g.add(M.caja(1.3, 2.4, 0.1, marcoPuerta, 3, 1.2, fz + 0.04));
      g.add(M.caja(1.1, 2.2, 0.06, M.vidrio, 3, 1.2, fz + 0.08, false));
    } else {
      g.add(M.caja(2.3, 2.9, 0.12, marcoPuerta, 0, 1.45, fz + 0.03));
      g.add(M.caja(0.98, 2.6, 0.05, M.vidrio, -0.52, 1.35, fz + 0.1, false));
      g.add(M.caja(0.98, 2.6, 0.05, M.vidrio, 0.52, 1.35, fz + 0.1, false));
      g.add(M.caja(0.04, 0.5, 0.06, M.std(0xcfcfcf, { metalness: 1, roughness: 0.2 }), -0.1, 1.3, fz + 0.15, false));
      g.add(M.caja(0.04, 0.5, 0.06, M.std(0xcfcfcf, { metalness: 1, roughness: 0.2 }), 0.1, 1.3, fz + 0.15, false));
      // Escalones y alero
      g.add(M.caja(3.2, 0.15, 0.7, M.std(0xb5b0a6), 0, 0.075, fz + 0.4));
      g.add(M.caja(3, 0.15, 0.4, M.std(0xb5b0a6), 0, 0.22, fz + 0.2));
      g.add(M.caja(3.4, 0.12, 1.3, M.std(0x3a3f45, { metalness: 0.5, roughness: 0.4 }), 0, 3.15, fz + 0.65));
    }

    // Letrero de la fachada
    const letrero = M.letrero(e.corto, Math.min(e.w - 1, 8), 0.75, { fondo: e.colorLetrero, ilumina: true });
    letrero.position.set(0, e.pisos > 1 ? 3.75 : h - 0.55, fz + 0.12);
    g.add(letrero);

    // Detalles particulares
    if (e.columnas) {
      const piedra = M.std(0xf6f2ea, { roughness: 0.6 });
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x = -e.w / 2 + 1 + i * (e.w - 2) / (n - 1);
        if (Math.abs(x) < 1.4) continue;
        g.add(M.cil(0.28, 0.32, 3.2, piedra, 16, x, 1.6 + 0.25, fz + 1.4));
        g.add(M.caja(0.8, 0.2, 0.8, piedra, x, 3.5, fz + 1.4));
      }
      g.add(M.caja(e.w, 0.5, 2.4, piedra, 0, 3.8, fz + 1.2));
      g.add(M.caja(e.w + 0.4, 0.25, 3, M.std(0xcfc9bc), 0, 0.12, fz + 1.4));
      const fronton = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 3), piedra);
      fronton.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      fronton.scale.set(0.9, 1, e.w / 3.4);
      fronton.position.set(0, 4.45, fz + 1.2);
      fronton.castShadow = true;
      g.add(fronton);
      letrero.position.set(0, 3.8, fz + 2.42);
    }
    if (e.torre) {
      const blanco = M.std(0xf4efe6, { map: M.texRep('estuco', 1, 2) });
      g.add(M.caja(3, 5, 3, blanco, 0, h + 2.5, -1));
      const reloj = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), M.std(0xfffaf0, { emissive: 0xfff0c0, emissiveIntensity: 0.1 }));
      reloj.position.set(0, h + 3.4, 0.52);
      g.add(reloj);
      g.add(M.caja(0.06, 0.65, 0.04, 0x111111, 0, h + 3.6, 0.55, false));
      const minutero = M.caja(0.05, 0.8, 0.04, 0x111111, 0.2, h + 3.4, 0.56, false);
      minutero.rotation.z = -1.2; g.add(minutero);
      const punta = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.6, 4), M.std(0x5d6d7e, { metalness: 0.6, roughness: 0.4 }));
      punta.rotation.y = Math.PI / 4; punta.position.set(0, h + 6.3, -1); punta.castShadow = true;
      g.add(punta);
    }
    if (e.cruz) {
      const verde = M.std(0xd52b1e, { emissive: 0xff3322, emissiveIntensity: 0.4 });
      g.add(M.caja(1.6, 0.5, 0.15, verde, e.w / 2 - 1.3, h - 1.3, fz + 0.1));
      g.add(M.caja(0.5, 1.6, 0.15, verde, e.w / 2 - 1.3, h - 1.3, fz + 0.1));
    }
    const alto = h + (e.torre ? 7.6 : e.techo === 'teja' ? 2.9 : 1);
    return { grupo: g, d: e.d + (e.columnas ? 2.8 : 0), alto };
  };

  // ----------------------------------------------------------
  //  Negocio del jugador
  // ----------------------------------------------------------
  const COLOR_NEGOCIO = { cafeteria: 0x6d4c41, panaderia: 0xd9a066, taller: 0x5b6770, software: 0x2f6f73, foodtruck: 0xc0392b, online: 0xad4f7a };

  M.negocio = (estado, rubro, empresa) => {
    const g = new THREE.Group();
    const color = COLOR_NEGOCIO[rubro.id] || 0x777777;
    if (estado === 'vacio') {
      const tierra = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), M.std(0xffffff, { map: M.texRep('tierra', 2, 2) }));
      tierra.rotation.x = -Math.PI / 2; tierra.position.y = 0.03; tierra.receiveShadow = true;
      g.add(tierra);
      const poste = M.std(0x7a7f84, { metalness: 0.7, roughness: 0.4 });
      const malla = new THREE.MeshStandardMaterial({ color: M.color(0x9aa0a6), metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const lados = [[0, -4, 10, 0], [-5, 0, 8, Math.PI / 2], [5, 0, 8, Math.PI / 2], [-3.3, 4, 3.4, 0], [3.3, 4, 3.4, 0]];
      for (const [x, z, largo, rot] of lados) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, 1.8), malla);
        m.position.set(x, 0.9, z); m.rotation.y = rot;
        g.add(m);
        for (let i = 0; i <= Math.round(largo / 2); i++) {
          const t = -largo / 2 + i * largo / Math.round(largo / 2);
          g.add(M.cil(0.04, 0.04, 1.9, poste, 6, x + (rot ? 0 : t), 0.95, z + (rot ? t : 0)));
        }
      }
      const cartel = M.letrero('SE ARRIENDA', 2.6, 1.3, { fondo: '#fff5cc', colorTexto: '#c0392b', sub: 'Consulte en la corredora', borde: '#c0392b' });
      cartel.position.set(0, 2.2, 4.1);
      g.add(cartel);
      for (const x of [-1.1, 1.1]) g.add(M.cil(0.05, 0.05, 2.2, M.std(0x6d4c41), 6, x, 1.1, 4.05));
      // Maleza y escombros
      for (let i = 0; i < 6; i++) {
        const piedra = M.esfera(0.2 + Math.random() * 0.25, M.std(0x8d8579), (Math.random() - 0.5) * 8, 0.1, (Math.random() - 0.5) * 6, 6);
        piedra.scale.y = 0.5; g.add(piedra);
      }
      return { grupo: g, d: 8, alto: 3 };
    }

    if (rubro.local === 'carro') {
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), M.std(0xffffff, { map: M.texRep('asfalto', 2, 2) }));
      piso.rotation.x = -Math.PI / 2; piso.position.y = 0.03; piso.receiveShadow = true;
      g.add(piso);
      const camion = M.camion(color);
      camion.position.set(0, 0, 0);
      g.add(camion);
      const cartel = M.letrero(`${empresa}`, 4.2, 0.6, { fondo: '#ffffff', colorTexto: '#222', ilumina: true });
      cartel.position.set(-0.6, 3.25, 1.2);
      g.add(cartel);
      if (estado === 'abierto') {
        for (const x of [-3.5, 3.5]) {
          g.add(M.cil(0.6, 0.6, 0.05, M.std(0xf2f2f2), 18, x, 0.95, 3.2));
          g.add(M.cil(0.05, 0.05, 0.95, M.std(0x555555, { metalness: 0.8 }), 6, x, 0.47, 3.2));
          const s1 = M.silla(0xc0392b); s1.position.set(x - 0.9, 0, 3.2); s1.rotation.y = Math.PI / 2; g.add(s1);
        }
      }
      return { grupo: g, d: 3, alto: 4.5 };
    }

    const w = 10, d = 8, h = 4.6;
    const abierto = estado === 'abierto';
    g.add(M.caja(w, h, d, M.std(0xf1ece2, { map: M.texRep('estuco', 3, 2) }), 0, h / 2, 0));
    g.add(M.caja(w + 0.1, 0.6, d + 0.1, M.std(color), 0, 0.3, 0));
    g.add(M.caja(w + 0.4, 0.3, d + 0.4, M.std(color), 0, h, 0));
    const fz = d / 2 + 0.02;
    // Vitrinas y puerta
    const marco = M.std(0x23272b, { metalness: 0.7, roughness: 0.35 });
    g.add(M.caja(w - 0.8, 2.9, 0.1, marco, 0, 2.05, fz));
    for (const x of [-2.8, 2.8]) g.add(M.caja(3.2, 2.5, 0.06, M.vidrio, x, 2.05, fz + 0.07, false));
    g.add(M.caja(1.6, 2.6, 0.06, abierto ? M.vidrio : M.std(0x8d969c, { map: M.texRep('metalCorrugado', 1, 4), metalness: 0.5 }), 0, 1.6, fz + 0.07, false));
    if (!abierto) {
      // Cortinas metálicas cerradas
      for (const x of [-2.8, 2.8]) g.add(M.caja(3.3, 2.6, 0.08, M.std(0x9aa1a6, { map: M.texRep('metalCorrugado', 1, 5), metalness: 0.5, roughness: 0.5 }), x, 2.05, fz + 0.12, false));
    }
    // Toldo
    if (abierto) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 32;
      const x = c.getContext('2d');
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#' + color.toString(16).padStart(6, '0'); x.fillRect(i * 16, 0, 16, 32); }
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      const toldo = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.05, 1.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      toldo.position.set(0, 3.75, fz + 0.7); toldo.rotation.x = 0.35; toldo.castShadow = true;
      g.add(toldo);
      if (rubro.id === 'cafeteria' || rubro.id === 'panaderia') {
        for (const xx of [-3.2, 3.2]) {
          g.add(M.cil(0.45, 0.45, 0.04, M.std(0x2b2b2b, { metalness: 0.6 }), 16, xx, 0.75, fz + 1.8));
          g.add(M.cil(0.04, 0.04, 0.75, M.std(0x2b2b2b, { metalness: 0.6 }), 6, xx, 0.37, fz + 1.8));
          const s = M.silla(0x6d4c41); s.position.set(xx + 0.7, 0, fz + 1.8); s.rotation.y = -Math.PI / 2; g.add(s);
        }
      }
    }
    const cartel = M.letrero(abierto ? empresa : 'PRÓXIMAMENTE', 6.5, 0.8, { fondo: '#' + color.toString(16).padStart(6, '0'), colorTexto: '#ffffff', sub: abierto ? rubro.nombre.toUpperCase() : empresa, ilumina: abierto });
    cartel.position.set(0, 4.05, fz + 0.1);
    g.add(cartel);
    return { grupo: g, d, alto: h + 0.5 };
  };
})();
