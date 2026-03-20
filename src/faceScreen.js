import * as THREE from 'three';

// Canvas for drawing emotion sprites
const CANVAS_SIZE = 256;
const canvas = document.createElement('canvas');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
const ctx = canvas.getContext('2d');

export const faceTexture = new THREE.CanvasTexture(canvas);

// Current emotion state
let currentEmotion = 'neutral';
let thinkingDots = 0;
let thinkingInterval = null;

// ── Draw helpers ────────────────────────────────────────────
function clearCanvas(alpha = 1.0) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function drawEmotion(emotion, dots = 0) {
  clearCanvas();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = CANVAS_SIZE / 2;
  const ey = CANVAS_SIZE * 0.38; // eyes y
  const my = CANVAS_SIZE * 0.62; // mouth y

  switch (emotion) {
    case 'happy':
      drawEyes(cx, ey, 'arc-open', 0xff8c00);
      drawMouth(cx, my, 'smile', 0xff8c00);
      break;
    case 'sad':
      drawEyes(cx, ey, 'teardrop', 0x4466aa);
      drawMouth(cx, my, 'frown', 0x4466aa);
      break;
    case 'angry':
      drawEyes(cx, ey, 'squint', 0xff2200);
      drawMouth(cx, my, 'flat', 0xff2200);
      break;
    case 'excited':
      drawEyes(cx, ey, 'star', 0xffffff);
      drawMouth(cx, my, 'wide', 0xffffff);
      break;
    case 'thinking':
      drawEyes(cx, ey, 'dot', 0xffcc00);
      drawThinkingDots(cx, my, dots, 0xffcc00);
      break;
    case 'neutral':
    default:
      drawEyes(cx, ey, 'arc-open', 0xff6a00);
      drawMouth(cx, my, 'neutral', 0xff6a00);
  }
  faceTexture.needsUpdate = true;
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function colorStr(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Draw two eyes at (cx ± offset, ey)
function drawEyes(cx, ey, style, hex) {
  const offset = 40;
  const color = colorStr(hex);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;

  [cx - offset, cx + offset].forEach(x => {
    ctx.beginPath();
    switch (style) {
      case 'arc-open':
        ctx.arc(x, ey, 14, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'teardrop':
        ctx.arc(x, ey, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, ey + 14);
        ctx.lineTo(x, ey + 22);
        ctx.stroke();
        break;
      case 'squint':
        ctx.moveTo(x - 14, ey);
        ctx.lineTo(x + 14, ey);
        ctx.stroke();
        break;
      case 'star':
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('✦', x, ey);
        break;
      case 'dot':
        ctx.arc(x, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });
}

function drawMouth(cx, my, style, hex) {
  const color = colorStr(hex);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (style) {
    case 'smile':
      ctx.arc(cx, my - 8, 28, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    case 'frown':
      ctx.arc(cx, my + 16, 28, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
      break;
    case 'flat':
      ctx.moveTo(cx - 28, my); ctx.lineTo(cx + 28, my);
      ctx.stroke();
      break;
    case 'wide':
      ctx.arc(cx, my - 8, 36, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();
      break;
    case 'neutral':
      ctx.moveTo(cx - 20, my); ctx.lineTo(cx + 20, my);
      ctx.stroke();
      break;
  }
}

function drawThinkingDots(cx, my, dots, hex) {
  const color = colorStr(hex);
  ctx.fillStyle = color;
  const labels = ['.', '..', '...'];
  ctx.font = 'bold 36px monospace';
  ctx.fillText(labels[dots % 3], cx, my);
}

// ── Blink (canvas eyes) ─────────────────────────────────────
let blinkCanvasTimer = randomBetween(3000, 6000);
let blinkCanvasActive = false;

function randomBetween(a, b) { return a + Math.random() * (b - a); }

/**
 * Call on every animation frame (pass elapsed ms).
 * Fires a canvas-level eye-close blink every 3–6 seconds.
 */
export function tickFaceScreen(deltaMs) {
  blinkCanvasTimer -= deltaMs;
  if (blinkCanvasTimer <= 0 && !blinkCanvasActive) {
    blinkCanvasActive = true;
    const saved = currentEmotion;
    drawBlink();
    setTimeout(() => {
      drawEmotion(saved, thinkingDots);
      blinkCanvasActive = false;
      blinkCanvasTimer = randomBetween(3000, 6000);
    }, 120);
  }
}

function drawBlink() {
  clearCanvas();
  const cx = CANVAS_SIZE / 2;
  const ey = CANVAS_SIZE * 0.38;
  ctx.strokeStyle = colorStr(0xff6a00);
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  [cx - 40, cx + 40].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x - 12, ey);
    ctx.lineTo(x + 12, ey);
    ctx.stroke();
  });
  faceTexture.needsUpdate = true;
}

// ── Crossfade (opacity tween) ────────────────────────────────
let faceMaterial = null; // set by attachFaceScreen
let fadeAnimId = null;

function tweenOpacity(from, to, durationMs, onDone) {
  if (fadeAnimId) cancelAnimationFrame(fadeAnimId);
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / durationMs, 1);
    if (faceMaterial) faceMaterial.opacity = from + (to - from) * t;
    if (t < 1) { fadeAnimId = requestAnimationFrame(step); }
    else { fadeAnimId = null; if (onDone) onDone(); }
  }
  fadeAnimId = requestAnimationFrame(step);
}

// ── Public API ──────────────────────────────────────────────

/**
 * Attach the canvas texture to the visor mesh or a fallback plane.
 * K-VRC GLB has a single merged mesh — always uses fallback plane on head bone.
 * @param {THREE.Object3D} robotScene
 * @param {THREE.Scene} threeScene
 * @param {THREE.Bone} faceBone - head bone for plane positioning
 * @returns {THREE.Mesh} the face screen mesh
 */
export function attachFaceScreen(robotScene, threeScene, faceBone) {
  // Try to find the visor mesh by name
  let visorMesh = null;
  const VISOR_NAMES = ['visor', 'screen', 'face', 'display'];
  robotScene.traverse(obj => {
    if (visorMesh) return;
    if (obj.isMesh) {
      const n = obj.name.toLowerCase();
      if (VISOR_NAMES.some(k => n.includes(k))) {
        visorMesh = obj;
      }
    }
  });

  const mat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    emissive: new THREE.Color(0xff6a00),
    emissiveMap: faceTexture,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 1.0,
  });
  faceMaterial = mat;

  if (visorMesh) {
    console.log('Face screen: using visor mesh', visorMesh.name);
    visorMesh.material = mat;
    drawEmotion('neutral');
    return visorMesh;
  }

  // Fallback: floating plane synced to head bone each frame
  console.warn('Face screen: visor mesh not found, using fallback PlaneGeometry');
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.22), mat);
  threeScene.add(plane);

  plane.__isFallback = true;
  plane.__faceBone = faceBone;
  drawEmotion('neutral');
  return plane;
}

