# K-VRC Interactive Portfolio Overhaul — Design Spec
**Date:** 2026-03-19
**Author:** Lakshya Jain
**Status:** Approved

---

## Overview

Overhaul Lakshya Jain's robotics portfolio site into an immersive, interactive experience featuring the K-VRC robot character rendered in Three.js. The robot is the centrepiece: it tracks the user's mouse, displays animated emotions on a face screen, and can be conversed with via a chat interface powered by Gemini 2.0 Flash. The aesthetic is inspired by the NEXBOT Spline community scene — dark void background, neon cyan/blue rim lighting, and bloom post-processing.

---

## Architecture

```
Vercel Deployment
├── Vite frontend (static build output)
│   ├── Three.js scene
│   ├── Emotion engine
│   ├── Chat UI + TTS
│   └── Web Speech API (STT + TTS)
└── /api/chat (serverless Node function)
    └── Proxies to Gemini 2.0 Flash API
        (GEMINI_API_KEY stored in Vercel env vars only)
```

**Data flow:**
1. User types or speaks → frontend POSTs `{ message, history }` to `/api/chat`
2. Serverless function calls Gemini, receives `{ reply, emotion }`
3. Frontend applies emotion to face screen + robot animations + scene effects
4. TTS speaks the reply; mouth bone animates during speech

---

## Project Migration

The current repo is a plain `index.html` / `styles.css` / `script.js` site with no build toolchain.

Migration steps:
- Introduce `package.json` and Vite as the build tool
- Move existing HTML content (all sections below the hero) into the new `index.html` inside the Vite project root
- Replace `script.js` and `styles.css` with the `src/` module structure below
- The existing portfolio sections (experience, projects, publications, skills, contact) are preserved verbatim below the hero — only the hero section is replaced with the Three.js canvas + chat overlay

---

## Asset Paths

All paths are relative to the repo root:

| Asset | Repo location | Vite public path |
|-------|--------------|-----------------|
| Robot GLB | `k-vrc_rigged.glb` (repo root) | Move to `public/k-vrc_rigged.glb` |
| Diffuse texture | `k-vrc-rigged/textures/diffuse.jpeg` (canonical) | Embedded in GLB, or move to `public/textures/` |
| Normal texture | `k-vrc-rigged/textures/Normal.jpeg` (canonical) | Same as above |
| Roughness texture | `k-vrc-rigged/textures/Roughness.jpeg` (canonical) | Same as above |
| Emission texture | `k-vrc-rigged/textures/emission.jpeg` (canonical) | Same as above |
| AO texture | Inside `k-vrc-rigged/source/K-VRC Rigged.zip` only | See AO note below |

Note: loose texture files exist in two locations — `k-vrc-rigged/textures/` (canonical copies used for this project) and potentially at the repo root. Use the `k-vrc-rigged/textures/` copies as the source of truth.

**AO note:** The AO texture exists only inside the source zip. If the GLB was exported from Blender with AO baked into the diffuse, no separate `aoMap` is needed. If not, `MeshStandardMaterial.aoMap` requires a second UV set (`uv2`); inspect the GLB's geometry attributes and document whether `uv2` is present before implementation.

