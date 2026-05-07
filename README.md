# AI Outfit Photobooth

A photobooth web app with two flows:

- **Manual Try-On** — capture a photo, pick an outfit from the catalog, and the
  existing n8n + Nano Banana pipeline swaps the outfit onto your photo.
- **Let AI Guide You** — capture a photo, get a personal **color analysis** with
  recommended palette, outfit ideas, and accessories. Hand off to Manual Try-On
  with one click. Optionally guided by an **ElevenLabs Conversational AI** voice
  agent.

## Stack

- Static frontend (`index.html`, `styles.css`, `script.js`, `ai-guide.js`,
  `config.js`, `assets/`).
- Tiny Node/Express backend (`server.js`) that:
  - serves the static frontend,
  - exposes `/api/config` for browser-safe runtime config,
  - exposes `/api/analyze` which calls **Google Gemini** (vision + structured
    output) to produce the color analysis. The API key never leaves the server.
- The outfit-swap step uses the existing **n8n webhook**; that integration is
  unchanged.

## Setup

```bash
# 1. Install
npm install

# 2. Configure
copy .env.example .env       # Windows
# cp   .env.example .env     # macOS / Linux
# then edit .env and fill in:
#   GEMINI_API_KEY        (required for AI Guide)
#   ELEVENLABS_AGENT_ID   (optional — enables the voice widget)
#   N8N_WEBHOOK_URL       (optional — overrides the default in config.js)

# 3. Run
npm run dev   # auto-restart on change
# or
npm start
```

Then open http://localhost:3000.

## Environment variables

| Var | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key for image analysis + LLM | yes (AI Guide) |
| `GEMINI_MODEL` | Model name (default `gemini-2.5-flash`) | no |
| `ELEVENLABS_AGENT_ID` | Public ConvAI agent ID | no |
| `N8N_WEBHOOK_URL` | Override outfit-swap webhook | no |
| `PORT` | Server port (default `3000`) | no |

## Architecture

### Capture & branch

`script.js` owns the camera, capture, manual outfit sidebar, and the existing
n8n outfit-swap pipeline. After a photo is captured, the flow branches by
`this.mode`:

- `manual` → show outfit sidebar, generate via n8n (existing behavior).
- `ai`     → call `startAiAnalysis()` (`ai-guide.js`).

### AI Guide flow (`ai-guide.js`)

1. POST the captured image (base64) to `/api/analyze`.
2. The server calls Gemini 2.5 Flash with vision input + a JSON schema
   (`responseSchema`) that defines the shape of the analysis (season, undertone,
   palette, outfits, accessories, etc.).
3. The browser renders the structured result on `#stepAi`:
   - **Color palette** — swatches with names + hex codes.
   - **Colors to avoid** — optional.
   - **Outfit recommendations** — list with title / description / occasion.
   - **Accessory recommendations** — list with name / description.
4. **Try on an outfit** button hands the captured photo off to the existing
   Manual Try-On sidebar so the user can apply the n8n outfit-swap.

### ElevenLabs voice agent

When `ELEVENLABS_AGENT_ID` is set, `ai-guide.js` mounts the
`<elevenlabs-convai>` web component and loads the official embed script. The
widget appears bottom-right on every screen.

## Project layout

```
.
├── index.html           # Landing + camera + manual + AI results screens
├── styles.css           # All styles (existing + AI Guide additions)
├── script.js            # PhotoboothApp class (camera, manual try-on)
├── ai-guide.js          # AI Guide flow (prototype-augments PhotoboothApp)
├── config.js            # Runtime config (hydrated from /api/config)
├── server.js            # Express server + Gemini API route
├── package.json
├── .env.example
├── assets/              # Images, outfit catalog (man/, woman/), background video
└── _archive-color-analysis/   # Old Next.js color-analysis app — reference only
```

## Notes

- The earlier Next.js color-analysis prototype lives in
  `_archive-color-analysis/` as a reference. It is gitignored and not part of
  the deployed app.
- The Gemini call uses `responseMimeType: 'application/json'` plus a typed
  `responseSchema`, so the backend can rely on a stable shape and the frontend
  can render without parsing prose.
