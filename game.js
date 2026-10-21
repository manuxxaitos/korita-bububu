// «Space Invaders» al revés: Kora no dispara, come. Arriba marcha la formación de cosas que no le gustan
// (verduras, zanahorias, croquetas, balanceado, parasititos) y las va tirando. Un pollo asado con alitas
// cruza volando y suelta patitas. Cinco patitas y se abre el regalo.
import {Pen, drawKora, drawRoast, FOODS, INK} from './kora-draw.js';

const GOAL = 5;
const BAD = ['verdura', 'zanahoria', 'croqueta', 'balanceado', 'parasito'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

class Sound {
  constructor() { this.ctx = null; this.muted = false; }
  wake() {
    if (this.ctx) return this.ctx.resume?.();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }
  tone(freq, dur, {type = 'sine', gain = 0.12, slide = 0, delay = 0} = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  chomp() { this.tone(420, 0.08, {type: 'square', gain: 0.05, slide: -200}); this.tone(380, 0.09, {type: 'square', gain: 0.05, slide: -180, delay: 0.1}); }
  puaj() { this.tone(260, 0.38, {type: 'sawtooth', gain: 0.045, slide: -170}); }
  drop() { this.tone(900, 0.12, {gain: 0.03, slide: 300}); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, {type: 'triangle', gain: 0.07, delay: i * 0.11})); }
}

