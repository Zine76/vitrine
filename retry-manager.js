/**
 * Module de gestion des tentatives de connexion avec backoff exponentiel
 * Ce script permet de réessayer automatiquement les appels API qui échouent
 * avec un délai croissant entre les tentatives
 */

// Configuration par défaut
const DEFAULT_CONFIG = {
    maxRetries: 3,              // Nombre maximum de tentatives
    initialDelay: 1000,         // Délai initial en ms (1 seconde)
    maxDelay: 10000,            // Délai maximum en ms (10 secondes)
    factor: 2,                  // Facteur multiplicatif pour le backoff exponentiel
    jitter: true,               // Ajouter un facteur aléatoire pour éviter les tempêtes de requêtes
    timeout: 10000,             // Timeout par défaut pour chaque requête (10 secondes)
    onRetry: null,              // Callback appelé avant chaque nouvelle tentative
    retryCondition: null        // Fonction pour déterminer si on doit réessayer (par défaut: toutes les erreurs)
};

/**
 * Effectue une requête fetch avec retry et backoff exponentiel
 * 
 * @param {string} url - L'URL à appeler
 * @param {Object} options - Les options fetch standard
 * @param {Object} retryOptions - Options spécifiques pour les retries
 * @returns {Promise} - La réponse fetch
 */
async function fetchWithRetry(url, options = {}, retryOptions = {}) {
    // Fusionner les configurations
    const config = { ...DEFAULT_CONFIG, ...retryOptions };
    
    // Initialiser le compteur de tentatives
    let retryCount = 0;
    let delay = config.initialDelay;
    
    // Fonction pour calculer le délai avant la prochaine tentative
    const getNextDelay = () => {
        // Calcul du délai avec backoff exponentiel
        const nextDelay = Math.min(delay * Math.pow(config.factor, retryCount), config.maxDelay);
        
        // Ajouter un jitter (±25%) si activé
        if (config.jitter) {
            const jitterFactor = 0.75 + Math.random() * 0.5; // Entre 0.75 et 1.25
            return Math.floor(nextDelay * jitterFactor);
        }
        
        return nextDelay;
    };
    
    // Fonction pour déterminer si on doit réessayer
    const shouldRetry = (error, response) => {
        // Si une condition personnalisée est fournie, l'utiliser
        if (config.retryCondition && typeof config.retryCondition === 'function') {
            return config.retryCondition(error, response);
        }
        
        // Par défaut, réessayer pour toutes les erreurs réseau et les codes 5xx
        if (error) return true;
        if (response && response.status >= 500 && response.status < 600) return true;
        
        return false;
    };
    
    // Boucle de tentatives
    while (true) {
        try {
            // Ajouter un timeout à la requête si non spécifié
            if (!options.signal) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.timeout);
                options.signal = controller.signal;
                
                // Nettoyer le timeout après la requête
                const originalSignal = options.signal;
                options.signal = AbortSignal.timeout(options.timeout || config.timeout);
            }
            
            // Effectuer la requête
            const response = await fetch(url, options);
            
            // Si la réponse n'est pas OK et qu'on devrait réessayer
            if (!response.ok && shouldRetry(null, response) && retryCount < config.maxRetries) {
                retryCount++;
                const nextDelay = getNextDelay();
                
                console.warn(`⚠️ [RetryManager] Tentative ${retryCount}/${config.maxRetries} échouée pour ${url} (statut: ${response.status}). Nouvelle tentative dans ${nextDelay}ms`);
                
                // Appeler le callback onRetry si défini
                if (config.onRetry && typeof config.onRetry === 'function') {
                    config.onRetry(retryCount, nextDelay, response);
                }
                
                // Attendre avant la prochaine tentative
                await new Promise(resolve => setTimeout(resolve, nextDelay));
                continue;
            }
            
            // Retourner la réponse (succès ou échec définitif)
            return response;
            
        } catch (error) {
            // Si c'est une erreur d'abandon (AbortError) et qu'on a atteint le nombre max de tentatives
            if (error.name === 'AbortError') {
                console.error(`❌ [RetryManager] Timeout de ${options.timeout || config.timeout}ms atteint pour ${url}`);
            }
            
            // Si on devrait réessayer et qu'on n'a pas atteint le nombre max de tentatives
            if (shouldRetry(error) && retryCount < config.maxRetries) {
                retryCount++;
                const nextDelay = getNextDelay();
                
                console.warn(`⚠️ [RetryManager] Tentative ${retryCount}/${config.maxRetries} échouée pour ${url} (erreur: ${error.message}). Nouvelle tentative dans ${nextDelay}ms`);
                
                // Appeler le callback onRetry si défini
                if (config.onRetry && typeof config.onRetry === 'function') {
                    config.onRetry(retryCount, nextDelay, null, error);
                }
                
                // Attendre avant la prochaine tentative
                await new Promise(resolve => setTimeout(resolve, nextDelay));
                continue;
            }
            
            // Si on a épuisé toutes les tentatives ou si l'erreur ne justifie pas de réessayer
            throw error;
        }
    }
}

/**
 * Version simplifiée de fetchWithRetry qui retourne directement les données JSON
 * 
 * @param {string} url - L'URL à appeler
 * @param {Object} options - Les options fetch standard
 * @param {Object} retryOptions - Options spécifiques pour les retries
 * @returns {Promise} - Les données JSON
 */
async function fetchJsonWithRetry(url, options = {}, retryOptions = {}) {
    // S'assurer que le Content-Type est défini pour les requêtes POST/PUT
    if ((options.method === 'POST' || options.method === 'PUT') && options.body && !options.headers) {
        options.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await fetchWithRetry(url, options, retryOptions);
    
    // Vérifier si la réponse est OK
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    // Vérifier si la réponse est vide
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        return await response.text();
    }
    
    return await response.json();
}

// Exposer les fonctions globalement
window.fetchWithRetry = fetchWithRetry;
window.fetchJsonWithRetry = fetchJsonWithRetry;

console.log('✅ [RetryManager] Module de gestion des tentatives chargé');
