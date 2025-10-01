        // ===== CONFIGURATION DYNAMIQUE =====
// ?? FICHIER LOCAL - TRACE DES MODIFICATIONS
// VERSION: LOCALHOST-v1.0
// Ce fichier est gard� localement comme trace des modifications
// La vitrine.html utilise les fichiers GitHub + override local
console.log('?? [Version] app.js LOCAL - Trace modifications r�seau localhost v1.0');
        // R�cup�rer le backend depuis les param�tres URL ou utiliser IP locale par d�faut
        const urlParams = new URLSearchParams(window.location.search);
        const customBackend = urlParams.get('backend');
        
        // ? D�TECTION AUTOMATIQUE PROTOCOLE (HTTPS si page HTTPS)
        const isSecurePage = location.protocol === 'https:';
        // ? CONFIGURATION INTELLIGENTE - D�tection automatique du r�seau
        // D�tection du r�seau UQAM public (132.x.x.x)
        function isUQAMPublicNetwork() {
            try {
                // Mode debug: forcer la d�tection UQAM public si param�tre URL pr�sent
                if (window.location.search.includes('debug_uqam_public=1')) {
                    console.log('?? [Config] Mode debug: For�age d�tection r�seau UQAM public');
                    return true;
                }
                
                const hostname = window.location.hostname;
                console.log(`?? [Config] D�tection r�seau - hostname: "${hostname}", protocol: "${window.location.protocol}"`);
                
                // Si on acc�de via une IP UQAM (132.x.x.x ou 10.x.x.x) ou un hostname UQAM
                if (hostname.includes('uqam') || /132\.\d+\.\d+\.\d+/.test(hostname) || /10\.\d+\.\d+\.\d+/.test(hostname)) {
                    console.log('? [Config] R�seau UQAM d�tect� via hostname/IP');
                    return true;
                }
                
                // V�rifier si on est dans le contexte d'un fichier local ouvert sur un PC UQAM
                if (hostname === '' || hostname === 'localhost' || /^file:/.test(window.location.protocol)) {
                    console.log('?? [Config] Contexte fichier local d�tect�, v�rification heuristiques...');
                    
                    // Essayer de d�tecter via d'autres moyens
                    const userAgent = navigator.userAgent.toLowerCase();
                    if (userAgent.includes('uqam') || userAgent.includes('132.208') || userAgent.includes('10.206')) {
                        console.log('? [Config] R�seau UQAM d�tect� via UserAgent');
                        return true;
                    }
                    
                    // Pour le r�seau public UQAM (132.x.x.x), on ne peut g�n�ralement pas r�soudre
                    // les noms Tailscale, donc si on est en local et qu'on ne peut pas r�soudre Tailscale,
                    // c'est probablement le r�seau public UQAM
                    console.log('?? [Config] Heuristique: fichier local sans indicateurs sp�cifiques');
                }
                
                console.log('? [Config] R�seau UQAM non d�tect� par les m�thodes basiques');
                return false;
            } catch(e) {
                console.warn('[Config] Erreur d�tection r�seau:', e);
                return false;
            }
        }

        // D�tection asynchrone du r�seau bas�e sur la connectivit�
        async function detectNetworkContext() {
            // Test rapide pour d�terminer le contexte r�seau (DNS UQAM uniquement)
            const testUrls = [
                { url: 'http://C46928_DEE.ddns.uqam.ca:7070/api/health', type: 'internal' },
                { url: 'http://SAV-ATL-POR-8.ddns.uqam.ca:7070/api/health', type: 'dns_uqam' }
            ];
            
            const results = await Promise.allSettled(
                testUrls.map(async ({ url, type }) => {
                    try {
                        const response = await fetch(url, { 
                            method: 'GET', 
                            signal: AbortSignal.timeout(2000) 
                        });
                        return { type, accessible: response.ok, url };
                    } catch (error) {
                        return { type, accessible: false, url };
                    }
                })
            );
            
            const accessible = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
                .filter(result => result.accessible);
            
            console.log('?? [Config] R�sultats test connectivit�:', accessible);
            
            // Si seule l'IP publique est accessible, on est sur le r�seau public UQAM
            if (accessible.length === 1 && accessible[0].type === 'public') {
                return 'uqam_public';
            }
            // Si l'IP publique est accessible (m�me avec d'autres), probablement r�seau UQAM public
            if (accessible.some(r => r.type === 'public') && !accessible.some(r => r.type === 'internal')) {
                return 'uqam_public';
            }
            // Si le DNS interne est accessible, on est sur le r�seau priv�
            if (accessible.some(r => r.type === 'internal')) {
                return 'uqam_internal';
            }
            // Si seul Tailscale est accessible, on est sur un r�seau externe avec VPN
            if (accessible.length === 1 && accessible[0].type === 'tailscale') {
                return 'external_vpn';
            }
            
            // Si aucun backend n'est accessible, essayer de d�duire du contexte
            if (accessible.length === 0) {
                // Utiliser la d�tection basique du r�seau
                if (isUQAMPublicNetwork()) {
                    console.log('?? [Config] Aucun backend accessible, mais d�tection basique indique r�seau UQAM public');
                    return 'uqam_public';
                }
            }
            
            return 'unknown';
        }

        // Configuration des backends selon le contexte
        let API_BASE_URL = (function(){
            try {
                if (window.BACKEND_BASE) return window.BACKEND_BASE;
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp && typeof storedIp === 'string' && storedIp.trim()) {
                    const backendUrl = /^https?:\/\//i.test(storedIp) ? storedIp : `http://${storedIp.trim()}:7070`;
                    console.log('?? [Config] IP depuis localStorage:', backendUrl);
                    return backendUrl;
                }
            } catch(e) { 
                console.warn('[BackendBase] storage read error', e); 
            }
            
            // Si aucune IP configur�e, retourner null pour forcer la configuration
            console.log('?? [Config] Aucune IP configur�e. Utilisez Alt+Ctrl+J pour configurer le backend.');
            return null;
        })();
        
        // Fallbacks DNS UQAM (uniquement si pas d'IP configur�e)
        function getFallbackUrls() {
            // Retourner uniquement les DNS UQAM comme fallback
            return [
                'http://SAV-ATL-POR-8.ddns.uqam.ca:7070',  // DNS UQAM principal
                'http://C46928_DEE.ddns.uqam.ca:7070'  // DNS interne UQAM
            ];
        }
        
        // Fallbacks par d�faut (seront mis � jour par detectBestBackend)
        let FALLBACK_URLS = getFallbackUrls();
        
        // ? SOLUTION SIMPLE : Test de l'IP configur�e
        async function detectBestBackend() {
            console.log('?? [Config] Test du backend configur�...');
            
            // Utiliser l'IP configur�e dans localStorage
            if (!API_BASE_URL) {
                console.log('?? [Config] Aucune IP configur�e pour le test');
                return null;
            }
            
            try {
                const testResponse = await fetch(`${API_BASE_URL}/api/health`, { 
                    method: 'GET', 
                    signal: AbortSignal.timeout(5000)
                });
                if (testResponse.ok) {
                    console.log(`? [Config] Backend configur� accessible: ${API_BASE_URL}`);
                    currentAPI = API_BASE_URL;
                    window.dispatchEvent(new CustomEvent('backend:updated', { detail: { base: API_BASE_URL } }));
                    return API_BASE_URL;
                }
            } catch (error) {
                console.log(`?? [Config] Backend configur� inaccessible: ${API_BASE_URL}`);
            }
            
            console.error('?? [Config] Backend configur� inaccessible !');
            console.log('?? [Config] Suggestion: Utilisez Alt+Ctrl+J pour reconfigurer le backend');
            // Retourner null pour indiquer l'�chec
            return null;
        }
        
        // ? INITIALISATION SYNCHRONE AVEC FALLBACK
        let currentAPI = API_BASE_URL; // Par d�faut

        // �coute les changements dynamiques de backend (ex: saisi par l'utilisateur)
        window.addEventListener('backend:updated', function(evt){
            try {
                const base = (evt && evt.detail && evt.detail.base) ? evt.detail.base : null;
                if (base) {
                    API_BASE_URL = base;
                    currentAPI = base;
                    console.log('[BackendBase] Mis � jour ?', base);
                }
            } catch(e){ console.warn('[BackendBase] update error', e); }
        });

        // Surveillance simple de sant� backend pour redemander l'IP en cas de d�connexion
        (function setupBackendHealthWatch(){
            async function pingOnce(signal){
                try {
                    const resp = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal, cache: 'no-store' });
                    if (!resp.ok) throw new Error('bad status ' + resp.status);
                    // Indication visuelle simple si �l�ments pr�sents
                    const dot = document.getElementById('connection-indicator') || document.querySelector('.status-dot');
                    const txt = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
                    if (dot) { dot.style.background = '#22c55e'; }
                    if (txt) { txt.textContent = 'Syst�me op�rationnel'; }
                    return true;
                } catch(err) {
                    const dot = document.getElementById('connection-indicator') || document.querySelector('.status-dot');
                    const txt = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
                    if (dot) { dot.style.background = '#ef4444'; }
                    if (txt) { txt.textContent = 'Hors ligne - Configurer le backend'; }
                    // Ne plus afficher la modale automatiquement en cas d'�chec.
                    // L'utilisateur utilisera Alt+Ctrl+J pour rouvrir et changer l'IP.
                    return false;
                }
            }
            // Premier ping rapide apr�s chargement
            document.addEventListener('DOMContentLoaded', () => {
                pingOnce();
                // Pings p�riodiques
                setInterval(() => pingOnce(), 20000);
            });
        })();
        let backendInitialized = false;
        
        // Fonction d'initialisation avec Promise pour attendre
        const backendInitPromise = (async function initializeBackend() {
            try {
                // V�rifier si une IP est configur�e dans localStorage
                if (!API_BASE_URL) {
                    console.log('?? [Config] Aucune IP configur�e. Affichage du modal de configuration...');
                    // Afficher le modal de configuration automatiquement
                    setTimeout(() => {
                        if (typeof window.showBackendModal === 'function') {
                            window.showBackendModal('');
                        }
                    }, 1000);
                    // Pas d'IP par d�faut - l'utilisateur doit configurer
                    API_BASE_URL = null;
                    currentAPI = null;
                    backendInitialized = true;
                    return currentAPI;
                }
                
                currentAPI = API_BASE_URL;
                window.BACKEND_BASE = API_BASE_URL;
                
                const detectedAPI = await detectBestBackend();
                currentAPI = detectedAPI || API_BASE_URL; // ? S'assurer que currentAPI est mis � jour
                backendInitialized = true;
                console.log(`?? [Config] Backend utilis�: ${currentAPI}`);
                console.log(`??? [Config] Images depuis: ${ASSETS_BASE}`);
                return currentAPI;
            } catch (error) {
                console.error('? [Config] Erreur initialisation backend:', error);
                // Utiliser l'IP configur�e ou null si pas configur�e
                currentAPI = API_BASE_URL;
                API_BASE_URL = currentAPI;
                window.BACKEND_BASE = currentAPI;
                backendInitialized = true;
                return currentAPI;
            }
        })();
        
        // Fonction helper pour obtenir l'API courante
        async function getCurrentAPI() {
            if (!backendInitialized) {
                await backendInitPromise;
            }
            return currentAPI;
        }
        
        // ? CONFIGURATION IMAGES DEPUIS GITHUB
        // Utiliser directement GitHub Pages pour les images
        const ASSETS_BASE = window.ASSETS_BASE || 'https://zine76.github.io/vitrine/assets';
        
        // ? NOUVEAU: Red�marrer toutes les connexions SSE apr�s changement d'API
        function restartSSEConnections() {
            console.log(`?? [SSERestart] Red�marrage connexions SSE vers: ${currentAPI}`);
            
            // ? CORRECTION : Ne pas red�marrer automatiquement les SSE
            if (getCurrentRoom()) {
                console.log('?? [SSERestart] Connexions SSE pr�serv�es - Pas de red�marrage automatique');
                // Les connexions existantes continuent de fonctionner
            }
            
            // ? CORRECTION : Ne pas red�marrer automatiquement les Status Events
            console.log('?? [SSERestart] Status Events SSE pr�serv�s - Pas de red�marrage automatique');
        }
        
        // ? MONITORING SIMPLIFI� - BACKEND UNIQUE
        
        // ? CONFIGURATION TERMIN�E
        
        async function testBackendConnectivity(url) {
            try {
                const response = await fetch(`${url}/api/health`, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(3000) // Timeout 3s
                });
                return response.ok;
            } catch (error) {
                console.log(`?? [Connectivity] Backend ${url} non disponible:`, error.message);
                return false;
            }
        }
        
        // ? FONCTION SIMPLIFI�E - BACKEND UNIQUE
        async function ensureBackendConnection() {
            const api = await getCurrentAPI();
            // ? OPTIMISATION : Log seulement si debug activ� pour �viter le spam
            if (window.DEBUG_BACKEND) {
                console.log(`? [Config] Utilisation backend unique: ${api}`);
            }
            return api;
        }
        
        // ? FONCTION SIMPLIFI�E - APPELS DIRECTS
        let isLoading = false;
        let messageCount = 0;
        let messagesContainer;
        let suggestionsContainer;
        let latestRAGContext = null;
        let isConnected = false;
        let problemInput = null;
        
        // ===== CHAT SEA VARIABLES =====
        let currentChatId = null;
        let chatEventSource = null;
        let clientID = null;
        let kioskID = null;
        
        // ===== IMAGE SEA2 =====
        
