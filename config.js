// Photobooth Configuration
// Defaults are defined here; values from the server (/api/config) take precedence
// at runtime so deployments can override them via .env without editing this file.
window.PHOTOBOOTH_CONFIG = {
    // n8n webhook URL — receives personImage + outfitImage as multipart/form-data.
    // Expected response: JSON with { imageUrl: "..." } or a raw image binary.
    N8N_WEBHOOK_URL: 'https://fxaitools.app.n8n.cloud/webhook/generate-outfit',
    // ElevenLabs Conversational AI agent ID. Empty = voice agent disabled.
    ELEVENLABS_AGENT_ID: '',
    // true = full two-way conversation; false = AI speaks only, mic disabled.
    ELEVENLABS_INTERACTIVE: true,
};

// Hydrate runtime config from the server. Resolves once (or fails silently)
// before the app boots so window.PHOTOBOOTH_CONFIG is the source of truth.
window.PHOTOBOOTH_CONFIG_READY = (async () => {
    try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data === 'object') {
            if (data.n8nWebhookUrl) {
                window.PHOTOBOOTH_CONFIG.N8N_WEBHOOK_URL = data.n8nWebhookUrl;
            }
            if (typeof data.elevenLabsAgentId === 'string') {
                window.PHOTOBOOTH_CONFIG.ELEVENLABS_AGENT_ID = data.elevenLabsAgentId;
            }
            if (typeof data.elevenLabsInteractive === 'boolean') {
                window.PHOTOBOOTH_CONFIG.ELEVENLABS_INTERACTIVE = data.elevenLabsInteractive;
            }
        }
    } catch (err) {
        console.warn('[config] /api/config unreachable, using defaults.', err);
    }
})();
