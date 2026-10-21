// Precarga real: fotos, fuentes, la pata de pollo 3D y la medición de la página.
// El número sigue el trabajo terminado, no hay porcentajes inventados. El juego se juega mientras tanto.
(() => {
  const number = document.querySelector('#load-number'), progress = document.querySelector('#load-progress');
  const bar = document.querySelector('#load-bar');
  const urls = [...new Set([...document.images].map(image => image.currentSrc || image.src))];
  const tasks = new Map([...urls, 'fonts', 'pollo', 'layout'].map(key => [key, false]));
  const failures = [], listeners = new Set();
  let target = 0, value = 0, last = performance.now(), frame = 0, done = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function paint(now) {
    frame = 0;
    const dt = Math.max(0, now - last);
    last = now;
    value += (target - value) * (1 - Math.exp(-dt / 120));
    if (target - value < 0.15) value = target;
    const percent = Math.floor(value);
    const finished = percent === 100 && !done;
    if (finished) {
      done = true;
      clearTimeout(timeout);
    }
    if (number.textContent !== String(percent)) {
      number.textContent = String(percent);
      progress.setAttribute('aria-valuenow', String(percent));
      bar.style.width = percent + '%';
      listeners.forEach(fn => fn(percent));
    }
    if (finished) resolveReady();
    else if (value < target) frame = requestAnimationFrame(paint);
  }
  function settle(key, error) {
    if (tasks.get(key) || done) return;
    tasks.set(key, true);
    if (error) failures.push({key, message: String(error.message || error)});
    target = Math.floor([...tasks.values()].filter(Boolean).length / tasks.size * 100);
    if (!frame) { last = performance.now(); frame = requestAnimationFrame(paint); }
  }
  function track(key, promise) {
    Promise.resolve(promise).then(() => settle(key), error => settle(key, error));
    return promise;
  }
  // Lo que falle o tarde demasiado también se resuelve: el regalo se abre igual.
  const timeout = setTimeout(() => {
    for (const [key, ok] of tasks) if (!ok) settle(key, new Error('Tiempo de carga agotado'));
  }, 45000);

  window.koraLoading = {
    track, ready, tasks, failures,
    get percent() { return Math.floor(value); },
    get done() { return done; },
    onChange(fn) { listeners.add(fn); fn(Math.floor(value)); }
  };
  for (const url of urls) {
    track(url, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.decode().then(resolve, resolve);
      image.onerror = () => reject(new Error('No se pudo cargar ' + url));
      image.src = url;
    }));
  }
  track('fonts', Promise.all(['40px Schoolbell', '40px "Instrument Serif"', 'italic 40px "Instrument Serif"', '700 20px "Bricolage Grotesque"', '20px VT323', '26px "Nanum Pen Script"', '20px Delius', '20px "Homemade Apple"']
    .map(font => document.fonts.load(font))).then(() => document.fonts.ready));
})();
