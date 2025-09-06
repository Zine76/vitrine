/**
 * Module de gestion des connexions pour Vitrine
 * Ce module améliore la robustesse des connexions au backend
 * et implémente des mécanismes de reconnexion automatique
 */

class ConnectionManager {
    constructor(options = {}) {
        this.options = {
            pingInterval: options.pingInterval || 10000,         // Intervalle de ping en ms
            reconnectInterval: options.reconnectInterval || 5000, // Intervalle de reconnexion en ms
            maxReconnectAttempts: options.maxReconnectAttempts || 10, // Nombre max de tentatives
            healthEndpoint: options.healthEndpoint || '/api/health',
            onStatusChange: options.onStatusChange || function() {},
            onReconnectAttempt: options.onReconnectAttempt || function() {},
            onReconnectSuccess: options.onReconnectSuccess || function() {},
            onReconnectFailure: options.onReconnectFailure || function() {},
            debug: options.debug || false
        };

        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.pingIntervalId = null;
        this.reconnectIntervalId = null;
        this.eventSources = new Map();
        this.primaryBackendUrl = null;
        this.fallbackBackendUrl = null;
        this.currentBackendUrl = null;
        this.lastConnectedUrl = null;

        // État des connexions SSE
        this.sseConnections = {};

        this.log('✅ [ConnectionManager] Module initialisé');
    }

    /**
     * Initialise le gestionnaire de connexion avec les URLs des backends
     * @param {string} primaryUrl - URL principale du backend
     * @param {string} fallbackUrl - URL de secours du backend (optionnelle)
     */
    initialize(primaryUrl, fallbackUrl = null) {
        this.primaryBackendUrl = primaryUrl;
        this.fallbackBackendUrl = fallbackUrl;
        this.currentBackendUrl = primaryUrl;
        
        this.log(`🌐 [ConnectionManager] URLs configurées - Primaire: ${primaryUrl}, Secours: ${fallbackUrl || 'Non configuré'}`);
        
        // Démarrer la surveillance de la connexion
        this.startMonitoring();
        
        return this;
    }

    /**
     * Démarre la surveillance de la connexion
     */
    startMonitoring() {
        // Arrêter les surveillances existantes
        this.stopMonitoring();
        
        // Vérifier immédiatement l'état de la connexion
        this.checkConnection();
        
        // Configurer la vérification périodique
        this.pingIntervalId = setInterval(() => {
            this.checkConnection();
        }, this.options.pingInterval);
        
        this.log('🔄 [ConnectionManager] Surveillance de connexion démarrée');
    }

    /**
     * Arrête la surveillance de la connexion
     */
    stopMonitoring() {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
        
        if (this.reconnectIntervalId) {
            clearInterval(this.reconnectIntervalId);
            this.reconnectIntervalId = null;
        }
        
        this.log('⏹️ [ConnectionManager] Surveillance de connexion arrêtée');
    }

