/* ===== VITRINE SAVQONNECT - LOGIQUE JAVASCRIPT PURE ===== */
/* FICHIER GITHUB - AUCUNE URL BACKEND - NEUTRALITE RESEAU */
/* Version: 3.9 CAL PODIO ALFA - GitHub Edition */

// ===== VARIABLES GLOBALES =====
let API_BASE_URL = ''; // Défini par vitrine.html
let FALLBACK_DNS_URL = ''; // Défini par vitrine.html
let currentAPI = ''; // Défini par vitrine.html
let currentChatId = null;
let eventSource = null;
let isEventSourceConnected = false;
let eventSourceReconnectCount = 0;
let maxEventSourceReconnects = 5;
let roomLockState = null;
let heartbeatInterval = null;
let lastHeartbeat = 0;

// ===== UTILITAIRES DE BASE =====
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [Vitrine]`;
    
    switch (type) {
        case 'error':
            console.error(`❌ ${prefix}`, message);
            break;
        case 'warn':
            console.warn(`⚠️  ${prefix}`, message);
            break;
        case 'success':
            console.log(`✅ ${prefix}`, message);
            break;
        default:
            console.log(`ℹ️  ${prefix}`, message);
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    // Créer l'élément notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Supprimer après la durée spécifiée
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warn': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// ===== GESTION DES SALLES =====
function getCurrentRoom() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get('room');
        
        if (roomFromUrl) {
            return roomFromUrl;
        }
        
        // Vérifier le verrouillage
        if (window.__VITRINE_LOCK__ && window.__VITRINE_LOCK__.isLocked()) {
            const lockState = window.__VITRINE_LOCK__.get();
            return lockState.name;
        }
        
        return localStorage.getItem('selectedRoom') || '';
    } catch (error) {
        log('Erreur lors de la récupération de la salle courante: ' + error.message, 'error');
        return '';
    }
}

function lockRoom(roomName) {
    try {
        if (!roomName) {
            log('Nom de salle requis pour le verrouillage', 'error');
            return false;
        }
        
        const lockData = {
            locked: true,
            name: roomName,
            timestamp: Date.now()
        };
        
        if (window.__VITRINE_LOCK__) {
            window.__VITRINE_LOCK__.set(lockData);
            document.documentElement.classList.add('is-room-locked');
            window.__LOCKED_ROOM_NAME__ = roomName;
            
            log(`Salle verrouillée: ${roomName}`, 'success');
            showNotification(`Salle verrouillée sur: ${roomName}`, 'success');
            
            // Mettre à jour l'interface
            updateUIForLockedRoom(roomName);
            return true;
        }
        
        log('Système de verrouillage non disponible', 'error');
        return false;
    } catch (error) {
        log('Erreur lors du verrouillage: ' + error.message, 'error');
        return false;
    }
}

function unlockRoom() {
    try {
        if (window.__VITRINE_LOCK__) {
            window.__VITRINE_LOCK__.clear();
            document.documentElement.classList.remove('is-room-locked');
            delete window.__LOCKED_ROOM_NAME__;
            
            log('Salle déverrouillée', 'success');
            showNotification('Salle déverrouillée', 'success');
            
            // Réinitialiser l'interface
            updateUIForUnlockedRoom();
            return true;
        }
        
        return false;
    } catch (error) {
        log('Erreur lors du déverrouillage: ' + error.message, 'error');
        return false;
    }
}

function updateUIForLockedRoom(roomName) {
    // Masquer les éléments de navigation
    const landingElements = document.querySelectorAll('#landing, .landing, [data-route="landing"]');
    landingElements.forEach(el => {
        el.style.display = 'none';
    });
    
    // Afficher les informations de la salle verrouillée
    const roomInfo = document.getElementById('current-room-info');
    if (roomInfo) {
        roomInfo.textContent = roomName;
        roomInfo.style.display = 'block';
    }
    
    // Désactiver les boutons de changement de salle
    const changeRoomBtns = document.querySelectorAll('.change-room-btn, [data-action="change-room"]');
    changeRoomBtns.forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
        btn.style.filter = 'grayscale(1)';
    });
}

function updateUIForUnlockedRoom() {
    // Réafficher les éléments de navigation
    const landingElements = document.querySelectorAll('#landing, .landing, [data-route="landing"]');
    landingElements.forEach(el => {
        el.style.display = '';
    });
    
    // Réactiver les boutons de changement de salle
    const changeRoomBtns = document.querySelectorAll('.change-room-btn, [data-action="change-room"]');
    changeRoomBtns.forEach(btn => {
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        btn.style.filter = '';
    });
}

// ===== GESTION DES CONNEXIONS SERVER-SENT EVENTS =====
function connectEventSource() {
    try {
        if (eventSource) {
            eventSource.close();
        }
        
        const room = getCurrentRoom();
        if (!room) {
            log('Aucune salle sélectionnée pour la connexion SSE', 'warn');
            return;
        }
        
        const sseUrl = `${currentAPI}/api/events?room_id=${encodeURIComponent(room)}`;
        log(`Connexion SSE: ${sseUrl}`);
        
        eventSource = new EventSource(sseUrl);
        
        eventSource.onopen = function() {
            isEventSourceConnected = true;
            eventSourceReconnectCount = 0;
            log('Connexion SSE établie', 'success');
            showNotification('Connexion temps réel établie', 'success', 3000);
        };
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleSSEMessage(data);
            } catch (error) {
                log('Erreur parsing message SSE: ' + error.message, 'error');
            }
        };
        
        eventSource.onerror = function() {
            isEventSourceConnected = false;
            log('Erreur connexion SSE', 'error');
            
            if (eventSourceReconnectCount < maxEventSourceReconnects) {
                eventSourceReconnectCount++;
                log(`Tentative de reconnexion SSE ${eventSourceReconnectCount}/${maxEventSourceReconnects}`, 'warn');
                
                setTimeout(() => {
                    connectEventSource();
                }, 2000 * eventSourceReconnectCount);
            } else {
                log('Nombre maximum de reconnexions SSE atteint', 'error');
                showNotification('Connexion temps réel interrompue', 'error');
            }
        };
        
    } catch (error) {
        log('Erreur lors de la connexion SSE: ' + error.message, 'error');
    }
}

function handleSSEMessage(data) {
    try {
        log(`Message SSE reçu: ${data.type}`, 'info');
        
        switch (data.type) {
            case 'chat_initiated':
                handleChatInitiated(data);
                break;
            case 'chat_message':
                handleChatMessage(data);
                break;
            case 'chat_ended':
                handleChatEnded(data);
                break;
            case 'heartbeat':
                handleHeartbeat(data);
                break;
            default:
                log(`Type de message SSE non géré: ${data.type}`, 'warn');
        }
    } catch (error) {
        log('Erreur lors du traitement du message SSE: ' + error.message, 'error');
    }
}

function handleChatInitiated(data) {
    try {
        log(`Chat initié: ${data.channel_id}`, 'success');
        currentChatId = data.channel_id;
        
        // Afficher la bannière de chat
        showChatBanner(data);
        
    } catch (error) {
        log('Erreur lors de la gestion du chat initié: ' + error.message, 'error');
    }
}

function handleChatMessage(data) {
    try {
        log(`Message chat reçu de ${data.sender}: ${data.message}`);
        
        // Ajouter le message à l'interface de chat
        addMessageToChat(data);
        
    } catch (error) {
        log('Erreur lors de la gestion du message chat: ' + error.message, 'error');
    }
}

function handleChatEnded(data) {
    try {
        log(`Chat terminé: ${data.channel_id}`, 'info');
        
        if (currentChatId === data.channel_id) {
            currentChatId = null;
            hideChatBanner();
        }
        
    } catch (error) {
        log('Erreur lors de la gestion de la fin du chat: ' + error.message, 'error');
    }
}

function handleHeartbeat(data) {
    lastHeartbeat = Date.now();
    // Log silencieux pour le heartbeat
}

// ===== GESTION DU CHAT =====
function showChatBanner(chatData) {
    try {
        const banner = document.getElementById('consentBanner');
        if (!banner) {
            log('Bannière de chat non trouvée', 'error');
            return;
        }
        
        // Mettre à jour le contenu de la bannière
        const titleElement = banner.querySelector('h3');
        const messageElement = banner.querySelector('p');
        
        if (titleElement) {
            titleElement.innerHTML = `
                <i class="fas fa-comments"></i>
                Chat SEA disponible
            `;
        }
        
        if (messageElement) {
            messageElement.textContent = chatData.message || 'Un technicien SEA souhaite discuter avec vous.';
        }
        
        // Afficher la bannière
        banner.style.display = 'block';
        banner.classList.add('chat-active');
        
        log('Bannière de chat affichée', 'success');
        showNotification('Nouveau chat disponible!', 'info');
        
    } catch (error) {
        log('Erreur lors de l\'affichage de la bannière de chat: ' + error.message, 'error');
    }
}

function hideChatBanner() {
    try {
        const banner = document.getElementById('consentBanner');
        if (banner) {
            banner.style.display = 'none';
            banner.classList.remove('chat-active');
            log('Bannière de chat masquée', 'info');
        }
    } catch (error) {
        log('Erreur lors du masquage de la bannière de chat: ' + error.message, 'error');
    }
}

function acceptChat() {
    try {
        if (!currentChatId) {
            log('Aucun chat actif à accepter', 'error');
            return;
        }
        
        const room = getCurrentRoom();
        if (!room) {
            log('Aucune salle sélectionnée', 'error');
            return;
        }
        
        // Envoyer la confirmation d'acceptation
        fetch(`${currentAPI}/api/chat/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: currentChatId,
                room_id: room,
                accepted_by: 'vitrine'
            })
        })
        .then(response => {
            if (response.ok) {
                log('Chat accepté', 'success');
                showNotification('Chat accepté - Connexion établie', 'success');
                
                // Ouvrir l'interface de chat complète
                openChatInterface();
            } else {
                throw new Error(`Erreur ${response.status}`);
            }
        })
        .catch(error => {
            log('Erreur lors de l\'acceptation du chat: ' + error.message, 'error');
            showNotification('Erreur lors de l\'acceptation du chat', 'error');
        });
        
    } catch (error) {
        log('Erreur lors de l\'acceptation du chat: ' + error.message, 'error');
    }
}

