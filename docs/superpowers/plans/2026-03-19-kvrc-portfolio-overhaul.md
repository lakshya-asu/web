# K-VRC Interactive Portfolio Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current plain HTML/CSS/JS portfolio with an immersive Vite + Three.js site featuring K-VRC as an interactive, conversational robot character powered by Gemini 2.0 Flash.

**Architecture:** Vite builds the static frontend; a Vercel serverless function at `/api/chat.js` proxies Gemini API calls (key never exposed to browser). Three.js renders the K-VRC GLB in a full-viewport canvas with post-processing bloom; a Canvas 2D texture drives face expressions; a frosted-glass chat overlay + Web Speech API handle conversation + TTS.

**Tech Stack:** Vite, Three.js (`three` + `three/addons`), Gemini 2.0 Flash (via `@google/generative-ai` server-side), Web Speech API (STT + TTS), Vercel (static + serverless)

**Spec:** `docs/superpowers/specs/2026-03-19-kvrc-portfolio-overhaul-design.md`

---

## File Map

| File | Role |
|------|------|
| `package.json` | Vite + Three.js deps |
| `vite.config.js` | Vite config |
| `vercel.json` | Build + rewrite rules |
| `.env.example` | Documents `GEMINI_API_KEY` and `ALLOWED_ORIGIN` |
| `index.html` | Full portfolio HTML; hero section replaced with canvas + chat |
| `src/style.css` | Global styles, loading overlay, chat UI |
| `src/main.js` | Scene init, render loop, resize handler |
| `src/robot.js` | GLB load, bone refs, mouse tracking, idle animation |
| `src/faceScreen.js` | Canvas 2D texture, emotion sprites, transitions |
| `src/chat.js` | Chat UI logic, fetch `/api/chat`, TTS, history |
| `src/emotions.js` | Emotion → scene effect mapping (colours, bloom, motion) |
| `api/chat.cjs` | Vercel serverless function — Gemini proxy (CommonJS, `.cjs` extension avoids conflict with `"type":"module"` in `package.json`) |
| `public/k-vrc_rigged.glb` | Robot model (moved from repo root) |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `.gitignore` (ensure `.env` is listed)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "lakshya-portfolio",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.170.0",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 3: Create `vercel.json`**

```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

- [ ] **Step 4: Create `.env.example`**

```
# Copy this file to .env and fill in your values (never commit .env)
GEMINI_API_KEY=your_gemini_api_key_here
# Set to your production Vercel domain — used for CORS allow-list in api/chat.cjs
ALLOWED_ORIGIN=https://your-project.vercel.app
```

- [ ] **Step 5: Ensure `.env` is in `.gitignore`**

Check if `.gitignore` exists. If it doesn't, create it. If it does, verify `.env` is listed. Add:
```
.env
node_modules/
dist/
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify Vite dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:5173`. Browser shows the existing `index.html` (it won't look right yet — that's fine).

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js vercel.json .env.example .gitignore package-lock.json
git commit -m "feat: add Vite build toolchain and Vercel config"
```

---

## Task 2: Asset Preparation

**Files:**
- Move: `k-vrc_rigged.glb` → `public/k-vrc_rigged.glb`
- Note: textures in `k-vrc-rigged/textures/` stay as-is; verify they're embedded in GLB

- [ ] **Step 1: Create `public/` directory and move the GLB**

```bash
mkdir -p public
mv k-vrc_rigged.glb public/k-vrc_rigged.glb
```

- [ ] **Step 2: Verify the GLB is accessible via Vite dev server**

With `npm run dev` running, open `http://localhost:5173/k-vrc_rigged.glb` in the browser.
Expected: binary download prompt or raw binary response (not a 404).

- [ ] **Step 3: Commit**

```bash
git add public/k-vrc_rigged.glb
git commit -m "feat: move K-VRC GLB to public/ for Vite serving"
```

---

## Task 3: Migrate Portfolio HTML to Vite Entry Point

**Files:**
- Modify: `index.html` — update script/style refs, add canvas + chat overlay HTML, add loading overlay

