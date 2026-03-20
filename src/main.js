import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './style.css';
import { initRobot, updateRobot } from './robot.js';
import { initChat } from './chat.js';
import { applyEmotion } from './emotions.js';

// ── Renderer ────────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ── Scene & Camera ──────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.4, 3.5);
camera.lookAt(0, 1.0, 0);

// ── Lights ──────────────────────────────────────────────────
RectAreaLightUniformsLib.init();

const ambient = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambient);

// Rim light behind the robot
export const rimLight = new THREE.RectAreaLight(0xff6a00, 4, 2, 3);
rimLight.position.set(0, 1.5, -1.5);
rimLight.lookAt(0, 1.0, 0);
scene.add(rimLight);

// Face glow point light
export const faceLight = new THREE.PointLight(0xff6a00, 1.2, 3);
faceLight.position.set(0, 1.6, 1.5);
scene.add(faceLight);

// ── Post-processing ─────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength (overridden per emotion)
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

// ── Resize handler ──────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Init robot + chat (async) ────────────────────────────────
const clock = new THREE.Clock();

(async () => {
  const robot = await initRobot(scene);
  applyEmotion('neutral', { rimLight, faceLight, bloomPass });
  initChat(robot, { rimLight, faceLight, bloomPass });

  // Hide loading overlay
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 700);

  // ── Render loop ────────────────────────────────────────────
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    updateRobot(delta);
    composer.render();
  });
})();