function closeChat() {
    try {
        if (!currentChatId) {
            log('Aucun chat actif à fermer', 'error');
            return;
        }
        
        const room = getCurrentRoom();
        
        // Envoyer la demande de fermeture
        fetch(`${currentAPI}/api/tickets/chat/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: currentChatId,
                room_id: room,
                ended_by: 'vitrine'
            })
        })
        .then(response => {
            if (response.ok) {
                log('Chat fermé', 'success');
                currentChatId = null;
                hideChatBanner();
                closeChatInterface();
            } else {
                throw new Error(`Erreur ${response.status}`);
            }
        })
        .catch(error => {
            log('Erreur lors de la fermeture du chat: ' + error.message, 'error');
        });
        
    } catch (error) {
        log('Erreur lors de la fermeture du chat: ' + error.message, 'error');
    }
}

function openChatInterface() {
    // Afficher l'interface de chat complète
    const chatInterface = document.getElementById('chatInterface');
    if (chatInterface) {
        chatInterface.style.display = 'block';
        chatInterface.classList.add('active');
    }
}

function closeChatInterface() {
    // Masquer l'interface de chat
    const chatInterface = document.getElementById('chatInterface');
    if (chatInterface) {
        chatInterface.style.display = 'none';
        chatInterface.classList.remove('active');
    }
}

function addMessageToChat(messageData) {
    try {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            log('Zone des messages de chat non trouvée', 'error');
            return;
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.sender === 'vitrine' ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <span class="message-text">${messageData.message}</span>
                <span class="message-time">${new Date(messageData.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Faire défiler vers le bas
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        log('Erreur lors de l\'ajout du message au chat: ' + error.message, 'error');
    }
}

// ===== GESTION DES TICKETS =====
function createTicket(problemType, description, severity = 'normal') {
    try {
        const room = getCurrentRoom();
        if (!room) {
            log('Aucune salle sélectionnée pour créer un ticket', 'error');
            showNotification('Veuillez sélectionner une salle', 'error');
            return;
        }
        
        const ticketData = {
            room_id: room,
            problem_type: problemType,
            description: description,
            severity: severity,
            created_by: 'vitrine',
            timestamp: new Date().toISOString()
        };
        
        log(`Création ticket: ${problemType} pour ${room}`);
        showNotification('Création du ticket en cours...', 'info', 2000);
        
        fetch(`${currentAPI}/api/tickets/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`Erreur ${response.status}`);
            }
        })
        .then(data => {
            log(`Ticket créé: ID ${data.ticket_id}`, 'success');
            showNotification('Ticket créé avec succès!', 'success');
            
            // Optionnel: rediriger ou actualiser l'interface
            if (data.ticket_id) {
                // Mettre à jour l'interface avec les détails du ticket
                updateTicketInterface(data);
            }
        })
        .catch(error => {
            log('Erreur lors de la création du ticket: ' + error.message, 'error');
            showNotification('Erreur lors de la création du ticket', 'error');
        });
        
    } catch (error) {
        log('Erreur lors de la création du ticket: ' + error.message, 'error');
    }
}

