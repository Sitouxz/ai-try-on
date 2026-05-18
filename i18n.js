// Internationalization (i18n) - Language Switcher
// Supports English (en) and Bahasa Indonesia (id)

const I18N = {
    // Translations
    translations: {
        en: {
            'landing.subtitle': 'Select your preferred way to get started',
            'landing.manual': 'Manual Try-On',
            'landing.aiGuide': 'Let AI Guide You',
            'camera.title': 'Manual Try-On',
            'camera.hint': 'Stand within the frame...',
            'camera.countdown': 'Counting down...',
            'tabs.woman': 'WOMAN',
            'tabs.men': 'MEN',
            'tabs.upload': 'UPLOAD',
            'tabs.top': 'TOP',
            'tabs.bottom': 'BOTTOM',
            'upload.dragDrop': 'Drag & drop your outfit image here',
            'upload.or': 'or',
            'upload.chooseFile': 'Choose File',
            'loading.outfits': 'Loading outfits...',
            'loading.aiOutfits': 'Loading recommended outfits...',
            'loading.fitting': 'Fitting your look...',
            'btn.tryOn': 'TRY ON',
            'outfit.title': 'Choose Your Outfit',
            'outfit.subtitle': 'Select an outfit for your AI-generated photo',
            'outfit.yourPhoto': 'Your Photo',
            'btn.retakePhoto': '\u2190 Retake Photo',
            'btn.generate': 'Generate My Photo \u2192',
            'processing.title': 'Manual Try-On',
            'processing.fitting': 'Fitting your look...',
            'aiResults.title': 'Your Color Analysis',
            'aiResults.analysisTitle': 'Your Color Analysis',
            'meta.season': 'Season',
            'meta.undertone': 'Undertone',
            'meta.contrast': 'Contrast',
            'btn.home': '\u2190 Home',
            'btn.retake': 'Retake',
            'btn.tryOnOutfit': 'Try on an outfit \u2192',
            'aiResults.palette': 'Your Color Palette',
            'aiResults.avoid': 'Colors to Avoid',
            'aiResults.outfits': 'Outfit Recommendations',
            'aiResults.accessories': 'Accessory Recommendations',
            'aiGuide.title': 'AI Guide',
            'result.title': 'Manual Try-On',
            'result.ready': 'Your photo is ready!',
            'tooltip.home': 'Back to Home',
            'tooltip.rechoose': 'Re-choose Outfit',
            'tooltip.download': 'Download Photo',
            'qr.title': 'Scan to Download',
            'qr.subtitle': 'Scan this QR code with your mobile device to download your photo',
            'qr.downloadBtn': 'Download Directly',
            'colorRec.title': 'Your Color Analysis',
            'colorRec.gotIt': 'Got it!',
            'error.loadingOutfits': 'Error loading outfits.',
            'error.noOutfits': 'No outfits available.',
            'landing.titleBefore': 'Find Your',
            'landing.titleHighlight': 'Perfect',
            'landing.titleAfter': 'Look',
            'processing.text': 'Processing...',
            'sidebar.outfits': 'Outfits',
            'aiOutfit.tryOn': 'Try On',
            'aiOutfit.yourColorAnalysis': 'Your Color Analysis'
        },
        id: {
            'landing.subtitle': 'Pilih cara Anda untuk memulai',
            'landing.manual': 'Coba Manual',
            'landing.aiGuide': 'Panduan AI',
            'camera.title': 'Coba Manual',
            'camera.hint': 'Berdiri di dalam bingkai...',
            'camera.countdown': 'Menghitung mundur...',
            'tabs.woman': 'WANITA',
            'tabs.men': 'PRIA',
            'tabs.upload': 'UNGGAH',
            'tabs.top': 'ATAS',
            'tabs.bottom': 'BAWAH',
            'upload.dragDrop': 'Seret & lepas gambar outfit Anda di sini',
            'upload.or': 'atau',
            'upload.chooseFile': 'Pilih File',
            'loading.outfits': 'Memuat outfit...',
            'loading.aiOutfits': 'Memuat rekomendasi outfit...',
            'loading.fitting': 'Menyesuaikan penampilan Anda...',
            'btn.tryOn': 'COBA',
            'outfit.title': 'Pilih Outfit Anda',
            'outfit.subtitle': 'Pilih outfit untuk foto AI Anda',
            'outfit.yourPhoto': 'Foto Anda',
            'btn.retakePhoto': '\u2190 Ambil Ulang',
            'btn.generate': 'Generate Foto Saya \u2192',
            'processing.title': 'Manual Try-On',
            'processing.fitting': 'Menyesuaikan penampilan Anda...',
            'aiResults.title': 'Analisis Warna Anda',
            'aiResults.analysisTitle': 'Analisis Warna Anda',
            'meta.season': 'Musim',
            'meta.undertone': 'Undertone',
            'meta.contrast': 'Kontras',
            'btn.home': '\u2190 Beranda',
            'btn.retake': 'Ambil Ulang',
            'btn.tryOnOutfit': 'Coba outfit \u2192',
            'aiResults.palette': 'Palet Warna Anda',
            'aiResults.avoid': 'Warna yang Dihindari',
            'aiResults.outfits': 'Rekomendasi Outfit',
            'aiResults.accessories': 'Rekomendasi Aksesori',
            'aiGuide.title': 'Panduan AI',
            'result.title': 'Coba Manual',
            'result.ready': 'Foto Anda sudah siap!',
            'tooltip.home': 'Kembali ke Beranda',
            'tooltip.rechoose': 'Pilih Ulang Outfit',
            'tooltip.download': 'Unduh Foto',
            'qr.title': 'Pindai untuk Mengunduh',
            'qr.subtitle': 'Pindai kode QR ini dengan perangkat seluler Anda untuk mengunduh foto',
            'qr.downloadBtn': 'Unduh Langsung',
            'colorRec.title': 'Analisis Warna Anda',
            'colorRec.gotIt': 'Mengerti!',
            'error.loadingOutfits': 'Gagal memuat outfit.',
            'error.noOutfits': 'Tidak ada outfit yang tersedia.',
            'landing.titleBefore': 'Temukan',
            'landing.titleHighlight': 'Penampilan Sempurna',
            'landing.titleAfter': 'Anda',
            'processing.text': 'Memproses...',
            'processing.fitting': 'Menyesuaikan penampilan Anda...',
            'sidebar.outfits': 'Outfit',
            'aiOutfit.tryOn': 'Coba',
            'aiOutfit.yourColorAnalysis': 'Analisis Warna Anda'
        }
    },

    currentLang: 'en',

    // Get translation
    t(key) {
        return this.translations[this.currentLang]?.[key] || this.translations.en[key] || key;
    },

    // Set language
    setLang(lang) {
        if (!this.translations[lang]) return;
        this.currentLang = lang;
        this.updateUI();
        
        // Store preference
        localStorage.setItem('photobooth-lang', lang);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    // Update all UI elements with data-i18n attribute
    updateUI() {
        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // For buttons with icons, preserve the icon
                if (el.querySelector('span')) {
                    const spans = el.querySelectorAll('span');
                    spans.forEach(span => {
                        if (!span.hasAttribute('data-i18n')) {
                            // This is likely an icon span, keep it
                        } else {
                            span.textContent = this.t(span.getAttribute('data-i18n'));
                        }
                    });
                    // Update direct text content if no icon
                    if (spans.length === 0 || el.childNodes[0].nodeType === Node.TEXT_NODE) {
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                                node.textContent = translation;
                            }
                        });
                    }
                    // If has data-i18n directly, replace content
                    if (el.hasAttribute('data-i18n') && el.getAttribute('data-i18n') === key) {
                        const icon = el.querySelector('span:first-child');
                        if (icon && !icon.hasAttribute('data-i18n')) {
                            el.innerHTML = '';
                            el.appendChild(icon);
                            el.appendChild(document.createTextNode(' ' + translation));
                        } else {
                            el.textContent = translation;
                        }
                    }
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Update lang attribute on html
        document.documentElement.lang = this.currentLang;

        // Update landing headline (has gradient span — handled separately)
        const titleEl = document.getElementById('landingTitle');
        if (titleEl) {
            const before    = this.t('landing.titleBefore');
            const highlight = this.t('landing.titleHighlight');
            const after     = this.t('landing.titleAfter');
            titleEl.innerHTML = `${before} <span class="p-grad-text">${highlight}</span> ${after}`;
        }
    },

    // Initialize
    init() {
        // Load saved preference or detect from browser
        const saved = localStorage.getItem('photobooth-lang');
        const browserLang = navigator.language?.startsWith('id') ? 'id' : 'en';
        this.setLang(saved || browserLang);

        // Setup language switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.setLang(lang);
                
                // Update active state
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Set initial active state
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
        });
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    I18N.init();
});

// Make available globally
window.I18N = I18N;
