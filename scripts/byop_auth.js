// BYOP (Bring Your Own Pollen) Authentication Module
// Implements official Pollinations BYOP flows for browser extensions
// Reference: https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md

const BYOP_BASE_URL = "https://enter.pollinations.ai";

// Default app key for attribution - users can create their own at enter.pollinations.ai
const DEFAULT_APP_KEY = "pk_pollen_bridge_chunkypanda29";

/**
 * BYOP Authentication helper for browser extensions
 * Extends PollinationsAPI with official BYOP flows
 */
export class BYOPAuth {
    constructor(appKey = null) {
        this.appKey = appKey || DEFAULT_APP_KEY;
    }

    /**
     * Get user info from API key
     * Standard OIDC userinfo shape
     * 
     * @param {string} apiKey - The user's API key (sk_...)
     * @returns {Promise<Object>} User profile: {sub, name, preferred_username, email, picture, balance}
     */
    async getUserInfo(apiKey) {
        try {
            const response = await fetch(`${BYOP_BASE_URL}/api/device/userinfo`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.status}`);
            }
            
            return await response.json();
        } catch (e) {
            console.error("BYOP getUserInfo error:", e);
            return null;
        }
    }

    /**
     * Build OAuth authorization URL with app key attribution
     * 
     * @param {string} redirectUrl - Where users return after auth
     * @param {Object} options - Additional options
     * @param {string} options.models - Comma-separated model restrictions
     * @param {number} options.budget - Pollen cap
     * @param {number} options.expiry - Key lifetime in days (default: 30)
     * @param {string} options.permissions - Account access (profile,balance,usage)
     * @returns {string} Full authorization URL
     */
    buildAuthUrl(redirectUrl, options = {}) {
        const params = new URLSearchParams();
        
        // Required
        params.append("redirect_url", redirectUrl);
        
        // App key for branded consent screen (shows app name + GitHub)
        if (this.appKey) {
            params.append("app_key", this.appKey);
        }
        
        // Optional restrictions
        if (options.models) params.append("models", options.models);
        if (options.budget) params.append("budget", options.budget.toString());
        if (options.expiry) params.append("expiry", options.expiry.toString());
        if (options.permissions) params.append("permissions", options.permissions);
        
        return `${BYOP_BASE_URL}/authorize?${params.toString()}`;
    }

    /**
     * Parse API key from OAuth redirect URL
     * Key is in URL fragment (after #) - never hits server logs
     * 
     * @param {string} redirectUrl - The full redirect URL from OAuth flow
     * @returns {string|null} API key or null if not found
     */
    parseApiKeyFromRedirect(redirectUrl) {
        try {
            const url = new URL(redirectUrl);
            const fragment = url.hash.slice(1); // Remove leading #
            const params = new URLSearchParams(fragment);
            return params.get('api_key');
        } catch (e) {
            console.error("Failed to parse redirect URL:", e);
            return null;
        }
    }

    /**
     * Device code flow - for scenarios where launchWebAuthFlow isn't available
     * Useful for background scripts or content scripts
     * 
     * @param {string} scope - Permissions scope (default: "generate")
     * @returns {Promise<Object>} Device code data: {device_code, user_code, verification_uri, interval}
     */
    async requestDeviceCode(scope = "generate") {
        const response = await fetch(`${BYOP_BASE_URL}/api/device/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: this.appKey,
                scope: scope
            })
        });

        if (!response.ok) {
            throw new Error(`Device code request failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Poll for token after user authorizes via device code
     * 
     * @param {string} deviceCode - From requestDeviceCode()
     * @param {number} interval - Seconds between polls
     * @param {number} maxAttempts - Max polling attempts
     * @returns {Promise<string|null>} API key or null if expired/cancelled
     */
    async pollForToken(deviceCode, interval = 5, maxAttempts = 60) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(`${BYOP_BASE_URL}/api/device/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_code: deviceCode })
            });

            const data = await response.json();

            // Success!
            if (data.access_token) {
                return data.access_token;
            }

            // Pending - user hasn't authorized yet
            if (data.error === "authorization_pending") {
                await new Promise(r => setTimeout(r, interval * 1000));
                continue;
            }

            // Other errors
            console.error("BYOP polling error:", data.error);
            return null;
        }

        console.error("BYOP polling timeout");
        return null;
    }

    /**
     * Full device code flow with UI callbacks
     * 
     * @param {Object} callbacks - UI update callbacks
     * @param {Function} callbacks.onCode - Called with user_code and verification_uri
     * @param {Function} callbacks.onPending - Called while waiting
     * @param {Function} callbacks.onSuccess - Called with api_key
     * @param {Function} callbacks.onError - Called with error message
     * @param {string} scope - Permissions scope
     */
    async deviceCodeFlow(callbacks, scope = "generate") {
        try {
            const deviceData = await this.requestDeviceCode(scope);
            
            if (callbacks.onCode) {
                callbacks.onCode({
                    userCode: deviceData.user_code,
                    verificationUri: `https://enter.pollinations.ai${deviceData.verification_uri}`,
                    expiresIn: deviceData.expires_in
                });
            }

            const apiKey = await this.pollForToken(
                deviceData.device_code,
                deviceData.interval || 5
            );

            if (apiKey) {
                const userInfo = await this.getUserInfo(apiKey);
                if (callbacks.onSuccess) {
                    callbacks.onSuccess({ apiKey, userInfo });
                }
            } else {
                if (callbacks.onError) {
                    callbacks.onError("Authentication timed out or was cancelled");
                }
            }
        } catch (e) {
            if (callbacks.onError) {
                callbacks.onError(e.message);
            }
        }
    }
}

export default BYOPAuth;