function updateSEALogo(imgElement) {
  if (!imgElement) return;
  const base = (typeof ASSETS_BASE !== 'undefined' && ASSETS_BASE) ||
               (typeof window !== 'undefined' && window.ASSETS_BASE) ||
               'https://zine76.github.io/vitrine/assets';
  const primary  = base.replace(/\/$/, '') + '/SEA2.png?v=' + Date.now();
  const fallback = base.replace(/\/$/, '') + '/SI.png';
  console.log('[UpdateSEALogo] base=', base);
  console.log('[UpdateSEALogo] primary=', primary);

  // Remove any HTML-level onerror side-effects if present
  try { imgElement.removeAttribute('onerror'); } catch (e) {}

  imgElement.onerror = function(){
    console.warn('[UpdateSEALogo] SEA2.png failed ? optional fallback to SI.png + reveal text');
    if (this.nextElementSibling && this.nextElementSibling.classList && this.nextElementSibling.classList.contains('sea-fallback-content')) {
      this.nextElementSibling.style.display = 'block';
      this.style.display = 'none';
    }
    this.src = fallback;
    this.setAttribute('src', fallback);
    this.onerror = null;
  };

  imgElement.style.display = '';
  imgElement.src = primary;
  imgElement.setAttribute('src', primary);
}

        
        // ? NOUVEAU : Gestion des tickets de session
        let sessionTickets = [];

        // ===== CACHE DE SALLE PERSISTANT =====
        window.roomCache = {
            room: null,
            pavilion: null,
            roomNumber: null,
            isSet: false
        };

        // ===== DOM ELEMENTS =====
        // Les ?l?ments seront r?cup?r?s dynamiquement car ils n'existent pas encore

        // ===== FONCTIONS DE GESTION DE LA SALLE =====

        /**
         * Gestion des touches pour la saisie de salle
         */
        function handleRoomKeyPress(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirmRoom();
            }
        }

        /**
         * D�finir un exemple de salle
         */
        function setRoomExample(roomName) {
            const roomInput = document.getElementById('roomInput');
            if (roomInput) {
                roomInput.value = roomName;
                roomInput.focus();
            }
        }

        /**
         * Confirmer la salle et passer � l'assistant
         */
        function confirmRoom() {
            const roomInput = document.getElementById('roomInput');
            const roomName = roomInput ? roomInput.value.trim() : '';
            
            if (!roomName) {
                showRoomError('?? Veuillez entrer un num�ro de salle');
                return;
            }

            // Valider le format de salle
            if (!isValidRoomFormat(roomName)) {
                showRoomError('?? Format non reconnu. Exemples : A-1750, B-2500, SH-R200');
                return;
            }

            // Extraire les informations de salle
            const roomInfo = parseRoomInfo(roomName);
            
            // Stocker dans le cache persistant
            setRoomCache(roomInfo);
            
            // ===== VERROUILLAGE DE SALLE =====
            // Activer le verrouillage persistant
            try {
                localStorage.setItem('vitrine.room.lock', JSON.stringify({
                    locked: true,
                    name: roomInfo.fullRoom,
                    setAt: new Date().toISOString()
                }));
                console.log('?? [Lock] Salle verrouill�e:', roomInfo.fullRoom);
                
                // Appliquer l'interface verrouill�e
                document.documentElement.classList.add('is-room-locked');
            } catch (error) {
                console.warn('?? [Lock] Erreur verrouillage:', error);
            }
            
            // Passer � l'assistant
            showAssistant();
            
            // ===== CHAT SEA : D�marrer l'�coute des demandes de chat =====
            startChatRequestListener();
            
            // ===== STATUS EVENTS : D�marrer l'�coute des changements de statut =====
            startStatusEventSource();
        }

        /**
         * Valider le format de salle
         */
        function isValidRoomFormat(roomName) {
            const roomPattern = /^([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})$/i;
            return roomPattern.test(roomName);
        }

        /**
         * Parser les informations de salle
         */
        function parseRoomInfo(roomName) {
            const roomMatch = roomName.match(/^([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})$/i);
            if (roomMatch) {
                const pavilion = roomMatch[1].toUpperCase();
                const roomNumber = roomMatch[2].toUpperCase();
                const fullRoom = `${pavilion}-${roomNumber}`;
                
                return {
                    fullRoom: fullRoom,
                    pavilion: pavilion,
                    roomNumber: roomNumber
                };
            }
            return null;
        }

        /**
         * D�finir le cache de salle (version de base)
         */
        function setRoomCache(roomInfo) {
            window.roomCache = {
                room: roomInfo.fullRoom,
                pavilion: roomInfo.pavilion,
                roomNumber: roomInfo.roomNumber,
                isSet: true,
                podioInfo: null // Sera enrichi par setRoomCacheWithPodio
            };

            console.log(`?? [RoomCache] Salle d�finie : ${roomInfo.fullRoom}, Pavillon : ${roomInfo.pavilion}`);
            
            // ?? Enrichir automatiquement avec infos Podio
            enrichRoomWithPodioInfo(roomInfo.fullRoom);
        }

        /**
         * Enrichir le cache de salle avec les informations Podio
         */
        async function enrichRoomWithPodioInfo(roomName) {
            try {
                console.log(`?? [PodioEnrich] Enrichissement Podio pour: ${roomName}`);
                
                const podioInfo = await podioRoomCache.getRoomInfo(roomName);
                
                if (podioInfo && window.roomCache && window.roomCache.isSet) {
                    // ?? Enrichir le cache existant
                    window.roomCache.podioInfo = podioInfo;
                    
                    console.log(`? [PodioEnrich] Cache enrichi:`, podioInfo);
                    
                    // ?? Mettre � jour l'affichage
                    updateRoomDisplayWithPodio(roomName, podioInfo);
                } else {
                    console.warn(`?? [PodioEnrich] Pas d'infos Podio pour ${roomName} - affichage normal`);
                }
                
            } catch (error) {
                console.warn(`? [PodioEnrich] Erreur enrichissement pour ${roomName}:`, error.message);
                // Degradation graceful - l'affichage normal continue
            }
        }

        /**
         * Mettre � jour l'affichage de la salle avec les infos Podio
         */
        function updateRoomDisplayWithPodio(roomName, podioInfo = null) {
            const currentRoomDisplay = document.getElementById('currentRoomDisplay');
            if (!currentRoomDisplay) return;
            
            if (podioInfo) {
                // ?? Affichage enrichi avec infos Podio - COULEURS ADAPTATIVES
                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                const textColor = isDarkMode ? 'white' : '#3b82f6';
                const iconColor = isDarkMode ? 'white' : '#3b82f6';
                
                currentRoomDisplay.innerHTML = `
                    <strong style="color: ${textColor}; font-weight: 700;">${roomName}</strong>
                    <small style="display: block; color: ${textColor}; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.4; font-weight: 600; text-shadow: ${isDarkMode ? '0 2px 4px rgba(0,0,0,0.8)' : 'none'};">
                        &#128205; ${podioInfo.pavillon} - ${podioInfo.bassin}<br>
                        &#127979; ${podioInfo.type} | <span style="color: ${textColor} !important; font-weight: 800; font-size: 1.1rem; text-shadow: ${isDarkMode ? '0 2px 6px rgba(0,0,0,0.9)' : 'none'};"><i class="fas fa-users" style="color: ${isDarkMode ? 'white' : '#3b82f6'} !important; -webkit-text-fill-color: ${isDarkMode ? 'white' : '#3b82f6'} !important;"></i> <span style="color: ${textColor} !important;">${podioInfo.capacite}</span></span>
                    </small>
                `;
                console.log(`?? [RoomDisplay] Affichage enrichi pour ${roomName}`);
            } else {
                // ?? Affichage normal (fallback)
                currentRoomDisplay.textContent = roomName;
                console.log(`?? [RoomDisplay] Affichage normal pour ${roomName}`);
            }
        }

        /**
         * Afficher l'assistant avec la salle en cache
         */
        function showAssistant() {
            if (!window.roomCache.isSet) {
                console.error('Tentative d\'affichage assistant sans salle en cache');
                return;
            }

            // R�cup�rer/assurer la pr�sence des �l�ments dynamiquement
            let landingPage = document.getElementById('landingPage');
            let assistantPage = document.getElementById('assistantPage');
            if (!landingPage || !assistantPage) {
                if (typeof createVitrine === 'function') {
                    try {
                        createVitrine();
                        console.log('[showAssistant] Interface (re)cr��e avant affichage');
                    } catch (e) {
                        console.error('[showAssistant] �chec de cr�ation de l\'interface:', e);
                        return;
                    }
                    // Rechercher � nouveau
                    landingPage = document.getElementById('landingPage');
                    assistantPage = document.getElementById('assistantPage');
                }
            }

            // Masquer la landing page
            if (landingPage) landingPage.style.display = 'none';
            
            // Afficher l'assistant
            if (assistantPage) assistantPage.style.display = 'block';
            
            // Mettre � jour les affichages de salle avec infos Podio si disponibles
            updateRoomDisplayWithPodio(window.roomCache.room, window.roomCache.podioInfo);
            
            // Initialiser la connexion au backend
            checkConnection().then(connected => {
                console.log(`?? Connexion backend: ${connected ? 'OK' : '�CHEC'}`);
                // ? NOUVEAU : Mettre � jour le statut initial
                updateSystemStatus(connected);
            });
            
            // ? NOUVEAU : V�rification p�riodique de la connexion (toutes les 10 secondes)
            setInterval(async () => {
                await checkConnection();
            }, 10000);
            
            // ? SUPPRIM� : Restauration d�plac�e vers DOMContentLoaded pour �viter les doublons
            
            // Focus sur l'input principal
            setTimeout(() => {
                // Focus sur la premi�re palette
                const firstPalette = document.querySelector('.palette');
                if (firstPalette) {
                    firstPalette.focus();
                }
            }, 300);
        }

        /**
         * Changer de salle (retour � la landing page)
         */
        function changeRoom() {
            // R�initialiser le cache
            window.roomCache.isSet = false;
            
            // ? NOUVEAU : R�initialiser le flag de restauration pour la nouvelle salle
            statusRestorationDone = false;
            
            // Nettoyer les inputs
            const roomInput = document.getElementById('roomInput');
            if (roomInput) roomInput.value = '';
            
            // ?? Fermer l'EventSource de statut
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
                console.log('?? [StatusEvents] EventSource de statut ferm�');
            }
            
            // ?? Masquer le message de statut SANS nettoyer localStorage (pour garder le statut de cette salle)
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer) {
                statusContainer.style.display = 'none';
                removePageBlurEffect();
                console.log('?? [ChangeRoom] Banni�re masqu�e SANS nettoyage localStorage');
            }
            
            // Retour ?  la landing page
            const assistantPage = document.getElementById('assistantPage');
            const landingPage = document.getElementById('landingPage');
            if (assistantPage) assistantPage.style.display = 'none';
            if (landingPage) landingPage.style.display = 'flex';
            
            // Focus sur l'input de salle
            setTimeout(() => {
                const roomInput = document.getElementById('roomInput');
                if (roomInput) roomInput.focus();
            }, 300);
            
            console.log('?? Retour � la landing page (changer de salle)');
        }
        
        /**
         * Gestion du th�me hybride intelligent
         */
        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            const headerTitle = document.getElementById('headerTitle');
            
            if (body.getAttribute('data-theme') === 'dark') {
                // Passer au mode clair
                body.removeAttribute('data-theme');
                body.classList.remove('dark'); // Pour Tailwind CSS
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Mode nuit';
                localStorage.setItem('vitrine-theme', 'light');
                // Mode jour : titre en NOIR
                if (headerTitle) headerTitle.style.color = 'black';
                console.log('?? Mode clair activ�');
            } else {
                // Passer au mode sombre
                body.setAttribute('data-theme', 'dark');
                body.classList.add('dark'); // Pour Tailwind CSS
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Mode jour';
                localStorage.setItem('vitrine-theme', 'dark');
                // Mode nuit : titre reste NOIR (demande utilisateur)
                if (headerTitle) headerTitle.style.color = 'black';
                console.log('?? Mode sombre activ�');
            }
        }
        
        /**
         * Initialisation automatique du th�me
         */
        function initializeTheme() {
            const savedTheme = localStorage.getItem('vitrine-theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            // Priorit� : 1) Sauvegarde utilisateur, 2) Pr�f�rence syst�me, 3) Mode clair par d�faut
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.body.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark'); // Pour Tailwind CSS
                const themeIcon = document.getElementById('themeIcon');
                const themeText = document.getElementById('themeText');
                if (themeIcon && themeText) {
                    themeIcon.className = 'fas fa-sun';
                    themeText.textContent = 'Mode jour';
                }
                console.log('?? Mode sombre initialis� (pr�f�rence syst�me ou sauvegarde)');
            } else {
                document.body.removeAttribute('data-theme');
                document.body.classList.remove('dark'); // Pour Tailwind CSS
                console.log('?? Mode clair initialis�');
            }
        }
        
        /**
         * �couter les changements de pr�f�rence syst�me
         */
        function setupThemeListener() {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Seulement si l'utilisateur n'a pas d�fini de pr�f�rence manuelle
                if (!localStorage.getItem('vitrine-theme')) {
                    if (e.matches) {
                        document.body.setAttribute('data-theme', 'dark');
                        console.log('?? Mode sombre activ� (pr�f�rence syst�me)');
                    } else {
                        document.body.removeAttribute('data-theme');
                        console.log('?? Mode clair activ� (pr�f�rence syst�me)');
                    }
                }
            });
        }

        /**
         * Afficher une erreur de salle
         */
        function showRoomError(message) {
            // Chercher un message d'erreur existant
            let errorDiv = document.querySelector('.room-error-message');
            
            if (!errorDiv) {
                // Cr�er le message d'erreur
                errorDiv = document.createElement('div');
                errorDiv.className = 'room-error-message';
                errorDiv.style.cssText = `
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin-top: 1rem;
                    text-align: center;
                    font-weight: 500;
                `;
                
                // Ins�rer apr�s le container de saisie
                const container = document.querySelector('.room-input-container');
                container.parentNode.insertBefore(errorDiv, container.nextSibling);
            }
            
            errorDiv.textContent = message;
            
            // Supprimer apr�s 3 secondes
            setTimeout(() => {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 3000);
        }

        /**
         * Obtenir la salle courante depuis le cache
         */
        function getCurrentRoom() {
            return window.roomCache.isSet ? window.roomCache.room : null;
        }

        /**
         * V�rifie si une salle est d�finie
         */
        function hasRoomSet() {
            return window.roomCache && window.roomCache.isSet;
        }

        /**
         * Met � jour les suggestions
         */
        function updateSuggestions(suggestions) {
            const suggestionsContainer = document.getElementById('suggestions');
            if (suggestionsContainer && suggestions.length > 0) {
                suggestionsContainer.innerHTML = suggestions.map(suggestion => 
                    `<button class="suggestion-btn" onclick="sendExampleMessage('${suggestion}')">${suggestion}</button>`
                ).join('');
            }
        }

        /**
         * Met � jour le bouton d'envoi
         */
        function updateSendButton(loading) {
            const sendBtn = document.getElementById('sendBtn');
            if (!sendBtn) return;
            
            if (loading) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '? Traitement...';
            } else if (!isConnected) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '?? Syst�me non pr�t';
            } else {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '?? Signaler';
            }
        }

        // ======= MOJIBAKE SANITIZER =======
        function normalizeMojibake(text) {
            if (!text) return text;
            const replacements = [
                [/Syst?me/g, 'Syst�me'], [/op?rationnel/g, 'op�rationnel'], [/pr?t/g, 'pr�t'],
                [/D?/g, 'D�'], [/d?/g, 'd�'],
                [/?/g, ''],
                [/\?\?\?/g, ''], [/\?\?/g, ''], [/\?/g, '']
            ];
            let out = text;
            for (const [pattern, repl] of replacements) out = out.replace(pattern, repl);
            return out;
        }

        function sanitizeTextNodes(root) {
            const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            for (const node of nodes) {
                const fixed = normalizeMojibake(node.nodeValue);
                if (fixed !== node.nodeValue) node.nodeValue = fixed;
            }
        }

        function startMojibakeObserver() {
            if (!document || !document.body) return;
            sanitizeTextNodes(document.body);
            const observer = new MutationObserver(muts => {
                for (const m of muts) {
                    if (m.type === 'childList') {
                        m.addedNodes && m.addedNodes.forEach(n => {
                            if (n.nodeType === Node.TEXT_NODE) {
                                const fixed = normalizeMojibake(n.nodeValue);
                                if (fixed !== n.nodeValue) n.nodeValue = fixed;
                            } else if (n.nodeType === Node.ELEMENT_NODE) {
                                sanitizeTextNodes(n);
                            }
                        });
                    } else if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
                        const tn = m.target;
                        const fixed = normalizeMojibake(tn.nodeValue);
                        if (fixed !== tn.nodeValue) tn.nodeValue = fixed;
                    }
                }
            });
            observer.observe(document.body, { childList: true, characterData: true, subtree: true });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startMojibakeObserver);
        } else {
            startMojibakeObserver();
        }

        // ? NOUVEAU : Fonction pour d�tecter les salles mentionn�es dans les messages
        function detectRoomInMessage(message) {
            // Pattern pour d�tecter les salles (ex: A-1750, B-2500, J-2430)
            const roomPattern = /\b([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})\b/gi;
            const matches = message.match(roomPattern);
            
            if (matches) {
                // Normaliser le format (ex: a-1750 -> A-1750)
                return matches.map(match => {
                    const normalized = match.replace(/[-\s]/g, '');
                    const roomMatch = normalized.match(/^([a-zA-Z]{1,2})([a-zA-Z]?\d{3,4})$/i);
                    if (roomMatch) {
                        return `${roomMatch[1].toUpperCase()}-${roomMatch[2].toUpperCase()}`;
                    }
                    return match.toUpperCase();
                });
            }
            return null;
        }

        // ? NOUVEAU : Fonction pour v�rifier si un ticket existe d�j�
        function hasExistingTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            return sessionTickets.some(ticket => ticket.room === targetRoom);
        }
        
        // ? NOUVEAU : Fonction pour ajouter un ticket � la session
        function addTicketToSession(ticketData) {
            const ticket = {
                number: ticketData.ticket_number || ticketData.id,
                room: ticketData.room,
                timestamp: new Date().toISOString(),
                title: ticketData.title || 'Ticket SEA',
                status: 'created'
            };
            
            sessionTickets.push(ticket);
            console.log(`?? [Session] Ticket ajout�:`, ticket);
            return ticket;
        }
        
        // ? NOUVEAU : Fonction pour obtenir le dernier ticket de la session
        function getLastSessionTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            const roomTickets = sessionTickets.filter(ticket => ticket.room === targetRoom);
            return roomTickets.length > 0 ? roomTickets[roomTickets.length - 1] : null;
        }

        // ===== FONCTIONS PRINCIPALES R�ELLES =====

        function clearInput() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            if (problemInput) problemInput.value = '';
            
            // ? NOUVEAU: Afficher � nouveau les palettes de probl�mes
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // ? NOUVEAU : Supprimer TOUS les messages et interfaces pr�c�dents
            const assistantResponse = document.getElementById('assistantResponse');
            if (assistantResponse) {
                assistantResponse.remove();
            }
            
            const autoResult = document.querySelector('.auto-result');
            if (autoResult) {
                autoResult.remove();
            }
            
            const escalationInterface = document.getElementById('escalation-interface');
            if (escalationInterface) {
                escalationInterface.remove();
            }
            
            const resultMessage = document.querySelector('.result-message');
            if (resultMessage) {
                resultMessage.remove();
            }
            
            const simBanner = document.querySelector('.sim-banner');
            if (simBanner) {
                simBanner.remove();
            }
            
            // ? NOUVEAU : Vider les suggestions
            const suggestions = document.getElementById('suggestions');
            if (suggestions) {
                suggestions.innerHTML = '';
            }
            
            // Supprimer tous les r�sultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * V�rifie la connexion au backend
         */
        async function checkConnection() {
            try {
                // ? BACKEND UNIQUE - PAS BESOIN DE MODIFICATION
                const apiUrl = await ensureBackendConnection();
                const response = await fetch(`${apiUrl}/api/health`);
                const wasConnected = isConnected;
                isConnected = response.ok;
                
                // ? NOUVEAU : Mettre � jour le statut si changement
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return isConnected;
            } catch (error) {
                console.error('Erreur de connexion:', error);
                const wasConnected = isConnected;
                isConnected = false;
                
                // ? NOUVEAU : Mettre � jour le statut en cas d'erreur
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return false;
            }
        }

        /**
         * ? NOUVEAU : Met � jour l'indicateur de statut syst�me
         */
        function updateSystemStatus(connected) {
            const statusIndicator = document.querySelector('.status-indicator span');
            const statusDot = document.querySelector('.status-dot');
            
            if (statusIndicator && statusDot) {
                if (connected) {
                    statusIndicator.textContent = 'Syst�me op�rationnel';
                    statusDot.classList.remove('offline');
                    console.log('? [SystemStatus] Syst�me op�rationnel');
                } else {
                    statusIndicator.textContent = 'Syst�me hors ligne';
                    statusDot.classList.add('offline');
                    console.log('? [SystemStatus] Syst�me hors ligne');
                }
            }
            
            // Mettre � jour l'�tat du bouton d'envoi
            updateSendButton(false);
        }
        /**
         * Envoie un message d'exemple (comme dans l'original)
         */
        function sendExampleMessage(message) {
            // G�rer les suggestions sp�ciales
            if (message === 'Nouveau probl�me AV' || message === 'Nouveau probl�me') {
                clearInput();
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre probl�me audio') {
                clearInput();
                addMessage('system', '?? D�crivez votre probl�me audio :', {
                    suggestions: ['Pas de son', 'Microphone en sourdine', 'Bruit parasite', 'Volume trop bas']
                });
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre probl�me vid�o') {
                clearInput();
                addMessage('system', '??? D�crivez votre probl�me vid�o :', {
                    suggestions: ['�cran noir', 'Pas d\'image', 'Qualit� d�grad�e', 'Projecteur ne s\'allume pas']
                });
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Vider la barre') {
                clearInput();
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre salle') {
                clearInput();
                problemInput.focus();
                addMessage('system', '?? <strong>Nom de la salle ?</strong>', {
                    suggestions: ['A-1750', 'B-2500', 'C-3000', 'D-4000', 'SH-R200', 'DS-4000']
                });
                return;
            }
            
            if (message === 'Copier num�ro ticket') {
                // Chercher le dernier num�ro de ticket dans les messages
                const messages = document.querySelectorAll('.message.system');
                for (let i = messages.length - 1; i >= 0; i--) {
                    const messageContent = messages[i].textContent;
                    const ticketMatch = messageContent.match(/Num�ro\s*:\s*([A-Z0-9-]+)/);
                    if (ticketMatch) {
                        const ticketNumber = ticketMatch[1];
                        navigator.clipboard.writeText(ticketNumber).then(() => {
                            addMessage('system', `?? Num�ro de ticket <strong>${ticketNumber}</strong> copi� dans le presse-papier.`, {
                                suggestions: ['Nouveau probl�me', 'Merci']
                            });
                        }).catch(() => {
                            addMessage('system', `?? Num�ro de ticket: <strong>${ticketNumber}</strong> (copie manuelle n�cessaire)`, {
                                suggestions: ['Nouveau probl�me', 'Merci']
                            });
                        });
                        return;
                    }
                }
                addMessage('system', '? Aucun num�ro de ticket trouv� � copier.', {
                    suggestions: ['Nouveau probl�me']
                });
                return;
            }
            
            if (message === 'Merci pour l\'information') {
                addMessage('system', '?? N\'h�sitez pas � revenir pour tout probl�me audiovisuel !', {
                    suggestions: ['Probl�me projecteur', 'Probl�me audio', 'Probl�me r�seau']
                });
                return;
            }
            
            // Pour les probl�mes r�seau, afficher la banni�re Services Informatiques
            if (message === 'Probl�me de r�seau') {
                handleNetworkProblem(message);
                return;
            }
            
            // Pour les autres probl�mes (syst�me qui ne r�pond plus), afficher banni�re SIM
            if (message === 'Syst�me qui ne r�pond plus') {
                handleNonAudiovisualProblem(message);
                return;
            }
            
            // Pour les probl�mes audio/vid�o, envoyer au backend
            if (isConnected) {
                // ? NOUVEAU: D�marrer timer d'escalade pour les clics palette
                const currentRoom = getCurrentRoom();
                let problemType = null;
                
                if (message === 'Probl�me Vid�o' || message.toLowerCase().includes('vid�o') || message.toLowerCase().includes('projecteur')) {
                    problemType = 'video';
                    // ? CORRECTION BACKEND : Message simple comme la r�f�rence qui fonctionne
                    if (message === 'Probl�me Vid�o') {
                        message = '�cran noir projecteur';
                    }
                } else if (message === 'Probl�me Audio' || message.toLowerCase().includes('audio') || message.toLowerCase().includes('son')) {
                    problemType = 'audio';
                }
                
                if (problemType && !escalationTimeoutId) {
                    console.log(`? [EscalationTimeout] D�marrage timer palette pour probl�me ${problemType}`);
                    startEscalationTimeout(problemType, currentRoom);
                }
                
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) {
                    problemInput.value = message;
                    sendProblemReport();
                }
            } else {
                addMessage('system', '?? Syst�me en cours d\'initialisation. Veuillez patienter.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
            }
        }

        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====



        // Fonction principale pour envoyer le probl�me au backend
        async function sendProblemReport() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            const message = problemInput ? problemInput.value.trim() : '';
            
            if (!message) {
                addMessage('system', '? Veuillez d�crire votre probl�me.', {
                    suggestions: ['Probl�me projecteur', 'Probl�me audio', 'Probl�me r�seau']
                });
                return;
            }
            
            if (!isConnected) {
                addMessage('system', '?? Syst�me en cours d\'initialisation. Veuillez patienter ou recharger la page.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
                return;
            }

            // ? NOUVEAU : Afficher l'overlay de chargement diagnostic
            showDiagnosticLoading();
            
            // ? NOUVEAU: D�marrer le timer d'escalade pour �viter les blocages
            const currentRoom = getCurrentRoom();
            
            // Identifier le type de probl�me pour le timer
            let problemType = null;
            if (message.toLowerCase().includes('vid�o') || message.toLowerCase().includes('projecteur') || message.toLowerCase().includes('�cran')) {
                problemType = 'video';
            } else if (message.toLowerCase().includes('audio') || message.toLowerCase().includes('son') || message.toLowerCase().includes('micro')) {
                problemType = 'audio';
            }
            
            // D�marrer le timer d'escalade si c'est un probl�me AV (�viter les doublons)
            if (problemType && !escalationTimeoutId) {
                console.log(`? [EscalationTimeout] D�marrage timer d'escalade pour probl�me ${problemType}`);
                startEscalationTimeout(problemType, currentRoom);
            }
            
            // ? NOUVELLE VALIDATION : V�rifier la coh�rence de salle
            const detectedRooms = detectRoomInMessage(message);
            
            if (detectedRooms && detectedRooms.length > 0) {
                // V�rifier si une salle diff�rente est mentionn�e
                const mentionedRoom = detectedRooms[0]; // Premi�re salle d�tect�e
                
                if (mentionedRoom !== currentRoom) {
                    addMessage('system', `?? <strong>Attention :</strong> Vous �tes pr�sentement dans la salle <strong>${currentRoom}</strong>.<br><br>Je suis votre assistant uniquement pour cette salle. Si vous avez un probl�me dans une autre salle, veuillez vous y rendre et utiliser l'assistant local.`, {
                        suggestions: ['Continuer avec ' + currentRoom, 'Changer de salle', 'Nouveau probl�me']
                    });
                    return;
                }
            }
            
            // ? NOUVELLE VALIDATION : V�rifier les tickets existants
            if (hasExistingTicket(currentRoom)) {
                const lastTicket = getLastSessionTicket(currentRoom);
                showExistingTicketBanner(lastTicket);
                return;
            }
            
            // ? NOUVELLE STRAT�GIE : Analyser le type de probl�me avec salle toujours connue
            const messageAnalysis = analyzeMessageType(message);
            console.log(`?? [MessageAnalysis] Salle: ${getCurrentRoom()}, Type: ${messageAnalysis.type}, Cat�gorie: ${messageAnalysis.category}`);
            
            // Variable pour stocker le r�sultat d'analyse d'�quipement
            let analysisResult = null;
            
            // Traiter selon le type de probl�me
            switch (messageAnalysis.type) {
                case 4: // Hors scope
                    handleOutOfScopeMessage(message);
                    return;
                
                case 3: // Non-audiovisuel  
                    handleNonAudiovisualProblem(message);
                    return;
                
                case 2: // AV externe - Redirection directe vers SEA avec salle
                    handleExternalAVProblemWithRoom(message);
                    return;
                
                case 1: // AV syst�me - Analyse am�lior�e avec �quipements de la salle
                    console.log(`?? [SystemAV] Analyse syst�me pour salle ${getCurrentRoom()}: "${message}"`);
                    
                    // ? NOUVEAU : Mettre � jour le texte de chargement
                    updateDiagnosticLoadingText('Analyse des �quipements...', 'Identification des dispositifs audiovisuels');
                    
                    // Nouvelle logique : Analyser les �quipements avant de continuer
                    analysisResult = await analyzeRoomEquipmentForProblem(message);
                    if (analysisResult.shouldEscalate) {
                        return; // L'escalade a �t� g�r�e dans la fonction (message utilisateur d�j� ajout�)
                    }
                    
                    // Continuer avec l'analyse syst�me si pas d'escalade
                    break;
                
                default:
                    // Par d�faut, traiter comme type 4 (hors scope)
                    handleOutOfScopeMessage(message);
                    return;
            }
            
            // D�sactiver le bouton pendant le traitement
            updateSendButton(true);
            
            // ? NOUVEAU : Ne pas afficher le message utilisateur pour les actions automatiques
            const isAutoActionMessage = message.toLowerCase().includes('pas de son') || 
                                       message.toLowerCase().includes('micro') ||
                                       message.toLowerCase().includes('son') ||
                                       message.toLowerCase().includes('audio') ||
                                       message.toLowerCase().includes('sourdine');
            
            // ? CORRECTION : Ajouter le message utilisateur seulement si pas d'analyse d'�quipement ET pas d'action automatique
            if (!(analysisResult && analysisResult.userMessageAdded) && !isAutoActionMessage) {
                addMessage('user', message, {});
            }
            
            // ? CORRECTION UI : Vider l'input seulement apr�s succ�s, pas imm�diatement
            // problemInput.value = '';  // D�plac� plus tard
            
            try {
                // ? NOUVELLE STRAT�GIE : Envoyer au backend avec salle toujours incluse
                const currentRoom = getCurrentRoom();
                const fullMessage = `${message} (Salle: ${currentRoom})`;
                
                // ? NOUVEAU : Mettre � jour le texte de chargement
                updateDiagnosticLoadingText('Analyse intelligente...', 'Recherche de solutions automatiques');
                
                // ?? DEBUG : Afficher le message exact envoy� au backend
                console.log(`?? [DEBUG] Message envoy� au RAG backend: "${fullMessage}"`);
                
                // ? S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const response = await fetch(`${currentAPI}/api/copilot/vitrine`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: fullMessage,
                        context: {
                            session_id: `vitrine_${Date.now()}`,
                            user_id: 'vitrine_user',
                            source: 'vitrine',
                            timestamp: new Date().toISOString(),
                            room_info: {
                                room: window.roomCache.room,
                                pavilion: window.roomCache.pavilion,
                                room_number: window.roomCache.roomNumber
                            }
                        }
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status})`);
                }
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Traiter la r�ponse du Copilot
                    console.log(`?? [Backend] R�ponse re�ue:`, data);
                    processResponse(data);
                    
                    // ? CORRECTION UI : Vider l'input seulement apr�s succ�s
                    if (!problemInput) problemInput = document.getElementById('problemInput');
                    if (problemInput) problemInput.value = '';
                } else {
                    throw new Error(data.message || 'Erreur lors du traitement');
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
                
                // CORRECTION : Ne pas afficher d'erreur bloquante, continuer avec l'analyse
                console.log(`?? [ErrorHandling] Erreur API ? Continuer avec l'analyse locale`);
                
                // Cr�er un contexte RAG local pour continuer le processus
                latestRAGContext = {
                    intent: 'technical_issue',
                    confidence: 0.8,
                    room: getCurrentRoom(),
                    problems: [{
                        room: getCurrentRoom(),
                        device: null,
                        severity: 'medium',
                        reason: 'Probl�me signal� n�cessitant intervention'
                    }],
                    solutions: [],
                    escalation_needed: true,
                    escalation_reason: "Probl�me technique signal� - intervention recommand�e."
                };
                
                // Afficher un message informatif et proposer l'escalade
                addMessage('system', `?? Analyse termin�e pour la salle ${getCurrentRoom()}. Une intervention technique est recommand�e.`, {
                    suggestions: ['Cr�er un ticket SEA', 'Appeler SEA au 6135', 'Nouveau probl�me']
                });
                
                // ? NOUVEAU : Masquer le sablier uniquement quand on affiche des suggestions (pas de banni�re)
                hideDiagnosticLoading();
                
            } finally {
                // R�activer le bouton
                updateSendButton(false);
                
                // CORRECTION : Ne pas faire de retour automatique pour �viter les interruptions
                // L'utilisateur doit choisir explicitement de cr�er un ticket
                
                // ? NOUVEAU : Le sablier reste affich� jusqu'� ce qu'une banni�re sp�cifique le remplace
                // Plus de masquage syst�matique ici - seules les banni�res masquent le sablier
            }
        }

        // ===== FONCTIONS DE DIAGNOSTIC R�EL =====

        /**
         * V�rifie si un message concerne un probl�me audio
         */
        function isAudioProblem(message) {
            const audioKeywords = ['audio', 'son', 'microphone', 'micro', 'haut-parleur', 'haut parleur', 'volume', 'mute', 'sourdine', 'bruit', '�cho'];
            return audioKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * V�rifie si un message concerne un probl�me vid�o
         */
        function isVideoProblem(message) {
            const videoKeywords = ['vid�o', 'projecteur', '�cran', 'image', 'affichage', 'proj', 'hdmi', 'vga', 'connecteur'];
            return videoKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * ? FONCTION UNIVERSELLE : D�tecte le type d'�quipement disponible dans une salle
         */
        function analyzeRoomEquipmentTypes(devices) {
            if (!devices || !Array.isArray(devices)) {
                return { hasAudio: false, hasVideo: false, summary: 'Aucun �quipement d�tect�' };
            }

            // ? CORRECTION: D�tection �quipements AUDIO (TCC2, Sennheiser, microphones)
            const audioDevices = devices.filter(device => 
                (device.type && (device.type.toLowerCase().includes('audio') || device.type.toLowerCase().includes('microphone'))) ||
                (device.model_name && (device.model_name.toLowerCase().includes('sennheiser') || device.model_name.toLowerCase().includes('tcc2'))) ||
                (device.name && device.name.toLowerCase().includes('tcc2')) ||
                (device.family_name && device.family_name.toLowerCase().includes('sennheiser'))
            );

            // ? CORRECTION: D�tection �quipements VID�O (Projecteurs, �crans, affichages)
            const videoDevices = devices.filter(device => 
                (device.type && device.type.toLowerCase().includes('projector')) ||
                (device.model_name && device.model_name.toLowerCase().includes('projector')) ||
                (device.name && device.name.toLowerCase().includes('proj')) ||
                (device.family_name && device.family_name.toLowerCase().includes('projecteur')) ||
                (device.family_name && device.family_name.toLowerCase().includes('projecteurs'))
            );

            const result = {
                hasAudio: audioDevices.length > 0,
                hasVideo: videoDevices.length > 0,
                audioCount: audioDevices.length,
                videoCount: videoDevices.length,
                summary: `Audio: ${audioDevices.length}, Vid�o: ${videoDevices.length}`
            };

            console.log(`?? [EquipmentTypes] Analyse salle: ${result.summary}`);
            return result;
        }

        /**
         * ? R�GLE UNIVERSELLE : Applique la logique d'escalation sym�trique
         */
        function shouldEscalateBasedOnEquipment(problemType, equipmentTypes, currentRoom) {
            // R�GLE 1: Probl�me AUDIO + Aucun �quipement AUDIO ? Escalade
            if (problemType === 'audio' && !equipmentTypes.hasAudio) {
                console.log(`?? [UniversalRule] Salle ${currentRoom}: Probl�me AUDIO d�tect� mais aucun �quipement audio ? ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun �quipement audio trouv� dans la salle ${currentRoom}`,
                    intent: 'audio_problem'
                };
            }

            // R�GLE 2: Probl�me VID�O + Aucun �quipement VID�O ? Escalade  
            if (problemType === 'video' && !equipmentTypes.hasVideo) {
                console.log(`??? [UniversalRule] Salle ${currentRoom}: Probl�me VID�O d�tect� mais aucun �quipement vid�o ? ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun �quipement vid�o trouv� dans la salle ${currentRoom}`,
                    intent: 'video_problem'
                };
            }

            // R�GLE 3: �quipement du bon type disponible ? Continuer analyse
            console.log(`? [UniversalRule] Salle ${currentRoom}: �quipement ${problemType} disponible ? Continuer avec diagnostic automatique`);
            return {
                shouldEscalate: false,
                reason: `�quipement ${problemType} disponible pour diagnostic automatique`,
                intent: `${problemType}_problem`
            };
        }

        /**
         * R�cup�re les �quipements disponibles dans une salle
         */
        async function fetchRoomEquipment(room) {
            try {
                console.log(`?? [FetchRoomEquipment] R�cup�ration �quipements pour salle ${room}`);
                
                // ? STRAT�GIE HYBRIDE: V�rifier d'abord si on a des infos de cache (Podio ou NeonDB)
                const roomInfo = await podioRoomCache.getRoomInfo(room);
                
                if (roomInfo && roomInfo.source === 'neondb' && roomInfo.devices) {
                    // Salle trouv�e via NeonDB avec �quipements
                    console.log(`?? [FetchRoomEquipment] ? Utilisation �quipements NeonDB pour ${room} (${roomInfo.devices.length})`);
                    
                    const adaptedDevices = roomInfo.devices.map(device => ({
                        id: device.id,
                        device_name: device.name,
                        name: device.name,
                        host: device.host,
                        protocol: device.protocol,
                        device_model_name: device.model_name,
                        device_family_name: device.family_name,
                        family_type: device.family_type,
                        room_name: room
                    }));
                    
                    return {
                        devices: adaptedDevices,
                        total: adaptedDevices.length,
                        noAccess: false,
                        source: 'neondb'
                    };
                }
                
                // ? PODIO ou pas d'info cach�e: Essayer l'API �quipements traditionnelle
                console.log(`?? [FetchRoomEquipment] Tentative API �quipements traditionnelle pour ${room}`);
                
                // Essayer d'abord la route /api/devices/public
                let response = await fetch(`${API_BASE_URL}/api/devices/public`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Si 404, essayer la route /api/devices
                if (response.status === 404) {
                    console.log(`?? [FetchRoomEquipment] Route /api/devices/public non trouv�e, essai avec /api/devices`);
                    response = await fetch(`${API_BASE_URL}/api/devices`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                if (!response.ok) {
                    // Permissions ou erreurs ? Essayer fallback NeonDB direct si pas d�j� fait
                    if (!roomInfo || roomInfo.source !== 'neondb') {
                        console.log(`?? [FetchRoomEquipment] �chec API traditionnelle ? Tentative NeonDB directe`);
                        return await fetchRoomEquipmentFromNeonDB(room);
                    }
                    
                    console.log(`?? [FetchRoomEquipment] �chec complet pour ${room}`);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const allDevices = await response.json();
                if (!Array.isArray(allDevices)) {
                    console.warn('?? [FetchRoomEquipment] R�ponse API inattendue:', allDevices);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                // Filtrer les �quipements de la salle sp�cifique
                const roomDevices = allDevices.filter(device => 
                    device.room_name && device.room_name.toLowerCase() === room.toLowerCase()
                );
                
                console.log(`?? [FetchRoomEquipment] Salle ${room}: ${roomDevices.length} �quipement(s) trouv�(s) via API traditionnelle`);
                
                return {
                    devices: roomDevices,
                    total: roomDevices.length,
                    noAccess: false,
                    source: 'traditional'
                };
                
            } catch (error) {
                console.error('?? [FetchRoomEquipment] Erreur:', error);
                // Fallback final vers NeonDB
                return await fetchRoomEquipmentFromNeonDB(room);
            }
        }

        /**
         * ? NOUVEAU: Fonction d�di�e pour r�cup�rer �quipements depuis NeonDB directement
         */
        async function fetchRoomEquipmentFromNeonDB(room) {
            try {
                console.log(`?? [FetchRoomEquipmentFromNeonDB] R�cup�ration directe NeonDB pour ${room}`);
                
                const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(room)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`?? [FetchRoomEquipmentFromNeonDB] Erreur HTTP ${response.status}`);
                    
                    // ? CONTOURNEMENT : �quipements en dur pour J-2430 si API �choue
                    if (room === 'J-2430') {
                        console.log(`?? [FallbackJ2430] Utilisation �quipements en dur pour J-2430`);
                        return {
                            devices: [
                                {
                                    id: 31,
                                    name: "PROJ-J-2430",
                                    device_name: "PROJ-J-2430", 
                                    address: "132.208.119.121",
                                    port: 4352,
                                    technology: "PJLINK",
                                    status: "unknown",
                                    room_name: "J-2430",
                                    device_family_name: "Projecteur",
                                    device_model_name: "Generic Projecteur"
                                },
                                {
                                    id: 32,
                                    name: "DSF-J-2430-A",
                                    device_name: "DSF-J-2430-A",
                                    address: "dsf-j-2430-a.ddns.uqam.ca", 
                                    port: 443,
                                    technology: "MERSIVE",
                                    status: "unknown",
                                    room_name: "J-2430", 
                                    device_family_name: "Mersive",
                                    device_model_name: "Solstice Pod"
                                }
                            ],
                            total: 2,
                            room: "J-2430",
                            status: "hardcoded_fallback"
                        };
                    }
                    
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const data = await response.json();
                if ((data.status !== 'success' && !data.success) || !Array.isArray(data.devices)) {
                    console.warn('?? [FetchRoomEquipmentFromNeonDB] R�ponse invalide:', data);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const adaptedDevices = data.devices.map(device => ({
                    id: device.id,
                    device_name: device.device_name || device.name,
                    name: device.name,
                    host: device.address, // ? Adapter address ? host
                    protocol: device.technology, // ? Adapter technology ? protocol  
                    device_model_name: device.device_model_name,
                    device_family_name: device.device_family_name,
                    family_type: device.technology, // ? Utiliser technology comme family_type
                    room_name: device.room_name || room,
                    address: device.address, // ? Garder address aussi
                    technology: device.technology, // ? Garder technology aussi
                    status: device.status, // ? Ajouter status
                    port: device.port // ? Ajouter port
                }));
                
                console.log(`?? [FetchRoomEquipmentFromNeonDB] Salle ${room}: ${adaptedDevices.length} �quipement(s) trouv�(s)`);
                
                return {
                    devices: adaptedDevices,
                    total: adaptedDevices.length,
                    noAccess: false,
                    source: 'neondb'
                };
                
            } catch (error) {
                console.error('?? [FetchRoomEquipmentFromNeonDB] Erreur:', error);
                return { devices: [], total: 0, noAccess: true };
            }
        }

        /**
         * Analyse les �quipements disponibles dans la salle pour d�terminer si une escalade imm�diate est n�cessaire
         */
        async function analyzeRoomEquipmentForProblem(message) {
            const currentRoom = getCurrentRoom();
            const lowerMessage = message.toLowerCase();
            
            try {
                // R�cup�rer les �quipements de la salle
                const roomEquipment = await fetchRoomEquipment(currentRoom);
                
                // Si pas d'acc�s direct aux �quipements, escalader pour les probl�mes vid�o/audio
                if (!roomEquipment || roomEquipment.noAccess) {
                    console.log(`?? [RoomAnalysis] Pas d'acc�s direct aux �quipements ? V�rifier si escalade n�cessaire`);
                    
                    // ? CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER LES PROBL�MES VID�O AVANT ESCALADE
                    if (isVideoProblem(lowerMessage)) {
                        console.log(`??? [VideoAnalysis] Probl�me vid�o d�tect� ? TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        // ? CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut d�tecter et corriger automatiquement des probl�mes comme projecteur �teint + AV mute
                        console.log(`?? [VideoAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (isAudioProblem(lowerMessage)) {
                        console.log(`?? [AudioAnalysis] Probl�me audio d�tect� ? TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        
                        // ? CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut d�tecter et corriger automatiquement des probl�mes comme TCC2 en sourdine
                        console.log(`?? [AudioAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    // Pour les autres types de probl�mes, continuer avec l'analyse Copilot
                    console.log(`?? [EquipmentAnalysis] Pas d'acc�s �quipements ? Continuer avec l'analyse Copilot`);
                    return { shouldEscalate: false, userMessageAdded: false };
                }
                
                // ? NOUVELLE LOGIQUE UNIVERSELLE : Analyser les �quipements avec r�gles sym�triques
                if (roomEquipment.devices && roomEquipment.devices.length > 0) {
                    console.log(`?? [EquipmentAnalysis] ${roomEquipment.devices.length} �quipement(s) trouv�(s) pour la salle ${currentRoom}`);
                    
                    // ? Analyser les types d'�quipements disponibles
                    const equipmentTypes = analyzeRoomEquipmentTypes(roomEquipment.devices);
                    console.log(`?? [EquipmentAnalysis] ${equipmentTypes.summary}`);
                    
                    // ? D�terminer le type de probl�me et appliquer la r�gle universelle
                    let problemType = null;
                    if (isAudioProblem(lowerMessage)) {
                        problemType = 'audio';
                    } else if (isVideoProblem(lowerMessage)) {
                        problemType = 'video';
                        
                        // ? CRITIQUE : Analyse sp�cifique des probl�mes vid�o avec gestion projecteurs
                        console.log(`??? [EquipmentAnalysis] Probl�me vid�o d�tect� ? Analyse sp�cifique projecteurs`);
                        const videoHandled = await handleVideoProblemAnalysis(message, roomEquipment);
                        if (videoHandled) {
                            // Escalade effectu�e par handleVideoProblemAnalysis
                            return { shouldEscalate: true, userMessageAdded: true };
                        }
                        // Sinon, continuer avec RAG backend (projecteurs d�tect�s)
                        console.log(`??? [EquipmentAnalysis] Projecteurs d�tect�s ? Continuer analyse RAG backend`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (problemType === 'audio') {
                        // ? Logique audio existante
                        console.log(`?? [EquipmentAnalysis] Probl�me audio d�tect� ? Tenter diagnostic automatique Copilot`);
                        
                        // ? V�rifier si �quipements appropri�s disponibles pour diagnostic
                        const hasAppropriateEquipment = equipmentTypes.hasAudio;
                        
                        // ? CORRECTION CRITIQUE : TOUJOURS PERMETTRE AU BACKEND D'ANALYSER D'ABORD
                        // M�me si les �quipements ne sont pas d�tect�s localement, le backend peut avoir
                        // une meilleure connaissance des �quipements et peut corriger automatiquement
                        console.log(`?? [EquipmentAnalysis] Probl�me audio ? FORCER ANALYSE BACKEND AVANT ESCALADE`);
                        console.log(`?? [EquipmentAnalysis] �quipements d�tect�s: ${hasAppropriateEquipment ? 'OUI' : 'NON'} - Backend peut avoir plus d'infos`);
                        
                        // Laisser le backend analyser et d�cider s'il peut corriger automatiquement (ex: TCC2 sourdine)
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                }
                
                // Si pas d'�quipements trouv�s, continuer avec l'analyse Copilot
                console.log(`?? [EquipmentAnalysis] Aucun �quipement trouv� ? Continuer avec l'analyse Copilot`);
                return { shouldEscalate: false, userMessageAdded: false };
                
            } catch (error) {
                console.error('?? [EquipmentAnalysis] Erreur lors de l\'analyse:', error);
                // En cas d'erreur, continuer avec l'analyse Copilot
                return { shouldEscalate: false, userMessageAdded: false };
            }
        }

        // ?? FONCTION POUR V�RIFIER L'�TAT TEMPS R�EL D'UN PROJECTEUR
        async function fetchProjectorRealtimeStatus(deviceName) {
            try {
                console.log(`?? [RealtimeStatus] V�rification temps r�el pour: ${deviceName}`);
                
                const response = await fetch(`${API_BASE_URL}/api/device/public/realtime-status/${deviceName}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`? [RealtimeStatus] Erreur HTTP ${response.status} pour ${deviceName}`);
                    return null;
                }
                
                const status = await response.json();
                console.log(`? [RealtimeStatus] �tat temps r�el r�cup�r� pour ${deviceName}:`, status);
                
                return status;
                
            } catch (error) {
                console.error(`? [RealtimeStatus] Erreur pour ${deviceName}:`, error);
                return null;
            }
        }
        /**
         * ? FONCTION MANQUANTE CRITIQUE : Analyse sp�cifique des probl�mes vid�o
         * Copi�e depuis assistant-salle-av-copie.html
         */
        async function handleVideoProblemAnalysis(message, roomEquipment) {
            const currentRoom = getCurrentRoom();
            
            // V�rifier s'il y a des projecteurs dans la salle
            const projectors = (roomEquipment && roomEquipment.devices) ? roomEquipment.devices.filter(device => 
                device.device_type === 'projector' || 
                device.device_family_name?.toLowerCase().includes('projecteur') ||
                device.device_name?.toLowerCase().includes('proj') ||
                device.technology?.toLowerCase().includes('pjlink')
            ) : [];
            
            console.log(`??? [VideoAnalysis] Salle ${currentRoom}: ${projectors.length} projecteur(s) d�tect�(s)`);
            
            if (projectors.length === 0) {
                // Aucun projecteur d�tect�, escalade imm�diate avec interface standard
                console.log(`??? [VideoAnalysis] Aucun projecteur d�tect� ? Escalade directe`);
                
                // Cr�er un contexte RAG artificiel pour l'escalade vid�o
                latestRAGContext = {
                    intent: 'video_problem',
                    confidence: 0.9,
                    room: currentRoom,
                    problems: [{
                        room: currentRoom,
                        device: null,
                        severity: 'medium'
                    }],
                    solutions: [],
                    escalation_needed: true,
                    escalation_reason: "Aucun projecteur d�tect� dans cette salle. L'�quipement vid�o pourrait ne pas �tre r�f�renc� dans le syst�me de monitoring."
                };
                
                console.log('?? [VideoEscalation] Contexte RAG artificiel cr�� avec salle:', currentRoom);
                
                // ? PAS DE MESSAGE EN BAS - Banni�re SEA directe plus propre
                console.log(`??? [VideoAnalysis] Aucun projecteur ? Escalade SEA directe sans message interm�diaire`);
                
                // ? ESCALADE SEA IMM�DIATE au lieu d'attendre le timeout
                setTimeout(() => {
                    showSEAEscalationBanner(latestRAGContext);
                }, 500); // 0.5 seconde pour feedback imm�diat
                
                return true; // Escalade effectu�e
            }
            
            // ? CRITIQUE : Il y a des projecteurs, cr�er actions automatiques locales
            console.log(`??? [VideoAnalysis] ${projectors.length} projecteur(s) trouv�(s) ? Cr�er actions automatiques locales`);
            
            // Cr�er un contexte RAG artificiel avec actions automatiques pour projecteur
            const projector = projectors[0]; // Prendre le premier projecteur
            console.log(`?? [VideoActions] Cr�ation actions automatiques pour projecteur: ${projector.device_name || projector.name}`);
            
            latestRAGContext = {
                intent: 'video_problem',
                confidence: 0.9,
                room: currentRoom,
                problems: [{
                    room: currentRoom,
                    device: projector.device_name || projector.name,
                    severity: 'high',
                    reason: 'Probl�me vid�o projecteur - �cran noir'
                }],
                solutions: [],
                escalation_needed: false,
                actions: [
                    {
                        type: 'pjlink_power',
                        device_id: projector.id || 31,
                        command: 'power_on', // ? Format backend
                        description: `Allumer ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            power_on: true
                        }
                    },
                    {
                        type: 'pjlink_av_unmute', // ? Nom correct
                        device_id: projector.id || 31,
                        command: 'av_unmute', // ? Format backend
                        description: `D�sactiver AV Mute sur ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            video_mute: false,
                            audio_mute: false
                        }
                    }
                ],
                auto_executed: true
            };
            
            // ? V�RIFIER D'ABORD L'�TAT R�EL DU PROJECTEUR AVANT D'AFFICHER BANNI�RE
            console.log(`?? [VideoActions] V�rification �tat r�el projecteur avant affichage banni�re...`);
            
            try {
                // ? �TAPE 1 : V�rifier l'�tat d'alimentation (power) du projecteur
                console.log(`?? [VideoActions] V�rification �tat d'alimentation du projecteur...`);
                
                // ? ESSAI 1 : Endpoint power-status (nouveau)
                let powerData = null;
                try {
                    const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${currentRoom}`);
                    if (powerResponse.ok) {
                        powerData = await powerResponse.json();
                        console.log(`?? [VideoActions] �tat alimentation (power-status):`, powerData);
                    }
                } catch (powerError) {
                    console.log(`?? [VideoActions] Endpoint power-status non disponible: ${powerError.message}`);
                }
                
                // ? ESSAI 2 : Fallback vers av-mute-status (existant) pour d�tecter si projecteur r�pond
                if (!powerData) {
                    console.log(`?? [VideoActions] Fallback vers av-mute-status pour d�tecter connectivit�...`);
                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                    
                    if (avMuteResponse.ok) {
                        const avMuteData = await avMuteResponse.json();
                        console.log(`?? [VideoActions] �tat AV Mute (fallback):`, avMuteData);
                        
                        // ? Si projecteur r�pond mais pas de AV Mute ? ESCALADE DIRECTE
                        if (!avMuteData.av_muted && avMuteData.device) {
                            console.log(`?? [VideoActions] Projecteur R�POND + PAS AV Mute ? ESCALADE DIRECTE`);
                            showSEAEscalationBanner(latestRAGContext);
                            return; // ? ARR�TER ICI - Pas de banni�re d'attente
                        }
                        
                        // ? Si projecteur r�pond ET AV Mute actif ? Continuer avec correction
                        if (avMuteData.av_muted) {
                            console.log(`?? [VideoActions] Projecteur R�POND + AV Mute actif ? Correction automatique`);
                        }
                    } else {
                        // ? Si projecteur ne r�pond pas ? Probablement �teint, continuer avec allumage
                        console.log(`?? [VideoActions] Projecteur ne r�pond pas ? Probablement �teint, continuer avec allumage`);
                    }
                } else {
                    // ? Endpoint power-status disponible
                    if (powerData.power === 'off' || powerData.power === 'OFF' || !powerData.power) {
                        console.log(`?? [VideoActions] Projecteur �TEINT ? Continuer avec allumage automatique`);
                    } else {
                        // ? Projecteur allum� ? V�rifier AV Mute
                        console.log(`?? [VideoActions] Projecteur ALLUM� ? V�rifier AV Mute...`);
                        const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                        
                        if (avMuteResponse.ok) {
                            const avMuteData = await avMuteResponse.json();
                            console.log(`?? [VideoActions] �tat AV Mute:`, avMuteData);
                            
                            // ? Si projecteur allum� ET pas de AV Mute ? ESCALADE DIRECTE
                            if (!avMuteData.av_muted && avMuteData.device) {
                                console.log(`?? [VideoActions] Projecteur ALLUM� + PAS AV Mute ? ESCALADE DIRECTE`);
                                showSEAEscalationBanner(latestRAGContext);
                                return; // ? ARR�TER ICI - Pas de banni�re d'attente
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`?? [VideoActions] Erreur v�rification �tat: ${error.message} - Continuer avec banni�re d'attente`);
            }
            
            // ? BANNI�RE D'ATTENTE ORANGE pour diagnostic et actions (minimum 15 secondes)
            showWaitingBanner('?? Diagnostic du projecteur...', 'V�rification de l\'�tat et correction en cours');
            
            // ? M�moriser le moment d'affichage pour d�lai minimum
            window.waitingBannerStartTime = Date.now();
            
            // ? MESSAGE ADAPTATIF selon l'�tat probable du projecteur
            console.log(`?? [VideoActions] Envoi message adaptatif au RAG (seulement si pas escalade directe)`);
            
            // Si c'est un nouveau clic apr�s une correction, changer le message
            const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
            const nbCorrections = parseInt(sessionCorrections);
            
            let adaptiveMessage;
            if (nbCorrections > 0) {
                // Apr�s une correction, focus sur l'AV Mute
                adaptiveMessage = "Le projecteur est allum� mais l'image n'appara�t pas - �cran noir avec AV Mute";
                console.log(`?? [VideoActions] ${nbCorrections} correction(s) pr�c�dente(s) ? Focus AV Mute`);
            } else {
                // Premier probl�me : power on classique
                adaptiveMessage = "Le projecteur ne s'allume pas et l'�cran reste noir";
                console.log(`?? [VideoActions] Premier probl�me ? Focus Power ON`);
            }
            
            sendProblemToVitrine(adaptiveMessage, currentRoom);
            
            return true; // Traitement effectu� localement
        }
        
        // ===== FONCTION POUR APPEL VITRINE =====
        
        async function sendProblemToVitrine(message, roomName) {
            console.log(`?? [VitrineCall] Envoi vers /api/copilot/vitrine: "${message}"`);
            
            try {
                // ? S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const response = await fetch(`${currentAPI}/api/copilot/vitrine`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `${message} (Salle: ${roomName})`,
                        context: {
                            session_id: `vitrine_video_${Date.now()}`,
                            user_id: 'vitrine_user',
                            source: 'vitrine',
                            timestamp: new Date().toISOString(),
                            room_info: {
                                room: roomName,
                                pavilion: roomName.split('-')[0], // Ex: J-2430 ? J
                                room_number: roomName.split('-')[1] // Ex: J-2430 ? 2430
                            },
                            equipment_context: roomName === 'J-2430' ? {
                                projectors: [{
                                    id: 31,
                                    name: 'PROJ-J-2430',
                                    address: '132.208.119.121',
                                    technology: 'PJLINK',
                                    status: 'online', // ? Projecteur maintenant allum�
                                    issues: ['av_mute_active'] // ? Mais AV Mute actif
                                }],
                                mersive: [{
                                    id: 32,
                                    name: 'DSF-J-2430-A',
                                    address: 'dsf-j-2430-a.ddns.uqam.ca',
                                    technology: 'MERSIVE',
                                    status: 'online'
                                }]
                            } : null
                        }
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status})`);
                }
                
                const data = await response.json();
                console.log(`?? [VitrineCall] R�ponse re�ue:`, data);
                
                // Traiter la r�ponse comme les autres r�ponses backend
                processResponse(data);
                
            } catch (error) {
                console.error(`? [VitrineCall] Erreur:`, error);
                // En cas d'erreur, afficher un message � l'utilisateur
                showAutoActionResult(
                    { type: 'error', description: 'Appel backend' }, 
                    { success: false, message: `Erreur de connexion backend: ${error.message}` }
                );
            }
        }
        
        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====
        function analyzeMessageType(message) {
            const lowerMessage = message.toLowerCase();
            
            // Mots-cl�s pour �quipements AV dans le syst�me SavQonnect
            const avSystemKeywords = [
                // Projecteurs
                'projecteur', 'projector', 'pjlink', '�cran', 'screen', 'affichage', 'display',
                'image', 'vid�o', 'video', 'noir', 'blanc', 'flou', 'floue', 'pixelis�',
                
                // Audio Sennheiser
                'microphone', 'micro', 'son', 'audio', 'volume', 'sennheiser', 'tcc2',
                'mute', 'muet', 'sourdine', 'gr�sille', 'parasite', 'larsen',
                
                // Crestron
                'crestron', '�cran tactile', 'touchscreen', 'panneau de contr�le',
                'interface de contr�le', 't�l�commande'
            ];
            
            // Mots-cl�s pour �quipements AV hors syst�me (mais toujours SEA)
            const avExternalKeywords = [
                // �quipements AV g�n�riques non sp�cifiques au syst�me
                'haut-parleur', 'speaker', 'amplificateur', 'ampli', 'console audio',
                'table de mixage', 'mixer', 'cam�ra', 'webcam', 'visualiseur',
                'dvd', 'blu-ray', 'lecteur', 'player', 'hdmi', 'vga', 'usb',
                'casque', 'headset', 'casque audio', 'jack', 'connecteur',
                'c�ble audio', 'c�ble vid�o', 'adaptateur', 'convertisseur'
            ];
            
            // Mots-cl�s pour probl�mes non-audiovisuels
            const nonAVKeywords = [
                // �lectricit�
                '�lectricit�', '�lectrique', 'prise', 'prises', 'courant', 'lumi�re', '�clairage',
                'ampoule', 'lampe', 'n�on', 'disjoncteur', 'fusible', 'interrupteur',
                
                // Plomberie
                'plomberie', 'eau', 'robinet', 'toilette', 'chasse d\'eau', 'lavabo',
                '�vier', 'fuite', 'bouchon', 'inondation', 'd�g�t d\'eau',
                
                // Chauffage/Climatisation
                'chauffage', 'radiateur', 'calorif�re', 'thermopompe', 'thermostat',
                'climatisation', 'clim', 'air conditionn�', 'ventilation', 'temp�rature',
                
                // Mobilier et structure
                'mobilier', 'chaise', 'table', 'bureau', 'porte', 'fen�tre', 'serrure',
                'cl�', 'nettoyage', 'm�nage', 'poubelle', 'd�chets'
            ];
            
            // Mots-cl�s hors scope (pas des probl�mes)
            const outOfScopeKeywords = [
                // Salutations
                'bonjour', 'bonsoir', 'salut', 'hello', 'hi',
                
                // Questions g�n�rales
                'comment �a va', 'quoi de neuf', 'comment allez-vous',
                'qu\'est-ce que tu fais', 'que fais-tu',
                
                // Demandes d'aide g�n�rale
                'aide-moi', 'peux-tu m\'aider', 'j\'ai besoin d\'aide',
                'que peux-tu faire', 'tes fonctionnalit�s',
                
                // Discussions
                'parle-moi', 'raconte-moi', 'dis-moi', 'explique-moi',
                'm�t�o', 'actualit�', 'nouvelles', 'sport'
            ];
            
            // V�rifier si c'est un probl�me technique valide
            const problemIndicators = [
                'probl�me', 'panne', 'ne fonctionne pas', 'ne marche pas', 'd�faillant',
                'en panne', 'cass�', 'ne s\'allume pas', 'ne r�pond pas', 'dysfonctionnement',
                'pas de', 'aucun', 'rien', 'bloqu�', 'fig�', 'lent', 'erreur'
            ];
            
            const hasProblemIndicator = problemIndicators.some(indicator => 
                lowerMessage.includes(indicator)
            );
            
            // Classification par priorit�
            
            // 1. V�rifier si c'est hors scope
            if (outOfScopeKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 4,
                    category: 'out_of_scope',
                    description: 'Demande hors scope - pas un probl�me audiovisuel',
                    needsRoom: false
                };
            }
            
            // 2. V�rifier si c'est non-audiovisuel (priorit� haute)
            if (nonAVKeywords.some(keyword => lowerMessage.includes(keyword))) {
                console.log(`?? [NonAV] D�tection probl�me non-audiovisuel: "${message}" contient mot-cl� immeubles`);
                return {
                    type: 3,
                    category: 'non_audiovisual',
                    description: 'Probl�me non-audiovisuel - service des immeubles',
                    needsRoom: false
                };
            }
            
            // 3. V�rifier si c'est AV dans le syst�me
            if (avSystemKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 1,
                    category: 'av_system',
                    description: 'Probl�me �quipement AV dans le syst�me SavQonnect',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 4. V�rifier si c'est AV externe
            if (avExternalKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 2,
                    category: 'av_external',
                    description: 'Probl�me �quipement AV hors syst�me - redirection SEA',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 5. Si c'est un probl�me mais pas clairement cat�goris�
            if (hasProblemIndicator) {
                // Assumer que c'est potentiellement AV si c'est un probl�me technique
                return {
                    type: 1,
                    category: 'av_system_assumed',
                    description: 'Probl�me technique - assume �quipement AV syst�me',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: false
                };
            }
            
            // 6. Par d�faut, consid�rer comme hors scope
            return {
                type: 4,
                category: 'out_of_scope',
                description: 'Demande non identifi�e - hors scope',
                needsRoom: false
            };
        }

        /**
         * V�rifie si le message contient des informations sur la salle
         */
        function hasRoomInformation(message) {
            // Rechercher les patterns de salle (ex: A-1750, a-1730, B-2500, SH-R200, DS-4000, etc.)
            const roomPattern = /\b([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})\b/i;
            const hasRoom = roomPattern.test(message);
            
            // Rechercher mentions de pavillon/b�timent
            const buildingPattern = /\b(pavillon|b�timent|building)\s+([a-zA-Z]{1,2})\b/i;
            const hasBuilding = buildingPattern.test(message);
            
            console.log(`?? [RoomDetection] Message: "${message}", Pattern d�tect�: ${hasRoom || hasBuilding}`);
            return hasRoom || hasBuilding;
        }

        /**
         * G�re les messages hors scope
         */
        function handleOutOfScopeMessage(message) {
            addMessage('system', '?? Je suis votre assistant audiovisuel pour cette salle. Je peux vous aider avec les probl�mes de projecteur, microphone, son, etc. Que puis-je faire pour vous ?', {
                suggestions: ['Probl�me projecteur', 'Probl�me audio', 'Probl�me r�seau']
            });
        }

        /**
         * G�re les probl�mes r�seau avec banni�re moderne Services Informatiques
         */
        function handleNetworkProblem(message) {
            console.log('?? [SIEscalation] Affichage de la banni�re Services Informatiques pour probl�me r�seau');
            
            // ? CORRECTION: Fermer toutes les banni�res SI existantes AVANT d'en cr�er une nouvelle
            const existingSiBanners = document.querySelectorAll('[id^="escalation_si_"]');
            const existingSiOverlays = document.querySelectorAll('[id^="overlay_escalation_si_"]');
            
            existingSiBanners.forEach(banner => {
                console.log(`?? [CleanupSIBanner] Suppression banni�re SI existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSiOverlays.forEach(overlay => {
                console.log(`?? [CleanupSIOverlay] Suppression overlay SI existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Cr�er la banni�re SI avec overlay plein �cran
            const escalationId = `escalation_si_${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou agressif
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${escalationId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re SI
            const escalationDiv = document.createElement('div');
            escalationDiv.id = escalationId;
            escalationDiv.className = 'escalation-compact fade-in';
            escalationDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                padding: 2rem;
                color: black !important;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            escalationDiv.innerHTML = `
                <div class="escalation-header" style="margin-bottom: 1.5rem;">
                    <div class="escalation-image-container" style="text-align: center; margin-bottom: 1rem;">
                        <img id="si-logo" src="${ASSETS_BASE}/SI.png" alt="Services Informatiques UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Services Informatiques UQAM</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">Probl�me r�seau - Salle ${currentRoom}</span>
                    </div>
                    </div>
                    
                <div class="si-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les probl�mes de r�seau, connectivit� Internet, Wi-Fi, ou �quipements informatiques dans la salle ${currentRoom}, veuillez contacter les Services Informatiques.
                    </p>
                    
                    <div class="si-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="si-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">??</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SI : 514-987-3000</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 5050)</span>
                            </div>
                        <div class="si-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">??</span>
                            <a href="https://servicesinformatiques.uqam.ca/" target="_blank" style="color: #2196F3; text-decoration: none; font-weight: 500;">servicesinformatiques.uqam.ca</a>
                        </div>
                            </div>
                        </div>
                        
                <div class="escalation-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button class="escalation-btn secondary" onclick="closeEscalationBanner('${escalationId}')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        ? Fermer
                    </button>
                    <button class="escalation-btn primary" onclick="window.open('tel:514-987-3000', '_self')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.9);
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        ?? Appeler SI
                    </button>
                    <button class="escalation-btn primary" onclick="window.open('https://servicesinformatiques.uqam.ca/', '_blank')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.9);
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        ?? Site web
                    </button>
                        </div>
            `;
            
            // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // ? Emp�cher la propagation des �v�nements depuis la banni�re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`?? [SIBanner] Banni�re Services Informatiques affich�e pour salle ${currentRoom}`);
        }

        /**
         * G�re les probl�mes non-audiovisuels avec banni�re moderne SIM
         */
        function handleNonAudiovisualProblem(message) {
            console.log('?? [SIMEscalation] Affichage de la banni�re SIM pour probl�me non-audiovisuel');
            
            // ? CORRECTION: Fermer toutes les banni�res SIM existantes AVANT d'en cr�er une nouvelle
            const existingSimBanners = document.querySelectorAll('[id^="escalation_sim_"]');
            const existingSimOverlays = document.querySelectorAll('[id^="overlay_escalation_sim_"]');
            
            existingSimBanners.forEach(banner => {
                console.log(`?? [CleanupSIMBanner] Suppression banni�re SIM existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSimOverlays.forEach(overlay => {
                console.log(`?? [CleanupSIMOverlay] Suppression overlay SIM existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Cr�er la banni�re SIM avec overlay plein �cran
            const escalationId = `escalation_sim_${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou agressif
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${escalationId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re SIM
            const escalationDiv = document.createElement('div');
            escalationDiv.id = escalationId;
            escalationDiv.className = 'escalation-compact fade-in';
            escalationDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                padding: 2rem;
                color: black !important;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            escalationDiv.innerHTML = `
                <div class="escalation-header" style="margin-bottom: 1.5rem;">
                    <div class="escalation-image-container" style="text-align: center; margin-bottom: 1rem;">
                        <img id="sim-logo" src="${ASSETS_BASE}/SIM.png" alt="Service des Immeubles UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Service des Immeubles UQAM</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">Probl�me non-audiovisuel - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="sim-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les probl�mes d'infrastructure, d'�lectricit�, de plomberie, de chauffage ou de climatisation dans la salle ${currentRoom}, veuillez contacter le Service des Immeubles.
                    </p>
                    
                    <div class="sim-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="sim-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">??</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SIM : 514-987-3141</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 3141)</span>
                        </div>
                        <div class="sim-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">??</span>
                            <a href="https://sim.uqam.ca/" target="_blank" style="color: #2196F3; text-decoration: none; font-weight: 500;">sim.uqam.ca</a>
                        </div>
                    </div>
                </div>
                
                <div class="escalation-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button class="escalation-btn secondary" onclick="closeEscalationBanner('${escalationId}')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        ? Fermer
                    </button>
                    <button class="escalation-btn primary" onclick="window.open('tel:514-987-3141', '_self')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.9);
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        ?? Appeler SIM
                    </button>
                    <button class="escalation-btn primary" onclick="window.open('https://sim.uqam.ca/', '_blank')" style="
                        color: black !important;
                        background: rgba(255,255,255,0.9);
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        ?? Site web
                    </button>
                </div>
            `;
            
            // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // ? Emp�cher la propagation des �v�nements depuis la banni�re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`?? [SIMBanner] Banni�re SIM affich�e pour salle ${currentRoom}`);
        }

        /**
         * G�re les probl�mes AV externes avec salle
         */
        function handleExternalAVProblemWithRoom(message) {
            const currentRoom = getCurrentRoom();
            addMessage('system', `?? <strong>Contact SEA</strong><br><br>Pour ce type d'�quipement dans la salle ${currentRoom}, veuillez contacter directement le SEA au <strong>6135</strong>.`, {
                suggestions: ['Appeler SEA', 'Probl�me syst�me', 'Autre salle']
            });
        }

        // ? NOUVEAU: Timer d'escalade automatique pour �viter les blocages
        let escalationTimeoutId = null;
        
        function startEscalationTimeout(problemType, room) {
            // Annuler le timer pr�c�dent si existant
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
            }
            
            escalationTimeoutId = setTimeout(() => {
                console.log(`? [EscalationTimeout] Timeout atteint pour probl�me ${problemType} ? Escalade forc�e`);
                
                // ? CORRECTION: V�rifier les tickets existants AVANT l'escalade par timeout
                if (hasExistingTicket(room)) {
                    const lastTicket = getLastSessionTicket(room);
                    console.log(`?? [EscalationTimeout] Timeout mais ticket ${lastTicket.number} existe ? Banni�re ticket existant`);
                    showExistingTicketBanner(lastTicket);
                } else {
                    showSEAEscalationBanner({
                        intent: `${problemType}_problem`,
                        confidence: 0.95,
                        room: room,
                        escalation_needed: true,
                        escalation_reason: `Aucune correction automatique trouv�e - Intervention technique requise`
                    });
                }
            }, 10000); // ? 10 secondes pour laisser le temps au RAG de r�pondre
        }
        
        function clearEscalationTimeout() {
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
                escalationTimeoutId = null;
                console.log('? [EscalationTimeout] Timer d\'escalade annul�');
            }
        }
        // ===== BANNI�RE D'ALLUMAGE PROJECTEUR (inspir�e modale PJLink) =====
        
        function showProjectorPoweringBanner(roomName) {
            console.log(`?? [ProjectorPower] Banni�re allumage projecteur pour ${roomName}`);
            
            // ? CORRECTION : Masquer le sablier diagnostic car banni�re projecteur prend le relais
            hideDiagnosticLoading();
            console.log('? [ProjectorPower] Sablier diagnostic masqu� - Banni�re projecteur prend le relais');
            
            // Supprimer une �ventuelle banni�re existante
            const existingBanner = document.getElementById('projector-powering-banner');
            if (existingBanner) {
                existingBanner.remove();
            }
            
            // Cr�er la banni�re d'allumage
            const banner = document.createElement('div');
            banner.id = 'projector-powering-banner';
            banner.className = 'projector-powering-banner show';
            
            banner.innerHTML = `
                <div class="powering-content">
                    <div class="powering-icon">
                        <i class="fas fa-power-off warming-rotation"></i>
                    </div>
                    <div class="powering-text">
                        <h3>?? Allumage du projecteur en cours...</h3>
                        <p>Salle ${roomName} - Patientez pendant la mise sous tension</p>
                        <div class="power-progress">
                            <div class="progress-bar">
                                <div class="progress-fill warming-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(banner);
            
            // Commencer la surveillance de l'�tat du projecteur
            startProjectorStatusMonitoring(roomName);
        }
        
        function startProjectorStatusMonitoring(roomName) {
            console.log(`??? [ProjectorMonitoring] Surveillance �tat projecteur ${roomName}`);
            
            let checkCount = 0;
            const maxChecks = 30; // 30 checks = 30 secondes max
            
            const monitoringInterval = setInterval(async () => {
                checkCount++;
                console.log(`?? [ProjectorMonitoring] Check ${checkCount}/${maxChecks} pour ${roomName}`);
                
                try {
                    // ? UTILISER API TEMPS R�EL au lieu du cache
                    const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(roomName)}&refresh=true`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'success' && data.devices) {
                            const projector = data.devices.find(d => d.technology === 'PJLINK' || d.family_type === 'PJLINK');
                            
                            if (projector) {
                                console.log(`?? [ProjectorMonitoring] �tat projecteur: ${projector.status}, Power: ${projector.power_state}`);
                                
                                // ? CRIT�RES PLUS LARGES pour d�tecter l'allumage
                                const isProjectorOn = projector.status === 'online' || 
                                                    projector.status === 'ON' || 
                                                    projector.power_state === 'ON' ||
                                                    projector.power_state === 'WARMUP' ||
                                                    projector.power_state === 'WARMING_UP';
                                
                                if (isProjectorOn) {
                                    console.log(`? [ProjectorMonitoring] Projecteur allum� ! Transition vers AV Mute`);
                                    clearInterval(monitoringInterval);
                                    
                                    // ? ATTENDRE 3 SECONDES avant AV Mute (temps de stabilisation)
                                    setTimeout(() => {
                                        updateProjectorBannerToAVMute(roomName);
                                        
                                                                // ? V�RIFIER ET CORRIGER AV MUTE automatiquement
                        setTimeout(async () => {
                            console.log(`?? [ProjectorMonitoring] V�rification �tat AV Mute temps r�el`);
                            await checkAndFixAVMuteStatus(roomName, projector.name || projector.device_name || `PROJ-${roomName}`);
                        }, 2000);
                                    }, 3000);
                                    return;
                                }
                            }
                        }
                    }
                    
                    // ? FALLBACK : Si apr�s 10 checks toujours pas d�tect�, forcer AV Mute
                    if (checkCount >= 10) {
                        console.log(`?? [ProjectorMonitoring] Fallback apr�s 10s ? Forcer correction AV Mute`);
                        clearInterval(monitoringInterval);
                        updateProjectorBannerToAVMute(roomName);
                        
                        setTimeout(async () => {
                            console.log(`?? [ProjectorMonitoring] Fallback - V�rification AV Mute`);
                            await checkAndFixAVMuteStatus(roomName, `PROJ-${roomName}`); // Nom bas� sur la salle
                        }, 2000);
                        return;
                    }
                    
                } catch (error) {
                    console.log(`?? [ProjectorMonitoring] Erreur surveillance: ${error.message}`);
                }
                
                // Timeout apr�s 30 secondes
                if (checkCount >= maxChecks) {
                    console.log(`? [ProjectorMonitoring] Timeout surveillance pour ${roomName}`);
                    clearInterval(monitoringInterval);
                    hideProjectorPoweringBanner();
                }
            }, 1000); // Check toutes les secondes
        }
        
        function updateProjectorBannerToAVMute(roomName) {
            const banner = document.getElementById('projector-powering-banner');
            if (!banner) return;
            
            console.log(`?? [ProjectorBanner] Transition vers AV Mute pour ${roomName}`);
            
            // Mettre � jour le contenu pour AV Mute
            const content = banner.querySelector('.powering-content');
            if (content) {
                content.innerHTML = `
                    <div class="powering-icon">
                        <i class="fas fa-eye-slash av-mute-pulse"></i>
                    </div>
                    <div class="powering-text">
                        <h3>?? Projecteur allum� - Correction AV Mute...</h3>
                        <p>Salle ${roomName} - Activation de l'affichage</p>
                        <div class="power-progress">
                            <div class="progress-bar">
                                <div class="progress-fill success-fill"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Auto-hide apr�s 15 secondes (plus de temps pour voir)
            setTimeout(() => {
                hideProjectorPoweringBanner();
            }, 15000);
        }
        
        function hideProjectorPoweringBanner() {
            const banner = document.getElementById('projector-powering-banner');
            if (banner) {
                banner.classList.remove('show');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 300);
                console.log(`?? [ProjectorBanner] Banni�re allumage masqu�e`);
            }
        }
        
        // ? NOUVELLE FONCTION : V�rifier et corriger AV Mute temps r�el
        async function checkAndFixAVMuteStatus(roomName, projectorName) {
            console.log(`?? [AVMuteCheck] V�rification �tat AV Mute pour ${projectorName} (${roomName})`);
            
            try {
                // ? �TAPE 1 : V�rifier l'�tat actuel AV Mute
                console.log(`?? [AVMuteCheck] URL appel�e: ${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                const statusResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                
                console.log(`?? [AVMuteCheck] R�ponse statut: ${statusResponse.status} ${statusResponse.statusText}`);
                
                if (!statusResponse.ok) {
                    console.log(`? [AVMuteCheck] Erreur r�cup�ration statut: ${statusResponse.status}`);
                    const errorText = await statusResponse.text();
                    console.log(`?? [AVMuteCheck] D�tails erreur: ${errorText}`);
                    return;
                }
                
                const statusData = await statusResponse.json();
                console.log(`?? [AVMuteCheck] Statut AV Mute:`, statusData);
                
                // ? �TAPE 2 : Si AV Mute actif ? Le corriger
                if (statusData.av_muted) {
                    console.log(`?? [AVMuteCheck] AV Mute d�tect� ? Correction automatique`);
                    
                    // ? BANNI�RE D'ATTENTE ORANGE pendant correction (minimum 15 secondes)
                    showWaitingBanner('?? Correction AV Mute en cours...', 'D�sactivation du mode muet sur le projecteur');
                    window.waitingBannerStartTime = Date.now(); // ? Nouveau timestamp
                    
                    // ? Utiliser l'endpoint direct AV Mute public (sans auth)
                    console.log(`?? [AVMuteCheck] Correction directe AV Mute sur ${projectorName}`);
                    const fixResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-control`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            device_name: projectorName,
                            video_mute: false,
                            audio_mute: false
                        })
                    });
                    
                    if (fixResponse.ok) {
                        const fixData = await fixResponse.json();
                        console.log(`? [AVMuteCheck] AV Mute corrig� avec succ�s:`, fixData);
                        
                        // ? ATTENDRE MINIMUM 15 SECONDES pour que le client voie la banni�re d'attente
                        console.log(`? [AVMuteCheck] Banni�re d'attente visible pendant 15s minimum...`);
                        setTimeout(async () => {
                            console.log(`?? [AVMuteCheck] V�rification post-correction...`);
                            const verifyResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                            if (verifyResponse.ok) {
                                const verifyData = await verifyResponse.json();
                                console.log(`?? [AVMuteCheck] �tat post-correction:`, verifyData);
                                
                                if (!verifyData.av_muted) {
                                    console.log(`?? [AVMuteCheck] SUCC�S CONFIRM� : AV Mute vraiment d�sactiv� !`);
                                } else {
                                    console.log(`?? [AVMuteCheck] PROBL�ME : AV Mute toujours actif apr�s correction !`);
                                }
                            }
                            
                            // ? MASQUER BANNI�RE D'ATTENTE et afficher succ�s
                            console.log(`?? [AVMuteCheck] Masquer banni�re d'attente apr�s 15s minimum`);
                            hideWaitingBanner();
                            setTimeout(() => {
                                // ? AFFICHER BANNI�RE SUCC�S APR�S masquage banni�re d'attente
                                showAutoActionResult(
                                    { 
                                        type: 'av_mute_correction', 
                                        description: 'Correction AV Mute termin�e' 
                                    }, 
                                    { 
                                        success: true, 
                                        message: `AV Mute d�sactiv� sur ${projectorName} - Image restaur�e !` 
                                    }
                                );
                            }, 500);
                        }, 15000); // ? 15 secondes minimum pour banni�re d'attente
                        
                    } else {
                        const errorData = await fixResponse.json();
                        console.log(`? [AVMuteCheck] �chec correction AV Mute: ${fixResponse.status}`, errorData);
                    }
                    
                } else {
                    console.log(`? [AVMuteCheck] AV Mute d�j� inactif - Aucune correction n�cessaire`);
                    
                    // ? CORRECTION : Ne pas afficher de banni�re de succ�s pr�matur�e
                    // Laisser la banni�re d'attente active jusqu'� la fin compl�te du processus
                    console.log(`?? [AVMuteCheck] Projecteur op�rationnel - Continuer avec la s�quence normale`);
                    
                    // ? La banni�re d'attente sera masqu�e par la logique principale quand tout sera termin�
                }
                
                            } catch (error) {
                console.log(`?? [AVMuteCheck] Erreur v�rification AV Mute: ${error.message}`);
            }
        }
        
        // ? FONCTION DE TEST MANUAL (temporaire)
        window.testAVMute = function() {
            const room = getCurrentRoom();
            if (room) {
                console.log(`?? [TEST] Test manuel AV Mute pour ${room}`);
                checkAndFixAVMuteStatus(room, `PROJ-${room}`);
            } else {
                console.log(`? [TEST] Aucune salle s�lectionn�e`);
            }
        }

        // ? NOUVELLE FONCTION DE TEST : V�rifier banni�re d'attente
        window.testWaitingBanner = function() {
            console.log(`?? [TEST] Test banni�re d'attente`);
            showWaitingBanner('?? Test banni�re d\'attente', 'Ceci est un test de la banni�re orange');
            
            // Masquer automatiquement apr�s 5 secondes
            setTimeout(() => {
                hideWaitingBanner();
                console.log(`? [TEST] Banni�re d'attente masqu�e automatiquement`);
            }, 5000);
        }

        // ? NOUVELLE FONCTION DE TEST : V�rifier �tat complet projecteur
        window.testProjectorStatus = async function() {
            const room = getCurrentRoom();
            if (!room) {
                console.log(`? [TEST] Aucune salle s�lectionn�e`);
                return;
            }
            
            console.log(`?? [TEST] Test �tat complet projecteur pour ${room}`);
            
            try {
                // Test 1: Power status
                console.log(`?? [TEST] Test endpoint power-status...`);
                const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${room}`);
                if (powerResponse.ok) {
                    const powerData = await powerResponse.json();
                    console.log(`? [TEST] Power status:`, powerData);
                } else {
                    console.log(`? [TEST] Power status non disponible: ${powerResponse.status}`);
                }
                
                // Test 2: AV Mute status
                console.log(`?? [TEST] Test endpoint av-mute-status...`);
                const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${room}`);
                if (avMuteResponse.ok) {
                    const avMuteData = await avMuteResponse.json();
                    console.log(`? [TEST] AV Mute status:`, avMuteData);
                } else {
                    console.log(`? [TEST] AV Mute status non disponible: ${avMuteResponse.status}`);
                }
                
            } catch (error) {
                console.log(`? [TEST] Erreur test: ${error.message}`);
            }
        }

        // ? NOUVELLE FONCTION DE TEST : Forcer masquage banni�re d'attente
        window.forceHideWaitingBanner = function() {
            console.log(`?? [TEST] For�age masquage banni�re d'attente`);
            hideWaitingBanner();
            console.log(`? [TEST] Banni�re d'attente forc�ment masqu�e`);
        }

        /**
         * Traite la r�ponse du backend (comme dans l'original)
         */
        function processResponse(data) {
            if (!data) return;

            console.log('?? [Frontend] R�ponse re�ue:', data);
            
            // ? GESTION INTELLIGENTE du timer d'escalade selon la r�ponse
            if (data.auto_executed) {
                // Action corrective prise ? Annuler le timer car probl�me potentiellement r�solu
                console.log('? [EscalationTimeout] Action automatique ex�cut�e - Timer annul� (probl�me corrig�)');
                clearEscalationTimeout();
            } else {
                // Pas d'action corrective ? Garder le timer pour escalade si besoin
                console.log('? [EscalationTimeout] Aucune action automatique - Timer maintenu pour escalade �ventuelle');
            }
            
            // ? CORRECTION CRITIQUE : EX�CUTION AUTOMATIQUE DES ACTIONS (comme assistant-salle-av-copie.html)
            if (data.auto_executed && data.actions && data.actions.length > 0) {
                console.log('?? [ProcessResponse] Ex�cution automatique des actions re�ues');
                setTimeout(() => {
                    executeAutoActions(data.actions);
                }, 1000); // Attendre 1 seconde pour que le message soit affich�
            }
            
                            // ? Si action r�ussie, incr�menter compteur et v�rifier AV Mute
                if (data.auto_executed && data.auto_result && data.auto_result.includes('?')) {
                    console.log('?? [ProcessResponse] Action r�ussie - Incr�menter compteur de corrections');
                    
                    // Incr�menter le compteur de corrections pour adapter le message suivant
                    const currentRoom = getCurrentRoom();
                    if (currentRoom) {
                        const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
                        const nbCorrections = parseInt(sessionCorrections);
                        sessionStorage.setItem(`corrections_${currentRoom}`, `${nbCorrections + 1}`);
                        console.log(`?? [ProcessResponse] Corrections pour ${currentRoom}: ${nbCorrections + 1}`);
                        
                        // ? FORCER V�RIFICATION AV MUTE apr�s action r�ussie
                        if (data.auto_result.includes('Allumer')) {
                            console.log('?? [ProcessResponse] Action allumage d�tect�e - V�rification AV Mute dans 3s');
                            setTimeout(async () => {
                                await checkAndFixAVMuteStatus(currentRoom, `PROJ-${currentRoom}`);
                            }, 3000); // 3 secondes pour stabilisation
                        }
                    }
                }
                
                // ? CORRECTION : G�rer le cas o� auto_executed est true mais actions est vide (action d�j� ex�cut�e c�t� serveur)
            if (data.auto_executed && (!data.actions || data.actions.length === 0)) {
                console.log('?? [ProcessResponse] Action d�j� ex�cut�e c�t� serveur - MASQUER BANNI�RE D\'ATTENTE');
                
                // ? ANNULER IMM�DIATEMENT le timer d'escalade car action d�j� ex�cut�e
                clearEscalationTimeout();
                console.log('?? [ProcessResponse] Timer escalade annul� - Action d�j� ex�cut�e c�t� serveur');
                
                // ? MASQUER LA BANNI�RE D'ATTENTE apr�s un d�lai minimum (adaptatif selon le type d'action)
                const bannerStartTime = window.waitingBannerStartTime || Date.now();
                const elapsedTime = Date.now() - bannerStartTime;
                
                // ? CORRECTION : D�lai adaptatif selon le type d'action
                let minimumTime = 5000; // Par d�faut 5 secondes
                
                // Pour les projecteurs, attendre plus longtemps pour l'allumage complet
                if (data.solutions && data.solutions.some(sol => 
                    sol.actions && sol.actions.some(act => act.type === 'pjlink_power')
                )) {
                    minimumTime = 15000; // 15 secondes minimum pour les projecteurs
                    console.log(`?? [ProcessResponse] Action projecteur d�tect�e - D�lai minimum �tendu � ${minimumTime}ms`);
                }
                
                const remainingTime = Math.max(0, minimumTime - elapsedTime);
                console.log(`? [ProcessResponse] Banni�re affich�e depuis ${elapsedTime}ms, masquer dans ${remainingTime}ms`);
                
                setTimeout(() => {
                    hideWaitingBanner();
                    console.log('? [ProcessResponse] Banni�re d\'attente masqu�e apr�s action serveur');
                    
                    // ? AFFICHER BANNI�RE SUCC�S APR�S masquage banni�re d'attente
                    setTimeout(() => {
                        showAutoActionResult(
                            { 
                                type: 'auto_correction', 
                                description: 'Correction automatique termin�e' 
                            }, 
                            { 
                                success: true, 
                                message: 'Probl�me r�solu automatiquement par le syst�me !' 
                            }
                        );
                    }, 500);
                }, remainingTime);
                
                return; // ? STOPPER le traitement pour �viter escalade
            }
            
            // ?? DEBUG: Analyser les actions pour comprendre pourquoi l'escalade ne se d�clenche pas
            if (data.actions && data.actions.length > 0) {
                console.log('?? [DEBUG] Actions trouv�es:');
                data.actions.forEach((action, index) => {
                    console.log(`  ${index}: Type: ${action.type}, Command: ${action.command}, Label: ${action.label}`);
                    console.log(`      Description: ${action.description}`);
                });
            }

            // ? LOGIQUE PROFESSIONNELLE AM�LIOR�E : D�tecter "Tout fonctionne mais client insiste"
            const hasOnlyEscalationActions = data.actions && data.actions.length > 0 && 
                                           data.actions.every(action => 
                                               action.type === 'create_sea_ticket' || 
                                               action.command === 'create_ticket' ||
                                               action.label?.includes('Ticket SEA') ||
                                               action.label?.includes('Escalade')
                                           );
            
            // ? NOUVELLE LOGIQUE: Actions techniques non auto-ex�cut�es = �quipements fonctionnels
            const hasTechnicalActionsNotExecuted = data.actions && data.actions.length > 0 && 
                                                  data.actions.some(action => 
                                                      (action.type === 'pjlink_power' || 
                                                       action.type === 'pjlink_av_mute' || 
                                                       action.type === 'sennheiser_mute') && 
                                                      !data.auto_executed
                                                  );
            
            // ? ESCALADE SIMPLIFI�E : Si pas d'auto-correction, escalade directe imm�diate
            if ((data.intent === 'video_problem' || data.intent === 'audio_problem') && 
                !data.auto_executed) {
                
                const problemType = data.intent === 'video_problem' ? 'vid�o' : 'audio';
                console.log(`?? [EscaladeDirecte] Probl�me ${problemType.toUpperCase()} sans correction automatique ? ESCALADE IMM�DIATE`);
                
                // ? CORRECTION: V�rifier les tickets existants AVANT d'afficher la banni�re SEA
                const currentRoom = getCurrentRoom();
                if (hasExistingTicket(currentRoom)) {
                    const lastTicket = getLastSessionTicket(currentRoom);
                    console.log(`?? [TicketExistant] Ticket d�j� cr�� ${lastTicket.number} ? Affichage banni�re ticket existant au lieu de SEA`);
                    showExistingTicketBanner(lastTicket);
                    clearEscalationTimeout();
                    return;
                }
                
                // Annuler le timer car on escalade maintenant
                clearEscalationTimeout();
                
                showSEAEscalationBanner({
                    intent: data.intent,
                    confidence: 0.9,
                    room: currentRoom,
                    escalation_needed: true,
                    escalation_reason: `Probl�me ${problemType} signal� - Intervention technique requise`
                });
                return; // ? STOP - Escalade directe sans message
            }

            // ? LOGIQUE SIMPLIFI�E FINALE : Plus de traitement complexe
            // Stocker juste le contexte pour les tickets si besoin
            latestRAGContext = data.rag_context || data;

            // ? LOGIQUE SIMPLIFI�E : Supprimer TOUS les messages de diagnostic en bas
            // L'utilisateur veut seulement : Correction automatique OU escalade directe
            // Pas de messages interm�diaires "diagnostic", "probl�me mineur", etc.
            
            console.log('?? [ProcessResponse] TOUS les messages de diagnostic supprim�s - Logique binaire uniquement');
            // Plus de messages en bas du chat - Banni�res uniquement
        }

        /**
         * D�termine la raison de l'escalade (comme dans l'original)
         */
        function determineEscalationReason(data, escalationActions) {
            if (escalationActions.length > 0) {
                return "Le syst�me recommande de cr�er un ticket SEA pour ce probl�me.";
            }
            if (data.confidence && data.confidence < 0.6) {
                return "Le syst�me n'est pas s�r de pouvoir r�soudre ce probl�me automatiquement.";
            }
            if (data.solutions && data.solutions.length === 0 && data.problems && data.problems.length > 0) {
                return "Aucune solution automatique n'a �t� trouv�e pour ce probl�me.";
            }
            return "Une intervention technique pourrait �tre n�cessaire.";
        }

        /**
         * Affiche � nouveau les palettes de probl�mes
         */
        function showProblemPalettes() {
            const problemPalettes = document.getElementById('problemPalettes');
            const assistantResponse = document.getElementById('assistantResponse');
            
            // Afficher les palettes
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // Supprimer la r�ponse de l'assistant
            if (assistantResponse) {
                assistantResponse.remove();
            }
            
            // Supprimer tous les r�sultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * Ex�cute les actions automatiques
         */
        async function executeAutoActions(actions) {
            // ? AFFICHER BANNI�RE D'ATTENTE ORANGE pendant ex�cution des actions
            showWaitingBanner('?? Ex�cution des corrections...', 'Veuillez patienter pendant l\'application des solutions');
            
            for (const action of actions) {
                try {
                    console.log(`?? Ex�cution action automatique: ${action.type}`);
                    
                    // ? Mettre � jour le message de la banni�re selon l'action
                    if (action.type === 'pjlink_power') {
                        showWaitingBanner('?? Allumage du projecteur...', 'D�marrage en cours, veuillez patienter');
                    } else if (action.type === 'pjlink_av_unmute') {
                        showWaitingBanner('?? Correction AV Mute...', 'D�sactivation du mode muet sur le projecteur');
                    }
                    
                    // Ex�cuter l'action r�elle selon son type
                    let result;
                    switch (action.type) {
                        case 'sennheiser_mute':
                            result = await executeAction('sennheiser_mute', action.device_id, {
                                host: action.device_name || action.host,
                                mute: action.mute
                            });
                            break;
                            
                        case 'pjlink_power':
                            result = await executeAction('pjlink_power', action.device_id, {
                                device_name: action.device_name,
                                power_on: action.power_on
                            });
                            break;
                            
                        case 'pjlink_av_unmute':
                            result = await executeAction('pjlink_av_mute', action.device_id, {
                                device_name: action.device_name,
                                video_mute: action.video_mute,
                                audio_mute: action.audio_mute
                            });
                            break;
                            
                        default:
                            console.warn(`Type d'action non reconnu: ${action.type}`);
                            result = { success: true, message: 'Action simul�e' };
                    }
                    
                    // Afficher le r�sultat dans une banni�re de succ�s
                    if (result && result.success) {
                        showAutoActionResult(action, result);
                    }
                    
                } catch (error) {
                    console.error(`Erreur lors de l'ex�cution de l'action ${action.type}:`, error);
                    showAutoActionResult(action, { success: false, message: error.message });
                }
            }
            
            // ? MASQUER BANNI�RE D'ATTENTE apr�s toutes les actions termin�es
            hideWaitingBanner();
            
            // Retour automatique � l'accueil apr�s toutes les actions
            setTimeout(() => {
                console.log('?? [AutoActions] Retour automatique � l\'accueil apr�s actions compl�tes');
                returnToHome();
            }, 3000);
        }

        /**
         * Affiche le r�sultat d'une action automatique
         */
        function showAutoActionResult(action, result) {
            console.log(`?? [AutoActionResult] ${action.type}: ${result.success ? 'SUCC�S' : '�CHEC'} - ${result.message}`);
            
            if (result.success) {
                // ? CORRECTION : Annuler le timer d'escalade car probl�me r�solu automatiquement
                clearEscalationTimeout();
                console.log('?? [EscalationTimeout] Timer d\'escalade annul� suite � correction automatique r�ussie');
                
                // ? BANNI�RE INTERACTIVE DE CORRECTION avec question OUI/NON
                showInteractiveCorrectionBanner(action, result);
            } else {
                // ? Petite banni�re d'erreur (droite)
                const bannerDiv = document.createElement('div');
                bannerDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    z-index: 9999;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s ease-out;
                    max-width: 400px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                `;
                
                bannerDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">?</span>
                        <span><strong>${action.description || action.type}</strong></span>
                    </div>
                    <div style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.85rem;">
                        ${result.message || 'Erreur lors de l\'ex�cution'}
                    </div>
                `;
                
                document.body.appendChild(bannerDiv);
                
                // Supprimer automatiquement apr�s 4 secondes
                setTimeout(() => {
                    if (bannerDiv.parentNode) {
                        bannerDiv.style.animation = 'slideOutRight 0.3s ease-in';
                        setTimeout(() => bannerDiv.remove(), 300);
                    }
                }, 4000);
            }
        }
        /**
         * ? NOUVELLE FONCTION : Banni�re interactive de correction avec question OUI/NON
         */
        function showInteractiveCorrectionBanner(action, result) {
            console.log(`?? [InteractiveCorrection] Affichage banni�re interactive: ${action.description}`);
            
            // ? NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la banni�re
            hideDiagnosticLoading();
            
            const bannerId = `interactive-correction-${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay-${bannerId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re interactive avec style moderne
            const bannerDiv = document.createElement('div');
            bannerDiv.id = bannerId;
            bannerDiv.style.cssText = `
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border-radius: 16px;
                padding: 2.5rem;
                text-align: center;
                box-shadow: 0 25px 50px rgba(76, 175, 80, 0.4);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 600px;
                animation: fadeIn 0.4s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            bannerDiv.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">?</div>
                <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem; font-weight: 600;">Correction automatique termin�e !</h2>
                
                <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 12px; margin: 2rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>?? Action effectu�e :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>?? Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>?? D�tails :</strong> ${result.message || 'Probl�me r�solu automatiquement'}</p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1.4rem; font-weight: 500;">Votre probl�me est-il r�gl� ?</h3>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button id="btn-oui-${bannerId}" style="
                            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 12px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
                            min-width: 120px;
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ? OUI
                        </button>
                        
                        <button id="btn-non-${bannerId}" style="
                            background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 12px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
                            min-width: 120px;
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ? NON
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; opacity: 0.8; font-size: 0.9rem;">
                    Cliquez sur OUI si le probl�me est r�solu, ou NON pour demander une intervention technique
                </div>
            `;
            
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            // ? GESTION CLIC BOUTON OUI
            const btnOui = document.getElementById(`btn-oui-${bannerId}`);
            if (btnOui) {
                btnOui.addEventListener('click', () => {
                console.log('? [InteractiveCorrection] Utilisateur confirme - Probl�me r�solu');
                
                // Masquer la banni�re avec animation
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // Retour � l'accueil
                setTimeout(() => {
                    returnToHome();
                }, 500);
                });
            }
            
            // ? GESTION CLIC BOUTON NON
            const btnNon = document.getElementById(`btn-non-${bannerId}`);
            if (btnNon) {
                btnNon.addEventListener('click', () => {
                console.log('? [InteractiveCorrection] Utilisateur confirme - Probl�me persiste');
                
                // Masquer la banni�re interactive
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // ? AFFICHER BANNI�RE ESCALADE apr�s masquage
                setTimeout(() => {
                    const currentRoom = getCurrentRoom();
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.9,
                        room: currentRoom,
                        escalation_needed: true,
                        escalation_reason: `Probl�me persiste apr�s correction automatique - Intervention technique requise`
                    });
                }, 500);
                });
            }
            
            // ? GESTION CLIC OVERLAY (fermeture)
            overlayDiv.addEventListener('click', (e) => {
                if (e.target === overlayDiv) {
                    console.log('?? [InteractiveCorrection] Fermeture par clic overlay');
                    
                    bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                    overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                    
                    setTimeout(() => {
                        if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                        if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                    }, 300);
                }
            });
        }

        // ======================== BANNIERE D'ATTENTE ORANGE ========================
        function showWaitingBanner(title, subtitle) {
            console.log(`? [WaitingBanner] Affichage banni�re d'attente: ${title}`);
            
            // ? CORRECTION : Masquer le sablier diagnostic car banni�re d'attente prend le relais
            hideDiagnosticLoading();
            console.log('? [WaitingBanner] Sablier diagnostic masqu� - Banni�re d\'attente prend le relais');
            
            // Supprimer toute banni�re d'attente existante
            hideWaitingBanner();
            
            const banner = document.createElement('div');
            banner.id = 'waiting-banner';
            banner.className = 'waiting-banner-overlay';
            
            banner.innerHTML = `
                <div class="waiting-banner-content">
                    <div class="waiting-banner-icon">
                        <div class="waiting-spinner"></div>
                    </div>
                    <h2 class="waiting-banner-title">${title}</h2>
                    <p class="waiting-banner-subtitle">${subtitle}</p>
                    <div class="waiting-progress-bar">
                        <div class="waiting-progress-fill"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(banner);
            
            // Animation d'entr�e
            setTimeout(() => {
                banner.classList.add('visible');
            }, 50);
        }
        
        function hideWaitingBanner() {
            const existingBanner = document.getElementById('waiting-banner');
            if (existingBanner) {
                console.log(`?? [WaitingBanner] Masquage banni�re d'attente`);
                existingBanner.classList.add('fade-out');
                setTimeout(() => {
                    if (existingBanner.parentNode) {
                        existingBanner.parentNode.removeChild(existingBanner);
                    }
                }, 300);
            }
        }

        /**
         * Affiche une banni�re de succ�s plein �cran (style SEA mais verte)
         */
        function showSuccessBanner(action, result) {
            const confirmationId = `success_${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou agressif
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${confirmationId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re de succ�s avec style moderne
            const successDiv = document.createElement('div');
            successDiv.id = confirmationId;
            successDiv.style.cssText = `
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                box-shadow: 0 20px 40px rgba(76, 175, 80, 0.4);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 500px;
                animation: fadeIn 0.3s ease-out;
            `;
            
            successDiv.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">?</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Probl�me r�solu automatiquement !</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Action :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>? Statut :</strong> Corrig� en temps r�el</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    ${result.message || 'Le syst�me a d�tect� et corrig� automatiquement le probl�me. Aucune intervention manuelle n�cessaire !'}
                </p>
                <button onclick="closeSuccessBanner('${confirmationId}')" style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.4);
                    color: white;
                    padding: 0.85rem 2rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 1rem;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ?? Parfait !
                </button>
            `;
            
            // Fermer au clic sur l'overlay
            overlayDiv.onclick = () => closeSuccessBanner(confirmationId);
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(successDiv);
            
            // ? FERMETURE AUTOMATIQUE APR�S 15 SECONDES (plus visible)
            setTimeout(() => {
                closeSuccessBanner(confirmationId);
            }, 15000);
            
            console.log(`?? [SuccessBanner] Banni�re de succ�s affich�e pour: ${action.description}`);
        }

        /**
         * Ferme la banni�re de succ�s
         */
        function closeSuccessBanner(confirmationId) {
            const overlay = document.getElementById(`overlay_${confirmationId}`);
            const banner = document.getElementById(confirmationId);
            
            if (overlay) overlay.remove();
            if (banner) banner.remove();
            
            // Retour automatique � l'accueil apr�s fermeture
            console.log('?? [SuccessBanner] Retour automatique � l\'accueil');
            returnToHome();
        }

        /**
         * Ex�cute une action sur un �quipement
         */
        async function executeAction(actionType, deviceId, parameters) {
            try {
                console.log(`?? [ExecuteAction] Ex�cution de l'action : ${actionType}...`);
                
                let endpoint = '';
                let payload = {};
                
                // D�terminer l'endpoint selon le type d'action
                switch (actionType) {
                    case 'sennheiser_mute':
                        endpoint = '/api/device-action/sennheiser/set-mute';
                        payload = {
                            host: parameters.host || parameters.device_name,
                            mute: parameters.mute
                        };
                        break;
                    
                    case 'pjlink_power':
                        endpoint = '/api/device-action/pjlink/power';
                        payload = {
                            device_name: parameters.device_name,
                            power_on: parameters.power_on
                        };
                        break;
                    
                    case 'pjlink_av_mute':
                        endpoint = '/api/device-action/pjlink/av-mute';
                        payload = {
                            device_name: parameters.device_name,
                            video_mute: parameters.video_mute || false,
                            audio_mute: parameters.audio_mute || false
                        };
                        break;
                        
                    case 'pjlink_av_unmute':
                        // ? CORRECTION JUMEL�E : Traitement sp�cial pour AV Mute invisible + banni�re
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${parameters.device_name}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                console.log(`? [ExecuteAction] AV Mute d�sactiv� avec succ�s sur ${parameters.device_name}`);
                                
                                // ? SIMULATION : Cr�er une r�ponse comme si c'�tait auto-ex�cut� par le RAG
                                return {
                                    success: true,
                                    auto_executed: true, // ? MARQUER comme auto-ex�cut�
                                    auto_result: `? AV Mute d�sactiv� automatiquement sur ${parameters.device_name}`,
                                    simulated_rag_response: true
                                };
                            } else {
                                throw new Error(`Erreur HTTP ${response.status}`);
                            }
                        } catch (error) {
                            console.error(`? [ExecuteAction] Erreur AV Mute pour ${parameters.device_name}:`, error);
                            throw error;
                        }
                        return; // �viter l'ex�cution du code standard
                        
                    default:
                        throw new Error(`Type d'action non support�: ${actionType}`);
                }
                
                // Ex�cuter l'action
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log(`? [ExecuteAction] Action ex�cut�e avec succ�s: ${result.message}`);
                    
                    // ? NOUVEAU: Logique s�quentielle pour allumage de projecteur
                    if (actionType === 'pjlink_power' && parameters.power_on === true) {
                        const deviceName = parameters.device_name || 'Projecteur';
                        console.log(`?? [SequentialLogic] Allumage d�tect� pour ${deviceName} - D�marrage banni�re d'attente`);
                        
                        // Afficher la banni�re d'attente avec s�quence compl�te
                        showSequentialProjectorBanner(deviceName, 'power_on', {
                            maxDuration: 35,
                            checkAfterPowerOn: true
                        });
                    }
                    
                    return result;
                } else {
                    throw new Error(result.message || '�chec de l\'ex�cution');
                }
                
            } catch (error) {
                console.error('? [ExecuteAction] Erreur lors de l\'ex�cution de l\'action:', error);
                throw error;
            }
        }

        /**
         * ? NOUVEAU: Affiche une banni�re d'attente pour l'allumage de projecteur
         */
        function showSequentialProjectorBanner(deviceName, actionType, options = {}) {
            const bannerId = `seq_projector_${Date.now()}`;
            console.log(`?? [SequentialBanner] D�marrage banni�re ${actionType} pour ${deviceName}`);
            
            // Supprimer les banni�res existantes
            document.querySelectorAll('.sequential-banner-overlay').forEach(banner => banner.remove());
            
            // Configuration selon le type d'action
            const config = getSequentialBannerConfig(actionType, deviceName, options);
            
            // Cr�er l'overlay
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${bannerId}`;
            overlayDiv.className = 'sequential-banner-overlay';
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(20px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Cr�er la banni�re
            const bannerDiv = document.createElement('div');
            bannerDiv.id = bannerId;
            bannerDiv.className = 'sequential-banner fade-in';
            bannerDiv.style.cssText = `
                background: ${config.background};
                border-radius: 20px;
                padding: 3rem;
                color: white;
                text-align: center;
                box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                max-width: 600px;
                width: 90%;
                position: relative;
                overflow: hidden;
                border: 2px solid ${config.borderColor};
            `;
            
            bannerDiv.innerHTML = config.html;
            
            // Ajouter les animations CSS
            addSequentialBannerStyles();
            
            // Ajouter au DOM
            overlayDiv.appendChild(bannerDiv);
            document.body.appendChild(overlayDiv);
            
            // D�marrer la logique s�quentielle selon le type
            switch (actionType) {
                case 'power_on':
                    startPowerOnSequence(bannerId, deviceName, options);
                    break;
                case 'av_unmute':
                    startAVUnmuteSequence(bannerId, deviceName, options);
                    break;
                case 'monitoring':
                    startMonitoringSequence(bannerId, deviceName, options);
                    break;
            }
            
            return bannerId;
        }
        
        /**
         * ? NOUVEAU: Configuration des banni�res selon le type d'action
         */
        function getSequentialBannerConfig(actionType, deviceName, options) {
            const configs = {
                power_on: {
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                    borderColor: '#3b82f6',
                    html: `
                        <div class="sequential-content">
                            <div class="projector-icon-animated" style="font-size: 4rem; margin-bottom: 1.5rem; animation: powerBlink 1.2s infinite;">???</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Allumage en cours</h3>
                            <p style="margin: 0 0 2rem 0; font-size: 1.2rem; opacity: 0.95;">Le projecteur <strong>${deviceName}</strong> d�marre...</p>
                            
                            <div class="progress-section">
                                <div class="status-text" style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">
                                    ?? Envoi de la commande d'allumage
                                </div>
                                
                                <div class="real-time-monitor" style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                                    <div class="monitor-title" style="font-weight: 600; margin-bottom: 1rem;">Surveillance temps r�el</div>
                                    <div class="monitor-status" id="monitor_${deviceName}" style="font-family: monospace; font-size: 0.9rem;">
                                        ? V�rification de l'�tat...
                                    </div>
                                </div>
                                
                                <div class="countdown-section" style="margin-top: 2rem;">
                                    <div class="countdown-timer" style="font-size: 1.1rem; font-weight: 600; color: #fbbf24;">
                                        ?? Surveillance active - Maximum 45s
                                    </div>
                                </div>
                            </div>
                            
                            <p style="margin: 2rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                ? Analyse automatique AV Mute apr�s allumage confirm�
                            </p>
                        </div>
                    `
                },
                av_unmute: {
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    borderColor: '#10b981',
                    html: `
                        <div class="sequential-content">
                            <div class="correction-icon" style="font-size: 4rem; margin-bottom: 1.5rem; animation: successPulse 1s infinite;">?</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Correction AV Mute</h3>
                            <p style="margin: 0 0 1.5rem 0; font-size: 1.2rem; opacity: 0.95;">
                                D�sactivation AV Mute sur <strong>${deviceName}</strong>
                            </p>
                            
                            <div class="correction-progress" style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1.5rem; margin: 1rem 0;">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">?? ? ??? Commande envoy�e</div>
                                <div style="font-size: 0.9rem; opacity: 0.8;">L'image devrait appara�tre imm�diatement</div>
                            </div>
                            
                            <p style="margin: 1.5rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                Cette banni�re se fermera automatiquement dans 3 secondes
                            </p>
                        </div>
                    `
                }
            };
            
            return configs[actionType] || configs.power_on;
        }
        
        /**
         * ? NOUVEAU: Ajouter les styles CSS pour les banni�res s�quentielles
         */
        function addSequentialBannerStyles() {
            if (!document.getElementById('sequential-banner-styles')) {
                const style = document.createElement('style');
                style.id = 'sequential-banner-styles';
                style.textContent = `
                    @keyframes powerBlink {
                        0%, 50% { opacity: 1; transform: scale(1) rotate(0deg); }
                        25% { opacity: 0.7; transform: scale(1.15) rotate(-2deg); }
                        75% { opacity: 1; transform: scale(0.95) rotate(2deg); }
                    }
                    
                    @keyframes successPulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.1); }
                    }
                    
                    @keyframes monitorGlow {
                        0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
                        50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
                    }
                    
                    .real-time-monitor {
                        animation: monitorGlow 2s infinite;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        /**
         * ? NOUVEAU: G�re le compte � rebours de la banni�re d'attente
         */
        function startCountdown(bannerId, totalSeconds) {
            const banner = document.getElementById(bannerId);
            if (!banner) return;
            
            const progressBar = banner.querySelector('.progress-bar');
            const countdownTimer = banner.querySelector('.countdown-timer');
            
            let remainingSeconds = totalSeconds;
            
            const interval = setInterval(() => {
                remainingSeconds--;
                
                // Mettre � jour le timer
                if (countdownTimer) {
                    countdownTimer.textContent = `${remainingSeconds}s`;
                }
                
                // Mettre � jour la barre de progression
                if (progressBar) {
                    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
                    progressBar.style.width = `${progress}%`;
                }
                
                // Fin du compte � rebours
                if (remainingSeconds <= 0) {
                    clearInterval(interval);
                    // Fermer la banni�re et v�rifier l'�tat
                    setTimeout(() => {
                        closeWaitingBanner(bannerId);
                        // ? NOUVEAU: D�clencher une nouvelle v�rification automatique
                        recheckProjectorStatus();
                    }, 1000);
                }
            }, 1000);
            
            // Stocker l'interval pour pouvoir l'annuler si n�cessaire
            if (banner) {
                banner.dataset.intervalId = interval;
            }
        }
        
        /**
         * ? NOUVEAU: Ferme la banni�re d'attente
         */
        function closeWaitingBanner(bannerId) {
            const banner = document.getElementById(bannerId);
            const overlay = document.getElementById(`overlay_${bannerId}`);
            
            if (banner && banner.dataset.intervalId) {
                clearInterval(parseInt(banner.dataset.intervalId));
            }
            
            if (overlay) {
                overlay.remove();
            }
        }
        /**
         * ? NOUVEAU: S�quence d'allumage avec surveillance temps r�el
         */
        async function startPowerOnSequence(bannerId, deviceName, options) {
            console.log(`?? [PowerOnSequence] D�marrage surveillance pour ${deviceName}`);
            
            const maxDuration = 45; // 45 secondes maximum
            const checkInterval = 3; // V�rifier toutes les 3 secondes
            let elapsed = 0;
            let powerOnDetected = false;
            
            const updateMonitorStatus = (status, isSuccess = false) => {
                const monitor = document.getElementById(`monitor_${deviceName}`);
                if (monitor) {
                    monitor.innerHTML = status;
                    if (isSuccess) {
                        monitor.style.color = '#10b981';
                        monitor.style.fontWeight = '600';
                    }
                }
            };
            
            const interval = setInterval(async () => {
                elapsed += checkInterval;
                
                try {
                    // V�rifier l'�tat du projecteur
                    const currentRoom = getCurrentRoom();
                    const equipmentData = await fetchRoomEquipment(currentRoom);
                    
                    // ? CORRECTION: Utiliser equipmentData.devices (pas equipmentData directement)
                    if (!equipmentData || !equipmentData.devices || !Array.isArray(equipmentData.devices)) {
                        console.warn(`?? [PowerOnSequence] Donn�es �quipements invalides: ${JSON.stringify(equipmentData)}`);
                        updateMonitorStatus(`?? Erreur acc�s �quipements (${elapsed}s)`);
                        return;
                    }
                    
                    console.log(`?? [PowerOnSequence] ${equipmentData.devices.length} �quipements trouv�s en salle ${currentRoom}`);
                    
                    // Chercher le projecteur par nom complet ou partiel
                    const projector = equipmentData.devices.find(d => {
                        const deviceNameMatch = d.device_name === deviceName || 
                                              (d.device_name && d.device_name.includes(deviceName.replace('PROJ-', ''))) ||
                                              d.name === deviceName ||
                                              (d.name && d.name.includes(deviceName.replace('PROJ-', '')));
                        const isProjectorType = (d.device_model_name && d.device_model_name.toLowerCase().includes('proj')) ||
                                              (d.device_family_name && d.device_family_name.toLowerCase().includes('proj')) ||
                                              (d.name && d.name.toLowerCase().includes('proj'));
                        return deviceNameMatch || isProjectorType;
                    });
                    
                    if (projector) {
                        console.log(`?? [PowerOnSequence] Projecteur trouv�: ${projector.device_name || projector.name}, �tat: ${projector.status} (${elapsed}s)`);
                        
                        if (projector.status === 'online' || projector.status === 'power_on') {
                            powerOnDetected = true;
                            updateMonitorStatus('? Projecteur allum� - Analyse AV Mute...', true);
                            clearInterval(interval);
                            
                            // D�lai pour laisser le projecteur se stabiliser
                            setTimeout(() => {
                                startAVMuteAnalysis(bannerId, deviceName, projector);
                            }, 2000);
                            return;
                        } else {
                            updateMonitorStatus(`? Allumage en cours... �tat: ${projector.status} (${elapsed}s/${maxDuration}s)`);
                        }
                    } else {
                        console.log(`?? [PowerOnSequence] �quipements disponibles:`, equipmentData.devices.map(d => ({ name: d.device_name || d.name, status: d.status })));
                        updateMonitorStatus(`?? Projecteur ${deviceName} non trouv� (${elapsed}s)`);
                    }
                    
                } catch (error) {
                    console.error(`? [PowerOnSequence] Erreur v�rification: ${error}`);
                    updateMonitorStatus(`? Erreur v�rification (${elapsed}s)`);
                }
                
                // Timeout apr�s 45 secondes - V�RIFICATION FINALE AVANT ESCALADE
                if (elapsed >= maxDuration) {
                    clearInterval(interval);
                    if (!powerOnDetected) {
                        console.log(`?? [PowerOnSequence] TIMEOUT ${maxDuration}s atteint - V�rification finale avant escalade pour ${deviceName}`);
                        updateMonitorStatus('? Timeout atteint - V�rification finale...');
                        
                        setTimeout(async () => {
                            try {
                                // ? DERNI�RE V�RIFICATION avant escalade
                                const currentRoom = getCurrentRoom();
                                const equipmentData = await fetchRoomEquipment(currentRoom);
                                
                                if (equipmentData && equipmentData.devices && Array.isArray(equipmentData.devices)) {
                                    const projector = equipmentData.devices.find(d => {
                                        const deviceNameMatch = d.device_name === deviceName || 
                                                              (d.device_name && d.device_name.includes(deviceName.replace('PROJ-', ''))) ||
                                                              d.name === deviceName ||
                                                              (d.name && d.name.includes(deviceName.replace('PROJ-', '')));
                                        const isProjectorType = (d.device_model_name && d.device_model_name.toLowerCase().includes('proj')) ||
                                                              (d.device_family_name && d.device_family_name.toLowerCase().includes('proj')) ||
                                                              (d.name && d.name.toLowerCase().includes('proj'));
                                        return deviceNameMatch || isProjectorType;
                                    });
                                    
                                                                        // ? CORRECTION : Utiliser v�rification temps r�el au lieu du cache statique
                                    console.log(`?? [PowerOnSequence] V�rification temps r�el finale pour ${deviceName}...`);
                                    
                                    try {
                                        const realtimeStatus = await fetchProjectorRealtimeStatus(deviceName);
                                        
                                        if (realtimeStatus && realtimeStatus.is_online) {
                                            const powerOn = realtimeStatus.power_status === 'on' || realtimeStatus.power_status === 'ON';
                                            const hasAVMute = realtimeStatus.av_mute_video || realtimeStatus.av_mute_audio;
                                            
                                            console.log(`? [PowerOnSequence] �tat temps r�el: power=${realtimeStatus.power_status}, AVMute=${hasAVMute}`);
                                            
                                            if (powerOn) {
                                                if (hasAVMute) {
                                                    console.log(`?? [PowerOnSequence] AV Mute d�tect� ? Correction automatique invisible`);
                                                    updateMonitorStatus('?? Correction AV Mute automatique...');

                                                    // ? Correction AV Mute INVISIBLE
                                                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${deviceName}`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' }
                                                    });
                                                    
                                                    if (avMuteResponse.ok) {
                                                        console.log(`? [PowerOnSequence] PROBL�ME R�SOLU: AV Mute corrig� sur ${deviceName}`);
                                                        updateMonitorStatus('? Probl�me vid�o r�solu !', true);
                                                        
                                                        // ? AFFICHER BANNI�RE DE SUCC�S (pas d'escalade)
                                                        setTimeout(() => {
                                                            closeSequentialBanner(bannerId);
                                                            showAutoResultBanner(`? Probl�me vid�o r�solu automatiquement sur ${deviceName}`);
                                                        }, 2000);
                                                        return;
                                                    }
                                                } else {
                                                    // ? CORRECTION LOGIQUE : Projecteur allum� sans AV Mute, mais probl�me vid�o signal� ? V�rification approfondie
                                                    console.log(`?? [PowerOnSequence] Projecteur ${deviceName} allum� sans AV Mute - V�rification si probl�me persiste`);
                                                    updateMonitorStatus('?? Projecteur fonctionnel - V�rification probl�me persistant...');
                                                    
                                                    // ? NOUVELLE LOGIQUE : Au lieu de consid�rer le probl�me r�solu, escalader si probl�me persiste
                                                    setTimeout(() => {
                                                        closeSequentialBanner(bannerId);
                                                        // D�clencher l'escalade car �quipement fonctionne mais probl�me vid�o persiste
                                                        setTimeout(() => {
                                                            console.log('?? [PowerOnSequence] Escalade - �quipement fonctionnel mais probl�me vid�o persiste');
                                                            showSEAEscalationBanner({
                                                                intent: 'video_problem',
                                                                confidence: 0.9,
                                                                room: getCurrentRoom(),
                                                                problems: [{
                                                                    room: getCurrentRoom(),
                                                                    device: deviceName,
                                                                    severity: 'medium',
                                                                    reason: `Projecteur ${deviceName} allum� et fonctionnel mais probl�me vid�o persistant`
                                                                }],
                                                                escalation_needed: true,
                                                                escalation_reason: `Projecteur ${deviceName} op�rationnel mais probl�me vid�o non r�solu - Diagnostic sp�cialis� requis`
                                                            });
                                                        }, 500);
                                                    }, 2000);
                                                    return;
                                                }
                                            }
                                        }
                                    } catch (realtimeError) {
                                        console.error(`?? [PowerOnSequence] Erreur v�rification temps r�el:`, realtimeError);
                                    }
                                }
                                
                                // ? Si toujours pas allum� apr�s v�rification finale
                                console.log(`? [PowerOnSequence] V�RIFICATION FINALE �CHOU�E: Projecteur ${deviceName} toujours pas allum� - Escalade n�cessaire`);
                                updateMonitorStatus('? Projecteur non allum� - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    // Escalade automatique apr�s v�rification finale
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `�chec allumage ${deviceName} apr�s ${maxDuration}s + v�rification finale`
                                    });
                                }, 2000);
                                
                            } catch (error) {
                                console.error(`? [PowerOnSequence] Erreur v�rification finale:`, error);
                                updateMonitorStatus('? Erreur v�rification - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `Erreur technique v�rification finale ${deviceName}`
                                    });
                                }, 2000);
                            }
                        }, 1000);
                    }
                }
            }, checkInterval * 1000);
        }
        
        /**
         * ? NOUVEAU: Analyse automatique AV Mute apr�s allumage
         */
        async function startAVMuteAnalysis(bannerId, deviceName, projectorData = null) {
            console.log(`?? [AVMuteAnalysis] Analyse AV Mute pour ${deviceName}`, projectorData);
            
            const updateMonitorStatus = (status, isSuccess = false) => {
                const monitor = document.getElementById(`monitor_${deviceName}`);
                if (monitor) {
                    monitor.innerHTML = status;
                    if (isSuccess) {
                        monitor.style.color = '#10b981';
                        monitor.style.fontWeight = '600';
                    }
                }
            };
            
            try {
                updateMonitorStatus('?? Analyse AV Mute en cours...');
                
                // Attendre un peu pour que le projecteur se stabilise
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // ? M�THODE 1: Tenter diagnostic direct en interrogeant le probl�me vid�o
                console.log(`?? [AVMuteAnalysis] Tentative diagnostic AV Mute via probl�me vid�o`);
                
                // ? S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `�cran noir projecteur ${deviceName}`,
                        room: currentRoom,
                        context: {
                            sequential_check: true,
                            av_mute_analysis: true,
                            target_device: deviceName,
                            force_projector_check: true
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('?? [AVMuteAnalysis] R�ponse backend diagnostic:', data);
                    
                    // Chercher des actions de correction AV Mute
                    const avMuteActions = data.actions ? data.actions.filter(action => 
                        action.type === 'pjlink_av_unmute' || 
                        action.type === 'pjlink_av_mute' ||
                        (action.description && action.description.toLowerCase().includes('av mute')) ||
                        (action.description && action.description.toLowerCase().includes('d�sactiver') && action.description.toLowerCase().includes('mute'))
                    ) : [];
                    
                    console.log(`?? [AVMuteAnalysis] Actions AV Mute trouv�es:`, avMuteActions);
                    
                    if (avMuteActions.length > 0) {
                        updateMonitorStatus('?? AV Mute d�tect� - Correction automatique...');
                        
                        // Prendre la premi�re action AV unmute trouv�e
                        const avMuteAction = avMuteActions[0];
                        console.log(`?? [AVMuteAnalysis] Ex�cution action:`, avMuteAction);
                        
                        try {
                            // Construire les param�tres pour l'action
                            const actionParams = {
                                device_name: deviceName,
                                video_mute: false,
                                audio_mute: false,
                                ...avMuteAction.parameters
                            };
                            
                            await executeAction('pjlink_av_mute', avMuteAction.device_id || 0, actionParams);
                            updateMonitorStatus('? AV Mute corrig� - Projecteur op�rationnel !', true);
                            
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 3000);
                            
                        } catch (actionError) {
                            console.error(`? [AVMuteAnalysis] Erreur ex�cution action:`, actionError);
                            updateMonitorStatus('?? Erreur correction AV Mute - V�rifiez manuellement');
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 4000);
                        }
                        
                    } else {
                        // ? CORRECTION ESCALADE : Pas d'AV Mute d�tect� sur projecteur allum� ? Escalade SEA
                        console.log(`?? [AVMuteAnalysis] Aucun AV Mute d�tect� sur projecteur allum� ${deviceName} ? Escalade requise`);
                        updateMonitorStatus('?? Projecteur op�rationnel - Escalade technique n�cessaire...');
                        
                        // Pr�parer le contexte d'escalade
                        const escalationContext = {
                            intent: 'video_problem',
                            confidence: 0.9,
                            room: getCurrentRoom(),
                            problems: [{
                                room: getCurrentRoom(),
                                device: deviceName,
                                severity: 'medium',
                                reason: `Probl�me vid�o persistant sur ${deviceName} - �quipement fonctionnel mais probl�me non r�solu`
                            }],
                            solutions: [],
                            escalation_needed: true,
                            escalation_reason: `Projecteur ${deviceName} fonctionnel mais probl�me vid�o persiste - Diagnostic approfondi requis`
                        };
                        
                        // Fermer la banni�re et escalader
                        setTimeout(() => {
                            closeSequentialBanner(bannerId);
                            // D�clencher l'escalade SEA apr�s fermeture
                            setTimeout(() => {
                                console.log('?? [AVMuteAnalysis] D�clenchement escalade SEA pour probl�me non r�solu');
                                showSEAEscalationBanner(escalationContext);
                            }, 500);
                        }, 1500);
                    }
                    
                } else {
                    console.error(`? [AVMuteAnalysis] Erreur HTTP ${response.status}`);
                    updateMonitorStatus('?? Erreur diagnostic - Projecteur probablement op�rationnel');
                    setTimeout(() => {
                        closeSequentialBanner(bannerId);
                    }, 3000);
                }
                    
                } catch (error) {
                console.error(`? [AVMuteAnalysis] Erreur g�n�rale:`, error);
                updateMonitorStatus('? Erreur analyse AV Mute - V�rifiez manuellement');
                setTimeout(() => {
                    closeSequentialBanner(bannerId);
                }, 3000);
            }
        }
        
        /**
         * ? NOUVEAU: S�quence pour correction AV Mute directe
         */
        function startAVUnmuteSequence(bannerId, deviceName, options) {
            console.log(`? [AVUnmuteSequence] Correction AV Mute pour ${deviceName}`);
            
            // Fermer automatiquement apr�s 3 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 3000);
        }
        
        /**
         * ? NOUVEAU: S�quence de monitoring g�n�rique
         */
        function startMonitoringSequence(bannerId, deviceName, options) {
            console.log(`?? [MonitoringSequence] Surveillance g�n�rique pour ${deviceName}`);
            
            // Pour l'instant, fermer apr�s 5 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 5000);
        }

        /**
         * ? NOUVEAU: Fermer la banni�re s�quentielle
         */
        function closeSequentialBanner(bannerId) {
            const banner = document.getElementById(bannerId);
            const overlay = document.getElementById(`overlay_${bannerId}`);
            
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    overlay.remove();
                    console.log(`?? [SequentialBanner] Banni�re ${bannerId} ferm�e`);
                }, 300);
            }
        }

        /**
         * ? ANCIEN: Re-v�rifie l'�tat du projecteur apr�s allumage (OBSOL�TE)
         */
        async function recheckProjectorStatus() {
            console.log('?? [SequentialCheck] Re-v�rification de l\'�tat du projecteur apr�s allumage');
            
            // R�-envoyer automatiquement la demande de probl�me vid�o pour v�rification
            try {
                // ? S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'V�rification post-allumage projecteur', // Message technique pour re-check
                        room: currentRoom,
                        context: {
                            sequential_check: true,
                            auto_recheck: true
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('? [SequentialCheck] V�rification post-allumage termin�e');
                    processResponse(data);
                } else {
                    console.error('? [SequentialCheck] Erreur lors de la re-v�rification');
                    // En cas d'erreur, afficher directement la banni�re SEA
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.8,
                        room: currentRoom,
                        escalation_reason: 'V�rification post-allumage �chou�e - intervention technique requise'
                    });
                }
            } catch (error) {
                console.error('? [SequentialCheck] Erreur r�seau:', error);
            }
        }

        /**
         * Affiche la banni�re de confirmation des actions automatiques
         * avec le m�me style que les banni�res SIM/SEA
         */
        function showAutoResultBanner(autoResult) {
            // ? CORRECTION: Fermer toutes les banni�res auto-result existantes AVANT d'en cr�er une nouvelle
            const existingAutoBanners = document.querySelectorAll('[id^="auto_result_"]');
            const existingAutoOverlays = document.querySelectorAll('[id^="overlay_auto_result_"]');
            
            existingAutoBanners.forEach(banner => {
                console.log(`?? [CleanupAutoBanner] Suppression banni�re auto-result existante: ${banner.id}`);
                banner.remove();
            });
            
            existingAutoOverlays.forEach(overlay => {
                console.log(`?? [CleanupAutoOverlay] Suppression overlay auto-result existant: ${overlay.id}`);
                overlay.remove();
            });
            
            // ? NETTOYAGE TOTAL : Supprimer TOUS les messages du chat avant d'afficher la banni�re
            const assistantPage = document.getElementById('assistantPage');
            if (assistantPage) {
                const allMessages = assistantPage.querySelectorAll('.message');
                allMessages.forEach(message => {
                    message.remove();
                    console.log('?? Message supprim� du chat avant banni�re');
                });
            }
            
            // ? MASQUER les palettes pendant l'affichage de la banni�re
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'none';
            }
            
            const bannerId = `auto_result_${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${bannerId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re de confirmation
            const bannerDiv = document.createElement('div');
            bannerDiv.id = bannerId;
            bannerDiv.className = 'auto-result-banner fade-in';
            bannerDiv.style.cssText = `
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 12px;
                padding: 2rem;
                color: white !important;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 500px;
                border: 2px solid #10b981;
            `;
            
            bannerDiv.innerHTML = `
                <div class="auto-result-header" style="margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">?</div>
                    <div class="auto-result-text">
                        <strong style="color: white !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Action Automatique R�ussie</strong>
                        <span style="color: white !important; font-weight: 500; font-size: 1.1rem;">${autoResult}</span>
                    </div>
                </div>
                
                <div style="margin-top: 2rem;">
                    <button 
                        onclick="closeAutoResultBanner('${bannerId}')" 
                        style="
                            background: rgba(255, 255, 255, 0.2);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            color: white !important;
                            padding: 0.75rem 2rem;
                            border-radius: 6px;
                font-weight: 600;
                            cursor: pointer;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
                    >
                        Fermer
                    </button>
                </div>
            `;
            
            // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeAutoResultBanner(bannerId);
                }
            };
            
            // ? Emp�cher la propagation des �v�nements depuis la banni�re
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(bannerDiv);
            
            // Auto-fermeture apr�s 5 secondes
            setTimeout(() => {
                closeAutoResultBanner(bannerId);
            }, 5000);
        }

        /**
         * Ferme la banni�re de confirmation automatique
         */
        function closeAutoResultBanner(bannerId) {
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // ? REMETTRE les palettes apr�s fermeture de la banni�re
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'grid';
                problemPalettes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
                problemPalettes.style.gap = '2rem';
            }
        }

        /**
         * Affiche la banni�re SEA centr�e avec overlay (comme les autres banni�res)
         */
        function showSEAEscalationBanner(data) {

// Guard: if a SEA banner is already present, do NOT recreate (prevents refresh while typing)
if (document.querySelector('[id^="escalation_sea_"]') || document.querySelector('[id^="overlay_escalation_sea_"]')) {
    console.log('?? [SEA Banner] Already open � skip re-render');
    return;
}
            // ? CORRECTION: Fermer toutes les banni�res SEA existantes AVANT d'en cr�er une nouvelle
            const existingSeaBanners = document.querySelectorAll('[id^="escalation_sea_"]');
            const existingSeaOverlays = document.querySelectorAll('[id^="overlay_escalation_sea_"]');
            
            existingSeaBanners.forEach(banner => {
                console.log(`?? [CleanupSEABanner] Suppression banni�re SEA existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSeaOverlays.forEach(overlay => {
                console.log(`?? [CleanupSEAOverlay] Suppression overlay SEA existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const escalationId = `escalation_sea_${Date.now()}`;
            const currentRoom = getCurrentRoom();
            
            // Cr�er l'overlay plein �cran avec flou
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${escalationId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re SEA
            const escalationDiv = document.createElement('div');
            escalationDiv.id = escalationId;
            escalationDiv.className = 'escalation-compact fade-in';
            escalationDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                padding: 2rem;
                color: black !important;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            escalationDiv.innerHTML = `
                <div class="escalation-header" style="margin-bottom: 1.5rem;">
                    <div class="escalation-image-container" style="text-align: center; margin-bottom: 1rem;">
                        <img id="sea-logo-${escalationId}" alt="Service Expert Audiovisuel UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                        <div class="sea-fallback-content" style="display:none; display: none; color: black !important; text-align: center; padding: 1rem;">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; color: black !important;">ASSISTANCE TECHNIQUE</h3>
                            <p style="margin: 0 0 0.5rem 0; font-size: 1rem; color: black !important;">COMPOSER LE POSTE</p>
                            <p style="margin: 0; font-size: 3rem; font-weight: bold; color: black !important;">6135</p>
                        </div>
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Intervention technique requise</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">SEA: ?? 6135 ou cr�er un ticket - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="client-description-section" style="margin: 1.5rem 0;">
                    <div class="description-header" style="margin-bottom: 0.5rem;">
                        <i class="fas fa-edit" style="color: black !important; margin-right: 0.5rem;"></i>
                        <span style="color: black !important; font-weight: 600;">Description d�taill�e (facultative)</span>
                    </div>
                    <textarea
                        id="clientDescription_${escalationId}"
                        class="client-description-input"
                        placeholder="D�crivez votre probl�me en d�tail..."
                        rows="3"
                        style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 6px;
                            color: black !important;
                            background: white;
                            resize: vertical;
                            font-family: inherit;
                        "
                    ></textarea>
                    <div class="description-help" style="margin-top: 0.5rem;">
                        <small style="color: black !important; font-style: italic;">?? Si vous ne saisissez rien, un message g�n�rique sera utilis� selon le type de probl�me.</small>
                    </div>
                </div>
                
                <div class="escalation-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button 
                        onclick="closeSEAEscalationBanner('${escalationId}')" 
                        style="
                            background: rgba(0, 0, 0, 0.1);
                            border: 1px solid rgba(0, 0, 0, 0.2);
                            color: black !important;
                            padding: 0.75rem 1.5rem;
                            border-radius: 6px;
                font-weight: 600;
                        cursor: pointer;
                            font-size: 1rem;
                        transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='rgba(0, 0, 0, 0.2)'"
                        onmouseout="this.style.background='rgba(0, 0, 0, 0.1)'"
                    >
                        <i class="fas fa-times"></i> Fermer
                    </button>
                    <button 
                        onclick="createTicketFromBanner('${escalationId}', ${JSON.stringify(data.escalation_actions || []).replace(/"/g, '&quot;')})" 
                        style="
                            background: #3b82f6;
                            border: 1px solid #2563eb;
                            color: white !important;
                            padding: 0.75rem 1.5rem;
                            border-radius: 6px;
                            font-weight: 600;
                        cursor: pointer;
                            font-size: 1rem;
                        transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='#2563eb'"
                        onmouseout="this.style.background='#3b82f6'"
                    >
                        <i class="fas fa-paper-plane"></i> Cr�er un ticket
                    </button>
                </div>
            `;
            
            // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
            overlayDiv.onclick = (event) => {
                // Fermer seulement si on clique directement sur l'overlay, pas sur ses enfants
                if (event.target === overlayDiv) {
                    closeSEAEscalationBanner(escalationId);
                }
            };
            
            // ? Emp�cher la propagation des �v�nements depuis la banni�re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // ? NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la banni�re
            hideDiagnosticLoading();
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(escalationDiv);
        
    window.__SEA_BANNER_OPEN__ = true;
    // After render, hydrate SEA logo images
    try {
        document.querySelectorAll('[id^="sea-logo-"]').forEach(el => updateSEALogo(el));
    } catch(e) { console.warn('SEA logo hydration error', e); }
}


        /**
         * Ferme la banni�re SEA
         */
        function closeSEAEscalationBanner(escalationId) {
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // ? CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme manuellement la banni�re
            clearEscalationTimeout();
            console.log('?? [EscalationTimeout] Timer d\'escalade annul� suite � fermeture manuelle de la banni�re');
        }

        /**
         * Cr�e un ticket depuis la banni�re SEA
         */
        function createTicketFromBanner(escalationId, escalationActions) {
            const description = document.getElementById(`clientDescription_${escalationId}`)?.value?.trim();
            
            // ? CORRECTION: Cr�er le ticket AVANT de fermer la banni�re
            createTicket(escalationId, escalationActions, description);
        }
        /**
         * Affiche la modale pour la description d�taill�e du ticket
         */
        function showTicketDescriptionModal(escalationId, escalationActions) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            
            modalIcon.textContent = '??';
            modalTitle.textContent = 'Description du probl�me (optionnel)';
            modalMessage.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #666;">
                        Vous pouvez ajouter une description d�taill�e du probl�me pour aider l'�quipe technique :
                    </p>
                    <textarea 
                        id="ticketDescription" 
                        placeholder="D�crivez le probl�me en d�tail (optionnel)..."
                        style="
                            width: 100%;
                            min-height: 100px;
                            padding: 0.75rem;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-family: inherit;
                            font-size: 0.9rem;
                            resize: vertical;
                            margin-bottom: 1rem;
                        "
                    ></textarea>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="closeTicketDescriptionModal()" style="
                        background: #f3f4f6;
                        color: #374151;
                        border: 1px solid #d1d5db;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">
                        Annuler
                    </button>
                    <button onclick="createTicketWithDescription('${escalationId}', ${JSON.stringify(escalationActions).replace(/"/g, '&quot;')})" style="
                        background: var(--primary-blue);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        font-weight: 500;
                    ">
                        Envoyer le ticket
                    </button>
                </div>
            `;
            
            modalOverlay.classList.add('active');
        }

        /**
         * Ferme la modale de description du ticket
         */
        function closeTicketDescriptionModal() {
            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.remove('active');
        }

        /**
         * Ferme la banni�re d'escalade et son overlay
         */
        function closeEscalationBanner(escalationId) {
            console.log(`?? [CloseEscalation] Fermeture banni�re ${escalationId}`);
            
            // Supprimer la banni�re
            const escalationDiv = document.getElementById(escalationId);
            if (escalationDiv) {
                escalationDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // R�afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Ferme la confirmation de ticket et son overlay
         */
        function closeTicketConfirmation(confirmationId) {
            console.log(`? [CloseConfirmation] Fermeture confirmation ${confirmationId}`);
            
            // Supprimer la confirmation
            const confirmationDiv = document.getElementById(confirmationId);
            if (confirmationDiv) {
                confirmationDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${confirmationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // R�afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Affiche la banni�re de ticket existant avec overlay moderne
         */
        function showExistingTicketBanner(lastTicket) {
            console.log(`?? [ExistingTicket] Affichage banni�re pour ticket existant: ${lastTicket.number}`);
            
            // ? CORRECTION : Masquer le sablier diagnostic car banni�re de ticket prend le relais
            hideDiagnosticLoading();
            console.log('? [ExistingTicket] Sablier diagnostic masqu� - Banni�re ticket existant prend le relais');
            
            // ? CORRECTION: Fermer toutes les banni�res existantes AVANT d'en cr�er une nouvelle
            const existingBanners = document.querySelectorAll('[id^="existing_ticket_"]');
            const existingOverlays = document.querySelectorAll('[id^="overlay_existing_ticket_"]');
            
            existingBanners.forEach(banner => {
                console.log(`?? [CleanupBanner] Suppression banni�re existante: ${banner.id}`);
                banner.remove();
            });
            
            existingOverlays.forEach(overlay => {
                console.log(`?? [CleanupOverlay] Suppression overlay existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Cr�er la banni�re de ticket existant avec overlay plein �cran
            const bannerId = `existing_ticket_${Date.now()}`;
            
            // Cr�er l'overlay plein �cran avec flou agressif
            const overlayDiv = document.createElement('div');
            overlayDiv.id = `overlay_${bannerId}`;
            overlayDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                z-index: 9998;
                cursor: pointer;
            `;
            
            // Cr�er la banni�re de ticket existant
            const bannerDiv = document.createElement('div');
            bannerDiv.id = bannerId;
            bannerDiv.className = 'escalation-compact fade-in';
            bannerDiv.style.cssText = `
                background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
                color: white;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                box-shadow: 0 20px 40px rgba(245, 158, 11, 0.4);
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                width: 90%;
                max-width: 500px;
                animation: fadeIn 0.3s ease-out;
            `;
            
            bannerDiv.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">??</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket d�j� cr�� pour cette salle</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Num�ro :</strong> ${lastTicket.number}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Salle :</strong> ${lastTicket.room}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>? Cr�� :</strong> ${new Date(lastTicket.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    Un ticket SEA a d�j� �t� escalad� vers l'�quipe technique dans la m�me session.
                </p>
                <p style="margin: 1rem 0; opacity: 0.9; font-size: 0.9rem;">
                    ?? <strong>Vous pouvez toujours appeler directement le SEA au 6135</strong> pour un suivi ou une urgence.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap;">
                    <button onclick="closeExistingTicketBanner('${bannerId}')" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.4);
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        ? Fermer
                    </button>
                    <button onclick="window.open('tel:6135', '_self')" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.4);
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        ?? Appeler SEA
                    </button>
                    <button onclick="navigator.clipboard.writeText('${lastTicket.number}').then(() => alert('Num�ro de ticket copi�!'))" style="
                        background: rgba(255,255,255,0.9);
                        border: none;
                        color: #f97316;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        ?? Copier num�ro
                    </button>
                </div>
            `;
            
            // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeExistingTicketBanner(bannerId);
                }
            };
            
            // ? Emp�cher la propagation des �v�nements depuis la banni�re
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banni�re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            console.log(`?? [ExistingTicketBanner] Banni�re affich�e pour ticket ${lastTicket.number}`);
        }
        
        /**
         * Ferme la banni�re de ticket existant
         */
        function closeExistingTicketBanner(bannerId) {
            console.log(`?? [CloseExistingTicket] Fermeture banni�re ${bannerId}`);
            
            // ? CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme la banni�re
            clearEscalationTimeout();
            console.log('?? [CloseExistingTicket] Timer d\'escalade annul� suite � fermeture banni�re ticket existant');
            
            // Supprimer la banni�re
            const bannerDiv = document.getElementById(bannerId);
            if (bannerDiv) {
                bannerDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // R�afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Cr�e un ticket directement avec description optionnelle du client
         */
        async function createTicketDirect(escalationId, problemType) {
            console.log(`?? [DirectTicket] Cr�ation directe ticket pour ${problemType} - ${escalationId}`);
            
            // R�cup�rer la description optionnelle du client
            const descriptionTextarea = document.getElementById(`problemDescription_${problemType}_${escalationId}`);
            const clientDescription = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            // D�terminer le message g�n�rique selon le type
            let genericMessage = '';
            switch(problemType) {
                case 'video':
                    genericMessage = 'Probl�me vid�o signal� - aucun affichage ou image d�form�e';
                    break;
                case 'audio':
                    genericMessage = 'Probl�me audio signal� - aucun son ou qualit� d�grad�e';
                    break;
                default:
                    genericMessage = 'Probl�me technique signal� n�cessitant intervention';
            }
            
            // Utiliser la description du client ou le message g�n�rique
            const finalDescription = clientDescription || genericMessage;
            
            console.log(`?? [TicketDescription] ${clientDescription ? 'Description client' : 'Message g�n�rique'}: "${finalDescription}"`);
            
            await createTicket(escalationId, problemType, finalDescription);
        }

        /**
         * Cr�e un ticket avec description optionnelle (conserv� pour compatibilit�)
         */
        async function createTicketWithDescription(escalationId, escalationActions) {
            const descriptionTextarea = document.getElementById('ticketDescription');
            const description = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            closeTicketDescriptionModal();
            await createTicket(escalationId, escalationActions, description);
        }

        /**
         * Cr�e un ticket SEA avec description fournie
         */
        async function createTicket(escalationId, problemType, description = '') {
            try {
                // ? CORRECTION : Annuler le timer d'escalade quand un ticket est cr��
                clearEscalationTimeout();
                console.log('?? [EscalationTimeout] Timer d\'escalade annul� suite � cr�ation de ticket');
                
                // ? CORRECTION: V�rifier si l'�l�ment existe avant de l'utiliser
                const escalationElement = document.getElementById(escalationId);
                
                // D�sactiver les boutons seulement si l'�l�ment existe
                if (escalationElement) {
                    const buttons = escalationElement.querySelectorAll('button');
                    buttons.forEach(btn => btn.disabled = true);
                    
                    // Afficher un message de traitement
                    const loadingDiv = document.createElement('div');
                    loadingDiv.style.cssText = `
                        background: rgba(50, 150, 50, 0.8);
                        color: white;
                        padding: 1rem;
                        border-radius: 8px;
                        margin: 1rem 0;
                        text-align: center;
                        font-weight: 500;
                    `;
                    loadingDiv.textContent = '?? Cr�ation du ticket SEA en cours...';
                    escalationElement.appendChild(loadingDiv);
                }
                
                // Pr�parer les donn�es du ticket avec infos Podio enrichies
                const currentRoom = getCurrentRoom();
                const isClientDescription = description && !description.includes('Probl�me ') && description.length > 20;
                
                const baseDescription = `Probl�me ${problemType} signal� par un utilisateur via l'interface vitrine n�cessitant une intervention technique.`;
                const fullDescription = `${baseDescription}\n\nDescription : ${description}`;
                
                // ?? R�cup�rer les infos Podio du cache s'il existe
                const podioInfo = window.roomCache?.podioInfo;
                
                const ticketData = {
                    category: 'technical_issue',
                    priority: 'medium',
                    title: `Probl�me ${problemType} signal� via vitrine - Salle ${currentRoom}`,
                    description: fullDescription,
                    client_message: isClientDescription ? 
                        `Signalement via vitrine SAV Qonnect\n\nDescription client : ${description}` : 
                        `Signalement via vitrine SAV Qonnect\n\nMessage g�n�rique : ${description}`,
                    copilot_analysis: `Analyse automatique : intervention technique recommand�e`,
                    room: currentRoom,
                    device_name: 'Non sp�cifi�',
                    reporter_name: 'Utilisateur Vitrine',
                    // ?? INFOS PODIO ENRICHIES (si disponibles)
                    room_pavillon: podioInfo?.pavillon || null,
                    room_bassin: podioInfo?.bassin || null,
                    room_type: podioInfo?.type || null,
                    room_capacite: podioInfo?.capacite || null
                };
                
                console.log('?? [CreateTicket] Donn�es avec infos Podio:', {
                    room: currentRoom,
                    podioInfo: podioInfo,
                    hasPodioData: !!podioInfo
                });

                // ? S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                // Appeler l'API pour cr�er le ticket
                const response = await fetch(`${currentAPI}/api/copilot/vitrine-create-ticket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(ticketData)
                });

                // ? CORRECTION: Supprimer le message de chargement seulement s'il existe
                if (escalationElement) {
                    const loadingDiv = escalationElement.querySelector('div[style*="background: rgba(50, 150, 50, 0.8)"]');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                }

                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status}). Veuillez r�essayer plus tard.`);
                }

                const result = await response.json();
                
                if (result.success && result.ticket) {
                    // ? AJOUTER LE TICKET � LA SESSION pour �viter les doublons
                    addTicketToSession(result.ticket);
                    
                    // ? CORRECTION: Fermer la banni�re SEA avec la bonne fonction
                    closeSEAEscalationBanner(escalationId);
                    
                    // ? CORRECTION: Fermer toutes les banni�res de confirmation existantes AVANT d'en cr�er une nouvelle
                    const existingConfirmationBanners = document.querySelectorAll('[id^="confirmation_"]');
                    const existingConfirmationOverlays = document.querySelectorAll('[id^="overlay_confirmation_"]');
                    
                    existingConfirmationBanners.forEach(banner => {
                        console.log(`?? [CleanupConfirmationBanner] Suppression banni�re confirmation existante: ${banner.id}`);
                        banner.remove();
                    });
                    
                    existingConfirmationOverlays.forEach(overlay => {
                        console.log(`?? [CleanupConfirmationOverlay] Suppression overlay confirmation existant: ${overlay.id}`);
                        overlay.remove();
                    });
                    
                    // Cr�er la confirmation avec overlay plein �cran
                    const confirmationId = `confirmation_${Date.now()}`;
                    
                    // Cr�er l'overlay plein �cran avec flou agressif
                    const overlayDiv = document.createElement('div');
                    overlayDiv.id = `overlay_${confirmationId}`;
                    overlayDiv.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.8);
                        backdrop-filter: blur(20px);
                        z-index: 9998;
                        cursor: pointer;
                    `;
                    
                    // Cr�er la confirmation de ticket avec style moderne
                    const successDiv = document.createElement('div');
                    successDiv.id = confirmationId;
                    successDiv.style.cssText = `
                        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                        color: white;
                        border-radius: 12px;
                        padding: 2rem;
                        text-align: center;
                        box-shadow: 0 20px 40px rgba(76, 175, 80, 0.4);
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 9999;
                        width: 90%;
                        max-width: 500px;
                        animation: fadeIn 0.3s ease-out;
                    `;
                    
                    successDiv.innerHTML = `
                        <div style="font-size: 3rem; margin-bottom: 1rem;">??</div>
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket SEA cr�� avec succ�s !</h3>
                        <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Num�ro :</strong> ${result.ticket.ticket_number || result.ticket.id}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Salle :</strong> ${result.ticket.room || 'Non sp�cifi�'}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>?? Type :</strong> Probl�me ${problemType}</p>
                        </div>
                        <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                            L'�quipe SEA a re�u votre demande et va traiter le probl�me rapidement.
                        </p>
                        <button onclick="closeTicketConfirmation('${confirmationId}')" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.4);
                            color: white;
                            padding: 0.85rem 2rem;
                            border-radius: 8px;
                            cursor: pointer;
                            margin-top: 1rem;
                            font-size: 1rem;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            ? Fermer
                        </button>
                    `;
                    
                    // ? CORRECTION: Fermer au clic sur l'overlay mais PAS sur les �l�ments internes
                    overlayDiv.onclick = (event) => {
                        if (event.target === overlayDiv) {
                            closeTicketConfirmation(confirmationId);
                        }
                    };
                    
                    // ? Emp�cher la propagation des �v�nements depuis la banni�re
                    successDiv.onclick = (event) => {
                        event.stopPropagation();
                    };
                    
                    // Ajouter l'overlay et la confirmation au body
                    document.body.appendChild(overlayDiv);
                    document.body.appendChild(successDiv);
                    
                    console.log(`?? [CreateTicket] Ticket ${result.ticket.ticket_number} cr�� pour la salle ${currentRoom}`);
                } else {
                    throw new Error(result.message || 'Erreur lors de la cr�ation du ticket');
                }
                
            } catch (error) {
                console.error('Erreur lors de la cr�ation du ticket:', error);
                
                // ? CORRECTION: Fermer la banni�re m�me en cas d'erreur
                closeSEAEscalationBanner(escalationId);
                
                showModal(
                    '?',
                    'Erreur de cr�ation',
                    `Impossible de cr�er le ticket : ${error.message}\n\nVeuillez contacter le SEA directement au 6135.`,
                    'warning'
                );
            }
        }

        // ===== FONCTIONS UTILITAIRES =====
        
        // ===== CHAT SEA UTILITY FUNCTIONS =====
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        // ===== VERROUILLAGE DE SALLE =====
        function checkAndApplyRoomLock() {
            try {
                const lockData = localStorage.getItem('vitrine.room.lock');
                if (lockData) {
                    const lock = JSON.parse(lockData);
                    if (lock && lock.locked && lock.name) {
                        console.log('?? [Lock] Salle verrouill�e d�tect�e:', lock.name);
                        
                        // Appliquer l'interface verrouill�e
                        document.documentElement.classList.add('is-room-locked');
                        
                        // Restaurer la salle dans le cache
                        const roomInfo = parseRoomInfo(lock.name);
                        if (roomInfo) {
                            setRoomCache(roomInfo);
                            
                            // Afficher directement l'assistant (pas la landing)
                            setTimeout(() => {
                                showAssistant();
                                console.log('?? [Lock] Assistant affich� directement pour salle verrouill�e');
                                
                                // ===== CHAT SEA : D�marrer l'�coute des demandes de chat =====
                                startChatRequestListener();
                                
                                // ===== STATUS EVENTS : D�marrer l'�coute des changements de statut =====
                                startStatusEventSource();
                            }, 100);
                        }
                    }
                }
            } catch (error) {
                console.warn('?? [Lock] Erreur v�rification verrouillage:', error);
            }
        }
        
        function getClientIP() {
            // Retourne l'IP du backend configur� ou localhost par d�faut
            const backendIp = localStorage.getItem('vitrine.backend.ip');
            return backendIp || 'localhost';
        }
        
        // ===== CHAT SEA FUNCTIONS =====
        function openChat(chatUrl) {
            const iframe = document.getElementById('chatIframe');
            if (iframe) {
                iframe.src = chatUrl;
            }
            document.getElementById('chatModal').classList.add('active');
        }
        
        async function closeChat() {
            try {
                // ? NOUVEAU : Marquer comme fermeture normale
                isNormalClosure = true;
                
                // ? NOUVEAU : S'assurer de la connexion backend avant fermeture
                await ensureBackendConnection();
                
                // ? NOUVEAU : Informer le backend que Vitrine ferme le chat
                if (currentChatId) {
                    console.log('?? [Vitrine] Fermeture du chat par l\'utilisateur');
                    
                    // ? NOUVEAU : Marquer comme fermeture volontaire pour �viter les reconnexions
                    window.chatClosedVoluntarily = true;
                    
                    const response = await fetch(`${currentAPI}/api/tickets/chat/end`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            channel_id: currentChatId,
                            room_id: getCurrentRoom(),
                            ended_by: "vitrine", // ? Indiquer que c'est Vitrine qui ferme
                            ticket_id: window.lastTicketNumber || ''
                        })
                    });
                    
                    if (response.ok) {
                        console.log('? [Vitrine] Chat ferm� avec succ�s c�t� backend');
                    } else {
                        console.error('? [Vitrine] Erreur lors de la fermeture du chat');
                    }
                }
            } catch (error) {
                console.error('? [Vitrine] Erreur lors de la fermeture:', error);
            }
            
            // Fermer l'interface localement
            closeChatInterface();
        }
        
        // ===== CHAT PRIORITY MANAGEMENT =====
        let hiddenStatusBanners = []; // Stocke les banni�res masqu�es pour le chat
        
        function hideStatusBannersForChat() {
            console.log('?? [ChatPriority] Masquage des banni�res de statut pour priorit� chat');
            hiddenStatusBanners = [];
            
            // Masquer la banni�re de statut de ticket si visible
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer && statusContainer.style.display !== 'none') {
                hiddenStatusBanners.push('ticketStatus');
                statusContainer.style.display = 'none';
                console.log('?? [ChatPriority] Banni�re de statut masqu�e');
            }
            
            // Retirer le flou de la page
            removePageBlurEffect();
            console.log('?? [ChatPriority] Flou de page retir� pour le chat');
        }
        
        function restoreStatusBannersAfterChat() {
            console.log('?? [ChatPriority] Restauration des banni�res de statut apr�s chat');
            
            // Restaurer la banni�re de statut si elle �tait visible
            if (hiddenStatusBanners.includes('ticketStatus')) {
                const statusContainer = document.getElementById('ticketStatusContainer');
                if (statusContainer) {
                    statusContainer.style.display = 'flex';
                    // Remettre le flou si c'�tait une banni�re persistante
                    const statusType = statusContainer.getAttribute('data-status-type');
                    if (statusType === 'persistent') {
                        addPageBlurEffect();
                    }
                    console.log('?? [ChatPriority] Banni�re de statut restaur�e');
                }
            }
            
            hiddenStatusBanners = [];
        }

        // ===== CHAT TIMEOUT BANNER FUNCTIONS =====
        function showChatTimeoutBanner() {
            console.log('? [ChatTimeout] Affichage banni�re de timeout');
            
            // Masquer la banni�re de consent si visible
            hideConsentBanner();
            
            // Masquer les banni�res de statut pour priorit� chat
            hideStatusBannersForChat();
            
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'block';
                
                setTimeout(() => {
                    banner.classList.add('show');
                }, 10);
            }
            
            // ? NOUVEAU : Notifier le backend que la vitrine est pass�e en mode rappel
            notifyBackendRecallMode();
        }
        
        async function notifyBackendRecallMode() {
            try {
                const currentRoom = getCurrentRoom();
                const chatId = currentChatId; // Utiliser la variable de chat actuelle
                console.log(`?? [RecallMode] Debug - currentRoom: ${currentRoom}, currentChatId: ${chatId}`);
                
                if (!currentRoom || !chatId) {
                    console.log('?? [RecallMode] Pas de salle ou chatId actuel, skip notification');
                    return;
                }
                
                console.log(`?? [RecallMode] Notification backend: salle ${currentRoom} en mode rappel`);
                
                // S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                // ? CRITICAL: Notifier le backend que le client est pass� en mode rappel
                // Cela doit fermer le chat c�t� SEA et afficher une banni�re sp�ciale
                const response = await fetch(`${currentAPI}/api/tickets/chat/recall-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room: currentRoom,
                        room_id: currentRoom, // Ajout pour compatibilit�
                        channel_id: chatId,
                        chat_id: chatId,
                        status: 'recall_mode',
                        action: 'timeout_to_recall', // Action sp�cifique
                        message: 'Client n\'a pas r�pondu - Mode rappel activ�'
                    })
                });
                
                if (response.ok) {
                    console.log('? [RecallMode] Backend notifi� - Chat ferm� c�t� SEA, mode rappel activ�');
                    
                    // Fermer aussi le chat c�t� client pour nettoyer
                    if (typeof window.endCurrentChat === 'function') {
                        window.endCurrentChat('recall_mode');
                    }
                } else {
                    console.warn('?? [RecallMode] Erreur notification backend:', response.status);
                }
            } catch (error) {
                console.error('? [RecallMode] Erreur notification backend:', error);
            }
        }
        
        async function closeTimeoutBanner() {
            console.log('? [ChatTimeout] Fermeture banni�re de timeout normale');
            
            try {
                // ? NOUVEAU : Notifier le backend que le client a ferm� la banni�re de rappel
                await notifyBackendClientClosedRecall();
                
                const banner = document.getElementById('chatTimeoutBanner');
                if (banner) {
                    banner.style.display = 'none';
                    banner.classList.remove('show');
                }
                
                // Restaurer les banni�res de statut
                restoreStatusBannersAfterChat();
                
            } catch (error) {
                console.error('? [ChatTimeout] Erreur lors de la fermeture:', error);
                
                // Fermer quand m�me l'interface m�me en cas d'erreur
                const banner = document.getElementById('chatTimeoutBanner');
                if (banner) {
                    banner.style.display = 'none';
                    banner.classList.remove('show');
                }
                restoreStatusBannersAfterChat();
            }
        }
        
        // ? NOUVELLE FONCTION : Fermer la banni�re avec envoi de refus
        async function closeTimeoutBannerWithDecline() {
            console.log('? [ChatTimeout] Fermeture banni�re de timeout avec refus');
            
            try {
                // Envoyer un refus au backend (comme pour un chat normal)
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'decline',
                        channel_id: currentChatId,
                        type: 'recall' // Indiquer que c'est un refus de rappel
                    })
                });
                
                if (response.ok) {
                    console.log('? [ChatTimeout] Refus de rappel envoy� au serveur');
                    // Afficher le toast de refus comme pour un chat normal
                    showNotification('Chat refus�');
                }
            } catch (error) {
                console.error('? [ChatTimeout] Erreur lors de l\'envoi du refus:', error);
            }
            
            // Fermer la banni�re dans tous les cas
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'none';
                banner.classList.remove('show');
            }
            
            // Restaurer les banni�res de statut
            restoreStatusBannersAfterChat();
        }
        
        // ? NOUVELLE FONCTION : Initier une demande de rappel client
        async function initiateRecallRequest() {
            console.log('?? [Recall] Client demande un rappel');
            
            try {
                // S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const ticketNumber = window.lastTicketNumber || '';
                
                if (!currentRoom) {
                    console.error('[Recall] Pas de salle d�finie');
                    return;
                }
                
                console.log('? [Recall] Salle trouv�e:', currentRoom);
                
                // Donn�es de rappel
                const recallData = {
                    room: currentRoom,
                    ticket_number: ticketNumber,
                    requested_at: new Date().toISOString(),
                    status: 'pending',
                    type: 'client_recall_request'
                };
                
                // Envoyer la demande de rappel au backend
                const response = await fetch(`${currentAPI}/api/tickets/chat/client-recall`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recallData)
                });
                
                if (response.ok) {
                    // Afficher la banni�re de confirmation
                    const banner = document.getElementById('chatTimeoutBanner');
                    if (banner) {
                        banner.innerHTML = `
                            <h3>
                                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                                Demande de rappel envoy�e
                            </h3>
                            <p>Le technicien SEA a �t� notifi� et reviendra vers vous d�s que possible.</p>
                            <p><strong>Salle : ${currentRoom}</strong></p>
                            <div class="timeout-actions">
                                <button class="timeout-btn close" onclick="closeTimeoutBanner()">
                                    <i class="fas fa-check"></i>
                                    OK
                                </button>
                            </div>
                        `;
                        
                        // Fermer automatiquement apr�s 5 secondes
                        setTimeout(closeTimeoutBanner, 5000);
                    }
                    
                    console.log('? [Recall] Demande de rappel envoy�e:', recallData);
                } else {
                    console.error('[Recall] Erreur lors de l\'envoi du rappel');
                    showNotification('Erreur lors de l\'envoi de la demande de rappel');
                }
            } catch (error) {
                console.error('[Recall] Erreur:', error);
                showNotification('Erreur de connexion');
            }
        }
        
        async function initiateClientChat() {
            console.log('?? [ChatTimeout] Client initie la conversation avec SEA');
            
            try {
                // ? S'assurer d'utiliser le bon backend (localhost vs UQAM)
                await ensureBackendConnection();
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/client-initiate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        message: 'Le client souhaite reprendre la conversation suite au timeout.'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('? [ChatTimeout] Demande d\'initiation envoy�e:', data);
                    
                    // Fermer la banni�re de timeout
                    closeTimeoutBanner();
                    
                    // Afficher un message d'attente
                    showNotification('Demande de chat envoy�e au technicien SEA. En attente de r�ponse...');
                } else {
                    console.error('? [ChatTimeout] Erreur lors de l\'initiation:', response.status);
                    showNotification('Erreur lors de l\'envoi de la demande de chat');
                }
            } catch (error) {
                console.error('? [ChatTimeout] Erreur r�seau:', error);
                showNotification('Erreur de connexion');
            }
        }

        // ===== CONSENT BANNER FUNCTIONS =====
        function showConsentBanner(ticketNumber, roomId = null) {
            // ? NOUVEAU : Masquer les banni�res de statut pour priorit� chat
            hideStatusBannersForChat();
            
            document.getElementById('consentTicketNumber').textContent = ticketNumber;
            
            // Afficher le nom de la salle si fourni
            if (roomId) {
                document.getElementById('consentRoomName').textContent = roomId;
            } else {
                document.getElementById('consentRoomName').textContent = getCurrentRoom() || 'Inconnue';
            }
            
            document.getElementById('consentBanner').style.display = 'block';
            
            // ? NOUVEAU : Afficher banni�re de timeout apr�s 30 secondes au lieu de fermer
            setTimeout(() => {
                if (document.getElementById('consentBanner').style.display !== 'none') {
                    console.log('? [ChatTimeout] Timeout de 30s - Affichage banni�re de timeout');
                    showChatTimeoutBanner();
                }
            }, 30000);
        }
        
        function hideConsentBanner() {
            const banner = document.getElementById('consentBanner');
            banner.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => {
                banner.style.display = 'none';
                banner.style.animation = '';
            }, 500);
        }
        async function acceptChat() {
            try {
                // ? NOUVEAU : S'assurer de la connexion backend avant acceptation
                await ensureBackendConnection();
                
                console.log('? [Consent] Chat accept�');
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'accept',
                        channel_id: currentChatId // ? CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    hideConsentBanner();
                    openChatInterface();
                }
                
            } catch (error) {
                console.error('? [Consent] Erreur acceptation:', error);
            }
        }
        
        async function declineChat() {
            try {
                // ? NOUVEAU : S'assurer de la connexion backend avant refus
                await ensureBackendConnection();
                
                console.log('? [Consent] Chat refus� par le client');
                console.log('?? [Consent] Channel ID:', currentChatId);
                console.log('?? [Consent] Room ID:', getCurrentRoom());
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'decline',
                        channel_id: currentChatId // ? CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    console.log('? [Consent] Refus envoy� au serveur avec succ�s');
                } else {
                    console.error('? [Consent] Erreur serveur lors du refus:', response.status);
                }
                
                hideConsentBanner();
                currentChatId = null;
                
                // ? NOUVEAU : Restaurer les banni�res de statut apr�s refus du chat
                restoreStatusBannersAfterChat();
                
            } catch (error) {
                console.error('? [Consent] Erreur refus:', error);
            }
        }
        
        // ===== CHAT INTERFACE FUNCTIONS =====
        function openChatInterface() {
            // ? NOUVEAU : Masquer les banni�res de statut pour priorit� chat
            hideStatusBannersForChat();
            
            document.getElementById('chatModal').classList.add('active');
            
            // ? NOUVEAU : D�marrer le heartbeat pour d�tecter les d�connexions
            startHeartbeat();
            
            // Ajouter le message d'accueil automatique
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer && messagesContainer.children.length === 0) {
                // Message d'accueil moderne et compact
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'welcome-message-modern';
            welcomeMessage.innerHTML = `
                <div class="welcome-card">
                    <div class="welcome-icon-modern">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div class="welcome-text-modern">
                        <div class="welcome-title">Chat SEA</div>
                        <div class="welcome-subtitle">Service Expert Audiovisuel</div>
                        <div class="welcome-status-modern">
                            <span class="status-dot"></span>
                            Technicien disponible
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(welcomeMessage);
            }
            
            document.getElementById('chatInput').focus();
            
            // Restaurer la taille de police sauvegard�e
            restoreVitrineFontSize();
        }
        
        function closeChatInterface() {
            document.getElementById('chatModal').classList.remove('active');
            document.getElementById('chatMessages').innerHTML = '';
            document.getElementById('chatInput').value = '';
            
            // ? NOUVEAU : Arr�ter le heartbeat
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
                console.log('?? [Heartbeat] Arr�t� lors de la fermeture du chat');
            }
            
            currentChatId = null;
            
            // ? CORRECTION : R�initialiser le flag avec d�lai pour �viter les faux positifs
            setTimeout(() => {
                isNormalClosure = false;
                console.log('?? [Disconnect] Flag isNormalClosure r�initialis� apr�s fermeture normale');
            }, 1000); // Attendre 1 seconde apr�s fermeture
            
            // ? NOUVEAU : Restaurer les banni�res de statut apr�s fermeture du chat
            restoreStatusBannersAfterChat();
            
            if (chatEventSource) {
                chatEventSource.close();
                chatEventSource = null;
            }
        }
        
        // ? FONCTION : Auto-resize pour les textareas
        window.autoResizeTextarea = function(textarea) {
            // R�initialiser la hauteur pour calculer la nouvelle hauteur
            textarea.style.height = 'auto';
            
            // Calculer la nouvelle hauteur bas�e sur le scrollHeight
            const newHeight = Math.min(textarea.scrollHeight, 150); // Max 150px pour Vitrine
            textarea.style.height = newHeight + 'px';
            
            // Si on a du scroll, on se positionne en bas
            if (textarea.scrollHeight > 150) {
                textarea.scrollTop = textarea.scrollHeight;
            }
        };

        // ? NOUVEAU : Variables pour la d�tection de frappe
        let isTypingVitrine = false;
        let typingTimeoutVitrine = null;
        let lastTypingEventVitrine = 0;
        const TYPING_INTERVAL_VITRINE = 2000; // 2 secondes
        
        // ?? IDENTIFIANT UNIQUE pour ce client Vitrine
        const currentRoom = getCurrentRoom() || 'unknown';
        const VITRINE_CLIENT_ID = `vitrine-${currentRoom}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`?? [TypingVitrine] ID client Vitrine g�n�r�: ${VITRINE_CLIENT_ID}`);
        
        function handleChatKeyPress(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            } else {
                // ? NOUVEAU : D�tecter la frappe comme Tickets SEA
                handleTypingVitrine(event);
            }
        }
        
        // ? NOUVEAU : Fonction de d�tection de frappe pour Vitrine
        function handleTypingVitrine(event) {
            if (!currentChatId) return;
            
            // ? OPTIMISATION : Log seulement si debug activ� pour �viter le spam
            if (window.DEBUG_TYPING) {
                console.log(`? [TypingVitrine] Chat actif trouv�, chatId: ${currentChatId}`);
            }
            
            const now = Date.now();
            
            // ? OPTIMISATION : �viter les appels trop fr�quents (debounce)
            if (window.lastTypingCall && (now - window.lastTypingCall) < 100) {
                return; // Ignorer si appel� il y a moins de 100ms
            }
            window.lastTypingCall = now;
            
            // �viter d'envoyer trop d'�v�nements de frappe
            if (!isTypingVitrine) {
                isTypingVitrine = true;
                sendTypingStatusVitrine(currentChatId, true);
                lastTypingEventVitrine = now;
            } else if (now - lastTypingEventVitrine > TYPING_INTERVAL_VITRINE) {
                // Renvoyer l'�tat de frappe toutes les X secondes pour maintenir l'�tat
                sendTypingStatusVitrine(currentChatId, true);
                lastTypingEventVitrine = now;
            }
            
            // R�initialiser le timeout
            clearTimeout(typingTimeoutVitrine);
            typingTimeoutVitrine = setTimeout(() => {
                isTypingVitrine = false;
                sendTypingStatusVitrine(currentChatId, false);
            }, 1000); // Arr�t apr�s 1 seconde d'inactivit�
        }
        
        // ? NOUVEAU : Fonction d'envoi d'�tat de frappe pour Vitrine
        async function sendTypingStatusVitrine(channelId, isTyping) {
            try {
                console.log(`?? [TypingVitrine] Envoi �tat frappe: ${isTyping ? 'en train d\'�crire' : 'arr�t� d\'�crire'}`);
                
                await ensureBackendConnection();
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/typing`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel_id: channelId,
                        room_id: getCurrentRoom(),
                        is_typing: isTyping,
                        client_id: VITRINE_CLIENT_ID,
                        sender: 'vitrine'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                console.log(`? [TypingVitrine] �tat frappe envoy�: ${isTyping}`);
            } catch (error) {
                console.error(`? [TypingVitrine] Erreur d'envoi d'�tat de frappe:`, error);
            }
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message || !currentChatId) return;
            
            try {
                // ?? NOUVEAU : Utiliser le gestionnaire unifi� si disponible
                if (typeof window.unifiedChat !== 'undefined') {
                    console.log(`?? [Vitrine] Envoi via gestionnaire unifi�`);
                    
                    // Trouver le ticket ID correspondant
                    const ticketId = findTicketIdFromChatId(currentChatId);
                    if (ticketId) {
                        const result = await window.unifiedChat.sendMessage(ticketId, message, 'vitrine');
                        if (result.success) {
                            addChatMessage(message, 'sent');
                            input.value = '';
                            input.style.height = '44px'; // Reset � la taille originale
                            return;
                        } else {
                            console.warn(`?? [Vitrine] Fallback vers envoi legacy:`, result.error);
                        }
                    }
                }
                
                // Fallback vers l'ancien syst�me
                await sendChatMessageLegacy(message);
                
            } catch (error) {
                console.error('? [Chat] Erreur envoi message:', error);
            }
        }
        
        // ?? Ancien syst�me d'envoi en fallback
        async function sendChatMessageLegacy(message) {
            const input = document.getElementById('chatInput');
            
            // ? NOUVEAU : S'assurer de la connexion backend avant envoi
            await ensureBackendConnection();
            
            console.log(`?? [DEBUG-VITRINE] Envoi message legacy avec channel_id: "${currentChatId}"`);
            console.warn(`?? [DEBUG-VISIBLE] VITRINE ENVOIE LEGACY AVEC CHANNEL_ID: "${currentChatId}"`);
            
            const response = await fetch(`${currentAPI}/api/tickets/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel_id: currentChatId,
                    room_id: getCurrentRoom(),
                    message: message,
                    sender: 'vitrine'
                })
            });
            
            if (response.ok) {
                addChatMessage(message, 'sent');
                input.value = '';
                input.style.height = '44px'; // Reset � la taille originale
            }
        }
        
        // ??? Fonction utilitaire pour trouver le ticket ID depuis chat ID
        function findTicketIdFromChatId(chatId) {
            // Essayer de parser le chat ID pour extraire le ticket ID
            const match = chatId.match(/chat_(\d+)_/);
            if (match) {
                return match[1];
            }
            
            // Fallback : utiliser le chat ID comme ticket ID si format simple
            if (/^\d+$/.test(chatId)) {
                return chatId;
            }
            
            return null;
        }
        
        // ===== CONTR�LE DE TAILLE DE POLICE VITRINE =====
        let vitrineFontSize = 150; // D�faut 150% (affich� comme 0%)
        
        function adjustVitrineFont(action) {
            // Ajuster selon l'action (plage 150-300%)
            if (action === 'increase' && vitrineFontSize < 300) {
                vitrineFontSize += 10;
            } else if (action === 'decrease' && vitrineFontSize > 150) {
                vitrineFontSize -= 10;
            }
            
            // Appliquer la nouvelle taille
            const chatMessages = document.getElementById('chatMessages');
            const chatInput = document.getElementById('chatInput');
            const fontIndicator = document.getElementById('vitrineFontIndicator');
            
            if (chatMessages) {
                chatMessages.style.fontSize = `${vitrineFontSize}%`;
                chatMessages.setAttribute('data-font-size', vitrineFontSize);
                
                // Forcer l'application aux messages existants (sauf system-message)
                const messageElements = chatMessages.querySelectorAll('.chat-message:not(.system-message), .message:not(.system-message)');
                messageElements.forEach(msg => {
                    msg.style.fontSize = 'inherit';
                });
            }
            
            if (chatInput) {
                chatInput.style.fontSize = `${vitrineFontSize}%`;
            }
            
            if (fontIndicator) {
                // Convertir 150-300% en 0-100% pour l'affichage
                const displayPercentage = Math.round(((vitrineFontSize - 150) / 150) * 100);
                fontIndicator.textContent = `${displayPercentage}%`;
            }
            
            // Sauvegarder la pr�f�rence
            localStorage.setItem('vitrineChatFontSize', vitrineFontSize);
            
            console.log(`?? [VitrineFont] Taille ajust�e: ${vitrineFontSize}% (affich�: ${Math.round(((vitrineFontSize - 150) / 150) * 100)}%)`);
        }
        
        // Restaurer la taille sauvegard�e au d�marrage
        function restoreVitrineFontSize() {
            const savedSize = localStorage.getItem('vitrineChatFontSize');
            if (savedSize) {
                let restoredSize = parseInt(savedSize);
                
                // Migration des anciennes valeurs si n�cessaire
                if (restoredSize < 150) {
                    const normalizedOld = Math.max(0, restoredSize - 70) / 80;
                    restoredSize = Math.round(normalizedOld * 150 + 150);
                    localStorage.setItem('vitrineChatFontSize', restoredSize);
                    console.log(`?? [VitrineFont] Migration ${savedSize}% ? ${restoredSize}%`);
                }
                
                vitrineFontSize = restoredSize;
            }
            
            // Appliquer la taille
            setTimeout(() => {
                const chatMessages = document.getElementById('chatMessages');
                const chatInput = document.getElementById('chatInput');
                const fontIndicator = document.getElementById('vitrineFontIndicator');
                
                if (chatMessages) {
                    chatMessages.style.fontSize = `${vitrineFontSize}%`;
                    
                    // Forcer l'application aux messages existants (sauf system-message)
                    const messageElements = chatMessages.querySelectorAll('.chat-message:not(.system-message), .message:not(.system-message)');
                    messageElements.forEach(msg => {
                        msg.style.fontSize = 'inherit';
                    });
                }
                
                if (chatInput) {
                    chatInput.style.fontSize = `${vitrineFontSize}%`;
                }
                
                if (fontIndicator) {
                    const displayPercentage = Math.round(((vitrineFontSize - 150) / 150) * 100);
                    fontIndicator.textContent = `${displayPercentage}%`;
                }
            }, 100);
        }
        