// Pre-allocated to avoid per-frame GC — MUST stay at module scope
const _faceOffset = new THREE.Vector3();

/**
 * Call each frame to keep the fallback plane synced to the face bone.
 * No-op if the visor mesh was found (it moves with the skeleton).
 */
export function updateFaceScreen(faceScreenMesh) {
  if (!faceScreenMesh || !faceScreenMesh.__isFallback) return;
  const bone = faceScreenMesh.__faceBone;
  if (!bone) return;
  bone.getWorldPosition(faceScreenMesh.position);
  bone.getWorldQuaternion(faceScreenMesh.quaternion);
  _faceOffset.set(0, 0, 0.05).applyQuaternion(faceScreenMesh.quaternion);
  faceScreenMesh.position.add(_faceOffset);
  faceScreenMesh.updateMatrixWorld();
}

/**
 * Transition to a new emotion with a 300ms opacity crossfade.
 * @param {string} emotion
 */
export function setEmotion(emotion) {
  if (emotion === currentEmotion) return;

  if (thinkingInterval) { clearInterval(thinkingInterval); thinkingInterval = null; }

  // Fade out → swap canvas → fade in
  tweenOpacity(1, 0, 150, () => {
    currentEmotion = emotion;
    if (emotion === 'thinking') {
      thinkingDots = 0;
      drawEmotion('thinking', thinkingDots);
      thinkingInterval = setInterval(() => {
        thinkingDots = (thinkingDots + 1) % 3;
        drawEmotion('thinking', thinkingDots);
      }, 400);
    } else {
      drawEmotion(emotion);
    }
    tweenOpacity(0, 1, 150, null);
  });
}
