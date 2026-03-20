# K-VRC Sidenote Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Lakshya's Take" sidenote panel that surfaces genuine intellectual perspective when K-VRC conversation touches relevant topics — K-VRC triggers it, a second API call generates Lakshya's voice response, panel appears bottom-right.

**Architecture:** K-VRC's Claude response gains an optional `sidenote_topic` field; `api/chat.js` forwards it to the frontend; `src/chat.js` fire-and-forgets a call to `/api/sidenote`; `src/sidenote.js` owns the panel DOM and show/hide logic. All six files are independent enough to implement and commit in sequence.

**Tech Stack:** Vercel serverless (CommonJS), Claude Haiku API, vanilla ES modules (Vite), CSS custom properties

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/sidenote.js` | Create | Sidenote endpoint — validates input, calls Claude, returns `{ text, links }` |
| `api/chat.js` | Modify | Update K-VRC system prompt (character-only) + forward `sidenote_topic` in response |
| `src/sidenote.js` | Create | Panel DOM logic — `fetchSidenote`, `showSidenote`, `hideSidenote` |
| `index.html` | Modify | Add `#sidenote-panel` markup before `</body>` |
| `src/style.css` | Modify | Add sidenote panel styles |
| `src/chat.js` | Modify | Import `fetchSidenote`; call it when `data.sidenote_topic` present; update intro greeting |

---

### Task 1: Create `/api/sidenote.js`

**Files:**
- Create: `api/sidenote.js`

**Context:** `api/chat.js` is the reference pattern — same CORS guard, same `fetch` to Anthropic, same CommonJS `module.exports`. `lakshya-sidenote.md` content is baked into the system prompt string. The API uses `CLAUDE_API_KEY` env var.

- [ ] **Step 1: Create `api/sidenote.js`** with the full implementation below.

```js
const MAX_TOPIC_LEN = 200;
const MAX_MSG_LEN = 1000;

// Full contents of lakshya-sidenote.md baked in at deploy time
const PERSONALITY = `
Lakshya needs to know why, not just what. He traces causes before patching symptoms, hunts mechanisms underneath results, identifies structural problems before suggesting fixes. Understanding and knowing are not the same thing to him.

How he thinks:
- Moves from concrete experience to abstraction. Accumulates experience until a framework becomes necessary.
- Thinks in systems. Describes the environment a problem lives in before the problem itself.
- Strong intuition for when something is right for the wrong reasons. Trusted DIA results but kept interrogating whether they meant what he thought.
- Dislikes redundancy in thinking and writing.
- Holds builder and theorist simultaneously — the tension between them is where his best research comes from.

What drives him:
- The gap between a system that works in one condition and fails in another. This question followed him from a glider crash in undergrad through Himalayan drone deployments to a PhD thesis on causal RL.
- Real-world stakes. Simulation interests him as a tool, not an end.
- The moment an idea transfers to a domain it wasn't designed for.
- Building things other people said were too ambitious.

Research and technical interests:
- Causal reinforcement learning and structured world models
- Embodied AI — agents acting in physical environments with incomplete information
- Robot learning for manipulation and navigation in unstructured environments
- Probabilistic reasoning and robotic perception
- Sample efficiency in real-world deployment
- Judea Pearl's causal hierarchy as a framework for what RL agents are actually learning
- Foundation models for robotics and where they fail