The existing `index.html` is plain HTML with `<link rel="stylesheet" href="styles.css">` and `<script src="script.js">`. We need to:
1. Point styles at `src/style.css` (Vite will bundle it via JS import — remove the `<link>` tag)
2. Replace `<script src="script.js">` with `<script type="module" src="/src/main.js">`
3. Replace the hero `<section class="hero reveal">` content with the Three.js canvas mount point + chat overlay
4. Add the loading overlay div

- [ ] **Step 1: Replace the `<head>` style link and body script tag**

In `index.html`:

Replace:
```html
<link rel="stylesheet" href="styles.css" />
```
With: *(nothing — styles will be imported via JS in `src/main.js`)*

Replace:
```html
<script src="script.js"></script>
```
With:
```html
<script type="module" src="/src/main.js"></script>
```

- [ ] **Step 2: Add loading overlay before `<header>`**

Insert immediately after `<body>`:
```html
<div id="loading-overlay">
  <span>Initialising K-VRC...</span>
</div>
```

- [ ] **Step 3: Add canvas mount and chat overlay inside the hero section**

Replace the entire `<section class="hero reveal">...</section>` block inside `<header>` with:
```html
<div id="hero-3d">
  <canvas id="three-canvas"></canvas>
  <div id="chat-overlay">
    <div id="chat-log" role="log" aria-live="polite" aria-label="Conversation with K-VRC"></div>
    <div id="chat-input-row">
      <button id="mic-btn" aria-label="Start voice input" title="Voice input">🎤</button>
      <input
        id="chat-input"
        type="text"
        placeholder="Ask K-VRC anything..."
        aria-label="Message K-VRC"
        maxlength="1000"
        autocomplete="off"
      />
      <button id="send-btn">Send</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Verify `npm run dev` still serves the page without JS errors**

Open browser console — expect no errors (the Three.js canvas will be empty/black since we haven't written `main.js` yet, and the page content below the hero should render).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: migrate index.html to Vite entry, add canvas + chat overlay markup"
```

---

## Task 4: Global Styles + Chat UI CSS

**Files:**
- Create: `src/style.css`

- [ ] **Step 1: Create `src/style.css`**

```css
/* ── Reset & base ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #000;
  --accent: #ff6a00;
  --accent-dim: rgba(255, 106, 0, 0.15);
  --text: #e8e8e8;
  --text-muted: #888;
  --glass-bg: rgba(10, 10, 10, 0.72);
  --radius: 12px;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--text);
  background: var(--bg);
}

body { overflow-x: hidden; }

/* ── Loading overlay ──────────────────────────────────────── */
#loading-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; letter-spacing: 0.12em; color: var(--accent);
  transition: opacity 0.6s ease;
}
#loading-overlay.hidden { opacity: 0; pointer-events: none; }

/* ── Hero 3D container ────────────────────────────────────── */
#hero-3d {
  position: relative;
  width: 100vw;
  height: 100vh;
}

#three-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  display: block;
}

/* ── Chat overlay ─────────────────────────────────────────── */
#chat-overlay {
  position: absolute;
  bottom: 2rem; left: 50%; transform: translateX(-50%);
  width: min(600px, calc(100vw - 2rem));
  z-index: 10;
  display: flex; flex-direction: column; gap: 0.5rem;
}

#chat-log {
  max-height: 240px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.5rem;
  padding: 0.5rem 0;
  /* custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--accent-dim) transparent;
}

.bubble {
  max-width: 80%;
  padding: 0.6rem 1rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  line-height: 1.5;
  backdrop-filter: blur(12px);
}
.bubble.robot {
  align-self: flex-start;
  background: var(--glass-bg);
  border: 1px solid rgba(255, 106, 0, 0.2);
}
.bubble.user {
  align-self: flex-end;
  background: rgba(255, 106, 0, 0.18);
  border: 1px solid rgba(255, 106, 0, 0.35);
}

#chat-input-row {
  display: flex; gap: 0.5rem; align-items: center;
  background: var(--glass-bg);
  border: 1px solid rgba(255, 106, 0, 0.25);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  backdrop-filter: blur(12px);
}

#mic-btn {
  background: none; border: none; cursor: pointer;
  font-size: 1.1rem; padding: 0.2rem 0.4rem;
  opacity: 0.7; transition: opacity 0.2s;
}
#mic-btn:hover { opacity: 1; }
#mic-btn.active { color: var(--accent); opacity: 1; }

#chat-input {
  flex: 1; background: none; border: none; outline: none;
  color: var(--text); font-size: 0.9rem; font-family: inherit;
}
#chat-input::placeholder { color: var(--text-muted); }

#send-btn {
  background: var(--accent); border: none; cursor: pointer;
  color: #000; font-weight: 700; font-size: 0.85rem;
  padding: 0.35rem 0.9rem; border-radius: 8px;
  transition: opacity 0.2s;
}
#send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Preserve existing portfolio sections ─────────────────── */
/* Step 2 below appends the original styles.css content here via:  */
/*   cat styles.css >> src/style.css                               */
```

