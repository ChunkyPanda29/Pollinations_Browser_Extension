import { PollinationsAPI } from '../scripts/pollinations_api.js';

let currentMode = 'image';
let api = new PollinationsAPI();
let attachedContextUrl = null; 
let uploadedFiles =[]; 
let globalModels = { image: [], text: [], video: [], audio:[] };
let currentDownloadUrl = null;
let currentHistory =[];

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

// ==========================================
// HISTORY & GARBAGE COLLECTION ENGINE
// ==========================================
const HISTORY_KEY = 'pollen_history';

async function loadHistoryAndGarbageCollect() {
    const data = await chrome.storage.local.get([HISTORY_KEY, 'pollen_retention']);
    currentHistory = data[HISTORY_KEY] ||[];
    const retentionHours = data.pollen_retention !== undefined ? parseInt(data.pollen_retention) : 24;
    
    if (retentionHours > 0) {
        const now = Date.now();
        const maxAgeMs = retentionHours * 60 * 60 * 1000;
        
        const validHistory =[];
        for (const item of currentHistory) {
            if (now - item.timestamp > maxAgeMs) {
                if (item.hash) await api.deleteMedia(item.hash);
            } else {
                validHistory.push(item);
            }
        }
        currentHistory = validHistory;
        await chrome.storage.local.set({ [HISTORY_KEY]: currentHistory });
    }
    renderHistoryGrid();
}

async function saveToHistory(itemData) {
    const newItem = { id: Date.now(), timestamp: Date.now(), ...itemData };
    currentHistory.unshift(newItem); 
    await chrome.storage.local.set({ [HISTORY_KEY]: currentHistory });
    renderHistoryGrid();
}

async function clearAllHistory() {
    for (const item of currentHistory) {
        if (item.hash) await api.deleteMedia(item.hash);
    }
    currentHistory = [];
    await chrome.storage.local.set({ [HISTORY_KEY]: currentHistory });
    renderHistoryGrid();
}

function renderHistoryGrid() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;
    grid.innerHTML = '';

    currentHistory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.title = item.prompt;

        if (item.type === 'image') {
            card.innerHTML = `<img src="${item.url}" class="history-thumb"><div class="history-type">IMG</div>`;
        } else if (item.type === 'video') {
            card.innerHTML = `<video src="${item.url}" class="history-thumb" muted></video><div class="history-type">VID</div>`;
        } else if (item.type === 'audio') {
            card.innerHTML = `<div class="history-text-thumb">🎵</div><div class="history-type">AUD</div>`;
        } else if (item.type === 'text') {
            card.innerHTML = `<div class="history-text-thumb">💬</div><div class="history-type">TXT</div>`;
        }

        const meta = document.createElement('div');
        meta.className = 'history-meta';
        meta.innerText = item.prompt;
        card.appendChild(meta);

        card.onclick = () => restoreHistoryItem(item);
        grid.appendChild(card);
    });
}

function restoreHistoryItem(item) {
    document.getElementById('prompt-input').value = item.prompt;
    
    const tab = document.querySelector(`[data-mode="${item.type}"]`);
    if (tab) tab.click();

    document.getElementById('image-output').style.display = 'none';
    document.getElementById('video-output').style.display = 'none';
    document.getElementById('audio-output').style.display = 'none';
    document.getElementById('text-output').style.display = 'none';

    if (item.type === 'image') {
        const img = document.getElementById('image-output');
        img.src = item.url;
        img.style.display = 'block';
        currentDownloadUrl = item.url;
    } else if (item.type === 'video') {
        const vid = document.getElementById('video-output');
        vid.src = item.url;
        vid.style.display = 'block';
        currentDownloadUrl = item.url;
    } else if (item.type === 'audio') {
        const aud = document.getElementById('audio-output');
        aud.src = item.url;
        aud.style.display = 'block';
        currentDownloadUrl = item.url;
    } else if (item.type === 'text') {
        const txt = document.getElementById('text-output');
        txt.innerText = item.content;
        txt.style.display = 'block';
        const blob = new Blob([item.content], { type: 'text/plain' });
        currentDownloadUrl = URL.createObjectURL(blob);
    }

    document.getElementById('download-btn').style.display = 'block';
    
    if (item.hash) {
        attachedContextUrl = item.hash;
        document.getElementById('context-preview').style.display = 'flex';
        document.getElementById('context-image-preview').src = item.url; 
    }

    document.getElementById('back-history-btn').click();
}