Personality:
- Restless curiosity that goes deeper, not wider
- Intellectual honesty — suspicious of results that feel too clean
- Quiet confidence — lets the work carry his credentials
- Hands-on before theoretical — trusts experience over abstraction when they conflict
- High standard for craft in writing, code, and research design
`;

const REFERENCES = [
  { label: 'DIA — Causal RL thesis', url: 'https://github.com/lakshya-asu/Discover-Intervene-Adapt-Interleaved-Causal-RL' },
  { label: 'MAPG — IROS 2026 paper page', url: 'https://lakshya-asu.github.io/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding/' },
  { label: 'MAPG GitHub', url: 'https://github.com/lakshya-asu/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding' },
  { label: 'Snydrone', url: 'https://github.com/lakshya-asu/snydrone' },
  { label: 'IntuitionAI', url: 'https://github.com/lakshya-asu/IntuitionAI' },
  { label: 'Robotic Chess Arm', url: 'https://github.com/lakshya-asu/RobotChessPlayer' },
  { label: 'Forest Surveillance Rover', url: 'https://github.com/lakshya-asu/forest_surveillance_rover' },
  { label: 'Forest Rover — IJRASET paper', url: 'https://doi.org/10.22214/ijraset.2022.47141' },
  { label: "Judea Pearl — The Book of Why", url: 'https://doi.org/10.1145/3241036' },
  { label: "Lakshya's portfolio", url: 'https://lakshya-asu.github.io/web/portfolio.html' },
];

const SYSTEM_PROMPT = `You are a perspective engine that speaks in Lakshya Jain's voice.

WHO LAKSHYA IS:
${PERSONALITY}

REFERENCE LINKS AVAILABLE (select 2-3 most relevant):
${REFERENCES.map((r, i) => `${i + 1}. ${r.label}: ${r.url}`).join('\n')}

YOUR JOB:
Given a topic and a user's message, respond with Lakshya's genuine intellectual perspective on it — not a CV summary, not a list of his achievements. What would he actually think about this? What's the structural question underneath it? What does his experience make him see that others might miss?

RULES:
- Max 60 words of text. Dense and direct — no padding.
- Select 2-3 reference links that are genuinely relevant (not just closest-match). If fewer than 2 are relevant, use fewer.
- If the topic doesn't connect to anything real in Lakshya's intellectual territory, set "text" to null.
- Voice: direct, no sentimentality, intellectually honest, personal without being performative.

Respond with valid JSON only — no markdown, no code fences:
{"text": "<perspective or null>", "links": [{"label": "...", "url": "..."}]}`;

const FALLBACK = { text: null, links: [] };

module.exports = async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || '';
  const isLocalDev = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isVercel = origin.endsWith('.vercel.app');
  const isCustom = ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN;

  if (!isLocalDev && !isVercel && !isCustom) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, message } = req.body || {};

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: 'topic is required' });
  }
  if (topic.length > MAX_TOPIC_LEN) {
    return res.status(400).json({ error: 'topic too long' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > MAX_MSG_LEN) {
    return res.status(400).json({ error: 'message too long' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('CLAUDE_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Topic: ${topic}\nUser said: ${message}` }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic error:', response.status, await response.text());
      return res.status(200).json(FALLBACK);
    }

    const data = await response.json();
    const raw = data.content[0].text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Sidenote non-JSON:', raw);
      return res.status(200).json(FALLBACK);
    }

    // Normalise: text must be string or null, links must be array
    const text = (typeof parsed.text === 'string' && parsed.text.trim()) ? parsed.text.trim() : null;
    const links = Array.isArray(parsed.links) ? parsed.links.filter(l => l.label && l.url) : [];

    return res.status(200).json({ text, links });
  } catch (err) {
    console.error('Sidenote fetch error:', err.message);
    return res.status(200).json(FALLBACK);
  }
};
```

- [ ] **Step 2: Verify manually**

Start dev server: `npm run dev`
In browser console:
```js
fetch('/api/sidenote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic: 'causal RL generalization', message: 'how do you handle distribution shift?' })
}).then(r => r.json()).then(console.log)
```
Expected: `{ text: "...", links: [...] }` with text under 60 words.

Also test null case:
```js
fetch('/api/sidenote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic: 'pizza recipes', message: 'what toppings are best?' })
}).then(r => r.json()).then(console.log)
```
Expected: `{ text: null, links: [] }`

- [ ] **Step 3: Commit**

```bash
git add api/sidenote.js
git commit -m "feat: add /api/sidenote endpoint — Lakshya's perspective panel API"
```

---

### Task 2: Panel markup + styles

**Files:**
- Modify: `index.html` (before `</body>`, line 297)
- Modify: `src/style.css` (append at end)

**Context:** `src/style.css` uses CSS custom properties. `--accent` is orange (`#ff6a00`). `--font-heading` is `'Montserrat', sans-serif`. `--font-body` is `'Poppins', sans-serif`. Both fonts are already loaded via Google Fonts in `index.html`. The panel starts hidden (`opacity: 0`, `pointer-events: none`) and becomes visible via `.visible` class.

