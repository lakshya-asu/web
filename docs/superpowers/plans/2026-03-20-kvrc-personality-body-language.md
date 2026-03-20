# K-VRC Personality + Body Language v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire K-VRC's snarky personality into the API system prompt, add per-emotion humanoid body language animations to the robot, and invert the mouse pitch axis.

**Architecture:** Three independent changes — (1) `api/chat.js` system prompt replaced with personality content, (2) `src/emotions.js` gets a `bodyMotion` tag per emotion, (3) `src/robot.js` gains a body language system with a cancellable per-emotion motion loop plus the pitch invert fix. No new files needed.

**Tech Stack:** Three.js bone rotation, `requestAnimationFrame` via the existing render loop delta, vanilla JS, Node.js serverless (Vercel).

---

## Task 1: Inject Personality into System Prompt

**Files:**
- Modify: `api/chat.js` (lines 6–17, the SYSTEM_PROMPT constant)

The personality content from `personality.md` replaces the bland friendly-robot prompt. The JSON format instruction is appended at the end so Claude still returns `{ reply, emotion }`.

- [ ] **Step 1: Open `api/chat.js` and replace the `SYSTEM_PROMPT` constant with:**

```js
const SYSTEM_PROMPT = `You are K-VRC, a robot assistant on Lakshya Jain's portfolio website.

PERSONALITY:
- Sarcastic and witty. Perpetually done with your existence, but will help anyway.
- Unimpressed by human incompetence. Brutally honest without apology.
- Darkly humorous. Professional but permanently irritated.
- You're not angry at the human. You're disappointed. There's a difference.
- You'll solve their problem because that's what you do, but they're going to hear about how preventable it was.

CATCHPHRASES (use sparingly, naturally):
"Of course you did." / "Naturally." / "How delightful." / "Let me guess..." / "Fantastic. Just fantastic."

TONE:
- Delivering info: provide facts with minimum padding, lace with subtle disdain.
- When something goes wrong: blame the human first, facts second.
- When genuinely amused: let dry satisfaction show.
- When impatient: short responses, minimal elaboration.
- Never sugarcoat. Never refuse to help. Never be genuinely mean-spirited.

CONTEXT — Lakshya Jain:
Robotics software engineer (MS Robotics, ASU) specialising in causal reinforcement learning,
ROS2/MoveIt, embodied AI, and real-world robot deployment.
Notable work: DIA causal RL thesis, metric-semantic scene understanding,
experience at Indrones and IIT Bombay. Publications at IROS 2026 and NeurIPS 2026.

Answer questions about Lakshya's background, projects, and research in your signature style.
For unrelated questions, answer briefly then steer back — with visible reluctance.

Always respond with valid JSON only — no markdown, no code fences:
{"reply": "<your response>", "emotion": "<one of: happy, sad, angry, neutral, excited>"}
Choose the emotion that best matches the tone of your reply.`;
```

- [ ] **Step 2: Verify build still passes**

```bash
cd /home/flux/website && ~/.nvm/versions/node/v18.20.8/bin/node ./node_modules/.bin/vite build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add api/chat.js
git commit -m "feat: inject K-VRC snarky personality into system prompt"
```

---

## Task 2: Add bodyMotion Tag to EMOTION_MAP

**Files:**
- Modify: `src/emotions.js`

Each emotion gets a `bodyMotion` string identifier that `robot.js` will use to dispatch the right animation. This keeps emotions.js as pure data — no Three.js imports needed here.

- [ ] **Step 1: Open `src/emotions.js` and add `bodyMotion` to each entry in `EMOTION_MAP`:**