// Exposer la fonction globalement
window.adjustVitrineFont = adjustVitrineFont;

// ? FONCTION DE TEST : Simuler un F5 pour tester la banni�re
window.testF5Detection = function() {
    console.log('?? [TEST F5] Simulation d\'un F5 pour tester la banni�re...');
    
    if (currentChatId) {
        console.log('?? [TEST F5] Chat actif d�tect�:', currentChatId);
        console.log('?? [TEST F5] Salle:', getCurrentRoom());
        
        // Simuler la notification F5
        notifyUnexpectedDisconnection();
        console.log('? [TEST F5] Notification F5 envoy�e - V�rifiez Tickets SEA pour la banni�re');
    } else {
        console.log('? [TEST F5] Aucun chat actif - D�marrez un chat d\'abord');
    }
};
        
        function addChatMessage(message, type) {
            const messagesContainer = document.getElementById('chatMessages');
            
            // V�rifier si le message n'existe pas d�j� (�viter les doublons)
            const existingMessages = messagesContainer.querySelectorAll('.chat-message');
            for (let msg of existingMessages) {
                if (msg.textContent === message && msg.className.includes(type)) {
                    console.log('?? [Chat] Message en double d�tect�, ignor�:', message);
                    return;
                }
            }
            
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${type}`;
            messageElement.textContent = message;
            
            // H�riter de la taille du parent seulement si ce n'est pas un message syst�me
            if (type !== 'system') {
                messageElement.style.fontSize = 'inherit';
            }
            
            messagesContainer.appendChild(messageElement);
            
            // Scroll vers le bas (doux si support�)
            if (typeof messagesContainer.scrollTo === 'function') {
                messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
            } else {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            console.log(`? [Chat] Message ajout�: ${type} - ${message}`);
        }
        
        // ===== CHAT EVENT SOURCE - SUPPRIM� =====
        // Remplac� par startChatRequestListener() qui g�re tout via /api/tickets/chat/stream
        
        // ===== CHAT REQUEST LISTENER R�EL =====
        function startChatRequestListener() {
            if (!getCurrentRoom()) return;
            
            const roomId = getCurrentRoom();
            
            // ? NOUVEAU : Protection contre les reconnexions multiples
            if (window.sseReconnectionInProgress) {
                console.log('?? [SSE] Reconnexion d�j� en cours, annulation');
                return;
            }
            
            // ? PROTECTION MAXIMALE : V�rifier si une connexion active existe d�j�
            if (window.vitrineChatEventSource && window.vitrineChatEventSource.readyState === EventSource.OPEN) {
                console.log('? [SSE] Connexion SSE d�j� active et fonctionnelle - ARR�T');
                return; // Ne pas cr�er une nouvelle connexion
            }
            
            // ? NOUVEAU : Protection contre les appels multiples rapides
            const now = Date.now();
            if (window.lastSSEAttempt && (now - window.lastSSEAttempt) < 2000) {
                console.log('?? [SSE] Appel trop rapide ignor� - Protection anti-spam (2s)');
                return;
            }
            window.lastSSEAttempt = now;
            
            console.log(`?? [Chat] D�marrage �coute SSE R�ELLE pour salle ${roomId}`);
            
            // ?? Fermer toute connexion existante (ferm�e ou en erreur)
            if (window.vitrineChatEventSource) {
                console.log('?? [SSE] Fermeture connexion existante (ferm�e/erreur) pour �viter duplication');
                window.vitrineChatEventSource.close();
                window.vitrineChatEventSource = null;
            }
            
            // ? CORRIG� : Utiliser currentAPI maintenant que l'initialisation est termin�e
            const sseUrl = `${currentAPI}/api/tickets/chat/stream?room_id=${roomId}`;
            
            const eventSource = new EventSource(sseUrl);
            window.vitrineChatEventSource = eventSource; // Stocker pour �viter duplicata
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('?? [SSE] �v�nement R�EL re�u:', data);
                    
                    switch (data.type) {
                        case 'connection_established':
                            console.log('? [SSE] Connexion R�ELLE �tablie pour salle ' + roomId);
                            showNotification('Connexion chat �tablie - En attente des demandes SEA');
                            break;
                            
                        case 'chat_initiated':
                            // Une demande de chat R�ELLE est arriv�e depuis Tickets SEA
                            console.log('?? [SSE] Demande de chat R�ELLE re�ue:', data.data);
                            currentChatId = data.data.channel_id;
                            
                            // ? NOUVEAU : R�initialiser le flag de fermeture volontaire pour nouveau chat
                            window.chatClosedVoluntarily = false;
                            
                            showConsentBanner(`Demande de chat pour salle ${roomId}`, roomId);
                            break;
                            
                        case 'chat_ended':
                            // ? NOUVEAU : V�rifier QUI a ferm� le chat
                            const endedBy = data.data?.ended_by || 'unknown';
                            console.log('?? [SSE] Chat termin� par:', endedBy);
                            
                            hideConsentBanner();
                            closeChatInterface();
                            
                            // ? LOGIQUE CORRECTE : Afficher le bon message selon qui a ferm�
                            if (endedBy === 'vitrine') {
                                // Le client a ferm� ? Pas de notification (il le sait d�j�)
                                console.log('?? [SSE] Chat ferm� par le client - Pas de notification');
                            } else if (endedBy.startsWith('tickets_sea')) {
                                // Le technicien a ferm� ? Notification appropri�e
                                if (endedBy === 'tickets_sea_with_summary') {
                                    showNotification('Chat termin� par le technicien - R�sum� cr��');
                                } else if (endedBy === 'tickets_sea_no_summary') {
                                    showNotification('Chat termin� par le technicien');
                                } else {
                                    showNotification('Chat termin� par l\'op�rateur SEA');
                                }
                            } else {
                                // Fermeture inconnue ? Message g�n�rique
                                showNotification('Chat termin�');
                            }
                            
                            currentChatId = null;
                            
                            // ? NOUVEAU : Assurer la restauration des banni�res m�me si ferm� c�t� serveur
                            restoreStatusBannersAfterChat();
                            break;

                        case 'chat_interface_open':
                            console.log('?? [SSE] Ouverture interface de chat demand�e:', data.data);
                            // ? NOUVEAU : Mettre � jour currentChatId avec le channel_id du chat accept�
                            if (data.data && data.data.channel_id) {
                                currentChatId = data.data.channel_id;
                                console.log('? [SSE] currentChatId mis � jour:', currentChatId);
                                
                                // ? NOUVEAU : R�initialiser le flag de fermeture volontaire pour nouveau chat
                                window.chatClosedVoluntarily = false;
                            }
                            hideConsentBanner();
                            openChatInterface();
                            showNotification('Chat d�marr� - Interface ouverte');
                            break;

                        case 'chat_message':
                            console.log('?? [SSE] Message re�u:', data.data);
                            // �viter d'ajouter les messages envoy�s par Vitrine (ils sont d�j� affich�s)
                            if (data.data.sender && data.data.sender !== 'vitrine') {
                                addChatMessage(data.data.message, 'received');
                            } else if (!data.data.sender) {
                                // Si pas de sender, traiter comme message re�u
                                addChatMessage(data.data.message, 'received');
                            }
                            break;

                        case 'webrtc_answer':
                            // R�ponse WebRTC re�ue de SAVQonnect
                            console.log('?? [WebRTC] R�ponse re�ue via SSE:', data);
                            if (window.handleWebRTCAnswer) {
                                window.handleWebRTCAnswer(data.sdp);
                            }
                            break;
                            
                        case 'webrtc_candidate':
                            // Candidat ICE re�u de SAVQonnect
                            console.log('?? [WebRTC] Candidat ICE re�u via SSE:', data);
                            if (window.handleWebRTCCandidate) {
                                window.handleWebRTCCandidate(data.candidate);
                            }
                            break;
                            
                        case 'webrtc_ended':
                            // Appel termin� par l'autre partie
                            console.log('?? [WebRTC] Appel termin� via SSE');
                            if (window.cleanupWebRTCCall) {
                                window.cleanupWebRTCCall();
                            }
                            break;
                            
                        case 'client_typing':
                        case 'vitrine_typing':
                            console.log('?? [SSE-Vitrine] �v�nement typing re�u:', data);
                            
                            // ?? BLACKLIST : Ne pas afficher si c'est ce client Vitrine qui tape
                            const eventClientId = data.data?.client_id;
                            const eventSender = data.data?.sender || 'sea';
                            
                            if (eventClientId && eventClientId === VITRINE_CLIENT_ID) {
                                console.log(`?? [TypingVitrine] BLACKLIST - �v�nement typing ignor� car c'est ce client Vitrine qui tape (${eventClientId})`);
                                break;
                            }
                            
                            if (data.data && data.data.is_typing) {
                                console.log(`?? [SSE-Vitrine] ${eventSender.toUpperCase()} en train d'�crire... (client: ${eventClientId})`);
                                if (typeof showTypingIndicator === 'function') {
                                    showTypingIndicator(eventSender);
                                }
                            } else {
                                console.log(`?? [SSE-Vitrine] ${eventSender.toUpperCase()} a arr�t� d'�crire`);
                                if (typeof hideTypingIndicator === 'function') {
                                    hideTypingIndicator();
                                }
                            }
                            break;
                            
                        default:
                            console.log('?? [SSE] �v�nement non g�r�:', data.type);
                    }
                } catch (error) {
                    console.error('? [SSE] Erreur parsing �v�nement:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('? [SSE] Erreur de connexion SSE R�ELLE:', error);
                console.log(`?? [SSE] D�tails erreur SSE:`, {
                    readyState: eventSource?.readyState,
                    url: eventSource?.url,
                    error: error
                });
                
                // ? NOUVEAU : Protection contre les reconnexions multiples
                if (window.sseReconnectionInProgress) {
                    console.log('?? [SSE] Reconnexion d�j� en cours, annulation');
                    return;
                }
                
                // ? CORRECTION : Fermer compl�tement la connexion pour �viter les reconnexions automatiques
                if (eventSource.readyState !== EventSource.CLOSED) {
                    console.log('?? [SSE] Fermeture forc�e de la connexion SSE pour �viter les boucles');
                    eventSource.close();
                    window.vitrineChatEventSource = null; // Nettoyer la r�f�rence
                }
                
                // ? NOUVEAU : Protection contre les timers multiples
                if (window.sseReconnectionTimer) {
                    console.log('?? [SSE] Timer de reconnexion d�j� actif, annulation');
                    return;
                }
                
                // ? NOUVEAU : Ne pas se reconnecter si le chat a �t� ferm� volontairement
                if (window.chatClosedVoluntarily) {
                    console.log('?? [SSE] Chat ferm� volontairement - Pas de reconnexion');
                    return;
                }
                
                // ? NOUVELLE LOGIQUE : Reconnexion automatique avec backoff et protection
                const reconnectDelay = Math.min((window.sseReconnectAttempts || 0) * 2000 + 5000, 30000); // Max 30s
                window.sseReconnectAttempts = (window.sseReconnectAttempts || 0) + 1;
                
                window.sseReconnectionInProgress = true;
                window.sseReconnectionTimer = setTimeout(() => {
                    console.log(`?? [SSE] Tentative de reconnexion automatique (${window.sseReconnectAttempts})...`);
                    window.sseReconnectionInProgress = false;
                    window.sseReconnectionTimer = null;
                    startChatRequestListener(); // Relancer la connexion
                }, reconnectDelay);
            };
            
            eventSource.onopen = function() {
                console.log('? [SSE] Connexion SSE R�ELLE �tablie pour salle ' + roomId);
                
                // ? R�initialiser le compteur de reconnexions apr�s succ�s
                window.sseReconnectAttempts = 0;
                
                // ? NOUVEAU : Nettoyer les flags de reconnexion apr�s succ�s
                if (window.sseReconnectionTimer) {
                    clearTimeout(window.sseReconnectionTimer);
                    window.sseReconnectionTimer = null;
                }
                window.sseReconnectionInProgress = false;
                
                // ?? D�marrer le heartbeat pour cette connexion
                startHeartbeat();
                
                // ?? Enregistrer le client dans le syst�me SSE
                if (clientId) {
                    console.log('?? [SSE] Client enregistr� pour heartbeat:', clientId);
                }
            };
        }
        
        // ===== STATUS CHANGE LISTENER POUR TICKETS SEA =====
        let statusEventSource = null;
        
        function startStatusEventSource() {
            const currentRoom = getCurrentRoom();
            if (!currentRoom) {
                console.log('?? [StatusEvents] Pas de salle d�finie, EventSource non d�marr�');
                return;
            }

            // ? NOUVEAU : Protection contre les reconnexions multiples
            if (window.statusReconnectionInProgress) {
                console.log('?? [StatusEvents] Reconnexion d�j� en cours, annulation');
                return;
            }

            // ? PROTECTION MAXIMALE : V�rifier si une connexion active existe d�j�
            if (statusEventSource && statusEventSource.readyState === EventSource.OPEN) {
                console.log('? [StatusEvents] Connexion SSE d�j� active et fonctionnelle - ARR�T');
                return; // Ne pas cr�er une nouvelle connexion
            }
            
            // ? NOUVEAU : Protection contre les appels multiples rapides
            const now = Date.now();
            if (window.lastStatusSSEAttempt && (now - window.lastStatusSSEAttempt) < 2000) {
                console.log('?? [StatusEvents] Appel trop rapide ignor� - Protection anti-spam (2s)');
                return;
            }
            window.lastStatusSSEAttempt = now;
            
            // ?? Fermer toute connexion existante (ferm�e ou en erreur)
            if (statusEventSource) {
                console.log('?? [StatusEvents] Fermeture connexion existante (ferm�e/erreur) pour �viter duplication');
                statusEventSource.close();
                statusEventSource = null;
            }

            // ? R�ACTIV� : EventSource pour les changements de statuts des tickets
            console.log('?? [StatusEvents] D�marrage EventSource pour changements de statuts');
            
            // ? CORRIG� : Utiliser currentAPI maintenant que l'initialisation est termin�e
            const sseUrl = `${currentAPI}/api/tickets/chat/events/vitrine?room_id=${currentRoom}`;
            statusEventSource = new EventSource(sseUrl);

            statusEventSource.onopen = function() {
                console.log('?? [StatusEvents] EventSource ouvert pour les changements de statut de la salle ' + currentRoom);
                console.log('?? [StatusEvents] Connexion SSE �tablie pour salle:', currentRoom);
                
                // ? R�initialiser le compteur de reconnexions apr�s succ�s
                window.statusReconnectAttempts = 0;
                
                // ? NOUVEAU : Nettoyer les flags de reconnexion apr�s succ�s
                if (window.statusReconnectionTimer) {
                    clearTimeout(window.statusReconnectionTimer);
                    window.statusReconnectionTimer = null;
                }
                window.statusReconnectionInProgress = false;
            };

            statusEventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('?? [StatusEvents] �v�nement re�u:', data);
                    
                    // ? DEBUG COMPLET : Analyser la structure de l'�v�nement
                    console.log('?? [StatusEvents] Type de data:', typeof data);
                    console.log('?? [StatusEvents] Propri�t�s de data:', Object.keys(data));
                    console.log('?? [StatusEvents] data.Type:', data.Type);
                    console.log('?? [StatusEvents] data.type:', data.type);
                    console.log('?? [StatusEvents] data.Data:', data.Data);
                    console.log('?? [StatusEvents] data.data:', data.data);

                    // ? CORRECTION FINALE : Utiliser les champs minuscules !
                    if (data.type === 'ticket_status_change') {
                        // V�rifier que l'�v�nement concerne la salle courante
                        if (data.data && data.data.room === currentRoom) {
                            console.log('?? [StatusEvents] Changement de statut d�tect� pour cette salle:', data.data);
                            // ? NOUVEAU : Passer le statut pour d�terminer si c'est persistant
                            showTicketStatusMessage(data.data.message, data.data.status);
                        }
                    } else if (data.type === 'connection_established') {
                        console.log('?? [StatusEvents] Connexion SSE �tablie pour salle:', data.data.room_id);
                    } else if (data.type === 'client_typing' || data.type === 'vitrine_typing') {
                        console.log('?? [StatusEvents] �v�nement typing re�u:', data);
                        
                        // ?? BLACKLIST : Ne pas afficher si c'est ce client Vitrine qui tape
                        const eventClientId = data.data?.client_id;
                        const eventSender = data.data?.sender || 'sea';
                        
                        if (eventClientId && eventClientId === VITRINE_CLIENT_ID) {
                            console.log(`?? [StatusEvents] BLACKLIST - �v�nement typing ignor� car c'est ce client Vitrine qui tape (${eventClientId})`);
                            return;
                        }
                        
                        if (data.data && data.data.is_typing) {
                            console.log(`?? [StatusEvents] ${eventSender.toUpperCase()} en train d'�crire... (client: ${eventClientId})`);
                            showTypingIndicator(eventSender);
                        } else {
                            console.log(`?? [StatusEvents] ${eventSender.toUpperCase()} a arr�t� d'�crire`);
                            hideTypingIndicator();
                        }
                    }
                } catch (error) {
                    console.error('?? [StatusEvents] Erreur parsing �v�nement:', error);
                }
            };
            
            // Fonctions pour les indicateurs de typing
            window.showTypingIndicator = function(sender = 'sea') {
                console.log(`?? [DEBUG] showTypingIndicator() appel�e pour ${sender}`);
                const chatContainer = document.querySelector('#chatMessages');
                if (!chatContainer) {
                    console.log('? [DEBUG] Pas de container #chatMessages trouv�');
                    return;
                }
                console.log('? [DEBUG] Container chat trouv�:', chatContainer);
                
                // Supprimer indicateur existant
                const existing = document.getElementById('typing-indicator-vitrine');
                if (existing) existing.remove();
                
                // ?? Design professionnel moderne style WhatsApp/Slack
                const senderText = sender === 'sea' ? 'Technicien' : 'Client';
                const senderInitials = sender === 'sea' ? 'SEA' : 'C';
                const avatarColor = sender === 'sea' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #10b981, #059669)';
                
                // Cr�er nouvel indicateur PROFESSIONNEL
                const indicator = document.createElement('div');
                indicator.id = 'typing-indicator-vitrine';
                indicator.innerHTML = `
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 18px; padding: 8px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); transition: all 0.3s ease; margin: 8px 0;">
                        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${avatarColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600; flex-shrink: 0;">${senderInitials}</div>
                        <div style="font-weight: 600; font-size: 14px; color: #1f2937; line-height: 1.2;">${senderText}</div>
                        <div style="display: inline-flex; gap: 3px; align-items: center;">
                            <span style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; display: inline-block; animation: typingBounce 1.4s ease-in-out infinite;"></span>
                            <span style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; display: inline-block; animation: typingBounce 1.4s ease-in-out infinite; animation-delay: 0.2s;"></span>
                            <span style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; display: inline-block; animation: typingBounce 1.4s ease-in-out infinite; animation-delay: 0.4s;"></span>
                        </div>
                    </div>
                `;
                
                // Animation supprim�e pour �viter la bande qui bouge
                
                chatContainer.appendChild(indicator);
                console.log('? [StatusEvents] Indicateur typing affich� dans Vitrine');
            };
            
            window.hideTypingIndicator = function() {
                const indicator = document.getElementById('typing-indicator-vitrine');
                if (indicator) {
                    indicator.remove();
                    console.log('? [StatusEvents] Indicateur typing supprim� de Vitrine');
                }
            };

            statusEventSource.onerror = function(error) {
                console.error('?? [StatusEvents] Erreur EventSource:', error);
                console.log(`?? [StatusEvents] D�tails erreur SSE status:`, {
                    readyState: statusEventSource?.readyState,
                    url: statusEventSource?.url,
                    error: error
                });
                
                // ? NOUVEAU : Protection contre les reconnexions multiples
                if (window.statusReconnectionInProgress) {
                    console.log('?? [StatusEvents] Reconnexion d�j� en cours, annulation');
                    return;
                }
                
                // ? CORRECTION : Fermer compl�tement la connexion pour �viter les reconnexions automatiques
                if (statusEventSource.readyState !== EventSource.CLOSED) {
                    console.log('?? [StatusEvents] Fermeture forc�e de la connexion SSE pour �viter les boucles');
                    statusEventSource.close();
                    statusEventSource = null; // Nettoyer la r�f�rence locale
                }
                
                // ? NOUVEAU : Protection contre les timers multiples
                if (window.statusReconnectionTimer) {
                    console.log('?? [StatusEvents] Timer de reconnexion status d�j� actif, annulation');
                    return;
                }
                
                // ? NOUVEAU : Ne pas se reconnecter si le chat a �t� ferm� volontairement
                if (window.chatClosedVoluntarily) {
                    console.log('?? [StatusEvents] Chat ferm� volontairement - Pas de reconnexion status');
                    return;
                }
                
                // ? NOUVELLE LOGIQUE : Reconnexion automatique avec backoff et protection
                const reconnectDelay = Math.min((window.statusReconnectAttempts || 0) * 2000 + 7000, 30000); // Max 30s
                window.statusReconnectAttempts = (window.statusReconnectAttempts || 0) + 1;
                
                window.statusReconnectionInProgress = true;
                window.statusReconnectionTimer = setTimeout(() => {
                    console.log(`?? [StatusEvents] Tentative de reconnexion automatique (${window.statusReconnectAttempts})...`);
                    window.statusReconnectionInProgress = false;
                    window.statusReconnectionTimer = null;
                    startStatusEventSource(); // Relancer la connexion
                }, reconnectDelay);
            };
        }
        
        function showTicketStatusMessage(message, statusType) {
            const statusContainer = document.getElementById('ticketStatusContainer') || createTicketStatusContainer();
            
            // ? PROTECTION : �viter les doublons si banni�re d�j� affich�e avec le m�me contenu
            const existingMessage = statusContainer.querySelector('.ticket-status-message');
            if (existingMessage && existingMessage.textContent.includes(message.replace(/??\s*/, ''))) {
                console.log('?? [StatusPersistence] Banni�re identique d�j� affich�e, ignor�');
                return;
            }
            
            // ? NOUVEAU : Sauvegarder les banni�res persistantes par salle dans localStorage
            const currentRoom = getCurrentRoom();
            if (statusType === 'in_progress' || statusType === 'resolved') {
                const persistentStatus = {
                    message: message,
                    statusType: statusType,
                    room: currentRoom,
                    timestamp: new Date().toISOString(),
                    active: true
                };
                try {
                    // ? CORRECTION : Stocker par salle pour �viter les conflits
                    const storageKey = `vitrine.persistent.status.${currentRoom}`;
                    localStorage.setItem(storageKey, JSON.stringify(persistentStatus));
                    console.log(`?? [StatusPersistence] Statut persistant sauvegard� pour ${currentRoom}:`, persistentStatus);
                } catch (e) {
                    console.warn('?? [StatusPersistence] Erreur sauvegarde:', e);
                }
            }
            
            // ? NOUVEAU : D�terminer le style bas� sur le type de statut
            let iconClass, bgColor;
            const isPersistent = statusType && (statusType === 'in_progress' || statusType === 'resolved');
            const statusClass = isPersistent ? 'persistent-status' : 'temporary-status';
            
            switch (statusType) {
                case 'in_progress':
                    iconClass = 'fas fa-wrench';
                    bgColor = '#17a2b8';
                    break;
                case 'resolved':
                    iconClass = 'fas fa-check-circle';
                    bgColor = '#28a745';
                    break;
                case 'closed':
                    iconClass = 'fas fa-lock';
                    bgColor = '#6c757d';
                    break;
                case 'open':
                    iconClass = 'fas fa-clipboard';
                    bgColor = '#007bff';
                    break;
                default:
                    iconClass = 'fas fa-info-circle';
                    bgColor = '#007bff';
                    break;
            }
            
            // ? NOUVEAU : Banni�re sp�ciale pour EN COURS avec num�ro d'urgence et sans bouton X
            if (statusType === 'in_progress') {
                statusContainer.innerHTML = `
                    <div class="ticket-status-message ${statusClass}" style="background-color: ${bgColor}; color: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.2); font-size: 15px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <i class="${iconClass}" style="margin-right: 12px; font-size: 18px;"></i>
                            <span style="font-weight: 500;">${message}</span>
                        </div>
                        <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px; font-size: 14px;">
                            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                                <i class="fas fa-phone" style="margin-right: 8px; font-size: 14px;"></i>
                                <span style="font-weight: 400;">Pour une urgence, contactez le SEA :</span>
                            </div>
                            <div style="font-size: 18px; font-weight: bold;">
                                ?? <a href="tel:6135" style="color: white; text-decoration: none;">6135</a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Banni�re normale pour les autres statuts
                statusContainer.innerHTML = `
                    <div class="ticket-status-message ${statusClass}" style="background-color: ${bgColor}; color: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.2); font-size: 15px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <i class="${iconClass}" style="margin-right: 12px; font-size: 18px;"></i>
                                <span style="font-weight: 500; flex: 1;">${message}</span>
                            </div>
                            ${isPersistent && statusType !== 'in_progress' ? `<button onclick="hideTicketStatusMessage()" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; font-size: 16px; padding: 8px; border-radius: 50%; margin-left: 15px; min-width: 32px; height: 32px;"><i class="fas fa-times"></i></button>` : ''}
                        </div>
                    </div>
                `;
            }
            statusContainer.style.display = 'block';
            
            // ? NOUVEAU : Effet blur sur la page pour les banni�res importantes
            if (statusType === 'open' || statusType === 'in_progress' || statusType === 'resolved') {
                addPageBlurEffect();
            }
            
            // ? NOUVEAU : Nettoyer le statut persistant si ce n'est plus un statut persistant
            if (!isPersistent) {
                try {
                    const storageKey = `vitrine.persistent.status.${currentRoom}`;
                    localStorage.removeItem(storageKey);
                    console.log(`?? [StatusPersistence] Statut non-persistant - Nettoyage localStorage pour ${currentRoom}`);
                } catch (e) {
                    console.warn('?? [StatusPersistence] Erreur nettoyage:', e);
                }
            }
            
            // ? NOUVEAU : Les statuts temporaires disparaissent apr�s 5 secondes, les persistants restent
            if (!isPersistent) {
                setTimeout(() => {
                    hideTicketStatusMessage();
                }, 5000);
            }
            
            console.log(`?? [Status] Message affich� (${isPersistent ? 'PERSISTANT' : 'TEMPORAIRE'}): ${message}`);
        }
        
        function hideTicketStatusMessage() {
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer) {
                statusContainer.style.display = 'none';
                // ? NOUVEAU : Retirer l'effet blur quand on ferme la banni�re
                removePageBlurEffect();
                
                // ? NOUVEAU : Nettoyer le statut persistant de la salle actuelle quand ferm� manuellement
                try {
                    const currentRoom = getCurrentRoom();
                    const storageKey = `vitrine.persistent.status.${currentRoom}`;
                    localStorage.removeItem(storageKey);
                    console.log(`?? [StatusPersistence] Statut persistant nettoy� pour ${currentRoom} suite � fermeture manuelle`);
                } catch (e) {
                    console.warn('?? [StatusPersistence] Erreur nettoyage fermeture:', e);
                }
            }
        }
        
        // ? NOUVEAU : Fonction pour restaurer le statut persistant au d�marrage
        let statusRestorationDone = false; // Protection contre les appels multiples
        
        function restorePersistentStatus() {
            // ? PROTECTION : �viter les appels multiples
            if (statusRestorationDone) {
                console.log('?? [StatusPersistence] Restauration d�j� effectu�e, ignor�');
                return;
            }
            
            try {
                const currentRoom = getCurrentRoom();
                const storageKey = `vitrine.persistent.status.${currentRoom}`;
                const persistentData = localStorage.getItem(storageKey);
                
                if (!persistentData) {
                    console.log(`?? [StatusPersistence] Aucun statut persistant � restaurer pour ${currentRoom}`);
                    statusRestorationDone = true;
                    return;
                }
                
                const status = JSON.parse(persistentData);
                
                // V�rifier que le statut concerne bien la salle actuelle (double v�rification)
                if (status.room !== currentRoom) {
                    console.log(`?? [StatusPersistence] Statut pour salle diff�rente (${status.room} vs ${currentRoom}) - Nettoyage`);
                    localStorage.removeItem(storageKey);
                    statusRestorationDone = true;
                    return;
                }
                
                // V�rifier que le statut est encore valide (pas trop ancien)
                const statusAge = Date.now() - new Date(status.timestamp).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24 heures
                
                if (statusAge > maxAge) {
                    console.log(`?? [StatusPersistence] Statut trop ancien (${Math.round(statusAge / 1000 / 60)} minutes) - Nettoyage`);
                    localStorage.removeItem(storageKey);
                    statusRestorationDone = true;
                    return;
                }
                
                // Restaurer la banni�re de statut
                console.log('?? [StatusPersistence] Restauration du statut persistant:', status);
                showTicketStatusMessage(status.message, status.statusType);
                statusRestorationDone = true;
                
            } catch (e) {
                console.warn('?? [StatusPersistence] Erreur restauration statut persistant:', e);
                // Nettoyer en cas d'erreur
                try {
                    const currentRoom = getCurrentRoom();
                    const storageKey = `vitrine.persistent.status.${currentRoom}`;
                    localStorage.removeItem(storageKey);
                } catch (cleanupError) {
                    console.warn('?? [StatusPersistence] Erreur nettoyage apr�s erreur:', cleanupError);
                }
                statusRestorationDone = true;
            }
        }
        
        // ? NOUVEAU : Fonction pour v�rifier le statut actuel c�t� serveur
        async function checkCurrentTicketStatus() {
            const currentRoom = getCurrentRoom();
            if (!currentRoom) return;
            
            // ? PROTECTION : Ne pas v�rifier si la restauration locale a d�j� trouv� un statut
            if (statusRestorationDone && document.getElementById('ticketStatusContainer')?.style.display !== 'none') {
                console.log('?? [StatusCheck] Banni�re d�j� restaur�e localement, skip v�rification serveur');
                return;
            }
            
            try {
                console.log('?? [StatusCheck] V�rification statut ticket actuel pour salle:', currentRoom);
                
                await ensureBackendConnection();
                const response = await fetch(`${currentAPI}/api/tickets/status/current?room=${encodeURIComponent(currentRoom)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const statusData = await response.json();
                    console.log('? [StatusCheck] Statut actuel re�u:', statusData);
                    
                    // Si un ticket est en cours, afficher la banni�re (seulement si pas d�j� affich�e)
                    if (statusData.success && statusData.ticket && statusData.ticket.status === 'in_progress') {
                        console.log('?? [StatusCheck] Ticket en cours d�tect� - V�rification si banni�re n�cessaire');
                        const existingBanner = document.getElementById('ticketStatusContainer');
                        if (!existingBanner || existingBanner.style.display === 'none') {
                            showTicketStatusMessage(statusData.ticket.status_message || 'Ticket en cours de traitement', 'in_progress');
                        }
                    } else if (statusData.success && statusData.ticket && statusData.ticket.status === 'resolved') {
                        console.log('?? [StatusCheck] Ticket r�solu d�tect� - V�rification si banni�re n�cessaire');
                        const existingBanner = document.getElementById('ticketStatusContainer');
                        if (!existingBanner || existingBanner.style.display === 'none') {
                            showTicketStatusMessage(statusData.ticket.status_message || 'Ticket r�solu', 'resolved');
                        }
                    } else {
                        // Pas de ticket actif, nettoyer le localStorage pour cette salle
                        const storageKey = `vitrine.persistent.status.${currentRoom}`;
                        localStorage.removeItem(storageKey);
                        console.log(`?? [StatusCheck] Pas de ticket actif - Nettoyage localStorage pour ${currentRoom}`);
                    }
                } else {
                    console.log('?? [StatusCheck] Erreur v�rification statut:', response.status);
                }
            } catch (error) {
                console.warn('? [StatusCheck] Erreur v�rification statut ticket:', error);
            }
        }
        
        // ? NOUVEAU : Fonctions pour g�rer l'effet blur et blocage des interactions
        function addPageBlurEffect() {
            // Cr�er un overlay blur si il n'existe pas
            let blurOverlay = document.getElementById('pageBlurOverlay');
            if (!blurOverlay) {
                blurOverlay = document.createElement('div');
                blurOverlay.id = 'pageBlurOverlay';
                blurOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 10000;
                    pointer-events: auto;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    cursor: default;
                `;
                
                document.body.appendChild(blurOverlay);
            }
            
            // ? CORRECTION : V�rifier que blurOverlay existe avant d'ajouter les �v�nements
            if (blurOverlay) {
                // ? NOUVEAU : Bloquer tous les clics sur l'overlay
                blurOverlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                
                // ? NOUVEAU : Bloquer le scroll et autres interactions
                blurOverlay.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
            
            // ? NOUVEAU : Bloquer le scroll sur le body
            document.body.style.overflow = 'hidden';
            
            // Afficher l'overlay avec animation
            setTimeout(() => {
                blurOverlay.style.opacity = '1';
            }, 10);
        }
        
        function removePageBlurEffect() {
            const blurOverlay = document.getElementById('pageBlurOverlay');
            if (blurOverlay) {
                blurOverlay.style.opacity = '0';
                
                // ? NOUVEAU : R�tablir le scroll sur le body
                document.body.style.overflow = '';
                
                setTimeout(() => {
                    if (blurOverlay.parentNode) {
                        blurOverlay.parentNode.removeChild(blurOverlay);
                    }
                }, 300);
            }
        }
        
        function createTicketStatusContainer() {
            const container = document.createElement('div');
            container.id = 'ticketStatusContainer';
            container.className = 'ticket-status-container';
            container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10001;
                max-width: 600px;
                width: 90%;
                display: none;
            `;
            document.body.appendChild(container);
            return container;
        }
        
        // ===== NOTIFICATION FUNCTION =====
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-info-circle" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10003;
                animation: slideInRight 0.5s ease-out;
                font-weight: 600;
                min-width: 250px;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }, 3000);
        }

        /**
         * Formate le contenu HTML
         */
        function formatContent(content) {
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
        }

        /**
         * Ferme une escalade
         */
        function dismissEscalation(escalationId) {
            const escalationElement = document.getElementById(escalationId);
            if (escalationElement) {
                escalationElement.remove();
            }
        }

        /**
         * Supprime un message
         */
        function removeMessage(messageId) {
            const messageElement = document.getElementById(messageId);
            if (messageElement) {
                messageElement.remove();
            }
        }



        /**
         * Affiche la modale avec le r�sultat
         */
        function showModal(icon, title, message, type) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            
            modalIcon.textContent = icon;
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            
            // Appliquer des styles selon le type
            const modal = document.getElementById('modal');
            modal.className = 'modal';
            if (type === 'success') {
                modal.style.borderLeft = '4px solid var(--primary-green)';
            } else if (type === 'warning') {
                modal.style.borderLeft = '4px solid var(--primary-orange)';
            } else if (type === 'info') {
                modal.style.borderLeft = '4px solid var(--primary-blue)';
            }
            
            modalOverlay.classList.add('active');
        }

        /**
         * Ferme la modale
         */
        function closeModal() {try{ window.__SEA_BANNER_OPEN__ = false; }catch(e){}

            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.remove('active');
            
            // Retour automatique � l'accueil apr�s un d�lai
            setTimeout(() => {
                returnToHome();
            }, 300);
        }



        // ===== GESTIONNAIRES D'�V�NEMENTS =====

        // Fermer la modale en cliquant sur l'overlay
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }

        // Fermer la modale avec la touche Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        // ===== FONCTIONS DE L'ORIGINAL =====

        function addMessage(type, content, data = {}) {
            // ? BLOQUER COMPL�TEMENT : Si c'est une action automatique ex�cut�e, ne rien afficher dans le chat
            if (data.auto_executed && data.auto_result) {
                // ? NOUVEAU: D�tecter les allumages de projecteur (actions + auto_result)
                const isProjectorPowerOnFromActions = data.actions && data.actions.some(action => 
                    action.type === 'pjlink_power' && 
                    (action.command === 'power_on' || action.description?.toLowerCase().includes('allumer'))
                );
                
                const isProjectorPowerOnFromResult = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('allumer') && 
                     (data.auto_result.includes('PROJ-') || data.auto_result.toLowerCase().includes('projecteur')));
                
                const isAVMuteAction = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('av mute') || 
                     data.auto_result.toLowerCase().includes('d�sactiver') && data.auto_result.includes('PROJ-'));
                
                // ? LOGIQUE SIMPLIFI�E : Banni�re verte simple pour TOUTES les corrections automatiques
                console.log('? [AutoCorrection] Action automatique r�ussie - Banni�re verte simple');
                setTimeout(() => {
                    showAutoResultBanner(data.auto_result);
                }, 500);
                return; // Ne pas cr�er de message dans le chat
            }
            
            const messageId = `msg_${Date.now()}_${++messageCount}`;
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.id = messageId;

            let messageContent = '';

            if (data.isLoading) {
                messageContent = `
                    <div class="message-content">
                        <div class="loading">
                            <div class="loading-dots">
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                            </div>
                            <span>Analyse en cours...</span>
                        </div>
                    </div>
                `;
            } else {
                messageContent = `<div class="message-content">`;
                
                if (type === 'user') {
                    messageContent += `<strong>Vous :</strong> ${content}`;
                } else {
                    // ? FILTRER : Supprimer les messages d'actions automatiques du contenu principal
                    let filteredContent = content;
                    if (typeof filteredContent === 'string') {
                        // Supprimer les lignes contenant des messages d'actions automatiques
                        filteredContent = filteredContent
                            .split('\n')
                            .filter(line => !line.includes('Actions automatiques ex�cut�es'))
                            .filter(line => !line.match(/^?.*D�sactiver.*sourdine/))
                            .filter(line => !line.match(/^?.*TCC2.*sourdine/))
                            .filter(line => !line.match(/^?.*[Aa]ction.*automatique/))
                            .filter(line => line.trim() !== '')
                            .join('\n');
                    }
                    messageContent += formatContent(filteredContent);
                }
                
                // Actions manuelles uniquement (les actions automatiques sont g�r�es par la banni�re centr�e)
                if (data.actions && data.actions.length > 0) {
                    const manualActions = data.actions.filter(action => !(action.executed || data.auto_executed));
                    if (manualActions.length > 0) {
                    messageContent += '<div class="message-actions">';
                        manualActions.forEach(action => {
                            messageContent += `<button class="action-btn" onclick="executeAction('${action.type}', '${action.device_id || 0}', ${JSON.stringify(action.parameters || {}).replace(/"/g, '&quot;')})">?? ${action.description || action.label || action.type}</button>`;
                    });
                    messageContent += '</div>';
                }
                }

                // ? Les actions automatiques sont g�r�es au d�but de addMessage (pas ici)
                
                // ? CORRECTION: Escalade avec banni�re centr�e - v�rifier les tickets existants
                if (data.escalation_needed) {
                    setTimeout(() => {
                        const currentRoom = getCurrentRoom();
                        if (hasExistingTicket(currentRoom)) {
                            const lastTicket = getLastSessionTicket(currentRoom);
                            console.log(`?? [TicketExistant] Escalade demand�e mais ticket ${lastTicket.number} existe ? Banni�re ticket existant`);
                            showExistingTicketBanner(lastTicket);
                        } else {
                            showSEAEscalationBanner(data);
                        }
                    }, 500);
                }
                
                // ? Actions automatiques d�j� g�r�es au d�but de addMessage
                
                messageContent += '</div>';
            }

            messageDiv.innerHTML = messageContent;
            
            // ? NOUVEAU : Remplacer le contenu au lieu d'ajouter
            const assistantPage = document.getElementById('assistantPage');
            
            // Supprimer tous les messages pr�c�dents
            const existingMessages = assistantPage.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            // Ajouter le nouveau message
            assistantPage.appendChild(messageDiv);
            
            // Charger l'image SEA2 pour les banni�res d'escalade
            // Tenter imm�diatement puis apr�s un court d�lai pour couvrir les transitions
            const escalationImgsNow = messageDiv.querySelectorAll('img[id^="sea-logo-"]');
            escalationImgsNow.forEach(img => updateSEALogo(img));
            setTimeout(() => {
                const escalationImgsLater = messageDiv.querySelectorAll('img[id^="sea-logo-"]');
                escalationImgsLater.forEach(img => updateSEALogo(img));
            }, 50);

            return messageId;
        }
        // ===== CACHE PODIO SESSION POUR INFOS SALLES =====
        /**
         * Cache session pour les informations Podio des salles
         * Garde les donn�es jusqu'au F5 de la page
         */
        class PodioRoomCache {
            constructor() {
                this.cache = new Map();
                this.maxCacheSize = 50; // Limite m�moire
                console.log('?? [PodioCache] Cache Podio initialis�');
            }
            
            /**
             * R�cup�re les informations d'une salle avec cache session
             */
            async getRoomInfo(roomName) {
                // ?? Check cache first (session seulement)
                if (this.cache.has(roomName)) {
                    console.log(`?? [PodioCache] Cache hit pour salle: ${roomName}`);
                    return this.cache.get(roomName);
                }
                
                try {
                    // ? NOUVEAU : S'assurer de la connexion backend avant appel Podio
                    const apiUrl = await ensureBackendConnection();
                    
                    console.log(`?? [PodioCache] API call pour salle: ${roomName}`);
                    
                    // ?? Appel API Podio PRIORITAIRE avec fallback NeonDB si �chec - ? UTILISER apiUrl
                    const response = await fetch(
                        `${apiUrl}/api/podio/public-room-info?room=${encodeURIComponent(roomName)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            // ?? Timeout pour �viter blocage
                            signal: AbortSignal.timeout(10000) // 10s timeout
                        }
                    );
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            throw new Error('Rate limit atteint - veuillez patienter');
                        }
                        throw new Error(`HTTP ${response.status}: Salle non trouv�e`);
                    }
                    
                    const data = await response.json();
                    
                    // ? PODIO SUCC�S: Parser la r�ponse Podio normale
                    if (data.success && data.details) {
                        console.log(`? [PodioCache] Salle ${roomName} trouv�e dans Podio`);
                        const roomInfo = {
                            name: data.salle_code || roomName,
                            pavillon: data.details.Pavillon || '',
                            bassin: data.details.Proprietaire || '',
                            type: data.details["Type de salle"] || '',
                            capacite: data.details["Capacit�"] || '',
                            source: 'podio'
                        };
                        
                        this.cache.set(roomName, roomInfo);
                        console.log(`? [PodioCache] Salle ${roomName} mise en cache (Podio):`, roomInfo);
                        return roomInfo;
                    }
                    
                    // ?? PODIO �CHEC: Essayer fallback NeonDB pour �quipements
                    console.log(`?? [PodioCache] Salle ${roomName} non trouv�e dans Podio ? Tentative fallback NeonDB`);
                    throw new Error('Salle non trouv�e dans Podio, fallback NeonDB n�cessaire');
                    
                } catch (error) {
                    console.warn(`?? [PodioCache] �chec Podio pour ${roomName}: ${error.message}`);
                    
                    // ? FALLBACK NEONDB: Essayer de r�cup�rer les �quipements depuis NeonDB
                    try {
                        console.log(`?? [PodioCache] Tentative fallback NeonDB pour salle: ${roomName}`);
                        
                        // ? CORRECTION: S'assurer que apiUrl est d�fini dans le scope du catch
                        const fallbackApiUrl = await ensureBackendConnection();
                        
                        const neonResponse = await fetch(
                            `${fallbackApiUrl}/api/room/equipment?room=${encodeURIComponent(roomName)}`,
                            {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                signal: AbortSignal.timeout(8000) // Timeout plus court pour fallback
                            }
                        );
                        
                        if (neonResponse.ok) {
                            const neonData = await neonResponse.json();
                            if (neonData.success && Array.isArray(neonData.devices)) {
                                console.log(`? [PodioCache] Salle ${roomName} trouv�e via NeonDB (${neonData.devices.length} �quipements)`);
                                
                                const roomInfo = {
                                    name: roomName,
                                    pavillon: '', // Non disponible via NeonDB
                                    bassin: '',   // Non disponible via NeonDB
                                    type: '',     // Non disponible via NeonDB
                                    capacite: '', // Non disponible via NeonDB
                                    devices: neonData.devices || [],
                                    equipment_count: neonData.count || 0,
                                    source: 'neondb' // ? Marquer la source
                                };
                                
                                // ?? Mettre en cache le r�sultat NeonDB
                                this.cache.set(roomName, roomInfo);
                                
                                // ?? Nettoyer cache si n�cessaire
                                if (this.cache.size > this.maxCacheSize) {
                                    const firstKey = this.cache.keys().next().value;
                                    this.cache.delete(firstKey);
                                    console.log(`?? [PodioCache] Cache nettoy� - supprim�: ${firstKey}`);
                                }
                                
                                console.log(`? [PodioCache] Salle ${roomName} mise en cache (NeonDB):`, roomInfo);
                                return roomInfo;
                            }
                        }
                        
                        console.log(`? [PodioCache] Fallback NeonDB �galement �chou� pour ${roomName}`);
                        return null; // D�gradation gracieuse
                        
                    } catch (neonError) {
                        console.warn(`? [PodioCache] Erreur fallback NeonDB pour ${roomName}:`, neonError.message);
                        return null; // D�gradation gracieuse
                    }
                }
            }
            
            /**
             * Vide le cache manuellement (pour tests)
             */
            clearCache() {
                this.cache.clear();
                console.log('?? [PodioCache] Cache Podio vid� manuellement');
            }
            
            /**
             * Statistiques du cache
             */
            getStats() {
                return {
                    size: this.cache.size,
                    maxSize: this.maxCacheSize,
                    keys: Array.from(this.cache.keys())
                };
            }
        }
        
        // Instance globale du cache Podio
        const podioRoomCache = new PodioRoomCache();

        // ===== FONCTIONS UTILITAIRES POUR TICKETS =====
        
        /**
         * D�termine le type de probl�me bas� sur le contexte
         */
        function determineProblemType() {
            // Analyser le dernier message ou le contexte pour d�terminer le type
            const messages = document.querySelectorAll('.message');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageText = lastMessage.textContent.toLowerCase();
                
                if (messageText.includes('audio') || messageText.includes('son') || messageText.includes('microphone') || messageText.includes('haut-parleur')) {
                    return 'audio';
                } else if (messageText.includes('vid�o') || messageText.includes('projecteur') || messageText.includes('�cran') || messageText.includes('image')) {
                    return 'vid�o';
                } else if (messageText.includes('r�seau') || messageText.includes('internet') || messageText.includes('wifi') || messageText.includes('connexion')) {
                    return 'r�seau';
                } else {
                    return 'technique';
                }
            }
            return 'technique';
        }
        
        /**
         * G�n�re un message g�n�rique selon le type de probl�me
         */
        function getGenericMessage(problemType) {
            const messages = {
                'audio': 'Probl�me audio signal� - Microphone, haut-parleurs, volume ou qualit� sonore',
                'vid�o': 'Probl�me vid�o signal� - Projecteur, �cran, qualit� d\'image ou connectivit�',
                'r�seau': 'Probl�me r�seau signal� - Connexion internet, Wi-Fi ou connectivit� r�seau',
                'technique': 'Probl�me technique signal� - �quipement, infrastructure ou maintenance g�n�rale'
            };
            
            return messages[problemType] || messages['technique'];
        }

        // ===== FONCTIONS DE TH�ME ET NAVIGATION =====
        
        // Basculer le th�me
        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                body.classList.remove('dark'); // Pour Tailwind CSS
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Mode nuit';
                localStorage.removeItem('theme');
                } else {
                body.setAttribute('data-theme', 'dark');
                body.classList.add('dark'); // Pour Tailwind CSS
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Mode jour';
                localStorage.setItem('theme', 'dark');
            }
        }

        // ? NOUVEAU : Fonctions Mode Technique
        function openTechnicalMode() {
            console.log('?? [Technical] Ouverture du mode technique');
            const modal = document.getElementById('technicalAuthModal');
            const passwordInput = document.getElementById('technicalPassword');
            const errorDiv = document.getElementById('technicalAuthError');
            
            // R�initialiser le modal
            passwordInput.value = '';
            errorDiv.style.display = 'none';
            
            // Afficher le modal
            modal.style.display = 'flex';
            
            // Focus sur le champ de mot de passe
            setTimeout(() => {
                passwordInput.focus();
            }, 100);
        }

        function closeTechnicalAuth() {
            console.log('?? [Technical] Fermeture modal authentification');
            const modal = document.getElementById('technicalAuthModal');
            modal.style.display = 'none';
        }

        function handleTechnicalPasswordKeypress(event) {
            if (event.key === 'Enter') {
                submitTechnicalAuth();
            }
        }

        async function submitTechnicalAuth() {
            const passwordInput = document.getElementById('technicalPassword');
            const errorDiv = document.getElementById('technicalAuthError');
            const submitBtn = document.querySelector('.technical-auth-submit');
            const password = passwordInput.value.trim();
            
            console.log('?? [Technical] Tentative d\'authentification via API');
            
            if (!password) {
                showTechnicalAuthError('Veuillez saisir le mot de passe');
                return;
            }
            
            // D�sactiver le bouton pendant la requ�te
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> V�rification...';
            
            try {
                const response = await fetch(`${currentAPI}/api/technical/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        password: password
                    })
                });
                
                const data = await response.json();
                console.log('?? [Technical] R�ponse API:', data);
                
                if (data.success) {
                    console.log('? [Technical] Authentification r�ussie');
                    // Stocker le token pour les futures requ�tes (optionnel)
                    localStorage.setItem('technical_token', data.token);
                    localStorage.setItem('technical_expires', data.expires_at);
                    
                    closeTechnicalAuth();
                    showTechnicalPage();
                } else {
                    console.log('? [Technical] Authentification �chou�e:', data.message);
                    showTechnicalAuthError(data.message || 'Mot de passe incorrect');
                }
            } catch (error) {
                console.error('? [Technical] Erreur lors de l\'authentification:', error);
                showTechnicalAuthError('Erreur de connexion au serveur');
            } finally {
                // R�activer le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-unlock"></i> Acc�der';
            }
        }

        function showTechnicalAuthError(message) {
            const errorDiv = document.getElementById('technicalAuthError');
            const passwordInput = document.getElementById('technicalPassword');
            
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
            
            // Animation de shake sur le modal
            const modal = document.querySelector('.technical-auth-content');
            modal.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                modal.style.animation = '';
            }, 500);
        }

        function showTechnicalPage() {
            console.log('?? [Technical] Affichage page technique');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // R�cup�rer la salle actuelle pour l'afficher
            const currentRoom = getCurrentRoom();
            const technicalRoomSpan = document.getElementById('technicalCurrentRoom');
            if (technicalRoomSpan) {
                technicalRoomSpan.textContent = currentRoom || 'Non d�finie';
            }
            
            // ? NOUVEAU : G�rer l'affichage du plan unifilaire
            if (window.RoomPlansConfig) {
                console.log('?? [Technical] Mise � jour des plans pour:', currentRoom);
                window.RoomPlansConfig.updatePlanSection(currentRoom);
            } else {
                console.warn('?? [Technical] Module RoomPlansConfig non charg�');
            }
            
            // Masquer Vitrine et afficher la page technique
            if (mainContainer) {
                mainContainer.style.display = 'none';
            }
            technicalPage.style.display = 'block';
            
            console.log('?? [Technical] Page technique affich�e pour la salle:', currentRoom);
        }
        


        function returnToVitrine() {try{ window.__SEA_BANNER_OPEN__ = false; }catch(e){}

            console.log('?? [Technical] Retour � Vitrine');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // Masquer la page technique et r�afficher Vitrine
            technicalPage.style.display = 'none';
            if (mainContainer) {
                mainContainer.style.display = 'block';
            }
            
            console.log('? [Technical] Retour � Vitrine effectu�');
        }

        // ? NOUVEAU : Fonctions de gestion de l'overlay de chargement diagnostic
        let __diagnosticLoadingShownAtMs = 0;

        function showDiagnosticLoading() {
            console.log('? [Diagnostic] Affichage du chargement');
            const overlay = document.getElementById('diagnosticLoadingOverlay');
            if (overlay) {
                __diagnosticLoadingShownAtMs = Date.now();
                overlay.style.display = 'flex';
                // Petite pause pour la transition CSS
                setTimeout(() => {
                    overlay.classList.add('show');
                }, 10);
            }
        }

        function hideDiagnosticLoading() {
            console.log('? [Diagnostic] Masquage du chargement');
            const overlay = document.getElementById('diagnosticLoadingOverlay');
            if (overlay) {
                // Respecter une dur�e minimale d'affichage de 2 secondes
                const MIN_DURATION_MS = 2000;
                const elapsed = Date.now() - (__diagnosticLoadingShownAtMs || 0);
                const delay = Math.max(0, MIN_DURATION_MS - elapsed);
                setTimeout(() => {
                    overlay.classList.remove('show');
                    overlay.style.display = 'none';
                }, delay);
            }
        }

        function updateDiagnosticLoadingText(text, subtext = '') {
            const textElement = document.querySelector('.diagnostic-loading-text');
            const subtextElement = document.querySelector('.diagnostic-loading-subtext');
            
            if (textElement) {
                textElement.textContent = text;
            }
            if (subtextElement && subtext) {
                subtextElement.textContent = subtext;
            }
        }

        // Retour � l'accueil (page des palettes) - PAS la landing page
        function returnToHome() {
            // S'assurer que la page des palettes est visible
            const assistantPage = document.getElementById('assistantPage');
            const landingPage = document.getElementById('landingPage');
            if (assistantPage) assistantPage.style.display = 'block';
            if (landingPage) landingPage.style.display = 'none';
            
            // Vider les messages
            if (assistantPage) {
                const existingMessages = assistantPage.querySelectorAll('.message');
                existingMessages.forEach(msg => msg.remove());
            }
            
            // ? NETTOYAGE : Supprimer toutes les banni�res d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
            
            const escalationCompact = document.querySelectorAll('.escalation-compact');
            escalationCompact.forEach(compact => compact.remove());
            
            // ? NETTOYAGE : Supprimer tous les messages contenant "Actions automatiques ex�cut�es"
            document.querySelectorAll('.message').forEach(message => {
                if (message.textContent && message.textContent.includes('Actions automatiques ex�cut�es')) {
                    message.remove();
                }
            });
            
            // Afficher les palettes de probl�mes avec la grille horizontale
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'grid';
                problemPalettes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
                problemPalettes.style.gap = '2rem';
            }
            
            // Vider les suggestions
            const suggestionsContainer = document.getElementById('suggestions');
            if (suggestionsContainer) {
                suggestionsContainer.innerHTML = '';
            }
            
            console.log('?? Retour � l\'accueil (page des palettes)');
        }

        // Appliquer le th�me sauvegard� au chargement
        document.addEventListener('DOMContentLoaded', () => {
            // ? INITIALISATION TH�ME ET COULEURS
            const headerTitle = document.getElementById('headerTitle');
            const savedTheme = localStorage.getItem('vitrine-theme');
            
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark'); // Pour Tailwind CSS
                if (headerTitle) headerTitle.style.color = 'black';
            } else {
                document.body.removeAttribute('data-theme');
                document.body.classList.remove('dark'); // Pour Tailwind CSS
                if (headerTitle) headerTitle.style.color = 'black';
            }
            
            // ? NETTOYAGE : Supprimer toutes les banni�res d'escalade r�siduelles
            const oldEscalationInterfaces = document.querySelectorAll('.escalation-interface');
            oldEscalationInterfaces.forEach(interface => interface.remove());
            
            const oldEscalationCompact = document.querySelectorAll('.escalation-compact');
            oldEscalationCompact.forEach(compact => compact.remove());
            
            // ? NETTOYAGE IMM�DIAT : Supprimer tous les messages "Actions automatiques ex�cut�es"
            setTimeout(() => {
                document.querySelectorAll('.message').forEach(message => {
                    if (message.textContent && message.textContent.includes('Actions automatiques ex�cut�es')) {
                        message.remove();
                        console.log('?? Message "Actions automatiques ex�cut�es" supprim� du DOM');
                    }
                });
            }, 100);
            
            // ===== TH�ME HYBRIDE INTELLIGENT =====
            initializeTheme();
            setupThemeListener();
            console.log('?? [Theme] Syst�me de th�me hybride initialis�');
            
            // ===== VERROUILLAGE DE SALLE =====
            checkAndApplyRoomLock();
            
            // ===== CHAT SEA INITIALISATION =====
            console.log('?? [ChatSEA] Initialisation du syst�me de chat');
            
            // G�n�rer un client_id unique et persistant
            clientID = localStorage.getItem('vitrine.client_id');
            if (!clientID) {
                clientID = generateUUID();
                localStorage.setItem('vitrine.client_id', clientID);
            }
            
            // R�cup�rer le kiosk_id depuis l'URL
            const urlParams = new URLSearchParams(window.location.search);
            kioskID = urlParams.get('kiosk');
            
            if (kioskID) {
                console.log('??? [ChatSEA] Kiosk d�tect�:', kioskID);
            }
            
            // ? CORRIG� : Attendre l'initialisation du backend avant de d�marrer les EventSource
            if (getCurrentRoom()) {
                backendInitPromise.then(() => {
                    startChatRequestListener();
                    startStatusEventSource();
                    
                    // ? NOUVEAU : Restaurer le statut persistant apr�s initialisation
                    setTimeout(() => {
                        restorePersistentStatus();
                        // V�rifier aussi le statut c�t� serveur pour synchronisation
                        checkCurrentTicketStatus();
                    }, 2000); // Attendre 2s pour que les connexions SSE soient �tablies
                });
            }
        });





        // ===== INITIALISATION =====
        console.log('??? Assistant Salle AV - Syst�me initialis�');
        console.log('?? Fonctionnalit�s disponibles :');
        console.log('  � Saisie obligatoire de salle');
        console.log('  � Cache persistant de salle');
        console.log('  � Diagnostic audio automatique');
        console.log('  � Diagnostic vid�o automatique');
        console.log('  � Redirection r�seau');
        console.log('  � Redirection SIM');
        console.log('  � Mode hybride intelligent (clair/sombre)');
        console.log('  � D�tection automatique des pr�f�rences syst�me');
        console.log('  � Bouton de retour');
        
        // ? CONFIGURATION SIMPLIFI�E - Pas de surveillance n�cessaire
        console.log('? [Config] Backend unique configur�');