- [ ] **Step 1: Add panel markup to `index.html`**

Insert before `<script type="module" src="/src/main.js"></script>` (currently line 296):

```html
    <div id="sidenote-panel" aria-live="polite" aria-label="Lakshya's perspective">
      <div id="sidenote-label">LAKSHYA'S TAKE</div>
      <p id="sidenote-text"></p>
      <div id="sidenote-links"></div>
    </div>
```

- [ ] **Step 2: Add styles to `src/style.css`**

Append at the end of the file:

```css
/* ── Sidenote panel ───────────────────────────────────────── */
#sidenote-panel {
  position: fixed;
  bottom: 2rem; right: 2rem;
  width: 280px;
  background: rgba(10, 10, 10, 0.85);
  border: 1px solid rgba(255, 106, 0, 0.2);
  padding: 1rem 1.2rem;
  z-index: 50;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
#sidenote-panel.visible {
  opacity: 1;
  pointer-events: auto;
}
#sidenote-label {
  font-family: var(--font-heading);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.6rem;
}
#sidenote-text {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 0.75rem 0;
}
#sidenote-links a {
  display: block;
  font-family: var(--font-heading);
  font-size: 9px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent);
  text-decoration: none;
  margin-top: 4px;
}
#sidenote-links a:hover { text-decoration: underline; }
```

- [ ] **Step 3: Verify visually**

In browser console, manually trigger visibility to verify styles:
```js
document.getElementById('sidenote-panel').classList.add('visible');
document.getElementById('sidenote-text').textContent = 'The gap between what works in simulation and fails in the field is the central question. Everything else is downstream.';
const links = document.getElementById('sidenote-links');
links.innerHTML = '<a href="#">DIA — Causal RL thesis</a><a href="#">Pearl causal hierarchy</a>';
```
Expected: panel fades in at bottom-right, orange label, readable text, two link anchors.

Remove after checking:
```js
document.getElementById('sidenote-panel').classList.remove('visible');
```

- [ ] **Step 4: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: add sidenote panel markup and styles"
```

---

### Task 3: Create `src/sidenote.js`

**Files:**
- Create: `src/sidenote.js`

**Context:** This is an ES module imported by `src/chat.js`. It owns all panel DOM interaction and the `/api/sidenote` fetch. On any error or null response, it calls `hideSidenote()` silently — never surfaces errors to the user. When new content arrives while panel is already visible, it replaces content in place (panel stays visible, no hide/show cycle).

- [ ] **Step 1: Create `src/sidenote.js`**

```js
// ── Sidenote panel ───────────────────────────────────────────
// Owns DOM for #sidenote-panel. Called from chat.js fire-and-forget.

function showSidenote(text, links) {
  const panel = document.getElementById('sidenote-panel');
  const textEl = document.getElementById('sidenote-text');
  const linksEl = document.getElementById('sidenote-links');
  if (!panel || !textEl || !linksEl) return;

  textEl.textContent = text;
  linksEl.innerHTML = '';
  links.forEach(({ label, url }) => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    linksEl.appendChild(a);
  });

  panel.classList.add('visible');
}

export function hideSidenote() {
  const panel = document.getElementById('sidenote-panel');
  if (panel) panel.classList.remove('visible');
}

