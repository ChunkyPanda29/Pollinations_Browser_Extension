import { PollinationsAPI } from '../scripts/pollinations_api.js';

let currentMode = 'image';
let api = new PollinationsAPI();
let attachedContextUrl = null; // From Web
let uploadedFiles = []; // From Local
let globalModels = { image: [], text: [], video: [] };
let currentDownloadUrl = null;

// URL for Daily Model Updates
const GITHUB_MODELS_URL = "https://raw.githubusercontent.com/ChunkyPanda29/Pollinations_Browser_Extension/main/models.json";

// --- HELPER: CONVERT BLOB TO BASE64 (For Storage) ---
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// --- CACHE & PERSISTENCE LOGIC (24HR) ---
const CACHE_KEY = 'pollen_last_gen';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

async function saveGenerationState(type, content, prompt) {
    const state = {
        type: type,
        content: content, // Base64 string (Image), URL (Video), or Text
        prompt: prompt,
        timestamp: Date.now()
    };
    await chrome.storage.local.set({ [CACHE_KEY]: state });
}

async function restoreGenerationState() {
    const data = await chrome.storage.local.get(CACHE_KEY);
    const state = data[CACHE_KEY];

    if (!state) return;

    // Check Expiry (24 Hours)
    if (Date.now() - state.timestamp > TWENTY_FOUR_HOURS) {
        await chrome.storage.local.remove(CACHE_KEY);
        return;
    }

    // Restore UI based on saved type
    const downloadBtn = document.getElementById('download-btn');
    const promptInput = document.getElementById('prompt-input');

    // Restore Prompt
    if (promptInput && state.prompt) promptInput.value = state.prompt;

    // Restore Content
    if (state.type === 'image') {
        const imgOut = document.getElementById('image-output');
        imgOut.src = state.content; // Content is Base64
        imgOut.style.display = 'block';
        currentDownloadUrl = state.content;
        
        // Switch tab to image
        const tab = document.querySelector('[data-mode="image"]');
        if (tab) tab.click();
    } 
    else if (state.type === 'video') {
        const vidOut = document.getElementById('video-output');
        vidOut.src = state.content; // Content is URL
        vidOut.style.display = 'block';
        currentDownloadUrl = state.content;
        
        // Switch tab to video
        const tab = document.querySelector('[data-mode="video"]');
        if (tab) tab.click();
    } 
    else if (state.type === 'text') {
        const txtOut = document.getElementById('text-output');
        txtOut.innerText = state.content;
        txtOut.style.display = 'block';
        
        // Re-create blob for download
        const blob = new Blob([state.content], { type: 'text/plain' });
        currentDownloadUrl = URL.createObjectURL(blob);
        
        // Switch tab to text
        const tab = document.querySelector('[data-mode="text"]');
        if (tab) tab.click();
    }

    // Show Download Button
    if (downloadBtn) downloadBtn.style.display = 'block';
}

// --- MODEL CACHE LOGIC (UPDATED: DAILY GITHUB FETCH) ---
async function fetchModelsWithCache(apiInstance) {
    const data = await chrome.storage.local.get(['global_models', 'last_model_fetch']);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Use cache if it's fresher than 24 hours
    if (data.global_models && data.last_model_fetch && (now - data.last_model_fetch < ONE_DAY)) {
        return data.global_models;
    }

    try {
        console.log("Fetching fresh models from GitHub...");
        const response = await fetch(GITHUB_MODELS_URL, { cache: "no-store" });
        if (!response.ok) throw new Error("Network response was not ok");
        const freshModels = await response.json();
        
        await chrome.storage.local.set({ 
            'global_models': freshModels, 
            'last_model_fetch': now 
        });
        return freshModels;
    } catch (e) {
        console.error("Model fetch failed, using fallback/cache:", e);
        // Fallback to existing cache or empty defaults so UI doesn't crash
        return data.global_models || { image: [], text: [], video: [] };
    }
}