- [ ] **Step 2: Copy existing `styles.css` content into `src/style.css`**

Append the full contents of the existing `styles.css` file to the end of `src/style.css`. The new CSS vars declared above will override where names match; the existing styles handle all the portfolio sections below the hero.

```bash
cat styles.css >> src/style.css
```

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add global styles with chat overlay, loading overlay, and portfolio sections"
```

---

## Task 5: Three.js Scene Foundation

**Files:**
- Create: `src/main.js`

This task sets up the Three.js renderer, camera, lights, and post-processing. No robot yet — just a black canvas with lights.

- [ ] **Step 1: Create `src/main.js`**

```js
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
camera.position.set(0, 1.2, 4.5);
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
```

- [ ] **Step 2: Verify scene renders black canvas with no console errors**

```bash
npm run dev
```

Open browser. Expect: black full-screen canvas, loading overlay visible briefly then fading (will error on `initRobot` import — that's expected; comment out the `initRobot`/`updateRobot`/`initChat` lines temporarily and check the renderer + lights import for errors first).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: Three.js scene foundation — renderer, camera, lights, bloom"
```

---

## Task 6: Emotion Effect Map

**Files:**
- Create: `src/emotions.js`

This module is pure data + a single function — easy to reason about in isolation before wiring it to the scene.

- [ ] **Step 1: Create `src/emotions.js`**

```js
import * as THREE from 'three';

// All six emotion states and their scene effects.
// "thinking" is client-side only — never returned by Gemini.
// headJerk: triggers a rapid head-shake (see robot.js triggerHeadJerk)
// headRapid: multiplies head lerp speed for rapid tracking
const EMOTION_MAP = {
  neutral:  { rimHex: 0xff6a00, bloom: 0.8,  floatSpeed: 0.5,  floatAmp: 0.05, headJerk: false, headRapid: false },
  happy:    { rimHex: 0xff8c00, bloom: 1.2,  floatSpeed: 0.9,  floatAmp: 0.07, headJerk: false, headRapid: false },
  excited:  { rimHex: 0xffffff, bloom: 1.8,  floatSpeed: 1.4,  floatAmp: 0.09, headJerk: false, headRapid: true  },
  sad:      { rimHex: 0x4466aa, bloom: 0.4,  floatSpeed: 0.3,  floatAmp: 0.03, headJerk: false, headRapid: false },
  angry:    { rimHex: 0xff2200, bloom: 1.6,  floatSpeed: 1.2,  floatAmp: 0.06, headJerk: true,  headRapid: false },
  thinking: { rimHex: 0xffcc00, bloom: 0.6,  floatSpeed: 0.4,  floatAmp: 0.04, headJerk: false, headRapid: false },
};

const _rimColor = new THREE.Color();

/**
 * Apply emotion effects to scene lights and bloom pass.
 * @param {string} emotion - one of the keys in EMOTION_MAP
 * @param {{ rimLight, faceLight, bloomPass }} refs
 */
export function applyEmotion(emotion, { rimLight, faceLight, bloomPass }) {
  const cfg = EMOTION_MAP[emotion] ?? EMOTION_MAP.neutral;
  _rimColor.setHex(cfg.rimHex);
  rimLight.color.copy(_rimColor);
  faceLight.color.copy(_rimColor);
  bloomPass.strength = cfg.bloom;
  return cfg; // caller can use floatSpeed / floatAmp for animation
}

export { EMOTION_MAP };
```