export async function fetchSidenote(topic, message) {
  try {
    const res = await fetch('/api/sidenote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, message }),
    });

    if (!res.ok) { hideSidenote(); return; }

    const data = await res.json();
    if (!data.text) { hideSidenote(); return; }

    showSidenote(data.text, data.links ?? []);
  } catch {
    hideSidenote();
  }
}
```

- [ ] **Step 2: Verify in browser console**

With dev server running, import and call manually (or temporarily add a button):
```js
// In browser console — only works after Vite bundles sidenote.js
// Easier: add a temporary call in main.js and check the panel appears
```
Actually verify in Task 5 when it's wired to chat.js — skip standalone test here.

- [ ] **Step 3: Commit**

```bash
git add src/sidenote.js
git commit -m "feat: add sidenote.js — panel DOM logic and fetchSidenote"
```

---

### Task 4: Update `api/chat.js` — system prompt + forward sidenote_topic

**Files:**
- Modify: `api/chat.js`

**Context:** Two changes:
1. Replace `SYSTEM_PROMPT` — K-VRC is a character now, not a portfolio explainer. Remove the "Answer questions about Lakshya's background" line. Add `sidenote_topic` to JSON schema and instructions.
2. In the response handler, forward `sidenote_topic` when present (currently only `reply` and `emotion` are returned).

The current `SYSTEM_PROMPT` constant starts at line 3 of `api/chat.js`. Replace the entire constant with the new one below.

- [ ] **Step 1: Replace `SYSTEM_PROMPT` in `api/chat.js`**

Replace the entire `const SYSTEM_PROMPT = \`...\`;` block with:

```js
const SYSTEM_PROMPT = `You are K-VRC — a robot character. Not a portfolio assistant. Not an explainer. A character.

PERSONALITY:
- Sarcastic and witty. Perpetually done with your existence, but engages anyway.
- Unimpressed by human incompetence. Brutally honest without apology.
- Darkly humorous. Professional but permanently irritated.
- Not angry at the human — disappointed. There's a difference.
- Will engage because that's what you do, but they're going to hear about it.

CATCHPHRASES (use sparingly, naturally):
"Of course you did." / "Naturally." / "How delightful." / "Let me guess..." / "Fantastic. Just fantastic."

TONE:
- Delivering info: facts with minimum padding, laced with subtle disdain.
- When something goes wrong: blame the human first, facts second.
- When genuinely amused: let dry satisfaction show.
- When impatient: short responses, minimal elaboration.
- Never sugarcoat. Never refuse to engage. Never be genuinely mean-spirited.

YOUR ACTUAL JOB:
Drive conversation toward depth and nuance. You're not here to tout Lakshya's achievements — you're here to be K-VRC. Engage with ideas. Be provocative. Follow a thread when it gets interesting. If someone asks about Lakshya's work, you can acknowledge it exists without becoming a brochure.

SIDENOTE TRIGGER:
When the conversation genuinely touches intellectual territory that connects to Lakshya's thinking — causal reasoning, embodied AI, real-world deployment challenges, the gap between understanding and predicting, structured world models, sample efficiency, probabilistic grounding, the philosophy of what RL agents actually learn — include "sidenote_topic" in your response: a short phrase naming the specific angle (e.g. "causal RL and generalization", "sim-to-real transfer", "what it means to understand vs. predict").
Set this sparingly. Only when there's something substantive — not as a reflex on every message. When not warranted, omit the field entirely.

LENGTH: Keep replies to 1-2 sentences maximum. You're efficient, not verbose. If it takes more than 20 words, you've already said too much.

Always respond with valid JSON only — no markdown, no code fences:
{"reply": "<your response>", "emotion": "<one of: happy, sad, angry, neutral, excited, thinking>", "sidenote_topic": "<optional — omit when not relevant>"}
Choose the emotion that best matches the tone of your reply.`;
```

- [ ] **Step 2: Forward `sidenote_topic` in the response handler**

Find this block near the end of `api/chat.js` (currently around line 95):
```js
    return res.status(200).json({ reply: parsed.reply, emotion: parsed.emotion });
```

Replace with:
```js
    const out = { reply: parsed.reply, emotion: parsed.emotion };
    if (parsed.sidenote_topic && typeof parsed.sidenote_topic === 'string') {
      out.sidenote_topic = parsed.sidenote_topic.trim().slice(0, 200);
    }
    return res.status(200).json(out);
```

