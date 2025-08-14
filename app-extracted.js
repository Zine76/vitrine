// --- begin <script> ---

        // ===== CONFIGURATION =====
        const API_BASE_URL = 'http://localhost:7070';
        let isLoading = false;
        let messageCount = 0;
        let messagesContainer;
        let suggestionsContainer;
        let latestRAGContext = null;
        let isConnected = false;
        const problemInput = document.getElementById('problemInput');
        
        // ===== IMAGE SEA2 =====
        function updateSEALogo(imgElement) {
            if (imgElement) {
                console.log('🖼️ [UpdateSEALogo] Tentative de chargement image SEA pour:', imgElement.id || 'sans ID');
                
                // Essayer d'abord le chemin local
                imgElement.src = 'assets/SEA2.png';
                
                imgElement.onerror = function() {
                    console.log('❌ [UpdateSEALogo] Échec image locale, essai serveur distant');
                    this.src = 'http://132.208.182.76:7070/api/assets/SEA2.png';
                    
                    this.onerror = function() {
                        console.log('❌ [UpdateSEALogo] Échec serveur distant, utilisation fallback');
                        // Fallback vers image directement dans le dossier Annexe
                        this.src = './SEA2.png';
                        
                        this.onerror = function() {
                            console.log('❌ [UpdateSEALogo] Tous les chemins échoués, image vide');
                        };
                    };
                };
                
                imgElement.onload = function() {
                    console.log('✅ [UpdateSEALogo] Image SEA chargée avec succès depuis:', this.src);
                };
            } else {
                console.log('❌ [UpdateSEALogo] Élément image non trouvé');
            }
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
        const landingPage = document.getElementById('landingPage');
        const assistantPage = document.getElementById('assistantPage');
        const roomInput = document.getElementById('roomInput');
        const confirmRoomBtn = document.getElementById('confirmRoomBtn');
        const currentRoomDisplay = document.getElementById('currentRoomDisplay');

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
            roomInput.value = roomName;
            roomInput.focus();
        }

        /**
         * Confirmer la salle et passer à l'assistant
         */
        function confirmRoom() {
            const roomName = roomInput.value.trim();
            
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
            
            // Passer à l'assistant
            showAssistant();
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
                // 🆕 Affichage enrichi avec infos Podio
                currentRoomDisplay.innerHTML = `
                    <strong>${roomName}</strong>
                    <small style="display: block; color: #64748b; font-size: 0.85rem; margin-top: 0.25rem; line-height: 1.3;">
                        📍 ${podioInfo.pavillon} - ${podioInfo.bassin}<br>
                        🏛️ ${podioInfo.type} | 👥 ${podioInfo.capacite}
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

            // Masquer la landing page
            landingPage.style.display = 'none';
            
            // Afficher l'assistant
            assistantPage.style.display = 'block';
            
            // Mettre à jour les affichages de salle avec infos Podio si disponibles
            updateRoomDisplayWithPodio(window.roomCache.room, window.roomCache.podioInfo);
            
            // Initialiser la connexion au backend
            checkConnection().then(connected => {
                console.log(`🔗 Connexion backend: ${connected ? 'OK' : 'ÉCHEC'}`);
            });
            
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
            roomInput.value = '';
            
            // Retour à la landing page
            assistantPage.style.display = 'none';
            landingPage.style.display = 'flex';
            
            // Focus sur l'input de salle
            setTimeout(() => {
                roomInput.focus();
            }, 300);
            
            console.log('🏠 Retour à la landing page (changer de salle)');
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
            problemInput.value = '';
            
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
                const response = await fetch(`${API_BASE_URL}/api/health`);
                isConnected = response.ok;
                return isConnected;
            } catch (error) {
                console.error('Erreur de connexion:', error);
                isConnected = false;
                return false;
            }
        }

        /**
         * Envoie un message d'exemple (comme dans l'original)
         */
        function sendExampleMessage(message) {
            // Gérer les suggestions spéciales
            if (message === 'Nouveau problème AV' || message === 'Nouveau problème') {
                clearInput();
                problemInput.focus();
                return;
            }
            
            if (message === 'Autre problème audio') {
                clearInput();
                addMessage('system', '🔊 Décrivez votre problème audio :', {
                    suggestions: ['Pas de son', 'Microphone en sourdine', 'Bruit parasite', 'Volume trop bas']
                });
                problemInput.focus();
                return;
            }
            
            if (message === 'Autre problème vidéo') {
                clearInput();
                addMessage('system', '📽️ Décrivez votre problème vidéo :', {
                    suggestions: ['Écran noir', 'Pas d\'image', 'Qualité dégradée', 'Projecteur ne s\'allume pas']
                });
                problemInput.focus();
                return;
            }
            
            if (message === 'Vider la barre') {
                clearInput();
                problemInput.focus();
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
                
                problemInput.value = message;
                sendProblemReport();
            } else {
                addMessage('system', '⚠️ Système en cours d\'initialisation. Veuillez patienter.', {
                    suggestions: ['Patienter', 'Recharger la page']
                });
            }
        }

        // ===== FONCTIONS D'ANALYSE DE MESSAGE =====



        // Fonction principale pour envoyer le problème au backend
        async function sendProblemReport() {
            const message = problemInput.value.trim();
            
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
                
                // 🔍 DEBUG : Afficher le message exact envoyé au backend
                console.log(`🎯 [DEBUG] Message envoyé au RAG backend: "${fullMessage}"`);
                
                const response = await fetch(`${API_BASE_URL}/api/copilot/vitrine`, {
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
                    problemInput.value = '';
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
                
            } finally {
                // Réactiver le bouton
                updateSendButton(false);
                
                // CORRECTION : Ne pas faire de retour automatique pour éviter les interruptions
                // L'utilisateur doit choisir explicitement de créer un ticket
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
                
                const response = await fetch(`${API_BASE_URL}/api/room/equipment?room=${encodeURIComponent(room)}`, {
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
                const response = await fetch(`${API_BASE_URL}/api/copilot/vitrine`, {
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
                        <img id="si-logo" src="assets/SI.png" alt="Services Informatiques UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
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
                        <img id="sim-logo" src="assets/SIM.png" alt="Service des Immeubles UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
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
                    const response = await fetch(`${API_BASE_URL}/api/room/equipment?room=${encodeURIComponent(roomName)}&refresh=true`);
                    
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
                    
                    // ✅ MASQUER LA BANNIÈRE D'ATTENTE car projecteur déjà opérationnel
                    console.log(`🎯 [AVMuteCheck] Projecteur opérationnel - Masquer bannière d'attente`);
                    hideWaitingBanner();
                    
                    // ✅ AFFICHER BANNIÈRE SUCCÈS APRÈS masquage bannière d'attente
                    setTimeout(() => {
                        showAutoActionResult(
                            { 
                                type: 'projector_operational', 
                                description: 'Projecteur opérationnel' 
                            }, 
                            { 
                                success: true, 
                                message: `Projecteur ${projectorName} déjà opérationnel - Aucune action nécessaire !` 
                            }
                        );
                    }, 500);
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
                
                // ✅ MASQUER LA BANNIÈRE D'ATTENTE après un délai minimum
                const bannerStartTime = window.waitingBannerStartTime || Date.now();
                const elapsedTime = Date.now() - bannerStartTime;
                const remainingTime = Math.max(0, 5000 - elapsedTime); // Minimum 5 secondes
                
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
            document.getElementById(`btn-oui-${bannerId}`).addEventListener('click', () => {
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
            
            // ✅ GESTION CLIC BOUTON NON
            document.getElementById(`btn-non-${bannerId}`).addEventListener('click', () => {
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
                                                        // Déclencher l'escalade car équipement fonctionne mais problème persiste
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
                
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${API_BASE_URL}/api/copilot/chat`, {
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
                const currentRoom = getCurrentRoom();
                const response = await fetch(`${API_BASE_URL}/api/copilot/chat`, {
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
                        <img id="sea-logo-${escalationId}" src="assets/SEA2.png" alt="Service Expert Audiovisuel UQAM" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="sea-fallback-content" style="display: none; color: black !important; text-align: center; padding: 1rem;">
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
            
            // Ajouter l'overlay et la bannière au body
            document.body.appendChild(overlayDiv);
            overlayDiv.appendChild(escalationDiv);
        }

        /**
         * Ferme la bannière SEA
         */
        function closeSEAEscalationBanner(escalationId) {
            const overlayDiv = document.getElementById(`overlay_${escalationId}`);
            if (overlayDiv) {
                overlayDiv.remove();
            }
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

                // Appeler l'API pour créer le ticket
                const response = await fetch(`${API_BASE_URL}/api/copilot/vitrine-create-ticket`, {
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
        function closeModal() {
            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.remove('active');
            
            // Retour automatique à l'accueil après un délai
            setTimeout(() => {
                returnToHome();
            }, 300);
        }



        // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

        // Fermer la modale en cliquant sur l'overlay
        document.getElementById('modalOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

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
            setTimeout(async () => {
                const escalationImgs = messageDiv.querySelectorAll('.sea-escalation-image');
                for (const img of escalationImgs) {
                    if (img && img.id && img.id.includes('sea-logo-escalation')) {
                        await updateSEALogo(img);
                    }
                }
            }, 100);

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
                    console.log(`🌐 [PodioCache] API call pour salle: ${roomName}`);
                    
                    // 🐍 Appel API Podio PRIORITAIRE avec fallback NeonDB si échec
                    const response = await fetch(
                        `${API_BASE_URL}/api/podio/public-room-info?room=${encodeURIComponent(roomName)}`,
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
                            `${API_BASE_URL}/api/room/equipment?room=${encodeURIComponent(roomName)}`,
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

        // Retour à l'accueil (page des palettes) - PAS la landing page
        function returnToHome() {
            // S'assurer que la page des palettes est visible
            document.getElementById('assistantPage').style.display = 'block';
            document.getElementById('landingPage').style.display = 'none';
            
            // Vider les messages
            const assistantPage = document.getElementById('assistantPage');
            const existingMessages = assistantPage.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
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
            
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                document.getElementById('themeIcon').className = 'fas fa-sun';
                document.getElementById('themeText').textContent = 'Mode jour';
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
        console.log('  • Mode sombre');
        console.log('  • Bouton de retour');
        
// --- end <script> ---


// === Patch: persistence nomSalle ===
(function(){
  if (typeof setRoom === 'function') {
    const __origSetRoom = setRoom;
    window.setRoom = function(room){
      if(!room) return;
      try{ localStorage.setItem('nomSalle', room); }catch(e){}
      return __origSetRoom.call(this, room);
    };
  }
})();


// === Auto-restore salle au chargement ===
document.addEventListener('DOMContentLoaded', function(){
  try{
    var savedRoom = localStorage.getItem('nomSalle');
    if(savedRoom){ setRoom(savedRoom); }
  }catch(e){}
});


// === Secret admin reset (Alt + * then S) ===
(function(){
  var ADMIN_CODE = 'adminsav';
  var lastStarTs = 0;
  var STAR_WINDOW_MS = 2000; // délai max entre * et S

  function ensureOverlayStyles() {
    if (document.getElementById('admin-reset-styles')) return;
    var st = document.createElement('style');
    st.id = 'admin-reset-styles';
    st.textContent = [
      '.admin-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.45);z-index:9999;}',
      '.admin-modal{background:#fff;max-width:480px;width:92%;border-radius:14px;',
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

  function showAdminPrompt() {
    ensureOverlayStyles();
    var ov = document.createElement('div');
    ov.className = 'admin-overlay';
    ov.innerHTML = ''
      + '<div class="admin-modal">'
      + '  <h3 class="admin-title">Accès administrateur</h3>'
      + '  <p class="admin-sub">Entrez le mot de passe pour réinitialiser la salle sur ce poste.</p>'
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

    function close() { ov.remove(); }
    function submit() {
      var v = input.value || '';
      if (v === ADMIN_CODE) {
        try { localStorage.removeItem('nomSalle'); } catch(e) {}
        // On recharge pour revenir à l'état initial (saisie salle)
        location.reload();
      } else {
        err.style.display = 'block';
        input.select();
        input.focus();
      }
    }

    cancel.addEventListener('click', close);
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') close();
    });

    // Fermer en cliquant hors du modal
    ov.addEventListener('click', function(e){
      if (e.target === ov) close();
    });

    setTimeout(function(){ input.focus(); }, 50);
  }

  // Détection Alt + * puis S (sous 2s)
  document.addEventListener('keydown', function(e){
    // Étape 1 : Alt + * (souvent Shift+8)
    var isStar = (e.key === '*') || (e.key === '8' && e.shiftKey);
    if (e.altKey && isStar) {
      lastStarTs = Date.now();
      return;
    }
    // Étape 2 : S après Alt+*
    if ((e.key === 's' || e.key === 'S') && (Date.now() - lastStarTs <= STAR_WINDOW_MS)) {
      e.preventDefault();
      e.stopPropagation();
      showAdminPrompt();
      lastStarTs = 0;
    }
  }, true);
})();
