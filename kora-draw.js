// Dibujos a mano alzada en canvas: Kora, la pata de pollo y todo lo que ella no quiere comer.
// El trazo «hierve» (cambia apenas 8 veces por segundo) y el relleno va corrido del contorno, como una risografía.

export const INK = '#211c18';
export const C = {
  paper: '#f6eedd', caramel: '#cf8343', caramelDark: '#9a5427', white: '#fffaf0', blue: '#86bfe8', brown: '#6b3c1c',
  pink: '#ef8a98', tongue: '#e86a7c', mouth: '#5b1d22', chicken: '#d9772f', chickenLight: '#f2ac5f', bone: '#f7efdc',
  kibble: '#8a5a2b', carrot: '#ec7a2a', leaf: '#4f8a3c', broccoli: '#5c9a44', stem: '#a9cf73', worm: '#c3d872',
  bag: '#ead9b5', red: '#d2452c', green: '#3e6b4f'
};

// Ruido determinista para que el temblor sea estable dentro de cada «cuadro».
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class Pen {
  constructor(ctx) {
    this.ctx = ctx;
    this.frame = 0;
    this.amp = 1;
    this.seed = 0;
  }
  // Avanza el cuadro del temblor (8 fps).
  tick(time) { this.frame = Math.floor(time / 125); }
  j(i) { return (hash(i + this.frame * 13.7 + this.seed * 7.1) - 0.5) * 2 * this.amp; }

  // Curva cerrada suave (Catmull-Rom) por una lista de puntos, con temblor.
  blob(points, {fill, stroke = INK, width = 3, offset = [0, 0], closed = true} = {}) {
    const ctx = this.ctx;
    const pts = points.map(([x, y], i) => [x + this.j(i * 2.3), y + this.j(i * 3.1 + 1)]);
    const path = () => {
      ctx.beginPath();
      const n = pts.length;
      const get = k => pts[closed ? (k + n) % n : Math.max(0, Math.min(n - 1, k))];
      ctx.moveTo(pts[0][0], pts[0][1]);
      const last = closed ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      if (closed) ctx.closePath();
    };
    if (fill) {
      ctx.save();
      ctx.translate(offset[0], offset[1]);
      path();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    if (stroke) {
      path();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  line(points, width = 3, stroke = INK) { this.blob(points, {stroke, width, closed: false}); }
  ellipse(cx, cy, rx, ry, opts = {}, steps = 12) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    this.blob(pts, opts);
  }
}

/* ---------- Kora ---------- */
// cx, cy: centro de la cabeza. s: ancho de la cabeza en px.
// state: {mouth 0..1, blink 0..1, puaj bool, happy 0..1, wag radianes, tongue bool, look -1..1}
export function drawKora(pen, cx, cy, s, state = {}) {
  const ctx = pen.ctx;
  const {mouth = 0, blink = 0, puaj = false, happy = 0, wag = 0, look = 0, body = true} = state;
  const w = Math.max(2, s * 0.028);
  const off = [s * 0.018, s * 0.014];
  const P = (x, y) => [cx + x * s, cy + y * s];
  pen.amp = s * 0.006;

  ctx.save();
  if (body) {
    // Cola (detrás del cuerpo): se mueve con wag.
    ctx.save();
    ctx.translate(...P(0.22, 0.86));
    ctx.rotate(-0.5 + Math.sin(wag) * 0.45);
    const t = (x, y) => [x * s, y * s];
    pen.blob([t(0, 0), t(0.12, -0.08), t(0.3, -0.12), t(0.46, -0.2), t(0.52, -0.08), t(0.4, 0.02), t(0.2, 0.06)],
      {fill: C.caramel, width: w, offset: off});
    pen.blob([t(0.4, -0.17), t(0.52, -0.2), t(0.56, -0.1), t(0.46, -0.04)], {fill: C.white, width: w * 0.8});
    ctx.restore();

    // Cuerpo sentado de frente: pecho blanco, costados caramelo, patitas.
    pen.blob([P(-0.26, 0.38), P(0.26, 0.38), P(0.34, 0.7), P(0.32, 0.96), P(0, 1.0), P(-0.32, 0.96), P(-0.34, 0.7)],
      {fill: C.caramel, width: w, offset: off});
    pen.blob([P(-0.13, 0.4), P(0.13, 0.4), P(0.17, 0.7), P(0.12, 0.95), P(-0.12, 0.95), P(-0.17, 0.7)],
      {fill: C.white, stroke: null});
    pen.line([P(-0.13, 0.5), P(-0.16, 0.72), P(-0.12, 0.92)], w * 0.6);
    pen.line([P(0.13, 0.5), P(0.16, 0.72), P(0.12, 0.92)], w * 0.6);
    pen.ellipse(cx - s * 0.13, cy + s * 0.98, s * 0.11, s * 0.065, {fill: C.white, width: w, offset: off}, 9);
    pen.ellipse(cx + s * 0.13, cy + s * 0.98, s * 0.11, s * 0.065, {fill: C.white, width: w, offset: off}, 9);
    pen.line([P(-0.15, 0.96), P(-0.15, 1.01)], w * 0.6);
    pen.line([P(0.11, 0.96), P(0.11, 1.01)], w * 0.6);
  }

  // Orejas semicaídas: se levantan cuando está contenta.
  const lift = happy * 0.12;
  const ear = side => {
    const k = side;
    // Sube desde la cabeza y la punta se dobla hacia afuera y abajo.
    pen.blob([P(k * 0.12, -0.38), P(k * 0.28, -0.6 - lift), P(k * (0.5 + lift), -0.66 - lift * 0.8),
      P(k * (0.68 + lift * 0.3), -0.5 - lift), P(k * 0.62, -0.3 - lift * 0.4), P(k * 0.44, -0.18)],
      {fill: C.caramelDark, width: w, offset: off});
    pen.blob([P(k * 0.26, -0.4), P(k * 0.34, -0.56 - lift), P(k * (0.5 + lift), -0.58 - lift * 0.8), P(k * 0.48, -0.32)],
      {fill: C.caramel, stroke: null});
  };
  ear(-1);
  ear(1);

  // Cabeza.
  const head = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const sn = Math.sin(a);
    head.push(P(0.48 * Math.cos(a) * (1 - 0.14 * Math.max(0, sn)), 0.42 * sn + 0.05 * Math.max(0, sn)));
  }
  pen.blob(head, {fill: puaj ? '#e6efc4' : C.white, stroke: null, offset: off});
  // Manchas caramelo a los lados, con la franja blanca al medio (recortadas a la cabeza).
  ctx.save();
  ctx.beginPath();
  head.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.clip();
  pen.blob([P(-0.6, -0.5), P(-0.09, -0.5), P(-0.07, -0.22), P(-0.12, 0.0), P(-0.24, 0.1), P(-0.44, 0.12), P(-0.6, 0.0)],
    {fill: C.caramel, stroke: null});
  pen.blob([P(0.6, -0.5), P(0.1, -0.5), P(0.08, -0.24), P(0.13, -0.02), P(0.27, 0.08), P(0.46, 0.08), P(0.6, 0.0)],
    {fill: C.caramel, stroke: null});
  ctx.restore();
  pen.blob(head, {stroke: INK, width: w});

  // Cachetes.
  ctx.globalAlpha = 0.55;
  pen.ellipse(cx - s * 0.3, cy + s * 0.14, s * 0.07, s * 0.04, {fill: C.pink, stroke: null}, 8);
  pen.ellipse(cx + s * 0.3, cy + s * 0.14, s * 0.07, s * 0.04, {fill: C.pink, stroke: null}, 8);
  ctx.globalAlpha = 1;

  // Ojos: el izquierdo (para quien mira) marrón y el derecho celeste, como los de verdad.
  const eye = (x, iris) => {
    const ex = cx + x * s + look * s * 0.02, ey = cy - s * 0.06;
    if (puaj) {
      pen.line([[ex - s * 0.05, ey - s * 0.04], [ex + s * 0.04, ey], [ex - s * 0.05, ey + s * 0.04]].map(([a, b]) => x > 0 ? [2 * ex - a, b] : [a, b]), w);
      return;
    }
    if (blink > 0.5 || happy > 0.8) {
      pen.line([[ex - s * 0.06, ey + s * 0.01], [ex, ey - s * 0.04 * (happy > 0.8 ? 1 : -0.2)], [ex + s * 0.06, ey + s * 0.01]], w);
      return;
    }
    pen.ellipse(ex, ey, s * 0.07, s * 0.075, {fill: iris, width: w, offset: [s * 0.01, s * 0.008]}, 10);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + look * s * 0.012, ey + s * 0.005, s * 0.036, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + s * 0.022, ey - s * 0.025, s * 0.016, 0, Math.PI * 2);
    ctx.fill();
  };
  eye(-0.19, C.brown);
  eye(0.19, C.blue);

  // Hocico, nariz y boca.
  pen.line([P(-0.17, 0.2), P(-0.1, 0.3), P(0.1, 0.3), P(0.17, 0.2)], w * 0.7);
  if (mouth > 0.05) {
    const h = 0.05 + mouth * 0.17;
    pen.blob([P(-0.12, 0.2), P(0.12, 0.2), P(0.1, 0.2 + h), P(0, 0.22 + h * 1.15), P(-0.1, 0.2 + h)],
      {fill: C.mouth, width: w, offset: [0, 0]});
    pen.blob([P(-0.07, 0.2 + h * 0.6), P(0.07, 0.2 + h * 0.6), P(0.05, 0.21 + h), P(-0.05, 0.21 + h)], {fill: C.tongue, stroke: null});
  } else {
    pen.line([P(0, 0.13), P(0, 0.2)], w * 0.8);
    pen.line([P(-0.1, 0.2), P(-0.05, 0.235), P(0, 0.2), P(0.05, 0.235), P(0.1, 0.2)], w * 0.8);
    if (happy > 0.3 && !puaj) {
      pen.blob([P(0.0, 0.215), P(0.08, 0.215), P(0.09, 0.33), P(0.045, 0.37), P(0.0, 0.33)], {fill: C.tongue, width: w * 0.8});
    }
  }
  if (puaj) pen.line([P(-0.08, 0.27), P(-0.03, 0.25), P(0.02, 0.28), P(0.08, 0.25)], w * 0.8);
  pen.blob([P(-0.085, 0.07), P(0.085, 0.07), P(0.06, 0.13), P(0, 0.15), P(-0.06, 0.13)], {fill: INK, width: w});
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.03, cy + s * 0.09, s * 0.022, s * 0.011, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- Comida ---------- */
// Todas centradas en (x, y) con tamaño u (≈ diámetro), rotación r.
function withTransform(ctx, x, y, r, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  fn();
  ctx.restore();
}

export function drawDrumstick(pen, x, y, u, r = -0.6) {
  const w = Math.max(1.6, u * 0.04), off = [u * 0.03, u * 0.025];
  pen.amp = u * 0.008;
  withTransform(pen.ctx, x, y, r, () => {
    const p = (a, b) => [a * u, b * u];
    // Hueso.
    pen.blob([p(0.05, -0.06), p(0.36, -0.05), p(0.36, 0.05), p(0.05, 0.06)], {fill: C.bone, width: w, offset: off});
    pen.ellipse(0.42 * u, -0.07 * u, 0.075 * u, 0.07 * u, {fill: C.bone, width: w, offset: off}, 8);
    pen.ellipse(0.42 * u, 0.07 * u, 0.075 * u, 0.07 * u, {fill: C.bone, width: w, offset: off}, 8);
    // Carne.
    pen.blob([p(-0.48, 0), p(-0.42, -0.2), p(-0.24, -0.28), p(-0.04, -0.2), p(0.14, -0.08), p(0.16, 0.06), p(-0.02, 0.2),
      p(-0.24, 0.28), p(-0.42, 0.2)], {fill: C.chicken, width: w, offset: off});
    pen.line([p(-0.36, -0.14), p(-0.24, -0.2), p(-0.12, -0.16)], w * 0.9, C.chickenLight);
    pen.ctx.fillStyle = C.caramelDark;
    for (const [a, b] of [[-0.3, 0.06], [-0.18, 0.12], [-0.08, 0.0], [-0.34, -0.04]]) {
      pen.ctx.beginPath();
      pen.ctx.arc(a * u, b * u, u * 0.018, 0, Math.PI * 2);
      pen.ctx.fill();
    }
  });
}

export function drawKibble(pen, x, y, u, r = 0) {
  const w = Math.max(1.6, u * 0.045);
  pen.amp = u * 0.01;
  withTransform(pen.ctx, x, y, r, () => {
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, k = 0.3 + (i % 2) * 0.05;
      pts.push([Math.cos(a) * u * k, Math.sin(a) * u * k * 0.9]);
    }
    pen.blob(pts, {fill: C.kibble, width: w, offset: [u * 0.03, u * 0.03]});
    pen.ellipse(0, 0, u * 0.08, u * 0.07, {fill: '#5c3a1a', width: w * 0.7}, 7);
    pen.ctx.fillStyle = '#c99358';
    for (const [a, b] of [[-0.16, -0.12], [0.14, -0.14], [0.17, 0.12], [-0.12, 0.15]]) {
      pen.ctx.beginPath();
      pen.ctx.arc(a * u, b * u, u * 0.022, 0, Math.PI * 2);
      pen.ctx.fill();
    }
  });
}

