# ChromaMe — Product Requirements Document

**AI-Powered Personal Color Analysis Web App**
*Find your colors. See yourself in them.*

---

| Field | Value |
|---|---|
| Document | Product Requirements Document (PRD) |
| Product Name | ChromaMe — AI Personal Color Analysis |
| Version | 1.0 (Initial PRD) |
| Status | Draft for review |
| Date | May 5, 2026 |
| Owner | Product Team |
| Related Docs | Architecture Guide (2026), Competitive Research |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Opportunity](#2-problem--opportunity)
3. [Target Users & Personas](#3-target-users--personas)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Product Scope (In / Out)](#6-product-scope)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [User Flows](#9-user-flows)
10. [Information Architecture](#10-information-architecture)
11. [Template System](#11-template-system)
12. [Technical Architecture](#12-technical-architecture)
13. [AI Pipeline Specification](#13-ai-pipeline-specification)
14. [Data Model](#14-data-model)
15. [Privacy, Trust & Compliance](#15-privacy-trust--compliance)
16. [Pricing & Monetization](#16-pricing--monetization)
17. [Release Plan & Milestones](#17-release-plan--milestones)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Open Questions](#19-open-questions)
20. [Appendix](#20-appendix)

---

## 1. Executive Summary

ChromaMe is a web-based personal color analysis service that turns a single selfie into a personalized seasonal color palette and a set of AI-generated outfit mockups showing the user wearing their best colors. The service replaces the $200–$500 in-person color consultation with a $5–$10 digital report delivered in under 90 seconds.

### Vision

Make professional-grade personal color analysis instant, affordable, and visual — so anyone can shop, dress, and present themselves with confidence.

### Core Value Proposition

- Upload one selfie → receive a complete 12-season color analysis + 5–8 outfit mockups of yourself in your best colors.
- Three selectable visual templates (editorial, magazine, comparison-grid) so users can pick a look that matches their aesthetic.
- Shareable PNG and PDF outputs designed for TikTok, Instagram, and Pinterest — virality is a first-class feature.
- Built entirely on existing AI APIs (no model training); marginal cost per report ~$0.30–$0.65.

### Why now

- Personal color analysis is a recurring viral trend on TikTok and Xiaohongshu (RedNote).
- Identity-preserving image editing models (Gemini 2.5 Flash Image / Nano Banana, FLUX Kontext) reached production quality in 2025–2026.
- Competitor benchmark: a TikTok-distributed competitor reportedly hit ~$40K MRR within 5 months on minimal infrastructure — proving willingness to pay.

### Headline Targets (12 months post-launch)

| Metric | Target |
|---|---|
| Free reports completed | 250,000 |
| Paid conversion rate | 8% |
| Annual revenue | $1.2M |
| Median time-to-result | ≤ 90 seconds |
| Share rate (PNG/PDF download) | ≥ 35% |
| Net Promoter Score | ≥ 45 |

---

## 2. Problem & Opportunity

### 2.1 The problem

Most people don't know which colors flatter them, and discovering this through trial-and-error wastes hundreds of dollars on clothing returns and unworn items. Professional color analysis exists, but the friction is enormous:

- In-person sessions cost $200–$500 and require booking weeks in advance.
- Existing free quizzes ask 30+ subjective questions and produce generic results.
- Paid apps in the market deliver text-only outputs — users can't visualize themselves in the recommended colors.
- Free AI tools have inconsistent identity preservation — the "you in your colors" photos look like a different person.

### 2.2 The opportunity

By combining a multimodal LLM (for color perception and seasonal classification) with a state-of-the-art identity-preserving image editor (for outfit visualization), we can deliver a complete consultation-quality report in under 90 seconds at less than $0.50 in API cost. This unlocks a sub-$10 price point with 90%+ gross margin and a viral, share-driven distribution model.

### 2.3 Market signals

- Color analysis search interest has grown ~5× since 2022 (Google Trends).
- "Personal color analysis" has been a sustained TikTok trend — a known competitor in this category reportedly reached ~$40K MRR in 5 months on TikTok organic alone.
- Korean, Japanese, and Chinese markets have established offline color analysis industries (~$200–$400 per session); digital-first products are nascent.
- Zero strong incumbent: existing apps are either text-only quizzes or have weak AI image generation.

---

## 3. Target Users & Personas

### 3.1 Primary segments

| Segment | Profile | Primary motivation |
|---|---|---|
| Style-curious Gen Z (18–25) | TikTok-native, image-conscious, $0–$50 discretionary spend per month on style | Self-expression, social shareability, fitting in / standing out |
| Millennial professionals (26–40) | Building a capsule wardrobe, returning to office, $50–$300 monthly clothing spend | Wardrobe efficiency, looking polished, reducing decision fatigue |
| Returning customers (women 35+) | Familiar with color analysis from print era, may have done an in-person session 10+ years ago | Refresh / validate previous result, get visual proof |
| Stylists & resellers (B2B) | Personal stylists, image consultants, virtual closet apps wanting to white-label color analysis | Offer service to clients without certification |

### 3.2 Personas

#### Persona 1 — Maya, 23, college senior

- Discovers ChromaMe via a TikTok creator's "I tried this AI color analysis" video.
- Will spend $5–$8 if the result is shareable; will not spend $30.
- Needs: fast result (<2 min), aesthetic output worth posting, no email signup gate.
- Anti-needs: long quizzes, jargon, requirement to upload multiple photos.

#### Persona 2 — David, 34, marketing manager

- Found ChromaMe via Google search "what colors should I wear".
- Wants a wardrobe-planning tool, not a TikTok trend.
- Will spend $15–$25 for a comprehensive PDF + capsule wardrobe shopping list.
- Needs: print-quality PDF, savable to phone wallet/Notes, clear outfit categories (work / casual / formal).

#### Persona 3 — Priya, 41, freelance image consultant

- Looking for a tool to deliver to her own clients without learning seasonal theory deeply.
- Will spend $50–$200/month for a white-label / bulk option.
- Needs: branded reports, ability to add her notes, bulk credits.
- Out of scope for v1; B2B SKU planned for Phase 4.

---

## 4. Goals & Success Metrics

### 4.1 Product goals

1. Deliver a complete, accurate color analysis report from a single selfie in under 90 seconds.
2. Make every report visually striking enough that ≥35% of users share or download it.
3. Achieve 90%+ gross margin per paid report (revenue ≥10× marginal API cost).
4. Maintain skin-tone-fairness parity: classification accuracy on Fitzpatrick V–VI within 10 percentage points of I–II.

### 4.2 North Star Metric

**Shared Reports per Week** — a single number that reflects acquisition (new users), satisfaction (users finish the flow), and virality (output is good enough to share). Captures the entire funnel in one number.

### 4.3 Success metrics by phase

| Metric | Phase 1 (MVP) | Phase 2 | Phase 3 |
|---|---|---|---|
| Reports completed / week | 1,000 | 10,000 | 50,000 |
| Free → paid conversion | n/a (no paid yet) | 5% | 8% |
| Median time-to-result | ≤ 60s | ≤ 90s | ≤ 90s |
| Share rate | ≥ 25% | ≥ 30% | ≥ 35% |
| Cost per report (API) | ≤ $0.05 | ≤ $0.40 | ≤ $0.40 |
| 7-day return rate | ≥ 5% | ≥ 10% | ≥ 15% |
| NPS | n/a | ≥ 40 | ≥ 45 |
| Identity-drift rate (regenerations needed) | n/a | ≤ 15% | ≤ 10% |

---

## 5. User Stories & Use Cases

### 5.1 Core user stories (MVP)

| ID | Stage | Story |
|---|---|---|
| US-01 | Discover | As a first-time visitor, I want to see clear example outputs on the landing page so I understand what I'll get before uploading my photo. |
| US-02 | Upload | As a user, I want to upload a selfie from my phone or laptop in one tap and get an instant "is this photo good enough" check, so I don't waste time waiting for a flawed result. |
| US-03 | Analyze | As a user, I want to see a progress indicator with friendly status messages (e.g., "Reading your skin undertone…") while my photo is being analyzed. |
| US-04 | Receive result | As a user, I want to see my season name, my best palette, and an explanation of why those colors work for me, all on a single scrollable page. |
| US-05 | Compare | As a user, I want to see a side-by-side comparison of myself in best colors vs colors to avoid, so I can visually trust the result. |
| US-06 | Pick a template | As a user, I want to choose between 3 visual styles for my report so the output matches my personal aesthetic. |
| US-07 | Share | As a user, I want to download my report as a PNG (for stories) or PDF (for printing) with one tap. |
| US-08 | Re-roll | As a user, if a generated outfit photo doesn't look like me, I want to regenerate it with one tap without losing the rest of my report. |
| US-09 | Pay (Phase 2) | As a user, I want to unlock outfit mockups and additional templates with a single $5–$10 purchase, no subscription required. |
| US-10 | Save (Phase 3) | As a returning user, I want to revisit past reports without re-uploading. |

### 5.2 Edge cases & negative paths

- User uploads a photo with multiple faces → reject with clear message and example of acceptable selfie.
- User uploads a heavily filtered photo → flag low confidence and ask user to confirm or re-upload.
- User uploads a photo too dark / too bright / too blurry → reject before sending to APIs.
- User uploads a photo of a non-human or cartoon → reject with safety message.
- Vision API returns ambiguous undertone (confidence < 0.5) → present 2 likely seasons and ask user a single tiebreaker question.
- Image generation API fails or returns drift → retry once, then offer a placeholder swatch with apology.
- Payment fails after analysis is complete → save free-tier output and email recovery link.

---

## 6. Product Scope

### 6.1 In scope (v1.0)

- Single selfie upload (JPG/PNG/HEIC, max 10MB).
- Browser-based image quality validation before upload (lighting, single face, resolution).
- AI vision analysis (skin/hair/eye color extraction, undertone, value, chroma, contrast).
- Deterministic 12-season classification (rules-based mapping over the LLM-extracted attributes).
- Personalized palette: best colors, neutrals, colors to avoid (24+ swatches).
- AI-generated "you in your colors" outfit mockups (5–8 in paid tier).
- Three selectable visual templates (Editorial Dark, Elegant Magazine, Comparison Grid).
- PNG download (1080×1920 portrait, optimized for stories) + PDF export (A4 / Letter).
- One-time purchase paywall ($4.99–$9.99 SKU options).
- Email-only re-access to a generated report (no password).
- Mobile-first responsive web (PWA-ready).

### 6.2 Out of scope (v1.0)

- Native iOS / Android apps.
- Real-time webcam analysis.
- Hair-color try-on / makeup try-on (Phase 3 candidates).
- Live shopping integrations or affiliate carousels (Phase 3).
- Stylist B2B / white-label (Phase 4).
- User accounts with passwords (use email magic-link or anonymous links instead).
- Subscription billing (one-time only at v1).
- Body-shape analysis or full style profiling.
- Languages other than English (Phase 3+).

---

## 7. Functional Requirements

### 7.1 FR-1 — Upload & Validation

- **FR-1.1**: Accept JPG, PNG, HEIC, WebP up to 10 MB; auto-rotate via EXIF.
- **FR-1.2**: Run client-side MediaPipe Face Landmarker before upload; reject if 0 or >1 faces detected.
- **FR-1.3**: Reject images where the face occupies <15% of the frame or where mean luminance is <40 or >220 (0–255).
- **FR-1.4**: Strip EXIF GPS metadata server-side before storage.
- **FR-1.5**: Show three example reference photos (good lighting, neutral expression, no heavy filter).

### 7.2 FR-2 — Vision Analysis

- **FR-2.1**: Send the validated image to the configured vision LLM (default: Claude Sonnet 4.5).
- **FR-2.2**: Vision LLM must return strict JSON containing skin/hair/eye hex codes, undertone, overall value, overall chroma, overall contrast, and per-axis confidence.
- **FR-2.3**: If overall confidence < 0.5 OR any image-quality issue is flagged, prompt user with a remediation step (re-upload OR confirm).
- **FR-2.4**: Cache the vision response keyed by image hash for 30 days to avoid double charging on retries.

### 7.3 FR-3 — Season Classification

- **FR-3.1**: Apply the deterministic 12-season classifier (TypeScript module) to the vision JSON.
- **FR-3.2**: Output the primary season + confidence + neighboring (next-most-likely) season.
- **FR-3.3**: For each season, look up a curated palette of 24 hex codes (best, neutrals, accents) from a static config.

### 7.4 FR-4 — Outfit Generation (Paid)

- **FR-4.1**: For each of 5–8 outfit categories (e.g., Earthy Casual, Smart & Sharp, Warm & Approachable, Rich & Bold, Cool Depth), generate one image using Gemini 2.5 Flash Image with the user's selfie + a category-specific prompt.
- **FR-4.2**: Each generated image must preserve the user's face identity within visual tolerance (manual QA on first 100 paid users; ≥85% must require no regeneration).
- **FR-4.3**: Generation runs in a background queue; the UI must stream completed images as they arrive (no blocking 60-second wait).
- **FR-4.4**: Each image includes a visible "Regenerate this look" button at no extra charge for the first regeneration.

### 7.5 FR-5 — Template Rendering

- **FR-5.1**: Provide three templates: Editorial Dark, Elegant Magazine, Comparison Grid.
- **FR-5.2**: User selects template before final render; switching templates recomposes the same data, never re-runs the AI.
- **FR-5.3**: Render templates as React components in-app for live preview; export as PNG (1080×1920 and 2160×2700) and PDF via htmlcsstoimage or self-hosted Puppeteer.
- **FR-5.4**: All templates must include a small "Made with ChromaMe" watermark in the free tier; paid tier removes the watermark.

### 7.6 FR-6 — Sharing & Re-access

- **FR-6.1**: Generate a shareable URL (e.g., chromame.app/r/{slug}) that displays the report without requiring login.
- **FR-6.2**: Provide native share sheet integration on mobile (Web Share API).
- **FR-6.3**: Optional email capture at the result step ("Email me a copy?") sends a link, no password required.

### 7.7 FR-7 — Payment

- **FR-7.1**: Stripe Checkout for one-time purchases; support Apple Pay, Google Pay, card.
- **FR-7.2**: Three SKUs: Basic ($4.99 — palette + 1 template), Plus ($9.99 — 6 outfit images + 3 templates + PDF), Premium ($14.99 — 10 outfit images + all templates + PDF + 30-day re-access).
- **FR-7.3**: Tax via Stripe Tax; refund policy: full refund within 24 hours, no questions.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | P95 time from upload-complete to first result paint ≤ 12 seconds (text result). P95 to all 6 outfit images rendered ≤ 90 seconds. |
| Availability | 99.5% monthly uptime. Vision and image-gen API failures must degrade gracefully (cached fallbacks, queued retries). |
| Cost ceiling | Marginal API cost per Premium report ≤ $0.65. Auto-disable image-gen if daily API spend exceeds $X (configurable). |
| Accessibility | WCAG 2.1 AA: keyboard-navigable, screen-reader announcements for upload state and results, alt text for all generated images, contrast ≥ 4.5:1. |
| Mobile | Mobile-first design. Full flow must work on iPhone SE-class viewport (375 × 667) and Android Chrome on 4G. |
| Browser support | Last 2 versions of Chrome, Safari, Firefox, Edge. iOS 15+. Android 10+. |
| Privacy | Photos deleted from CDN within 30 days unless user opts to save. No third-party tracking pixels on the result page (privacy-respecting analytics only). |
| Security | All uploads via signed URLs. PII (email) encrypted at rest. Rate-limit uploads to 5/hr per IP. |
| Internationalization | Copy strings externalized in i18n format from day 1, even though only English ships in v1. |
| Skin-tone fairness | Classification accuracy on Fitzpatrick V–VI test set within 10 pp of I–II; tested before each model swap. |

---

## 9. User Flows

### 9.1 Happy path — Free tier

1. Land on homepage → see 3 example reports + "Try free" CTA.
2. Tap "Try free" → upload selfie (camera or library).
3. Client-side validation runs (~1s) → show "Photo looks great" or remediation.
4. Streaming progress: "Reading your features…" → "Identifying your season…" → "Building your palette…"
5. Result page renders: season name, palette swatches, do/don't list, 1 free template applied, watermarked.
6. Bottom CTA: "See yourself in your colors → unlock $9.99" (Plus tier upsell).
7. User taps Download or Share → PNG saved or share sheet opens.

### 9.2 Happy path — Paid tier (Plus)

1. Steps 1–5 from free flow.
2. Tap "Unlock outfit mockups" → Stripe Checkout overlay → pay.
3. Return to result page; outfit images stream in over ~60 seconds with skeleton placeholders.
4. User can tap any image to regenerate (1 free regen per image).
5. Template selector reveals: pick Editorial Dark, Elegant Magazine, or Comparison Grid.
6. Download buttons: PNG (story format), PNG (square), PDF.

### 9.3 Recovery flow — Bad photo

1. Upload completes → MediaPipe detects 2 faces.
2. Show modal: "We can only analyze one face at a time. Try a solo selfie?" with example image.
3. CTA: "Try another photo" → re-uploads, no charge incurred.

---

## 10. Information Architecture

### 10.1 Page map

- `/` — Marketing landing page (hero, examples, social proof, FAQ, footer)
- `/start` — Upload + validation flow
- `/r/{slug}` — Result page (responsive, public-shareable)
- `/checkout/{slug}` — Payment overlay/page
- `/about` — Brand story, fairness commitment, contact
- `/privacy`, `/terms`, `/refunds` — Legal
- `/api/*` — Internal endpoints (not user-facing)

### 10.2 Result page structure

- **Hero band**: user's selfie + season name + one-line description
- **Section 1**: Your natural colors (extracted skin/hair/eye hex)
- **Section 2**: Your palette (24 swatches grouped: best, neutrals, accents)
- **Section 3**: Colors to avoid
- **Section 4 (paid)**: You in your colors — outfit mockup gallery
- **Section 5**: Style notes (how to wear, what to pair)
- **Section 6**: Template selector + share/download CTAs
- **Footer**: Made with ChromaMe + "Get yours" CTA

---

## 11. Template System

Templates are visual presentations of identical underlying data. Switching templates must never trigger a re-analysis or re-generation; it only re-renders the layout. All templates render at 1080×1920 (story), 2160×2700 (Pinterest), and A4/Letter (PDF).

### 11.1 Template specs

| Template | Aesthetic | Best for | Key elements |
|---|---|---|---|
| Editorial Dark | Cinematic, dark background, warm gold accents, large feature photo | Men, professional sharing, LinkedIn | Black/charcoal background, narrow type, palette swatches as horizontal strip, 5 outfit photos in a row |
| Elegant Magazine | Cream / off-white, serif headlines, magazine-style layout | Women, Pinterest, lifestyle blogs | Cream background, serif type (Playfair / Cormorant), palette + makeup swatches + jewelry guide, 4 outfit photos in a 2×2 grid |
| Comparison Grid | Clean white, side-by-side best vs avoid | Skeptical users wanting visual proof, Reddit, Twitter | White background, sans-serif, large "best" grid + dimmed "avoid" grid, hex codes labeled |

### 11.2 Template engine

- Each template is a React component (Next.js) that accepts the analysis JSON as props.
- Live preview in-app uses CSS at viewport scale; export uses headless render (Puppeteer or htmlcsstoimage) at exact pixel dimensions.
- Adding a new template = one new React component + one entry in the template registry. No backend changes.
- Template-specific copy variants (e.g., editorial uses crisper, shorter sentences) are part of the component.

---

## 12. Technical Architecture

### 12.1 Stack overview

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui | Mature ecosystem, server components reduce client JS, fast deploys on Vercel |
| Hosting | Vercel (frontend + edge functions) | Native Next.js, generous free tier, fast global CDN |
| Image upload + CDN | Cloudinary (next-cloudinary widget) | Signed uploads, on-the-fly resizing, generous free tier |
| Background removal | Photoroom API | $0.02 / image, money-back on poor results, e-commerce-tuned |
| Vision LLM | Claude Sonnet 4.5 (primary), GPT-4o (fallback) | Best structured-JSON quality for color reasoning at ~$0.012 / call |
| Image generation | Gemini 2.5 Flash Image via fal.ai | Best identity preservation at $0.039 / image (or $0.0195 batch) |
| Queue | Inngest | Reliable retries, native to Vercel/Next.js, free tier covers MVP |
| Database | Postgres on Neon | Serverless, branchable, fits Vercel deploy model |
| ORM | Prisma | Type-safe schema migrations |
| Payments | Stripe Checkout + Stripe Tax | Standard, Apple Pay/Google Pay built in |
| Auth | Magic-link (email only) via Supabase Auth | No password fatigue; v1 doesn't need full accounts |
| Analytics | PostHog (self-hosted) or Plausible | Privacy-respecting, no third-party trackers on result pages |
| Error monitoring | Sentry | Standard |
| Cost monitoring | Helicone (LLM calls) + Cloudinary dashboard | Per-call cost attribution; alerts on overspend |
| Template render | htmlcsstoimage.com (initially), Puppeteer (Phase 3) | Faster ship now; control later |

### 12.2 High-level system flow

```
Client (Next.js)
    ↓ uploads selfie via signed URL
Cloudinary
    ↓
/api/analyze (Server Action)
    ├─→ Photoroom (background removal)
    ├─→ Claude Sonnet 4.5 (vision JSON)
    └─→ Deterministic season classifier
    ↓
Neon Postgres (persist analysis JSON)
    ↓
Client polls /api/outfits/{id}
    ↓
Inngest worker (parallel fan-out)
    └─→ Gemini 2.5 Flash Image × 5–8 prompts
    ↓ each completed image
Cloudinary (store) + DB update
    ↓
Client streams images via SSE
    ↓
htmlcsstoimage renders selected template → PNG/PDF
```

### 12.3 Failure modes & resilience

- Vision API down → fallback to GPT-4o; if both down, queue and email user when ready.
- Image-gen API rate-limited → queue with exponential backoff; surface "still generating" status to user.
- Cloudinary outage → temporary local storage on Vercel blob; reconcile when service returns.
- Stripe webhook missed → reconciliation job runs hourly to detect orphan paid sessions.

---

## 13. AI Pipeline Specification

### 13.1 Pipeline stages

1. **Pre-flight (client)**: MediaPipe face detection, single-face check, lighting check.
2. **Pre-process (server)**: Photoroom background removal (optional for vision step; required for outfit generation).
3. **Vision analysis**: Claude Sonnet 4.5 with structured-JSON system prompt.
4. **Classification**: deterministic TypeScript classifier maps JSON to one of 12 seasons + neighboring.
5. **Palette lookup**: static JSON config returns 24 curated hex codes per season.
6. **Outfit generation (paid)**: Inngest worker fans out 5–8 calls to Gemini 2.5 Flash Image in parallel, each with selfie + category-specific prompt.
7. **Render**: React template component → htmlcsstoimage → PNG/PDF.

### 13.2 Prompt: Vision analysis

System prompt (excerpt — see Appendix for full version):

> You are a certified seasonal color analyst. Analyze the selfie and return ONLY valid JSON matching the provided schema. Sample skin from non-shadowed cheek; sample hair from above the forehead; sample eyes from the iris. Ignore lipstick and obvious makeup. If the photo has a strong filter, set confidence below 0.5. Output schema: `{ skin: { hex, undertone, depth }, hair: { hex, natural_color, depth }, eyes: { hex, color_family }, overall_value, overall_chroma, overall_contrast, confidence, image_quality_issues }`.

### 13.3 Prompt: Outfit generation

Per-image prompt template:

> Edit this photo: keep the exact same person, face, skin tone, hair, and identity unchanged. Replace only the clothing with a `[CATEGORY]` outfit suited for a `[SEASON]` color palette: `[SPECIFIC GARMENTS WITH HEX CODES]`. Studio lighting, soft shadows, neutral cream background, magazine editorial photography, 3:4 portrait, sharp focus on the face. Do not change pose, hair, or facial features.

### 13.4 Identity preservation QA

- Manual QA on first 100 paid users: rate each generated outfit on a 3-point scale (looks like me / acceptable / different person).
- Target: ≥85% in "looks like me" on first generation, ≥95% after one regeneration.
- Re-evaluate every quarter; fast track switching providers if metrics regress.

### 13.5 Skin-tone fairness QA

- Maintain a curated test set of 60 selfies (10 per Fitzpatrick I–VI) with stylist-labeled ground-truth seasons.
- Run the full pipeline on the test set before each model swap or prompt change.
- Block release if accuracy on V–VI is more than 10pp below I–II.

---

## 14. Data Model

### 14.1 Core entities

| Entity | Key fields | Notes |
|---|---|---|
| Report | id, slug, created_at, status, selfie_url, analysis_json, season, neighboring_season, template_id, paid_tier, expires_at | Public via slug; expires 30 days for free tier |
| Outfit | id, report_id, category, prompt, image_url, regen_count, status | One row per generated outfit image |
| User (lite) | id, email, created_at | Optional; only created when user requests email re-access |
| Purchase | id, report_id, stripe_session_id, sku, amount, currency, status | Audit trail for paid reports |
| AuditLog | id, report_id, event, payload, created_at | All API calls logged for cost attribution and debugging |

### 14.2 Privacy-driven retention

- `selfie_url`: deleted from Cloudinary after 30 days unless user explicitly saves.
- `analysis_json` + outfit images: retained indefinitely if paid (user can re-access via slug).
- Email: encrypted at rest; deletable on request via /privacy.
- AuditLog: 90-day retention, then aggregate-only.

---

## 15. Privacy, Trust & Compliance

### 15.1 Privacy principles

- Selfies are processed for analysis and outfit generation only — never used for model training or sold.
- Free reports auto-delete the source selfie after 30 days; paid reports keep it until the user deletes.
- No third-party advertising trackers anywhere on the site.
- Public report URLs use random unguessable slugs but a privacy-conscious user can opt to make them require email confirmation.

### 15.2 Compliance

- **GDPR**: explicit consent at upload, data export and deletion endpoints at /privacy.
- **CCPA**: do-not-sell opt-out (already default — we don't sell).
- **AI disclosure**: all generated outfit images carry a small visible watermark and the SynthID watermark from Gemini.
- **Children**: ToS prohibits use under 13; landing page does not target minors.
- **Skin-tone fairness statement** on /about — public commitment with test methodology.

### 15.3 Trust & safety

- Reject uploads of children (under-18 detection via age estimator) — show a friendly "this service is for adults" message.
- Reject obvious non-human / cartoon images with safety message.
- Profanity filter on any user-supplied text (e.g., custom name on PDF).
- Generated images do not depict the user in revealing or compromising clothing — system prompts explicitly require professional/casual attire.

---

## 16. Pricing & Monetization

### 16.1 SKUs (v1)

| SKU | Price (USD) | Includes | API cost | Margin |
|---|---|---|---|---|
| Free | $0 | Palette + 1 template + watermark | ~$0.05 | Loss leader |
| Basic | $4.99 | Palette + 3 templates + PDF (no outfit images) | ~$0.06 | ~98% |
| **Plus (default)** | **$9.99** | **Plus 6 outfit images + 3 templates + PDF** | **~$0.40** | **~96%** |
| Premium | $14.99 | Plus 10 outfit images + all templates + PDF + 30-day re-access | ~$0.65 | ~96% |

### 16.2 Pricing logic

- One-time payment only at v1 — subscriptions add complexity without clear LTV signal yet.
- Anchor on Plus ($9.99) — offers the visual outfit mockups that are the share-driver.
- Free tier exists primarily as a viral funnel; the watermark is the upgrade hook.
- Premium ($14.99) included to capture the "I want everything" segment without changing the page.

### 16.3 Future monetization (Phase 3+)

- Affiliate-linked shopping recommendations (Amazon, LTK, ShopMy).
- B2B white-label SKU for stylists ($49–$199/month for branded templates + bulk credits).
- Hair-color try-on add-on ($2.99).
- Annual "refresh" (re-run with a new photo) at 50% of original price.

---

## 17. Release Plan & Milestones

### 17.1 Phases

| Phase | Duration | Scope | Exit criteria |
|---|---|---|---|
| Phase 0 — Foundation | Week 1–2 | Repo scaffolding, Vercel + Neon setup, Cloudinary upload widget, Stripe sandbox, design tokens, brand kit | Selfie can be uploaded and stored end-to-end |
| Phase 1 — MVP (Free) | Week 3–5 | Vision pipeline, season classifier, palette lookup, 1 template (Elegant Magazine), PNG download, watermark | Anonymous user can upload and receive a free report; ≥1,000 reports generated in beta |
| Phase 2 — Paid Outfits | Week 6–9 | Gemini 2.5 Flash Image integration, Inngest queue, regeneration, 3 templates, Stripe checkout, paid tiers | ≥5% conversion rate; ≥85% identity-preservation pass rate |
| Phase 3 — Polish & Distribution | Week 10–13 | PDF export, mobile PWA, email re-access, /about with fairness statement, SEO landing pages, analytics dashboard | ≥30% share rate; NPS ≥ 40 |
| Phase 4 — Growth | Q3+ | Affiliate shopping, hair color try-on, B2B SKU, language support (Korean, Japanese, Spanish) | TBD |

### 17.2 Launch criteria checklist

- [ ] Identity-preservation QA pass rate ≥ 85% on 100-photo test set.
- [ ] Skin-tone fairness gap ≤ 10 percentage points on Fitzpatrick test set.
- [ ] P95 free-flow time-to-result ≤ 60 seconds.
- [ ] Stripe end-to-end purchase tested in production with real card.
- [ ] Privacy policy, ToS, refund policy all reviewed and live.
- [ ] Sentry + cost monitoring + abuse rate-limits configured.
- [ ] 3 example reports on landing page (1 per template, demographically diverse subjects).
- [ ] Customer support inbox monitored (target: respond within 24h).

---

## 18. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Skin-tone bias in vision LLM produces unfair classifications for darker skin tones | Medium | High | Fitzpatrick-balanced test set, public fairness statement, route classification through deterministic mapper rather than letting LLM pick the season |
| Identity drift in outfit generation makes paid users feel cheated | Medium | High | Free regeneration on every image, strict QA before launch, fallback to FLUX Kontext, cap at 8 images and over-generate then pick best 6 |
| Vision or image-gen API price hike kills margin | Low | Medium | Multi-provider abstraction layer; quarterly cost review; ability to swap to batch pricing or self-hosted FLUX Kontext |
| Provider deprecates a model mid-quarter | Medium | Medium | Pin model versions in API calls; subscribe to provider deprecation feeds; monthly E2E regression test |
| Viral spike overwhelms infrastructure | Medium | Medium | Inngest queue auto-throttles; Vercel auto-scales frontend; Stripe-side rate limit on new analyses if cost spikes; pre-arranged provider rate-limit increases |
| Payment fraud / chargebacks | Low | Low | Stripe Radar enabled; refund threshold flagged; manual review of disputes |
| Misuse: deepfake / non-consensual imagery | Medium | High | Reject uploads of obvious public figures, multi-face photos; SynthID watermark on all outputs; clear ToS prohibition |
| Negative TikTok review goes viral | Medium | Medium | Public-facing fairness commitment; transparent regeneration policy; full refund within 24h |
| Competitor undercuts on price | High | Low | Compete on aesthetics + identity preservation, not price; build a brand |
| Regulatory: AI-generated likeness laws (e.g., EU AI Act, California AB-2602) | Medium | Medium | Explicit consent at upload; SynthID + visible watermark; legal review before launch in EU |

---

## 19. Open Questions

1. Should free tier include 1 outfit mockup as a "taste" to drive paid conversion, or none at all? Test in A/B.
2. Best-converting price point — does $7.99 outperform $9.99 for the Plus SKU? Pricing test in Phase 2.
3. Should we expose "confidence" to users, or only surface it internally to flag re-uploads? Risk: showing 60% confidence may erode trust.
4. How do we handle non-binary / gender-flexible style preferences in outfit categories? Currently the categories are gender-coded; consider neutral category names.
5. Do we offer a "try a different season" toggle for users who disagree with the result?
6. Brand name: "ChromaMe" is a placeholder — final naming + domain TBD.
7. How aggressively do we age-gate? An "over 13" confirm box vs an active age-estimator before processing.
8. Should report URLs be public-by-default with privacy opt-in, or private-by-default with sharing opt-in?

---

## 20. Appendix

### 20.1 Glossary

- **Undertone** — the underlying hue of a person's skin (warm/yellow-gold, cool/pink-blue, or neutral).
- **Value** — the overall lightness or depth of a person's coloring (skin + hair + eyes combined).
- **Chroma** — the saturation level of features — clear/bright vs muted/soft.
- **Contrast** — how far apart the lightness values of skin, hair, and eyes are.
- **12 seasons** — Light/True/Bright Spring; Light/True/Soft Summer; Soft/True/Deep Autumn; Deep/True/Bright Winter.
- **Identity preservation** — the ability of an image-edit model to keep the same recognizable face across multiple generations.
- **SynthID** — Google's invisible watermark embedded in images generated by Gemini.

### 20.2 Reference: 12-Season classifier (pseudocode)

```typescript
function classifySeason(json) {
  const { skin, overall_value, overall_chroma } = json;
  const family = skin.undertone === 'warm'
    ? (overall_value === 'light' ? 'Spring' : 'Autumn')
    : skin.undertone === 'cool'
    ? (overall_value === 'light' ? 'Summer' : 'Winter')
    : (overall_chroma === 'clear' ? 'Winter' : 'Autumn');

  // Sub-season = whichever of value/chroma is most extreme
  if (family === 'Spring') {
    if (overall_chroma === 'clear') return 'Bright Spring';
    if (overall_value === 'light')  return 'Light Spring';
    return 'True Spring';
  }
  if (family === 'Summer') {
    if (overall_value === 'light') return 'Light Summer';
    if (overall_chroma === 'muted') return 'Soft Summer';
    return 'True Summer';
  }
  if (family === 'Autumn') {
    if (overall_chroma === 'muted') return 'Soft Autumn';
    if (overall_value === 'deep') return 'Deep Autumn';
    return 'True Autumn';
  }
  if (family === 'Winter') {
    if (overall_value === 'deep') return 'Deep Winter';
    if (overall_chroma === 'clear') return 'Bright Winter';
    return 'True Winter';
  }
}
```

### 20.3 Reference: example palette config (Deep Autumn)

```json
{
  "deep_autumn": {
    "neutrals": ["#1F1A14", "#3B2A1A", "#5C4632", "#8B6F47", "#C9B89A"],
    "blues_teals": ["#1B3B47", "#2C5663", "#3F6F7A", "#5A8995"],
    "reds_oranges": ["#9C3B1E", "#7A2A1A", "#B5552A", "#D67A3D"],
    "greens": ["#2F3D1F", "#4A5934", "#6B7B45", "#8B9355", "#A5A766"],
    "earth": ["#704623", "#8B5A2B", "#A6753D", "#C28F58"],
    "avoid": ["#FFFFFF", "#000000", "#F0C0D0", "#A0A0A0"]
  }
}
```

### 20.4 Reference: cost model per Premium report

| Step | Service | Per-call cost | Per report |
|---|---|---|---|
| Selfie upload + CDN | Cloudinary | — | $0.001 |
| Background removal | Photoroom | $0.020 | $0.020 |
| Vision analysis JSON | Claude Sonnet 4.5 | $0.012 | $0.012 |
| Outfit mockups (10) | Gemini 2.5 Flash Image | $0.039 | $0.390 |
| Template render PNG | htmlcsstoimage | $0.005 | $0.005 |
| PDF export | htmlcsstoimage | $0.005 | $0.005 |
| Stripe fees (2.9% + 30¢) | Stripe | — | $0.74 |
| **TOTAL marginal cost** | | | **≈ $1.17** |
| **Revenue (Premium)** | | | **$14.99** |
| **Net contribution per Premium** | | | **≈ $13.82** |

### 20.5 Document changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | May 5, 2026 | Product Team | Initial PRD |

---

*End of document.*