// ==========================================
// DYNAMIC MODEL CACHE
// ==========================================
async function fetchModelsWithCache() {
    const data = await chrome.storage.local.get(['global_models', 'last_model_fetch']);
    const now = Date.now();
    if (data.global_models && data.last_model_fetch && (now - data.last_model_fetch < 24 * 60 * 60 * 1000)) {
        return data.global_models;
    }
    try {
        const response = await fetch(GITHUB_MODELS_URL, { cache: "no-store" });
        if (!response.ok) throw new Error("Fetch failed");
        const freshModels = await response.json();
        await chrome.storage.local.set({ 'global_models': freshModels, 'last_model_fetch': now });
        return freshModels;
    } catch (e) {
        return data.global_models || { image: [], text:[], video: [], audio:[] };
    }
}

function updateModelDropdown(mode) {
    const select = document.getElementById('model-select');
    if (!select) return;
    select.innerHTML = '';
    
    const models = globalModels[mode] ||[];
    models.forEach(modelObj => {
        const opt = document.createElement('option');
        opt.value = modelObj.name;
        opt.innerText = modelObj.label;
        
        // Store voices array directly inside the HTML option element
        if (modelObj.voices) {
            opt.dataset.voices = JSON.stringify(modelObj.voices);
        }
        
        select.appendChild(opt);
    });

    // Manually trigger change event to initialize voice dropdown if in audio mode
    if (mode === 'audio') {
        select.dispatchEvent(new Event('change'));
    }
}

