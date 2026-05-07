# ChromaMe — Development Plan

Living plan derived from `PRD.md`. Update as scope, learnings, or constraints change.

| Field | Value |
|---|---|
| Source | `PRD.md` v1.0 (2026-05-05) |
| Plan version | 0.3 |
| Owner | Engineering |
| Status | Minimal prototype — 1 API key, no DB, no infra |

---

## Approach

Smallest possible thing that demonstrates the core value: upload selfie → get color analysis + outfit images. No database, no queue, no auth, no payments. Just Next.js + Gemini.

## Stack (prototype)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Vision LLM | Gemini 2.5 Flash (`@google/genai`) |
| Image gen | Gemini 2.5 Flash Image (`@google/genai`) |
| Image upload | HTML `<input type="file">` → FileReader → base64 |
| PNG export | `html2canvas` (client-side, no external service) |
| State | React state — no DB, no persistence |

**1 env var: `GEMINI_API_KEY`**

---

## Build steps

### Step 1 — Upload + display ✅ (scaffold done)

Next.js scaffold with `@google/genai`, `html2canvas`, shadcn/ui. No DB. 1 API key.

### Step 2 — Color analysis (Gemini)

- `/start` page: `<input type="file">` → FileReader → base64 image.
- Server Action `/api/analyze`: send base64 to `gemini-2.5-flash` with structured JSON prompt (skin/hair/eye hex, undertone, value, chroma, contrast, confidence).
- Zod-validate response. Deterministic 12-season classifier (pure TS, no deps).
- Static palette JSON: 24 hex codes per season (best / neutrals / accents / avoid).
- Show result: season name, confidence badge (High/Med/Low), palette swatches, do/don't list.

### Step 3 — Outfit generation (Gemini)

- On result page: call `/api/outfits` which fires 5 categories × 2 variants = 10 Gemini `generateImages` calls in parallel with `Promise.all`.
- Prompt: identity-preserving template per category, parameterized by season hex codes.
- Stream images to UI as they resolve (mark each slot done as its promise settles).
- "Regenerate" button re-calls single slot.

### Step 4 — Templates + PNG download

- 3 layout components (Elegant Magazine, Editorial Dark, Comparison Grid) taking analysis JSON as props.
- Template switcher in UI — pure re-render, no API call.
- "Download PNG" button: `html2canvas` on the result container → `canvas.toBlob()` → download link.

---

## Decisions recorded

- **Fully free** (prototype scope) — no Stripe, no paywall, no watermark.
- **Confidence badge**: High ≥ 0.8, Medium 0.5–0.8, Low < 0.5.
- **2 variants per category** — 10 images per report; UI lets user pick per category.
- **No DB** — state lives in React; shareable URL not needed for prototype.
- **Brand name**: `ChromaMe` placeholder.

