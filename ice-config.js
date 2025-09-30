/**
 * ICE Configuration Loader for Vitrine
 * Dynamically loads TURN/STUN configuration from the backend service
 */

class ICEConfigLoader {
    constructor() {
        this.config = null;
        this.lastUpdate = null;
        this.ttl = 3600; // 1 hour default
        this.backendUrl = this.getBackendUrl();
    }

    /**
     * Get the backend URL from localStorage (same as call.js)
     */
    getBackendUrl() {
        const savedIp = localStorage.getItem('vitrine.backend.ip') || localStorage.getItem('backendIp') || 'localhost';
        const port = savedIp.includes(':') ? '' : ':8080'; // Use port 8080 for our TURN service
        return `${savedIp}${port}`;
    }

    /**
     * Load ICE configuration from the backend
     */
    async loadConfig() {
        try {
            console.log('🔄 Loading ICE configuration from:', `${this.backendUrl}/integration/vitrine`);
            
            const response = await fetch(`${this.backendUrl}/integration/vitrine`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update configuration
            this.config = data;
            this.lastUpdate = new Date();
            this.ttl = data.ttlSeconds || 3600;
            
            console.log('✅ ICE configuration loaded successfully:', {
                iceServers: data.callConfig.iceServers.length,
                ttl: this.ttl,
                realm: data.realm
            });

            return data;
        } catch (error) {
            console.error('❌ Failed to load ICE configuration:', error);
            
            // Fallback to default configuration
            return this.getFallbackConfig();
        }
    }

    /**
     * Get fallback configuration if backend is unavailable
     */
    getFallbackConfig() {
        console.warn('⚠️ Using fallback ICE configuration');
        
        return {
            callConfig: {
                wsUrl: `ws://${this.backendUrl.replace('http://', '')}/ws/call`,
                apiUrl: this.backendUrl,
                iceServers: [
                    // Local STUN/TURN servers (if available)
                    { urls: 'stun:10.206.173.56:3478' },
                    // Google STUN as fallback
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            },
            ttlSeconds: 3600,
            realm: 'savqonnect.local',
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Check if configuration needs refresh
     */
    needsRefresh() {
        if (!this.lastUpdate) return true;
        
        const now = new Date();
        const elapsed = (now - this.lastUpdate) / 1000; // seconds
        
        return elapsed >= (this.ttl * 0.8); // Refresh at 80% of TTL
    }

    /**
     * Get current ICE servers configuration
     */
    async getIceServers() {
        if (!this.config || this.needsRefresh()) {
            await this.loadConfig();
        }
        
        return this.config.callConfig.iceServers;
    }

    /**
     * Get complete call configuration
     */
    async getCallConfig() {
        if (!this.config || this.needsRefresh()) {
            await this.loadConfig();
        }
        
        return this.config.callConfig;
    }

    /**
     * Force refresh of configuration
     */
    async refresh() {
        console.log('🔄 Force refreshing ICE configuration...');
        this.lastUpdate = null;
        return await this.loadConfig();
    }
}

// Global instance
window.iceConfigLoader = new ICEConfigLoader();

// Auto-refresh configuration every 30 minutes
setInterval(async () => {
    if (window.iceConfigLoader.needsRefresh()) {
        console.log('🔄 Auto-refreshing ICE configuration...');
        await window.iceConfigLoader.refresh();
    }
}, 30 * 60 * 1000); // 30 minutes

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICEConfigLoader;
}