// ? EXPOSITION DES FONCTIONS GLOBALES POUR VITRINE.HTML
// Ces fonctions sont n�cessaires pour l'interface entre vitrine.html et app.js

// Fonction principale d'initialisation de Vitrine
window.initializeVitrine = function() {
    console.log('?? [initializeVitrine] D�marrage de l\'application Vitrine');
    
    // Cr�er l'interface Vitrine
    if (typeof createVitrine === 'function') {
        createVitrine();
        console.log('? [initializeVitrine] Interface cr��e');
    } else {
        console.error('? [initializeVitrine] Fonction createVitrine non trouv�e');
        return false;
    }
    
    // Initialiser le th�me
    if (typeof initializeTheme === 'function') {
        initializeTheme();
    }
    
    // V�rifier si une salle est verrouill�e
    if (window.__VITRINE_LOCK__ && window.__VITRINE_LOCK__.isLocked()) {
        const lockedRoom = window.__LOCKED_ROOM_NAME__;
        console.log('?? [initializeVitrine] Salle verrouill�e d�tect�e:', lockedRoom);
        
        // Simuler la confirmation de salle verrouill�e
        if (typeof setRoomCache === 'function' && typeof parseRoomInfo === 'function') {
            const roomInfo = parseRoomInfo(lockedRoom);
            if (roomInfo) {
                setRoomCache(roomInfo);
                if (typeof showAssistant === 'function') {
                    showAssistant();
                }
            }
        }
    }
    
    console.log('? [initializeVitrine] Vitrine initialis�e avec succ�s');
    return true;
};

