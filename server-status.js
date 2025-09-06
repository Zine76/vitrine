/**
 * Module de vérification de l'état du serveur pour Vitrine
 * Ce script permet de vérifier régulièrement la disponibilité des serveurs backend
 * et de basculer automatiquement entre les serveurs primaire et secondaire
 */

// Configuration
const SERVER_CHECK_INTERVAL = 15000; // 15 secondes
const SERVER_HEALTH_ENDPOINT = '/api/health';
const SERVER_STATUS_INDICATOR_ID = 'vitrineServerStatusIndicator';
const CONNECTION_TIMEOUT = 5000; // 5 secondes

// URLs des serveurs backend
const PRIMARY_SERVER_URL = 'http://C46928_DEE.ddns.uqam.ca:7070';
const FALLBACK_SERVER_URL = 'http://sav-atl-por-8.tail12c6c1.ts.net:7070';

// État global
let primaryServerOnline = false;
let fallbackServerOnline = false;
let activeServerUrl = null;
let lastCheckTime = 0;
let checkInProgress = false;
let retryCount = 0;
let monitorInterval = null;

// Initialisation du module
function initServerStatusMonitor() {
    console.log('🔌 [VitrineServerStatus] Initialisation du moniteur de statut serveur');
    
    // Créer l'indicateur visuel
    createStatusIndicator();
    
    // Vérifier l'état des serveurs immédiatement
    checkServersStatus();
    
    // Mettre en place une vérification périodique
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }
    monitorInterval = setInterval(checkServersStatus, SERVER_CHECK_INTERVAL);
    
    // Exposer les fonctions publiques
    window.getActiveServerUrl = getActiveServerUrl;
    window.isBackendAvailable = isBackendAvailable;
    window.forceServerCheck = forceServerCheck;
    
    console.log('✅ [VitrineServerStatus] Moniteur de statut serveur initialisé');
}

// Création de l'indicateur visuel
function createStatusIndicator() {
    // Vérifier si l'indicateur existe déjà
    if (document.getElementById(SERVER_STATUS_INDICATOR_ID)) {
        return;
    }
    
    // Créer l'élément d'indicateur
    const indicator = document.createElement('div');
    indicator.id = SERVER_STATUS_INDICATOR_ID;
    indicator.className = 'server-status-indicator checking';
    indicator.innerHTML = `
        <div class="status-dot"></div>
        <div class="status-text">Serveur: <span>Vérification...</span></div>
        <div class="server-url" title="URL du serveur actif"></div>
    `;
    
    // Appliquer les styles
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    
    // Ajouter des styles pour les éléments internes
    const style = document.createElement('style');
    style.textContent = `
        .server-status-indicator .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #f59e0b;
            transition: background-color 0.3s ease;
        }
        
        .server-status-indicator.online .status-dot {
            background-color: #10b981;
        }
        
        .server-status-indicator.offline .status-dot {
            background-color: #ef4444;
        }
        
        .server-status-indicator.checking .status-dot {
            background-color: #f59e0b;
            animation: pulse 1s infinite;
        }
        
        .server-status-indicator .server-url {
            font-size: 10px;
            opacity: 0.7;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-left: 5px;
        }
        
        .server-status-indicator:hover {
            background: rgba(0, 0, 0, 0.9);
            padding-right: 15px;
        }
        
        .server-status-indicator:hover .server-url {
            max-width: 300px;
        }
        
        @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
    `;
    
    // Ajouter l'indicateur et les styles au document
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    // Ajouter un gestionnaire d'événements pour forcer une vérification
    indicator.addEventListener('click', forceServerCheck);
}

// Mise à jour de l'indicateur visuel
function updateStatusIndicator(status, serverUrl) {
    const indicator = document.getElementById(SERVER_STATUS_INDICATOR_ID);
    if (!indicator) return;
    
    const statusText = indicator.querySelector('.status-text span');
    const serverUrlElement = indicator.querySelector('.server-url');
    
    switch (status) {
        case 'online':
            indicator.className = 'server-status-indicator online';
            statusText.textContent = 'En ligne';
            break;
        case 'offline':
            indicator.className = 'server-status-indicator offline';
            statusText.textContent = 'Hors ligne';
            break;
        case 'fallback':
            indicator.className = 'server-status-indicator online';
            statusText.textContent = 'Serveur secondaire';
            break;
        case 'checking':
            indicator.className = 'server-status-indicator checking';
            statusText.textContent = 'Vérification...';
            break;
    }
    
    if (serverUrl && serverUrlElement) {
        serverUrlElement.textContent = serverUrl;
        serverUrlElement.title = `URL active: ${serverUrl}`;
    }
}

