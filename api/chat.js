const VALID_EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'excited'];
const MAX_MSG_LEN = 1000;

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

LENGTH: Keep replies to 1-2 sentences maximum. You're efficient, not verbose. If it takes more than 20 words, you've already said too much.

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
    const messages = [
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
      { role: 'user', content: message },
    ];

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
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return res.status(500).json({ error: 'Failed to reach AI service' });
    }

    const data = await response.json();
    const raw = data.content[0].text;

    // Strip markdown code fences if Claude wraps the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
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
    console.error('Claude fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to reach AI service' });
  }
};