- [ ] **Step 2: Verify import resolves in dev server**

Temporarily add `import { applyEmotion } from './emotions.js'; console.log(applyEmotion);` to `main.js`, check console. Remove after.

- [ ] **Step 3: Commit**

```bash
git add src/emotions.js
git commit -m "feat: emotion → scene effect map (rim color, bloom, float params)"
```

---

## Task 7: Robot Loading, Bone Inspection, Mouse Tracking

**Files:**
- Create: `src/robot.js`

This is the most complex module. Do it in sub-steps.

- [ ] **Step 1: Create `src/robot.js` — skeleton (GLB load + bone log)**

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EMOTION_MAP } from './emotions.js';

// ── Bone name constants (fill in after Step 2 inspection) ───
// Run the dev server, open console, and copy the logged bone names here.
const BONES = {
  head:  'Head',    // REPLACE with actual name from console log
  jaw:   'Jaw',     // REPLACE — may not exist; use closest mouth bone
  chest: 'Spine1',  // REPLACE
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
  robotRoot.scale.setScalar(1.0);
  robotRoot.position.set(0, 0, 0);
  baseY = robotRoot.position.y;

  // ── BONE INSPECTION — check console after first load ───────
  console.group('K-VRC Bone Inventory');
  robotRoot.traverse(obj => {
    if (obj.isBone) console.log(obj.name);
  });
  console.groupEnd();
  // After reviewing the log, update the BONES constants above. ──

  // Resolve bone references
  robotRoot.traverse(obj => {
    if (obj.isBone) {
      if (obj.name === BONES.head)  bones.head  = obj;
      if (obj.name === BONES.jaw)   bones.jaw   = obj;
      if (obj.name === BONES.chest) bones.chest = obj;
    }
  });

  // Mouse tracking
  window.addEventListener('mousemove', onMouseMove);

  return {
    root: robotRoot,
    bones,
    faceScreenMesh,
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

  // Bone blink (jaw)
  blinkTimer -= delta;
  if (blinkTimer <= 0) {
    triggerBoneBlink();
    blinkTimer = randomBetween(3, 6);
  }

  // Face canvas blink (independent)
  tickFaceScreen(delta * 1000);

  // Update fallback face screen plane position
  updateFaceScreen(_faceScreenMesh);
}

function triggerBoneBlink() {
  if (!bones.jaw) return;
  const orig = bones.jaw.rotation.x;
  bones.jaw.rotation.x = orig + THREE.MathUtils.degToRad(15);
  setTimeout(() => { if (bones.jaw) bones.jaw.rotation.x = orig; }, 120);
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
```

- [ ] **Step 2: Run dev server and inspect console bone log**

```bash
npm run dev
```

Open browser, open DevTools console. Look for the "K-VRC Bone Inventory" group. Copy all logged bone names. Identify:
- The head bone (likely `Head` or `mixamorigHead` or similar)
- The jaw/mouth bone (may be `Jaw`, `jaw`, or absent)
- The chest/spine bone (likely `Spine`, `Spine1`, or `Chest`)

Update the `BONES` constants at the top of `robot.js` with the **actual** names found.

- [ ] **Step 3: Verify robot renders and mouse tracking works**

Visual check in browser:
- Robot GLB should appear on screen
- Moving the mouse left/right should smoothly rotate the robot's head
- Robot should gently float up and down

If the robot is too large/small or mispositioned, adjust `robotRoot.scale.setScalar()` and `robotRoot.position` until it's framed chest-up, centered.

- [ ] **Step 4: Commit**

```bash
git add src/robot.js
git commit -m "feat: K-VRC GLB loading, bone-based mouse tracking, idle float"
```

---

## Task 8: Face Screen — Canvas Texture Emotion Renderer

**Files:**
- Create: `src/faceScreen.js`

- [ ] **Step 1: Create `src/faceScreen.js`**

```js
import * as THREE from 'three';

// Canvas for drawing emotion sprites
const CANVAS_SIZE = 256;
const canvas = document.createElement('canvas');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
const ctx = canvas.getContext('2d');

export const faceTexture = new THREE.CanvasTexture(canvas);

// Current and target emotion (for crossfade)
let currentEmotion = 'neutral';
let opacity = 1.0;
let fadeTarget = null;
let fadeProgress = 0;
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
        // teardrop line below
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
    // Close eyes: redraw emotion with 'blink' style
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
  // Draw closed eyes (horizontal lines) + same mouth as current emotion
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
 * Attach the canvas texture to the visor mesh inside the loaded GLTF scene.
 * Falls back to a floating PlaneGeometry if no visor mesh is found.
 * @param {THREE.Object3D} robotScene
 * @param {THREE.Scene} threeScene
 * @param {THREE.Bone} faceBone - fallback bone for plane positioning
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
  faceMaterial = mat; // store for opacity tweens

  if (visorMesh) {
    console.log('Face screen: using visor mesh', visorMesh.name);
    visorMesh.material = mat;
    drawEmotion('neutral');
    return visorMesh;
  }

  // Fallback: floating plane
  console.warn('Face screen: visor mesh not found, using fallback PlaneGeometry');
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.22), mat);
  threeScene.add(plane);

  plane.__isFallback = true;
  plane.__faceBone = faceBone;
  drawEmotion('neutral');
  return plane;
}

