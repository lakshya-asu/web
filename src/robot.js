import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EMOTION_MAP } from './emotions.js';
import { attachFaceScreen, updateFaceScreen, tickFaceScreen } from './faceScreen.js';

// ── Bone name constants (verified from GLB inspection) ───────
// Rig uses Slavic naming convention. No jaw bone exists in this rig.
const BONES = {
  head:  'Head_6',    // helmet/head bone
  jaw:   null,        // no jaw bone in this rig — jaw animations are no-ops
  chest: 'spina_13',  // spine/chest bone
};

// ── Module state ────────────────────────────────────────────
let robotRoot = null;
let bones = {};
let baseY = 0;
let clock = 0;
let currentEmotionCfg = EMOTION_MAP.neutral;
let blinkTimer = randomBetween(3, 6);

// Mouse target angles (radians)
let targetHeadYaw = 0, targetHeadPitch = 0;
let targetChestYaw = 0;

// Face screen mesh reference — populated in Task 8 when faceScreen.js is wired in
let _faceScreenMesh = null;

function randomBetween(a, b) { return a + Math.random() * (b - a); }

/**
 * Load the GLB, add to scene, resolve bones.
 * Returns a robot API object used by other modules.
 */
export async function initRobot(scene) {
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('/k-vrc_rigged.glb', resolve, undefined, reject);
  });

  robotRoot = gltf.scene;
  scene.add(robotRoot);

  // Center and scale robot (adjust values after visual check)
  robotRoot.scale.setScalar(0.165);
  robotRoot.position.set(0, -0.15, 0);
  baseY = robotRoot.position.y;

  // Resolve bone references
  robotRoot.traverse(obj => {
    if (obj.isBone || obj.type === 'Bone') {
      if (obj.name === BONES.head)  bones.head  = obj;
      if (obj.name === BONES.chest) bones.chest = obj;
      // BONES.jaw is null — no jaw bone in this rig
    }
  });

  console.log('K-VRC bones resolved:', { head: !!bones.head, chest: !!bones.chest });

  // Attach face screen to head bone (fallback plane — single merged mesh in this GLB)
  _faceScreenMesh = attachFaceScreen(robotRoot, scene, bones.head);

  // Mouse tracking
  window.addEventListener('mousemove', onMouseMove);

  return {
    root: robotRoot,
    bones,
    get faceScreenMesh() { return _faceScreenMesh; },
    setEmotionCfg: (cfg) => { currentEmotionCfg = cfg; },
    triggerHeadJerk,
  };
}

function onMouseMove(e) {
  const nx =  (e.clientX / window.innerWidth)  * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;
  // ±25° yaw, ±15° pitch for head; ±8° yaw for chest
  targetHeadYaw   = nx * THREE.MathUtils.degToRad(25);
  targetHeadPitch = ny * THREE.MathUtils.degToRad(15);
  targetChestYaw  = nx * THREE.MathUtils.degToRad(8);
}

const BASE_LERP = { head: 0.05, chest: 0.02 };
let headJerkActive = false;

/**
 * Called every frame from the render loop.
 * @param {number} delta - seconds since last frame
 */
export function updateRobot(delta) {
  if (!robotRoot) return;
  clock += delta;

  // Float
  robotRoot.position.y = baseY + Math.sin(clock * currentEmotionCfg.floatSpeed) * currentEmotionCfg.floatAmp;

  // Head tracking — headRapid multiplies lerp speed for 'excited'
  const headLerp = currentEmotionCfg.headRapid ? BASE_LERP.head * 3 : BASE_LERP.head;
  if (bones.head) {
    bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetHeadYaw,   headLerp);
    bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, targetHeadPitch, headLerp);
  }
  if (bones.chest) {
    bones.chest.rotation.y = THREE.MathUtils.lerp(bones.chest.rotation.y, targetChestYaw, BASE_LERP.chest);
  }

  // Bone blink — no-op since no jaw bone in this rig
  blinkTimer -= delta;
  if (blinkTimer <= 0) {
    blinkTimer = randomBetween(3, 6);
    // jaw blink skipped — handled by canvas blink in faceScreen.js
  }

  // Face canvas blink (independent of bone rig)
  tickFaceScreen(delta * 1000);

  // Update fallback face screen plane position (syncs to head bone)
  updateFaceScreen(_faceScreenMesh);
}

/**
 * Trigger a sharp head-jerk for 'angry' emotion.
 * Called once when emotion changes to 'angry' (from chat.js via robot API).
 */
export function triggerHeadJerk() {
  if (!bones.head || headJerkActive) return;
  headJerkActive = true;
  const orig = bones.head.rotation.y;
  let step = 0;
  const JERK = [0.18, -0.18, 0.1, -0.1, 0];
  function nextStep() {
    if (step >= JERK.length) { headJerkActive = false; return; }
    bones.head.rotation.y = orig + JERK[step++];
    setTimeout(nextStep, 60);
  }
  nextStep();
}
