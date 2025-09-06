        // ===== CONFIGURATION DYNAMIQUE =====
        // Récupérer le backend depuis les paramètres URL ou utiliser IP locale par défaut
        const urlParams = new URLSearchParams(window.location.search);
        const customBackend = urlParams.get('backend');
        
        // ✅ DÉTECTION AUTOMATIQUE PROTOCOLE (HTTPS si page HTTPS)
        const isSecurePage = location.protocol === 'https:';
        // ✅ CONFIGURATION INTELLIGENTE - DNS avec fallback DNS alternatif
        // ? IDENTIQUE À L'INTÉGRÉE
        let API_BASE_URL = (function(){
            try {
                if (window.BACKEND_BASE) return window.BACKEND_BASE;
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp && typeof storedIp === 'string' && storedIp.trim()) {
                    return `http://${storedIp.trim()}:7070`;
                }
            } catch(e) { console.warn('[BackendBase] storage read error', e); }
            return 'http://C46928_DEE.ddns.uqam.ca:7070';
        })();
        const FALLBACK_DNS_URL = 'http://sav-atl-por-8.tail12c6c1.ts.net:7070';
        
        // Test rapide du DNS, sinon utiliser DNS alternatif  
        async function detectBestBackend() {
            try {
                const testResponse = await fetch(`${API_BASE_URL}/api/health`, { 
                    method: 'GET', 
                    signal: AbortSignal.timeout(5000) // ✅ CORRIGÉ : Timeout plus long (5s au lieu de 2s)
                });
                if (testResponse.ok) {
                    console.log('[Config] DNS accessible, utilisation du backend configuré');
                    return API_BASE_URL;
                }
            } catch (error) {
                console.log('⚠️ [Config] DNS timeout, bascule vers IP directe');
                API_BASE_URL = FALLBACK_DNS_URL;
                currentAPI = FALLBACK_DNS_URL;
                return FALLBACK_DNS_URL;
            }
        }
        
        // ✅ INITIALISATION SYNCHRONE AVEC FALLBACK
        let currentAPI = API_BASE_URL; // Par défaut

        // Écoute les changements dynamiques de backend (ex: saisi par l'utilisateur)
        window.addEventListener('backend:updated', function(evt){
            try {
                const base = (evt && evt.detail && evt.detail.base) ? evt.detail.base : null;
                if (base) {
                    API_BASE_URL = base;
                    currentAPI = base;
                    console.log('[BackendBase] Mis à jour →', base);
                }
            } catch(e){ console.warn('[BackendBase] update error', e); }
        });

        // Surveillance simple de santé backend pour redemander l'IP en cas de déconnexion
        (function setupBackendHealthWatch(){
            async function pingOnce(signal){
                try {
                    const resp = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal, cache: 'no-store' });
                    if (!resp.ok) throw new Error('bad status ' + resp.status);
                    // Indication visuelle simple si éléments présents
                    const dot = document.getElementById('connection-indicator') || document.querySelector('.status-dot');
                    const txt = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
                    if (dot) { dot.style.background = '#22c55e'; }
                    if (txt) { txt.textContent = 'Système opérationnel'; }
                    return true;
                } catch(err) {
                    const dot = document.getElementById('connection-indicator') || document.querySelector('.status-dot');
                    const txt = document.getElementById('connection-text') || document.querySelector('.status-indicator span');
                    if (dot) { dot.style.background = '#ef4444'; }
                    if (txt) { txt.textContent = 'Hors ligne - Configurer le backend'; }
                    // Ne plus afficher la modale automatiquement en cas d'échec.
                    // L'utilisateur utilisera Alt+Ctrl+J pour rouvrir et changer l'IP.
                    return false;
                }
            }
            // Premier ping rapide après chargement
            document.addEventListener('DOMContentLoaded', () => {
                pingOnce();
                // Pings périodiques
                setInterval(() => pingOnce(), 20000);
            });
        })();
        let backendInitialized = false;
        
        // Fonction d'initialisation avec Promise pour attendre
        const backendInitPromise = (async function initializeBackend() {
            try {
                const detectedAPI = await detectBestBackend();
                currentAPI = detectedAPI || API_BASE_URL; // ✅ S'assurer que currentAPI est mis à jour
                backendInitialized = true;
                console.log(`🌐 [Config] Backend utilisé: ${currentAPI}`);
                console.log(`🖼️ [Config] Images depuis: ${ASSETS_BASE}`);
                return currentAPI;
            } catch (error) {
                console.error('❌ [Config] Erreur initialisation backend:', error);
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
        
        // ✅ CONFIGURATION IMAGES DEPUIS GITHUB
        // Utiliser directement GitHub Pages pour les images
        const ASSETS_BASE = window.ASSETS_BASE || 'https://zine76.github.io/vitrine/assets';
        
        // ✅ NOUVEAU: Redémarrer toutes les connexions SSE après changement d'API
        function restartSSEConnections() {
            console.log(`🔄 [SSERestart] Redémarrage connexions SSE vers: ${currentAPI}`);
            
            // Redémarrer Chat SSE
            if (getCurrentRoom()) {
                setTimeout(() => {
                    startChatRequestListener();
                }, 100);
            }
            
            // Redémarrer Status Events SSE
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
            }
            if (getCurrentRoom()) {
                setTimeout(() => {
                    startStatusEventSource();
                }, 200);
            }
        }
        
        // ✅ MONITORING SIMPLIFIÉ - BACKEND UNIQUE
        
        // ✅ CONFIGURATION TERMINÉE
        
        async function testBackendConnectivity(url) {
            try {
                const response = await fetch(`${url}/api/health`, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(3000) // Timeout 3s
                });
                return response.ok;
            } catch (error) {
                console.log(`⚠️ [Connectivity] Backend ${url} non disponible:`, error.message);
                return false;
            }
        }
        
        // ✅ FONCTION SIMPLIFIÉE - BACKEND UNIQUE
        async function ensureBackendConnection() {
            const api = await getCurrentAPI();
            console.log(`✅ [Config] Utilisation backend unique: ${api}`);
            return api;
        }
        
        // ✅ FONCTION SIMPLIFIÉE - APPELS DIRECTS
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
    console.warn('[UpdateSEALogo] SEA2.png failed → optional fallback to SI.png + reveal text');
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

        
        // ✅ NOUVEAU : Gestion des tickets de session
        let sessionTickets = [];

        // ===== CACHE DE SALLE PERSISTANT =====
        window.roomCache = {
            room: null,
            pavilion: null,
            roomNumber: null,
            isSet: false
        };

        // ===== DOM ELEMENTS =====
        // Les �l�ments seront r�cup�r�s dynamiquement car ils n'existent pas encore

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
         * Définir un exemple de salle
         */
        function setRoomExample(roomName) {
            const roomInput = document.getElementById('roomInput');
            if (roomInput) {
                roomInput.value = roomName;
                roomInput.focus();
            }
        }

        /**
         * Confirmer la salle et passer à l'assistant
         */
        function confirmRoom() {
            const roomInput = document.getElementById('roomInput');
            const roomName = roomInput ? roomInput.value.trim() : '';
            
            if (!roomName) {
                showRoomError('⚠️ Veuillez entrer un numéro de salle');
                return;
            }

            // Valider le format de salle
            if (!isValidRoomFormat(roomName)) {
                showRoomError('⚠️ Format non reconnu. Exemples : A-1750, B-2500, SH-R200');
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
                console.log('🔒 [Lock] Salle verrouillée:', roomInfo.fullRoom);
                
                // Appliquer l'interface verrouillée
                document.documentElement.classList.add('is-room-locked');
            } catch (error) {
                console.warn('⚠️ [Lock] Erreur verrouillage:', error);
            }
            
            // Passer à l'assistant
            showAssistant();
            
            // ===== CHAT SEA : Démarrer l'écoute des demandes de chat =====
            startChatRequestListener();
            
            // ===== STATUS EVENTS : Démarrer l'écoute des changements de statut =====
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
         * Définir le cache de salle (version de base)
         */
        function setRoomCache(roomInfo) {
            window.roomCache = {
                room: roomInfo.fullRoom,
                pavilion: roomInfo.pavilion,
                roomNumber: roomInfo.roomNumber,
                isSet: true,
                podioInfo: null // Sera enrichi par setRoomCacheWithPodio
            };

            console.log(`🏢 [RoomCache] Salle définie : ${roomInfo.fullRoom}, Pavillon : ${roomInfo.pavilion}`);
            
            // 🆕 Enrichir automatiquement avec infos Podio
            enrichRoomWithPodioInfo(roomInfo.fullRoom);
        }

        /**
         * Enrichir le cache de salle avec les informations Podio
         */
        async function enrichRoomWithPodioInfo(roomName) {
            try {
                console.log(`🏢 [PodioEnrich] Enrichissement Podio pour: ${roomName}`);
                
                const podioInfo = await podioRoomCache.getRoomInfo(roomName);
                
                if (podioInfo && window.roomCache && window.roomCache.isSet) {
                    // 🆕 Enrichir le cache existant
                    window.roomCache.podioInfo = podioInfo;
                    
                    console.log(`✅ [PodioEnrich] Cache enrichi:`, podioInfo);
                    
                    // 🎨 Mettre à jour l'affichage
                    updateRoomDisplayWithPodio(roomName, podioInfo);
                } else {
                    console.warn(`⚠️ [PodioEnrich] Pas d'infos Podio pour ${roomName} - affichage normal`);
                }
                
            } catch (error) {
                console.warn(`❌ [PodioEnrich] Erreur enrichissement pour ${roomName}:`, error.message);
                // Degradation graceful - l'affichage normal continue
            }
        }

        /**
         * Mettre à jour l'affichage de la salle avec les infos Podio
         */
        function updateRoomDisplayWithPodio(roomName, podioInfo = null) {
            const currentRoomDisplay = document.getElementById('currentRoomDisplay');
            if (!currentRoomDisplay) return;
            
            if (podioInfo) {
                // 🆕 Affichage enrichi avec infos Podio - COULEURS ADAPTATIVES
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
                console.log(`🎨 [RoomDisplay] Affichage enrichi pour ${roomName}`);
            } else {
                // 🔄 Affichage normal (fallback)
                currentRoomDisplay.textContent = roomName;
                console.log(`🎨 [RoomDisplay] Affichage normal pour ${roomName}`);
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

            // Récupérer/assurer la présence des éléments dynamiquement
            let landingPage = document.getElementById('landingPage');
            let assistantPage = document.getElementById('assistantPage');
            if (!landingPage || !assistantPage) {
                if (typeof createVitrine === 'function') {
                    try {
                        createVitrine();
                        console.log('[showAssistant] Interface (re)créée avant affichage');
                    } catch (e) {
                        console.error('[showAssistant] échec de création de l\'interface:', e);
                        return;
                    }
                    // Rechercher à nouveau
                    landingPage = document.getElementById('landingPage');
                    assistantPage = document.getElementById('assistantPage');
                }
            }

            // Masquer la landing page
            if (landingPage) landingPage.style.display = 'none';
            
            // Afficher l'assistant
            if (assistantPage) assistantPage.style.display = 'block';
            
            // Mettre à jour les affichages de salle avec infos Podio si disponibles
            updateRoomDisplayWithPodio(window.roomCache.room, window.roomCache.podioInfo);
            
            // Initialiser la connexion au backend
            checkConnection().then(connected => {
                console.log(`🔗 Connexion backend: ${connected ? 'OK' : 'ÉCHEC'}`);
                // ✅ NOUVEAU : Mettre à jour le statut initial
                updateSystemStatus(connected);
            });
            
            // ✅ NOUVEAU : Vérification périodique de la connexion (toutes les 10 secondes)
            setInterval(async () => {
                await checkConnection();
            }, 10000);
            
            // Focus sur l'input principal
            setTimeout(() => {
                // Focus sur la première palette
                const firstPalette = document.querySelector('.palette');
                if (firstPalette) {
                    firstPalette.focus();
                }
            }, 300);
        }

        /**
         * Changer de salle (retour à la landing page)
         */
        function changeRoom() {
            // Réinitialiser le cache
            window.roomCache.isSet = false;
            
            // Nettoyer les inputs
            const roomInput = document.getElementById('roomInput');
            if (roomInput) roomInput.value = '';
            
            // 🔔 Fermer l'EventSource de statut
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
                console.log('🔔 [StatusEvents] EventSource de statut fermé');
            }
            
            // 🔔 Masquer le message de statut
            hideTicketStatusMessage();
            
            // Retour �  la landing page
            const assistantPage = document.getElementById('assistantPage');
            const landingPage = document.getElementById('landingPage');
            if (assistantPage) assistantPage.style.display = 'none';
            if (landingPage) landingPage.style.display = 'flex';
            
            // Focus sur l'input de salle
            setTimeout(() => {
                const roomInput = document.getElementById('roomInput');
                if (roomInput) roomInput.focus();
            }, 300);
            
            console.log('🏠 Retour à la landing page (changer de salle)');
        }
        
        /**
         * Gestion du thème hybride intelligent
         */
        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            const headerTitle = document.getElementById('headerTitle');
            
            if (body.getAttribute('data-theme') === 'dark') {
                // Passer au mode clair
                body.removeAttribute('data-theme');
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Mode nuit';
                localStorage.setItem('vitrine-theme', 'light');
                // Mode jour : titre en NOIR
                if (headerTitle) headerTitle.style.color = 'black';
                console.log('🌞 Mode clair activé');
            } else {
                // Passer au mode sombre
                body.setAttribute('data-theme', 'dark');
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Mode jour';
                localStorage.setItem('vitrine-theme', 'dark');
                // Mode nuit : titre reste NOIR (demande utilisateur)
                if (headerTitle) headerTitle.style.color = 'black';
                console.log('🌙 Mode sombre activé');
            }
        }
        
        /**
         * Initialisation automatique du thème
         */
        function initializeTheme() {
            const savedTheme = localStorage.getItem('vitrine-theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            // Priorité : 1) Sauvegarde utilisateur, 2) Préférence système, 3) Mode clair par défaut
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.body.setAttribute('data-theme', 'dark');
                const themeIcon = document.getElementById('themeIcon');
                const themeText = document.getElementById('themeText');
                if (themeIcon && themeText) {
                    themeIcon.className = 'fas fa-sun';
                    themeText.textContent = 'Mode jour';
                }
                console.log('🌙 Mode sombre initialisé (préférence système ou sauvegarde)');
            } else {
                document.body.removeAttribute('data-theme');
                console.log('🌞 Mode clair initialisé');
            }
        }
        
        /**
         * Écouter les changements de préférence système
         */
        function setupThemeListener() {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Seulement si l'utilisateur n'a pas défini de préférence manuelle
                if (!localStorage.getItem('vitrine-theme')) {
                    if (e.matches) {
                        document.body.setAttribute('data-theme', 'dark');
                        console.log('🌙 Mode sombre activé (préférence système)');
                    } else {
                        document.body.removeAttribute('data-theme');
                        console.log('🌞 Mode clair activé (préférence système)');
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
                // Créer le message d'erreur
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
                
                // Insérer après le container de saisie
                const container = document.querySelector('.room-input-container');
                container.parentNode.insertBefore(errorDiv, container.nextSibling);
            }
            
            errorDiv.textContent = message;
            
            // Supprimer après 3 secondes
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
         * Vérifie si une salle est définie
         */
        function hasRoomSet() {
            return window.roomCache && window.roomCache.isSet;
        }

        /**
         * Met à jour les suggestions
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
         * Met à jour le bouton d'envoi
         */
        function updateSendButton(loading) {
            const sendBtn = document.getElementById('sendBtn');
            if (!sendBtn) return;
            
            if (loading) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '⏳ Traitement...';
            } else if (!isConnected) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '⚠️ Système non prêt';
            } else {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '📤 Signaler';
            }
        }

        // ======= MOJIBAKE SANITIZER =======
        function normalizeMojibake(text) {
            if (!text) return text;
            const replacements = [
                [/Syst�me/g, 'Système'], [/op�rationnel/g, 'opérationnel'], [/pr�t/g, 'prêt'],
                [/D�/g, 'Dé'], [/d�/g, 'dé'],
                [/�/g, ''],
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

        // ✅ NOUVEAU : Fonction pour détecter les salles mentionnées dans les messages
        function detectRoomInMessage(message) {
            // Pattern pour détecter les salles (ex: A-1750, B-2500, J-2430)
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

        // ✅ NOUVEAU : Fonction pour vérifier si un ticket existe déjà
        function hasExistingTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            return sessionTickets.some(ticket => ticket.room === targetRoom);
        }
        
        // ✅ NOUVEAU : Fonction pour ajouter un ticket à la session
        function addTicketToSession(ticketData) {
            const ticket = {
                number: ticketData.ticket_number || ticketData.id,
                room: ticketData.room,
                timestamp: new Date().toISOString(),
                title: ticketData.title || 'Ticket SEA',
                status: 'created'
            };
            
            sessionTickets.push(ticket);
            console.log(`🎫 [Session] Ticket ajouté:`, ticket);
            return ticket;
        }
        
        // ✅ NOUVEAU : Fonction pour obtenir le dernier ticket de la session
        function getLastSessionTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            const roomTickets = sessionTickets.filter(ticket => ticket.room === targetRoom);
            return roomTickets.length > 0 ? roomTickets[roomTickets.length - 1] : null;
        }

        // ===== FONCTIONS PRINCIPALES RÉELLES =====

        function clearInput() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            if (problemInput) problemInput.value = '';
            
            // ✅ NOUVEAU: Afficher à nouveau les palettes de problèmes
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // ✅ NOUVEAU : Supprimer TOUS les messages et interfaces précédents
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
            
            // ✅ NOUVEAU : Vider les suggestions
            const suggestions = document.getElementById('suggestions');
            if (suggestions) {
                suggestions.innerHTML = '';
            }
            
            // Supprimer tous les résultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * Vérifie la connexion au backend
         */
        async function checkConnection() {
            try {
                // ✅ BACKEND UNIQUE - PAS BESOIN DE MODIFICATION
                const apiUrl = await ensureBackendConnection();
                const response = await fetch(`${apiUrl}/api/health`);
                const wasConnected = isConnected;
                isConnected = response.ok;
                
                // ✅ NOUVEAU : Mettre à jour le statut si changement
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return isConnected;
            } catch (error) {
                console.error('Erreur de connexion:', error);
                const wasConnected = isConnected;
                isConnected = false;
                
                // ✅ NOUVEAU : Mettre à jour le statut en cas d'erreur
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return false;
            }
        }

        /**
         * ✅ NOUVEAU : Met à jour l'indicateur de statut système
         */
        function updateSystemStatus(connected) {
            const statusIndicator = document.querySelector('.status-indicator span');
            const statusDot = document.querySelector('.status-dot');
            
            if (statusIndicator && statusDot) {
                if (connected) {
                    statusIndicator.textContent = 'Système opérationnel';
                    statusDot.classList.remove('offline');
                    console.log('✅ [SystemStatus] Système opérationnel');
                } else {
                    statusIndicator.textContent = 'Système hors ligne';
                    statusDot.classList.add('offline');
                    console.log('❌ [SystemStatus] Système hors ligne');
                }
            }
            
            // Mettre à jour l'état du bouton d'envoi
            updateSendButton(false);
        }
        /**
         * Envoie un message d'exemple (comme dans l'original)
         */
        function sendExampleMessage(message) {
            // Gérer les suggestions spéciales
            if (message === 'Nouveau problème AV' || message === 'Nouveau problème') {
                clearInput();
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre problème audio') {
                clearInput();
                addMessage('system', '🔊 Décrivez votre problème audio :', {
                    suggestions: ['Pas de son', 'Microphone en sourdine', 'Bruit parasite', 'Volume trop bas']
                });
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre problème vidéo') {
                clearInput();
                addMessage('system', '📽️ Décrivez votre problème vidéo :', {
                    suggestions: ['Écran noir', 'Pas d\'image', 'Qualité dégradée', 'Projecteur ne s\'allume pas']
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
                addMessage('system', '📍 <strong>Nom de la salle ?</strong>', {
                    suggestions: ['A-1750', 'B-2500', 'C-3000', 'D-4000', 'SH-R200', 'DS-4000']
                });
                return;
            }
            
            if (message === 'Copier numéro ticket') {
                // Chercher le dernier numéro de ticket dans les messages
                const messages = document.querySelectorAll('.message.system');
                for (let i = messages.length - 1; i >= 0; i--) {
                    const messageContent = messages[i].textContent;
                    const ticketMatch = messageContent.match(/Numéro\s*:\s*([A-Z0-9-]+)/);
                    if (ticketMatch) {
                        const ticketNumber = ticketMatch[1];
                        navigator.clipboard.writeText(ticketNumber).then(() => {
                            addMessage('system', `📋 Numéro de ticket <strong>${ticketNumber}</strong> copié dans le presse-papier.`, {
                                suggestions: ['Nouveau problème', 'Merci']
                            });
                        }).catch(() => {
                            addMessage('system', `📋 Numéro de ticket: <strong>${ticketNumber}</strong> (copie manuelle nécessaire)`, {
                                suggestions: ['Nouveau problème', 'Merci']
                            });
                        });
                        return;
                    }
                }
                addMessage('system', '❌ Aucun numéro de ticket trouvé à copier.', {
                    suggestions: ['Nouveau problème']
                });
                return;
            }
            
            if (message === 'Merci pour l\'information') {
                addMessage('system', '👍 N\'hésitez pas à revenir pour tout problème audiovisuel !', {
                    suggestions: ['Problème projecteur', 'Problème audio', 'Problème réseau']
                });
                return;
            }
            
            // Pour les problèmes réseau, afficher la bannière Services Informatiques
            if (message === 'Problème de réseau') {
                handleNetworkProblem(message);
                return;
            }
            
            // Pour les autres problèmes (système qui ne répond plus), afficher bannière SIM
            if (message === 'Système qui ne répond plus') {
                handleNonAudiovisualProblem(message);
                return;
            }
            
            // Pour les problèmes audio/vidéo, envoyer au backend
            if (isConnected) {
                // ✅ NOUVEAU: Démarrer timer d'escalade pour les clics palette
                const currentRoom = getCurrentRoom();
                let problemType = null;
                
                if (message === 'Problème Vidéo' || message.toLowerCase().includes('vidéo') || message.toLowerCase().includes('projecteur')) {
                    problemType = 'video';
                    // ✅ CORRECTION BACKEND : Message simple comme la référence qui fonctionne
                    if (message === 'Problème Vidéo') {
                        message = 'Écran noir projecteur';
                    }
                } else if (message === 'Problème Audio' || message.toLowerCase().includes('audio') || message.toLowerCase().includes('son')) {
                    problemType = 'audio';
                }
                
                if (problemType && !escalationTimeoutId) {
                    console.log(`⏰ [EscalationTimeout] Démarrage timer palette pour problème ${problemType}`);
                    startEscalationTimeout(problemType, currentRoom);
                }
                
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) {
                    problemInput.value = message;
                    sendProblemReport();
                }
            } else {
                addMessage('system', '⚠️ Système en cours d\'initialisation. Veuillez patienter.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
            }
        }

        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====



        // Fonction principale pour envoyer le problème au backend
        async function sendProblemReport() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            const message = problemInput ? problemInput.value.trim() : '';
            
            if (!message) {
                addMessage('system', '❌ Veuillez décrire votre problème.', {
                    suggestions: ['Problème projecteur', 'Problème audio', 'Problème réseau']
                });
                return;
            }
            
            if (!isConnected) {
                addMessage('system', '⚠️ Système en cours d\'initialisation. Veuillez patienter ou recharger la page.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
                return;
            }

            // ✅ NOUVEAU : Afficher l'overlay de chargement diagnostic
            showDiagnosticLoading();
            
            // ✅ NOUVEAU: Démarrer le timer d'escalade pour éviter les blocages
            const currentRoom = getCurrentRoom();
            
            // Identifier le type de problème pour le timer
            let problemType = null;
            if (message.toLowerCase().includes('vidéo') || message.toLowerCase().includes('projecteur') || message.toLowerCase().includes('écran')) {
                problemType = 'video';
            } else if (message.toLowerCase().includes('audio') || message.toLowerCase().includes('son') || message.toLowerCase().includes('micro')) {
                problemType = 'audio';
            }
            
            // Démarrer le timer d'escalade si c'est un problème AV (éviter les doublons)
            if (problemType && !escalationTimeoutId) {
                console.log(`⏰ [EscalationTimeout] Démarrage timer d'escalade pour problème ${problemType}`);
                startEscalationTimeout(problemType, currentRoom);
            }
            
            // ✅ NOUVELLE VALIDATION : Vérifier la cohérence de salle
            const detectedRooms = detectRoomInMessage(message);
            
            if (detectedRooms && detectedRooms.length > 0) {
                // Vérifier si une salle différente est mentionnée
                const mentionedRoom = detectedRooms[0]; // Première salle détectée
                
                if (mentionedRoom !== currentRoom) {
                    addMessage('system', `⚠️ <strong>Attention :</strong> Vous êtes présentement dans la salle <strong>${currentRoom}</strong>.<br><br>Je suis votre assistant uniquement pour cette salle. Si vous avez un problème dans une autre salle, veuillez vous y rendre et utiliser l'assistant local.`, {
                        suggestions: ['Continuer avec ' + currentRoom, 'Changer de salle', 'Nouveau problème']
                    });
                    return;
                }
            }
            
            // ✅ NOUVELLE VALIDATION : Vérifier les tickets existants
            if (hasExistingTicket(currentRoom)) {
                const lastTicket = getLastSessionTicket(currentRoom);
                showExistingTicketBanner(lastTicket);
                return;
            }
            
            // ✅ NOUVELLE STRATÉGIE : Analyser le type de problème avec salle toujours connue
            const messageAnalysis = analyzeMessageType(message);
            console.log(`🔍 [MessageAnalysis] Salle: ${getCurrentRoom()}, Type: ${messageAnalysis.type}, Catégorie: ${messageAnalysis.category}`);
            
            // Variable pour stocker le résultat d'analyse d'équipement
            let analysisResult = null;
            
            // Traiter selon le type de problème
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
                
                case 1: // AV système - Analyse améliorée avec équipements de la salle
                    console.log(`🎯 [SystemAV] Analyse système pour salle ${getCurrentRoom()}: "${message}"`);
                    
                    // ✅ NOUVEAU : Mettre à jour le texte de chargement
                    updateDiagnosticLoadingText('Analyse des équipements...', 'Identification des dispositifs audiovisuels');
                    
                    // Nouvelle logique : Analyser les équipements avant de continuer
                    analysisResult = await analyzeRoomEquipmentForProblem(message);
                    if (analysisResult.shouldEscalate) {
                        return; // L'escalade a été gérée dans la fonction (message utilisateur déjà ajouté)
                    }
                    
                    // Continuer avec l'analyse système si pas d'escalade
                    break;
                
                default:
                    // Par défaut, traiter comme type 4 (hors scope)
                    handleOutOfScopeMessage(message);
                    return;
            }
            
            // Désactiver le bouton pendant le traitement
            updateSendButton(true);
            
            // ✅ NOUVEAU : Ne pas afficher le message utilisateur pour les actions automatiques
            const isAutoActionMessage = message.toLowerCase().includes('pas de son') || 
                                       message.toLowerCase().includes('micro') ||
                                       message.toLowerCase().includes('son') ||
                                       message.toLowerCase().includes('audio') ||
                                       message.toLowerCase().includes('sourdine');
            
            // ✅ CORRECTION : Ajouter le message utilisateur seulement si pas d'analyse d'équipement ET pas d'action automatique
            if (!(analysisResult && analysisResult.userMessageAdded) && !isAutoActionMessage) {
                addMessage('user', message, {});
            }
            
            // ✅ CORRECTION UI : Vider l'input seulement après succès, pas immédiatement
            // problemInput.value = '';  // Déplacé plus tard
            
            try {
                // ✅ NOUVELLE STRATÉGIE : Envoyer au backend avec salle toujours incluse
                const currentRoom = getCurrentRoom();
                const fullMessage = `${message} (Salle: ${currentRoom})`;
                
                // ✅ NOUVEAU : Mettre à jour le texte de chargement
                updateDiagnosticLoadingText('Analyse intelligente...', 'Recherche de solutions automatiques');
                
                // 🔍 DEBUG : Afficher le message exact envoyé au backend
                console.log(`🎯 [DEBUG] Message envoyé au RAG backend: "${fullMessage}"`);
                
                // ✅ S'assurer d'utiliser le bon backend
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
                    // Traiter la réponse du Copilot
                    console.log(`📥 [Backend] Réponse reçue:`, data);
                    processResponse(data);
                    
                    // ✅ CORRECTION UI : Vider l'input seulement après succès
                    if (!problemInput) problemInput = document.getElementById('problemInput');
                    if (problemInput) problemInput.value = '';
                } else {
                    throw new Error(data.message || 'Erreur lors du traitement');
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
                
                // CORRECTION : Ne pas afficher d'erreur bloquante, continuer avec l'analyse
                console.log(`🔧 [ErrorHandling] Erreur API → Continuer avec l'analyse locale`);
                
                // Créer un contexte RAG local pour continuer le processus
                latestRAGContext = {
                    intent: 'technical_issue',
                    confidence: 0.8,
                    room: getCurrentRoom(),
                    problems: [{
                        room: getCurrentRoom(),
                        device: null,
                        severity: 'medium',
                        reason: 'Problème signalé nécessitant intervention'
                    }],
                    solutions: [],
                    escalation_needed: true,
                    escalation_reason: "Problème technique signalé - intervention recommandée."
                };
                
                // Afficher un message informatif et proposer l'escalade
                addMessage('system', `🔧 Analyse terminée pour la salle ${getCurrentRoom()}. Une intervention technique est recommandée.`, {
                    suggestions: ['Créer un ticket SEA', 'Appeler SEA au 6135', 'Nouveau problème']
                });
                
                // ✅ NOUVEAU : Masquer le sablier uniquement quand on affiche des suggestions (pas de bannière)
                hideDiagnosticLoading();
                
            } finally {
                // Réactiver le bouton
                updateSendButton(false);
                
                // CORRECTION : Ne pas faire de retour automatique pour éviter les interruptions
                // L'utilisateur doit choisir explicitement de créer un ticket
                
                // ✅ NOUVEAU : Le sablier reste affiché jusqu'à ce qu'une bannière spécifique le remplace
                // Plus de masquage systématique ici - seules les bannières masquent le sablier
            }
        }

        // ===== FONCTIONS DE DIAGNOSTIC RÉEL =====

        /**
         * Vérifie si un message concerne un problème audio
         */
        function isAudioProblem(message) {
            const audioKeywords = ['audio', 'son', 'microphone', 'micro', 'haut-parleur', 'haut parleur', 'volume', 'mute', 'sourdine', 'bruit', 'écho'];
            return audioKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * Vérifie si un message concerne un problème vidéo
         */
        function isVideoProblem(message) {
            const videoKeywords = ['vidéo', 'projecteur', 'écran', 'image', 'affichage', 'proj', 'hdmi', 'vga', 'connecteur'];
            return videoKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * ✅ FONCTION UNIVERSELLE : Détecte le type d'équipement disponible dans une salle
         */
        function analyzeRoomEquipmentTypes(devices) {
            if (!devices || !Array.isArray(devices)) {
                return { hasAudio: false, hasVideo: false, summary: 'Aucun équipement détecté' };
            }

            // ✅ CORRECTION: Détection équipements AUDIO (TCC2, Sennheiser, microphones)
            const audioDevices = devices.filter(device => 
                (device.type && (device.type.toLowerCase().includes('audio') || device.type.toLowerCase().includes('microphone'))) ||
                (device.model_name && (device.model_name.toLowerCase().includes('sennheiser') || device.model_name.toLowerCase().includes('tcc2'))) ||
                (device.name && device.name.toLowerCase().includes('tcc2')) ||
                (device.family_name && device.family_name.toLowerCase().includes('sennheiser'))
            );

            // ✅ CORRECTION: Détection équipements VIDÉO (Projecteurs, écrans, affichages)
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
                summary: `Audio: ${audioDevices.length}, Vidéo: ${videoDevices.length}`
            };

            console.log(`🔍 [EquipmentTypes] Analyse salle: ${result.summary}`);
            return result;
        }

        /**
         * ✅ RÈGLE UNIVERSELLE : Applique la logique d'escalation symétrique
         */
        function shouldEscalateBasedOnEquipment(problemType, equipmentTypes, currentRoom) {
            // RÈGLE 1: Problème AUDIO + Aucun équipement AUDIO → Escalade
            if (problemType === 'audio' && !equipmentTypes.hasAudio) {
                console.log(`🔊 [UniversalRule] Salle ${currentRoom}: Problème AUDIO détecté mais aucun équipement audio → ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun équipement audio trouvé dans la salle ${currentRoom}`,
                    intent: 'audio_problem'
                };
            }

            // RÈGLE 2: Problème VIDÉO + Aucun équipement VIDÉO → Escalade  
            if (problemType === 'video' && !equipmentTypes.hasVideo) {
                console.log(`📽️ [UniversalRule] Salle ${currentRoom}: Problème VIDÉO détecté mais aucun équipement vidéo → ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun équipement vidéo trouvé dans la salle ${currentRoom}`,
                    intent: 'video_problem'
                };
            }

            // RÈGLE 3: Équipement du bon type disponible → Continuer analyse
            console.log(`✅ [UniversalRule] Salle ${currentRoom}: Équipement ${problemType} disponible → Continuer avec diagnostic automatique`);
            return {
                shouldEscalate: false,
                reason: `Équipement ${problemType} disponible pour diagnostic automatique`,
                intent: `${problemType}_problem`
            };
        }

        /**
         * Récupère les équipements disponibles dans une salle
         */
        async function fetchRoomEquipment(room) {
            try {
                console.log(`📋 [FetchRoomEquipment] Récupération équipements pour salle ${room}`);
                
                // ✅ STRATÉGIE HYBRIDE: Vérifier d'abord si on a des infos de cache (Podio ou NeonDB)
                const roomInfo = await podioRoomCache.getRoomInfo(room);
                
                if (roomInfo && roomInfo.source === 'neondb' && roomInfo.devices) {
                    // Salle trouvée via NeonDB avec équipements
                    console.log(`📋 [FetchRoomEquipment] ✅ Utilisation équipements NeonDB pour ${room} (${roomInfo.devices.length})`);
                    
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
                
                // ✅ PODIO ou pas d'info cachée: Essayer l'API équipements traditionnelle
                console.log(`📋 [FetchRoomEquipment] Tentative API équipements traditionnelle pour ${room}`);
                
                // Essayer d'abord la route /api/devices/public
                let response = await fetch(`${API_BASE_URL}/api/devices/public`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Si 404, essayer la route /api/devices
                if (response.status === 404) {
                    console.log(`📋 [FetchRoomEquipment] Route /api/devices/public non trouvée, essai avec /api/devices`);
                    response = await fetch(`${API_BASE_URL}/api/devices`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                if (!response.ok) {
                    // Permissions ou erreurs → Essayer fallback NeonDB direct si pas déjà fait
                    if (!roomInfo || roomInfo.source !== 'neondb') {
                        console.log(`📋 [FetchRoomEquipment] Échec API traditionnelle → Tentative NeonDB directe`);
                        return await fetchRoomEquipmentFromNeonDB(room);
                    }
                    
                    console.log(`📋 [FetchRoomEquipment] Échec complet pour ${room}`);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const allDevices = await response.json();
                if (!Array.isArray(allDevices)) {
                    console.warn('📋 [FetchRoomEquipment] Réponse API inattendue:', allDevices);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                // Filtrer les équipements de la salle spécifique
                const roomDevices = allDevices.filter(device => 
                    device.room_name && device.room_name.toLowerCase() === room.toLowerCase()
                );
                
                console.log(`📋 [FetchRoomEquipment] Salle ${room}: ${roomDevices.length} équipement(s) trouvé(s) via API traditionnelle`);
                
                return {
                    devices: roomDevices,
                    total: roomDevices.length,
                    noAccess: false,
                    source: 'traditional'
                };
                
            } catch (error) {
                console.error('📋 [FetchRoomEquipment] Erreur:', error);
                // Fallback final vers NeonDB
                return await fetchRoomEquipmentFromNeonDB(room);
            }
        }

        /**
         * ✅ NOUVEAU: Fonction dédiée pour récupérer équipements depuis NeonDB directement
         */
        async function fetchRoomEquipmentFromNeonDB(room) {
            try {
                console.log(`📋 [FetchRoomEquipmentFromNeonDB] Récupération directe NeonDB pour ${room}`);
                
                const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(room)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`📋 [FetchRoomEquipmentFromNeonDB] Erreur HTTP ${response.status}`);
                    
                    // ✅ CONTOURNEMENT : Équipements en dur pour J-2430 si API échoue
                    if (room === 'J-2430') {
                        console.log(`🔧 [FallbackJ2430] Utilisation équipements en dur pour J-2430`);
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
                    console.warn('📋 [FetchRoomEquipmentFromNeonDB] Réponse invalide:', data);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const adaptedDevices = data.devices.map(device => ({
                    id: device.id,
                    device_name: device.device_name || device.name,
                    name: device.name,
                    host: device.address, // ✅ Adapter address → host
                    protocol: device.technology, // ✅ Adapter technology → protocol  
                    device_model_name: device.device_model_name,
                    device_family_name: device.device_family_name,
                    family_type: device.technology, // ✅ Utiliser technology comme family_type
                    room_name: device.room_name || room,
                    address: device.address, // ✅ Garder address aussi
                    technology: device.technology, // ✅ Garder technology aussi
                    status: device.status, // ✅ Ajouter status
                    port: device.port // ✅ Ajouter port
                }));
                
                console.log(`📋 [FetchRoomEquipmentFromNeonDB] Salle ${room}: ${adaptedDevices.length} équipement(s) trouvé(s)`);
                
                return {
                    devices: adaptedDevices,
                    total: adaptedDevices.length,
                    noAccess: false,
                    source: 'neondb'
                };
                
            } catch (error) {
                console.error('📋 [FetchRoomEquipmentFromNeonDB] Erreur:', error);
                return { devices: [], total: 0, noAccess: true };
            }
        }

        /**
         * Analyse les équipements disponibles dans la salle pour déterminer si une escalade immédiate est nécessaire
         */
        async function analyzeRoomEquipmentForProblem(message) {
            const currentRoom = getCurrentRoom();
            const lowerMessage = message.toLowerCase();
            
            try {
                // Récupérer les équipements de la salle
                const roomEquipment = await fetchRoomEquipment(currentRoom);
                
                // Si pas d'accès direct aux équipements, escalader pour les problèmes vidéo/audio
                if (!roomEquipment || roomEquipment.noAccess) {
                    console.log(`🏢 [RoomAnalysis] Pas d'accès direct aux équipements → Vérifier si escalade nécessaire`);
                    
                    // ✅ CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER LES PROBLÈMES VIDÉO AVANT ESCALADE
                    if (isVideoProblem(lowerMessage)) {
                        console.log(`📽️ [VideoAnalysis] Problème vidéo détecté → TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        // ✅ CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut détecter et corriger automatiquement des problèmes comme projecteur éteint + AV mute
                        console.log(`🎯 [VideoAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (isAudioProblem(lowerMessage)) {
                        console.log(`🔊 [AudioAnalysis] Problème audio détecté → TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        
                        // ✅ CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut détecter et corriger automatiquement des problèmes comme TCC2 en sourdine
                        console.log(`🎯 [AudioAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    // Pour les autres types de problèmes, continuer avec l'analyse Copilot
                    console.log(`🔧 [EquipmentAnalysis] Pas d'accès équipements → Continuer avec l'analyse Copilot`);
                    return { shouldEscalate: false, userMessageAdded: false };
                }
                
                // ✅ NOUVELLE LOGIQUE UNIVERSELLE : Analyser les équipements avec règles symétriques
                if (roomEquipment.devices && roomEquipment.devices.length > 0) {
                    console.log(`🔧 [EquipmentAnalysis] ${roomEquipment.devices.length} équipement(s) trouvé(s) pour la salle ${currentRoom}`);
                    
                    // ✅ Analyser les types d'équipements disponibles
                    const equipmentTypes = analyzeRoomEquipmentTypes(roomEquipment.devices);
                    console.log(`🔍 [EquipmentAnalysis] ${equipmentTypes.summary}`);
                    
                    // ✅ Déterminer le type de problème et appliquer la règle universelle
                    let problemType = null;
                    if (isAudioProblem(lowerMessage)) {
                        problemType = 'audio';
                    } else if (isVideoProblem(lowerMessage)) {
                        problemType = 'video';
                        
                        // ✅ CRITIQUE : Analyse spécifique des problèmes vidéo avec gestion projecteurs
                        console.log(`📽️ [EquipmentAnalysis] Problème vidéo détecté → Analyse spécifique projecteurs`);
                        const videoHandled = await handleVideoProblemAnalysis(message, roomEquipment);
                        if (videoHandled) {
                            // Escalade effectuée par handleVideoProblemAnalysis
                            return { shouldEscalate: true, userMessageAdded: true };
                        }
                        // Sinon, continuer avec RAG backend (projecteurs détectés)
                        console.log(`📽️ [EquipmentAnalysis] Projecteurs détectés → Continuer analyse RAG backend`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (problemType === 'audio') {
                        // ✅ Logique audio existante
                        console.log(`🔧 [EquipmentAnalysis] Problème audio détecté → Tenter diagnostic automatique Copilot`);
                        
                        // ✅ Vérifier si équipements appropriés disponibles pour diagnostic
                        const hasAppropriateEquipment = equipmentTypes.hasAudio;
                        
                        // ✅ CORRECTION CRITIQUE : TOUJOURS PERMETTRE AU BACKEND D'ANALYSER D'ABORD
                        // Même si les équipements ne sont pas détectés localement, le backend peut avoir
                        // une meilleure connaissance des équipements et peut corriger automatiquement
                        console.log(`🎯 [EquipmentAnalysis] Problème audio → FORCER ANALYSE BACKEND AVANT ESCALADE`);
                        console.log(`🔧 [EquipmentAnalysis] Équipements détectés: ${hasAppropriateEquipment ? 'OUI' : 'NON'} - Backend peut avoir plus d'infos`);
                        
                        // Laisser le backend analyser et décider s'il peut corriger automatiquement (ex: TCC2 sourdine)
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                }
                
                // Si pas d'équipements trouvés, continuer avec l'analyse Copilot
                console.log(`🔧 [EquipmentAnalysis] Aucun équipement trouvé → Continuer avec l'analyse Copilot`);
                return { shouldEscalate: false, userMessageAdded: false };
                
            } catch (error) {
                console.error('🔧 [EquipmentAnalysis] Erreur lors de l\'analyse:', error);
                // En cas d'erreur, continuer avec l'analyse Copilot
                return { shouldEscalate: false, userMessageAdded: false };
            }
        }

        // 🆕 FONCTION POUR VÉRIFIER L'ÉTAT TEMPS RÉEL D'UN PROJECTEUR
        async function fetchProjectorRealtimeStatus(deviceName) {
            try {
                console.log(`🔍 [RealtimeStatus] Vérification temps réel pour: ${deviceName}`);
                
                const response = await fetch(`${API_BASE_URL}/api/device/public/realtime-status/${deviceName}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`❌ [RealtimeStatus] Erreur HTTP ${response.status} pour ${deviceName}`);
                    return null;
                }
                
                const status = await response.json();
                console.log(`✅ [RealtimeStatus] État temps réel récupéré pour ${deviceName}:`, status);
                
                return status;
                
            } catch (error) {
                console.error(`❌ [RealtimeStatus] Erreur pour ${deviceName}:`, error);
                return null;
            }
        }
        /**
         * ✅ FONCTION MANQUANTE CRITIQUE : Analyse spécifique des problèmes vidéo
         * Copiée depuis assistant-salle-av-copie.html
         */
        async function handleVideoProblemAnalysis(message, roomEquipment) {
            const currentRoom = getCurrentRoom();
            
            // Vérifier s'il y a des projecteurs dans la salle
            const projectors = (roomEquipment && roomEquipment.devices) ? roomEquipment.devices.filter(device => 
                device.device_type === 'projector' || 
                device.device_family_name?.toLowerCase().includes('projecteur') ||
                device.device_name?.toLowerCase().includes('proj') ||
                device.technology?.toLowerCase().includes('pjlink')
            ) : [];
            
            console.log(`📽️ [VideoAnalysis] Salle ${currentRoom}: ${projectors.length} projecteur(s) détecté(s)`);
            
            if (projectors.length === 0) {
                // Aucun projecteur détecté, escalade immédiate avec interface standard
                console.log(`📽️ [VideoAnalysis] Aucun projecteur détecté → Escalade directe`);
                
                // Créer un contexte RAG artificiel pour l'escalade vidéo
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
                    escalation_reason: "Aucun projecteur détecté dans cette salle. L'équipement vidéo pourrait ne pas être référencé dans le système de monitoring."
                };
                
                console.log('🎫 [VideoEscalation] Contexte RAG artificiel créé avec salle:', currentRoom);
                
                // ✅ PAS DE MESSAGE EN BAS - Bannière SEA directe plus propre
                console.log(`📽️ [VideoAnalysis] Aucun projecteur → Escalade SEA directe sans message intermédiaire`);
                
                // ✅ ESCALADE SEA IMMÉDIATE au lieu d'attendre le timeout
                setTimeout(() => {
                    showSEAEscalationBanner(latestRAGContext);
                }, 500); // 0.5 seconde pour feedback immédiat
                
                return true; // Escalade effectuée
            }
            
            // ✅ CRITIQUE : Il y a des projecteurs, créer actions automatiques locales
            console.log(`📽️ [VideoAnalysis] ${projectors.length} projecteur(s) trouvé(s) → Créer actions automatiques locales`);
            
            // Créer un contexte RAG artificiel avec actions automatiques pour projecteur
            const projector = projectors[0]; // Prendre le premier projecteur
            console.log(`🎯 [VideoActions] Création actions automatiques pour projecteur: ${projector.device_name || projector.name}`);
            
            latestRAGContext = {
                intent: 'video_problem',
                confidence: 0.9,
                room: currentRoom,
                problems: [{
                    room: currentRoom,
                    device: projector.device_name || projector.name,
                    severity: 'high',
                    reason: 'Problème vidéo projecteur - écran noir'
                }],
                solutions: [],
                escalation_needed: false,
                actions: [
                    {
                        type: 'pjlink_power',
                        device_id: projector.id || 31,
                        command: 'power_on', // ✅ Format backend
                        description: `Allumer ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            power_on: true
                        }
                    },
                    {
                        type: 'pjlink_av_unmute', // ✅ Nom correct
                        device_id: projector.id || 31,
                        command: 'av_unmute', // ✅ Format backend
                        description: `Désactiver AV Mute sur ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            video_mute: false,
                            audio_mute: false
                        }
                    }
                ],
                auto_executed: true
            };
            
            // ✅ VÉRIFIER D'ABORD L'ÉTAT RÉEL DU PROJECTEUR AVANT D'AFFICHER BANNIÈRE
            console.log(`🔍 [VideoActions] Vérification état réel projecteur avant affichage bannière...`);
            
            try {
                // ✅ ÉTAPE 1 : Vérifier l'état d'alimentation (power) du projecteur
                console.log(`🔌 [VideoActions] Vérification état d'alimentation du projecteur...`);
                
                // ✅ ESSAI 1 : Endpoint power-status (nouveau)
                let powerData = null;
                try {
                    const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${currentRoom}`);
                    if (powerResponse.ok) {
                        powerData = await powerResponse.json();
                        console.log(`🔌 [VideoActions] État alimentation (power-status):`, powerData);
                    }
                } catch (powerError) {
                    console.log(`⚠️ [VideoActions] Endpoint power-status non disponible: ${powerError.message}`);
                }
                
                // ✅ ESSAI 2 : Fallback vers av-mute-status (existant) pour détecter si projecteur répond
                if (!powerData) {
                    console.log(`🔄 [VideoActions] Fallback vers av-mute-status pour détecter connectivité...`);
                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                    
                    if (avMuteResponse.ok) {
                        const avMuteData = await avMuteResponse.json();
                        console.log(`🔇 [VideoActions] État AV Mute (fallback):`, avMuteData);
                        
                        // ✅ Si projecteur répond mais pas de AV Mute → ESCALADE DIRECTE
                        if (!avMuteData.av_muted && avMuteData.device) {
                            console.log(`🎯 [VideoActions] Projecteur RÉPOND + PAS AV Mute → ESCALADE DIRECTE`);
                            showSEAEscalationBanner(latestRAGContext);
                            return; // ✅ ARRÊTER ICI - Pas de bannière d'attente
                        }
                        
                        // ✅ Si projecteur répond ET AV Mute actif → Continuer avec correction
                        if (avMuteData.av_muted) {
                            console.log(`🔇 [VideoActions] Projecteur RÉPOND + AV Mute actif → Correction automatique`);
                        }
                    } else {
                        // ✅ Si projecteur ne répond pas → Probablement éteint, continuer avec allumage
                        console.log(`🔌 [VideoActions] Projecteur ne répond pas → Probablement éteint, continuer avec allumage`);
                    }
                } else {
                    // ✅ Endpoint power-status disponible
                    if (powerData.power === 'off' || powerData.power === 'OFF' || !powerData.power) {
                        console.log(`🔌 [VideoActions] Projecteur ÉTEINT → Continuer avec allumage automatique`);
                    } else {
                        // ✅ Projecteur allumé → Vérifier AV Mute
                        console.log(`🔌 [VideoActions] Projecteur ALLUMÉ → Vérifier AV Mute...`);
                        const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                        
                        if (avMuteResponse.ok) {
                            const avMuteData = await avMuteResponse.json();
                            console.log(`🔇 [VideoActions] État AV Mute:`, avMuteData);
                            
                            // ✅ Si projecteur allumé ET pas de AV Mute → ESCALADE DIRECTE
                            if (!avMuteData.av_muted && avMuteData.device) {
                                console.log(`🎯 [VideoActions] Projecteur ALLUMÉ + PAS AV Mute → ESCALADE DIRECTE`);
                                showSEAEscalationBanner(latestRAGContext);
                                return; // ✅ ARRÊTER ICI - Pas de bannière d'attente
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️ [VideoActions] Erreur vérification état: ${error.message} - Continuer avec bannière d'attente`);
            }
            
            // ✅ BANNIÈRE D'ATTENTE ORANGE pour diagnostic et actions (minimum 15 secondes)
            showWaitingBanner('🔍 Diagnostic du projecteur...', 'Vérification de l\'état et correction en cours');
            
            // ✅ Mémoriser le moment d'affichage pour délai minimum
            window.waitingBannerStartTime = Date.now();
            
            // ✅ MESSAGE ADAPTATIF selon l'état probable du projecteur
            console.log(`🤖 [VideoActions] Envoi message adaptatif au RAG (seulement si pas escalade directe)`);
            
            // Si c'est un nouveau clic après une correction, changer le message
            const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
            const nbCorrections = parseInt(sessionCorrections);
            
            let adaptiveMessage;
            if (nbCorrections > 0) {
                // Après une correction, focus sur l'AV Mute
                adaptiveMessage = "Le projecteur est allumé mais l'image n'apparaît pas - écran noir avec AV Mute";
                console.log(`🎯 [VideoActions] ${nbCorrections} correction(s) précédente(s) → Focus AV Mute`);
            } else {
                // Premier problème : power on classique
                adaptiveMessage = "Le projecteur ne s'allume pas et l'écran reste noir";
                console.log(`🎯 [VideoActions] Premier problème → Focus Power ON`);
            }
            
            sendProblemToVitrine(adaptiveMessage, currentRoom);
            
            return true; // Traitement effectué localement
        }
        
        // ===== FONCTION POUR APPEL VITRINE =====
        
        async function sendProblemToVitrine(message, roomName) {
            console.log(`🌐 [VitrineCall] Envoi vers /api/copilot/vitrine: "${message}"`);
            
            try {
                // ✅ S'assurer d'utiliser le bon backend
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
                                pavilion: roomName.split('-')[0], // Ex: J-2430 → J
                                room_number: roomName.split('-')[1] // Ex: J-2430 → 2430
                            },
                            equipment_context: roomName === 'J-2430' ? {
                                projectors: [{
                                    id: 31,
                                    name: 'PROJ-J-2430',
                                    address: '132.208.119.121',
                                    technology: 'PJLINK',
                                    status: 'online', // ✅ Projecteur maintenant allumé
                                    issues: ['av_mute_active'] // ✅ Mais AV Mute actif
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
                console.log(`📥 [VitrineCall] Réponse reçue:`, data);
                
                // Traiter la réponse comme les autres réponses backend
                processResponse(data);
                
            } catch (error) {
                console.error(`❌ [VitrineCall] Erreur:`, error);
                // En cas d'erreur, afficher un message à l'utilisateur
                showAutoActionResult(
                    { type: 'error', description: 'Appel backend' }, 
                    { success: false, message: `Erreur de connexion backend: ${error.message}` }
                );
            }
        }
        
        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====
        function analyzeMessageType(message) {
            const lowerMessage = message.toLowerCase();
            
            // Mots-clés pour équipements AV dans le système SavQonnect
            const avSystemKeywords = [
                // Projecteurs
                'projecteur', 'projector', 'pjlink', 'écran', 'screen', 'affichage', 'display',
                'image', 'vidéo', 'video', 'noir', 'blanc', 'flou', 'floue', 'pixelisé',
                
                // Audio Sennheiser
                'microphone', 'micro', 'son', 'audio', 'volume', 'sennheiser', 'tcc2',
                'mute', 'muet', 'sourdine', 'grésille', 'parasite', 'larsen',
                
                // Crestron
                'crestron', 'écran tactile', 'touchscreen', 'panneau de contrôle',
                'interface de contrôle', 'télécommande'
            ];
            
            // Mots-clés pour équipements AV hors système (mais toujours SEA)
            const avExternalKeywords = [
                // Équipements AV génériques non spécifiques au système
                'haut-parleur', 'speaker', 'amplificateur', 'ampli', 'console audio',
                'table de mixage', 'mixer', 'caméra', 'webcam', 'visualiseur',
                'dvd', 'blu-ray', 'lecteur', 'player', 'hdmi', 'vga', 'usb',
                'casque', 'headset', 'casque audio', 'jack', 'connecteur',
                'câble audio', 'câble vidéo', 'adaptateur', 'convertisseur'
            ];
            
            // Mots-clés pour problèmes non-audiovisuels
            const nonAVKeywords = [
                // Électricité
                'électricité', 'électrique', 'prise', 'prises', 'courant', 'lumière', 'éclairage',
                'ampoule', 'lampe', 'néon', 'disjoncteur', 'fusible', 'interrupteur',
                
                // Plomberie
                'plomberie', 'eau', 'robinet', 'toilette', 'chasse d\'eau', 'lavabo',
                'évier', 'fuite', 'bouchon', 'inondation', 'dégât d\'eau',
                
                // Chauffage/Climatisation
                'chauffage', 'radiateur', 'calorifère', 'thermopompe', 'thermostat',
                'climatisation', 'clim', 'air conditionné', 'ventilation', 'température',
                
                // Mobilier et structure
                'mobilier', 'chaise', 'table', 'bureau', 'porte', 'fenêtre', 'serrure',
                'clé', 'nettoyage', 'ménage', 'poubelle', 'déchets'
            ];
            
            // Mots-clés hors scope (pas des problèmes)
            const outOfScopeKeywords = [
                // Salutations
                'bonjour', 'bonsoir', 'salut', 'hello', 'hi',
                
                // Questions générales
                'comment ça va', 'quoi de neuf', 'comment allez-vous',
                'qu\'est-ce que tu fais', 'que fais-tu',
                
                // Demandes d'aide générale
                'aide-moi', 'peux-tu m\'aider', 'j\'ai besoin d\'aide',
                'que peux-tu faire', 'tes fonctionnalités',
                
                // Discussions
                'parle-moi', 'raconte-moi', 'dis-moi', 'explique-moi',
                'météo', 'actualité', 'nouvelles', 'sport'
            ];
            
            // Vérifier si c'est un problème technique valide
            const problemIndicators = [
                'problème', 'panne', 'ne fonctionne pas', 'ne marche pas', 'défaillant',
                'en panne', 'cassé', 'ne s\'allume pas', 'ne répond pas', 'dysfonctionnement',
                'pas de', 'aucun', 'rien', 'bloqué', 'figé', 'lent', 'erreur'
            ];
            
            const hasProblemIndicator = problemIndicators.some(indicator => 
                lowerMessage.includes(indicator)
            );
            
            // Classification par priorité
            
            // 1. Vérifier si c'est hors scope
            if (outOfScopeKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 4,
                    category: 'out_of_scope',
                    description: 'Demande hors scope - pas un problème audiovisuel',
                    needsRoom: false
                };
            }
            
            // 2. Vérifier si c'est non-audiovisuel (priorité haute)
            if (nonAVKeywords.some(keyword => lowerMessage.includes(keyword))) {
                console.log(`🏢 [NonAV] Détection problème non-audiovisuel: "${message}" contient mot-clé immeubles`);
                return {
                    type: 3,
                    category: 'non_audiovisual',
                    description: 'Problème non-audiovisuel - service des immeubles',
                    needsRoom: false
                };
            }
            
            // 3. Vérifier si c'est AV dans le système
            if (avSystemKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 1,
                    category: 'av_system',
                    description: 'Problème équipement AV dans le système SavQonnect',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 4. Vérifier si c'est AV externe
            if (avExternalKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 2,
                    category: 'av_external',
                    description: 'Problème équipement AV hors système - redirection SEA',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 5. Si c'est un problème mais pas clairement catégorisé
            if (hasProblemIndicator) {
                // Assumer que c'est potentiellement AV si c'est un problème technique
                return {
                    type: 1,
                    category: 'av_system_assumed',
                    description: 'Problème technique - assume équipement AV système',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: false
                };
            }
            
            // 6. Par défaut, considérer comme hors scope
            return {
                type: 4,
                category: 'out_of_scope',
                description: 'Demande non identifiée - hors scope',
                needsRoom: false
            };
        }

        /**
         * Vérifie si le message contient des informations sur la salle
         */
        function hasRoomInformation(message) {
            // Rechercher les patterns de salle (ex: A-1750, a-1730, B-2500, SH-R200, DS-4000, etc.)
            const roomPattern = /\b([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})\b/i;
            const hasRoom = roomPattern.test(message);
            
            // Rechercher mentions de pavillon/bâtiment
            const buildingPattern = /\b(pavillon|bâtiment|building)\s+([a-zA-Z]{1,2})\b/i;
            const hasBuilding = buildingPattern.test(message);
            
            console.log(`🔍 [RoomDetection] Message: "${message}", Pattern détecté: ${hasRoom || hasBuilding}`);
            return hasRoom || hasBuilding;
        }

        /**
         * Gère les messages hors scope
         */
        function handleOutOfScopeMessage(message) {
            addMessage('system', '🤖 Je suis votre assistant audiovisuel pour cette salle. Je peux vous aider avec les problèmes de projecteur, microphone, son, etc. Que puis-je faire pour vous ?', {
                suggestions: ['Problème projecteur', 'Problème audio', 'Problème réseau']
            });
        }

        /**
         * Gère les problèmes réseau avec bannière moderne Services Informatiques
         */
        function handleNetworkProblem(message) {
            console.log('💻 [SIEscalation] Affichage de la bannière Services Informatiques pour problème réseau');
            
            // ✅ CORRECTION: Fermer toutes les bannières SI existantes AVANT d'en créer une nouvelle
            const existingSiBanners = document.querySelectorAll('[id^="escalation_si_"]');
            const existingSiOverlays = document.querySelectorAll('[id^="overlay_escalation_si_"]');
            
            existingSiBanners.forEach(banner => {
                console.log(`🚫 [CleanupSIBanner] Suppression bannière SI existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSiOverlays.forEach(overlay => {
                console.log(`🚫 [CleanupSIOverlay] Suppression overlay SI existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Créer la bannière SI avec overlay plein écran
            const escalationId = `escalation_si_${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou agressif
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
            
            // Créer la bannière SI
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
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">Problème réseau - Salle ${currentRoom}</span>
                    </div>
                    </div>
                    
                <div class="si-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les problèmes de réseau, connectivité Internet, Wi-Fi, ou équipements informatiques dans la salle ${currentRoom}, veuillez contacter les Services Informatiques.
                    </p>
                    
                    <div class="si-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="si-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">📞</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SI : 514-987-3000</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 5050)</span>
                            </div>
                        <div class="si-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">🌐</span>
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
                        ✕ Fermer
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
                        📞 Appeler SI
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
                        🌐 Site web
                    </button>
                        </div>
            `;
            
            // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // ✅ Empêcher la propagation des événements depuis la bannière
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`💻 [SIBanner] Bannière Services Informatiques affichée pour salle ${currentRoom}`);
        }

        /**
         * Gère les problèmes non-audiovisuels avec bannière moderne SIM
         */
        function handleNonAudiovisualProblem(message) {
            console.log('🏢 [SIMEscalation] Affichage de la bannière SIM pour problème non-audiovisuel');
            
            // ✅ CORRECTION: Fermer toutes les bannières SIM existantes AVANT d'en créer une nouvelle
            const existingSimBanners = document.querySelectorAll('[id^="escalation_sim_"]');
            const existingSimOverlays = document.querySelectorAll('[id^="overlay_escalation_sim_"]');
            
            existingSimBanners.forEach(banner => {
                console.log(`🚫 [CleanupSIMBanner] Suppression bannière SIM existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSimOverlays.forEach(overlay => {
                console.log(`🚫 [CleanupSIMOverlay] Suppression overlay SIM existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Créer la bannière SIM avec overlay plein écran
            const escalationId = `escalation_sim_${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou agressif
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
            
            // Créer la bannière SIM
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
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">Problème non-audiovisuel - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="sim-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les problèmes d'infrastructure, d'électricité, de plomberie, de chauffage ou de climatisation dans la salle ${currentRoom}, veuillez contacter le Service des Immeubles.
                    </p>
                    
                    <div class="sim-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="sim-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">📞</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SIM : 514-987-3141</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 3141)</span>
                        </div>
                        <div class="sim-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">🌐</span>
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
                        ✕ Fermer
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
                        📞 Appeler SIM
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
                        🌐 Site web
                    </button>
                </div>
            `;
            
            // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // ✅ Empêcher la propagation des événements depuis la bannière
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`🏢 [SIMBanner] Bannière SIM affichée pour salle ${currentRoom}`);
        }

        /**
         * Gère les problèmes AV externes avec salle
         */
        function handleExternalAVProblemWithRoom(message) {
            const currentRoom = getCurrentRoom();
            addMessage('system', `📞 <strong>Contact SEA</strong><br><br>Pour ce type d'équipement dans la salle ${currentRoom}, veuillez contacter directement le SEA au <strong>6135</strong>.`, {
                suggestions: ['Appeler SEA', 'Problème système', 'Autre salle']
            });
        }

        // ✅ NOUVEAU: Timer d'escalade automatique pour éviter les blocages
        let escalationTimeoutId = null;
        
        function startEscalationTimeout(problemType, room) {
            // Annuler le timer précédent si existant
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
            }
            
            escalationTimeoutId = setTimeout(() => {
                console.log(`⏰ [EscalationTimeout] Timeout atteint pour problème ${problemType} → Escalade forcée`);
                
                // ✅ CORRECTION: Vérifier les tickets existants AVANT l'escalade par timeout
                if (hasExistingTicket(room)) {
                    const lastTicket = getLastSessionTicket(room);
                    console.log(`🎫 [EscalationTimeout] Timeout mais ticket ${lastTicket.number} existe → Bannière ticket existant`);
                    showExistingTicketBanner(lastTicket);
                } else {
                    showSEAEscalationBanner({
                        intent: `${problemType}_problem`,
                        confidence: 0.95,
                        room: room,
                        escalation_needed: true,
                        escalation_reason: `Aucune correction automatique trouvée - Intervention technique requise`
                    });
                }
            }, 10000); // ✅ 10 secondes pour laisser le temps au RAG de répondre
        }
        
        function clearEscalationTimeout() {
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
                escalationTimeoutId = null;
                console.log('⏰ [EscalationTimeout] Timer d\'escalade annulé');
            }
        }
        // ===== BANNIÈRE D'ALLUMAGE PROJECTEUR (inspirée modale PJLink) =====
        
        function showProjectorPoweringBanner(roomName) {
            console.log(`🔌 [ProjectorPower] Bannière allumage projecteur pour ${roomName}`);
            
            // ✅ CORRECTION : Masquer le sablier diagnostic car bannière projecteur prend le relais
            hideDiagnosticLoading();
            console.log('✅ [ProjectorPower] Sablier diagnostic masqué - Bannière projecteur prend le relais');
            
            // Supprimer une éventuelle bannière existante
            const existingBanner = document.getElementById('projector-powering-banner');
            if (existingBanner) {
                existingBanner.remove();
            }
            
            // Créer la bannière d'allumage
            const banner = document.createElement('div');
            banner.id = 'projector-powering-banner';
            banner.className = 'projector-powering-banner show';
            
            banner.innerHTML = `
                <div class="powering-content">
                    <div class="powering-icon">
                        <i class="fas fa-power-off warming-rotation"></i>
                    </div>
                    <div class="powering-text">
                        <h3>🔌 Allumage du projecteur en cours...</h3>
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
            
            // Commencer la surveillance de l'état du projecteur
            startProjectorStatusMonitoring(roomName);
        }
        
        function startProjectorStatusMonitoring(roomName) {
            console.log(`👁️ [ProjectorMonitoring] Surveillance état projecteur ${roomName}`);
            
            let checkCount = 0;
            const maxChecks = 30; // 30 checks = 30 secondes max
            
            const monitoringInterval = setInterval(async () => {
                checkCount++;
                console.log(`🔍 [ProjectorMonitoring] Check ${checkCount}/${maxChecks} pour ${roomName}`);
                
                try {
                    // ✅ UTILISER API TEMPS RÉEL au lieu du cache
                    const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(roomName)}&refresh=true`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'success' && data.devices) {
                            const projector = data.devices.find(d => d.technology === 'PJLINK' || d.family_type === 'PJLINK');
                            
                            if (projector) {
                                console.log(`📊 [ProjectorMonitoring] État projecteur: ${projector.status}, Power: ${projector.power_state}`);
                                
                                // ✅ CRITÈRES PLUS LARGES pour détecter l'allumage
                                const isProjectorOn = projector.status === 'online' || 
                                                    projector.status === 'ON' || 
                                                    projector.power_state === 'ON' ||
                                                    projector.power_state === 'WARMUP' ||
                                                    projector.power_state === 'WARMING_UP';
                                
                                if (isProjectorOn) {
                                    console.log(`✅ [ProjectorMonitoring] Projecteur allumé ! Transition vers AV Mute`);
                                    clearInterval(monitoringInterval);
                                    
                                    // ✅ ATTENDRE 3 SECONDES avant AV Mute (temps de stabilisation)
                                    setTimeout(() => {
                                        updateProjectorBannerToAVMute(roomName);
                                        
                                                                // ✅ VÉRIFIER ET CORRIGER AV MUTE automatiquement
                        setTimeout(async () => {
                            console.log(`🎯 [ProjectorMonitoring] Vérification état AV Mute temps réel`);
                            await checkAndFixAVMuteStatus(roomName, projector.name || projector.device_name || `PROJ-${roomName}`);
                        }, 2000);
                                    }, 3000);
                                    return;
                                }
                            }
                        }
                    }
                    
                    // ✅ FALLBACK : Si après 10 checks toujours pas détecté, forcer AV Mute
                    if (checkCount >= 10) {
                        console.log(`🎯 [ProjectorMonitoring] Fallback après 10s → Forcer correction AV Mute`);
                        clearInterval(monitoringInterval);
                        updateProjectorBannerToAVMute(roomName);
                        
                        setTimeout(async () => {
                            console.log(`🎯 [ProjectorMonitoring] Fallback - Vérification AV Mute`);
                            await checkAndFixAVMuteStatus(roomName, `PROJ-${roomName}`); // Nom basé sur la salle
                        }, 2000);
                        return;
                    }
                    
                } catch (error) {
                    console.log(`⚠️ [ProjectorMonitoring] Erreur surveillance: ${error.message}`);
                }
                
                // Timeout après 30 secondes
                if (checkCount >= maxChecks) {
                    console.log(`⏰ [ProjectorMonitoring] Timeout surveillance pour ${roomName}`);
                    clearInterval(monitoringInterval);
                    hideProjectorPoweringBanner();
                }
            }, 1000); // Check toutes les secondes
        }
        
        function updateProjectorBannerToAVMute(roomName) {
            const banner = document.getElementById('projector-powering-banner');
            if (!banner) return;
            
            console.log(`🎯 [ProjectorBanner] Transition vers AV Mute pour ${roomName}`);
            
            // Mettre à jour le contenu pour AV Mute
            const content = banner.querySelector('.powering-content');
            if (content) {
                content.innerHTML = `
                    <div class="powering-icon">
                        <i class="fas fa-eye-slash av-mute-pulse"></i>
                    </div>
                    <div class="powering-text">
                        <h3>📺 Projecteur allumé - Correction AV Mute...</h3>
                        <p>Salle ${roomName} - Activation de l'affichage</p>
                        <div class="power-progress">
                            <div class="progress-bar">
                                <div class="progress-fill success-fill"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Auto-hide après 15 secondes (plus de temps pour voir)
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
                console.log(`🚫 [ProjectorBanner] Bannière allumage masquée`);
            }
        }
        
        // ✅ NOUVELLE FONCTION : Vérifier et corriger AV Mute temps réel
        async function checkAndFixAVMuteStatus(roomName, projectorName) {
            console.log(`🔇 [AVMuteCheck] Vérification état AV Mute pour ${projectorName} (${roomName})`);
            
            try {
                // ✅ ÉTAPE 1 : Vérifier l'état actuel AV Mute
                console.log(`🌐 [AVMuteCheck] URL appelée: ${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                const statusResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                
                console.log(`📡 [AVMuteCheck] Réponse statut: ${statusResponse.status} ${statusResponse.statusText}`);
                
                if (!statusResponse.ok) {
                    console.log(`❌ [AVMuteCheck] Erreur récupération statut: ${statusResponse.status}`);
                    const errorText = await statusResponse.text();
                    console.log(`📄 [AVMuteCheck] Détails erreur: ${errorText}`);
                    return;
                }
                
                const statusData = await statusResponse.json();
                console.log(`📊 [AVMuteCheck] Statut AV Mute:`, statusData);
                
                // ✅ ÉTAPE 2 : Si AV Mute actif → Le corriger
                if (statusData.av_muted) {
                    console.log(`🔇 [AVMuteCheck] AV Mute détecté → Correction automatique`);
                    
                    // ✅ BANNIÈRE D'ATTENTE ORANGE pendant correction (minimum 15 secondes)
                    showWaitingBanner('🔧 Correction AV Mute en cours...', 'Désactivation du mode muet sur le projecteur');
                    window.waitingBannerStartTime = Date.now(); // ✅ Nouveau timestamp
                    
                    // ✅ Utiliser l'endpoint direct AV Mute public (sans auth)
                    console.log(`🔧 [AVMuteCheck] Correction directe AV Mute sur ${projectorName}`);
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
                        console.log(`✅ [AVMuteCheck] AV Mute corrigé avec succès:`, fixData);
                        
                        // ✅ ATTENDRE MINIMUM 15 SECONDES pour que le client voie la bannière d'attente
                        console.log(`⏳ [AVMuteCheck] Bannière d'attente visible pendant 15s minimum...`);
                        setTimeout(async () => {
                            console.log(`🔍 [AVMuteCheck] Vérification post-correction...`);
                            const verifyResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                            if (verifyResponse.ok) {
                                const verifyData = await verifyResponse.json();
                                console.log(`📊 [AVMuteCheck] État post-correction:`, verifyData);
                                
                                if (!verifyData.av_muted) {
                                    console.log(`🎉 [AVMuteCheck] SUCCÈS CONFIRMÉ : AV Mute vraiment désactivé !`);
                                } else {
                                    console.log(`⚠️ [AVMuteCheck] PROBLÈME : AV Mute toujours actif après correction !`);
                                }
                            }
                            
                            // ✅ MASQUER BANNIÈRE D'ATTENTE et afficher succès
                            console.log(`🎯 [AVMuteCheck] Masquer bannière d'attente après 15s minimum`);
                            hideWaitingBanner();
                            setTimeout(() => {
                                // ✅ AFFICHER BANNIÈRE SUCCÈS APRÈS masquage bannière d'attente
                                showAutoActionResult(
                                    { 
                                        type: 'av_mute_correction', 
                                        description: 'Correction AV Mute terminée' 
                                    }, 
                                    { 
                                        success: true, 
                                        message: `AV Mute désactivé sur ${projectorName} - Image restaurée !` 
                                    }
                                );
                            }, 500);
                        }, 15000); // ✅ 15 secondes minimum pour bannière d'attente
                        
                    } else {
                        const errorData = await fixResponse.json();
                        console.log(`❌ [AVMuteCheck] Échec correction AV Mute: ${fixResponse.status}`, errorData);
                    }
                    
                } else {
                    console.log(`✅ [AVMuteCheck] AV Mute déjà inactif - Aucune correction nécessaire`);
                    
                    // ✅ CORRECTION : Ne pas afficher de bannière de succès prématurée
                    // Laisser la bannière d'attente active jusqu'à la fin complète du processus
                    console.log(`🎯 [AVMuteCheck] Projecteur opérationnel - Continuer avec la séquence normale`);
                    
                    // ✅ La bannière d'attente sera masquée par la logique principale quand tout sera terminé
                }
                
                            } catch (error) {
                console.log(`⚠️ [AVMuteCheck] Erreur vérification AV Mute: ${error.message}`);
            }
        }
        
        // ✅ FONCTION DE TEST MANUAL (temporaire)
        window.testAVMute = function() {
            const room = getCurrentRoom();
            if (room) {
                console.log(`🧪 [TEST] Test manuel AV Mute pour ${room}`);
                checkAndFixAVMuteStatus(room, `PROJ-${room}`);
            } else {
                console.log(`❌ [TEST] Aucune salle sélectionnée`);
            }
        }

        // ✅ NOUVELLE FONCTION DE TEST : Vérifier bannière d'attente
        window.testWaitingBanner = function() {
            console.log(`🧪 [TEST] Test bannière d'attente`);
            showWaitingBanner('🧪 Test bannière d\'attente', 'Ceci est un test de la bannière orange');
            
            // Masquer automatiquement après 5 secondes
            setTimeout(() => {
                hideWaitingBanner();
                console.log(`✅ [TEST] Bannière d'attente masquée automatiquement`);
            }, 5000);
        }

        // ✅ NOUVELLE FONCTION DE TEST : Vérifier état complet projecteur
        window.testProjectorStatus = async function() {
            const room = getCurrentRoom();
            if (!room) {
                console.log(`❌ [TEST] Aucune salle sélectionnée`);
                return;
            }
            
            console.log(`🧪 [TEST] Test état complet projecteur pour ${room}`);
            
            try {
                // Test 1: Power status
                console.log(`🔌 [TEST] Test endpoint power-status...`);
                const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${room}`);
                if (powerResponse.ok) {
                    const powerData = await powerResponse.json();
                    console.log(`✅ [TEST] Power status:`, powerData);
                } else {
                    console.log(`❌ [TEST] Power status non disponible: ${powerResponse.status}`);
                }
                
                // Test 2: AV Mute status
                console.log(`🔇 [TEST] Test endpoint av-mute-status...`);
                const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${room}`);
                if (avMuteResponse.ok) {
                    const avMuteData = await avMuteResponse.json();
                    console.log(`✅ [TEST] AV Mute status:`, avMuteData);
                } else {
                    console.log(`❌ [TEST] AV Mute status non disponible: ${avMuteResponse.status}`);
                }
                
            } catch (error) {
                console.log(`❌ [TEST] Erreur test: ${error.message}`);
            }
        }

        // ✅ NOUVELLE FONCTION DE TEST : Forcer masquage bannière d'attente
        window.forceHideWaitingBanner = function() {
            console.log(`🧪 [TEST] Forçage masquage bannière d'attente`);
            hideWaitingBanner();
            console.log(`✅ [TEST] Bannière d'attente forcément masquée`);
        }

        /**
         * Traite la réponse du backend (comme dans l'original)
         */
        function processResponse(data) {
            if (!data) return;

            console.log('📥 [Frontend] Réponse reçue:', data);
            
            // ✅ GESTION INTELLIGENTE du timer d'escalade selon la réponse
            if (data.auto_executed) {
                // Action corrective prise → Annuler le timer car problème potentiellement résolu
                console.log('✅ [EscalationTimeout] Action automatique exécutée - Timer annulé (problème corrigé)');
                clearEscalationTimeout();
            } else {
                // Pas d'action corrective → Garder le timer pour escalade si besoin
                console.log('⏰ [EscalationTimeout] Aucune action automatique - Timer maintenu pour escalade éventuelle');
            }
            
            // ✅ CORRECTION CRITIQUE : EXÉCUTION AUTOMATIQUE DES ACTIONS (comme assistant-salle-av-copie.html)
            if (data.auto_executed && data.actions && data.actions.length > 0) {
                console.log('🔄 [ProcessResponse] Exécution automatique des actions reçues');
                setTimeout(() => {
                    executeAutoActions(data.actions);
                }, 1000); // Attendre 1 seconde pour que le message soit affiché
            }
            
                            // ✅ Si action réussie, incrémenter compteur et vérifier AV Mute
                if (data.auto_executed && data.auto_result && data.auto_result.includes('✅')) {
                    console.log('🎯 [ProcessResponse] Action réussie - Incrémenter compteur de corrections');
                    
                    // Incrémenter le compteur de corrections pour adapter le message suivant
                    const currentRoom = getCurrentRoom();
                    if (currentRoom) {
                        const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
                        const nbCorrections = parseInt(sessionCorrections);
                        sessionStorage.setItem(`corrections_${currentRoom}`, `${nbCorrections + 1}`);
                        console.log(`📊 [ProcessResponse] Corrections pour ${currentRoom}: ${nbCorrections + 1}`);
                        
                        // ✅ FORCER VÉRIFICATION AV MUTE après action réussie
                        if (data.auto_result.includes('Allumer')) {
                            console.log('🔇 [ProcessResponse] Action allumage détectée - Vérification AV Mute dans 3s');
                            setTimeout(async () => {
                                await checkAndFixAVMuteStatus(currentRoom, `PROJ-${currentRoom}`);
                            }, 3000); // 3 secondes pour stabilisation
                        }
                    }
                }
                
                // ✅ CORRECTION : Gérer le cas où auto_executed est true mais actions est vide (action déjà exécutée côté serveur)
            if (data.auto_executed && (!data.actions || data.actions.length === 0)) {
                console.log('🔄 [ProcessResponse] Action déjà exécutée côté serveur - MASQUER BANNIÈRE D\'ATTENTE');
                
                // ✅ ANNULER IMMÉDIATEMENT le timer d'escalade car action déjà exécutée
                clearEscalationTimeout();
                console.log('🚫 [ProcessResponse] Timer escalade annulé - Action déjà exécutée côté serveur');
                
                // ✅ MASQUER LA BANNIÈRE D'ATTENTE après un délai minimum (adaptatif selon le type d'action)
                const bannerStartTime = window.waitingBannerStartTime || Date.now();
                const elapsedTime = Date.now() - bannerStartTime;
                
                // ✅ CORRECTION : Délai adaptatif selon le type d'action
                let minimumTime = 5000; // Par défaut 5 secondes
                
                // Pour les projecteurs, attendre plus longtemps pour l'allumage complet
                if (data.solutions && data.solutions.some(sol => 
                    sol.actions && sol.actions.some(act => act.type === 'pjlink_power')
                )) {
                    minimumTime = 15000; // 15 secondes minimum pour les projecteurs
                    console.log(`🔌 [ProcessResponse] Action projecteur détectée - Délai minimum étendu à ${minimumTime}ms`);
                }
                
                const remainingTime = Math.max(0, minimumTime - elapsedTime);
                console.log(`⏳ [ProcessResponse] Bannière affichée depuis ${elapsedTime}ms, masquer dans ${remainingTime}ms`);
                
                setTimeout(() => {
                    hideWaitingBanner();
                    console.log('✅ [ProcessResponse] Bannière d\'attente masquée après action serveur');
                    
                    // ✅ AFFICHER BANNIÈRE SUCCÈS APRÈS masquage bannière d'attente
                    setTimeout(() => {
                        showAutoActionResult(
                            { 
                                type: 'auto_correction', 
                                description: 'Correction automatique terminée' 
                            }, 
                            { 
                                success: true, 
                                message: 'Problème résolu automatiquement par le système !' 
                            }
                        );
                    }, 500);
                }, remainingTime);
                
                return; // ✅ STOPPER le traitement pour éviter escalade
            }
            
            // 🔍 DEBUG: Analyser les actions pour comprendre pourquoi l'escalade ne se déclenche pas
            if (data.actions && data.actions.length > 0) {
                console.log('🔍 [DEBUG] Actions trouvées:');
                data.actions.forEach((action, index) => {
                    console.log(`  ${index}: Type: ${action.type}, Command: ${action.command}, Label: ${action.label}`);
                    console.log(`      Description: ${action.description}`);
                });
            }

            // ✅ LOGIQUE PROFESSIONNELLE AMÉLIORÉE : Détecter "Tout fonctionne mais client insiste"
            const hasOnlyEscalationActions = data.actions && data.actions.length > 0 && 
                                           data.actions.every(action => 
                                               action.type === 'create_sea_ticket' || 
                                               action.command === 'create_ticket' ||
                                               action.label?.includes('Ticket SEA') ||
                                               action.label?.includes('Escalade')
                                           );
            
            // ✅ NOUVELLE LOGIQUE: Actions techniques non auto-exécutées = équipements fonctionnels
            const hasTechnicalActionsNotExecuted = data.actions && data.actions.length > 0 && 
                                                  data.actions.some(action => 
                                                      (action.type === 'pjlink_power' || 
                                                       action.type === 'pjlink_av_mute' || 
                                                       action.type === 'sennheiser_mute') && 
                                                      !data.auto_executed
                                                  );
            
            // ✅ ESCALADE SIMPLIFIÉE : Si pas d'auto-correction, escalade directe immédiate
            if ((data.intent === 'video_problem' || data.intent === 'audio_problem') && 
                !data.auto_executed) {
                
                const problemType = data.intent === 'video_problem' ? 'vidéo' : 'audio';
                console.log(`🎯 [EscaladeDirecte] Problème ${problemType.toUpperCase()} sans correction automatique → ESCALADE IMMÉDIATE`);
                
                // ✅ CORRECTION: Vérifier les tickets existants AVANT d'afficher la bannière SEA
                const currentRoom = getCurrentRoom();
                if (hasExistingTicket(currentRoom)) {
                    const lastTicket = getLastSessionTicket(currentRoom);
                    console.log(`🎫 [TicketExistant] Ticket déjà créé ${lastTicket.number} → Affichage bannière ticket existant au lieu de SEA`);
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
                    escalation_reason: `Problème ${problemType} signalé - Intervention technique requise`
                });
                return; // ✅ STOP - Escalade directe sans message
            }

            // ✅ LOGIQUE SIMPLIFIÉE FINALE : Plus de traitement complexe
            // Stocker juste le contexte pour les tickets si besoin
            latestRAGContext = data.rag_context || data;

            // ✅ LOGIQUE SIMPLIFIÉE : Supprimer TOUS les messages de diagnostic en bas
            // L'utilisateur veut seulement : Correction automatique OU escalade directe
            // Pas de messages intermédiaires "diagnostic", "problème mineur", etc.
            
            console.log('🚫 [ProcessResponse] TOUS les messages de diagnostic supprimés - Logique binaire uniquement');
            // Plus de messages en bas du chat - Bannières uniquement
        }

        /**
         * Détermine la raison de l'escalade (comme dans l'original)
         */
        function determineEscalationReason(data, escalationActions) {
            if (escalationActions.length > 0) {
                return "Le système recommande de créer un ticket SEA pour ce problème.";
            }
            if (data.confidence && data.confidence < 0.6) {
                return "Le système n'est pas sûr de pouvoir résoudre ce problème automatiquement.";
            }
            if (data.solutions && data.solutions.length === 0 && data.problems && data.problems.length > 0) {
                return "Aucune solution automatique n'a été trouvée pour ce problème.";
            }
            return "Une intervention technique pourrait être nécessaire.";
        }

        /**
         * Affiche à nouveau les palettes de problèmes
         */
        function showProblemPalettes() {
            const problemPalettes = document.getElementById('problemPalettes');
            const assistantResponse = document.getElementById('assistantResponse');
            
            // Afficher les palettes
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // Supprimer la réponse de l'assistant
            if (assistantResponse) {
                assistantResponse.remove();
            }
            
            // Supprimer tous les résultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * Exécute les actions automatiques
         */
        async function executeAutoActions(actions) {
            // ✅ AFFICHER BANNIÈRE D'ATTENTE ORANGE pendant exécution des actions
            showWaitingBanner('🔧 Exécution des corrections...', 'Veuillez patienter pendant l\'application des solutions');
            
            for (const action of actions) {
                try {
                    console.log(`🔄 Exécution action automatique: ${action.type}`);
                    
                    // ✅ Mettre à jour le message de la bannière selon l'action
                    if (action.type === 'pjlink_power') {
                        showWaitingBanner('🔌 Allumage du projecteur...', 'Démarrage en cours, veuillez patienter');
                    } else if (action.type === 'pjlink_av_unmute') {
                        showWaitingBanner('🔧 Correction AV Mute...', 'Désactivation du mode muet sur le projecteur');
                    }
                    
                    // Exécuter l'action réelle selon son type
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
                            result = { success: true, message: 'Action simulée' };
                    }
                    
                    // Afficher le résultat dans une bannière de succès
                    if (result && result.success) {
                        showAutoActionResult(action, result);
                    }
                    
                } catch (error) {
                    console.error(`Erreur lors de l'exécution de l'action ${action.type}:`, error);
                    showAutoActionResult(action, { success: false, message: error.message });
                }
            }
            
            // ✅ MASQUER BANNIÈRE D'ATTENTE après toutes les actions terminées
            hideWaitingBanner();
            
            // Retour automatique à l'accueil après toutes les actions
            setTimeout(() => {
                console.log('🔄 [AutoActions] Retour automatique à l\'accueil après actions complètes');
                returnToHome();
            }, 3000);
        }

        /**
         * Affiche le résultat d'une action automatique
         */
        function showAutoActionResult(action, result) {
            console.log(`📊 [AutoActionResult] ${action.type}: ${result.success ? 'SUCCÈS' : 'ÉCHEC'} - ${result.message}`);
            
            if (result.success) {
                // ✅ CORRECTION : Annuler le timer d'escalade car problème résolu automatiquement
                clearEscalationTimeout();
                console.log('🚫 [EscalationTimeout] Timer d\'escalade annulé suite à correction automatique réussie');
                
                // ✅ BANNIÈRE INTERACTIVE DE CORRECTION avec question OUI/NON
                showInteractiveCorrectionBanner(action, result);
            } else {
                // ❌ Petite bannière d'erreur (droite)
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
                        <span style="font-size: 1.2rem;">❌</span>
                        <span><strong>${action.description || action.type}</strong></span>
                    </div>
                    <div style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.85rem;">
                        ${result.message || 'Erreur lors de l\'exécution'}
                    </div>
                `;
                
                document.body.appendChild(bannerDiv);
                
                // Supprimer automatiquement après 4 secondes
                setTimeout(() => {
                    if (bannerDiv.parentNode) {
                        bannerDiv.style.animation = 'slideOutRight 0.3s ease-in';
                        setTimeout(() => bannerDiv.remove(), 300);
                    }
                }, 4000);
            }
        }
        /**
         * ✅ NOUVELLE FONCTION : Bannière interactive de correction avec question OUI/NON
         */
        function showInteractiveCorrectionBanner(action, result) {
            console.log(`🎯 [InteractiveCorrection] Affichage bannière interactive: ${action.description}`);
            
            // ✅ NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la bannière
            hideDiagnosticLoading();
            
            const bannerId = `interactive-correction-${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou
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
            
            // Créer la bannière interactive avec style moderne
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
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">✅</div>
                <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem; font-weight: 600;">Correction automatique terminée !</h2>
                
                <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 12px; margin: 2rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>🔧 Action effectuée :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>🏢 Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>📝 Détails :</strong> ${result.message || 'Problème résolu automatiquement'}</p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1.4rem; font-weight: 500;">Votre problème est-il réglé ?</h3>
                    
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
                            ✅ OUI
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
                            ❌ NON
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; opacity: 0.8; font-size: 0.9rem;">
                    Cliquez sur OUI si le problème est résolu, ou NON pour demander une intervention technique
                </div>
            `;
            
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            // ✅ GESTION CLIC BOUTON OUI
            const btnOui = document.getElementById(`btn-oui-${bannerId}`);
            if (btnOui) {
                btnOui.addEventListener('click', () => {
                console.log('✅ [InteractiveCorrection] Utilisateur confirme - Problème résolu');
                
                // Masquer la bannière avec animation
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // Retour à l'accueil
                setTimeout(() => {
                    returnToHome();
                }, 500);
                });
            }
            
            // ✅ GESTION CLIC BOUTON NON
            const btnNon = document.getElementById(`btn-non-${bannerId}`);
            if (btnNon) {
                btnNon.addEventListener('click', () => {
                console.log('❌ [InteractiveCorrection] Utilisateur confirme - Problème persiste');
                
                // Masquer la bannière interactive
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // ✅ AFFICHER BANNIÈRE ESCALADE après masquage
                setTimeout(() => {
                    const currentRoom = getCurrentRoom();
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.9,
                        room: currentRoom,
                        escalation_needed: true,
                        escalation_reason: `Problème persiste après correction automatique - Intervention technique requise`
                    });
                }, 500);
                });
            }
            
            // ✅ GESTION CLIC OVERLAY (fermeture)
            overlayDiv.addEventListener('click', (e) => {
                if (e.target === overlayDiv) {
                    console.log('🔄 [InteractiveCorrection] Fermeture par clic overlay');
                    
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
            console.log(`⏳ [WaitingBanner] Affichage bannière d'attente: ${title}`);
            
            // ✅ CORRECTION : Masquer le sablier diagnostic car bannière d'attente prend le relais
            hideDiagnosticLoading();
            console.log('✅ [WaitingBanner] Sablier diagnostic masqué - Bannière d\'attente prend le relais');
            
            // Supprimer toute bannière d'attente existante
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
            
            // Animation d'entrée
            setTimeout(() => {
                banner.classList.add('visible');
            }, 50);
        }
        
        function hideWaitingBanner() {
            const existingBanner = document.getElementById('waiting-banner');
            if (existingBanner) {
                console.log(`🚫 [WaitingBanner] Masquage bannière d'attente`);
                existingBanner.classList.add('fade-out');
                setTimeout(() => {
                    if (existingBanner.parentNode) {
                        existingBanner.parentNode.removeChild(existingBanner);
                    }
                }, 300);
            }
        }

        /**
         * Affiche une bannière de succès plein écran (style SEA mais verte)
         */
        function showSuccessBanner(action, result) {
            const confirmationId = `success_${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou agressif
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
            
            // Créer la bannière de succès avec style moderne
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
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Problème résolu automatiquement !</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>🔧 Action :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>🏢 Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>⚡ Statut :</strong> Corrigé en temps réel</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    ${result.message || 'Le système a détecté et corrigé automatiquement le problème. Aucune intervention manuelle nécessaire !'}
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
                    🎉 Parfait !
                </button>
            `;
            
            // Fermer au clic sur l'overlay
            overlayDiv.onclick = () => closeSuccessBanner(confirmationId);
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(successDiv);
            
            // ✅ FERMETURE AUTOMATIQUE APRÈS 15 SECONDES (plus visible)
            setTimeout(() => {
                closeSuccessBanner(confirmationId);
            }, 15000);
            
            console.log(`🎉 [SuccessBanner] Bannière de succès affichée pour: ${action.description}`);
        }

        /**
         * Ferme la bannière de succès
         */
        function closeSuccessBanner(confirmationId) {
            const overlay = document.getElementById(`overlay_${confirmationId}`);
            const banner = document.getElementById(confirmationId);
            
            if (overlay) overlay.remove();
            if (banner) banner.remove();
            
            // Retour automatique à l'accueil après fermeture
            console.log('🏠 [SuccessBanner] Retour automatique à l\'accueil');
            returnToHome();
        }

        /**
         * Exécute une action sur un équipement
         */
        async function executeAction(actionType, deviceId, parameters) {
            try {
                console.log(`🔄 [ExecuteAction] Exécution de l'action : ${actionType}...`);
                
                let endpoint = '';
                let payload = {};
                
                // Déterminer l'endpoint selon le type d'action
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
                        // ✅ CORRECTION JUMELÉE : Traitement spécial pour AV Mute invisible + bannière
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${parameters.device_name}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                console.log(`✅ [ExecuteAction] AV Mute désactivé avec succès sur ${parameters.device_name}`);
                                
                                // ✅ SIMULATION : Créer une réponse comme si c'était auto-exécuté par le RAG
                                return {
                                    success: true,
                                    auto_executed: true, // ✅ MARQUER comme auto-exécuté
                                    auto_result: `✅ AV Mute désactivé automatiquement sur ${parameters.device_name}`,
                                    simulated_rag_response: true
                                };
                            } else {
                                throw new Error(`Erreur HTTP ${response.status}`);
                            }
                        } catch (error) {
                            console.error(`❌ [ExecuteAction] Erreur AV Mute pour ${parameters.device_name}:`, error);
                            throw error;
                        }
                        return; // Éviter l'exécution du code standard
                        
                    default:
                        throw new Error(`Type d'action non supporté: ${actionType}`);
                }
                
                // Exécuter l'action
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
                    console.log(`✅ [ExecuteAction] Action exécutée avec succès: ${result.message}`);
                    
                    // ✅ NOUVEAU: Logique séquentielle pour allumage de projecteur
                    if (actionType === 'pjlink_power' && parameters.power_on === true) {
                        const deviceName = parameters.device_name || 'Projecteur';
                        console.log(`⏱️ [SequentialLogic] Allumage détecté pour ${deviceName} - Démarrage bannière d'attente`);
                        
                        // Afficher la bannière d'attente avec séquence complète
                        showSequentialProjectorBanner(deviceName, 'power_on', {
                            maxDuration: 35,
                            checkAfterPowerOn: true
                        });
                    }
                    
                    return result;
                } else {
                    throw new Error(result.message || 'Échec de l\'exécution');
                }
                
            } catch (error) {
                console.error('❌ [ExecuteAction] Erreur lors de l\'exécution de l\'action:', error);
                throw error;
            }
        }

        /**
         * ✅ NOUVEAU: Affiche une bannière d'attente pour l'allumage de projecteur
         */
        function showSequentialProjectorBanner(deviceName, actionType, options = {}) {
            const bannerId = `seq_projector_${Date.now()}`;
            console.log(`🎬 [SequentialBanner] Démarrage bannière ${actionType} pour ${deviceName}`);
            
            // Supprimer les bannières existantes
            document.querySelectorAll('.sequential-banner-overlay').forEach(banner => banner.remove());
            
            // Configuration selon le type d'action
            const config = getSequentialBannerConfig(actionType, deviceName, options);
            
            // Créer l'overlay
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
            
            // Créer la bannière
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
            
            // Démarrer la logique séquentielle selon le type
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
         * ✅ NOUVEAU: Configuration des bannières selon le type d'action
         */
        function getSequentialBannerConfig(actionType, deviceName, options) {
            const configs = {
                power_on: {
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                    borderColor: '#3b82f6',
                    html: `
                        <div class="sequential-content">
                            <div class="projector-icon-animated" style="font-size: 4rem; margin-bottom: 1.5rem; animation: powerBlink 1.2s infinite;">📽️</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Allumage en cours</h3>
                            <p style="margin: 0 0 2rem 0; font-size: 1.2rem; opacity: 0.95;">Le projecteur <strong>${deviceName}</strong> démarre...</p>
                            
                            <div class="progress-section">
                                <div class="status-text" style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">
                                    🔌 Envoi de la commande d'allumage
                                </div>
                                
                                <div class="real-time-monitor" style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                                    <div class="monitor-title" style="font-weight: 600; margin-bottom: 1rem;">Surveillance temps réel</div>
                                    <div class="monitor-status" id="monitor_${deviceName}" style="font-family: monospace; font-size: 0.9rem;">
                                        ⏳ Vérification de l'état...
                                    </div>
                                </div>
                                
                                <div class="countdown-section" style="margin-top: 2rem;">
                                    <div class="countdown-timer" style="font-size: 1.1rem; font-weight: 600; color: #fbbf24;">
                                        ⏱️ Surveillance active - Maximum 45s
                                    </div>
                                </div>
                            </div>
                            
                            <p style="margin: 2rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                ⚡ Analyse automatique AV Mute après allumage confirmé
                            </p>
                        </div>
                    `
                },
                av_unmute: {
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    borderColor: '#10b981',
                    html: `
                        <div class="sequential-content">
                            <div class="correction-icon" style="font-size: 4rem; margin-bottom: 1.5rem; animation: successPulse 1s infinite;">✅</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Correction AV Mute</h3>
                            <p style="margin: 0 0 1.5rem 0; font-size: 1.2rem; opacity: 0.95;">
                                Désactivation AV Mute sur <strong>${deviceName}</strong>
                            </p>
                            
                            <div class="correction-progress" style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1.5rem; margin: 1rem 0;">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">🔇 → 📽️ Commande envoyée</div>
                                <div style="font-size: 0.9rem; opacity: 0.8;">L'image devrait apparaître immédiatement</div>
                            </div>
                            
                            <p style="margin: 1.5rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                Cette bannière se fermera automatiquement dans 3 secondes
                            </p>
                        </div>
                    `
                }
            };
            
            return configs[actionType] || configs.power_on;
        }
        
        /**
         * ✅ NOUVEAU: Ajouter les styles CSS pour les bannières séquentielles
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
         * ✅ NOUVEAU: Gère le compte à rebours de la bannière d'attente
         */
        function startCountdown(bannerId, totalSeconds) {
            const banner = document.getElementById(bannerId);
            if (!banner) return;
            
            const progressBar = banner.querySelector('.progress-bar');
            const countdownTimer = banner.querySelector('.countdown-timer');
            
            let remainingSeconds = totalSeconds;
            
            const interval = setInterval(() => {
                remainingSeconds--;
                
                // Mettre à jour le timer
                if (countdownTimer) {
                    countdownTimer.textContent = `${remainingSeconds}s`;
                }
                
                // Mettre à jour la barre de progression
                if (progressBar) {
                    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
                    progressBar.style.width = `${progress}%`;
                }
                
                // Fin du compte à rebours
                if (remainingSeconds <= 0) {
                    clearInterval(interval);
                    // Fermer la bannière et vérifier l'état
                    setTimeout(() => {
                        closeWaitingBanner(bannerId);
                        // ✅ NOUVEAU: Déclencher une nouvelle vérification automatique
                        recheckProjectorStatus();
                    }, 1000);
                }
            }, 1000);
            
            // Stocker l'interval pour pouvoir l'annuler si nécessaire
            if (banner) {
                banner.dataset.intervalId = interval;
            }
        }
        
        /**
         * ✅ NOUVEAU: Ferme la bannière d'attente
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
         * ✅ NOUVEAU: Séquence d'allumage avec surveillance temps réel
         */
        async function startPowerOnSequence(bannerId, deviceName, options) {
            console.log(`🔌 [PowerOnSequence] Démarrage surveillance pour ${deviceName}`);
            
            const maxDuration = 45; // 45 secondes maximum
            const checkInterval = 3; // Vérifier toutes les 3 secondes
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
                    // Vérifier l'état du projecteur
                    const currentRoom = getCurrentRoom();
                    const equipmentData = await fetchRoomEquipment(currentRoom);
                    
                    // ✅ CORRECTION: Utiliser equipmentData.devices (pas equipmentData directement)
                    if (!equipmentData || !equipmentData.devices || !Array.isArray(equipmentData.devices)) {
                        console.warn(`⚠️ [PowerOnSequence] Données équipements invalides: ${JSON.stringify(equipmentData)}`);
                        updateMonitorStatus(`⚠️ Erreur accès équipements (${elapsed}s)`);
                        return;
                    }
                    
                    console.log(`🔍 [PowerOnSequence] ${equipmentData.devices.length} équipements trouvés en salle ${currentRoom}`);
                    
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
                        console.log(`🔍 [PowerOnSequence] Projecteur trouvé: ${projector.device_name || projector.name}, État: ${projector.status} (${elapsed}s)`);
                        
                        if (projector.status === 'online' || projector.status === 'power_on') {
                            powerOnDetected = true;
                            updateMonitorStatus('✅ Projecteur allumé - Analyse AV Mute...', true);
                            clearInterval(interval);
                            
                            // Délai pour laisser le projecteur se stabiliser
                            setTimeout(() => {
                                startAVMuteAnalysis(bannerId, deviceName, projector);
                            }, 2000);
                            return;
                        } else {
                            updateMonitorStatus(`⏳ Allumage en cours... État: ${projector.status} (${elapsed}s/${maxDuration}s)`);
                        }
                    } else {
                        console.log(`🔍 [PowerOnSequence] Équipements disponibles:`, equipmentData.devices.map(d => ({ name: d.device_name || d.name, status: d.status })));
                        updateMonitorStatus(`⚠️ Projecteur ${deviceName} non trouvé (${elapsed}s)`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PowerOnSequence] Erreur vérification: ${error}`);
                    updateMonitorStatus(`❌ Erreur vérification (${elapsed}s)`);
                }
                
                // Timeout après 45 secondes - VÉRIFICATION FINALE AVANT ESCALADE
                if (elapsed >= maxDuration) {
                    clearInterval(interval);
                    if (!powerOnDetected) {
                        console.log(`🔍 [PowerOnSequence] TIMEOUT ${maxDuration}s atteint - Vérification finale avant escalade pour ${deviceName}`);
                        updateMonitorStatus('⏰ Timeout atteint - Vérification finale...');
                        
                        setTimeout(async () => {
                            try {
                                // ✅ DERNIÈRE VÉRIFICATION avant escalade
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
                                    
                                                                        // ✅ CORRECTION : Utiliser vérification temps réel au lieu du cache statique
                                    console.log(`🔍 [PowerOnSequence] Vérification temps réel finale pour ${deviceName}...`);
                                    
                                    try {
                                        const realtimeStatus = await fetchProjectorRealtimeStatus(deviceName);
                                        
                                        if (realtimeStatus && realtimeStatus.is_online) {
                                            const powerOn = realtimeStatus.power_status === 'on' || realtimeStatus.power_status === 'ON';
                                            const hasAVMute = realtimeStatus.av_mute_video || realtimeStatus.av_mute_audio;
                                            
                                            console.log(`✅ [PowerOnSequence] État temps réel: power=${realtimeStatus.power_status}, AVMute=${hasAVMute}`);
                                            
                                            if (powerOn) {
                                                if (hasAVMute) {
                                                    console.log(`🔇 [PowerOnSequence] AV Mute détecté → Correction automatique invisible`);
                                                    updateMonitorStatus('🔇 Correction AV Mute automatique...');

                                                    // ✅ Correction AV Mute INVISIBLE
                                                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${deviceName}`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' }
                                                    });
                                                    
                                                    if (avMuteResponse.ok) {
                                                        console.log(`✅ [PowerOnSequence] PROBLÈME RÉSOLU: AV Mute corrigé sur ${deviceName}`);
                                                        updateMonitorStatus('✅ Problème vidéo résolu !', true);
                                                        
                                                        // ✅ AFFICHER BANNIÈRE DE SUCCÈS (pas d'escalade)
                                                        setTimeout(() => {
                                                            closeSequentialBanner(bannerId);
                                                            showAutoResultBanner(`✅ Problème vidéo résolu automatiquement sur ${deviceName}`);
                                                        }, 2000);
                                                        return;
                                                    }
                                                } else {
                                                    // ✅ CORRECTION LOGIQUE : Projecteur allumé sans AV Mute, mais problème vidéo signalé → Vérification approfondie
                                                    console.log(`🎯 [PowerOnSequence] Projecteur ${deviceName} allumé sans AV Mute - Vérification si problème persiste`);
                                                    updateMonitorStatus('🔍 Projecteur fonctionnel - Vérification problème persistant...');
                                                    
                                                    // ✅ NOUVELLE LOGIQUE : Au lieu de considérer le problème résolu, escalader si problème persiste
                                                    setTimeout(() => {
                                                        closeSequentialBanner(bannerId);
                                                        // Déclencher l'escalade car équipement fonctionne mais problème vidéo persiste
                                                        setTimeout(() => {
                                                            console.log('🎯 [PowerOnSequence] Escalade - Équipement fonctionnel mais problème vidéo persiste');
                                                            showSEAEscalationBanner({
                                                                intent: 'video_problem',
                                                                confidence: 0.9,
                                                                room: getCurrentRoom(),
                                                                problems: [{
                                                                    room: getCurrentRoom(),
                                                                    device: deviceName,
                                                                    severity: 'medium',
                                                                    reason: `Projecteur ${deviceName} allumé et fonctionnel mais problème vidéo persistant`
                                                                }],
                                                                escalation_needed: true,
                                                                escalation_reason: `Projecteur ${deviceName} opérationnel mais problème vidéo non résolu - Diagnostic spécialisé requis`
                                                            });
                                                        }, 500);
                                                    }, 2000);
                                                    return;
                                                }
                                            }
                                        }
                                    } catch (realtimeError) {
                                        console.error(`⚠️ [PowerOnSequence] Erreur vérification temps réel:`, realtimeError);
                                    }
                                }
                                
                                // ❌ Si toujours pas allumé après vérification finale
                                console.log(`❌ [PowerOnSequence] VÉRIFICATION FINALE ÉCHOUÉE: Projecteur ${deviceName} toujours pas allumé - Escalade nécessaire`);
                                updateMonitorStatus('❌ Projecteur non allumé - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    // Escalade automatique après vérification finale
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `Échec allumage ${deviceName} après ${maxDuration}s + vérification finale`
                                    });
                                }, 2000);
                                
                            } catch (error) {
                                console.error(`❌ [PowerOnSequence] Erreur vérification finale:`, error);
                                updateMonitorStatus('❌ Erreur vérification - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `Erreur technique vérification finale ${deviceName}`
                                    });
                                }, 2000);
                            }
                        }, 1000);
                    }
                }
            }, checkInterval * 1000);
        }
        
        /**
         * ✅ NOUVEAU: Analyse automatique AV Mute après allumage
         */
        async function startAVMuteAnalysis(bannerId, deviceName, projectorData = null) {
            console.log(`🔇 [AVMuteAnalysis] Analyse AV Mute pour ${deviceName}`, projectorData);
            
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
                updateMonitorStatus('🔍 Analyse AV Mute en cours...');
                
                // Attendre un peu pour que le projecteur se stabilise
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // ✅ MÉTHODE 1: Tenter diagnostic direct en interrogeant le problème vidéo
                console.log(`🔇 [AVMuteAnalysis] Tentative diagnostic AV Mute via problème vidéo`);
                
                // ✅ S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Écran noir projecteur ${deviceName}`,
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
                    console.log('🔍 [AVMuteAnalysis] Réponse backend diagnostic:', data);
                    
                    // Chercher des actions de correction AV Mute
                    const avMuteActions = data.actions ? data.actions.filter(action => 
                        action.type === 'pjlink_av_unmute' || 
                        action.type === 'pjlink_av_mute' ||
                        (action.description && action.description.toLowerCase().includes('av mute')) ||
                        (action.description && action.description.toLowerCase().includes('désactiver') && action.description.toLowerCase().includes('mute'))
                    ) : [];
                    
                    console.log(`🔇 [AVMuteAnalysis] Actions AV Mute trouvées:`, avMuteActions);
                    
                    if (avMuteActions.length > 0) {
                        updateMonitorStatus('🔇 AV Mute détecté - Correction automatique...');
                        
                        // Prendre la première action AV unmute trouvée
                        const avMuteAction = avMuteActions[0];
                        console.log(`🔇 [AVMuteAnalysis] Exécution action:`, avMuteAction);
                        
                        try {
                            // Construire les paramètres pour l'action
                            const actionParams = {
                                device_name: deviceName,
                                video_mute: false,
                                audio_mute: false,
                                ...avMuteAction.parameters
                            };
                            
                            await executeAction('pjlink_av_mute', avMuteAction.device_id || 0, actionParams);
                            updateMonitorStatus('✅ AV Mute corrigé - Projecteur opérationnel !', true);
                            
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 3000);
                            
                        } catch (actionError) {
                            console.error(`❌ [AVMuteAnalysis] Erreur exécution action:`, actionError);
                            updateMonitorStatus('⚠️ Erreur correction AV Mute - Vérifiez manuellement');
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 4000);
                        }
                        
                    } else {
                        // ✅ CORRECTION ESCALADE : Pas d'AV Mute détecté sur projecteur allumé → Escalade SEA
                        console.log(`🎯 [AVMuteAnalysis] Aucun AV Mute détecté sur projecteur allumé ${deviceName} → Escalade requise`);
                        updateMonitorStatus('🎯 Projecteur opérationnel - Escalade technique nécessaire...');
                        
                        // Préparer le contexte d'escalade
                        const escalationContext = {
                            intent: 'video_problem',
                            confidence: 0.9,
                            room: getCurrentRoom(),
                            problems: [{
                                room: getCurrentRoom(),
                                device: deviceName,
                                severity: 'medium',
                                reason: `Problème vidéo persistant sur ${deviceName} - Équipement fonctionnel mais problème non résolu`
                            }],
                            solutions: [],
                            escalation_needed: true,
                            escalation_reason: `Projecteur ${deviceName} fonctionnel mais problème vidéo persiste - Diagnostic approfondi requis`
                        };
                        
                        // Fermer la bannière et escalader
                        setTimeout(() => {
                            closeSequentialBanner(bannerId);
                            // Déclencher l'escalade SEA après fermeture
                            setTimeout(() => {
                                console.log('🎯 [AVMuteAnalysis] Déclenchement escalade SEA pour problème non résolu');
                                showSEAEscalationBanner(escalationContext);
                            }, 500);
                        }, 1500);
                    }
                    
                } else {
                    console.error(`❌ [AVMuteAnalysis] Erreur HTTP ${response.status}`);
                    updateMonitorStatus('⚠️ Erreur diagnostic - Projecteur probablement opérationnel');
                    setTimeout(() => {
                        closeSequentialBanner(bannerId);
                    }, 3000);
                }
                    
                } catch (error) {
                console.error(`❌ [AVMuteAnalysis] Erreur générale:`, error);
                updateMonitorStatus('❌ Erreur analyse AV Mute - Vérifiez manuellement');
                setTimeout(() => {
                    closeSequentialBanner(bannerId);
                }, 3000);
            }
        }
        
        /**
         * ✅ NOUVEAU: Séquence pour correction AV Mute directe
         */
        function startAVUnmuteSequence(bannerId, deviceName, options) {
            console.log(`✅ [AVUnmuteSequence] Correction AV Mute pour ${deviceName}`);
            
            // Fermer automatiquement après 3 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 3000);
        }
        
        /**
         * ✅ NOUVEAU: Séquence de monitoring générique
         */
        function startMonitoringSequence(bannerId, deviceName, options) {
            console.log(`👀 [MonitoringSequence] Surveillance générique pour ${deviceName}`);
            
            // Pour l'instant, fermer après 5 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 5000);
        }

        /**
         * ✅ NOUVEAU: Fermer la bannière séquentielle
         */
        function closeSequentialBanner(bannerId) {
            const banner = document.getElementById(bannerId);
            const overlay = document.getElementById(`overlay_${bannerId}`);
            
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    overlay.remove();
                    console.log(`🏁 [SequentialBanner] Bannière ${bannerId} fermée`);
                }, 300);
            }
        }

        /**
         * ✅ ANCIEN: Re-vérifie l'état du projecteur après allumage (OBSOLÈTE)
         */
        async function recheckProjectorStatus() {
            console.log('🔍 [SequentialCheck] Re-vérification de l\'état du projecteur après allumage');
            
            // Ré-envoyer automatiquement la demande de problème vidéo pour vérification
            try {
                // ✅ S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'Vérification post-allumage projecteur', // Message technique pour re-check
                        room: currentRoom,
                        context: {
                            sequential_check: true,
                            auto_recheck: true
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ [SequentialCheck] Vérification post-allumage terminée');
                    processResponse(data);
                } else {
                    console.error('❌ [SequentialCheck] Erreur lors de la re-vérification');
                    // En cas d'erreur, afficher directement la bannière SEA
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.8,
                        room: currentRoom,
                        escalation_reason: 'Vérification post-allumage échouée - intervention technique requise'
                    });
                }
            } catch (error) {
                console.error('❌ [SequentialCheck] Erreur réseau:', error);
            }
        }

        /**
         * Affiche la bannière de confirmation des actions automatiques
         * avec le même style que les bannières SIM/SEA
         */
        function showAutoResultBanner(autoResult) {
            // ✅ CORRECTION: Fermer toutes les bannières auto-result existantes AVANT d'en créer une nouvelle
            const existingAutoBanners = document.querySelectorAll('[id^="auto_result_"]');
            const existingAutoOverlays = document.querySelectorAll('[id^="overlay_auto_result_"]');
            
            existingAutoBanners.forEach(banner => {
                console.log(`🚫 [CleanupAutoBanner] Suppression bannière auto-result existante: ${banner.id}`);
                banner.remove();
            });
            
            existingAutoOverlays.forEach(overlay => {
                console.log(`🚫 [CleanupAutoOverlay] Suppression overlay auto-result existant: ${overlay.id}`);
                overlay.remove();
            });
            
            // ✅ NETTOYAGE TOTAL : Supprimer TOUS les messages du chat avant d'afficher la bannière
            const assistantPage = document.getElementById('assistantPage');
            if (assistantPage) {
                const allMessages = assistantPage.querySelectorAll('.message');
                allMessages.forEach(message => {
                    message.remove();
                    console.log('🧹 Message supprimé du chat avant bannière');
                });
            }
            
            // ✅ MASQUER les palettes pendant l'affichage de la bannière
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'none';
            }
            
            const bannerId = `auto_result_${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou
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
            
            // Créer la bannière de confirmation
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
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                    <div class="auto-result-text">
                        <strong style="color: white !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Action Automatique Réussie</strong>
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
            
            // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeAutoResultBanner(bannerId);
                }
            };
            
            // ✅ Empêcher la propagation des événements depuis la bannière
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(bannerDiv);
            
            // Auto-fermeture après 5 secondes
            setTimeout(() => {
                closeAutoResultBanner(bannerId);
            }, 5000);
        }

        /**
         * Ferme la bannière de confirmation automatique
         */
        function closeAutoResultBanner(bannerId) {
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // ✅ REMETTRE les palettes après fermeture de la bannière
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'grid';
                problemPalettes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
                problemPalettes.style.gap = '2rem';
            }
        }

        /**
         * Affiche la bannière SEA centrée avec overlay (comme les autres bannières)
         */
        function showSEAEscalationBanner(data) {

// Guard: if a SEA banner is already present, do NOT recreate (prevents refresh while typing)
if (document.querySelector('[id^="escalation_sea_"]') || document.querySelector('[id^="overlay_escalation_sea_"]')) {
    console.log('🛑 [SEA Banner] Already open — skip re-render');
    return;
}
            // ✅ CORRECTION: Fermer toutes les bannières SEA existantes AVANT d'en créer une nouvelle
            const existingSeaBanners = document.querySelectorAll('[id^="escalation_sea_"]');
            const existingSeaOverlays = document.querySelectorAll('[id^="overlay_escalation_sea_"]');
            
            existingSeaBanners.forEach(banner => {
                console.log(`🚫 [CleanupSEABanner] Suppression bannière SEA existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSeaOverlays.forEach(overlay => {
                console.log(`🚫 [CleanupSEAOverlay] Suppression overlay SEA existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const escalationId = `escalation_sea_${Date.now()}`;
            const currentRoom = getCurrentRoom();
            
            // Créer l'overlay plein écran avec flou
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
            
            // Créer la bannière SEA
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
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">SEA: 📱 6135 ou créer un ticket - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="client-description-section" style="margin: 1.5rem 0;">
                    <div class="description-header" style="margin-bottom: 0.5rem;">
                        <i class="fas fa-edit" style="color: black !important; margin-right: 0.5rem;"></i>
                        <span style="color: black !important; font-weight: 600;">Description détaillée (facultative)</span>
                    </div>
                    <textarea
                        id="clientDescription_${escalationId}"
                        class="client-description-input"
                        placeholder="Décrivez votre problème en détail..."
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
                        <small style="color: black !important; font-style: italic;">💡 Si vous ne saisissez rien, un message générique sera utilisé selon le type de problème.</small>
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
                        <i class="fas fa-paper-plane"></i> Créer un ticket
                    </button>
                </div>
            `;
            
            // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
            overlayDiv.onclick = (event) => {
                // Fermer seulement si on clique directement sur l'overlay, pas sur ses enfants
                if (event.target === overlayDiv) {
                    closeSEAEscalationBanner(escalationId);
                }
            };
            
            // ✅ Empêcher la propagation des événements depuis la bannière
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // ✅ NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la bannière
            hideDiagnosticLoading();
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(escalationDiv);
        
    window.__SEA_BANNER_OPEN__ = true;
    // After render, hydrate SEA logo images
    try {
        document.querySelectorAll('[id^="sea-logo-"]').forEach(el => updateSEALogo(el));
    } catch(e) { console.warn('SEA logo hydration error', e); }
}


        /**
         * Ferme la bannière SEA
         */
        function closeSEAEscalationBanner(escalationId) {
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // ✅ CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme manuellement la bannière
            clearEscalationTimeout();
            console.log('🚫 [EscalationTimeout] Timer d\'escalade annulé suite à fermeture manuelle de la bannière');
        }

        /**
         * Crée un ticket depuis la bannière SEA
         */
        function createTicketFromBanner(escalationId, escalationActions) {
            const description = document.getElementById(`clientDescription_${escalationId}`)?.value?.trim();
            
            // ✅ CORRECTION: Créer le ticket AVANT de fermer la bannière
            createTicket(escalationId, escalationActions, description);
        }
        /**
         * Affiche la modale pour la description détaillée du ticket
         */
        function showTicketDescriptionModal(escalationId, escalationActions) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            
            modalIcon.textContent = '🎫';
            modalTitle.textContent = 'Description du problème (optionnel)';
            modalMessage.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #666;">
                        Vous pouvez ajouter une description détaillée du problème pour aider l'équipe technique :
                    </p>
                    <textarea 
                        id="ticketDescription" 
                        placeholder="Décrivez le problème en détail (optionnel)..."
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
         * Ferme la bannière d'escalade et son overlay
         */
        function closeEscalationBanner(escalationId) {
            console.log(`🚫 [CloseEscalation] Fermeture bannière ${escalationId}`);
            
            // Supprimer la bannière
            const escalationDiv = document.getElementById(escalationId);
            if (escalationDiv) {
                escalationDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // Réafficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Ferme la confirmation de ticket et son overlay
         */
        function closeTicketConfirmation(confirmationId) {
            console.log(`✅ [CloseConfirmation] Fermeture confirmation ${confirmationId}`);
            
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
            
            // Réafficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Affiche la bannière de ticket existant avec overlay moderne
         */
        function showExistingTicketBanner(lastTicket) {
            console.log(`🎫 [ExistingTicket] Affichage bannière pour ticket existant: ${lastTicket.number}`);
            
            // ✅ CORRECTION : Masquer le sablier diagnostic car bannière de ticket prend le relais
            hideDiagnosticLoading();
            console.log('✅ [ExistingTicket] Sablier diagnostic masqué - Bannière ticket existant prend le relais');
            
            // ✅ CORRECTION: Fermer toutes les bannières existantes AVANT d'en créer une nouvelle
            const existingBanners = document.querySelectorAll('[id^="existing_ticket_"]');
            const existingOverlays = document.querySelectorAll('[id^="overlay_existing_ticket_"]');
            
            existingBanners.forEach(banner => {
                console.log(`🚫 [CleanupBanner] Suppression bannière existante: ${banner.id}`);
                banner.remove();
            });
            
            existingOverlays.forEach(overlay => {
                console.log(`🚫 [CleanupOverlay] Suppression overlay existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // Créer la bannière de ticket existant avec overlay plein écran
            const bannerId = `existing_ticket_${Date.now()}`;
            
            // Créer l'overlay plein écran avec flou agressif
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
            
            // Créer la bannière de ticket existant
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
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎫</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket déjà créé pour cette salle</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>📄 Numéro :</strong> ${lastTicket.number}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>🏢 Salle :</strong> ${lastTicket.room}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>⏰ Créé :</strong> ${new Date(lastTicket.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    Un ticket SEA a déjà été escaladé vers l'équipe technique dans la même session.
                </p>
                <p style="margin: 1rem 0; opacity: 0.9; font-size: 0.9rem;">
                    📞 <strong>Vous pouvez toujours appeler directement le SEA au 6135</strong> pour un suivi ou une urgence.
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
                        ✕ Fermer
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
                        📞 Appeler SEA
                    </button>
                    <button onclick="navigator.clipboard.writeText('${lastTicket.number}').then(() => alert('Numéro de ticket copié!'))" style="
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
                        📋 Copier numéro
                    </button>
                </div>
            `;
            
            // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeExistingTicketBanner(bannerId);
                }
            };
            
            // ✅ Empêcher la propagation des événements depuis la bannière
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            console.log(`🎫 [ExistingTicketBanner] Bannière affichée pour ticket ${lastTicket.number}`);
        }
        
        /**
         * Ferme la bannière de ticket existant
         */
        function closeExistingTicketBanner(bannerId) {
            console.log(`🚫 [CloseExistingTicket] Fermeture bannière ${bannerId}`);
            
            // ✅ CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme la bannière
            clearEscalationTimeout();
            console.log('🚫 [CloseExistingTicket] Timer d\'escalade annulé suite à fermeture bannière ticket existant');
            
            // Supprimer la bannière
            const bannerDiv = document.getElementById(bannerId);
            if (bannerDiv) {
                bannerDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // Réafficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Crée un ticket directement avec description optionnelle du client
         */
        async function createTicketDirect(escalationId, problemType) {
            console.log(`🎫 [DirectTicket] Création directe ticket pour ${problemType} - ${escalationId}`);
            
            // Récupérer la description optionnelle du client
            const descriptionTextarea = document.getElementById(`problemDescription_${problemType}_${escalationId}`);
            const clientDescription = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            // Déterminer le message générique selon le type
            let genericMessage = '';
            switch(problemType) {
                case 'video':
                    genericMessage = 'Problème vidéo signalé - aucun affichage ou image déformée';
                    break;
                case 'audio':
                    genericMessage = 'Problème audio signalé - aucun son ou qualité dégradée';
                    break;
                default:
                    genericMessage = 'Problème technique signalé nécessitant intervention';
            }
            
            // Utiliser la description du client ou le message générique
            const finalDescription = clientDescription || genericMessage;
            
            console.log(`📝 [TicketDescription] ${clientDescription ? 'Description client' : 'Message générique'}: "${finalDescription}"`);
            
            await createTicket(escalationId, problemType, finalDescription);
        }

        /**
         * Crée un ticket avec description optionnelle (conservé pour compatibilité)
         */
        async function createTicketWithDescription(escalationId, escalationActions) {
            const descriptionTextarea = document.getElementById('ticketDescription');
            const description = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            closeTicketDescriptionModal();
            await createTicket(escalationId, escalationActions, description);
        }

        /**
         * Crée un ticket SEA avec description fournie
         */
        async function createTicket(escalationId, problemType, description = '') {
            try {
                // ✅ CORRECTION : Annuler le timer d'escalade quand un ticket est créé
                clearEscalationTimeout();
                console.log('🚫 [EscalationTimeout] Timer d\'escalade annulé suite à création de ticket');
                
                // ✅ CORRECTION: Vérifier si l'élément existe avant de l'utiliser
                const escalationElement = document.getElementById(escalationId);
                
                // Désactiver les boutons seulement si l'élément existe
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
                    loadingDiv.textContent = '🔄 Création du ticket SEA en cours...';
                    escalationElement.appendChild(loadingDiv);
                }
                
                // Préparer les données du ticket avec infos Podio enrichies
                const currentRoom = getCurrentRoom();
                const isClientDescription = description && !description.includes('Problème ') && description.length > 20;
                
                const baseDescription = `Problème ${problemType} signalé par un utilisateur via l'interface vitrine nécessitant une intervention technique.`;
                const fullDescription = `${baseDescription}\n\nDescription : ${description}`;
                
                // 🏢 Récupérer les infos Podio du cache s'il existe
                const podioInfo = window.roomCache?.podioInfo;
                
                const ticketData = {
                    category: 'technical_issue',
                    priority: 'medium',
                    title: `Problème ${problemType} signalé via vitrine - Salle ${currentRoom}`,
                    description: fullDescription,
                    client_message: isClientDescription ? 
                        `Signalement via vitrine SAV Qonnect\n\nDescription client : ${description}` : 
                        `Signalement via vitrine SAV Qonnect\n\nMessage générique : ${description}`,
                    copilot_analysis: `Analyse automatique : intervention technique recommandée`,
                    room: currentRoom,
                    device_name: 'Non spécifié',
                    reporter_name: 'Utilisateur Vitrine',
                    // 🆕 INFOS PODIO ENRICHIES (si disponibles)
                    room_pavillon: podioInfo?.pavillon || null,
                    room_bassin: podioInfo?.bassin || null,
                    room_type: podioInfo?.type || null,
                    room_capacite: podioInfo?.capacite || null
                };
                
                console.log('🎫 [CreateTicket] Données avec infos Podio:', {
                    room: currentRoom,
                    podioInfo: podioInfo,
                    hasPodioData: !!podioInfo
                });

                // ✅ S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                // Appeler l'API pour créer le ticket
                const response = await fetch(`${currentAPI}/api/copilot/vitrine-create-ticket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(ticketData)
                });

                // ✅ CORRECTION: Supprimer le message de chargement seulement s'il existe
                if (escalationElement) {
                    const loadingDiv = escalationElement.querySelector('div[style*="background: rgba(50, 150, 50, 0.8)"]');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                }

                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status}). Veuillez réessayer plus tard.`);
                }

                const result = await response.json();
                
                if (result.success && result.ticket) {
                    // ✅ AJOUTER LE TICKET À LA SESSION pour éviter les doublons
                    addTicketToSession(result.ticket);
                    
                    // ✅ CORRECTION: Fermer la bannière SEA avec la bonne fonction
                    closeSEAEscalationBanner(escalationId);
                    
                    // ✅ CORRECTION: Fermer toutes les bannières de confirmation existantes AVANT d'en créer une nouvelle
                    const existingConfirmationBanners = document.querySelectorAll('[id^="confirmation_"]');
                    const existingConfirmationOverlays = document.querySelectorAll('[id^="overlay_confirmation_"]');
                    
                    existingConfirmationBanners.forEach(banner => {
                        console.log(`🚫 [CleanupConfirmationBanner] Suppression bannière confirmation existante: ${banner.id}`);
                        banner.remove();
                    });
                    
                    existingConfirmationOverlays.forEach(overlay => {
                        console.log(`🚫 [CleanupConfirmationOverlay] Suppression overlay confirmation existant: ${overlay.id}`);
                        overlay.remove();
                    });
                    
                    // Créer la confirmation avec overlay plein écran
                    const confirmationId = `confirmation_${Date.now()}`;
                    
                    // Créer l'overlay plein écran avec flou agressif
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
                    
                    // Créer la confirmation de ticket avec style moderne
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
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🎫</div>
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket SEA créé avec succès !</h3>
                        <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>📄 Numéro :</strong> ${result.ticket.ticket_number || result.ticket.id}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>🏢 Salle :</strong> ${result.ticket.room || 'Non spécifié'}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>🔧 Type :</strong> Problème ${problemType}</p>
                        </div>
                        <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                            L'équipe SEA a reçu votre demande et va traiter le problème rapidement.
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
                            ✅ Fermer
                        </button>
                    `;
                    
                    // ✅ CORRECTION: Fermer au clic sur l'overlay mais PAS sur les éléments internes
                    overlayDiv.onclick = (event) => {
                        if (event.target === overlayDiv) {
                            closeTicketConfirmation(confirmationId);
                        }
                    };
                    
                    // ✅ Empêcher la propagation des événements depuis la bannière
                    successDiv.onclick = (event) => {
                        event.stopPropagation();
                    };
                    
                    // Ajouter l'overlay et la confirmation au body
                    document.body.appendChild(overlayDiv);
                    document.body.appendChild(successDiv);
                    
                    console.log(`🎫 [CreateTicket] Ticket ${result.ticket.ticket_number} créé pour la salle ${currentRoom}`);
                } else {
                    throw new Error(result.message || 'Erreur lors de la création du ticket');
                }
                
            } catch (error) {
                console.error('Erreur lors de la création du ticket:', error);
                
                // ✅ CORRECTION: Fermer la bannière même en cas d'erreur
                closeSEAEscalationBanner(escalationId);
                
                showModal(
                    '❌',
                    'Erreur de création',
                    `Impossible de créer le ticket : ${error.message}\n\nVeuillez contacter le SEA directement au 6135.`,
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
                        console.log('🔒 [Lock] Salle verrouillée détectée:', lock.name);
                        
                        // Appliquer l'interface verrouillée
                        document.documentElement.classList.add('is-room-locked');
                        
                        // Restaurer la salle dans le cache
                        const roomInfo = parseRoomInfo(lock.name);
                        if (roomInfo) {
                            setRoomCache(roomInfo);
                            
                            // Afficher directement l'assistant (pas la landing)
                            setTimeout(() => {
                                showAssistant();
                                console.log('🔒 [Lock] Assistant affiché directement pour salle verrouillée');
                                
                                // ===== CHAT SEA : Démarrer l'écoute des demandes de chat =====
                                startChatRequestListener();
                                
                                // ===== STATUS EVENTS : Démarrer l'écoute des changements de statut =====
                                startStatusEventSource();
                            }, 100);
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ [Lock] Erreur vérification verrouillage:', error);
            }
        }
        
        function getClientIP() {
            // Simulation - en réalité, le serveur détecte l'IP
            return '192.168.1.100';
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
                // ✅ NOUVEAU : Marquer comme fermeture normale
                isNormalClosure = true;
                
                // ✅ NOUVEAU : S'assurer de la connexion backend avant fermeture
                await ensureBackendConnection();
                
                // ✅ NOUVEAU : Informer le backend que Vitrine ferme le chat
                if (currentChatId) {
                    console.log('🔚 [Vitrine] Fermeture du chat par l\'utilisateur');
                    
                    const response = await fetch(`${currentAPI}/api/tickets/chat/end`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            channel_id: currentChatId,
                            room_id: getCurrentRoom(),
                            ended_by: "vitrine" // ✅ Indiquer que c'est Vitrine qui ferme
                        })
                    });
                    
                    if (response.ok) {
                        console.log('✅ [Vitrine] Chat fermé avec succès côté backend');
                    } else {
                        console.error('❌ [Vitrine] Erreur lors de la fermeture du chat');
                    }
                }
            } catch (error) {
                console.error('❌ [Vitrine] Erreur lors de la fermeture:', error);
            }
            
            // Fermer l'interface localement
            closeChatInterface();
        }
        
        // ===== CHAT PRIORITY MANAGEMENT =====
        let hiddenStatusBanners = []; // Stocke les bannières masquées pour le chat
        
        function hideStatusBannersForChat() {
            console.log('💬 [ChatPriority] Masquage des bannières de statut pour priorité chat');
            hiddenStatusBanners = [];
            
            // Masquer la bannière de statut de ticket si visible
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer && statusContainer.style.display !== 'none') {
                hiddenStatusBanners.push('ticketStatus');
                statusContainer.style.display = 'none';
                console.log('💬 [ChatPriority] Bannière de statut masquée');
            }
            
            // Retirer le flou de la page
            removePageBlurEffect();
            console.log('💬 [ChatPriority] Flou de page retiré pour le chat');
        }
        
        function restoreStatusBannersAfterChat() {
            console.log('💬 [ChatPriority] Restauration des bannières de statut après chat');
            
            // Restaurer la bannière de statut si elle était visible
            if (hiddenStatusBanners.includes('ticketStatus')) {
                const statusContainer = document.getElementById('ticketStatusContainer');
                if (statusContainer) {
                    statusContainer.style.display = 'flex';
                    // Remettre le flou si c'était une bannière persistante
                    const statusType = statusContainer.getAttribute('data-status-type');
                    if (statusType === 'persistent') {
                        addPageBlurEffect();
                    }
                    console.log('💬 [ChatPriority] Bannière de statut restaurée');
                }
            }
            
            hiddenStatusBanners = [];
        }

        // ===== CHAT TIMEOUT BANNER FUNCTIONS =====
        function showChatTimeoutBanner() {
            console.log('⏰ [ChatTimeout] Affichage bannière de timeout');
            
            // Masquer la bannière de consent si visible
            hideConsentBanner();
            
            // Masquer les bannières de statut pour priorité chat
            hideStatusBannersForChat();
            
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'block';
                
                setTimeout(() => {
                    banner.classList.add('show');
                }, 10);
            }
            
            // ✅ NOUVEAU : Notifier le backend que la vitrine est passée en mode rappel
            notifyBackendRecallMode();
        }
        
        async function notifyBackendRecallMode() {
            try {
                const currentRoom = getCurrentRoom();
                const chatId = currentChatId; // Utiliser la variable de chat actuelle
                console.log(`🔍 [RecallMode] Debug - currentRoom: ${currentRoom}, currentChatId: ${chatId}`);
                
                if (!currentRoom || !chatId) {
                    console.log('⚠️ [RecallMode] Pas de salle ou chatId actuel, skip notification');
                    return;
                }
                
                console.log(`📡 [RecallMode] Notification backend: salle ${currentRoom} en mode rappel`);
                
                // S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/recall-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room: currentRoom,
                        chat_id: chatId,
                        status: 'recall_mode',
                        message: 'Client n\'a pas répondu - Vitrine en mode rappel'
                    })
                });
                
                if (response.ok) {
                    console.log('✅ [RecallMode] Backend notifié avec succès');
                } else {
                    console.warn('⚠️ [RecallMode] Erreur notification backend:', response.status);
                }
            } catch (error) {
                console.error('❌ [RecallMode] Erreur notification backend:', error);
            }
        }
        
        async function closeTimeoutBanner() {
            console.log('❌ [ChatTimeout] Fermeture bannière de timeout normale');
            
            try {
                // ✅ NOUVEAU : Notifier le backend que le client a fermé la bannière de rappel
                await notifyBackendClientClosedRecall();
                
                const banner = document.getElementById('chatTimeoutBanner');
                if (banner) {
                    banner.style.display = 'none';
                    banner.classList.remove('show');
                }
                
                // Restaurer les bannières de statut
                restoreStatusBannersAfterChat();
                
            } catch (error) {
                console.error('❌ [ChatTimeout] Erreur lors de la fermeture:', error);
                
                // Fermer quand même l'interface même en cas d'erreur
                const banner = document.getElementById('chatTimeoutBanner');
                if (banner) {
                    banner.style.display = 'none';
                    banner.classList.remove('show');
                }
                restoreStatusBannersAfterChat();
            }
        }
        
        // ✅ NOUVELLE FONCTION : Fermer la bannière avec envoi de refus
        async function closeTimeoutBannerWithDecline() {
            console.log('❌ [ChatTimeout] Fermeture bannière de timeout avec refus');
            
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
                    console.log('✅ [ChatTimeout] Refus de rappel envoyé au serveur');
                }
            } catch (error) {
                console.error('❌ [ChatTimeout] Erreur lors de l\'envoi du refus:', error);
            }
            
            // Fermer la bannière dans tous les cas
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'none';
                banner.classList.remove('show');
            }
            
            // Restaurer les bannières de statut
            restoreStatusBannersAfterChat();
        }
        
        // ✅ NOUVELLE FONCTION : Initier une demande de rappel client
        async function initiateRecallRequest() {
            console.log('💬 [Recall] Client demande un rappel');
            
            try {
                // S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const ticketNumber = window.lastTicketNumber || '';
                
                if (!currentRoom) {
                    console.error('[Recall] Pas de salle définie');
                    return;
                }
                
                console.log('✅ [Recall] Salle trouvée:', currentRoom);
                
                // Données de rappel
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
                    // Afficher la bannière de confirmation
                    const banner = document.getElementById('chatTimeoutBanner');
                    if (banner) {
                        banner.innerHTML = `
                            <h3>
                                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                                Demande de rappel envoyée
                            </h3>
                            <p>Le technicien SEA a été notifié et reviendra vers vous dès que possible.</p>
                            <p><strong>Salle : ${currentRoom}</strong></p>
                            <div class="timeout-actions">
                                <button class="timeout-btn close" onclick="closeTimeoutBanner()">
                                    <i class="fas fa-check"></i>
                                    OK
                                </button>
                            </div>
                        `;
                        
                        // Fermer automatiquement après 5 secondes
                        setTimeout(closeTimeoutBanner, 5000);
                    }
                    
                    console.log('✅ [Recall] Demande de rappel envoyée:', recallData);
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
            console.log('💬 [ChatTimeout] Client initie la conversation avec SEA');
            
            try {
                // ✅ S'assurer d'utiliser le bon backend (localhost vs UQAM)
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
                    console.log('✅ [ChatTimeout] Demande d\'initiation envoyée:', data);
                    
                    // Fermer la bannière de timeout
                    closeTimeoutBanner();
                    
                    // Afficher un message d'attente
                    showNotification('Demande de chat envoyée au technicien SEA. En attente de réponse...');
                } else {
                    console.error('❌ [ChatTimeout] Erreur lors de l\'initiation:', response.status);
                    showNotification('Erreur lors de l\'envoi de la demande de chat');
                }
            } catch (error) {
                console.error('❌ [ChatTimeout] Erreur réseau:', error);
                showNotification('Erreur de connexion');
            }
        }

        // ===== CONSENT BANNER FUNCTIONS =====
        function showConsentBanner(ticketNumber, roomId = null) {
            // ✅ NOUVEAU : Masquer les bannières de statut pour priorité chat
            hideStatusBannersForChat();
            
            document.getElementById('consentTicketNumber').textContent = ticketNumber;
            
            // Afficher le nom de la salle si fourni
            if (roomId) {
                document.getElementById('consentRoomName').textContent = roomId;
            } else {
                document.getElementById('consentRoomName').textContent = getCurrentRoom() || 'Inconnue';
            }
            
            document.getElementById('consentBanner').style.display = 'block';
            
            // ✅ NOUVEAU : Afficher bannière de timeout après 30 secondes au lieu de fermer
            setTimeout(() => {
                if (document.getElementById('consentBanner').style.display !== 'none') {
                    console.log('⏰ [ChatTimeout] Timeout de 30s - Affichage bannière de timeout');
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
                // ✅ NOUVEAU : S'assurer de la connexion backend avant acceptation
                await ensureBackendConnection();
                
                console.log('✅ [Consent] Chat accepté');
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'accept',
                        channel_id: currentChatId // ✅ CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    hideConsentBanner();
                    openChatInterface();
                }
                
            } catch (error) {
                console.error('❌ [Consent] Erreur acceptation:', error);
            }
        }
        
        async function declineChat() {
            try {
                // ✅ NOUVEAU : S'assurer de la connexion backend avant refus
                await ensureBackendConnection();
                
                console.log('❌ [Consent] Chat refusé par le client');
                console.log('🔗 [Consent] Channel ID:', currentChatId);
                console.log('🏠 [Consent] Room ID:', getCurrentRoom());
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'decline',
                        channel_id: currentChatId // ✅ CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    console.log('✅ [Consent] Refus envoyé au serveur avec succès');
                } else {
                    console.error('❌ [Consent] Erreur serveur lors du refus:', response.status);
                }
                
                hideConsentBanner();
                currentChatId = null;
                
                // ✅ NOUVEAU : Restaurer les bannières de statut après refus du chat
                restoreStatusBannersAfterChat();
                
            } catch (error) {
                console.error('❌ [Consent] Erreur refus:', error);
            }
        }
        
        // ===== CHAT INTERFACE FUNCTIONS =====
        function openChatInterface() {
            // ✅ NOUVEAU : Masquer les bannières de statut pour priorité chat
            hideStatusBannersForChat();
            
            document.getElementById('chatModal').classList.add('active');
            
            // ✅ NOUVEAU : Démarrer le heartbeat pour détecter les déconnexions
            startHeartbeat();
            
            // Ajouter le message d'accueil automatique
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer && messagesContainer.children.length === 0) {
                const welcomeMessage = document.createElement('div');
                welcomeMessage.className = 'chat-message system-message';
                welcomeMessage.innerHTML = `
                    <div class="system-message-content">
                        <i class="fas fa-headset"></i>
                        <div class="system-message-text">
                            <strong>Bonjour ! 👋</strong><br>
                            Je suis le technicien audiovisuel du SEA (Service Expert Audiovisuel).<br>
                            <em>Comment puis-je vous aider aujourd'hui ?</em>
                        </div>
                    </div>
                `;
                messagesContainer.appendChild(welcomeMessage);
            }
            
            document.getElementById('chatInput').focus();
        }
        
        function closeChatInterface() {
            document.getElementById('chatModal').classList.remove('active');
            document.getElementById('chatMessages').innerHTML = '';
            document.getElementById('chatInput').value = '';
            
            // ✅ NOUVEAU : Arrêter le heartbeat
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
                console.log('💓 [Heartbeat] Arrêté lors de la fermeture du chat');
            }
            
            currentChatId = null;
            
            // ✅ NOUVEAU : Réinitialiser le flag de fermeture normale
            isNormalClosure = false;
            
            // ✅ NOUVEAU : Restaurer les bannières de statut après fermeture du chat
            restoreStatusBannersAfterChat();
            
            if (chatEventSource) {
                chatEventSource.close();
                chatEventSource = null;
            }
        }
        
        // ✅ NOUVEAU : Variables pour la détection de frappe
        let isTypingVitrine = false;
        let typingTimeoutVitrine = null;
        let lastTypingEventVitrine = 0;
        const TYPING_INTERVAL_VITRINE = 2000; // 2 secondes
        
        // 🔐 IDENTIFIANT UNIQUE pour ce client Vitrine
        const VITRINE_CLIENT_ID = `vitrine-${getCurrentRoom()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔐 [TypingVitrine] ID client Vitrine généré: ${VITRINE_CLIENT_ID}`);
        
        function handleChatKeyPress(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            } else {
                // ✅ NOUVEAU : Détecter la frappe comme Tickets SEA
                handleTypingVitrine(event);
            }
        }
        
        // ✅ NOUVEAU : Fonction de détection de frappe pour Vitrine
        function handleTypingVitrine(event) {
            if (!currentChatId) return;
            
            console.log(`✅ [TypingVitrine] Chat actif trouvé, chatId: ${currentChatId}`);
            const now = Date.now();
            
            // Éviter d'envoyer trop d'événements de frappe
            if (!isTypingVitrine) {
                isTypingVitrine = true;
                sendTypingStatusVitrine(currentChatId, true);
                lastTypingEventVitrine = now;
            } else if (now - lastTypingEventVitrine > TYPING_INTERVAL_VITRINE) {
                // Renvoyer l'état de frappe toutes les X secondes pour maintenir l'état
                sendTypingStatusVitrine(currentChatId, true);
                lastTypingEventVitrine = now;
            }
            
            // Réinitialiser le timeout
            clearTimeout(typingTimeoutVitrine);
            typingTimeoutVitrine = setTimeout(() => {
                isTypingVitrine = false;
                sendTypingStatusVitrine(currentChatId, false);
            }, 1000); // Arrêt après 1 seconde d'inactivité
        }
        
        // ✅ NOUVEAU : Fonction d'envoi d'état de frappe pour Vitrine
        async function sendTypingStatusVitrine(channelId, isTyping) {
            try {
                console.log(`⌨️ [TypingVitrine] Envoi état frappe: ${isTyping ? 'en train d\'écrire' : 'arrêté d\'écrire'}`);
                
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
                
                console.log(`✅ [TypingVitrine] État frappe envoyé: ${isTyping}`);
            } catch (error) {
                console.error(`❌ [TypingVitrine] Erreur d'envoi d'état de frappe:`, error);
            }
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message || !currentChatId) return;
            
            try {
                // 🚀 NOUVEAU : Utiliser le gestionnaire unifié si disponible
                if (typeof window.unifiedChat !== 'undefined') {
                    console.log(`🔗 [Vitrine] Envoi via gestionnaire unifié`);
                    
                    // Trouver le ticket ID correspondant
                    const ticketId = findTicketIdFromChatId(currentChatId);
                    if (ticketId) {
                        const result = await window.unifiedChat.sendMessage(ticketId, message, 'vitrine');
                        if (result.success) {
                            addChatMessage(message, 'sent');
                            input.value = '';
                            return;
                        } else {
                            console.warn(`⚠️ [Vitrine] Fallback vers envoi legacy:`, result.error);
                        }
                    }
                }
                
                // Fallback vers l'ancien système
                await sendChatMessageLegacy(message);
                
            } catch (error) {
                console.error('❌ [Chat] Erreur envoi message:', error);
            }
        }
        
        // 🔄 Ancien système d'envoi en fallback
        async function sendChatMessageLegacy(message) {
            const input = document.getElementById('chatInput');
            
            // ✅ NOUVEAU : S'assurer de la connexion backend avant envoi
            await ensureBackendConnection();
            
            console.log(`🔍 [DEBUG-VITRINE] Envoi message legacy avec channel_id: "${currentChatId}"`);
            console.warn(`🚨 [DEBUG-VISIBLE] VITRINE ENVOIE LEGACY AVEC CHANNEL_ID: "${currentChatId}"`);
            
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
            }
        }
        
        // 🛠️ Fonction utilitaire pour trouver le ticket ID depuis chat ID
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
        
        function addChatMessage(message, type) {
            const messagesContainer = document.getElementById('chatMessages');
            
            // Vérifier si le message n'existe pas déjà (éviter les doublons)
            const existingMessages = messagesContainer.querySelectorAll('.chat-message');
            for (let msg of existingMessages) {
                if (msg.textContent === message && msg.className.includes(type)) {
                    console.log('⚠️ [Chat] Message en double détecté, ignoré:', message);
                    return;
                }
            }
            
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${type}`;
            messageElement.textContent = message;
            messagesContainer.appendChild(messageElement);
            
            // Scroll vers le bas (doux si supporté)
            if (typeof messagesContainer.scrollTo === 'function') {
                messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
            } else {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            console.log(`✅ [Chat] Message ajouté: ${type} - ${message}`);
        }
        
        // ===== CHAT EVENT SOURCE - SUPPRIMÉ =====
        // Remplacé par startChatRequestListener() qui gère tout via /api/tickets/chat/stream
        
        // ===== CHAT REQUEST LISTENER RÉEL =====
        function startChatRequestListener() {
            if (!getCurrentRoom()) return;
            
            const roomId = getCurrentRoom();
            console.log(`💬 [Chat] Démarrage écoute SSE RÉELLE pour salle ${roomId}`);
            
            // ✅ CORRIGÉ : Utiliser currentAPI maintenant que l'initialisation est terminée
            const sseUrl = `${currentAPI}/api/tickets/chat/stream?room_id=${roomId}`;
            
            // ⚠️ DEBUG : Vérifier qu'on n'a pas déjà une connexion active
            if (window.vitrineChatEventSource) {
                console.log('⚠️ [SSE] Fermeture connexion existante pour éviter duplication');
                window.vitrineChatEventSource.close();
            }
            
            const eventSource = new EventSource(sseUrl);
            window.vitrineChatEventSource = eventSource; // Stocker pour éviter duplicata
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 [SSE] Événement RÉEL reçu:', data);
                    
                    switch (data.type) {
                        case 'connection_established':
                            console.log('✅ [SSE] Connexion RÉELLE établie pour salle ' + roomId);
                            showNotification('Connexion chat établie - En attente des demandes SEA');
                            break;
                            
                        case 'chat_initiated':
                            // Une demande de chat RÉELLE est arrivée depuis Tickets SEA
                            console.log('💬 [SSE] Demande de chat RÉELLE reçue:', data.data);
                            currentChatId = data.data.channel_id;
                            showConsentBanner(`Demande de chat pour salle ${roomId}`, roomId);
                            break;
                            
                        case 'chat_ended':
                            // ✅ NOUVEAU : Vérifier QUI a fermé le chat
                            const endedBy = data.data?.ended_by || 'unknown';
                            console.log('🛑 [SSE] Chat terminé par:', endedBy);
                            
                            hideConsentBanner();
                            closeChatInterface();
                            
                            // ✅ LOGIQUE CORRECTE : Afficher le bon message selon qui a fermé
                            if (endedBy === 'vitrine') {
                                // Le client a fermé → Pas de notification (il le sait déjà)
                                console.log('ℹ️ [SSE] Chat fermé par le client - Pas de notification');
                            } else if (endedBy.startsWith('tickets_sea')) {
                                // Le technicien a fermé → Notification appropriée
                                if (endedBy === 'tickets_sea_with_summary') {
                                    showNotification('Chat terminé par le technicien - Résumé créé');
                                } else if (endedBy === 'tickets_sea_no_summary') {
                                    showNotification('Chat terminé par le technicien');
                                } else {
                                    showNotification('Chat terminé par l\'opérateur SEA');
                                }
                            } else {
                                // Fermeture inconnue → Message générique
                                showNotification('Chat terminé');
                            }
                            
                            currentChatId = null;
                            
                            // ✅ NOUVEAU : Assurer la restauration des bannières même si fermé côté serveur
                            restoreStatusBannersAfterChat();
                            break;

                        case 'chat_interface_open':
                            console.log('💬 [SSE] Ouverture interface de chat demandée:', data.data);
                            // ✅ NOUVEAU : Mettre à jour currentChatId avec le channel_id du chat accepté
                            if (data.data && data.data.channel_id) {
                                currentChatId = data.data.channel_id;
                                console.log('✅ [SSE] currentChatId mis à jour:', currentChatId);
                            }
                            hideConsentBanner();
                            openChatInterface();
                            showNotification('Chat démarré - Interface ouverte');
                            break;

                        case 'chat_message':
                            console.log('💬 [SSE] Message reçu:', data.data);
                            // Éviter d'ajouter les messages envoyés par Vitrine (ils sont déjà affichés)
                            if (data.data.sender && data.data.sender !== 'vitrine') {
                                addChatMessage(data.data.message, 'received');
                            } else if (!data.data.sender) {
                                // Si pas de sender, traiter comme message reçu
                                addChatMessage(data.data.message, 'received');
                            }
                            break;

                        case 'client_typing':
                        case 'vitrine_typing':
                            console.log('🔍 [SSE-Vitrine] Événement typing reçu:', data);
                            
                            // 🚫 BLACKLIST : Ne pas afficher si c'est ce client Vitrine qui tape
                            const eventClientId = data.data?.client_id;
                            const eventSender = data.data?.sender || 'sea';
                            
                            if (eventClientId && eventClientId === VITRINE_CLIENT_ID) {
                                console.log(`🚫 [TypingVitrine] BLACKLIST - Événement typing ignoré car c'est ce client Vitrine qui tape (${eventClientId})`);
                                break;
                            }
                            
                            if (data.data && data.data.is_typing) {
                                console.log(`💬 [SSE-Vitrine] ${eventSender.toUpperCase()} en train d'écrire... (client: ${eventClientId})`);
                                if (typeof showTypingIndicator === 'function') {
                                    showTypingIndicator(eventSender);
                                }
                            } else {
                                console.log(`💬 [SSE-Vitrine] ${eventSender.toUpperCase()} a arrêté d'écrire`);
                                if (typeof hideTypingIndicator === 'function') {
                                    hideTypingIndicator();
                                }
                            }
                            break;
                            
                        default:
                            console.log('📡 [SSE] Événement non géré:', data.type);
                    }
                } catch (error) {
                    console.error('❌ [SSE] Erreur parsing événement:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('❌ [SSE] Erreur de connexion SSE RÉELLE:', error);
                // Reconnexion automatique avec backoff exponentiel
                setTimeout(() => {
                    if (getCurrentRoom()) {
                        console.log('🔄 [SSE] Tentative de reconnexion...');
                        startChatRequestListener();
                    }
                }, 5000);
            };
            
            eventSource.onopen = function() {
                console.log('✅ [SSE] Connexion SSE RÉELLE établie pour salle ' + roomId);
                
                // 🔄 Démarrer le heartbeat pour cette connexion
                startHeartbeat();
                
                // 🔄 Enregistrer le client dans le système SSE
                if (clientId) {
                    console.log('📡 [SSE] Client enregistré pour heartbeat:', clientId);
                }
            };
        }
        
        // ===== STATUS CHANGE LISTENER POUR TICKETS SEA =====
        let statusEventSource = null;
        
        function startStatusEventSource() {
            const currentRoom = getCurrentRoom();
            if (!currentRoom) {
                console.log('🔔 [StatusEvents] Pas de salle définie, EventSource non démarré');
                return;
            }

            // Fermer l'EventSource existant s'il y en a un
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
            }

            // ✅ RÉACTIVÉ : EventSource pour les changements de statuts des tickets
            console.log('🔔 [StatusEvents] Démarrage EventSource pour changements de statuts');
            
            // ✅ CORRIGÉ : Utiliser currentAPI maintenant que l'initialisation est terminée
            const sseUrl = `${currentAPI}/api/tickets/chat/events/vitrine?room_id=${currentRoom}`;
            statusEventSource = new EventSource(sseUrl);

            statusEventSource.onopen = function() {
                console.log('🔔 [StatusEvents] EventSource ouvert pour les changements de statut de la salle ' + currentRoom);
            };

            statusEventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('🔔 [StatusEvents] Événement reçu:', data);
                    
                    // ✅ DEBUG COMPLET : Analyser la structure de l'événement
                    console.log('🔔 [StatusEvents] Type de data:', typeof data);
                    console.log('🔔 [StatusEvents] Propriétés de data:', Object.keys(data));
                    console.log('🔔 [StatusEvents] data.Type:', data.Type);
                    console.log('🔔 [StatusEvents] data.type:', data.type);
                    console.log('🔔 [StatusEvents] data.Data:', data.Data);
                    console.log('🔔 [StatusEvents] data.data:', data.data);

                    // ✅ CORRECTION FINALE : Utiliser les champs minuscules !
                    if (data.type === 'ticket_status_change') {
                        // Vérifier que l'événement concerne la salle courante
                        if (data.data && data.data.room === currentRoom) {
                            console.log('🔔 [StatusEvents] Changement de statut détecté pour cette salle:', data.data);
                            // ✅ NOUVEAU : Passer le statut pour déterminer si c'est persistant
                            showTicketStatusMessage(data.data.message, data.data.status);
                        }
                    } else if (data.type === 'connection_established') {
                        console.log('🔔 [StatusEvents] Connexion SSE établie pour salle:', data.data.room_id);
                    } else if (data.type === 'client_typing' || data.type === 'vitrine_typing') {
                        console.log('🔍 [StatusEvents] Événement typing reçu:', data);
                        
                        // 🚫 BLACKLIST : Ne pas afficher si c'est ce client Vitrine qui tape
                        const eventClientId = data.data?.client_id;
                        const eventSender = data.data?.sender || 'sea';
                        
                        if (eventClientId && eventClientId === VITRINE_CLIENT_ID) {
                            console.log(`🚫 [StatusEvents] BLACKLIST - Événement typing ignoré car c'est ce client Vitrine qui tape (${eventClientId})`);
                            return;
                        }
                        
                        if (data.data && data.data.is_typing) {
                            console.log(`💬 [StatusEvents] ${eventSender.toUpperCase()} en train d'écrire... (client: ${eventClientId})`);
                            showTypingIndicator(eventSender);
                        } else {
                            console.log(`💬 [StatusEvents] ${eventSender.toUpperCase()} a arrêté d'écrire`);
                            hideTypingIndicator();
                        }
                    }
                } catch (error) {
                    console.error('🔔 [StatusEvents] Erreur parsing événement:', error);
                }
            };
            
            // Fonctions pour les indicateurs de typing
            window.showTypingIndicator = function(sender = 'sea') {
                console.log(`🎯 [DEBUG] showTypingIndicator() appelée pour ${sender}`);
                const chatContainer = document.querySelector('#chatMessages');
                if (!chatContainer) {
                    console.log('❌ [DEBUG] Pas de container #chatMessages trouvé');
                    return;
                }
                console.log('✅ [DEBUG] Container chat trouvé:', chatContainer);
                
                // Supprimer indicateur existant
                const existing = document.getElementById('typing-indicator-vitrine');
                if (existing) existing.remove();
                
                // 🎨 Style selon la source
                const senderIcon = sender === 'sea' ? '🎧' : '👤';
                const senderText = sender === 'sea' ? 'Technicien' : 'Client';
                const senderColor = sender === 'sea' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                
                // Créer nouvel indicateur SANS ANIMATION
                const indicator = document.createElement('div');
                indicator.id = 'typing-indicator-vitrine';
                indicator.innerHTML = `
                    <div style="background: ${senderColor}; color: white; padding: 12px 16px; border-radius: 20px; margin: 8px 0; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); font-weight: 600;">
                        <span style="font-size: 1.2em;">${senderIcon}</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
                            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
                            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
                        </div>
                        <span>${senderText} en train d'écrire...</span>
                    </div>
                `;
                
                // Animation supprimée pour éviter la bande qui bouge
                
                chatContainer.appendChild(indicator);
                console.log('✅ [StatusEvents] Indicateur typing affiché dans Vitrine');
            };
            
            window.hideTypingIndicator = function() {
                const indicator = document.getElementById('typing-indicator-vitrine');
                if (indicator) {
                    indicator.remove();
                    console.log('✅ [StatusEvents] Indicateur typing supprimé de Vitrine');
                }
            };

            statusEventSource.onerror = function(error) {
                console.error('🔔 [StatusEvents] Erreur EventSource:', error);
                // Tentative de reconnexion après 5 secondes
                setTimeout(() => {
                    if (statusEventSource && statusEventSource.readyState === EventSource.CLOSED) {
                        console.log('🔔 [StatusEvents] Tentative de reconnexion EventSource...');
                        startStatusEventSource();
                    }
                }, 5000);
            };
        }
        
        function showTicketStatusMessage(message, statusType) {
            const statusContainer = document.getElementById('ticketStatusContainer') || createTicketStatusContainer();
            
            // ✅ NOUVEAU : Déterminer le style basé sur le type de statut
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
            
            // ✅ NOUVEAU : Bannière spéciale pour EN COURS avec numéro d'urgence et sans bouton X
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
                                📞 <a href="tel:6135" style="color: white; text-decoration: none;">6135</a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Bannière normale pour les autres statuts
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
            
            // ✅ NOUVEAU : Effet blur sur la page pour les bannières importantes
            if (statusType === 'open' || statusType === 'in_progress' || statusType === 'resolved') {
                addPageBlurEffect();
            }
            
            // ✅ NOUVEAU : Les statuts temporaires disparaissent après 5 secondes, les persistants restent
            if (!isPersistent) {
                setTimeout(() => {
                    hideTicketStatusMessage();
                }, 5000);
            }
            
            console.log(`🔔 [Status] Message affiché (${isPersistent ? 'PERSISTANT' : 'TEMPORAIRE'}): ${message}`);
        }
        
        function hideTicketStatusMessage() {
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer) {
                statusContainer.style.display = 'none';
                // ✅ NOUVEAU : Retirer l'effet blur quand on ferme la bannière
                removePageBlurEffect();
            }
        }
        
        // ✅ NOUVEAU : Fonctions pour gérer l'effet blur et blocage des interactions
        function addPageBlurEffect() {
            // Créer un overlay blur si il n'existe pas
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
            
            // ? CORRECTION : Vérifier que blurOverlay existe avant d'ajouter les événements
            if (blurOverlay) {
                // ? NOUVEAU : Bloquer tous les clics sur l'overlay
                blurOverlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                
                // ✅ NOUVEAU : Bloquer le scroll et autres interactions
                blurOverlay.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
            
            // ✅ NOUVEAU : Bloquer le scroll sur le body
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
                
                // ✅ NOUVEAU : Rétablir le scroll sur le body
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
         * Affiche la modale avec le résultat
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
            
            // Retour automatique à l'accueil après un délai
            setTimeout(() => {
                returnToHome();
            }, 300);
        }



        // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

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
            // ✅ BLOQUER COMPLÈTEMENT : Si c'est une action automatique exécutée, ne rien afficher dans le chat
            if (data.auto_executed && data.auto_result) {
                // ✅ NOUVEAU: Détecter les allumages de projecteur (actions + auto_result)
                const isProjectorPowerOnFromActions = data.actions && data.actions.some(action => 
                    action.type === 'pjlink_power' && 
                    (action.command === 'power_on' || action.description?.toLowerCase().includes('allumer'))
                );
                
                const isProjectorPowerOnFromResult = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('allumer') && 
                     (data.auto_result.includes('PROJ-') || data.auto_result.toLowerCase().includes('projecteur')));
                
                const isAVMuteAction = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('av mute') || 
                     data.auto_result.toLowerCase().includes('désactiver') && data.auto_result.includes('PROJ-'));
                
                // ✅ LOGIQUE SIMPLIFIÉE : Bannière verte simple pour TOUTES les corrections automatiques
                console.log('✅ [AutoCorrection] Action automatique réussie - Bannière verte simple');
                setTimeout(() => {
                    showAutoResultBanner(data.auto_result);
                }, 500);
                return; // Ne pas créer de message dans le chat
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
                    // ✅ FILTRER : Supprimer les messages d'actions automatiques du contenu principal
                    let filteredContent = content;
                    if (typeof filteredContent === 'string') {
                        // Supprimer les lignes contenant des messages d'actions automatiques
                        filteredContent = filteredContent
                            .split('\n')
                            .filter(line => !line.includes('Actions automatiques exécutées'))
                            .filter(line => !line.match(/^✅.*Désactiver.*sourdine/))
                            .filter(line => !line.match(/^✅.*TCC2.*sourdine/))
                            .filter(line => !line.match(/^✅.*[Aa]ction.*automatique/))
                            .filter(line => line.trim() !== '')
                            .join('\n');
                    }
                    messageContent += formatContent(filteredContent);
                }
                
                // Actions manuelles uniquement (les actions automatiques sont gérées par la bannière centrée)
                if (data.actions && data.actions.length > 0) {
                    const manualActions = data.actions.filter(action => !(action.executed || data.auto_executed));
                    if (manualActions.length > 0) {
                    messageContent += '<div class="message-actions">';
                        manualActions.forEach(action => {
                            messageContent += `<button class="action-btn" onclick="executeAction('${action.type}', '${action.device_id || 0}', ${JSON.stringify(action.parameters || {}).replace(/"/g, '&quot;')})">🔧 ${action.description || action.label || action.type}</button>`;
                    });
                    messageContent += '</div>';
                }
                }

                // ✅ Les actions automatiques sont gérées au début de addMessage (pas ici)
                
                // ✅ CORRECTION: Escalade avec bannière centrée - vérifier les tickets existants
                if (data.escalation_needed) {
                    setTimeout(() => {
                        const currentRoom = getCurrentRoom();
                        if (hasExistingTicket(currentRoom)) {
                            const lastTicket = getLastSessionTicket(currentRoom);
                            console.log(`🎫 [TicketExistant] Escalade demandée mais ticket ${lastTicket.number} existe → Bannière ticket existant`);
                            showExistingTicketBanner(lastTicket);
                        } else {
                            showSEAEscalationBanner(data);
                        }
                    }, 500);
                }
                
                // ✅ Actions automatiques déjà gérées au début de addMessage
                
                messageContent += '</div>';
            }

            messageDiv.innerHTML = messageContent;
            
            // ✅ NOUVEAU : Remplacer le contenu au lieu d'ajouter
            const assistantPage = document.getElementById('assistantPage');
            
            // Supprimer tous les messages précédents
            const existingMessages = assistantPage.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            // Ajouter le nouveau message
            assistantPage.appendChild(messageDiv);
            
            // Charger l'image SEA2 pour les bannières d'escalade
            // Tenter immédiatement puis après un court délai pour couvrir les transitions
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
         * Garde les données jusqu'au F5 de la page
         */
        class PodioRoomCache {
            constructor() {
                this.cache = new Map();
                this.maxCacheSize = 50; // Limite mémoire
                console.log('🏢 [PodioCache] Cache Podio initialisé');
            }
            
            /**
             * Récupère les informations d'une salle avec cache session
             */
            async getRoomInfo(roomName) {
                // 💾 Check cache first (session seulement)
                if (this.cache.has(roomName)) {
                    console.log(`📋 [PodioCache] Cache hit pour salle: ${roomName}`);
                    return this.cache.get(roomName);
                }
                
                try {
                    // ✅ NOUVEAU : S'assurer de la connexion backend avant appel Podio
                    const apiUrl = await ensureBackendConnection();
                    
                    console.log(`🌐 [PodioCache] API call pour salle: ${roomName}`);
                    
                    // 🐍 Appel API Podio PRIORITAIRE avec fallback NeonDB si échec - ✅ UTILISER apiUrl
                    const response = await fetch(
                        `${apiUrl}/api/podio/public-room-info?room=${encodeURIComponent(roomName)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            // 🕐 Timeout pour éviter blocage
                            signal: AbortSignal.timeout(10000) // 10s timeout
                        }
                    );
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            throw new Error('Rate limit atteint - veuillez patienter');
                        }
                        throw new Error(`HTTP ${response.status}: Salle non trouvée`);
                    }
                    
                    const data = await response.json();
                    
                    // ✅ PODIO SUCCÈS: Parser la réponse Podio normale
                    if (data.success && data.details) {
                        console.log(`✅ [PodioCache] Salle ${roomName} trouvée dans Podio`);
                        const roomInfo = {
                            name: data.salle_code || roomName,
                            pavillon: data.details.Pavillon || '',
                            bassin: data.details.Proprietaire || '',
                            type: data.details["Type de salle"] || '',
                            capacite: data.details["Capacité"] || '',
                            source: 'podio'
                        };
                        
                        this.cache.set(roomName, roomInfo);
                        console.log(`✅ [PodioCache] Salle ${roomName} mise en cache (Podio):`, roomInfo);
                        return roomInfo;
                    }
                    
                    // ⚠️ PODIO ÉCHEC: Essayer fallback NeonDB pour équipements
                    console.log(`⚠️ [PodioCache] Salle ${roomName} non trouvée dans Podio → Tentative fallback NeonDB`);
                    throw new Error('Salle non trouvée dans Podio, fallback NeonDB nécessaire');
                    
                } catch (error) {
                    console.warn(`⚠️ [PodioCache] Échec Podio pour ${roomName}: ${error.message}`);
                    
                    // ✅ FALLBACK NEONDB: Essayer de récupérer les équipements depuis NeonDB
                    try {
                        console.log(`🔄 [PodioCache] Tentative fallback NeonDB pour salle: ${roomName}`);
                        
                        const neonResponse = await fetch(
                            `${apiUrl}/api/room/equipment?room=${encodeURIComponent(roomName)}`,
                            {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                signal: AbortSignal.timeout(8000) // Timeout plus court pour fallback
                            }
                        );
                        
                        if (neonResponse.ok) {
                            const neonData = await neonResponse.json();
                            if (neonData.success && Array.isArray(neonData.devices)) {
                                console.log(`✅ [PodioCache] Salle ${roomName} trouvée via NeonDB (${neonData.devices.length} équipements)`);
                                
                                const roomInfo = {
                                    name: roomName,
                                    pavillon: '', // Non disponible via NeonDB
                                    bassin: '',   // Non disponible via NeonDB
                                    type: '',     // Non disponible via NeonDB
                                    capacite: '', // Non disponible via NeonDB
                                    devices: neonData.devices || [],
                                    equipment_count: neonData.count || 0,
                                    source: 'neondb' // ✅ Marquer la source
                                };
                                
                                // 💾 Mettre en cache le résultat NeonDB
                                this.cache.set(roomName, roomInfo);
                                
                                // 🧹 Nettoyer cache si nécessaire
                                if (this.cache.size > this.maxCacheSize) {
                                    const firstKey = this.cache.keys().next().value;
                                    this.cache.delete(firstKey);
                                    console.log(`🧹 [PodioCache] Cache nettoyé - supprimé: ${firstKey}`);
                                }
                                
                                console.log(`✅ [PodioCache] Salle ${roomName} mise en cache (NeonDB):`, roomInfo);
                                return roomInfo;
                            }
                        }
                        
                        console.log(`❌ [PodioCache] Fallback NeonDB également échoué pour ${roomName}`);
                        return null; // Dégradation gracieuse
                        
                    } catch (neonError) {
                        console.warn(`❌ [PodioCache] Erreur fallback NeonDB pour ${roomName}:`, neonError.message);
                        return null; // Dégradation gracieuse
                    }
                }
            }
            
            /**
             * Vide le cache manuellement (pour tests)
             */
            clearCache() {
                this.cache.clear();
                console.log('🧹 [PodioCache] Cache Podio vidé manuellement');
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
         * Détermine le type de problème basé sur le contexte
         */
        function determineProblemType() {
            // Analyser le dernier message ou le contexte pour déterminer le type
            const messages = document.querySelectorAll('.message');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageText = lastMessage.textContent.toLowerCase();
                
                if (messageText.includes('audio') || messageText.includes('son') || messageText.includes('microphone') || messageText.includes('haut-parleur')) {
                    return 'audio';
                } else if (messageText.includes('vidéo') || messageText.includes('projecteur') || messageText.includes('écran') || messageText.includes('image')) {
                    return 'vidéo';
                } else if (messageText.includes('réseau') || messageText.includes('internet') || messageText.includes('wifi') || messageText.includes('connexion')) {
                    return 'réseau';
                } else {
                    return 'technique';
                }
            }
            return 'technique';
        }
        
        /**
         * Génère un message générique selon le type de problème
         */
        function getGenericMessage(problemType) {
            const messages = {
                'audio': 'Problème audio signalé - Microphone, haut-parleurs, volume ou qualité sonore',
                'vidéo': 'Problème vidéo signalé - Projecteur, écran, qualité d\'image ou connectivité',
                'réseau': 'Problème réseau signalé - Connexion internet, Wi-Fi ou connectivité réseau',
                'technique': 'Problème technique signalé - Équipement, infrastructure ou maintenance générale'
            };
            
            return messages[problemType] || messages['technique'];
        }

        // ===== FONCTIONS DE THÈME ET NAVIGATION =====
        
        // Basculer le thème
        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Mode nuit';
                localStorage.removeItem('theme');
                } else {
                body.setAttribute('data-theme', 'dark');
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Mode jour';
                localStorage.setItem('theme', 'dark');
            }
        }

        // ✅ NOUVEAU : Fonctions Mode Technique
        function openTechnicalMode() {
            console.log('🔧 [Technical] Ouverture du mode technique');
            const modal = document.getElementById('technicalAuthModal');
            const passwordInput = document.getElementById('technicalPassword');
            const errorDiv = document.getElementById('technicalAuthError');
            
            // Réinitialiser le modal
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
            console.log('🔧 [Technical] Fermeture modal authentification');
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
            
            console.log('🔧 [Technical] Tentative d\'authentification via API');
            
            if (!password) {
                showTechnicalAuthError('Veuillez saisir le mot de passe');
                return;
            }
            
            // Désactiver le bouton pendant la requête
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vérification...';
            
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
                console.log('🔧 [Technical] Réponse API:', data);
                
                if (data.success) {
                    console.log('✅ [Technical] Authentification réussie');
                    // Stocker le token pour les futures requêtes (optionnel)
                    localStorage.setItem('technical_token', data.token);
                    localStorage.setItem('technical_expires', data.expires_at);
                    
                    closeTechnicalAuth();
                    showTechnicalPage();
                } else {
                    console.log('❌ [Technical] Authentification échouée:', data.message);
                    showTechnicalAuthError(data.message || 'Mot de passe incorrect');
                }
            } catch (error) {
                console.error('❌ [Technical] Erreur lors de l\'authentification:', error);
                showTechnicalAuthError('Erreur de connexion au serveur');
            } finally {
                // Réactiver le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-unlock"></i> Accéder';
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
            console.log('🔧 [Technical] Affichage page technique');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // Récupérer la salle actuelle pour l'afficher
            const currentRoom = getCurrentRoom();
            const technicalRoomSpan = document.getElementById('technicalCurrentRoom');
            if (technicalRoomSpan) {
                technicalRoomSpan.textContent = currentRoom || 'Non définie';
            }
            
            // ✅ NOUVEAU : Gérer l'affichage du plan unifilaire
            if (window.RoomPlansConfig) {
                console.log('🔧 [Technical] Mise à jour des plans pour:', currentRoom);
                window.RoomPlansConfig.updatePlanSection(currentRoom);
            } else {
                console.warn('⚠️ [Technical] Module RoomPlansConfig non chargé');
            }
            
            // Masquer Vitrine et afficher la page technique
            if (mainContainer) {
                mainContainer.style.display = 'none';
            }
            technicalPage.style.display = 'block';
            
            console.log('🔧 [Technical] Page technique affichée pour la salle:', currentRoom);
        }
        


        function returnToVitrine() {try{ window.__SEA_BANNER_OPEN__ = false; }catch(e){}

            console.log('🔧 [Technical] Retour à Vitrine');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // Masquer la page technique et réafficher Vitrine
            technicalPage.style.display = 'none';
            if (mainContainer) {
                mainContainer.style.display = 'block';
            }
            
            console.log('✅ [Technical] Retour à Vitrine effectué');
        }

        // ✅ NOUVEAU : Fonctions de gestion de l'overlay de chargement diagnostic
        let __diagnosticLoadingShownAtMs = 0;

        function showDiagnosticLoading() {
            console.log('⏳ [Diagnostic] Affichage du chargement');
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
            console.log('✅ [Diagnostic] Masquage du chargement');
            const overlay = document.getElementById('diagnosticLoadingOverlay');
            if (overlay) {
                // Respecter une durée minimale d'affichage de 2 secondes
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

        // Retour à l'accueil (page des palettes) - PAS la landing page
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
            
            // ✅ NETTOYAGE : Supprimer toutes les bannières d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
            
            const escalationCompact = document.querySelectorAll('.escalation-compact');
            escalationCompact.forEach(compact => compact.remove());
            
            // ✅ NETTOYAGE : Supprimer tous les messages contenant "Actions automatiques exécutées"
            document.querySelectorAll('.message').forEach(message => {
                if (message.textContent && message.textContent.includes('Actions automatiques exécutées')) {
                    message.remove();
                }
            });
            
            // Afficher les palettes de problèmes avec la grille horizontale
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
            
            console.log('🏠 Retour à l\'accueil (page des palettes)');
        }

        // Appliquer le thème sauvegardé au chargement
        document.addEventListener('DOMContentLoaded', () => {
            // ✅ INITIALISATION THÈME ET COULEURS
            const headerTitle = document.getElementById('headerTitle');
            const savedTheme = localStorage.getItem('vitrine-theme');
            
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                if (headerTitle) headerTitle.style.color = 'black';
            } else {
                document.body.removeAttribute('data-theme');
                if (headerTitle) headerTitle.style.color = 'black';
            }
            
            // ✅ NETTOYAGE : Supprimer toutes les bannières d'escalade résiduelles
            const oldEscalationInterfaces = document.querySelectorAll('.escalation-interface');
            oldEscalationInterfaces.forEach(interface => interface.remove());
            
            const oldEscalationCompact = document.querySelectorAll('.escalation-compact');
            oldEscalationCompact.forEach(compact => compact.remove());
            
            // ✅ NETTOYAGE IMMÉDIAT : Supprimer tous les messages "Actions automatiques exécutées"
            setTimeout(() => {
                document.querySelectorAll('.message').forEach(message => {
                    if (message.textContent && message.textContent.includes('Actions automatiques exécutées')) {
                        message.remove();
                        console.log('🧹 Message "Actions automatiques exécutées" supprimé du DOM');
                    }
                });
            }, 100);
            
            // ===== THÈME HYBRIDE INTELLIGENT =====
            initializeTheme();
            setupThemeListener();
            console.log('🎨 [Theme] Système de thème hybride initialisé');
            
            // ===== VERROUILLAGE DE SALLE =====
            checkAndApplyRoomLock();
            
            // ===== CHAT SEA INITIALISATION =====
            console.log('💬 [ChatSEA] Initialisation du système de chat');
            
            // Générer un client_id unique et persistant
            clientID = localStorage.getItem('vitrine.client_id');
            if (!clientID) {
                clientID = generateUUID();
                localStorage.setItem('vitrine.client_id', clientID);
            }
            
            // Récupérer le kiosk_id depuis l'URL
            const urlParams = new URLSearchParams(window.location.search);
            kioskID = urlParams.get('kiosk');
            
            if (kioskID) {
                console.log('🎛️ [ChatSEA] Kiosk détecté:', kioskID);
            }
            
            // ✅ CORRIGÉ : Attendre l'initialisation du backend avant de démarrer les EventSource
            if (getCurrentRoom()) {
                backendInitPromise.then(() => {
                    startChatRequestListener();
                    startStatusEventSource();
                });
            }
        });





        // ===== INITIALISATION =====
        console.log('🎛️ Assistant Salle AV - Système initialisé');
        console.log('📋 Fonctionnalités disponibles :');
        console.log('  • Saisie obligatoire de salle');
        console.log('  • Cache persistant de salle');
        console.log('  • Diagnostic audio automatique');
        console.log('  • Diagnostic vidéo automatique');
        console.log('  • Redirection réseau');
        console.log('  • Redirection SIM');
        console.log('  • Mode hybride intelligent (clair/sombre)');
        console.log('  • Détection automatique des préférences système');
        console.log('  • Bouton de retour');
        
        // ✅ CONFIGURATION SIMPLIFIÉE - Pas de surveillance nécessaire
        console.log('? [Config] Backend unique configuré');

// ? EXPOSITION DES FONCTIONS GLOBALES POUR VITRINE.HTML
// Ces fonctions sont nécessaires pour l'interface entre vitrine.html et app.js

// Fonction principale d'initialisation de Vitrine
window.initializeVitrine = function() {
    console.log('?? [initializeVitrine] Démarrage de l\'application Vitrine');
    
    // Créer l'interface Vitrine
    if (typeof createVitrine === 'function') {
        createVitrine();
        console.log('? [initializeVitrine] Interface créée');
    } else {
        console.error('? [initializeVitrine] Fonction createVitrine non trouvée');
        return false;
    }
    
    // Initialiser le thème
    if (typeof initializeTheme === 'function') {
        initializeTheme();
    }
    
    // Vérifier si une salle est verrouillée
    if (window.__VITRINE_LOCK__ && window.__VITRINE_LOCK__.isLocked()) {
        const lockedRoom = window.__LOCKED_ROOM_NAME__;
        console.log('?? [initializeVitrine] Salle verrouillée détectée:', lockedRoom);
        
        // Simuler la confirmation de salle verrouillée
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
    
    console.log('? [initializeVitrine] Vitrine initialisée avec succès');
    return true;
};

// Fonction de détection du meilleur backend (exposée globalement)
window.detectBestBackend = detectBestBackend;

// Fonction pour obtenir l'API courante
window.getCurrentAPI = getCurrentAPI;

// ? FONCTION createVitrine BASIQUE (interface HTML)
function createVitrine() {
    // Éviter la duplication si l'interface existe déjà
    if (document.querySelector('.main-container')) {
        return;
    }
    // Créer le container principal de l'application
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
                    <span id="connection-text">Système opérationnel</span>
                </div>
            </div>
            
            <!-- Page d'accueil -->
            <div id="landingPage" class="landing-page">
                <div class="landing-content">
                    <div class="welcome-section">
                        <img src="https://zine76.github.io/vitrine/assets/Vitrine.png" alt="Vitrine" class="welcome-logo">
                        <h2>Bienvenue sur la Vitrine SavQonnect</h2>
                        <p>Sélectionnez votre salle pour commencer</p>
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
                        <button onclick="sendExampleMessage('Problème Vidéo')">Problème Vidéo</button>
                        <button onclick="sendExampleMessage('Problème Audio')">Problème Audio</button>
                        <button onclick="sendExampleMessage('Problème de réseau')">Problème Réseau</button>
                    </div>
                    <div class="problem-input-section">
                        <input type="text" id="problemInput" placeholder="Décrivez votre problème...">
                        <button id="sendBtn" onclick="sendProblemReport()">Signaler</button>
                    </div>
                    <div id="suggestions" class="suggestions"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    console.log('? [createVitrine] Interface basique créée');

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
					<button class="technical-auth-submit" onclick="submitTechnicalAuth()" style="background:#10b981; color:white; border:none; padding:.5rem .9rem; border-radius:.5rem; cursor:pointer;"><i class="fas fa-unlock"></i> Accéder</button>
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
console.log('[AppJS] Fonctions globales exposées pour vitrine.html');
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
      + '  <h3 class="admin-title">Accès administrateur</h3>'
      + '  <p class="admin-sub">Entrer le mot de passe pour réinitialiser la salle sur ce poste.</p>'
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
  var ADMIN_PASS = 'vitrine'; // change si nécessaire

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
      if (el) { e.stopImmediatePropagation(); e.preventDefault(); toast('Salle verrouillée. Alt+Ctrl+K pour modifier.'); }
    }, true);

    document.querySelectorAll('.change-room-btn,[data-action="choose-room"],[data-action="change-room"],[onclick*="changeRoom"],[href*="landing"],[data-route="landing"]').forEach(function(el){
      el.setAttribute('disabled','disabled'); el.style.pointerEvents='none'; el.style.opacity='.5'; el.style.filter='grayscale(1)';
    });
  }

  var originalChange = window.changeRoom;
  window.changeRoom = function(){
    if (isLocked()) { console.log('[LOCK] changeRoom() bloqué'); toast('Salle verrouillée. Alt+Ctrl+K pour modifier.'); return; }
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
      if (isLocked()) { e.preventDefault(); e.stopImmediatePropagation(); toast('Salle verrouillée. Alt+Ctrl+K pour modifier.'); return; }
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

  // Supprimé: Alt+Ctrl+K géré uniquement par le panneau admin principal (pas de double prompt)

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
// Ajouté pour permettre à la vitrine de fonctionner depuis n'importe quel PC

// ===== PATCH CRITIQUE POUR BACKEND DYNAMIQUE =====
(function() {
    setTimeout(() => {
        console.log('🔧 [BackendPatch] Application du patch pour backend dynamique');
        
        function getConfiguredBackendUrl() {
            // ✅ PRIORITÉ 1 : Utiliser currentAPI si défini (même URL que app.js principal)
            if (typeof currentAPI !== 'undefined' && currentAPI) {
                return currentAPI;
            }
            
            // ✅ PRIORITÉ 2 : Utiliser window.BACKEND_BASE si défini
            if (window.BACKEND_BASE) {
                return window.BACKEND_BASE;
            }
            
            // ✅ PRIORITÉ 3 : Récupérer depuis localStorage
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    return /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                }
            } catch (e) {
                console.error('❌ [BackendPatch] Erreur lecture localStorage:', e);
            }
            
            return 'http://localhost:7070';
        }
        
        const configuredUrl = getConfiguredBackendUrl();
        console.log(`🌐 [BackendPatch] URL backend configurée: ${configuredUrl}`);
        
        // Patcher fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.includes('localhost:7070')) {
                const newUrl = url.replace('http://localhost:7070', configuredUrl);
                console.log(`🔄 [BackendPatch] Redirection: ${url} → ${newUrl}`);
                return originalFetch(newUrl, options);
            }
            
            if (typeof url === 'string' && url.startsWith('/api')) {
                const newUrl = configuredUrl + url;
                console.log(`🔄 [BackendPatch] Absolutisation: ${url} → ${newUrl}`);
                return originalFetch(newUrl, options);
            }
            
            return originalFetch(url, options);
        };
        
        // Patcher EventSource
        const originalEventSource = window.EventSource;
        window.EventSource = function(url, eventSourceInitDict) {
            if (typeof url === 'string' && url.includes('localhost:7070')) {
                const newUrl = url.replace('http://localhost:7070', configuredUrl);
                console.log(`🔄 [BackendPatch] SSE Redirection: ${url} → ${newUrl}`);
                return new originalEventSource(newUrl, eventSourceInitDict);
            }
            
            if (typeof url === 'string' && url.startsWith('/api')) {
                const newUrl = configuredUrl + url;
                console.log(`🔄 [BackendPatch] SSE Absolutisation: ${url} → ${newUrl}`);
                return new originalEventSource(newUrl, eventSourceInitDict);
            }
            
            return new originalEventSource(url, eventSourceInitDict);
        };
        
        console.log('✅ [BackendPatch] Patch appliqué avec succès');
    }, 1000);
})();

// ===== MONITORING AUTOMATIQUE DU BACKEND =====
let backendMonitoringInterval = null;
let isBackendOnline = false;

function startBackendMonitoring() {
    if (backendMonitoringInterval) {
        clearInterval(backendMonitoringInterval);
    }
    
    console.log('🔍 [BackendMonitor] Démarrage du monitoring automatique');
    
    backendMonitoringInterval = setInterval(async () => {
        try {
            // ✅ UTILISER LA MÊME URL QUE APP.JS PRINCIPAL
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
                console.log('✅ [BackendMonitor] Backend revenu en ligne !');
                updateSystemStatus(true);
                
                if (typeof getCurrentRoom === 'function' && getCurrentRoom()) {
                    console.log('🔄 [BackendMonitor] Redémarrage des connexions SSE');
                    setTimeout(() => {
                        if (typeof startChatRequestListener === 'function') {
                            startChatRequestListener();
                        }
                    }, 1000);
                }
            } else if (wasOnline && !isBackendOnline) {
                console.log('❌ [BackendMonitor] Backend hors ligne détecté');
                updateSystemStatus(false);
            }
            
        } catch (error) {
            const wasOnline = isBackendOnline;
            isBackendOnline = false;
            
            if (wasOnline) {
                console.log('❌ [BackendMonitor] Perte de connexion backend:', error.message);
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
            statusText.textContent = 'Système opérationnel';
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
        console.log(`🔍 [ClientClosed] Debug - currentRoom: ${currentRoom}, vitrineChatId: ${chatId}`);

        if (!currentRoom || !chatId) {
            console.log('⚠️ [ClientClosed] Pas de salle ou chatId actuel, skip notification');
            return;
        }

        console.log(`📡 [ClientClosed] Notification backend: client a fermé la bannière de rappel`);

        // ✅ UTILISER LA MÊME URL QUE APP.JS PRINCIPAL
        let apiBase = (typeof currentAPI !== 'undefined' && currentAPI) ? currentAPI : null;

        if (!apiBase) {
            apiBase = window.BACKEND_BASE;
        }

        if (!apiBase) {
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    apiBase = /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                    console.log(`🔧 [ClientClosed] IP récupérée depuis localStorage: ${apiBase}`);
                } else {
                    console.error('❌ [ClientClosed] Aucune IP backend configurée !');
                    return;
                }
            } catch (e) {
                console.error('❌ [ClientClosed] Erreur lecture localStorage:', e);
                return;
            }
        }

        if (!apiBase) {
            console.error('❌ [ClientClosed] Aucun backend configuré - impossible de notifier');
            return;
        }

        console.log(`🌐 [ClientClosed] URL backend utilisée: ${apiBase}`);

        const payload = {
            room: currentRoom,
            chat_id: chatId,
            status: 'client_closed',
            message: 'Client a fermé la bannière de rappel - Non disponible'
        };

        console.log(`📤 [ClientClosed] Payload envoyé:`, payload);

        const response = await fetch(`${apiBase}/api/tickets/chat/recall-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`📡 [ClientClosed] Réponse HTTP:`, response.status, response.statusText);

        if (response.ok) {
            const responseData = await response.text();
            console.log('✅ [ClientClosed] Backend notifié avec succès, réponse:', responseData);
        } else {
            const errorText = await response.text();
            console.warn('⚠️ [ClientClosed] Erreur notification backend:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ [ClientClosed] Erreur notification backend:', error);
    }
}

async function notifyBackendRecallMode() {
    try {
        const currentRoom = typeof getCurrentRoom === 'function' ? getCurrentRoom() : null;
        const chatId = vitrineChatId;
        console.log(`🔍 [RecallMode] Debug - currentRoom: ${currentRoom}, vitrineChatId: ${chatId}`);
        
        if (!currentRoom || !chatId) {
            console.log('⚠️ [RecallMode] Pas de salle ou chatId actuel, skip notification');
            return;
        }
        
        console.log(`📡 [RecallMode] Notification backend: salle ${currentRoom} en mode rappel`);
        
        // ✅ UTILISER LA MÊME URL QUE APP.JS PRINCIPAL
        let apiBase = (typeof currentAPI !== 'undefined' && currentAPI) ? currentAPI : null;
        
        if (!apiBase) {
            apiBase = window.BACKEND_BASE;
        }
        
        if (!apiBase) {
            try {
                const storedIp = localStorage.getItem('vitrine.backend.ip');
                if (storedIp) {
                    apiBase = /^https?:\/\//i.test(storedIp) ? storedIp : ('http://' + storedIp + ':7070');
                    console.log(`🔧 [RecallMode] IP récupérée depuis localStorage: ${apiBase}`);
                } else {
                    console.error('❌ [RecallMode] Aucune IP backend configurée !');
                    return;
                }
            } catch (e) {
                console.error('❌ [RecallMode] Erreur lecture localStorage:', e);
                return;
            }
        }
        
        if (!apiBase) {
            console.error('❌ [RecallMode] Aucun backend configuré - impossible de notifier');
            return;
        }
        
        console.log(`🌐 [RecallMode] URL backend utilisée: ${apiBase}`);
        
        const payload = {
            room: currentRoom,
            chat_id: chatId,
            status: 'recall_mode',
            message: 'Client n\'a pas répondu - Vitrine en mode rappel'
        };
        
        console.log(`📤 [RecallMode] Payload envoyé:`, payload);
        
        const response = await fetch(`${apiBase}/api/tickets/chat/recall-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`📡 [RecallMode] Réponse HTTP:`, response.status, response.statusText);
        
        if (response.ok) {
            const responseData = await response.text();
            console.log('✅ [RecallMode] Backend notifié avec succès, réponse:', responseData);
        } else {
            const errorText = await response.text();
            console.warn('⚠️ [RecallMode] Erreur notification backend:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ [RecallMode] Erreur notification backend:', error);
    }
}

// ✅ NOUVEAU : Système de détection de déconnexion inattendue
let isNormalClosure = false; // Flag pour distinguer fermeture normale vs inattendue
let lastHeartbeat = Date.now();

// ✅ NOUVEAU : Détecter fermeture de page/navigateur (F5, fermeture, etc.)
window.addEventListener('beforeunload', function(event) {
    console.log('🚨 [Disconnect] Détection de fermeture/rechargement de page');
    
    // Si on a un chat actif et que ce n'est pas une fermeture normale
    if (currentChatId && !isNormalClosure) {
        console.log('⚠️ [Disconnect] Fermeture inattendue avec chat actif:', currentChatId);
        
        // Notification immédiate au backend (synchrone)
        notifyUnexpectedDisconnection();
        
        // Message d'avertissement (optionnel - peut être désactivé)
        // event.preventDefault();
        // event.returnValue = 'Vous avez un chat en cours. Êtes-vous sûr de vouloir quitter ?';
        // return event.returnValue;
    }
});

// ✅ NOUVEAU : Détecter perte de connexion réseau
window.addEventListener('offline', function() {
    console.log('📡 [Disconnect] Connexion réseau perdue');
    if (currentChatId) {
        console.log('⚠️ [Disconnect] Chat actif lors de perte de connexion');
        showNotification('Connexion réseau perdue', 'warning');
    }
});

// ✅ NOUVEAU : Détecter retour de connexion
window.addEventListener('online', function() {
    console.log('📡 [Reconnect] Connexion réseau rétablie');
    if (currentChatId) {
        console.log('🔄 [Reconnect] Tentative de reconnexion du chat');
        showNotification('Connexion rétablie', 'success');
        reconnectChat();
    }
});

// ✅ NOUVEAU : Système de heartbeat pour détecter les déconnexions
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    console.log('💓 [Heartbeat] Démarrage du système de heartbeat');
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
                    console.log('💓 [Heartbeat] Ping envoyé avec succès');
                } else {
                    console.warn('⚠️ [Heartbeat] Erreur de ping:', response.status);
                }
            } catch (error) {
                console.error('❌ [Heartbeat] Échec du ping:', error);
                // Si plusieurs échecs consécutifs, considérer comme déconnecté
                if (Date.now() - lastHeartbeat > 60000) { // 1 minute sans heartbeat
                    console.log('🚨 [Heartbeat] Déconnexion détectée - Chat considéré comme perdu');
                    handleHeartbeatTimeout();
                }
            }
        }
    }, 15000); // Heartbeat toutes les 15 secondes
}

// ✅ NOUVEAU : Gérer la perte de heartbeat
function handleHeartbeatTimeout() {
    if (currentChatId) {
        console.log('⏰ [Heartbeat] Timeout détecté - Nettoyage local');
        
        // Nettoyer l'interface locale
        closeChatInterface();
        showNotification('Connexion perdue - Chat fermé', 'error');
        
        // Arrêter le heartbeat
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }
}

// ✅ NOUVEAU : Notification de déconnexion inattendue (synchrone)
async function notifyUnexpectedDisconnection() {
    if (!currentChatId) return;
    
    try {
        const apiBase = await getCurrentAPI();
        
        const data = JSON.stringify({
            channel_id: currentChatId,
            room_id: getCurrentRoom(),
            disconnection_type: 'unexpected',
            timestamp: Date.now()
        });
        
        // Utilisation de sendBeacon pour notification synchrone même lors de fermeture
        const success = navigator.sendBeacon(`${apiBase}/api/tickets/chat/disconnect`, data);
        console.log('📤 [Disconnect] Notification envoyée via sendBeacon:', success ? 'Succès' : 'Échec');
        
        // Fallback avec fetch si sendBeacon échoue
        if (!success) {
            fetch(`${apiBase}/api/tickets/chat/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data,
                keepalive: true // Garder la requête même si la page se ferme
            }).catch(error => {
                console.error('❌ [Disconnect] Erreur notification fallback:', error);
            });
        }
    } catch (error) {
        console.error('❌ [Disconnect] Erreur notification:', error);
    }
}

// ✅ NOUVEAU : Tentative de reconnexion
async function reconnectChat() {
    if (!currentChatId) return;
    
    try {
        console.log('🔄 [Reconnect] Tentative de reconnexion...');
        
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
            console.log('✅ [Reconnect] Reconnexion réussie');
            showNotification('Connexion rétablie', 'success');
            
            // Redémarrer le heartbeat
            startHeartbeat();
        } else {
            console.error('❌ [Reconnect] Échec de reconnexion:', response.status);
            showNotification('Impossible de reconnecter - Chat fermé', 'error');
            closeChatInterface();
        }
    } catch (error) {
        console.error('❌ [Reconnect] Erreur de reconnexion:', error);
        showNotification('Erreur de reconnexion - Chat fermé', 'error');
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
                console.log('🔄 [RecallMode] Hook sur showChatTimeoutBanner original');
                const result = originalShowTimeout.apply(this, arguments);
                notifyBackendRecallMode();
                return result;
            };
            console.log('✅ [RecallMode] Hook installé sur showChatTimeoutBanner');
        }

        // Hook console.log pour capturer channel_id
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('💬 [SSE] Demande de chat RÉELLE reçue:')) {
                const data = args[1];
                if (data && data.channel_id) {
                    vitrineChatId = data.channel_id;
                    console.log('✅ [RecallMode] Channel ID capturé:', vitrineChatId);
                }
            }
            
            if (args[0] && typeof args[0] === 'string' && args[0].includes('🛑 [SSE] Chat terminé par:')) {
                vitrineChatId = null;
                console.log('🔄 [RecallMode] Channel ID reset');
            }
            
            return originalConsoleLog.apply(this, args);
        };
        console.log('✅ [RecallMode] Hook console.log installé pour capturer channel_id');
    }, 2000);
});