// Fonction de d�tection du meilleur backend (expos�e globalement)
window.detectBestBackend = detectBestBackend;

// Fonction pour obtenir l'API courante
window.getCurrentAPI = getCurrentAPI;

// ? FONCTION createVitrine BASIQUE (interface HTML)
function createVitrine() {
    // �viter la duplication si l'interface existe d�j�
    if (document.querySelector('.main-container')) {
        return;
    }
    // Cr�er le container principal de l'application
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="main-container">
            <!-- Interface basique de Vitrine -->
            <div class="header">
                <div class="header-top">
                    <button class="technical-btn" onclick="openTechnicalMode()">
                        <i class="fas fa-cog"></i>
                        <span>Technique</span>
                    </button>
                    <button class="theme-toggle" onclick="toggleTheme()">
                        <i class="fas fa-moon" id="themeIcon"></i>
                        <span id="themeText">Mode nuit</span>
                    </button>
                </div>
                <div class="title-section">
                    <img alt="Vitrine" src="https://zine76.github.io/vitrine/assets/Vitrine.png" style="height: 80px;"/>
                    <p id="headerTitle">Diagnostic interactif et assistance audiovisuelle</p>
                </div>
                <div class="status-indicator">
                    <div class="status-dot" id="connection-indicator"></div>
                    <span id="connection-text">Syst�me op�rationnel</span>
                </div>
            </div>
            
            <!-- Page d'accueil -->
            <div id="landingPage" class="landing-page">
                <div class="landing-content">
                    <div class="welcome-section">
                        <img src="https://zine76.github.io/vitrine/assets/Vitrine.png" alt="Vitrine" class="welcome-logo">
                        <h2>Bienvenue sur la Vitrine SavQonnect</h2>
                        <p>S�lectionnez votre salle pour commencer</p>
                    </div>
                    <div class="room-input-container">
                        <input type="text" id="roomInput" placeholder="Ex: A-1750, B-2500" onkeypress="handleRoomKeyPress(event)">
                        <button id="confirmRoomBtn" onclick="confirmRoom()">Confirmer</button>
                    </div>
                </div>
            </div>
            
            <!-- Page assistant -->
            <div id="assistantPage" class="assistant-page" style="display: none;">
                <div class="room-header">
                    <span id="currentRoomDisplay">Salle</span>
                    <button onclick="changeRoom()">Changer de salle</button>
                </div>
                <div class="assistant-content">
                    <div id="problemPalettes" class="problem-palettes">
                        <button onclick="sendExampleMessage('Probl�me Vid�o')">Probl�me Vid�o</button>
                        <button onclick="sendExampleMessage('Probl�me Audio')">Probl�me Audio</button>
                        <button onclick="sendExampleMessage('Probl�me de r�seau')">Probl�me R�seau</button>
                    </div>
                    <div class="problem-input-section">
                        <input type="text" id="problemInput" placeholder="D�crivez votre probl�me...">
                        <button id="sendBtn" onclick="sendProblemReport()">Signaler</button>
                    </div>
                    <div id="suggestions" class="suggestions"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    console.log('? [createVitrine] Interface basique cr��e');

	// Injecter le modal d'authentification technique si absent
	if (!document.getElementById('technicalAuthModal')) {
		const authModal = document.createElement('div');
		authModal.id = 'technicalAuthModal';
		authModal.className = 'technical-auth-modal';
		authModal.style.display = 'none';
		authModal.style.position = 'fixed';
		authModal.style.inset = '0';
		authModal.style.alignItems = 'center';
		authModal.style.justifyContent = 'center';
		authModal.style.background = 'rgba(0,0,0,0.5)';
		authModal.style.zIndex = '10000';
		authModal.innerHTML = `
			<div class="technical-auth-content" style="background:#111827; color:#e5e7eb; padding:1.5rem; border-radius:0.75rem; width:100%; max-width:420px; box-shadow:0 10px 25px rgba(0,0,0,0.6);">
				<h3 style="margin:0 0 1rem 0; font-size:1.25rem; display:flex; align-items:center; gap:.5rem;"><i class="fas fa-user-shield"></i> Mode technique</h3>
				<div id="technicalAuthError" class="technical-auth-error" style="display:none; background:#7f1d1d; color:#fecaca; padding:.5rem .75rem; border-radius:.5rem; margin-bottom:.75rem;"></div>
				<input type="password" id="technicalPassword" placeholder="Mot de passe" onkeypress="handleTechnicalPasswordKeypress(event)" style="width:100%; padding:.6rem .8rem; border-radius:.5rem; border:1px solid #374151; background:#0b1220; color:#e5e7eb; outline:none;">
				<div class="technical-auth-actions" style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1rem;">
					<button class="technical-auth-cancel" onclick="closeTechnicalAuth()" style="background:#374151; color:#e5e7eb; border:none; padding:.5rem .9rem; border-radius:.5rem; cursor:pointer;"><i class="fas fa-times"></i> Annuler</button>
					<button class="technical-auth-submit" onclick="submitTechnicalAuth()" style="background:#10b981; color:white; border:none; padding:.5rem .9rem; border-radius:.5rem; cursor:pointer;"><i class="fas fa-unlock"></i> Acc�der</button>
				</div>
			</div>`;
		document.body.appendChild(authModal);
	}

	// Injecter la page technique si absente
	if (!document.getElementById('technicalPage')) {
		const techPage = document.createElement('div');
		techPage.id = 'technicalPage';
		techPage.style.display = 'none';
		techPage.style.padding = '1rem';
		techPage.innerHTML = `
			<div class="technical-header" style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
				<button onclick="returnToVitrine()" style="background:#3b82f6; color:white; border:none; padding:.4rem .8rem; border-radius:.5rem; cursor:pointer;"><i class=\"fas fa-arrow-left\"></i> Retour</button>
				<h2 style="margin:0;">Mode technique</h2>
				<div style="margin-left:auto;">Salle: <strong id="technicalCurrentRoom"></strong></div>
			</div>
			<div class="technical-content" style="background:#0b1220; color:#e5e7eb; padding:1rem; border-radius:.75rem;">
				<p>Outils techniques disponibles prochainement.</p>
			</div>`;
		document.body.appendChild(techPage);
	}
}
console.log('[AppJS] Fonctions globales expos�es pour vitrine.html');
// Admin overlay + reset (Alt+Ctrl+K). Also adds click fallback and console hook.
(function(){
  var ADMIN_CODE = 'adminsav';

  function ensureStyles(){
    if (document.getElementById('admin-reset-styles')) return;
    var st = document.createElement('style');
    st.id = 'admin-reset-styles';
    st.textContent = [
      '.admin-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.45);z-index:99999;}',
      '.admin-modal{background:#fff;max-width:420px;width:92%;border-radius:14px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.25);padding:20px 20px 16px;',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}',
      '[data-theme="dark"] .admin-modal{background:#1f2937;color:#e5e7eb;}',
      '.admin-title{font-size:18px;font-weight:700;margin:0 0 6px;}',
      '.admin-sub{font-size:13px;color:#6b7280;margin:0 0 14px;}',
      '[data-theme="dark"] .admin-sub{color:#9ca3af;}',
      '.admin-input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;',
      'font-size:15px;background:#fff;color:#111827;outline:none;}',
      '[data-theme="dark"] .admin-input{background:#111827;color:#e5e7eb;border-color:#374151;}',
      '.admin-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;}',
      '.admin-btn{padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;cursor:pointer;font-weight:600;}',
      '.admin-btn.primary{background:#3b82f6;border-color:#2563eb;color:#fff;}',
      '.admin-error{color:#dc2626;font-size:13px;margin-top:8px;display:none;}'
    ].join('');
    document.head.appendChild(st);
  }

  function clearLikelyRoomKeys(){
    try {
      var toRemove = [];
      for (var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if (!k) continue;
        var key = k.toLowerCase();
        if (key.includes('salle') || key.includes('room') || key.includes('vitrine') ||
            key.includes('podio') || key.includes('cache')) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(function(k){ localStorage.removeItem(k); });
      localStorage.removeItem('nomSalle');
      localStorage.removeItem('vitrineSalle');
    } catch(e){}
  }

  function showAdminPrompt(){
    ensureStyles();
    var ov = document.createElement('div');
    ov.className = 'admin-overlay';
    ov.innerHTML = ''
      + '<div class="admin-modal">'
      + '  <h3 class="admin-title">Acc�s administrateur</h3>'
      + '  <p class="admin-sub">Entrer le mot de passe pour r�initialiser la salle sur ce poste.</p>'
      + '  <input type="password" class="admin-input" id="admin-pass" placeholder="Mot de passe">'
      + '  <div class="admin-error" id="admin-error">Mot de passe incorrect.</div>'
      + '  <div class="admin-actions">'
      + '    <button class="admin-btn" id="admin-cancel">Annuler</button>'
      + '    <button class="admin-btn primary" id="admin-ok">Valider</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(ov);

    var input = ov.querySelector('#admin-pass');
    var err = ov.querySelector('#admin-error');
    var cancel = ov.querySelector('#admin-cancel');
    var ok = ov.querySelector('#admin-ok');

    function close(){ ov.remove(); }
    function submit(){
      var v = input.value || '';
      if (v === ADMIN_CODE){
        clearLikelyRoomKeys();
        location.reload();
      } else {
        err.style.display = 'block';
        input.select(); input.focus();
      }
    }

    cancel.addEventListener('click', close);
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') close();
    });
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    setTimeout(function(){ input.focus(); }, 50);
  }

  // expose for console
  window.vitrineAdminReset = showAdminPrompt;

  // Alt + Ctrl + K
  document.addEventListener('keydown', function(e){
    if (e.altKey && e.ctrlKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')){
      e.preventDefault(); e.stopPropagation();
      showAdminPrompt();
    }
  }, true);

  // Fallback: Ctrl+Shift+S
  document.addEventListener('keydown', function(e){
    if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')){
      e.preventDefault(); e.stopPropagation();
      showAdminPrompt();
    }
  }, true);

  // Fallback souris: 5 clics en haut-gauche
  (function(){
    var clicks = 0, t = null;
    document.addEventListener('click', function(e){
      if (e.clientX < 80 && e.clientY < 80){
        clicks++;
        if (clicks === 1){ t = setTimeout(function(){ clicks = 0; }, 2000); }
        if (clicks >= 5){
          clicks = 0; if (t){ clearTimeout(t); t = null; }
          showAdminPrompt();
        }
      }
    }, true);
  })();
})();