// Pre-allocated to avoid per-frame GC
const _faceOffset = new THREE.Vector3();

/**
 * Call each frame to keep the fallback plane synced to the face bone.
 * No-op if the visor mesh was found (it moves with the skeleton).
 */
export function updateFaceScreen(faceScreenMesh) {
  if (!faceScreenMesh?.__isFallback) return;
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
```

- [ ] **Step 2: Wire face screen into `robot.js`**

The import at the top of `robot.js` already includes `attachFaceScreen`, `updateFaceScreen`, and `tickFaceScreen` (the full import was written in Task 7 Step 1). After bones are resolved in `initRobot`, add:

```js
const faceScreenMesh = attachFaceScreen(robotRoot, scene, bones.head);
let _faceScreenMesh = faceScreenMesh;
```

`updateFaceScreen(_faceScreenMesh)` and `tickFaceScreen(delta * 1000)` are already called inside `updateRobot` (Task 7 Step 1 code). The return value already includes `faceScreenMesh` and `triggerHeadJerk`.

- [ ] **Step 3: Verify face screen renders on robot**

Run `npm run dev`. Check:
- Console should log either "Face screen: using visor mesh <name>" or the fallback warning
- A glowing orange face expression should appear on/near the robot's visor
- If it appears in the wrong position (floating plane case), adjust the `_faceOffset` z value

- [ ] **Step 4: Commit**

```bash
git add src/faceScreen.js src/robot.js
git commit -m "feat: face screen canvas texture — emotion sprites on visor mesh"
```

---

## Task 9: Gemini Serverless Function

**Files:**
- Create: `api/chat.cjs`

This is a Node.js Vercel serverless function. It uses CommonJS (`require`/`module.exports`) because `package.json` sets `"type": "module"` for the Vite frontend. Using the `.cjs` extension tells Node to treat this file as CommonJS regardless, avoiding a module system conflict. Vercel's runtime handles `api/` files independently.

**CORS note:** `ALLOWED_ORIGIN` must be set as an environment variable in Vercel (see Task 12 Step 3). The function returns 403 for any origin that doesn't match exactly. There is no wildcard fallback in production — if `ALLOWED_ORIGIN` is unset, the function blocks all cross-origin requests and logs an error.

- [ ] **Step 1: Create `api/chat.cjs`**

```js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'excited'];
const MAX_MSG_LEN = 1000;

