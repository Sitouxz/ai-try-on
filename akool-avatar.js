// Akool Streaming Avatar — live WebRTC video avatar powered by the Akool SDK (Agora-backed).
// Handles session lifecycle, video rendering, captions, and chat bar.
// ai-guide.js calls window.akoolAvatar.speak(prompt) to instruct the avatar to talk.

(function () {
    'use strict';

    // ── Config (resolved from window.PHOTOBOOTH_CONFIG) ──────────────────────
    let _akoolEnabled = false;
    let _akoolVoiceId = '';
    let _akoolClientId = '';
    let _akoolClientSecret = '';
    let _akoolAvatarId = '';
    let _akoolSessionDuration = 600;

    // ── Akool token cache ─────────────────────────────────────────────────────
    const AKOOL_BASE = 'https://openapi.akool.com';
    let _akoolToken = null;
    let _akoolTokenExp = 0;

    async function getAkoolToken() {
        if (_akoolToken && Date.now() < _akoolTokenExp) return _akoolToken;
        const res = await fetch(`${AKOOL_BASE}/api/open/v3/getToken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: _akoolClientId, clientSecret: _akoolClientSecret }),
        });
        if (!res.ok) throw new Error(`Akool getToken failed: ${res.status}`);
        const json = await res.json();
        if (!json.token) throw new Error(`Akool getToken no token: ${JSON.stringify(json)}`);
        _akoolToken = json.token;
        _akoolTokenExp = Date.now() + 55 * 60 * 1000;
        return _akoolToken;
    }

    async function akoolRequest(path, method, body) {
        const token = await getAkoolToken();
        const res = await fetch(`${AKOOL_BASE}${path}`, {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Akool ${path} => ${res.status}: ${text}`);
        }
        return res.json();
    }

    // ── Session state ─────────────────────────────────────────────────────────
    let _sdk = null;
    let _sessionId = null;

    let _preloading = false;     // background connect in progress
    let _sessionActive = false;  // channel joined, video streaming to canvas
    let _showWhenReady = false;  // reveal container as soon as video fires
    let _running = false;        // container visible to user

    let _micEnabled = false;
    let _micMuted = false;

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const container = () => document.getElementById('aiAvatarContainer');

    // ── White-screen chroma key ───────────────────────────────────────────────
    let _ckActive = false;
    let _ckRaf = null;
    let _ckSink = null;

    function startChromaKey(videoContainer) {
        if (_ckActive) return;
        let tries = 0;
        const findVideo = () => {
            const videoEl = videoContainer.querySelector('video');
            if (!videoEl) {
                if (tries++ < 40) setTimeout(findVideo, 100);
                return;
            }

            _ckSink = document.createElement('div');
            _ckSink.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:320px;height:320px;opacity:0;pointer-events:none;';
            document.body.appendChild(_ckSink);
            _ckSink.appendChild(videoEl);
            videoContainer.style.display = 'none';

            const wrap = videoContainer.parentElement;
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100%;height:auto;display:block;background:transparent;';
            wrap.appendChild(canvas);

            _ckActive = true;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const THRESHOLD = 190;
            const CEIL      = 245;
            const SAT_MAX   = 22;

            const tick = () => {
                if (!_ckActive) return;
                if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
                    if (canvas.width !== videoEl.videoWidth) {
                        canvas.width  = videoEl.videoWidth;
                        canvas.height = videoEl.videoHeight;
                    }
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(videoEl, 0, 0);
                    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = img.data;
                    for (let i = 0; i < d.length; i += 4) {
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        const brightness = (r + g + b) / 3;
                        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                        if (brightness > THRESHOLD && saturation < SAT_MAX) {
                            const alpha = Math.max(0, 1 - (brightness - THRESHOLD) / (CEIL - THRESHOLD));
                            d[i + 3] = Math.round(alpha * 255);
                            if (alpha < 1) {
                                d[i]     = Math.round(d[i]     * alpha);
                                d[i + 1] = Math.round(d[i + 1] * alpha);
                                d[i + 2] = Math.round(d[i + 2] * alpha);
                            }
                        }
                    }
                    ctx.putImageData(img, 0, 0);
                }
                _ckRaf = requestAnimationFrame(tick);
            };
            tick();
        };
        findVideo();
    }

    function stopChromaKey() {
        _ckActive = false;
        if (_ckRaf) { cancelAnimationFrame(_ckRaf); _ckRaf = null; }
        if (_ckSink) { _ckSink.remove(); _ckSink = null; }
        const vc = document.getElementById('akoolRemoteVideo');
        if (vc) vc.style.display = '';
    }

    // ── Status badge helper ───────────────────────────────────────────────────
    function setStatus(text, cls) {
        const el = $('akoolStatusBadge');
        if (!el) return;
        el.textContent = text;
        el.className = 'akool-status-badge' + (cls ? ' ' + cls : '');
    }

    // ── Caption card helpers ──────────────────────────────────────────────────
    function showCaption(text) {
        const body = $('akoolCaptionBody');
        const card = $('akoolCaption');
        if (body) body.textContent = text;
        if (card) requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('caption-visible')));
    }

    function hideCaption() {
        $('akoolCaption')?.classList.remove('caption-visible');
    }

    function addMessage(text, role) {
        if (role !== 'bot') return;
        showCaption(text);
    }

    function updateLastBotMessage(text) {
        const body = $('akoolCaptionBody');
        if (body) body.textContent = text;
    }

    // ── Fallback avatar visibility ────────────────────────────────────────────
    function showFallback(show) {
        const fb = document.querySelector('.akool-avatar-fallback');
        if (fb) fb.style.display = show ? 'block' : 'none';
    }

    // ── Container show/hide ───────────────────────────────────────────────────
    function showContainer(side = 'right') {
        const c = container();
        if (!c) return;
        c.classList.remove('side-left', 'side-right');
        c.classList.add(side === 'left' ? 'side-left' : 'side-right');
        requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('avatar-visible')));
    }

    function revealLive() {
        showFallback(false);
        const c = container();
        if (!c) return;
        c.classList.remove('akool-connecting');
        c.classList.add('akool-live', 'avatar-visible');
        _running = true;
        updateControlState(true);
        setStatus('Live', 'akool-status-live');
        setTimeout(enableMic, 500);
    }

    // ── Core connect (shared by preload + startSession) ───────────────────────
    async function _doConnect() {
        const SdkClass = window.AkoolStreamingAvatar?.GenericAgoraSDK;
        if (!SdkClass) throw new Error('SDK not loaded');

        const body = await akoolRequest('/api/open/v4/liveAvatar/session/create', 'POST', {
            avatar_id: _akoolAvatarId,
            voice_id:  _akoolVoiceId,
            duration:  _akoolSessionDuration,
        });

        _sessionId = body.data?._id || body.data?.id;
        const creds = body.data?.credentials;
        if (!creds) throw new Error('No credentials in session response.');

        _sdk = new SdkClass({ mode: 'rtc', codec: 'vp8' });

        _sdk.on({
            onMessageReceived(msg) {
                if (!msg.isSentByMe) addMessage(msg.text, 'bot');
            },
            onMessageUpdated(msg) {
                if (!msg.isSentByMe) updateLastBotMessage(msg.text);
            },
            async onUserPublished(user, mediaType) {
                const track = await _sdk.getClient().subscribe(user, mediaType);
                if (mediaType === 'video') {
                    track?.play('akoolRemoteVideo');
                    // Chroma key renders to canvas inside the container — works while container is hidden
                    startChromaKey(document.getElementById('akoolRemoteVideo'));
                    _sessionActive = true;
                    console.info('[akool-avatar] Video stream ready (preloaded).');
                    if (_showWhenReady) revealLive();
                } else if (mediaType === 'audio') {
                    track?.play();
                }
            },
            onUserUnpublished(user, mediaType) {
                _sdk?.getClient()?.unsubscribe(user, mediaType).catch(() => {});
            },
            onException(err) {
                console.error('[akool-avatar] SDK exception:', err);
                setStatus('Error', 'akool-status-error');
            },
            onTokenDidExpire() {
                console.warn('[akool-avatar] Token expired — closing session.');
                setStatus('Expired', 'akool-status-error');
                stopSession();
            },
        });

        await _sdk.joinChannel({
            agora_app_id: creds.agora_app_id,
            agora_channel: creds.agora_channel,
            agora_token: creds.agora_token,
            agora_uid: creds.agora_uid,
        });

        console.info('[akool-avatar] Channel joined. id:', _sessionId);
    }

    // ── Preload — called at page load while user is on landing screen ─────────
    async function preloadSession() {
        if (_preloading || _sessionActive || _running) return;
        if (!_akoolEnabled) return;
        if (!window.AkoolStreamingAvatar?.GenericAgoraSDK) return;

        _preloading = true;
        _showWhenReady = false;
        console.info('[akool-avatar] Preloading session in background…');

        try {
            await _doConnect();
        } catch (err) {
            console.warn('[akool-avatar] Preload failed:', err);
            _sdk = null;
            _sessionId = null;
            _sessionActive = false;
        } finally {
            _preloading = false;
        }
    }

    // ── Start (called when user enters AI mode) ───────────────────────────────
    async function startSession() {
        if (_running) return;

        if (!_akoolEnabled) {
            showFallback(true);
            showContainer('right');
            return;
        }

        showContainer('right');

        if (_sessionActive) {
            // Already preloaded — instant reveal
            console.info('[akool-avatar] Session preloaded — revealing instantly.');
            revealLive();
            return;
        }

        if (_preloading) {
            // Still connecting in background — reveal when video fires
            console.info('[akool-avatar] Preload in progress — will reveal when ready.');
            _showWhenReady = true;
            container()?.classList.add('akool-connecting');
            setStatus('Connecting…', 'akool-status-connecting');
            return;
        }

        // Preload wasn't possible (e.g. SDK unavailable at load time) — connect now
        if (!window.AkoolStreamingAvatar?.GenericAgoraSDK) {
            console.warn('[akool-avatar] SDK not loaded — using static avatar fallback.');
            showFallback(true);
            return;
        }

        _showWhenReady = true;
        container()?.classList.add('akool-connecting');
        setStatus('Connecting…', 'akool-status-connecting');
        console.info('[akool-avatar] No preload available — connecting now…');

        try {
            await _doConnect();
        } catch (err) {
            console.error('[akool-avatar] startSession error:', err);
            setStatus('Failed', 'akool-status-error');
            container()?.classList.remove('akool-connecting', 'akool-live', 'avatar-visible');
            showFallback(true);
            _sdk = null;
            _sessionId = null;
            _sessionActive = false;
            _running = false;
        }
    }

    async function stopSession() {
        if (!_running && !_preloading && !_sessionActive) return;

        const wasRunning = _running;
        _running = false;
        _preloading = false;
        _sessionActive = false;
        _showWhenReady = false;
        updateControlState(false);
        setStatus('', '');

        const sdkRef = _sdk;
        const sidRef = _sessionId;
        _sdk = null;
        _sessionId = null;

        try {
            if (sdkRef) await sdkRef.closeStreaming();
        } catch (e) {
            console.warn('[akool-avatar] closeStreaming error:', e);
        }

        if (sidRef) {
            try {
                await akoolRequest('/api/open/v4/liveAvatar/session/close', 'POST', { id: sidRef });
                console.info('[akool-avatar] Session closed. id:', sidRef);
            } catch (e) {
                console.warn('[akool-avatar] session/close error:', e);
            }
        }

        stopChromaKey();
        _micEnabled = false;
        _micMuted = false;
        container()?.classList.remove('akool-live', 'akool-connecting', 'avatar-visible', 'mic-listening');
        hideCaption();
        if (wasRunning) showFallback(true);

        // Preload for next visit
        setTimeout(preloadSession, 1500);
    }

    // ── Control bar state ─────────────────────────────────────────────────────
    function updateControlState(enabled) {
        const mic = $('akoolMicBtn');
        const send = $('akoolSendBtn');
        const input = $('akoolTextInput');
        const interrupt = $('akoolInterruptBtn');
        if (mic) { mic.disabled = !enabled; mic.classList.toggle('mic-active', enabled && _micEnabled); }
        if (send) send.disabled = !enabled;
        if (input) input.disabled = !enabled;
        if (interrupt) interrupt.disabled = !enabled;
    }

    // ── Send text message ─────────────────────────────────────────────────────
    async function sendTextMessage() {
        const input = $('akoolTextInput');
        if (!input || !_sdk || !_running) return;
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        input.value = '';
        try {
            await _sdk.sendMessage(text);
        } catch (e) {
            console.error('[akool-avatar] sendMessage error:', e);
        }
    }

    // ── Enable mic (auto-called after video goes live) ────────────────────────
    async function enableMic() {
        if (!_sdk || !_running || _micEnabled) return;
        try {
            await _sdk.toggleMic();
            _micEnabled = true;
            _micMuted = false;
            setMicUi(true);
            console.info('[akool-avatar] Mic auto-enabled for live interaction.');
        } catch (e) {
            console.error('[akool-avatar] enableMic error:', e);
        }
    }

    // ── Toggle mute ───────────────────────────────────────────────────────────
    async function toggleMic() {
        if (!_sdk || !_running) return;
        try {
            if (!_micEnabled) {
                await _sdk.toggleMic();
                _micEnabled = true;
                _micMuted = false;
            } else {
                await _sdk.toggleMic();
                _micMuted = !_micMuted;
            }
            setMicUi(!_micMuted);
        } catch (e) {
            console.error('[akool-avatar] toggleMic error:', e);
        }
    }

    function setMicUi(listening) {
        const btn = $('akoolMicBtn');
        const floatBtn = $('akoolMicFloat');
        const c = container();
        if (btn) {
            btn.classList.toggle('mic-active', listening);
            btn.title = listening ? 'Mute mic' : 'Unmute mic';
        }
        if (floatBtn) {
            floatBtn.classList.remove('mic-listening', 'mic-muted');
            floatBtn.classList.add(listening ? 'mic-listening' : 'mic-muted');
            floatBtn.title = listening ? 'Mute mic' : 'Unmute mic';
        }
        if (c) c.classList.toggle('mic-listening', listening);
        setStatus(listening ? 'Listening…' : 'Muted', listening ? 'akool-status-mic' : 'akool-status-live');
    }

    // ── Interrupt avatar speech ───────────────────────────────────────────────
    async function interrupt() {
        if (!_sdk || !_running) return;
        try {
            await _sdk.interrupt();
        } catch (e) {
            console.error('[akool-avatar] interrupt error:', e);
        }
    }

    // ── Speak (used by ai-guide.js) ───────────────────────────────────────────
    async function speakToAvatar(text) {
        if (!_sdk || !_running) return;
        try {
            await _sdk.sendMessage(text);
        } catch (e) {
            console.error('[akool-avatar] speakToAvatar error:', e);
        }
    }

    // ── Wire up controls ──────────────────────────────────────────────────────
    function initControls() {
        $('akoolSendBtn')?.addEventListener('click', sendTextMessage);
        $('akoolTextInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendTextMessage();
        });
        $('akoolMicBtn')?.addEventListener('click', toggleMic);
        $('akoolMicFloat')?.addEventListener('click', toggleMic);
        $('akoolInterruptBtn')?.addEventListener('click', interrupt);
        $('akoolCaptionOk')?.addEventListener('click', hideCaption);

        updateControlState(false);
        showFallback(true);
        hideCaption();
    }

    // ── Hook into PhotoboothApp lifecycle ─────────────────────────────────────
    function patchLifecycle() {
        if (typeof PhotoboothApp === 'undefined') return;
        const proto = PhotoboothApp.prototype;

        const _origShowApp = proto.showApp;
        proto.showApp = function (mode) {
            _origShowApp.call(this, mode);
            if (mode === 'ai') {
                // Minimal delay just to let camera/DOM settle; session already preloaded
                setTimeout(startSession, 300);
            }
        };

        const _origReturnToLanding = proto.returnToLanding;
        proto.returnToLanding = function () {
            _origReturnToLanding.call(this);
            stopSession();
        };
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.akoolAvatar = {
        start: startSession,
        stop: stopSession,
        preload: preloadSession,
        send: sendTextMessage,
        speak: speakToAvatar,
        enableMic,
        toggleMic,
        interrupt,
        get running() { return _running; },
        get preloaded() { return _sessionActive; },
        get micEnabled() { return _micEnabled && !_micMuted; },
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        initControls();
        patchLifecycle();

        const applyConfig = () => {
            const cfg = window.PHOTOBOOTH_CONFIG;
            _akoolClientId     = cfg?.AKOOL_CLIENT_ID     || '';
            _akoolClientSecret = cfg?.AKOOL_CLIENT_SECRET || '';
            _akoolAvatarId     = cfg?.AKOOL_AVATAR_ID     || '';
            _akoolVoiceId      = cfg?.AKOOL_VOICE_ID      || cfg?.akoolVoiceId || '';
            _akoolSessionDuration = cfg?.AKOOL_SESSION_DURATION || 600;
            _akoolEnabled = !!(cfg?.akoolEnabled ?? (_akoolClientId && _akoolClientSecret));
            if (!_akoolEnabled) {
                console.info('[akool-avatar] Disabled — using static avatar fallback.');
                return;
            }
            // Kick off background preload immediately after config is ready
            preloadSession();
        };

        if (window.PHOTOBOOTH_CONFIG_READY) {
            window.PHOTOBOOTH_CONFIG_READY.then(applyConfig);
        } else {
            applyConfig();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
