// AI Outfit Photobooth — Node/Express server
// - Serves the static frontend (index.html, script.js, styles.css, assets/)
// - Exposes /api/config so the browser can read public config (ElevenLabs agent ID, n8n URL)
// - Exposes /api/analyze which runs a Gemini vision call to produce color analysis +
//   recommendations from the user's captured photo. The image never leaves the server
//   except to call Google's API; the API key stays server-side.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || '';
const ELEVENLABS_INTERACTIVE = process.env.ELEVENLABS_INTERACTIVE !== 'false';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

const app = express();
app.use(express.json({ limit: '15mb' }));

// ── Public config for the browser ────────────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.json({
    elevenLabsAgentId: ELEVENLABS_AGENT_ID,
    elevenLabsInteractive: ELEVENLABS_INTERACTIVE,
    n8nWebhookUrl: N8N_WEBHOOK_URL,
  });
});

// ── Color analysis + recommendations ─────────────────────────────────────────
const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    season: {
      type: Type.STRING,
      description:
        'Personal-color season label, e.g. "Soft Autumn", "Bright Spring", "Cool Winter", "Light Summer".',
    },
    undertone: {
      type: Type.STRING,
      description: 'One of: Warm, Cool, Neutral.',
    },
    skinTone: {
      type: Type.STRING,
      description: 'Short description of the skin tone / depth.',
    },
    contrast: {
      type: Type.STRING,
      description: 'One of: Low, Medium, High — overall feature contrast.',
    },
    summary: {
      type: Type.STRING,
      description:
        'One short paragraph (max ~60 words) explaining the analysis in friendly, second-person language.',
    },
    palette: {
      type: Type.ARRAY,
      description: '6–10 recommended colors that flatter the user.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          hex: {
            type: Type.STRING,
            description: 'Hex color string like "#A1B2C3".',
          },
          note: {
            type: Type.STRING,
            description: 'Why this color works (max ~12 words).',
          },
        },
        required: ['name', 'hex'],
      },
    },
    avoidColors: {
      type: Type.ARRAY,
      description: '2–4 colors the user should generally avoid wearing near the face.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          hex: { type: Type.STRING },
        },
        required: ['name', 'hex'],
      },
    },
    outfits: {
      type: Type.ARRAY,
      description: '3–5 outfit recommendations.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Short outfit name.' },
          description: {
            type: Type.STRING,
            description: 'Concrete pieces & colors (max ~30 words).',
          },
          occasion: { type: Type.STRING },
        },
        required: ['title', 'description'],
      },
    },
    accessories: {
      type: Type.ARRAY,
      description: '3–5 accessory recommendations.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['name', 'description'],
      },
    },
  },
  required: ['season', 'undertone', 'summary', 'palette', 'outfits', 'accessories'],
};

const SYSTEM_PROMPT = `You are a professional personal-color and styling consultant.
Analyze the person in the photo and produce a personal color analysis along with
outfit and accessory recommendations.

Rules:
- Be concrete and concise. No greetings, no markdown.
- Use realistic, specific color names ("warm camel", "soft sage") with accurate hex codes.
- Outfit and accessory recommendations must complement the recommended palette.
- If the photo is low quality, ambiguous, or shows no person, still respond, but say so
  briefly in the "summary" field and give general best-guess recommendations.
- Never refuse. Never ask follow-up questions.`;

let genAI = null;
function getGenAI() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Configure it in .env.');
  }
  if (!genAI) genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return genAI;
}

// Retry generateContent with exponential backoff on 503 / UNAVAILABLE.
// Falls back through model list if primary stays overloaded.
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
async function generateWithRetry(ai, model, params, { maxRetries = 3, baseDelayMs = 1200 } = {}) {
  const models = [model, ...FALLBACK_MODELS.filter(m => m !== model)];
  let lastErr;
  for (const m of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model: m });
      } catch (err) {
        const is503 = err?.status === 503 || /503|UNAVAILABLE|high demand/i.test(String(err?.message));
        if (!is503) throw err; // non-retryable — bubble up immediately
        lastErr = err;
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.warn(`[retry] ${m} unavailable — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    console.warn(`[fallback] ${m} exhausted retries — trying next model.`);
  }
  throw lastErr;
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing imageBase64 (base64-encoded image, no data: prefix).' });
    }

    const ai = getGenAI();
    const response = await generateWithRetry(ai, GEMINI_MODEL, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              text: 'Analyze this person and return the structured color analysis + recommendations.',
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: 'Empty response from Gemini.' });
    }

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse Gemini JSON:', text);
      return res.status(502).json({ error: 'Malformed JSON from Gemini.' });
    }

    res.json({ analysis });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err?.message || 'Analysis failed.' });
  }
});

// ── Static frontend ──────────────────────────────────────────────────────────
app.get('/favicon.ico', (_, res) => res.status(204).end());
app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`AI Outfit Photobooth running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn('[warn] GEMINI_API_KEY not set — /api/analyze will fail until configured.');
  }
  if (!ELEVENLABS_AGENT_ID) {
    console.warn('[warn] ELEVENLABS_AGENT_ID not set — voice agent will be disabled in the UI.');
  }
});