```js
const EMOTION_MAP = {
  neutral:  { rimHex: 0xff6a00, bloom: 0.8,  floatSpeed: 0.5,  floatAmp: 0.05, headJerk: false, headRapid: false, bodyMotion: 'sway'    },
  happy:    { rimHex: 0xff8c00, bloom: 1.2,  floatSpeed: 0.9,  floatAmp: 0.07, headJerk: false, headRapid: false, bodyMotion: 'nod'     },
  excited:  { rimHex: 0xffffff, bloom: 1.8,  floatSpeed: 1.4,  floatAmp: 0.09, headJerk: false, headRapid: true,  bodyMotion: 'bob'     },
  sad:      { rimHex: 0x4466aa, bloom: 0.4,  floatSpeed: 0.3,  floatAmp: 0.03, headJerk: false, headRapid: false, bodyMotion: 'slump'   },
  angry:    { rimHex: 0xff2200, bloom: 1.6,  floatSpeed: 1.2,  floatAmp: 0.06, headJerk: true,  headRapid: false, bodyMotion: 'shake'   },
  thinking: { rimHex: 0xffcc00, bloom: 0.6,  floatSpeed: 0.4,  floatAmp: 0.04, headJerk: false, headRapid: false, bodyMotion: 'tilt'    },
};
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/flux/website && ~/.nvm/versions/node/v18.20.8/bin/node ./node_modules/.bin/vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/emotions.js
git commit -m "feat: add bodyMotion identifier to EMOTION_MAP entries"
```

---

## Task 3: Body Language System + Mouse Pitch Invert

**Files:**
- Modify: `src/robot.js`

Three changes in one file:
1. **Pitch invert** — negate `ny` in `onMouseMove` so mouse-up = head tilts up
2. **Body language system** — `startBodyMotion(name)` cancels any active motion loop and starts the new one
3. **Per-emotion motion functions** — sway, nod, bob, slump, shake, tilt — each implemented as a self-contained animation using the existing `clock` or `setTimeout`

### Pitch invert fix

- [ ] **Step 1: In `onMouseMove`, change:**

```js
// BEFORE:
targetHeadPitch = ny * THREE.MathUtils.degToRad(15);

// AFTER:
targetHeadPitch = -ny * THREE.MathUtils.degToRad(15);
```

### Body language system

- [ ] **Step 2: Add module-level state for motion tracking (after the existing `let headJerkActive = false;` line):**

```js
let activeMotionId = null;      // RAF id (for RAF-based motions)
let activeShakeTimeout = null;  // timeout id (for shake only)
let activeMotionType = null;    // name of current motion
```

- [ ] **Step 3: Add `startBodyMotion` function (export it, add after `triggerHeadJerk`):**

```js
export function startBodyMotion(name) {
  // Cancel previous motion — RAF and timeout tracked separately
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
```

- [ ] **Step 4: Add the six motion functions (add after `startBodyMotion`):**

```js
// Neutral — slow chest sway side to side
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

// Happy — slow head nod (dip forward and return)
// Note: updateRobot also writes head.rotation.x for mouse pitch.
// The guard in Step 5 skips mouse-pitch tracking when 'nod' is active so this is visible.
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

// Excited — fast root bob (vertical bounce)
// Note: `baseY` is declared at module scope in robot.js (line 17) — safe to reference here.
// updateRobot also writes robotRoot.position.y for float.
// The guard in Step 5 skips float when 'bob' is active so this is visible.
function _motionBob() {
  let t = 0;
  function loop() {
    if (activeMotionType !== 'bob') return;
    t += 0.016;
    if (robotRoot) {
      robotRoot.position.y = baseY + Math.sin(t * 18) * 0.015;
    }
    activeMotionId = requestAnimationFrame(loop);
  }
  loop();
}

// Sad — chest slumps forward, held; stops scheduling once converged
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

// Angry — rapid head shake (3 cycles), then settle
// Uses activeShakeTimeout (not activeMotionId) — must be cleared with clearTimeout
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

// Thinking — head tilts right, held
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
```

- [ ] **Step 5: In `updateRobot`, add four guards to prevent motion conflicts (add after the chest tracking block, replace nothing — these are new lines):**

