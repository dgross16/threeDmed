import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, controls;
let composer;

const SKY_RADIUS = 500;

// Axon pathway settings
const NUM_CURVES = 14;
const CURVE_POINTS = 12;
const CURVE_NOISE = 40;

// Tube thickness for neuron paths
const TUBE_RADIUS = 2.2;
const TUBE_SEGMENTS = 80;

// Pulses traveling along curves
const pulses = [];
const PULSES_PER_CURVE = 3;
const PULSE_SPEED_MIN = 0.15;
const PULSE_SPEED_MAX = 0.35;
const PULSE_SIZE = 3.5;

const curves = [];
const curveMeshes = [];

// Synapse bursts (sprites)
const bursts = [];
const MAX_BURSTS = 40;
const BURST_LIFETIME = 0.8;
const BURST_MIN_SCALE = 4;
const BURST_MAX_SCALE = 14;
const BURSTS_PER_SECOND = 10;
let burstAccumulator = 0;
let burstTexture = null;

let lastTime = performance.now() / 1000;

// ===== Click-and-drag mouse look =====
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;
let yaw = 0;   // horizontal rotation (around Y)
let pitch = 0; // vertical rotation (around X)

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 0, 0); // at center of skybox

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.4;
  document.body.appendChild(renderer.domElement);

  // Postprocessing + bloom
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.4,
    0.0
  );
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Black skybox
  const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 64, 64);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Subtle lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.25);
  dir.position.set(50, 80, 40);
  scene.add(dir);

  // OrbitControls only for zoom/damping (rotation disabled)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableRotate = false; // rotation handled manually
  controls.dampingFactor = 0.05;

  // Neuron-like curves + pulses
  createNeuronCurves();
  createPulsesOnCurves();

  // Synapse burst texture
  burstTexture = createBurstTexture();

  // === Mouse event listeners for click-and-drag look ===
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // left button only
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - prevMouseX;
    const dy = e.clientY - prevMouseY;

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    const sensitivity = 0.003;

    yaw   -= dx * sensitivity;
    pitch -= dy * sensitivity;

    // clamp pitch to avoid flipping over
    const limit = Math.PI / 2 - 0.1;
    pitch = Math.max(-limit, Math.min(limit, pitch));
  });

  window.addEventListener('resize', onWindowResize);
}

// ---------- Helpers ----------

function randomDirection() {
  const v = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  );
  return v.normalize();
}

function randomPointInSphere(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());

  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
}

// Soft circular texture for synapse bursts
function createBurstTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grd = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grd.addColorStop(0.0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0)');

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// ---------- Neuron curve pathways (TUBES) ----------

function createNeuronCurves() {
  for (let i = 0; i < NUM_CURVES; i++) {
    const start = randomPointInSphere(SKY_RADIUS * 0.35);
    const baseDir = randomDirection().multiplyScalar(
      (SKY_RADIUS * 0.7) / CURVE_POINTS
    );

    const points = [];
    let current = start.clone();

    for (let j = 0; j < CURVE_POINTS; j++) {
      const noise = new THREE.Vector3(
        (Math.random() - 0.5) * CURVE_NOISE,
        (Math.random() - 0.5) * CURVE_NOISE,
        (Math.random() - 0.5) * CURVE_NOISE
      );
      points.push(current.clone().add(noise));
      current.add(baseDir);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    curves.push(curve);

    // Tube along the curve (thicker neuron path)
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      TUBE_RADIUS,
      8,
      false
    );

    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x330055,
      transparent: true,
      opacity: 0.45
    });

    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(tubeMesh);
    curveMeshes.push(tubeMesh);
  }
}

// ---------- Pulses along curves ----------

function createPulsesOnCurves() {
  const pulseGeo = new THREE.SphereGeometry(PULSE_SIZE, 16, 16);

  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];

    for (let j = 0; j < PULSES_PER_CURVE; j++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00faff, // neon cyan
        transparent: true,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(pulseGeo, mat);

      const t0 = Math.random();
      mesh.position.copy(curve.getPoint(t0));

      const speed =
        PULSE_SPEED_MIN +
        Math.random() * (PULSE_SPEED_MAX - PULSE_SPEED_MIN);

      const flickerPhase = Math.random() * Math.PI * 2;

      scene.add(mesh);

      pulses.push({
        mesh,
        curve,
        t: t0,
        speed,
        flickerPhase
      });
    }
  }
}

// ---------- Synapse bursts (sprites on curves) ----------

function createBurst() {
  if (!curves.length || !burstTexture) return null;

  const curve = curves[Math.floor(Math.random() * curves.length)];
  const t = Math.random();
  const pos = curve.getPoint(t);

  const mat = new THREE.SpriteMaterial({
    map: burstTexture,
    color: new THREE.Color(0x00faff),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(BURST_MIN_SCALE);

  scene.add(sprite);

  return {
    sprite,
    life: BURST_LIFETIME
  };
}

// ---------- Main loop ----------

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now() / 1000;
  const dt = now - lastTime;
  lastTime = now;

  // Move pulses along neuron tubes
  for (const p of pulses) {
    p.t += p.speed * dt;
    if (p.t > 1) p.t -= 1;

    const pos = p.curve.getPoint(p.t);
    p.mesh.position.copy(pos);

    const flicker = 0.75 + 0.25 * Math.sin(now * 8 + p.flickerPhase);
    p.mesh.scale.setScalar(flicker);
    p.mesh.material.opacity = 0.5 + 0.5 * flicker;
  }

  // Update bursts (synapse flashes)
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life -= dt;

    const tLife = 1 - b.life / BURST_LIFETIME; // 0 → 1
    const scale = THREE.MathUtils.lerp(
      BURST_MIN_SCALE,
      BURST_MAX_SCALE,
      tLife
    );

    b.sprite.scale.setScalar(scale);
    b.sprite.material.opacity = 1 - tLife;

    if (b.life <= 0) {
      scene.remove(b.sprite);
      b.sprite.material.dispose();
      bursts.splice(i, 1);
    }
  }

  // Spawn new bursts steadily
  burstAccumulator += dt * BURSTS_PER_SECOND;
  while (burstAccumulator > 1 && bursts.length < MAX_BURSTS) {
    const burst = createBurst();
    if (burst) bursts.push(burst);
    burstAccumulator -= 1;
  }

  // Update OrbitControls (for zoom inertia only)
  controls.update();

  // Apply click-and-drag mouselook rotation
  camera.rotation.set(pitch, yaw, 0);

  composer.render();
}

// ---------- Resize ----------

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