function updateTicketInterface(ticketData) {
    // Mettre à jour l'interface avec les informations du ticket
    const ticketInfo = document.getElementById('ticketInfo');
    if (ticketInfo) {
        ticketInfo.innerHTML = `
            <div class="ticket-created">
                <h3><i class="fas fa-ticket-alt"></i> Ticket créé</h3>
                <p><strong>ID:</strong> ${ticketData.ticket_id}</p>
                <p><strong>Salle:</strong> ${ticketData.room_id}</p>
                <p><strong>Problème:</strong> ${ticketData.problem_type}</p>
                <p><strong>Statut:</strong> ${ticketData.status || 'Ouvert'}</p>
            </div>
        `;
        ticketInfo.style.display = 'block';
    }
}

// ===== GESTION DE LA CONNECTIVITÉ =====
function detectBestBackend() {
    // Cette fonction sera appelée depuis vitrine.html avec les URLs configurées
    return Promise.resolve(API_BASE_URL);
}

function startHeartbeat() {
    // Démarrer le heartbeat pour maintenir la connexion
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(() => {
        if (currentAPI) {
            fetch(`${currentAPI}/api/health`)
                .then(response => {
                    if (response.ok) {
                        lastHeartbeat = Date.now();
                    }
                })
                .catch(error => {
                    log('Heartbeat failed: ' + error.message, 'warn');
                });
        }
    }, 30000); // Toutes les 30 secondes
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// ===== CRÉATION DE L'INTERFACE =====
function createVitrine() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        log('Container app non trouvé', 'error');
        return;
    }

    appContainer.innerHTML = `
<!-- Container principal -->
<div class="main-container">

<!-- Header (comme l'original) -->
<div class="header">
    <div class="header-top">
        <button class="technical-btn" onclick="openTechnicalMode()">
            <i class="fas fa-cog"></i>
            <span>Technique</span>
        </button>
        <button aria-label="Basculer le mode sombre" class="theme-toggle" onclick="toggleTheme()">
            <i class="fas fa-moon" id="themeIcon"></i>
            <span id="themeText">Mode nuit</span>
        </button>
    </div>
    <div class="title-section" style="display: flex; align-items: center; justify-content: flex-start; gap: 2rem;">
        <img alt="Vitrine" src="https://zine76.github.io/vitrine/assets/Vitrine.png" style="height: 80px; max-width: 300px; object-fit: contain;"/>
        <p id="headerTitle" style="margin: 0; font-size: 1.1rem; font-weight: 600; color: black !important; -webkit-text-fill-color: black !important;">Diagnostic interactif et assistance audiovisuelle</p>
    </div>
    <div class="status-indicator">
        <div class="status-dot" id="connection-indicator"></div>
        <span id="connection-text">Système opérationnel</span>
    </div>
</div>

<!-- Zone de contenu principal -->
<main class="main-content" id="mainContent">
    
    <!-- Page d'accueil / Sélection de salle -->
    <div id="landing" class="landing-page">
        <div class="welcome-section">
            <img src="https://zine76.github.io/vitrine/assets/Vitrine.png" alt="Vitrine" class="welcome-logo">
            <h2>Bienvenue sur la Vitrine SavQonnect</h2>
            <p>Sélectionnez votre salle pour commencer</p>
        </div>
        
        <div class="room-selection">
            <h3>Choisir une salle :</h3>
            <div class="room-grid">
                <button class="room-card" onclick="selectRoom('A-2420')">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>A-2420</span>
                </button>
                <button class="room-card" onclick="selectRoom('A-2425')">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>A-2425</span>
                </button>
                <button class="room-card" onclick="selectRoom('A-2430')">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>A-2430</span>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Interface principale -->
    <div id="vitrineInterface" class="vitrine-interface" style="display: none;">
        
        <!-- Section des problèmes techniques -->
        <div class="problems-section">
            <h3><i class="fas fa-exclamation-triangle"></i> Signaler un problème</h3>
            
            <div class="problem-grid">
                <button class="problem-card" onclick="reportProblem('projecteur')">
                    <i class="fas fa-video"></i>
                    <span>Problème Projecteur</span>
                </button>
                
                <button class="problem-card" onclick="reportProblem('audio')">
                    <i class="fas fa-volume-up"></i>
                    <span>Problème Audio</span>
                </button>
                
                <button class="problem-card" onclick="reportProblem('reseau')">
                    <i class="fas fa-wifi"></i>
                    <span>Problème Réseau</span>
                </button>
                
                <button class="problem-card" onclick="reportProblem('ordinateur')">
                    <i class="fas fa-desktop"></i>
                    <span>Problème Ordinateur</span>
                </button>
                
                <button class="problem-card" onclick="reportProblem('autre')">
                    <i class="fas fa-question-circle"></i>
                    <span>Autre Problème</span>
                </button>
            </div>
        </div>
        
        <!-- Section des actions rapides -->
        <div class="actions-section">
            <h3><i class="fas fa-bolt"></i> Actions Rapides</h3>
            
            <div class="action-grid">
                <button class="action-card" onclick="requestHelp()">
                    <i class="fas fa-hands-helping"></i>
                    <span>Demander de l'aide</span>
                </button>
                
                <button class="action-card" onclick="checkStatus()">
                    <i class="fas fa-chart-line"></i>
                    <span>État de la salle</span>
                </button>
                
                <button class="action-card" onclick="emergencyContact()">
                    <i class="fas fa-phone"></i>
                    <span>Contact d'urgence</span>
                </button>
            </div>
        </div>
        
        <!-- Informations sur les tickets -->
        <div id="ticketInfo" class="ticket-info" style="display: none;">
            <!-- Contenu dynamique des tickets -->
        </div>
        
        <!-- Section Copilot (comme l'original) -->
        <div id="copilotSuggestions" class="copilot-suggestions" style="display: none;">
            <h3><i class="fas fa-robot"></i> Suggestions automatiques</h3>
            <!-- Contenu dynamique -->
        </div>
        
        <!-- Palettes de problèmes (comme l'original) -->
        <div id="problemPalettes" class="problem-palettes" style="display: none;">
            <!-- Contenu dynamique -->
        </div>
        
        <!-- Zone de saisie libre (comme l'original) -->
        <div class="problem-input-section">
            <h3><i class="fas fa-edit"></i> Décrire un problème</h3>
            <div class="input-group">
                <textarea id="problemInput" placeholder="Décrivez votre problème en détail..." rows="4"></textarea>
                <button onclick="sendProblemReport()" class="submit-btn">
                    <i class="fas fa-paper-plane"></i>
                    Envoyer
                </button>
            </div>
        </div>
        
    </div>
</main>

<!-- Bannière de chat -->
<div class="chat-banner" id="consentBanner" style="display: none;">
    <div class="banner-content">
        <h3>
            <i class="fas fa-comments"></i>
            Chat SEA disponible
        </h3>
        <p>Un technicien SEA souhaite discuter avec vous concernant votre demande.</p>
        
        <div class="banner-actions">
            <button class="banner-btn accept" onclick="acceptChat()">
                <i class="fas fa-check"></i>
                Accepter
            </button>
            <button class="banner-btn decline" onclick="closeChat()">
                <i class="fas fa-times"></i>
                Refuser
            </button>
        </div>
    </div>
</div>

<!-- Interface de chat -->
<div class="chat-interface" id="chatInterface" style="display: none;">
    <div class="chat-header">
        <h4><i class="fas fa-comments"></i> Chat avec le SEA</h4>
        <button class="chat-close-btn" onclick="closeChat()">
            <i class="fas fa-times"></i>
        </button>
    </div>
    
    <div class="chat-messages" id="chatMessages">
        <!-- Messages dynamiques -->
    </div>
    
    <div class="chat-input-section">
        <input type="text" id="chatInput" placeholder="Tapez votre message..." onkeypress="handleChatKeyPress(event)">
        <button class="chat-send-btn" onclick="sendChatMessage()">
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
</div>

<!-- Chat Timeout Banner -->
<div class="chat-timeout-banner" id="chatTimeoutBanner" style="display: none;">
    <h3>
        <i class="fas fa-clock"></i>
        Demande de chat expirée
    </h3>
    <p>Le technicien SEA était disponible pour discuter de votre problème, mais le délai de réponse a expiré.</p>
    <p><strong>Souhaitez-vous initier une conversation avec le technicien ?</strong></p>
    
    <div class="timeout-actions">
        <button class="timeout-btn initiate" onclick="initiateClientChat()">
            <i class="fas fa-comments"></i>
            Contacter le SEA
        </button>
        <button class="timeout-btn close" onclick="closeTimeoutBanner()">
            <i class="fas fa-times"></i>
            Fermer
        </button>
    </div>
</div>

</div> <!-- Fin main-container -->
    `;
    
    log('Interface Vitrine créée', 'success');
}