const SYSTEM_PROMPT = `You are K-VRC, a friendly robot assistant on Lakshya Jain's portfolio website.
Lakshya is a robotics software engineer (MS Robotics, ASU) specialising in causal reinforcement learning,
ROS2/MoveIt, embodied AI, and real-world robot deployment.
His notable work includes the DIA causal RL thesis, metric-semantic scene understanding,
and experience at Indrones and IIT Bombay. He has publications at IROS 2026 and NeurIPS 2026.

Answer questions about Lakshya's background, projects, and research concisely and warmly.
For unrelated questions, you may answer briefly but gently steer back to Lakshya's work.

Always respond with valid JSON only — no markdown, no code fences:
{"reply": "<your response>", "emotion": "<one of: happy, sad, angry, neutral, excited>"}
Choose the emotion that best matches the tone of your reply.`;

const FALLBACK = { reply: "I'm having a little glitch. Try again!", emotion: 'neutral' };

module.exports = async function handler(req, res) {
  // CORS — strictly restrict to configured production domain
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || '';

  const isLocalDev = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isAllowed = isLocalDev || (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN);

  if (!ALLOWED_ORIGIN && !isLocalDev) {
    console.error('ALLOWED_ORIGIN env var not set — blocking request');
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > MAX_MSG_LEN) {
    return res.status(400).json({ error: 'Message too long' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    });

    // Client trims history to last 20 turns before sending — use as-is
    const geminiHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('Gemini returned non-JSON:', raw);
      return res.status(200).json(FALLBACK);
    }

    if (typeof parsed.reply !== 'string' || parsed.reply.trim().length === 0) {
      return res.status(200).json(FALLBACK);
    }
    if (!VALID_EMOTIONS.includes(parsed.emotion)) {
      parsed.emotion = 'neutral';
    }

    return res.status(200).json({ reply: parsed.reply, emotion: parsed.emotion });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return res.status(500).json({ error: 'Failed to reach AI service' });
  }
};
```

- [ ] **Step 2: Add `@google/generative-ai` as a dependency**

Confirm it is already in `package.json` dependencies (added in Task 1). If not:
```bash
npm install @google/generative-ai
```

- [ ] **Step 3: Test locally with Vercel CLI**

```bash
npm install -g vercel   # if not already installed
cp .env.example .env    # then add your real GEMINI_API_KEY to .env
vercel dev
```

In a separate terminal, test the endpoint:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hi! Who is Lakshya?", "history": []}'
```

Expected response: `{"reply":"...","emotion":"..."}` — a JSON object with a friendly reply from K-VRC.

- [ ] **Step 4: Commit**

```bash
git add api/chat.cjs
git commit -m "feat: Gemini 2.0 Flash serverless proxy at /api/chat"
```

---

## Task 10: Chat Frontend — UI Logic, Fetch, History, Error States

**Files:**
- Create: `src/chat.js`

- [ ] **Step 1: Create `src/chat.js`**

```js
import { setEmotion } from './faceScreen.js';
import { applyEmotion, EMOTION_MAP } from './emotions.js';

let history = []; // { role: 'user'|'model', text: string }[]
let ttsVoice = null;
let sceneRefs = null; // { rimLight, faceLight, bloomPass }
let robotRef = null;
let isSpeaking = false;

// ── TTS setup ────────────────────────────────────────────────
function setupTTS() {
  if (!window.speechSynthesis) return;
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    ttsVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
            ?? voices.find(v => v.lang.startsWith('en'))
            ?? voices[0]
            ?? null;
  };
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}

function speak(text) {
  if (!window.speechSynthesis || !ttsVoice) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = ttsVoice;
  utt.rate = 0.95;
  utt.pitch = 0.85;
  utt.onboundary = () => {
    if (robotRef?.bones?.jaw) {
      const j = robotRef.bones.jaw;
      j.rotation.x = (j.rotation.x > 0.05) ? 0 : 0.18;
    }
  };
  utt.onend = () => {
    if (robotRef?.bones?.jaw) robotRef.bones.jaw.rotation.x = 0;
    isSpeaking = false;
  };
  isSpeaking = true;
  window.speechSynthesis.speak(utt);
}

// ── DOM helpers ──────────────────────────────────────────────
function addBubble(text, role) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className = `bubble ${role === 'user' ? 'user' : 'robot'}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ── Emotion application ──────────────────────────────────────
function applyEmotionFull(emotion) {
  setEmotion(emotion);
  if (sceneRefs) {
    const cfg = applyEmotion(emotion, sceneRefs);
    robotRef?.setEmotionCfg(cfg);
  }
  if (emotion === 'angry') robotRef?.triggerHeadJerk();
}

