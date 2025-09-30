// Configuration centralisée pour SAVQonnect
const CFG = {
    // URLs et endpoints
    RETOOL_PHONE_URL: "https://retool.dev.uqam.ca/phone/phone-join.html",
    API_BASE: null, // Sera détecté automatiquement par findWorkingBackend()
    
    // Note: Les URLs de fallback sont détectées automatiquement
    // Voir la fonction findWorkingBackend() pour plus de détails
    
    // Timeouts et TTL
    ROOM_TTL_MS: 15*60*1000,        // 15 minutes
    INACTIVITY_TIMEOUT_MS: 30*1000, // 30 secondes
    SSE_PING_MS: 25000,             // 25 secondes
    CONNECT_TIMEOUT_MS: 10000,      // 10 secondes pour PC sans TURN
    
    // Configuration TURN
    TURN_HOST: "10.206.173.56",
    TURN_PORT: 3478,
    TURN_USERNAME: "zine",
    TURN_CREDENTIAL: "ChangeMoi123!",
    
    // Fallback/toggles
    USE_TURN_FOR_PHONE: true,       // mode Phone: oui TURN
    USE_TURN_FOR_PC: false,         // mode PC: par défaut sans TURN (fallback)
    PUBLIC_STUN: "stun:stun.l.google.com:19302", // pour fallback PC
    
    // Configuration par défaut de la salle
    DEFAULT_ROOM: "UQAM-Salle-PA-204",
    
    // États de l'application
    STATES: {
        IDLE: 'idle',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        ENDING: 'ending',
        FAILED: 'failed'
    },
    
    // Types de messages SSE
    MESSAGE_TYPES: {
        CONNECTED: 'connected',
        OFFER: 'offer',
        ANSWER: 'answer',
        CANDIDATE: 'candidate',
        HANGUP: 'hangup',
        EXPIRED: 'expired',
        HEARTBEAT: 'heartbeat',
        PING: 'ping'
    }
};

// Fonction utilitaire pour obtenir la configuration ICE
async function getIceConfig(useTurn = true) {
    try {
        if (useTurn) {
            const response = await fetch(`${CFG.API_BASE}/webrtc/ice`);
            const data = await response.json();
            return data.iceServers;
        } else {
            // Fallback sans TURN
            return [{ urls: [CFG.PUBLIC_STUN] }];
        }
    } catch (error) {
        console.warn('Impossible d\'obtenir la configuration ICE, utilisation du fallback:', error);
        return [{ urls: [CFG.PUBLIC_STUN] }];
    }
}

// Fonction utilitaire pour vérifier si TURN est disponible
async function checkTurnAvailable() {
    try {
        const response = await fetch(`${CFG.API_BASE}/webrtc/ice`);
        const data = await response.json();
        return Array.isArray(data.iceServers) && 
               data.iceServers.some(s => 
                   Array.isArray(s.urls) && 
                   s.urls.some(url => url.includes('turn:'))
               );
    } catch (error) {
        console.warn('Impossible de vérifier TURN:', error);
        return false;
    }
}

// Fonction utilitaire pour créer une room
async function createRoom(salle, mode = 'phone') {
    const response = await fetch(`${CFG.API_BASE}/rtc/room`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ salle, mode })
    });
    
    if (!response.ok) {
        throw new Error(`Erreur lors de la création de la room: ${response.status}`);
    }
    
    return await response.json();
}

// Fonction utilitaire pour envoyer un signal
async function sendSignal(roomId, role, type, data) {
    const response = await fetch(`${CFG.API_BASE}/rtc/signal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            roomId,
            role,
            type,
            data
        })
    });
    
    if (!response.ok) {
        throw new Error(`Erreur lors de l'envoi du signal: ${response.status}`);
    }
}

// Fonction utilitaire pour créer une connexion SSE
function createSSEConnection(roomId, role) {
    return new EventSource(`${CFG.API_BASE}/rtc/sse?roomId=${roomId}&role=${role}`);
}

// Fonction pour détecter automatiquement l'IP locale
async function detectLocalIP() {
    try {
        // Utiliser WebRTC pour détecter l'IP locale
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        return new Promise((resolve) => {
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                    if (ipMatch && !ipMatch[1].startsWith('127.')) {
                        pc.close();
                        resolve(ipMatch[1]);
                    }
                }
            };
            
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            // Timeout après 2 secondes
            setTimeout(() => {
                pc.close();
                resolve(null);
            }, 2000);
        });
    } catch (error) {
        console.warn('Impossible de détecter l\'IP locale:', error);
        return null;
    }
}

// Fonction pour tester automatiquement les URLs de fallback
async function findWorkingBackend() {
    console.log('🔍 Test automatique des backends...');
    
    // Détecter l'IP locale actuelle
    const localIP = await detectLocalIP();
    console.log('📍 IP locale détectée:', localIP);
    
    // Construire la liste des URLs à tester (sans IPs statiques)
    const urlsToTest = [
        "http://localhost:7070",        // Localhost (priorité 1)
        "http://127.0.0.1:7070"        // IP locale (priorité 2)
    ];
    
    // Ajouter l'IP locale détectée si elle existe
    if (localIP) {
        urlsToTest.splice(1, 0, `http://${localIP}:7070`);
    }
    
    for (const url of urlsToTest) {
        try {
            console.log(`Test: ${url}`);
            const response = await fetch(`${url}/api/health`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(3000) // 3 secondes max
            });
            
            if (response.ok) {
                console.log(`✅ Backend trouvé: ${url}`);
                return url;
            }
        } catch (error) {
            console.log(`❌ ${url}: ${error.message}`);
        }
    }
    
    console.error('❌ Aucun backend accessible');
    return null;
}

// Fonction d'initialisation automatique
async function initializeConfig() {
    if (!CFG.API_BASE) {
        console.log('🚀 Initialisation automatique de la configuration...');
        CFG.API_BASE = await findWorkingBackend();
        
        if (CFG.API_BASE) {
            console.log('✅ Configuration initialisée avec:', CFG.API_BASE);
        } else {
            console.error('❌ Impossible d\'initialiser la configuration');
            // Fallback par défaut
            CFG.API_BASE = "http://localhost:7070";
        }
    }
    return CFG.API_BASE;
}

// Initialisation automatique au chargement
if (typeof window !== 'undefined') {
    // Initialiser automatiquement quand le script est chargé
    initializeConfig();
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CFG, getIceConfig, checkTurnAvailable, createRoom, sendSignal, createSSEConnection, initializeConfig };
}