**Action required before implementation:** Move `k-vrc_rigged.glb` to `public/k-vrc_rigged.glb`. Verify textures are embedded in the GLB (Blender's "Include > Textures" export option). If not embedded, move `k-vrc-rigged/textures/` files to `public/textures/`.

---

## Bone Inventory

Before writing `robot.js`, the developer must log the full skeleton to identify exact bone names:

```js
gltf.scene.traverse(obj => {
  if (obj.isBone) console.log(obj.name);
});
```

Document the names found for: head, eyes (L/R), jaw/mouth, chest/spine, root. These names must be hardcoded as constants at the top of `robot.js`, e.g.:

```js
const BONES = {
  head: 'Head',       // replace with actual name
  jaw:  'Jaw',        // replace with actual name
  chest: 'Spine1',    // replace with actual name
};
```

The exact names depend on the Blender armature and will not be known until the GLB is inspected at runtime.

---

## Three.js Scene

**Canvas:** Full viewport, `position: fixed`, `z-index: 0`. Handles `window.resize` — on resize, update `renderer.setSize(window.innerWidth, window.innerHeight)` and `camera.aspect`, then call `camera.updateProjectionMatrix()`.

**Camera:** Fixed perspective, framed chest-up on K-VRC, slight low angle. No orbit controls.

**Background:** Pure black (`#000000`). No floor, no skybox.

**Lighting:**
- `AmbientLight` — intensity 0.05 (near-black fill)
- `RectAreaLight` behind robot — soft cyan/blue rim glow. **Required:** call `RectAreaLightUniformsLib.init()` once at scene startup (import from `three/addons/lights/RectAreaLightUniformsLib.js`) — without it, `RectAreaLight` renders as black.
- `PointLight` at face screen position — emissive pulse, colour shifts with emotion

**Model loading:**
- Use `GLTFLoader` from `three/addons`
- Show a loading indicator (see Loading State below) while the GLB fetches
- Intro greeting fires only after the GLB load promise resolves and the scene is ready

**Mouse tracking (head bone):**
- On `mousemove`, normalise cursor: `nx = (event.clientX / window.innerWidth) * 2 - 1`, `ny = -(event.clientY / window.innerHeight) * 2 + 1`
- Map `nx` → target yaw on head bone clamped to ±25°; `ny` → target pitch clamped to ±15°
- Smooth lerp each frame toward target angles (lerp factor ~0.05)
- Secondary chest bone: same direction, lower weight (factor ~0.02), clamped to ±8°
- Note: do NOT use `Raycaster` for this — direct normalised coordinate mapping only

**Post-processing (`three/addons/postprocessing`):**
- `EffectComposer` + `RenderPass` + `UnrealBloomPass`
- Bloom on emissive mesh parts; intensity and rim light colour shift per emotion state

**Idle animation:**
- Slow vertical float: `robot.position.y = baseY + Math.sin(clock * 0.5) * 0.05`
- Random eye blink every 3–6 seconds (close jaw/eye bones briefly then reopen)

**Emotion → scene effect mapping:**
| Emotion   | Rim colour   | Bloom intensity | Body motion        |
|-----------|-------------|-----------------|-------------------|
| neutral   | `#00f5ff`   | 0.8             | slow float         |
| happy     | `#00f5ff`   | 1.2             | faster bounce      |
| excited   | `#ffffff`   | 1.8 (pulse)     | rapid head motion  |
| sad       | `#4444ff`   | 0.4             | slow droop         |
| angry     | `#ff2200`   | 1.4             | sharp jerk         |
| thinking  | `#ffaa00`   | 0.6             | slow oscillate     | ← client-side only, never returned by Gemini |

---

## Loading State

While the GLB is downloading, display a minimal loading overlay (dark background, centered text "Initialising K-VRC...") with a CSS fade-out animation on load complete. This prevents a blank black canvas on slow connections.

---

## Face Screen

A `PlaneGeometry` whose world transform is manually synced each frame to the face bone's world matrix.

**Important ordering:** `getWorldPosition` and `getWorldQuaternion` must be called before the offset is applied. The offset must use `applyQuaternion` (not `translateZ`) to avoid per-frame drift if lines are reordered:

```js
// Declare ONCE outside the render loop — avoid per-frame GC allocation:
const _faceOffset = new THREE.Vector3();

// Each frame in the render loop:
faceBone.getWorldPosition(faceScreen.position);
faceBone.getWorldQuaternion(faceScreen.quaternion);
// Apply offset in bone-local forward direction (do NOT use translateZ — it accumulates if ordering changes)
_faceOffset.set(0, 0, 0.05).applyQuaternion(faceScreen.quaternion);
faceScreen.position.add(_faceOffset);
faceScreen.updateMatrixWorld();
```

Rendered with a `CanvasTexture` drawn via the Canvas 2D API — no external image assets.

**Emotion sprites (drawn via Canvas 2D API):**
```
happy    (o  o)  ──
sad      (T  T)  ____
angry    (>  <)  ────
neutral  (o  o)  __
excited  (*  *)  ~~~
thinking (·  ·)  ...  ← animated dots cycle
```

**Transitions:**
- 300ms opacity crossfade between emotion states (update canvas, tween `material.opacity`)
- Random blink (close/open eye shapes) every 3–6s, independent of emotion
- `thinking` state shows animated cycling dots (`·`, `··`, `···`) updated every 400ms
- `thinking` is a **client-side-only** state — it is set when the fetch starts and cleared when the response arrives. It is never returned by Gemini.

---

## Chat UI

Overlaid on the Three.js canvas via `position: absolute`, `z-index: 10`. Frosted glass style (`backdrop-filter: blur(12px)`, dark semi-transparent background). Positioned at the bottom of the viewport.

**Layout:**
```
┌──────────────────────────────────────┐
│  role="log" aria-live="polite"       │
│  Conversation bubbles (scrollable)   │
│  K-VRC: ...                          │
│                        You: ...      │
├──────────────────────────────────────┤
│ 🎤 │ Type a message...     │  Send  │
└──────────────────────────────────────┘
```

**Accessibility:**
- Conversation container: `role="log"`, `aria-live="polite"`, `aria-label="Conversation with K-VRC"`
- Text input: `aria-label="Message K-VRC"`
- Mic button: `aria-label="Start voice input"` (toggle to "Stop voice input" when active)

**Mic input:**
- Uses `SpeechRecognition` (Web Speech API) — transcription fills the text input on result
- If browser does not support `SpeechRecognition`, hide the mic button

**Conversation history:**
- Kept in a module-level array in `chat.js`: `Array<{role: "user"|"model", text: string}>`
- The array itself is trimmed in-place to the last 20 turns after each exchange: `history = history.slice(-20)`
- The same (already-trimmed) array is sent to `/api/chat` — no separate slice needed at send time
- Cleared on page reload (no persistence)

**On page load:**
- Wait for GLB load to complete, then show the intro greeting text bubble:
  `"Hello! I'm K-VRC — Lakshya's robotic assistant. Ask me anything about his work, research, or background!"`
- Set emotion to `excited`
- **TTS for intro greeting:** browsers block `speechSynthesis.speak()` without a prior user gesture. Do NOT auto-play TTS on load. Instead, the intro greeting text bubble appears silently; TTS begins only from the user's first Send/mic action. This is a browser security constraint, not a bug.

---

## Gemini Integration

**Endpoint:** `POST /api/chat`

**Request body:**
```json
{
  "message": "string",
  "history": [{ "role": "user" | "model", "text": "string" }]
}
```

**Response:**
```json
{ "reply": "string", "emotion": "happy" | "sad" | "angry" | "neutral" | "excited" }
```

Note: `thinking` is excluded from the Gemini response enum — it is a client-side UI state only.

**Serverless function (`api/chat.js`):**
- Reads `GEMINI_API_KEY` from `process.env`
- Calls Gemini 2.0 Flash with `responseMimeType: "application/json"` to enforce JSON syntax
- After parsing, validates response schema: `reply` must be a non-empty string; `emotion` must be one of `["happy", "sad", "angry", "neutral", "excited"]`. If either check fails, return the fallback below.
- If response parsing or validation fails, return `{ reply: "I'm having a little glitch. Try again!", emotion: "neutral" }` fallback
- Validates `message` is a non-empty string; returns 400 if missing
- Caps `message` length at 1000 characters server-side
- Returns 500 with a safe error message (no key or internal details) on Gemini failure

**Error states (client-side):**
- On network error or 5xx: show bubble "K-VRC is having trouble connecting. Try again?" + set emotion to `sad`
- On 400: show "Message too long or invalid." + stay in `neutral`
- While awaiting response: set emotion to `thinking`, disable send button

**CORS / origin restriction:**
- The serverless function must set `Access-Control-Allow-Origin` to the production domain only (e.g. `https://yourdomain.vercel.app`)
- Return 403 for requests from any other origin — do NOT use `*`
- This prevents third-party pages from exhausting the Gemini quota via the open endpoint

**Rate limiting:**
- Use Vercel's built-in request limits; additionally, debounce the Send button (disable for 1s after each send)
- Document in README that the Gemini key should have quotas set in Google AI Studio

**System prompt (injected server-side, not exposed to client):**
```
You are K-VRC, a friendly robot assistant on Lakshya Jain's portfolio website.
Lakshya is a robotics software engineer (MS Robotics, ASU) specialising in causal
reinforcement learning, ROS2/MoveIt, embodied AI, and real-world robot deployment.
His notable work includes the DIA causal RL thesis, metric-semantic scene understanding,
and experience at Indrones and IIT Bombay. He has publications at IROS 2026 and NeurIPS 2026.

Answer questions about Lakshya's background, projects, and research concisely and warmly.
For unrelated questions, you may answer briefly but gently steer back to Lakshya's work.

Always respond with valid JSON only:
{"reply": "<your response>", "emotion": "<one of: happy, sad, angry, neutral, excited>"}
Choose the emotion that best matches the tone of your reply.
```

---

## TTS

- `window.speechSynthesis` — no API key required
- Voice selection must use the `voiceschanged` event (voices load asynchronously):
  ```js
  speechSynthesis.addEventListener('voiceschanged', () => {
    voices = speechSynthesis.getVoices();
    // prefer: voices where name includes 'Google' and lang starts with 'en'
    // fallback: voices[0]
  });
  ```
- Settings: `utterance.rate = 0.95`, `utterance.pitch = 0.85`
- Mouth bone (jaw) opens/closes at ~8Hz while `utterance.onboundary` fires; fully closes on `utterance.onend`
- TTS fires after the 300ms emotion transition completes

---

## File Structure

```
repo/
├── api/
│   └── chat.js              # Vercel serverless function
├── src/
│   ├── main.js              # Entry: scene init, render loop, resize handler
│   ├── robot.js             # GLB loader, bone refs, mouse tracking, animations
│   ├── faceScreen.js        # Canvas texture emotion renderer + transitions
│   ├── chat.js              # Chat UI, fetch /api/chat, TTS, history management
│   └── style.css            # Global styles + chat UI + loading overlay
├── public/
│   └── k-vrc_rigged.glb     # Robot model (moved from repo root)
├── index.html               # Preserved portfolio HTML; hero section replaced
├── vite.config.js
├── vercel.json
├── package.json
└── .env.example             # Documents GEMINI_API_KEY=your_key_here (no real values)
```

**`vercel.json`:**
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
The `rewrites` entry ensures `/api/*` routes correctly to the serverless functions from the `dist` static output. Without it, requests to `/api/chat` may 404 in production when `outputDirectory` is set to `dist` with `framework: null`. The `/api` directory sits at the repo root (not inside `dist`) — Vercel handles it separately from the static build.

---

## Deployment

1. Move `k-vrc_rigged.glb` to `public/`
2. Push repo to GitHub
3. Import project to Vercel
4. Set `GEMINI_API_KEY` in Vercel project → Settings → Environment Variables
5. Set quota limits on the key in Google AI Studio to prevent abuse
6. Vercel auto-builds on push; `/api/chat.js` becomes a serverless function automatically

---

## Out of Scope

- Persistent chat history (resets on page reload)
- Mobile layout optimisation (desktop-first; canvas degrades gracefully)
- Custom trained TTS voice (Web Speech API only)
- Spline embed (pure Three.js instead)
- Authentication or user accounts
- Analytics or logging of conversations