export function drawBag(pen, x, y, u, r = 0) {
  const w = Math.max(1.6, u * 0.04);
  pen.amp = u * 0.008;
  withTransform(pen.ctx, x, y, r, () => {
    const p = (a, b) => [a * u, b * u];
    pen.blob([p(-0.28, -0.32), p(0.28, -0.32), p(0.33, 0.4), p(-0.33, 0.4)], {fill: C.bag, width: w, offset: [u * 0.03, u * 0.03]});
    pen.line([p(-0.28, -0.24), p(0.28, -0.24)], w * 0.8);
    pen.line([p(-0.2, -0.4), p(-0.1, -0.32)], w * 0.8);
    pen.blob([p(-0.22, -0.08), p(0.22, -0.08), p(0.22, 0.26), p(-0.22, 0.26)], {fill: C.red, width: w * 0.8});
    // Huesito en la etiqueta.
    pen.line([p(-0.1, 0.09), p(0.1, 0.09)], w * 1.2, C.bone);
    pen.ctx.font = `700 ${u * 0.1}px "Bricolage Grotesque", sans-serif`;
    pen.ctx.fillStyle = INK;
    pen.ctx.textAlign = 'center';
    pen.ctx.fillText('BALANC.', 0, u * 0.36);
  });
}

export function drawCarrot(pen, x, y, u, r = 0) {
  const w = Math.max(1.6, u * 0.04);
  pen.amp = u * 0.008;
  withTransform(pen.ctx, x, y, r + 0.5, () => {
    const p = (a, b) => [a * u, b * u];
    pen.line([p(0, -0.3), p(-0.1, -0.5)], w * 1.4, C.leaf);
    pen.line([p(0, -0.3), p(0.02, -0.52)], w * 1.4, C.leaf);
    pen.line([p(0, -0.3), p(0.12, -0.48)], w * 1.4, C.leaf);
    pen.blob([p(-0.14, -0.3), p(0.14, -0.3), p(0.05, 0.2), p(0, 0.46), p(-0.05, 0.2)], {fill: C.carrot, width: w, offset: [u * 0.03, u * 0.02]});
    pen.line([p(-0.08, -0.12), p(0.0, -0.1)], w * 0.7);
    pen.line([p(0.02, 0.06), p(0.08, 0.08)], w * 0.7);
  });
}

