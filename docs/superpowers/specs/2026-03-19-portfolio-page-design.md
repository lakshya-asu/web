# Portfolio Page Design Spec

## Overview

A standalone `portfolio.html` page — separate from the K-VRC interactive robot page (`index.html`). The K-VRC nav link currently pointing to `lakshya-asu.github.io/web/` will be updated to point to `/portfolio.html`.

**Visual identity:** Dark, blocky, square-edged (zero border-radius). Teal/cyan palette. League Spartan for the name, Montserrat for headings/labels, Poppins for body. Completely distinct from K-VRC's orange palette.

**Page title:** `Lakshya Jain | Robotics R&D Engineer`
**Meta description:** `Lakshya Jain — Robotics R&D engineer specialising in causal RL, ROS2/MoveIt, embodied AI, and real-world robot deployment.`

---

## Color System

### Background & Surfaces
- Page background: `#060e0e`
- Card background: `#0c2020`
- Card border: `#0f3535`
- Nav/section dividers: `#0f3535`
- Hero photo container bg: `#0c2222` (intentional one-off)
- Hero photo container border: `#0f4545` (intentional one-off)

### Keyword Color Assignments (fixed per CSS class)
| CSS Class | Category | Color |
|---|---|---|
| `.tag.rl` | Causal RL / Curriculum RL / Deep RL | `#00e5cc` |
| `.tag.ros` | ROS / ROS2 / MoveIt | `#00c2e0` |
| `.tag.llm` | LLM / RAG / NLP | `#38bdf8` |
| `.tag.vr` | VR / Unreal Engine | `#818cf8` |
| `.tag.hardware` | Hardware / Embedded / RPi / Arduino | `#34d399` |
| `.tag.vision` | Computer Vision / Scene Graph / Autonomous Flight | `#22d3ee` |
| `.tag.sim` | Simulation / Isaac Sim / Gym | `#67e8f9` |
| `.tag.ml` | Deep Learning / ML / PyTorch / Safety AI | `#a78bfa` |

### Tag-to-Class Mapping (all tags used across cards)
| Tag text | CSS class |
|---|---|
| CAUSAL RL | `rl` |
| CURRICULUM RL | `rl` |
| DEEP RL | `rl` |
| ROS / ROS2 | `ros` |
| MOVEIT | `ros` |
| LLM | `llm` |
| RAG / RAG/LLAMA | `llm` |
| NLP | `llm` |
| UNREAL 5.3 | `vr` |
| RPi / ARDUINO | `hardware` |
| EMBEDDED | `hardware` |
| SCENE GRAPH | `vision` |
| OBJECT DETECTION | `vision` |
| CV | `vision` |
| AUTONOMOUS FLIGHT | `vision` |
| ISAAC SIM | `sim` |
| GYM / SIM | `sim` |
| PYTORCH | `ml` |
| DEEP LEARNING | `ml` |
| SAFETY AI | `ml` |
| TRAJECTORY | `ros` |

Each tag chip style: `background: <color>18; color: <color>; border: 1px solid <color>33;`

Each card accent bar: `linear-gradient(90deg, ...)` blending that card's tag colors.

---

## Typography
- **Name:** League Spartan 900, `font-size: 62px`, `white-space: nowrap`, `letter-spacing: -2px`
- **Section labels / card tags / nav:** Montserrat 600–700, uppercase, wide letter-spacing
- **Body / descriptions:** Poppins 400–500
- **Font sizes:** card titles 15px, card desc 11px, tag chips 8–9px, section headers 11px

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=League+Spartan:wght@700;900&family=Montserrat:wght@400;600;700&family=Poppins:wght@300;400;500&display=swap
```

---

## Page Sections (top → bottom)

### 1. Nav
- Left: `LJ` monogram, electric cyan, Montserrat 700, `letter-spacing: 4px`
- Right links: `K-VRC` → `index.html`, `RESUME` → resume PDF (placeholder `#`), `LINKEDIN` → `https://linkedin.com/in/lakshyajain04`, `GITHUB` → `https://github.com/lakshya-asu`
- Bottom border: `1px solid #0f3535`, `margin-bottom: 52px`

### 2. Hero
Grid: `grid-template-columns: 1fr 360px`, `gap: 56px`, `align-items: center`.

