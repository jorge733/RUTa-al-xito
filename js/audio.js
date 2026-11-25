// ============================================================
//  RUTa al Éxito — Sonido procedural (Web Audio) y voces
//  No usa archivos: todo se sintetiza en el navegador.
// ============================================================

const Audio3D = (() => {
  let ctx = null, master = null, ambienteGain = null, ambienteNodos = [];
  let modoAmbiente = null, timerAmbiente = null;
  let silencio = false;
  try { silencio = localStorage.getItem('ruta-silencio') === '1'; } catch (e) { /* nada */ }

  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = silencio ? 0 : 0.8;
    master.connect(ctx.destination);
    ambienteGain = ctx.createGain();
    ambienteGain.gain.value = 0;
    ambienteGain.connect(master);
    if (modoAmbiente) { const m = modoAmbiente; modoAmbiente = null; ambiente(m); }
  }

  function bufferRuido(seg = 2, tipo = 'blanco') {
    const n = ctx.sampleRate * seg;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (tipo === 'cafe') { ultimo = (ultimo + 0.02 * w) / 1.02; d[i] = ultimo * 3.5; }
      else d[i] = w;
    }
    return b;
  }

  function fuenteRuido(tipo, loop = true) {
    const s = ctx.createBufferSource();
    s.buffer = bufferRuido(2, tipo);
    s.loop = loop;
    return s;
  }

  // ---------- Ambientes ----------
  function ambiente(modo) {
    if (modo === modoAmbiente) return;
    modoAmbiente = modo;
    if (!ctx) return;
    const t = ctx.currentTime;
    ambienteGain.gain.cancelScheduledValues(t);
    ambienteGain.gain.setTargetAtTime(0, t, 0.2);
    const viejos = ambienteNodos;
    ambienteNodos = [];
    setTimeout(() => viejos.forEach(n => { try { n.stop(); } catch (e) { /* nada */ } }), 800);
    clearTimeout(timerAmbiente);

    if (modo === 'exterior') {
      // Rumor lejano de ciudad
      const r = fuenteRuido('cafe');
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 0.35;
      r.connect(f).connect(g).connect(ambienteGain); r.start();
      ambienteNodos.push(r);
      programar(() => Math.random() < 0.6 ? autoPasa() : pajaro(), 2500, 6000);
    } else if (modo === 'interior') {
      // Zumbido de fluorescentes + murmullo de gente
      const r = fuenteRuido('blanco');
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 450; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.025;
      lfo.connect(lfoG).connect(g.gain); lfo.start();
      r.connect(f).connect(g).connect(ambienteGain); r.start();
      const zumbido = ctx.createOscillator(); zumbido.frequency.value = 100;
      const zg = ctx.createGain(); zg.gain.value = 0.006;
      zumbido.connect(zg).connect(ambienteGain); zumbido.start();
      ambienteNodos.push(r, lfo, zumbido);
      programar(() => tosOPapel(), 4000, 9000);
    }
    ambienteGain.gain.setTargetAtTime(modo ? 1 : 0, t + 0.3, 0.6);
  }

  function programar(fn, min, max) {
    const modo = modoAmbiente;
    timerAmbiente = setTimeout(() => {
      if (modoAmbiente !== modo) return;
      fn();
      programar(fn, min, max);
    }, min + Math.random() * (max - min));
  }

  function autoPasa() {
    const t = ctx.currentTime, dur = 2.5 + Math.random() * 1.5;
    const r = fuenteRuido('cafe', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(250, t);
    f.frequency.linearRampToValueAtTime(900, t + dur / 2);
    f.frequency.linearRampToValueAtTime(250, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + dur / 2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    let n = r.connect(f).connect(g);
    if (p) { p.pan.setValueAtTime(-0.8, t); p.pan.linearRampToValueAtTime(0.8, t + dur); n = n.connect(p); }
    n.connect(ambienteGain);
    r.start(t); r.stop(t + dur + 0.1);
  }

  function pajaro() {
    const t = ctx.currentTime;
    const notas = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notas; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const g = ctx.createGain();
      const t0 = t + i * 0.13;
      const base = 2800 + Math.random() * 1500;
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.4, t0 + 0.06);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      o.connect(g).connect(ambienteGain);
      o.start(t0); o.stop(t0 + 0.12);
    }
  }

  function tosOPapel() {
    const t = ctx.currentTime;
    const r = fuenteRuido('blanco', false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    r.connect(f).connect(g).connect(ambienteGain);
    r.start(t); r.stop(t + 0.3);
  }

  // ---------- Efectos ----------
  function tono(freq, inicio, dur, vol = 0.2, tipo = 'sine') {
    if (!ctx) return;
    const t = ctx.currentTime + inicio;
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let pasoAlterno = false;
  function paso(interior) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const r = fuenteRuido('blanco', false);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = (interior ? 1800 : 900) + (pasoAlterno ? 150 : 0);
    pasoAlterno = !pasoAlterno;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(interior ? 0.12 : 0.09, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    r.connect(f).connect(g).connect(master);
    r.start(t); r.stop(t + 0.12);
  }

  const efectos = {
    puerta: () => { tono(880, 0, 0.5, 0.12); tono(660, 0.18, 0.7, 0.12); },
    ding: () => { tono(1047, 0, 0.8, 0.15); tono(784, 0.35, 1.0, 0.15); },
    totem: () => { tono(1500, 0, 0.08, 0.08, 'square'); tono(1500, 0.12, 0.08, 0.08, 'square'); },
    exito: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.09, 0.35, 0.12, 'triangle')); },
    rechazo: () => { tono(220, 0, 0.35, 0.18, 'sawtooth'); tono(165, 0.25, 0.5, 0.18, 'sawtooth'); },
    caja: () => {
      tono(2093, 0, 0.6, 0.12); tono(2637, 0.05, 0.6, 0.1);
      if (!ctx) return;
      const t = ctx.currentTime, r = fuenteRuido('blanco', false);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      r.connect(g).connect(master); r.start(t); r.stop(t + 0.2);
    },
    click: () => tono(1200, 0, 0.05, 0.05, 'square'),
  };
  function efecto(nombre) { if (ctx && efectos[nombre]) efectos[nombre](); }

  // ---------- Voces (síntesis de voz del navegador) ----------
  let voz = null;
  function elegirVoz() {
    if (!window.speechSynthesis) return null;
    const voces = speechSynthesis.getVoices();
    return voces.find(v => /es[-_]CL/i.test(v.lang)) || voces.find(v => /es[-_](419|MX|US|AR)/i.test(v.lang)) ||
      voces.find(v => /^es/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { voz = elegirVoz(); };

  function hablar(texto, { tono: pitch = 1, velocidad = 1.05 } = {}) {
    if (silencio || !window.speechSynthesis) return;
    voz = voz || elegirVoz();
    if (!voz) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto.replace(/<[^>]+>/g, ''));
    u.voice = voz; u.lang = voz.lang; u.pitch = pitch; u.rate = velocidad; u.volume = 0.9;
    speechSynthesis.speak(u);
  }
  function callar() { if (window.speechSynthesis) speechSynthesis.cancel(); }

  function alternarSilencio() {
    silencio = !silencio;
    try { localStorage.setItem('ruta-silencio', silencio ? '1' : '0'); } catch (e) { /* nada */ }
    if (master) master.gain.setTargetAtTime(silencio ? 0 : 0.8, ctx.currentTime, 0.1);
    if (silencio) callar();
    return silencio;
  }

  // El navegador exige un gesto del usuario para activar el audio
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, iniciar, { passive: true }));

  return { iniciar, ambiente, efecto, paso, hablar, callar, alternarSilencio, get silencio() { return silencio; } };
})();
