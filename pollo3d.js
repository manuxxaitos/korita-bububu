// La pata de pollo en 3D, en clave de dibujo animado: sombreado en tres tonos y contorno de tinta.
// Una sola escena fija sobre toda la página; se ubica sobre el «lugar» (.pollo-spot) que esté a la vista.
import * as THREE from 'three';

const INK = 0x211c18;

function toonRamp() {
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Ruido suave barato para la piel dorada (relieve y manchas de horno).
function noise3(x, y, z) {
  return Math.sin(x * 5.1 + Math.sin(y * 3.7)) * Math.cos(y * 4.3 + z * 2.9) * 0.5 + Math.sin(z * 6.7 + x * 2.3) * 0.25;
}

function outlined(geometry, material, thickness) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  const ink = new THREE.MeshBasicMaterial({color: INK, side: THREE.BackSide});
  ink.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed = position + normal * ${thickness.toFixed(3)};`);
  };
  group.add(mesh, new THREE.Mesh(geometry, ink));
  return group;
}

function buildDrumstick() {
  const ramp = toonRamp();
  const root = new THREE.Group();

  // Carne: perfil de gota que se afina hacia el hueso.
  const profile = [
    [0.0, -1.0], [0.2, -0.97], [0.36, -0.88], [0.47, -0.72], [0.52, -0.52], [0.51, -0.32], [0.46, -0.12],
    [0.37, 0.06], [0.27, 0.22], [0.19, 0.34], [0.14, 0.44], [0.12, 0.5]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const meatGeo = new THREE.LatheGeometry(profile, 64);
  const pos = meatGeo.attributes.position;
  const colors = [];
  const base = new THREE.Color(0xd9772f), dark = new THREE.Color(0x9a4a1c), light = new THREE.Color(0xf0a75a);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = noise3(v.x * 2, v.y * 2, v.z * 2);
    const radial = Math.hypot(v.x, v.z);
    if (radial > 0.01) {
      const k = 1 + n * 0.035 * Math.min(1, radial * 3);
      v.x *= k;
      v.z *= k;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
    const t = THREE.MathUtils.clamp(n * 0.9 + 0.5, 0, 1);
    c.copy(base).lerp(t > 0.62 ? dark : light, Math.abs(t - 0.5) * 0.9);
    colors.push(c.r, c.g, c.b);
  }
  meatGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  meatGeo.computeVertexNormals();
  const meatMat = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: ramp});
  root.add(outlined(meatGeo, meatMat, 0.028));

  // Hueso con sus dos nudos.
  const boneMat = new THREE.MeshToonMaterial({color: 0xf7efdc, gradientMap: ramp});
  const shaft = new THREE.CylinderGeometry(0.075, 0.085, 0.72, 24, 1, true);
  shaft.translate(0, 0.78, 0);
  root.add(outlined(shaft, boneMat, 0.022));
  for (const x of [-0.08, 0.08]) {
    const knob = new THREE.SphereGeometry(0.115, 24, 16);
    knob.translate(x, 1.17, 0);
    root.add(outlined(knob, boneMat, 0.022));
  }
  // Brillo de dibujo animado.
  const shine = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.32, 4, 8), new THREE.MeshBasicMaterial({color: 0xffe2b0}));
  shine.position.set(-0.27, -0.42, 0.42);
  shine.rotation.z = 0.35;
  root.add(shine);

  root.rotation.z = -0.55;
  return root;
}

export function createPollo({canvas, spots, reducedMotion = false}) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  // La escena se mide en píxeles: la pata puede tener cientos de unidades de profundidad.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  camera.position.set(0, 0, 2000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-2, 3, 4);
  scene.add(sun);

  const pivot = new THREE.Group();
  const stick = buildDrumstick();
  pivot.add(stick);
  scene.add(pivot);

  const state = {w: innerWidth, h: innerHeight, spot: null, rotY: 0, rotX: 0, velY: 0.6, drag: null, bounce: 0,
    scale: 0, visible: false, paused: reducedMotion};

  function resize() {
    state.w = innerWidth;
    state.h = innerHeight;
    renderer.setSize(state.w, state.h, false);
    camera.left = -state.w / 2;
    camera.right = state.w / 2;
    camera.top = state.h / 2;
    camera.bottom = -state.h / 2;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // El lugar más visible manda.
  const visible = new Map();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) visible.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
  }, {threshold: [0, 0.15, 0.4, 0.7, 1]});
  spots.forEach(spot => io.observe(spot));

  // Arrastrar para girar (con inercia); tocar hace que salte.
  for (const spot of spots) {
    const hit = spot.querySelector('.pollo-hit') || spot;
    hit.addEventListener('pointerdown', event => {
      hit.setPointerCapture?.(event.pointerId);
      state.drag = {x: event.clientX, y: event.clientY, moved: 0, t: performance.now()};
    });
    hit.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const dx = event.clientX - state.drag.x, dy = event.clientY - state.drag.y;
      state.drag.moved += Math.abs(dx) + Math.abs(dy);
      const now = performance.now(), dt = Math.max(8, now - state.drag.t) / 1000;
      state.drag.x = event.clientX;
      state.drag.y = event.clientY;
      state.drag.t = now;
      state.velY = THREE.MathUtils.clamp(dx * 0.012 / dt, -14, 14);
      state.rotY += dx * 0.012;
      state.rotX = THREE.MathUtils.clamp(state.rotX + dy * 0.01, -0.9, 0.9);
    });
    const end = () => {
      if (state.drag && state.drag.moved < 6) poke();
      state.drag = null;
    };
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', () => { state.drag = null; });
    hit.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') state.velY -= 2;
      else if (event.key === 'ArrowRight') state.velY += 2;
      else if (event.key === 'Enter' || event.key === ' ') poke();
      else return;
      event.preventDefault();
    });
  }
  function poke() {
    state.bounce = 1;
    state.velY += 5;
    canvas.dispatchEvent(new CustomEvent('pollo:poke', {bubbles: true}));
  }

  let last = performance.now(), raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let best = null, ratio = 0;
    for (const [spot, r] of visible) if (r > ratio) { ratio = r; best = spot; }
    const target = best && ratio > 0.1 ? 1 : 0;
    state.scale += (target - state.scale) * Math.min(1, dt * (target ? 5 : 9));
    if (best) state.spot = best;
    if (state.scale < 0.01 || !state.spot) {
      if (state.visible) { renderer.clear(); state.visible = false; }
      return;
    }
    state.visible = true;
    const box = state.spot.getBoundingClientRect();
    const size = Math.min(box.width, box.height);
    const t = now / 1000;
    if (!state.drag) {
      const idle = state.paused ? 0 : 0.55;
      state.velY += (idle - state.velY) * Math.min(1, dt * 1.6);
      state.rotY += state.velY * dt;
      state.rotX += (0 - state.rotX) * Math.min(1, dt * 1.5);
    }
    state.bounce = Math.max(0, state.bounce - dt * 2.2);
    const hop = Math.sin((1 - state.bounce) * Math.PI) * state.bounce * size * 0.12;
    const bob = state.paused ? 0 : Math.sin(t * 1.6) * size * 0.025;
    pivot.position.set(box.left + box.width / 2 - state.w / 2, state.h / 2 - (box.top + box.height / 2) + bob + hop, 0);
    const k = size * 0.4 * state.scale * (1 + state.bounce * 0.08);
    pivot.scale.setScalar(k);
    pivot.rotation.set(state.rotX, state.rotY, Math.sin(t * 1.1) * (state.paused ? 0 : 0.06));
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setPaused(value) { state.paused = value; },
    destroy() { cancelAnimationFrame(raf); io.disconnect(); renderer.dispose(); }
  };
}