export function drawBroccoli(pen, x, y, u, r = 0) {
  const w = Math.max(1.6, u * 0.04);
  pen.amp = u * 0.008;
  withTransform(pen.ctx, x, y, r, () => {
    const p = (a, b) => [a * u, b * u];
    pen.blob([p(-0.08, 0.0), p(0.08, 0.0), p(0.1, 0.4), p(-0.1, 0.4)], {fill: C.stem, width: w, offset: [u * 0.02, u * 0.02]});
    for (const [a, b, rr] of [[-0.2, -0.08, 0.17], [0.2, -0.08, 0.17], [0, -0.22, 0.2], [0, 0.0, 0.15]]) {
      pen.ellipse(a * u, b * u, rr * u, rr * u * 0.92, {fill: C.broccoli, width: w, offset: [u * 0.03, u * 0.02]}, 9);
    }
  });
}

export function drawWorm(pen, x, y, u, r = 0, t = 0) {
  const w = Math.max(1.6, u * 0.04);
  pen.amp = u * 0.008;
  withTransform(pen.ctx, x, y, r, () => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      pts.push([(k - 0.5) * u * 0.9, Math.sin(k * 6 + t * 8) * u * 0.1]);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const [a, b] = pts[i];
      pts.push([a, b + u * (0.24 - 0.1 * Math.abs(i / 8 - 0.5))]);
    }
    pen.blob(pts.map(([a, b]) => [a, b - u * 0.08]), {fill: C.worm, width: w, offset: [u * 0.03, u * 0.02]});
    // Carita de parasitito.
    const hx = -u * 0.32, hy = pts[1][1] - u * 0.01;
    pen.ctx.fillStyle = INK;
    pen.ctx.beginPath();
    pen.ctx.arc(hx, hy - u * 0.02, u * 0.025, 0, Math.PI * 2);
    pen.ctx.arc(hx + u * 0.08, hy - u * 0.02, u * 0.025, 0, Math.PI * 2);
    pen.ctx.fill();
    pen.line([[hx - u * 0.02, hy - u * 0.08], [hx - u * 0.06, hy - u * 0.18]], w * 0.8);
    pen.line([[hx + u * 0.08, hy - u * 0.08], [hx + u * 0.1, hy - u * 0.18]], w * 0.8);
  });
}

