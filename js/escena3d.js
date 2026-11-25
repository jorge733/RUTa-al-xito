// ============================================================
//  RUTa al Éxito — Controlador 3D
//  Cámara en tercera persona, movimiento, entrar/salir de
//  edificios, filas con número, reloj y ciclo día/noche.
// ============================================================

const Escena3D = (() => {
  const M = M3;
  const R_CAMINAR = 24.2;
  const VELOCIDAD = 4.2;          // m/s caminando
  const VEL_RELOJ = 2;            // minutos de juego por segundo real
  const HORA_FIN_DIA = 21 * 60;

  let renderer, camera, raycaster, reloj, canvas, contenedor;
  let ok = false, cb = {};
  let ext = null, sceneExt = null, interior = null;
  let modo = 'exterior';
  let jugador, objetivo = null, accionAlLlegar = null;
  let yaw = -Math.PI / 2, pitch = 0.22, dist = 6.5;
  let tiempo = 0, acumPaso = 0, proximoCliente = 0;
  let construidoPara = null, idObjetivo = null;
  let enTransicion = false, salirPendiente = false, avisoFinDia = false;
  let fila = null;                // { lugar, letra, numero, actual, modulo, proximo, rapido }
  let promptActual = null;
  const edificios = {};
  let pickables = [];
  let npcs = [];
  const teclas = {};
  const v = new THREE.Vector3();

  // ----------------------------------------------------------
  //  Construcción del exterior
  // ----------------------------------------------------------
  function construirCiudad() {
    for (const id of Object.keys(edificios)) { sceneExt.remove(edificios[id].raiz); delete edificios[id]; }
    npcs.forEach(n => sceneExt.remove(n)); npcs = [];
    const ids = Object.keys(LUGARES).filter(id => tramitesAplicables().some(t => t.lugar === id) || id === 'sii');
    const orden = ['negocio'].concat(ids);
    const n = orden.length;
    orden.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const raiz = new THREE.Group();
      const pos = new THREE.Vector3(Math.cos(ang) * M.R_EDIF, 0, Math.sin(ang) * M.R_EDIF);
      raiz.position.copy(pos);
      raiz.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang));
      sceneExt.add(raiz);
      const e = { id, raiz, pos, ang, modelo: null, d: 8, alto: 8 };
      if (id !== 'negocio') ponerModelo(e, M.edificioLugar(id));
      const etiqueta = M.sprite(M.texturaEtiqueta('', ''), 5.2, 1.42);
      const marcador = M.sprite(M.texturaMarcador('!', '#f4b400'), 1.3, 1.3);
      marcador.visible = false;
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      haz.visible = false;
      raiz.add(etiqueta, marcador);
      sceneExt.add(haz);
      Object.assign(e, { etiqueta, marcador, haz, clave: null, simbolo: '!' });
      edificios[id] = e;
      ubicarAccesorios(e);
    });
    pickables = [];
    for (const [id, ed] of Object.entries(edificios)) ed.raiz.traverse(o => { if (o.isMesh || o.isSprite) { o.userData.lugar = id; pickables.push(o); } });
  }

  function ponerModelo(e, m) {
    if (e.modelo) e.raiz.remove(e.modelo);
    e.modelo = m.grupo; e.d = m.d; e.alto = m.alto;
    e.raiz.add(m.grupo);
    ubicarAccesorios(e);
    pickables = [];
    for (const [id, ed] of Object.entries(edificios)) ed.raiz.traverse(o => { if (o.isMesh || o.isSprite) { o.userData.lugar = id; pickables.push(o); } });
    if (!edificios[e.id]) e.raiz.traverse(o => { if (o.isMesh) { o.userData.lugar = e.id; pickables.push(o); } });
  }

  function ubicarAccesorios(e) {
    const haciaCentro = e.pos.clone().multiplyScalar(-1).normalize();
    e.puerta = e.pos.clone().add(haciaCentro.clone().multiplyScalar(e.d / 2 + 0.9));
    if (e.etiqueta) {
      e.etiqueta.position.set(0, e.alto + 1.6, 0);
      e.marcador.position.set(0, e.alto + 3.2, 0);
      e.haz.position.set(e.puerta.x, 30, e.puerta.z);
    }
  }

  // ----------------------------------------------------------
  //  Sincronización con el estado del juego
  // ----------------------------------------------------------
  function actualizar() {
    if (!ok || !G) return;
    const clave = G.rubroId + '|' + G.empresa;
    if (construidoPara !== clave) {
      construidoPara = clave;
      construirCiudad();
      if (modo === 'interior') volverAlExterior(null, true);
      jugador.position.set(0, 0, -10);
      yaw = -Math.PI / 2;
      fila = null;
    }
    for (const [id, e] of Object.entries(edificios)) {
      let titulo, sub, marca = null, colorMarca = '#f4b400';
      if (id === 'negocio') {
        const estado = G.fase === 'operacion' ? 'abierto' : hecho('arriendo') ? 'arrendado' : 'vacio';
        if (e.estado !== estado) { e.estado = estado; ponerModelo(e, M.negocio(estado, rubro(), G.empresa)); }
        titulo = `${rubro().emoji} ${G.empresa}`;
        sub = estado === 'abierto' ? 'Abierto' : estado === 'arrendado' ? 'En habilitación' : 'Sitio disponible';
        if (G.fase === 'tramites' && puedeAbrir()) marca = '★';
      } else {
        const l = LUGARES[id];
        const disp = tramitesAplicables().filter(t => t.lugar === id && estadoTramite(t) === 'disponible').length;
        const f29 = id === 'sii' && deudaF29() > 0;
        titulo = `${l.emoji} ${l.nombre.replace(' (online)', '')}`;
        sub = lugarAbierto(id) ? (disp ? `${disp} trámite${disp > 1 ? 's' : ''} pendiente${disp > 1 ? 's' : ''}` : horarioLugar(l)) : `Cerrado · ${horarioLugar(l)}`;
        if (f29) { marca = '$'; colorMarca = '#d52b1e'; } else if (disp) marca = '!';
      }
      const k = titulo + sub + marca;
      if (e.clave !== k) {
        e.clave = k;
        e.etiqueta.material.map.dispose();
        e.etiqueta.material.map = M.texturaEtiqueta(titulo, sub);
        e.etiqueta.material.needsUpdate = true;
        if (marca && marca !== e.simbolo) {
          e.marcador.material.map.dispose();
          e.marcador.material.map = M.texturaMarcador(marca, colorMarca);
          e.marcador.material.needsUpdate = true;
          e.simbolo = marca;
        }
        e.marcador.visible = !!marca;
      }
      e.haz.visible = id === idObjetivo;
    }
  }

  function setObjetivo(id) { idObjetivo = id; if (ok) Object.entries(edificios).forEach(([k, e]) => { e.haz.visible = k === id; }); }

  // ----------------------------------------------------------
  //  Entrar y salir de edificios
  // ----------------------------------------------------------
  function fundido(on) {
    const f = document.getElementById('fundido');
    if (f) f.classList.toggle('activo', on);
  }
  function transicion(fn, texto) {
    if (enTransicion) return;
    enTransicion = true;
    const f = document.getElementById('fundido');
    if (f) f.dataset.texto = texto || '';
    fundido(true);
    Audio3D.efecto('puerta');
    setTimeout(() => {
      fn();
      setTimeout(() => { fundido(false); enTransicion = false; }, 120);
    }, 380);
  }

  function intentarEntrar(id) {
    const e = edificios[id];
    if (!e) return;
    if (id === 'negocio') {
      if (e.estado === 'vacio') { cb.onInteractuar({ tipo: 'negocio' }); return; }
      transicion(() => entrarInterior('negocio'));
      return;
    }
    if (!lugarAbierto(id)) { cb.onInteractuar({ tipo: 'cerrado', lugar: id }); return; }
    transicion(() => entrarInterior(id));
  }

  function infoNegocio() {
    return { rubro: rubro(), estado: G.fase === 'operacion' ? 'abierto' : hecho('arriendo') ? 'arrendado' : 'vacio', empleados: G.empleados, equipado: hecho('equipamiento'), empresa: G.empresa };
  }

  function entrarInterior(id) {
    if (interior) liberar(interior.scene);
    interior = M.crearInterior(id, id === 'negocio' ? infoNegocio() : {});
    interior.scene.environment = sceneExt.environment;
    interior.alVender = () => { if (Math.random() < 0.6) Audio3D.efecto('caja'); };
    interior.scene.add(jugador);
    jugador.position.copy(interior.entrada);
    jugador.rotation.y = Math.PI;
    yaw = -Math.PI / 2; pitch = 0.28; dist = 4.2;
    objetivo = null; accionAlLlegar = null;
    modo = 'interior';
    if (fila && fila.lugar !== id) fila = null;
    if (fila && interior.pantalla) interior.pantalla(`${fila.letra}-${fila.actual}`, fila.modulo);
    Audio3D.ambiente('interior');
    if (cb.onCambioModo) cb.onCambioModo(modo, id);
    if (id !== 'negocio') {
      const l = LUGARES[id];
      setTimeout(() => Audio3D.hablar(l.fila ? 'Buenos días. Por favor, saque su número en el tótem.' : 'Buenos días, bienvenido.'), 500);
    }
    moverCamara(true);
  }

  function volverAlExterior(texto, inmediato) {
    const hacer = () => {
      const id = interior ? interior.id : null;
      if (interior) { liberar(interior.scene); interior = null; }
      sceneExt.add(jugador);
      const e = id && edificios[id];
      if (e) {
        jugador.position.copy(e.puerta).multiplyScalar(0.94);
        yaw = Math.atan2(e.pos.z, e.pos.x) + Math.PI;
        jugador.rotation.y = Math.atan2(-e.pos.x, -e.pos.z);
      }
      pitch = 0.22; dist = 6.5;
      modo = 'exterior';
      objetivo = null; accionAlLlegar = null;
      Audio3D.ambiente('exterior');
      if (cb.onCambioModo) cb.onCambioModo(modo, null);
      moverCamara(true);
    };
    if (inmediato) hacer(); else transicion(hacer, texto);
  }

  function liberar(scene) {
    scene.remove(jugador);
    scene.traverse(o => {
      if (o.geometry && !o.geometry.userData.compartida) o.geometry.dispose();
    });
  }

  // Salir cuando se cierren los mensajes (después de un trámite)
  function salirCuandoTermine(texto) { salirPendiente = texto || 'Al día siguiente...'; }

  // ----------------------------------------------------------
  //  Fila con número
  // ----------------------------------------------------------
  function sacarNumero() {
    const l = LUGARES[interior.id];
    if (fila && fila.lugar === interior.id) {
      cb.onAviso(`Ya tienes el número ${fila.letra}-${fila.numero}. Atendiendo: ${fila.letra}-${fila.actual}.`);
      return;
    }
    const actual = 10 + Math.floor(Math.random() * 60);
    fila = { lugar: interior.id, letra: l.letra, actual, numero: actual + 3 + Math.floor(Math.random() * 4), modulo: 1 + Math.floor(Math.random() * l.modulos), proximo: 4, rapido: false, llamado: false };
    Audio3D.efecto('totem');
    interior.pantalla(`${fila.letra}-${fila.actual}`, 1 + Math.floor(Math.random() * l.modulos));
    cb.onAviso(`🎟️ Tu número es ${fila.letra}-${fila.numero}. Están atendiendo el ${fila.letra}-${fila.actual}. Espera a que te llamen.`, 6000);
    if (cb.onFila) cb.onFila(fila);
  }

  function avanzarFila(dt) {
    if (!fila || fila.llamado || !interior || interior.id !== fila.lugar) return;
    fila.proximo -= dt;
    if (fila.proximo > 0) return;
    fila.proximo = fila.rapido ? 0.7 : 4 + Math.random() * 2;
    fila.actual++;
    G.hora += fila.rapido ? 7 : 5;
    const l = LUGARES[fila.lugar];
    if (G.hora >= l.cierra) {
      fila = null;
      cb.onInteractuar({ tipo: 'cierreAtencion', lugar: interior.id });
      return;
    }
    const llamado = fila.actual >= fila.numero;
    const mod = llamado ? fila.modulo : 1 + Math.floor(Math.random() * l.modulos);
    interior.pantalla(`${fila.letra}-${fila.actual}`, mod, llamado);
    Audio3D.efecto('ding');
    if (llamado) {
      fila.llamado = true; fila.rapido = false;
      Audio3D.hablar(`Número ${fila.letra}, ${fila.numero}. Módulo ${fila.modulo}.`, { velocidad: 0.95 });
      cb.onAviso(`🔔 ¡Te llamaron! ${fila.letra}-${fila.numero} al módulo ${fila.modulo}.`, 6000);
    }
    if (cb.onFila) cb.onFila(fila);
  }

  function esperarTurno() { if (fila && !fila.llamado) { fila.rapido = true; fila.proximo = Math.min(fila.proximo, 0.3); } }
  function terminarFila() { fila = null; if (cb.onFila) cb.onFila(null); }

  // ----------------------------------------------------------
  //  Interacciones
  // ----------------------------------------------------------
  function interactivoCercano() {
    const p = jugador.position;
    if (modo === 'exterior') {
      let mejor = null, dmin = 2.4;
      for (const [id, e] of Object.entries(edificios)) {
        const d = Math.hypot(e.puerta.x - p.x, e.puerta.z - p.z);
        if (d < dmin) { dmin = d; mejor = { tipo: 'puerta', id }; }
      }
      return mejor;
    }
    let mejor = null, dmin = Infinity;
    for (const it of interior.interactivos) {
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < it.r + 0.4 && d < dmin) { dmin = d; mejor = it; }
    }
    return mejor;
  }

  function textoInteractivo(it) {
    if (!it) return null;
    if (it.tipo === 'puerta') {
      if (it.id === 'negocio') return edificios.negocio.estado === 'vacio' ? 'Mirar el sitio' : `Entrar a ${G.empresa}`;
      const l = LUGARES[it.id];
      return lugarAbierto(it.id) ? `Entrar: ${l.nombre.replace(' (online)', '')}` : `${l.nombre.replace(' (online)', '')} (cerrado)`;
    }
    if (it.tipo === 'totem' && fila && fila.lugar === interior.id) return `Tu número: ${fila.letra}-${fila.numero}`;
    return it.texto;
  }

  function interactuar(it) {
    if (!it || enTransicion) return;
    Audio3D.iniciar();
    if (it.tipo === 'puerta') return intentarEntrar(it.id);
    if (it.tipo === 'salida') return volverAlExterior();
    if (it.tipo === 'totem') return sacarNumero();
    if (it.tipo === 'gestion') return cb.onInteractuar({ tipo: 'gestion' });
    if (it.tipo === 'modulo') {
      const l = LUGARES[interior.id];
      const hablante = l.funcionarios[it.idx] || 'Funcionario';
      if (l.fila) {
        if (!fila || fila.lugar !== interior.id) return cb.onInteractuar({ tipo: 'sinNumero', lugar: interior.id, hablante });
        if (!fila.llamado) return cb.onInteractuar({ tipo: 'noEsTuTurno', lugar: interior.id, hablante, fila });
        if (fila.modulo !== it.idx + 1) return cb.onInteractuar({ tipo: 'otroModulo', lugar: interior.id, hablante, fila });
      }
      cb.onInteractuar({ tipo: 'atencion', lugar: interior.id, hablante });
    }
  }

  // ----------------------------------------------------------
  //  Movimiento y colisiones
  // ----------------------------------------------------------
  function resolverColisiones(p) {
    if (modo === 'exterior') {
      const r = Math.hypot(p.x, p.z);
      if (r > R_CAMINAR) { p.x *= R_CAMINAR / r; p.z *= R_CAMINAR / r; }
      for (const o of ext.obstaculos) {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.3;
        if (d < min && d > 0.0001) { p.x = o.x + dx / d * min; p.z = o.z + dz / d * min; }
      }
    } else {
      const L = M.LIMITES_INTERIOR;
      p.x = Math.max(L.x0, Math.min(L.x1, p.x));
      p.z = Math.max(L.z0, Math.min(L.z1, p.z));
      for (const o of interior.obstaculos) {
        const x0 = o.x0 - 0.3, x1 = o.x1 + 0.3, z0 = o.z0 - 0.3, z1 = o.z1 + 0.3;
        if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) {
          const pen = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z];
          const m = Math.min(...pen);
          if (m === pen[0]) p.x = x0; else if (m === pen[1]) p.x = x1; else if (m === pen[2]) p.z = z0; else p.z = z1;
        }
      }
    }
  }

  // Evitar obstáculos al caminar hacia un punto (desvío tangencial simple)
  function desviar(p, dir) {
    if (modo !== 'exterior') return dir;
    for (const o of ext.obstaculos) {
      const fx = p.x + dir.x * 1.2 - o.x, fz = p.z + dir.z * 1.2 - o.z;
      if (Math.hypot(fx, fz) < o.r + 0.4) {
        const t = new THREE.Vector3(-(p.z - o.z), 0, p.x - o.x).normalize();
        if (t.dot(dir) < 0) t.multiplyScalar(-1);
        return t;
      }
    }
    return dir;
  }

  function modalAbierto() {
    const m = document.getElementById('modal');
    return (m && !m.classList.contains('oculto')) || document.body.classList.contains('cajon-abierto');
  }

  function moverJugador(dt) {
    const p = jugador.position;
    let mx = 0, mz = 0, moviendo = false;
    if (!modalAbierto() && !enTransicion) {
      let dx = 0, dz = 0;
      if (teclas.w || teclas.arrowup) dz += 1;
      if (teclas.s || teclas.arrowdown) dz -= 1;
      if (teclas.a || teclas.arrowleft) dx -= 1;
      if (teclas.d || teclas.arrowright) dx += 1;
      const fx = Math.cos(yaw), fz = Math.sin(yaw);
      if (dx || dz) {
        objetivo = null; accionAlLlegar = null;
        mx = dz * fx - dx * fz; mz = dz * fz + dx * fx;
        const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      } else if (objetivo) {
        v.set(objetivo.x - p.x, 0, objetivo.z - p.z);
        const d = v.length();
        if (d < 0.15) {
          objetivo = null;
          const acc = accionAlLlegar; accionAlLlegar = null;
          if (acc) acc();
        } else {
          v.normalize();
          const dir = desviar(p, v);
          mx = dir.x; mz = dir.z;
          // La cámara acompaña suavemente
          const deseado = Math.atan2(mz, mx);
          let dif = deseado - yaw;
          while (dif > Math.PI) dif -= Math.PI * 2;
          while (dif < -Math.PI) dif += Math.PI * 2;
          yaw += dif * Math.min(1, dt * 1.5);
        }
      }
      if (mx || mz) {
        const correr = teclas.shift ? 1.7 : 1;
        const paso = Math.min(VELOCIDAD * correr * dt, objetivo ? Math.hypot(objetivo.x - p.x, objetivo.z - p.z) : 99);
        p.x += mx * paso; p.z += mz * paso;
        const rot = Math.atan2(mx, mz);
        let dr = rot - jugador.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        jugador.rotation.y += dr * Math.min(1, dt * 12);
        moviendo = true;
        acumPaso += dt * correr;
        if (acumPaso > 0.38) { acumPaso = 0; Audio3D.paso(modo === 'interior'); }
      }
    }
    resolverColisiones(p);
    M.animarPersona(jugador, moviendo ? (teclas.shift ? 1.3 : 1) : 0, tiempo);

    // Salir caminando hacia la puerta
    if (modo === 'interior' && moviendo && mz > 0.5 && p.z > M.LIMITES_INTERIOR.z1 - 0.15 && Math.abs(p.x) < 1.2) volverAlExterior();
    // Entrar caminando hacia una puerta
    if (modo === 'exterior' && moviendo && !objetivo) {
      for (const [id, e] of Object.entries(edificios)) {
        const d = Math.hypot(e.puerta.x - p.x, e.puerta.z - p.z);
        const haciaAfuera = (mx * e.pos.x + mz * e.pos.z) > 0;
        if (d < 0.9 && haciaAfuera && e.estado !== 'vacio' && (id === 'negocio' || lugarAbierto(id))) { intentarEntrar(id); break; }
      }
    }
    // Aviso de interacción
    const it = modalAbierto() ? null : interactivoCercano();
    const texto = textoInteractivo(it);
    if (texto !== promptActual) { promptActual = texto; cb.onPrompt(texto, it); }
  }

  function irA(id) {
    if (!ok) return false;
    if (modo === 'interior') {
      if (interior.id === id) return true;
      volverAlExterior();
      setTimeout(() => irA(id), 700);
      return true;
    }
    const e = edificios[id];
    if (!e) return false;
    objetivo = e.puerta.clone().multiplyScalar(0.97);
    accionAlLlegar = () => intentarEntrar(id);
    return true;
  }

  // ----------------------------------------------------------
  //  Peatones, clientes y autos
  // ----------------------------------------------------------
  function puntoAzar() {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * (R_CAMINAR - 7);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (ext.obstaculos.every(o => Math.hypot(x - o.x, z - o.z) > o.r + 0.6)) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(6, 0, 6);
  }
  function moverNPCs(dt) {
    while (npcs.filter(n => !n.userData.cliente).length < 14) {
      const n = M.persona();
      n.position.copy(puntoAzar());
      n.userData.destino = puntoAzar();
      n.userData.vel = 1.1 + Math.random() * 0.5;
      n.userData.pausa = 0;
      npcs.push(n); sceneExt.add(n);
    }
    if (G && G.fase === 'operacion' && edificios.negocio) {
      proximoCliente -= dt;
      if (proximoCliente <= 0) {
        const s = G.ultimaSemana;
        const k = s ? clamp(s.ventas / rubro().demandaBase, 0.25, 2) : 0.5;
        proximoCliente = 3 / k;
        if (npcs.length < 26) {
          const n = M.persona();
          const a = Math.random() * Math.PI * 2;
          n.position.set(Math.cos(a) * (R_CAMINAR - 0.5), 0, Math.sin(a) * (R_CAMINAR - 0.5));
          n.userData.destino = edificios.negocio.puerta.clone().multiplyScalar(1.02);
          n.userData.cliente = true; n.userData.vel = 1.5; n.userData.pausa = 0;
          npcs.push(n); sceneExt.add(n);
        }
      }
    }
    for (const n of npcs.slice()) {
      const u = n.userData;
      if (u.pausa > 0) { u.pausa -= dt; M.animarPersona(n, 0, tiempo); continue; }
      v.set(u.destino.x - n.position.x, 0, u.destino.z - n.position.z);
      const d = v.length();
      if (d < 0.3) {
        if (u.cliente) { sceneExt.remove(n); npcs.splice(npcs.indexOf(n), 1); continue; }
        u.destino = puntoAzar();
        u.pausa = Math.random() < 0.4 ? 2 + Math.random() * 5 : 0;
        continue;
      }
      v.normalize();
      const dir = desviar(n.position, v);
      n.position.x += dir.x * u.vel * dt; n.position.z += dir.z * u.vel * dt;
      n.rotation.y = Math.atan2(dir.x, dir.z);
      M.animarPersona(n, u.vel / 1.3, tiempo);
    }
    for (const a of ext.autos) {
      const m = a.userData.mov;
      m.angulo += m.vel * dt;
      a.position.set(Math.cos(m.angulo) * m.radio, 0, Math.sin(m.angulo) * m.radio);
      a.rotation.y = Math.atan2(-Math.cos(m.angulo), -Math.sin(m.angulo)) + (m.vel < 0 ? Math.PI : 0);
    }
  }

  // ----------------------------------------------------------
  //  Cámara
  // ----------------------------------------------------------
  function moverCamara(inmediato) {
    const p = jugador.position;
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    const horiz = Math.cos(pitch) * dist, alto = Math.sin(pitch) * dist + 1.6;
    v.set(p.x - fx * horiz, p.y + alto, p.z - fz * horiz);
    if (modo === 'exterior') {
      const r = Math.hypot(v.x, v.z);
      if (r > 24.6) { v.x *= 24.6 / r; v.z *= 24.6 / r; }
    } else {
      const L = M.LIMITES_INTERIOR;
      v.x = Math.max(L.x0 - 0.2, Math.min(L.x1 + 0.2, v.x));
      v.z = Math.max(L.z0 - 0.2, Math.min(L.z1 + 0.2, v.z));
      v.y = Math.min(3.9, v.y);
    }
    if (inmediato) camera.position.copy(v); else camera.position.lerp(v, 0.15);
    camera.lookAt(p.x + fx * 2, p.y + 1.75, p.z + fz * 2);
  }

  // ----------------------------------------------------------
  //  Bucle principal
  // ----------------------------------------------------------
  function bucle() {
    requestAnimationFrame(bucle);
    if (!canvas.isConnected || !G) { reloj.getDelta(); return; }
    const dt = Math.min(reloj.getDelta(), 0.1);
    tiempo += dt;

    // Reloj del juego
    if (G.fase !== 'fin' && !modalAbierto() && !enTransicion) {
      G.hora = (G.hora ?? HORA_INICIO_DIA) + dt * VEL_RELOJ;
      if (G.hora >= HORA_FIN_DIA && !avisoFinDia) { avisoFinDia = true; cb.onInteractuar({ tipo: 'finDia' }); }
    }
    if (G.hora < HORA_FIN_DIA) avisoFinDia = false;
    if (salirPendiente && !modalAbierto() && colaModal.length === 0) {
      const t = salirPendiente; salirPendiente = false;
      if (modo === 'interior') volverAlExterior(t);
    }

    moverJugador(dt);
    if (modo === 'exterior') {
      moverNPCs(dt);
      const cielo = ext.ajustarHora(G.hora / 60, jugador.position);
      renderer.toneMappingExposure = 0.9 - cielo.noche * 0.52;
      M.ondearBandera(ext.bandera, tiempo);
      ext.chorros.forEach((c, i) => { c.material.opacity = 0.35 + Math.sin(tiempo * 7 + i) * 0.08; });
      ext.cielo.position.copy(camera.position);
      ext.estrellas.position.copy(camera.position);
      for (const e of Object.values(edificios)) {
        const d = Math.hypot(e.pos.x - jugador.position.x, e.pos.z - jugador.position.z);
        e.etiqueta.material.opacity = clamp(1.4 - (d - 9) / 12, 0.0, 1);
        if (e.marcador.visible) e.marcador.position.y = e.alto + 3.2 + Math.sin(tiempo * 3) * 0.25;
        if (e.haz.visible) e.haz.material.opacity = 0.12 + Math.sin(tiempo * 2.5) * 0.05;
      }
      moverCamara(false);
      renderer.render(sceneExt, camera);
    } else {
      avanzarFila(dt);
      renderer.toneMappingExposure = 1.0;
      interior.animar(dt, tiempo, G.hora);
      moverCamara(false);
      renderer.render(interior.scene, camera);
    }
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
  //  Entrada (mouse, toque, teclado)
  // ----------------------------------------------------------
  function configurarEntrada() {
    let inicio = null, arrastrando = false;
    canvas.addEventListener('pointerdown', ev => {
      inicio = { x: ev.clientX, y: ev.clientY, yaw, pitch };
      arrastrando = false;
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', ev => {
      if (!inicio) return;
      const dx = ev.clientX - inicio.x, dy = ev.clientY - inicio.y;
      if (!arrastrando && Math.hypot(dx, dy) > 6) arrastrando = true;
      if (arrastrando) {
        yaw = inicio.yaw + dx * 0.006;
        pitch = clamp(inicio.pitch + dy * 0.004, 0.05, 1.25);
      }
    });
    canvas.addEventListener('pointerup', ev => {
      const fueClic = inicio && !arrastrando;
      inicio = null;
      if (!fueClic || modalAbierto() || enTransicion) return;
      Audio3D.iniciar();
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (modo === 'exterior') {
        const golpe = raycaster.intersectObjects(pickables, false)[0];
        if (golpe && golpe.object.userData.lugar) {
          const id = golpe.object.userData.lugar, e = edificios[id];
          if (Math.hypot(e.puerta.x - jugador.position.x, e.puerta.z - jugador.position.z) < 2) { intentarEntrar(id); return; }
          irA(id);
          return;
        }
        const s = raycaster.intersectObjects(ext.suelos, false)[0];
        if (s) { objetivo = s.point.clone(); objetivo.y = 0; accionAlLlegar = null; }
      } else {
        const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const punto = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plano, punto)) return;
        // ¿Clic cerca de algo con lo que interactuar?
        const it = interior.interactivos.find(i => Math.hypot(i.x - punto.x, i.z - punto.z) < i.r + 0.8);
        if (it) {
          objetivo = new THREE.Vector3(it.x, 0, it.z);
          accionAlLlegar = () => interactuar(it);
        } else { objetivo = punto; accionAlLlegar = null; }
      }
    });
    canvas.addEventListener('wheel', ev => {
      ev.preventDefault();
      dist = clamp(dist * (ev.deltaY > 0 ? 1.1 : 0.9), 2.2, modo === 'exterior' ? 16 : 5.5);
    }, { passive: false });
    window.addEventListener('keydown', ev => {
      if (!canvas.isConnected) return;
      const tag = (ev.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const k = ev.key.toLowerCase();
      if (modalAbierto()) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        teclas[k] = true;
        if (k !== 'shift') ev.preventDefault();
      }
      if (k === 'e' || k === 'enter' || k === ' ') { ev.preventDefault(); interactuar(interactivoCercano()); }
      if (k === 'q') yaw -= 0.25;
      if (k === 'r') yaw += 0.25;
    });
    window.addEventListener('keyup', ev => { teclas[ev.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });
    window.addEventListener('resize', ajustarTamano);
  }

  // ----------------------------------------------------------
  //  API pública
  // ----------------------------------------------------------
  function init(callbacks) {
    cb = callbacks;
    try {
      if (typeof THREE === 'undefined') return false;
      canvas = document.createElement('canvas');
      canvas.className = 'canvas3d';
      const gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });
      if (!gl) return false;
      renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    } catch (e) {
      return false;
    }
    const movil = Math.min(window.innerWidth, window.innerHeight) < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    M.setRenderer(renderer);

    sceneExt = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 1200);
    raycaster = new THREE.Raycaster();
    reloj = new THREE.Clock();
    ext = M.crearExterior(sceneExt);

    // Mapa de entorno para reflejos (vidrios, autos, agua)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const geoEnv = new THREE.SphereGeometry(50, 32, 16);
    const colEnv = [], c = new THREE.Color(), arriba = new THREE.Color(0x4a7fc0), horiz = new THREE.Color(0xdce8f0), suelo = new THREE.Color(0x6f6a5f);
    const pe = geoEnv.attributes.position;
    for (let i = 0; i < pe.count; i++) {
      const y = pe.getY(i) / 50;
      if (y >= 0) c.copy(horiz).lerp(arriba, Math.pow(y, 0.6)); else c.copy(horiz).lerp(suelo, Math.min(1, -y * 4));
      c.convertSRGBToLinear();
      colEnv.push(c.r, c.g, c.b);
    }
    geoEnv.setAttribute('color', new THREE.Float32BufferAttribute(colEnv, 3));
    envScene.add(new THREE.Mesh(geoEnv, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const solEnv = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5) }));
    solEnv.position.set(25, 35, -15);
    envScene.add(solEnv);
    sceneExt.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();

    jugador = M.persona({ ropa: 0x1f3a68, pantalon: 0x2b2b2b, piel: 0xe8b48c, pelo: 0x2a1d14, pelolargo: false });
    sceneExt.add(jugador);
    jugador.position.set(0, 0, -10);
    jugador.rotation.y = Math.PI;

    configurarEntrada();
    moverCamara(true);
    ok = true;
    bucle();
    return true;
  }

  function montar(div) {
    if (!ok || !div) return;
    contenedor = div;
    if (canvas.parentNode !== div) div.appendChild(canvas);
    ajustarTamano();
    if (typeof ResizeObserver !== 'undefined' && !div._observado) {
      div._observado = true;
      new ResizeObserver(ajustarTamano).observe(div);
    }
    if (modo === 'exterior') Audio3D.ambiente('exterior');
  }

  function refrescarInterior() {
    if (modo === 'interior' && interior && interior.id === 'negocio') {
      const pos = jugador.position.clone();
      entrarInterior('negocio');
      jugador.position.copy(pos);
    }
  }

  return {
    init, montar, actualizar, irA, setObjetivo, salirCuandoTermine, refrescarInterior,
    esperarTurno, terminarFila, volverAlExterior: () => { if (modo === 'interior') volverAlExterior(); },
    interactuar: () => interactuar(interactivoCercano()),
    get disponible() { return ok; },
    _puerta: id => { const e = edificios[id]; jugador.position.copy(e.puerta).multiplyScalar(0.92); },
    get _debug() { return { camera, jugador, sceneExt, renderer, ext, interior }; },
    get modo() { return modo; },
    get lugarActual() { return interior ? interior.id : null; },
    get fila() { return fila; },
  };
})();