// ===== FONCTIONS D'INTERFACE =====
function selectRoom(roomName) {
    try {
        log('Sélection salle: ' + roomName, 'info');
        
        localStorage.setItem('selectedRoom', roomName);
        
        if (lockRoom(roomName)) {
            document.getElementById('landing').style.display = 'none';
            document.getElementById('vitrineInterface').style.display = 'block';
            
            updateRoomDisplay(roomName);
            connectEventSource();
            
            log('Interface configurée pour: ' + roomName, 'success');
        }
    } catch (error) {
        log('Erreur sélection salle: ' + error.message, 'error');
    }
}

function updateRoomDisplay(roomName) {
    const roomInfo = document.getElementById('current-room-info');
    if (roomInfo) {
        roomInfo.textContent = roomName;
    }
}

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-indicator');
    const text = document.getElementById('connection-text');
    
    if (indicator && text) {
        if (connected) {
            indicator.className = 'fas fa-circle connection-online';
            text.textContent = 'En ligne';
        } else {
            indicator.className = 'fas fa-circle connection-offline';
            text.textContent = 'Hors ligne';
        }
    }
}

function reportProblem(problemType) {
    const descriptions = {
        'projecteur': 'Problème avec le projecteur de la salle',
        'audio': 'Problème avec le système audio de la salle',
        'reseau': 'Problème de connexion réseau',
        'ordinateur': 'Problème avec l\'ordinateur de la salle',
        'autre': 'Autre problème technique'
    };
    
    const description = descriptions[problemType] || 'Problème technique non spécifié';
    createTicket(problemType, description, 'normal');
}

