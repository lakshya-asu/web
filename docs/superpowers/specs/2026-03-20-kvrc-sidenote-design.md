# K-VRC Sidenote Panel — Design Spec

## Overview

A small "Lakshya's Take" panel that surfaces genuine intellectual perspective when the K-VRC conversation touches topics connected to Lakshya's thinking. K-VRC remains a pure character — the panel does the work of connecting conversation to the person behind it.

**Phase:** 2 (character redesign, independent of animation work)
**Scope:** trigger flag in K-VRC response → second API call → bottom-right UI panel

---

## What Changes in K-VRC

### System prompt update (`api/chat.js` — `SYSTEM_PROMPT`)

Two changes:
1. Remove the directive to answer questions about Lakshya's background/projects. K-VRC's job is to be a character and drive conversation toward depth and nuance — not explain Lakshya's work.
2. Add `sidenote_topic` to the JSON schema K-VRC returns.

K-VRC's JSON schema becomes:
```json
{ "reply": "...", "emotion": "...", "sidenote_topic": "causal RL and generalization gaps" }
```
or when not relevant:
```json
{ "reply": "...", "emotion": "..." }
```

**New system prompt instructions to add:**
- K-VRC's role is to be a character — witty, driven toward depth, intellectually provocative. Not a portfolio explainer.
- When the conversation genuinely touches Lakshya's intellectual territory (causal reasoning, embodied AI, real-world deployment, the philosophy of understanding vs. predicting, structured world models, sample efficiency, etc.), set `sidenote_topic` to a short phrase naming the specific angle (e.g. `"causal RL and generalization"`, `"sim-to-real transfer"`, `"probabilistic grounding"`).
- Set `sidenote_topic` sparingly — only when there's something substantive, not as a reflex on every message.
- When `sidenote_topic` is not warranted, omit the field entirely.

### API response forwarding (`api/chat.js` — response handler)

The handler currently returns only `{ reply, emotion }`. It must be updated to forward `sidenote_topic` when present:

```js
const out = { reply: parsed.reply, emotion: parsed.emotion };
if (parsed.sidenote_topic) out.sidenote_topic = parsed.sidenote_topic;
return res.status(200).json(out);
```

---

## Sidenote API — `/api/sidenote.js`

New Vercel serverless function. Same CORS/auth pattern as `api/chat.js`.

### Input validation
- `topic` — required string, max 200 chars. Return 400 if missing or too long.
- `message` — required string, max 1000 chars. Return 400 if missing or too long.

### Request
```json
{ "topic": "causal RL and generalization gaps", "message": "<original user message>" }
```

### Response — content found
```json
{
  "text": "1–3 sentences of Lakshya's genuine perspective.",
  "links": [
    { "label": "DIA — Causal RL thesis", "url": "https://github.com/lakshya-asu/Discover-Intervene-Adapt-Interleaved-Causal-RL" },
    { "label": "Pearl's causal hierarchy", "url": "https://doi.org/10.1145/3241036" }
  ]
}
```

### Response — nothing meaningful to add
```json
{ "text": null, "links": [] }
```

The canonical null shape always includes `links: []`. The frontend treats `!data.text` as the condition for hiding the panel.

### System prompt character
- Voice is Lakshya's, not K-VRC's — direct, no padding, intellectually honest
- Grounded in the full contents of `lakshya-sidenote.md` baked into the prompt at deploy time
- Responds with genuine perspective on the topic, not a summary of his CV
- Selects 2–3 reference links from the curated seed list below
- Max ~60 words of text, 2–3 links
- When no real insight can be added, returns `{ "text": null, "links": [] }`

### Curated reference seed list (baked into system prompt)

| Label | URL |
|---|---|
| DIA — Causal RL thesis | https://github.com/lakshya-asu/Discover-Intervene-Adapt-Interleaved-Causal-RL |
| MAPG — IROS 2026 paper page | https://lakshya-asu.github.io/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding/ |
| MAPG GitHub | https://github.com/lakshya-asu/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding |
| Snydrone | https://github.com/lakshya-asu/snydrone |
| IntuitionAI | https://github.com/lakshya-asu/IntuitionAI |
| Robotic Chess Arm | https://github.com/lakshya-asu/RobotChessPlayer |
| Forest Surveillance Rover | https://github.com/lakshya-asu/forest_surveillance_rover |
| Forest Rover — IJRASET paper | https://doi.org/10.22214/ijraset.2022.47141 |
| Judea Pearl — The Book of Why | https://doi.org/10.1145/3241036 |
| Lakshya's portfolio | https://lakshya-asu.github.io/web/portfolio.html |

**Model:** `claude-haiku-4-5-20251001` — same as K-VRC, low latency

---

## Frontend Changes

### `src/chat.js`

After receiving K-VRC's reply and before applying emotion, check for `sidenote_topic`:
```js
if (data.sidenote_topic) {
  fetchSidenote(data.sidenote_topic, trimmed); // fire-and-forget, non-blocking
}
```

`fetchSidenote(topic, message)` is imported from `src/sidenote.js`. It is non-blocking — the main chat flow does not await it.

### `src/sidenote.js` (new file)

Owns the sidenote panel DOM and all fetch logic.

**Exports:**
- `fetchSidenote(topic, message)` — calls `/api/sidenote`, then calls `showSidenote` or `hideSidenote`

**Internal:**
- `showSidenote(text, links)` — replace content immediately, add `.visible` class to fade in
- `hideSidenote()` — remove `.visible` class to fade out

**Error handling:** On any fetch error (network failure, non-ok status, JSON parse error), call `hideSidenote()` silently. Never surface errors to the user via this panel.

**Null handling:** If `data.text` is falsy, call `hideSidenote()`.

**Content replacement:** When new content arrives while panel is already visible, replace `#sidenote-text` and `#sidenote-links` immediately (no transition between updates), panel stays visible.

### `index.html`

New panel element inserted before `</body>`:
```html
<div id="sidenote-panel" aria-live="polite" aria-label="Lakshya's perspective">
  <div id="sidenote-label">LAKSHYA'S TAKE</div>
  <p id="sidenote-text"></p>
  <div id="sidenote-links"></div>
</div>
```

### `src/style.css`

Uses existing CSS custom properties and font stack from the file. Fonts `Montserrat` and `Poppins` are already loaded via Google Fonts in `index.html`.

```css
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
  font-family: var(--font-heading); /* Montserrat */
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--accent); /* orange */
  margin-bottom: 0.6rem;
}
#sidenote-text {
  font-family: var(--font-body); /* Poppins */
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

---

## File Changes Summary

| File | Change |
|---|---|
| `api/chat.js` | Update K-VRC system prompt (character-only, sparse `sidenote_topic`); forward `sidenote_topic` in response |
| `api/sidenote.js` | New file — sidenote endpoint with input validation |
| `src/chat.js` | Import `fetchSidenote`; call it when `data.sidenote_topic` is present |
| `src/sidenote.js` | New file — panel DOM, fetch logic, show/hide, error handling |
| `index.html` | Add `#sidenote-panel` markup before `</body>` |
| `src/style.css` | Add sidenote panel styles |

---

## Out of Scope

- No animation between content updates (replace instantly, panel stays visible)
- No history/accumulation — panel shows only the most recent sidenote
- No mobile-specific layout (panel degrades gracefully at small sizes)
- No user interaction beyond clicking reference links
- `lakshya-sidenote.md` is baked into the system prompt at deploy time — not dynamically loaded at runtime
