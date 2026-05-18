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

    // ── Avatar step prompts + triggers ────────────────────────────────────────
    // Each entry: { context, trigger }
    // context → sent via sendContextualUpdate (gives the agent the data/instructions)
    // trigger → sent via sendUserMessage right after, forcing the agent to respond
    const STEP_PROMPTS = {
        en: {
            camera: {
                context: 'The user has just arrived at the AI try-on kiosk. Greet them warmly. Tell them to stand in the center of the frame, look straight at the camera, and press the capture button when they are ready. Do NOT capture the photo yet — wait for the user to press the button or say they are ready.',
                trigger: null,
            },
            analyzing: {
                context: 'The photo has been captured and is now being analyzed to identify the user\'s skin tone, undertone, and contrast so we can find the best outfit that matches their unique skin tone. Tell the user this and ask them to hold on for just a moment.',
                trigger: 'My photo was just taken! What happens now?',
            },
            aiOutfit: {
                context: 'The outfit selection screen is now showing. The outfits highlighted with a special badge are AI picks that best suit the user\'s personal skin tone and color season. Tell the user we have highlighted the outfits that best match their skin tone. They can choose our AI recommendation or freely pick any outfit they like.',
                trigger: 'I can see the outfit selection screen now. Tell me about these recommendations.',
            },
            result: {
                context: 'The virtual try-on result photo is now displayed. Tell the user their look is amazing! Remind them they can download the photo, choose a different outfit, or start a brand new color analysis.',
                trigger: 'My try-on photo is ready! How does it look?',
            },
        },
        id: {
            camera: {
                context: 'Pengguna baru saja tiba di kiosk AI try-on. Sapa mereka dengan hangat dalam Bahasa Indonesia. Minta mereka berdiri di tengah frame, lihat lurus ke kamera, dan tekan tombol capture saat siap. Jangan ambil foto dulu — tunggu pengguna menekan tombol atau mengatakan siap.',
                trigger: null,
            },
            analyzing: {
                context: 'Foto telah diambil dan sedang dianalisis untuk mengidentifikasi warna kulit, undertone, dan kontras pengguna agar bisa menemukan outfit terbaik yang sesuai. Beritahu pengguna dalam Bahasa Indonesia dan minta mereka menunggu sebentar.',
                trigger: 'Foto saya baru saja diambil! Apa yang terjadi sekarang?',
            },
            aiOutfit: {
                context: 'Layar pemilihan outfit sekarang tampil. Outfit yang diberi tanda khusus adalah pilihan AI yang paling cocok dengan warna kulit dan color season pengguna. Beritahu pengguna dalam Bahasa Indonesia bahwa outfit tersebut sudah disoroti sesuai warna kulit mereka. Mereka bisa memilih rekomendasi AI atau outfit lain yang mereka suka.',
                trigger: 'Saya bisa melihat layar pemilihan outfit sekarang. Ceritakan tentang rekomendasi ini.',
            },
            result: {
                context: 'Foto hasil virtual try-on sekarang ditampilkan. Katakan kepada pengguna dalam Bahasa Indonesia bahwa penampilan mereka luar biasa! Ingatkan mereka bisa mengunduh foto, memilih outfit berbeda, atau memulai analisis warna baru.',
                trigger: 'Foto try-on saya sudah siap! Bagaimana penampilannya?',
            },
        },
    };

    function getStepPrompts() {
        const lang = window.I18N?.currentLang || 'en';
        return STEP_PROMPTS[lang] || STEP_PROMPTS.en;
    }

    function buildResultsPrompt(analysis) {
        const lang      = window.I18N?.currentLang || 'en';
        const isId      = lang === 'id';
        const season    = analysis?.season    || (isId ? 'musim unik' : 'a unique season');
        const undertone = analysis?.undertone || '';
        const skinTone  = analysis?.skinTone  || '';
        const contrast  = analysis?.contrast  || '';
        const summary   = analysis?.summary   || '';
        const top3      = (analysis?.palette || []).slice(0, 3).map(c => c.name).join(', ');
        const avoid3    = (analysis?.avoidColors || []).slice(0, 2).map(c => c.name).join(isId ? ' dan ' : ' and ');

        const context = isId ? [
            `Hasil analisis warna sudah siap. Umumkan dengan antusias dalam Bahasa Indonesia.`,
            skinTone  ? `Warna kulit pengguna adalah ${skinTone}.` : '',
            undertone ? `Undertone mereka adalah ${undertone}.` : '',
            `Color season personal mereka adalah ${season}.`,
            contrast  ? `Tingkat kontras mereka adalah ${contrast}.` : '',
            summary   ? `Konteks gaya: ${summary}` : '',
            top3      ? `Warna yang paling cocok untuk mereka adalah ${top3} — sebutkan semua ini.` : '',
            avoid3    ? `Mereka sebaiknya menghindari ${avoid3} karena warna tersebut kurang cocok.` : '',
            `Akhiri dengan meminta mereka klik tombol "Coba Outfit" untuk menjelajahi outfit yang sesuai warna kulit mereka.`,
        ].filter(Boolean).join(' ') : [
            `The color analysis results are ready. Announce them enthusiastically.`,
            skinTone  ? `The user's skin tone is ${skinTone}.` : '',
            undertone ? `Their undertone is ${undertone}.` : '',
            `Their personal color season is ${season}.`,
            contrast  ? `Their contrast level is ${contrast}.` : '',
            summary   ? `Style context: ${summary}` : '',
            top3      ? `Their most flattering colors are ${top3} — mention all of these by name.` : '',
            avoid3    ? `They should avoid ${avoid3} as those tend to wash them out.` : '',
            `End by telling them to click the "Try On an Outfit" button to explore outfits curated for their skin tone.`,
        ].filter(Boolean).join(' ');

        return {
            context,
            trigger: isId ? 'Analisis warna saya selesai! Apa hasilnya?' : 'My color analysis just finished! What are my results?',
        };
    }

    function avatarSpeak(step, analysis = null) {
        // Only speak in AI mode - check the app mode
        const app = window.photoboothApp;
        if (!app || app.mode !== 'ai') return;

        const prompt = step === 'results' ? buildResultsPrompt(analysis) : getStepPrompts()[step];
        if (!prompt) return;
        // speak() queues the prompt if session not yet running; latest wins
        window.elevenLabsAvatar?.speak(prompt.context, prompt.trigger);
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

        // When the agent called capture_photo, its tool-return already narrates the
        // analyzing step.  Only speak here for the button-click path.
        if (!this._agentTriggeredCapture) {
            avatarSpeak('analyzing');
        }
        this._agentTriggeredCapture = false;

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
            avatarSpeak('results', analysis);
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
        // Store analysis for later use
        this.lastAnalysis = analysis;
        
        // Skip the color analysis results screen and go directly to outfit selection
        // with color recommendation dialog shown
        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'none';
        
        // Go directly to AI outfit selection step
        this.showAiOutfitSelection();
        
        // Show color recommendation dialog
        this.showColorRecommendationDialog(analysis);
    };
    
    // Show color recommendation dialog on outfit selection screen
    proto.showColorRecommendationDialog = function (analysis) {
        // Remove any existing dialog
        const existingDialog = document.getElementById('colorRecDialog');
        if (existingDialog) existingDialog.remove();
        
        const i18n = window.I18N;
        const t = i18n ? i18n.t.bind(i18n) : (k) => k;
        
        const dialog = document.createElement('div');
        dialog.id = 'colorRecDialog';
        dialog.className = 'color-rec-dialog';
        dialog.innerHTML = `
            <div class="color-rec-backdrop"></div>
            <div class="color-rec-content">
                <button class="color-rec-close" id="closeColorRec">&times;</button>
                <h3 class="color-rec-title">${t('colorRec.title')}</h3>
                <div class="color-rec-meta">
                    <div class="color-rec-item">
                        <span class="color-rec-label">${t('meta.season')}</span>
                        <span class="color-rec-value">${escapeHtml(analysis.season || '—')}</span>
                    </div>
                    <div class="color-rec-item">
                        <span class="color-rec-label">${t('meta.undertone')}</span>
                        <span class="color-rec-value">${escapeHtml(analysis.undertone || '—')}</span>
                    </div>
                    <div class="color-rec-item">
                        <span class="color-rec-label">${t('meta.contrast')}</span>
                        <span class="color-rec-value">${escapeHtml(analysis.contrast || '—')}</span>
                    </div>
                </div>
                <div class="color-rec-palette">
                    ${(analysis.palette || []).slice(0, 6).map(c => `
                        <div class="color-rec-swatch" style="background: ${escapeAttr(c.hex)}" title="${escapeAttr(c.name || '')}"></div>
                    `).join('')}
                </div>
                <p class="color-rec-summary">${escapeHtml(analysis.summary || '')}</p>
                <button class="btn btn-primary color-rec-btn" id="gotItBtn">${t('colorRec.gotIt')}</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        document.getElementById('closeColorRec')?.addEventListener('click', () => dialog.remove());
        document.getElementById('gotItBtn')?.addEventListener('click', () => dialog.remove());
        document.querySelector('.color-rec-backdrop')?.addEventListener('click', () => dialog.remove());
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
            category: 'top',
            selectedOutfitUrl: null
        };

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

        // Ensure grid/category visible, upload area hidden (default state)
        const grid = document.getElementById('aiOutfitGrid');
        const uploadArea = document.getElementById('aiUploadArea');
        const categoryFilters = document.getElementById('aiCategoryFilters');
        if (grid) grid.style.display = 'grid';
        if (categoryFilters) categoryFilters.style.display = 'flex';
        if (uploadArea) uploadArea.style.display = 'none';

        // Reset upload dropzone content
        const dropzone = document.getElementById('aiUploadDropzone');
        if (dropzone) {
            dropzone.innerHTML = `
                <div class="upload-icon">📁</div>
                <p class="upload-text">Drag & drop your outfit image here</p>
                <p class="upload-or">or</p>
                <button class="btn-upload" id="aiUploadButton">Choose File</button>
                <input type="file" id="aiUploadInput" accept="image/*" style="display:none">`;
        }
    };

    proto.initAiOutfitListeners = function () {
        // Gender tabs
        document.querySelectorAll('.ai-gender-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.ai-gender-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.aiOutfitState.gender = e.target.dataset.gender;
                this.switchAiOutfitMode(e.target.dataset.gender);
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

        // Upload listeners — delegated on stable container so they survive dropzone HTML resets
        const uploadArea = document.getElementById('aiUploadArea');
        const uploadDropzone = document.getElementById('aiUploadDropzone');

        uploadArea?.addEventListener('click', (e) => {
            if (e.target.id === 'aiUploadButton' || e.target === uploadDropzone) {
                document.getElementById('aiUploadInput')?.click();
            }
        });
        uploadArea?.addEventListener('change', (e) => {
            if (e.target.id === 'aiUploadInput') this.handleAiFileSelect(e);
        });
        uploadDropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropzone.classList.add('drag-over');
        });
        uploadDropzone?.addEventListener('dragleave', () => {
            uploadDropzone.classList.remove('drag-over');
        });
        uploadDropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropzone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.processAiUploadedFile(file);
        });
    };

    proto.switchAiOutfitMode = function (gender) {
        const grid = document.getElementById('aiOutfitGrid');
        const uploadArea = document.getElementById('aiUploadArea');
        const categoryFilters = document.getElementById('aiCategoryFilters');

        if (gender === 'upload') {
            if (grid) grid.style.display = 'none';
            if (categoryFilters) categoryFilters.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'flex';
            // Clear any previously selected outfit
            this.aiOutfitState.selectedOutfitUrl = null;
            this.selectedOutfitUrl = null;
            const tryOnBtn = document.getElementById('aiTryOnSelectedBtn');
            if (tryOnBtn) { tryOnBtn.disabled = true; tryOnBtn.innerHTML = '<span>Try On</span>'; }
        } else {
            if (grid) grid.style.display = 'grid';
            if (categoryFilters) categoryFilters.style.display = 'flex';
            if (uploadArea) uploadArea.style.display = 'none';
            this.loadAiOutfitGrid();
        }
    };

    proto.handleAiFileSelect = function (e) {
        const file = e.target.files[0];
        if (file) this.processAiUploadedFile(file);
    };

    proto.processAiUploadedFile = function (file) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            this.aiOutfitState.selectedOutfitUrl = imageUrl;
            this.selectedOutfitUrl = imageUrl;

            const dropzone = document.getElementById('aiUploadDropzone');
            if (dropzone) {
                dropzone.innerHTML = `<img src="${imageUrl}" style="max-width:100%;max-height:200px;border-radius:8px;object-fit:contain;">
                    <p class="upload-or" style="margin-top:8px;font-size:0.8rem;opacity:0.7">Tap to change</p>`;
                dropzone.onclick = () => document.getElementById('aiUploadInput')?.click();
            }

            const tryOnBtn = document.getElementById('aiTryOnSelectedBtn');
            if (tryOnBtn) { tryOnBtn.disabled = false; tryOnBtn.innerHTML = '<span>Try On</span>'; }
        };
        reader.readAsDataURL(file);
    };

    proto.loadAiOutfitGrid = async function () {
        const grid = document.getElementById('aiOutfitGrid');
        if (!grid) return;

        const { gender, category } = this.aiOutfitState;
        const folderPath = `assets/${gender}/${category}/`;

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
        // Show color recommendation dialog if we have analysis data
        if (this.lastAnalysis) {
            this.showColorRecommendationDialog(this.lastAnalysis);
        }
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