export function createGame({canvas, onEat = () => {}, onWin = () => {}, reducedMotion = false}) {
  const ctx = canvas.getContext('2d');
  const pen = new Pen(ctx);
  const sound = new Sound();
  const keys = new Set();
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false, clock = 0;
  let s = 120, floorY = 0;
  const game = {};

  function reset() {
    Object.assign(game, {
      phase: 'idle', eaten: 0, puajs: 0, dodged: 0, items: [], parts: [], pops: [], winAt: 0,
      kora: {x: W / 2, target: W / 2, vx: 0, stun: 0, chomp: 0, happy: 0, wag: 0, jump: 0, blink: 0, nextBlink: 2},
      form: {ox: 0, oy: 0, dir: 1, step: 0, down: 0, rising: false, alive: null},
      roast: {x: -80, dir: 1, flap: 0, nextDrop: 1.4},
      nextBad: 1.2, lastPollo: 0
    });
    buildFormation();
  }

  function layout() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(280, box.width);
    H = Math.max(360, box.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    s = clamp(Math.min(W * 0.2, H * 0.17), 76, 150);
    floorY = H - Math.max(40, H * 0.055);
    if (game.kora) {
      game.kora.x = clamp(game.kora.x, s * 0.6, W - s * 0.6);
      game.kora.target = game.kora.x;
      buildFormation(true);
    }
  }

  function buildFormation(keep = false) {
    const cols = W < 520 ? 5 : W < 900 ? 6 : 8;
    const rows = H < 560 ? 2 : 3;
    const cell = clamp(Math.min((W * 0.74) / cols, H * 0.1), 44, 88);
    const prev = keep ? game.form.alive : null;
    const alive = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = r === 0 ? (c % 2 ? 'verdura' : 'zanahoria') : r === 1 ? (c % 3 === 1 ? 'parasito' : 'croqueta') : (c % 2 ? 'balanceado' : 'croqueta');
        alive.push({r, c, type, phase: Math.random() * 6, on: prev?.find(p => p.r === r && p.c === c)?.on ?? true});
      }
    }
    Object.assign(game.form, {cols, rows, cell, alive, width: cols * cell, top: Math.max(108, H * 0.17)});
  }

  function formPos(m) {
    const f = game.form;
    const left = (W - f.width) / 2 + f.ox;
    return [left + (m.c + 0.5) * f.cell, f.top + f.oy + (m.r + 0.5) * f.cell * 0.92];
  }

  function difficulty() { return 1 + game.eaten * 0.09; }

  function spawnBad() {
    const f = game.form;
    // Como en Space Invaders, tira el de más abajo de una columna al azar.
    const cols = [...new Set(f.alive.filter(m => m.on).map(m => m.c))];
    const c = cols[Math.floor(Math.random() * cols.length)];
    const shooter = f.alive.filter(m => m.on && m.c === c).sort((a, b) => b.r - a.r)[0];
    if (!shooter) return;
    const [x, y] = formPos(shooter);
    const type = Math.random() < 0.18 ? BAD[Math.floor(Math.random() * BAD.length)] : shooter.type;
    game.items.push({type, x, y, vx: rand(-14, 14), vy: H * rand(0.26, 0.34) * difficulty(), r: rand(-0.4, 0.4), vr: rand(-2, 2),
      u: f.cell * 0.66, good: false, t: 0});
  }

  function spawnPollo(x) {
    const u = clamp(s * 0.62, 50, 86);
    game.items.push({type: 'pollo', x, y: game.form.top - u * 0.2, vx: 0, vy: H * 0.24 * difficulty(), r: -0.6, vr: rand(-1.4, 1.4),
      u, good: true, t: 0, sway: rand(0, 6)});
    game.lastPollo = 0;
    sound.drop();
  }

  function pop(text, x, y, color, size = 1) {
    game.pops.push({text, x, y, color, life: 1, size});
  }
  function burst(x, y, colors, n = 12, kind = 'dot') {
    if (reducedMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(60, 260);
      game.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: rand(0.5, 1.1), max: 1, kind,
        color: colors[i % colors.length], size: rand(3, 7), r: rand(0, 6)});
    }
  }

  /* ---------- Bucle ---------- */
  function update(dt) {
    const k = game.kora;
    clock += dt;
    k.wag += dt * (k.happy > 0.2 ? 18 : 7);
    k.nextBlink -= dt;
    if (k.nextBlink < 0) { k.blink = 0.14; k.nextBlink = rand(2, 4.5); }
    k.blink = Math.max(0, k.blink - dt);
    k.chomp = Math.max(0, k.chomp - dt);
    k.happy = Math.max(game.phase === 'won' ? 1 : 0, k.happy - dt * 0.8);

    // Movimiento: teclado acelera, el puntero marca un destino.
    const maxV = W * (k.stun > 0 ? 0.18 : 1.25);
    const dir = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    if (dir) {
      k.vx = clamp(k.vx + dir * W * 5 * dt, -maxV, maxV);
      k.target = k.x;
    } else {
      const want = clamp((k.target - k.x) * 9, -maxV, maxV);
      k.vx += (want - k.vx) * Math.min(1, dt * 14);
    }
    k.x = clamp(k.x + k.vx * dt, s * 0.55, W - s * 0.55);
    if (k.x <= s * 0.55 || k.x >= W - s * 0.55) k.vx = 0;
    k.stun = Math.max(0, k.stun - dt);
    if (game.phase === 'won') k.jump += dt;

    const f = game.form;
    if (game.phase === 'play') {
      // Marcha de la formación.
      f.step -= dt;
      if (f.step <= 0) {
        f.step = clamp(0.5 / difficulty(), 0.26, 0.5);
        const stepX = f.cell * 0.22;
        const edge = (W - f.width) / 2 - f.cell * 0.2;
        if (Math.abs(f.ox + f.dir * stepX) > edge) {
          f.dir *= -1;
          if (f.rising) { f.down -= 1; if (f.down <= 0) f.rising = false; }
          else { f.down += 1; if (f.down >= 3) f.rising = true; }
        } else f.ox += f.dir * stepX;
      }
      f.oy += (f.down * f.cell * 0.22 - f.oy) * Math.min(1, dt * 6);

      game.nextBad -= dt;
      if (game.nextBad <= 0) {
        spawnBad();
        game.nextBad = clamp(rand(0.75, 1.15) / difficulty(), 0.42, 1.2);
      }

      // El pollo volador cruza y suelta patitas.
      const ro = game.roast;
      ro.x += ro.dir * W * 0.16 * dt;
      ro.flap += dt * 16;
      if (ro.x > W + 60) ro.dir = -1;
      if (ro.x < -60) ro.dir = 1;
      ro.nextDrop -= dt;
      game.lastPollo += dt;
      const onScreen = ro.x > W * 0.08 && ro.x < W * 0.92;
      const polloFalling = game.items.some(it => it.good && !it.landed);
      if (onScreen && ro.nextDrop <= 0 && !polloFalling) {
        spawnPollo(ro.x);
        ro.nextDrop = rand(1.6, 2.6);
      }
    }

    // Comida cayendo.
    const mouthX = k.x, mouthY = headY() + s * 0.24;
    for (const it of game.items) {
      it.t += dt;
      if (it.landed) { it.life -= dt; continue; }
      it.x += (it.vx + (it.good ? Math.sin(it.t * 3 + it.sway) * 40 : 0)) * dt;
      it.y += it.vy * dt;
      it.r += it.vr * dt;
      if (it.x < it.u * 0.4 || it.x > W - it.u * 0.4) it.vx *= -1;

      if (game.phase === 'play' || game.phase === 'won') {
        if (it.good) {
          const near = Math.hypot(it.x - mouthX, it.y - mouthY);
          if (near < s * 1.5 && it.y < mouthY) k.chomp = Math.max(k.chomp, 0.12);
          if (near < s * 0.36 + it.u * 0.32 && k.stun <= 0 && game.phase === 'play') {
            it.dead = true;
            eat(it);
            continue;
          }
        } else if (game.phase === 'play') {
          const hitHead = Math.hypot(it.x - k.x, it.y - headY()) < s * 0.42 + it.u * 0.26;
          const hitBody = Math.abs(it.x - k.x) < s * 0.3 + it.u * 0.2 && it.y > headY() + s * 0.35 && it.y < headY() + s;
          if (hitHead || hitBody) {
            it.dead = true;
            yuck(it);
            continue;
          }
        }
      }
      if (it.y > floorY - it.u * 0.2) {
        it.landed = true;
        it.life = 0.9;
        it.y = floorY - it.u * 0.2;
        if (it.good) pop('¡noo!', it.x, it.y - it.u, '#c2452e', 0.7);
        else { game.dodged++; burst(it.x, it.y, ['#cdbf9f', '#b9a987'], 5); }
      }
    }
    game.items = game.items.filter(it => !it.dead && (!it.landed || it.life > 0));

    for (const p of game.parts) {
      p.life -= dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += dt * 4;
    }
    game.parts = game.parts.filter(p => p.life > 0);
    for (const p of game.pops) { p.life -= dt * 0.9; p.y -= dt * 46; }
    game.pops = game.pops.filter(p => p.life > 0);

    if (game.phase === 'won' && clock - game.winAt > 0.25 && Math.random() < dt * 6) {
      burst(rand(W * 0.1, W * 0.9), rand(H * 0.2, H * 0.5), ['#e8552b', '#f2c94c', '#5b6fb5', '#ef8a98', '#3e6b4f'], 10, 'confetti');
    }
  }

  function headY() {
    const k = game.kora;
    const hop = game.phase === 'won' ? Math.abs(Math.sin(k.jump * 7)) * s * 0.35 : 0;
    return floorY - s * 1.04 - hop;
  }

  function eat(it) {
    const k = game.kora;
    game.eaten++;
    k.chomp = 0.4;
    k.happy = 1;
    sound.chomp();
    const words = ['¡ÑAM!', '¡POLLO!', '¡ÑAM ÑAM!', '¡MÁS!', '¡ESO!'];
    pop(words[(game.eaten - 1) % words.length], k.x, headY() - s * 0.7, '#e8552b', 1);
    burst(it.x, it.y, ['#d9772f', '#f2ac5f', '#f7efdc'], 14);
    burst(k.x, headY() - s * 0.4, ['#ef8a98', '#e8552b'], 6, 'heart');
    onEat(game.eaten);
    if (game.eaten >= GOAL) win();
  }

  function yuck(it) {
    const k = game.kora;
    game.puajs++;
    k.stun = 0.95;
    k.happy = 0;
    sound.puaj();
    const word = {verdura: '¡PUAJ, VERDURA!', zanahoria: '¡ZANAHORIA NO!', croqueta: '¡PUAJ, CROQUETA!', balanceado: '¡BALANCEADO NO!', parasito: '¡UN PARASITITO!'}[it.type];
    pop(word, k.x, headY() - s * 0.75, '#3e6b4f', 0.9);
    burst(it.x, it.y, ['#a8c46a', '#cdbf9f'], 9);
  }

  function win() {
    game.phase = 'won';
    game.winAt = clock;
    sound.win();
    // La formación se espanta: todo lo feo desaparece.
    for (const it of game.items) if (!it.good) { it.dead = true; burst(it.x, it.y, ['#cdbf9f'], 4); }
    game.form.alive.forEach(m => { if (m.on) { const [x, y] = formPos(m); burst(x, y, ['#5c9a44', '#ec7a2a', '#8a5a2b'], 4); } m.on = false; });
    setTimeout(() => onWin({puajs: game.puajs, dodged: game.dodged}), 1300);
  }

  /* ---------- Dibujo ---------- */
  function draw(time) {
    pen.tick(reducedMotion ? 0 : time);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Piso a mano con pastito.
    pen.amp = 1.2;
    pen.line([[0, floorY], [W * 0.25, floorY + 2], [W * 0.5, floorY - 1], [W * 0.75, floorY + 2], [W, floorY]], 2.4);
    ctx.globalAlpha = 0.5;
    for (let x = 18; x < W; x += 46) pen.line([[x, floorY - 1], [x + 3, floorY - 9], [x + 7, floorY - 1]], 1.6);
    ctx.globalAlpha = 1;

    const f = game.form;
    if (f.alive) {
      for (const m of f.alive) {
        if (!m.on) continue;
        const [x, y] = formPos(m);
        const wob = reducedMotion ? 0 : Math.sin(time / 260 + m.phase) * 0.18;
        pen.seed = m.r * 10 + m.c;
        FOODS[m.type](pen, x, y, f.cell * 0.66, wob, time / 1000);
      }
      pen.seed = 0;
    }
    if (game.phase === 'play' || game.phase === 'idle') drawRoast(pen, game.roast.x, f.top - f.cell * 0.55, clamp(s * 0.85, 64, 110), game.roast.flap);

    for (const it of game.items) {
      ctx.globalAlpha = it.landed ? clamp(it.life / 0.9, 0, 1) : 1;
      FOODS[it.type](pen, it.x, it.y, it.u, it.r, it.t);
    }
    ctx.globalAlpha = 1;

    const k = game.kora;
    const shake = k.stun > 0 && !reducedMotion ? Math.sin(time / 30) * 3 : 0;
    // Sombrita.
    ctx.fillStyle = 'rgba(33,28,24,.12)';
    ctx.beginPath();
    ctx.ellipse(k.x, floorY + 2, s * 0.42, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    drawKora(pen, k.x + shake, headY(), s, {
      mouth: game.phase === 'won' ? 0.2 : k.chomp > 0 ? Math.min(1, k.chomp * 5) : 0,
      blink: k.blink > 0 ? 1 : 0, puaj: k.stun > 0, happy: k.happy, wag: k.wag, look: clamp(k.vx / (W * 0.6), -1, 1)
    });

    for (const p of game.parts) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      ctx.fillStyle = p.color;
      if (p.kind === 'heart') drawHeart(p.x, p.y, p.size * 1.8);
      else if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    for (const p of game.pops) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      const size = Math.round(clamp(s * 0.26, 18, 34) * p.size * (1 + (1 - p.life) * 0.15));
      ctx.font = `${size}px Schoolbell, "Comic Sans MS", cursive`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#fffaf0';
      ctx.lineJoin = 'round';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.35);
    ctx.bezierCurveTo(x - r, y - r * 0.3, x - r * 0.45, y - r, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.45, y - r, x + r, y - r * 0.3, x, y + r * 0.35);
    ctx.fill();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    draw(now);
  }

  /* ---------- Controles ---------- */
  const keyMap = {ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'};
  function onKey(event) {
    const k = keyMap[event.key];
    if (!k || !running) return;
    event.preventDefault();
    if (event.type === 'keydown') keys.add(k); else keys.delete(k);
  }
  function onPointer(event) {
    if (!running) return;
    if (event.pointerType === 'mouse' || event.buttons || event.type === 'pointerdown') {
      const box = canvas.getBoundingClientRect();
      game.kora.target = clamp(event.clientX - box.left, 0, W);
    }
  }
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture?.(event.pointerId); onPointer(event); });
  canvas.addEventListener('pointermove', onPointer);
  addEventListener('blur', () => keys.clear());
  addEventListener('resize', () => { layout(); });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  layout();
  reset();

  return {
    sound,
    // Arranca el fondo animado (formación quieta, Kora parpadeando) antes de jugar.
    idle() {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    start() {
      sound.wake();
      layout();
      reset();
      game.phase = 'play';
      running = true;
      canvas.focus({preventScroll: true});
      this.idle();
    },
    stop() {
      running = false;
      keys.clear();
      cancelAnimationFrame(raf);
      raf = 0;
    },
    // Para las pruebas automáticas (?test): x de la patita más baja.
    nextPollo() {
      const it = game.items.filter(i => i.good && !i.landed).sort((a, b) => b.y - a.y)[0];
      return it ? it.x : null;
    },
    get eaten() { return game.eaten; },
    get phase() { return game.phase; },
    goal: GOAL
  };
}
