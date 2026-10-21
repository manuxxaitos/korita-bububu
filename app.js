// Director de la página: juego de entrada → regalo, y todo lo interactivo de cada capítulo.
import {createGame} from './game.js';
import {Pen, drawKora} from './kora-draw.js';
import {createChase} from './chase.js';
import {createMusic} from './music.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const loading = window.koraLoading;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const STORE = 'kora-regalo-abierto';
const small = matchMedia('(max-width: 760px)');
// Las fotos que se cambian por código usan la versión liviana (-sm) en el celular.
function setPhoto(img, src) {
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.src = small.matches ? src.replace(/\.webp$/, '-sm.webp') : src;
}
const music = createMusic();
const state = {paused: reduced, pollo: null, gateOpen: true};

/* ============ Pantalla de juego y regalo ============ */
const gate = $('#gate');
const cards = {intro: $('#card-intro'), win: $('#card-win'), back: $('#card-back')};
const slots = $$('.slot');
const game = createGame({
  canvas: $('#game'), reducedMotion: reduced,
  onEat(n) {
    slots.forEach((slot, i) => slot.classList.toggle('is-full', i < n));
    $('#eaten').textContent = n;
  },
  onWin({puajs}) {
    remember();
    $('#win-text').textContent = puajs === 0
      ? 'Y sin comer ni una verdura. Ahora sí: tu regalo.'
      : `Me comí ${puajs === 1 ? 'una cosa fea' : puajs + ' cosas feas'} en el camino, pero valió la pena. Ahora sí: tu regalo.`;
    showCard('win');
  }
});

function remember() { try { localStorage.setItem(STORE, '1'); } catch {} }
function remembered() { try { return localStorage.getItem(STORE) === '1'; } catch { return false; } }

function showCard(name) {
  for (const [key, card] of Object.entries(cards)) card.hidden = key !== name;
  const focusable = name && $('button:not([disabled])', cards[name]);
  focusable?.focus({preventScroll: true, focusVisible: false});
}

function play() {
  showCard(null);
  slots.forEach(slot => slot.classList.remove('is-full'));
  $('#eaten').textContent = '0';
  game.start();
}

// Los botones de abrir esperan a que estén todos los recuerdos.
const openButtons = [$('#open-gift'), $('#back-open')];
loading.onChange(percent => {
  for (const button of openButtons) {
    if (loading.done) {
      button.disabled = false;
      button.textContent = button.id === 'open-gift' ? 'Abrir tu regalo' : 'Ir al regalo';
    } else button.textContent = `Cargando recuerdos… ${percent}%`;
  }
});

function openGift() {
  if (!loading.done) return;
  remember();
  game.stop();
  const finish = () => {
    gate.classList.remove('is-wrapping', 'is-unwrapping');
    state.gateOpen = false;
    $('#main').removeAttribute('aria-busy');
    $('#main').inert = false;
    startPage();
  };
  if (reduced) {
    root.classList.remove('is-loading');
    finish();
    return;
  }
  gate.classList.add('is-wrapping');
  setTimeout(() => {
    root.classList.remove('is-loading');
    scrollTo(0, 0);
    gate.classList.add('is-unwrapping');
    // El display del gate depende de is-loading: lo mantenemos visible hasta que se abra el papel.
    gate.style.display = 'block';
    setTimeout(() => { gate.style.display = ''; finish(); }, 1350);
  }, 1350);
}

function reopenGate() {
  state.gateOpen = true;
  state.pollo?.setPaused(true);
  root.classList.add('is-loading');
  $('#main').inert = true;
  chase.enable(false);
  showCard('intro');
  game.idle();
}

