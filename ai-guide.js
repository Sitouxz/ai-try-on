// AI Guide — color analysis flow + ElevenLabs active voice guide.
// Augments the PhotoboothApp class (see script.js) with the methods required for
// the "Let AI Guide You" mode: sends the captured photo to /api/analyze, renders
// the resulting palette + outfit + accessory recommendations, and drives an
// ElevenLabs Conversational AI session that speaks proactively at every step.

(function () {
    if (typeof PhotoboothApp === 'undefined') {
        console.error('[ai-guide] PhotoboothApp not found — script.js must load first.');
        return;
    }

    const proto = PhotoboothApp.prototype;

    // ════════════════════════════════════════════════════════════════════════
    // ElevenLabs Active Voice Guide
    // Uses @11labs/client SDK to start a new conversation session at each step,
    // making the agent speak proactively with a custom firstMessage for that step.
    // ════════════════════════════════════════════════════════════════════════
    class ElevenLabsGuide {
        constructor(agentId) {
            this.agentId = agentId;
            this.conversation = null;
            this._ending = false;   // guard against overlapping end/start
            this._pendingStep = null;
            this._disconnectResolve = null;
            this._loadSdk();
        }

        // ── Step messages ──────────────────────────────────────────────────
        static MESSAGES = {
            landing: `Hi there! Welcome to the AI Color Stylist photobooth. \
I'll guide you through a quick color analysis and help you find outfits that flatter you perfectly. \
When you're ready, tap the "Let AI Guide You" button to begin!`,
            camera: `Great! Let's take your photo. Stand in the center of the frame, \
look straight at the camera, and press the capture button when you're ready.`,
            analyzing: `Perfect shot! Now I'm analyzing your skin tone, undertone, and contrast. \
This will just take a few seconds — hang tight!`,
            results: null,           // built dynamically with real analysis data
            aiOutfit: `Based on your color analysis, I've curated outfits that will look amazing on you! \
You can adjust your skin tone and browse different seasonal palettes. \
Select an outfit you like and tap Try On to see how it looks.`,
            tryOn: `Now let's find an outfit that matches your palette! \
Browse the options on the left, tap one to select it, then press Try On.`,
            result: `Amazing! Here's your virtual try-on result. \
You can download it, try another outfit, or start over. Enjoy your new look!`,
            goodbye: `Thanks for using the AI Color Stylist! \
Feel free to come back anytime for a new color analysis. See you soon!`,
        };

        static buildResultsMessage(analysis) {
            const season = analysis?.season || 'your season';
            const undertone = analysis?.undertone || '';
            const top3 = (analysis?.palette || [])
                .slice(0, 3)
                .map((c) => c.name)
                .join(', ');
            return `Your results are ready! You have a ${season} palette${undertone ? ` with a ${undertone} undertone` : ''}. \
${top3 ? `Your top flattering colors are ${top3}.` : ''} \
Scroll down to see your full palette, outfit ideas, and accessories. \
You can ask me anything about your results!`;
        }

        // ── SDK loading (ESM via esm.sh — no UMD build exists for @11labs/client) ─
        _loadSdk() {
            if (this._sdkReady) return this._sdkReady;
            this._sdkReady = import('https://esm.sh/@11labs/client')
                .then((mod) => {
                    this._ConversationClass = mod.Conversation;
                    console.info('[ai-guide] @11labs/client loaded.');
                })
                .catch((err) => {
                    console.warn('[ai-guide] Failed to load @11labs/client:', err);
                });
            return this._sdkReady;
        }

        async _getConversationClass() {
            await this._loadSdk();
            return this._ConversationClass || null;
        }

        // ── Session control ────────────────────────────────────────────────
        async speakForStep(step, analysis = null) {
            // If still tearing down the previous session, queue this step and return.
            if (this._ending) {
                this._pendingStep = { step, analysis };
                return;
            }

            await this._endCurrent();

            let firstMessage =
                step === 'results'
                    ? ElevenLabsGuide.buildResultsMessage(analysis)
                    : ElevenLabsGuide.MESSAGES[step];

            if (!firstMessage) return;

            this._currentSide = 'right';
            this._currentStep = step;
            await this._startSession(firstMessage);
        }

        get _interactive() {
            return window.PHOTOBOOTH_CONFIG?.ELEVENLABS_INTERACTIVE !== false;
        }

        async _requestMic() {
            if (!this._interactive) return null;
            if (this._micStream) return this._micStream;
            try {
                this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.info('[ai-guide] Microphone granted.');
            } catch (err) {
                console.warn('[ai-guide] Microphone denied — voice agent will be muted:', err);
                this._micStream = null;
            }
            return this._micStream;
        }

        async _startSession(firstMessage) {
            const Conversation = await this._getConversationClass();
            if (!Conversation) {
                console.warn('[ai-guide] ElevenLabs SDK unavailable — check network/CSP.');
                return;
            }
            await this._requestMic();
            console.info('[ai-guide] Starting session for agent:', this.agentId, '| interactive:', this._interactive, '| firstMessage:', firstMessage?.slice(0, 60));
            try {
                this._setStatus('connecting');
                this._sessionStartedAt = Date.now();
                this._serverRejected = false;
                const sessionOverrides = this._interactive
                    ? { agent: { firstMessage } }
                    : {
                        agent: { firstMessage },
                        tts: {},
                        agent_input: {
                            user_input_audio_format: 'pcm_16000',
                        },
                        turn: {
                            turn_timeout: 0,
                            silence_end_call_timeout: 0,
                            mode: 'manual',
                        },
                    };
                this.conversation = await Conversation.startSession({
                    agentId: this.agentId,
                    overrides: sessionOverrides,
                    onStatusChange: ({ status }) => {
                        this._setStatus(status);
                        if (status === 'connected') {
                            this._showAvatar(this._currentSide || 'right');
                            if (!this._interactive) {
                                try { this.conversation.setInputVolume(0); } catch {}
                            }
                        }
                    },
                    onModeChange: ({ mode }) => {
                        this._setMode(mode);
                        const speaking = mode === 'speaking';
                        this._setAvatarSpeaking(speaking);
                        if (speaking) {
                            this._showDialog(this._currentStep);
                            this._setDialogSpeaking(true);
                        } else {
                            this._setDialogSpeaking(false);
                            this._hideDialog();
                            // In non-interactive mode, end session once AI finishes speaking.
                            if (!this._interactive) {
                                setTimeout(() => this._endCurrent(), 800);
                            }
                        }
                    },
                    onError: (msg, ctx) => {
                        console.warn('[ai-guide] ElevenLabs error:', msg, ctx);
                        this._setStatus('error');
                        this._hideAvatar();
                        this._hideDialog();
                    },
                    onDisconnect: () => {
                        const sessionAge = Date.now() - (this._sessionStartedAt || 0);
                        if (sessionAge < 2000) {
                            console.warn('[ai-guide] Session rejected by server within', sessionAge, 'ms — check agent ID and "Allow overriding first message" setting in ElevenLabs dashboard.');
                            this._serverRejected = true;
                        }
                        this._setStatus('disconnected');
                        this._hideAvatar();
                        this._hideDialog();
                        this.conversation = null;
                        if (this._disconnectResolve) {
                            this._disconnectResolve();
                            this._disconnectResolve = null;
                        }
                    },
                });
            } catch (err) {
                console.warn('[ai-guide] Failed to start ElevenLabs session:', err);
                this._setStatus('error');
            }
        }

        async _endCurrent() {
            if (!this.conversation) return;
            // Wait if session is very fresh — audio worklet needs a moment to settle.
            const age = Date.now() - (this._sessionStartedAt || 0);
            if (age < 1200) {
                await new Promise(r => setTimeout(r, 1200 - age));
            }
            // If already gone by now (e.g. server closed it), bail early.
            if (!this.conversation) {
                this._ending = false;
                return;
            }
            this._ending = true;
            // Build a promise that resolves when onDisconnect fires.
            const disconnected = new Promise(r => { this._disconnectResolve = r; });
            try {
                await this.conversation.endSession();
            } catch {
                // ignore — socket may already be closed
            }
            // Wait for the WebSocket to fully close (onDisconnect), with a safety timeout.
            await Promise.race([disconnected, new Promise(r => setTimeout(r, 3000))]);
            this.conversation = null;
            this._disconnectResolve = null;
            this._ending = false;
            this._setStatus('idle');
            this._hideAvatar();
            this._hideDialog();

            // Flush any step that was queued while we were ending.
            // Skip if the server rejected us (bad agent ID / config) to avoid loops.
            if (this._pendingStep && !this._serverRejected) {
                const { step, analysis } = this._pendingStep;
                this._pendingStep = null;
                await this.speakForStep(step, analysis);
            } else {
                this._pendingStep = null;
            }
        }

        // ── Speech dialog ──────────────────────────────────────────────────
        static DIALOG_CONTENT = {
            landing:   { title: 'Welcome!',        body: 'I\'ll guide you through a color analysis and help you find flattering outfits. Tap "Let AI Guide You" to start!' },
            camera:    { title: 'Take Your Photo', body: 'Stand in the center of the frame, look at the camera, and press the capture button.' },
            analyzing: { title: 'Analyzing…',      body: 'Analyzing your skin tone, undertone, and contrast — just a moment!' },
            results:   { title: 'Your Results!',   body: 'Here\'s your personal color analysis. Scroll to explore your palette, outfit ideas, and accessories.' },
            aiOutfit:  { title: 'Pick Your Outfit', body: 'Based on your color analysis, I\'ve found outfits that will look amazing on you! Select your skin tone, browse by season, and tap an outfit to try it on.' },
            tryOn:     { title: 'Try It On!',      body: 'Browse the outfit catalog on the left, tap one to select it, then press Try On.' },
            result:    { title: 'Looking Great!',  body: 'Here\'s your virtual try-on! Download it, try another outfit, or start over.' },
            goodbye:   { title: 'See You Soon!',   body: 'Thanks for using the AI Color Stylist. Come back anytime!' },
        };

        _showDialog(step) {
            const el = document.getElementById('aiSpeechDialog');
            const titleEl = document.getElementById('aiSpeechTitle');
            const bodyEl  = document.getElementById('aiSpeechBody');
            if (!el) return;

            const content = ElevenLabsGuide.DIALOG_CONTENT[step] || { title: 'AI Guide', body: '' };
            if (titleEl) titleEl.textContent = content.title;
            if (bodyEl)  bodyEl.textContent  = content.body;

            el.style.display = 'block';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('dialog-visible'));
            });

            // Wire OK button to close.
            const ok = document.getElementById('aiSpeechOk');
            if (ok) {
                ok.onclick = () => this._hideDialog();
            }
        }

        _hideDialog() {
            const el = document.getElementById('aiSpeechDialog');
            if (!el) return;
            el.classList.remove('dialog-visible', 'dialog-speaking');
            el.addEventListener('transitionend', () => {
                if (!el.classList.contains('dialog-visible')) el.style.display = 'none';
            }, { once: true });
        }

        _setDialogSpeaking(speaking) {
            document.getElementById('aiSpeechDialog')?.classList.toggle('dialog-speaking', speaking);
        }

        // ── Avatar control ─────────────────────────────────────────────────
        _showAvatar(side) {
            const el = document.getElementById('aiAvatarContainer');
            if (!el) return;
            // Apply side class before making visible so there's no flash.
            el.classList.remove('side-left', 'side-right');
            el.classList.add(side === 'left' ? 'side-left' : 'side-right');
            // Small rAF so the browser registers the class before transitioning.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('avatar-visible'));
            });
        }

        _hideAvatar() {
            const el = document.getElementById('aiAvatarContainer');
            if (!el) return;
            el.classList.remove('avatar-visible', 'avatar-speaking');
        }

        _setAvatarSpeaking(speaking) {
            document.getElementById('aiAvatarContainer')?.classList.toggle('avatar-speaking', speaking);
        }

        _setStatus(status) {
            console.info('[ai-guide] status:', status);
        }

        _setMode(mode) {
            console.info('[ai-guide] mode:', mode);
        }

        // ── Avatar control ─────────────────────────────────────────────────
        _showAvatar(side) {
            const el = document.getElementById('aiAvatarContainer');
            if (!el) return;
            el.classList.remove('side-left', 'side-right');
            el.classList.add(side === 'left' ? 'side-left' : 'side-right');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('avatar-visible'));
            });
        }

        _hideAvatar() {
            const el = document.getElementById('aiAvatarContainer');
            if (!el) return;
            el.classList.remove('avatar-visible', 'avatar-speaking');
        }

        _setAvatarSpeaking(speaking) {
            document.getElementById('aiAvatarContainer')?.classList.toggle('avatar-speaking', speaking);
        }
    } // end class ElevenLabsGuide

    // ── Singleton ──────────────────────────────────────────────────────────
    let guide = null;

    function getGuide() {
        const agentId = window.PHOTOBOOTH_CONFIG?.ELEVENLABS_AGENT_ID;
        if (!agentId) return null;
        if (!guide) guide = new ElevenLabsGuide(agentId);
        return guide;
    }

    // ── Wrap app lifecycle methods to inject voice guidance ───────────────
    const _origShowApp = proto.showApp;
    proto.showApp = function (mode) {
        _origShowApp.call(this, mode);
        if (mode === 'ai') {
            setTimeout(() => getGuide()?.speakForStep('camera'), 1800);
        }
    };

    const _origReturnToLanding = proto.returnToLanding;
    proto.returnToLanding = function () {
        _origReturnToLanding.call(this);
        getGuide()?._endCurrent();
    };

    const _origShowResult = proto.showResult;
    proto.showResult = function (imageUrl) {
        _origShowResult.call(this, imageUrl);
        getGuide()?.speakForStep('result');
    };

    // ── AI analysis flow ──────────────────────────────────────────────────
    proto.startAiAnalysis = async function () {
        const overlay = document.getElementById('loadingOverlay');
        const overlayText = overlay?.querySelector('.loading-text');
        if (overlay) overlay.style.display = 'flex';
        if (overlayText) overlayText.textContent = 'Analyzing your colors…';

        // Speak "analyzing" step.
        getGuide()?.speakForStep('analyzing');

        try {
            const base64 = await this._dataUrlToBase64(this.capturedDataUrl);
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Analysis failed (${res.status}): ${errText}`);
            }
            const { analysis } = await res.json();
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

        // Speak results step — after a short delay so the analyzing session has time to end.
        setTimeout(() => getGuide()?.speakForStep('results', analysis), 800);
    };

    proto.showAiError = function (message) {
        const stepAi = document.getElementById('stepAi');
        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'none';
        if (!stepAi) return;
        stepAi.style.display = 'block';
        stepAi.innerHTML = `
            <h2 class="camera-page-title">Color Analysis</h2>
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

        getGuide()?.speakForStep('aiOutfit');
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

        // Initialise guide after config is ready (pre-loads SDK + requests mic early).
        const init = () => { getGuide(); };
        if (window.PHOTOBOOTH_CONFIG_READY) {
            window.PHOTOBOOTH_CONFIG_READY.then(init);
        } else {
            init();
        }
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