function requestHelp() {
    createTicket('aide', 'Demande d\'assistance générale', 'normal');
}

function checkStatus() {
    const room = getCurrentRoom();
    if (room) {
        log('Vérification état salle: ' + room, 'info');
        fetch(`${currentAPI}/api/rooms/${encodeURIComponent(room)}/status`)
            .then(response => response.json())
            .then(data => {
                log('État reçu: ' + JSON.stringify(data), 'info');
            })
            .catch(error => {
                log('Erreur vérification état: ' + error.message, 'error');
            });
    }
}

function emergencyContact() {
    alert('Contact d\'urgence SEA: poste 7777\nEmail: sea@uqam.ca');
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message && currentChatId) {
        fetch(`${currentAPI}/api/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: currentChatId,
                message: message,
                sender: 'vitrine'
            })
        })
        .then(response => {
            if (response.ok) {
                addMessageToChat({
                    message: message,
                    sender: 'vitrine',
                    timestamp: new Date().toISOString()
                });
                
                input.value = '';
            }
        })
        .catch(error => {
            log('Erreur envoi message chat: ' + error.message, 'error');
        });
    }
}

function initiateClientChat() {
    const room = getCurrentRoom();
    if (room) {
        createTicket('chat_request', 'Demande de chat initié par la vitrine', 'normal');
        closeTimeoutBanner();
    }
}

function closeTimeoutBanner() {
    const banner = document.getElementById('chatTimeoutBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

// ===== INITIALISATION =====
function initializeVitrine() {
    try {
        log('Initialisation de Vitrine...', 'info');
        
        // Créer l'interface
        createVitrine();
        
        // Vérifier l'état de verrouillage au démarrage
        if (window.__VITRINE_LOCK__ && window.__VITRINE_LOCK__.isLocked()) {
            const lockState = window.__VITRINE_LOCK__.get();
            log(`Salle verrouillée détectée: ${lockState.name}`, 'info');
            updateUIForLockedRoom(lockState.name);
        }
        
        // Démarrer le heartbeat
        startHeartbeat();
        
        log('Vitrine initialisée avec succès', 'success');
        
    } catch (error) {
        log('Erreur lors de l\'initialisation: ' + error.message, 'error');
    }
}

// ===== GESTION DES ÉVÉNEMENTS GLOBAUX =====
function setupGlobalEventHandlers() {
    // Gestion des erreurs globales
    window.addEventListener('error', function(event) {
        log(`Erreur JavaScript: ${event.error?.message || event.message}`, 'error');
    });
    
    // Gestion des erreurs de ressources
    window.addEventListener('unhandledrejection', function(event) {
        log(`Promise rejetée: ${event.reason}`, 'error');
    });
    
    // Gestion de la visibilité de la page
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            log('Page masquée - pause des connexions', 'info');
            if (eventSource) {
                eventSource.close();
                isEventSourceConnected = false;
            }
        } else {
            log('Page visible - reprise des connexions', 'info');
            if (currentAPI && getCurrentRoom()) {
                connectEventSource();
            }
        }
    });
}

// ===== FONCTIONNALITÉS MANQUANTES DE L'ORIGINAL =====

// Mode technique (comme dans l'original)
function openTechnicalMode() {
    log('Ouverture mode technique', 'info');
    // Pour l'instant, mode simplifié
    alert('Mode technique disponible prochainement');
}

// Thème clair/sombre (comme dans l'original)
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
    log('Thème basculé: ' + (isDark ? 'sombre' : 'clair'), 'info');
}

// Création de ticket directe (comme dans l'original)
async function createTicketDirect(escalationId, problemType) {
    try {
        const room = getCurrentRoom();
        if (!room) {
            log('Aucune salle pour créer un ticket direct', 'error');
            return;
        }

        const ticketData = {
            room_id: room,
            problem_type: problemType,
            escalation_id: escalationId,
            description: `Problème ${problemType} signalé depuis la vitrine`,
            severity: 'normal',
            created_by: 'vitrine',
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${currentAPI}/api/tickets/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });

        if (response.ok) {
            const data = await response.json();
            log(`Ticket direct créé: ${data.ticket_id}`, 'success');
            showNotification('Ticket créé avec succès!', 'success');
            return data;
        } else {
            throw new Error(`Erreur ${response.status}`);
        }
    } catch (error) {
        log('Erreur création ticket direct: ' + error.message, 'error');
        showNotification('Erreur lors de la création du ticket', 'error');
    }
}

// Envoi rapport de problème (comme dans l'original)
async function sendProblemReport() {
    try {
        const room = getCurrentRoom();
        const problemText = document.getElementById('problemInput')?.value || '';
        
        if (!problemText.trim()) {
            showNotification('Veuillez décrire le problème', 'warn');
            return;
        }

        const response = await fetch(`${currentAPI}/api/copilot/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: problemText,
                room: room,
                context: { source: 'vitrine_manual_report' }
            })
        });

        if (response.ok) {
            const data = await response.json();
            log('Rapport de problème envoyé', 'success');
            showNotification('Problème signalé au système', 'success');
            processResponse(data);
        } else {
            throw new Error(`Erreur ${response.status}`);
        }
    } catch (error) {
        log('Erreur envoi rapport: ' + error.message, 'error');
        showNotification('Erreur lors de l\'envoi du rapport', 'error');
    }
}