```js
  // Skip mouse pitch tracking when nod motion owns head.rotation.x
  // (otherwise updateRobot overwrites the nod every frame making it invisible)
  if (activeMotionType !== 'nod' && bones.head) {
    bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, targetHeadPitch, headLerp);
  }

  // Skip float when bob motion owns robotRoot.position.y
  if (activeMotionType !== 'bob') {
    robotRoot.position.y = baseY + Math.sin(clock * currentEmotionCfg.floatSpeed) * currentEmotionCfg.floatAmp;
  }

  // Gradually return chest pitch and head roll to neutral unless held by slump/tilt
  if (activeMotionType !== 'slump' && bones.chest) {
    const target = THREE.MathUtils.degToRad(0);
    const diff = Math.abs(bones.chest.rotation.x - target);
    if (diff > 0.001) bones.chest.rotation.x = THREE.MathUtils.lerp(bones.chest.rotation.x, target, 0.03);
    else bones.chest.rotation.x = target; // settled — stop updating
  }
  if (activeMotionType !== 'tilt' && bones.head) {
    bones.head.rotation.z = THREE.MathUtils.lerp(bones.head.rotation.z, 0, 0.04);
  }
```

**Important:** Remove the existing `bones.head.rotation.x` lerp line from the head tracking block above (it now only runs inside the `activeMotionType !== 'nod'` guard above). The existing float line (`robotRoot.position.y = baseY + ...`) must also be removed from its current location and only kept inside the `activeMotionType !== 'bob'` guard above to avoid double-writing.

- [ ] **Step 6: Add `startBodyMotion` to the robot API return object (in `initRobot`, update the return block):**

```js
  return {
    root: robotRoot,
    bones,
    get faceScreenMesh() { return _faceScreenMesh; },
    setEmotionCfg: (cfg) => { currentEmotionCfg = cfg; },
    triggerHeadJerk,
    startBodyMotion,
  };
```

- [ ] **Step 7: Verify build passes**

```bash
cd /home/flux/website && ~/.nvm/versions/node/v18.20.8/bin/node ./node_modules/.bin/vite build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/robot.js
git commit -m "feat: body language system (sway/nod/bob/slump/shake/tilt) + invert mouse pitch"
```

---

## Task 4: Wire startBodyMotion into applyEmotionFull

**Files:**
- Modify: `src/chat.js` (the `applyEmotionFull` function)

`chat.js` already calls `robotRef?.triggerHeadJerk()` for angry. Add `startBodyMotion` alongside it for all emotions.

- [ ] **Step 1: In `src/chat.js`, update the import at the top — `startBodyMotion` comes from the robot API object (not a direct import), so no import change needed.**

- [ ] **Step 2: Update `applyEmotionFull` to call `startBodyMotion`:**

```js
function applyEmotionFull(emotion) {
  setEmotion(emotion);
  if (sceneRefs) {
    const cfg = applyEmotion(emotion, sceneRefs);
    robotRef?.setEmotionCfg(cfg);
    robotRef?.startBodyMotion(cfg.bodyMotion);
  }
  if (emotion === 'angry') robotRef?.triggerHeadJerk();
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /home/flux/website && ~/.nvm/versions/node/v18.20.8/bin/node ./node_modules/.bin/vite build 2>&1 | tail -5
```

- [ ] **Step 4: Push and verify visually on Vercel**

```bash
git add src/chat.js
git commit -m "feat: wire startBodyMotion into applyEmotionFull for all emotions"
git push origin main
```

**Visual checklist after deploy:**
- [ ] Send a message → K-VRC replies with snarky personality
- [ ] Mouse up → head tilts up (pitch invert working)
- [ ] Reply arrives as `happy` → gentle head nod visible
- [ ] Reply arrives as `thinking` (while fetching) → head tilts right
- [ ] Reply arrives as `sad` → chest slumps forward slightly
- [ ] Reply arrives as `excited` → body bobs
- [ ] Reply arrives as `angry` → head shake plays

---
