# Portfolio Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `portfolio.html` page with a dark teal/cyan palette, League Spartan name, bento project grid with tag-derived gradient accents, experience timeline, publications, and skills — entirely separate from the K-VRC `index.html`.

**Architecture:** Two files only — `portfolio.html` (all markup) and `src/portfolio.css` (all styles). No JavaScript, no build step, no Vite processing. `portfolio.html` lives at the repo root and is served directly by Vercel as a static file. After completion, update the nav link in `index.html` to point to `/portfolio.html`.

**Tech Stack:** Plain HTML5, CSS3 (grid, custom properties, gradients), Google Fonts (League Spartan, Montserrat, Poppins). No frameworks, no JS.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `portfolio.html` | Create | Full page markup — all 7 sections |
| `src/portfolio.css` | Create | All styles — reset, variables, nav, hero, bento, timeline, publications, skills, footer |
| `index.html` | Modify line 23 | Update nav href from external GitHub URL to `/portfolio.html` |

---

### Task 1: CSS foundation — variables, reset, nav, hero

**Files:**
- Create: `src/portfolio.css`
- Create: `portfolio.html` (shell + nav + hero only)

- [ ] **Step 1: Create `src/portfolio.css` with CSS custom properties and reset**

```css
/* src/portfolio.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:           #060e0e;
  --card-bg:      #0c2020;
  --card-border:  #0f3535;
  --divider:      #0f3535;
  --cyan:         #00e5cc;
  --text:         #e2e8f0;
  --text-muted:   #4aacac;
  --text-dim:     #2a8080;

  /* tag category colors */
  --rl:       #00e5cc;
  --ros:      #00c2e0;
  --llm:      #38bdf8;
  --vr:       #818cf8;
  --hardware: #34d399;
  --vision:   #22d3ee;
  --sim:      #67e8f9;
  --ml:       #a78bfa;

  --font-name:    'League Spartan', sans-serif;
  --font-heading: 'Montserrat', sans-serif;
  --font-body:    'Poppins', sans-serif;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
}

a { text-decoration: none; color: inherit; }
img { display: block; max-width: 100%; }
```

- [ ] **Step 2: Add nav styles**

```css
/* NAV */
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 64px;
  border-bottom: 1px solid var(--divider);
  margin-bottom: 52px;
}
.nav-brand {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--cyan);
}
.nav-links {
  display: flex;
  gap: 24px;
}
.nav-links a {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 2px;
  color: #3a9090;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--cyan); }
```

- [ ] **Step 3: Add hero styles**

```css
/* HERO */
.hero {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 56px;
  align-items: center;
  padding: 0 64px;
  margin-bottom: 80px;
}
.hero-tag {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 5px;
  color: var(--cyan);
  margin-bottom: 16px;
}
.hero-name {
  font-family: var(--font-name);
  font-size: 62px;
  font-weight: 900;
  line-height: 1;
  color: #fff;
  letter-spacing: -2px;
  white-space: nowrap;
}
.hero-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 18px;
  line-height: 1.75;
  max-width: 440px;
}
.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 22px;
}
.hero-chip {
  font-family: var(--font-heading);
  font-size: 10px;
  letter-spacing: 2px;
  padding: 5px 12px;
  border: 1px solid #0f4040;
  color: #2aacac;
}
.hero-btns {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.btn-primary {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 2px;
  padding: 10px 22px;
  background: var(--cyan);
  color: var(--bg);
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.btn-ghost {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 2px;
  padding: 10px 22px;
  border: 1px solid #0f4040;
  color: var(--text-muted);
  cursor: pointer;
  background: transparent;
}
.hero-photo-wrap {
  background: #0c2222;
  border: 1px solid #0f4545;
  height: 400px;
  position: relative;
  overflow: hidden;
}
.hero-photo-wrap::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--cyan);
  z-index: 1;
}
.hero-photo-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
```