// Vérification de l'état des serveurs
async function checkServersStatus(force = false) {
    // Éviter les vérifications simultanées
    if (checkInProgress && !force) return;
    
    // Éviter les vérifications trop fréquentes sauf si forcé
    const now = Date.now();
    if (!force && now - lastCheckTime < 5000) return;
    
    checkInProgress = true;
    lastCheckTime = now;
    
    // Mettre à jour l'indicateur
    updateStatusIndicator('checking');
    
    // Vérifier d'abord le serveur primaire
    primaryServerOnline = await checkServerHealth(PRIMARY_SERVER_URL);
    
    // Si le serveur primaire est en ligne, l'utiliser
    if (primaryServerOnline) {
        activeServerUrl = PRIMARY_SERVER_URL;
        updateStatusIndicator('online', PRIMARY_SERVER_URL);
        notifyServerChange(PRIMARY_SERVER_URL, true);
        retryCount = 0;
        checkInProgress = false;
        return;
    }
    
    // Sinon, vérifier le serveur secondaire
    fallbackServerOnline = await checkServerHealth(FALLBACK_SERVER_URL);
    
    if (fallbackServerOnline) {
        activeServerUrl = FALLBACK_SERVER_URL;
        updateStatusIndicator('fallback', FALLBACK_SERVER_URL);
        notifyServerChange(FALLBACK_SERVER_URL, true);
        retryCount = 0;
    } else {
        // Les deux serveurs sont hors ligne
        activeServerUrl = null;
        updateStatusIndicator('offline', 'Aucun serveur disponible');
        notifyServerChange(null, false);
        retryCount++;
        
        // Afficher une notification après plusieurs échecs
        if (retryCount === 3 && typeof window.showErrorNotification === 'function') {
            window.showErrorNotification('Connexion aux serveurs perdue. Les fonctionnalités de chat sont indisponibles.');
        }
    }
    
    checkInProgress = false;
}

// Vérification de la santé d'un serveur spécifique
async function checkServerHealth(serverUrl) {
    try {
        console.log(`🔍 [VitrineServerStatus] Vérification du serveur: ${serverUrl}`);
        
        // Ajouter un paramètre pour éviter la mise en cache
        const fullUrl = `${serverUrl}${SERVER_HEALTH_ENDPOINT}?t=${Date.now()}`;
        
        // Effectuer la requête avec un timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
        
        const response = await fetch(fullUrl, { 
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log(`✅ [VitrineServerStatus] Serveur en ligne: ${serverUrl}`);
            return true;
        } else {
            console.warn(`⚠️ [VitrineServerStatus] Serveur répond avec erreur: ${serverUrl} - ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ [VitrineServerStatus] Erreur de connexion au serveur ${serverUrl}:`, error);
        return false;
    }
}

// Notification de changement de serveur
function notifyServerChange(serverUrl, isOnline) {
    // Mettre à jour les variables globales si elles existent
    if (typeof window.API_BASE_URL !== 'undefined') {
        window.API_BASE_URL = serverUrl;
    }
    if (typeof window.currentAPI !== 'undefined') {
        window.currentAPI = serverUrl;
    }
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('server-status-change', { 
        detail: { 
            status: isOnline ? 'online' : 'offline',
            serverUrl: serverUrl
        } 
    }));
    
    // Redémarrer les connexions SSE si nécessaire
    if (isOnline && typeof window.restartSSEConnections === 'function') {
        setTimeout(() => {
            window.restartSSEConnections();
        }, 1000);
    }
}

// Fonction publique pour obtenir l'URL du serveur actif
function getActiveServerUrl() {
    return activeServerUrl;
}

// Fonction publique pour vérifier si un backend est disponible
function isBackendAvailable() {
    return primaryServerOnline || fallbackServerOnline;
}

// Fonction publique pour forcer une vérification des serveurs
function forceServerCheck() {
    console.log('🔄 [VitrineServerStatus] Vérification forcée des serveurs');
    checkServersStatus(true);
}

// Initialiser le moniteur quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServerStatusMonitor);
} else {
    initServerStatusMonitor();
}

console.log('✅ [VitrineServerStatus] Module de statut serveur chargé');