// Global flag for SEA banner open state
window.__SEA_BANNER_OPEN__ = window.__SEA_BANNER_OPEN__ || false;

// 🔄 ===== SYSTÈME DE HEARTBEAT POUR DÉTECTION DÉCONNEXIONS =====
let heartbeatInterval = null;
let clientId = null;

function generateClientId() {
    const room = getCurrentRoom();
    if (!room) return null;
    
    return `vitrine-${room}-${Date.now()}`;
}

function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    clientId = generateClientId();
    if (!clientId) {
        console.log('🔄 [Heartbeat] Impossible de générer clientId');
        return;
    }
    
    console.log('🔄 [Heartbeat] Démarrage heartbeat pour client:', clientId);
    
    // Envoyer un heartbeat toutes les 15 secondes
    heartbeatInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/chat/heartbeat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId
                })
            });
            
            if (response.ok) {
                console.log('💓 [Heartbeat] Heartbeat envoyé avec succès');
            } else {
                console.warn('⚠️ [Heartbeat] Erreur heartbeat:', response.status);
            }
        } catch (error) {
            console.error('❌ [Heartbeat] Erreur réseau heartbeat:', error);
        }
    }, 15000); // 15 secondes
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('🔄 [Heartbeat] Arrêt heartbeat pour client:', clientId);
        clientId = null;
    }
}

// Arrêter heartbeat quand la page se ferme
window.addEventListener('beforeunload', () => {
    stopHeartbeat();
});

// ✅ FONCTION DE TEST POUR LE TYPING CÔTÉ VITRINE
window.testVitrineTyping = function() {
    console.log('🧪 [Test] Test du système de typing côté Vitrine...');
    console.log(`🔐 [Test] ID client Vitrine: ${VITRINE_CLIENT_ID}`);
    
    // 1. Test indicateur Technicien (SEA)
    setTimeout(() => {
        console.log('🧪 Test: Indicateur Technicien (sans animation)...');
        showTypingIndicator('sea');
    }, 1000);
    
    // 2. Test indicateur Client (autre Vitrine)
    setTimeout(() => {
        console.log('🧪 Test: Indicateur autre Client...');
        hideTypingIndicator();
        showTypingIndicator('vitrine');
    }, 3000);
    
    // 3. Nettoyage
    setTimeout(() => {
        console.log('🧪 Test: Nettoyage...');
        hideTypingIndicator();
    }, 6000);
    
    console.log('✅ Test typing Vitrine démarré - Plus de bande qui bouge !');
};