- [ ] **Step 4: Create `portfolio.html` shell with nav and hero**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lakshya Jain | Robotics R&D Engineer</title>
  <meta name="description" content="Lakshya Jain — Robotics R&D engineer specialising in causal RL, ROS2/MoveIt, embodied AI, and real-world robot deployment." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@700;900&family=Montserrat:wght@400;600;700&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/portfolio.css" />
</head>
<body>

<nav>
  <span class="nav-brand">LJ</span>
  <div class="nav-links">
    <a href="/index.html">K-VRC</a>
    <a href="#">RESUME</a>
    <a href="https://linkedin.com/in/lakshyajain04" target="_blank" rel="noopener">LINKEDIN</a>
    <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener">GITHUB</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-text">
    <div class="hero-tag">ROBOTICS R&D ENGINEER</div>
    <h1 class="hero-name">Lakshya Jain</h1>
    <p class="hero-sub">MS Robotics &amp; Autonomous Systems, ASU. Building causal RL systems, embodied AI, and real-world robot deployments.</p>
    <div class="hero-chips">
      <span class="hero-chip">CAUSAL RL</span>
      <span class="hero-chip">ROS2 / MOVEIT</span>
      <span class="hero-chip">EMBODIED AI</span>
      <span class="hero-chip">SIM-TO-REAL</span>
    </div>
    <div class="hero-btns">
      <a href="#" class="btn-primary">RESUME</a>
      <a href="https://linkedin.com/in/lakshyajain04" target="_blank" rel="noopener" class="btn-ghost">LINKEDIN</a>
      <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener" class="btn-ghost">GITHUB</a>
    </div>
  </div>
  <div class="hero-photo-wrap">
    <img src="websiteheadsmile.png" alt="Lakshya Jain" />
  </div>
</section>

<!-- remaining sections added in later tasks -->

</body>
</html>
```

- [ ] **Step 5: Open `portfolio.html` in a browser (or `npx serve .` from repo root) and verify nav + hero render correctly — name on one line, headshot visible, buttons styled.**

- [ ] **Step 6: Commit**

```bash
git add portfolio.html src/portfolio.css
git commit -m "feat: portfolio page — nav and hero section"
```

---

### Task 2: CSS tag system + bento grid styles

**Files:**
- Modify: `src/portfolio.css` (append)

- [ ] **Step 1: Add section title, card, bento grid, and tag styles**

```css
/* SECTION TITLE */
.section { padding: 0 64px; margin-bottom: 80px; }
.sec-title {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 6px;
  color: var(--cyan);
  margin-bottom: 28px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--divider);
}

/* BENTO GRID */
.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

/* CARD */
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card.featured { grid-column: span 2; }

.card-accent { height: 3px; width: 100%; }

.card-media {
  background: #0f2e2e;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a6060;
  font-size: 10px;
  letter-spacing: 1px;
  position: relative;
  font-family: var(--font-heading);
}
.card.featured .card-media { height: 180px; }

.badge {
  position: absolute;
  top: 10px; right: 10px;
  font-family: var(--font-heading);
  font-size: 8px;
  letter-spacing: 1px;
  padding: 3px 8px;
  color: var(--bg);
  font-weight: 700;
}

.card-body { padding: 16px 18px; flex: 1; }
.card-tag-line {
  font-family: var(--font-heading);
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.card-title {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  color: #d0f0f0;
  margin-bottom: 6px;
}
.card-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 12px;
}

