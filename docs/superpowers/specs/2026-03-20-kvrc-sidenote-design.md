# K-VRC Sidenote Panel — Design Spec

## Overview

A small "Lakshya's Take" panel that surfaces genuine intellectual perspective when the K-VRC conversation touches topics connected to Lakshya's thinking. K-VRC remains a pure character — the panel does the work of connecting conversation to the person behind it.

**Phase:** 2 (character redesign, independent of animation work)
**Scope:** trigger flag in K-VRC response → second API call → bottom-right UI panel

---

## What Changes in K-VRC

K-VRC's system prompt and JSON schema gain one addition: an optional `sidenote_topic` field.

When K-VRC decides the conversation has touched something genuinely connected to Lakshya's intellectual territory — causal reasoning, embodied AI, real-world deployment, the philosophy of understanding vs. predicting, etc. — it includes:

```json
{ "reply": "...", "emotion": "...", "sidenote_topic": "causal RL and generalization gaps" }
```

When the topic isn't relevant, `sidenote_topic` is absent or `null`.

K-VRC is the gatekeeper. It has conversation context to judge relevance. The topic string is a focused phrase (not the raw user message) that helps the sidenote API know which angle to take.

**Updated K-VRC system prompt additions:**
- K-VRC's job is to be a character and drive conversation toward depth and nuance — not to explain Lakshya's work
- When the conversation touches Lakshya's genuine intellectual territory, set `sidenote_topic` to a short phrase naming it
- `sidenote_topic` should be set sparingly — only when there's something real to say, not as a reflex

---

## Sidenote API — `/api/sidenote.js`

New Vercel serverless function. Same CORS/auth pattern as `api/chat.js`.

**Request:**
```json
{ "topic": "causal RL and generalization gaps", "message": "<original user message>" }
```

**Response:**
```json
{
  "text": "1–3 sentences of Lakshya's genuine perspective.",
  "links": [
    { "label": "DIA — Causal RL thesis", "url": "https://github.com/lakshya-asu/Discover-Intervene-Adapt-Interleaved-Causal-RL" },
    { "label": "Pearl's causal hierarchy", "url": "https://doi.org/10.1145/3241036" }
  ]
}
```

Or if nothing meaningful can be added:
```json
{ "text": null, "links": [] }
```

**System prompt character:**
- Voice is Lakshya's, not K-VRC's — direct, no padding, intellectually honest
- Grounded in `lakshya-sidenote.md` — his instincts, what drives him, what he finds interesting
- Responds with genuine perspective on the topic, not a summary of his CV
- Selects 2–3 reference links from a curated seed list baked into the prompt
- Max ~60 words of text, 2–3 links
- Returns `{ "text": null }` when no real insight can be added

**Curated reference seed list (baked into system prompt):**
- DIA thesis GitHub
- MAPG / IROS paper page
- Snydrone GitHub
- Judea Pearl — The Book of Why (ISBN reference)
- Pearl causal hierarchy paper DOI
- Forest Surveillance Rover paper (IJRASET DOI)
- IntuitionAI GitHub
- Robotic Chess Arm GitHub
- Lakshya's portfolio page

**Model:** `claude-haiku-4-5-20251001` — same as K-VRC, low latency

---

## Frontend Changes

### `src/chat.js`
After receiving K-VRC's reply, check for `sidenote_topic`:
```js
if (data.sidenote_topic) {
  fetchSidenote(data.sidenote_topic, trimmed); // fire-and-forget, non-blocking
}
```

`fetchSidenote` calls `/api/sidenote`, then calls `showSidenote(text, links)` or `hideSidenote()` based on response.

### `src/sidenote.js` (new file)
Owns the sidenote panel DOM and state:
- `showSidenote(text, links)` — populate and fade in
- `hideSidenote()` — fade out
- Content replaces immediately on each new trigger (no transition between updates)

### `index.html`
New panel element, inserted before `</body>`:
```html
<div id="sidenote-panel" aria-live="polite" aria-label="Lakshya's perspective">
  <div id="sidenote-label">LAKSHYA'S TAKE</div>
  <p id="sidenote-text"></p>
  <div id="sidenote-links"></div>
</div>
```

### `src/style.css`
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
#sidenote-label { /* MONTSERRAT, 9px, uppercase, accent color, letter-spacing */ }
#sidenote-text  { /* Poppins, 11px, muted white, line-height 1.6 */ }
#sidenote-links a { /* 9px, accent color, block, margin-top 4px */ }
```

---

## File Changes Summary

| File | Change |
|---|---|
| `api/chat.js` | Add `sidenote_topic` to JSON schema + K-VRC system prompt |
| `api/sidenote.js` | New file — sidenote endpoint |
| `src/chat.js` | Check for `sidenote_topic`, call `fetchSidenote` |
| `src/sidenote.js` | New file — panel DOM logic |
| `index.html` | Add `#sidenote-panel` markup |
| `src/style.css` | Add sidenote panel styles |

---

## Out of Scope

- No animation between content updates (replace instantly)
- No history/accumulation — panel shows only the most recent sidenote
- No mobile-specific layout (panel degrades gracefully at small sizes)
- No user interaction beyond clicking reference links
- `lakshya-sidenote.md` is baked into the system prompt at deploy time — not dynamically loaded