// ── Send message ─────────────────────────────────────────────
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  input.value = '';
  sendBtn.disabled = true;
  setTimeout(() => { sendBtn.disabled = false; }, 1000); // debounce

  addBubble(trimmed, 'user');
  history.push({ role: 'user', text: trimmed });
  history = history.slice(-20);

  applyEmotionFull('thinking');

  let reply, emotion;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, history }),
    });

    if (res.status === 400) {
      addBubble('Message too long or invalid.', 'robot');
      applyEmotionFull('neutral');
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    reply = data.reply;
    emotion = data.emotion ?? 'neutral';
  } catch (err) {
    console.error('Chat error:', err);
    addBubble("K-VRC is having trouble connecting. Try again?", 'robot');
    applyEmotionFull('sad');
    return;
  }

  history.push({ role: 'model', text: reply });
  history = history.slice(-20);

  addBubble(reply, 'robot');
  // Apply emotion then speak after 300ms transition
  applyEmotionFull(emotion);
  setTimeout(() => speak(reply), 300);
}

// ── STT (mic) ────────────────────────────────────────────────
function setupMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('mic-btn');
  if (!SpeechRecognition) { micBtn.style.display = 'none'; return; }

  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.interimResults = false;
  let active = false;

  micBtn.addEventListener('click', () => {
    if (!active) {
      recog.start();
      micBtn.classList.add('active');
      micBtn.setAttribute('aria-label', 'Stop voice input');
    } else {
      recog.stop();
      micBtn.classList.remove('active');
      micBtn.setAttribute('aria-label', 'Start voice input');
    }
    active = !active;
  });

  recog.addEventListener('result', e => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('chat-input').value = transcript;
    micBtn.classList.remove('active');
    micBtn.setAttribute('aria-label', 'Start voice input');
    active = false;
  });
  recog.addEventListener('end', () => {
    micBtn.classList.remove('active');
    micBtn.setAttribute('aria-label', 'Start voice input');
    active = false;
  });
}

// ── Init ─────────────────────────────────────────────────────
export function initChat(robot, refs) {
  robotRef = robot;
  sceneRefs = refs;
  setupTTS();
  setupMic();

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(input.value); });

  // Intro greeting (text only — no TTS until first user gesture)
  addBubble(
    "Hello! I'm K-VRC — Lakshya's robotic assistant. Ask me anything about his work, research, or background!",
    'robot'
  );
  applyEmotionFull('excited');
}
```

- [ ] **Step 2: Verify full chat loop in browser (with `vercel dev`)**

Using `vercel dev` (not `npm run dev`) so `/api/chat` is available:

1. Type a message and press Send
2. Robot should switch to `thinking` expression (animated dots)
3. Response arrives → robot expression changes to returned emotion
4. Reply bubble appears in chat log
5. TTS should speak the reply (after first user interaction)

Check console for any errors.

- [ ] **Step 3: Test error state**

Temporarily break the fetch URL to `/api/chat-broken` in `chat.js`, send a message. Expect: "K-VRC is having trouble connecting..." bubble + sad emotion. Revert.

- [ ] **Step 4: Commit**

```bash
git add src/chat.js
git commit -m "feat: chat UI with Gemini fetch, history, TTS, error states, and STT mic"
```

---

## Task 11: Wire Everything Together + Final Visual Polish

**Files:**
- Modify: `src/main.js` — uncomment/verify all imports are wired
- Modify: `src/robot.js` — ensure `faceScreenMesh` returned and `updateFaceScreen` called

- [ ] **Step 1: Remove any temporary commented-out lines in `main.js`**

Ensure `initRobot`, `updateRobot`, `initChat`, and `applyEmotion` are all live (not commented out from earlier steps).

- [ ] **Step 2: Verify the full experience end-to-end**

Visual checklist:
- [ ] Loading overlay appears on page load, fades out once GLB is loaded
- [ ] Robot is visible, centered, framed chest-up
- [ ] Mouse movement causes head to smoothly follow cursor
- [ ] Robot gently floats up and down
- [ ] Face screen shows `excited` expression on load (intro greeting)
- [ ] Chat overlay is visible at the bottom
- [ ] Intro greeting bubble: "Hello! I'm K-VRC..."
- [ ] Sending a message → `thinking` dots on face screen, send button disabled
- [ ] Response arrives → emotion changes, reply appears, TTS speaks
- [ ] Mic button works (or is hidden if unsupported)
- [ ] Portfolio sections below are fully preserved and scroll correctly
- [ ] No console errors

- [ ] **Step 3: Adjust camera framing if needed**

If the robot is cut off or too small, adjust in `main.js`:
```js
camera.position.set(0, 1.2, 4.5);  // try z=3.5–5.5 range
camera.lookAt(0, 1.0, 0);           // try y=0.8–1.4 range
```

And/or scale in `robot.js`:
```js
robotRoot.scale.setScalar(1.0);  // try 0.8–1.3 range
```

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/robot.js
git commit -m "feat: wire full K-VRC interactive experience end-to-end"
```