/* TAG CHIPS */
.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag {
  font-family: var(--font-heading);
  font-size: 8px;
  letter-spacing: 1px;
  padding: 3px 8px;
  font-weight: 600;
}
.tag.rl       { background: #00e5cc18; color: var(--rl);       border: 1px solid #00e5cc33; }
.tag.ros      { background: #00c2e018; color: var(--ros);      border: 1px solid #00c2e033; }
.tag.llm      { background: #38bdf818; color: var(--llm);      border: 1px solid #38bdf833; }
.tag.vr       { background: #818cf818; color: var(--vr);       border: 1px solid #818cf833; }
.tag.hardware { background: #34d39918; color: var(--hardware); border: 1px solid #34d39933; }
.tag.vision   { background: #22d3ee18; color: var(--vision);   border: 1px solid #22d3ee33; }
.tag.sim      { background: #67e8f918; color: var(--sim);      border: 1px solid #67e8f933; }
.tag.ml       { background: #a78bfa18; color: var(--ml);       border: 1px solid #a78bfa33; }

.card-footer {
  display: flex;
  gap: 16px;
  padding: 12px 18px;
  border-top: 1px solid var(--card-border);
}
.card-link {
  font-family: var(--font-heading);
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--cyan);
}
.card-link:hover { text-decoration: underline; }
```

- [ ] **Step 2: Verify styles exist in file — no visual test needed yet (markup comes in Task 3).**

- [ ] **Step 3: Commit**

```bash
git add src/portfolio.css
git commit -m "feat: portfolio CSS — tag color system and bento card styles"
```

---

### Task 3: Bento grid HTML — all 10 project cards

**Files:**
- Modify: `portfolio.html` (add projects section after hero)

- [ ] **Step 1: Add the projects section to `portfolio.html`, replacing the `<!-- remaining sections -->` comment**

Insert after the closing `</section>` of hero:

```html
<!-- PROJECTS -->
<section class="section">
  <div class="sec-title">FEATURED PROJECTS</div>
  <div class="bento">

    <!-- DIA — featured, col-span 2 -->
    <div class="card featured">
      <div class="card-accent" style="background: linear-gradient(90deg, #00e5cc, #a78bfa, #00e5cc 60%);"></div>
      <div class="card-media">[ media placeholder ]</div>
      <div class="card-body">
        <div class="card-tag-line">ASU THESIS · NOV 2025</div>
        <div class="card-title">Discover-Intervene-Adapt (DIA)</div>
        <div class="card-desc">Interpretable causal RL with structured world models and intervention strategies. 35% reduction in Montezuma exploration time, 15x CoinRun generalization improvement.</div>
        <div class="tags">
          <span class="tag rl">CAUSAL RL</span>
          <span class="tag ml">PYTORCH</span>
          <span class="tag ml">DEEP LEARNING</span>
          <span class="tag sim">GYM / SIM</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu/Discover-Intervene-Adapt-Interleaved-Causal-RL" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
        <span class="card-link">PAPER →</span>
      </div>
    </div>

    <!-- Metric-Semantic -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #00c2e0, #22d3ee, #38bdf8);"></div>
      <div class="card-media">[ media placeholder ]</div>
      <div class="card-body">
        <div class="card-tag-line">LOGOS LAB, ASU · SEP 2025</div>
        <div class="card-title">Metric-Semantic Query</div>
        <div class="card-desc">Probabilistic NLP-to-scene-graph system on Hydra for open-vocabulary metric-semantic robot queries. 20% above VLM benchmarks.</div>
        <div class="tags">
          <span class="tag ros">ROS2</span>
          <span class="tag vision">SCENE GRAPH</span>
          <span class="tag llm">NLP</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/TechTinkerPradhan/metric_semantic_predicate" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- IntuitionAI -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #38bdf8, #00e5cc, #a78bfa);"></div>
      <div class="card-media">
        <div class="badge" style="background: #38bdf8;">1ST PLACE</div>
        [ media placeholder ]
      </div>
      <div class="card-body">
        <div class="card-tag-line">DEVIL'S INVENT HACKATHON · DEC 2024</div>
        <div class="card-title">IntuitionAI</div>
        <div class="card-desc">RAG-based adaptive tutoring agent using multi-modal transformers and RL for curriculum sequencing. 40% perceived learning efficiency gain.</div>
        <div class="tags">
          <span class="tag llm">RAG</span>
          <span class="tag llm">LLM</span>
          <span class="tag rl">CURRICULUM RL</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu/IntuitionAI" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- AI Therapist in VR -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #818cf8, #38bdf8, #00e5cc);"></div>
      <div class="card-media">[ media placeholder ]</div>
      <div class="card-body">
        <div class="card-tag-line">UNREAL ENGINE 5.3 · ASU</div>
        <div class="card-title">AI Therapist in VR</div>
        <div class="card-desc">AI-powered conversational agent for mental health therapy in VR. RAG LLM based on LLAMA with speech recognition and adaptive RL dialogue generation.</div>
        <div class="tags">
          <span class="tag vr">UNREAL 5.3</span>
          <span class="tag llm">RAG / LLAMA</span>
          <span class="tag rl">DEEP RL</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- HERCARA -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #00c2e0, #34d399, #22d3ee);"></div>
      <div class="card-media">
        <div class="badge" style="background: #00c2e0;">GOVT. FUNDED</div>
        [ media placeholder ]
      </div>
      <div class="card-body">
        <div class="card-tag-line">LTA LAB, IIT BOMBAY · DST</div>
        <div class="card-title">Project HERCARA</div>
        <div class="card-desc">Govt. funded (Dept. of Science &amp; Tech.) swarm of VTOL autonomous UAVs, aerostat, robotic arms, and embedded safety systems.</div>
        <div class="tags">
          <span class="tag ros">ROS</span>
          <span class="tag hardware">EMBEDDED</span>
          <span class="tag vision">CV</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- Robotic Chess Arm -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #00c2e0, #67e8f9, #00c2e0 60%);"></div>
      <div class="card-media">[ media placeholder ]</div>
      <div class="card-body">
        <div class="card-tag-line">PERSONAL PROJECT · OCT 2025</div>
        <div class="card-title">Robotic Chess Arm Digital Twin</div>
        <div class="card-desc">Franka Panda in Isaac Sim with URDF articulation, trajectory control, virtual perception, and ROS interfaces for sim-to-real transfer.</div>
        <div class="tags">
          <span class="tag ros">ROS2</span>
          <span class="tag sim">ISAAC SIM</span>
          <span class="tag ros">MOVEIT</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu/RobotChessPlayer" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- Flight Autopilot -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #38bdf8, #a78bfa, #38bdf8 60%);"></div>
      <div class="card-media">
        <div class="badge" style="background: #38bdf8;">3RD PLACE</div>
        [ media placeholder ]
      </div>
      <div class="card-body">
        <div class="card-tag-line">HONEYWELL ANTHEM HACKATHON</div>
        <div class="card-title">Flight Autopilot System</div>
        <div class="card-desc">RAG LLM-based autopilot taking over all autopilot tasks and automating plane features. Top-3 at Honeywell's Anthem Hackathon for aviation AI.</div>
        <div class="tags">
          <span class="tag llm">RAG / LLM</span>
          <span class="tag ml">SAFETY AI</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

    <!-- Rayar -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #34d399, #22d3ee);"></div>
      <div class="card-media">
        <div class="badge" style="background: #34d399;">#6 WORLDWIDE</div>
        [ media placeholder ]
      </div>
      <div class="card-body">
        <div class="card-tag-line">SAE AERO DESIGN EAST · 2022</div>
        <div class="card-title">Rayar RC Airplane</div>
        <div class="card-desc">Advanced class RC airplane capable of payload drop and small glider deployment. Gliders autonomously fly a custom sequence. #6 worldwide.</div>
        <div class="tags">
          <span class="tag hardware">EMBEDDED</span>
          <span class="tag vision">AUTONOMOUS FLIGHT</span>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-link">DETAILS →</span>
      </div>
    </div>

    <!-- Forest Surveillance Rover -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #34d399, #22d3ee, #a78bfa);"></div>
      <div class="card-media">
        <div class="badge" style="background: #34d399;">PUBLISHED</div>
        [ media placeholder ]
      </div>
      <div class="card-body">
        <div class="card-tag-line">KJSCE GRADUATE PROJECT</div>
        <div class="card-title">Forest Surveillance Rover</div>
        <div class="card-desc">Swarm of RPi &amp; Arduino Mega rovers with object, animal, and fire detection, autonomous navigation, and multi-modal operation. Published in IJRASET.</div>
        <div class="tags">
          <span class="tag hardware">RPi / ARDUINO</span>
          <span class="tag vision">OBJECT DETECTION</span>
          <span class="tag ml">DEEP LEARNING</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://doi.org/10.22214/ijraset.2022.47141" target="_blank" rel="noopener" class="card-link">PAPER →</a>
      </div>
    </div>

    <!-- Snydrone -->
    <div class="card">
      <div class="card-accent" style="background: linear-gradient(90deg, #00c2e0, #38bdf8, #00c2e0 60%);"></div>
      <div class="card-media">[ media placeholder ]</div>
      <div class="card-body">
        <div class="card-tag-line">ASU PERSONAL PROJECT · AUG 2025</div>
        <div class="card-title">Snydrone</div>
        <div class="card-desc">LLM-driven ROS2 cinematic drone planner translating natural-language prompts to trajectories. 30% framing consistency improvement in simulation.</div>
        <div class="tags">
          <span class="tag ros">ROS2</span>
          <span class="tag llm">LLM</span>
          <span class="tag ros">TRAJECTORY</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="https://github.com/lakshya-asu/snydrone" target="_blank" rel="noopener" class="card-link">GITHUB →</a>
      </div>
    </div>

  </div><!-- /bento -->
</section>
```

- [ ] **Step 2: Open `portfolio.html` in browser. Verify:**
  - DIA card spans 2 columns
  - All 10 cards render with gradient accent bars
  - Tag chips show correct colors
  - Badges appear top-right on award cards
  - Row 4 has 2 cards + one empty cell (grid auto-fills)

- [ ] **Step 3: Commit**

```bash
git add portfolio.html
git commit -m "feat: portfolio — bento project grid, all 10 cards"
```

---

### Task 4: Experience timeline + publications + achievements HTML & CSS

**Files:**
- Modify: `portfolio.html` (append after projects section)
- Modify: `src/portfolio.css` (append)

- [ ] **Step 1: Add timeline and publications/achievements CSS**

Append to `src/portfolio.css`:

```css
/* TIMELINE */
.timeline { display: flex; flex-direction: column; }
.tl-item {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
  padding: 22px 0;
  border-bottom: 1px solid #0f2525;
}
.tl-item:first-child { padding-top: 0; }
.tl-date {
  font-family: var(--font-heading);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--text-dim);
  padding-top: 2px;
}
.tl-title {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  color: #d0f0f0;
}
.tl-org {
  font-size: 11px;
  color: var(--cyan);
  margin-top: 3px;
}
.tl-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
  line-height: 1.6;
}

/* TWO-COL CARD GRID (publications + achievements) */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.info-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 24px;
}
.info-card h3 {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--cyan);
  margin-bottom: 16px;
}
.info-card ul { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.info-card li {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  padding-left: 12px;
  border-left: 2px solid var(--card-border);
}
.info-card li strong { color: var(--cyan); }
.info-card li a { color: var(--llm); }
.info-card li a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Add experience + publications HTML after the projects section**

```html
<!-- EXPERIENCE -->
<section class="section">
  <div class="sec-title">EXPERIENCE</div>
  <div class="timeline">
    <div class="tl-item">
      <div class="tl-date">AUG 2024 — DEC 2025</div>
      <div>
        <div class="tl-title">Graduate Teaching Assistant</div>
        <div class="tl-org">Arizona State University</div>
        <div class="tl-desc">Delivered lectures for Perception in Robotics and Data Structures &amp; Algorithms. Improved student assessment performance by 20% through structured lesson design. Mentored projects on transformers, attention, and multi-modal LLM pipelines.</div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-date">AUG 2024 — NOV 2025</div>
      <div>
        <div class="tl-title">ML Research Aide</div>
        <div class="tl-org">DeSmart Lab, NSF Brain Center</div>
        <div class="tl-desc">Built adaptive RL-driven lighting prototypes for medical applications. Achieved 15% below-SOTA NASA TLX mental demand ratings. Implemented end-to-end ML pipeline with automated tuning and AWS/GCP deployment.</div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-date">AUG 2022 — JUL 2023</div>
      <div>
        <div class="tl-title">R&amp;D Systems Engineer</div>
        <div class="tl-org">Indrones</div>
        <div class="tl-desc">Developed autonomous drone ML pipelines for surveillance and target tracking. Enabled reliable GPS-denied operations at 6000+ m Himalayan altitudes. Built predictive maintenance toolkit reducing system failures by 50%.</div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-date">JUN 2021 — MAR 2022</div>
      <div>
        <div class="tl-title">Research Intern</div>
        <div class="tl-org">LTA Lab, IIT Bombay</div>
        <div class="tl-desc">Created deep-RL precision landing system for VTOL aircraft achieving 2 cm visual test accuracy. Implemented edge ML weather and emergency recognition at 99% accuracy.</div>
      </div>
    </div>
  </div>
</section>

<!-- PUBLICATIONS & ACHIEVEMENTS -->
<section class="section">
  <div class="sec-title">PUBLICATIONS &amp; DISTINCTIONS</div>
  <div class="two-col">
    <div class="info-card">
      <h3>PUBLICATIONS</h3>
      <ul>
        <li><strong>IROS 2026 (Accepted):</strong> Meanings and Measurements: Multi-Agent Probabilistic Grounding for Vision Language Navigation — <a href="https://lakshya-asu.github.io/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding/" target="_blank" rel="noopener">Project Site →</a></li>
        <li><strong>NeurIPS 2026 (In Progress):</strong> Discover, Intervene, Adapt: Causal RL with Interleaved Discovery and Learning</li>
        <li><strong>IJRASET:</strong> Multi-level architecture for a swarm of surveillance rovers — <a href="https://doi.org/10.22214/ijraset.2022.47141" target="_blank" rel="noopener">DOI →</a></li>
        <li><strong>IJRASET:</strong> Image Classification and Object Following Functions for Mobile Robots — <a href="https://doi.org/10.22214/ijraset.2022.47142" target="_blank" rel="noopener">DOI →</a></li>
      </ul>
    </div>
    <div class="info-card">
      <h3>ACHIEVEMENTS</h3>
      <ul>
        <li>Impact Award Nominee, ASU</li>
        <li><strong>1st Place</strong> — Devil's Invent Hackathon</li>
        <li><strong>3rd Place</strong> — Honeywell Anthem Hackathon</li>
        <li><strong>#6 Worldwide</strong> — SAE Aero Design East Advanced Class 2022</li>
        <li><strong>#2 Worldwide</strong> — SAE ADE Regular Design Report 2020</li>
        <li>TSMC AZ Fellowship · Ira A. Fulton Fellowship · ASU Grad Fellowship</li>
      </ul>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Open in browser. Verify timeline rows, two-column cards, publication links all render correctly.**

- [ ] **Step 4: Commit**

```bash
git add portfolio.html src/portfolio.css
git commit -m "feat: portfolio — experience timeline, publications, achievements"
```

---

### Task 5: Skills section + footer + CSS polish

**Files:**
- Modify: `portfolio.html` (append skills + footer)
- Modify: `src/portfolio.css` (append skills + footer styles)

- [ ] **Step 1: Add skills and footer CSS**

Append to `src/portfolio.css`:

```css
/* SKILLS */
.chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }

/* FOOTER */
.footer {
  padding: 48px 64px;
  border-top: 1px solid var(--divider);
  margin-top: 24px;
}
.footer h2 {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}
.footer p {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}
.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
}
.contact-links a {
  font-family: var(--font-heading);
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--cyan);
}
.contact-links a:hover { text-decoration: underline; }
.footer-note {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 1px;
}
```

- [ ] **Step 2: Add skills section and footer HTML**

```html
<!-- SKILLS -->
<section class="section">
  <div class="sec-title">TECHNICAL SKILLS</div>
  <div class="chip-wrap">
    <span class="tag rl">CAUSAL REASONING</span>
    <span class="tag rl">DEEP RL</span>
    <span class="tag rl">CURRICULUM LEARNING</span>
    <span class="tag ros">ROS / ROS2</span>
    <span class="tag ros">MOVEIT</span>
    <span class="tag ros">SLAM</span>
    <span class="tag ros">MPC</span>
    <span class="tag ros">PATH PLANNING (A*, RRT)</span>
    <span class="tag ros">SENSOR FUSION</span>
    <span class="tag llm">RAG SYSTEMS</span>
    <span class="tag llm">TRANSFORMERS</span>
    <span class="tag llm">NLP</span>
    <span class="tag ml">PYTORCH</span>
    <span class="tag ml">TENSORFLOW</span>
    <span class="tag ml">DEEP LEARNING</span>
    <span class="tag sim">ISAAC SIM</span>
    <span class="tag sim">GAZEBO</span>
    <span class="tag sim">PYBULLET</span>
    <span class="tag vr">UNREAL ENGINE 5</span>
    <span class="tag hardware">PYTHON</span>
    <span class="tag hardware">C++</span>
    <span class="tag hardware">DOCKER</span>
    <span class="tag hardware">KUBERNETES</span>
    <span class="tag hardware">AWS / GCP</span>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <h2>Let's Build the Future of Robotics</h2>
  <p>Available for research collaborations, PhD opportunities, and robotics AI engineering roles.</p>
  <div class="contact-links">
    <a href="mailto:lakshyajain.work@gmail.com">lakshyajain.work@gmail.com</a>
    <a href="tel:+17077275354">+1 (707) 727-5354</a>
    <a href="https://linkedin.com/in/lakshyajain04" target="_blank" rel="noopener">LinkedIn</a>
    <a href="https://github.com/lakshya-asu" target="_blank" rel="noopener">GitHub</a>
  </div>
  <p class="footer-note">Last updated: March 2026</p>
</footer>
```

- [ ] **Step 3: Open in browser. Scroll through full page — verify all sections render, no broken layout, footer links correct.**

- [ ] **Step 4: Commit**

```bash
git add portfolio.html src/portfolio.css
git commit -m "feat: portfolio — skills section and footer"
```

---

### Task 6: Wire nav link in index.html + final check

**Files:**
- Modify: `index.html` (line 23)

- [ ] **Step 1: Update the nav link in `index.html`**

In [index.html:23](index.html#L23), change:
```html
<a href="https://lakshya-asu.github.io/web/" target="_blank" rel="noopener noreferrer">Lakshya's Portfolio</a>
```
to:
```html
<a href="/portfolio.html">Lakshya's Portfolio</a>
```

- [ ] **Step 2: Verify the link works — open `index.html`, click "Lakshya's Portfolio", confirm it loads `portfolio.html`.**

- [ ] **Step 3: Do a final full-page visual check on `portfolio.html`:**
  - Nav renders correctly
  - Hero: name on one line, headshot visible
  - Bento: DIA spans 2 cols, gradients visible on all cards
  - Tags colored correctly per category
  - Timeline rows separated by dividers
  - Publications links open correct URLs
  - Skills chips colored by category
  - Footer contact links correct

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: link K-VRC nav to portfolio.html"
```

- [ ] **Step 5: Push to main and verify Vercel deployment**

```bash
git push origin main
```

Expected: Vercel auto-deploys. Visit `https://<your-vercel-url>/portfolio.html` and confirm full page loads.
