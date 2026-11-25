// ============================================================
//  RUTa al Éxito — Interiores: oficinas públicas, banco,
//  puntos digitales, corredora, bodega y tu propio negocio
// ============================================================

(() => {
  const M = M3;
  const W = 16, D = 14, H = 4.2;   // Tamaño de la sala (x: -8..8, z: -7..7)

  const AFICHES = [
    ['RECUERDE TRAER SU', 'CÉDULA DE IDENTIDAD VIGENTE'],
    ['ATENCIÓN PREFERENTE', 'Adultos mayores, embarazadas y personas con discapacidad'],
    ['NO SE ACEPTAN', 'FOTOCOPIAS SIN LEGALIZAR'],
    ['¿SABÍA QUE...?', 'Muchos trámites se pueden hacer en línea'],
    ['PROHIBIDO', 'COMER EN LA SALA DE ESPERA'],
    ['MANTENGA SU NÚMERO', 'A MANO HASTA SER LLAMADO'],
  ];

  function sala(scene, colorPared, conPiso = 'baldosa') {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.std(0xffffff, {
      map: M.texRep(conPiso, conPiso === 'madera' ? 6 : 4, conPiso === 'madera' ? 5 : 3.5), roughness: conPiso === 'baldosa' ? 0.35 : 0.7, envMapIntensity: 0.5,
    }));
    piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true;
    scene.add(piso);
    const pared = M.std(colorPared, { map: M.texRep('estuco', 4, 1), roughness: 0.9 });
    const guardapolvo = M.std(0x6b625a, { roughness: 0.6 });
    for (const [w, x, z, ry] of [[W, 0, -D / 2, 0], [W, 0, D / 2, Math.PI], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, -Math.PI / 2]]) {
      const p = M.caja(w, H, 0.2, pared, x, H / 2, z, false);
      p.rotation.y = ry;
      scene.add(p);
      const g = M.caja(w, 0.15, 0.24, guardapolvo, x, 0.075, z, false);
      g.rotation.y = ry; scene.add(g);
    }
    const cielo = M.caja(W, 0.1, D, M.std(0xf4f4f2, { roughness: 1 }), 0, H, 0, false);
    scene.add(cielo);
    // Paneles de luz fluorescentes
    const panel = M.std(0xffffff, { emissive: 0xfffaf0, emissiveIntensity: 1.2 });
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) scene.add(M.caja(2.4, 0.04, 0.6, panel, i * 5, H - 0.06, j * 3, false));
    // Luces
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.75));
    for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) {
      const l = new THREE.PointLight(0xfff6e8, 0.55, 16, 1.5);
      l.position.set(x, H - 0.4, z);
      scene.add(l);
    }
    const arriba = new THREE.DirectionalLight(0xffffff, 0.5);
    arriba.position.set(2, 10, 4);
    arriba.castShadow = true;
    arriba.shadow.mapSize.set(1024, 1024);
    Object.assign(arriba.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 20 });
    arriba.shadow.normalBias = 0.03;
    scene.add(arriba);

    // Puerta de entrada (vista desde adentro) con luz del exterior
    const marco = M.std(0x2e3338, { metalness: 0.7, roughness: 0.4 });
    scene.add(M.caja(2.6, 2.9, 0.12, marco, 0, 1.45, D / 2 - 0.12, false));
    const luzCalle = M.std(0xffffff, { emissive: 0xe9f3ff, emissiveIntensity: 1.1 });
    scene.add(M.caja(2.3, 2.7, 0.05, luzCalle, 0, 1.4, D / 2 - 0.17, false));
    const salida = M.letrero('SALIDA', 1.2, 0.35, { fondo: '#1e8e3e' });
    salida.material.emissiveIntensity = 0.6;
    salida.position.set(0, 3.15, D / 2 - 0.2); salida.rotation.y = Math.PI;
    scene.add(salida);
    // Felpudo
    const felpudo = M.caja(2.4, 0.02, 1.2, M.std(0x3b3b3b, { roughness: 1 }), 0, 0.01, D / 2 - 1, false);
    scene.add(felpudo);
  }

  function reloj(scene, x, y, z, ry = 0) {
    const g = new THREE.Group();
    g.add(M.cil(0.42, 0.42, 0.08, M.std(0x222222), 32, 0, 0, 0));
    const cara = M.cil(0.38, 0.38, 0.09, M.std(0xffffff), 32, 0, 0, 0.005);
    g.add(cara);
    g.children.forEach(c => { c.rotation.x = Math.PI / 2; });
    const horario = M.caja(0.04, 0.22, 0.02, 0x111111, 0, 0, 0.06, false);
    horario.geometry.translate(0, 0.1, 0);
    const minutero = M.caja(0.03, 0.32, 0.02, 0x111111, 0, 0, 0.07, false);
    minutero.geometry.translate(0, 0.15, 0);
    g.add(horario, minutero);
    g.position.set(x, y, z); g.rotation.y = ry;
    scene.add(g);
    return hora => {
      minutero.rotation.z = -((hora % 60) / 60) * Math.PI * 2;
      horario.rotation.z = -(((hora / 60) % 12) / 12) * Math.PI * 2;
    };
  }

  function afiche(scene, i, x, y, z, ry) {
    const [a, b] = AFICHES[i % AFICHES.length];
    const m = M.letrero(a, 1.4, 1.0, { fondo: '#ffffff', colorTexto: '#123a6b', sub: b, borde: '#123a6b' });
    m.position.set(x, y, z); m.rotation.y = ry;
    scene.add(m);
  }

  // Pantalla de llamado de números
  function pantallaLlamado(scene, x, y, z) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: M.color(0xffffff), emissiveIntensity: 1, roughness: 0.3 });
    const marco = M.caja(2.7, 1.1, 0.12, M.std(0x111111, { roughness: 0.3 }), x, y, z, false);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.94), mat);
    pant.position.set(x, y, z + 0.07);
    scene.add(marco, pant);
    const set = (numero, modulo, destacar) => {
      const g = c.getContext('2d');
      g.fillStyle = destacar ? '#7a0d0d' : '#0b1a2e'; g.fillRect(0, 0, 512, 192);
      g.fillStyle = '#9fb7d6'; g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('ATENDIENDO', 256, 42);
      g.fillStyle = '#ffd24a'; g.font = 'bold 92px system-ui, sans-serif';
      g.fillText(numero, 170, 140);
      g.fillStyle = '#ffffff'; g.font = '600 40px system-ui, sans-serif';
      g.fillText(modulo ? `MÓDULO ${modulo}` : '—', 390, 135);
      tex.needsUpdate = true;
    };
    set('---', 0);
    return set;
  }

  function funcionarioSentado(scene, x, z, ry = 0, ropa) {
    const p = M.persona({ ropa: ropa ?? M.elegir([0xffffff, 0xdfe7ef, 0x2f4f7f, 0x5a5f66, 0xe9dfd0]) });
    M.sentar(p);
    p.position.set(x, 0, z); p.rotation.y = ry;
    scene.add(p);
    const silla = M.silla(0x222222);
    silla.position.set(x, 0, z - 0.1); silla.rotation.y = ry;
    scene.add(silla);
    return p;
  }

  // ----------------------------------------------------------
  //  Oficina con fila (Registro Civil, Municipalidad, Banco...)
  // ----------------------------------------------------------
  function oficinaConFila(scene, l, R, esBanco) {
    const n = l.modulos;
    const anchoMod = Math.min(3.4, (W - 3) / n);
    const zMesón = -D / 2 + 2.2;
    const madera = M.std(0xffffff, { map: M.texRep('madera', 3, 1), roughness: 0.6 });
    const meson = esBanco ? madera : M.std(0xe8e4dc, { roughness: 0.5 });
    // Mesón
    const largo = anchoMod * n + 0.4;
    scene.add(M.caja(largo, 1.1, 0.8, meson, 0, 0.55, zMesón));
    scene.add(M.caja(largo + 0.1, 0.06, 0.9, M.std(esBanco ? 0x2b2b2b : 0x9c9488, { roughness: 0.3, metalness: esBanco ? 0.3 : 0 }), 0, 1.13, zMesón));
    // Vidrios separadores y módulos
    R.modulos = [];
    for (let i = 0; i < n; i++) {
      const x = -largo / 2 + 0.2 + anchoMod * (i + 0.5);
      scene.add(M.caja(anchoMod - 0.3, 1.1, 0.03, M.vidrioClaro, x, 1.75, zMesón + 0.1, false));
      scene.add(M.caja(anchoMod - 0.25, 0.08, 0.06, M.std(0x8a9096, { metalness: 0.7, roughness: 0.3 }), x, 2.32, zMesón + 0.1, false));
      if (i < n - 1) scene.add(M.caja(0.06, 1.5, 0.8, M.std(0x8a9096, { metalness: 0.6 }), x + anchoMod / 2, 1.9, zMesón));
      const cartel = M.letrero(`MÓDULO ${i + 1}`, 1.3, 0.32, { fondo: '#123a6b', ilumina: false });
      cartel.material.emissiveIntensity = 0.5;
      cartel.position.set(x, 2.75, zMesón + 0.15);
      scene.add(cartel);
      const pc = M.computador(); pc.position.set(x - 0.4, 1.16, zMesón - 0.15); pc.rotation.y = Math.PI + 0.3; scene.add(pc);
      const func = funcionarioSentado(scene, x, zMesón - 0.95, 0);
      R.funcionarios.push(func);
      R.modulos.push({ x, z: zMesón + 1.1, idx: i });
      R.interactivos.push({ tipo: 'modulo', idx: i, x, z: zMesón + 1.1, r: 1.1, texto: `Hablar con ${l.funcionarios[i] || 'el funcionario'} (módulo ${i + 1})` });
    }
    // Pared del fondo: nombre de la institución
    const titulo = M.letrero(l.nombre.replace(' (online)', '').toUpperCase(), 9, 0.9, { fondo: esBanco ? '#b3261e' : '#123a6b' });
    titulo.material.emissiveIntensity = 0.25;
    titulo.position.set(0, 3.55, -D / 2 + 0.12);
    scene.add(titulo);
    // Pantalla de llamados
    R.pantalla = pantallaLlamado(scene, -W / 2 + 3.2, 3.2, -D / 2 + 0.2);
    // Tótem de números
    const totem = new THREE.Group();
    totem.add(M.caja(0.7, 1.5, 0.5, M.std(0x123a6b, { roughness: 0.4 }), 0, 0.75, 0));
    const pant = M.caja(0.55, 0.42, 0.05, M.std(0x9fc4e8, { emissive: 0x5d8fc4, emissiveIntensity: 1 }), 0, 1.25, 0.27, false);
    pant.rotation.x = -0.3; totem.add(pant);
    totem.add(M.caja(0.3, 0.05, 0.1, M.std(0xffffff), 0, 0.95, 0.27, false));
    const cartelT = M.letrero('SAQUE SU NÚMERO', 0.9, 0.25, { fondo: '#ffd24a', colorTexto: '#123a6b' });
    cartelT.position.set(0, 1.7, 0.26); totem.add(cartelT);
    totem.position.set(W / 2 - 2.2, 0, D / 2 - 2.6); totem.rotation.y = -Math.PI / 2;
    scene.add(totem);
    R.interactivos.push({ tipo: 'totem', x: W / 2 - 3.1, z: D / 2 - 2.6, r: 1.2, texto: 'Sacar número en el tótem' });

    // Sillas de espera con gente
    const colorSilla = esBanco ? 0x2b2b2b : 0x2a6db0;
    for (let fila = 0; fila < 3; fila++) {
      for (let i = 0; i < 6; i++) {
        const x = -4.6 + i * 0.62 + (i > 2 ? 0.8 : 0) - 1.2, z = 0.2 + fila * 1.5;
        const s = M.silla(colorSilla); s.position.set(x, 0, z); scene.add(s);
        if (Math.random() < 0.55) {
          const p = M.persona(); M.sentar(p); p.position.set(x, 0, z + 0.05); scene.add(p); R.esperando.push(p);
        }
      }
      R.obstaculos.push({ x0: -6.3, x1: -0.7, z0: fila * 1.5 - 0.1, z1: fila * 1.5 + 0.55 });
    }
    // Gente de pie haciendo fila ante los módulos
    for (let i = 0; i < Math.min(n, 3); i++) {
      if (Math.random() < 0.5) continue;
      const m = R.modulos[i];
      const p = M.persona(); p.position.set(m.x + (Math.random() - 0.5) * 0.3, 0, m.z - 0.1); p.rotation.y = Math.PI;
      scene.add(p); R.npcs.push(p);
    }
    // Decoración
    R.reloj = reloj(scene, W / 2 - 0.12, 3.1, -2, -Math.PI / 2);
    afiche(scene, 0, -W / 2 + 0.12, 1.9, -1.5, Math.PI / 2);
    afiche(scene, 1, -W / 2 + 0.12, 1.9, 2.5, Math.PI / 2);
    afiche(scene, Math.floor(Math.random() * 4) + 2, W / 2 - 0.12, 1.9, 1.5, -Math.PI / 2);
    for (const [x, z] of [[-W / 2 + 0.6, D / 2 - 0.8], [W / 2 - 0.6, -D / 2 + 3.4]]) { const p = M.planta(); p.position.set(x, 0, z); scene.add(p); }
    const bandera = new THREE.Group();
    bandera.add(M.cil(0.03, 0.03, 2.4, M.std(0xd4af37, { metalness: 1, roughness: 0.3 }), 8, 0, 1.2, 0));
    bandera.add(M.cil(0.25, 0.3, 0.1, M.std(0x333333), 12, 0, 0.05, 0));
    const tela = M.caja(0.03, 0.9, 0.9, M.std(0xd52b1e), 0, 1.8, 0.45, false);
    bandera.add(tela);
    bandera.add(M.caja(0.035, 0.45, 0.9, M.std(0xffffff), 0, 2.02, 0.45, false));
    bandera.add(M.caja(0.04, 0.45, 0.3, M.std(0x0039a6), 0, 2.02, 0.15, false));
    bandera.position.set(-W / 2 + 0.8, 0, -D / 2 + 3.2);
    scene.add(bandera);
    R.obstaculos.push({ x0: -largo / 2 - 0.2, x1: largo / 2 + 0.2, z0: -D / 2, z1: zMesón + 0.5 });
  }

  // ----------------------------------------------------------
  //  Punto digital (autoatención)
  // ----------------------------------------------------------
  function puntoDigital(scene, l, R) {
    const n = l.modulos;
    const blanco = M.std(0xf5f5f5, { roughness: 0.4 });
    for (let i = 0; i < n; i++) {
      const x = -5 + i * 5 / Math.max(1, (n - 1) / 2), z = -3;
      scene.add(M.caja(1.8, 0.05, 0.9, blanco, x, 0.78, z));
      for (const dx of [-0.8, 0.8]) scene.add(M.caja(0.05, 0.78, 0.8, blanco, x + dx, 0.39, z));
      const pc = M.computador(); pc.position.set(x, 0.81, z - 0.15); scene.add(pc);
      const s = M.silla(0x2a6db0); s.position.set(x, 0, z + 0.7); s.rotation.y = Math.PI; scene.add(s);
      const humano = !/virtual/i.test(l.funcionarios[i] || '');
      if (humano) {
        const f = funcionarioSentado(scene, x + 0.6, z - 0.9, 0);
        R.funcionarios.push(f);
      }
      R.obstaculos.push({ x0: x - 1, x1: x + 1, z0: z - 0.5, z1: z + 0.45 });
      R.interactivos.push({ tipo: 'modulo', idx: i, x, z: z + 1.3, r: 1.1, texto: humano ? `Hablar con ${l.funcionarios[i]}` : 'Usar el computador de autoatención' });
    }
    const titulo = M.letrero(`${l.nombre.replace(' (online)', '').toUpperCase()} · AUTOATENCIÓN`, 10, 0.8, { fondo: '#0f6ab4' });
    titulo.material.emissiveIntensity = 0.25;
    titulo.position.set(0, 3.5, -D / 2 + 0.12);
    scene.add(titulo);
    const wifi = M.letrero('WiFi gratis · Clave: tramites2027', 3.4, 0.5, { fondo: '#ffffff', colorTexto: '#0f6ab4', borde: '#0f6ab4' });
    wifi.position.set(W / 2 - 0.12, 2.2, 1); wifi.rotation.y = -Math.PI / 2;
    scene.add(wifi);
    R.reloj = reloj(scene, -W / 2 + 0.12, 3.1, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) { const p = M.persona(); p.position.set(-4 + i * 3.5, 0, 2.5 + Math.random()); p.rotation.y = Math.random() * 6; scene.add(p); R.npcs.push(p); }
    for (const [x, z] of [[-W / 2 + 0.6, D / 2 - 0.8], [W / 2 - 0.6, D / 2 - 0.8]]) { const p = M.planta(); p.position.set(x, 0, z); scene.add(p); }
  }

  // ----------------------------------------------------------
  //  Oficina privada (corredora) y bodega (proveedor)
  // ----------------------------------------------------------
  function oficinaPrivada(scene, l, R) {
    const madera = M.std(0xffffff, { map: M.texRep('madera', 2, 1), roughness: 0.55 });
    scene.add(M.caja(3.2, 0.08, 1.4, madera, 0, 0.78, -3));
    for (const dx of [-1.5, 1.5]) scene.add(M.caja(0.08, 0.78, 1.3, madera, dx, 0.39, -3));
    const pc = M.computador(); pc.position.set(0.7, 0.82, -3.3); pc.rotation.y = 0.3; scene.add(pc);
    R.funcionarios.push(funcionarioSentado(scene, 0, -4, 0, 0x2f3b4c));
    for (const dx of [-0.6, 0.6]) { const s = M.silla(0x6d4c41); s.position.set(dx, 0, -1.8); s.rotation.y = Math.PI; scene.add(s); }
    R.obstaculos.push({ x0: -1.7, x1: 1.7, z0: -D / 2, z1: -2.2 });
    R.interactivos.push({ tipo: 'modulo', idx: 0, x: 0, z: -1.2, r: 1.2, texto: `Hablar con ${l.funcionarios[0]}` });
    // Fotos de propiedades
    const props = ['Local comercial · Providencia', 'Oficina · Santiago Centro', 'Bodega · Quilicura', 'Local · Ñuñoa'];
    props.forEach((t, i) => {
      const m = M.letrero('SE ARRIENDA', 1.4, 1.0, { fondo: ['#d9cbb3', '#c7d3d9', '#cfd6c4', '#e6dcc8'][i], colorTexto: '#b3261e', sub: t });
      m.position.set(-W / 2 + 0.12, 2, -4 + i * 2.2); m.rotation.y = Math.PI / 2; scene.add(m);
    });
    // Estante con archivadores
    scene.add(M.caja(3, 2.2, 0.5, madera, 4, 1.1, -D / 2 + 0.4));
    for (let i = 0; i < 12; i++) scene.add(M.caja(0.18, 0.35, 0.3, M.std(M.elegir([0x123a6b, 0xb3261e, 0x2f6b3f, 0xd9a521])), 2.8 + (i % 6) * 0.45, 0.9 + Math.floor(i / 6) * 0.7, -D / 2 + 0.55));
    const titulo = M.letrero(l.nombre.toUpperCase(), 6, 0.7, { fondo: '#2f6b3f' });
    titulo.position.set(-2, 3.4, -D / 2 + 0.12); scene.add(titulo);
    R.reloj = reloj(scene, W / 2 - 0.12, 3, 0, -Math.PI / 2);
    for (const [x, z] of [[-W / 2 + 0.6, -D / 2 + 0.6], [W / 2 - 0.6, D / 2 - 0.8]]) { const p = M.planta(); p.position.set(x, 0, z); scene.add(p); }
  }

  function bodega(scene, l, R) {
    const fierro = M.std(0xd9822b, { metalness: 0.6, roughness: 0.4 });
    const carton = M.std(0xb08a5a, { roughness: 0.95 });
    for (const x of [-6, -2.5]) {
      for (let nivel = 0; nivel < 3; nivel++) scene.add(M.caja(3, 0.06, 1.2, fierro, x, 0.4 + nivel * 1.1, -4.5));
      for (const dx of [-1.45, 1.45]) scene.add(M.caja(0.08, 3.4, 1.2, M.std(0x1f5fa8, { metalness: 0.6 }), x + dx, 1.7, -4.5));
      for (let i = 0; i < 9; i++) scene.add(M.caja(0.8, 0.6 + Math.random() * 0.3, 0.8, carton, x - 1 + (i % 3), 0.75 + Math.floor(i / 3) * 1.1, -4.5));
      R.obstaculos.push({ x0: x - 1.6, x1: x + 1.6, z0: -5.3, z1: -3.8 });
    }
    // Máquinas en exhibición
    const acero = M.std(0xc0c4c8, { metalness: 0.9, roughness: 0.25 });
    scene.add(M.caja(1.4, 1.2, 1, acero, -4.5, 0.6, 1));
    scene.add(M.caja(1, 1.6, 1, acero, -2.5, 0.8, 1.2));
    R.obstaculos.push({ x0: -5.4, x1: -1.8, z0: 0.3, z1: 1.9 });
    // Mesón de venta
    scene.add(M.caja(3.5, 1.05, 0.8, M.std(0x5a5f63, { roughness: 0.5 }), 4, 0.52, -3));
    const pc = M.computador(); pc.position.set(4.8, 1.08, -3.2); pc.rotation.y = Math.PI; scene.add(pc);
    const vendedor = M.persona({ ropa: 0xd9822b });
    vendedor.position.set(4, 0, -4); scene.add(vendedor); R.npcs.push(vendedor);
    R.obstaculos.push({ x0: 2.2, x1: 5.8, z0: -D / 2, z1: -2.5 });
    R.interactivos.push({ tipo: 'modulo', idx: 0, x: 4, z: -2, r: 1.2, texto: `Hablar con ${l.funcionarios[0]}` });
    const titulo = M.letrero('EQUIPOS & MAQUINARIAS · VENTAS', 7, 0.7, { fondo: '#d9a521', colorTexto: '#222' });
    titulo.position.set(2, 3.4, -D / 2 + 0.12); scene.add(titulo);
    R.reloj = reloj(scene, W / 2 - 0.12, 3, 0, -Math.PI / 2);
  }

  // ----------------------------------------------------------
  //  Tu negocio por dentro
  // ----------------------------------------------------------
  function negocio(scene, R, info) {
    const { rubro: r, estado, empleados, equipado } = info;
    const madera = M.std(0xffffff, { map: M.texRep('madera', 3, 1), roughness: 0.55 });
    if (estado !== 'abierto') {
      // Local vacío: cajas y polvo
      for (let i = 0; i < 7; i++) {
        const c = M.caja(0.7 + Math.random() * 0.4, 0.5 + Math.random() * 0.4, 0.7, M.std(0xb08a5a, { roughness: 0.95 }), -5 + Math.random() * 10, 0.3, -4 + Math.random() * 5);
        c.rotation.y = Math.random(); scene.add(c);
      }
      const escalera = M.caja(0.6, 2, 0.1, M.std(0x9aa0a6, { metalness: 0.7 }), 5, 1, -5);
      escalera.rotation.x = 0.2; scene.add(escalera);
    }
    // Mesón / caja
    scene.add(M.caja(5, 1.05, 0.9, madera, 0, 0.52, -3.4));
    scene.add(M.caja(5.1, 0.05, 1.0, M.std(0x2b2b2b, { roughness: 0.3 }), 0, 1.07, -3.4));
    const cajaReg = M.computador(); cajaReg.position.set(1.6, 1.1, -3.5); cajaReg.rotation.y = Math.PI; scene.add(cajaReg);
    R.obstaculos.push({ x0: -2.6, x1: 2.6, z0: -D / 2, z1: -2.8 });
    R.interactivos.push({ tipo: 'gestion', x: 0, z: -2.2, r: 1.3, texto: estado === 'abierto' ? 'Gestionar tu negocio' : 'Revisar tu local' });

    if (equipado || estado === 'abierto') {
      const acero = M.std(0xc0c4c8, { metalness: 0.9, roughness: 0.25 });
      if (r.id === 'cafeteria') {
        // Máquina de espresso
        const negro = M.std(0x1c1c1c, { roughness: 0.4 });
        scene.add(M.caja(1.3, 0.55, 0.6, acero, -1.3, 1.37, -3.6));
        scene.add(M.caja(1.3, 0.12, 0.6, negro, -1.3, 1.71, -3.6));
        for (const dx of [-0.35, 0.35]) {
          scene.add(M.cil(0.07, 0.07, 0.12, negro, 10, -1.3 + dx, 1.26, -3.25));
          scene.add(M.cil(0.05, 0.04, 0.09, M.std(0xffffff), 10, -1.3 + dx, 1.14, -3.22));
        }
        for (let i = 0; i < 6; i++) scene.add(M.cil(0.045, 0.035, 0.08, M.std(0xffffff), 10, -1.6 + i * 0.12, 1.79, -3.65));
        // Repisa con frascos de café y tazas en la pared
        for (let n = 0; n < 2; n++) {
          scene.add(M.caja(3, 0.06, 0.35, madera, -5, 1.7 + n * 0.6, -D / 2 + 0.3));
          for (let i = 0; i < 7; i++) {
            const frasco = M.cil(0.1, 0.1, 0.26, n ? M.std(0xffffff) : M.std(0x6d4c41), 10, -6.3 + i * 0.42, 1.86 + n * 0.6, -D / 2 + 0.3);
            scene.add(frasco);
          }
        }
        const pizarra = M.letrero('MENÚ · Espresso $2.500 · Cortado $3.000 · Latte $3.500', 4, 0.75, { fondo: '#1e2a24', colorTexto: '#f4f1e8' });
        pizarra.position.set(5.4, 2.1, -D / 2 + 0.12); scene.add(pizarra);
      } else if (r.id === 'panaderia') {
        scene.add(M.caja(2, 2, 1.2, acero, -5.5, 1, -5.5));
        for (let i = 0; i < 3; i++) scene.add(M.caja(4, 0.05, 0.5, madera, 0, 1.6 + i * 0.5, -D / 2 + 0.4));
        for (let i = 0; i < 18; i++) {
          const pan = M.esfera(0.12, M.std(0xc98d4b, { roughness: 0.8 }), -1.8 + (i % 6) * 0.7, 1.75 + Math.floor(i / 6) * 0.5, -D / 2 + 0.4, 8);
          pan.scale.set(1.5, 0.8, 1); scene.add(pan);
        }
      } else if (r.id === 'taller') {
        const auto = M.auto(0x1f4e8c); auto.position.set(-3, 1.4, 1); auto.rotation.y = 0.2; scene.add(auto);
        for (const dx of [-1.2, 1.2]) scene.add(M.caja(0.3, 1.4, 0.3, M.std(0xd9a521, { metalness: 0.5 }), -3 + dx, 0.7, 1));
        scene.add(M.caja(2.4, 1.6, 0.6, M.std(0xb3261e, { metalness: 0.4 }), 5.5, 0.8, -5.5));
        R.obstaculos.push({ x0: -5.5, x1: -0.5, z0: 0, z1: 2 });
      } else if (r.id === 'software') {
        for (let i = 0; i < 3; i++) {
          const x = -5 + i * 3.2;
          scene.add(M.caja(1.6, 0.05, 0.8, M.std(0xf5f5f5), x, 0.76, 1.5));
          const pc = M.computador(); pc.position.set(x, 0.79, 1.3); scene.add(pc);
        }
        R.obstaculos.push({ x0: -6, x1: 2.2, z0: 1, z1: 2 });
      } else if (r.id === 'online') {
        for (const x of [-5.5, 5.5]) {
          for (let n = 0; n < 3; n++) scene.add(M.caja(2.4, 0.05, 1, M.std(0x1f5fa8, { metalness: 0.5 }), x, 0.4 + n * 1, -4.8));
          for (let i = 0; i < 9; i++) scene.add(M.caja(0.6, 0.45, 0.6, M.std(0xb08a5a), x - 0.8 + (i % 3) * 0.8, 0.65 + Math.floor(i / 3), -4.8));
        }
      }
    }
    if (estado === 'abierto') {
      // Mesas para clientes
      if (r.id === 'cafeteria' || r.id === 'panaderia') {
        for (const [x, z] of [[-4.5, 1.5], [4.5, 1.5], [-4.5, 4], [4.5, 4]]) {
          scene.add(M.cil(0.5, 0.5, 0.04, madera, 16, x, 0.75, z));
          scene.add(M.cil(0.05, 0.05, 0.75, M.std(0x222222, { metalness: 0.6 }), 6, x, 0.37, z));
          for (const dx of [-0.8, 0.8]) {
            const s = M.silla(0x6d4c41); s.position.set(x + dx, 0, z); s.rotation.y = dx > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(s);
            if (Math.random() < 0.5) { const p = M.persona(); M.sentar(p); p.position.set(x + dx * 1.05, 0, z); p.rotation.y = s.rotation.y; scene.add(p); R.esperando.push(p); }
          }
          R.obstaculos.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 0.5, z1: z + 0.5 });
        }
      }
      // Trabajadores detrás del mesón
      const total = Math.min(empleados, 4);
      for (let i = 0; i < total; i++) {
        const p = M.persona({ ropa: 0x2b2b2b });
        p.position.set(-1.8 + i * 1.2, 0, -4.4); scene.add(p); R.npcs.push(p);
      }
      const titulo = M.letrero(info.empresa, 6, 0.8, { fondo: '#222222', colorTexto: '#ffd24a' });
      titulo.material.emissiveIntensity = 0.5;
      titulo.position.set(0, 3.3, -D / 2 + 0.12); scene.add(titulo);
      R.clientes = true;
    } else {
      const aviso = M.letrero(estado === 'arrendado' ? 'EN HABILITACIÓN' : '', 4, 0.6, { fondo: '#ffd24a', colorTexto: '#222' });
      aviso.position.set(0, 3, -D / 2 + 0.12); scene.add(aviso);
    }
    R.reloj = reloj(scene, W / 2 - 0.12, 3, -2, -Math.PI / 2);
  }

  // ----------------------------------------------------------
  //  API
  // ----------------------------------------------------------
  M.LIMITES_INTERIOR = { x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 };

  M.crearInterior = (id, info = {}) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    const R = {
      scene, id, interactivos: [], obstaculos: [], funcionarios: [], npcs: [], esperando: [], modulos: [],
      entrada: new THREE.Vector3(0, 0, D / 2 - 1.6), pantalla: null, reloj: null, clientes: false,
    };
    R.interactivos.push({ tipo: 'salida', x: 0, z: D / 2 - 0.7, r: 0.9, texto: 'Salir a la calle' });

    if (id === 'negocio') {
      sala(scene, 0xf1ece2, info.rubro.id === 'taller' ? 'vereda' : 'madera');
      negocio(scene, R, info);
    } else {
      const l = LUGARES[id];
      if (l.interior === 'oficina' || l.interior === 'banco') {
        sala(scene, l.pared, l.interior === 'banco' ? 'baldosa' : 'baldosa');
        oficinaConFila(scene, l, R, l.interior === 'banco');
      } else if (l.interior === 'digital') {
        sala(scene, l.pared, 'baldosa');
        puntoDigital(scene, l, R);
      } else if (l.interior === 'privado') {
        sala(scene, l.pared, 'madera');
        oficinaPrivada(scene, l, R);
      } else {
        sala(scene, l.pared, 'vereda');
        bodega(scene, l, R);
      }
    }

    // Animación interna (gente que respira, mira, clientes que entran)
    let proximo = 1;
    const clientesActivos = [];
    R.animar = (dt, t, hora) => {
      if (R.reloj) R.reloj(hora);
      R.funcionarios.forEach((f, i) => { f.userData.cabeza.rotation.y = Math.sin(t * 0.6 + i * 2) * 0.35; });
      R.npcs.forEach(p => M.animarPersona(p, 0, t));
      R.esperando.forEach((p, i) => { p.userData.cabeza.rotation.y = Math.sin(t * 0.3 + i) * 0.5; p.userData.cabeza.rotation.x = 0.25 + Math.sin(t * 0.2 + i * 3) * 0.1; });
      if (R.clientes) {
        proximo -= dt;
        if (proximo <= 0 && clientesActivos.length < 4) {
          proximo = 3 + Math.random() * 4;
          const p = M.persona();
          p.position.set(0, 0, D / 2 - 1);
          p.userData.ruta = [new THREE.Vector3((Math.random() - 0.5) * 3, 0, -2.3), new THREE.Vector3((Math.random() - 0.5) * 3, 0, D / 2 - 0.8)];
          p.userData.espera = 2 + Math.random() * 2;
          scene.add(p); clientesActivos.push(p);
        }
        for (const p of clientesActivos.slice()) {
          const u = p.userData, dest = u.ruta[0];
          const dx = dest.x - p.position.x, dz = dest.z - p.position.z, dist = Math.hypot(dx, dz);
          if (dist < 0.1) {
            if (u.ruta.length === 2) { u.espera -= dt; M.animarPersona(p, 0, t); if (u.espera <= 0) { u.ruta.shift(); if (R.alVender) R.alVender(); } continue; }
            scene.remove(p); clientesActivos.splice(clientesActivos.indexOf(p), 1); continue;
          }
          p.position.x += dx / dist * 1.4 * dt; p.position.z += dz / dist * 1.4 * dt;
          p.rotation.y = Math.atan2(dx, dz);
          M.animarPersona(p, 1, t);
        }
      }
    };
    return R;
  };
})();
