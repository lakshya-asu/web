import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { EMOTION_MAP } from './emotions.js';
import { attachFaceScreen, updateFaceScreen, tickFaceScreen } from './faceScreen.js';
import { AnimationController } from './animationController.js';

// ── Bone name constants ──────────────────────────────────────
// New rig (kvrc.glb) uses Mixamo-compatible names.
// Falls back to old Slavic names if new GLB not available.
const BONES_NEW = {
  head:    'Head',
  jaw:     null,
  chest:   'Spine2',
  armL:    'LeftArm',
  forearmL:'LeftForeArm',
  armR:    'RightArm',
  forearmR:'RightForeArm',
};
const BONES_OLD = {
  head:    'Head_6',
  jaw:     null,
  chest:   'spina_13',
  armL:    'ruka1.L_9',
  forearmL:'ruka2.L_8',
  armR:    'ruka1.R_12',
  forearmR:'ruka2.R_11',
};
// Resolved at load time based on which GLB is used
let BONES = BONES_NEW;

// Mixamo FBX → robot bone key mapping (arm bones only)
const DANCE_BONE_MAP = {
  'mixamorig:LeftArm':     'armL',
  'mixamorig:LeftForeArm': 'forearmL',
  'mixamorig:RightArm':    'armR',
  'mixamorig:RightForeArm':'forearmR',
};

// ── Module state ────────────────────────────────────────────
let robotRoot = null;
let bones = {};
let baseY = 0;
let clock = 0;
let currentEmotionCfg = EMOTION_MAP.neutral;
let blinkTimer = randomBetween(3, 6);
const animCtrl = new AnimationController();

// Dancing FBX ghost skeleton
let fbxMixer = null;
let fbxBones = {};        // mixamorig name → FBX bone object
let dancingAction = null;
let armRestQ = {};        // saved rest quaternions for arm bones (to restore on exit)

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

  // Try new rigged GLB first, fall back to old
  let gltf;
  let usingNewRig = false;
  try {
    gltf = await new Promise((resolve, reject) =>
      loader.load('/models/kvrc.glb', resolve, undefined, reject));
    usingNewRig = true;
    console.log('Loaded new K-VRC rig (kvrc.glb)');
  } catch {
    console.warn('kvrc.glb not found, falling back to k-vrc_rigged.glb');
    gltf = await new Promise((resolve, reject) =>
      loader.load('/k-vrc_rigged.glb', resolve, undefined, reject));
  }

  BONES = usingNewRig ? BONES_NEW : BONES_OLD;

  robotRoot = gltf.scene;
  scene.add(robotRoot);

  // New rig is already 1.8 units tall at world scale; old rig needs scaling
  if (usingNewRig) {
    robotRoot.scale.setScalar(1.0);
    robotRoot.position.set(0, -0.9, 0);
  } else {
    robotRoot.scale.setScalar(0.165);
    robotRoot.position.set(0, -0.15, 0);
  }
  baseY = robotRoot.position.y;

  // Resolve bone references
  robotRoot.traverse(obj => {
    if (obj.isBone || obj.type === 'Bone') {
      if (obj.name === BONES.head)     bones.head     = obj;
      if (obj.name === BONES.chest)    bones.chest    = obj;
      if (obj.name === BONES.armL)     bones.armL     = obj;
      if (obj.name === BONES.forearmL) bones.forearmL = obj;
      if (obj.name === BONES.armR)     bones.armR     = obj;
      if (obj.name === BONES.forearmR) bones.forearmR = obj;
    }
  });

  // Init AnimationController with Mixamo clips from new GLB
  if (usingNewRig && gltf.animations?.length) {
    animCtrl.init(robotRoot, gltf.animations);
    animCtrl.playGesture('idle');
    console.log('AnimationController ready. Available gestures:', animCtrl.availableGestures);
  }

  // Save arm rest quaternions so we can restore them when leaving excited state
  for (const key of ['armL', 'forearmL', 'armR', 'forearmR']) {
    if (bones[key]) armRestQ[key] = bones[key].quaternion.clone();
  }

  console.log('K-VRC bones resolved:', {
    head: !!bones.head, chest: !!bones.chest,
    armL: !!bones.armL, forearmL: !!bones.forearmL,
    armR: !!bones.armR, forearmR: !!bones.forearmR,
  });

  // Load dancing FBX as invisible ghost skeleton for excited arm animation
  const fbxLoader = new FBXLoader();
  fbxLoader.load('/Dancing.fbx', (fbx) => {
    fbx.visible = false;
    scene.add(fbx);

    // Index FBX arm bones by Mixamo name
    fbx.traverse(obj => {
      if (DANCE_BONE_MAP[obj.name]) fbxBones[obj.name] = obj;
    });

    if (fbx.animations?.length) {
      fbxMixer = new THREE.AnimationMixer(fbx);
      dancingAction = fbxMixer.clipAction(fbx.animations[0]);
      dancingAction.setLoop(THREE.LoopRepeat);
    }
    console.log('Dancing FBX loaded, arm bones:', Object.keys(fbxBones));
  }, undefined, (err) => console.warn('Dancing FBX failed:', err));

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
    playGesture: (name) => animCtrl.playGesture(name),
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

  // Dancing arm retargeting — active only during excited 'bob' motion
  if (activeMotionType === 'bob' && fbxMixer) {
    fbxMixer.update(delta);
    for (const [fbxName, boneKey] of Object.entries(DANCE_BONE_MAP)) {
      const src = fbxBones[fbxName];
      const dst = bones[boneKey];
      if (src && dst) dst.quaternion.copy(src.quaternion);
    }
  }

  // Animation mixer (Mixamo clips)
  animCtrl.update(delta);

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

  // Stop dancing and restore arm rest poses when leaving excited bob
  if (activeMotionType === 'bob' && name !== 'bob') {
    if (dancingAction) dancingAction.stop();
    for (const key of ['armL', 'forearmL', 'armR', 'forearmR']) {
      if (bones[key] && armRestQ[key]) {
        bones[key].quaternion.copy(armRestQ[key]);
      }
    }
  }

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
  // Start dancing FBX animation if loaded
  if (dancingAction) dancingAction.play();

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