// Pollo asado con alitas: la «nave madre» que cruza arriba tirando patitas.
export function drawRoast(pen, x, y, u, flap = 0) {
  const w = Math.max(1.6, u * 0.035);
  pen.amp = u * 0.006;
  withTransform(pen.ctx, x, y, 0, () => {
    const p = (a, b) => [a * u, b * u];
    // Alitas.
    const f = Math.sin(flap) * 0.14;
    pen.blob([p(-0.2, -0.12), p(-0.46, -0.34 - f), p(-0.6, -0.18 - f), p(-0.34, -0.02)], {fill: '#fff', width: w});
    pen.blob([p(0.2, -0.12), p(0.46, -0.34 - f), p(0.6, -0.18 - f), p(0.34, -0.02)], {fill: '#fff', width: w});
    pen.blob([p(-0.4, 0), p(-0.3, -0.18), p(0, -0.24), p(0.3, -0.18), p(0.4, 0), p(0.3, 0.16), p(0, 0.2), p(-0.3, 0.16)],
      {fill: C.chicken, width: w, offset: [u * 0.02, u * 0.02]});
    pen.line([p(-0.2, -0.12), p(0, -0.16), p(0.16, -0.12)], w, C.chickenLight);
    // Muslitos para arriba con su hueso.
    for (const k of [-1, 1]) {
      pen.blob([p(k * 0.22, -0.1), p(k * 0.3, -0.28), p(k * 0.36, -0.32), p(k * 0.36, -0.12)], {fill: C.chicken, width: w});
      pen.ellipse(k * 0.35 * u, -0.36 * u, 0.045 * u, 0.045 * u, {fill: C.bone, width: w * 0.8}, 7);
    }
  });
}