    /**
     * Vérifie l'état de la connexion au backend
     */
    async checkConnection() {
        try {
            const url = `${this.currentBackendUrl}${this.options.healthEndpoint}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 secondes de timeout
            });
            
            if (response.ok) {
                // Si on était déconnecté et qu'on est maintenant connecté
                if (!this.isConnected) {
                    this.handleConnectionRestored();
                }
                
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.lastConnectedUrl = this.currentBackendUrl;
                
                // Notifier du changement de statut
                this.options.onStatusChange(true, this.currentBackendUrl);
            } else {
                this.handleConnectionLost('Réponse serveur non valide');
            }
        } catch (error) {
            this.handleConnectionLost(error.message);
        }
    }

    /**
     * Gère la perte de connexion
     * @param {string} reason - Raison de la perte de connexion
     */
    handleConnectionLost(reason) {
        this.log(`❌ [ConnectionManager] Connexion perdue: ${reason}`);
        
        // Si on était connecté et qu'on est maintenant déconnecté
        if (this.isConnected) {
            this.isConnected = false;
            
            // Notifier du changement de statut
            this.options.onStatusChange(false, this.currentBackendUrl);
            
            // Démarrer les tentatives de reconnexion
            this.startReconnectionAttempts();
        }
    }

    /**
     * Gère la restauration de la connexion
     */
    handleConnectionRestored() {
        this.log('✅ [ConnectionManager] Connexion restaurée');
        
        // Arrêter les tentatives de reconnexion
        if (this.reconnectIntervalId) {
            clearInterval(this.reconnectIntervalId);
            this.reconnectIntervalId = null;
        }
        
        // Réinitialiser le compteur de tentatives
        this.reconnectAttempts = 0;
        
        // Reconnecter tous les EventSource
        this.reconnectAllEventSources();
        
        // Notifier de la reconnexion réussie
        this.options.onReconnectSuccess(this.currentBackendUrl);
    }

    /**
     * Démarre les tentatives de reconnexion
     */
    startReconnectionAttempts() {
        // Si des tentatives sont déjà en cours, ne pas en démarrer de nouvelles
        if (this.reconnectIntervalId) {
            return;
        }
        
        this.reconnectIntervalId = setInterval(() => {
            this.attemptReconnection();
        }, this.options.reconnectInterval);
        
        // Tenter immédiatement une reconnexion
        this.attemptReconnection();
    }

    /**
     * Tente une reconnexion au backend
     */
    async attemptReconnection() {
        this.reconnectAttempts++;
        
        this.log(`🔄 [ConnectionManager] Tentative de reconnexion ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);
        
        // Notifier de la tentative de reconnexion
        this.options.onReconnectAttempt(this.reconnectAttempts, this.options.maxReconnectAttempts);
        
        // Si on a atteint le nombre maximum de tentatives avec l'URL actuelle
        if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            // Si on utilise l'URL principale et qu'une URL de secours est disponible
            if (this.currentBackendUrl === this.primaryBackendUrl && this.fallbackBackendUrl) {
                this.log('🔄 [ConnectionManager] Basculement vers l\'URL de secours');
                this.currentBackendUrl = this.fallbackBackendUrl;
                this.reconnectAttempts = 0;
            } 
            // Si on utilise l'URL de secours et que l'URL principale est disponible
            else if (this.currentBackendUrl === this.fallbackBackendUrl && this.primaryBackendUrl) {
                this.log('🔄 [ConnectionManager] Retour à l\'URL principale');
                this.currentBackendUrl = this.primaryBackendUrl;
                this.reconnectAttempts = 0;
            } 
            // Si on n'a pas d'autre URL à essayer
            else {
                this.log('❌ [ConnectionManager] Échec de reconnexion après plusieurs tentatives');
                
                if (this.reconnectIntervalId) {
                    clearInterval(this.reconnectIntervalId);
                    this.reconnectIntervalId = null;
                }
                
                // Notifier de l'échec de reconnexion
                this.options.onReconnectFailure();
                return;
            }
        }
        