function updateModelDropdown(mode) {
    const select = document.getElementById('model-select');
    if (!select) return;
    select.innerHTML = '';
    
    // globalModels[mode] is now: [{ "name": "flux", "label": "flux (T2I)" }, ...]
    const models = globalModels[mode] || [];
    
    models.forEach(modelObj => {
        const opt = document.createElement('option');
        opt.value = modelObj.name; // Use for API
        opt.innerText = modelObj.label; // Use for UI Display (Shows T2I/I2I etc)
        select.appendChild(opt);
    });
}

// --- HELPER: SAVE KEY & UI UPDATE ---
async function savePollinationsKey(token) {
    await chrome.storage.local.set({ 'pollinations_api_key': token });
    api.apiKey = token;
    document.getElementById('api-key-input').value = token;
    
    const status = document.getElementById('save-status');
    status.innerText = "Connected Successfully! 🌸";
    status.style.color = "var(--success-color)";
    
    // Refresh balance automatically
    setTimeout(() => { 
        const balBtn = document.getElementById('check-balance-btn');
        if(balBtn) balBtn.click(); 
    }, 500);
}

// ==========================================
// MAIN INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. LOAD SETTINGS (Key, Theme, Color)
    const data = await chrome.storage.local.get(['pollinations_api_key', 'pollen_theme', 'pollen_color']);
    
    // API Key
    if (data.pollinations_api_key) {
        api.apiKey = data.pollinations_api_key;
        document.getElementById('api-key-input').value = data.pollinations_api_key;
    }

    // Theme & Color
    const savedTheme = data.pollen_theme || 'theme-dark';
    const savedColor = data.pollen_color || 'color-pink';
    
    // Apply both classes
    document.body.className = `${savedTheme} ${savedColor}`;
    
    // Set Dropdowns
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
    
    const colorSelect = document.getElementById('color-select');
    if (colorSelect) colorSelect.value = savedColor;

    // 2. FETCH MODELS (Daily Sync)
    globalModels = await fetchModelsWithCache(api);
    updateModelDropdown('image'); // Default view

    // 3. RESTORE PREVIOUS STATE (If available and fresh)
    await restoreGenerationState();

    // 4. CHECK CONTEXT (From Right Click) - Overrides restored state if present
    const contextData = await chrome.storage.local.get(['pending_text', 'pending_image']);
    if (contextData.pending_text) {
        document.getElementById('prompt-input').value = `Explain this text:\n\n"${contextData.pending_text}"`;
        const textTab = document.querySelector('[data-mode="text"]');
        if(textTab) textTab.click();
        chrome.storage.local.remove('pending_text');
        
        // Hide previous output visuals
        document.getElementById('image-output').style.display = 'none';
        document.getElementById('video-output').style.display = 'none';
        document.getElementById('text-output').style.display = 'none';
        document.getElementById('download-btn').style.display = 'none';
    }
    if (contextData.pending_image) {
        attachedContextUrl = contextData.pending_image;
        document.getElementById('context-preview').style.display = 'flex';
        document.getElementById('context-image-preview').src = attachedContextUrl;
        chrome.storage.local.remove('pending_image');
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    // -- AUTH FLOW (Official Connect Button) --
    const connectBtn = document.getElementById('connect-pollinations-btn');
    if (connectBtn) {
        connectBtn.onclick = () => {
            const redirectUrl = chrome.identity.getRedirectURL();
            const authUrl = new URL("https://enter.pollinations.ai/authorize");
            authUrl.searchParams.append("redirect_url", redirectUrl);
            authUrl.searchParams.append("permissions", "profile,balance,usage");
            authUrl.searchParams.append("models", "flux,openai,wan");
            authUrl.searchParams.append("expiry", "30");

            chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true
            }, (responseUrl) => {
                if (chrome.runtime.lastError || !responseUrl) {
                    console.error("Auth failed:", chrome.runtime.lastError);
                    return;
                }
                try {
                    const urlWithHash = new URL(responseUrl);
                    const hashParams = new URLSearchParams(urlWithHash.hash.slice(1));
                    const apiKey = hashParams.get('api_key');
                    if (apiKey) savePollinationsKey(apiKey);
                } catch (err) { console.error("Error parsing response URL:", err); }
            });
        };
    }

    // -- Navigation (Settings / Help) --
    const togglePanel = (panelId, show) => {
        const workspace = document.getElementById('workspace');
        const headerIcons = document.querySelector('.header-icons');
        const panel = document.getElementById(panelId);
        
        if(show) {
            workspace.style.display = 'none';
            if(headerIcons) headerIcons.style.display = 'none';
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
            if(headerIcons) headerIcons.style.display = 'block';
            workspace.style.display = 'block';
        }
    };

    document.getElementById('settings-btn').onclick = () => togglePanel('settings-panel', true);
    document.getElementById('back-settings-btn').onclick = () => togglePanel('settings-panel', false);
    
    document.getElementById('help-btn').onclick = () => togglePanel('help-panel', true);
    document.getElementById('back-help-btn').onclick = () => togglePanel('help-panel', false);

    // -- File Upload --
    document.getElementById('ref-image-upload').addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 4);
        const container = document.getElementById('upload-preview-container');
        container.innerHTML = '';
        uploadedFiles = [];
        files.forEach(file => {
            uploadedFiles.push(file);
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

    // -- Aspect Ratio Toggle --
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

    // -- SAVE SETTINGS (Key + Theme + Color) --
    document.getElementById('save-settings-btn').onclick = async () => {
        const key = document.getElementById('api-key-input').value.trim();
        const theme = document.getElementById('theme-select').value;
        const color = document.getElementById('color-select').value;

        await chrome.storage.local.set({ 
            'pollinations_api_key': key, 
            'pollen_theme': theme,
            'pollen_color': color
        });

        api.apiKey = key;
        document.body.className = `${theme} ${color}`;

        const saveBtn = document.getElementById('save-settings-btn');
        saveBtn.innerText = "Saved!";
        setTimeout(() => { saveBtn.innerText = "Save"; }, 1500);
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

        // Reset UI Visuals
        document.getElementById('image-output').style.display = 'none';
        document.getElementById('video-output').style.display = 'none';
        document.getElementById('text-output').style.display = 'none';
        document.getElementById('download-btn').style.display = 'none';
        document.getElementById('loading').style.display = 'block';

        const model = document.getElementById('model-select').value;
        const seedInput = document.getElementById('seed-input').value;
        const seed = seedInput ? parseInt(seedInput) : -1;

        try {
            // Determine Dimensions
            let width = 1024, height = 1024;
            const aspectVal = document.getElementById('aspect-select').value;
            if (aspectVal === 'custom') {
                width = document.getElementById('width-input').value;
                height = document.getElementById('height-input').value;
            } else {
                [width, height] = aspectVal.split('x');
            }

            // Determine Reference Image
            let finalRefImage = attachedContextUrl;
            if (uploadedFiles.length > 0) {
                finalRefImage = await api.uploadFile(uploadedFiles[0]);
            }

            // --- EXECUTE GENERATION ---
            if (currentMode === 'image') {
                const blob = await api.generateImage(prompt, { width, height, model, seed, imageUrl: finalRefImage });
                currentDownloadUrl = URL.createObjectURL(blob);
                
                document.getElementById('image-output').src = currentDownloadUrl;
                document.getElementById('image-output').style.display = 'block';

                const base64 = await blobToBase64(blob);
                await saveGenerationState('image', base64, prompt);
            } 
            else if (currentMode === 'video') {
                const url = await api.generateVideo(prompt, { model, seed, imageUrl: finalRefImage });
                currentDownloadUrl = url;
                
                document.getElementById('video-output').src = url;
                document.getElementById('video-output').style.display = 'block';

                await saveGenerationState('video', url, prompt);
            }
            else if (currentMode === 'text') {
                const text = await api.generateText(prompt, model);
                
                document.getElementById('text-output').innerText = text;
                document.getElementById('text-output').style.display = 'block';
                currentDownloadUrl = URL.createObjectURL(new Blob([text], {type:'text/plain'}));

                await saveGenerationState('text', text, prompt);
            }
            
            document.getElementById('download-btn').style.display = 'block';

        } catch (error) {
            alert(error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    };
});