export const FOODS = {
  pollo: drawDrumstick, croqueta: drawKibble, balanceado: drawBag, zanahoria: drawCarrot, verdura: drawBroccoli, parasito: drawWorm
};

/* ---------- Persecución: Kora de perfil corriendo y el pollito que escapa ---------- */
// (x, y): punto de apoyo en el piso. u: alto aproximado. phase: ciclo del galope. dir: 1 mira a la derecha.
export function drawKoraRun(pen, x, y, u, {phase = 0, dir = 1, caught = false, still = false} = {}) {
  const ctx = pen.ctx;
  const w = Math.max(1.6, u * 0.032);
  const off = [u * 0.02, u * 0.016];
  pen.amp = u * 0.006;
  const bob = still ? 0 : -Math.abs(Math.sin(phase)) * u * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const P = (a, b) => [a * u, b * u + bob];

  const leg = (hx, angle, near) => {
    const hip = P(hx, -0.5);
    const len = 0.46 * u;
    const foot = [hip[0] + Math.sin(angle) * len, Math.min(0, hip[1] + Math.cos(angle) * len)];
    const knee = [(hip[0] + foot[0]) / 2 + u * 0.04 * Math.sign(hx), (hip[1] + foot[1]) / 2];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = u * 0.12;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...foot); ctx.stroke();
    ctx.strokeStyle = near ? C.caramel : C.caramelDark;
    ctx.lineWidth = u * 0.12 - w * 2;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...foot); ctx.stroke();
    pen.ellipse(foot[0] + u * 0.02, foot[1] - u * 0.02, u * 0.055, u * 0.04, {fill: C.white, width: w * 0.8}, 7);
  };
  const g = still ? 0 : phase;
  // Patas de atrás (lejanas primero).
  leg(-0.3, Math.sin(g + 0.5) * 0.75, false);
  leg(0.28, -Math.sin(g + 0.5) * 0.75, false);

  // Cola con punta blanca.
  const wag = Math.sin(phase * 1.6) * 0.18;
  pen.blob([P(-0.36, -0.66), P(-0.58, -0.86 - wag), P(-0.74, -1.02 - wag), P(-0.8, -0.92 - wag), P(-0.6, -0.72), P(-0.4, -0.56)],
    {fill: C.caramel, width: w, offset: off});
  pen.blob([P(-0.7, -0.98 - wag), P(-0.8, -1.04 - wag), P(-0.84, -0.94 - wag), P(-0.76, -0.9 - wag)], {fill: C.white, width: w * 0.8});

  // Cuerpo con panza y pecho blancos.
  pen.blob([P(-0.44, -0.62), P(-0.2, -0.78), P(0.2, -0.78), P(0.42, -0.66), P(0.42, -0.42), P(0.1, -0.34), P(-0.3, -0.36), P(-0.46, -0.46)],
    {fill: C.caramel, width: w, offset: off});
  pen.blob([P(0.12, -0.42), P(0.38, -0.6), P(0.44, -0.44), P(0.2, -0.35)], {fill: C.white, stroke: null});

  // Patas de adelante (cercanas).
  leg(-0.26, -Math.sin(g) * 0.8, true);
  leg(0.32, Math.sin(g) * 0.8, true);

  // Cabeza de perfil: caramelo, hocico blanco y franja blanca.
  pen.blob([P(0.3, -0.78), P(0.36, -1.02), P(0.52, -1.1), P(0.66, -1.02), P(0.84, -0.9), P(0.86, -0.8), P(0.7, -0.72), P(0.46, -0.66)],
    {fill: C.caramel, width: w, offset: off});
  pen.blob([P(0.6, -0.98), P(0.84, -0.9), P(0.86, -0.8), P(0.66, -0.74), P(0.58, -0.84)], {fill: C.white, stroke: null});
  pen.line([P(0.6, -0.98), P(0.84, -0.9)], w * 0.7);
  pen.blob([P(0.82, -0.9), P(0.89, -0.87), P(0.88, -0.81), P(0.82, -0.83)], {fill: INK, width: w * 0.6});
  // Ojo celeste (del lado que se ve).
  ctx.fillStyle = C.blue;
  ctx.beginPath(); ctx.arc(...P(0.6, -0.93), u * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(...P(0.61, -0.93), u * 0.022, 0, Math.PI * 2); ctx.fill();
  if (caught) {
    drawDrumstick(pen, 0.98 * u, -0.8 * u + bob, u * 0.5, 0.2);
    pen.amp = u * 0.006;
  } else {
    // Boca abierta y lengua afuera.
    pen.blob([P(0.66, -0.76), P(0.8, -0.76), P(0.74, -0.7)], {fill: C.mouth, width: w * 0.6});
    pen.blob([P(0.68, -0.74), P(0.76, -0.73), P(0.74, -0.6 - (still ? 0 : Math.sin(phase * 2) * 0.03)), P(0.69, -0.62)],
      {fill: C.tongue, width: w * 0.7});
  }
  // Oreja semicaída que rebota.
  const flap = still ? 0 : Math.sin(phase + 1) * 0.06;
  pen.blob([P(0.4, -1.0), P(0.46, -1.16 - flap), P(0.34, -1.12 - flap), P(0.26, -0.96)], {fill: C.caramelDark, width: w, offset: off});
  ctx.restore();
}

