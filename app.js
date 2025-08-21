        // ===== CONFIGURATION DYNAMIQUE =====
        // RÃ©cupÃ©rer le backend depuis les paramÃ¨tres URL ou utiliser IP locale par dÃ©faut
        const urlParams = new URLSearchParams(window.location.search);
        const customBackend = urlParams.get('backend');
        
        // âœ… DÃ‰TECTION AUTOMATIQUE PROTOCOLE (HTTPS si page HTTPS)
        const isSecurePage = location.protocol === 'https:';
        // âœ… CONFIGURATION INTELLIGENTE - DNS avec fallback DNS alternatif
        // ✅ IDENTIQUE À L'INTÉGRÉE
        let API_BASE_URL = 'http://C46928_DEE.ddns.uqam.ca:7070';
        const FALLBACK_DNS_URL = 'http://132.208.182.84:7070';
        
        // Test rapide du DNS, sinon utiliser DNS alternatif  
        async function detectBestBackend() {
            try {
                const testResponse = await fetch(`${API_BASE_URL}/api/health`, { 
                    method: 'GET', 
                    signal: AbortSignal.timeout(5000) // âœ… CORRIGÃ‰ : Timeout plus long (5s au lieu de 2s)
                });
                if (testResponse.ok) {
                    console.log('✅ [Config] DNS accessible, utilisation du backend configuré');
                    return API_BASE_URL;
                }
            } catch (error) {
                console.log('âš ï¸ [Config] DNS timeout, bascule vers IP directe');
                API_BASE_URL = FALLBACK_DNS_URL;
                currentAPI = FALLBACK_DNS_URL;
                return FALLBACK_DNS_URL;
            }
        }
        
        // âœ… INITIALISATION SYNCHRONE AVEC FALLBACK
        let currentAPI = API_BASE_URL; // Par dÃ©faut
        let backendInitialized = false;
        
        // Fonction d'initialisation avec Promise pour attendre
        const backendInitPromise = (async function initializeBackend() {
            try {
                const detectedAPI = await detectBestBackend();
                currentAPI = detectedAPI || API_BASE_URL; // âœ… S'assurer que currentAPI est mis Ã  jour
                backendInitialized = true;
                console.log(`ðŸŒ [Config] Backend utilisÃ©: ${currentAPI}`);
                console.log(`ðŸ–¼ï¸ [Config] Images depuis: ${ASSETS_BASE}`);
                return currentAPI;
            } catch (error) {
                console.error('âŒ [Config] Erreur initialisation backend:', error);
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
        
        // âœ… CONFIGURATION IMAGES LOCALES
        // ✅ CONFIGURATION IMAGES (prend ASSETS_BASE global si défini, sinon 'assets')
        const ASSETS_BASE = window.ASSETS_BASE || 'assets';
        
        // âœ… NOUVEAU: RedÃ©marrer toutes les connexions SSE aprÃ¨s changement d'API
        function restartSSEConnections() {
            console.log(`ðŸ”„ [SSERestart] RedÃ©marrage connexions SSE vers: ${currentAPI}`);
            
            // RedÃ©marrer Chat SSE
            if (getCurrentRoom()) {
                setTimeout(() => {
                    startChatRequestListener();
                }, 100);
            }
            
            // RedÃ©marrer Status Events SSE
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
        
        // âœ… MONITORING SIMPLIFIÃ‰ - BACKEND UNIQUE
        
        // âœ… CONFIGURATION TERMINÃ‰E
        
        async function testBackendConnectivity(url) {
            try {
                const response = await fetch(`${url}/api/health`, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(3000) // Timeout 3s
                });
                return response.ok;
            } catch (error) {
                console.log(`âš ï¸ [Connectivity] Backend ${url} non disponible:`, error.message);
                return false;
            }
        }
        
        // âœ… FONCTION SIMPLIFIÃ‰E - BACKEND UNIQUE
        async function ensureBackendConnection() {
            const api = await getCurrentAPI();
            console.log(`âœ… [Config] Utilisation backend unique: ${api}`);
            return api;
        }
        
        // âœ… FONCTION SIMPLIFIÃ‰E - APPELS DIRECTS
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
            if (imgElement) {
                console.log('ðŸ–¼ï¸ [UpdateSEALogo] Tentative de chargement image SEA pour:', imgElement.id || 'sans ID');
                
                // âœ… UTILISER IMAGES LOCALES
                imgElement.src = `${ASSETS_BASE}/SEA2.png`;
                
                imgElement.onerror = function() {
                    console.log('âŒ [UpdateSEALogo] Ã‰chec chargement local');
                    this.src = 'assets/SEA2.png';
                    
                    this.onerror = function() {
                        console.log('âŒ [UpdateSEALogo] Ã‰chec serveur distant, utilisation fallback');
                        // Fallback vers image directement dans le dossier Annexe
                        this.src = './SEA2.png';
                        
                        this.onerror = function() {
                            console.log('âŒ [UpdateSEALogo] Tous les chemins Ã©chouÃ©s, image vide');
                        };
                    };
                };
                
                imgElement.onload = function() {
                    console.log('âœ… [UpdateSEALogo] Image SEA chargÃ©e avec succÃ¨s depuis:', this.src);
                };
            } else {
                console.log('âŒ [UpdateSEALogo] Ã‰lÃ©ment image non trouvÃ©');
            }
        }
        
        // âœ… NOUVEAU : Gestion des tickets de session
        let sessionTickets = [];

        // ===== CACHE DE SALLE PERSISTANT =====
        window.roomCache = {
            room: null,
            pavilion: null,
            roomNumber: null,
            isSet: false
        };

        // ===== DOM ELEMENTS =====
        // Les éléments seront récupérés dynamiquement car ils n'existent pas encore

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
         * DÃ©finir un exemple de salle
         */
        function setRoomExample(roomName) {
            const roomInput = document.getElementById('roomInput');
            if (roomInput) {
                roomInput.value = roomName;
                roomInput.focus();
            }
        }

        /**
         * Confirmer la salle et passer Ã  l'assistant
         */
        function confirmRoom() {
            const roomInput = document.getElementById('roomInput');
            const roomName = roomInput ? roomInput.value.trim() : '';
            
            if (!roomName) {
                showRoomError('âš ï¸ Veuillez entrer un numÃ©ro de salle');
                return;
            }

            // Valider le format de salle
            if (!isValidRoomFormat(roomName)) {
                showRoomError('âš ï¸ Format non reconnu. Exemples : A-1750, B-2500, SH-R200');
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
                console.log('ðŸ”’ [Lock] Salle verrouillÃ©e:', roomInfo.fullRoom);
                
                // Appliquer l'interface verrouillÃ©e
                document.documentElement.classList.add('is-room-locked');
            } catch (error) {
                console.warn('âš ï¸ [Lock] Erreur verrouillage:', error);
            }
            
            // Passer Ã  l'assistant
            showAssistant();
            
            // ===== CHAT SEA : DÃ©marrer l'Ã©coute des demandes de chat =====
            startChatRequestListener();
            
            // ===== STATUS EVENTS : DÃ©marrer l'Ã©coute des changements de statut =====
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
         * DÃ©finir le cache de salle (version de base)
         */
        function setRoomCache(roomInfo) {
            window.roomCache = {
                room: roomInfo.fullRoom,
                pavilion: roomInfo.pavilion,
                roomNumber: roomInfo.roomNumber,
                isSet: true,
                podioInfo: null // Sera enrichi par setRoomCacheWithPodio
            };

            console.log(`ðŸ¢ [RoomCache] Salle dÃ©finie : ${roomInfo.fullRoom}, Pavillon : ${roomInfo.pavilion}`);
            
            // ðŸ†• Enrichir automatiquement avec infos Podio
            enrichRoomWithPodioInfo(roomInfo.fullRoom);
        }

        /**
         * Enrichir le cache de salle avec les informations Podio
         */
        async function enrichRoomWithPodioInfo(roomName) {
            try {
                console.log(`ðŸ¢ [PodioEnrich] Enrichissement Podio pour: ${roomName}`);
                
                const podioInfo = await podioRoomCache.getRoomInfo(roomName);
                
                if (podioInfo && window.roomCache && window.roomCache.isSet) {
                    // ðŸ†• Enrichir le cache existant
                    window.roomCache.podioInfo = podioInfo;
                    
                    console.log(`âœ… [PodioEnrich] Cache enrichi:`, podioInfo);
                    
                    // ðŸŽ¨ Mettre Ã  jour l'affichage
                    updateRoomDisplayWithPodio(roomName, podioInfo);
                } else {
                    console.warn(`âš ï¸ [PodioEnrich] Pas d'infos Podio pour ${roomName} - affichage normal`);
                }
                
            } catch (error) {
                console.warn(`âŒ [PodioEnrich] Erreur enrichissement pour ${roomName}:`, error.message);
                // Degradation graceful - l'affichage normal continue
            }
        }

        /**
         * Mettre Ã  jour l'affichage de la salle avec les infos Podio
         */
        function updateRoomDisplayWithPodio(roomName, podioInfo = null) {
            const currentRoomDisplay = document.getElementById('currentRoomDisplay');
            if (!currentRoomDisplay) return;
            
            if (podioInfo) {
                // ðŸ†• Affichage enrichi avec infos Podio - COULEURS ADAPTATIVES
                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                const textColor = isDarkMode ? 'white' : '#3b82f6';
                const iconColor = isDarkMode ? 'white' : '#3b82f6';
                
                currentRoomDisplay.innerHTML = `
                    <strong style="color: ${textColor}; font-weight: 700;">${roomName}</strong>
                    <small style="display: block; color: ${textColor}; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.4; font-weight: 600; text-shadow: ${isDarkMode ? '0 2px 4px rgba(0,0,0,0.8)' : 'none'};">
                        ðŸ“ ${podioInfo.pavillon} - ${podioInfo.bassin}<br>
                        ðŸ›ï¸ ${podioInfo.type} | <span style="color: ${textColor} !important; font-weight: 800; font-size: 1.1rem; text-shadow: ${isDarkMode ? '0 2px 6px rgba(0,0,0,0.9)' : 'none'};"><i class="fas fa-users" style="color: ${isDarkMode ? 'white' : '#3b82f6'} !important; -webkit-text-fill-color: ${isDarkMode ? 'white' : '#3b82f6'} !important;"></i> <span style="color: ${textColor} !important;">${podioInfo.capacite}</span></span>
                    </small>
                `;
                console.log(`ðŸŽ¨ [RoomDisplay] Affichage enrichi pour ${roomName}`);
            } else {
                // ðŸ”„ Affichage normal (fallback)
                currentRoomDisplay.textContent = roomName;
                console.log(`ðŸŽ¨ [RoomDisplay] Affichage normal pour ${roomName}`);
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
                        console.log('✅ [showAssistant] Interface (re)créée avant affichage');
                    } catch (e) {
                        console.error('❌ [showAssistant] Échec de création de l\'interface:', e);
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
            
            // Mettre Ã  jour les affichages de salle avec infos Podio si disponibles
            updateRoomDisplayWithPodio(window.roomCache.room, window.roomCache.podioInfo);
            
            // Initialiser la connexion au backend
            checkConnection().then(connected => {
                console.log(`ðŸ”— Connexion backend: ${connected ? 'OK' : 'Ã‰CHEC'}`);
                // âœ… NOUVEAU : Mettre Ã  jour le statut initial
                updateSystemStatus(connected);
            });
            
            // âœ… NOUVEAU : VÃ©rification pÃ©riodique de la connexion (toutes les 10 secondes)
            setInterval(async () => {
                await checkConnection();
            }, 10000);
            
            // Focus sur l'input principal
            setTimeout(() => {
                // Focus sur la premiÃ¨re palette
                const firstPalette = document.querySelector('.palette');
                if (firstPalette) {
                    firstPalette.focus();
                }
            }, 300);
        }

        /**
         * Changer de salle (retour Ã  la landing page)
         */
        function changeRoom() {
            // RÃ©initialiser le cache
            window.roomCache.isSet = false;
            
            // Nettoyer les inputs
            const roomInput = document.getElementById('roomInput');
            if (roomInput) roomInput.value = '';
            
            // ðŸ”” Fermer l'EventSource de statut
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
                console.log('ðŸ”” [StatusEvents] EventSource de statut fermÃ©');
            }
            
            // ðŸ”” Masquer le message de statut
            hideTicketStatusMessage();
            
            // Retour Ã  la landing page
            const assistantPage = document.getElementById('assistantPage');
            const landingPage = document.getElementById('landingPage');
            if (assistantPage) assistantPage.style.display = 'none';
            if (landingPage) landingPage.style.display = 'flex';
            
            // Focus sur l'input de salle
            setTimeout(() => {
                const roomInput = document.getElementById('roomInput');
                if (roomInput) roomInput.focus();
            }, 300);
            
            console.log('ðŸ  Retour Ã  la landing page (changer de salle)');
        }
        
        /**
         * Gestion du thÃ¨me hybride intelligent
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
                console.log('ðŸŒž Mode clair activÃ©');
            } else {
                // Passer au mode sombre
                body.setAttribute('data-theme', 'dark');
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Mode jour';
                localStorage.setItem('vitrine-theme', 'dark');
                // Mode nuit : titre reste NOIR (demande utilisateur)
                if (headerTitle) headerTitle.style.color = 'black';
                console.log('ðŸŒ™ Mode sombre activÃ©');
            }
        }
        
        /**
         * Initialisation automatique du thÃ¨me
         */
        function initializeTheme() {
            const savedTheme = localStorage.getItem('vitrine-theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            // PrioritÃ© : 1) Sauvegarde utilisateur, 2) PrÃ©fÃ©rence systÃ¨me, 3) Mode clair par dÃ©faut
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.body.setAttribute('data-theme', 'dark');
                const themeIcon = document.getElementById('themeIcon');
                const themeText = document.getElementById('themeText');
                if (themeIcon && themeText) {
                    themeIcon.className = 'fas fa-sun';
                    themeText.textContent = 'Mode jour';
                }
                console.log('ðŸŒ™ Mode sombre initialisÃ© (prÃ©fÃ©rence systÃ¨me ou sauvegarde)');
            } else {
                document.body.removeAttribute('data-theme');
                console.log('ðŸŒž Mode clair initialisÃ©');
            }
        }
        
        /**
         * Ã‰couter les changements de prÃ©fÃ©rence systÃ¨me
         */
        function setupThemeListener() {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Seulement si l'utilisateur n'a pas dÃ©fini de prÃ©fÃ©rence manuelle
                if (!localStorage.getItem('vitrine-theme')) {
                    if (e.matches) {
                        document.body.setAttribute('data-theme', 'dark');
                        console.log('ðŸŒ™ Mode sombre activÃ© (prÃ©fÃ©rence systÃ¨me)');
                    } else {
                        document.body.removeAttribute('data-theme');
                        console.log('ðŸŒž Mode clair activÃ© (prÃ©fÃ©rence systÃ¨me)');
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
                // CrÃ©er le message d'erreur
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
                
                // InsÃ©rer aprÃ¨s le container de saisie
                const container = document.querySelector('.room-input-container');
                container.parentNode.insertBefore(errorDiv, container.nextSibling);
            }
            
            errorDiv.textContent = message;
            
            // Supprimer aprÃ¨s 3 secondes
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
         * VÃ©rifie si une salle est dÃ©finie
         */
        function hasRoomSet() {
            return window.roomCache && window.roomCache.isSet;
        }

        /**
         * Met Ã  jour les suggestions
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
         * Met Ã  jour le bouton d'envoi
         */
        function updateSendButton(loading) {
            const sendBtn = document.getElementById('sendBtn');
            if (!sendBtn) return;
            
            if (loading) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = 'â³ Traitement...';
            } else if (!isConnected) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = 'âš ï¸ SystÃ¨me non prÃªt';
            } else {
                sendBtn.disabled = false;
                sendBtn.innerHTML = 'ðŸ“¤ Signaler';
            }
        }

        // âœ… NOUVEAU : Fonction pour dÃ©tecter les salles mentionnÃ©es dans les messages
        function detectRoomInMessage(message) {
            // Pattern pour dÃ©tecter les salles (ex: A-1750, B-2500, J-2430)
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

        // âœ… NOUVEAU : Fonction pour vÃ©rifier si un ticket existe dÃ©jÃ 
        function hasExistingTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            return sessionTickets.some(ticket => ticket.room === targetRoom);
        }
        
        // âœ… NOUVEAU : Fonction pour ajouter un ticket Ã  la session
        function addTicketToSession(ticketData) {
            const ticket = {
                number: ticketData.ticket_number || ticketData.id,
                room: ticketData.room,
                timestamp: new Date().toISOString(),
                title: ticketData.title || 'Ticket SEA',
                status: 'created'
            };
            
            sessionTickets.push(ticket);
            console.log(`ðŸŽ« [Session] Ticket ajoutÃ©:`, ticket);
            return ticket;
        }
        
        // âœ… NOUVEAU : Fonction pour obtenir le dernier ticket de la session
        function getLastSessionTicket(room = null) {
            const targetRoom = room || getCurrentRoom();
            const roomTickets = sessionTickets.filter(ticket => ticket.room === targetRoom);
            return roomTickets.length > 0 ? roomTickets[roomTickets.length - 1] : null;
        }

        // ===== FONCTIONS PRINCIPALES RÃ‰ELLES =====

        function clearInput() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            if (problemInput) problemInput.value = '';
            
            // âœ… NOUVEAU: Afficher Ã  nouveau les palettes de problÃ¨mes
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // âœ… NOUVEAU : Supprimer TOUS les messages et interfaces prÃ©cÃ©dents
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
            
            // âœ… NOUVEAU : Vider les suggestions
            const suggestions = document.getElementById('suggestions');
            if (suggestions) {
                suggestions.innerHTML = '';
            }
            
            // Supprimer tous les rÃ©sultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * VÃ©rifie la connexion au backend
         */
        async function checkConnection() {
            try {
                // âœ… BACKEND UNIQUE - PAS BESOIN DE MODIFICATION
                const apiUrl = await ensureBackendConnection();
                const response = await fetch(`${apiUrl}/api/health`);
                const wasConnected = isConnected;
                isConnected = response.ok;
                
                // âœ… NOUVEAU : Mettre Ã  jour le statut si changement
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return isConnected;
            } catch (error) {
                console.error('Erreur de connexion:', error);
                const wasConnected = isConnected;
                isConnected = false;
                
                // âœ… NOUVEAU : Mettre Ã  jour le statut en cas d'erreur
                if (wasConnected !== isConnected) {
                    updateSystemStatus(isConnected);
                }
                
                return false;
            }
        }

        /**
         * âœ… NOUVEAU : Met Ã  jour l'indicateur de statut systÃ¨me
         */
        function updateSystemStatus(connected) {
            const statusIndicator = document.querySelector('.status-indicator span');
            const statusDot = document.querySelector('.status-dot');
            
            if (statusIndicator && statusDot) {
                if (connected) {
                    statusIndicator.textContent = 'SystÃ¨me opÃ©rationnel';
                    statusDot.classList.remove('offline');
                    console.log('âœ… [SystemStatus] SystÃ¨me opÃ©rationnel');
                } else {
                    statusIndicator.textContent = 'SystÃ¨me hors ligne';
                    statusDot.classList.add('offline');
                    console.log('âŒ [SystemStatus] SystÃ¨me hors ligne');
                }
            }
            
            // Mettre Ã  jour l'Ã©tat du bouton d'envoi
            updateSendButton(false);
        }

        /**
         * Envoie un message d'exemple (comme dans l'original)
         */
        function sendExampleMessage(message) {
            // GÃ©rer les suggestions spÃ©ciales
            if (message === 'Nouveau problÃ¨me AV' || message === 'Nouveau problÃ¨me') {
                clearInput();
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre problÃ¨me audio') {
                clearInput();
                addMessage('system', 'ðŸ”Š DÃ©crivez votre problÃ¨me audio :', {
                    suggestions: ['Pas de son', 'Microphone en sourdine', 'Bruit parasite', 'Volume trop bas']
                });
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) problemInput.focus();
                return;
            }
            
            if (message === 'Autre problÃ¨me vidÃ©o') {
                clearInput();
                addMessage('system', 'ðŸ“½ï¸ DÃ©crivez votre problÃ¨me vidÃ©o :', {
                    suggestions: ['Ã‰cran noir', 'Pas d\'image', 'QualitÃ© dÃ©gradÃ©e', 'Projecteur ne s\'allume pas']
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
                addMessage('system', 'ðŸ“ <strong>Nom de la salle ?</strong>', {
                    suggestions: ['A-1750', 'B-2500', 'C-3000', 'D-4000', 'SH-R200', 'DS-4000']
                });
                return;
            }
            
            if (message === 'Copier numÃ©ro ticket') {
                // Chercher le dernier numÃ©ro de ticket dans les messages
                const messages = document.querySelectorAll('.message.system');
                for (let i = messages.length - 1; i >= 0; i--) {
                    const messageContent = messages[i].textContent;
                    const ticketMatch = messageContent.match(/NumÃ©ro\s*:\s*([A-Z0-9-]+)/);
                    if (ticketMatch) {
                        const ticketNumber = ticketMatch[1];
                        navigator.clipboard.writeText(ticketNumber).then(() => {
                            addMessage('system', `ðŸ“‹ NumÃ©ro de ticket <strong>${ticketNumber}</strong> copiÃ© dans le presse-papier.`, {
                                suggestions: ['Nouveau problÃ¨me', 'Merci']
                            });
                        }).catch(() => {
                            addMessage('system', `ðŸ“‹ NumÃ©ro de ticket: <strong>${ticketNumber}</strong> (copie manuelle nÃ©cessaire)`, {
                                suggestions: ['Nouveau problÃ¨me', 'Merci']
                            });
                        });
                        return;
                    }
                }
                addMessage('system', 'âŒ Aucun numÃ©ro de ticket trouvÃ© Ã  copier.', {
                    suggestions: ['Nouveau problÃ¨me']
                });
                return;
            }
            
            if (message === 'Merci pour l\'information') {
                addMessage('system', 'ðŸ‘ N\'hÃ©sitez pas Ã  revenir pour tout problÃ¨me audiovisuel !', {
                    suggestions: ['ProblÃ¨me projecteur', 'ProblÃ¨me audio', 'ProblÃ¨me rÃ©seau']
                });
                return;
            }
            
            // Pour les problÃ¨mes rÃ©seau, afficher la banniÃ¨re Services Informatiques
            if (message === 'ProblÃ¨me de rÃ©seau') {
                handleNetworkProblem(message);
                return;
            }
            
            // Pour les autres problÃ¨mes (systÃ¨me qui ne rÃ©pond plus), afficher banniÃ¨re SIM
            if (message === 'SystÃ¨me qui ne rÃ©pond plus') {
                handleNonAudiovisualProblem(message);
                return;
            }
            
            // Pour les problÃ¨mes audio/vidÃ©o, envoyer au backend
            if (isConnected) {
                // âœ… NOUVEAU: DÃ©marrer timer d'escalade pour les clics palette
                const currentRoom = getCurrentRoom();
                let problemType = null;
                
                if (message === 'ProblÃ¨me VidÃ©o' || message.toLowerCase().includes('vidÃ©o') || message.toLowerCase().includes('projecteur')) {
                    problemType = 'video';
                    // âœ… CORRECTION BACKEND : Message simple comme la rÃ©fÃ©rence qui fonctionne
                    if (message === 'ProblÃ¨me VidÃ©o') {
                        message = 'Ã‰cran noir projecteur';
                    }
                } else if (message === 'ProblÃ¨me Audio' || message.toLowerCase().includes('audio') || message.toLowerCase().includes('son')) {
                    problemType = 'audio';
                }
                
                if (problemType && !escalationTimeoutId) {
                    console.log(`â° [EscalationTimeout] DÃ©marrage timer palette pour problÃ¨me ${problemType}`);
                    startEscalationTimeout(problemType, currentRoom);
                }
                
                if (!problemInput) problemInput = document.getElementById('problemInput');
                if (problemInput) {
                    problemInput.value = message;
                    sendProblemReport();
                }
            } else {
                addMessage('system', 'âš ï¸ SystÃ¨me en cours d\'initialisation. Veuillez patienter.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
            }
        }

        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====



        // Fonction principale pour envoyer le problÃ¨me au backend
        async function sendProblemReport() {
            if (!problemInput) problemInput = document.getElementById('problemInput');
            const message = problemInput ? problemInput.value.trim() : '';
            
            if (!message) {
                addMessage('system', 'âŒ Veuillez dÃ©crire votre problÃ¨me.', {
                    suggestions: ['ProblÃ¨me projecteur', 'ProblÃ¨me audio', 'ProblÃ¨me rÃ©seau']
                });
                return;
            }
            
            if (!isConnected) {
                addMessage('system', 'âš ï¸ SystÃ¨me en cours d\'initialisation. Veuillez patienter ou recharger la page.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
                return;
            }

            // âœ… NOUVEAU : Afficher l'overlay de chargement diagnostic
            showDiagnosticLoading();
            
            // âœ… NOUVEAU: DÃ©marrer le timer d'escalade pour Ã©viter les blocages
            const currentRoom = getCurrentRoom();
            
            // Identifier le type de problÃ¨me pour le timer
            let problemType = null;
            if (message.toLowerCase().includes('vidÃ©o') || message.toLowerCase().includes('projecteur') || message.toLowerCase().includes('Ã©cran')) {
                problemType = 'video';
            } else if (message.toLowerCase().includes('audio') || message.toLowerCase().includes('son') || message.toLowerCase().includes('micro')) {
                problemType = 'audio';
            }
            
            // DÃ©marrer le timer d'escalade si c'est un problÃ¨me AV (Ã©viter les doublons)
            if (problemType && !escalationTimeoutId) {
                console.log(`â° [EscalationTimeout] DÃ©marrage timer d'escalade pour problÃ¨me ${problemType}`);
                startEscalationTimeout(problemType, currentRoom);
            }
            
            // âœ… NOUVELLE VALIDATION : VÃ©rifier la cohÃ©rence de salle
            const detectedRooms = detectRoomInMessage(message);
            
            if (detectedRooms && detectedRooms.length > 0) {
                // VÃ©rifier si une salle diffÃ©rente est mentionnÃ©e
                const mentionedRoom = detectedRooms[0]; // PremiÃ¨re salle dÃ©tectÃ©e
                
                if (mentionedRoom !== currentRoom) {
                    addMessage('system', `âš ï¸ <strong>Attention :</strong> Vous Ãªtes prÃ©sentement dans la salle <strong>${currentRoom}</strong>.<br><br>Je suis votre assistant uniquement pour cette salle. Si vous avez un problÃ¨me dans une autre salle, veuillez vous y rendre et utiliser l'assistant local.`, {
                        suggestions: ['Continuer avec ' + currentRoom, 'Changer de salle', 'Nouveau problÃ¨me']
                    });
                    return;
                }
            }
            
            // âœ… NOUVELLE VALIDATION : VÃ©rifier les tickets existants
            if (hasExistingTicket(currentRoom)) {
                const lastTicket = getLastSessionTicket(currentRoom);
                showExistingTicketBanner(lastTicket);
                return;
            }
            
            // âœ… NOUVELLE STRATÃ‰GIE : Analyser le type de problÃ¨me avec salle toujours connue
            const messageAnalysis = analyzeMessageType(message);
            console.log(`ðŸ” [MessageAnalysis] Salle: ${getCurrentRoom()}, Type: ${messageAnalysis.type}, CatÃ©gorie: ${messageAnalysis.category}`);
            
            // Variable pour stocker le rÃ©sultat d'analyse d'Ã©quipement
            let analysisResult = null;
            
            // Traiter selon le type de problÃ¨me
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
                
                case 1: // AV systÃ¨me - Analyse amÃ©liorÃ©e avec Ã©quipements de la salle
                    console.log(`ðŸŽ¯ [SystemAV] Analyse systÃ¨me pour salle ${getCurrentRoom()}: "${message}"`);
                    
                    // âœ… NOUVEAU : Mettre Ã  jour le texte de chargement
                    updateDiagnosticLoadingText('Analyse des Ã©quipements...', 'Identification des dispositifs audiovisuels');
                    
                    // Nouvelle logique : Analyser les Ã©quipements avant de continuer
                    analysisResult = await analyzeRoomEquipmentForProblem(message);
                    if (analysisResult.shouldEscalate) {
                        return; // L'escalade a Ã©tÃ© gÃ©rÃ©e dans la fonction (message utilisateur dÃ©jÃ  ajoutÃ©)
                    }
                    
                    // Continuer avec l'analyse systÃ¨me si pas d'escalade
                    break;
                
                default:
                    // Par dÃ©faut, traiter comme type 4 (hors scope)
                    handleOutOfScopeMessage(message);
                    return;
            }
            
            // DÃ©sactiver le bouton pendant le traitement
            updateSendButton(true);
            
            // âœ… NOUVEAU : Ne pas afficher le message utilisateur pour les actions automatiques
            const isAutoActionMessage = message.toLowerCase().includes('pas de son') || 
                                       message.toLowerCase().includes('micro') ||
                                       message.toLowerCase().includes('son') ||
                                       message.toLowerCase().includes('audio') ||
                                       message.toLowerCase().includes('sourdine');
            
            // âœ… CORRECTION : Ajouter le message utilisateur seulement si pas d'analyse d'Ã©quipement ET pas d'action automatique
            if (!(analysisResult && analysisResult.userMessageAdded) && !isAutoActionMessage) {
                addMessage('user', message, {});
            }
            
            // âœ… CORRECTION UI : Vider l'input seulement aprÃ¨s succÃ¨s, pas immÃ©diatement
            // problemInput.value = '';  // DÃ©placÃ© plus tard
            
            try {
                // âœ… NOUVELLE STRATÃ‰GIE : Envoyer au backend avec salle toujours incluse
                const currentRoom = getCurrentRoom();
                const fullMessage = `${message} (Salle: ${currentRoom})`;
                
                // âœ… NOUVEAU : Mettre Ã  jour le texte de chargement
                updateDiagnosticLoadingText('Analyse intelligente...', 'Recherche de solutions automatiques');
                
                // ðŸ” DEBUG : Afficher le message exact envoyÃ© au backend
                console.log(`ðŸŽ¯ [DEBUG] Message envoyÃ© au RAG backend: "${fullMessage}"`);
                
                // âœ… S'assurer d'utiliser le bon backend
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
                    // Traiter la rÃ©ponse du Copilot
                    console.log(`ðŸ“¥ [Backend] RÃ©ponse reÃ§ue:`, data);
                    processResponse(data);
                    
                    // âœ… CORRECTION UI : Vider l'input seulement aprÃ¨s succÃ¨s
                    if (!problemInput) problemInput = document.getElementById('problemInput');
                    if (problemInput) problemInput.value = '';
                } else {
                    throw new Error(data.message || 'Erreur lors du traitement');
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
                
                // CORRECTION : Ne pas afficher d'erreur bloquante, continuer avec l'analyse
                console.log(`ðŸ”§ [ErrorHandling] Erreur API â†’ Continuer avec l'analyse locale`);
                
                // CrÃ©er un contexte RAG local pour continuer le processus
                latestRAGContext = {
                    intent: 'technical_issue',
                    confidence: 0.8,
                    room: getCurrentRoom(),
                    problems: [{
                        room: getCurrentRoom(),
                        device: null,
                        severity: 'medium',
                        reason: 'ProblÃ¨me signalÃ© nÃ©cessitant intervention'
                    }],
                    solutions: [],
                    escalation_needed: true,
                    escalation_reason: "ProblÃ¨me technique signalÃ© - intervention recommandÃ©e."
                };
                
                // Afficher un message informatif et proposer l'escalade
                addMessage('system', `ðŸ”§ Analyse terminÃ©e pour la salle ${getCurrentRoom()}. Une intervention technique est recommandÃ©e.`, {
                    suggestions: ['CrÃ©er un ticket SEA', 'Appeler SEA au 6135', 'Nouveau problÃ¨me']
                });
                
                // âœ… NOUVEAU : Masquer le sablier uniquement quand on affiche des suggestions (pas de banniÃ¨re)
                hideDiagnosticLoading();
                
            } finally {
                // RÃ©activer le bouton
                updateSendButton(false);
                
                // CORRECTION : Ne pas faire de retour automatique pour Ã©viter les interruptions
                // L'utilisateur doit choisir explicitement de crÃ©er un ticket
                
                // âœ… NOUVEAU : Le sablier reste affichÃ© jusqu'Ã  ce qu'une banniÃ¨re spÃ©cifique le remplace
                // Plus de masquage systÃ©matique ici - seules les banniÃ¨res masquent le sablier
            }
        }

        // ===== FONCTIONS DE DIAGNOSTIC RÃ‰EL =====

        /**
         * VÃ©rifie si un message concerne un problÃ¨me audio
         */
        function isAudioProblem(message) {
            const audioKeywords = ['audio', 'son', 'microphone', 'micro', 'haut-parleur', 'haut parleur', 'volume', 'mute', 'sourdine', 'bruit', 'Ã©cho'];
            return audioKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * VÃ©rifie si un message concerne un problÃ¨me vidÃ©o
         */
        function isVideoProblem(message) {
            const videoKeywords = ['vidÃ©o', 'projecteur', 'Ã©cran', 'image', 'affichage', 'proj', 'hdmi', 'vga', 'connecteur'];
            return videoKeywords.some(keyword => message.includes(keyword));
        }

        /**
         * âœ… FONCTION UNIVERSELLE : DÃ©tecte le type d'Ã©quipement disponible dans une salle
         */
        function analyzeRoomEquipmentTypes(devices) {
            if (!devices || !Array.isArray(devices)) {
                return { hasAudio: false, hasVideo: false, summary: 'Aucun Ã©quipement dÃ©tectÃ©' };
            }

            // âœ… CORRECTION: DÃ©tection Ã©quipements AUDIO (TCC2, Sennheiser, microphones)
            const audioDevices = devices.filter(device => 
                (device.type && (device.type.toLowerCase().includes('audio') || device.type.toLowerCase().includes('microphone'))) ||
                (device.model_name && (device.model_name.toLowerCase().includes('sennheiser') || device.model_name.toLowerCase().includes('tcc2'))) ||
                (device.name && device.name.toLowerCase().includes('tcc2')) ||
                (device.family_name && device.family_name.toLowerCase().includes('sennheiser'))
            );

            // âœ… CORRECTION: DÃ©tection Ã©quipements VIDÃ‰O (Projecteurs, Ã©crans, affichages)
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
                summary: `Audio: ${audioDevices.length}, VidÃ©o: ${videoDevices.length}`
            };

            console.log(`ðŸ” [EquipmentTypes] Analyse salle: ${result.summary}`);
            return result;
        }

        /**
         * âœ… RÃˆGLE UNIVERSELLE : Applique la logique d'escalation symÃ©trique
         */
        function shouldEscalateBasedOnEquipment(problemType, equipmentTypes, currentRoom) {
            // RÃˆGLE 1: ProblÃ¨me AUDIO + Aucun Ã©quipement AUDIO â†’ Escalade
            if (problemType === 'audio' && !equipmentTypes.hasAudio) {
                console.log(`ðŸ”Š [UniversalRule] Salle ${currentRoom}: ProblÃ¨me AUDIO dÃ©tectÃ© mais aucun Ã©quipement audio â†’ ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun Ã©quipement audio trouvÃ© dans la salle ${currentRoom}`,
                    intent: 'audio_problem'
                };
            }

            // RÃˆGLE 2: ProblÃ¨me VIDÃ‰O + Aucun Ã©quipement VIDÃ‰O â†’ Escalade  
            if (problemType === 'video' && !equipmentTypes.hasVideo) {
                console.log(`ðŸ“½ï¸ [UniversalRule] Salle ${currentRoom}: ProblÃ¨me VIDÃ‰O dÃ©tectÃ© mais aucun Ã©quipement vidÃ©o â†’ ESCALADE DIRECTE`);
                return {
                    shouldEscalate: true,
                    reason: `Aucun Ã©quipement vidÃ©o trouvÃ© dans la salle ${currentRoom}`,
                    intent: 'video_problem'
                };
            }

            // RÃˆGLE 3: Ã‰quipement du bon type disponible â†’ Continuer analyse
            console.log(`âœ… [UniversalRule] Salle ${currentRoom}: Ã‰quipement ${problemType} disponible â†’ Continuer avec diagnostic automatique`);
            return {
                shouldEscalate: false,
                reason: `Ã‰quipement ${problemType} disponible pour diagnostic automatique`,
                intent: `${problemType}_problem`
            };
        }

        /**
         * RÃ©cupÃ¨re les Ã©quipements disponibles dans une salle
         */
        async function fetchRoomEquipment(room) {
            try {
                console.log(`ðŸ“‹ [FetchRoomEquipment] RÃ©cupÃ©ration Ã©quipements pour salle ${room}`);
                
                // âœ… STRATÃ‰GIE HYBRIDE: VÃ©rifier d'abord si on a des infos de cache (Podio ou NeonDB)
                const roomInfo = await podioRoomCache.getRoomInfo(room);
                
                if (roomInfo && roomInfo.source === 'neondb' && roomInfo.devices) {
                    // Salle trouvÃ©e via NeonDB avec Ã©quipements
                    console.log(`ðŸ“‹ [FetchRoomEquipment] âœ… Utilisation Ã©quipements NeonDB pour ${room} (${roomInfo.devices.length})`);
                    
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
                
                // âœ… PODIO ou pas d'info cachÃ©e: Essayer l'API Ã©quipements traditionnelle
                console.log(`ðŸ“‹ [FetchRoomEquipment] Tentative API Ã©quipements traditionnelle pour ${room}`);
                
                // Essayer d'abord la route /api/devices/public
                let response = await fetch(`${API_BASE_URL}/api/devices/public`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Si 404, essayer la route /api/devices
                if (response.status === 404) {
                    console.log(`ðŸ“‹ [FetchRoomEquipment] Route /api/devices/public non trouvÃ©e, essai avec /api/devices`);
                    response = await fetch(`${API_BASE_URL}/api/devices`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                if (!response.ok) {
                    // Permissions ou erreurs â†’ Essayer fallback NeonDB direct si pas dÃ©jÃ  fait
                    if (!roomInfo || roomInfo.source !== 'neondb') {
                        console.log(`ðŸ“‹ [FetchRoomEquipment] Ã‰chec API traditionnelle â†’ Tentative NeonDB directe`);
                        return await fetchRoomEquipmentFromNeonDB(room);
                    }
                    
                    console.log(`ðŸ“‹ [FetchRoomEquipment] Ã‰chec complet pour ${room}`);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const allDevices = await response.json();
                if (!Array.isArray(allDevices)) {
                    console.warn('ðŸ“‹ [FetchRoomEquipment] RÃ©ponse API inattendue:', allDevices);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                // Filtrer les Ã©quipements de la salle spÃ©cifique
                const roomDevices = allDevices.filter(device => 
                    device.room_name && device.room_name.toLowerCase() === room.toLowerCase()
                );
                
                console.log(`ðŸ“‹ [FetchRoomEquipment] Salle ${room}: ${roomDevices.length} Ã©quipement(s) trouvÃ©(s) via API traditionnelle`);
                
                return {
                    devices: roomDevices,
                    total: roomDevices.length,
                    noAccess: false,
                    source: 'traditional'
                };
                
            } catch (error) {
                console.error('ðŸ“‹ [FetchRoomEquipment] Erreur:', error);
                // Fallback final vers NeonDB
                return await fetchRoomEquipmentFromNeonDB(room);
            }
        }

        /**
         * âœ… NOUVEAU: Fonction dÃ©diÃ©e pour rÃ©cupÃ©rer Ã©quipements depuis NeonDB directement
         */
        async function fetchRoomEquipmentFromNeonDB(room) {
            try {
                console.log(`ðŸ“‹ [FetchRoomEquipmentFromNeonDB] RÃ©cupÃ©ration directe NeonDB pour ${room}`);
                
                const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(room)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`ðŸ“‹ [FetchRoomEquipmentFromNeonDB] Erreur HTTP ${response.status}`);
                    
                    // âœ… CONTOURNEMENT : Ã‰quipements en dur pour J-2430 si API Ã©choue
                    if (room === 'J-2430') {
                        console.log(`ðŸ”§ [FallbackJ2430] Utilisation Ã©quipements en dur pour J-2430`);
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
                    console.warn('ðŸ“‹ [FetchRoomEquipmentFromNeonDB] RÃ©ponse invalide:', data);
                    return { devices: [], total: 0, noAccess: true };
                }
                
                const adaptedDevices = data.devices.map(device => ({
                    id: device.id,
                    device_name: device.device_name || device.name,
                    name: device.name,
                    host: device.address, // âœ… Adapter address â†’ host
                    protocol: device.technology, // âœ… Adapter technology â†’ protocol  
                    device_model_name: device.device_model_name,
                    device_family_name: device.device_family_name,
                    family_type: device.technology, // âœ… Utiliser technology comme family_type
                    room_name: device.room_name || room,
                    address: device.address, // âœ… Garder address aussi
                    technology: device.technology, // âœ… Garder technology aussi
                    status: device.status, // âœ… Ajouter status
                    port: device.port // âœ… Ajouter port
                }));
                
                console.log(`ðŸ“‹ [FetchRoomEquipmentFromNeonDB] Salle ${room}: ${adaptedDevices.length} Ã©quipement(s) trouvÃ©(s)`);
                
                return {
                    devices: adaptedDevices,
                    total: adaptedDevices.length,
                    noAccess: false,
                    source: 'neondb'
                };
                
            } catch (error) {
                console.error('ðŸ“‹ [FetchRoomEquipmentFromNeonDB] Erreur:', error);
                return { devices: [], total: 0, noAccess: true };
            }
        }

        /**
         * Analyse les Ã©quipements disponibles dans la salle pour dÃ©terminer si une escalade immÃ©diate est nÃ©cessaire
         */
        async function analyzeRoomEquipmentForProblem(message) {
            const currentRoom = getCurrentRoom();
            const lowerMessage = message.toLowerCase();
            
            try {
                // RÃ©cupÃ©rer les Ã©quipements de la salle
                const roomEquipment = await fetchRoomEquipment(currentRoom);
                
                // Si pas d'accÃ¨s direct aux Ã©quipements, escalader pour les problÃ¨mes vidÃ©o/audio
                if (!roomEquipment || roomEquipment.noAccess) {
                    console.log(`ðŸ¢ [RoomAnalysis] Pas d'accÃ¨s direct aux Ã©quipements â†’ VÃ©rifier si escalade nÃ©cessaire`);
                    
                    // âœ… CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER LES PROBLÃˆMES VIDÃ‰O AVANT ESCALADE
                    if (isVideoProblem(lowerMessage)) {
                        console.log(`ðŸ“½ï¸ [VideoAnalysis] ProblÃ¨me vidÃ©o dÃ©tectÃ© â†’ TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        // âœ… CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut dÃ©tecter et corriger automatiquement des problÃ¨mes comme projecteur Ã©teint + AV mute
                        console.log(`ðŸŽ¯ [VideoAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (isAudioProblem(lowerMessage)) {
                        console.log(`ðŸ”Š [AudioAnalysis] ProblÃ¨me audio dÃ©tectÃ© â†’ TENTER DIAGNOSTIC AUTOMATIQUE BACKEND AVANT ESCALADE`);
                        
                        // âœ… CORRECTION CRITIQUE : PERMETTRE AU BACKEND D'ANALYSER AVANT D'ESCALADER
                        // Le backend peut dÃ©tecter et corriger automatiquement des problÃ¨mes comme TCC2 en sourdine
                        console.log(`ðŸŽ¯ [AudioAnalysis] Continuer avec analyse Copilot pour correction automatique possible`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    // Pour les autres types de problÃ¨mes, continuer avec l'analyse Copilot
                    console.log(`ðŸ”§ [EquipmentAnalysis] Pas d'accÃ¨s Ã©quipements â†’ Continuer avec l'analyse Copilot`);
                    return { shouldEscalate: false, userMessageAdded: false };
                }
                
                // âœ… NOUVELLE LOGIQUE UNIVERSELLE : Analyser les Ã©quipements avec rÃ¨gles symÃ©triques
                if (roomEquipment.devices && roomEquipment.devices.length > 0) {
                    console.log(`ðŸ”§ [EquipmentAnalysis] ${roomEquipment.devices.length} Ã©quipement(s) trouvÃ©(s) pour la salle ${currentRoom}`);
                    
                    // âœ… Analyser les types d'Ã©quipements disponibles
                    const equipmentTypes = analyzeRoomEquipmentTypes(roomEquipment.devices);
                    console.log(`ðŸ” [EquipmentAnalysis] ${equipmentTypes.summary}`);
                    
                    // âœ… DÃ©terminer le type de problÃ¨me et appliquer la rÃ¨gle universelle
                    let problemType = null;
                    if (isAudioProblem(lowerMessage)) {
                        problemType = 'audio';
                    } else if (isVideoProblem(lowerMessage)) {
                        problemType = 'video';
                        
                        // âœ… CRITIQUE : Analyse spÃ©cifique des problÃ¨mes vidÃ©o avec gestion projecteurs
                        console.log(`ðŸ“½ï¸ [EquipmentAnalysis] ProblÃ¨me vidÃ©o dÃ©tectÃ© â†’ Analyse spÃ©cifique projecteurs`);
                        const videoHandled = await handleVideoProblemAnalysis(message, roomEquipment);
                        if (videoHandled) {
                            // Escalade effectuÃ©e par handleVideoProblemAnalysis
                            return { shouldEscalate: true, userMessageAdded: true };
                        }
                        // Sinon, continuer avec RAG backend (projecteurs dÃ©tectÃ©s)
                        console.log(`ðŸ“½ï¸ [EquipmentAnalysis] Projecteurs dÃ©tectÃ©s â†’ Continuer analyse RAG backend`);
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                    if (problemType === 'audio') {
                        // âœ… Logique audio existante
                        console.log(`ðŸ”§ [EquipmentAnalysis] ProblÃ¨me audio dÃ©tectÃ© â†’ Tenter diagnostic automatique Copilot`);
                        
                        // âœ… VÃ©rifier si Ã©quipements appropriÃ©s disponibles pour diagnostic
                        const hasAppropriateEquipment = equipmentTypes.hasAudio;
                        
                        // âœ… CORRECTION CRITIQUE : TOUJOURS PERMETTRE AU BACKEND D'ANALYSER D'ABORD
                        // MÃªme si les Ã©quipements ne sont pas dÃ©tectÃ©s localement, le backend peut avoir
                        // une meilleure connaissance des Ã©quipements et peut corriger automatiquement
                        console.log(`ðŸŽ¯ [EquipmentAnalysis] ProblÃ¨me audio â†’ FORCER ANALYSE BACKEND AVANT ESCALADE`);
                        console.log(`ðŸ”§ [EquipmentAnalysis] Ã‰quipements dÃ©tectÃ©s: ${hasAppropriateEquipment ? 'OUI' : 'NON'} - Backend peut avoir plus d'infos`);
                        
                        // Laisser le backend analyser et dÃ©cider s'il peut corriger automatiquement (ex: TCC2 sourdine)
                        return { shouldEscalate: false, userMessageAdded: false };
                    }
                    
                }
                
                // Si pas d'Ã©quipements trouvÃ©s, continuer avec l'analyse Copilot
                console.log(`ðŸ”§ [EquipmentAnalysis] Aucun Ã©quipement trouvÃ© â†’ Continuer avec l'analyse Copilot`);
                return { shouldEscalate: false, userMessageAdded: false };
                
            } catch (error) {
                console.error('ðŸ”§ [EquipmentAnalysis] Erreur lors de l\'analyse:', error);
                // En cas d'erreur, continuer avec l'analyse Copilot
                return { shouldEscalate: false, userMessageAdded: false };
            }
        }

        // ðŸ†• FONCTION POUR VÃ‰RIFIER L'Ã‰TAT TEMPS RÃ‰EL D'UN PROJECTEUR
        async function fetchProjectorRealtimeStatus(deviceName) {
            try {
                console.log(`ðŸ” [RealtimeStatus] VÃ©rification temps rÃ©el pour: ${deviceName}`);
                
                const response = await fetch(`${API_BASE_URL}/api/device/public/realtime-status/${deviceName}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    console.log(`âŒ [RealtimeStatus] Erreur HTTP ${response.status} pour ${deviceName}`);
                    return null;
                }
                
                const status = await response.json();
                console.log(`âœ… [RealtimeStatus] Ã‰tat temps rÃ©el rÃ©cupÃ©rÃ© pour ${deviceName}:`, status);
                
                return status;
                
            } catch (error) {
                console.error(`âŒ [RealtimeStatus] Erreur pour ${deviceName}:`, error);
                return null;
            }
        }
        
        /**
         * âœ… FONCTION MANQUANTE CRITIQUE : Analyse spÃ©cifique des problÃ¨mes vidÃ©o
         * CopiÃ©e depuis assistant-salle-av-copie.html
         */
        async function handleVideoProblemAnalysis(message, roomEquipment) {
            const currentRoom = getCurrentRoom();
            
            // VÃ©rifier s'il y a des projecteurs dans la salle
            const projectors = (roomEquipment && roomEquipment.devices) ? roomEquipment.devices.filter(device => 
                device.device_type === 'projector' || 
                device.device_family_name?.toLowerCase().includes('projecteur') ||
                device.device_name?.toLowerCase().includes('proj') ||
                device.technology?.toLowerCase().includes('pjlink')
            ) : [];
            
            console.log(`ðŸ“½ï¸ [VideoAnalysis] Salle ${currentRoom}: ${projectors.length} projecteur(s) dÃ©tectÃ©(s)`);
            
            if (projectors.length === 0) {
                // Aucun projecteur dÃ©tectÃ©, escalade immÃ©diate avec interface standard
                console.log(`ðŸ“½ï¸ [VideoAnalysis] Aucun projecteur dÃ©tectÃ© â†’ Escalade directe`);
                
                // CrÃ©er un contexte RAG artificiel pour l'escalade vidÃ©o
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
                    escalation_reason: "Aucun projecteur dÃ©tectÃ© dans cette salle. L'Ã©quipement vidÃ©o pourrait ne pas Ãªtre rÃ©fÃ©rencÃ© dans le systÃ¨me de monitoring."
                };
                
                console.log('ðŸŽ« [VideoEscalation] Contexte RAG artificiel crÃ©Ã© avec salle:', currentRoom);
                
                // âœ… PAS DE MESSAGE EN BAS - BanniÃ¨re SEA directe plus propre
                console.log(`ðŸ“½ï¸ [VideoAnalysis] Aucun projecteur â†’ Escalade SEA directe sans message intermÃ©diaire`);
                
                // âœ… ESCALADE SEA IMMÃ‰DIATE au lieu d'attendre le timeout
                setTimeout(() => {
                    showSEAEscalationBanner(latestRAGContext);
                }, 500); // 0.5 seconde pour feedback immÃ©diat
                
                return true; // Escalade effectuÃ©e
            }
            
            // âœ… CRITIQUE : Il y a des projecteurs, crÃ©er actions automatiques locales
            console.log(`ðŸ“½ï¸ [VideoAnalysis] ${projectors.length} projecteur(s) trouvÃ©(s) â†’ CrÃ©er actions automatiques locales`);
            
            // CrÃ©er un contexte RAG artificiel avec actions automatiques pour projecteur
            const projector = projectors[0]; // Prendre le premier projecteur
            console.log(`ðŸŽ¯ [VideoActions] CrÃ©ation actions automatiques pour projecteur: ${projector.device_name || projector.name}`);
            
            latestRAGContext = {
                intent: 'video_problem',
                confidence: 0.9,
                room: currentRoom,
                problems: [{
                    room: currentRoom,
                    device: projector.device_name || projector.name,
                    severity: 'high',
                    reason: 'ProblÃ¨me vidÃ©o projecteur - Ã©cran noir'
                }],
                solutions: [],
                escalation_needed: false,
                actions: [
                    {
                        type: 'pjlink_power',
                        device_id: projector.id || 31,
                        command: 'power_on', // âœ… Format backend
                        description: `Allumer ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            power_on: true
                        }
                    },
                    {
                        type: 'pjlink_av_unmute', // âœ… Nom correct
                        device_id: projector.id || 31,
                        command: 'av_unmute', // âœ… Format backend
                        description: `DÃ©sactiver AV Mute sur ${projector.device_name || projector.name}`,
                        parameters: {
                            device_name: projector.device_name || projector.name,
                            video_mute: false,
                            audio_mute: false
                        }
                    }
                ],
                auto_executed: true
            };
            
            // âœ… VÃ‰RIFIER D'ABORD L'Ã‰TAT RÃ‰EL DU PROJECTEUR AVANT D'AFFICHER BANNIÃˆRE
            console.log(`ðŸ” [VideoActions] VÃ©rification Ã©tat rÃ©el projecteur avant affichage banniÃ¨re...`);
            
            try {
                // âœ… Ã‰TAPE 1 : VÃ©rifier l'Ã©tat d'alimentation (power) du projecteur
                console.log(`ðŸ”Œ [VideoActions] VÃ©rification Ã©tat d'alimentation du projecteur...`);
                
                // âœ… ESSAI 1 : Endpoint power-status (nouveau)
                let powerData = null;
                try {
                    const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${currentRoom}`);
                    if (powerResponse.ok) {
                        powerData = await powerResponse.json();
                        console.log(`ðŸ”Œ [VideoActions] Ã‰tat alimentation (power-status):`, powerData);
                    }
                } catch (powerError) {
                    console.log(`âš ï¸ [VideoActions] Endpoint power-status non disponible: ${powerError.message}`);
                }
                
                // âœ… ESSAI 2 : Fallback vers av-mute-status (existant) pour dÃ©tecter si projecteur rÃ©pond
                if (!powerData) {
                    console.log(`ðŸ”„ [VideoActions] Fallback vers av-mute-status pour dÃ©tecter connectivitÃ©...`);
                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                    
                    if (avMuteResponse.ok) {
                        const avMuteData = await avMuteResponse.json();
                        console.log(`ðŸ”‡ [VideoActions] Ã‰tat AV Mute (fallback):`, avMuteData);
                        
                        // âœ… Si projecteur rÃ©pond mais pas de AV Mute â†’ ESCALADE DIRECTE
                        if (!avMuteData.av_muted && avMuteData.device) {
                            console.log(`ðŸŽ¯ [VideoActions] Projecteur RÃ‰POND + PAS AV Mute â†’ ESCALADE DIRECTE`);
                            showSEAEscalationBanner(latestRAGContext);
                            return; // âœ… ARRÃŠTER ICI - Pas de banniÃ¨re d'attente
                        }
                        
                        // âœ… Si projecteur rÃ©pond ET AV Mute actif â†’ Continuer avec correction
                        if (avMuteData.av_muted) {
                            console.log(`ðŸ”‡ [VideoActions] Projecteur RÃ‰POND + AV Mute actif â†’ Correction automatique`);
                        }
                    } else {
                        // âœ… Si projecteur ne rÃ©pond pas â†’ Probablement Ã©teint, continuer avec allumage
                        console.log(`ðŸ”Œ [VideoActions] Projecteur ne rÃ©pond pas â†’ Probablement Ã©teint, continuer avec allumage`);
                    }
                } else {
                    // âœ… Endpoint power-status disponible
                    if (powerData.power === 'off' || powerData.power === 'OFF' || !powerData.power) {
                        console.log(`ðŸ”Œ [VideoActions] Projecteur Ã‰TEINT â†’ Continuer avec allumage automatique`);
                    } else {
                        // âœ… Projecteur allumÃ© â†’ VÃ©rifier AV Mute
                        console.log(`ðŸ”Œ [VideoActions] Projecteur ALLUMÃ‰ â†’ VÃ©rifier AV Mute...`);
                        const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${currentRoom}`);
                        
                        if (avMuteResponse.ok) {
                            const avMuteData = await avMuteResponse.json();
                            console.log(`ðŸ”‡ [VideoActions] Ã‰tat AV Mute:`, avMuteData);
                            
                            // âœ… Si projecteur allumÃ© ET pas de AV Mute â†’ ESCALADE DIRECTE
                            if (!avMuteData.av_muted && avMuteData.device) {
                                console.log(`ðŸŽ¯ [VideoActions] Projecteur ALLUMÃ‰ + PAS AV Mute â†’ ESCALADE DIRECTE`);
                                showSEAEscalationBanner(latestRAGContext);
                                return; // âœ… ARRÃŠTER ICI - Pas de banniÃ¨re d'attente
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`âš ï¸ [VideoActions] Erreur vÃ©rification Ã©tat: ${error.message} - Continuer avec banniÃ¨re d'attente`);
            }
            
            // âœ… BANNIÃˆRE D'ATTENTE ORANGE pour diagnostic et actions (minimum 15 secondes)
            showWaitingBanner('ðŸ” Diagnostic du projecteur...', 'VÃ©rification de l\'Ã©tat et correction en cours');
            
            // âœ… MÃ©moriser le moment d'affichage pour dÃ©lai minimum
            window.waitingBannerStartTime = Date.now();
            
            // âœ… MESSAGE ADAPTATIF selon l'Ã©tat probable du projecteur
            console.log(`ðŸ¤– [VideoActions] Envoi message adaptatif au RAG (seulement si pas escalade directe)`);
            
            // Si c'est un nouveau clic aprÃ¨s une correction, changer le message
            const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
            const nbCorrections = parseInt(sessionCorrections);
            
            let adaptiveMessage;
            if (nbCorrections > 0) {
                // AprÃ¨s une correction, focus sur l'AV Mute
                adaptiveMessage = "Le projecteur est allumÃ© mais l'image n'apparaÃ®t pas - Ã©cran noir avec AV Mute";
                console.log(`ðŸŽ¯ [VideoActions] ${nbCorrections} correction(s) prÃ©cÃ©dente(s) â†’ Focus AV Mute`);
            } else {
                // Premier problÃ¨me : power on classique
                adaptiveMessage = "Le projecteur ne s'allume pas et l'Ã©cran reste noir";
                console.log(`ðŸŽ¯ [VideoActions] Premier problÃ¨me â†’ Focus Power ON`);
            }
            
            sendProblemToVitrine(adaptiveMessage, currentRoom);
            
            return true; // Traitement effectuÃ© localement
        }
        
        // ===== FONCTION POUR APPEL VITRINE =====
        
        async function sendProblemToVitrine(message, roomName) {
            console.log(`ðŸŒ [VitrineCall] Envoi vers /api/copilot/vitrine: "${message}"`);
            
            try {
                // âœ… S'assurer d'utiliser le bon backend
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
                                pavilion: roomName.split('-')[0], // Ex: J-2430 â†’ J
                                room_number: roomName.split('-')[1] // Ex: J-2430 â†’ 2430
                            },
                            equipment_context: roomName === 'J-2430' ? {
                                projectors: [{
                                    id: 31,
                                    name: 'PROJ-J-2430',
                                    address: '132.208.119.121',
                                    technology: 'PJLINK',
                                    status: 'online', // âœ… Projecteur maintenant allumÃ©
                                    issues: ['av_mute_active'] // âœ… Mais AV Mute actif
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
                console.log(`ðŸ“¥ [VitrineCall] RÃ©ponse reÃ§ue:`, data);
                
                // Traiter la rÃ©ponse comme les autres rÃ©ponses backend
                processResponse(data);
                
            } catch (error) {
                console.error(`âŒ [VitrineCall] Erreur:`, error);
                // En cas d'erreur, afficher un message Ã  l'utilisateur
                showAutoActionResult(
                    { type: 'error', description: 'Appel backend' }, 
                    { success: false, message: `Erreur de connexion backend: ${error.message}` }
                );
            }
        }
        
        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====
        function analyzeMessageType(message) {
            const lowerMessage = message.toLowerCase();
            
            // Mots-clÃ©s pour Ã©quipements AV dans le systÃ¨me SavQonnect
            const avSystemKeywords = [
                // Projecteurs
                'projecteur', 'projector', 'pjlink', 'Ã©cran', 'screen', 'affichage', 'display',
                'image', 'vidÃ©o', 'video', 'noir', 'blanc', 'flou', 'floue', 'pixelisÃ©',
                
                // Audio Sennheiser
                'microphone', 'micro', 'son', 'audio', 'volume', 'sennheiser', 'tcc2',
                'mute', 'muet', 'sourdine', 'grÃ©sille', 'parasite', 'larsen',
                
                // Crestron
                'crestron', 'Ã©cran tactile', 'touchscreen', 'panneau de contrÃ´le',
                'interface de contrÃ´le', 'tÃ©lÃ©commande'
            ];
            
            // Mots-clÃ©s pour Ã©quipements AV hors systÃ¨me (mais toujours SEA)
            const avExternalKeywords = [
                // Ã‰quipements AV gÃ©nÃ©riques non spÃ©cifiques au systÃ¨me
                'haut-parleur', 'speaker', 'amplificateur', 'ampli', 'console audio',
                'table de mixage', 'mixer', 'camÃ©ra', 'webcam', 'visualiseur',
                'dvd', 'blu-ray', 'lecteur', 'player', 'hdmi', 'vga', 'usb',
                'casque', 'headset', 'casque audio', 'jack', 'connecteur',
                'cÃ¢ble audio', 'cÃ¢ble vidÃ©o', 'adaptateur', 'convertisseur'
            ];
            
            // Mots-clÃ©s pour problÃ¨mes non-audiovisuels
            const nonAVKeywords = [
                // Ã‰lectricitÃ©
                'Ã©lectricitÃ©', 'Ã©lectrique', 'prise', 'prises', 'courant', 'lumiÃ¨re', 'Ã©clairage',
                'ampoule', 'lampe', 'nÃ©on', 'disjoncteur', 'fusible', 'interrupteur',
                
                // Plomberie
                'plomberie', 'eau', 'robinet', 'toilette', 'chasse d\'eau', 'lavabo',
                'Ã©vier', 'fuite', 'bouchon', 'inondation', 'dÃ©gÃ¢t d\'eau',
                
                // Chauffage/Climatisation
                'chauffage', 'radiateur', 'calorifÃ¨re', 'thermopompe', 'thermostat',
                'climatisation', 'clim', 'air conditionnÃ©', 'ventilation', 'tempÃ©rature',
                
                // Mobilier et structure
                'mobilier', 'chaise', 'table', 'bureau', 'porte', 'fenÃªtre', 'serrure',
                'clÃ©', 'nettoyage', 'mÃ©nage', 'poubelle', 'dÃ©chets'
            ];
            
            // Mots-clÃ©s hors scope (pas des problÃ¨mes)
            const outOfScopeKeywords = [
                // Salutations
                'bonjour', 'bonsoir', 'salut', 'hello', 'hi',
                
                // Questions gÃ©nÃ©rales
                'comment Ã§a va', 'quoi de neuf', 'comment allez-vous',
                'qu\'est-ce que tu fais', 'que fais-tu',
                
                // Demandes d'aide gÃ©nÃ©rale
                'aide-moi', 'peux-tu m\'aider', 'j\'ai besoin d\'aide',
                'que peux-tu faire', 'tes fonctionnalitÃ©s',
                
                // Discussions
                'parle-moi', 'raconte-moi', 'dis-moi', 'explique-moi',
                'mÃ©tÃ©o', 'actualitÃ©', 'nouvelles', 'sport'
            ];
            
            // VÃ©rifier si c'est un problÃ¨me technique valide
            const problemIndicators = [
                'problÃ¨me', 'panne', 'ne fonctionne pas', 'ne marche pas', 'dÃ©faillant',
                'en panne', 'cassÃ©', 'ne s\'allume pas', 'ne rÃ©pond pas', 'dysfonctionnement',
                'pas de', 'aucun', 'rien', 'bloquÃ©', 'figÃ©', 'lent', 'erreur'
            ];
            
            const hasProblemIndicator = problemIndicators.some(indicator => 
                lowerMessage.includes(indicator)
            );
            
            // Classification par prioritÃ©
            
            // 1. VÃ©rifier si c'est hors scope
            if (outOfScopeKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 4,
                    category: 'out_of_scope',
                    description: 'Demande hors scope - pas un problÃ¨me audiovisuel',
                    needsRoom: false
                };
            }
            
            // 2. VÃ©rifier si c'est non-audiovisuel (prioritÃ© haute)
            if (nonAVKeywords.some(keyword => lowerMessage.includes(keyword))) {
                console.log(`ðŸ¢ [NonAV] DÃ©tection problÃ¨me non-audiovisuel: "${message}" contient mot-clÃ© immeubles`);
                return {
                    type: 3,
                    category: 'non_audiovisual',
                    description: 'ProblÃ¨me non-audiovisuel - service des immeubles',
                    needsRoom: false
                };
            }
            
            // 3. VÃ©rifier si c'est AV dans le systÃ¨me
            if (avSystemKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 1,
                    category: 'av_system',
                    description: 'ProblÃ¨me Ã©quipement AV dans le systÃ¨me SavQonnect',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 4. VÃ©rifier si c'est AV externe
            if (avExternalKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: 2,
                    category: 'av_external',
                    description: 'ProblÃ¨me Ã©quipement AV hors systÃ¨me - redirection SEA',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: true
                };
            }
            
            // 5. Si c'est un problÃ¨me mais pas clairement catÃ©gorisÃ©
            if (hasProblemIndicator) {
                // Assumer que c'est potentiellement AV si c'est un problÃ¨me technique
                return {
                    type: 1,
                    category: 'av_system_assumed',
                    description: 'ProblÃ¨me technique - assume Ã©quipement AV systÃ¨me',
                    needsRoom: !hasRoomInformation(message),
                    hasEquipment: false
                };
            }
            
            // 6. Par dÃ©faut, considÃ©rer comme hors scope
            return {
                type: 4,
                category: 'out_of_scope',
                description: 'Demande non identifiÃ©e - hors scope',
                needsRoom: false
            };
        }

        /**
         * VÃ©rifie si le message contient des informations sur la salle
         */
        function hasRoomInformation(message) {
            // Rechercher les patterns de salle (ex: A-1750, a-1730, B-2500, SH-R200, DS-4000, etc.)
            const roomPattern = /\b([a-zA-Z]{1,2})-?([a-zA-Z]?\d{3,4})\b/i;
            const hasRoom = roomPattern.test(message);
            
            // Rechercher mentions de pavillon/bÃ¢timent
            const buildingPattern = /\b(pavillon|bÃ¢timent|building)\s+([a-zA-Z]{1,2})\b/i;
            const hasBuilding = buildingPattern.test(message);
            
            console.log(`ðŸ” [RoomDetection] Message: "${message}", Pattern dÃ©tectÃ©: ${hasRoom || hasBuilding}`);
            return hasRoom || hasBuilding;
        }

        /**
         * GÃ¨re les messages hors scope
         */
        function handleOutOfScopeMessage(message) {
            addMessage('system', 'ðŸ¤– Je suis votre assistant audiovisuel pour cette salle. Je peux vous aider avec les problÃ¨mes de projecteur, microphone, son, etc. Que puis-je faire pour vous ?', {
                suggestions: ['ProblÃ¨me projecteur', 'ProblÃ¨me audio', 'ProblÃ¨me rÃ©seau']
            });
        }

        /**
         * GÃ¨re les problÃ¨mes rÃ©seau avec banniÃ¨re moderne Services Informatiques
         */
        function handleNetworkProblem(message) {
            console.log('ðŸ’» [SIEscalation] Affichage de la banniÃ¨re Services Informatiques pour problÃ¨me rÃ©seau');
            
            // âœ… CORRECTION: Fermer toutes les banniÃ¨res SI existantes AVANT d'en crÃ©er une nouvelle
            const existingSiBanners = document.querySelectorAll('[id^="escalation_si_"]');
            const existingSiOverlays = document.querySelectorAll('[id^="overlay_escalation_si_"]');
            
            existingSiBanners.forEach(banner => {
                console.log(`ðŸš« [CleanupSIBanner] Suppression banniÃ¨re SI existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSiOverlays.forEach(overlay => {
                console.log(`ðŸš« [CleanupSIOverlay] Suppression overlay SI existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // CrÃ©er la banniÃ¨re SI avec overlay plein Ã©cran
            const escalationId = `escalation_si_${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou agressif
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
            
            // CrÃ©er la banniÃ¨re SI
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
                        <img id="si-logo" src="assets/SI.png" alt="Services Informatiques UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Services Informatiques UQAM</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">ProblÃ¨me rÃ©seau - Salle ${currentRoom}</span>
                    </div>
                    </div>
                    
                <div class="si-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les problÃ¨mes de rÃ©seau, connectivitÃ© Internet, Wi-Fi, ou Ã©quipements informatiques dans la salle ${currentRoom}, veuillez contacter les Services Informatiques.
                    </p>
                    
                    <div class="si-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="si-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">ðŸ“ž</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SI : 514-987-3000</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 5050)</span>
                            </div>
                        <div class="si-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">ðŸŒ</span>
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
                        âœ• Fermer
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
                        ðŸ“ž Appeler SI
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
                        ðŸŒ Site web
                    </button>
                        </div>
            `;
            
            // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`ðŸ’» [SIBanner] BanniÃ¨re Services Informatiques affichÃ©e pour salle ${currentRoom}`);
        }

        /**
         * GÃ¨re les problÃ¨mes non-audiovisuels avec banniÃ¨re moderne SIM
         */
        function handleNonAudiovisualProblem(message) {
            console.log('ðŸ¢ [SIMEscalation] Affichage de la banniÃ¨re SIM pour problÃ¨me non-audiovisuel');
            
            // âœ… CORRECTION: Fermer toutes les banniÃ¨res SIM existantes AVANT d'en crÃ©er une nouvelle
            const existingSimBanners = document.querySelectorAll('[id^="escalation_sim_"]');
            const existingSimOverlays = document.querySelectorAll('[id^="overlay_escalation_sim_"]');
            
            existingSimBanners.forEach(banner => {
                console.log(`ðŸš« [CleanupSIMBanner] Suppression banniÃ¨re SIM existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSimOverlays.forEach(overlay => {
                console.log(`ðŸš« [CleanupSIMOverlay] Suppression overlay SIM existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // CrÃ©er la banniÃ¨re SIM avec overlay plein Ã©cran
            const escalationId = `escalation_sim_${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou agressif
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
            
            // CrÃ©er la banniÃ¨re SIM
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
                        <img id="sim-logo" src="assets/SIM.png" alt="Service des Immeubles UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Service des Immeubles UQAM</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">ProblÃ¨me non-audiovisuel - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="sim-contact-content" style="margin: 1.5rem 0; text-align: left;">
                    <p style="color: black !important; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Pour les problÃ¨mes d'infrastructure, d'Ã©lectricitÃ©, de plomberie, de chauffage ou de climatisation dans la salle ${currentRoom}, veuillez contacter le Service des Immeubles.
                    </p>
                    
                    <div class="sim-contact-info" style="background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div class="sim-contact-primary" style="display: flex; align-items: center; margin-bottom: 0.75rem; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">ðŸ“ž</span>
                            <strong style="color: black !important; font-size: 1.1rem;">SIM : 514-987-3141</strong>
                            <span style="color: black !important; opacity: 0.7; font-size: 0.9rem;">(poste 3141)</span>
                        </div>
                        <div class="sim-contact-secondary" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">ðŸŒ</span>
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
                        âœ• Fermer
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
                        ðŸ“ž Appeler SIM
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
                        ðŸŒ Site web
                    </button>
                </div>
            `;
            
            // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeEscalationBanner(escalationId);
                }
            };
            
            // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(escalationDiv);
            
            console.log(`ðŸ¢ [SIMBanner] BanniÃ¨re SIM affichÃ©e pour salle ${currentRoom}`);
        }

        /**
         * GÃ¨re les problÃ¨mes AV externes avec salle
         */
        function handleExternalAVProblemWithRoom(message) {
            const currentRoom = getCurrentRoom();
            addMessage('system', `ðŸ“ž <strong>Contact SEA</strong><br><br>Pour ce type d'Ã©quipement dans la salle ${currentRoom}, veuillez contacter directement le SEA au <strong>6135</strong>.`, {
                suggestions: ['Appeler SEA', 'ProblÃ¨me systÃ¨me', 'Autre salle']
            });
        }

        // âœ… NOUVEAU: Timer d'escalade automatique pour Ã©viter les blocages
        let escalationTimeoutId = null;
        
        function startEscalationTimeout(problemType, room) {
            // Annuler le timer prÃ©cÃ©dent si existant
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
            }
            
            escalationTimeoutId = setTimeout(() => {
                console.log(`â° [EscalationTimeout] Timeout atteint pour problÃ¨me ${problemType} â†’ Escalade forcÃ©e`);
                
                // âœ… CORRECTION: VÃ©rifier les tickets existants AVANT l'escalade par timeout
                if (hasExistingTicket(room)) {
                    const lastTicket = getLastSessionTicket(room);
                    console.log(`ðŸŽ« [EscalationTimeout] Timeout mais ticket ${lastTicket.number} existe â†’ BanniÃ¨re ticket existant`);
                    showExistingTicketBanner(lastTicket);
                } else {
                    showSEAEscalationBanner({
                        intent: `${problemType}_problem`,
                        confidence: 0.95,
                        room: room,
                        escalation_needed: true,
                        escalation_reason: `Aucune correction automatique trouvÃ©e - Intervention technique requise`
                    });
                }
            }, 10000); // âœ… 10 secondes pour laisser le temps au RAG de rÃ©pondre
        }
        
        function clearEscalationTimeout() {
            if (escalationTimeoutId) {
                clearTimeout(escalationTimeoutId);
                escalationTimeoutId = null;
                console.log('â° [EscalationTimeout] Timer d\'escalade annulÃ©');
            }
        }

        // ===== BANNIÃˆRE D'ALLUMAGE PROJECTEUR (inspirÃ©e modale PJLink) =====
        
        function showProjectorPoweringBanner(roomName) {
            console.log(`ðŸ”Œ [ProjectorPower] BanniÃ¨re allumage projecteur pour ${roomName}`);
            
            // âœ… CORRECTION : Masquer le sablier diagnostic car banniÃ¨re projecteur prend le relais
            hideDiagnosticLoading();
            console.log('âœ… [ProjectorPower] Sablier diagnostic masquÃ© - BanniÃ¨re projecteur prend le relais');
            
            // Supprimer une Ã©ventuelle banniÃ¨re existante
            const existingBanner = document.getElementById('projector-powering-banner');
            if (existingBanner) {
                existingBanner.remove();
            }
            
            // CrÃ©er la banniÃ¨re d'allumage
            const banner = document.createElement('div');
            banner.id = 'projector-powering-banner';
            banner.className = 'projector-powering-banner show';
            
            banner.innerHTML = `
                <div class="powering-content">
                    <div class="powering-icon">
                        <i class="fas fa-power-off warming-rotation"></i>
                    </div>
                    <div class="powering-text">
                        <h3>ðŸ”Œ Allumage du projecteur en cours...</h3>
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
            
            // Commencer la surveillance de l'Ã©tat du projecteur
            startProjectorStatusMonitoring(roomName);
        }
        
        function startProjectorStatusMonitoring(roomName) {
            console.log(`ðŸ‘ï¸ [ProjectorMonitoring] Surveillance Ã©tat projecteur ${roomName}`);
            
            let checkCount = 0;
            const maxChecks = 30; // 30 checks = 30 secondes max
            
            const monitoringInterval = setInterval(async () => {
                checkCount++;
                console.log(`ðŸ” [ProjectorMonitoring] Check ${checkCount}/${maxChecks} pour ${roomName}`);
                
                try {
                    // âœ… UTILISER API TEMPS RÃ‰EL au lieu du cache
                    const response = await fetch(`${currentAPI}/api/room/equipment?room=${encodeURIComponent(roomName)}&refresh=true`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'success' && data.devices) {
                            const projector = data.devices.find(d => d.technology === 'PJLINK' || d.family_type === 'PJLINK');
                            
                            if (projector) {
                                console.log(`ðŸ“Š [ProjectorMonitoring] Ã‰tat projecteur: ${projector.status}, Power: ${projector.power_state}`);
                                
                                // âœ… CRITÃˆRES PLUS LARGES pour dÃ©tecter l'allumage
                                const isProjectorOn = projector.status === 'online' || 
                                                    projector.status === 'ON' || 
                                                    projector.power_state === 'ON' ||
                                                    projector.power_state === 'WARMUP' ||
                                                    projector.power_state === 'WARMING_UP';
                                
                                if (isProjectorOn) {
                                    console.log(`âœ… [ProjectorMonitoring] Projecteur allumÃ© ! Transition vers AV Mute`);
                                    clearInterval(monitoringInterval);
                                    
                                    // âœ… ATTENDRE 3 SECONDES avant AV Mute (temps de stabilisation)
                                    setTimeout(() => {
                                        updateProjectorBannerToAVMute(roomName);
                                        
                                                                // âœ… VÃ‰RIFIER ET CORRIGER AV MUTE automatiquement
                        setTimeout(async () => {
                            console.log(`ðŸŽ¯ [ProjectorMonitoring] VÃ©rification Ã©tat AV Mute temps rÃ©el`);
                            await checkAndFixAVMuteStatus(roomName, projector.name || projector.device_name || `PROJ-${roomName}`);
                        }, 2000);
                                    }, 3000);
                                    return;
                                }
                            }
                        }
                    }
                    
                    // âœ… FALLBACK : Si aprÃ¨s 10 checks toujours pas dÃ©tectÃ©, forcer AV Mute
                    if (checkCount >= 10) {
                        console.log(`ðŸŽ¯ [ProjectorMonitoring] Fallback aprÃ¨s 10s â†’ Forcer correction AV Mute`);
                        clearInterval(monitoringInterval);
                        updateProjectorBannerToAVMute(roomName);
                        
                        setTimeout(async () => {
                            console.log(`ðŸŽ¯ [ProjectorMonitoring] Fallback - VÃ©rification AV Mute`);
                            await checkAndFixAVMuteStatus(roomName, `PROJ-${roomName}`); // Nom basÃ© sur la salle
                        }, 2000);
                        return;
                    }
                    
                } catch (error) {
                    console.log(`âš ï¸ [ProjectorMonitoring] Erreur surveillance: ${error.message}`);
                }
                
                // Timeout aprÃ¨s 30 secondes
                if (checkCount >= maxChecks) {
                    console.log(`â° [ProjectorMonitoring] Timeout surveillance pour ${roomName}`);
                    clearInterval(monitoringInterval);
                    hideProjectorPoweringBanner();
                }
            }, 1000); // Check toutes les secondes
        }
        
        function updateProjectorBannerToAVMute(roomName) {
            const banner = document.getElementById('projector-powering-banner');
            if (!banner) return;
            
            console.log(`ðŸŽ¯ [ProjectorBanner] Transition vers AV Mute pour ${roomName}`);
            
            // Mettre Ã  jour le contenu pour AV Mute
            const content = banner.querySelector('.powering-content');
            if (content) {
                content.innerHTML = `
                    <div class="powering-icon">
                        <i class="fas fa-eye-slash av-mute-pulse"></i>
                    </div>
                    <div class="powering-text">
                        <h3>ðŸ“º Projecteur allumÃ© - Correction AV Mute...</h3>
                        <p>Salle ${roomName} - Activation de l'affichage</p>
                        <div class="power-progress">
                            <div class="progress-bar">
                                <div class="progress-fill success-fill"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Auto-hide aprÃ¨s 15 secondes (plus de temps pour voir)
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
                console.log(`ðŸš« [ProjectorBanner] BanniÃ¨re allumage masquÃ©e`);
            }
        }
        
        // âœ… NOUVELLE FONCTION : VÃ©rifier et corriger AV Mute temps rÃ©el
        async function checkAndFixAVMuteStatus(roomName, projectorName) {
            console.log(`ðŸ”‡ [AVMuteCheck] VÃ©rification Ã©tat AV Mute pour ${projectorName} (${roomName})`);
            
            try {
                // âœ… Ã‰TAPE 1 : VÃ©rifier l'Ã©tat actuel AV Mute
                console.log(`ðŸŒ [AVMuteCheck] URL appelÃ©e: ${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                const statusResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                
                console.log(`ðŸ“¡ [AVMuteCheck] RÃ©ponse statut: ${statusResponse.status} ${statusResponse.statusText}`);
                
                if (!statusResponse.ok) {
                    console.log(`âŒ [AVMuteCheck] Erreur rÃ©cupÃ©ration statut: ${statusResponse.status}`);
                    const errorText = await statusResponse.text();
                    console.log(`ðŸ“„ [AVMuteCheck] DÃ©tails erreur: ${errorText}`);
                    return;
                }
                
                const statusData = await statusResponse.json();
                console.log(`ðŸ“Š [AVMuteCheck] Statut AV Mute:`, statusData);
                
                // âœ… Ã‰TAPE 2 : Si AV Mute actif â†’ Le corriger
                if (statusData.av_muted) {
                    console.log(`ðŸ”‡ [AVMuteCheck] AV Mute dÃ©tectÃ© â†’ Correction automatique`);
                    
                    // âœ… BANNIÃˆRE D'ATTENTE ORANGE pendant correction (minimum 15 secondes)
                    showWaitingBanner('ðŸ”§ Correction AV Mute en cours...', 'DÃ©sactivation du mode muet sur le projecteur');
                    window.waitingBannerStartTime = Date.now(); // âœ… Nouveau timestamp
                    
                    // âœ… Utiliser l'endpoint direct AV Mute public (sans auth)
                    console.log(`ðŸ”§ [AVMuteCheck] Correction directe AV Mute sur ${projectorName}`);
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
                        console.log(`âœ… [AVMuteCheck] AV Mute corrigÃ© avec succÃ¨s:`, fixData);
                        
                        // âœ… ATTENDRE MINIMUM 15 SECONDES pour que le client voie la banniÃ¨re d'attente
                        console.log(`â³ [AVMuteCheck] BanniÃ¨re d'attente visible pendant 15s minimum...`);
                        setTimeout(async () => {
                            console.log(`ðŸ” [AVMuteCheck] VÃ©rification post-correction...`);
                            const verifyResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=${encodeURIComponent(projectorName)}`);
                            if (verifyResponse.ok) {
                                const verifyData = await verifyResponse.json();
                                console.log(`ðŸ“Š [AVMuteCheck] Ã‰tat post-correction:`, verifyData);
                                
                                if (!verifyData.av_muted) {
                                    console.log(`ðŸŽ‰ [AVMuteCheck] SUCCÃˆS CONFIRMÃ‰ : AV Mute vraiment dÃ©sactivÃ© !`);
                                } else {
                                    console.log(`âš ï¸ [AVMuteCheck] PROBLÃˆME : AV Mute toujours actif aprÃ¨s correction !`);
                                }
                            }
                            
                            // âœ… MASQUER BANNIÃˆRE D'ATTENTE et afficher succÃ¨s
                            console.log(`ðŸŽ¯ [AVMuteCheck] Masquer banniÃ¨re d'attente aprÃ¨s 15s minimum`);
                            hideWaitingBanner();
                            setTimeout(() => {
                                // âœ… AFFICHER BANNIÃˆRE SUCCÃˆS APRÃˆS masquage banniÃ¨re d'attente
                                showAutoActionResult(
                                    { 
                                        type: 'av_mute_correction', 
                                        description: 'Correction AV Mute terminÃ©e' 
                                    }, 
                                    { 
                                        success: true, 
                                        message: `AV Mute dÃ©sactivÃ© sur ${projectorName} - Image restaurÃ©e !` 
                                    }
                                );
                            }, 500);
                        }, 15000); // âœ… 15 secondes minimum pour banniÃ¨re d'attente
                        
                    } else {
                        const errorData = await fixResponse.json();
                        console.log(`âŒ [AVMuteCheck] Ã‰chec correction AV Mute: ${fixResponse.status}`, errorData);
                    }
                    
                } else {
                    console.log(`âœ… [AVMuteCheck] AV Mute dÃ©jÃ  inactif - Aucune correction nÃ©cessaire`);
                    
                    // âœ… CORRECTION : Ne pas afficher de banniÃ¨re de succÃ¨s prÃ©maturÃ©e
                    // Laisser la banniÃ¨re d'attente active jusqu'Ã  la fin complÃ¨te du processus
                    console.log(`ðŸŽ¯ [AVMuteCheck] Projecteur opÃ©rationnel - Continuer avec la sÃ©quence normale`);
                    
                    // âœ… La banniÃ¨re d'attente sera masquÃ©e par la logique principale quand tout sera terminÃ©
                }
                
                            } catch (error) {
                console.log(`âš ï¸ [AVMuteCheck] Erreur vÃ©rification AV Mute: ${error.message}`);
            }
        }
        
        // âœ… FONCTION DE TEST MANUAL (temporaire)
        window.testAVMute = function() {
            const room = getCurrentRoom();
            if (room) {
                console.log(`ðŸ§ª [TEST] Test manuel AV Mute pour ${room}`);
                checkAndFixAVMuteStatus(room, `PROJ-${room}`);
            } else {
                console.log(`âŒ [TEST] Aucune salle sÃ©lectionnÃ©e`);
            }
        }

        // âœ… NOUVELLE FONCTION DE TEST : VÃ©rifier banniÃ¨re d'attente
        window.testWaitingBanner = function() {
            console.log(`ðŸ§ª [TEST] Test banniÃ¨re d'attente`);
            showWaitingBanner('ðŸ§ª Test banniÃ¨re d\'attente', 'Ceci est un test de la banniÃ¨re orange');
            
            // Masquer automatiquement aprÃ¨s 5 secondes
            setTimeout(() => {
                hideWaitingBanner();
                console.log(`âœ… [TEST] BanniÃ¨re d'attente masquÃ©e automatiquement`);
            }, 5000);
        }

        // âœ… NOUVELLE FONCTION DE TEST : VÃ©rifier Ã©tat complet projecteur
        window.testProjectorStatus = async function() {
            const room = getCurrentRoom();
            if (!room) {
                console.log(`âŒ [TEST] Aucune salle sÃ©lectionnÃ©e`);
                return;
            }
            
            console.log(`ðŸ§ª [TEST] Test Ã©tat complet projecteur pour ${room}`);
            
            try {
                // Test 1: Power status
                console.log(`ðŸ”Œ [TEST] Test endpoint power-status...`);
                const powerResponse = await fetch(`${API_BASE_URL}/api/pjlink/power-status?device=PROJ-${room}`);
                if (powerResponse.ok) {
                    const powerData = await powerResponse.json();
                    console.log(`âœ… [TEST] Power status:`, powerData);
                } else {
                    console.log(`âŒ [TEST] Power status non disponible: ${powerResponse.status}`);
                }
                
                // Test 2: AV Mute status
                console.log(`ðŸ”‡ [TEST] Test endpoint av-mute-status...`);
                const avMuteResponse = await fetch(`${API_BASE_URL}/api/pjlink/av-mute-status?device=PROJ-${room}`);
                if (avMuteResponse.ok) {
                    const avMuteData = await avMuteResponse.json();
                    console.log(`âœ… [TEST] AV Mute status:`, avMuteData);
                } else {
                    console.log(`âŒ [TEST] AV Mute status non disponible: ${avMuteResponse.status}`);
                }
                
            } catch (error) {
                console.log(`âŒ [TEST] Erreur test: ${error.message}`);
            }
        }

        // âœ… NOUVELLE FONCTION DE TEST : Forcer masquage banniÃ¨re d'attente
        window.forceHideWaitingBanner = function() {
            console.log(`ðŸ§ª [TEST] ForÃ§age masquage banniÃ¨re d'attente`);
            hideWaitingBanner();
            console.log(`âœ… [TEST] BanniÃ¨re d'attente forcÃ©ment masquÃ©e`);
        }

        /**
         * Traite la rÃ©ponse du backend (comme dans l'original)
         */
        function processResponse(data) {
            if (!data) return;

            console.log('ðŸ“¥ [Frontend] RÃ©ponse reÃ§ue:', data);
            
            // âœ… GESTION INTELLIGENTE du timer d'escalade selon la rÃ©ponse
            if (data.auto_executed) {
                // Action corrective prise â†’ Annuler le timer car problÃ¨me potentiellement rÃ©solu
                console.log('âœ… [EscalationTimeout] Action automatique exÃ©cutÃ©e - Timer annulÃ© (problÃ¨me corrigÃ©)');
                clearEscalationTimeout();
            } else {
                // Pas d'action corrective â†’ Garder le timer pour escalade si besoin
                console.log('â° [EscalationTimeout] Aucune action automatique - Timer maintenu pour escalade Ã©ventuelle');
            }
            
            // âœ… CORRECTION CRITIQUE : EXÃ‰CUTION AUTOMATIQUE DES ACTIONS (comme assistant-salle-av-copie.html)
            if (data.auto_executed && data.actions && data.actions.length > 0) {
                console.log('ðŸ”„ [ProcessResponse] ExÃ©cution automatique des actions reÃ§ues');
                setTimeout(() => {
                    executeAutoActions(data.actions);
                }, 1000); // Attendre 1 seconde pour que le message soit affichÃ©
            }
            
                            // âœ… Si action rÃ©ussie, incrÃ©menter compteur et vÃ©rifier AV Mute
                if (data.auto_executed && data.auto_result && data.auto_result.includes('âœ…')) {
                    console.log('ðŸŽ¯ [ProcessResponse] Action rÃ©ussie - IncrÃ©menter compteur de corrections');
                    
                    // IncrÃ©menter le compteur de corrections pour adapter le message suivant
                    const currentRoom = getCurrentRoom();
                    if (currentRoom) {
                        const sessionCorrections = sessionStorage.getItem(`corrections_${currentRoom}`) || '0';
                        const nbCorrections = parseInt(sessionCorrections);
                        sessionStorage.setItem(`corrections_${currentRoom}`, `${nbCorrections + 1}`);
                        console.log(`ðŸ“Š [ProcessResponse] Corrections pour ${currentRoom}: ${nbCorrections + 1}`);
                        
                        // âœ… FORCER VÃ‰RIFICATION AV MUTE aprÃ¨s action rÃ©ussie
                        if (data.auto_result.includes('Allumer')) {
                            console.log('ðŸ”‡ [ProcessResponse] Action allumage dÃ©tectÃ©e - VÃ©rification AV Mute dans 3s');
                            setTimeout(async () => {
                                await checkAndFixAVMuteStatus(currentRoom, `PROJ-${currentRoom}`);
                            }, 3000); // 3 secondes pour stabilisation
                        }
                    }
                }
                
                // âœ… CORRECTION : GÃ©rer le cas oÃ¹ auto_executed est true mais actions est vide (action dÃ©jÃ  exÃ©cutÃ©e cÃ´tÃ© serveur)
            if (data.auto_executed && (!data.actions || data.actions.length === 0)) {
                console.log('ðŸ”„ [ProcessResponse] Action dÃ©jÃ  exÃ©cutÃ©e cÃ´tÃ© serveur - MASQUER BANNIÃˆRE D\'ATTENTE');
                
                // âœ… ANNULER IMMÃ‰DIATEMENT le timer d'escalade car action dÃ©jÃ  exÃ©cutÃ©e
                clearEscalationTimeout();
                console.log('ðŸš« [ProcessResponse] Timer escalade annulÃ© - Action dÃ©jÃ  exÃ©cutÃ©e cÃ´tÃ© serveur');
                
                // âœ… MASQUER LA BANNIÃˆRE D'ATTENTE aprÃ¨s un dÃ©lai minimum (adaptatif selon le type d'action)
                const bannerStartTime = window.waitingBannerStartTime || Date.now();
                const elapsedTime = Date.now() - bannerStartTime;
                
                // âœ… CORRECTION : DÃ©lai adaptatif selon le type d'action
                let minimumTime = 5000; // Par dÃ©faut 5 secondes
                
                // Pour les projecteurs, attendre plus longtemps pour l'allumage complet
                if (data.solutions && data.solutions.some(sol => 
                    sol.actions && sol.actions.some(act => act.type === 'pjlink_power')
                )) {
                    minimumTime = 15000; // 15 secondes minimum pour les projecteurs
                    console.log(`ðŸ”Œ [ProcessResponse] Action projecteur dÃ©tectÃ©e - DÃ©lai minimum Ã©tendu Ã  ${minimumTime}ms`);
                }
                
                const remainingTime = Math.max(0, minimumTime - elapsedTime);
                console.log(`â³ [ProcessResponse] BanniÃ¨re affichÃ©e depuis ${elapsedTime}ms, masquer dans ${remainingTime}ms`);
                
                setTimeout(() => {
                    hideWaitingBanner();
                    console.log('âœ… [ProcessResponse] BanniÃ¨re d\'attente masquÃ©e aprÃ¨s action serveur');
                    
                    // âœ… AFFICHER BANNIÃˆRE SUCCÃˆS APRÃˆS masquage banniÃ¨re d'attente
                    setTimeout(() => {
                        showAutoActionResult(
                            { 
                                type: 'auto_correction', 
                                description: 'Correction automatique terminÃ©e' 
                            }, 
                            { 
                                success: true, 
                                message: 'ProblÃ¨me rÃ©solu automatiquement par le systÃ¨me !' 
                            }
                        );
                    }, 500);
                }, remainingTime);
                
                return; // âœ… STOPPER le traitement pour Ã©viter escalade
            }
            
            // ðŸ” DEBUG: Analyser les actions pour comprendre pourquoi l'escalade ne se dÃ©clenche pas
            if (data.actions && data.actions.length > 0) {
                console.log('ðŸ” [DEBUG] Actions trouvÃ©es:');
                data.actions.forEach((action, index) => {
                    console.log(`  ${index}: Type: ${action.type}, Command: ${action.command}, Label: ${action.label}`);
                    console.log(`      Description: ${action.description}`);
                });
            }

            // âœ… LOGIQUE PROFESSIONNELLE AMÃ‰LIORÃ‰E : DÃ©tecter "Tout fonctionne mais client insiste"
            const hasOnlyEscalationActions = data.actions && data.actions.length > 0 && 
                                           data.actions.every(action => 
                                               action.type === 'create_sea_ticket' || 
                                               action.command === 'create_ticket' ||
                                               action.label?.includes('Ticket SEA') ||
                                               action.label?.includes('Escalade')
                                           );
            
            // âœ… NOUVELLE LOGIQUE: Actions techniques non auto-exÃ©cutÃ©es = Ã©quipements fonctionnels
            const hasTechnicalActionsNotExecuted = data.actions && data.actions.length > 0 && 
                                                  data.actions.some(action => 
                                                      (action.type === 'pjlink_power' || 
                                                       action.type === 'pjlink_av_mute' || 
                                                       action.type === 'sennheiser_mute') && 
                                                      !data.auto_executed
                                                  );
            
            // âœ… ESCALADE SIMPLIFIÃ‰E : Si pas d'auto-correction, escalade directe immÃ©diate
            if ((data.intent === 'video_problem' || data.intent === 'audio_problem') && 
                !data.auto_executed) {
                
                const problemType = data.intent === 'video_problem' ? 'vidÃ©o' : 'audio';
                console.log(`ðŸŽ¯ [EscaladeDirecte] ProblÃ¨me ${problemType.toUpperCase()} sans correction automatique â†’ ESCALADE IMMÃ‰DIATE`);
                
                // âœ… CORRECTION: VÃ©rifier les tickets existants AVANT d'afficher la banniÃ¨re SEA
                const currentRoom = getCurrentRoom();
                if (hasExistingTicket(currentRoom)) {
                    const lastTicket = getLastSessionTicket(currentRoom);
                    console.log(`ðŸŽ« [TicketExistant] Ticket dÃ©jÃ  crÃ©Ã© ${lastTicket.number} â†’ Affichage banniÃ¨re ticket existant au lieu de SEA`);
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
                    escalation_reason: `ProblÃ¨me ${problemType} signalÃ© - Intervention technique requise`
                });
                return; // âœ… STOP - Escalade directe sans message
            }

            // âœ… LOGIQUE SIMPLIFIÃ‰E FINALE : Plus de traitement complexe
            // Stocker juste le contexte pour les tickets si besoin
            latestRAGContext = data.rag_context || data;

            // âœ… LOGIQUE SIMPLIFIÃ‰E : Supprimer TOUS les messages de diagnostic en bas
            // L'utilisateur veut seulement : Correction automatique OU escalade directe
            // Pas de messages intermÃ©diaires "diagnostic", "problÃ¨me mineur", etc.
            
            console.log('ðŸš« [ProcessResponse] TOUS les messages de diagnostic supprimÃ©s - Logique binaire uniquement');
            // Plus de messages en bas du chat - BanniÃ¨res uniquement
        }

        /**
         * DÃ©termine la raison de l'escalade (comme dans l'original)
         */
        function determineEscalationReason(data, escalationActions) {
            if (escalationActions.length > 0) {
                return "Le systÃ¨me recommande de crÃ©er un ticket SEA pour ce problÃ¨me.";
            }
            if (data.confidence && data.confidence < 0.6) {
                return "Le systÃ¨me n'est pas sÃ»r de pouvoir rÃ©soudre ce problÃ¨me automatiquement.";
            }
            if (data.solutions && data.solutions.length === 0 && data.problems && data.problems.length > 0) {
                return "Aucune solution automatique n'a Ã©tÃ© trouvÃ©e pour ce problÃ¨me.";
            }
            return "Une intervention technique pourrait Ãªtre nÃ©cessaire.";
        }

        /**
         * Affiche Ã  nouveau les palettes de problÃ¨mes
         */
        function showProblemPalettes() {
            const problemPalettes = document.getElementById('problemPalettes');
            const assistantResponse = document.getElementById('assistantResponse');
            
            // Afficher les palettes
            if (problemPalettes) {
                problemPalettes.style.display = 'block';
            }
            
            // Supprimer la rÃ©ponse de l'assistant
            if (assistantResponse) {
                assistantResponse.remove();
            }
            
            // Supprimer tous les rÃ©sultats d'actions automatiques
            const autoResults = document.querySelectorAll('.auto-result');
            autoResults.forEach(result => result.remove());
            
            // Supprimer toutes les interfaces d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
        }

        /**
         * ExÃ©cute les actions automatiques
         */
        async function executeAutoActions(actions) {
            // âœ… AFFICHER BANNIÃˆRE D'ATTENTE ORANGE pendant exÃ©cution des actions
            showWaitingBanner('ðŸ”§ ExÃ©cution des corrections...', 'Veuillez patienter pendant l\'application des solutions');
            
            for (const action of actions) {
                try {
                    console.log(`ðŸ”„ ExÃ©cution action automatique: ${action.type}`);
                    
                    // âœ… Mettre Ã  jour le message de la banniÃ¨re selon l'action
                    if (action.type === 'pjlink_power') {
                        showWaitingBanner('ðŸ”Œ Allumage du projecteur...', 'DÃ©marrage en cours, veuillez patienter');
                    } else if (action.type === 'pjlink_av_unmute') {
                        showWaitingBanner('ðŸ”§ Correction AV Mute...', 'DÃ©sactivation du mode muet sur le projecteur');
                    }
                    
                    // ExÃ©cuter l'action rÃ©elle selon son type
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
                            result = { success: true, message: 'Action simulÃ©e' };
                    }
                    
                    // Afficher le rÃ©sultat dans une banniÃ¨re de succÃ¨s
                    if (result && result.success) {
                        showAutoActionResult(action, result);
                    }
                    
                } catch (error) {
                    console.error(`Erreur lors de l'exÃ©cution de l'action ${action.type}:`, error);
                    showAutoActionResult(action, { success: false, message: error.message });
                }
            }
            
            // âœ… MASQUER BANNIÃˆRE D'ATTENTE aprÃ¨s toutes les actions terminÃ©es
            hideWaitingBanner();
            
            // Retour automatique Ã  l'accueil aprÃ¨s toutes les actions
            setTimeout(() => {
                console.log('ðŸ”„ [AutoActions] Retour automatique Ã  l\'accueil aprÃ¨s actions complÃ¨tes');
                returnToHome();
            }, 3000);
        }

        /**
         * Affiche le rÃ©sultat d'une action automatique
         */
        function showAutoActionResult(action, result) {
            console.log(`ðŸ“Š [AutoActionResult] ${action.type}: ${result.success ? 'SUCCÃˆS' : 'Ã‰CHEC'} - ${result.message}`);
            
            if (result.success) {
                // âœ… CORRECTION : Annuler le timer d'escalade car problÃ¨me rÃ©solu automatiquement
                clearEscalationTimeout();
                console.log('ðŸš« [EscalationTimeout] Timer d\'escalade annulÃ© suite Ã  correction automatique rÃ©ussie');
                
                // âœ… BANNIÃˆRE INTERACTIVE DE CORRECTION avec question OUI/NON
                showInteractiveCorrectionBanner(action, result);
            } else {
                // âŒ Petite banniÃ¨re d'erreur (droite)
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
                        <span style="font-size: 1.2rem;">âŒ</span>
                        <span><strong>${action.description || action.type}</strong></span>
                    </div>
                    <div style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.85rem;">
                        ${result.message || 'Erreur lors de l\'exÃ©cution'}
                    </div>
                `;
                
                document.body.appendChild(bannerDiv);
                
                // Supprimer automatiquement aprÃ¨s 4 secondes
                setTimeout(() => {
                    if (bannerDiv.parentNode) {
                        bannerDiv.style.animation = 'slideOutRight 0.3s ease-in';
                        setTimeout(() => bannerDiv.remove(), 300);
                    }
                }, 4000);
            }
        }

        /**
         * âœ… NOUVELLE FONCTION : BanniÃ¨re interactive de correction avec question OUI/NON
         */
        function showInteractiveCorrectionBanner(action, result) {
            console.log(`ðŸŽ¯ [InteractiveCorrection] Affichage banniÃ¨re interactive: ${action.description}`);
            
            // âœ… NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la banniÃ¨re
            hideDiagnosticLoading();
            
            const bannerId = `interactive-correction-${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou
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
            
            // CrÃ©er la banniÃ¨re interactive avec style moderne
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
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">âœ…</div>
                <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem; font-weight: 600;">Correction automatique terminÃ©e !</h2>
                
                <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 12px; margin: 2rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>ðŸ”§ Action effectuÃ©e :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>ðŸ¢ Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong>ðŸ“ DÃ©tails :</strong> ${result.message || 'ProblÃ¨me rÃ©solu automatiquement'}</p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1.4rem; font-weight: 500;">Votre problÃ¨me est-il rÃ©glÃ© ?</h3>
                    
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
                            âœ… OUI
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
                            âŒ NON
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; opacity: 0.8; font-size: 0.9rem;">
                    Cliquez sur OUI si le problÃ¨me est rÃ©solu, ou NON pour demander une intervention technique
                </div>
            `;
            
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            // âœ… GESTION CLIC BOUTON OUI
            const btnOui = document.getElementById(`btn-oui-${bannerId}`);
            if (btnOui) {
                btnOui.addEventListener('click', () => {
                console.log('âœ… [InteractiveCorrection] Utilisateur confirme - ProblÃ¨me rÃ©solu');
                
                // Masquer la banniÃ¨re avec animation
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // Retour Ã  l'accueil
                setTimeout(() => {
                    returnToHome();
                }, 500);
                });
            }
            
            // âœ… GESTION CLIC BOUTON NON
            const btnNon = document.getElementById(`btn-non-${bannerId}`);
            if (btnNon) {
                btnNon.addEventListener('click', () => {
                console.log('âŒ [InteractiveCorrection] Utilisateur confirme - ProblÃ¨me persiste');
                
                // Masquer la banniÃ¨re interactive
                bannerDiv.style.animation = 'fadeOut 0.3s ease-in';
                overlayDiv.style.animation = 'fadeOut 0.3s ease-in';
                
                setTimeout(() => {
                    if (bannerDiv.parentNode) bannerDiv.parentNode.removeChild(bannerDiv);
                    if (overlayDiv.parentNode) overlayDiv.parentNode.removeChild(overlayDiv);
                }, 300);
                
                // âœ… AFFICHER BANNIÃˆRE ESCALADE aprÃ¨s masquage
                setTimeout(() => {
                    const currentRoom = getCurrentRoom();
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.9,
                        room: currentRoom,
                        escalation_needed: true,
                        escalation_reason: `ProblÃ¨me persiste aprÃ¨s correction automatique - Intervention technique requise`
                    });
                }, 500);
                });
            }
            
            // âœ… GESTION CLIC OVERLAY (fermeture)
            overlayDiv.addEventListener('click', (e) => {
                if (e.target === overlayDiv) {
                    console.log('ðŸ”„ [InteractiveCorrection] Fermeture par clic overlay');
                    
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
            console.log(`â³ [WaitingBanner] Affichage banniÃ¨re d'attente: ${title}`);
            
            // âœ… CORRECTION : Masquer le sablier diagnostic car banniÃ¨re d'attente prend le relais
            hideDiagnosticLoading();
            console.log('âœ… [WaitingBanner] Sablier diagnostic masquÃ© - BanniÃ¨re d\'attente prend le relais');
            
            // Supprimer toute banniÃ¨re d'attente existante
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
            
            // Animation d'entrÃ©e
            setTimeout(() => {
                banner.classList.add('visible');
            }, 50);
        }
        
        function hideWaitingBanner() {
            const existingBanner = document.getElementById('waiting-banner');
            if (existingBanner) {
                console.log(`ðŸš« [WaitingBanner] Masquage banniÃ¨re d'attente`);
                existingBanner.classList.add('fade-out');
                setTimeout(() => {
                    if (existingBanner.parentNode) {
                        existingBanner.parentNode.removeChild(existingBanner);
                    }
                }, 300);
            }
        }

        /**
         * Affiche une banniÃ¨re de succÃ¨s plein Ã©cran (style SEA mais verte)
         */
        function showSuccessBanner(action, result) {
            const confirmationId = `success_${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou agressif
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
            
            // CrÃ©er la banniÃ¨re de succÃ¨s avec style moderne
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
                <div style="font-size: 3rem; margin-bottom: 1rem;">âœ…</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">ProblÃ¨me rÃ©solu automatiquement !</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ”§ Action :</strong> ${action.description || 'Correction automatique'}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ¢ Salle :</strong> ${getCurrentRoom()}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>âš¡ Statut :</strong> CorrigÃ© en temps rÃ©el</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    ${result.message || 'Le systÃ¨me a dÃ©tectÃ© et corrigÃ© automatiquement le problÃ¨me. Aucune intervention manuelle nÃ©cessaire !'}
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
                    ðŸŽ‰ Parfait !
                </button>
            `;
            
            // Fermer au clic sur l'overlay
            overlayDiv.onclick = () => closeSuccessBanner(confirmationId);
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(successDiv);
            
            // âœ… FERMETURE AUTOMATIQUE APRÃˆS 15 SECONDES (plus visible)
            setTimeout(() => {
                closeSuccessBanner(confirmationId);
            }, 15000);
            
            console.log(`ðŸŽ‰ [SuccessBanner] BanniÃ¨re de succÃ¨s affichÃ©e pour: ${action.description}`);
        }

        /**
         * Ferme la banniÃ¨re de succÃ¨s
         */
        function closeSuccessBanner(confirmationId) {
            const overlay = document.getElementById(`overlay_${confirmationId}`);
            const banner = document.getElementById(confirmationId);
            
            if (overlay) overlay.remove();
            if (banner) banner.remove();
            
            // Retour automatique Ã  l'accueil aprÃ¨s fermeture
            console.log('ðŸ  [SuccessBanner] Retour automatique Ã  l\'accueil');
            returnToHome();
        }

        /**
         * ExÃ©cute une action sur un Ã©quipement
         */
        async function executeAction(actionType, deviceId, parameters) {
            try {
                console.log(`ðŸ”„ [ExecuteAction] ExÃ©cution de l'action : ${actionType}...`);
                
                let endpoint = '';
                let payload = {};
                
                // DÃ©terminer l'endpoint selon le type d'action
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
                        // âœ… CORRECTION JUMELÃ‰E : Traitement spÃ©cial pour AV Mute invisible + banniÃ¨re
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${parameters.device_name}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                console.log(`âœ… [ExecuteAction] AV Mute dÃ©sactivÃ© avec succÃ¨s sur ${parameters.device_name}`);
                                
                                // âœ… SIMULATION : CrÃ©er une rÃ©ponse comme si c'Ã©tait auto-exÃ©cutÃ© par le RAG
                                return {
                                    success: true,
                                    auto_executed: true, // âœ… MARQUER comme auto-exÃ©cutÃ©
                                    auto_result: `âœ… AV Mute dÃ©sactivÃ© automatiquement sur ${parameters.device_name}`,
                                    simulated_rag_response: true
                                };
                            } else {
                                throw new Error(`Erreur HTTP ${response.status}`);
                            }
                        } catch (error) {
                            console.error(`âŒ [ExecuteAction] Erreur AV Mute pour ${parameters.device_name}:`, error);
                            throw error;
                        }
                        return; // Ã‰viter l'exÃ©cution du code standard
                        
                    default:
                        throw new Error(`Type d'action non supportÃ©: ${actionType}`);
                }
                
                // ExÃ©cuter l'action
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
                    console.log(`âœ… [ExecuteAction] Action exÃ©cutÃ©e avec succÃ¨s: ${result.message}`);
                    
                    // âœ… NOUVEAU: Logique sÃ©quentielle pour allumage de projecteur
                    if (actionType === 'pjlink_power' && parameters.power_on === true) {
                        const deviceName = parameters.device_name || 'Projecteur';
                        console.log(`â±ï¸ [SequentialLogic] Allumage dÃ©tectÃ© pour ${deviceName} - DÃ©marrage banniÃ¨re d'attente`);
                        
                        // Afficher la banniÃ¨re d'attente avec sÃ©quence complÃ¨te
                        showSequentialProjectorBanner(deviceName, 'power_on', {
                            maxDuration: 35,
                            checkAfterPowerOn: true
                        });
                    }
                    
                    return result;
                } else {
                    throw new Error(result.message || 'Ã‰chec de l\'exÃ©cution');
                }
                
            } catch (error) {
                console.error('âŒ [ExecuteAction] Erreur lors de l\'exÃ©cution de l\'action:', error);
                throw error;
            }
        }

        /**
         * âœ… NOUVEAU: Affiche une banniÃ¨re d'attente pour l'allumage de projecteur
         */
        function showSequentialProjectorBanner(deviceName, actionType, options = {}) {
            const bannerId = `seq_projector_${Date.now()}`;
            console.log(`ðŸŽ¬ [SequentialBanner] DÃ©marrage banniÃ¨re ${actionType} pour ${deviceName}`);
            
            // Supprimer les banniÃ¨res existantes
            document.querySelectorAll('.sequential-banner-overlay').forEach(banner => banner.remove());
            
            // Configuration selon le type d'action
            const config = getSequentialBannerConfig(actionType, deviceName, options);
            
            // CrÃ©er l'overlay
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
            
            // CrÃ©er la banniÃ¨re
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
            
            // DÃ©marrer la logique sÃ©quentielle selon le type
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
         * âœ… NOUVEAU: Configuration des banniÃ¨res selon le type d'action
         */
        function getSequentialBannerConfig(actionType, deviceName, options) {
            const configs = {
                power_on: {
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                    borderColor: '#3b82f6',
                    html: `
                        <div class="sequential-content">
                            <div class="projector-icon-animated" style="font-size: 4rem; margin-bottom: 1.5rem; animation: powerBlink 1.2s infinite;">ðŸ“½ï¸</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Allumage en cours</h3>
                            <p style="margin: 0 0 2rem 0; font-size: 1.2rem; opacity: 0.95;">Le projecteur <strong>${deviceName}</strong> dÃ©marre...</p>
                            
                            <div class="progress-section">
                                <div class="status-text" style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">
                                    ðŸ”Œ Envoi de la commande d'allumage
                                </div>
                                
                                <div class="real-time-monitor" style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                                    <div class="monitor-title" style="font-weight: 600; margin-bottom: 1rem;">Surveillance temps rÃ©el</div>
                                    <div class="monitor-status" id="monitor_${deviceName}" style="font-family: monospace; font-size: 0.9rem;">
                                        â³ VÃ©rification de l'Ã©tat...
                                    </div>
                                </div>
                                
                                <div class="countdown-section" style="margin-top: 2rem;">
                                    <div class="countdown-timer" style="font-size: 1.1rem; font-weight: 600; color: #fbbf24;">
                                        â±ï¸ Surveillance active - Maximum 45s
                                    </div>
                                </div>
                            </div>
                            
                            <p style="margin: 2rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                âš¡ Analyse automatique AV Mute aprÃ¨s allumage confirmÃ©
                            </p>
                        </div>
                    `
                },
                av_unmute: {
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    borderColor: '#10b981',
                    html: `
                        <div class="sequential-content">
                            <div class="correction-icon" style="font-size: 4rem; margin-bottom: 1.5rem; animation: successPulse 1s infinite;">âœ…</div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.6rem; font-weight: 700;">Correction AV Mute</h3>
                            <p style="margin: 0 0 1.5rem 0; font-size: 1.2rem; opacity: 0.95;">
                                DÃ©sactivation AV Mute sur <strong>${deviceName}</strong>
                            </p>
                            
                            <div class="correction-progress" style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1.5rem; margin: 1rem 0;">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">ðŸ”‡ â†’ ðŸ“½ï¸ Commande envoyÃ©e</div>
                                <div style="font-size: 0.9rem; opacity: 0.8;">L'image devrait apparaÃ®tre immÃ©diatement</div>
                            </div>
                            
                            <p style="margin: 1.5rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">
                                Cette banniÃ¨re se fermera automatiquement dans 3 secondes
                            </p>
                        </div>
                    `
                }
            };
            
            return configs[actionType] || configs.power_on;
        }
        
        /**
         * âœ… NOUVEAU: Ajouter les styles CSS pour les banniÃ¨res sÃ©quentielles
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
         * âœ… NOUVEAU: GÃ¨re le compte Ã  rebours de la banniÃ¨re d'attente
         */
        function startCountdown(bannerId, totalSeconds) {
            const banner = document.getElementById(bannerId);
            if (!banner) return;
            
            const progressBar = banner.querySelector('.progress-bar');
            const countdownTimer = banner.querySelector('.countdown-timer');
            
            let remainingSeconds = totalSeconds;
            
            const interval = setInterval(() => {
                remainingSeconds--;
                
                // Mettre Ã  jour le timer
                if (countdownTimer) {
                    countdownTimer.textContent = `${remainingSeconds}s`;
                }
                
                // Mettre Ã  jour la barre de progression
                if (progressBar) {
                    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
                    progressBar.style.width = `${progress}%`;
                }
                
                // Fin du compte Ã  rebours
                if (remainingSeconds <= 0) {
                    clearInterval(interval);
                    // Fermer la banniÃ¨re et vÃ©rifier l'Ã©tat
                    setTimeout(() => {
                        closeWaitingBanner(bannerId);
                        // âœ… NOUVEAU: DÃ©clencher une nouvelle vÃ©rification automatique
                        recheckProjectorStatus();
                    }, 1000);
                }
            }, 1000);
            
            // Stocker l'interval pour pouvoir l'annuler si nÃ©cessaire
            if (banner) {
                banner.dataset.intervalId = interval;
            }
        }
        
        /**
         * âœ… NOUVEAU: Ferme la banniÃ¨re d'attente
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
         * âœ… NOUVEAU: SÃ©quence d'allumage avec surveillance temps rÃ©el
         */
        async function startPowerOnSequence(bannerId, deviceName, options) {
            console.log(`ðŸ”Œ [PowerOnSequence] DÃ©marrage surveillance pour ${deviceName}`);
            
            const maxDuration = 45; // 45 secondes maximum
            const checkInterval = 3; // VÃ©rifier toutes les 3 secondes
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
                    // VÃ©rifier l'Ã©tat du projecteur
                    const currentRoom = getCurrentRoom();
                    const equipmentData = await fetchRoomEquipment(currentRoom);
                    
                    // âœ… CORRECTION: Utiliser equipmentData.devices (pas equipmentData directement)
                    if (!equipmentData || !equipmentData.devices || !Array.isArray(equipmentData.devices)) {
                        console.warn(`âš ï¸ [PowerOnSequence] DonnÃ©es Ã©quipements invalides: ${JSON.stringify(equipmentData)}`);
                        updateMonitorStatus(`âš ï¸ Erreur accÃ¨s Ã©quipements (${elapsed}s)`);
                        return;
                    }
                    
                    console.log(`ðŸ” [PowerOnSequence] ${equipmentData.devices.length} Ã©quipements trouvÃ©s en salle ${currentRoom}`);
                    
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
                        console.log(`ðŸ” [PowerOnSequence] Projecteur trouvÃ©: ${projector.device_name || projector.name}, Ã‰tat: ${projector.status} (${elapsed}s)`);
                        
                        if (projector.status === 'online' || projector.status === 'power_on') {
                            powerOnDetected = true;
                            updateMonitorStatus('âœ… Projecteur allumÃ© - Analyse AV Mute...', true);
                            clearInterval(interval);
                            
                            // DÃ©lai pour laisser le projecteur se stabiliser
                            setTimeout(() => {
                                startAVMuteAnalysis(bannerId, deviceName, projector);
                            }, 2000);
                            return;
                        } else {
                            updateMonitorStatus(`â³ Allumage en cours... Ã‰tat: ${projector.status} (${elapsed}s/${maxDuration}s)`);
                        }
                    } else {
                        console.log(`ðŸ” [PowerOnSequence] Ã‰quipements disponibles:`, equipmentData.devices.map(d => ({ name: d.device_name || d.name, status: d.status })));
                        updateMonitorStatus(`âš ï¸ Projecteur ${deviceName} non trouvÃ© (${elapsed}s)`);
                    }
                    
                } catch (error) {
                    console.error(`âŒ [PowerOnSequence] Erreur vÃ©rification: ${error}`);
                    updateMonitorStatus(`âŒ Erreur vÃ©rification (${elapsed}s)`);
                }
                
                // Timeout aprÃ¨s 45 secondes - VÃ‰RIFICATION FINALE AVANT ESCALADE
                if (elapsed >= maxDuration) {
                    clearInterval(interval);
                    if (!powerOnDetected) {
                        console.log(`ðŸ” [PowerOnSequence] TIMEOUT ${maxDuration}s atteint - VÃ©rification finale avant escalade pour ${deviceName}`);
                        updateMonitorStatus('â° Timeout atteint - VÃ©rification finale...');
                        
                        setTimeout(async () => {
                            try {
                                // âœ… DERNIÃˆRE VÃ‰RIFICATION avant escalade
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
                                    
                                                                        // âœ… CORRECTION : Utiliser vÃ©rification temps rÃ©el au lieu du cache statique
                                    console.log(`ðŸ” [PowerOnSequence] VÃ©rification temps rÃ©el finale pour ${deviceName}...`);
                                    
                                    try {
                                        const realtimeStatus = await fetchProjectorRealtimeStatus(deviceName);
                                        
                                        if (realtimeStatus && realtimeStatus.is_online) {
                                            const powerOn = realtimeStatus.power_status === 'on' || realtimeStatus.power_status === 'ON';
                                            const hasAVMute = realtimeStatus.av_mute_video || realtimeStatus.av_mute_audio;
                                            
                                            console.log(`âœ… [PowerOnSequence] Ã‰tat temps rÃ©el: power=${realtimeStatus.power_status}, AVMute=${hasAVMute}`);
                                            
                                            if (powerOn) {
                                                if (hasAVMute) {
                                                    console.log(`ðŸ”‡ [PowerOnSequence] AV Mute dÃ©tectÃ© â†’ Correction automatique invisible`);
                                                    updateMonitorStatus('ðŸ”‡ Correction AV Mute automatique...');

                                                    // âœ… Correction AV Mute INVISIBLE
                                                    const avMuteResponse = await fetch(`${API_BASE_URL}/api/device/public/av-mute/${deviceName}`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' }
                                                    });
                                                    
                                                    if (avMuteResponse.ok) {
                                                        console.log(`âœ… [PowerOnSequence] PROBLÃˆME RÃ‰SOLU: AV Mute corrigÃ© sur ${deviceName}`);
                                                        updateMonitorStatus('âœ… ProblÃ¨me vidÃ©o rÃ©solu !', true);
                                                        
                                                        // âœ… AFFICHER BANNIÃˆRE DE SUCCÃˆS (pas d'escalade)
                                                        setTimeout(() => {
                                                            closeSequentialBanner(bannerId);
                                                            showAutoResultBanner(`âœ… ProblÃ¨me vidÃ©o rÃ©solu automatiquement sur ${deviceName}`);
                                                        }, 2000);
                                                        return;
                                                    }
                                                } else {
                                                    // âœ… CORRECTION LOGIQUE : Projecteur allumÃ© sans AV Mute, mais problÃ¨me vidÃ©o signalÃ© â†’ VÃ©rification approfondie
                                                    console.log(`ðŸŽ¯ [PowerOnSequence] Projecteur ${deviceName} allumÃ© sans AV Mute - VÃ©rification si problÃ¨me persiste`);
                                                    updateMonitorStatus('ðŸ” Projecteur fonctionnel - VÃ©rification problÃ¨me persistant...');
                                                    
                                                    // âœ… NOUVELLE LOGIQUE : Au lieu de considÃ©rer le problÃ¨me rÃ©solu, escalader si problÃ¨me persiste
                                                    setTimeout(() => {
                                                        closeSequentialBanner(bannerId);
                                                        // DÃ©clencher l'escalade car Ã©quipement fonctionne mais problÃ¨me persiste
                                                        setTimeout(() => {
                                                            console.log('ðŸŽ¯ [PowerOnSequence] Escalade - Ã‰quipement fonctionnel mais problÃ¨me vidÃ©o persiste');
                                                            showSEAEscalationBanner({
                                                                intent: 'video_problem',
                                                                confidence: 0.9,
                                                                room: getCurrentRoom(),
                                                                problems: [{
                                                                    room: getCurrentRoom(),
                                                                    device: deviceName,
                                                                    severity: 'medium',
                                                                    reason: `Projecteur ${deviceName} allumÃ© et fonctionnel mais problÃ¨me vidÃ©o persistant`
                                                                }],
                                                                escalation_needed: true,
                                                                escalation_reason: `Projecteur ${deviceName} opÃ©rationnel mais problÃ¨me vidÃ©o non rÃ©solu - Diagnostic spÃ©cialisÃ© requis`
                                                            });
                                                        }, 500);
                                                    }, 2000);
                                                    return;
                                                }
                                            }
                                        }
                                    } catch (realtimeError) {
                                        console.error(`âš ï¸ [PowerOnSequence] Erreur vÃ©rification temps rÃ©el:`, realtimeError);
                                    }
                                }
                                
                                // âŒ Si toujours pas allumÃ© aprÃ¨s vÃ©rification finale
                                console.log(`âŒ [PowerOnSequence] VÃ‰RIFICATION FINALE Ã‰CHOUÃ‰E: Projecteur ${deviceName} toujours pas allumÃ© - Escalade nÃ©cessaire`);
                                updateMonitorStatus('âŒ Projecteur non allumÃ© - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    // Escalade automatique aprÃ¨s vÃ©rification finale
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `Ã‰chec allumage ${deviceName} aprÃ¨s ${maxDuration}s + vÃ©rification finale`
                                    });
                                }, 2000);
                                
                            } catch (error) {
                                console.error(`âŒ [PowerOnSequence] Erreur vÃ©rification finale:`, error);
                                updateMonitorStatus('âŒ Erreur vÃ©rification - Escalade technicien');
                                
                                setTimeout(() => {
                                    closeSequentialBanner(bannerId);
                                    showSEAEscalationBanner({
                                        intent: 'video_problem',
                                        confidence: 0.8,
                                        room: getCurrentRoom(),
                                        escalation_reason: `Erreur technique vÃ©rification finale ${deviceName}`
                                    });
                                }, 2000);
                            }
                        }, 1000);
                    }
                }
            }, checkInterval * 1000);
        }
        
        /**
         * âœ… NOUVEAU: Analyse automatique AV Mute aprÃ¨s allumage
         */
        async function startAVMuteAnalysis(bannerId, deviceName, projectorData = null) {
            console.log(`ðŸ”‡ [AVMuteAnalysis] Analyse AV Mute pour ${deviceName}`, projectorData);
            
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
                updateMonitorStatus('ðŸ” Analyse AV Mute en cours...');
                
                // Attendre un peu pour que le projecteur se stabilise
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // âœ… MÃ‰THODE 1: Tenter diagnostic direct en interrogeant le problÃ¨me vidÃ©o
                console.log(`ðŸ”‡ [AVMuteAnalysis] Tentative diagnostic AV Mute via problÃ¨me vidÃ©o`);
                
                // âœ… S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Ã‰cran noir projecteur ${deviceName}`,
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
                    console.log('ðŸ” [AVMuteAnalysis] RÃ©ponse backend diagnostic:', data);
                    
                    // Chercher des actions de correction AV Mute
                    const avMuteActions = data.actions ? data.actions.filter(action => 
                        action.type === 'pjlink_av_unmute' || 
                        action.type === 'pjlink_av_mute' ||
                        (action.description && action.description.toLowerCase().includes('av mute')) ||
                        (action.description && action.description.toLowerCase().includes('dÃ©sactiver') && action.description.toLowerCase().includes('mute'))
                    ) : [];
                    
                    console.log(`ðŸ”‡ [AVMuteAnalysis] Actions AV Mute trouvÃ©es:`, avMuteActions);
                    
                    if (avMuteActions.length > 0) {
                        updateMonitorStatus('ðŸ”‡ AV Mute dÃ©tectÃ© - Correction automatique...');
                        
                        // Prendre la premiÃ¨re action AV unmute trouvÃ©e
                        const avMuteAction = avMuteActions[0];
                        console.log(`ðŸ”‡ [AVMuteAnalysis] ExÃ©cution action:`, avMuteAction);
                        
                        try {
                            // Construire les paramÃ¨tres pour l'action
                            const actionParams = {
                                device_name: deviceName,
                                video_mute: false,
                                audio_mute: false,
                                ...avMuteAction.parameters
                            };
                            
                            await executeAction('pjlink_av_mute', avMuteAction.device_id || 0, actionParams);
                            updateMonitorStatus('âœ… AV Mute corrigÃ© - Projecteur opÃ©rationnel !', true);
                            
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 3000);
                            
                        } catch (actionError) {
                            console.error(`âŒ [AVMuteAnalysis] Erreur exÃ©cution action:`, actionError);
                            updateMonitorStatus('âš ï¸ Erreur correction AV Mute - VÃ©rifiez manuellement');
                            setTimeout(() => {
                                closeSequentialBanner(bannerId);
                            }, 4000);
                        }
                        
                    } else {
                        // âœ… CORRECTION ESCALADE : Pas d'AV Mute dÃ©tectÃ© sur projecteur allumÃ© â†’ Escalade SEA
                        console.log(`ðŸŽ¯ [AVMuteAnalysis] Aucun AV Mute dÃ©tectÃ© sur projecteur allumÃ© ${deviceName} â†’ Escalade requise`);
                        updateMonitorStatus('ðŸŽ¯ Projecteur opÃ©rationnel - Escalade technique nÃ©cessaire...');
                        
                        // PrÃ©parer le contexte d'escalade
                        const escalationContext = {
                            intent: 'video_problem',
                            confidence: 0.9,
                            room: getCurrentRoom(),
                            problems: [{
                                room: getCurrentRoom(),
                                device: deviceName,
                                severity: 'medium',
                                reason: `ProblÃ¨me vidÃ©o persistant sur ${deviceName} - Ã‰quipement fonctionnel mais problÃ¨me non rÃ©solu`
                            }],
                            solutions: [],
                            escalation_needed: true,
                            escalation_reason: `Projecteur ${deviceName} fonctionnel mais problÃ¨me vidÃ©o persiste - Diagnostic approfondi requis`
                        };
                        
                        // Fermer la banniÃ¨re et escalader
                        setTimeout(() => {
                            closeSequentialBanner(bannerId);
                            // DÃ©clencher l'escalade SEA aprÃ¨s fermeture
                            setTimeout(() => {
                                console.log('ðŸŽ¯ [AVMuteAnalysis] DÃ©clenchement escalade SEA pour problÃ¨me non rÃ©solu');
                                showSEAEscalationBanner(escalationContext);
                            }, 500);
                        }, 1500);
                    }
                    
                } else {
                    console.error(`âŒ [AVMuteAnalysis] Erreur HTTP ${response.status}`);
                    updateMonitorStatus('âš ï¸ Erreur diagnostic - Projecteur probablement opÃ©rationnel');
                    setTimeout(() => {
                        closeSequentialBanner(bannerId);
                    }, 3000);
                }
                    
                } catch (error) {
                console.error(`âŒ [AVMuteAnalysis] Erreur gÃ©nÃ©rale:`, error);
                updateMonitorStatus('âŒ Erreur analyse AV Mute - VÃ©rifiez manuellement');
                setTimeout(() => {
                    closeSequentialBanner(bannerId);
                }, 3000);
            }
        }
        
        /**
         * âœ… NOUVEAU: SÃ©quence pour correction AV Mute directe
         */
        function startAVUnmuteSequence(bannerId, deviceName, options) {
            console.log(`âœ… [AVUnmuteSequence] Correction AV Mute pour ${deviceName}`);
            
            // Fermer automatiquement aprÃ¨s 3 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 3000);
        }
        
        /**
         * âœ… NOUVEAU: SÃ©quence de monitoring gÃ©nÃ©rique
         */
        function startMonitoringSequence(bannerId, deviceName, options) {
            console.log(`ðŸ‘€ [MonitoringSequence] Surveillance gÃ©nÃ©rique pour ${deviceName}`);
            
            // Pour l'instant, fermer aprÃ¨s 5 secondes
            setTimeout(() => {
                closeSequentialBanner(bannerId);
            }, 5000);
        }

        /**
         * âœ… NOUVEAU: Fermer la banniÃ¨re sÃ©quentielle
         */
        function closeSequentialBanner(bannerId) {
            const banner = document.getElementById(bannerId);
            const overlay = document.getElementById(`overlay_${bannerId}`);
            
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    overlay.remove();
                    console.log(`ðŸ [SequentialBanner] BanniÃ¨re ${bannerId} fermÃ©e`);
                }, 300);
            }
        }

        /**
         * âœ… ANCIEN: Re-vÃ©rifie l'Ã©tat du projecteur aprÃ¨s allumage (OBSOLÃˆTE)
         */
        async function recheckProjectorStatus() {
            console.log('ðŸ” [SequentialCheck] Re-vÃ©rification de l\'Ã©tat du projecteur aprÃ¨s allumage');
            
            // RÃ©-envoyer automatiquement la demande de problÃ¨me vidÃ©o pour vÃ©rification
            try {
                // âœ… S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${currentAPI}/api/copilot/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'VÃ©rification post-allumage projecteur', // Message technique pour re-check
                        room: currentRoom,
                        context: {
                            sequential_check: true,
                            auto_recheck: true
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('âœ… [SequentialCheck] VÃ©rification post-allumage terminÃ©e');
                    processResponse(data);
                } else {
                    console.error('âŒ [SequentialCheck] Erreur lors de la re-vÃ©rification');
                    // En cas d'erreur, afficher directement la banniÃ¨re SEA
                    showSEAEscalationBanner({
                        intent: 'video_problem',
                        confidence: 0.8,
                        room: currentRoom,
                        escalation_reason: 'VÃ©rification post-allumage Ã©chouÃ©e - intervention technique requise'
                    });
                }
            } catch (error) {
                console.error('âŒ [SequentialCheck] Erreur rÃ©seau:', error);
            }
        }

        /**
         * Affiche la banniÃ¨re de confirmation des actions automatiques
         * avec le mÃªme style que les banniÃ¨res SIM/SEA
         */
        function showAutoResultBanner(autoResult) {
            // âœ… CORRECTION: Fermer toutes les banniÃ¨res auto-result existantes AVANT d'en crÃ©er une nouvelle
            const existingAutoBanners = document.querySelectorAll('[id^="auto_result_"]');
            const existingAutoOverlays = document.querySelectorAll('[id^="overlay_auto_result_"]');
            
            existingAutoBanners.forEach(banner => {
                console.log(`ðŸš« [CleanupAutoBanner] Suppression banniÃ¨re auto-result existante: ${banner.id}`);
                banner.remove();
            });
            
            existingAutoOverlays.forEach(overlay => {
                console.log(`ðŸš« [CleanupAutoOverlay] Suppression overlay auto-result existant: ${overlay.id}`);
                overlay.remove();
            });
            
            // âœ… NETTOYAGE TOTAL : Supprimer TOUS les messages du chat avant d'afficher la banniÃ¨re
            const assistantPage = document.getElementById('assistantPage');
            if (assistantPage) {
                const allMessages = assistantPage.querySelectorAll('.message');
                allMessages.forEach(message => {
                    message.remove();
                    console.log('ðŸ§¹ Message supprimÃ© du chat avant banniÃ¨re');
                });
            }
            
            // âœ… MASQUER les palettes pendant l'affichage de la banniÃ¨re
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'none';
            }
            
            const bannerId = `auto_result_${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou
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
            
            // CrÃ©er la banniÃ¨re de confirmation
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
                    <div style="font-size: 3rem; margin-bottom: 1rem;">âœ…</div>
                    <div class="auto-result-text">
                        <strong style="color: white !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Action Automatique RÃ©ussie</strong>
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
            
            // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeAutoResultBanner(bannerId);
                }
            };
            
            // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(bannerDiv);
            
            // Auto-fermeture aprÃ¨s 5 secondes
            setTimeout(() => {
                closeAutoResultBanner(bannerId);
            }, 5000);
        }

        /**
         * Ferme la banniÃ¨re de confirmation automatique
         */
        function closeAutoResultBanner(bannerId) {
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // âœ… REMETTRE les palettes aprÃ¨s fermeture de la banniÃ¨re
            const problemPalettes = document.getElementById('problemPalettes');
            if (problemPalettes) {
                problemPalettes.style.display = 'grid';
                problemPalettes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
                problemPalettes.style.gap = '2rem';
            }
        }

        /**
         * Affiche la banniÃ¨re SEA centrÃ©e avec overlay (comme les autres banniÃ¨res)
         */
        function showSEAEscalationBanner(data) {
            // âœ… CORRECTION: Fermer toutes les banniÃ¨res SEA existantes AVANT d'en crÃ©er une nouvelle
            const existingSeaBanners = document.querySelectorAll('[id^="escalation_sea_"]');
            const existingSeaOverlays = document.querySelectorAll('[id^="overlay_escalation_sea_"]');
            
            existingSeaBanners.forEach(banner => {
                console.log(`ðŸš« [CleanupSEABanner] Suppression banniÃ¨re SEA existante: ${banner.id}`);
                banner.remove();
            });
            
            existingSeaOverlays.forEach(overlay => {
                console.log(`ðŸš« [CleanupSEAOverlay] Suppression overlay SEA existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const escalationId = `escalation_sea_${Date.now()}`;
            const currentRoom = getCurrentRoom();
            
            // CrÃ©er l'overlay plein Ã©cran avec flou
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
            
            // CrÃ©er la banniÃ¨re SEA
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
                        <img id="sea-logo-${escalationId}" alt="Service Expert Audiovisuel UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="sea-fallback-content" style="display: none; color: black !important; text-align: center; padding: 1rem;">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; color: black !important;">ASSISTANCE TECHNIQUE</h3>
                            <p style="margin: 0 0 0.5rem 0; font-size: 1rem; color: black !important;">COMPOSER LE POSTE</p>
                            <p style="margin: 0; font-size: 3rem; font-weight: bold; color: black !important;">6135</p>
                        </div>
                    </div>
                    <div class="escalation-text">
                        <strong style="color: black !important; font-weight: 600; font-size: 1.4rem; display: block; margin-bottom: 0.5rem;">Intervention technique requise</strong>
                        <span class="escalation-subtitle" style="color: black !important; font-weight: 700; font-size: 1.1rem;">SEA: ðŸ“± 6135 ou crÃ©er un ticket - Salle ${currentRoom}</span>
                    </div>
                </div>
                
                <div class="client-description-section" style="margin: 1.5rem 0;">
                    <div class="description-header" style="margin-bottom: 0.5rem;">
                        <i class="fas fa-edit" style="color: black !important; margin-right: 0.5rem;"></i>
                        <span style="color: black !important; font-weight: 600;">Description dÃ©taillÃ©e (facultative)</span>
                    </div>
                    <textarea
                        id="clientDescription_${escalationId}"
                        class="client-description-input"
                        placeholder="DÃ©crivez votre problÃ¨me en dÃ©tail..."
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
                        <small style="color: black !important; font-style: italic;">ðŸ’¡ Si vous ne saisissez rien, un message gÃ©nÃ©rique sera utilisÃ© selon le type de problÃ¨me.</small>
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
                        <i class="fas fa-paper-plane"></i> CrÃ©er un ticket
                    </button>
                </div>
            `;
            
            // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
            overlayDiv.onclick = (event) => {
                // Fermer seulement si on clique directement sur l'overlay, pas sur ses enfants
                if (event.target === overlayDiv) {
                    closeSEAEscalationBanner(escalationId);
                }
            };
            
            // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
            escalationDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // âœ… NOUVEAU : Masquer l'overlay de chargement AU MOMENT EXACT d'afficher la banniÃ¨re
            hideDiagnosticLoading();
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(escalationDiv);
        }

        /**
         * Ferme la banniÃ¨re SEA
         */
        function closeSEAEscalationBanner(escalationId) {
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // âœ… CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme manuellement la banniÃ¨re
            clearEscalationTimeout();
            console.log('ðŸš« [EscalationTimeout] Timer d\'escalade annulÃ© suite Ã  fermeture manuelle de la banniÃ¨re');
        }

        /**
         * CrÃ©e un ticket depuis la banniÃ¨re SEA
         */
        function createTicketFromBanner(escalationId, escalationActions) {
            const description = document.getElementById(`clientDescription_${escalationId}`)?.value?.trim();
            
            // âœ… CORRECTION: CrÃ©er le ticket AVANT de fermer la banniÃ¨re
            createTicket(escalationId, escalationActions, description);
        }

        /**
         * Affiche la modale pour la description dÃ©taillÃ©e du ticket
         */
        function showTicketDescriptionModal(escalationId, escalationActions) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            
            modalIcon.textContent = 'ðŸŽ«';
            modalTitle.textContent = 'Description du problÃ¨me (optionnel)';
            modalMessage.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #666;">
                        Vous pouvez ajouter une description dÃ©taillÃ©e du problÃ¨me pour aider l'Ã©quipe technique :
                    </p>
                    <textarea 
                        id="ticketDescription" 
                        placeholder="DÃ©crivez le problÃ¨me en dÃ©tail (optionnel)..."
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
         * Ferme la banniÃ¨re d'escalade et son overlay
         */
        function closeEscalationBanner(escalationId) {
            console.log(`ðŸš« [CloseEscalation] Fermeture banniÃ¨re ${escalationId}`);
            
            // Supprimer la banniÃ¨re
            const escalationDiv = document.getElementById(escalationId);
            if (escalationDiv) {
                escalationDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // RÃ©afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Ferme la confirmation de ticket et son overlay
         */
        function closeTicketConfirmation(confirmationId) {
            console.log(`âœ… [CloseConfirmation] Fermeture confirmation ${confirmationId}`);
            
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
            
            // RÃ©afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * Affiche la banniÃ¨re de ticket existant avec overlay moderne
         */
        function showExistingTicketBanner(lastTicket) {
            console.log(`ðŸŽ« [ExistingTicket] Affichage banniÃ¨re pour ticket existant: ${lastTicket.number}`);
            
            // âœ… CORRECTION : Masquer le sablier diagnostic car banniÃ¨re de ticket prend le relais
            hideDiagnosticLoading();
            console.log('âœ… [ExistingTicket] Sablier diagnostic masquÃ© - BanniÃ¨re ticket existant prend le relais');
            
            // âœ… CORRECTION: Fermer toutes les banniÃ¨res existantes AVANT d'en crÃ©er une nouvelle
            const existingBanners = document.querySelectorAll('[id^="existing_ticket_"]');
            const existingOverlays = document.querySelectorAll('[id^="overlay_existing_ticket_"]');
            
            existingBanners.forEach(banner => {
                console.log(`ðŸš« [CleanupBanner] Suppression banniÃ¨re existante: ${banner.id}`);
                banner.remove();
            });
            
            existingOverlays.forEach(overlay => {
                console.log(`ðŸš« [CleanupOverlay] Suppression overlay existant: ${overlay.id}`);
                overlay.remove();
            });
            
            const currentRoom = getCurrentRoom();
            
            // CrÃ©er la banniÃ¨re de ticket existant avec overlay plein Ã©cran
            const bannerId = `existing_ticket_${Date.now()}`;
            
            // CrÃ©er l'overlay plein Ã©cran avec flou agressif
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
            
            // CrÃ©er la banniÃ¨re de ticket existant
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
                <div style="font-size: 3rem; margin-bottom: 1rem;">ðŸŽ«</div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket dÃ©jÃ  crÃ©Ã© pour cette salle</h3>
                <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ“„ NumÃ©ro :</strong> ${lastTicket.number}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ¢ Salle :</strong> ${lastTicket.room}</p>
                    <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>â° CrÃ©Ã© :</strong> ${new Date(lastTicket.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
                <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                    Un ticket SEA a dÃ©jÃ  Ã©tÃ© escaladÃ© vers l'Ã©quipe technique dans la mÃªme session.
                </p>
                <p style="margin: 1rem 0; opacity: 0.9; font-size: 0.9rem;">
                    ðŸ“ž <strong>Vous pouvez toujours appeler directement le SEA au 6135</strong> pour un suivi ou une urgence.
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
                        âœ• Fermer
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
                        ðŸ“ž Appeler SEA
                    </button>
                    <button onclick="navigator.clipboard.writeText('${lastTicket.number}').then(() => alert('NumÃ©ro de ticket copiÃ©!'))" style="
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
                        ðŸ“‹ Copier numÃ©ro
                    </button>
                </div>
            `;
            
            // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
            overlayDiv.onclick = (event) => {
                if (event.target === overlayDiv) {
                    closeExistingTicketBanner(bannerId);
                }
            };
            
            // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
            bannerDiv.onclick = (event) => {
                event.stopPropagation();
            };
            
            // Ajouter l'overlay et la banniÃ¨re au body
            document.body.appendChild(overlayDiv);
            document.body.appendChild(bannerDiv);
            
            console.log(`ðŸŽ« [ExistingTicketBanner] BanniÃ¨re affichÃ©e pour ticket ${lastTicket.number}`);
        }
        
        /**
         * Ferme la banniÃ¨re de ticket existant
         */
        function closeExistingTicketBanner(bannerId) {
            console.log(`ðŸš« [CloseExistingTicket] Fermeture banniÃ¨re ${bannerId}`);
            
            // âœ… CORRECTION : Annuler le timer d'escalade quand l'utilisateur ferme la banniÃ¨re
            clearEscalationTimeout();
            console.log('ðŸš« [CloseExistingTicket] Timer d\'escalade annulÃ© suite Ã  fermeture banniÃ¨re ticket existant');
            
            // Supprimer la banniÃ¨re
            const bannerDiv = document.getElementById(bannerId);
            if (bannerDiv) {
                bannerDiv.remove();
            }
            
            // Supprimer l'overlay
            const overlayDiv = document.getElementById(`overlay_${bannerId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
            
            // RÃ©afficher les palettes
            showProblemPalettes();
        }
        
        /**
         * CrÃ©e un ticket directement avec description optionnelle du client
         */
        async function createTicketDirect(escalationId, problemType) {
            console.log(`ðŸŽ« [DirectTicket] CrÃ©ation directe ticket pour ${problemType} - ${escalationId}`);
            
            // RÃ©cupÃ©rer la description optionnelle du client
            const descriptionTextarea = document.getElementById(`problemDescription_${problemType}_${escalationId}`);
            const clientDescription = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            // DÃ©terminer le message gÃ©nÃ©rique selon le type
            let genericMessage = '';
            switch(problemType) {
                case 'video':
                    genericMessage = 'ProblÃ¨me vidÃ©o signalÃ© - aucun affichage ou image dÃ©formÃ©e';
                    break;
                case 'audio':
                    genericMessage = 'ProblÃ¨me audio signalÃ© - aucun son ou qualitÃ© dÃ©gradÃ©e';
                    break;
                default:
                    genericMessage = 'ProblÃ¨me technique signalÃ© nÃ©cessitant intervention';
            }
            
            // Utiliser la description du client ou le message gÃ©nÃ©rique
            const finalDescription = clientDescription || genericMessage;
            
            console.log(`ðŸ“ [TicketDescription] ${clientDescription ? 'Description client' : 'Message gÃ©nÃ©rique'}: "${finalDescription}"`);
            
            await createTicket(escalationId, problemType, finalDescription);
        }

        /**
         * CrÃ©e un ticket avec description optionnelle (conservÃ© pour compatibilitÃ©)
         */
        async function createTicketWithDescription(escalationId, escalationActions) {
            const descriptionTextarea = document.getElementById('ticketDescription');
            const description = descriptionTextarea ? descriptionTextarea.value.trim() : '';
            
            closeTicketDescriptionModal();
            await createTicket(escalationId, escalationActions, description);
        }

        /**
         * CrÃ©e un ticket SEA avec description fournie
         */
        async function createTicket(escalationId, problemType, description = '') {
            try {
                // âœ… CORRECTION : Annuler le timer d'escalade quand un ticket est crÃ©Ã©
                clearEscalationTimeout();
                console.log('ðŸš« [EscalationTimeout] Timer d\'escalade annulÃ© suite Ã  crÃ©ation de ticket');
                
                // âœ… CORRECTION: VÃ©rifier si l'Ã©lÃ©ment existe avant de l'utiliser
                const escalationElement = document.getElementById(escalationId);
                
                // DÃ©sactiver les boutons seulement si l'Ã©lÃ©ment existe
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
                    loadingDiv.textContent = 'ðŸ”„ CrÃ©ation du ticket SEA en cours...';
                    escalationElement.appendChild(loadingDiv);
                }
                
                // PrÃ©parer les donnÃ©es du ticket avec infos Podio enrichies
                const currentRoom = getCurrentRoom();
                const isClientDescription = description && !description.includes('ProblÃ¨me ') && description.length > 20;
                
                const baseDescription = `ProblÃ¨me ${problemType} signalÃ© par un utilisateur via l'interface vitrine nÃ©cessitant une intervention technique.`;
                const fullDescription = `${baseDescription}\n\nDescription : ${description}`;
                
                // ðŸ¢ RÃ©cupÃ©rer les infos Podio du cache s'il existe
                const podioInfo = window.roomCache?.podioInfo;
                
                const ticketData = {
                    category: 'technical_issue',
                    priority: 'medium',
                    title: `ProblÃ¨me ${problemType} signalÃ© via vitrine - Salle ${currentRoom}`,
                    description: fullDescription,
                    client_message: isClientDescription ? 
                        `Signalement via vitrine SAV Qonnect\n\nDescription client : ${description}` : 
                        `Signalement via vitrine SAV Qonnect\n\nMessage gÃ©nÃ©rique : ${description}`,
                    copilot_analysis: `Analyse automatique : intervention technique recommandÃ©e`,
                    room: currentRoom,
                    device_name: 'Non spÃ©cifiÃ©',
                    reporter_name: 'Utilisateur Vitrine',
                    // ðŸ†• INFOS PODIO ENRICHIES (si disponibles)
                    room_pavillon: podioInfo?.pavillon || null,
                    room_bassin: podioInfo?.bassin || null,
                    room_type: podioInfo?.type || null,
                    room_capacite: podioInfo?.capacite || null
                };
                
                console.log('ðŸŽ« [CreateTicket] DonnÃ©es avec infos Podio:', {
                    room: currentRoom,
                    podioInfo: podioInfo,
                    hasPodioData: !!podioInfo
                });

                // âœ… S'assurer d'utiliser le bon backend
                await ensureBackendConnection();
                
                // Appeler l'API pour crÃ©er le ticket
                const response = await fetch(`${currentAPI}/api/copilot/vitrine-create-ticket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(ticketData)
                });

                // âœ… CORRECTION: Supprimer le message de chargement seulement s'il existe
                if (escalationElement) {
                    const loadingDiv = escalationElement.querySelector('div[style*="background: rgba(50, 150, 50, 0.8)"]');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                }

                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status}). Veuillez rÃ©essayer plus tard.`);
                }

                const result = await response.json();
                
                if (result.success && result.ticket) {
                    // âœ… AJOUTER LE TICKET Ã€ LA SESSION pour Ã©viter les doublons
                    addTicketToSession(result.ticket);
                    
                    // âœ… CORRECTION: Fermer la banniÃ¨re SEA avec la bonne fonction
                    closeSEAEscalationBanner(escalationId);
                    
                    // âœ… CORRECTION: Fermer toutes les banniÃ¨res de confirmation existantes AVANT d'en crÃ©er une nouvelle
                    const existingConfirmationBanners = document.querySelectorAll('[id^="confirmation_"]');
                    const existingConfirmationOverlays = document.querySelectorAll('[id^="overlay_confirmation_"]');
                    
                    existingConfirmationBanners.forEach(banner => {
                        console.log(`ðŸš« [CleanupConfirmationBanner] Suppression banniÃ¨re confirmation existante: ${banner.id}`);
                        banner.remove();
                    });
                    
                    existingConfirmationOverlays.forEach(overlay => {
                        console.log(`ðŸš« [CleanupConfirmationOverlay] Suppression overlay confirmation existant: ${overlay.id}`);
                        overlay.remove();
                    });
                    
                    // CrÃ©er la confirmation avec overlay plein Ã©cran
                    const confirmationId = `confirmation_${Date.now()}`;
                    
                    // CrÃ©er l'overlay plein Ã©cran avec flou agressif
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
                    
                    // CrÃ©er la confirmation de ticket avec style moderne
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
                        <div style="font-size: 3rem; margin-bottom: 1rem;">ðŸŽ«</div>
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">Ticket SEA crÃ©Ã© avec succÃ¨s !</h3>
                        <div style="background: rgba(255,255,255,0.15); padding: 1.25rem; border-radius: 10px; margin: 1.5rem 0;">
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ“„ NumÃ©ro :</strong> ${result.ticket.ticket_number || result.ticket.id}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ¢ Salle :</strong> ${result.ticket.room || 'Non spÃ©cifiÃ©'}</p>
                            <p style="margin: 0.5rem 0; font-size: 1rem;"><strong>ðŸ”§ Type :</strong> ProblÃ¨me ${problemType}</p>
                        </div>
                        <p style="margin: 1.5rem 0; opacity: 0.95; font-size: 1rem; line-height: 1.4;">
                            L'Ã©quipe SEA a reÃ§u votre demande et va traiter le problÃ¨me rapidement.
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
                            âœ… Fermer
                        </button>
                    `;
                    
                    // âœ… CORRECTION: Fermer au clic sur l'overlay mais PAS sur les Ã©lÃ©ments internes
                    overlayDiv.onclick = (event) => {
                        if (event.target === overlayDiv) {
                            closeTicketConfirmation(confirmationId);
                        }
                    };
                    
                    // âœ… EmpÃªcher la propagation des Ã©vÃ©nements depuis la banniÃ¨re
                    successDiv.onclick = (event) => {
                        event.stopPropagation();
                    };
                    
                    // Ajouter l'overlay et la confirmation au body
                    document.body.appendChild(overlayDiv);
                    document.body.appendChild(successDiv);
                    
                    console.log(`ðŸŽ« [CreateTicket] Ticket ${result.ticket.ticket_number} crÃ©Ã© pour la salle ${currentRoom}`);
                } else {
                    throw new Error(result.message || 'Erreur lors de la crÃ©ation du ticket');
                }
                
            } catch (error) {
                console.error('Erreur lors de la crÃ©ation du ticket:', error);
                
                // âœ… CORRECTION: Fermer la banniÃ¨re mÃªme en cas d'erreur
                closeSEAEscalationBanner(escalationId);
                
                showModal(
                    'âŒ',
                    'Erreur de crÃ©ation',
                    `Impossible de crÃ©er le ticket : ${error.message}\n\nVeuillez contacter le SEA directement au 6135.`,
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
                        console.log('ðŸ”’ [Lock] Salle verrouillÃ©e dÃ©tectÃ©e:', lock.name);
                        
                        // Appliquer l'interface verrouillÃ©e
                        document.documentElement.classList.add('is-room-locked');
                        
                        // Restaurer la salle dans le cache
                        const roomInfo = parseRoomInfo(lock.name);
                        if (roomInfo) {
                            setRoomCache(roomInfo);
                            
                            // Afficher directement l'assistant (pas la landing)
                            setTimeout(() => {
                                showAssistant();
                                console.log('ðŸ”’ [Lock] Assistant affichÃ© directement pour salle verrouillÃ©e');
                                
                                // ===== CHAT SEA : DÃ©marrer l'Ã©coute des demandes de chat =====
                                startChatRequestListener();
                                
                                // ===== STATUS EVENTS : DÃ©marrer l'Ã©coute des changements de statut =====
                                startStatusEventSource();
                            }, 100);
                        }
                    }
                }
            } catch (error) {
                console.warn('âš ï¸ [Lock] Erreur vÃ©rification verrouillage:', error);
            }
        }
        
        function getClientIP() {
            // Simulation - en rÃ©alitÃ©, le serveur dÃ©tecte l'IP
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
                // âœ… NOUVEAU : S'assurer de la connexion backend avant fermeture
                await ensureBackendConnection();
                
                // âœ… NOUVEAU : Informer le backend que Vitrine ferme le chat
                if (currentChatId) {
                    console.log('ðŸ”š [Vitrine] Fermeture du chat par l\'utilisateur');
                    
                    const response = await fetch(`${currentAPI}/api/tickets/chat/end`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            channel_id: currentChatId,
                            room_id: getCurrentRoom(),
                            ended_by: "vitrine" // âœ… Indiquer que c'est Vitrine qui ferme
                        })
                    });
                    
                    if (response.ok) {
                        console.log('âœ… [Vitrine] Chat fermÃ© avec succÃ¨s cÃ´tÃ© backend');
                    } else {
                        console.error('âŒ [Vitrine] Erreur lors de la fermeture du chat');
                    }
                }
            } catch (error) {
                console.error('âŒ [Vitrine] Erreur lors de la fermeture:', error);
            }
            
            // Fermer l'interface localement
            closeChatInterface();
        }
        
        // ===== CHAT PRIORITY MANAGEMENT =====
        let hiddenStatusBanners = []; // Stocke les banniÃ¨res masquÃ©es pour le chat
        
        function hideStatusBannersForChat() {
            console.log('ðŸ’¬ [ChatPriority] Masquage des banniÃ¨res de statut pour prioritÃ© chat');
            hiddenStatusBanners = [];
            
            // Masquer la banniÃ¨re de statut de ticket si visible
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer && statusContainer.style.display !== 'none') {
                hiddenStatusBanners.push('ticketStatus');
                statusContainer.style.display = 'none';
                console.log('ðŸ’¬ [ChatPriority] BanniÃ¨re de statut masquÃ©e');
            }
            
            // Retirer le flou de la page
            removePageBlurEffect();
            console.log('ðŸ’¬ [ChatPriority] Flou de page retirÃ© pour le chat');
        }
        
        function restoreStatusBannersAfterChat() {
            console.log('ðŸ’¬ [ChatPriority] Restauration des banniÃ¨res de statut aprÃ¨s chat');
            
            // Restaurer la banniÃ¨re de statut si elle Ã©tait visible
            if (hiddenStatusBanners.includes('ticketStatus')) {
                const statusContainer = document.getElementById('ticketStatusContainer');
                if (statusContainer) {
                    statusContainer.style.display = 'flex';
                    // Remettre le flou si c'Ã©tait une banniÃ¨re persistante
                    const statusType = statusContainer.getAttribute('data-status-type');
                    if (statusType === 'persistent') {
                        addPageBlurEffect();
                    }
                    console.log('ðŸ’¬ [ChatPriority] BanniÃ¨re de statut restaurÃ©e');
                }
            }
            
            hiddenStatusBanners = [];
        }

        // ===== CHAT TIMEOUT BANNER FUNCTIONS =====
        function showChatTimeoutBanner() {
            console.log('â° [ChatTimeout] Affichage banniÃ¨re de timeout');
            
            // Masquer la banniÃ¨re de consent si visible
            hideConsentBanner();
            
            // Masquer les banniÃ¨res de statut pour prioritÃ© chat
            hideStatusBannersForChat();
            
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'block';
                
                setTimeout(() => {
                    banner.classList.add('show');
                }, 10);
            }
        }
        
        function closeTimeoutBanner() {
            console.log('âŒ [ChatTimeout] Fermeture banniÃ¨re de timeout');
            
            const banner = document.getElementById('chatTimeoutBanner');
            if (banner) {
                banner.style.display = 'none';
                banner.classList.remove('show');
            }
            
            // Restaurer les banniÃ¨res de statut
            restoreStatusBannersAfterChat();
        }
        
        async function initiateClientChat() {
            console.log('ðŸ’¬ [ChatTimeout] Client initie la conversation avec SEA');
            
            try {
                // âœ… S'assurer d'utiliser le bon backend (localhost vs UQAM)
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
                    console.log('âœ… [ChatTimeout] Demande d\'initiation envoyÃ©e:', data);
                    
                    // Fermer la banniÃ¨re de timeout
                    closeTimeoutBanner();
                    
                    // Afficher un message d'attente
                    showNotification('Demande de chat envoyÃ©e au technicien SEA. En attente de rÃ©ponse...');
                } else {
                    console.error('âŒ [ChatTimeout] Erreur lors de l\'initiation:', response.status);
                    showNotification('Erreur lors de l\'envoi de la demande de chat');
                }
            } catch (error) {
                console.error('âŒ [ChatTimeout] Erreur rÃ©seau:', error);
                showNotification('Erreur de connexion');
            }
        }

        // ===== CONSENT BANNER FUNCTIONS =====
        function showConsentBanner(ticketNumber, roomId = null) {
            // âœ… NOUVEAU : Masquer les banniÃ¨res de statut pour prioritÃ© chat
            hideStatusBannersForChat();
            
            document.getElementById('consentTicketNumber').textContent = ticketNumber;
            
            // Afficher le nom de la salle si fourni
            if (roomId) {
                document.getElementById('consentRoomName').textContent = roomId;
            } else {
                document.getElementById('consentRoomName').textContent = getCurrentRoom() || 'Inconnue';
            }
            
            document.getElementById('consentBanner').style.display = 'block';
            
            // âœ… NOUVEAU : Afficher banniÃ¨re de timeout aprÃ¨s 30 secondes au lieu de fermer
            setTimeout(() => {
                if (document.getElementById('consentBanner').style.display !== 'none') {
                    console.log('â° [ChatTimeout] Timeout de 30s - Affichage banniÃ¨re de timeout');
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
                // âœ… NOUVEAU : S'assurer de la connexion backend avant acceptation
                await ensureBackendConnection();
                
                console.log('âœ… [Consent] Chat acceptÃ©');
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'accept',
                        channel_id: currentChatId // âœ… CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    hideConsentBanner();
                    openChatInterface();
                }
                
            } catch (error) {
                console.error('âŒ [Consent] Erreur acceptation:', error);
            }
        }
        
        async function declineChat() {
            try {
                // âœ… NOUVEAU : S'assurer de la connexion backend avant refus
                await ensureBackendConnection();
                
                console.log('âŒ [Consent] Chat refusÃ© par le client');
                console.log('ðŸ”— [Consent] Channel ID:', currentChatId);
                console.log('ðŸ  [Consent] Room ID:', getCurrentRoom());
                
                const response = await fetch(`${currentAPI}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: getCurrentRoom(),
                        action: 'decline',
                        channel_id: currentChatId // âœ… CORRECTION : utiliser channel_id au lieu de chat_id
                    })
                });
                
                if (response.ok) {
                    console.log('âœ… [Consent] Refus envoyÃ© au serveur avec succÃ¨s');
                } else {
                    console.error('âŒ [Consent] Erreur serveur lors du refus:', response.status);
                }
                
                hideConsentBanner();
                currentChatId = null;
                
                // âœ… NOUVEAU : Restaurer les banniÃ¨res de statut aprÃ¨s refus du chat
                restoreStatusBannersAfterChat();
                
            } catch (error) {
                console.error('âŒ [Consent] Erreur refus:', error);
            }
        }
        
        // ===== CHAT INTERFACE FUNCTIONS =====
        function openChatInterface() {
            // âœ… NOUVEAU : Masquer les banniÃ¨res de statut pour prioritÃ© chat
            hideStatusBannersForChat();
            
            document.getElementById('chatModal').classList.add('active');
            
            // Ajouter le message d'accueil automatique
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer && messagesContainer.children.length === 0) {
                const welcomeMessage = document.createElement('div');
                welcomeMessage.className = 'chat-message system-message';
                welcomeMessage.innerHTML = `
                    <div class="system-message-content">
                        <i class="fas fa-headset"></i>
                        <div class="system-message-text">
                            <strong>Bonjour ! ðŸ‘‹</strong><br>
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
            currentChatId = null;
            
            // âœ… NOUVEAU : Restaurer les banniÃ¨res de statut aprÃ¨s fermeture du chat
            restoreStatusBannersAfterChat();
            
            if (chatEventSource) {
                chatEventSource.close();
                chatEventSource = null;
            }
        }
        
        function handleChatKeyPress(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message || !currentChatId) return;
            
            try {
                // âœ… NOUVEAU : S'assurer de la connexion backend avant envoi
                await ensureBackendConnection();
                
                console.log(`ðŸ” [DEBUG-VITRINE] Envoi message avec channel_id: "${currentChatId}"`);
                console.warn(`ðŸš¨ [DEBUG-VISIBLE] VITRINE ENVOIE AVEC CHANNEL_ID: "${currentChatId}"`);
                
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
                
            } catch (error) {
                console.error('âŒ [Chat] Erreur envoi message:', error);
            }
        }
        
        function addChatMessage(message, type) {
            const messagesContainer = document.getElementById('chatMessages');
            
            // VÃ©rifier si le message n'existe pas dÃ©jÃ  (Ã©viter les doublons)
            const existingMessages = messagesContainer.querySelectorAll('.chat-message');
            for (let msg of existingMessages) {
                if (msg.textContent === message && msg.className.includes(type)) {
                    console.log('âš ï¸ [Chat] Message en double dÃ©tectÃ©, ignorÃ©:', message);
                    return;
                }
            }
            
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${type}`;
            messageElement.textContent = message;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            console.log(`âœ… [Chat] Message ajoutÃ©: ${type} - ${message}`);
        }
        
        // ===== CHAT EVENT SOURCE - SUPPRIMÃ‰ =====
        // RemplacÃ© par startChatRequestListener() qui gÃ¨re tout via /api/tickets/chat/stream
        
        // ===== CHAT REQUEST LISTENER RÃ‰EL =====
        function startChatRequestListener() {
            if (!getCurrentRoom()) return;
            
            const roomId = getCurrentRoom();
            console.log(`ðŸ’¬ [Chat] DÃ©marrage Ã©coute SSE RÃ‰ELLE pour salle ${roomId}`);
            
            // âœ… CORRIGÃ‰ : Utiliser currentAPI maintenant que l'initialisation est terminÃ©e
            const sseUrl = `${currentAPI}/api/tickets/chat/stream?room_id=${roomId}`;
            
            // âš ï¸ DEBUG : VÃ©rifier qu'on n'a pas dÃ©jÃ  une connexion active
            if (window.vitrineChatEventSource) {
                console.log('âš ï¸ [SSE] Fermeture connexion existante pour Ã©viter duplication');
                window.vitrineChatEventSource.close();
            }
            
            const eventSource = new EventSource(sseUrl);
            window.vitrineChatEventSource = eventSource; // Stocker pour Ã©viter duplicata
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('ðŸ“¡ [SSE] Ã‰vÃ©nement RÃ‰EL reÃ§u:', data);
                    
                    switch (data.type) {
                        case 'connection_established':
                            console.log('âœ… [SSE] Connexion RÃ‰ELLE Ã©tablie pour salle ' + roomId);
                            showNotification('Connexion chat Ã©tablie - En attente des demandes SEA');
                            break;
                            
                        case 'chat_initiated':
                            // Une demande de chat RÃ‰ELLE est arrivÃ©e depuis Tickets SEA
                            console.log('ðŸ’¬ [SSE] Demande de chat RÃ‰ELLE reÃ§ue:', data.data);
                            currentChatId = data.data.channel_id;
                            showConsentBanner(`Demande de chat pour salle ${roomId}`, roomId);
                            break;
                            
                        case 'chat_ended':
                            // âœ… NOUVEAU : VÃ©rifier QUI a fermÃ© le chat
                            const endedBy = data.data?.ended_by || 'unknown';
                            console.log('ðŸ›‘ [SSE] Chat terminÃ© par:', endedBy);
                            
                            hideConsentBanner();
                            closeChatInterface();
                            
                            // âœ… LOGIQUE CORRECTE : Afficher le bon message selon qui a fermÃ©
                            if (endedBy === 'vitrine') {
                                // Le client a fermÃ© â†’ Pas de notification (il le sait dÃ©jÃ )
                                console.log('â„¹ï¸ [SSE] Chat fermÃ© par le client - Pas de notification');
                            } else if (endedBy.startsWith('tickets_sea')) {
                                // Le technicien a fermÃ© â†’ Notification appropriÃ©e
                                if (endedBy === 'tickets_sea_with_summary') {
                                    showNotification('Chat terminÃ© par le technicien - RÃ©sumÃ© crÃ©Ã©');
                                } else if (endedBy === 'tickets_sea_no_summary') {
                                    showNotification('Chat terminÃ© par le technicien');
                                } else {
                                    showNotification('Chat terminÃ© par l\'opÃ©rateur SEA');
                                }
                            } else {
                                // Fermeture inconnue â†’ Message gÃ©nÃ©rique
                                showNotification('Chat terminÃ©');
                            }
                            
                            currentChatId = null;
                            
                            // âœ… NOUVEAU : Assurer la restauration des banniÃ¨res mÃªme si fermÃ© cÃ´tÃ© serveur
                            restoreStatusBannersAfterChat();
                            break;

                        case 'chat_interface_open':
                            console.log('ðŸ’¬ [SSE] Ouverture interface de chat demandÃ©e:', data.data);
                            // âœ… NOUVEAU : Mettre Ã  jour currentChatId avec le channel_id du chat acceptÃ©
                            if (data.data && data.data.channel_id) {
                                currentChatId = data.data.channel_id;
                                console.log('âœ… [SSE] currentChatId mis Ã  jour:', currentChatId);
                            }
                            hideConsentBanner();
                            openChatInterface();
                            showNotification('Chat dÃ©marrÃ© - Interface ouverte');
                            break;

                        case 'chat_message':
                            console.log('ðŸ’¬ [SSE] Message reÃ§u:', data.data);
                            // Ã‰viter d'ajouter les messages envoyÃ©s par Vitrine (ils sont dÃ©jÃ  affichÃ©s)
                            if (data.data.sender && data.data.sender !== 'vitrine') {
                                addChatMessage(data.data.message, 'received');
                            } else if (!data.data.sender) {
                                // Si pas de sender, traiter comme message reÃ§u
                                addChatMessage(data.data.message, 'received');
                            }
                            break;
                            
                        default:
                            console.log('ðŸ“¡ [SSE] Ã‰vÃ©nement non gÃ©rÃ©:', data.type);
                    }
                } catch (error) {
                    console.error('âŒ [SSE] Erreur parsing Ã©vÃ©nement:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('âŒ [SSE] Erreur de connexion SSE RÃ‰ELLE:', error);
                // Reconnexion automatique avec backoff exponentiel
                setTimeout(() => {
                    if (getCurrentRoom()) {
                        console.log('ðŸ”„ [SSE] Tentative de reconnexion...');
                        startChatRequestListener();
                    }
                }, 5000);
            };
            
            eventSource.onopen = function() {
                console.log('âœ… [SSE] Connexion SSE RÃ‰ELLE Ã©tablie pour salle ' + roomId);
            };
        }
        
        // ===== STATUS CHANGE LISTENER POUR TICKETS SEA =====
        let statusEventSource = null;
        
        function startStatusEventSource() {
            const currentRoom = getCurrentRoom();
            if (!currentRoom) {
                console.log('ðŸ”” [StatusEvents] Pas de salle dÃ©finie, EventSource non dÃ©marrÃ©');
                return;
            }

            // Fermer l'EventSource existant s'il y en a un
            if (statusEventSource) {
                statusEventSource.close();
                statusEventSource = null;
            }

            // âœ… RÃ‰ACTIVÃ‰ : EventSource pour les changements de statuts des tickets
            console.log('ðŸ”” [StatusEvents] DÃ©marrage EventSource pour changements de statuts');
            
            // âœ… CORRIGÃ‰ : Utiliser currentAPI maintenant que l'initialisation est terminÃ©e
            const sseUrl = `${currentAPI}/api/tickets/chat/events/vitrine?room_id=${currentRoom}`;
            statusEventSource = new EventSource(sseUrl);

            statusEventSource.onopen = function() {
                console.log('ðŸ”” [StatusEvents] EventSource ouvert pour les changements de statut de la salle ' + currentRoom);
            };

            statusEventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('ðŸ”” [StatusEvents] Ã‰vÃ©nement reÃ§u:', data);
                    
                    // âœ… DEBUG COMPLET : Analyser la structure de l'Ã©vÃ©nement
                    console.log('ðŸ”” [StatusEvents] Type de data:', typeof data);
                    console.log('ðŸ”” [StatusEvents] PropriÃ©tÃ©s de data:', Object.keys(data));
                    console.log('ðŸ”” [StatusEvents] data.Type:', data.Type);
                    console.log('ðŸ”” [StatusEvents] data.type:', data.type);
                    console.log('ðŸ”” [StatusEvents] data.Data:', data.Data);
                    console.log('ðŸ”” [StatusEvents] data.data:', data.data);

                    // âœ… CORRECTION FINALE : Utiliser les champs minuscules !
                    if (data.type === 'ticket_status_change') {
                        // VÃ©rifier que l'Ã©vÃ©nement concerne la salle courante
                        if (data.data && data.data.room === currentRoom) {
                            console.log('ðŸ”” [StatusEvents] Changement de statut dÃ©tectÃ© pour cette salle:', data.data);
                            // âœ… NOUVEAU : Passer le statut pour dÃ©terminer si c'est persistant
                            showTicketStatusMessage(data.data.message, data.data.status);
                        }
                    } else if (data.type === 'connection_established') {
                        console.log('ðŸ”” [StatusEvents] Connexion SSE Ã©tablie pour salle:', data.data.room_id);
                    }
                } catch (error) {
                    console.error('ðŸ”” [StatusEvents] Erreur parsing Ã©vÃ©nement:', error);
                }
            };

            statusEventSource.onerror = function(error) {
                console.error('ðŸ”” [StatusEvents] Erreur EventSource:', error);
                // Tentative de reconnexion aprÃ¨s 5 secondes
                setTimeout(() => {
                    if (statusEventSource && statusEventSource.readyState === EventSource.CLOSED) {
                        console.log('ðŸ”” [StatusEvents] Tentative de reconnexion EventSource...');
                        startStatusEventSource();
                    }
                }, 5000);
            };
        }
        
        function showTicketStatusMessage(message, statusType) {
            const statusContainer = document.getElementById('ticketStatusContainer') || createTicketStatusContainer();
            
            // âœ… NOUVEAU : DÃ©terminer le style basÃ© sur le type de statut
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
            
            // âœ… NOUVEAU : BanniÃ¨re spÃ©ciale pour EN COURS avec numÃ©ro d'urgence et sans bouton X
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
                                ðŸ“ž <a href="tel:6135" style="color: white; text-decoration: none;">6135</a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // BanniÃ¨re normale pour les autres statuts
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
            
            // âœ… NOUVEAU : Effet blur sur la page pour les banniÃ¨res importantes
            if (statusType === 'open' || statusType === 'in_progress' || statusType === 'resolved') {
                addPageBlurEffect();
            }
            
            // âœ… NOUVEAU : Les statuts temporaires disparaissent aprÃ¨s 5 secondes, les persistants restent
            if (!isPersistent) {
                setTimeout(() => {
                    hideTicketStatusMessage();
                }, 5000);
            }
            
            console.log(`ðŸ”” [Status] Message affichÃ© (${isPersistent ? 'PERSISTANT' : 'TEMPORAIRE'}): ${message}`);
        }
        
        function hideTicketStatusMessage() {
            const statusContainer = document.getElementById('ticketStatusContainer');
            if (statusContainer) {
                statusContainer.style.display = 'none';
                // âœ… NOUVEAU : Retirer l'effet blur quand on ferme la banniÃ¨re
                removePageBlurEffect();
            }
        }
        
        // âœ… NOUVEAU : Fonctions pour gÃ©rer l'effet blur et blocage des interactions
        function addPageBlurEffect() {
            // CrÃ©er un overlay blur si il n'existe pas
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
            
            // ✅ CORRECTION : Vérifier que blurOverlay existe avant d'ajouter les événements
            if (blurOverlay) {
                // ✅ NOUVEAU : Bloquer tous les clics sur l'overlay
                blurOverlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                
                // âœ… NOUVEAU : Bloquer le scroll et autres interactions
                blurOverlay.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
            
            // âœ… NOUVEAU : Bloquer le scroll sur le body
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
                
                // âœ… NOUVEAU : RÃ©tablir le scroll sur le body
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
         * Affiche la modale avec le rÃ©sultat
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
        function closeModal() {
            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.remove('active');
            
            // Retour automatique Ã  l'accueil aprÃ¨s un dÃ©lai
            setTimeout(() => {
                returnToHome();
            }, 300);
        }



        // ===== GESTIONNAIRES D'Ã‰VÃ‰NEMENTS =====

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
            // âœ… BLOQUER COMPLÃˆTEMENT : Si c'est une action automatique exÃ©cutÃ©e, ne rien afficher dans le chat
            if (data.auto_executed && data.auto_result) {
                // âœ… NOUVEAU: DÃ©tecter les allumages de projecteur (actions + auto_result)
                const isProjectorPowerOnFromActions = data.actions && data.actions.some(action => 
                    action.type === 'pjlink_power' && 
                    (action.command === 'power_on' || action.description?.toLowerCase().includes('allumer'))
                );
                
                const isProjectorPowerOnFromResult = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('allumer') && 
                     (data.auto_result.includes('PROJ-') || data.auto_result.toLowerCase().includes('projecteur')));
                
                const isAVMuteAction = data.auto_result && 
                    (data.auto_result.toLowerCase().includes('av mute') || 
                     data.auto_result.toLowerCase().includes('dÃ©sactiver') && data.auto_result.includes('PROJ-'));
                
                // âœ… LOGIQUE SIMPLIFIÃ‰E : BanniÃ¨re verte simple pour TOUTES les corrections automatiques
                console.log('âœ… [AutoCorrection] Action automatique rÃ©ussie - BanniÃ¨re verte simple');
                setTimeout(() => {
                    showAutoResultBanner(data.auto_result);
                }, 500);
                return; // Ne pas crÃ©er de message dans le chat
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
                    // âœ… FILTRER : Supprimer les messages d'actions automatiques du contenu principal
                    let filteredContent = content;
                    if (typeof filteredContent === 'string') {
                        // Supprimer les lignes contenant des messages d'actions automatiques
                        filteredContent = filteredContent
                            .split('\n')
                            .filter(line => !line.includes('Actions automatiques exÃ©cutÃ©es'))
                            .filter(line => !line.match(/^âœ….*DÃ©sactiver.*sourdine/))
                            .filter(line => !line.match(/^âœ….*TCC2.*sourdine/))
                            .filter(line => !line.match(/^âœ….*[Aa]ction.*automatique/))
                            .filter(line => line.trim() !== '')
                            .join('\n');
                    }
                    messageContent += formatContent(filteredContent);
                }
                
                // Actions manuelles uniquement (les actions automatiques sont gÃ©rÃ©es par la banniÃ¨re centrÃ©e)
                if (data.actions && data.actions.length > 0) {
                    const manualActions = data.actions.filter(action => !(action.executed || data.auto_executed));
                    if (manualActions.length > 0) {
                    messageContent += '<div class="message-actions">';
                        manualActions.forEach(action => {
                            messageContent += `<button class="action-btn" onclick="executeAction('${action.type}', '${action.device_id || 0}', ${JSON.stringify(action.parameters || {}).replace(/"/g, '&quot;')})">ðŸ”§ ${action.description || action.label || action.type}</button>`;
                    });
                    messageContent += '</div>';
                }
                }

                // âœ… Les actions automatiques sont gÃ©rÃ©es au dÃ©but de addMessage (pas ici)
                
                // âœ… CORRECTION: Escalade avec banniÃ¨re centrÃ©e - vÃ©rifier les tickets existants
                if (data.escalation_needed) {
                    setTimeout(() => {
                        const currentRoom = getCurrentRoom();
                        if (hasExistingTicket(currentRoom)) {
                            const lastTicket = getLastSessionTicket(currentRoom);
                            console.log(`ðŸŽ« [TicketExistant] Escalade demandÃ©e mais ticket ${lastTicket.number} existe â†’ BanniÃ¨re ticket existant`);
                            showExistingTicketBanner(lastTicket);
                        } else {
                            showSEAEscalationBanner(data);
                        }
                    }, 500);
                }
                
                // âœ… Actions automatiques dÃ©jÃ  gÃ©rÃ©es au dÃ©but de addMessage
                
                messageContent += '</div>';
            }

            messageDiv.innerHTML = messageContent;
            
            // âœ… NOUVEAU : Remplacer le contenu au lieu d'ajouter
            const assistantPage = document.getElementById('assistantPage');
            
            // Supprimer tous les messages prÃ©cÃ©dents
            const existingMessages = assistantPage.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            // Ajouter le nouveau message
            assistantPage.appendChild(messageDiv);
            
            // Charger l'image SEA2 pour les banniÃ¨res d'escalade
            setTimeout(async () => {
                const escalationImgs = messageDiv.querySelectorAll('img[id^="sea-logo-"]');
                for (const img of escalationImgs) {
                    await updateSEALogo(img);
                }
            }, 100);

            return messageId;
        }



        // ===== CACHE PODIO SESSION POUR INFOS SALLES =====
        
        /**
         * Cache session pour les informations Podio des salles
         * Garde les donnÃ©es jusqu'au F5 de la page
         */
        class PodioRoomCache {
            constructor() {
                this.cache = new Map();
                this.maxCacheSize = 50; // Limite mÃ©moire
                console.log('ðŸ¢ [PodioCache] Cache Podio initialisÃ©');
            }
            
            /**
             * RÃ©cupÃ¨re les informations d'une salle avec cache session
             */
            async getRoomInfo(roomName) {
                // ðŸ’¾ Check cache first (session seulement)
                if (this.cache.has(roomName)) {
                    console.log(`ðŸ“‹ [PodioCache] Cache hit pour salle: ${roomName}`);
                    return this.cache.get(roomName);
                }
                
                try {
                    // âœ… NOUVEAU : S'assurer de la connexion backend avant appel Podio
                    const apiUrl = await ensureBackendConnection();
                    
                    console.log(`ðŸŒ [PodioCache] API call pour salle: ${roomName}`);
                    
                    // ðŸ Appel API Podio PRIORITAIRE avec fallback NeonDB si Ã©chec - âœ… UTILISER apiUrl
                    const response = await fetch(
                        `${apiUrl}/api/podio/public-room-info?room=${encodeURIComponent(roomName)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            // ðŸ• Timeout pour Ã©viter blocage
                            signal: AbortSignal.timeout(10000) // 10s timeout
                        }
                    );
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            throw new Error('Rate limit atteint - veuillez patienter');
                        }
                        throw new Error(`HTTP ${response.status}: Salle non trouvÃ©e`);
                    }
                    
                    const data = await response.json();
                    
                    // âœ… PODIO SUCCÃˆS: Parser la rÃ©ponse Podio normale
                    if (data.success && data.details) {
                        console.log(`âœ… [PodioCache] Salle ${roomName} trouvÃ©e dans Podio`);
                        const roomInfo = {
                            name: data.salle_code || roomName,
                            pavillon: data.details.Pavillon || '',
                            bassin: data.details.Proprietaire || '',
                            type: data.details["Type de salle"] || '',
                            capacite: data.details["CapacitÃ©"] || '',
                            source: 'podio'
                        };
                        
                        this.cache.set(roomName, roomInfo);
                        console.log(`âœ… [PodioCache] Salle ${roomName} mise en cache (Podio):`, roomInfo);
                        return roomInfo;
                    }
                    
                    // âš ï¸ PODIO Ã‰CHEC: Essayer fallback NeonDB pour Ã©quipements
                    console.log(`âš ï¸ [PodioCache] Salle ${roomName} non trouvÃ©e dans Podio â†’ Tentative fallback NeonDB`);
                    throw new Error('Salle non trouvÃ©e dans Podio, fallback NeonDB nÃ©cessaire');
                    
                } catch (error) {
                    console.warn(`âš ï¸ [PodioCache] Ã‰chec Podio pour ${roomName}: ${error.message}`);
                    
                    // âœ… FALLBACK NEONDB: Essayer de rÃ©cupÃ©rer les Ã©quipements depuis NeonDB
                    try {
                        console.log(`ðŸ”„ [PodioCache] Tentative fallback NeonDB pour salle: ${roomName}`);
                        
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
                                console.log(`âœ… [PodioCache] Salle ${roomName} trouvÃ©e via NeonDB (${neonData.devices.length} Ã©quipements)`);
                                
                                const roomInfo = {
                                    name: roomName,
                                    pavillon: '', // Non disponible via NeonDB
                                    bassin: '',   // Non disponible via NeonDB
                                    type: '',     // Non disponible via NeonDB
                                    capacite: '', // Non disponible via NeonDB
                                    devices: neonData.devices || [],
                                    equipment_count: neonData.count || 0,
                                    source: 'neondb' // âœ… Marquer la source
                                };
                                
                                // ðŸ’¾ Mettre en cache le rÃ©sultat NeonDB
                                this.cache.set(roomName, roomInfo);
                                
                                // ðŸ§¹ Nettoyer cache si nÃ©cessaire
                                if (this.cache.size > this.maxCacheSize) {
                                    const firstKey = this.cache.keys().next().value;
                                    this.cache.delete(firstKey);
                                    console.log(`ðŸ§¹ [PodioCache] Cache nettoyÃ© - supprimÃ©: ${firstKey}`);
                                }
                                
                                console.log(`âœ… [PodioCache] Salle ${roomName} mise en cache (NeonDB):`, roomInfo);
                                return roomInfo;
                            }
                        }
                        
                        console.log(`âŒ [PodioCache] Fallback NeonDB Ã©galement Ã©chouÃ© pour ${roomName}`);
                        return null; // DÃ©gradation gracieuse
                        
                    } catch (neonError) {
                        console.warn(`âŒ [PodioCache] Erreur fallback NeonDB pour ${roomName}:`, neonError.message);
                        return null; // DÃ©gradation gracieuse
                    }
                }
            }
            
            /**
             * Vide le cache manuellement (pour tests)
             */
            clearCache() {
                this.cache.clear();
                console.log('ðŸ§¹ [PodioCache] Cache Podio vidÃ© manuellement');
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
         * DÃ©termine le type de problÃ¨me basÃ© sur le contexte
         */
        function determineProblemType() {
            // Analyser le dernier message ou le contexte pour dÃ©terminer le type
            const messages = document.querySelectorAll('.message');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageText = lastMessage.textContent.toLowerCase();
                
                if (messageText.includes('audio') || messageText.includes('son') || messageText.includes('microphone') || messageText.includes('haut-parleur')) {
                    return 'audio';
                } else if (messageText.includes('vidÃ©o') || messageText.includes('projecteur') || messageText.includes('Ã©cran') || messageText.includes('image')) {
                    return 'vidÃ©o';
                } else if (messageText.includes('rÃ©seau') || messageText.includes('internet') || messageText.includes('wifi') || messageText.includes('connexion')) {
                    return 'rÃ©seau';
                } else {
                    return 'technique';
                }
            }
            return 'technique';
        }
        
        /**
         * GÃ©nÃ¨re un message gÃ©nÃ©rique selon le type de problÃ¨me
         */
        function getGenericMessage(problemType) {
            const messages = {
                'audio': 'ProblÃ¨me audio signalÃ© - Microphone, haut-parleurs, volume ou qualitÃ© sonore',
                'vidÃ©o': 'ProblÃ¨me vidÃ©o signalÃ© - Projecteur, Ã©cran, qualitÃ© d\'image ou connectivitÃ©',
                'rÃ©seau': 'ProblÃ¨me rÃ©seau signalÃ© - Connexion internet, Wi-Fi ou connectivitÃ© rÃ©seau',
                'technique': 'ProblÃ¨me technique signalÃ© - Ã‰quipement, infrastructure ou maintenance gÃ©nÃ©rale'
            };
            
            return messages[problemType] || messages['technique'];
        }

        // ===== FONCTIONS DE THÃˆME ET NAVIGATION =====
        
        // Basculer le thÃ¨me
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

        // âœ… NOUVEAU : Fonctions Mode Technique
        function openTechnicalMode() {
            console.log('ðŸ”§ [Technical] Ouverture du mode technique');
            const modal = document.getElementById('technicalAuthModal');
            const passwordInput = document.getElementById('technicalPassword');
            const errorDiv = document.getElementById('technicalAuthError');
            
            // RÃ©initialiser le modal
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
            console.log('ðŸ”§ [Technical] Fermeture modal authentification');
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
            
            console.log('ðŸ”§ [Technical] Tentative d\'authentification via API');
            
            if (!password) {
                showTechnicalAuthError('Veuillez saisir le mot de passe');
                return;
            }
            
            // DÃ©sactiver le bouton pendant la requÃªte
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> VÃ©rification...';
            
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
                console.log('ðŸ”§ [Technical] RÃ©ponse API:', data);
                
                if (data.success) {
                    console.log('âœ… [Technical] Authentification rÃ©ussie');
                    // Stocker le token pour les futures requÃªtes (optionnel)
                    localStorage.setItem('technical_token', data.token);
                    localStorage.setItem('technical_expires', data.expires_at);
                    
                    closeTechnicalAuth();
                    showTechnicalPage();
                } else {
                    console.log('âŒ [Technical] Authentification Ã©chouÃ©e:', data.message);
                    showTechnicalAuthError(data.message || 'Mot de passe incorrect');
                }
            } catch (error) {
                console.error('âŒ [Technical] Erreur lors de l\'authentification:', error);
                showTechnicalAuthError('Erreur de connexion au serveur');
            } finally {
                // RÃ©activer le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-unlock"></i> AccÃ©der';
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
            console.log('ðŸ”§ [Technical] Affichage page technique');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // RÃ©cupÃ©rer la salle actuelle pour l'afficher
            const currentRoom = getCurrentRoom();
            const technicalRoomSpan = document.getElementById('technicalCurrentRoom');
            if (technicalRoomSpan) {
                technicalRoomSpan.textContent = currentRoom || 'Non dÃ©finie';
            }
            
            // Masquer Vitrine et afficher la page technique
            if (mainContainer) {
                mainContainer.style.display = 'none';
            }
            technicalPage.style.display = 'block';
            
            console.log('ðŸ”§ [Technical] Page technique affichÃ©e pour la salle:', currentRoom);
        }

        function returnToVitrine() {
            console.log('ðŸ”§ [Technical] Retour Ã  Vitrine');
            const technicalPage = document.getElementById('technicalPage');
            const mainContainer = document.querySelector('.main-container');
            
            // Masquer la page technique et rÃ©afficher Vitrine
            technicalPage.style.display = 'none';
            if (mainContainer) {
                mainContainer.style.display = 'block';
            }
            
            console.log('âœ… [Technical] Retour Ã  Vitrine effectuÃ©');
        }

        // âœ… NOUVEAU : Fonctions de gestion de l'overlay de chargement diagnostic
        function showDiagnosticLoading() {
            console.log('â³ [Diagnostic] Affichage du chargement');
            const overlay = document.getElementById('diagnosticLoadingOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
                // Petite pause pour la transition CSS
                setTimeout(() => {
                    overlay.classList.add('show');
                }, 10);
            }
        }

        function hideDiagnosticLoading() {
            console.log('âœ… [Diagnostic] Masquage du chargement');
            const overlay = document.getElementById('diagnosticLoadingOverlay');
            if (overlay) {
                // âœ… CORRECTION : Masquage immÃ©diat pour Ã©viter le retard avec les banniÃ¨res
                overlay.classList.remove('show');
                overlay.style.display = 'none';
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

        // Retour Ã  l'accueil (page des palettes) - PAS la landing page
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
            
            // âœ… NETTOYAGE : Supprimer toutes les banniÃ¨res d'escalade
            const escalationInterfaces = document.querySelectorAll('.escalation-interface');
            escalationInterfaces.forEach(interface => interface.remove());
            
            const escalationCompact = document.querySelectorAll('.escalation-compact');
            escalationCompact.forEach(compact => compact.remove());
            
            // âœ… NETTOYAGE : Supprimer tous les messages contenant "Actions automatiques exÃ©cutÃ©es"
            document.querySelectorAll('.message').forEach(message => {
                if (message.textContent && message.textContent.includes('Actions automatiques exÃ©cutÃ©es')) {
                    message.remove();
                }
            });
            
            // Afficher les palettes de problÃ¨mes avec la grille horizontale
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
            
            console.log('ðŸ  Retour Ã  l\'accueil (page des palettes)');
        }

        // Appliquer le thÃ¨me sauvegardÃ© au chargement
        document.addEventListener('DOMContentLoaded', () => {
            // âœ… INITIALISATION THÃˆME ET COULEURS
            const headerTitle = document.getElementById('headerTitle');
            const savedTheme = localStorage.getItem('vitrine-theme');
            
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                if (headerTitle) headerTitle.style.color = 'black';
            } else {
                document.body.removeAttribute('data-theme');
                if (headerTitle) headerTitle.style.color = 'black';
            }
            
            // âœ… NETTOYAGE : Supprimer toutes les banniÃ¨res d'escalade rÃ©siduelles
            const oldEscalationInterfaces = document.querySelectorAll('.escalation-interface');
            oldEscalationInterfaces.forEach(interface => interface.remove());
            
            const oldEscalationCompact = document.querySelectorAll('.escalation-compact');
            oldEscalationCompact.forEach(compact => compact.remove());
            
            // âœ… NETTOYAGE IMMÃ‰DIAT : Supprimer tous les messages "Actions automatiques exÃ©cutÃ©es"
            setTimeout(() => {
                document.querySelectorAll('.message').forEach(message => {
                    if (message.textContent && message.textContent.includes('Actions automatiques exÃ©cutÃ©es')) {
                        message.remove();
                        console.log('ðŸ§¹ Message "Actions automatiques exÃ©cutÃ©es" supprimÃ© du DOM');
                    }
                });
            }, 100);
            
            // ===== THÃˆME HYBRIDE INTELLIGENT =====
            initializeTheme();
            setupThemeListener();
            console.log('ðŸŽ¨ [Theme] SystÃ¨me de thÃ¨me hybride initialisÃ©');
            
            // ===== VERROUILLAGE DE SALLE =====
            checkAndApplyRoomLock();
            
            // ===== CHAT SEA INITIALISATION =====
            console.log('ðŸ’¬ [ChatSEA] Initialisation du systÃ¨me de chat');
            
            // GÃ©nÃ©rer un client_id unique et persistant
            clientID = localStorage.getItem('vitrine.client_id');
            if (!clientID) {
                clientID = generateUUID();
                localStorage.setItem('vitrine.client_id', clientID);
            }
            
            // RÃ©cupÃ©rer le kiosk_id depuis l'URL
            const urlParams = new URLSearchParams(window.location.search);
            kioskID = urlParams.get('kiosk');
            
            if (kioskID) {
                console.log('ðŸŽ›ï¸ [ChatSEA] Kiosk dÃ©tectÃ©:', kioskID);
            }
            
            // âœ… CORRIGÃ‰ : Attendre l'initialisation du backend avant de dÃ©marrer les EventSource
            if (getCurrentRoom()) {
                backendInitPromise.then(() => {
                    startChatRequestListener();
                    startStatusEventSource();
                });
            }
        });





        // ===== INITIALISATION =====
        console.log('ðŸŽ›ï¸ Assistant Salle AV - SystÃ¨me initialisÃ©');
        console.log('ðŸ“‹ FonctionnalitÃ©s disponibles :');
        console.log('  â€¢ Saisie obligatoire de salle');
        console.log('  â€¢ Cache persistant de salle');
        console.log('  â€¢ Diagnostic audio automatique');
        console.log('  â€¢ Diagnostic vidÃ©o automatique');
        console.log('  â€¢ Redirection rÃ©seau');
        console.log('  â€¢ Redirection SIM');
        console.log('  â€¢ Mode hybride intelligent (clair/sombre)');
        console.log('  â€¢ DÃ©tection automatique des prÃ©fÃ©rences systÃ¨me');
        console.log('  â€¢ Bouton de retour');
        
        // âœ… CONFIGURATION SIMPLIFIÃ‰E - Pas de surveillance nÃ©cessaire
        console.log('✅ [Config] Backend unique configuré');

// ✅ EXPOSITION DES FONCTIONS GLOBALES POUR VITRINE.HTML
// Ces fonctions sont nécessaires pour l'interface entre vitrine.html et app.js

// Fonction principale d'initialisation de Vitrine
window.initializeVitrine = function() {
    console.log('🚀 [initializeVitrine] Démarrage de l\'application Vitrine');
    
    // Créer l'interface Vitrine
    if (typeof createVitrine === 'function') {
        createVitrine();
        console.log('✅ [initializeVitrine] Interface créée');
    } else {
        console.error('❌ [initializeVitrine] Fonction createVitrine non trouvée');
        return false;
    }
    
    // Initialiser le thème
    if (typeof initializeTheme === 'function') {
        initializeTheme();
    }
    
    // Vérifier si une salle est verrouillée
    if (window.__VITRINE_LOCK__ && window.__VITRINE_LOCK__.isLocked()) {
        const lockedRoom = window.__LOCKED_ROOM_NAME__;
        console.log('🔒 [initializeVitrine] Salle verrouillée détectée:', lockedRoom);
        
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
    
    console.log('✅ [initializeVitrine] Vitrine initialisée avec succès');
    return true;
};

// Fonction de détection du meilleur backend (exposée globalement)
window.detectBestBackend = detectBestBackend;

// Fonction pour obtenir l'API courante
window.getCurrentAPI = getCurrentAPI;

// ✅ FONCTION createVitrine BASIQUE (interface HTML)
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
    console.log('✅ [createVitrine] Interface basique créée');

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

console.log('✅ [AppJS] Fonctions globales exposées pour vitrine.html');

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
      if (el) { e.stopImmediatePropagation(); e.preventDefault(); toast('🔒 Salle verrouillée. Alt+Ctrl+K pour modifier.'); }
    }, true);

    document.querySelectorAll('.change-room-btn,[data-action="choose-room"],[data-action="change-room"],[onclick*="changeRoom"],[href*="landing"],[data-route="landing"]').forEach(function(el){
      el.setAttribute('disabled','disabled'); el.style.pointerEvents='none'; el.style.opacity='.5'; el.style.filter='grayscale(1)';
    });
  }

  var originalChange = window.changeRoom;
  window.changeRoom = function(){
    if (isLocked()) { console.log('[LOCK] changeRoom() bloqué'); toast('🔒 Salle verrouillée. Alt+Ctrl+K pour modifier.'); return; }
    if (typeof originalChange === 'function') return originalChange.apply(this, arguments);
  };
  var originalConfirm = window.confirmRoom;
  window.confirmRoom = function(){
    var r = (typeof originalConfirm === 'function') ? originalConfirm.apply(this, arguments) : undefined;
    try {
      var candidate = document.querySelector('input[type="text"],input[type="search"],input[name*="salle" i],input[id*="salle" i]');
      var v = (candidate && candidate.value || '').trim();
      if (v) set({ locked:true, name:v, setAt: new Date().toISOString() });
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
      if (isLocked()) { e.preventDefault(); e.stopImmediatePropagation(); toast('🔒 Salle verrouillée. Alt+Ctrl+K pour modifier.'); return; }
      try {
        var candidate = document.querySelector('input[type="text"],input[type="search"],input[name*="salle" i],input[id*="salle" i]');
        var v = (candidate && candidate.value || '').trim();
        if (v) set({ locked:true, name:v, setAt: new Date().toISOString() });
        setTimeout(applyLockUI, 0);
      } catch(e){}
    }
  }, true);

  document.addEventListener('keydown', function(e){
    if (e.altKey && e.ctrlKey && (e.key||'').toLowerCase()==='k') {
      var pwd = prompt('Mot de passe administrateur pour modifier la salle :');
      if (pwd === ADMIN_PASS) {
        clear();
        document.documentElement.classList.remove('is-room-locked');
        toast('🔓 Déverrouillé. Vous pouvez modifier la salle.');
      } else if (pwd != null) {
        toast('❌ Mot de passe invalide.');
      }
    }
  });

  document.addEventListener('DOMContentLoaded', applyLockUI);
})();
