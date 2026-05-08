// ElevenLabs Conversational AI — idle/talk video avatar + voice session
// WebGL chroma-key removes white background from avatar videos.

(function () {
    'use strict';

    let _agentId      = '';
    let _enabled      = false;
    let _Conversation = null;
    let _conversation = null;
    let _running      = false;
    let _starting     = false;
    let _micMuted     = false;
    let _connectTime  = 0;   // timestamp of last onConnect
    let _autoRetries  = 0;   // brief-disconnect retries remaining
    let _pendingSpeak = null; // queued speak text, flushed 2s after connect

    const $ = (id) => document.getElementById(id);
    const container = () => document.getElementById('aiAvatarContainer');

    // ── WebGL white-screen chroma-key ─────────────────────────────────────────
    // Removes near-white pixels: min(r,g,b) > 0.72 → transparent.
    // The light-blue suit has min ≈ 0.59, safely below threshold.
    const VERT_SRC = `
        attribute vec2 a_pos;
        attribute vec2 a_uv;
        varying vec2 v_uv;
        void main() { gl_Position = vec4(a_pos, 0.0, 1.0); v_uv = a_uv; }
    `;
    // Tuning knobs (all in GLSL below):
    //   SAT_MULT 6.0  — higher = better preserve light-colored / near-white clothes
    //   smoothstep lo 0.92  — raise to keep more near-white areas; lower to cut more bg
    //   smoothstep hi 1.0   — leave at 1.0 (pure white = fully removed)
    const FRAG_SRC = `
        precision mediump float;
        uniform sampler2D u_tex;
        varying vec2 v_uv;
        void main() {
            vec4 c = texture2D(u_tex, v_uv);
            float maxC = max(c.r, max(c.g, c.b));
            float minC = min(c.r, min(c.g, c.b));
            float sat = (maxC > 0.001) ? (maxC - minC) / maxC : 0.0;
            float whiteness = maxC * (1.0 - sat * 6.0);
            float a = 1.0 - smoothstep(0.92, 1.0, whiteness);
            gl_FragColor = vec4(c.rgb * a, a);
        }
    `;

    function _compileShader(gl, type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
    }

    function _initGL(canvas) {
        const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true }) ||
                   canvas.getContext('experimental-webgl', { premultipliedAlpha: false, alpha: true });
        if (!gl) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, _compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC));
        gl.attachShader(prog, _compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('[el-avatar] WebGL link failed:', gl.getProgramInfoLog(prog));
            return null;
        }
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        const aPos = gl.getAttribLocation(prog, 'a_pos');
        const aUv  = gl.getAttribLocation(prog, 'a_uv');
        gl.enableVertexAttribArray(aPos);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(aUv,  2, gl.FLOAT, false, 16, 8);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform1i(gl.getUniformLocation(prog, 'u_tex'), 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        return { gl, tex, buf };
    }

    // Right-anchor crop: show right portion of video to fill canvas width.
    // u0/u1 computed so the rightmost cw/ch area of the video is displayed.
    function _coverUVs(vw, vh, cw, ch) {
        // Scale so video height fills canvas height
        const scale = ch / vh;
        const scaledW = vw * scale;
        // Take from right edge of scaled video
        const visU = cw / scaledW;
        const u0 = Math.max(0, 1 - visU);
        const u1 = 1;
        // Full height
        const v0 = 0, v1 = 1;
        return [
            -1, -1,  u0, v1,
             1, -1,  u1, v1,
            -1,  1,  u0, v0,
            -1,  1,  u0, v0,
             1, -1,  u1, v1,
             1,  1,  u1, v0,
        ];
    }

    const _glCtx = {};
    let _ckVideo  = null;
    let _ckCanvas = null;
    let _ckRaf    = null;

    function _ckTick() {
        const v = _ckVideo, c = _ckCanvas;
        if (!v || !c || v.readyState < 2 || v.videoWidth === 0) {
            _ckRaf = requestAnimationFrame(_ckTick);
            return;
        }

        // Canvas pixel buffer = CSS size × devicePixelRatio for crisp HiDPI rendering
        const dpr = window.devicePixelRatio || 1;
        const cssW = c.offsetWidth  || c.clientWidth  || 420;
        const cssH = c.offsetHeight || c.clientHeight || Math.round(window.innerHeight * 0.80);
        const cw = Math.round(cssW * dpr);
        const ch = Math.round(cssH * dpr);

        if (c.width !== cw || c.height !== ch) {
            c.width  = cw;
            c.height = ch;
            if (_glCtx[c.id]) _glCtx[c.id].gl.viewport(0, 0, cw, ch);
        }

        if (!_glCtx[c.id]) {
            const ctx = _initGL(c);
            if (!ctx) { _ckRaf = requestAnimationFrame(_ckTick); return; }
            _glCtx[c.id] = ctx;
            _glCtx[c.id].gl.viewport(0, 0, cw, ch);
        }

        const { gl, tex, buf } = _glCtx[c.id];

        const uvs = _coverUVs(v.videoWidth, v.videoHeight, cw, ch);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
        } catch (_) {
            _ckRaf = requestAnimationFrame(_ckTick);
            return;
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        _ckRaf = requestAnimationFrame(_ckTick);
    }

    function _ckStart() { if (!_ckRaf) _ckTick(); }
    function _ckStop()  { if (_ckRaf) { cancelAnimationFrame(_ckRaf); _ckRaf = null; } }

    // ── Video / canvas switching ──────────────────────────────────────────────
    function setAvatarSpeaking(isSpeaking) {
        const idleV = $('elAvatarIdle'), talkV = $('elAvatarTalk');
        const idleC = $('elCanvasIdle'),  talkC = $('elCanvasTalk');

        if (isSpeaking) {
            idleV?.pause();
            if (idleC) idleC.style.display = 'none';
            talkV?.play().catch(() => {});
            if (talkC) talkC.style.display = 'block';
            _ckVideo  = talkV;
            _ckCanvas = talkC;
        } else {
            talkV?.pause();
            if (talkC) talkC.style.display = 'none';
            idleV?.play().catch(() => {});
            if (idleC) idleC.style.display = 'block';
            _ckVideo  = idleV;
            _ckCanvas = idleC;
        }
        _ckStart();
        container()?.classList.toggle('avatar-speaking', isSpeaking);
    }

    // ── Caption ───────────────────────────────────────────────────────────────
    function showCaption(text) {
        const body = $('elCaptionBody');
        const card = $('elCaption');
        if (body) body.textContent = text;
        if (card) requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('caption-visible')));
    }

    function hideCaption() {
        $('elCaption')?.classList.remove('caption-visible');
    }

    // ── Status badge ──────────────────────────────────────────────────────────
    function setStatus(text, cls) {
        const el = $('elStatusBadge');
        if (!el) return;
        el.textContent = text;
        el.className = 'el-status-badge' + (cls ? ' ' + cls : '');
    }

    // ── Container ─────────────────────────────────────────────────────────────
    function showContainer() {
        const c = container();
        if (!c) return;
        c.classList.remove('side-left');
        c.classList.add('side-right');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            c.classList.add('avatar-visible');
            setAvatarSpeaking(false);
        }));
    }

    function hideContainer() {
        const c = container();
        if (!c) return;
        c.classList.remove('avatar-visible', 'el-live', 'el-connecting', 'avatar-speaking');
        _ckStop();
        $('elAvatarIdle')?.pause();
        $('elAvatarTalk')?.pause();
        hideCaption();
        setStatus('', '');
    }

    // ── Mic UI ────────────────────────────────────────────────────────────────
    function setMicUi(listening) {
        const btn      = $('elMicBtn');
        const floatBtn = $('elMicFloat');
        if (btn) {
            btn.classList.toggle('mic-active', listening);
            btn.title = listening ? 'Mute mic' : 'Unmute mic';
        }
        if (floatBtn) {
            floatBtn.classList.remove('mic-listening', 'mic-muted');
            floatBtn.classList.add(listening ? 'mic-listening' : 'mic-muted');
            floatBtn.title = listening ? 'Mic active — tap to mute' : 'Mic muted — tap to unmute';
        }
        container()?.classList.toggle('mic-listening', listening);
        setStatus(
            listening ? 'Listening…' : 'Muted',
            listening ? 'el-status-mic' : 'el-status-live'
        );
    }

    function updateControlState(enabled) {
        [$('elMicBtn'), $('elInterruptBtn'), $('elMicFloat')].forEach(el => {
            if (el) el.disabled = !enabled;
        });
    }

    // ── Client tools ──────────────────────────────────────────────────────────
    const CLIENT_TOOLS = {
        capture_photo: async () => {
            const app = window.photoboothApp;
            if (!app) return 'App not initialised.';
            if (!app.cameraStream) return 'Camera not ready — please wait a moment.';
            app.capturePhoto();
            return 'Countdown started. Smile!';
        },
        get_app_state: async () => {
            const app = window.photoboothApp;
            return JSON.stringify({
                mode: app?.mode ?? 'unknown',
                cameraReady: !!(app?.cameraStream),
                hasCapturedPhoto: !!(app?.capturedBlob),
            });
        },
    };

    // ── Load ElevenLabs SDK ───────────────────────────────────────────────────
    async function loadSDK() {
        if (_Conversation) return _Conversation;
        try {
            const mod = await import('https://esm.sh/@elevenlabs/client');
            _Conversation = mod.Conversation;
            console.info('[el-avatar] ElevenLabs SDK loaded.');
            return _Conversation;
        } catch (e) {
            console.error('[el-avatar] SDK load failed:', e);
            return null;
        }
    }

    // ── Session lifecycle ─────────────────────────────────────────────────────
    async function startSession() {
        if (_running || _starting) return;
        _starting    = true;
        _connectTime = 0;
        // Allow up to 3 auto-retries on brief disconnect (reset only on manual call)
        if (_autoRetries === 0) _autoRetries = 3;

        showContainer();

        if (!_enabled) {
            _starting = false;
            return;
        }

        container()?.classList.add('el-connecting');
        setStatus('Connecting…', 'el-status-connecting');

        const Conversation = await loadSDK();
        if (!Conversation) {
            setStatus('SDK unavailable', 'el-status-error');
            container()?.classList.remove('el-connecting');
            _starting = false;
            return;
        }

        try {
            _conversation = await Conversation.startSession({
                agentId: _agentId,
                connectionType: 'websocket',
                clientTools: CLIENT_TOOLS,

                onConnect: ({ conversationId }) => {
                    console.info('[el-avatar] Connected. id:', conversationId);
                    _running     = true;
                    _starting    = false;
                    _micMuted    = false;
                    _connectTime = Date.now();
                    container()?.classList.remove('el-connecting');
                    container()?.classList.add('el-live');
                    setStatus('Live', 'el-status-live');
                    updateControlState(true);
                    setTimeout(() => setMicUi(true), 600);
                    // Flush queued speak after 2s — lets ElevenLabs first-message finish first
                    setTimeout(() => {
                        if (_pendingSpeak && _running) {
                            const text = _pendingSpeak;
                            _pendingSpeak = null;
                            speak(text);
                        }
                    }, 2000);
                },

                onDisconnect: () => {
                    const liveDuration = _connectTime ? Date.now() - _connectTime : Infinity;
                    console.info('[el-avatar] Disconnected (live %dms)', liveDuration);
                    _running = false;
                    setAvatarSpeaking(false);
                    updateControlState(false);
                    setMicUi(false);
                    setStatus('', '');
                    container()?.classList.remove('el-live', 'el-connecting');
                    // WebRTC negotiation sometimes fails on first attempt — retry automatically
                    if (liveDuration < 3000 && _autoRetries > 0) {
                        _autoRetries--;
                        console.warn('[el-avatar] Brief disconnect — retrying session (%d left)…', _autoRetries);
                        setTimeout(startSession, 2000);
                    }
                },

                onMessage: ({ source, message }) => {
                    if (source === 'ai') showCaption(message);
                },

                onError: (message, context) => {
                    console.error('[el-avatar] Error:', message, context);
                    setStatus('Error', 'el-status-error');
                },

                onModeChange: ({ mode }) => {
                    const isSpeaking = mode === 'speaking';
                    setAvatarSpeaking(isSpeaking);
                    setStatus(
                        isSpeaking ? 'Speaking…' : 'Listening…',
                        isSpeaking ? 'el-status-live' : 'el-status-mic'
                    );
                },

                onStatusChange: ({ status }) => {
                    console.info('[el-avatar] Status:', status);
                },
            });
        } catch (err) {
            console.error('[el-avatar] startSession failed:', err);
            container()?.classList.remove('el-connecting');
            setStatus('Failed', 'el-status-error');
            _running  = false;
            _starting = false;
            _conversation = null;
        }
    }

    async function stopSession() {
        const conv = _conversation;
        _conversation = null;
        _running      = false;
        _starting     = false;
        _micMuted     = false;
        _autoRetries  = 0;   // prevent auto-restart after deliberate stop
        _pendingSpeak = null;
        setAvatarSpeaking(false);
        hideContainer();
        updateControlState(false);
        try { await conv?.endSession(); } catch (e) { console.warn('[el-avatar] endSession error:', e); }
    }