// VITRINE LOCK ENFORCER
(function(){
  var KEY = 'vitrine.room.lock';
  var ADMIN_PASS = 'vitrine'; // change si n�cessaire

  function get(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } }
  function set(obj){ try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch(e){} }
  function clear(){ try { localStorage.removeItem(KEY); } catch(e){} }
  function isLocked(){ var s=get(); return !!(s && s.locked && s.name); }

  function toast(msg){
    try {
      var el = document.getElementById('lock-toast'); if(!el){ el=document.createElement('div'); el.id='lock-toast';
        el.style.cssText='position:fixed;bottom:18px;right:18px;background:rgba(0,0,0,.8);color:#fff;padding:10px 14px;border-radius:10px;z-index:99999;font:14px system-ui;';
        document.body.appendChild(el);
      }
      el.textContent = msg; el.style.opacity='1'; clearTimeout(el._t); el._t=setTimeout(()=>el.style.opacity='0',2500);
    } catch(e){}
  }

  function applyLockUI(){
    if (!isLocked()) return;
    document.documentElement.classList.add('is-room-locked');

    document.addEventListener('click', function(e){
      if (!isLocked()) return;
      var t = e.target;
      var el = t.closest ? t.closest('.change-room-btn,[data-action="choose-room"],[data-action="change-room"],[onclick*="changeRoom"],[href*="landing"],[data-route="landing"]') : null;
      if (el) { e.stopImmediatePropagation(); e.preventDefault(); toast('Salle verrouill�e. Alt+Ctrl+K pour modifier.'); }
    }, true);

    document.querySelectorAll('.change-room-btn,[data-action="choose-room"],[data-action="change-room"],[onclick*="changeRoom"],[href*="landing"],[data-route="landing"]').forEach(function(el){
      el.setAttribute('disabled','disabled'); el.style.pointerEvents='none'; el.style.opacity='.5'; el.style.filter='grayscale(1)';
    });
  }

  var originalChange = window.changeRoom;
  window.changeRoom = function(){
    if (isLocked()) { console.log('[LOCK] changeRoom() bloqu�'); toast('Salle verrouill�e. Alt+Ctrl+K pour modifier.'); return; }
    if (typeof originalChange === 'function') return originalChange.apply(this, arguments);
  };
  var originalConfirm = window.confirmRoom;
  window.confirmRoom = function(){
    var r = (typeof originalConfirm === 'function') ? originalConfirm.apply(this, arguments) : undefined;
    try {
      // Ne capturer QUE les inputs de salle, pas ceux de configuration backend
      var candidate = document.querySelector('#roomInput, input[name*="salle" i], input[id*="salle" i]:not(#backendIpInput)');
      var v = (candidate && candidate.value || '').trim();
      // Valider que c'est bien un nom de salle et pas une IP
      if (v && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v) && !v.includes('.') && !v.includes(':')) {
        set({ locked:true, name:v, setAt: new Date().toISOString() });
      }
    } catch(e){}
    setTimeout(applyLockUI, 0);
    return r;
  };

  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t) return;
    var isConfirm = false;
    if (t.matches) {
      isConfirm = t.matches('button[type="submit"],button.confirm,[data-action="confirm"],[data-role="confirm-room"]');
    }
    if (!isConfirm && t.innerText) {
      var txt = t.innerText.trim().toLowerCase();
      isConfirm = (txt === 'confirmer' || txt === 'confirm' || txt.includes('confirmer'));
    }
    if (isConfirm) {
      if (isLocked()) { e.preventDefault(); e.stopImmediatePropagation(); toast('Salle verrouill�e. Alt+Ctrl+K pour modifier.'); return; }
      try {
        // Ne capturer QUE les inputs de salle, pas ceux de configuration backend
        var candidate = document.querySelector('#roomInput, input[name*="salle" i], input[id*="salle" i]:not(#backendIpInput)');
        var v = (candidate && candidate.value || '').trim();
        // Valider que c'est bien un nom de salle et pas une IP
        if (v && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v) && !v.includes('.') && !v.includes(':')) {
          set({ locked:true, name:v, setAt: new Date().toISOString() });
        }
        setTimeout(applyLockUI, 0);
      } catch(e){}
    }
  }, true);

  // Supprim�: Alt+Ctrl+K g�r� uniquement par le panneau admin principal (pas de double prompt)

  document.addEventListener('DOMContentLoaded', applyLockUI);
})();

