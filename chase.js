// Kora persigue al pollito por la plancha de corte, en los pasillos verdes que quedan entre lámina y lámina.
// Cada pasillo se cruza de un lado al otro (en zigzag) a medida que pasa por la pantalla; el pollito va
// adelante, cada vez más cerca. En el último, frente a la carta, Kora lo agarra.
import {Pen, drawKoraRun, drawPolloRun, drawPawPrint} from './kora-draw.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export function createChase({canvas, sheets, reducedMotion = false}) {
  const ctx = canvas.getContext('2d');
  const pen = new Pen(ctx);
  let W = 0, H = 0, dpr = 1, lanes = [], phase = 0, lastKoraX = null, polloPhase = 0, caughtAt = 0;
  // Pasitos: cada medio ciclo de patas suena un «pi» (como el de una criatura corriendo en los dibujitos).
  let koraStep = 0, polloStep = 0, lastPip = 0;
  const state = {enabled: false, paused: reducedMotion, caught: false};

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    measure();
  }

  // Pasillos en coordenadas de documento: entre el borde de abajo de una lámina y el de arriba de la siguiente.
  function measure() {
    const y0 = scrollY;
    lanes = [];
    for (let i = 0; i < sheets.length - 1; i++) {
      const a = sheets[i].getBoundingClientRect(), b = sheets[i + 1].getBoundingClientRect();
      lanes.push({y: (a.bottom + b.top) / 2 + y0, h: Math.max(40, b.top - a.bottom)});
    }
    // El último pasillo es el final de la carta: ahí termina la persecución, en el centro.
    const last = sheets[sheets.length - 1].getBoundingClientRect();
    const end = document.querySelector('.chase-end');
    const endBox = end ? end.getBoundingClientRect() : last;
    lanes.push({y: endBox.top + endBox.height * 0.58 + y0, h: endBox.height, final: true});
  }

  function size() { return W < 760 ? 62 : W < 1100 ? 84 : 108; }

  // Progreso de un pasillo según dónde está en la pantalla (abajo = empieza, arriba = terminó).
  function laneT(lane) {
    const y = lane.y - scrollY;
    if (lane.final) {
      // El último tramo termina justo al llegar al fondo de la página.
      const start = lane.y - H * 0.92;
      const doc = document.documentElement;
      const end = doc.scrollHeight - Math.max(innerHeight, doc.clientHeight) - 6;
      return clamp((scrollY - start) / Math.max(1, end - start));
    }
    return clamp((H * 0.92 - y) / (H * 0.7));
  }
  function laneX(index, t) {
    const lane = lanes[index];
    const ltr = index % 2 === 0;
    const from = ltr ? -W * 0.08 : W * 1.08;
    if (lane.final) return from + (W * 0.5 - size() * 0.6 - from) * smooth(t);
    const to = ltr ? W * 1.08 : -W * 0.08;
    return from + (to - from) * t;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!state.enabled || !lanes.length) return;
    pen.tick(state.paused ? 0 : now);
    const u = size();

    // Dónde va Kora: el último pasillo que ya empezó.
    let g = 0;
    lanes.forEach((lane, i) => { const t = laneT(lane); if (t > 0) g = i + t; });
    const total = lanes.length;
    const caught = g >= total - 0.02;
    if (caught && !state.caught) { state.caught = true; caughtAt = now; canvas.dispatchEvent(new CustomEvent('chase:caught', {bubbles: true})); }
    if (!caught) state.caught = false;

    // El pollito va adelante; la distancia se achica hasta cero en el último pasillo.
    const lead = caught ? 0 : 0.42 * Math.pow(1 - g / total, 0.7) + 0.06 * clamp(total - 1 - g);
    const p = Math.min(total - 0.0001, g + lead);

    // Rastro de huellas en los pasillos que Kora ya recorrió.
    ctx.fillStyle = 'rgba(246,238,221,.42)';
    lanes.forEach((lane, i) => {
      const y = lane.y - scrollY;
      if (y < -60 || y > H + 60 || i > Math.floor(g)) return;
      const t = i < Math.floor(g) ? 1 : laneT(lane);
      const x0 = laneX(i, 0), x1 = laneX(i, t);
      const dir = Math.sign(x1 - x0) || 1;
      const step = u * 0.42;
      const n = Math.floor(Math.abs(x1 - x0) / step);
      for (let k = 1; k < n; k++) {
        drawPawPrint(ctx, x0 + dir * k * step, y + u * 0.42 + (k % 2 ? -u * 0.12 : u * 0.06), u * 0.075, dir * Math.PI / 2);
      }
    });

    // Kora.
    const ki = Math.min(total - 1, Math.floor(g)), kt = g - ki;
    const kLane = lanes[ki], kx = laneX(ki, kt), ky = kLane.y - scrollY + u * 0.5;
    if (lastKoraX !== null && !state.paused) phase += Math.abs(kx - lastKoraX) * 0.045;
    if (phase - koraStep > Math.PI * 4) koraStep = phase - Math.PI;
    while (phase - koraStep >= Math.PI / 2) {
      koraStep += Math.PI / 2;
      if (now - lastPip > 45 && !caught) { lastPip = now; step('kora', Math.round(koraStep / (Math.PI / 2))); }
    }
    const dx = lastKoraX === null ? 0 : kx - lastKoraX;
    lastKoraX = kx;
    const kdir = ki % 2 === 0 ? 1 : -1;
    const still = Math.abs(dx) < 0.2;

    // Pollito.
    const pi = Math.floor(p), pt = p - pi;
    if (!caught) {
      const pLane = lanes[pi];
      let px = laneX(pi, pt), pdir = pi % 2 === 0 ? 1 : -1;
      // En el último tramo el pollito se frena adelante de Kora hasta que ella lo alcanza.
      if (pLane.final) px += pdir * u * 1.1 * clamp(lead / 0.08);
      const py = pLane.y - scrollY + u * 0.5;
      if (!state.paused) polloPhase += still ? 0.08 : Math.abs(dx) * 0.06 + 0.1;
      if (polloPhase - polloStep > Math.PI * 4) polloStep = polloPhase - Math.PI;
      while (polloPhase - polloStep >= Math.PI / 1.3) {
        polloStep += Math.PI / 1.3;
        // Mientras Kora está quieta el pollito trota en el lugar en silencio; solo suena cuando hay persecución.
        if (!still && py > 0 && py < H) step('pollo', Math.round(polloStep));
      }
      if (py > -u && py < H + u * 2) drawPolloRun(pen, px, py, u * 0.62, {phase: polloPhase, dir: pdir, still: state.paused});
    }
    if (ky > -u && ky < H + u * 2) {
      drawKoraRun(pen, kx, ky, u, {phase, dir: kdir, caught, still: caught || still});
      if (caught) {
        // Corazoncitos.
        const t = (now - caughtAt) / 1000;
        ctx.fillStyle = '#ef8a98';
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3) % 1;
          const hx = kx + kdir * u * (0.3 + i * 0.2), hy = ky - u * (1.3 + k * 0.8);
          ctx.globalAlpha = 1 - k;
          heart(hx, hy, u * 0.09);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
  function step(who, n) {
    canvas.dispatchEvent(new CustomEvent('chase:step', {bubbles: true, detail: {who, n}}));
  }
  function heart(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.35);
    ctx.bezierCurveTo(x - r, y - r * 0.3, x - r * 0.45, y - r, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.45, y - r, x + r, y - r * 0.3, x, y + r * 0.35);
    ctx.fill();
  }

  addEventListener('resize', resize);
  new ResizeObserver(() => measure()).observe(document.body);
  resize();
  requestAnimationFrame(frame);
  return {
    enable(value) { state.enabled = value; if (value) measure(); },
    setPaused(value) { state.paused = value; },
    measure,
    debug: () => ({lanes, W, H, scrollY, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, t: lanes.map(laneT)})
  };
}
