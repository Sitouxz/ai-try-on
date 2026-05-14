// AI Guide — color analysis flow + ElevenLabs avatar voice guide.
// Augments the PhotoboothApp class (see script.js) with the methods required for
// the "Let AI Guide You" mode: sends the captured photo to Gemini for color analysis,
// renders the resulting palette + outfit + accessory recommendations, and instructs
// the ElevenLabs avatar to speak at each step.

(function () {
    if (typeof PhotoboothApp === 'undefined') {
        console.error('[ai-guide] PhotoboothApp not found — script.js must load first.');
        return;
    }

    const proto = PhotoboothApp.prototype;

    // ── Avatar step prompts ────────────────────────────────────────────────────
    const STEP_PROMPTS = {
        camera: 'Please greet the user warmly and tell them to stand in the center of the frame, look straight at the camera, and press the capture button when they are ready.',
        analyzing: 'Tell the user their photo looks great and that you are now analyzing their skin tone, undertone, and contrast. Ask them to hang tight for just a moment.',
        aiOutfit: 'Tell the user their color analysis is complete and you have curated outfits that will complement their personal palette. Encourage them to browse the recommendations and select one to try on.',
        result: 'Tell the user their virtual try-on looks amazing! Remind them they can download the photo, try a different outfit, or start a new color analysis.',
    };

    function buildResultsPrompt(analysis) {
        const season = analysis?.season || 'a beautiful season';
        const undertone = analysis?.undertone || '';
        const top3 = (analysis?.palette || []).slice(0, 3).map(c => c.name).join(', ');
        return `Tell the user their color analysis results are ready. Their personal color season is ${season}${undertone ? ` with a ${undertone} undertone` : ''}. ${top3 ? `Their top flattering colors are ${top3}.` : ''} Encourage them to scroll down to explore their full palette, outfit recommendations, and accessory suggestions, and invite them to ask any questions.`;
    }

    function avatarSpeak(step, analysis = null) {
        const prompt = step === 'results' ? buildResultsPrompt(analysis) : STEP_PROMPTS[step];
        if (!prompt) return;
        // speak() queues the prompt if session not yet running; latest wins
        window.elevenLabsAvatar?.speak(prompt);
    }

    // ── Wrap app lifecycle methods to inject voice guidance ───────────────
    const _origShowApp = proto.showApp;
    proto.showApp = function (mode) {
        _origShowApp.call(this, mode);
        if (mode === 'ai') {
            setTimeout(() => avatarSpeak('camera'), 1800);
        }
    };

    const _origReturnToLanding = proto.returnToLanding;
    proto.returnToLanding = function () {
        _origReturnToLanding.call(this);
    };

    const _origShowResult = proto.showResult;
    proto.showResult = function (imageUrl) {
        _origShowResult.call(this, imageUrl);
        avatarSpeak('result');
    };

    // ── AI analysis flow ──────────────────────────────────────────────────
    proto.startAiAnalysis = async function () {
        const overlay = document.getElementById('loadingOverlay');
        const overlayText = overlay?.querySelector('.loading-text');
        if (overlay) overlay.style.display = 'flex';
        if (overlayText) overlayText.textContent = 'Analyzing your colors…';

        avatarSpeak('analyzing');

        try {
            const base64 = await this._dataUrlToBase64(this.capturedDataUrl);
            const cfg = window.PHOTOBOOTH_CONFIG;
            const apiKey = cfg?.GEMINI_API_KEY;
            if (!apiKey) throw new Error('GEMINI_API_KEY not set in config.js');
            const model = cfg?.GEMINI_MODEL || 'gemini-2.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: `You are a professional personal-color and styling consultant.\nAnalyze the person in the photo and produce a personal color analysis along with\noutfit and accessory recommendations.\n\nRules:\n- Be concrete and concise. No greetings, no markdown.\n- Use realistic, specific color names ("warm camel", "soft sage") with accurate hex codes.\n- Outfit and accessory recommendations must complement the recommended palette.\n- If the photo is low quality, ambiguous, or shows no person, still respond, but say so\n  briefly in the "summary" field and give general best-guess recommendations.\n- Never refuse. Never ask follow-up questions.` }] },
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                            { text: 'Analyze this person and return the structured color analysis + recommendations.' },
                        ],
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.7,
                        responseSchema: {
                            type: 'object',
                            properties: {
                                season: { type: 'string' },
                                undertone: { type: 'string' },
                                skinTone: { type: 'string' },
                                contrast: { type: 'string' },
                                summary: { type: 'string' },
                                palette: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            hex: { type: 'string' },
                                            note: { type: 'string' },
                                        },
                                        required: ['name', 'hex'],
                                    },
                                },
                                avoidColors: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            hex: { type: 'string' },
                                        },
                                        required: ['name', 'hex'],
                                    },
                                },
                                outfits: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            title: { type: 'string' },
                                            description: { type: 'string' },
                                            occasion: { type: 'string' },
                                        },
                                        required: ['title', 'description'],
                                    },
                                },
                                accessories: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                        },
                                        required: ['name', 'description'],
                                    },
                                },
                            },
                            required: ['season', 'undertone', 'summary', 'palette', 'outfits', 'accessories'],
                        },
                    },
                }),
            });
            if (!res.ok) {
                const errText = await res.text();
                let friendlyMsg = `Analysis failed (${res.status}). Please try again.`;
                try {
                    const errJson = JSON.parse(errText);
                    const msg = errJson?.error?.message;
                    if (msg) friendlyMsg = msg;
                } catch (_) {}
                throw new Error(friendlyMsg);
            }
            const json = await res.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from Gemini.');
            const analysis = JSON.parse(text);
            if (!analysis) throw new Error('Empty analysis payload.');
            this.lastAnalysis = analysis;
            this.renderAiResults(analysis);
        } catch (err) {
            console.error('[ai-guide] analysis error:', err);
            this.showAiError(err.message || 'Something went wrong.');
        } finally {
            if (overlay) overlay.style.display = 'none';
            if (overlayText) overlayText.textContent = 'Fitting your look…';
        }
    };

    proto._dataUrlToBase64 = function (dataUrl) {
        if (!dataUrl) return Promise.reject(new Error('No captured image.'));
        const comma = dataUrl.indexOf(',');
        return Promise.resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };

    // ── Rendering ─────────────────────────────────────────────────────────
    proto.renderAiResults = function (analysis) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? '—';
        };

        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'none';
        const stepAi = document.getElementById('stepAi');
        if (stepAi) stepAi.style.display = 'block';

        const personImg = document.getElementById('aiPersonThumb');
        if (personImg && this.capturedDataUrl) personImg.src = this.capturedDataUrl;

        set('aiSeason', analysis.season);
        set('aiUndertone', analysis.undertone);
        set('aiContrast', analysis.contrast);
        set('aiSummary', analysis.summary);

        // Palette swatches
        const palette = document.getElementById('aiPalette');
        if (palette) {
            palette.innerHTML = (analysis.palette || [])
                .map(
                    (c) => `
                <div class="ai-swatch" title="${escapeAttr(c.note || '')}">
                    <div class="ai-swatch-color" style="background:${escapeAttr(c.hex)}"></div>
                    <div class="ai-swatch-meta">
                        <div class="ai-swatch-name">${escapeHtml(c.name || '')}</div>
                        <div class="ai-swatch-hex">${escapeHtml(c.hex || '')}</div>
                    </div>
                </div>`
                )
                .join('');
        }

        // Avoid colors
        const avoid = analysis.avoidColors || [];
        const avoidSection = document.getElementById('aiAvoidSection');
        const avoidEl = document.getElementById('aiAvoidColors');
        if (avoidSection && avoidEl) {
            if (avoid.length) {
                avoidSection.style.display = 'block';
                avoidEl.innerHTML = avoid
                    .map(
                        (c) => `
                    <div class="ai-swatch ai-swatch-sm">
                        <div class="ai-swatch-color" style="background:${escapeAttr(c.hex)}"></div>
                        <div class="ai-swatch-meta">
                            <div class="ai-swatch-name">${escapeHtml(c.name || '')}</div>
                            <div class="ai-swatch-hex">${escapeHtml(c.hex || '')}</div>
                        </div>
                    </div>`
                    )
                    .join('');
            } else {
                avoidSection.style.display = 'none';
            }
        }

        // Outfits
        const outfits = document.getElementById('aiOutfits');
        if (outfits) {
            outfits.innerHTML = (analysis.outfits || [])
                .map(
                    (o) => `
                <li class="ai-recommend-item">
                    <div class="ai-recommend-title">${escapeHtml(o.title || '')}</div>
                    <div class="ai-recommend-desc">${escapeHtml(o.description || '')}</div>
                    ${o.occasion ? `<div class="ai-recommend-tag">${escapeHtml(o.occasion)}</div>` : ''}
                </li>`
                )
                .join('');
        }

        // Accessories
        const accessories = document.getElementById('aiAccessories');
        if (accessories) {
            accessories.innerHTML = (analysis.accessories || [])
                .map(
                    (a) => `
                <li class="ai-recommend-item">
                    <div class="ai-recommend-title">${escapeHtml(a.name || '')}</div>
                    <div class="ai-recommend-desc">${escapeHtml(a.description || '')}</div>
                </li>`
                )
                .join('');
        }

        setTimeout(() => avatarSpeak('results', analysis), 800);
    };

    proto.showAiError = function (message) {
        const stepAi = document.getElementById('stepAi');
        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'none';
        if (!stepAi) return;
        stepAi.style.display = 'block';
        stepAi.innerHTML = `
            <h2 class="camera-page-title p-page-title">Color Analysis</h2>
            <div class="ai-error-card">
                <div class="ai-error-icon">!</div>
                <p class="ai-error-msg">${escapeHtml(message)}</p>
                <div class="ai-error-actions">
                    <button class="btn btn-ghost" id="aiErrorHome">Home</button>
                    <button class="btn btn-primary" id="aiErrorRetry">Retake</button>
                </div>
            </div>`;
        document
            .getElementById('aiErrorHome')
            ?.addEventListener('click', () => this.returnToLanding());
        document
            .getElementById('aiErrorRetry')
            ?.addEventListener('click', () => {
                this.returnToLanding();
                setTimeout(() => this.showApp('ai'), 50);
            });
    };

    // ── AI Outfit Selection Flow ──────────────────────────────────────────
    // Extract season from analysis result (handles "Soft Autumn", "Bright Spring", etc.)
    function extractSeason(seasonString) {
        if (!seasonString) return 'spring';
        const lower = seasonString.toLowerCase();
        if (lower.includes('spring')) return 'spring';
        if (lower.includes('summer')) return 'summer';
        if (lower.includes('autumn') || lower.includes('fall')) return 'autumn';
        if (lower.includes('winter')) return 'winter';
        return 'spring'; // default
    }

    // Determine AI recommended outfits based on color analysis
    function getAiRecommendedIndices(analysis, totalOutfits) {
        // Use analysis data to deterministically pick "recommended" outfits
        // This creates the appearance of AI curation
        const seed = (analysis?.season || '').length + (analysis?.undertone || '').length;
        const indices = [];
        const count = Math.min(3, Math.ceil(totalOutfits / 4)); // Mark ~25% as recommended
        
        for (let i = 0; i < count; i++) {
            const idx = (seed + i * 3) % totalOutfits;
            if (!indices.includes(idx)) indices.push(idx);
        }
        return indices;
    }

    // Show AI Outfit Selection step after color analysis
    proto.showAiOutfitSelection = function () {
        const stepAi = document.getElementById('stepAi');
        const stepAiOutfit = document.getElementById('stepAiOutfit');
        
        if (stepAi) stepAi.style.display = 'none';
        if (stepAiOutfit) stepAiOutfit.style.display = 'block';

        // Set person photo
        const personImg = document.getElementById('aiOutfitPersonImg');
        if (personImg && this.capturedDataUrl) personImg.src = this.capturedDataUrl;

        // Initialize AI outfit selection state
        this.aiOutfitState = {
            gender: 'woman',
            season: 'spring',
            category: 'top',
            selectedOutfitUrl: null
        };

        // Detect season from color analysis if available
        if (this.lastAnalysis?.season) {
            const detectedSeason = extractSeason(this.lastAnalysis.season);
            this.aiOutfitState.season = detectedSeason;
            this.setAiSeasonTab(detectedSeason);
        }

        // Render color analysis data
        this.renderColorAnalysis();

        // Reset UI state
        this.resetAiOutfitUI();

        // Load initial outfits
        this.loadAiOutfitGrid();

        // Wire up event listeners (only once)
        if (!this._aiOutfitListenersInitialized) {
            this.initAiOutfitListeners();
            this._aiOutfitListenersInitialized = true;
        }

        avatarSpeak('aiOutfit');
    };

    proto.renderColorAnalysis = function () {
        const analysis = this.lastAnalysis;
        if (!analysis) return;

        // Set season, undertone, contrast values
        const seasonEl = document.getElementById('aiOutfitSeason');
        const undertoneEl = document.getElementById('aiOutfitUndertone');
        const contrastEl = document.getElementById('aiOutfitContrast');
        const paletteEl = document.getElementById('aiAnalysisPalette');

        if (seasonEl) seasonEl.textContent = analysis.season || '—';
        if (undertoneEl) undertoneEl.textContent = analysis.undertone || '—';
        if (contrastEl) contrastEl.textContent = analysis.contrast || '—';

        // Render color palette swatches
        if (paletteEl && analysis.palette) {
            paletteEl.innerHTML = analysis.palette.slice(0, 6).map(color => `
                <div class="ai-analysis-swatch" 
                     style="background: ${color.hex};" 
                     title="${color.name}: ${color.note || ''}">
                </div>
            `).join('');
        }
    };

    proto.resetAiOutfitUI = function () {
        // Reset gender tabs
        document.querySelectorAll('.ai-gender-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.gender === this.aiOutfitState.gender);
        });

        // Reset season tabs
        this.setAiSeasonTab(this.aiOutfitState.season);

        // Reset category filters
        document.querySelectorAll('.ai-category-filter').forEach(f => {
            f.classList.toggle('active', f.dataset.category === this.aiOutfitState.category);
        });

        // Reset try on button
        const tryOnBtn = document.getElementById('aiTryOnSelectedBtn');
        if (tryOnBtn) {
            tryOnBtn.disabled = true;
            tryOnBtn.innerHTML = '<span>Try On</span>';
        }

        // Reset sidebar visibility
        const sidebar = document.getElementById('aiOutfitSidebar');
        if (sidebar) sidebar.style.display = 'flex';
    };

    proto.setAiSeasonTab = function (season) {
        document.querySelectorAll('.ai-season-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.season === season);
        });
    };

    proto.initAiOutfitListeners = function () {
        // Gender tabs
        document.querySelectorAll('.ai-gender-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.ai-gender-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.aiOutfitState.gender = e.target.dataset.gender;
                this.loadAiOutfitGrid();
            });
        });

        // Season tabs
        document.querySelectorAll('.ai-season-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.ai-season-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.aiOutfitState.season = e.target.dataset.season;
                this.loadAiOutfitGrid();
            });
        });

        // Category filters
        document.querySelectorAll('.ai-category-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                document.querySelectorAll('.ai-category-filter').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                this.aiOutfitState.category = e.target.dataset.category;
                this.loadAiOutfitGrid();
            });
        });

        // Try On button
        const tryOnBtn = document.getElementById('aiTryOnSelectedBtn');
        if (tryOnBtn) {
            tryOnBtn.addEventListener('click', () => this.handleAiTryOn());
        }
    };

    proto.loadAiOutfitGrid = async function () {
        const grid = document.getElementById('aiOutfitGrid');
        if (!grid) return;

        const { gender, category } = this.aiOutfitState;
        // Map gender to correct folder name ('woman' -> 'woman', 'men' -> 'man')
        const folderName = gender === 'men' ? 'man' : gender;
        const folderPath = `assets/${folderName}/${category}/`;

        grid.innerHTML = '<div class="loading-message">Loading recommended outfits...</div>';

        try {
            const outfits = await this.scanFolder(folderPath);
            
            if (outfits.length > 0) {
                // Shuffle for variety
                const shuffled = outfits.sort(() => 0.5 - Math.random()).slice(0, 12);
                
                // Determine which outfits are "AI Recommended" based on color analysis
                const recommendedIndices = getAiRecommendedIndices(this.lastAnalysis, shuffled.length);
                
                // Sort: AI recommended outfits first, then others
                const sortedOutfits = shuffled.map((o, idx) => ({
                    ...o,
                    isRecommended: recommendedIndices.includes(idx),
                    originalIndex: idx
                })).sort((a, b) => {
                    // Recommended items come first
                    if (a.isRecommended && !b.isRecommended) return -1;
                    if (!a.isRecommended && b.isRecommended) return 1;
                    return 0;
                });
                
                // Render outfits
                grid.innerHTML = sortedOutfits.map((o) => {
                    const recommendedClass = o.isRecommended ? 'ai-recommended' : '';
                    return `
                        <div class="ai-outfit-option ${recommendedClass}" data-url="${o.url}" onclick="photoboothApp.selectAiOutfit('${o.url}', this)">
                            <img src="${o.url}" alt="${o.filename}">
                        </div>
                    `;
                }).join('');
                
                // Auto-select the first AI recommended outfit
                const firstRecommended = sortedOutfits.find(o => o.isRecommended);
                if (firstRecommended) {
                    const firstEl = grid.querySelector('.ai-recommended');
                    if (firstEl) {
                        setTimeout(() => this.selectAiOutfit(firstRecommended.url, firstEl), 50);
                    }
                }
            } else {
                grid.innerHTML = '<div class="loading-message">No outfits available.</div>';
            }
        } catch (err) {
            console.error('Error loading AI outfits:', err);
            grid.innerHTML = '<div class="error-message">Error loading outfits.</div>';
        }
    };

    proto.selectAiOutfit = function (url, element) {
        document.querySelectorAll('.ai-outfit-option').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.aiOutfitState.selectedOutfitUrl = url;
        this.selectedOutfitUrl = url; // For compatibility with generatePhoto
        
        const tryOnBtn = document.getElementById('aiTryOnSelectedBtn');
        if (tryOnBtn) {
            tryOnBtn.disabled = false;
            // Highlight if it's an AI recommended item
            if (element.classList.contains('ai-recommended')) {
                tryOnBtn.innerHTML = '<span>✨ Try On (AI Pick)</span>';
            } else {
                tryOnBtn.innerHTML = '<span>Try On</span>';
            }
        }
    };

    proto.handleAiTryOn = async function () {
        if (!this.capturedBlob || !this.aiOutfitState.selectedOutfitUrl) return;

        // Hide sidebar and show loading
        const sidebar = document.getElementById('aiOutfitSidebar');
        if (sidebar) sidebar.style.display = 'none';

        // Use the standard generatePhoto flow
        this.selectedOutfitUrl = this.aiOutfitState.selectedOutfitUrl;
        await this.generatePhoto();
    };

    // ── Hand-off to try-on ────────────────────────────────────────────────
    proto.handoffToTryOn = function () {
        this.showAiOutfitSelection();
    };

    // ── Wire stepAi buttons ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        document
            .getElementById('aiHomeBtn')
            ?.addEventListener('click', () => window.photoboothApp?.returnToLanding());
        document
            .getElementById('aiRetakeBtn')
            ?.addEventListener('click', () => {
                const app = window.photoboothApp;
                if (!app) return;
                app.returnToLanding();
                setTimeout(() => app.showApp('ai'), 50);
            });
        document
            .getElementById('aiTryOnBtn')
            ?.addEventListener('click', () => window.photoboothApp?.handoffToTryOn());
    });

    // ── HTML escaping helpers ─────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function escapeAttr(str) {
        return escapeHtml(str);
    }
})();