        // Tenter de se connecter à l'URL actuelle
        this.checkConnection();
    }

    /**
     * Enregistre un EventSource pour la gestion automatique des reconnexions
     * @param {string} id - Identifiant unique de l'EventSource
     * @param {string} url - URL de l'EventSource
     * @param {Object} options - Options de l'EventSource
     * @returns {EventSource} - L'instance EventSource créée
     */
    registerEventSource(id, url, options = {}) {
        // Fermer l'EventSource existant s'il y en a un
        this.closeEventSource(id);
        
        // Créer le nouvel EventSource
        const fullUrl = new URL(url, this.currentBackendUrl).toString();
        const eventSource = new EventSource(fullUrl, options);
        
        // Stocker l'EventSource et ses informations
        this.eventSources.set(id, {
            instance: eventSource,
            url: url,
            options: options,
            handlers: new Map()
        });
        
        this.log(`📡 [ConnectionManager] EventSource enregistré: ${id} (${fullUrl})`);
        
        // Ajouter un gestionnaire d'erreur pour détecter les déconnexions
        eventSource.onerror = (error) => {
            this.log(`❌ [ConnectionManager] Erreur EventSource ${id}: ${error.type}`);
            
            // Si on est connecté au backend mais que l'EventSource a une erreur,
            // tenter de le reconnecter
            if (this.isConnected) {
                this.reconnectEventSource(id);
            }
        };
        
        return eventSource;
    }

    /**
     * Ajoute un gestionnaire d'événement à un EventSource enregistré
     * @param {string} id - Identifiant de l'EventSource
     * @param {string} event - Nom de l'événement
     * @param {Function} handler - Fonction de gestion de l'événement
     */
    addEventSourceHandler(id, event, handler) {
        const eventSourceData = this.eventSources.get(id);
        
        if (!eventSourceData) {
            this.log(`⚠️ [ConnectionManager] Impossible d'ajouter un gestionnaire: EventSource ${id} non trouvé`);
            return;
        }
        
        // Stocker le gestionnaire
        if (!eventSourceData.handlers.has(event)) {
            eventSourceData.handlers.set(event, []);
        }
        
        eventSourceData.handlers.get(event).push(handler);
        
        // Ajouter le gestionnaire à l'instance EventSource
        eventSourceData.instance.addEventListener(event, handler);
        
        this.log(`✅ [ConnectionManager] Gestionnaire ajouté pour l'événement '${event}' sur EventSource ${id}`);
    }

    /**
     * Ferme un EventSource enregistré
     * @param {string} id - Identifiant de l'EventSource
     */
    closeEventSource(id) {
        const eventSourceData = this.eventSources.get(id);
        
        if (eventSourceData && eventSourceData.instance) {
            eventSourceData.instance.close();
            this.eventSources.delete(id);
            this.log(`🔒 [ConnectionManager] EventSource fermé: ${id}`);
        }
    }

    /**
     * Reconnecte un EventSource spécifique
     * @param {string} id - Identifiant de l'EventSource
     */
    reconnectEventSource(id) {
        const eventSourceData = this.eventSources.get(id);
        
        if (!eventSourceData) {
            this.log(`⚠️ [ConnectionManager] Impossible de reconnecter: EventSource ${id} non trouvé`);
            return;
        }
        
        this.log(`🔄 [ConnectionManager] Reconnexion de l'EventSource: ${id}`);
        
        // Fermer l'instance existante
        eventSourceData.instance.close();
        
        // Créer une nouvelle instance
        const fullUrl = new URL(eventSourceData.url, this.currentBackendUrl).toString();
        const newEventSource = new EventSource(fullUrl, eventSourceData.options);
        
        // Mettre à jour l'instance dans les données
        eventSourceData.instance = newEventSource;
        
        // Réappliquer tous les gestionnaires d'événements
        eventSourceData.handlers.forEach((handlers, event) => {
            handlers.forEach(handler => {
                newEventSource.addEventListener(event, handler);
            });
        });
        
        // Ajouter le gestionnaire d'erreur
        newEventSource.onerror = (error) => {
            this.log(`❌ [ConnectionManager] Erreur EventSource ${id}: ${error.type}`);
            
            // Si on est connecté au backend mais que l'EventSource a une erreur,
            // tenter de le reconnecter
            if (this.isConnected) {
                this.reconnectEventSource(id);
            }
        };
    }

    /**
     * Reconnecte tous les EventSource enregistrés
     */
    reconnectAllEventSources() {
        this.log(`🔄 [ConnectionManager] Reconnexion de tous les EventSource (${this.eventSources.size})`);
        
        for (const id of this.eventSources.keys()) {
            this.reconnectEventSource(id);
        }
    }

    /**
     * Ferme tous les EventSource enregistrés
     */
    closeAllEventSources() {
        this.log(`🔒 [ConnectionManager] Fermeture de tous les EventSource (${this.eventSources.size})`);
        
        for (const id of this.eventSources.keys()) {
            this.closeEventSource(id);
        }
    }

    /**
     * Effectue une requête fetch avec retry automatique
     * @param {string} url - URL relative de la requête
     * @param {Object} options - Options fetch
     * @param {Object} retryOptions - Options de retry
     * @returns {Promise<Response>} - Réponse de la requête
     */
    async fetchWithRetry(url, options = {}, retryOptions = {}) {
        const maxRetries = retryOptions.maxRetries || 3;
        const initialDelay = retryOptions.initialDelay || 1000;
        const maxDelay = retryOptions.maxDelay || 5000;
        const timeout = retryOptions.timeout || 10000;
        
        // Assurer que les options ont un signal de timeout
        if (!options.signal) {
            options.signal = AbortSignal.timeout(timeout);
        }
        
        let lastError;
        let delay = initialDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Construire l'URL complète
                const fullUrl = new URL(url, this.currentBackendUrl).toString();
                
                this.log(`🔄 [ConnectionManager] Tentative fetch ${attempt}/${maxRetries}: ${fullUrl}`);
                
                const response = await fetch(fullUrl, options);
                
                // Si la réponse n'est pas OK mais qu'on a d'autres tentatives
                if (!response.ok && attempt < maxRetries) {
                    throw new Error(`Réponse non OK: ${response.status} ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                lastError = error;
                
                this.log(`⚠️ [ConnectionManager] Échec fetch tentative ${attempt}/${maxRetries}: ${error.message}`);
                
                // Si c'est la dernière tentative, propager l'erreur
                if (attempt === maxRetries) {
                    break;
                }
                
                // Attendre avant la prochaine tentative (délai exponentiel avec jitter)
                const jitter = Math.random() * 0.3 * delay;
                const waitTime = Math.min(delay + jitter, maxDelay);
                
                this.log(`⏱️ [ConnectionManager] Attente de ${Math.round(waitTime)}ms avant prochaine tentative`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // Augmenter le délai pour la prochaine tentative (backoff exponentiel)
                delay = Math.min(delay * 2, maxDelay);
            }
        }
        
        throw lastError;
    }

    /**
     * Journalisation conditionnelle
     * @param {string} message - Message à journaliser
     */
    log(message) {
        if (this.options.debug) {
            console.log(message);
        }
    }
}

// Créer et exporter une instance du gestionnaire de connexion
const connectionManager = new ConnectionManager({
    debug: true,
    pingInterval: 10000, // 10 secondes
    reconnectInterval: 5000, // 5 secondes
    maxReconnectAttempts: 5,
    onStatusChange: (isConnected, url) => {
        // Mettre à jour l'indicateur de statut dans l'UI
        const statusDot = document.getElementById('connection-indicator') || document.querySelector('.status-dot');
        const statusText = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
        
        if (statusDot) {
            statusDot.className = isConnected ? 'status-dot online' : 'status-dot offline';
        }
        
        if (statusText) {
            statusText.textContent = isConnected ? 'Système opérationnel' : 'Connexion perdue - Tentative de reconnexion...';
        }
        
        // Afficher une notification
        if (window.showNotification) {
            if (isConnected) {
                window.showNotification('Connexion au serveur rétablie', 'success');
            } else {
                window.showNotification('Connexion au serveur perdue - Tentative de reconnexion...', 'warning');
            }
        }
        
        // Déclencher un événement personnalisé
        window.dispatchEvent(new CustomEvent('backend:status', { 
            detail: { connected: isConnected, url: url }
        }));
    },
    onReconnectAttempt: (attempt, maxAttempts) => {
        const statusText = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
        
        if (statusText) {
            statusText.textContent = `Reconnexion... (${attempt}/${maxAttempts})`;
        }
    },
    onReconnectSuccess: (url) => {
        console.log(`✅ [ConnectionManager] Reconnexion réussie à ${url}`);
        
        // Redémarrer les EventSource
        if (window.restartSSEConnections) {
            window.restartSSEConnections();
        }
    },
    onReconnectFailure: () => {
        console.error('❌ [ConnectionManager] Échec de reconnexion après plusieurs tentatives');
        
        const statusText = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
        
        if (statusText) {
            statusText.textContent = 'Connexion perdue - Rafraîchir la page';
        }
        
        // Afficher une notification plus visible
        if (window.showNotification) {
            window.showNotification('Connexion au serveur perdue. Veuillez rafraîchir la page.', 'error', 0);
        }
    }
});

console.log('✅ [ConnectionManager] Module de gestion des connexions chargé');

// Exporter l'instance pour une utilisation globale
window.connectionManager = connectionManager;
