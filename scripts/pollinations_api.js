const BASE_URL = "https://gen.pollinations.ai";
const MEDIA_URL = "https://media.pollinations.ai";
const ACCOUNT_URL = "https://enter.pollinations.ai/api"; 
const GITHUB_MODELS_URL = "https://raw.githubusercontent.com/ChunkyPanda29/ComfyUI-Pollinations-BYOP/main/models.json";

export class PollinationsAPI {
    constructor(apiKey = "") {
        this.apiKey = apiKey;
    }

    getHeaders() {
        const headers = { "Accept": "application/json" };
        if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
        return headers;
    }

    async getBalance() {
        if (!this.apiKey) throw new Error("API Key required.");
        const response = await fetch(`${ACCOUNT_URL}/account/balance`, {
            method: 'GET', headers: this.getHeaders(), cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Balance Error: ${response.status}`);
        const data = await response.json();
        return typeof data === 'object' && data.balance !== undefined ? data.balance : data;
    }

    async fetchModels() {
        try {
            const response = await fetch(GITHUB_MODELS_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to fetch GitHub models");
            return await response.json();
        } catch (error) {
            return { image: ["flux"], text: ["openai"], video: ["wan"], audio:["elevenlabs"] };
        }
    }

    // Upload from Local File Object
    async uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file, file.name);
        const uploadRes = await fetch(`${MEDIA_URL}/upload`, { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error("Failed to upload local image.");
        const data = await uploadRes.json();
        return data.url;
    }

    // Upload from URL (Blob)
    async uploadImage(blobUrl) {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, "image.png");
        const uploadRes = await fetch(`${MEDIA_URL}/upload`, { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error("Failed to upload context image.");
        const data = await uploadRes.json();
        return data.url; 
    }

    async generateImage(prompt, options = {}) {
        const { width = 1024, height = 1024, model = 'flux', seed = -1, imageUrl = null } = options;
        const finalSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
        const cleanModel = model.replace("💎", "").trim();
        
        let url = new URL(`${BASE_URL}/image/${encodeURIComponent(prompt)}`);
        url.searchParams.append("model", cleanModel);
        url.searchParams.append("width", width);
        url.searchParams.append("height", height);
        url.searchParams.append("seed", finalSeed);
        url.searchParams.append("nologo", "true");

        if (imageUrl) {
            // If it's a blob URL (from context), upload it first. If it's already a hosted URL (from uploadFile), use it.
            let hostedUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                hostedUrl = await this.uploadImage(imageUrl);
            }
            url.searchParams.append("image", hostedUrl);
        }

        const response = await fetch(url.toString(), { method: 'GET', headers: this.getHeaders() });
        if (!response.ok) throw new Error(`Image API Error: ${response.status}`);
        return await response.blob();
    }

    async generateText(prompt, model = "openai") {
        const cleanModel = model.replace("💎", "").trim();
        const payload = {
            model: cleanModel,
            messages:[{ role: "user", content: prompt }]
        };

        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST', headers: { ...this.getHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Text API Error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    async generateVideo(prompt, options = {}) {
        const { model = 'wan', seed = 42, imageUrl = null } = options;
        const cleanModel = model.replace("💎", "").trim();
        
        let url = new URL(`${BASE_URL}/video/${encodeURIComponent(prompt)}`);
        url.searchParams.append("model", cleanModel);
        url.searchParams.append("duration", "5");
        url.searchParams.append("seed", seed);

        if (imageUrl) {
            let hostedUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                hostedUrl = await this.uploadImage(imageUrl);
            }
            url.searchParams.append("image", hostedUrl);
        }
        if (this.apiKey) url.searchParams.append("key", this.apiKey);
        return url.toString();
    }
}