$('#play').addEventListener('click', play);
$('#replay').addEventListener('click', play);
$('#back-play').addEventListener('click', play);
$('#skip').addEventListener('click', () => {
  game.stop();
  $('#card-win .tag').textContent = 'Juego salteado';
  $('#card-win .gate-title').textContent = 'Bueno… te lo doy igual.';
  $('#win-text').textContent = '(Pero mami me debe un pollo.)';
  showCard('win');
});
$('#open-gift').addEventListener('click', openGift);
$('#back-open').addEventListener('click', openGift);
$('#play-again').addEventListener('click', reopenGate);
$('#mute').addEventListener('click', () => music.setMuted(!music.muted));
document.addEventListener('music:change', paintSound);
function paintSound() {
  game.sound.muted = music.muted;
  $('#mute').textContent = music.muted ? 'sonido: no' : 'sonido: sí';
  $('#mute').setAttribute('aria-pressed', String(music.muted));
  const toggle = $('#music-toggle');
  toggle.setAttribute('aria-pressed', String(!music.muted));
  toggle.setAttribute('aria-label', music.muted ? 'Prender la música' : 'Apagar la música');
}
paintSound();
// La música arranca con el primer toque (los navegadores no dejan sonar antes).
// iPhone solo deja arrancar el audio en un toque completo (touchend/click), no al apoyar el dedo:
// se escucha en todos y se suelta cuando el audio ya está corriendo.
// audioSession «playback» hace que suene aunque el teléfono esté en silencio (iOS 17+).
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
const unlockEvents = ['pointerdown', 'touchend', 'click', 'keydown'];
function unlockAudio() {
  game.sound.wake();
  if (!music.muted) music.start();
  if (game.sound.ctx?.state === 'running') unlockEvents.forEach(type => removeEventListener(type, unlockAudio, true));
}
unlockEvents.forEach(type => addEventListener(type, unlockAudio, {capture: true, passive: true}));
$('#music-toggle').addEventListener('click', () => music.setMuted(!music.muted));

if (params.has('test')) window.__koraTarget = () => game.nextPollo();
window.__chase = () => chase;
$('#main').inert = true;
$('#main').setAttribute('aria-busy', 'true');
game.idle();
if (params.has('regalo')) {
  showCard(null);
  loading.ready.then(openGift);
} else showCard(remembered() ? 'back' : 'intro');

/* ============ La página ============ */
let pageStarted = false;
function startPage() {
  state.pollo?.setPaused(state.paused);
  chase.enable(true);
  // Los videos que ya estaban a la vista arrancan ahora.
  for (const video of videos) {
    const r = video.getBoundingClientRect();
    if (!state.paused && r.bottom > 0 && r.top < innerHeight) video.play().catch(() => {});
  }
  if (pageStarted) return;
  pageStarted = true;
  $('#main').focus({preventScroll: true, focusVisible: false});
}

// Entradas al hacer scroll.
const revealer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    }
  }
}, {threshold: 0.18, rootMargin: '0px 0px -6% 0px'});
$$('[data-in]').forEach(el => revealer.observe(el));

/* ---------- Videos: se reproducen a la vista, mudos; el botón da sonido a uno solo ---------- */
const videos = $$('video');
const videoIO = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target;
    if (entry.isIntersecting && !state.gateOpen && !state.paused) video.play().catch(() => {});
    else video.pause();
  }
}, {threshold: 0.25});
videos.forEach(video => videoIO.observe(video));
for (const button of $$('.sound-toggle')) {
  const video = $('video', button.closest('figure, .tv'));
  button.addEventListener('click', () => {
    const on = video.muted;
    videos.forEach(v => { v.muted = true; });
    $$('.sound-toggle').forEach(b => b.setAttribute('aria-pressed', 'false'));
    if (on) {
      video.muted = false;
      video.play().catch(() => {});
      button.setAttribute('aria-pressed', 'true');
    }
    music.duck(on);
  });
}
// Código de tiempo de la filmadora.
for (const tc of $$('[data-timecode]')) {
  const video = $('video', tc.closest('figure'));
  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    const f = Math.floor((t % 1) * 30);
    tc.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  });
}