**Left column:**
- `ROBOTICS R&D ENGINEER` — 11px, `letter-spacing: 5px`, `#00e5cc`, Montserrat 600, `margin-bottom: 16px`
- `Lakshya Jain` — League Spartan 900, 62px, white, single line, `letter-spacing: -2px`
- Tagline — 14px Poppins, `#4aacac`, `line-height: 1.75`: *"MS Robotics & Autonomous Systems, ASU. Building causal RL systems, embodied AI, and real-world robot deployments."*
- Keyword chips — `CAUSAL RL`, `ROS2 / MOVEIT`, `EMBODIED AI`, `SIM-TO-REAL`: `border: 1px solid #0f4040; color: #2aacac; font-size: 10px; padding: 5px 12px`
- Buttons: `RESUME` (filled `#00e5cc`, black text), `LINKEDIN` + `GITHUB` (ghost: `border: 1px solid #0f4040; color: #4aacac`)

**Right column:**
- Container: `background: #0c2222; border: 1px solid #0f4545; height: 400px`
- Top accent line: `2px solid #00e5cc`
- Image: `<img src="websiteheadsmile.png">` — `width: 100%; height: 100%; object-fit: cover; object-position: center top`

### 3. Featured Projects — Bento Grid
`display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px`
All cards: zero `border-radius`, `background: #0c2020`, `border: 1px solid #0f3535`.

**Exact bento layout (10 cards):**
- Row 1: **DIA** (col-span 2, featured) | Metric-Semantic (1 col)
- Row 2: IntuitionAI | AI Therapist in VR | HERCARA
- Row 3: Robotic Chess Arm | Flight Autopilot | Rayar RC Airplane
- Row 4: Forest Surveillance Rover | Snydrone | *(empty cell or span)*

Featured card media height: `180px`. Regular card media height: `140px`.

**Card inner structure:**
```html
<div class="card [featured?]">
  <div class="card-accent"></div>          <!-- 3px gradient top bar -->
  <div class="card-media">                 <!-- image/gif placeholder -->
    <div class="badge">LABEL</div>         <!-- only on award cards -->
  </div>
  <div class="card-body">
    <div class="card-tag-line">ORG · DATE</div>
    <div class="card-title">Title</div>
    <div class="card-desc">Description</div>
    <div class="tags">
      <span class="tag [class]">LABEL</span>
    </div>
  </div>
  <div class="card-footer">
    <span class="card-link">GITHUB →</span>
  </div>
</div>
```

**Full project list:**
| Project | Org · Date | Tags (class) | Badge | Links |
|---|---|---|---|---|
| Discover-Intervene-Adapt (DIA) | ASU Thesis · Nov 2025 | CAUSAL RL (rl), PYTORCH (ml), DEEP LEARNING (ml), GYM/SIM (sim) | — | GitHub, Paper |
| Metric-Semantic Query for 3D Scene Understanding | Logos Lab, ASU · Sep 2025 | ROS2 (ros), SCENE GRAPH (vision), NLP (llm) | — | GitHub |
| IntuitionAI | Hackathon · Dec 2024 | RAG (llm), LLM (llm), CURRICULUM RL (rl) | 1ST PLACE | GitHub |
| AI Therapist in VR | Unreal Engine 5.3 · ASU | UNREAL 5.3 (vr), RAG/LLAMA (llm), DEEP RL (rl) | — | GitHub |
| Project HERCARA | IIT Bombay · DST | ROS (ros), EMBEDDED (hardware), CV (vision) | GOVT. FUNDED | GitHub |
| Robotic Chess Arm Digital Twin | Personal · Oct 2025 | ROS2 (ros), ISAAC SIM (sim), MOVEIT (ros) | — | GitHub |
| Flight Autopilot System | Honeywell Anthem | RAG/LLM (llm), SAFETY AI (ml) | 3RD PLACE | GitHub |
| Rayar RC Airplane | SAE Aero Design · 2022 | EMBEDDED (hardware), AUTONOMOUS FLIGHT (vision) | #6 WORLDWIDE | Details |
| Forest Surveillance Rover | KJSCE Grad Project | RPi/ARDUINO (hardware), OBJECT DETECTION (vision), DEEP LEARNING (ml) | PUBLISHED | Paper (DOI) |
| Snydrone | ASU Personal · Aug 2025 | ROS2 (ros), LLM (llm), TRAJECTORY (ros) | — | GitHub |

