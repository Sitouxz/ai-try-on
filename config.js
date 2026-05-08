// Photobooth Configuration — static deployment, all values set here.
window.PHOTOBOOTH_CONFIG = {
    // n8n webhook URL for manual try-on outfit swap
    N8N_WEBHOOK_URL: 'https://fxaitools.app.n8n.cloud/webhook/generate-outfit',

    // ElevenLabs Conversational AI — set ELEVENLABS_INTERACTIVE: true to enable
    // Agent must have "capture_photo" and "get_app_state" Client Tools configured in the dashboard.
    ELEVENLABS_AGENT_ID: 'agent_0601kr0hj8xsf278j9xc3m0g0zde',
    ELEVENLABS_INTERACTIVE: true,

    // Google Gemini — color analysis
    GEMINI_API_KEY: 'AIzaSyDNPLLMue07muX24bij41MLuwWMblabqQI',
    GEMINI_MODEL: 'gemini-2.5-flash',
};

window.PHOTOBOOTH_CONFIG_READY = Promise.resolve();
