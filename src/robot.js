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
    startBodyMotion,
  };
}

function onMouseMove(e) {
  const nx =  (e.clientX / window.innerWidth)  * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;
  // ±25° yaw, ±15° pitch for head; ±8° yaw for chest
  targetHeadYaw   = nx * THREE.MathUtils.degToRad(25);
  targetHeadPitch = -ny * THREE.MathUtils.degToRad(15);
  targetChestYaw  = nx * THREE.MathUtils.degToRad(8);
}

const BASE_LERP = { head: 0.05, chest: 0.02 };
let headJerkActive = false;
let activeMotionId = null;      // RAF id (for RAF-based motions)
let activeShakeTimeout = null;  // timeout id (shake only — cleared with clearTimeout)
let activeMotionType = null;    // name of current motion

/**
 * Called every frame from the render loop.
 * @param {number} delta - seconds since last frame
 */
export function updateRobot(delta) {
  if (!robotRoot) return;
  clock += delta;

  // Float
  // Skip float when bob motion owns position.y
  if (activeMotionType !== 'bob') {
    robotRoot.position.y = baseY + Math.sin(clock * currentEmotionCfg.floatSpeed) * currentEmotionCfg.floatAmp;
  }

  // Head tracking — headRapid multiplies lerp speed for 'excited'
  const headLerp = currentEmotionCfg.headRapid ? BASE_LERP.head * 3 : BASE_LERP.head;
  if (bones.head) {
    bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetHeadYaw, headLerp);
    // Skip pitch tracking when nod motion owns head.rotation.x
    if (activeMotionType !== 'nod') {
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, targetHeadPitch, headLerp);
    }
  }
  if (bones.chest) {
    bones.chest.rotation.y = THREE.MathUtils.lerp(bones.chest.rotation.y, targetChestYaw, BASE_LERP.chest);
  }

  // Return chest pitch and head roll to neutral unless held by a motion
  if (activeMotionType !== 'slump' && bones.chest) {
    const diff = Math.abs(bones.chest.rotation.x);
    if (diff > 0.001) bones.chest.rotation.x = THREE.MathUtils.lerp(bones.chest.rotation.x, 0, 0.03);
    else bones.chest.rotation.x = 0;
  }
  if (activeMotionType !== 'tilt' && bones.head) {
    bones.head.rotation.z = THREE.MathUtils.lerp(bones.head.rotation.z, 0, 0.04);
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
export function startBodyMotion(name) {
  if (activeMotionId !== null) { cancelAnimationFrame(activeMotionId); activeMotionId = null; }
  if (activeShakeTimeout !== null) { clearTimeout(activeShakeTimeout); activeShakeTimeout = null; }
  activeMotionType = name;

  switch (name) {
    case 'sway':   _motionSway();   break;
    case 'nod':    _motionNod();    break;
    case 'bob':    _motionBob();    break;
    case 'slump':  _motionSlump();  break;
    case 'shake':  _motionShake();  break;
    case 'tilt':   _motionTilt();   break;
    default: break;
  }
}

function _motionSway() {
  let t = 0;
  function loop() {
    if (activeMotionType !== 'sway') return;
    t += 0.016;
    if (bones.chest) bones.chest.rotation.z = Math.sin(t * 0.6) * THREE.MathUtils.degToRad(2);
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

// NOTE: updateRobot skips head.rotation.x mouse tracking when activeMotionType === 'nod'
// so this motion is visible (see Change 5)
function _motionNod() {
  let t = 0;
  function loop() {
    if (activeMotionType !== 'nod') return;
    t += 0.016;
    if (bones.head) {
      const nod = Math.sin(t * 1.2) * THREE.MathUtils.degToRad(6);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, nod, 0.08);
    }
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

// NOTE: `baseY` is module-scope (let baseY = 0 at top of file)
// NOTE: updateRobot skips position.y float write when activeMotionType === 'bob' (see Change 5)
function _motionBob() {
  let t = 0;
  function loop() {
    if (activeMotionType !== 'bob') return;
    t += 0.016;
    // Slow base frequency; sin^3 shape lingers at rest, snaps through peaks
    const s = Math.sin(t * 3.5);
    if (robotRoot) robotRoot.position.y = baseY + Math.sign(s) * Math.pow(Math.abs(s), 2.5) * 0.06;
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

function _motionSlump() {
  const TARGET = THREE.MathUtils.degToRad(6);
  function loop() {
    if (activeMotionType !== 'slump') return;
    if (bones.chest) {
      if (Math.abs(bones.chest.rotation.x - TARGET) < 0.001) {
        bones.chest.rotation.x = TARGET;
        return; // converged — stop RAF loop
      }
      bones.chest.rotation.x = THREE.MathUtils.lerp(bones.chest.rotation.x, TARGET, 0.04);
    }
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

// shake uses activeShakeTimeout (setTimeout), NOT activeMotionId (RAF)
function _motionShake() {
  const SHAKE = [10, -10, 8, -8, 5, -5, 0].map(d => THREE.MathUtils.degToRad(d));
  let step = 0;
  function nextStep() {
    if (activeMotionType !== 'shake' || step >= SHAKE.length) return;
    if (bones.head) bones.head.rotation.y = SHAKE[step++];
    activeShakeTimeout = setTimeout(nextStep, 55);
  }
  nextStep();
}

function _motionTilt() {
  function loop() {
    if (activeMotionType !== 'tilt') return;
    if (bones.head) {
      bones.head.rotation.z = THREE.MathUtils.lerp(
        bones.head.rotation.z,
        THREE.MathUtils.degToRad(8),
        0.05
      );
    }
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

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