/* ---------- La tele: canales con lluvia entre medio ---------- */
{
  const tv = $('.tv');
  const video = $('.tv-video', tv), bg = $('.tv-bg', tv), osd = $('.tv-osd', tv), title = $('.tv-title', tv);
  const noise = $('.tv-static', tv), nctx = noise.getContext('2d');
  let noiseUntil = 0;
  function snow(now) {
    const img = nctx.createImageData(noise.width, noise.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
    if (now < noiseUntil) requestAnimationFrame(snow);
    else noise.classList.remove('on');
  }
  for (const [index, button] of $$('.ch', tv).entries()) {
    button.addEventListener('click', () => {
      if (button.classList.contains('is-on')) return;
      $$('.ch', tv).forEach(b => { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); });
      button.classList.add('is-on');
      button.setAttribute('aria-pressed', 'true');
      osd.textContent = `CH 0${index + 1}`;
      noise.classList.add('on');
      noiseUntil = performance.now() + (reduced ? 0 : 420);
      requestAnimationFrame(snow);
      const muted = video.muted;
      setTimeout(() => {
        video.src = button.dataset.src + '.mp4';
        video.poster = button.dataset.src + '.webp';
        video.setAttribute('aria-label', button.dataset.label);
        bg.src = button.dataset.src + '.webp';
        title.textContent = button.dataset.title;
        video.muted = muted;
        video.play().catch(() => {});
      }, reduced ? 0 : 200);
    });
  }
}

/* ---------- Proyector de diapositivas ---------- */
{
  const mounts = $$('.mount');
  const view = $('.slide-view'), img = $('#slide-img'), cap = $('#slide-cap');
  let current = 0, touched = false, timer = 0, inView = false;
  function show(index) {
    current = index;
    const mount = mounts[index];
    mounts.forEach(m => { m.classList.toggle('is-on', m === mount); m.setAttribute('aria-pressed', String(m === mount)); });
    view.classList.add('is-changing');
    setTimeout(() => {
      setPhoto(img, mount.dataset.src);
      img.alt = mount.dataset.alt;
      cap.textContent = mount.dataset.cap;
      view.classList.remove('is-changing');
    }, reduced ? 0 : 260);
  }
  mounts.forEach((mount, index) => mount.addEventListener('click', () => { touched = true; show(index); }));
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, {threshold: 0.4}).observe($('.projector-room'));
  timer = setInterval(() => {
    if (inView && !touched && !state.paused) show((current + 1) % mounts.length);
  }, 4200);
}

/* ---------- Escritorio retro: ventanas que se arrastran ---------- */
{
  const desktop = $('#desktop');
  let z = 10;
  const front = win => { win.style.zIndex = String(++z); };
  function makeDraggable(win) {
    const header = $('header', win);
    win.addEventListener('pointerdown', () => front(win));
    header.addEventListener('pointerdown', event => {
      if (event.target.closest('.win-close')) return;
      header.setPointerCapture(event.pointerId);
      const box = desktop.getBoundingClientRect(), rect = win.getBoundingClientRect();
      const dx = event.clientX - rect.left, dy = event.clientY - rect.top;
      const move = e => {
        const x = clamp(e.clientX - box.left - dx, -rect.width * 0.6, box.width - rect.width * 0.4);
        const y = clamp(e.clientY - box.top - dy, 0, box.height - 30);
        win.style.left = (x / box.width * 100) + '%';
        win.style.top = (y / box.height * 100) + '%';
      };
      const up = () => { header.removeEventListener('pointermove', move); header.removeEventListener('pointerup', up); };
      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', up);
      header.addEventListener('pointercancel', up);
    });
    $('.win-close', win)?.addEventListener('click', () => {
      win.style.transform = 'scale(.2)';
      win.style.opacity = '0';
      setTimeout(() => win.remove(), 220);
    });
  }
  $$('.win', desktop).forEach(makeDraggable);
  for (const icon of $$('.icon', desktop)) {
    icon.addEventListener('click', () => {
      const existing = $$('.win', desktop).find(w => w.dataset.img === icon.dataset.img);
      if (existing) { front(existing); existing.classList.remove('is-opening'); void existing.offsetWidth; existing.classList.add('is-opening'); return; }
      const wins = $$('.win', desktop);
      if (wins.length >= 9) wins.sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0))[0].remove();
      const win = document.createElement('article');
      win.className = 'win is-opening';
      win.dataset.img = icon.dataset.img;
      win.style.setProperty('--x', `${Math.round(2 + Math.random() * 38)}%`);
      win.style.setProperty('--y', `${Math.round(6 + Math.random() * 36)}%`);
      win.style.setProperty('--w', `${Math.round(24 + Math.random() * 6)}%`);
      win.innerHTML = `<header><button type="button" class="win-close"></button><span></span></header><img width="1125" height="1500" alt=""><footer></footer>`;
      $('.win-close', win).setAttribute('aria-label', `Cerrar ${icon.textContent}`);
      $('span', win).textContent = icon.textContent;
      setPhoto($('img', win), `assets/img/${icon.dataset.img}.webp`);
      $('img', win).alt = icon.dataset.alt;
      $('footer', win).textContent = icon.dataset.cap;
      desktop.append(win);
      front(win);
      makeDraggable(win);
    });
  }
  const clock = $('#clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'}); };
  tick();
  setInterval(tick, 20000);
}