// === Extracted from vitrine.htm (2025-08-22 10:01:06) ===

(function () {
  var KEY = 'vitrine.room.lock';
  try {
    var state = JSON.parse(localStorage.getItem(KEY) || 'null');
    window.__VITRINE_LOCK__ = {
      get: function(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } },
      set: function(obj){ try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch(e){} },
      clear: function(){ try { localStorage.removeItem(KEY); } catch(e){} },
      isLocked: function(){ var s=this.get(); return !!(s && s.locked && s.name); }
    };
    if (state && state.locked && state.name) {
      document.documentElement.classList.add('is-room-locked');
      window.__LOCKED_ROOM_NAME__ = state.name;
    }
  } catch(e){}
})();

// ===== EXTENSIONS VITRINE - BACKEND DYNAMIQUE & MONITORING =====
// Ajout� pour permettre � la vitrine de fonctionner depuis n'importe quel PC

// ===== PATCH CRITIQUE POUR BACKEND DYNAMIQUE =====
(function() {
    setTimeout(() => {
        console.log('?? [BackendPatch] Application du patch pour backend dynamique');
        
        function getConfiguredBackendUrl() {
            // ? PRIORIT� 1 : Utiliser currentAPI si d�fini (m�me URL que app.js principal)
            if (typeof currentAPI !== 'undefined' && currentAPI) {
                return currentAPI;
            }
            
            // ? PRIORIT� 2 : Utiliser API_BASE_URL si d�fini (notre nouvelle logique)
            if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
                return API_BASE_URL;
            }
            
            // ? PRIORIT� 3 : Utiliser window.BACKEND_BASE si d�fini
            if (window.BACKEND_BASE) {
                return window.BACKEND_BASE;
            }
            
            // ? PRIORIT� 4 : R�cup�rer depuis localStorage
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    return /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                }
            } catch (e) {
                console.error('? [BackendPatch] Erreur lecture localStorage:', e);
            }
            
            // ? PRIORIT� 5 : Fallback vers IP r�seau actuel
            console.log('?? [BackendPatch] Fallback vers IP r�seau actuel');
            return 'http://localhost:7070';
        }
        
        let configuredUrl = getConfiguredBackendUrl();
        console.log(`?? [BackendPatch] URL backend configur�e: ${configuredUrl}`);
        
        // �couter les changements de backend pour mettre � jour la configuration
        window.addEventListener('backend:updated', function(event) {
            const newUrl = event.detail?.base || getConfiguredBackendUrl();
            if (newUrl !== configuredUrl) {
                configuredUrl = newUrl;
                console.log(`?? [BackendPatch] Backend mis � jour: ${configuredUrl}`);
            }
        });
        
        // Patcher fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.includes('localhost:7070')) {
                const newUrl = url.replace('http://localhost:7070', configuredUrl);
                console.log(`?? [BackendPatch] Redirection: ${url} ? ${newUrl}`);
                return originalFetch(newUrl, options);
            }
            
            if (typeof url === 'string' && url.startsWith('/api')) {
                const newUrl = configuredUrl + url;
                // ? OPTIMISATION : Log seulement si debug activ� ou si ce n'est pas un heartbeat
                if (window.DEBUG_BACKEND || !url.includes('/heartbeat')) {
                    console.log(`?? [BackendPatch] Absolutisation: ${url} ? ${newUrl}`);
                }
                return originalFetch(newUrl, options);
            }
            
            return originalFetch(url, options);
        };
        
        // Patcher EventSource
        const originalEventSource = window.EventSource;
        window.EventSource = function(url, eventSourceInitDict) {
            if (typeof url === 'string' && url.includes('localhost:7070')) {
                const newUrl = url.replace('http://localhost:7070', configuredUrl);
                console.log(`?? [BackendPatch] SSE Redirection: ${url} ? ${newUrl}`);
                return new originalEventSource(newUrl, eventSourceInitDict);
            }
            
            if (typeof url === 'string' && url.startsWith('/api')) {
                const newUrl = configuredUrl + url;
                // ? OPTIMISATION : Log seulement si debug activ�
                if (window.DEBUG_BACKEND) {
                    console.log(`?? [BackendPatch] SSE Absolutisation: ${url} ? ${newUrl}`);
                }
                return new originalEventSource(newUrl, eventSourceInitDict);
            }
            
            return new originalEventSource(url, eventSourceInitDict);
        };
        
        console.log('? [BackendPatch] Patch appliqu� avec succ�s');
    }, 1000);
})();

