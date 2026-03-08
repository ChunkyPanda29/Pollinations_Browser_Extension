const BASE_URL = "https://gen.pollinations.ai";
const MEDIA_URL = "https://media.pollinations.ai";
const ACCOUNT_URL = "https://enter.pollinations.ai/api"; 
const GITHUB_MODELS_URL = "https://raw.githubusercontent.com/ChunkyPanda29/Pollinations_Browser_Extension/main/models.json";

export class PollinationsAPI {
    constructor(apiKey = "") {
        this.apiKey = apiKey;
    }

    getHeaders() {
        const headers = { "Accept": "application/json" };
        if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
        return headers;
    }

    // --- DETAILED ERROR HANDLER ---
    async handleApiError(response, defaultMsg) {
        try {
            const errorData = await response.json();
            // Surface the exact error from Pollinations (e.g., "API key required")
            return new Error(`Error ${response.status}: ${errorData.error || errorData.message || defaultMsg}`);
        } catch {
            return new Error(`${defaultMsg} (${response.status})`);
        }
    }

    async getBalance() {
        if (!this.apiKey) throw new Error("API Key required.");
        const response = await fetch(`${ACCOUNT_URL}/account/balance`, {
            method: 'GET', headers: this.getHeaders(), cache: 'no-store'
        });
        if (!response.ok) throw await this.handleApiError(response, "Balance check failed");
        const data = await response.json();
        return typeof data === 'object' && data.balance !== undefined ? data.balance : data;
    }

    async fetchModels() {
        try {
            const response = await fetch(GITHUB_MODELS_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to fetch models from GitHub");
            return await response.json();
        } catch (e) {
            console.error(e);
            return { image:[], text: [], video: [], audio:[] };
        }
    }

    // --- MEDIA HASH PROTOCOL ---
    async uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file, file.name);

        const uploadRes = await fetch(`${MEDIA_URL}/upload`, { 
            method: 'POST', 
            headers: this.getHeaders(), 
            body: formData 
        });

        if (!uploadRes.ok) throw await this.handleApiError(uploadRes, "Upload failed");
        return await uploadRes.json(); // Returns { url, hash }
    }

    async uploadImage(blobUrl) {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, "image.png");

        const uploadRes = await fetch(`${MEDIA_URL}/upload`, { 
            method: 'POST', 
            headers: this.getHeaders(), 
            body: formData 
        });

        if (!uploadRes.ok) throw await this.handleApiError(uploadRes, "Context upload failed");
        return await uploadRes.json(); // Returns { url, hash }
    }

    // DELETE MEDIA (For Garbage Collection / History Scrubbing)
    async deleteMedia(hash) {
        if (!hash) return;
        try {
            const res = await fetch(`${MEDIA_URL}/${hash}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if (!res.ok) console.warn(`Failed to delete media hash ${hash}`);
        } catch (e) {
            console.error("Delete media error:", e);
        }
    }

    // --- GENERATION ENDPOINTS ---

    async generateImage(prompt, options = {}) {
        const { width = 1024, height = 1024, model = 'flux', seed = -1, imageUrl = null, safe = true } = options;
        const finalSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
        const cleanModel = model.replace("💎", "").trim();
        
        let url = new URL(`${BASE_URL}/image/${encodeURIComponent(prompt)}`);
        url.searchParams.append("model", cleanModel);
        url.searchParams.append("width", width);
        url.searchParams.append("height", height);
        url.searchParams.append("seed", finalSeed);
        url.searchParams.append("safe", safe);
        url.searchParams.append("nologo", "true");

        let hash = null;
        if (imageUrl) {
            let hostedUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                const uploadData = await this.uploadImage(imageUrl);
                hostedUrl = uploadData.url;
                hash = uploadData.hash;
            } else if (imageUrl.length === 64) {
                // If it's exactly 64 chars, it's a hash! Re-use it.
                hostedUrl = `${MEDIA_URL}/${imageUrl}`;
                hash = imageUrl;
            }
            url.searchParams.append("image", hostedUrl);
        }

        const response = await fetch(url.toString(), { method: 'GET', headers: this.getHeaders() });
        if (!response.ok) throw await this.handleApiError(response, "Image generation failed");
        
        return { blob: await response.blob(), url: response.url, hash: hash }; 
    }

    async generateVideo(prompt, options = {}) {
        const { width = 1024, height = 1024, model = 'wan', seed = 42, imageUrl = null, duration = 5 } = options;
        const cleanModel = model.replace("💎", "").trim();
        
        let url = new URL(`${BASE_URL}/video/${encodeURIComponent(prompt)}`);
        url.searchParams.append("model", cleanModel);
        url.searchParams.append("width", width);
        url.searchParams.append("height", height);
        
        // Only append duration if provided (some models fail if given invalid durations)
        if (duration) url.searchParams.append("duration", duration);
        
        url.searchParams.append("seed", seed);

        let hash = null;
        if (imageUrl) {
            let hostedUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                const uploadData = await this.uploadImage(imageUrl);
                hostedUrl = uploadData.url;
                hash = uploadData.hash;
            } else if (imageUrl.length === 64) {
                hostedUrl = `${MEDIA_URL}/${imageUrl}`;
                hash = imageUrl;
            }
            url.searchParams.append("image", hostedUrl);
        }

        if (this.apiKey) url.searchParams.append("key", this.apiKey);
        return { url: url.toString(), hash: hash };
    }

    async generateAudio(prompt, options = {}) {
        const { model = 'elevenlabs', voice = 'alloy', duration = null } = options;
        const cleanModel = model.replace("💎", "").trim();

        let url = new URL(`${BASE_URL}/audio/${encodeURIComponent(prompt)}`);
        url.searchParams.append("model", cleanModel);
        url.searchParams.append("voice", voice);
        
        // For music models like Suno/Udio that might take a duration
        if (duration) url.searchParams.append("duration", duration);
        
        if (this.apiKey) url.searchParams.append("key", this.apiKey);
        
        return { url: url.toString() }; // Audio plays directly from stream
    }

    async generateText(prompt, options = {}) {
        const { model = "openai", safe = true } = options;
        const cleanModel = model.replace("💎", "").trim();
        const payload = {
            model: cleanModel,
            safe: safe === true || safe === "true",
            messages:[{ role: "user", content: prompt }]
        };

        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { ...this.getHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw await this.handleApiError(response, "Text generation failed");
        const data = await response.json();
        return { text: data.choices[0].message.content };
    }
}