// Traitement des réponses Copilot (comme dans l'original)
function processResponse(data) {
    try {
        if (data.suggestions && data.suggestions.length > 0) {
            log('Suggestions reçues du Copilot', 'info');
            showCopilotSuggestions(data.suggestions);
        }
        
        if (data.escalation) {
            log('Escalade recommandée', 'warn');
            showEscalationBanner(data.escalation);
        }
    } catch (error) {
        log('Erreur traitement réponse: ' + error.message, 'error');
    }
}

// Affichage suggestions Copilot
function showCopilotSuggestions(suggestions) {
    const container = document.getElementById('copilotSuggestions');
    if (!container) {
        log('Container suggestions non trouvé', 'warn');
        return;
    }

    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-card">
            <h4>${suggestion.title}</h4>
            <p>${suggestion.description}</p>
            <button onclick="applySuggestion('${suggestion.id}')" class="suggestion-btn">
                Appliquer
            </button>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Application d'une suggestion
function applySuggestion(suggestionId) {
    log(`Application suggestion: ${suggestionId}`, 'info');
    showNotification('Suggestion appliquée', 'success');
}

// Bannière d'escalade
function showEscalationBanner(escalationData) {
    const banner = document.createElement('div');
    banner.className = 'escalation-banner';
    banner.innerHTML = `
        <div class="escalation-content">
            <h3><i class="fas fa-exclamation-triangle"></i> ${escalationData.title}</h3>
            <p>${escalationData.message}</p>
            <div class="escalation-actions">
                <button onclick="createTicketDirect('${escalationData.id}', '${escalationData.type}')" class="escalation-btn primary">
                    Créer un ticket
                </button>
                <button onclick="dismissEscalation('${escalationData.id}')" class="escalation-btn secondary">
                    Ignorer
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 100);
}

// Fermeture escalade
function dismissEscalation(escalationId) {
    const banner = document.querySelector('.escalation-banner');
    if (banner) {
        banner.remove();
    }
    log(`Escalade ${escalationId} ignorée`, 'info');
}

// Gestion des palettes de problèmes (comme dans l'original)
function showProblemPalettes() {
    const problemCategories = [
        { id: 'audio', name: 'Audio', icon: 'fa-volume-up', color: '#3b82f6' },
        { id: 'video', name: 'Vidéo', icon: 'fa-video', color: '#10b981' },
        { id: 'network', name: 'Réseau', icon: 'fa-wifi', color: '#f59e0b' },
        { id: 'hardware', name: 'Matériel', icon: 'fa-desktop', color: '#ef4444' }
    ];

    const palettesContainer = document.getElementById('problemPalettes');
    if (palettesContainer) {
        palettesContainer.innerHTML = problemCategories.map(category => `
            <div class="problem-palette" style="border-color: ${category.color}" onclick="selectProblemCategory('${category.id}')">
                <i class="fas ${category.icon}" style="color: ${category.color}"></i>
                <span>${category.name}</span>
            </div>
        `).join('');
        
        palettesContainer.style.display = 'grid';
    }
}

// Sélection catégorie de problème
function selectProblemCategory(categoryId) {
    log(`Catégorie sélectionnée: ${categoryId}`, 'info');
    
    const descriptions = {
        'audio': 'Problème avec le système audio de la salle',
        'video': 'Problème avec l\'affichage ou le projecteur',
        'network': 'Problème de connexion réseau ou internet',
        'hardware': 'Problème avec l\'équipement informatique'
    };
    
    createTicket(categoryId, descriptions[categoryId], 'normal');
}

// ===== EXPORT DES FONCTIONS GLOBALES =====
// Ces fonctions doivent être accessibles depuis le HTML
window.lockRoom = lockRoom;
window.unlockRoom = unlockRoom;
window.getCurrentRoom = getCurrentRoom;
window.acceptChat = acceptChat;
window.closeChat = closeChat;
window.createTicket = createTicket;
window.connectEventSource = connectEventSource;
window.initializeVitrine = initializeVitrine;
window.detectBestBackend = detectBestBackend;

// Nouvelles fonctions exportées
window.openTechnicalMode = openTechnicalMode;
window.toggleTheme = toggleTheme;
window.createTicketDirect = createTicketDirect;
window.sendProblemReport = sendProblemReport;
window.showProblemPalettes = showProblemPalettes;
window.selectProblemCategory = selectProblemCategory;
window.applySuggestion = applySuggestion;
window.dismissEscalation = dismissEscalation;

// ===== AUTO-INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    log('DOM chargé - Configuration en attente', 'info');
    setupGlobalEventHandlers();
});

log('App.js chargé - En attente de configuration réseau', 'success');