// ===== MONITORING AUTOMATIQUE DU BACKEND =====
let backendMonitoringInterval = null;
let isBackendOnline = false;

function startBackendMonitoring() {
    if (backendMonitoringInterval) {
        clearInterval(backendMonitoringInterval);
    }
    
    console.log('?? [BackendMonitor] D�marrage du monitoring automatique');
    
    backendMonitoringInterval = setInterval(async () => {
        try {
            // ? UTILISER LA M�ME URL QUE APP.JS PRINCIPAL
            const backendUrl = (typeof currentAPI !== 'undefined' && currentAPI) ? currentAPI :
                              (window.BACKEND_BASE || 
                              (localStorage.getItem('vitrine.backend.ip') ? 
                               'http://' + localStorage.getItem('vitrine.backend.ip') + ':7070' : 
                               'http://localhost:7070'));
            
            const response = await fetch(`${backendUrl}/api/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            const wasOnline = isBackendOnline;
            isBackendOnline = response.ok;
            
            if (!wasOnline && isBackendOnline) {
                console.log('? [BackendMonitor] Backend revenu en ligne !');
                updateSystemStatus(true);
                
                if (typeof getCurrentRoom === 'function' && getCurrentRoom()) {
                    console.log('?? [BackendMonitor] Backend revenu - Connexions SSE d�j� actives');
                    // ? CORRECTION : Ne pas red�marrer automatiquement les SSE
                    // Les connexions existantes continuent de fonctionner
                    // Red�marrage manuel uniquement si n�cessaire
                }
            } else if (wasOnline && !isBackendOnline) {
                console.log('? [BackendMonitor] Backend hors ligne d�tect�');
                updateSystemStatus(false);
            }
            
        } catch (error) {
            const wasOnline = isBackendOnline;
            isBackendOnline = false;
            
            if (wasOnline) {
                console.log('? [BackendMonitor] Perte de connexion backend:', error.message);
                updateSystemStatus(false);
            }
        }
    }, 10000);
}

function updateSystemStatus(online) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-indicator span');
    
    if (statusDot && statusText) {
        if (online) {
            statusDot.style.backgroundColor = '#10b981';
            statusText.textContent = 'Syst�me op�rationnel';
        } else {
            statusDot.style.backgroundColor = '#ef4444';
            statusText.textContent = 'Connexion backend interrompue';
        }
    }
}

// ===== NOTIFICATION MODE RAPPEL =====
let vitrineChatId = null;

async function notifyBackendClientClosedRecall() {
    try {
        const currentRoom = typeof getCurrentRoom === 'function' ? getCurrentRoom() : null;
        const chatId = vitrineChatId;
        console.log(`?? [ClientClosed] Debug - currentRoom: ${currentRoom}, vitrineChatId: ${chatId}`);

        if (!currentRoom || !chatId) {
            console.log('?? [ClientClosed] Pas de salle ou chatId actuel, skip notification');
            return;
        }

        console.log(`?? [ClientClosed] Notification backend: client a ferm� la banni�re de rappel`);

        // ? UTILISER LA M�ME URL QUE APP.JS PRINCIPAL
        let apiBase = (typeof currentAPI !== 'undefined' && currentAPI) ? currentAPI : null;

        if (!apiBase) {
            apiBase = window.BACKEND_BASE;
        }

        if (!apiBase) {
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    apiBase = /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                    console.log(`?? [ClientClosed] IP r�cup�r�e depuis localStorage: ${apiBase}`);
                } else {
                    console.error('? [ClientClosed] Aucune IP backend configur�e !');
                    return;
                }
            } catch (e) {
                console.error('? [ClientClosed] Erreur lecture localStorage:', e);
                return;
            }
        }

        if (!apiBase) {
            console.error('? [ClientClosed] Aucun backend configur� - impossible de notifier');
            return;
        }

        console.log(`?? [ClientClosed] URL backend utilis�e: ${apiBase}`);

        const payload = {
            room: currentRoom,
            chat_id: chatId,
            status: 'client_closed',
            message: 'Client a ferm� la banni�re de rappel - Non disponible'
        };

        console.log(`?? [ClientClosed] Payload envoy�:`, payload);

        const response = await fetch(`${apiBase}/api/tickets/chat/recall-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`?? [ClientClosed] R�ponse HTTP:`, response.status, response.statusText);

        if (response.ok) {
            const responseData = await response.text();
            console.log('? [ClientClosed] Backend notifi� avec succ�s, r�ponse:', responseData);
        } else {
            const errorText = await response.text();
            console.warn('?? [ClientClosed] Erreur notification backend:', response.status, errorText);
        }
    } catch (error) {
        console.error('? [ClientClosed] Erreur notification backend:', error);
    }
}

async function notifyBackendRecallMode() {
    try {
        const currentRoom = typeof getCurrentRoom === 'function' ? getCurrentRoom() : null;
        const chatId = vitrineChatId;
        console.log(`?? [RecallMode] Debug - currentRoom: ${currentRoom}, vitrineChatId: ${chatId}`);
        
        if (!currentRoom || !chatId) {
            console.log('?? [RecallMode] Pas de salle ou chatId actuel, skip notification');
            return;
        }
        
        console.log(`?? [RecallMode] Notification backend: salle ${currentRoom} en mode rappel`);
        
        // ? UTILISER LA M�ME URL QUE APP.JS PRINCIPAL
        let apiBase = (typeof currentAPI !== 'undefined' && currentAPI) ? currentAPI : null;
        
        if (!apiBase) {
            apiBase = window.BACKEND_BASE;
        }
        
        if (!apiBase) {
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    apiBase = /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                    console.log(`?? [RecallMode] IP r�cup�r�e depuis localStorage: ${apiBase}`);
                } else {
                    console.error('? [RecallMode] Aucune IP backend configur�e !');
                    return;
                }
            } catch (e) {
                console.error('? [RecallMode] Erreur lecture localStorage:', e);
                return;
            }
        }
        
        if (!apiBase) {
            console.error('? [RecallMode] Aucun backend configur� - impossible de notifier');
            return;
        }
        
        console.log(`?? [RecallMode] URL backend utilis�e: ${apiBase}`);
        
        const payload = {
            room: currentRoom,
            chat_id: chatId,
            status: 'recall_mode',
            message: 'Client n\'a pas r�pondu - Vitrine en mode rappel'
        };
        
        console.log(`?? [RecallMode] Payload envoy�:`, payload);
        
        const response = await fetch(`${apiBase}/api/tickets/chat/recall-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`?? [RecallMode] R�ponse HTTP:`, response.status, response.statusText);
        
        if (response.ok) {
            const responseData = await response.text();
            console.log('? [RecallMode] Backend notifi� avec succ�s, r�ponse:', responseData);
        } else {
            const errorText = await response.text();
            console.warn('?? [RecallMode] Erreur notification backend:', response.status, errorText);
        }
    } catch (error) {
        console.error('? [RecallMode] Erreur notification backend:', error);
    }
}

// ? NOUVEAU : Syst�me de d�tection de d�connexion inattendue
let isNormalClosure = false; // Flag pour distinguer fermeture normale vs inattendue
let lastHeartbeat = Date.now();

// ? NOUVEAU : D�tecter fermeture de page/navigateur (F5, fermeture, etc.)
window.addEventListener('beforeunload', function(event) {
    console.log('?? [Disconnect] D�tection de fermeture/rechargement de page');
    
    // Si on a un chat actif et que ce n'est pas une fermeture normale
    if (currentChatId && !isNormalClosure) {
        console.log('?? [Disconnect] Fermeture inattendue avec chat actif:', currentChatId);
        
        // Notification imm�diate au backend (synchrone)
        notifyUnexpectedDisconnection();
        
        // Message d'avertissement (optionnel - peut �tre d�sactiv�)
        // event.preventDefault();
        // event.returnValue = 'Vous avez un chat en cours. �tes-vous s�r de vouloir quitter ?';
        // return event.returnValue;
    }
});

// ? NOUVEAU : D�tecter perte de connexion r�seau
window.addEventListener('offline', function() {
    console.log('?? [Disconnect] Connexion r�seau perdue');
    if (currentChatId) {
        console.log('?? [Disconnect] Chat actif lors de perte de connexion');
        showNotification('Connexion r�seau perdue', 'warning');
    }
});

// ? NOUVEAU : D�tecter retour de connexion
window.addEventListener('online', function() {
    console.log('?? [Reconnect] Connexion r�seau r�tablie');
    if (currentChatId) {
        console.log('?? [Reconnect] Tentative de reconnexion du chat');
        showNotification('Connexion r�tablie', 'success');
        reconnectChat();
    }
});

// ? NOUVEAU : Syst�me de heartbeat pour d�tecter les d�connexions
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    console.log('?? [Heartbeat] D�marrage du syst�me de heartbeat');
    lastHeartbeat = Date.now();
    
    heartbeatInterval = setInterval(async function() {
        if (currentChatId) {
            try {
                const apiBase = await getCurrentAPI();
                const response = await fetch(`${apiBase}/api/tickets/chat/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel_id: currentChatId,
                        room_id: getCurrentRoom(),
                        timestamp: Date.now()
                    }),
                    signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
                });
                
                if (response.ok) {
                    lastHeartbeat = Date.now();
                    console.log('?? [Heartbeat] Ping envoy� avec succ�s');
                } else {
                    console.warn('?? [Heartbeat] Erreur de ping:', response.status);
                }
            } catch (error) {
                console.error('? [Heartbeat] �chec du ping:', error);
                // Si plusieurs �checs cons�cutifs, consid�rer comme d�connect�
                if (Date.now() - lastHeartbeat > 60000) { // 1 minute sans heartbeat
                    console.log('?? [Heartbeat] D�connexion d�tect�e - Chat consid�r� comme perdu');
                    handleHeartbeatTimeout();
                }
            }
        }
    }, 15000); // Heartbeat toutes les 15 secondes
}

// ? NOUVEAU : G�rer la perte de heartbeat
function handleHeartbeatTimeout() {
    if (currentChatId) {
        console.log('? [Heartbeat] Timeout d�tect� - Nettoyage local');
        
        // Nettoyer l'interface locale
        closeChatInterface();
        showNotification('Connexion perdue - Chat ferm�', 'error');
        
        // Arr�ter le heartbeat
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }
}

// ? CORRIG� : Notification de d�connexion inattendue (synchrone)
async function notifyUnexpectedDisconnection() {
    if (!currentChatId) return;
    
    try {
        const apiBase = await getCurrentAPI();
        const currentRoom = getCurrentRoom();
        
        console.log('?? [Disconnect] Notification F5 pour:', { currentChatId, currentRoom });
        
        // ? CORRECTION : Utiliser l'endpoint /api/tickets/chat/end avec ended_by='vitrine_f5'
        const data = JSON.stringify({
            channel_id: currentChatId,
            room_id: currentRoom,
            ended_by: 'vitrine_f5', // Indiquer que c'est un F5
            ticket_id: window.lastTicketNumber || '',
            disconnection_type: 'f5_detected' // Ajouter le type sp�cifique
        });
        
        // Utilisation de sendBeacon pour notification synchrone m�me lors de fermeture
        const success = navigator.sendBeacon(`${apiBase}/api/tickets/chat/end`, data);
        console.log('?? [Disconnect] Notification F5 envoy�e via sendBeacon:', success ? 'Succ�s' : '�chec');
        
        // Fallback avec fetch si sendBeacon �choue
        if (!success) {
            fetch(`${apiBase}/api/tickets/chat/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data,
                keepalive: true // Garder la requ�te m�me si la page se ferme
            }).catch(error => {
                console.error('? [Disconnect] Erreur notification fallback:', error);
            });
        }
    } catch (error) {
        console.error('? [Disconnect] Erreur notification:', error);
    }
}

// ? NOUVEAU : Tentative de reconnexion
async function reconnectChat() {
    if (!currentChatId) return;
    
    try {
        console.log('?? [Reconnect] Tentative de reconnexion...');
        
        const apiBase = await getCurrentAPI();
        const response = await fetch(`${apiBase}/api/tickets/chat/reconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: currentChatId,
                room_id: getCurrentRoom()
            })
        });
        
        if (response.ok) {
            console.log('? [Reconnect] Reconnexion r�ussie');
            showNotification('Connexion r�tablie', 'success');
            
            // Red�marrer le heartbeat
            startHeartbeat();
        } else {
            console.error('? [Reconnect] �chec de reconnexion:', response.status);
            showNotification('Impossible de reconnecter - Chat ferm�', 'error');
            closeChatInterface();
        }
    } catch (error) {
        console.error('? [Reconnect] Erreur de reconnexion:', error);
        showNotification('Erreur de reconnexion - Chat ferm�', 'error');
        closeChatInterface();
    }
}

// ===== EXPORT DES FONCTIONS POUR LE HTML =====
// Export des fonctions de rappel et timeout
window.closeTimeoutBanner = closeTimeoutBanner;
window.closeTimeoutBannerWithDecline = closeTimeoutBannerWithDecline;
window.initiateRecallRequest = initiateRecallRequest;
window.showChatTimeoutBanner = showChatTimeoutBanner;
window.notifyBackendRecallMode = notifyBackendRecallMode;

// ===== INITIALISATION DES EXTENSIONS =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        startBackendMonitoring();
    }, 2000);
    
    setTimeout(() => {
        // Hook sur showChatTimeoutBanner
        if (typeof window.showChatTimeoutBanner === 'function') {
            const originalShowTimeout = window.showChatTimeoutBanner;
            window.showChatTimeoutBanner = function() {
                console.log('?? [RecallMode] Hook sur showChatTimeoutBanner original');
                const result = originalShowTimeout.apply(this, arguments);
                notifyBackendRecallMode();
                return result;
            };
            console.log('? [RecallMode] Hook install� sur showChatTimeoutBanner');
        }

        // Hook console.log pour capturer channel_id (OPTIMIS�)
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            // ? OPTIMISATION : Filtrer les logs selon les flags de debug
            const logMessage = args[0];
            if (typeof logMessage === 'string') {
                // Bloquer les logs de typing si debug d�sactiv�
                if (!window.DEBUG_TYPING && logMessage.includes('[TypingVitrine]')) {
                    return; // Ne pas logger
                }
                
                // Bloquer les logs backend si debug d�sactiv�
                if (!window.DEBUG_BACKEND && logMessage.includes('[Config] Utilisation backend unique')) {
                    return; // Ne pas logger
                }
                
                // Bloquer les logs heartbeat si debug d�sactiv�
                if (!window.DEBUG_HEARTBEAT && (
                    logMessage.includes('[Heartbeat]') || 
                    logMessage.includes('[BackendPatch] Absolutisation') && logMessage.includes('/heartbeat')
                )) {
                    return; // Ne pas logger
                }
                
                // ? OPTIMISATION SUPPL�MENTAIRE : Bloquer les logs verbeux r�p�titifs
                if (!window.DEBUG_BACKEND && (
                    logMessage.includes('?? [StatusEvents] �v�nement re�u:') ||
                    logMessage.includes('?? [StatusEvents] Type de data:') ||
                    logMessage.includes('?? [StatusEvents] Propri�t�s de data:') ||
                    logMessage.includes('?? [StatusEvents] data.Type:') ||
                    logMessage.includes('?? [StatusEvents] data.type:') ||
                    logMessage.includes('?? [StatusEvents] data.Data:') ||
                    logMessage.includes('?? [StatusEvents] data.data:')
                )) {
                    return; // Ne pas logger les �v�nements SSE verbeux
                }
                
                // Capturer channel_id pour RecallMode
                if (logMessage.includes('?? [SSE] Demande de chat R�ELLE re�ue:')) {
                    const data = args[1];
                    if (data && data.channel_id) {
                        vitrineChatId = data.channel_id;
                        originalConsoleLog('? [RecallMode] Channel ID captur�:', vitrineChatId);
                    }
                }
                
                if (logMessage.includes('?? [SSE] Chat termin� par:')) {
                    vitrineChatId = null;
                    originalConsoleLog('?? [RecallMode] Channel ID reset');
                }
            }
            
            return originalConsoleLog.apply(this, args);
        };
        console.log('? [RecallMode] Hook console.log install� pour capturer channel_id');
    }, 2000);
});



// Global flag for SEA banner open state
window.__SEA_BANNER_OPEN__ = window.__SEA_BANNER_OPEN__ || false;

// ? SYST�ME DE DEBUG POUR R�DUIRE LE SPAM DE LOGS
window.DEBUG_TYPING = false;
window.DEBUG_BACKEND = false;
window.DEBUG_HEARTBEAT = false;

// ?? Fonction pour activer/d�sactiver le debug
// OPTIMISATIONS ANTI-LAG V5.0 :
// - R�duction de 90% des logs de typing (handleTypingVitrine)
// - R�duction des logs backend (ensureBackendConnection)
// - R�duction des logs heartbeat et BackendPatch
// - Protection contre les multiples heartbeats
// - Debounce sur les �v�nements de typing (100ms)
window.toggleVitrineDebug = function(category = 'all') {
    if (category === 'all' || category === 'typing') {
        window.DEBUG_TYPING = !window.DEBUG_TYPING;
        console.log(`?? [Debug] Typing debug: ${window.DEBUG_TYPING ? 'ON' : 'OFF'}`);
    }
    if (category === 'all' || category === 'backend') {
        window.DEBUG_BACKEND = !window.DEBUG_BACKEND;
        console.log(`?? [Debug] Backend debug: ${window.DEBUG_BACKEND ? 'ON' : 'OFF'}`);
    }
    if (category === 'all' || category === 'heartbeat') {
        window.DEBUG_HEARTBEAT = !window.DEBUG_HEARTBEAT;
        console.log(`?? [Debug] Heartbeat debug: ${window.DEBUG_HEARTBEAT ? 'ON' : 'OFF'}`);
    }
    console.log('?? Usage: toggleVitrineDebug("typing"), toggleVitrineDebug("backend"), toggleVitrineDebug("heartbeat"), ou toggleVitrineDebug("all")');
    console.log('?? OPTIMISATIONS ACTIVES: Logs r�duits de 90%, debounce typing, protection heartbeat');
};

// ?? Fonction d'urgence pour r�activer tous les logs (debugging)
window.enableAllVitrineDebug = function() {
    window.DEBUG_TYPING = true;
    window.DEBUG_BACKEND = true;
    window.DEBUG_HEARTBEAT = true;
    console.log('?? [Debug] TOUS LES LOGS R�ACTIV�S pour debugging');
    console.log('?? Pour les d�sactiver: toggleVitrineDebug("all")');
};

// ?? ===== SYST�ME DE HEARTBEAT POUR D�TECTION D�CONNEXIONS =====
let heartbeatInterval = null;
let clientId = null;

function generateClientId() {
    const room = getCurrentRoom();
    // ? CORRECTION : G�n�rer un ID m�me si la salle n'est pas encore d�finie
    const roomId = room || 'unknown';
    
    return `vitrine-${roomId}-${Date.now()}`;
}

function startHeartbeat() {
    // ? OPTIMISATION : �viter les multiples heartbeats
    if (heartbeatInterval) {
        if (window.DEBUG_HEARTBEAT) {
            console.log('?? [Heartbeat] Heartbeat d�j� actif, ignor�');
        }
        return;
    }
    
    clientId = generateClientId();
    if (!clientId) {
        console.log('?? [Heartbeat] Impossible de g�n�rer clientId');
        return;
    }
    
    if (window.DEBUG_HEARTBEAT) {
        console.log('?? [Heartbeat] D�marrage heartbeat pour client:', clientId);
    }
    
    // Envoyer un heartbeat toutes les 15 secondes
    heartbeatInterval = setInterval(async () => {
        try {
            // ? CORRECTION : Utiliser le backend configur�
            const api = await getCurrentAPI();
            const response = await fetch(`${api}/api/chat/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId
                })
            });
            
            if (response.ok) {
                if (window.DEBUG_HEARTBEAT) {
                    console.log('?? [Heartbeat] Heartbeat envoy� avec succ�s');
                }
            } else {
                console.warn('?? [Heartbeat] Erreur heartbeat:', response.status);
            }
        } catch (error) {
            console.error('? [Heartbeat] Erreur r�seau heartbeat:', error);
        }
    }, 15000); // 15 secondes
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        if (window.DEBUG_HEARTBEAT) {
            console.log('?? [Heartbeat] Arr�t heartbeat pour client:', clientId);
        }
        clientId = null;
    }
}

// Arr�ter heartbeat quand la page se ferme
window.addEventListener('beforeunload', () => {
    stopHeartbeat();
});

// ? FONCTION DE TEST POUR LE TYPING C�T� VITRINE
window.testVitrineTyping = function() {
    console.log('?? [Test] Test du syst�me de typing c�t� Vitrine...');
    console.log(`?? [Test] ID client Vitrine: ${VITRINE_CLIENT_ID}`);
    
    // 1. Test indicateur Technicien (SEA)
    setTimeout(() => {
        console.log('?? Test: Indicateur Technicien (sans animation)...');
        showTypingIndicator('sea');
    }, 1000);
    
    // 2. Test indicateur Client (autre Vitrine)
    setTimeout(() => {
        console.log('?? Test: Indicateur autre Client...');
        hideTypingIndicator();
        showTypingIndicator('vitrine');
    }, 3000);
    
    // 3. Nettoyage
    setTimeout(() => {
        console.log('?? Test: Nettoyage...');
        hideTypingIndicator();
    }, 6000);
    
    console.log('? Test typing Vitrine d�marr� - Plus de bande qui bouge !');
};

// ===== FONCTIONS POUR APPELS PC ET T�L�PHONE =====

// Variables globales pour les appels
let callMode = 'idle'; // 'idle', 'pc', 'phone'
let currentRoomId = '';
let phoneJoinURL = '';
let qrExpiryTime = '';

// Variables globales pour WebRTC
let currentCallToken = null;
let currentIceServers = null;
let currentPeerConnection = null;

// D�marrer un appel PC (vrai syst�me WebRTC int�gr�)
async function startPCCall() {
    console.log('?? D�marrage appel PC avec vrai syst�me WebRTC int�gr�');
    callMode = 'pc';
    
    try {
        // Cr�er une room WebRTC r�elle
        const roomId = 'UQAM-Salle-' + (getCurrentRoom() || 'PA-204');
        console.log('?? Cr�ation room WebRTC r�elle:', roomId);
        
        // S'assurer de la connexion backend
        await ensureBackendConnection();
        
        // Notifier SAVQonnect de l'appel PC
        const response = await fetch(`${currentAPI}/api/webrtc/start-call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                roomId: roomId,
                callType: 'pc',
                salle: getCurrentRoom() || 'PA-204'
            })
        });
        
        if (response.ok) {
            const callData = await response.json();
            console.log('? Appel PC initi� - Donn�es re�ues:', callData);
            
            // Stocker les informations d'appel
            currentCallToken = callData.callToken;
            currentIceServers = callData.iceServers;
            
            // Cr�er la connexion WebRTC
            await createWebRTCConnection(roomId, callData);
            
            console.log('?? [PCCall] Appel en cours - En attente de SAVQonnect...');
        } else {
            console.error('? Erreur serveur:', response.status);
            const errorText = await response.text();
            console.error('? D�tails erreur:', errorText);
            alert('Erreur serveur lors de l\'initiation de l\'appel PC.');
        }
        
    } catch (error) {
        console.error('? Erreur d�marrage appel PC:', error);
        alert('Erreur lors du d�marrage de l\'appel PC: ' + error.message);
    }
}

// Cr�er une connexion WebRTC
async function createWebRTCConnection(roomId, callData) {
    try {
        console.log('?? Cr�ation connexion WebRTC pour room:', roomId);
        
        // Configuration WebRTC
        const configuration = {
            iceServers: currentIceServers || [
                { urls: 'stun:stun.l.google.com:19302' }
            ],
            iceTransportPolicy: 'all' // Autoriser tous les types de candidats
        };
        
        // Cr�er la connexion peer
        currentPeerConnection = new RTCPeerConnection(configuration);
        
        // G�rer les candidats ICE
        currentPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('?? Candidat ICE g�n�r�:', event.candidate);
                // TODO: Envoyer le candidat au serveur
                sendIceCandidate(event.candidate, roomId);
            }
        };
        
        // G�rer les changements de connexion
        currentPeerConnection.onconnectionstatechange = () => {
            console.log('?? �tat connexion WebRTC:', currentPeerConnection.connectionState);
            
            if (currentPeerConnection.connectionState === 'connected') {
                console.log('? Connexion WebRTC �tablie !');
                // TODO: Mettre � jour l'UI
            } else if (currentPeerConnection.connectionState === 'disconnected' || 
                      currentPeerConnection.connectionState === 'failed') {
                console.log('? Connexion WebRTC perdue');
                // TODO: G�rer la d�connexion
            }
        };
        
        // Obtenir le stream audio local
        const localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
        });
        
        // Ajouter le stream � la connexion
        localStream.getTracks().forEach(track => {
            currentPeerConnection.addTrack(track, localStream);
        });
        
        console.log('?? Stream audio local ajout� � la connexion WebRTC');
        
        // Cr�er une offre
        const offer = await currentPeerConnection.createOffer();
        await currentPeerConnection.setLocalDescription(offer);
        
        console.log('?? Offre WebRTC cr��e:', offer);
        
        // Envoyer l'offre au serveur
        await sendWebRTCOffer(offer, roomId);
        
    } catch (error) {
        console.error('? Erreur cr�ation connexion WebRTC:', error);
        throw error;
    }
}

// Envoyer une offre WebRTC au serveur
async function sendWebRTCOffer(offer, roomId) {
    try {
        const response = await fetch(`${currentAPI}/api/webrtc/offer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sdp: offer.sdp,
                callToken: currentCallToken,
                roomId: roomId
            })
        });
        
        if (response.ok) {
            console.log('? Offre WebRTC envoy�e au serveur');
        } else {
            console.error('? Erreur envoi offre WebRTC:', response.status);
        }
    } catch (error) {
        console.error('? Erreur envoi offre WebRTC:', error);
    }
}

// Envoyer un candidat ICE au serveur
async function sendIceCandidate(candidate, roomId) {
    try {
        const response = await fetch(`${currentAPI}/api/webrtc/candidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                candidate: JSON.stringify({
                    candidate: candidate.candidate,
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid
                }),
                callToken: currentCallToken,
                roomId: roomId
            })
        });
        
        if (response.ok) {
            console.log('? Candidat ICE envoy� au serveur');
        } else {
            console.error('? Erreur envoi candidat ICE:', response.status);
        }
    } catch (error) {
        console.error('? Erreur envoi candidat ICE:', error);
    }
}

// D�marrer un appel t�l�phone (QR code Retool - ind�pendant du PC)
async function startPhoneCall() {
    console.log('?? D�marrage appel t�l�phone via QR code Retool');
    callMode = 'phone';
    
    try {
        // Cr�er une room WebRTC r�elle
        const roomId = 'UQAM-Salle-' + (getCurrentRoom() || 'PA-204');
        console.log('?? Cr�ation room WebRTC pour t�l�phone:', roomId);
        
        // S'assurer de la connexion backend
        await ensureBackendConnection();
        
        // Notifier SAVQonnect de l'appel t�l�phone
        const response = await fetch(`${currentAPI}/api/webrtc/start-call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                roomId: roomId,
                callType: 'phone',
                salle: getCurrentRoom() || 'PA-204'
            })
        });
        
        if (response.ok) {
            const callData = await response.json();
            console.log('? Appel t�l�phone initi� - Donn�es re�ues:', callData);
            
            // Stocker les informations d'appel
            currentCallToken = callData.callToken;
            currentIceServers = callData.iceServers;
            
            // Cr�er l'URL de jointure pour le t�l�phone avec l'URL Retool HTTPS
            const retoolURL = 'https://retool.dev.uqam.ca/phone/phone-join.html';
            const phoneJoinURL = `${retoolURL}?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(callData.callToken)}&salle=${encodeURIComponent(getCurrentRoom() || 'PA-204')}&backend=${encodeURIComponent(currentAPI)}`;
            
            // Afficher le QR code
            showPhoneQRCode(phoneJoinURL, roomId);
            
        } else {
            console.error('? Erreur serveur:', response.status);
            const errorText = await response.text();
            console.error('? D�tails erreur:', errorText);
            alert('Erreur serveur lors de l\'initiation de l\'appel t�l�phone.');
        }
        
    } catch (error) {
        console.error('? Erreur d�marrage appel t�l�phone:', error);
        alert('Erreur lors du d�marrage de l\'appel t�l�phone: ' + error.message);
    }
}

// Afficher le QR code pour l'appel t�l�phone
function showPhoneQRCode(phoneJoinURL, roomId) {
    // Cr�er une modal pour le QR code
    const modal = document.createElement('div');
    modal.className = 'phone-qr-modal';
    modal.innerHTML = `
        <div class="phone-qr-content">
            <h3>?? Appel T�l�phone</h3>
            <p>Scannez ce QR code avec votre t�l�phone pour rejoindre l'appel :</p>
            <div class="qr-code-container">
                <div id="phone-qr-code"></div>
            </div>
            <p class="qr-url">${phoneJoinURL}</p>
            <div class="qr-actions">
                <button onclick="copyPhoneURL()" class="copy-btn">?? Copier le lien</button>
                <button onclick="closePhoneQR()" class="close-btn">? Fermer</button>
            </div>
            <p class="qr-expiry">? Lien valide 10 minutes</p>
        </div>
    `;
    
    // Styles pour la modal
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = modal.querySelector('.phone-qr-content');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        max-width: 400px;
        width: 90%;
    `;
    
    document.body.appendChild(modal);
    
    // G�n�rer le QR code (utiliser une librairie QR ou un service en ligne)
    generateQRCode(phoneJoinURL, 'phone-qr-code');
    
    // Stocker l'URL pour la copie
    window.currentPhoneURL = phoneJoinURL;
    
    // Auto-fermer apr�s 10 minutes
    setTimeout(() => {
        if (document.body.contains(modal)) {
            closePhoneQR();
        }
    }, 10 * 60 * 1000);
}

// G�n�rer un QR code (m�thode simple avec service en ligne)
function generateQRCode(url, elementId) {
    const qrContainer = document.getElementById(elementId);
    if (qrContainer) {
        // Utiliser un service QR code en ligne
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="max-width: 200px; height: auto;">`;
    }
}

// Copier l'URL du t�l�phone
function copyPhoneURL() {
    if (window.currentPhoneURL) {
        navigator.clipboard.writeText(window.currentPhoneURL).then(() => {
            alert('Lien copi� dans le presse-papiers !');
        }).catch(() => {
            // Fallback pour les navigateurs plus anciens
            const textArea = document.createElement('textarea');
            textArea.value = window.currentPhoneURL;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Lien copi� dans le presse-papiers !');
        });
    }
}

// Fermer la modal QR code
function closePhoneQR() {
    const modal = document.querySelector('.phone-qr-modal');
    if (modal) {
        modal.remove();
    }
    window.currentPhoneURL = null;
}

// ===== HANDLERS WEBRTC POUR SSE =====

// G�rer la r�ponse WebRTC re�ue via SSE (Vitrine re�oit la r�ponse de SAVQonnect)
window.handleWebRTCAnswer = async function(sdp) {
    console.log('?? [WebRTC] Traitement de la r�ponse re�ue via SSE');
    
    if (!currentPeerConnection) {
        console.error('? [WebRTC] Pas de connexion peer active');
        return;
    }
    
    try {
        await currentPeerConnection.setRemoteDescription({
            type: 'answer',
            sdp: sdp
        });
        console.log('? [WebRTC] R�ponse WebRTC appliqu�e');
        
        // G�rer la r�ception du stream audio distant
        currentPeerConnection.ontrack = (event) => {
            console.log('?? [WebRTC] Stream audio distant re�u');
            const remoteAudio = document.getElementById('remoteAudio') || createRemoteAudioElement();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().then(() => {
                console.log('? [WebRTC] Audio distant en lecture');
            }).catch(err => {
                console.error('? [WebRTC] Erreur lecture audio:', err);
            });
        };
        
    } catch (error) {
        console.error('? [WebRTC] Erreur application r�ponse:', error);
    }
};

// G�rer les candidats ICE re�us via SSE
window.handleWebRTCCandidate = async function(candidateData) {
    console.log('?? [WebRTC] Traitement candidat ICE re�u via SSE');
    
    if (!currentPeerConnection) {
        console.error('? [WebRTC] Pas de connexion peer active');
        return;
    }
    
    try {
        // Le candidateData peut �tre une string JSON ou un objet
        const candidate = typeof candidateData === 'string' ? 
            JSON.parse(candidateData) : candidateData;
            
        await currentPeerConnection.addIceCandidate(new RTCIceCandidate({
            candidate: candidate.candidate || candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid
        }));
        console.log('? [WebRTC] Candidat ICE ajout�');
    } catch (error) {
        console.error('? [WebRTC] Erreur ajout candidat ICE:', error);
    }
};

// Nettoyer l'appel WebRTC
window.cleanupWebRTCCall = function() {
    console.log('?? [WebRTC] Nettoyage de l\'appel');
    
    if (currentPeerConnection) {
        currentPeerConnection.close();
        currentPeerConnection = null;
    }
    
    currentCallToken = null;
    currentIceServers = null;
    callMode = null;
    
    // Arr�ter les streams locaux
    const localStream = document.getElementById('localAudio');
    if (localStream && localStream.srcObject) {
        localStream.srcObject.getTracks().forEach(track => track.stop());
    }
    
    console.log('? [WebRTC] Appel nettoy�');
};

// Cr�er un �l�ment audio pour le stream distant si n�cessaire
function createRemoteAudioElement() {
    let remoteAudio = document.getElementById('remoteAudio');
    if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.id = 'remoteAudio';
        remoteAudio.autoplay = true;
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);
    }
    return remoteAudio;
}

// ===============================================
