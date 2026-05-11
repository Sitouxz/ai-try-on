const CFG = window.PHOTOBOOTH_CONFIG;

class PhotoboothApp {
    constructor() {
        // Landing
        this.stepLanding = document.getElementById('stepLanding');
        this.appContainer = document.getElementById('appContainer');
        this.manualTryOnBtn = document.getElementById('manualTryOnBtn');
        this.aiGuideBtn = document.getElementById('aiGuideBtn');

        // Steps
        this.step1 = document.getElementById('step1');
        this.step2 = document.getElementById('step2');
        this.step3 = document.getElementById('step3');
        this.step4 = document.getElementById('step4');

        // Step dots
        this.dot1 = document.getElementById('dot1');
        this.dot2 = document.getElementById('dot2');
        this.dot3 = document.getElementById('dot3');

        // Camera
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraWrapper = document.getElementById('cameraWrapper');
        this.cameraHint = document.getElementById('cameraHint');
        this.cameraAfterControls = document.getElementById('cameraAfterControls');
        this.cameraModeTitle = document.getElementById('cameraModeTitle');
        this.capturedPreview = document.getElementById('capturedPreview');
        this.capturedImg = document.getElementById('capturedImg');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.proceedToOutfitBtn = document.getElementById('proceedToOutfitBtn');
        this.stepIndicator = document.getElementById('stepIndicator');
        this.countdownOverlay = document.getElementById('countdownOverlay');
        this.countdownNumber = document.getElementById('countdownNumber');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.processingImg = document.getElementById('processingImg');
        
        // Sidebar
        this.outfitSidebar = document.getElementById('outfitSidebar');
        this.sidebarOutfitGrid = document.getElementById('sidebarOutfitGrid');
        this.tryOnBtn = document.getElementById('tryOnBtn');
        this.categoryFilters = document.getElementById('categoryFilters');
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadDropzone = document.getElementById('uploadDropzone');
        this.uploadButton = document.getElementById('uploadButton');
        this.uploadInput = document.getElementById('uploadInput');

        // Outfit
        this.outfitGrid = document.getElementById('outfitGrid');
        this.personThumb = document.getElementById('personThumb');
        this.backToCameraBtn = document.getElementById('backToCameraBtn');
        this.generateBtn = document.getElementById('generateBtn');

        // Processing
        this.processingStatus = document.getElementById('processingStatus');

        // Result
        this.resultImage = document.getElementById('resultImage');
        this.homeBtn = document.getElementById('homeBtn');
        this.rechooseBtn = document.getElementById('rechooseBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // QR Modal
        this.qrModal = document.getElementById('qrModal');
        this.qrBackdrop = document.getElementById('qrBackdrop');
        this.closeQrModal = document.getElementById('closeQrModal');
        this.qrCodeContainer = document.getElementById('qrCodeContainer');
        this.directDownloadBtn = document.getElementById('directDownloadBtn');

        // Modal
        this.fullscreenModal = document.getElementById('fullscreenModal');
        this.fullscreenImage = document.getElementById('fullscreenImage');
        this.closeModal = document.getElementById('closeModal');
        this.modalBackdrop = document.getElementById('modalBackdrop');

        // State
        this.capturedBlob = null;
        this.capturedDataUrl = null;
        this.selectedOutfitUrl = null;
        this.cameraStream = null;
        this.currentResultUrl = null;
        this.mode = null;

        this.initEventListeners();
    }

    // ── Landing ──────────────────────────────────────────

    showApp(mode) {
        this.mode = mode;
        if (this.cameraModeTitle) {
            this.cameraModeTitle.textContent = mode === 'ai' ? 'Let AI Guide You' : 'Manual Try-On';
        }
        this.stepLanding.style.display = 'none';
        this.appContainer.classList.remove('app-hidden');
        this.appContainer.classList.add('app-visible');
        this.startCamera();
    }

    returnToLanding() {
        this.stopCamera();
        this.capturedBlob = null;
        this.capturedDataUrl = null;
        this.selectedOutfitUrl = null;
        this.currentResultUrl = null;
        this.mode = null;
        this.appContainer.classList.remove('app-visible');
        this.appContainer.classList.add('app-hidden');
        this.stepLanding.style.display = 'flex';
        // Reset camera UI for next visit
        this.cameraWrapper.style.display = 'block';
        this.capturedPreview.style.display = 'none';
        this.captureBtn.style.display = 'block';
        this.cameraHint.style.display = 'block';
        this.countdownOverlay.style.display = 'none';
        if (this.cameraAfterControls) this.cameraAfterControls.style.display = 'none';
        if (this.retakeBtn) this.retakeBtn.style.display = 'none';
        // Reset all steps including AI results
        const stepAi = document.getElementById('stepAi');
        if (stepAi) stepAi.style.display = 'none';
        [this.step1, this.step2, this.step3, this.step4].forEach(el => {
            if (el) el.style.display = 'none';
        });
        if (this.step1) this.step1.style.display = 'block';
        if (this.outfitSidebar) this.outfitSidebar.style.display = 'none';
    }

    initEventListeners() {
        this.manualTryOnBtn?.addEventListener('click', () => this.showApp('manual'));
        this.aiGuideBtn?.addEventListener('click', () => this.showApp('ai'));

        this.captureBtn?.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn?.addEventListener('click', () => this.retakePhoto());
        this.proceedToOutfitBtn?.addEventListener('click', () => this.goToOutfitSelection());

        this.backToCameraBtn?.addEventListener('click', () => this.goToCamera());
        this.generateBtn?.addEventListener('click', () => this.generatePhoto());
        this.tryOnBtn?.addEventListener('click', () => this.handleTryOn());

        this.homeBtn?.addEventListener('click', () => this.returnToLanding());
        this.rechooseBtn?.addEventListener('click', () => this.rechooseOutfit());
        this.downloadBtn?.addEventListener('click', () => this.downloadResult());

        this.closeModal?.addEventListener('click', () => this.hideFullscreen());
        this.modalBackdrop?.addEventListener('click', () => this.hideFullscreen());
        this.closeQrModal?.addEventListener('click', () => this.hideQrModal());
        this.qrBackdrop?.addEventListener('click', () => this.hideQrModal());
        this.directDownloadBtn?.addEventListener('click', () => this.directDownload());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideFullscreen();
                this.hideQrModal();
            }
        });
        
        // Gender tabs
        document.querySelectorAll('.gender-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleGenderTab(e.target));
        });
        
        // Category filters
        document.querySelectorAll('.category-filter').forEach(filter => {
            filter.addEventListener('click', (e) => this.handleCategoryFilter(e.target));
        });
        
        // Upload functionality
        this.uploadButton?.addEventListener('click', () => this.uploadInput.click());
        this.uploadInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadDropzone?.addEventListener('click', () => this.uploadInput.click());
        this.uploadDropzone?.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadDropzone?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadDropzone?.addEventListener('drop', (e) => this.handleDrop(e));
    }

    // ── Camera ───────────────────────────────────────────────

    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false
            });
            this.cameraVideo.srcObject = this.cameraStream;
        } catch (err) {
            console.error('Camera error:', err);
            this.cameraWrapper.innerHTML = `
                <div class="camera-unavailable">
                    <div>
                        <div class="cam-icon">📷</div>
                        <p>Camera access denied or unavailable.<br>
                        Please allow camera access and reload.</p>
                    </div>
                </div>`;
            this.captureBtn.disabled = true;
        }
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(t => t.stop());
            this.cameraStream = null;
        }
    }

    async capturePhoto() {
        if (!this.cameraStream) return;

        console.log('Capture button clicked, starting countdown...');
        this.captureBtn.style.display = 'none';
        this.cameraHint.style.display = 'none';
        this.countdownOverlay.style.display = 'flex';
        console.log('Countdown overlay display set to flex');

        for (let i = 3; i >= 1; i--) {
            this.countdownNumber.textContent = i;
            console.log('Countdown:', i);
            await this.delay(1000);
        }

        this.countdownOverlay.style.display = 'none';

        const video = this.cameraVideo;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        this.capturedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        this.capturedImg.src = this.capturedDataUrl;

        canvas.toBlob((blob) => { this.capturedBlob = blob; }, 'image/jpeg', 0.92);

        this.stopCamera();
        this.cameraWrapper.style.display = 'none';
        this.capturedPreview.style.display = 'block';
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'block';
        
        // Branch on mode: AI Guide runs color analysis, Manual shows the outfit sidebar.
        if (this.mode === 'ai') {
            this.startAiAnalysis();
        } else {
            this.outfitSidebar.style.display = 'flex';
            this.loadSidebarOutfits();
        }
    }

    retakePhoto() {
        this.capturedBlob = null;
        this.capturedDataUrl = null;
        this.capturedImg.src = '';
        this.selectedOutfitUrl = null;

        this.capturedPreview.style.display = 'none';
        this.cameraWrapper.style.display = 'block';
        this.captureBtn.style.display = 'block';
        this.retakeBtn.style.display = 'none';
        this.cameraHint.style.display = 'block';
        this.countdownOverlay.style.display = 'none';
        this.outfitSidebar.style.display = 'none';
        this.tryOnBtn.disabled = true;
        if (this.cameraAfterControls) this.cameraAfterControls.style.display = 'none';

        this.startCamera();
    }

    // ── Navigation ───────────────────────────────────────────

    goToOutfitSelection() {
        if (!this.capturedBlob) return;
        this.personThumb.src = this.capturedDataUrl;
        this.showStep(2);
        this.loadOutfitAssets();
    }

    goToCamera() {
        this.selectedOutfitUrl = null;
        document.querySelectorAll('.outfit-option').forEach(el => el.classList.remove('selected'));
        this.generateBtn.disabled = true;
        this.showStep(1);

        if (this.capturedBlob) {
            // Already have a photo — show preview, don't restart camera
            this.cameraWrapper.style.display = 'none';
            this.capturedPreview.style.display = 'block';
            this.captureBtn.style.display = 'none';
            if (this.cameraAfterControls) this.cameraAfterControls.style.display = 'flex';
        } else {
            this.cameraWrapper.style.display = 'block';
            this.capturedPreview.style.display = 'none';
            this.captureBtn.style.display = 'block';
            if (this.cameraAfterControls) this.cameraAfterControls.style.display = 'none';
            this.startCamera();
        }
    }

    showStep(num) {
        document.getElementById('stepAi')?.style.setProperty('display', 'none');
        document.getElementById('stepAiOutfit')?.style.setProperty('display', 'none');
        [this.step1, this.step2, this.step3, this.step4].forEach(el => {
            if (el) el.style.display = 'none';
        });
        const el = document.getElementById(`step${num}`);
        if (el) el.style.display = 'block';
        if (this.stepIndicator) {
            this.stepIndicator.style.display = num === 1 ? 'none' : 'flex';
        }
        this.updateStepDots(num);
    }

    updateStepDots(active) {
        [this.dot1, this.dot2, this.dot3].forEach((dot, i) => {
            if (!dot) return;
            const n = i + 1;
            dot.classList.remove('active', 'done');
            if (n < active) dot.classList.add('done');
            else if (n === active) dot.classList.add('active');
        });
    }

    // ── Outfit ───────────────────────────────────────────────

    async loadOutfitAssets() {
        try {
            this.outfitGrid.innerHTML = '<div class="loading-message">Loading outfits...</div>';
            const response = await fetch('assets/outfits.json');
            const outfits = await response.json();

            if (outfits.length > 0) {
                const html = outfits.map(o => `
                    <div class="outfit-option" onclick="photoboothApp.selectOutfit('${o.url}', this)">
                        <img src="${o.url}" alt="${o.filename}">
                        <div class="outfit-name">${o.filename}</div>
                    </div>
                `).join('');
                this.outfitGrid.innerHTML = `<div class="outfit-options">${html}</div>`;
            } else {
                this.outfitGrid.innerHTML = '<div class="error-message">No outfits available.</div>';
            }
        } catch (err) {
            console.error('Error loading outfits:', err);
            this.outfitGrid.innerHTML = '<div class="error-message">Error loading outfits.</div>';
        }
    }

    selectOutfit(url, element) {
        document.querySelectorAll('.outfit-option').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedOutfitUrl = url;
        this.generateBtn.disabled = false;
    }

    // ── Sidebar Outfit Functions ─────────────────────────────

    async loadSidebarOutfits() {
        this.currentGender = 'woman';
        this.currentCategory = 'top';
        await this.fetchAndRenderOutfits();
    }

    async fetchAndRenderOutfits() {
        try {
            if (this.currentGender === 'upload') {
                this.categoryFilters.style.display = 'none';
                this.sidebarOutfitGrid.style.display = 'none';
                this.uploadArea.style.display = 'flex';
                return;
            }
            
            this.categoryFilters.style.display = 'flex';
            this.sidebarOutfitGrid.style.display = 'grid';
            this.uploadArea.style.display = 'none';
            this.sidebarOutfitGrid.innerHTML = '<div class="loading-message">Loading outfits...</div>';

            const folderName = this.currentGender;
            const folderPath = `assets/${folderName}/${this.currentCategory}/`;
            const outfits = await this.loadOutfitsFromFolder(folderPath);
            
            if (outfits.length > 0) {
                this.renderSidebarOutfits(outfits);
            } else {
                this.sidebarOutfitGrid.innerHTML = '<div class="loading-message">No outfits available in this category.</div>';
            }
        } catch (err) {
            console.error('Error loading outfits:', err);
            this.sidebarOutfitGrid.innerHTML = '<div class="error-message">Error loading outfits.</div>';
        }
    }

    async loadOutfitsFromFolder(folderPath) {
        return await this.scanFolder(folderPath);
    }

    async scanFolder(folderPath) {
        const folder = folderPath.replace(/^assets\//, '').replace(/\/$/, '');

        // When served via Express, use the server API (fast, exact)
        if (window.location.protocol !== 'file:') {
            try {
                const res = await fetch(`/api/assets/list?folder=${encodeURIComponent(folder)}`);
                if (res.ok) {
                    const { images } = await res.json();
                    console.log(`[scanFolder] API: ${images.length} images in ${folder}`);
                    return images.map(filename => ({
                        filename,
                        url: `assets/${folder}/${encodeURIComponent(filename)}`,
                    }));
                }
            } catch (err) {
                console.warn('[scanFolder] API failed, falling back to image probe:', err);
            }
        }

        // Fallback: probe via Image load — works from file:// (no CORS restriction on img src)
        const candidates = Array.from({ length: 20 }, (_, i) => `${i + 1}.png`);
        const results = await Promise.all(candidates.map(filename => new Promise(resolve => {
            const img = new Image();
            const url = `assets/${folder}/${encodeURIComponent(filename)}`;
            img.onload  = () => resolve({ filename, url });
            img.onerror = () => resolve(null);
            img.src = url;
        })));
        const outfits = results.filter(Boolean);
        console.log(`[scanFolder] Image probe: ${outfits.length} images in ${folder}`);
        return outfits;
    }

    renderSidebarOutfits(outfits) {
        const html = outfits.map(o => `
            <div class="sidebar-outfit-option" onclick="photoboothApp.selectSidebarOutfit('${o.url}', this)">
                <img src="${o.url}" alt="${o.filename}">
            </div>
        `).join('');
        this.sidebarOutfitGrid.innerHTML = html;
    }

    selectSidebarOutfit(url, element) {
        document.querySelectorAll('.sidebar-outfit-option').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedOutfitUrl = url;
        this.tryOnBtn.disabled = false;
    }

    handleGenderTab(tab) {
        document.querySelectorAll('.gender-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentGender = tab.dataset.gender;
        this.fetchAndRenderOutfits();
    }

    handleCategoryFilter(filter) {
        document.querySelectorAll('.category-filter').forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        this.currentCategory = filter.dataset.category;
        this.fetchAndRenderOutfits();
    }

    // ── Upload Functions ─────────────────────────────────────

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadDropzone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadDropzone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadDropzone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processUploadedFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processUploadedFile(files[0]);
        }
    }

    processUploadedFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            this.selectedOutfitUrl = imageUrl;
            this.tryOnBtn.disabled = false;
            
            this.uploadDropzone.innerHTML = `
                <img src="${imageUrl}" style="max-width: 100%; max-height: 200px; border-radius: 12px; object-fit: contain;">
                <p class="upload-text" style="color: #22c55e; font-weight: 600;">✓ Image uploaded successfully!</p>
                <button class="btn-upload" onclick="photoboothApp.uploadInput.click()">Change Image</button>
            `;
        };
        reader.readAsDataURL(file);
    }

    async handleTryOn() {
        if (!this.capturedBlob || !this.selectedOutfitUrl) return;
        
        // Show loading overlay
        this.loadingOverlay.style.display = 'flex';
        this.outfitSidebar.style.display = 'none';
        this.retakeBtn.style.display = 'none';
        
        await this.generatePhoto();
        
        // Hide loading overlay after generation completes
        this.loadingOverlay.style.display = 'none';
    }

    // ── Generate ─────────────────────────────────────────────

    async generatePhoto() {
        if (!this.capturedBlob || !this.selectedOutfitUrl) return;

        // Hide loading overlay and show processing step with captured photo
        this.loadingOverlay.style.display = 'none';
        this.processingImg.src = this.capturedDataUrl;
        this.showStep(3);

        try {
            // Fetch outfit image as binary blob
            const outfitResponse = await fetch(this.selectedOutfitUrl);
            if (!outfitResponse.ok) throw new Error('Failed to load outfit image');
            const outfitBlob = await outfitResponse.blob();
            const outfitFilename = decodeURIComponent(this.selectedOutfitUrl.split('/').pop());

            // POST both images as multipart binary to n8n
            const formData = new FormData();
            formData.append('personImage', this.capturedBlob, 'photo.jpg');
            formData.append('outfitImage', outfitBlob, outfitFilename || 'outfit.png');

            const postResponse = await fetch(CFG.N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });

            if (!postResponse.ok) throw new Error(`POST error: ${postResponse.status} ${postResponse.statusText}`);

            const executionId = await postResponse.text();
            console.log('POST response (execution ID):', executionId);

            if (!executionId) throw new Error('Empty execution ID from POST response');

            console.log('Execution ID:', executionId);

            // Poll every 60 seconds until status is finished
            const resultUrl = await this.pollForResult(executionId);
            this.stopProcessingAnimation();
            this.showResult(resultUrl);

        } catch (err) {
            console.error('Generation error:', err);
            this.stopProcessingAnimation();
            this.showError(err.message);
        }
    }

    // Poll GET generate-outfit?exid=<id> every 60s until finished
    async pollForResult(executionId) {
        const POLL_INTERVAL_MS = 30 * 1000; // 1 minute

        while (true) {
            await this.delay(POLL_INTERVAL_MS);

            console.log(`Polling for execution ${executionId}...`);
            const response = await fetch(`${CFG.N8N_WEBHOOK_URL}?exid=${executionId}`);

            if (!response.ok) {
                console.warn(`Poll returned ${response.status}, retrying...`);
                continue;
            }

            const data = await response.json();
            console.log('Poll response:', data);

            const status =
                data.status                         ||
                data.Status                         ||
                (Array.isArray(data) && (data[0]?.status || data[0]?.Status));

            const isFinished =
                typeof status === 'string' &&
                ['finish', 'finished', 'completed', 'success', 'done'].includes(status.toLowerCase());

            if (!isFinished) {
                console.log(`Status: "${status}" — waiting...`);
                continue;
            }

            // Extract result image URL
            const url =
                data.imageUrl                                          ||
                data.image_url                                         ||
                data.url                                               ||
                data.result                                            ||
                data.resultUrl                                         ||
                data.result_url                                        ||
                (Array.isArray(data) && (data[0]?.imageUrl || data[0]?.url || data[0]?.result));

            if (!url) throw new Error('No image URL in result: ' + JSON.stringify(data));
            return url;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    startProcessingAnimation() {
        const steps = document.querySelectorAll('.process-step');
        let index = 0;
        steps.forEach(s => s.classList.remove('active'));
        this._animationTimer = null;

        const animate = () => {
            steps.forEach(s => s.classList.remove('active'));
            steps[index % steps.length].classList.add('active');
            index++;
            this._animationTimer = setTimeout(animate, 1800);
        };
        this._animationTimer = setTimeout(animate, 400);
    }

    stopProcessingAnimation() {
        if (this._animationTimer) {
            clearTimeout(this._animationTimer);
            this._animationTimer = null;
        }
    }

    showResult(imageUrl) {
        this.currentResultUrl = imageUrl;
        this.resultImage.src = imageUrl;
        this.showStep(4);
        window.scrollTo(0, 0);
    }

    showError(message) {
        const section = this.step3.querySelector('.processing-section');
        if (section) {
            section.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <div style="font-size:3rem; margin-bottom:16px;">⚠️</div>
                    <p style="color:#f87171; margin-bottom:20px;">${message}</p>
                    <button class="btn btn-ghost" onclick="photoboothApp.goToCamera()">Try Again</button>
                </div>`;
        }
    }

    // ── Actions ──────────────────────────────────────────────

    downloadResult() {
        if (!this.currentResultUrl) return;
        this.showQrModal();
    }
    
    showQrModal() {
        if (!this.currentResultUrl) return;
        
        // Clear previous QR code
        this.qrCodeContainer.innerHTML = '';
        
        // Generate QR code with the image URL
        new QRCode(this.qrCodeContainer, {
            text: this.currentResultUrl,
            width: 256,
            height: 256,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Show modal
        this.qrModal.style.display = 'flex';
    }
    
    hideQrModal() {
        this.qrModal.style.display = 'none';
    }
    
    directDownload() {
        if (!this.currentResultUrl) return;
        const a = document.createElement('a');
        a.href = this.currentResultUrl;
        a.download = `photobooth-${Date.now()}.png`;
        a.click();
        this.hideQrModal();
    }

    rechooseOutfit() {
        // Go back to camera with captured photo to choose different outfit
        this.showStep(1);
        this.capturedPreview.style.display = 'block';
        this.cameraWrapper.style.display = 'none';
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'block';
        this.outfitSidebar.style.display = 'flex';
        this.loadSidebarOutfits();
    }

    hideFullscreen() {
        this.fullscreenModal.style.display = 'none';
    }
}

function requestFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => {});
}

let photoboothApp;
document.addEventListener('DOMContentLoaded', () => {
    photoboothApp = new PhotoboothApp();
    window.photoboothApp = photoboothApp;

    // Try immediately (works if page was opened by a user gesture, e.g. kiosk/autoplay)
    requestFullscreen();

    // Fallback: grab fullscreen on the very first tap/click if the above was blocked
    document.addEventListener('click', function onFirstClick() {
        requestFullscreen();
        document.removeEventListener('click', onFirstClick);
    }, { once: true });
});
