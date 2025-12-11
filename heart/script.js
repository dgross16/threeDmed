import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera – very far back, huge view range
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  10000           // far plane huge
);
camera.position.set(0, 0, 100);   // start far away
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const dir1 = new THREE.DirectionalLight(0xffffff, 1.5);
dir1.position.set(50, 50, 50);
scene.add(dir1);

// Axes
const axes = new THREE.AxesHelper(10);
scene.add(axes);

console.log('Loading brain...');

const loader = new GLTFLoader();
loader.load(
  '../models/fullbrain.glb',
  (gltf) => {
    console.log('Brain model loaded!', gltf);

    const brain = gltf.scene;
    scene.add(brain);

    brain.traverse((child) => {
    if (child.isMesh) {
      console.log('Mesh part:', child.name);
    }
});

    // Force all meshes visible and bright
    let meshCount = 0;
    brain.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        child.visible = true;
        child.material = new THREE.MeshNormalMaterial({ wireframe: false });
        console.log('Mesh:', child.name);
      }
    });
    console.log('Total meshes:', meshCount);

    // Compute bounding box *without* changing position/scale
    const box = new THREE.Box3().setFromObject(brain);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    console.log('BBox size:', size);
    console.log('BBox center:', center);

    // Visualize bounding box
    // const helper = new THREE.Box3Helper(box, 0xffff00);
    // scene.add(helper);

    // Move camera to see the whole box
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.5;
    camera.position.copy(center.clone().add(new THREE.Vector3(dist, dist, dist)));
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  },
  undefined,
  (err) => {
    console.error('Error loading fullbrain.glb:', err);
  }
);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