/* ---------- Tira de negativos que corre con el scroll ---------- */
const walks = {section: $('#paseos'), film: $('.film'), track: $('.film-track')};
$$('figcaption', walks.track).forEach((cap, i) => { cap.dataset.n = `KORA 400 ▸ ${String(i + 1).padStart(2, '0')}A`; });
function updateFilm() {
  const rect = walks.section.getBoundingClientRect();
  const p = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
  const distance = Math.max(0, walks.track.scrollWidth - walks.film.clientWidth);
  walks.track.style.transform = `translate3d(${-p * distance}px,0,0)`;
}

/* ---------- Firmar con patitas ---------- */
{
  const zone = $('#stamp-zone');
  const colors = ['#211c18', '#e8552b', '#ef8a98', '#5b6fb5'];
  let count = 0;
  zone.addEventListener('click', event => {
    const box = zone.getBoundingClientRect();
    const paw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    paw.setAttribute('viewBox', '0 0 60 60');
    paw.setAttribute('class', 'paw');
    paw.setAttribute('aria-hidden', 'true');
    paw.innerHTML = '<use href="#d-paw"/>';
    paw.style.left = (event.clientX - box.left) + 'px';
    paw.style.top = (event.clientY - box.top) + 'px';
    paw.style.fill = colors[count % colors.length];
    paw.style.rotate = `${Math.round(Math.random() * 60 - 30)}deg`;
    zone.append(paw);
    zone.classList.add('has-paws');
    if (++count > 40) zone.querySelector('.paw')?.remove();
  });
}

/* ---------- Kora dibujada (temblor a 8 cuadros por segundo) ---------- */
const doodles = $$('canvas[data-kora]').map(canvas => {
  const ctx = canvas.getContext('2d');
  const scale = Math.min(2, devicePixelRatio || 1);
  const w = canvas.width, h = canvas.height;
  canvas.width = w * scale;
  canvas.height = h * scale;
  ctx.scale(scale, scale);
  return {canvas, ctx, pen: new Pen(ctx), w, h, mini: canvas.dataset.kora === 'mini', visible: true};
});
let lastDoodle = 0;
function drawDoodles(now) {
  if (now - lastDoodle < 125) return;
  lastDoodle = now;
  for (const d of doodles) {
    if (!d.visible) continue;
    d.ctx.clearRect(0, 0, d.w, d.h);
    d.pen.tick(state.paused ? 0 : now);
    const blink = !state.paused && now % 3600 < 160 ? 1 : 0;
    if (d.mini) drawKora(d.pen, d.w / 2, d.h * 0.6, d.w * 0.62, {body: false, blink, happy: 0.4});
    else drawKora(d.pen, d.w * 0.46, d.h * 0.43, d.w * 0.58, {happy: 1, wag: state.paused ? 0 : now / 90, blink});
  }
}