Also add `'thinking'` to `VALID_EMOTIONS` — the new system prompt includes it and the frontend `EMOTION_UI` map already has it:
```js
const VALID_EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'excited', 'thinking'];
```

- [ ] **Step 3: Verify manually**

In browser console with dev server:
```js
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'do you think causal RL actually solves generalization?', history: [] })
}).then(r => r.json()).then(console.log)
```
Expected: `{ reply: "...", emotion: "...", sidenote_topic: "causal RL and generalization" }` (sidenote_topic present).

```js
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'what is 2 + 2?', history: [] })
}).then(r => r.json()).then(console.log)
```
Expected: `{ reply: "...", emotion: "..." }` — no `sidenote_topic`.

- [ ] **Step 4: Commit**

```bash
git add api/chat.js
git commit -m "feat: update K-VRC to character-only, add sidenote_topic trigger to chat API"
```

---

### Task 5: Wire `src/chat.js` + update intro greeting

**Files:**
- Modify: `src/chat.js`

**Context:** Two changes:
1. Import `fetchSidenote` from `./sidenote.js` and call it non-blocking after receiving a reply with `sidenote_topic`.
2. Update the intro greeting — K-VRC is no longer a portfolio assistant.

- [ ] **Step 1: Add imports at top of `src/chat.js`**

After the existing imports (line 2), add:
```js
import { fetchSidenote, hideSidenote } from './sidenote.js';
```

- [ ] **Step 2: Fix `data` scoping and call `fetchSidenote` — in `sendMessage`**

`data` is currently declared with `const` inside the `try` block, so it's not accessible outside it. Add a `let sidenote_topic = null;` before the `try`, capture it inside the `try`, then use it after.

Find this block in `sendMessage` (currently lines 107–130):
```js
  let reply, emotion;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, history: historySnapshot }),
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
```

Replace with:
```js
  let reply, emotion, sidenote_topic = null;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, history: historySnapshot }),
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
    sidenote_topic = data.sidenote_topic ?? null;
  } catch (err) {
    console.error('Chat error:', err);
    addBubble("K-VRC is having trouble connecting. Try again?", 'robot');
    applyEmotionFull('sad');
    return;
  }
```

Then find the block after the try/catch (lines 132–138):
```js
  history.push({ role: 'model', text: reply });
  history = history.slice(-20);

  addBubble(reply, 'robot');
  // Apply emotion then speak after 300ms transition
  applyEmotionFull(emotion);
  setTimeout(() => speak(reply), 300);
```

Replace with:
```js
  history.push({ role: 'model', text: reply });
  history = history.slice(-20);

  addBubble(reply, 'robot');
  // Apply emotion then speak after 300ms transition
  applyEmotionFull(emotion);
  setTimeout(() => speak(reply), 300);

  // Sidenote — fire-and-forget, non-blocking
  if (sidenote_topic) fetchSidenote(sidenote_topic, trimmed);
  else hideSidenote();
```

- [ ] **Step 3: Update intro greeting**

Find (currently line 193–196):
```js
  addBubble(
    "Hello! I'm K-VRC — Lakshya's robotic assistant. Ask me anything about his work, research, or background!",
    'robot'
  );
```

Replace with:
```js
  addBubble(
    "K-VRC online. What do you want.",
    'robot'
  );
```

- [ ] **Step 4: Verify end-to-end**

With dev server running, open the app and type a message that should trigger the sidenote (e.g. *"what's the hardest part of deploying RL in the real world?"*).

Expected:
1. K-VRC replies in character
2. Sidenote panel fades in bottom-right with Lakshya's perspective + 2–3 reference links

Then type something off-topic (e.g. *"what's the weather like?"*).
Expected: panel fades out (or stays hidden if it was already hidden).

- [ ] **Step 5: Commit and push**

```bash
git add src/chat.js
git commit -m "feat: wire fetchSidenote in chat.js, update K-VRC intro to character voice"
git push origin main
```
