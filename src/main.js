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
scene.background = new THREE.Color(0x080d0d);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 4.5);
camera.lookAt(0, 0.4, 0);

// ── Lights ──────────────────────────────────────────────────
RectAreaLightUniformsLib.init();

const ambient = new THREE.AmbientLight(0xffffff, 0.03);
scene.add(ambient);

// Rim light behind the robot
export const rimLight = new THREE.RectAreaLight(0xff6a00, 1.8, 2, 3);
rimLight.position.set(0, 0.6, -0.6);
rimLight.lookAt(0, 0.4, 0);
scene.add(rimLight);

// Face glow point light
export const faceLight = new THREE.PointLight(0xff6a00, 0.5, 2);
faceLight.position.set(0, 0.65, 0.6);
scene.add(faceLight);

// Subtle teal fill light from upper-left to break up the darkness
const fillLight = new THREE.PointLight(0x0d4f4f, 0.6, 6);
fillLight.position.set(-2, 1.5, 2);
scene.add(fillLight);

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