// ── Speak ─────────────────────────────────────────────────────────────────
    function speak(text) {
        if (!_running || !_conversation) {
            // Queue for delivery once session connects; latest prompt wins
            _pendingSpeak = text;
            return;
        }
        showCaption(text);
        try {
            if (typeof _conversation.sendUserMessage === 'function') {
                _conversation.sendUserMessage(text);
            } else if (typeof _conversation.sendContextualUpdate === 'function') {
                _conversation.sendContextualUpdate(text);
            }
        } catch (e) {
            console.warn('[el-avatar] speak failed:', e);
        }
    }

    // ── Mic toggle ────────────────────────────────────────────────────────────
    async function toggleMic() {
        if (!_conversation || !_running) return;
        _micMuted = !_micMuted;
        try {
            if (typeof _conversation.setMicMuted === 'function') {
                await _conversation.setMicMuted(_micMuted);
            }
        } catch (e) { console.warn('[el-avatar] setMicMuted error:', e); }
        setMicUi(!_micMuted);
    }

    // ── Controls ──────────────────────────────────────────────────────────────
    function initControls() {
        $('elMicBtn')?.addEventListener('click', toggleMic);
        $('elMicFloat')?.addEventListener('click', toggleMic);
        $('elInterruptBtn')?.addEventListener('click', () => {});
        $('elCaptionOk')?.addEventListener('click', hideCaption);
        updateControlState(false);
    }

    // ── Lifecycle patch ───────────────────────────────────────────────────────
    function wireLifecycle() {
        if (typeof PhotoboothApp === 'undefined') return;
        const proto       = PhotoboothApp.prototype;
        const _origShow   = proto.showApp;
        const _origReturn = proto.returnToLanding;

        proto.showApp = function (mode) {
            _origShow.call(this, mode);
            if (mode === 'ai') setTimeout(startSession, 350);
        };

        proto.returnToLanding = function () {
            _origReturn.call(this);
            stopSession();
        };
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.elevenLabsAvatar = {
        start: startSession,
        stop:  stopSession,
        speak,
        toggleMic,
        get running() { return _running; },
    };
    window.startAvatarSession = startSession;

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        initControls();
        wireLifecycle();

        const cfg = window.PHOTOBOOTH_CONFIG;
        _agentId  = cfg?.ELEVENLABS_AGENT_ID || '';
        _enabled  = !!(cfg?.ELEVENLABS_INTERACTIVE !== false && _agentId);

        console.info(_enabled
            ? `[el-avatar] Enabled. Agent: ${_agentId}`
            : '[el-avatar] Disabled — ELEVENLABS_INTERACTIVE is false or ELEVENLABS_AGENT_ID missing.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
