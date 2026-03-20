const Anthropic = require('@anthropic-ai/sdk');

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
  // CORS
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || '';

  const isLocalDev = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isVercel = origin.endsWith('.vercel.app');
  const isCustom = ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN;
  const isAllowed = isLocalDev || isVercel || isCustom;

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

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('CLAUDE_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build message history for Claude format
    const messages = [
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages,
    });

    const raw = response.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('Claude returned non-JSON:', raw);
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
    console.error('Claude API error:', err.status, err.message, err.error);
    return res.status(500).json({ error: 'Failed to reach AI service' });
  }
};