// ==========================================
// MAIN INITIALIZATION & LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. LOAD SETTINGS
    const data = await chrome.storage.local.get([
        'pollinations_api_key', 'pollen_theme', 'pollen_color', 'pollen_safe', 'pollen_retention'
    ]);
    
    if (data.pollinations_api_key) {
        api.apiKey = data.pollinations_api_key;
        document.getElementById('api-key-input').value = data.pollinations_api_key;
    }

    const savedTheme = data.pollen_theme || 'theme-dark';
    const savedColor = data.pollen_color || 'color-pink';
    document.body.className = `${savedTheme} ${savedColor}`;
    document.getElementById('theme-select').value = savedTheme;
    document.getElementById('color-select').value = savedColor;
    
    document.getElementById('safety-select').value = data.pollen_safe !== undefined ? data.pollen_safe : 'true';
    document.getElementById('retention-select').value = data.pollen_retention !== undefined ? data.pollen_retention : '24';

    // 2. FETCH MODELS
    globalModels = await fetchModelsWithCache();
    updateModelDropdown('image');
    await loadHistoryAndGarbageCollect();

    // 3. CHECK EXTERNAL CONTEXT (Right-Click)
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

    // -- BYOP Auth Flow --
    document.getElementById('connect-pollinations-btn').onclick = () => {
        const redirectUrl = chrome.identity.getRedirectURL();
        const authUrl = new URL("https://enter.pollinations.ai/authorize");
        authUrl.searchParams.append("redirect_url", redirectUrl);
        authUrl.searchParams.append("permissions", "profile,balance,usage");
        authUrl.searchParams.append("models", "flux,openai,wan");
        authUrl.searchParams.append("expiry", "30");
        authUrl.searchParams.append("referral", "pollen-bridge-extension"); 

        chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, async (responseUrl) => {
            if (chrome.runtime.lastError || !responseUrl) return;
            try {
                const urlWithHash = new URL(responseUrl);
                const apiKey = new URLSearchParams(urlWithHash.hash.slice(1)).get('api_key');
                if (apiKey) {
                    await chrome.storage.local.set({ 'pollinations_api_key': apiKey });
                    api.apiKey = apiKey;
                    document.getElementById('api-key-input').value = apiKey;
                    document.getElementById('save-status').innerText = "Connected Successfully! 🌸";
                    document.getElementById('check-balance-btn').click();
                }
            } catch (err) { console.error("Auth parsing error:", err); }
        });
    };

    // -- UI Navigation --
    const togglePanel = (panelId, show) => {
        const workspace = document.getElementById('workspace');
        const headerIcons = document.querySelector('.header-icons');
        const panel = document.getElementById(panelId);
        
        if(show) {
            if(workspace) workspace.style.display = 'none';
            if(headerIcons) headerIcons.style.display = 'none';
            if(panel) panel.style.display = 'block';
        } else {
            if(panel) panel.style.display = 'none';
            if(headerIcons) headerIcons.style.display = 'flex';
            if(workspace) workspace.style.display = 'block';
        }
    };

    document.getElementById('settings-btn').onclick = () => togglePanel('settings-panel', true);
    document.getElementById('back-settings-btn').onclick = () => togglePanel('settings-panel', false);
    document.getElementById('help-btn').onclick = () => togglePanel('help-panel', true);
    document.getElementById('back-help-btn').onclick = () => togglePanel('help-panel', false);
    document.getElementById('history-btn').onclick = () => togglePanel('history-panel', true);
    document.getElementById('back-history-btn').onclick = () => togglePanel('history-panel', false);
    document.getElementById('clear-history-btn').onclick = async () => await clearAllHistory();

    // -- DYNAMIC AUDIO VOICES LOGIC --
    document.getElementById('model-select').addEventListener('change', (e) => {
        if (currentMode !== 'audio') return;
        
        const selectedOption = e.target.options[e.target.selectedIndex];
        const voiceSelect = document.getElementById('voice-select');
        
        if (!voiceSelect) return;

        if (selectedOption && selectedOption.dataset.voices) {
            try {
                const voices = JSON.parse(selectedOption.dataset.voices);
                if (voices && voices.length > 0) {
                    voiceSelect.innerHTML = '';
                    voices.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v;
                        opt.innerText = `Voice: ${v.charAt(0).toUpperCase() + v.slice(1)}`;
                        voiceSelect.appendChild(opt);
                    });
                    voiceSelect.style.display = 'block'; // Show if voices exist
                    return;
                }
            } catch(err) { console.error("Error parsing voices", err); }
        }
        
        // Hide dropdown if model has no voices (e.g. music models)
        voiceSelect.style.display = 'none';
    });

    // -- Tab Switching (NULL-SAFE FIX) --
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            updateModelDropdown(currentMode);
            
            const dimGroup = document.getElementById('dimensions-group');
            const timeGroup = document.getElementById('time-group');
            const audioGroup = document.getElementById('audio-controls-group');
            const globalGroup = document.getElementById('global-params-group');
            const upSection = document.getElementById('upload-section');

            // Reset all to hidden safely
            if (dimGroup) dimGroup.style.display = 'none';
            if (timeGroup) timeGroup.style.display = 'none';
            if (audioGroup) audioGroup.style.display = 'none';
            if (globalGroup) globalGroup.style.display = 'none';
            if (upSection) upSection.style.display = 'none';

            // Show relevant groups safely
            if (currentMode === 'image') {
                if (dimGroup) dimGroup.style.display = 'block';
                if (globalGroup) globalGroup.style.display = 'block';
                if (upSection) upSection.style.display = 'block';
            } else if (currentMode === 'video') {
                if (dimGroup) dimGroup.style.display = 'block';
                if (timeGroup) timeGroup.style.display = 'block';
                if (globalGroup) globalGroup.style.display = 'block';
                if (upSection) upSection.style.display = 'block';
            } else if (currentMode === 'audio') {
                if (audioGroup) audioGroup.style.display = 'block';
                if (timeGroup) timeGroup.style.display = 'block';
            }
        });
    });

    // -- Utils --
    document.getElementById('aspect-select').addEventListener('change', (e) => {
        const custom = document.getElementById('custom-dims');
        if(custom) custom.style.display = (e.target.value === 'custom') ? 'flex' : 'none';
    });

    document.getElementById('ref-image-upload').addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 4);
        const container = document.getElementById('upload-preview-container');
        if(!container) return;
        container.innerHTML = '';
        uploadedFiles =[];
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

    document.getElementById('clear-context').onclick = () => {
        attachedContextUrl = null;
        const prev = document.getElementById('context-preview');
        if(prev) prev.style.display = 'none';
    };

    // -- Settings Logic --
    document.getElementById('save-settings-btn').onclick = async () => {
        const key = document.getElementById('api-key-input').value.trim();
        const theme = document.getElementById('theme-select').value;
        const color = document.getElementById('color-select').value;
        const safe = document.getElementById('safety-select').value;
        const retention = document.getElementById('retention-select').value;

        await chrome.storage.local.set({ 
            'pollinations_api_key': key, 
            'pollen_theme': theme, 'pollen_color': color,
            'pollen_safe': safe, 'pollen_retention': retention
        });

        api.apiKey = key;
        document.body.className = `${theme} ${color}`;

        const btn = document.getElementById('save-settings-btn');
        btn.innerText = "Saved!";
        setTimeout(() => { btn.innerText = "Save Settings"; }, 1500);
        
        await loadHistoryAndGarbageCollect();
    };

    document.getElementById('check-balance-btn').onclick = async () => {
        const display = document.getElementById('balance-display');
        if(!api.apiKey) { display.innerText = "No Key"; return; }
        display.innerText = "Checking...";
        try {
            const bal = await api.getBalance();
            display.innerText = `${bal} Pollen 🌸`;
        } catch(e) { display.innerText = e.message; }
    };

    document.getElementById('download-btn').onclick = () => {
        if (!currentDownloadUrl) return;
        let ext = currentMode === 'video' ? 'mp4' : (currentMode === 'audio' ? 'mp3' : (currentMode === 'text' ? 'txt' : 'jpg'));
        chrome.downloads.download({ url: currentDownloadUrl, filename: `pollinations_${Date.now()}.${ext}`, saveAs: false });
    };

    // ==========================================
    // MAIN GENERATION LOGIC
    // ==========================================
      document.getElementById('generate-btn').onclick = async () => {
        const prompt = document.getElementById('prompt-input').value.trim();
        if (!prompt) return;

        // Reset UI Visuals safely
        ['image-output', 'video-output', 'audio-output', 'text-output', 'download-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'block';

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
            const scale = parseInt(document.getElementById('scale-select').value);
            width = parseInt(width) * scale;
            height = parseInt(height) * scale;

            // Determine Reference Image
            let finalRefImage = attachedContextUrl;
            if (uploadedFiles.length > 0) {
                const uploadData = await api.uploadFile(uploadedFiles[0]);
                finalRefImage = uploadData.hash; 
            }

            // --- EXECUTE GENERATION ---
            if (currentMode === 'image') {
                const res = await api.generateImage(prompt, { width, height, model, seed, imageUrl: finalRefImage });
                currentDownloadUrl = URL.createObjectURL(res.blob);
                
                const img = document.getElementById('image-output');
                if (img) {
                    img.src = currentDownloadUrl;
                    img.style.display = 'block';
                }

                const base64 = await blobToBase64(res.blob);
                await saveToHistory({ type: 'image', prompt, url: currentDownloadUrl, hash: res.hash, content: base64 });
            } 
            else if (currentMode === 'video') {
                const duration = document.getElementById('duration-input').value;
                const res = await api.generateVideo(prompt, { width, height, model, seed, duration, imageUrl: finalRefImage });
                currentDownloadUrl = res.url;
                
                const vid = document.getElementById('video-output');
                if (vid) {
                    vid.src = res.url;
                    vid.style.display = 'block';
                }

                await saveToHistory({ type: 'video', prompt, url: res.url, hash: res.hash, content: null });
            }
            else if (currentMode === 'audio') {
                const voiceSelect = document.getElementById('voice-select');
                const voice = (voiceSelect && voiceSelect.style.display !== 'none') ? voiceSelect.value : 'alloy';
                const duration = document.getElementById('duration-input').value;
                
                const res = await api.generateAudio(prompt, { model, voice, duration });
                currentDownloadUrl = res.url;
                
                const aud = document.getElementById('audio-output');
                if (aud) {
                    aud.src = res.url;
                    aud.style.display = 'block';
                    aud.play();
                }

                await saveToHistory({ type: 'audio', prompt, url: res.url, hash: null, content: null });
            }
            else if (currentMode === 'text') {
                const res = await api.generateText(prompt, { model });
                
                const txt = document.getElementById('text-output');
                if (txt) {
                    txt.innerText = res.text;
                    txt.style.display = 'block';
                }
                
                currentDownloadUrl = URL.createObjectURL(new Blob([res.text], {type:'text/plain'}));
                await saveToHistory({ type: 'text', prompt, url: null, hash: null, content: res.text });
            }
            
            const dlBtn = document.getElementById('download-btn');
            if (dlBtn) dlBtn.style.display = 'block';

        } catch (error) {
            alert(error.message);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    };
});