**Card accent gradients (blend of tag colors in order):**
- DIA: `linear-gradient(90deg, #00e5cc, #a78bfa, #00e5cc 60%)`
- Metric-Semantic: `linear-gradient(90deg, #00c2e0, #22d3ee, #38bdf8)`
- IntuitionAI: `linear-gradient(90deg, #38bdf8, #00e5cc, #a78bfa)`  *(llm, rl)*
- AI Therapist: `linear-gradient(90deg, #818cf8, #38bdf8, #00e5cc)`  *(vr, llm, rl)*
- HERCARA: `linear-gradient(90deg, #00c2e0, #34d399, #22d3ee)`  *(ros, hardware, vision)*
- Chess Arm: `linear-gradient(90deg, #00c2e0, #67e8f9, #00c2e0 60%)`  *(ros, sim)*
- Flight Autopilot: `linear-gradient(90deg, #38bdf8, #a78bfa, #38bdf8 60%)`  *(llm, ml)*
- Rayar: `linear-gradient(90deg, #34d399, #22d3ee)`  *(hardware, vision)*
- Forest Rover: `linear-gradient(90deg, #34d399, #22d3ee, #a78bfa)`  *(hardware, vision, ml)*
- Snydrone: `linear-gradient(90deg, #00c2e0, #38bdf8, #00c2e0 60%)`  *(ros, llm)*

Badge color = first tag color of that card.

### 4. Experience — Timeline
`display: grid; grid-template-columns: 200px 1fr; gap: 28px` per row.
Row divider: `border-bottom: 1px solid #0f2525`.

| Date | Title | Org | Bullets |
|---|---|---|---|
| Aug 2024 – Dec 2025 | Graduate Teaching Assistant | Arizona State University | Perception in Robotics · DSA · 20% assessment improvement |
| Aug 2024 – Nov 2025 | ML Research Aide | DeSmart Lab, NSF Brain Center | Adaptive RL lighting · 15% below-SOTA NASA TLX · AWS/GCP pipeline |
| Aug 2022 – Jul 2023 | R&D Systems Engineer | Indrones | Autonomous drone ML · GPS-denied 6000m · 50% failure reduction |
| Jun 2021 – Mar 2022 | Research Intern | LTA Lab, IIT Bombay | Deep-RL VTOL landing · 2cm accuracy · 99% edge ML weather recognition |

### 5. Publications & Achievements
Two equal-column card grid.

**Publications:**
- **IROS 2026 (Accepted):** Meanings and Measurements: Multi-Agent Probabilistic Grounding for Vision Language Navigation — [link](https://lakshya-asu.github.io/Meanings-Measurements-Multi-Agent-Probabilistic-Grounding/)
- **NeurIPS 2026 (In Progress):** Discover, Intervene, Adapt: Causal RL with Interleaved Discovery and Learning
- **IJRASET:** Multi-level architecture for a swarm of surveillance rovers — DOI: https://doi.org/10.22214/ijraset.2022.47141
- **IJRASET:** Image Classification and Object Following Functions for Mobile Robots — DOI: https://doi.org/10.22214/ijraset.2022.47142

**Achievements:**
- Impact Award Nominee, ASU
- 1st Place Devil's Invent Hackathon
- 3rd Place Honeywell Anthem Hackathon
- #6 Worldwide SAE Aero Design East Advanced Class 2022
- #2 Worldwide SAE ADE Regular Design Report 2020

### 6. Technical Skills
Chip grid using same `.tag.[class]` styles. Group chips loosely by category (rl, ros, llm, ml, sim, hardware, vision).

Skills: Python, C++, ROS/ROS2, MoveIt, PyTorch, TensorFlow, RAG Systems, Transformers, Deep RL, Causal Reasoning, Curriculum Learning, Isaac Sim, Gazebo, PyBullet, AWS/GCP, Docker, Kubernetes, SLAM, MPC, Sensor Fusion, Path Planning (A*, RRT), Unreal Engine 5

### 7. Footer / Contact
- Heading: `Let's Build the Future of Robotics`
- Body: *"Available for research collaborations, PhD opportunities, and robotics AI engineering roles."*
- Links: `lakshyajain.work@gmail.com`, `+1 (707) 727-5354`, LinkedIn, GitHub
- Footer note: `Last updated: March 2026`

---

## File Structure
- `portfolio.html` — standalone page at repo root
- `src/portfolio.css` — dedicated stylesheet (served as static from `src/` same as `src/style.css`)
- `websiteheadsmile.png` — already exists at repo root, referenced as `src="websiteheadsmile.png"` from `portfolio.html`
- Update `index.html` line 23: change `href="https://lakshya-asu.github.io/web/"` → `href="/portfolio.html"`

---

## Out of Scope
- No Three.js, no JavaScript (pure HTML + CSS)
- No hover expand / modal / lightbox on cards
- Media slots remain `[ media ]` placeholder divs until user provides assets
- No build step — `portfolio.html` is a plain HTML file, not processed by Vite