/* ============ Kora persigue al pollito ============ */
const sections = $$('main > section[data-chapter]');
const chase = createChase({canvas: $('#chase-canvas'), sheets: sections, reducedMotion: reduced});
const chaseEnd = $('.chase-end');
// «Pipipipi» de pasitos: Kora alterna dos notas, el pollito hace pasitos más agudos y cortitos.
document.addEventListener('chase:step', ({detail}) => {
  if (music.muted || !game.sound.ctx || document.hidden) return;
  if (detail.who === 'kora') {
    game.sound.tone(detail.n % 2 ? 1560 : 1240, 0.045, {type: 'square', gain: 0.022, slide: -260});
  } else {
    game.sound.tone(detail.n % 2 ? 2600 : 2250, 0.03, {type: 'triangle', gain: 0.03, slide: 300});
  }
});
document.addEventListener('chase:caught', () => {
  chaseEnd.classList.add('is-caught');
  if (!game.sound.muted) { game.sound.wake(); game.sound.chomp(); }
});

/* ---------- Mensajes de Kora en la compu: aparecen de a uno, con «escribiendo…» ---------- */
{
  const body = $('.chat-body');
  const msgs = $$('.msg', body), typing = $('.typing', body);
  let started = false;
  if (!reduced) msgs.forEach(m => m.classList.add('is-hidden'));
  new IntersectionObserver(([entry], io) => {
    if (!entry.isIntersecting || started || reduced) return;
    started = true;
    io.disconnect();
    let i = 0;
    const next = () => {
      if (i >= msgs.length) { typing.hidden = true; return; }
      typing.hidden = false;
      body.append(typing);
      const wait = msgs[i].classList.contains('note') ? 500 : 650 + msgs[i].textContent.length * 18;
      setTimeout(() => {
        msgs[i].classList.remove('is-hidden');
        body.insertBefore(msgs[i], typing);
        body.scrollTop = body.scrollHeight;
        i++;
        typing.hidden = true;
        setTimeout(next, 380);
      }, wait);
    };
    setTimeout(next, 500);
  }, {threshold: 0.45}).observe($('#casa'));
}

function currentIndex() {
  const line = innerHeight * 0.4;
  let index = 0;
  sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= line) index = i; });
  return index;
}

// Teclado para presentar: AvPág/→ siguiente capítulo, RePág/← anterior.
addEventListener('keydown', event => {
  if (state.gateOpen) return;
  if (event.target.closest('input, textarea, .pollo-hit, .win, .tv-channels, .tray')) return;
  const next = {PageDown: 1, ArrowRight: 1, PageUp: -1, ArrowLeft: -1}[event.key];
  if (!next) return;
  event.preventDefault();
  const index = clamp(currentIndex() + next, 0, sections.length - 1);
  sections[index].scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
});

if (reduced) {
  root.classList.add('is-paused');
  chase.setPaused(true);
}

/* ============ Bucle ============ */
function frame(now) {
  requestAnimationFrame(frame);
  if (state.gateOpen) return;
  updateFilm();
  drawDoodles(now);
}
requestAnimationFrame(frame);
addEventListener('resize', updateFilm);

/* ============ Pata de pollo 3D ============ */
loading.track('pollo', (async () => {
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('Sin WebGL');
    const {createPollo} = await import('./pollo3d.js');
    state.pollo = createPollo({canvas: $('#pollo-canvas'), spots: $$('.pollo-spot'), reducedMotion: reduced});
    state.pollo.setPaused(true);
  } catch (error) {
    root.classList.add('no-webgl');
    throw error;
  }
})());
document.addEventListener('pollo:poke', () => {
  if (!game.sound.muted) { game.sound.wake(); game.sound.chomp(); }
});

loading.track('layout', document.fonts.ready.then(() => new Promise(requestAnimationFrame)).then(() => { updateFilm(); chase.measure(); }));