// La patita de pollito escapando: hueso para arriba, ojitos y piernas finitas.
export function drawPolloRun(pen, x, y, u, {phase = 0, dir = 1, still = false, scared = 0} = {}) {
  const ctx = pen.ctx;
  const w = Math.max(1.4, u * 0.04);
  const bob = still ? 0 : -Math.abs(Math.sin(phase * 1.3)) * u * 0.1;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(dir, 1);
  pen.amp = u * 0.008;
  // Piernas.
  for (const k of [0, Math.PI]) {
    const a = still ? 0 : Math.sin(phase * 1.3 + k) * 0.6;
    const hip = [u * 0.02, -u * 0.36];
    const foot = [hip[0] + Math.sin(a) * u * 0.34, -bob];
    ctx.strokeStyle = INK;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...foot); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(foot[0], foot[1]); ctx.lineTo(foot[0] + u * 0.1, foot[1]);
    ctx.moveTo(foot[0], foot[1]); ctx.lineTo(foot[0] + u * 0.07, foot[1] - u * 0.05);
    ctx.stroke();
  }
  // La pata en sí, con el hueso apuntando arriba y atrás.
  drawDrumstick(pen, -u * 0.08, -u * 0.62, u * 0.82, -2.15);
  pen.amp = u * 0.008;
  // Ojitos asustados mirando para atrás.
  for (const ex of [0.06, 0.2]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex * u, -0.58 * u, u * 0.065, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = w * 0.7; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(ex * u - u * 0.025, -0.58 * u, u * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  // Gotitas de transpiración.
  if (!still || scared) {
    ctx.fillStyle = C.blue;
    for (const [dx, dy, r] of [[-0.42, -0.9, 0.05], [-0.52, -0.72, 0.04]]) {
      ctx.beginPath(); ctx.ellipse(dx * u, dy * u, r * u * 0.7, r * u, -0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Huella de patita (para el rastro).
export function drawPawPrint(ctx, x, y, r, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  for (const [a, b] of [[-0.62, -0.25], [-0.22, -0.62], [0.22, -0.62], [0.62, -0.25]]) {
    ctx.moveTo(a * r + r * 0.22, b * r);
    ctx.ellipse(a * r, b * r, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}
