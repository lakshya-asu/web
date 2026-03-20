import { setEmotion } from './faceScreen.js';
import { applyEmotion } from './emotions.js';
import { fetchSidenote, hideSidenote } from './sidenote.js';

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

// ── Emotion colours for UI ───────────────────────────────────
const EMOTION_UI = {
  neutral:  { dot: '#ff6a00', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,106,0,0.05) 0%, transparent 70%)' },
  happy:    { dot: '#ff8c00', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,140,0,0.07) 0%, transparent 70%)' },
  excited:  { dot: '#ffffff', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)' },
  sad:      { dot: '#4466aa', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(68,102,170,0.08) 0%, transparent 70%)' },
  angry:    { dot: '#ff2200', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,34,0,0.08) 0%, transparent 70%)'  },
  thinking: { dot: '#ffcc00', bg: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,204,0,0.05) 0%, transparent 70%)' },
};

function updateEmotionUI(emotion) {
  const ui = EMOTION_UI[emotion] ?? EMOTION_UI.neutral;
  const dot = document.getElementById('emotion-dot');
  const label = document.getElementById('emotion-label');
  const bg = document.getElementById('bg-layer');
  if (dot) { dot.style.background = ui.dot; dot.style.boxShadow = `0 0 10px ${ui.dot}`; }
  if (label) label.textContent = emotion;
  if (bg) bg.style.background = ui.bg;
}

// ── Emotion application ──────────────────────────────────────
function applyEmotionFull(emotion) {
  setEmotion(emotion);
  updateEmotionUI(emotion);
  if (sceneRefs) {
    const cfg = applyEmotion(emotion, sceneRefs);
    robotRef?.setEmotionCfg(cfg);
    robotRef?.startBodyMotion(cfg.bodyMotion);
  }
  if (emotion === 'angry') robotRef?.triggerHeadJerk();
}

// ── Send message ─────────────────────────────────────────────
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn.disabled) return; // block Enter-key re-entrancy during debounce
  input.value = '';
  sendBtn.disabled = true;
  setTimeout(() => { sendBtn.disabled = false; }, 1000); // debounce

  addBubble(trimmed, 'user');
  // Capture prior history before pushing user message — sent as context, not including current turn
  const historySnapshot = history.slice(-20);
  history.push({ role: 'user', text: trimmed });
  history = history.slice(-20);

  applyEmotionFull('thinking');

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

  history.push({ role: 'model', text: reply });
  history = history.slice(-20);

  addBubble(reply, 'robot');
  // Apply emotion then speak after 300ms transition
  applyEmotionFull(emotion);
  setTimeout(() => speak(reply), 300);

  // Sidenote — fire-and-forget, non-blocking
  if (sidenote_topic) fetchSidenote(sidenote_topic, trimmed);
  else hideSidenote();
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

  // Intro greeting (text only — no TTS until first user gesture, browser security constraint)
  addBubble(
    "K-VRC online. What do you want.",
    'robot'
  );
  applyEmotionFull('excited');
}
