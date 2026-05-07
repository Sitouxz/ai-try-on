// Photobooth Configuration — static deployment, all values set here.
// Edit this file to configure credentials and endpoints.
window.PHOTOBOOTH_CONFIG = {
    // n8n webhook URL for manual try-on outfit swap
    N8N_WEBHOOK_URL: 'https://fxaitools.app.n8n.cloud/webhook/generate-outfit',

    // ElevenLabs Conversational AI
    ELEVENLABS_AGENT_ID: 'agent_2701kr0nn95ne54b5b95y32kea17',
    ELEVENLABS_INTERACTIVE: false,

    // Google Gemini — color analysis (key exposed client-side; restrict to your domain in Google Cloud Console)
    GEMINI_API_KEY: 'AIzaSyDNPLLMue07muX24bij41MLuwWMblabqQI',
    GEMINI_MODEL: 'gemini-2.5-flash',

    // Akool Streaming Avatar
    AKOOL_CLIENT_ID: '0NIe6R2aN0eHPqj90uTMuA==',
    AKOOL_CLIENT_SECRET: 'iDbocjjkomFRK04g9wBm6A7XbdnZZ2sP',
    AKOOL_AVATAR_ID: '8t73BxlZn1SctVieuErZE',
    AKOOL_VOICE_ID: '6889b628662160e2caad5dbc',
    AKOOL_SESSION_DURATION: 600,

    // Derived flags (read by akool-avatar.js)
    get akoolEnabled() {
        return !!(this.AKOOL_CLIENT_ID && this.AKOOL_CLIENT_SECRET);
    },
    get akoolVoiceId() {
        return this.AKOOL_VOICE_ID;
    },
};

window.PHOTOBOOTH_CONFIG_READY = Promise.resolve();
