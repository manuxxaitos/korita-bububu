// Música de fondo original, estilo «sneaky pixel»: chiptune de puntitas en la menor, con bajo staccato,
// melodía cromática y ticks de ruido. Se sintetiza en vivo con Web Audio (no hay archivo de audio).
const BPM = 116;
const STEP = 60 / BPM / 2; // corcheas
const N = name => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const semis = {C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2}[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};
// 8 compases de 8 corcheas. «.» es silencio.
const LEAD = [
  'E4 . G4 . G#4 A4 . .', 'C5 . B4 . A4 . E4 .', 'F4 . A4 . A#4 B4 . .', 'E5 . D#5 . D5 . B4 .',
  'E4 . G4 . G#4 A4 . .', 'C5 . E5 . D#5 E5 . .', 'F5 . E5 . D5 . C5 B4', 'A4 . E4 . A4 . . .'
].map(bar => bar.split(' '));
const BASS = [
  'A2 . E3 . A2 . E3 .', 'A2 . E3 . A2 . E3 .', 'D3 . A2 . D3 . A2 .', 'E2 . B2 . E2 . G#2 .',
  'A2 . E3 . A2 . E3 .', 'F2 . C3 . F2 . C3 .', 'D3 . A2 . E2 . G#2 .', 'A2 . E2 . A2 . . .'
].map(bar => bar.split(' '));

export function createMusic() {
  let ctx = null, master = null, noise = null, timer = 0, next = 0, step = 0, playing = false;
  const state = {muted: false, ducked: false};
  try { state.muted = localStorage.getItem('kora-musica') === 'no'; } catch {}

  function setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5200;
    master.connect(lowpass).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function note(freq, time, dur, type, gain) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
  function tick(time, gain) {
    const src = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    src.buffer = noise;
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    src.connect(hp).connect(g).connect(master);
    src.start(time);
    src.stop(time + 0.05);
  }

  function schedule() {
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % LEAD.length, beat = step % 8;
      const lead = LEAD[bar][beat], bass = BASS[bar][beat];
      if (lead !== '.') note(N(lead), next, STEP * 0.7, 'square', 0.045);
      if (bass !== '.') note(N(bass), next, STEP * 0.45, 'triangle', 0.16);
      if (beat % 2 === 1) tick(next, 0.03);
      if (beat === 4 && bar % 2 === 1) tick(next, 0.05);
      next += STEP;
      step++;
    }
  }

  function fade(to) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + 0.6);
  }
  function level() { return state.muted || state.ducked ? 0 : 0.9; }

  const api = {
    // Hay que llamarla desde un toque o clic (los navegadores no dejan sonar antes).
    start() {
      if (!ctx && !setup()) return;
      ctx.resume?.();
      if (!playing) {
        playing = true;
        next = ctx.currentTime + 0.08;
        timer = setInterval(schedule, 40);
      }
      fade(level());
    },
    setMuted(value) {
      state.muted = value;
      try { localStorage.setItem('kora-musica', value ? 'no' : 'si'); } catch {}
      if (!value) api.start(); else fade(0);
      document.dispatchEvent(new CustomEvent('music:change', {detail: {muted: value}}));
    },
    // Baja la música mientras suena el audio de un video.
    duck(value) { state.ducked = value; fade(level()); },
    get muted() { return state.muted; }
  };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (playing) ctx.resume();
  });
  return api;
}