---

## Task 12: Vercel Deployment

- [ ] **Step 1: Push repo to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Import project to Vercel**

Go to [vercel.com](https://vercel.com), click "Add New Project", select the GitHub repo.

- [ ] **Step 3: Set environment variables in Vercel dashboard**

In Vercel project → Settings → Environment Variables, add:
```
GEMINI_API_KEY=<your actual key>
ALLOWED_ORIGIN=https://<your-vercel-domain>.vercel.app
```

- [ ] **Step 4: Trigger a deployment**

Vercel auto-deploys on push. Check the build logs — expect `vite build` to complete successfully.

- [ ] **Step 5: Set quota limits in Google AI Studio**

Go to [aistudio.google.com](https://aistudio.google.com), find your API key, set a daily request quota to prevent unexpected charges.

- [ ] **Step 6: Smoke test production deployment**

Open the live URL. Verify:
- Robot loads and animates
- Chat sends a message and receives a response
- TTS works
- No CORS errors in console (check the `ALLOWED_ORIGIN` env var matches the domain exactly)

- [ ] **Step 7: Final commit with deployment notes**

```bash
# Update README if it exists, or create a minimal one
git commit --allow-empty -m "chore: production deployment to Vercel"
```

---

## Known Gotchas

1. **Bone names are unknown until runtime.** Task 7 Step 2 is mandatory — you cannot skip the console inspection step. The `BONES` constants in `robot.js` must be updated with real names before the mouse tracking will work.

2. **Visor mesh name is unknown until runtime.** `faceScreen.js` logs which path it took (visor mesh found vs. fallback). Check the console after Task 8 Step 3.

3. **TTS is blocked on first load.** This is a browser security constraint. Do not attempt to auto-play the intro greeting via TTS — it will silently fail. The intro is text-only; TTS begins after the first user gesture. This is by design.

4. **`RectAreaLight` requires `RectAreaLightUniformsLib.init()`.** Already included in `main.js`. If you ever move the light setup, ensure `init()` is called first.

5. **`vercel dev` vs `npm run dev`.** Use `vercel dev` when testing the `/api/chat` endpoint locally. `npm run dev` (Vite only) will return 404 for API calls.

6. **CORS `ALLOWED_ORIGIN`.** Must match the production domain exactly (no trailing slash). Update this env var in Vercel before going live.

7. **`api/chat.cjs` uses CommonJS, `package.json` sets `"type":"module"`.** The `.cjs` extension is mandatory — without it, Node treats the file as ESM and `require()` will throw. Vercel's runtime handles the `api/` directory independently but still respects Node module resolution rules.

8. **`_faceOffset` must stay declared outside the render loop.** In `faceScreen.js`, `const _faceOffset = new THREE.Vector3()` is declared at module scope. If it is ever moved inside `updateFaceScreen()`, a new `Vector3` will be allocated every frame, causing GC pressure. The position will also accumulate drift if the `applyQuaternion` + `add` sequence runs multiple times on the same object within a frame. Keep it module-scoped.
