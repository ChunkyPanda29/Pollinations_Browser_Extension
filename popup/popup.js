import { PollinationsAPI } from '../scripts/pollinations_api.js';

let currentMode = 'image';
let api = new PollinationsAPI();
let attachedContextUrl = null; // From Web (Context Menu)
let uploadedFiles = []; // From Local (File Input)
let globalModels = { image: [], text: [], video: [] };
let currentDownloadUrl = null;

// --- CACHE LOGIC ---
async function fetchModelsWithCache(apiInstance) {
    const data = await chrome.storage.local.get(['global_models', 'last_model_fetch']);
    const now = new Date();
    // Logic: Reset cache if it's after Monday 9am UTC
    const dayOfWeek = now.getUTCDay();
    const hours = now.getUTCHours();
    let daysSinceMonday = (dayOfWeek + 6) % 7;
    if (dayOfWeek === 1 && hours < 9) daysSinceMonday = 7;
    const lastMonday9AM = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 9, 0, 0, 0)).getTime();

    if (data.global_models && data.last_model_fetch && data.last_model_fetch > lastMonday9AM) {
        return data.global_models;
    }
    const freshModels = await apiInstance.fetchModels();
    await chrome.storage.local.set({ 'global_models': freshModels, 'last_model_fetch': Date.now() });
    return freshModels;
}

function updateModelDropdown(mode) {
    const select = document.getElementById('model-select');
    select.innerHTML = '';
    const models = globalModels[mode] || [];
    models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model;
        opt.innerText = model.charAt(0).toUpperCase() + model.slice(1);
        select.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. INIT
    const data = await chrome.storage.local.get(['pollinations_api_key', 'pollen_theme']);
    if (data.pollinations_api_key) {
        api.apiKey = data.pollinations_api_key;
        document.getElementById('api-key-input').value = data.pollinations_api_key;
    }
    if (data.pollen_theme) {
        document.body.className = data.pollen_theme;
        document.getElementById('theme-select').value = data.pollen_theme;
    }

    globalModels = await fetchModelsWithCache(api);
    updateModelDropdown('image');

    // 2. CHECK CONTEXT (From Right Click)
    const contextData = await chrome.storage.local.get(['pending_text', 'pending_image']);
    if (contextData.pending_text) {
        document.getElementById('prompt-input').value = `Explain this text:\n\n"${contextData.pending_text}"`;
        document.querySelector('[data-mode="text"]').click();
        chrome.storage.local.remove('pending_text');
    }
    if (contextData.pending_image) {
        attachedContextUrl = contextData.pending_image;
        document.getElementById('context-preview').style.display = 'flex';
        document.getElementById('context-image-preview').src = attachedContextUrl;
        chrome.storage.local.remove('pending_image');
    }

    // 3. EVENT LISTENERS
    
    // -- Navigation --
    document.getElementById('settings-btn').onclick = () => {
        document.getElementById('workspace').style.display = 'none';
        document.querySelector('.header-icons').style.display = 'none';
        document.getElementById('settings-panel').style.display = 'block';
    };
    document.getElementById('back-settings-btn').onclick = () => {
        document.getElementById('settings-panel').style.display = 'none';
        document.querySelector('.header-icons').style.display = 'block';
        document.getElementById('workspace').style.display = 'block';
    };

    document.getElementById('help-btn').onclick = () => {
        document.getElementById('workspace').style.display = 'none';
        document.querySelector('.header-icons').style.display = 'none';
        document.getElementById('help-panel').style.display = 'block';
    };
    document.getElementById('back-help-btn').onclick = () => {
        document.getElementById('help-panel').style.display = 'none';
        document.querySelector('.header-icons').style.display = 'block';
        document.getElementById('workspace').style.display = 'block';
    };

    // -- File Upload (Max 4) --
    document.getElementById('ref-image-upload').addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 4); // Limit to 4
        const container = document.getElementById('upload-preview-container');
        container.innerHTML = '';
        uploadedFiles = []; // Reset

        files.forEach(file => {
            uploadedFiles.push(file); // Store file object
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = document.createElement('img');
                img.src = evt.target.result;
                img.className = 'thumb';
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // -- Aspect Ratio Custom Toggle --
    document.getElementById('aspect-select').addEventListener('change', (e) => {
        const isCustom = e.target.value === 'custom';
        document.getElementById('custom-dims').style.display = isCustom ? 'flex' : 'none';
    });

    // -- Tab Switching --
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            updateModelDropdown(currentMode);
            
            // Hide/Show controls based on mode
            const imgControls = document.getElementById('image-controls');
            const uploadSection = document.getElementById('upload-section');
            
            if (currentMode === 'text') {
                imgControls.style.display = 'none';
                uploadSection.style.display = 'none';
            } else {
                imgControls.style.display = 'grid';
                uploadSection.style.display = 'block';
            }
        });
    });

    // -- Clear Context --
    document.getElementById('clear-context').onclick = () => {
        attachedContextUrl = null;
        document.getElementById('context-preview').style.display = 'none';
    };

    // -- Save Settings --
    document.getElementById('save-settings-btn').onclick = async () => {
        const key = document.getElementById('api-key-input').value.trim();
        const theme = document.getElementById('theme-select').value;
        await chrome.storage.local.set({ 'pollinations_api_key': key, 'pollen_theme': theme });
        api.apiKey = key;
        document.body.className = theme;
        document.getElementById('save-status').innerText = "Saved!";
    };

    // -- Check Balance --
    document.getElementById('check-balance-btn').onclick = async () => {
        const display = document.getElementById('balance-display');
        const key = document.getElementById('api-key-input').value.trim();
        if(!key) { display.innerText = "No Key"; return; }
        
        display.innerText = "Checking...";
        try {
            const tempApi = new PollinationsAPI(key);
            const bal = await tempApi.getBalance();
            display.innerText = `${bal} Pollen 🌸`;
        } catch(e) { display.innerText = "Error"; }
    };

    // -- Download --
    document.getElementById('download-btn').onclick = () => {
        if (!currentDownloadUrl) return;
        let ext = currentMode === 'video' ? 'mp4' : (currentMode === 'text' ? 'txt' : 'jpg');
        let filename = `pollinations_${Date.now()}.${ext}`;
        
        chrome.downloads.download({
            url: currentDownloadUrl,
            filename: filename,
            saveAs: false
        });
    };

    // -- GENERATE --
    document.getElementById('generate-btn').onclick = async () => {
        const prompt = document.getElementById('prompt-input').value.trim();
        if (!prompt) return;

        // Reset UI
        document.getElementById('image-output').style.display = 'none';
        document.getElementById('video-output').style.display = 'none';
        document.getElementById('text-output').style.display = 'none';
        document.getElementById('download-btn').style.display = 'none';
        document.getElementById('loading').style.display = 'block';

        const model = document.getElementById('model-select').value;
        const seedInput = document.getElementById('seed-input').value;
        const seed = seedInput ? parseInt(seedInput) : -1;

        try {
            // Determine Width/Height
            let width = 1024, height = 1024;
            const aspectVal = document.getElementById('aspect-select').value;
            if (aspectVal === 'custom') {
                width = document.getElementById('width-input').value;
                height = document.getElementById('height-input').value;
            } else {
                [width, height] = aspectVal.split('x');
            }

            // Determine Reference Image (Web Context OR Local Upload)
            let finalRefImage = attachedContextUrl;
            
            // If user uploaded local files, upload the first one to Media server
            if (uploadedFiles.length > 0) {
                // Upload the first file (Pollinations usually takes one primary ref image)
                finalRefImage = await api.uploadFile(uploadedFiles[0]);
            }

            if (currentMode === 'image') {
                const blob = await api.generateImage(prompt, { width, height, model, seed, imageUrl: finalRefImage });
                currentDownloadUrl = URL.createObjectURL(blob);
                document.getElementById('image-output').src = currentDownloadUrl;
                document.getElementById('image-output').style.display = 'block';
            } 
            else if (currentMode === 'video') {
                const url = await api.generateVideo(prompt, { model, seed, imageUrl: finalRefImage });
                currentDownloadUrl = url;
                document.getElementById('video-output').src = url;
                document.getElementById('video-output').style.display = 'block';
            }
            else if (currentMode === 'text') {
                const text = await api.generateText(prompt, model);
                document.getElementById('text-output').innerText = text;
                document.getElementById('text-output').style.display = 'block';
                currentDownloadUrl = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
            }
            
            document.getElementById('download-btn').style.display = 'block';

        } catch (error) {
            alert(error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    };
});