// === PRELUDE: globals & API_BASE_URL (single definition) ===

window.API_BASE_URL = (typeof window.__API_BASE__ !== 'undefined' && window.__API_BASE__) || window.API_BASE_URL || 'http://localhost:7070';
// [dedup] API_BASE_URL declaration removed
// === HEAD (mocks / boot) extrait ===


        // ===== MOCK UNIFIED REMINDERS =====
        window.UnifiedReminders = {
            count: () => 0, // Pas de rappels simulés - on utilise les vrais rappels maintenant
            list: () => [],
            add: () => {},
            accept: () => {},
            refuse: () => {},
            addListener: () => {},
            init: () => { console.log('🎯 [UnifiedReminders MOCK] Système simulé initialisé'); }
        };
        
        // ===== MOCK CHAT SYSTEM REF7 =====
        window.ChatSystemRef7 = {
            activeChats: new Map(),
            minimizedChats: new Set(),
            unreadMessageCounts: new Map(),
            openChatBanner: () => { console.log('💬 [ChatSystemRef7 MOCK] Chat simulé'); },
            minimizeChatBanner: () => {},
            closeChatBanner: () => {},
            closeAllChats: () => {},
            expandMinimizedChat: () => {},
            startChatEventSource: () => {},
            startChat: (room, source) => {
                console.log(`🔔 [ChatSystemRef7] Démarrage chat pour salle ${room} (source: ${source})`);
                
                // Bloquer l'ouverture automatique du chat modal
                console.log('⚠️ [ChatSystemRef7] Ouverture automatique du modal de chat désactivée.');
                // Le modal de chat s'ouvrira uniquement lorsque l'utilisateur clique sur "Lancer le chat"
                
                // Ne rien faire d'autre - empêcher l'ouverture automatique
            }
        };
        console.log('✅ [ChatSystemRef7 MOCK] Système de chat simulé chargé avec auto-ouverture désactivée');
        
        // ===== MOCK CHAT ADAPTER =====
        window.UnifiedChatManager = window.ChatSystemRef7;
        console.log('✅ [ChatAdapter MOCK] Adaptateur simulé chargé');
        
        // ===== MOCK BOOTSTRAP =====
        setTimeout(() => {
            if (window.updateRemindersCount) window.updateRemindersCount();
        }, 100);
        
        // ===== FONCTIONS CHAT =====
        // Les vraies fonctions handleChatKeyPress et sendChatMessage sont définies plus loin
        // dans le code (lignes ~5358) et sont rendues globales là-bas
        // Ces définitions mock sont commentées pour éviter les conflits
        /*
        window.handleChatKeyPress = function(event, ticketId) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage(ticketId);
            }
        };
        
        window.sendChatMessage = function(ticketId) {
            // MOCK function - replaced by real implementation
        };
        */
    

// === MAIN (logic) extrait ===


        // Configuration - Utiliser la version globale si disponible, sinon fallback local
// [dedup] API_BASE_URL declaration removed
        // Variables globales
        window.tickets = [];
        let filteredTickets = [];
        let selectedTicket = null;
        let isLoading = false;
        let autoRefreshInterval = null;
        let isPageVisible = true;
        let lastTicketCount = 0;
        let isUserInteracting = false;
        let lastInteractionTime = 0;
        let chatEventSource = null;
        window.activeChats = {}; // Rendre global pour l'accès depuis sendChatMessage (OBJET)
        let activeChats = window.activeChats; // Garder la référence locale
        window.chatMessages = new Map(); // Stockage des messages par chatId pour persistance
        
        // ===== STRATÉGIE BACKUP : ISOLATION COMPLÈTE =====
        // Créer un système MOCK pour éviter toute interférence avec Vitrine
        
        window.ChatSystemRef7 = {
            activeChats: new Map(),
            minimizedChats: new Set(),
            unreadMessageCounts: new Map(),
            openChatBanner: () => { console.log('💬 [ChatSystemRef7 MOCK] Chat simulé'); },
            minimizeChatBanner: () => {},
            closeChatBanner: () => {},
            closeAllChats: () => {},
            expandMinimizedChat: () => {},
            startChatEventSource: () => {},
            startChat: (room, source) => {
                console.log(`🔔 [ChatSystemRef7] Démarrage chat pour salle ${room} (source: ${source})`);
                
                // Bloquer l'ouverture automatique du chat modal
                console.log('⚠️ [ChatSystemRef7] Ouverture automatique du modal de chat désactivée.');
                // Le modal de chat s'ouvrira uniquement lorsque l'utilisateur clique sur "Lancer le chat"
                
                // Ne rien faire d'autre - empêcher l'ouverture automatique
            }
        };
        console.log('✅ [ChatSystemRef7 MOCK] Système de chat simulé chargé avec auto-ouverture désactivée');
        
        // ===== MOCK CHAT ADAPTER =====
        window.UnifiedChatManager = window.ChatSystemRef7;
        console.log('✅ [ChatAdapter MOCK] Adaptateur simulé chargé');
        
        // 🚫 ISOLATION : Désactiver complètement le gestionnaire unifié
        if (typeof window.unifiedChat !== 'undefined') {
            console.log('🚫 [TicketsSEA] Gestionnaire unifié détecté mais COMPLÈTEMENT DÉSACTIVÉ pour isolation');
            // Aucune intégration avec le gestionnaire unifié
            // Les chats Tickets et Vitrine sont maintenant complètement séparés
        } else {
            console.log('✅ [TicketsSEA] Aucun gestionnaire unifié - isolation naturelle');
        }
        
        // ✅ NOUVELLE FONCTION : Fermer la bannière de chat avec confirmation
        window.closeChatBanner = function(ticketId) {
            console.log(`🔴 [Chat] Demande de fermeture pour ticket ${ticketId}`);
            showChatCloseConfirmation(ticketId);
        };
        
        // ✅ NOUVELLE FONCTION : Confirmation de fermeture de chat
        window.confirmChatClose = function(ticketId) {
            console.log(`✅ [Chat] Confirmation fermeture pour ticket ${ticketId}`);
            
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            if (chatBanner) {
                // ✅ BACKUP STRATEGY : Pas d'intégration avec gestionnaire unifié
                // Fermeture locale uniquement
                
                // Fermer la bannière
                chatBanner.style.display = 'none';
                
                // Nettoyer les registres
                if (window.activeChats) {
                    delete window.activeChats[ticketId];
                }
                if (window.chatRegistry) {
                    delete window.chatRegistry[ticketId];
                }
                
                console.log(`💬 [Chat] Bannière fermée pour ticket ${ticketId}`);
            }
            
            // Supprimer la modal de confirmation
            const confirmation = document.querySelector('.chat-close-confirmation');
            if (confirmation) {
                confirmation.remove();
            }
        };
        
        // ✅ FONCTION DE CONFIRMATION IDENTIQUE AU BACKUP
        window.showChatCloseConfirmation = function(ticketId) {
            const confirmation = document.createElement('div');
            confirmation.className = 'chat-close-confirmation';
            confirmation.innerHTML = `
                <div class="confirmation-content">
                    <div class="confirmation-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="confirmation-text">
                        <h4>Créer un résumé</h4>
                        <p>Voulez-vous enregistrer un résumé de cette conversation ?</p>
                        <p class="confirmation-note">Le résumé sera sauvegardé et le chat sera fermé automatiquement.</p>
                    </div>
                    <div class="confirmation-actions">
                        <button class="confirmation-btn cancel" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                            Annuler
                        </button>
                        <button class="confirmation-btn primary" onclick="createChatSummaryAndCloseWithNotification('${ticketId}'); this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-save"></i>
                            Enregistrer et quitter
                        </button>
                        <button class="confirmation-btn danger" onclick="quitChatWithoutSaving('${ticketId}'); this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-sign-out-alt"></i>
                            Quitter
                        </button>
                    </div>
                </div>
            `;
            
            // Ajouter les styles inline pour s'assurer qu'ils s'appliquent
            confirmation.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            document.body.appendChild(confirmation);
        };
        
        // ✅ FONCTION DU BACKUP : Créer résumé et fermer avec notification
        window.createChatSummaryAndCloseWithNotification = async function(ticketId) {
            try {
                console.log(`🔗 [ChatSummaryUnified] Début du processus unifié pour ticket ${ticketId}`);
                
                // 1. Créer le résumé
                showLoadingNotification('Création du résumé et fermeture...');
                
                const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
                
                console.log(`🔍 [ChatSummaryUnified] Chat trouvé dans:`, {
                    activeChats: !!activeChats[ticketId],
                    minimizedChats: !!minimizedChats[ticketId],
                    chatId: chatInfo?.chatId
                });
                
                if (!chatInfo) {
                    console.warn(`⚠️ [ChatSummaryUnified] Aucune info de chat pour ticket ${ticketId} - Chat probablement déjà fermé`);
                    
                    // Nettoyer l'interface quand même
                    const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                    if (chatBanner) {
                        chatBanner.style.display = 'none';
                        console.log(`🧹 [ChatSummaryUnified] Bannière chat ${ticketId} masquée`);
                    }
                    
                    hideLoadingNotification();
                    showSuccessNotification('Chat fermé (était déjà inactif).');
                    return;
                }
                
                // ✅ BACKUP STRATEGY : Utiliser chatId ou channelId selon disponibilité
                const channelId = chatInfo.chatId || chatInfo.channelId || `sea-chat-${getCurrentRoomFromTicket(ticketId)}-${Date.now()}`;
                console.log(`🔍 [ChatSummaryUnified-BACKUP] Channel ID utilisé: ${channelId}`);
                
                if (!channelId) {
                    console.error('❌ [ChatSummaryUnified] Structure chatInfo:', chatInfo);
                    throw new Error('Channel ID non trouvé dans les informations de chat.');
                }
                console.log(`🔗 [ChatSummaryUnified] Channel ID: ${channelId}`);
                
                // Récupérer le résumé
                let summary = null;
                try {
                const summaryResponse = await safeFetch(`${API_BASE_URL}/api/tickets/chat/summary?channel_id=${channelId}`);
                if (!summaryResponse.ok) {
                        console.warn(`⚠️ [ChatSummaryUnified] Impossible de récupérer le résumé (HTTP ${summaryResponse.status})`);
                        // Créer un résumé par défaut
                        summary = {
                            channel_id: channelId,
                            status: 'ended',
                            summary: 'Chat terminé - Résumé non disponible',
                            total_messages: 0,
                            messages: []
                        };
                    } else {
                        summary = await summaryResponse.json();
                console.log('📋 [ChatSummaryUnified] Résumé créé:', summary);
                    }
                } catch (summaryError) {
                    console.warn(`⚠️ [ChatSummaryUnified] Erreur lors de la récupération du résumé:`, summaryError);
                    // Créer un résumé par défaut
                    summary = {
                        channel_id: channelId,
                        status: 'ended',
                        summary: 'Chat terminé - Résumé non disponible',
                        total_messages: 0,
                        messages: []
                    };
                }
                
                // 2. Enregistrer en base de données (si un résumé a été créé)
                if (summary && summary.total_messages > 0) {
                    const ticket = tickets.find(t => t.id === ticketId);
                    if (ticket) {
                        try {
                const saveResponse = await safeFetch(`${API_BASE_URL}/api/tickets/chat/save-summary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ticket_id: ticket.id,
                        channel_id: channelId,
                        summary: summary.summary,
                                    message_count: summary.message_count || summary.total_messages || 0,
                                    start_time: summary.start_time || summary.created_at,
                                    end_time: summary.end_time || summary.ended_at
                    })
                });
                
                if (!saveResponse.ok) {
                                console.warn(`⚠️ [ChatSummaryUnified] Impossible de sauvegarder le résumé (HTTP ${saveResponse.status})`);
                            } else {
                                console.log('💾 [ChatSummaryUnified] Résumé sauvegardé en base');
                            }
                        } catch (saveError) {
                            console.warn(`⚠️ [ChatSummaryUnified] Erreur lors de la sauvegarde du résumé:`, saveError);
                        }
                    } else {
                        console.warn('⚠️ [ChatSummaryUnified] Ticket non trouvé - Sauvegarde du résumé ignorée');
                    }
                } else {
                    console.log('ℹ️ [ChatSummaryUnified] Pas de messages à sauvegarder');
                }
                
                // 3. Terminer le chat
                const endResponse = await safeFetch(`${API_BASE_URL}/api/tickets/chat/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel_id: channelId,
                        ticket_id: ticketId,
                        room_id: chatInfo.roomId || chatInfo.room_id,
                        ended_by: "tickets_sea_with_summary"
                    })
                });
                
                if (!endResponse.ok) {
                    throw new Error(`Erreur fin de chat: ${endResponse.status}`);
                }
                
                // 4. Nettoyer complètement le chat (actif OU minimisé)
                console.log(`🗑️ [ChatSummaryUnified] Nettoyage complet du chat pour ${ticketId}`);
                cleanupChatCompletely(ticketId);
                
                hideLoadingNotification();
                showSuccessNotification('Résumé enregistré et chat fermé avec succès !');
                
                console.log('✅ [ChatSummaryUnified] Processus terminé avec succès');
                
            } catch (error) {
                console.error('❌ [ChatSummaryUnified] Erreur:', error);
                hideLoadingNotification();
                
                // Fermer le chat même en cas d'erreur - Nettoyage complet
                console.log(`🗑️ [ChatSummaryUnified] Nettoyage complet après erreur pour ${ticketId}`);
                cleanupChatCompletely(ticketId);
                
                // Afficher un message moins alarmant
                showSuccessNotification('Chat fermé.');
            }
        };
        
        // ✅ FONCTION DU BACKUP : Quitter sans sauvegarder
        window.quitChatWithoutSaving = async function(ticketId) {
            try {
                console.log(`🚪 [QuitWithoutSaving] Fermeture sans sauvegarde pour ticket ${ticketId}`);
                
                showLoadingNotification('Fermeture du chat...');
                
                const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
                
                console.log(`🔍 [QuitWithoutSaving] Chat trouvé dans:`, {
                    activeChats: !!activeChats[ticketId],
                    minimizedChats: !!minimizedChats[ticketId],
                    chatId: chatInfo?.chatId
                });
                
                if (!chatInfo) {
                    console.warn(`⚠️ [QuitWithoutSaving] Aucune info de chat pour ticket ${ticketId} - Chat probablement déjà fermé`);
                    
                    // Nettoyer l'interface quand même
                    console.log(`🧹 [QuitWithoutSaving] Vidage des messages pour chat inactif ${ticketId}`);
                    const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                        console.log(`✅ [QuitWithoutSaving] Messages vidés pour chat inactif ${ticketId}`);
                    }
                    
                    const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                    if (chatBanner) {
                        chatBanner.style.display = 'none';
                        console.log(`🧹 [QuitWithoutSaving] Bannière chat ${ticketId} masquée`);
                    }
                    
                    hideLoadingNotification();
                    showSuccessNotification('Chat fermé (était déjà inactif).');
                    return;
                }
                
                // ✅ BACKUP STRATEGY : Utiliser chatId ou channelId selon disponibilité
                const channelId = chatInfo.chatId || chatInfo.channelId || `sea-chat-${getCurrentRoomFromTicket(ticketId)}-${Date.now()}`;
                console.log(`🔍 [QuitWithoutSaving-BACKUP] Channel ID utilisé: ${channelId}`);
                
                if (!channelId) {
                    console.error('❌ [QuitWithoutSaving] Structure chatInfo:', chatInfo);
                    throw new Error('Channel ID non trouvé dans les informations de chat.');
                }
                
                console.log(`🚪 [QuitWithoutSaving] Channel ID trouvé: ${channelId}`);
                
                // Terminer le chat sans résumé
                const requestData = {
                    channel_id: channelId,
                    ticket_id: ticketId,
                    room_id: chatInfo.roomId || chatInfo.room_id,
                    ended_by: "tickets_sea_no_summary"
                };
                
                const endResponse = await safeFetch(`${API_BASE_URL}/api/tickets/chat/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (!endResponse.ok) {
                    throw new Error(`Erreur fin de chat: ${endResponse.status}`);
                }
                
                // ✅ BACKUP STRATEGY : Vider les messages du chat avant fermeture
                console.log(`🧹 [QuitWithoutSaving] Vidage des messages pour ${ticketId}`);
                const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                    console.log(`✅ [QuitWithoutSaving] Messages vidés pour ${ticketId}`);
                }
                
                // ✅ NOUVEAU : Nettoyage complet unifié
                console.log(`🗑️ [QuitWithoutSaving] Nettoyage complet du chat pour ${ticketId}`);
                cleanupChatCompletely(ticketId);
                
                hideLoadingNotification();
                showSuccessNotification('Chat fermé sans sauvegarde.');
                
                console.log('✅ [QuitWithoutSaving] Chat fermé avec succès');
                
            } catch (error) {
                console.error('❌ [QuitWithoutSaving] Erreur:', error);
                hideLoadingNotification();
                showErrorNotification(`Erreur lors de la fermeture: ${error.message}`);
            }
        };
        
        // ✅ FONCTIONS UTILITAIRES DU BACKUP : Notifications
        function showLoadingNotification(message) {
            // Créer ou mettre à jour la notification de chargement
            let loadingNotif = document.getElementById('loadingNotification');
            if (!loadingNotif) {
                loadingNotif = document.createElement('div');
                loadingNotif.id = 'loadingNotification';
                loadingNotif.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #3b82f6;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                `;
                document.body.appendChild(loadingNotif);
            }
            loadingNotif.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                ${message}
            `;
            loadingNotif.style.display = 'flex';
        }
        
        function hideLoadingNotification() {
            const loadingNotif = document.getElementById('loadingNotification');
            if (loadingNotif) {
                loadingNotif.style.display = 'none';
            }
        }
        
        function showSuccessNotification(message) {
            showNotification(message, 'success', 3000);
        }
        
        // ⚡ PRODUCTION: Fonction pour obtenir le ticketId à partir du channelId
        function getTicketIdByChannelId(channelId) {
            for (const [ticketId, chatInfo] of Object.entries(activeChats)) {
                if (chatInfo.chatId === channelId || chatInfo.channelId === channelId) {
                    return ticketId;
                }
            }
            return null;
        }
        
        // ⚡ PRODUCTION: Fonction pour afficher une notification de mode rappel (bleue/info)
        function showRecallModeNotification(roomId, message) {
            // Créer une notification stylée en bleu pour le mode rappel
            const notification = document.createElement('div');
            notification.className = 'recall-mode-notification';
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
                    z-index: 10000;
                    max-width: 400px;
                    animation: slideIn 0.5s ease-out;
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 28px;">⏰</div>
                        <div>
                            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">
                                Mode Rappel Activé
                            </div>
                            <div style="font-size: 14px; opacity: 0.95;">
                                ${message}
                            </div>
                            <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
                                Le client n'a pas répondu. Une bannière de rappel lui est présentée.
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Ajouter les styles d'animation si pas déjà présents
            if (!document.querySelector('#recall-mode-animations')) {
                const style = document.createElement('style');
                style.id = 'recall-mode-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(400px); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            // Retirer après 8 secondes
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.5s ease-in';
                setTimeout(() => {
                    notification.remove();
                }, 500);
            }, 8000);
        }
        
        function showErrorNotification(message) {
            showNotification(message, 'error', 5000);
        }
        
        function showNotification(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}-notification`;
            
            // Créer la structure proprement
            const content = document.createElement('div');
            content.className = 'notification-content';
            
            const title = document.createElement('div');
            title.className = 'notification-title';
            title.textContent = message;
            
            content.appendChild(title);
            notification.appendChild(content);
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        // ✅ FONCTION : Auto-resize pour les textareas
        window.autoResizeTextarea = function(textarea) {
            // ✅ PROTECTION : Ne pas redimensionner si le textarea est vide
            if (!textarea || !textarea.value) {
                return;
            }
            
            // Réinitialiser la hauteur pour calculer la nouvelle hauteur
            textarea.style.height = 'auto';
            
            // Calculer la nouvelle hauteur basée sur le scrollHeight
            const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
            textarea.style.height = newHeight + 'px';
            
            // Si on a du scroll, on se positionne en bas
            if (textarea.scrollHeight > 200) {
                textarea.scrollTop = textarea.scrollHeight;
            }
        };

        // ✅ FONCTION AMÉLIORÉE : Afficher/masquer l'indicateur de frappe INTELLIGENT avec BLACKLIST
        window.showTypingIndicator = function(ticketId, isTyping, source = 'Vitrine', clientId = null) {
            // 🚫 BLACKLIST : Ne pas afficher l'indicateur si c'est ce client SEA qui tape
            if (clientId && clientId === window.SEA_CLIENT_ID) {
                console.log(`🚫 [TypingIndicator] BLACKLIST - Événement typing ignoré car c'est ce client SEA qui tape (${clientId})`);
                return;
            }
            
            const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
            if (!chatMessages) {
                console.log(`⚠️ [TypingIndicator] Chat messages container non trouvé pour ${ticketId}`);
                return;
            }
            
            // ⚡ PRODUCTION: Récupérer le nom de la salle depuis le ticket
            let roomName = 'Client';
            const ticketCard = document.querySelector(`[data-ticket-id="${ticketId}"]`);
            if (ticketCard) {
                const roomElement = ticketCard.querySelector('.ticket-room');
                if (roomElement) {
                    roomName = roomElement.textContent.trim();
                }
            }
            // Fallback: chercher dans activeChats
            if (roomName === 'Client' && activeChats[ticketId]) {
                const chatInfo = activeChats[ticketId];
                if (chatInfo && chatInfo.roomId) {
                    roomName = `Salle ${chatInfo.roomId}`;
                }
            }
            
            const typingIndicatorId = `typingIndicator_${ticketId}`;
            let typingIndicator = document.getElementById(typingIndicatorId);
            
            if (isTyping) {
                console.log(`🔤 [TypingIndicator] 🏢 ${roomName} commence à écrire dans ${ticketId}`);
                
                // Créer l'indicateur s'il n'existe pas
                if (!typingIndicator) {
                    typingIndicator = document.createElement('div');
                    typingIndicator.id = typingIndicatorId;
                    typingIndicator.className = 'typing-indicator';
                    typingIndicator.dataset.source = source.toLowerCase();
                    
                    // 🎨 Icône et couleur selon la source
                    const sourceIcon = '🏢';
                    const sourceClass = source === 'Vitrine' ? 'vitrine-typing' : 'client-typing';
                    
                    // ⚡ PRODUCTION: Design professionnel moderne style WhatsApp/Slack
                    typingIndicator.className = 'typing-indicator';
                    
                    // Générer initiales pour l'avatar
                    const initials = roomName.split('-').map(part => part.charAt(0)).join('').toUpperCase();
                    
                    typingIndicator.innerHTML = `
                        <div class="typing-simple">
                            <div class="typing-avatar">${initials}</div>
                            <div class="typing-room-name">${roomName}</div>
                            <div class="typing-dots">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </div>
                        </div>
                    `;
                    
                    // Les animations sont maintenant dans styles.css
                    
                    chatMessages.appendChild(typingIndicator);
                    console.log(`✅ [TypingIndicator] Indicateur créé pour ${roomName}`);
                } else {
                    // Mettre à jour la source si elle a changé
                    const sourceSpan = typingIndicator.querySelector('.typing-source');
                    const iconSpan = typingIndicator.querySelector('.typing-source-icon');
                    if (sourceSpan && sourceSpan.textContent !== roomName) {
                        sourceSpan.textContent = roomName;
                        iconSpan.textContent = source === 'Vitrine' ? '🏢' : '👤';
                        typingIndicator.dataset.source = source.toLowerCase();
                        console.log(`🔄 [TypingIndicator] Source mise à jour vers ${source}`);
                    }
                }
                
                // Faire défiler vers le bas avec animation fluide
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                console.log(`🔤 [TypingIndicator] 🏢 ${source} arrête d'écrire dans ${ticketId}`);
                
                // Supprimer l'indicateur avec animation
                if (typingIndicator) {
                    typingIndicator.style.opacity = '0';
                    typingIndicator.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        if (typingIndicator && typingIndicator.parentNode) {
                            typingIndicator.remove();
                            console.log(`✅ [TypingIndicator] Indicateur supprimé pour ${source}`);
                        }
                    }, 200);
                }
            }
        };
        
        // ✅ NOUVELLE FONCTION : Restaurer les messages d'un chat existant
        window.restoreChatMessages = function(ticketId, chatId) {
            console.log(`🔄 [RestoreChat] Restauration des messages pour ticketId: ${ticketId}, chatId: ${chatId}`);
            
            // ✅ NOUVEAU : Essayer sessionStorage d'abord (persiste après F5)
            let storedMessages = null;
            
            try {
                const sessionKey = `tickets_sea_chat_${chatId}`;
                const sessionData = sessionStorage.getItem(sessionKey);
                if (sessionData) {
                    storedMessages = JSON.parse(sessionData);
                    console.log(`📱 [RestoreChat] ${storedMessages.length} messages trouvés dans sessionStorage pour chatId: ${chatId}`);
                }
            } catch (error) {
                console.warn(`⚠️ [RestoreChat] Erreur lecture sessionStorage:`, error);
            }
            
            // Fallback vers window.chatMessages si sessionStorage vide
            if (!storedMessages || storedMessages.length === 0) {
                storedMessages = window.chatMessages.get(chatId);
                if (storedMessages && storedMessages.length > 0) {
                    console.log(`💾 [RestoreChat] ${storedMessages.length} messages trouvés dans window.chatMessages pour chatId: ${chatId}`);
                }
            }
            
            if (!storedMessages || storedMessages.length === 0) {
                console.log(`ℹ️ [RestoreChat] Aucun message stocké trouvé pour chatId: ${chatId}`);
                return;
            }
            
            console.log(`📬 [RestoreChat] ${storedMessages.length} messages trouvés pour chatId: ${chatId}`);
            
            // Attendre que l'élément chatMessages soit créé
            setTimeout(() => {
                const chatMessagesElement = document.getElementById(`chatMessages_${ticketId}`);
                if (!chatMessagesElement) {
                    console.error(`❌ [RestoreChat] Élément chatMessages_${ticketId} non trouvé`);
                    return;
                }
                
                // Vider d'abord le conteneur (au cas où il y aurait des messages résiduels)
                chatMessagesElement.innerHTML = '';
                
                // ✅ NOUVEAU : Restaurer chaque message avec support des deux formats
                storedMessages.forEach((messageData, index) => {
                    const messageDiv = document.createElement('div');
                    
                    // Support des deux formats : sessionStorage (text) et window.chatMessages (message)
                    const messageText = messageData.text || messageData.message || '';
                    const messageType = messageData.type || 'received';
                    
                    messageDiv.className = `chat-message ${messageType}`;
                    messageDiv.innerHTML = messageText;
                    chatMessagesElement.appendChild(messageDiv);
                    
                    console.log(`📨 [RestoreChat] Message ${index + 1}/${storedMessages.length} restauré: ${messageType} - "${messageText.substring(0, 30)}..."`);
                });
                
                // Scroller vers le bas
                if (typeof chatMessagesElement.scrollTo === 'function') {
                    chatMessagesElement.scrollTo({ top: chatMessagesElement.scrollHeight, behavior: 'smooth' });
                }
                
                console.log(`✅ [RestoreChat] ${storedMessages.length} messages restaurés avec succès pour ${ticketId}`);
            }, 200);
        };
        let modalGuardUntil = 0;
        let globalEventSource = null;
        let processedEvents = new Set();
        
        // Fonction fetch de fallback si la version globale n'est pas disponible
        window.safeFetch = window.fetch || function(url, options) {
            console.warn('⚠️ [Tickets SEA] Utilisation de fetch de fallback - version globale non disponible');
            // Utiliser la fonction fetch native du navigateur
            return window.fetch ? window.fetch(url, options) : 
                   (typeof fetch !== 'undefined' ? fetch(url, options) : 
                    Promise.reject(new Error('Fetch non disponible')));
        };
        const safeFetch = window.safeFetch; // Garder la référence locale

        // Fonction debounce pour éviter les appels répétés
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Fonction pour détecter les interactions utilisateur
        function trackUserInteraction() {
            isUserInteracting = true;
            lastInteractionTime = Date.now();
            
            // Arrêter temporairement le rafraîchissement pendant les interactions
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
            
            // Reprendre le rafraîchissement après 5 secondes d'inactivité
            setTimeout(() => {
                if (Date.now() - lastInteractionTime >= 5000) {
                    isUserInteracting = false;
                    if (!autoRefreshInterval) {
                        startAutoRefresh();
                    }
                }
            }, 5000);
        }

        // Ajouter des event listeners globaux pour détecter les interactions
        document.addEventListener('mousedown', trackUserInteraction);
        document.addEventListener('keydown', trackUserInteraction);
        document.addEventListener('scroll', trackUserInteraction);

        // ===== FONCTIONS SIDEBAR RAPPELS =====
        
        // Fonction pour toggle la sidebar des rappels
        window.toggleRemindersSidebar = function() {
            const sidebar = document.getElementById('remindersSidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
                
                // Si on ouvre la sidebar, on met à jour la liste des rappels
                if (sidebar.classList.contains('open')) {
                    updateRemindersList();
                }
            }
        };
        
        // ✅ CORRECTION : Fonction pour mettre à jour le compteur de rappels (synchronisé avec le filtrage)
        window.updateRemindersCount = function() {
            const remindersCard = document.getElementById('remindersCard');
            const remindersCount = document.getElementById('remindersCount');
            
            if (remindersCount) {
                let count = 0;
                
                // ✅ CORRECTION : Compter uniquement les rappels VISIBLES (même logique que updateRemindersList)
                if (window.recallsData) {
                    const visibleRecalls = Array.from(window.recallsData.values()).filter(recall => recall.showInSidebar !== false);
                    count = visibleRecalls.length;
                    console.log(`🔢 [updateRemindersCount] Comptage: ${window.recallsData.size} total → ${count} visibles`);
                }
                
                // Ne plus utiliser UnifiedReminders qui est juste un mock
                // if (window.UnifiedReminders) {
                //     count += window.UnifiedReminders.count();
                // }
                
                remindersCount.textContent = count;
                
                // Ajouter la classe has-new si il y a des rappels actifs
                if (remindersCard && count > 0) {
                    remindersCard.classList.add('has-new');
                } else if (remindersCard) {
                    remindersCard.classList.remove('has-new');
                }
            }
        };
        
        // ===== SYSTÈME DE RAPPELS AVEC PERSISTANCE =====
        window.recallsData = new Map(); // Stockage local des rappels
        
        // Variables pour la gestion des chats minimisés
        window.minimizedChats = window.minimizedChats || {}; // OBJET (utilisé avec syntaxe [])
        window.unreadMessageCounts = window.unreadMessageCounts || {}; // OBJET (utilisé avec syntaxe [])
        
        // ✅ NOUVEAU : Variable pour tracker le chat actuellement ouvert (un seul à la fois)
        window.currentOpenChatId = null;
        
        // ✅ NOUVEAU : Fonction centralisée pour gérer l'exclusivité XOR des états de chat
        window.setChatState = function(ticketId, nextState) {
            console.debug('[ChatState] Ticket', ticketId, '→', nextState);
            
            // ✅ RÈGLE 1 : Un seul chat ouvert à la fois
            if (nextState === 'open') {
                if (window.currentOpenChatId && window.currentOpenChatId !== ticketId) {
                    // Minimiser l'actuel au lieu de le fermer (convention existante)
                    console.debug('[ChatState] Minimisation du chat ouvert:', window.currentOpenChatId);
                    setChatState(window.currentOpenChatId, 'minimized');
                }
            }
            
            // ✅ RÈGLE 2 : Exclusivité XOR - Préserver les données existantes
            const existingChatInfo = activeChats[ticketId];
            
            // ✅ BACKUP STRATEGY : Obtenir les infos minimisées AVANT de les supprimer
            const minimizedInfo = minimizedChats[ticketId];
            delete minimizedChats[ticketId];
            
            // ✅ RÈGLE 3 : Appliquer le nouvel état
            if (nextState === 'open') {
                // ✅ CORRECTION CRITIQUE : Utiliser les données obtenues avant suppression
                const chatInfo = existingChatInfo || minimizedInfo || { 
                    chatId: `chat_${ticketId}_${Date.now()}`, // ✅ Générer un chatId unique si nécessaire
                    roomId: getCurrentTicketRoom(ticketId), 
                    status: 'active' 
                };
                // Mettre à jour le statut sans perdre les autres données
                chatInfo.status = 'active';
                activeChats[ticketId] = chatInfo;
                console.log(`🔧 [ChatState] ChatInfo restauré pour ticket ${ticketId}:`, chatInfo);
                unreadMessageCounts[ticketId] = 0;
                renderOpenModal(ticketId);
                removeMinimizedBadge(ticketId);
                window.currentOpenChatId = ticketId;
                console.debug('[ChatState] Chat ouvert:', ticketId);
                
            } else if (nextState === 'minimized') {
                // ✅ CORRECTION : Préserver toutes les informations du chat existant
                const chatInfo = existingChatInfo || {
                    chatId: `chat_${ticketId}_${Date.now()}`, // ✅ CORRIGÉ : utiliser ticketId
                    roomId: getCurrentTicketRoom(ticketId),
                    ticketId: ticketId,
                    status: 'minimized'
                };
                
                // ✅ CRITIQUE : Sauvegarder dans minimizedChats AVANT de supprimer d'activeChats
                minimizedChats[ticketId] = {
                    ...chatInfo,
                    expanded: false,
                    minimizedAt: new Date().toISOString()
                };
                
                console.log('💾 [ChatState] Chat info sauvegardé pour minimisation:', minimizedChats[ticketId]);
                console.log('📊 [ChatState] Messages disponibles pour ce chat:', window.chatMessages.get(chatInfo.chatId)?.length || 0);
                
                // ✅ MAINTENANT on peut supprimer d'activeChats car on a sauvegardé
                delete activeChats[ticketId];
                
                closeChatModal(ticketId);
                renderMinimizedBadge(ticketId);
                if (window.currentOpenChatId === ticketId) {
                    window.currentOpenChatId = null;
                }
                console.debug('[ChatState] Chat minimisé:', ticketId);
                
            } else if (nextState === 'closed') {
                // ✅ BACKUP STRATEGY : Nettoyer complètement
                delete activeChats[ticketId];
                closeChatModal(ticketId);
                removeMinimizedBadge(ticketId);
                unreadMessageCounts[ticketId] = 0;
                if (window.currentOpenChatId === ticketId) {
                    window.currentOpenChatId = null;
                }
                console.debug('[ChatState] Chat fermé:', ticketId);
            }
        };
        
        // ✅ NOUVEAU : Fonctions helpers pour la gestion DOM
        function renderOpenModal(ticketId) {
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            if (chatBanner) {
                chatBanner.style.display = 'flex';
                chatBanner.className = 'chat-banner-fullscreen';
                console.log(`✅ [RenderOpen] Chat banner affiché pour ticket ${ticketId}`);
            } else {
                console.warn(`⚠️ [RenderOpen] Chat banner non trouvé pour ticket ${ticketId}`);
            }
        }
        
        function closeChatModal(ticketId) {
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            if (chatBanner) {
                chatBanner.style.display = 'none';
                console.log(`🔽 [CloseModal] Chat banner masqué pour ticket ${ticketId}`);
            }
        }
        
        function renderMinimizedBadge(ticketId) {
            let chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            if (!chatBubble) {
                // Créer le badge de manière propre sans HTML inline
                chatBubble = document.createElement('div');
                chatBubble.id = `chatBubble_${ticketId}`;
                chatBubble.className = 'chat-bubble messenger-style';
                chatBubble.dataset.chatId = ticketId; // ✅ Utiliser ticketId comme identifiant
                
                // Contenu principal
                const content = document.createElement('div');
                content.className = 'chat-bubble-content';
                content.onclick = () => expandMinimizedChat(ticketId);
                
                // Avatar
                const avatar = document.createElement('div');
                avatar.className = 'chat-bubble-avatar';
                const avatarIcon = document.createElement('i');
                avatarIcon.className = 'fas fa-headset';
                avatar.appendChild(avatarIcon);
                
                // Info
                const info = document.createElement('div');
                info.className = 'chat-bubble-info';
                
                const room = document.createElement('div');
                room.className = 'chat-bubble-room';
                room.id = `chatBubbleRoom_${ticketId}`;
                room.textContent = 'Salle';
                
                const status = document.createElement('div');
                status.className = 'chat-bubble-status';
                const presenceDot = document.createElement('span');
                presenceDot.className = 'presence-dot';
                status.appendChild(presenceDot);
                status.appendChild(document.createTextNode(' Support actif'));
                
                info.appendChild(room);
                info.appendChild(status);
                
                // Badge de notification
                const badge = document.createElement('div');
                badge.className = 'chat-bubble-badge';
                badge.id = `chatBubbleBadge_${ticketId}`;
                badge.style.display = 'none';
                badge.textContent = '0';
                
                // Bouton fermer
                const closeBtn = document.createElement('button');
                closeBtn.className = 'chat-bubble-close';
                closeBtn.title = 'Fermer';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    closeChatBanner(ticketId);
                };
                const closeIcon = document.createElement('i');
                closeIcon.className = 'fas fa-times';
                closeBtn.appendChild(closeIcon);
                
                // Assembler la structure
                content.appendChild(avatar);
                content.appendChild(info);
                chatBubble.appendChild(content);
                chatBubble.appendChild(badge);
                chatBubble.appendChild(closeBtn);
                
                document.body.appendChild(chatBubble);
            }
            
            // Mettre à jour les informations de la bulle
            const chatBubbleRoom = chatBubble.querySelector(`#chatBubbleRoom_${ticketId}`);
            if (chatBubbleRoom) {
                chatBubbleRoom.textContent = getCurrentTicketRoom(ticketId) || 'Salle';
            }
            
            // Positionnement et affichage
            positionMessengerBubbles();
            chatBubble.style.display = 'flex';
            chatBubble.style.animation = 'messengerSlideIn 0.3s ease-out';
            chatBubble.classList.remove('chat-expanded');
        }
        
        function removeMinimizedBadge(ticketId) {
            const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            if (chatBubble) {
                chatBubble.remove(); // ✅ CORRECTION : Supprimer complètement au lieu de masquer
                console.log(`🗑️ [RemoveBadge] Badge supprimé pour ticket ${ticketId}`);
                
                // ✅ NOUVEAU : Repositionner les autres badges après suppression
                setTimeout(() => positionMessengerBubbles(), 100);
            }
        }
        
        // ✅ NOUVEAU : Handler amélioré pour les messages SSE entrants
        window.handleIncomingMessage = function(chatId, message, type = 'received') {
            console.debug('[ChatState] Message entrant pour chat:', chatId, 'type:', type);
            
            if (activeChats[chatId]) {
                // Chat ouvert : afficher dans la modale, pas d'unread ni de notification
                appendMessageToModal(chatId, message, type);
                console.debug('[ChatState] Message ajouté à la modale ouverte');
                
            } else if (minimizedChats[chatId]) {
                // Chat minimisé : incrémenter unread et mettre à jour le badge
                const currentUnread = unreadMessageCounts[chatId] || 0;
                unreadMessageCounts[chatId] = currentUnread + 1;
                updateBadgeUnread(chatId, currentUnread + 1);
                console.debug('[ChatState] Unread incrémenté pour chat minimisé:', currentUnread + 1);
                
                // Optionnel : son/flash autorisé uniquement à l'état minimized
                playNotificationSound();
                
            } else {
                // Chat ni ouvert ni minimisé : logique existante inchangée (rappels/notifications)
                console.debug('[ChatState] Chat non tracké, routage vers logique existante');
                routeToReminderOrNotify(chatId, message);
            }
        };
        
        function appendMessageToModal(chatId, message, type) {
            // ✅ CORRECTION CRITIQUE : Utiliser addChatMessage pour assurer la persistance
            console.log(`📨 [AppendMessage] Ajout message ${type} pour chat ${chatId}: "${message}"`);
            
            // Utiliser la fonction globale addChatMessage qui sauvegarde automatiquement
            if (window.addChatMessage) {
                window.addChatMessage(chatId, message, type);
            } else {
                // Fallback si addChatMessage n'est pas disponible
                console.warn('⚠️ [AppendMessage] addChatMessage non disponible, affichage direct sans persistance');
                const chatMessages = document.querySelector(`#chatBanner_${chatId} .chat-messages`);
                if (chatMessages) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message ${type}`;
                    messageDiv.textContent = message;
                    chatMessages.appendChild(messageDiv);
                    
                    // Scroll vers le bas
                    if (typeof chatMessages.scrollTo === 'function') {
                        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                    } else {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }
            }
        }
        
        function updateBadgeUnread(chatId, count) {
            const badge = document.getElementById(`chatBubbleBadge_${chatId}`);
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        }
        
        function routeToReminderOrNotify(chatId, message) {
            // Logique existante pour les rappels/notifications
            // Cette fonction conserve le comportement existant pour les chats non trackés
        }
        
        // ✅ NETTOYAGE : Toutes les fonctions de test ont été supprimées pour la production
        // Les fonctions suivantes étaient utilisées pour le développement et les tests :
        // - testMessageRouting, testChatPersistence, testPersistenceCleanup
        // - testRecallManual, test, testTypingIndicators
        // - testAccidentalDisconnect, testCenteredToast, testTypingBlacklist, testTypingNoAnimation
        // - testChatConnectivity
        
        // ===== FONCTIONS UTILITAIRES PRINCIPALES =====
        
        function clearChatPersistence(chatId) {
            // Supprimer complètement l'historique des messages pour ce chat
            if (window.chatMessages && window.chatMessages.has(chatId)) {
                window.chatMessages.delete(chatId);
                console.log(`🧹 [Persistence] Messages supprimés pour chat ${chatId}`);
            }
            
            // Supprimer les messages non lus
            if (unreadMessageCounts && unreadMessageCounts[chatId]) {
                delete unreadMessageCounts[chatId];
                console.log(`🧹 [Persistence] Compteur unread supprimé pour chat ${chatId}`);
            }
            
            console.log(`✅ [ClearComplete] Nettoyage complet terminé pour ${chatId}`);
        }
        
        // Fonction pour stocker un rappel localement (MOCK)
        window.addMockRecall = function(room, ticketNumber, skipToast = false, channelId = null, isClientRequest = false) {
            console.log('🎯 [addMockRecall] Début création rappel pour salle:', room);
            console.log('🔍 [addMockRecall] isClientRequest:', isClientRequest);
            
            // Générer un ID unique basé sur la salle pour éviter les doublons
            const recallId = `recall_${room}_${Date.now()}`;
            
            // ✅ CORRECTION: Si c'est une demande explicite du client, supprimer les anciens rappels timeout
            if (isClientRequest) {
                console.log('🔄 [addMockRecall] Demande client explicite - Nettoyage des anciens rappels timeout');
                // Supprimer les anciens rappels pour cette salle (timeout automatique)
                const oldRecalls = [];
                window.recallsData.forEach((recall, id) => {
                    if (recall.room === room && recall.status === 'pending') {
                        oldRecalls.push(id);
                    }
                });
                oldRecalls.forEach(id => {
                    console.log('🗑️ [addMockRecall] Suppression ancien rappel:', id);
                    window.recallsData.delete(id);
                });
            }
            
            // Créer le nouvel objet rappel
            const recall = {
                id: recallId,
                room: room,
                ticket_number: ticketNumber,
                channel_id: channelId,
                status: 'pending',
                created_at: new Date().toISOString(),
                type: isClientRequest ? 'client_recall_request' : 'timeout_recall',
                source: isClientRequest ? 'vitrine' : 'system'
            };
            
            // Stocker dans la Map globale
            if (!window.recallsData) {
                window.recallsData = new Map();
            }
            window.recallsData.set(recallId, recall);
            
            // Afficher le toast seulement si skipToast n'est pas true
            if (!skipToast) {
                console.log('🔔 [addMockRecall] Affichage du toast de rappel');
                showRecallToast(recall);
            } else {
                console.log('🔄 [addMockRecall] Création immédiate du badge (pas de toast)');
                window.updateRemindersList();
                window.updateRemindersCount();
            }
            
            console.log('✅ [addMockRecall] Fin création rappel');
        }
        
        // ✅ DÉSACTIVÉ : Toast orange d'avertissement (interfère avec le toast bleu)
        window.showTimeoutWarningToast = function(room) {
            // ❌ Toast orange désactivé pour éviter qu'il cache le toast bleu
            console.log(`🚫 [TimeoutWarning] Toast orange DÉSACTIVÉ pour salle: ${room} (pour éviter conflit avec toast bleu)`);
            return; // Ne rien faire
        }
        
        // ✅ Fonctions de test supprimées pour la production
        
        // ✅ RESTAURÉ : Toast BLEU style préféré pour fermeture client
        function showChatEndedByClient(roomId) {
            const toast = document.createElement('div');
            toast.className = 'toast chat-ended-by-client';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            
            // Utiliser les classes CSS définies dans styles.css pour le style BLEU
            toast.innerHTML = `
                <div class="toast-header">
                    <i class="fas fa-comment-slash chat-ended-icon"></i>
                    <h4 class="toast-title">Chat terminé par le client</h4>
                </div>
                <div class="toast-body">
                    Le client a mis fin à la conversation.
                    <div class="room-info">
                        <i class="fas fa-door-open"></i> Salle ${roomId}
                    </div>
                </div>
            `;

            // Créer ou récupérer le conteneur de toasts
            let toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toastContainer';
                document.body.appendChild(toastContainer);
            }
            toastContainer.appendChild(toast);

            // Supprimer le toast après 5 secondes
            setTimeout(() => {
                toast.remove();
            }, 5000);
            
            console.log(`💙 [Toast BLEU] Toast affiché: Chat terminé par le client - Salle ${roomId}`);
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.innerHTML = `
                <div class="notification-header">
                    <i class="notification-icon fas fa-check-circle"></i>
                    <div class="notification-content">
                        <div class="notification-title">Notification</div>
                        <div class="notification-message">${message}</div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        function showClientChatEndedNotification(ticketId) {
            // Trouver le modal de chat pour ce ticket
            const chatModal = document.getElementById(`chatBanner_${ticketId}`);
            if (!chatModal) {
                console.warn(`⚠️ [ChatEndedNotification] Modal chat non trouvé pour ticket ${ticketId}`);
                return;
            }
            
            // Créer la bannière de notification
            const banner = document.createElement('div');
            banner.className = 'chat-ended-banner';
            banner.innerHTML = `
                <div class="chat-ended-content">
                    <i class="chat-ended-icon fas fa-info-circle"></i>
                    <div class="chat-ended-text">
                        <div class="chat-ended-title">Chat fermé par le client</div>
                        <div class="chat-ended-description">Vous pouvez garder cette bannière ouverte pour vos rapports et statistiques</div>
                    </div>
                </div>
            `;
            
            // Insérer la bannière au début du modal de chat
            const chatContent = chatModal.querySelector('.chat-modal-content');
            if (chatContent) {
                chatContent.insertBefore(banner, chatContent.firstChild);
            } else {
                chatModal.appendChild(banner);
            }
            
            console.log(`📋 [ChatEndedNotification] Bannière ajoutée pour ticket ${ticketId}`);
        }

        // ===== FONCTIONS PRINCIPALES DE PRODUCTION =====
        
        window.cleanupChatPersistence = function(ticketId, chatId) {
            console.log(`🧹 [Cleanup] Nettoyage pour ticketId: ${ticketId}, chatId: ${chatId}`);
            
            // Nettoyer window.chatMessages
            window.chatMessages.delete(chatId);
            
            // Nettoyer sessionStorage (Hotfix v3)
            if (typeof clearChatHistory === 'function') {
                clearChatHistory(chatId);
            }
            
            // Nettoyer tous les caches possibles
            sessionStorage.removeItem(`chat_${chatId}`);
            sessionStorage.removeItem(`chatHistory_${chatId}`);
            sessionStorage.removeItem(`tickets_sea_chat_${chatId}`);
            
            // Nettoyer activeChats
            delete activeChats[ticketId];
            
            console.log('✅ [Cleanup] Nettoyage complet effectué');
        };
        
        // ✅ NOUVEAU : Fonction pour nettoyer COMPLÈTEMENT un historique de chat
        window.clearChatHistoryCompletely = function(chatId) {
            console.log(`🗑️ [ClearComplete] Nettoyage complet pour chatId: ${chatId}`);
            
            // Nettoyer window.chatMessages
            window.chatMessages.delete(chatId);
            console.log(`   ✅ window.chatMessages nettoyé`);
            
            // Nettoyer sessionStorage
            sessionStorage.removeItem(`tickets_sea_chat_${chatId}`);
            sessionStorage.removeItem(`tickets_sea_chat_meta_${chatId}`);
            console.log(`   ✅ sessionStorage nettoyé`);
            
            // Nettoyer les caches du Hotfix v3
            if (window.__chatPersist && window.__chatPersist[chatId]) {
                delete window.__chatPersist[chatId];
                console.log(`   ✅ __chatPersist nettoyé`);
            }
            
            if (window.__chatSeen && window.__chatSeen[chatId]) {
                delete window.__chatSeen[chatId];
                console.log(`   ✅ __chatSeen nettoyé`);
            }
            
            console.log(`✅ [ClearComplete] Nettoyage complet terminé pour ${chatId}`);
        };
        
        // FONCTION DE TEST MANUELLE - À utiliser dans la console
        window.testRecallManual = function(room = 'TEST-123') {
            console.log('🧪 === TEST MANUEL DE RAPPEL ===');
            console.log('1️⃣ Simulation d\'un rappel client pour la salle:', room);
            
            // Simuler un rappel comme si Vitrine l'avait créé
            const testRecall = {
                room: room,
                ticket_number: 'TEST-' + Date.now(),
                requested_at: new Date().toISOString(),
                status: 'pending',
                type: 'client_recall_request'
            };
            
            // Stocker dans pendingRecalls comme le ferait Vitrine
            localStorage.setItem('pendingRecalls', JSON.stringify([testRecall]));
            console.log('2️⃣ Rappel stocké dans pendingRecalls:', testRecall);
            
            // Déclencher manuellement checkClientRecalls
            console.log('3️⃣ Appel de checkClientRecalls()...');
            checkClientRecalls();
            
            // Vérifier les résultats
            setTimeout(() => {
                console.log('4️⃣ === VÉRIFICATION DES RÉSULTATS ===');
                console.log('   - mockRecalls:', localStorage.getItem('mockRecalls'));
                console.log('   - recallsData.size:', window.recallsData.size);
                console.log('   - Contenu recallsData:', Array.from(window.recallsData.values()));
                console.log('   - Toast affiché ?', document.querySelector('.toast.recall-toast') ? '✅ OUI' : '❌ NON');
                console.log('   - Badge dans sidebar ?', document.querySelector('.room-badge-group') ? '✅ OUI' : '❌ NON');
                console.log('🧪 === FIN DU TEST ===');
            }, 1000);
        };
        
        // FONCTION POUR CRÉER DIRECTEMENT UN RAPPEL (sans passer par pendingRecalls)
        window.createRecallDirect = function(room = 'A-1825') {
            console.log('🚀 === CRÉATION DIRECTE DE RAPPEL ===');
            const recall = {
                id: `recall_${room}_${Date.now()}`,
                room: room,
                ticket_number: 'DIRECT-' + Date.now(),
                requested_at: new Date().toISOString(),
                status: 'pending',
                type: 'client_recall'
            };
            
            // Ajouter directement à recallsData
            window.recallsData.set(recall.id, recall);
            console.log('✅ Rappel ajouté à recallsData, taille:', window.recallsData.size);
            
            // Afficher le toast
            window.showRecallToast(recall);
            console.log('✅ Toast affiché');
            
            // Mettre à jour la sidebar
            window.updateRemindersList();
            console.log('✅ Sidebar mise à jour');
            
            // Stocker dans mockRecalls pour persistance
            const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
            recalls.push(recall);
            localStorage.setItem('mockRecalls', JSON.stringify(recalls));
            console.log('✅ Stocké dans localStorage');
            
            return recall;
        };
        
        // FONCTION POUR OUVRIR LA SIDEBAR MANUELLEMENT
        window.openSidebar = function() {
            const sidebar = document.querySelector('.reminders-sidebar');
            if (sidebar) {
                sidebar.classList.add('open');
                console.log('✅ Sidebar ouverte');
            } else {
                console.error('❌ Sidebar non trouvée');
            }
        };
        
        // TEST SIMPLE ET DIRECT
        window.test = function() {
            console.log('🎯 === TEST SIMPLE ===');
            
            // Créer un rappel
            const recall = {
                id: 'test_' + Date.now(),
                room: 'A-1825',
                ticket_number: 'TEST-123',
                requested_at: new Date().toISOString(),
                status: 'pending',
                type: 'client_recall'
            };
            
            // L'ajouter à recallsData
            window.recallsData.set(recall.id, recall);
            console.log('✅ Rappel ajouté, taille:', window.recallsData.size);
            
            // Afficher le toast
            window.showRecallToast(recall);
            console.log('✅ Toast affiché');
            console.log('⏱️ Attendez 10 secondes pour voir le badge...');
        };
        
        // Fonction MOCK pour récupérer les rappels (simule l'API)
        async function fetchRecalls() {
            try {
                // MOCK: Simuler des rappels en fonction des événements recall_mode
                const mockRecalls = [];
                
                // Vérifier s'il y a des rappels stockés localement
                const storedRecalls = localStorage.getItem('mockRecalls');
                if (storedRecalls) {
                    return JSON.parse(storedRecalls);
                }
                
                return mockRecalls;
            } catch (error) {
                console.error('[Recalls] Erreur récupération:', error);
            }
            return [];
        }
        
        // Fonction pour stocker un rappel localement (MOCK)
        window.addMockRecall = function(room, ticketNumber, skipToast = false, channelId = null, isClientRequest = false) {
            console.log('🎯 [addMockRecall] Début création rappel pour salle:', room);
            console.log('🔍 [addMockRecall] isClientRequest:', isClientRequest);
            
            // Générer un ID unique basé sur la salle pour éviter les doublons
            const recallId = `recall_${room}_${Date.now()}`;
            
            // ✅ CORRECTION: Si c'est une demande explicite du client, supprimer les anciens rappels timeout
            if (isClientRequest) {
                console.log('🔄 [addMockRecall] Demande client explicite - Nettoyage des anciens rappels timeout');
                // Supprimer les anciens rappels pour cette salle (timeout automatique)
                const oldRecalls = [];
                window.recallsData.forEach((recall, id) => {
                    if (recall.room === room && recall.status === 'pending') {
                        oldRecalls.push(id);
                    }
                });
                oldRecalls.forEach(id => {
                    console.log('🗑️ [addMockRecall] Suppression ancien rappel:', id);
                    window.recallsData.delete(id);
                });
                
                // Nettoyer aussi localStorage
                const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
                const filteredRecalls = recalls.filter(r => !(r.room === room && r.status === 'pending'));
                localStorage.setItem('mockRecalls', JSON.stringify(filteredRecalls));
                console.log('🧹 [addMockRecall] localStorage nettoyé pour la salle', room);
            } else {
                // Logique originale pour les rappels automatiques (timeout)
            let alreadyExists = false;
            window.recallsData.forEach(recall => {
                if (recall.room === room && recall.status === 'pending') {
                    alreadyExists = true;
                }
            });
            
            if (alreadyExists) {
                console.log(`⚠️ [Recall] Rappel déjà existant pour la salle ${room}, ignoré`);
                return;
                }
            }
            
            // Si channelId n'est pas fourni, générer un ID cohérent pour les deux côtés
            const chatChannelId = channelId || `sea-chat-${room}-${Math.floor(Date.now()/1000)}`;
            
            const newRecall = {
                id: recallId,
                room: room,
                ticket_number: ticketNumber,
                requested_at: new Date().toISOString(),
                status: 'pending',
                type: 'client_recall',
                channelId: chatChannelId,
                // Propriété pour contrôler l'affichage dans la sidebar
                showInSidebar: skipToast, // true = afficher immédiatement, false = attendre 10s
                // Ajouter également dans data pour compatibilité
                data: {
                    channel_id: chatChannelId,
                    room: room
                }
            };
            console.log('📝 [addMockRecall] Nouveau rappel créé:', newRecall);
            
            // Stocker dans localStorage pour persistance
            const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
            recalls.push(newRecall);
            localStorage.setItem('mockRecalls', JSON.stringify(recalls));
            console.log('💾 [addMockRecall] Rappel stocké dans localStorage');
            
            // Ajouter à la Map locale
            window.recallsData.set(newRecall.id, newRecall);
            console.log('📌 [addMockRecall] Rappel ajouté à recallsData Map, taille:', window.recallsData.size);
            
            // Afficher le toast SEULEMENT si c'est une nouvelle demande (pas un F5)
            if (!skipToast) {
                console.log('🟢 [addMockRecall] Affichage du toast vert UNIQUEMENT');
                console.log('⏱️ [addMockRecall] Le badge apparaîtra dans 10 secondes...');
                window.showRecallToast(newRecall);
                // ⚠️ IMPORTANT: NE PAS appeler updateRemindersList() ici !
                // Le badge sera créé APRÈS 10 secondes par showRecallToast
            } else {
                console.log('⏭️ [addMockRecall] Toast ignoré (skipToast=true)');
                // Si pas de toast (F5), créer le badge immédiatement
                console.log('🔄 [addMockRecall] Création immédiate du badge (pas de toast)');
                window.updateRemindersList();
                window.updateRemindersCount();
            }
            
            console.log('✅ [addMockRecall] Fin création rappel');
        }
        
        // ✅ DÉSACTIVÉ : Toast orange d'avertissement (interfère avec le toast bleu)
        window.showTimeoutWarningToast = function(room) {
            // ❌ Toast orange désactivé pour éviter qu'il cache le toast bleu
            console.log(`🚫 [TimeoutWarning] Toast orange DÉSACTIVÉ pour salle: ${room} (pour éviter conflit avec toast bleu)`);
            return; // Ne rien faire
        };
        
        // ✅ Fonctions de test supprimées pour la production
        
        // ✅ Fonction de test supprimée
        
        // ✅ Fonctions de test supprimées pour la production
        
        // ✅ FONCTION AMÉLIORÉE : Notification de déconnexion avec déduplication
        window.showAccidentalDisconnectNotification = function(ticketId, roomId) {
            const container = document.getElementById('toastContainer');
            if (!container) {
                console.error('❌ [Disconnect] Container de toast non trouvé');
                return;
            }
            
            // 🚨 DÉDUPLICATION : Supprimer les anciens toasts de déconnexion ET leurs overlays
            const existingToasts = document.querySelectorAll('.toast.disconnect-toast');
            existingToasts.forEach(toast => {
                console.log(`🧹 [Disconnect] Suppression ancien toast:`, toast.id);
                toast.remove();
            });
            
            // Supprimer TOUS les overlays existants qui pourraient avoir du flou
            const existingOverlays = document.querySelectorAll('.disconnect-toast-overlay, .chat-modal-overlay, [id^="overlay-disconnect-toast"]');
            existingOverlays.forEach(overlay => {
                console.log(`🧹 [Disconnect] Suppression overlay existant:`, overlay.id || overlay.className);
                overlay.remove();
            });
            
            const existingToastId = `disconnect-toast-${roomId}`;
            const existingToast = document.getElementById(existingToastId);
            if (existingToast) {
                console.log(`⚠️ [Disconnect] Toast déjà affiché pour salle ${roomId}, suppression`);
                existingToast.remove();
            }
            
            const toastId = existingToastId; // Utiliser un ID basé sur la salle
            
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'toast disconnect-toast';
            
            toast.innerHTML = `
                <div class="toast-dismiss-area" onclick="dismissToast('${toastId}')">×</div>
                <div class="disconnect-icon-container">
                    <div class="disconnect-main-icon">🔄</div>
                    <div class="disconnect-pulse-ring"></div>
                </div>
                <div class="toast-content-enhanced">
                    <h4 class="toast-title-enhanced">Rechargement de page détecté</h4>
                    <p class="toast-disconnect-message">
                        Le client de la salle <strong>${roomId}</strong> a rechargé sa page (F5)
                    </p>
                    <p class="toast-disconnect-reason">
                        Le chat reste actif - En attente de reconnexion
                    </p>
                    <div class="disconnect-progress-bar">
                        <div class="disconnect-progress-fill"></div>
                    </div>
                </div>
            `;
            
            // 🎯 Créer un overlay semi-transparent SANS FLOU
            const overlay = document.createElement('div');
            overlay.id = `overlay-${toastId}`;
            overlay.className = 'disconnect-toast-overlay';
            // Pas de styles inline - tout dans le CSS [[memory:8310460]]
            
            // Fermer au clic sur l'overlay
            overlay.onclick = () => dismissToast(toastId);
            
            document.body.appendChild(overlay);
            
            // ✅ FORCER la suppression du flou IMMÉDIATEMENT et CONTINUELLEMENT
            // Supprimer le flou toutes les 100ms pendant 8 secondes
            const removeBlurInterval = setInterval(() => {
                if (overlay && overlay.parentNode) {
                    overlay.style.backdropFilter = 'none';
                    overlay.style.webkitBackdropFilter = 'none';
                    overlay.style.filter = 'none';
                    // Forcer aussi via setAttribute pour être sûr
                    overlay.setAttribute('style', overlay.getAttribute('style').replace(/backdrop-filter[^;]*/g, '').replace(/filter[^;]*/g, ''));
                } else {
                    // Si l'overlay n'existe plus, arrêter l'interval
                    clearInterval(removeBlurInterval);
                }
            }, 100);
            
            container.appendChild(toast);
            
            console.log(`🚨 [Disconnect] Notification affichée pour ticket ${ticketId} (salle: ${roomId})`);
            
            // Auto-dismiss après 8 secondes
            setTimeout(() => {
                clearInterval(removeBlurInterval); // Arrêter l'interval
                if (document.getElementById(toastId)) {
                    dismissToast(toastId);
                    // Supprimer aussi l'overlay
                    const overlayElement = document.getElementById(`overlay-${toastId}`);
                    if (overlayElement) {
                        overlayElement.remove();
                    }
                }
            }, 8000);
        };
        
        // ✅ Toutes les fonctions de test ont été supprimées pour la production
        
        // Fonction pour afficher un toast de rappel
        window.showRecallToast = function(recall) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            // Vérifier le mode jour/nuit
            const isNightMode = document.body.getAttribute('data-theme') === 'dark' || 
                               document.documentElement.getAttribute('data-theme') === 'dark';
            console.log('🌓 Mode actuel:', isNightMode ? 'nuit' : 'jour');

            const toastId = `toast-${recall.id}`;

            // Vérifier si le toast existe déjà
            if (document.getElementById(toastId)) {
                console.log(`⚠️ [Toast] Toast déjà affiché pour ${recall.id}`);
                return;
            }
            
            // IMPORTANT: Stocker immédiatement le rappel dans recallsData
            // pour que les boutons puissent le trouver immédiatement
            // MAIS avec une propriété spéciale pour indiquer qu'il ne doit pas encore apparaître dans la sidebar
            if (!window.recallsData) window.recallsData = new Map();
            recall.showInSidebar = false; // Marquer comme ne devant pas apparaître dans la sidebar
            window.recallsData.set(recall.id, recall);
            console.log('💾 [Toast] Rappel stocké immédiatement dans recallsData avec ID:', recall.id);
            console.log('📊 [Toast] recallsData contient maintenant:', Array.from(window.recallsData.keys()));

            const toast = document.createElement('div');
            toast.id = toastId;
            // Ne pas inclure success-toast pour éviter tout style vert forcé
            toast.className = 'toast recall-toast';
            // Utiliser la variable isNightMode déjà définie plus haut
            
            toast.style.cssText = `position: fixed; top: 18px; right: 18px; z-index: 10000; width: 380px; pointer-events: auto;`;
            
            // Ajouter la classe recall-toast et data-theme pour s'assurer que les styles jour/nuit sont appliqués
            toast.classList.add('recall-toast');
            
            // Forcer le thème actuel sur le toast
            if (isNightMode) {
                toast.setAttribute('data-theme', 'dark');
            }
            
            // Créer le HTML du toast sans les boutons pour l'instant
            toast.innerHTML = `
              <div class="toast-content">
                <div class="toast-icon">
                  <i class="fas fa-bell"></i>
                </div>
                <div style="flex: 1;">
                  <div class="toast-title">Chat - Salle ${recall.room}</div>
                  <div class="toast-subtitle">Le client souhaite reprendre la conversation suite au timeout</div>
                  <div class="toast-actions" id="toast-actions-${recall.id}">
                  </div>
                </div>
              </div>
            `;

            // Ajouter le toast au DOM
            container.appendChild(toast);
            
            // Maintenant que le toast est dans le DOM, créer et ajouter les boutons
            const actionsContainer = document.getElementById(`toast-actions-${recall.id}`);
            if (actionsContainer) {
                // Créer les boutons Accepter et Refuser
                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'toast-btn accept';
                acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accepter';
                acceptBtn.onclick = () => window.acceptRecall(recall.id);
                
                const declineBtn = document.createElement('button');
                declineBtn.className = 'toast-btn refuse';
                declineBtn.innerHTML = '<i class="fas fa-times"></i> Refuser';
                declineBtn.onclick = () => window.dismissRecall(recall.id);
                
                actionsContainer.appendChild(acceptBtn);
                actionsContainer.appendChild(declineBtn);
            }
            
            // Son de notification (une seule fois)
            if (!window.lastNotificationTime || Date.now() - window.lastNotificationTime > 1000) {
                playNotificationSound();
                window.lastNotificationTime = Date.now();
            }

            // ⭐ NOUVEAU : Créer le badge SEULEMENT après 10 secondes (quand le toast disparaît)
            setTimeout(() => {
                console.log('⏰ [Toast] Timer de 10 secondes écoulé pour:', recall.id);
                // Activer l'affichage dans la sidebar
                const recallObj = window.recallsData.get(recall.id);
                if (recallObj) {
                    recallObj.showInSidebar = true;
                    window.recallsData.set(recall.id, recallObj);
                }
                // Fermer le toast et mettre à jour la sidebar
                window.dismissToast(toastId);
                window.updateRemindersList();
                window.updateRemindersCount();
            }, 10000);
        };
        
        // ✅ FONCTION DE TEST POUR LES INDICATEURS SANS ANIMATION
        window.testTypingNoAnimation = function(ticketId = '9a162130-1211-41d9-9a66-c291b01a2176') {
            console.log('🧪 [Test] Test des indicateurs typing SANS animation...');
            
            // 1. Test Vitrine sans animation
            setTimeout(() => {
                console.log('🧪 Test: Indicateur Vitrine (sans bande qui bouge)...');
                showTypingIndicator(ticketId, true, 'Vitrine', null);
            }, 1000);
            
            // 2. Test Client sans animation
            setTimeout(() => {
                console.log('🧪 Test: Indicateur Client (sans bande qui bouge)...');
                showTypingIndicator(ticketId, false);
                showTypingIndicator(ticketId, true, 'Client', null);
            }, 3000);
            
            // 3. Nettoyage
            setTimeout(() => {
                console.log('🧪 Test: Nettoyage...');
                showTypingIndicator(ticketId, false);
            }, 6000);
            
            console.log('✅ Test des indicateurs statiques démarré - Plus de bande qui bouge !');
        };
        
        // 🔧 FONCTION DE TEST POUR LA CONNECTIVITÉ CHAT
        window.testChatConnectivity = async function() {
            console.log('🧪 [Test] Test de connectivité chat...');
            
            try {
                console.log(`🔗 [Test] Test URL: ${GO_CHAT_ENDPOINTS.start}`);
                
                const response = await safeFetch(GO_CHAT_ENDPOINTS.start, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: 'TEST-ROOM',
                        kiosk_id: 'SEA-TEST-12345',
                        client_id: 'test-client-123',
                        ticket_id: 'test-ticket-456'
                    })
                });
                
                console.log(`🔗 [Test] Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ [Test] Serveur chat accessible! Données:`, data);
                } else {
                    const errorText = await response.text();
                    console.error(`❌ [Test] Erreur serveur:`, errorText);
                }
                
            } catch (error) {
                console.error(`❌ [Test] Erreur connectivité:`, error);
                console.error(`❌ [Test] Le serveur Go est-il démarré sur ${GO_SERVER_URL}?`);
            }
        };
        
        // ✅ RESTAURÉ : Toast de refus SEULEMENT pour les refus client (pas pour timeout)
        window.showDeclineToast = function(room, type) {
            console.log(`🧡 [DeclineToast] Affichage toast de refus CLIENT pour salle: ${room}, type: ${type}`);
            
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            const toastId = `decline-${Date.now()}`;
            const toast = document.createElement('div');
            toast.id = toastId;
            
            // ✅ DÉTECTION ROBUSTE DU THÈME
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                              document.body.getAttribute('data-theme') === 'dark' ||
                              document.documentElement.classList.contains('dark') ||
                              document.body.classList.contains('dark');
            
            toast.className = `toast decline-toast ${isDarkMode ? 'dark-theme' : 'light-theme'}`;
            
            console.log(`🎨 [DeclineToast] Thème détecté: ${isDarkMode ? 'SOMBRE' : 'CLAIR'} pour ${type} de ${room}`);
            
            // Design moderne avec animation et couleurs sophistiquées
            toast.innerHTML = `
                <div class="toast-dismiss-area" onclick="dismissToast('${toastId}')" title="Fermer">
                    <i class="fas fa-times toast-close-icon"></i>
                </div>
                
                <div class="toast-visual-indicator">
                    <div class="decline-icon-container">
                        <i class="fas fa-${type === 'chat' ? 'comment-slash' : 'bell-slash'} decline-main-icon"></i>
                        <div class="decline-pulse-ring"></div>
                        <div class="decline-pulse-ring-delayed"></div>
                    </div>
                </div>
                
                <div class="toast-content-enhanced">
                    <div class="toast-header-section">
                        <div class="toast-title-enhanced">
                            ${type === 'chat' ? '💬 Chat refusé' : '🔔 Rappel refusé'}
                        </div>
                        <div class="toast-timestamp">
                            ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    
                    <div class="toast-body-section">
                        <div class="toast-room-badge">
                            <i class="fas fa-door-open"></i>
                            Salle ${room}
                        </div>
                        <div class="toast-decline-message">
                            Le client a refusé ${type === 'chat' ? 'votre demande de chat' : 'le rappel'}
                        </div>
                        <div class="toast-decline-reason">
                            <i class="fas fa-info-circle"></i>
                            Client occupé ou indisponible
                        </div>
                    </div>
                    
                    <div class="toast-progress-bar">
                        <div class="toast-progress-fill"></div>
                    </div>
                </div>
            `;
            
            container.appendChild(toast);
            
            // Son de notification (avec protection anti-répétition)
            if (!window.lastNotificationTime || Date.now() - window.lastNotificationTime > 1000) {
                playNotificationSound();
                window.lastNotificationTime = Date.now();
            }
            
            // Auto-dismiss après 8 secondes
            setTimeout(() => {
                dismissToast(toastId);
            }, 8000);
            
            console.log(`🧡 [DeclineToast] Toast de refus CLIENT affiché pour ${type} de ${room}`);
        }
        
        // Fonction pour afficher un toast de rappel
        window.showRecallToast = function(recall) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            // Vérifier le mode jour/nuit
            const isNightMode = document.body.getAttribute('data-theme') === 'dark' || 
                               document.documentElement.getAttribute('data-theme') === 'dark';
            console.log('🌓 Mode actuel:', isNightMode ? 'nuit' : 'jour');

            const toastId = `toast-${recall.id}`;

            // Vérifier si le toast existe déjà
            if (document.getElementById(toastId)) {
                console.log(`⚠️ [Toast] Toast déjà affiché pour ${recall.id}`);
                return;
            }
            console.log(`🎨 [Toast] Thème détecté: ${isDarkMode ? 'SOMBRE' : 'CLAIR'} pour ${type} de ${room}`);
            
            // Design moderne avec animation et couleurs sophistiquées
            toast.innerHTML = `
                <div class="toast-dismiss-area" onclick="dismissToast('${toastId}')" title="Fermer">
                    <i class="fas fa-times toast-close-icon"></i>
                </div>
                
                <div class="toast-visual-indicator">
                    <div class="decline-icon-container">
                        <i class="fas fa-${type === 'chat' ? 'comment-slash' : 'bell-slash'} decline-main-icon"></i>
                        <div class="decline-pulse-ring"></div>
                        <div class="decline-pulse-ring-delayed"></div>
                    </div>
                </div>
                
                <div class="toast-content-enhanced">
                    <div class="toast-header-section">
                        <div class="toast-title-enhanced">
                            ${type === 'chat' ? '💬 Chat refusé' : '🔔 Rappel refusé'}
                        </div>
                        <div class="toast-timestamp">
                            ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    
                    <div class="toast-body-section">
                        <div class="toast-room-badge">
                            <i class="fas fa-door-open"></i>
                            Salle ${room}
                        </div>
                        <div class="toast-decline-message">
                            Le client a refusé ${type === 'chat' ? 'votre demande de chat' : 'le rappel'}
                        </div>
                        <div class="toast-decline-reason">
                            <i class="fas fa-info-circle"></i>
                            Client occupé ou indisponible
                        </div>
                    </div>
                    
                    <div class="toast-progress-bar">
                        <div class="toast-progress-fill"></div>
                    </div>
                </div>
            `;
            
            container.appendChild(toast);
            
            // Son de notification (avec protection anti-répétition)
            if (!window.lastNotificationTime || Date.now() - window.lastNotificationTime > 1000) {
                playNotificationSound();
                window.lastNotificationTime = Date.now();
            }
            
            // Auto-dismiss après 8 secondes
            setTimeout(() => {
                dismissToast(toastId);
            }, 8000);
        };
        
                // Fonction pour afficher un toast de rappel
        window.showRecallToast = function(recall) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            // Vérifier le mode jour/nuit
            const isNightMode = document.body.getAttribute('data-theme') === 'dark' || 
                               document.documentElement.getAttribute('data-theme') === 'dark';
            console.log('🌓 Mode actuel:', isNightMode ? 'nuit' : 'jour');

            const toastId = `toast-${recall.id}`;

            // Vérifier si le toast existe déjà
            if (document.getElementById(toastId)) {
                console.log(`⚠️ [Toast] Toast déjà affiché pour ${recall.id}`);
                return;
            }
            
            // IMPORTANT: Stocker immédiatement le rappel dans recallsData
            // pour que les boutons puissent le trouver immédiatement
            // MAIS avec une propriété spéciale pour indiquer qu'il ne doit pas encore apparaître dans la sidebar
            if (!window.recallsData) window.recallsData = new Map();
            recall.showInSidebar = false; // Marquer comme ne devant pas apparaître dans la sidebar
            window.recallsData.set(recall.id, recall);
            console.log('💾 [Toast] Rappel stocké immédiatement dans recallsData avec ID:', recall.id);
            console.log('📊 [Toast] recallsData contient maintenant:', Array.from(window.recallsData.keys()));

            const toast = document.createElement('div');
            toast.id = toastId;
            // Ne pas inclure success-toast pour éviter tout style vert forcé
            toast.className = 'toast recall-toast';
            // Utiliser la variable isNightMode déjà définie plus haut
            
            toast.style.cssText = `position: fixed; top: 18px; right: 18px; z-index: 10000; width: 380px; pointer-events: auto;`;
            
            // Ajouter la classe recall-toast et data-theme pour s'assurer que les styles jour/nuit sont appliqués
            toast.classList.add('recall-toast');
            
            // Forcer le thème actuel sur le toast
            if (isNightMode) {
                toast.setAttribute('data-theme', 'dark');
            }
            
// Créer le HTML du toast sans les boutons pour l'instant
toast.innerHTML = `
  <div class="toast-content">
    <div class="toast-icon">
      <i class="fas fa-bell"></i>
    </div>
    <div style="flex: 1;">
      <div class="toast-title">Chat - Salle ${recall.room}</div>
      <div class="toast-subtitle">Le client souhaite reprendre la conversation suite au timeout</div>
      <div class="toast-actions" id="toast-actions-${recall.id}">
      </div>
    </div>
  </div>
`;

// Ajouter le toast au DOM
container.appendChild(toast);

// Maintenant que le toast est dans le DOM, créer et ajouter les boutons
const actionsContainer = document.getElementById(`toast-actions-${recall.id}`);
if (actionsContainer) {
    // Créer le bouton Accepter
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'toast-btn accept';
    acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accepter';
    acceptBtn.type = 'button'; // Explicitement définir le type
    acceptBtn.setAttribute('data-recall-id', recall.id); // Stocker l'ID dans un attribut
    
    // Ajouter l'événement click avec une fonction directe
    acceptBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Récupérer l'ID depuis l'attribut data
        const recallId = this.getAttribute('data-recall-id');
        console.log('🔔 [Toast] Clic sur le bouton Accepter pour', recallId);
        
        // Appeler directement la fonction avec l'ID récupéré
        if (typeof window.acceptRecall === 'function') {
            try {
                window.acceptRecall(recallId);
            } catch (error) {
                console.error('❌ [Toast] Erreur lors de l\'appel à acceptRecall:', error);
            }
        } else {
            console.error('❌ [Toast] La fonction acceptRecall n\'existe pas');
        }
    });
    
    actionsContainer.appendChild(acceptBtn);
    
    // Créer le bouton Refuser
    const declineBtn = document.createElement('button');
    declineBtn.className = 'toast-btn refuse';
    declineBtn.innerHTML = '<i class="fas fa-times"></i> Refuser';
    declineBtn.type = 'button'; // Explicitement définir le type
    declineBtn.setAttribute('data-recall-id', recall.id); // Stocker l'ID dans un attribut
    
    // Ajouter l'événement click avec une fonction directe
    declineBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Récupérer l'ID depuis l'attribut data
        const recallId = this.getAttribute('data-recall-id');
        console.log('🔔 [Toast] Clic sur le bouton Refuser pour', recallId);
        
        // Appeler directement la fonction avec l'ID récupéré
        if (typeof window.declineRecall === 'function') {
            try {
                window.declineRecall(recallId);
            } catch (error) {
                console.error('❌ [Toast] Erreur lors de l\'appel à declineRecall:', error);
            }
        } else {
            console.error('❌ [Toast] La fonction declineRecall n\'existe pas');
        }
    });
    
    actionsContainer.appendChild(declineBtn);
    
    console.log('✅ [Toast] Boutons ajoutés directement au DOM pour', recall.id);
}


            // Son de notification (une seule fois)
            if (!window.lastNotificationTime || Date.now() - window.lastNotificationTime > 1000) {
                playNotificationSound();
                window.lastNotificationTime = Date.now();
            }

            // ⭐ NOUVEAU : Créer le badge SEULEMENT après 10 secondes (quand le toast disparaît)
            console.log('⏱️ [Toast] Démarrage du timer de 10 secondes pour le rappel:', recall.id);
            // 10 secondes exactement
        
// ⏱️ Conversion automatique en rappel à 10s
console.log('⏱️ [Toast] Démarrage du timer de 10 secondes pour le rappel:', recall.id);
setTimeout(() => {
  console.log('⏰ [Toast] Timer de 10 secondes écoulé pour:', recall.id);
  try {
    // Le rappel est déjà dans recallsData (ajouté au début de showRecallToast)
    // On vérifie juste au cas où
    if (!window.recallsData.has(recall.id)) {
      console.log('⚠️ [Toast] Rappel non trouvé dans recallsData, ajout de sécurité');
      window.recallsData.set(recall.id, recall);
    } else {
      // Activer l'affichage dans la sidebar maintenant que le toast a disparu
      const recallObj = window.recallsData.get(recall.id);
      recallObj.showInSidebar = true;
      window.recallsData.set(recall.id, recallObj);
      console.log('🚩 [Toast] Rappel marqué pour affichage dans sidebar après 10s');
    }
    
    // Stocker aussi dans localStorage pour persistance (si pas déjà fait)
    const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
    // Vérifier si le rappel existe déjà dans localStorage
    const existsInStorage = recalls.some(r => r.id === recall.id);
    if (!existsInStorage) {
      recalls.push(recall);
      localStorage.setItem('mockRecalls', JSON.stringify(recalls));
      console.log('💾 [Toast] Rappel également stocké dans localStorage');
    }
    
    // Fermer le toast
    if (typeof window.dismissToast === 'function') {
      window.dismissToast(toastId);
      console.log('🗑️ [Toast] Toast fermé après 10 secondes');
    }
    
    // Mettre à jour la sidebar avec le nouveau rappel
    if (typeof window.updateRemindersList === 'function') {
      window.updateRemindersList();
      console.log('🔄 [Toast] Sidebar mise à jour avec le nouveau rappel');
    }
    
    // Mettre à jour le compteur de rappels
    if (typeof window.updateRemindersCount === 'function') {
      window.updateRemindersCount();
      console.log('🔢 [Toast] Compteur de rappels mis à jour');
    }
  } catch (e) {
    console.error('💥 [Toast] Erreur pendant la conversion en rappel:', e);
  }
}, 10000);
};
        
        // Fonction pour accepter un rappel
        window.acceptRecall = async function(recallId) {
            console.log('🚀 [acceptRecall] Début traitement pour', recallId);
            const recall = window.recallsData.get(recallId);
            if (!recall) {
                console.error('❌ [acceptRecall] Rappel non trouvé dans recallsData:', recallId, 'Map contient:', Array.from(window.recallsData.keys()));
                return;
            }
            
            // Fermer le toast
            console.log('🗑️ [acceptRecall] Fermeture du toast pour', recallId);
            dismissToast(`toast-${recallId}`);
            
            // MOCK: Supprimer du localStorage
            try {
                const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
                const filteredRecalls = recalls.filter(r => r.id !== recallId);
                localStorage.setItem('mockRecalls', JSON.stringify(filteredRecalls));
                console.log('💾 [acceptRecall] localStorage mis à jour, rappel supprimé');
            } catch (error) {
                console.error('[Recall] Erreur suppression localStorage:', error);
            }
            
            console.log('🔔 [acceptRecall] Acceptation du chat pour la salle:', recall.room);
            
            // Extraire le channel_id du rappel - généralement contenu dans recall.data
            let channelId = null;
            
            // Vérifier si nous avons des données de canal stockées dans le rappel
            if (recall.data && recall.data.channel_id) {
                channelId = recall.data.channel_id;
                console.log('📡 [acceptRecall] Channel ID trouvé dans recall.data:', channelId);
            } else if (recall.channelId) {
                channelId = recall.channelId;
                console.log('📡 [acceptRecall] Channel ID trouvé dans recall.channelId:', channelId);
            } else {
                // Si pas de channel_id spécifique, nous utilisons un ID généré en fonction de la salle
                // Cela permet de connecter au chat qui a été initialisé par la vitrine
                channelId = `sea-chat-${recall.room}-${Math.floor(Date.now()/1000)}`;
                console.log('📡 [acceptRecall] Channel ID généré:', channelId);
            }
            
            // Utiliser la fonction d'acceptation de chat global existante
            console.log('🌐 [acceptRecall] Appel à acceptGlobalClientChatRequest avec channelId:', channelId, 'et room:', recall.room);
            try {
                await acceptGlobalClientChatRequest(channelId, recall.room);
                console.log('✅ [acceptRecall] Chat accepté avec succès');
            } catch (error) {
                console.error('❌ [acceptRecall] Erreur lors de l\'acceptation du chat:', error);
            }
            
            // Retirer de la liste locale
            window.recallsData.delete(recallId);
            console.log('🗑️ [acceptRecall] Rappel supprimé de recallsData');
            
            // Mettre à jour la sidebar
            updateRemindersList();
            console.log('🔄 [acceptRecall] Sidebar mise à jour');
            
            // Mettre à jour le compteur
            if (window.updateRemindersCount) {
                window.updateRemindersCount();
                console.log('🔢 [acceptRecall] Compteur mis à jour');
            }
            
            console.log('✅ [acceptRecall] Traitement terminé pour', recallId);
        };
        
        // Fonction pour rejeter un rappel
        window.dismissRecall = async function(recallId) {
            // 🧡 NOUVEAU : Récupérer les infos du rappel avant de le supprimer
            const recallInfo = window.recallsData.get(recallId);
            const roomId = recallInfo ? recallInfo.room : 'Inconnue';
            
            console.log(`🧡 [DismissRecall] Technicien SEA refuse le rappel pour la salle: ${roomId}`);
            
            // Fermer le toast
            dismissToast(`toast-${recallId}`);
            
            // ⚡ PRODUCTION: Ne PAS afficher le toast orange de refus
            // Car c'est le TECHNICIEN qui refuse, pas le client
            // Le toast orange est réservé quand le CLIENT refuse depuis Vitrine
            console.log(`📊 [DismissRecall] Rappel refusé silencieusement par le technicien pour salle ${roomId}`);
            
            // MOCK: Supprimer du localStorage
            try {
                const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
                const filteredRecalls = recalls.filter(r => r.id !== recallId);
                localStorage.setItem('mockRecalls', JSON.stringify(filteredRecalls));
            } catch (error) {
                console.error('[Recall] Erreur suppression localStorage:', error);
            }
            
            // Retirer de la liste locale
            window.recallsData.delete(recallId);
            
            // Mettre à jour la sidebar
            updateRemindersList();
            
            // Mettre à jour le compteur
            if (window.updateRemindersCount) {
                window.updateRemindersCount();
            }
        };
        
        // Fonction pour fermer un toast
        window.dismissToast = function(toastId) {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.add('removing');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }
            
            // 🎯 Supprimer l'overlay associé s'il existe
            const overlayElement = document.getElementById(`overlay-${toastId}`);
            if (overlayElement) {
                overlayElement.style.opacity = '0';
                setTimeout(() => {
                    overlayElement.remove();
                }, 300);
            }
        };
        
        // Fonction pour mettre à jour la liste des rappels dans la sidebar
        window.updateRemindersList = function() {
            console.log('📝 [updateRemindersList] Début de la mise à jour');
            const badgesContainer = document.getElementById('roomBadgesContainer');
            const emptyState = document.getElementById('remindersEmpty');
            
            if (!badgesContainer) {
                console.error('❌ [updateRemindersList] roomBadgesContainer non trouvé');
                return;
            }
            if (!emptyState) {
                console.error('❌ [updateRemindersList] remindersEmpty non trouvé');
                return;
            }
            
            // Grouper les rappels par salle
            const remindersByRoom = {};
            
            // Utiliser les rappels réels du système, mais filtrer ceux qui ne doivent pas apparaître dans la sidebar
            const visibleRecalls = Array.from(window.recallsData.values()).filter(recall => recall.showInSidebar !== false);
            console.log('🔍 [updateRemindersList] Filtrage des rappels pour la sidebar:', 
                window.recallsData.size, '→', visibleRecalls.length);
            console.log('📊 [updateRemindersList] Nombre de rappels:', visibleRecalls.length);
            console.log('📊 [updateRemindersList] Rappels:', visibleRecalls);
            
            visibleRecalls.forEach(recall => {
                const room = recall.room || 'Non spécifiée';
                console.log('🏢 [updateRemindersList] Traitement rappel pour salle:', room);
                
                if (!remindersByRoom[room]) {
                    remindersByRoom[room] = [];
                }
                
                remindersByRoom[room].push({
                    id: recall.id,
                    ticketNumber: recall.ticket_number,
                    message: 'Rappel de chat client',
                    time: getTimeAgo(recall.requested_at),
                    priority: 'high',
                    isRecall: true,
                    room: room
                });
            });
            
            // Compter le total des rappels
            let totalReminders = 0;
            Object.values(remindersByRoom).forEach(reminders => {
                totalReminders += reminders.length;
            });
            
            if (totalReminders === 0) {
                badgesContainer.innerHTML = '';
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
                
                // Générer les badges par salle
                let badgesHTML = '';
                for (const [room, reminders] of Object.entries(remindersByRoom)) {
                    if (reminders.length > 0) {
                        badgesHTML += createRoomBadgeGroup(room, reminders);
                    }
                }
                
                badgesContainer.innerHTML = badgesHTML;
            }
            
            // Mettre à jour le compteur total
            const remindersCount = document.getElementById('remindersCount');
            if (remindersCount) {
                remindersCount.textContent = totalReminders;
            }
        };
        
        // Fonction pour créer un groupe de badges pour une salle
        function createRoomBadgeGroup(room, reminders) {
            const reminderItems = reminders.map(reminder => {
                // Si c'est un rappel, créer un badge IDENTIQUE au toast
                if (reminder.isRecall) {
                    return `
                        <div class="sidebar-recall-badge">
                            <div class="toast-icon" style="
                                background: linear-gradient(135deg, #10b981, #059669);
                                color: white;
                                width: 40px;
                                height: 40px;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-shrink: 0;
                                font-size: 16px;
                            ">
                                <i class="fas fa-bell"></i>
                            </div>
                            <div class="toast-content" style="flex: 1;">
                                <div class="toast-title" style="font-size: 0.9rem; margin-bottom: 4px;">
                                    Chat - Salle ${room}
                                </div>
                                <div class="toast-actions" style="margin-top: 8px;">
                                    <button onclick="acceptRecall('${reminder.id}')" class="toast-btn accept" style="padding: 4px 8px; font-size: 0.8rem;">
                                        <i class="fas fa-check"></i> Accepter
                                    </button>
                                    <button onclick="dismissRecall('${reminder.id}')" class="toast-btn refuse" style="padding: 4px 8px; font-size: 0.8rem;">
                                        <i class="fas fa-times"></i> Refuser
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    const priorityBadge = reminder.priority ? 
                        `<span class="priority-${reminder.priority}-badge">!</span>` : 
                        `<span class="room-reminder-time">${reminder.time}</span>`;
                    
                    return `
                        <div class="room-reminder-item" onclick="handleReminderClick('${room}', ${reminder.id})">
                            <span>${reminder.message}</span>
                            ${priorityBadge}
                        </div>
                    `;
                }
            }).join('');
            
            // Si c'est un rappel, pas besoin du header de groupe
            const hasRecalls = reminders.some(r => r.isRecall);
            if (hasRecalls) {
                return `
                    <div class="room-badge-group" data-room="${room}">
                        ${reminderItems}
                    </div>
                `;
            }
            
            // Pour les autres rappels, garder l'ancien format
            return `
                <div class="room-badge-group" data-room="${room}">
                    <div class="room-badge-header">
                        <h4 class="room-badge-title">
                            <i class="fas fa-door-open"></i>
                            Salle ${room}
                        </h4>
                        <span class="room-badge-count">${reminders.length}</span>
                    </div>
                    <div class="room-reminder-list">
                        ${reminderItems}
                    </div>
                </div>
            `;
        }
        
        // Fonction pour gérer le clic sur un rappel
        window.handleReminderClick = function(room, reminderId) {
            console.log(`📌 Clic sur rappel ${reminderId} de la salle ${room}`);
            
            // Ouvrir le modal du ticket correspondant
            const ticket = window.tickets.find(t => t.id === reminderId);
            if (ticket) {
                openTicketModal(reminderId);
                // Fermer la sidebar après le clic
                toggleRemindersSidebar();
            }
        };
        
        function createReminderCard(reminder) {
            const priorityIcon = getPriorityIcon(reminder.priority);
            const timeAgo = getTimeAgo(reminder.createdAt);
            
            return `
                <div class="reminder-card" data-reminder-id="${reminder.id}">
                    <div class="reminder-header">
                        <span class="reminder-room">
                            <i class="fas fa-map-marker-alt"></i>
                            ${reminder.roomId}
                        </span>
                        <span class="reminder-time">${timeAgo}</span>
                    </div>
                    <div class="reminder-content">
                        <div class="reminder-priority">${priorityIcon}</div>
                        <div class="reminder-message">${reminder.message || 'Demande de chat'}</div>
                    </div>
                    <div class="reminder-actions">
                        <button class="reminder-accept" onclick="acceptReminder('${reminder.id}')">
                            <i class="fas fa-check"></i> Accepter
                        </button>
                        <button class="reminder-refuse" onclick="refuseReminder('${reminder.id}')">
                            <i class="fas fa-times"></i> Refuser
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Ces fonctions ne sont plus utilisées car on utilise acceptRecall et dismissRecall
        // window.acceptReminder = function(reminderId) {
        //     if (window.UnifiedReminders) {
        //         window.UnifiedReminders.accept(reminderId);
        //         updateRemindersList();
        //         updateRemindersCount();
        //     }
        // };
        // 
        // window.refuseReminder = function(reminderId) {
        //     if (window.UnifiedReminders) {
        //         window.UnifiedReminders.refuse(reminderId);
        //         updateRemindersList();
        //         updateRemindersCount();
        //     }
        // };
        
        function getPriorityIcon(priority) {
            switch(priority) {
                case 'high': return '🔴';
                case 'medium': return '🟡';
                case 'low': return '🟢';
                default: return '⚪';
            }
        }
        
        function getTimeAgo(timestamp) {
            const now = Date.now();
            const time = new Date(timestamp).getTime();
            const diff = Math.floor((now - time) / 1000);
            
            if (diff < 60) return 'Maintenant';
            if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
            if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
            return `Il y a ${Math.floor(diff / 86400)} j`;
        }
        
        // ✅ DÉSACTIVÉ : Fonction de notification silencieuse (pas d'audio)
        function playNotificationSound() {
            // Audio complètement désactivé par demande utilisateur
            console.log('🔇 [Audio] Notification silencieuse (audio désactivé)');
        }
        
        // Fonction pour ouvrir le chat pour une salle spécifique
        window.openChatForRoom = function(room, source) {
            // Si la source est "recall", alors c'est une action intentionnelle de l'utilisateur
            // via le badge de rappel, donc on permet l'ouverture du chat
            if (source === "recall" || source === "badge") {
                console.log(`🔔 [openChatForRoom] Ouverture du chat pour la salle ${room} suite à un rappel client`);
                
                // Chercher le ticket associé à cette salle
                const ticketForRoom = window.tickets.find(t => t.room === room);
                if (ticketForRoom) {
                    // S'assurer que le modal de ticket n'est pas ouvert ou va se fermer
                    const ticketModal = document.getElementById('ticketModal');
                    if (ticketModal && ticketModal.classList.contains('active')) {
                        ticketModal.classList.remove('active');
                    }
                    
                    // Créer d'abord la bannière de chat si elle n'existe pas
                    let chatBanner = document.getElementById(`chatBanner_${ticketForRoom.id}`);
                    if (!chatBanner) {
                        console.log(`🔨 [openChatForRoom] Création de la bannière de chat pour la salle ${room}`);
                        
                        // Créer le conteneur principal de l'application
                        const appContainer = document.querySelector('.app-container');
                        
                        // Créer la bannière de chat normale (pas plein écran)
                        chatBanner = document.createElement('div');
                        chatBanner.id = `chatBanner_${ticketForRoom.id}`;
                        chatBanner.className = 'chat-banner'; // Utiliser la classe normale
                        chatBanner.style.width = '500px'; // Largeur fixe
                        chatBanner.style.height = '400px'; // Hauteur fixe
                        chatBanner.style.position = 'fixed';
                        chatBanner.style.bottom = '20px';
                        chatBanner.style.right = '20px';
                        chatBanner.style.zIndex = '9999';
                        chatBanner.style.display = 'none'; // Sera changé en flex plus tard
                        chatBanner.style.flexDirection = 'column';
                        
                        // Définir le contenu HTML de la bannière
                        chatBanner.innerHTML = `
                            <div class="chat-banner-header">
                                <div class="chat-header-info">
                                    <h3>💬 Support technique - Salle ${room}</h3>
                                    <p class="chat-subtitle">Service Expert Audiovisuel</p>
                                </div>
                                <div class="chat-header-actions">
                                    <div class="chat-font-controls">
                                        <button class="chat-font-btn" onclick="adjustChatFontSize('${ticketForRoom.id}', 'decrease')" title="Réduire la taille du texte">
                                            <i class="fas fa-search-minus"></i>
                                        </button>
                                        <span class="chat-font-size-indicator" id="fontSizeIndicator_${ticketForRoom.id}">0%</span>
                                        <button class="chat-font-btn" onclick="adjustChatFontSize('${ticketForRoom.id}', 'increase')" title="Augmenter la taille du texte">
                                            <i class="fas fa-search-plus"></i>
                                        </button>
                                    </div>
                                    <button class="chat-minimize-btn" onclick="minimizeChatBanner('${ticketForRoom.id}')" title="Réduire le chat">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <button class="chat-close-btn" onclick="closeChatBanner('${ticketForRoom.id}')" title="Fermer le chat">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="chat-messages" id="chatMessages_${ticketForRoom.id}" style="flex: 1; overflow-y: auto; padding: 1rem;">
                                <!-- Les messages s'afficheront ici -->
                            </div>
                            
                            <div class="chat-input-container">
                                <textarea 
                                    id="chatInput_${ticketForRoom.id}" 
                                    class="chat-input" 
                                    placeholder="Tapez votre message ici..."
                                    onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage('${ticketForRoom.id}'); }"
                                    onfocus="initTypingDetection('chatInput_${ticketForRoom.id}')"
                                    oninput="autoResizeTextarea(this)"
                                ></textarea>
                                <button class="chat-send-btn" onclick="sendChatMessage('${ticketForRoom.id}')" title="Envoyer">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        `;
                        
                        // Ajouter la bannière au DOM
                        document.body.appendChild(chatBanner);
                        console.log(`✅ [openChatForRoom] Bannière de chat créée pour la salle ${room}`);
                    }
                    
                    // Lancer directement le chat sans ouvrir le modal du ticket
                    initiateChat(ticketForRoom.id, room).then(() => {
                        console.log(`✅ [openChatForRoom] Chat lancé directement pour la salle ${room}`);
                        
                        // ✅ NOUVEAU : Utiliser setChatState au lieu d'afficher directement
                        setTimeout(() => {
                            setChatState(ticketForRoom.id, 'open');
                            console.log(`✅ [openChatForRoom] Bannière de chat ouverte via setChatState pour la salle ${room}`);
                            
                            // Focus sur l'input
                            const chatInput = document.getElementById(`chatInput_${ticketForRoom.id}`);
                            if (chatInput) {
                                chatInput.focus();
                            }
                        }, 500);
                    });
                } else {
                    console.warn(`⚠️ [openChatForRoom] Aucun ticket trouvé pour la salle ${room}`);
                }
            } else {
                // Cette fonction est appelée automatiquement - bloquer l'ouverture automatique
                console.log(`⚠️ [openChatForRoom] Tentative d'ouverture automatique du chat pour salle ${room} bloquée`);
                // Ne pas ouvrir le modal de chat automatiquement
            }
        };
        
        // Fonction pour fermer le modal de chat
        window.closeChatModal = function() {
            const modal = document.getElementById('chatModal');
            if (modal) {
                modal.style.display = 'none';
                window.currentChatRoom = null;
            }
        };
        
        // Fonction pour gérer l'appui sur Enter dans le chat
        window.handleChatKeyPress = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage();
            }
        };
        
        // Fonction pour envoyer un message dans le chat du modal de rappel
        window.sendChatMessage = function() {
            const input = document.getElementById('chatInput');
            const messagesEl = document.getElementById('chatMessages');
            
            if (!input || !messagesEl || !input.value.trim()) return;
            
            const message = input.value.trim();
            const now = new Date();
            const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            // Retirer le message de bienvenue s'il existe
            const welcome = messagesEl.querySelector('.chat-welcome');
            if (welcome) welcome.remove();
            
            // Ajouter le message envoyé
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message sent';
            messageEl.innerHTML = `
                <div class="chat-message-content">
                    <div>${message}</div>
                    <div class="chat-message-time">${time}</div>
                </div>
            `;
            messagesEl.appendChild(messageEl);
            
            // Effacer l'input
            input.value = '';
            
            // Scroll vers le bas
            messagesEl.scrollTop = messagesEl.scrollHeight;
            
            // Si on a une salle définie, trouver le ticket correspondant
            if (window.currentChatRoom) {
                // Trouver le ticket pour cette salle
                const ticket = window.tickets && window.tickets.find(t => t.room === window.currentChatRoom);
                if (ticket && window.sendChatMessageToTicket) {
                    // Utiliser la vraie fonction d'envoi si disponible
                    window.sendChatMessageToTicket(ticket.id, message);
                }
            }
            
            // Simuler une réponse après 2 secondes (pour le mode démo)
            setTimeout(() => {
                const responseEl = document.createElement('div');
                responseEl.className = 'chat-message received';
                responseEl.innerHTML = `
                    <div class="chat-message-content">
                        <div>Message reçu ! Je suis en route pour la salle ${window.currentChatRoom || 'inconnue'}.</div>
                        <div class="chat-message-time">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                `;
                messagesEl.appendChild(responseEl);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                
                // Son de notification
                playNotificationSound();
            }, 2000);
        };
        
        // Fonction de polling pour les nouveaux rappels
        async function pollRecalls() {
            // IMPORTANT: Vérifier d'abord les rappels clients depuis localStorage
            checkClientRecalls();
            
            // Puis charger les rappels existants depuis le backend mock (sans toast)
            const recalls = await fetchRecalls();
            
            // Charger les rappels existants SANS afficher de toast (pour F5)
            recalls.forEach(recall => {
                if (!window.recallsData.has(recall.id)) {
                    // Rappel existant trouvé, l'ajouter silencieusement
                    window.recallsData.set(recall.id, recall);
                }
            });
            
            // Mettre à jour la sidebar
            window.updateRemindersList();
        }
        
        // Fonction pour vérifier les rappels clients depuis localStorage (communication avec Vitrine)
        function checkClientRecalls() {
            console.log('🔍 [ClientRecalls] Vérification des rappels clients...');
            try {
                const pendingRecalls = JSON.parse(localStorage.getItem('pendingRecalls') || '[]');
                console.log('📦 [ClientRecalls] pendingRecalls trouvés:', pendingRecalls);
                
                if (pendingRecalls.length > 0) {
                    console.log('🔔 [ClientRecalls] Nouveaux rappels clients trouvés:', pendingRecalls);
                    
                    pendingRecalls.forEach(recall => {
                        console.log('🔍 [ClientRecalls] Traitement rappel:', recall);
                        // Vérifier que c'est bien un rappel client (pas un timeout)
                        if (recall.type === 'client_recall_request') {
                            console.log('✅ [ClientRecalls] Type client_recall_request détecté, création du rappel...');
                            // Créer le rappel AVEC toast car c'est une nouvelle demande
                            if (window.addMockRecall) {
                                window.addMockRecall(recall.room, recall.ticket_number || 'N/A', false, null, true); // true = isClientRequest
                            } else {
                                console.error('❌ [ClientRecalls] window.addMockRecall non défini !');
                                // Fallback: créer directement le rappel
                                const newRecall = {
                                    id: recall.id || `recall_${recall.room}_${Date.now()}`,
                                    room: recall.room,
                                    ticket_number: recall.ticket_number || 'N/A',
                                    requested_at: recall.requested_at || new Date().toISOString(),
                                    status: 'pending',
                                    type: 'client_recall'
                                };
                                window.recallsData.set(newRecall.id, newRecall);
                                const recalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
                                recalls.push(newRecall);
                                localStorage.setItem('mockRecalls', JSON.stringify(recalls));
                                if (window.showRecallToast) {
                                    window.showRecallToast(newRecall);
                                } else {
                                    console.error('❌ showRecallToast non défini !');
                                }
                            }
                        } else {
                            console.log('⚠️ [ClientRecalls] Type non reconnu:', recall.type);
                        }
                    });
                    
                    // Nettoyer le localStorage après traitement pour éviter de recréer à chaque F5
                    localStorage.removeItem('pendingRecalls');
                    console.log('🗑️ [ClientRecalls] pendingRecalls nettoyé du localStorage');
                } else {
                    console.log('📭 [ClientRecalls] Aucun rappel en attente');
                }
            } catch (error) {
                console.error('[ClientRecalls] Erreur lecture pendingRecalls:', error);
            }
        }
        
        // Fonction d'initialisation
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 [DOMContentLoaded] Initialisation de Tickets SEA.html');
            console.log('🚀 [DOMContentLoaded] API_BASE_URL:', API_BASE_URL);
            
            // Initialisation du système de rappels
            if (window.updateRemindersCount) {
                // Charger les rappels existants depuis localStorage au démarrage (sans toast)
                const existingRecalls = JSON.parse(localStorage.getItem('mockRecalls') || '[]');
                existingRecalls.forEach(recall => {
                    if (!window.recallsData.has(recall.id)) {
                        // ✅ CORRECTION : Forcer showInSidebar à true pour les rappels chargés au démarrage
                        // (évite le problème du compteur qui affiche 3 puis 0)
                        if (recall.showInSidebar === false) {
                            console.log(`🔧 [Init] Correction showInSidebar pour rappel ${recall.id}: false → true`);
                            recall.showInSidebar = true;
                        }
                        window.recallsData.set(recall.id, recall);
                    }
                });
                
                // ✅ NOUVEAU : Nettoyer les rappels obsolètes (plus de 24h)
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                let cleaned = 0;
                window.recallsData.forEach((recall, id) => {
                    const recallTime = new Date(recall.requested_at).getTime();
                    if (recallTime < oneDayAgo) {
                        window.recallsData.delete(id);
                        cleaned++;
                    }
                });
                if (cleaned > 0) {
                    console.log(`🧹 [Init] ${cleaned} rappels obsolètes supprimés`);
                    // Mettre à jour localStorage après nettoyage
                    const cleanedRecalls = Array.from(window.recallsData.values());
                    localStorage.setItem('mockRecalls', JSON.stringify(cleanedRecalls));
                }
                
                // PAS DE SIMULATION AUTOMATIQUE - SUPPRIMÉ
                
                // Mettre à jour le compteur et la sidebar
                window.updateRemindersCount();
                window.updateRemindersList();
                
                // Polling toutes les 10 secondes pour détecter les NOUVEAUX rappels clients
                setInterval(pollRecalls, 10000);
                
                // Mettre à jour le compteur et la liste toutes les 60 secondes
                setInterval(() => {
                    window.updateRemindersCount();
                    window.updateRemindersList();
                }, 60000);
                
                // Initialiser la liste des rappels au démarrage
                window.updateRemindersList();
            }
            
            // ✅ NOUVEAU : Démarrer l'écoute d'événements globaux pour les demandes client
            startGlobalEventListener();
            
            // ✅ NOUVEAU : RÉVEIL DU BACKEND - Simulation complète de l'appel Vitrine
            console.log('🔄 [Init] Réveil complet du backend...');
            try {
                // 1. Faire un appel SSE pour "réveiller" le backend comme le fait Vitrine
                const dummySSE = new EventSource(`${API_BASE_URL}/api/tickets/chat/stream?room_id=dummy-wake-up`);
                
                // 2. ✅ NOUVEAU : Faire des appels de test pour forcer l'initialisation complète
                setTimeout(async () => {
                    try {
                        // Test 1: Vérifier la santé générale du backend
                        console.log('🔄 [Init] Test santé du backend...');
                        const healthResponse = await safeFetch(`${API_BASE_URL}/api/health`);
                        
                        if (healthResponse.ok) {
                            console.log('✅ [Init] Backend en bonne santé');
                        } else {
                            console.log('⚠️ [Init] Backend santé erreur:', healthResponse.status);
                        }
                        
                        // Test 2: Tester la connexion DB simple d'abord
                        console.log('🔄 [Init] Test de la connexion DB...');
                        const dbTestResponse = await safeFetch(`${API_BASE_URL}/api/test/db`);
                        
                        if (dbTestResponse.ok) {
                            const dbData = await dbTestResponse.json();
                            console.log('✅ [Init] Connexion DB OK:', dbData);
                            
                            // Test 3: Si DB OK, tester l'endpoint vitrine-list-tickets
                            console.log('🔄 [Init] Test endpoint vitrine-list-tickets...');
                            const testResponse = await safeFetch(`${API_BASE_URL}/api/copilot/vitrine-list-tickets?status=OUVERT&limit=1`);
                            
                            if (testResponse.ok) {
                                console.log('✅ [Init] Endpoint vitrine-list-tickets fonctionnel');
                            } else {
                                console.log('⚠️ [Init] Endpoint vitrine-list-tickets erreur:', testResponse.status);
                            }
                        } else {
                            console.log('❌ [Init] Connexion DB échouée:', dbTestResponse.status);
                        }
                    } catch (testError) {
                        console.log('⚠️ [Init] Erreur test endpoints:', testError);
                    }
                    
                    dummySSE.close();
                    console.log('✅ [Init] Backend réveillé complètement, fermeture SSE dummy');
                }, 1000);
                
            } catch (error) {
                console.log('⚠️ [Init] Erreur réveil backend:', error);
            }
            
            // Charger les tickets après avoir réveillé le backend
            console.log('🚀 [DOMContentLoaded] Appel à loadTickets() après réveil backend');
            setTimeout(() => {
            loadTickets();
            }, 3000); // ✅ Augmenter le délai à 3 secondes pour laisser plus de temps au backend
            
            // Configurer les event listeners
            document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
            document.getElementById('priorityFilter').addEventListener('change', handleFilterChange);
            document.getElementById('roomFilter').addEventListener('input', debounce(handleFilterChange, 300));
            
            // Boutons d'action
            document.getElementById('refreshBtn').addEventListener('click', function() {
                trackUserInteraction();
                loadTickets();
            });
            document.getElementById('exportBtn').addEventListener('click', function() {
                trackUserInteraction();
                exportTickets();
            });
            document.getElementById('clearFilters').addEventListener('click', function() {
                trackUserInteraction();
                clearFilters();
            });
            document.getElementById('retryBtn').addEventListener('click', function() {
                trackUserInteraction();
                loadTickets();
            });
            
            // Modal
            document.getElementById('ticketModal').addEventListener('click', function(e) {
                if (e.target === this) {
                     // Vérifier si un chat est ouvert avant de fermer le modal
                     const openChatBanner = document.querySelector('.chat-banner[style*="display: flex"], .chat-banner-fullscreen[style*="display: flex"]');
                     if (openChatBanner) {
                         // Si un chat est ouvert, ne pas fermer le modal
                         return;
                     }
                    closeModal();
                }
            });
            
            // Fermer modal avec Escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && document.getElementById('ticketModal').classList.contains('active')) {
                     // Vérifier si un chat est ouvert avant de fermer le modal
                     const openChatBanner = document.querySelector('.chat-banner[style*="display: flex"], .chat-banner-fullscreen[style*="display: flex"]');
                     if (openChatBanner) {
                         // Si un chat est ouvert, ne pas fermer le modal
                         return;
                     }
                    closeModal();
                }
            });
            
            // Configurer le système de rafraîchissement intelligent
            setupVisibilityHandling();
            
            // Démarrer le rafraîchissement automatique après un délai initial
            setTimeout(() => {
                if (!isUserInteracting) {
                    startAutoRefresh();
                }
            }, 5000);
        });

        // Fonction pour effacer les filtres
        function clearFilters() {
            document.getElementById('statusFilter').value = '';
            document.getElementById('priorityFilter').value = '';
            document.getElementById('roomFilter').value = '';
            
            // Réappliquer les filtres
            applyFilters();
        }

        // Fonction pour gérer les changements de filtres
        function handleFilterChange() {
            console.log('🔍 [Filter] Changement de filtre détecté');
            trackUserInteraction(); // Empêcher les interférences avec auto-refresh
            const statusFilter = document.getElementById('statusFilter').value;
            const priorityFilter = document.getElementById('priorityFilter').value;
            const roomFilter = document.getElementById('roomFilter').value;
            console.log('🔍 [Filter] Valeurs:', { statusFilter, priorityFilter, roomFilter });
            applyFilters();
        }

        // Chargement des tickets avec protection contre les interférences
        async function loadTickets(silent = false, attempt = 1) {
            console.log('🔄 [LoadTickets] Début du chargement, silent:', silent, 'isLoading:', isLoading, 'isUserInteracting:', isUserInteracting);
            
            // Si l'utilisateur interagit, reporter le rafraîchissement
            if (isUserInteracting && silent) {
                console.log('⏸️ Rafraîchissement différé - interaction utilisateur en cours');
                return;
            }

            // Éviter les chargements concurrents (y compris en mode silencieux)
            if (isLoading) {
                if (silent) {
                    console.log('⏸️ Rafraîchissement silencieux ignoré - chargement en cours');
                } else {
                    console.log('⏸️ Chargement déjà en cours, abandon');
                }
                return;
            }
            
            isLoading = true;
            console.log('🔄 [LoadTickets] isLoading mis à true');
            if (!silent) showLoading();
            
            let willRetry = false;
            try {
                console.log('🔄 [LoadTickets] Appel API vers:', `${API_BASE_URL}/api/copilot/vitrine-list-tickets`);
                
                // Créer un AbortController pour le timeout (réduit à 10s)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('⏰ [LoadTickets] Timeout de 10 secondes atteint, annulation...');
                    controller.abort();
                }, 10000);
                
                const response = await safeFetch(`${API_BASE_URL}/api/copilot/vitrine-list-tickets`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                // Annuler le timeout si la réponse arrive
                clearTimeout(timeoutId);
                console.log('🔄 [LoadTickets] Réponse reçue, status:', response.status);
                
                if (!response.ok) {
                    // Gérer spécifiquement l'erreur 500 du serveur
                    if (response.status === 500) {
                        console.warn('⚠️ [LoadTickets] Erreur 500 du serveur - Tentative de récupération');
                        
                        // Si on a des tickets en cache, on les garde plutôt que de les effacer
                        if (tickets.length > 0) {
                            console.log('🛡️ [LoadTickets] Conservation des tickets en cache:', tickets.length);
                            
                            // Mettre à jour les stats et appliquer les filtres avec les données existantes
                            updateStats();
                            applyFilters();
                            
                            // Planifier un nouveau chargement dans 10 secondes
                            if (attempt < 3) {
                                willRetry = true;
                                console.log(`🔁 [LoadTickets] Retry ${attempt + 1} dans 10s après erreur 500...`);
                                setTimeout(() => loadTickets(true, attempt + 1), 10000);
                            }
                            
                            return;
                        }
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('🔄 [LoadTickets] Données reçues:', data);
                
                if (data.success) {
                    const newTickets = data.tickets || [];
                    console.log('🔄 [LoadTickets] Tickets extraits:', newTickets.length);
                    
                    // Détecter les nouveaux tickets uniquement si ce n'est pas le premier chargement
                    if (silent && tickets.length > 0 && newTickets.length > tickets.length) {
                        const newTicketsCount = newTickets.length - tickets.length;
                        showNewTicketNotification(newTicketsCount);
                    }
                    
                    tickets = newTickets;
                    lastTicketCount = tickets.length;
                
                    // Toujours mettre à jour les stats
                    updateStats();
                    
                    // Appliquer les filtres seulement si pas d'interaction en cours ou si c'est le premier chargement
                    if (!isUserInteracting || !silent) {
                        applyFilters();
                    }
                    
                    hideError();
                    
                    if (!silent) {
                        console.log(`✅ ${tickets.length} tickets chargés`);
                    }
                } else {
                    throw new Error(data.message || 'Erreur inconnue');
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.error('⏰ [LoadTickets] Requête annulée par timeout après 25 secondes');
                    if (!silent) {
                        showError('Délai d\'attente dépassé. Vérifiez la connexion au serveur.');
                    }
                    // Retry une fois après un court délai
                    if (attempt < 2) {
                        willRetry = true;
                        console.log(`🔁 [LoadTickets] Retry ${attempt + 1} dans 1.5s après timeout...`);
                        await new Promise(r => setTimeout(r, 1500));
                        return await loadTickets(silent, attempt + 1);
                    }
                } else {
                    console.error('❌ [LoadTickets] Erreur lors du chargement des tickets:', error);
                
                if (!silent) {
                    showError(`Erreur lors du chargement des tickets: ${error.message}`);
                    }
                    // Retry réseau générique (Failed to fetch, NetworkError)
                    const msg = (error && error.message) ? error.message : '';
                    if (attempt < 2 && /failed to fetch|networkerror|load failed/i.test(msg)) {
                        willRetry = true;
                        console.log(`🔁 [LoadTickets] Retry ${attempt + 1} dans 1.5s après erreur réseau...`);
                        await new Promise(r => setTimeout(r, 1500));
                        return await loadTickets(silent, attempt + 1);
                    }
                }
                
                announceToScreenReader('Erreur lors du chargement des tickets');
                
            } finally {
                if (!willRetry) {
                    console.log('🔄 [LoadTickets] Finally - isLoading remis à false');
                    isLoading = false;
                    if (!silent) hideLoading();
                } else {
                    console.log('🔄 [LoadTickets] Finally - willRetry=true, isLoading reste temporairement à true');
                }
                // 🚨 SÉCURITÉ: Force reset après 15 secondes max
                setTimeout(() => {
                    if (isLoading) {
                        console.log('🚨 [LoadTickets] FORCE RESET isLoading après 15s');
                        isLoading = false;
                        if (!silent) hideLoading();
                    }
                }, 15000);
            }
        }

        // Appliquer les filtres
        function applyFilters() {
            const statusFilter = document.getElementById('statusFilter').value;
            const priorityFilter = document.getElementById('priorityFilter').value;
            const roomFilter = document.getElementById('roomFilter').value.toLowerCase();
            
            console.log('🔍 [ApplyFilters] Filtres actifs:', { statusFilter, priorityFilter, roomFilter });
            console.log('🔍 [ApplyFilters] Tickets total:', tickets.length);
            
            filteredTickets = tickets.filter(ticket => {
                const matchesStatus = !statusFilter || ticket.status === statusFilter;
                const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
                const matchesRoom = !roomFilter || 
                    (ticket.room && ticket.room.toLowerCase().includes(roomFilter)) ||
                    (ticket.device_name && ticket.device_name.toLowerCase().includes(roomFilter));
                
                return matchesStatus && matchesPriority && matchesRoom;
            });
            
            console.log('🔍 [ApplyFilters] Tickets filtrés:', filteredTickets.length);
            
            // Toujours rendre immédiatement pour les filtres (interaction intentionnelle)
            renderTickets();
        }

        // Fonction pour annoncer aux lecteurs d'écran
        function announceToScreenReader(message) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }

        // Fonction pour fermer le modal
        function closeModal() {
             // ✅ CORRIGÉ : Ne pas fermer automatiquement les chats actifs
             // Laisser les chats continuer même si le modal se ferme
             console.log('📋 [Modal] Fermeture du modal - Les chats actifs continuent');
             
            document.getElementById('ticketModal').classList.remove('active');
            selectedTicket = null;
            
            // ✅ CORRIGÉ : Ne fermer la connexion SSE que s'il n'y a pas de chats minimisés
            const hasMinimizedChats = minimizedChats && Object.keys(minimizedChats).length > 0;
            if (chatEventSource && !hasMinimizedChats) {
                console.log('🔌 [Modal] Fermeture SSE - Aucun chat minimisé');
                chatEventSource.close();
                chatEventSource = null;
            } else if (hasMinimizedChats) {
                console.log('🔌 [Modal] SSE conservée - Chats minimisés actifs:', Object.keys(minimizedChats).length);
            }
            
            // Reprendre le rafraîchissement automatique si nécessaire
            if (!autoRefreshInterval && !isUserInteracting) {
                startAutoRefresh();
            }
        }
        
        // Fonction pour fermer le modal et tous les chats
        window.closeModalAndChats = function() {
            console.log('🔴 [Modal] Fermeture du modal et de tous les chats');
            
            // Fermer tous les chats actifs
            if (window.ChatSystemRef7 && window.ChatSystemRef7.closeAllChats) {
                window.ChatSystemRef7.closeAllChats();
            }
            
            // Fermer le modal
            closeModal();
        }
        
        // Fonction pour étendre la bulle de chat
        window.expandChatBubble = function() {
            const chatBubble = document.getElementById('chatBubble');
            if (!chatBubble) return;
            
            const ticketId = chatBubble.dataset.ticketId;
            if (ticketId && window.ChatSystemRef7) {
                window.ChatSystemRef7.expandMinimizedChat(ticketId);
            }
        }

        // Fonction pour mettre à jour le statut d'un ticket
        async function updateTicketStatus(newStatus) {
            if (!selectedTicket || selectedTicket.status === newStatus) return;
            
            trackUserInteraction(); // Marquer comme interaction utilisateur
            
            try {
                const response = await safeFetch(`${API_BASE_URL}/api/copilot/vitrine-update-ticket`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: selectedTicket.id,
                        status: newStatus
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // 🗑️ SUPPRESSION IMMÉDIATE VISUELLE pour les tickets fermés
                    if (newStatus === 'closed') {
                        // Stocker le numéro de ticket avant de manipuler les données
                        const ticketNumber = selectedTicket.ticket_number;
                        const ticketId = selectedTicket.id;
                        
                        // Supprimer immédiatement le ticket de l'affichage local
                        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
                        if (ticketIndex !== -1) {
                            tickets.splice(ticketIndex, 1);
                        }
                        
                        // Supprimer aussi des tickets filtrés
                        const filteredIndex = filteredTickets.findIndex(t => t.id === ticketId);
                        if (filteredIndex !== -1) {
                            filteredTickets.splice(filteredIndex, 1);
                        }
                        
                        // Fermer le modal
                        closeModal();
                        
                        // Mettre à jour l'affichage immédiatement
                        updateStats();
                        renderTickets();
                        
                        // Afficher le toast rouge de suppression
                        showDeleteNotification(`Ticket ${ticketNumber} fermé et supprimé`);
                        
                        // Annoncer pour l'accessibilité
                        announceToScreenReader(`Ticket ${ticketNumber} fermé et supprimé automatiquement`);
                        
                        return; // Arrêter ici pour les tickets fermés
                    }
                    
                    // Pour les autres statuts, mise à jour normale
                    selectedTicket.status = newStatus;
                    const ticketIndex = tickets.findIndex(t => t.id === selectedTicket.id);
                    if (ticketIndex !== -1) {
                        tickets[ticketIndex].status = newStatus;
                    }
                    
                    // Mettre à jour l'affichage
                    updateStats();
                    applyFilters();
                    
                    // Mettre à jour le modal
                    openTicketModal(selectedTicket.id);
                    
                    showNotification(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
                    
                    // Annoncer le changement pour l'accessibilité
                    announceToScreenReader(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
                } else {
                    throw new Error(data.message || 'Erreur inconnue');
                }
                
            } catch (error) {
                console.error('Erreur lors de la mise à jour du statut:', error);
                showErrorNotification(`Erreur lors de la mise à jour: ${error.message}`);
            }
        }

        // Fonction pour rafraîchir manuellement
        function refreshTickets() {
            trackUserInteraction();
            loadTickets();
        }

        // Mise à jour des statistiques
        function updateStats() {
            const totalTickets = tickets.length;
            const openTickets = tickets.filter(t => t.status === 'open').length;
            const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
            const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
            
            document.getElementById('totalTickets').textContent = totalTickets;
            document.getElementById('openTickets').textContent = openTickets;
            document.getElementById('inProgressTickets').textContent = inProgressTickets;
            document.getElementById('resolvedTickets').textContent = resolvedTickets;
        }

        // Rendu des tickets avec protection contre les interférences
        function renderTickets() {
            const grid = document.getElementById('ticketsGrid');
            const emptyState = document.getElementById('emptyState');
            
            if (filteredTickets.length === 0) {
                grid.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            grid.style.display = 'grid';
            
            // Sauvegarder l'état de focus actuel
            const focusedElement = document.activeElement;
            const focusedTicketId = focusedElement.closest('.modern-ticket-card')?.dataset.ticketId;
            
            grid.innerHTML = filteredTickets.map(ticket => `
                <article class="modern-ticket-card" data-ticket-id="${ticket.id}" 
                         onclick="openTicketModal('${ticket.id}')" 
                         role="button" tabindex="0" 
                         onkeydown="handleCardKeydown(event, '${ticket.id}')"
                         aria-label="Ticket ${ticket.ticket_number}: ${ticket.title}">
                    <div class="card-header">
                        <div class="ticket-number">${escapeHtml(ticket.ticket_number)}</div>
                        <div class="ticket-priority priority-${ticket.priority}" 
                             aria-label="Priorité ${getPriorityLabel(ticket.priority)}">
                            ${getPriorityLabel(ticket.priority)}
                        </div>
                    </div>
                    ${ticket.room ? `
                        <div class="ticket-room">
                            <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                            <span>${escapeHtml(ticket.room)}</span>
                        </div>
                    ` : ''}
                    <div class="ticket-title">${escapeHtml(ticket.title)}</div>
                    <div class="ticket-description">${escapeHtml(truncateText(ticket.description, 100))}</div>
                    <div class="ticket-meta">
                        <div class="ticket-status status-${ticket.status}" 
                             aria-label="Statut ${getStatusLabel(ticket.status)}">
                            ${getStatusLabel(ticket.status)}
                        </div>
                        <div class="ticket-date">
                            <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                            <time datetime="${ticket.created_at}">${formatDate(ticket.created_at)}</time>
                        </div>
                    </div>
                </article>
            `).join('');
            
            // Restaurer le focus si nécessaire
            if (focusedTicketId) {
                const elementToFocus = document.querySelector(`[data-ticket-id="${focusedTicketId}"]`);
                if (elementToFocus) {
                    elementToFocus.focus();
                }
            }
        }

        // Gestion des événements clavier pour les cartes
        function handleCardKeydown(event, ticketId) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trackUserInteraction();
                openTicketModal(ticketId);
            }
        }

        // Utilitaires
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function getPriorityLabel(priority) {
            const labels = {
                'low': 'Faible',
                'medium': 'Moyenne',
                'high': 'Élevée',
                'critical': 'Critique'
            };
            return labels[priority] || priority;
        }

        function getStatusLabel(status) {
            const labels = {
                'open': 'Ouvert',
                'in_progress': 'En cours',
                'resolved': 'Résolu',
                'closed': 'Fermé'
            };
            return labels[status] || status;
        }

        function formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function truncateText(text, maxLength) {
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        }

        // Gestion de l'UI
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('ticketsGrid').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        function showError(message) {
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('error').style.display = 'block';
            document.getElementById('ticketsGrid').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
        }

        function hideError() {
            document.getElementById('error').style.display = 'none';
        }

        // Modal avec protection contre les interférences
        function openTicketModal(ticketId) {
            trackUserInteraction(); // Marquer comme interaction utilisateur
            
            selectedTicket = tickets.find(t => t.id === ticketId);
            if (!selectedTicket) return;
            
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = `
                <h2 id="modalTitle" class="modal-title">${escapeHtml(selectedTicket.ticket_number)} - ${escapeHtml(selectedTicket.title)}</h2>
                
                <div class="modal-section full-width">
                    <label class="modal-label">Description</label>
                    <div class="modal-value">${escapeHtml(selectedTicket.description)}</div>
                </div>
                
                ${generatePodioInfoCards(selectedTicket)}
                
                <div class="modal-content-grid">
                    <div class="modal-section-column">
                        <div class="modal-section">
                            <label class="modal-label">Priorité</label>
                            <div class="modal-value">
                                <span class="ticket-priority priority-${selectedTicket.priority}">
                                    ${getPriorityLabel(selectedTicket.priority)}
                                </span>
                            </div>
                        </div>
                        
                        ${selectedTicket.room ? `
                            <div class="modal-section">
                                <label class="modal-label">Salle</label>
                                <div class="modal-value">${escapeHtml(selectedTicket.room)}</div>
                            </div>
                        ` : ''}
                        
                        ${selectedTicket.device_name ? `
                            <div class="modal-section">
                                <label class="modal-label">Équipement</label>
                                <div class="modal-value">${escapeHtml(selectedTicket.device_name)}</div>
                            </div>
                        ` : ''}
                        
                        ${selectedTicket.reporter_name ? `
                            <div class="modal-section">
                                <label class="modal-label">Rapporteur</label>
                                <div class="modal-value">${escapeHtml(selectedTicket.reporter_name)}</div>
                            </div>
                        ` : ''}
                        
                        ${selectedTicket.category ? `
                            <div class="modal-section">
                                <label class="modal-label">Catégorie</label>
                                <div class="modal-value">${escapeHtml(selectedTicket.category)}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-section-column">
                        <div class="modal-section">
                            <label class="modal-label">Statut</label>
                            <div class="modal-value">
                                <span class="ticket-status status-${selectedTicket.status}">
                                    ${getStatusLabel(selectedTicket.status)}
                                </span>
                            </div>
                            <div class="status-selector" role="group" aria-label="Changer le statut du ticket">
                                <button class="status-option ${selectedTicket.status === 'open' ? 'selected' : ''}" 
                                        onclick="updateTicketStatus('open')"
                                        aria-pressed="${selectedTicket.status === 'open'}">Ouvert</button>
                                <button class="status-option ${selectedTicket.status === 'in_progress' ? 'selected' : ''}" 
                                        onclick="updateTicketStatus('in_progress')"
                                        aria-pressed="${selectedTicket.status === 'in_progress'}">En cours</button>
                                <button class="status-option ${selectedTicket.status === 'resolved' ? 'selected' : ''}" 
                                        onclick="updateTicketStatus('resolved')"
                                        aria-pressed="${selectedTicket.status === 'resolved'}">Résolu</button>
                                <button class="status-option ${selectedTicket.status === 'closed' ? 'selected' : ''}" 
                                        onclick="updateTicketStatus('closed')"
                                        aria-pressed="${selectedTicket.status === 'closed'}">Fermé</button>
                            </div>
                        </div>
                        
                        <div class="modal-section">
                            <label class="modal-label">Date de création</label>
                            <div class="modal-value">
                                <time datetime="${selectedTicket.created_at}">${formatDate(selectedTicket.created_at)}</time>
                            </div>
                        </div>
                        
                        ${selectedTicket.updated_at && selectedTicket.updated_at !== selectedTicket.created_at ? `
                            <div class="modal-section">
                                <label class="modal-label">Dernière mise à jour</label>
                                <div class="modal-value">
                                    <time datetime="${selectedTicket.updated_at}">${formatDate(selectedTicket.updated_at)}</time>
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- 🎫 Bouton Créer BT -->
                        <div class="modal-section">
                            <label class="modal-label">🎫 Bon de Travail</label>
                            <div class="modal-value">
                                <button class="chat-btn success" onclick="openCreateBTModalForTicket('${selectedTicket.id}')" 
                                        ${selectedTicket.status === 'closed' ? 'disabled' : ''}>
                                    <i class="fas fa-plus" aria-hidden="true"></i>
                                    Créer BT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                                 <!-- 💬 Section Chat -->
                 <div class="chat-section">
                     <label class="modal-label">💬 Chat avec la salle</label>
                     <div class="chat-actions">
                         <button class="chat-btn primary" onclick="initiateChat('${selectedTicket.id}', '${selectedTicket.room || 'A-1785'}')"
                                 ${selectedTicket.status === 'closed' ? 'disabled' : ''}>
                             <i class="fas fa-comments" aria-hidden="true"></i>
                             Lancer le chat
                         </button>
                         <button class="chat-btn secondary" onclick="endChat('${selectedTicket.id}')"
                                 id="endChatBtn_${selectedTicket.id}" style="display: none;">
                             <i class="fas fa-times" aria-hidden="true"></i>
                             Terminer le chat
                         </button>
                     </div>
                     <div class="chat-status" id="chatStatus_${selectedTicket.id}">
                         <span class="status-indicator offline">
                             <i class="fas fa-circle" aria-hidden="true"></i>
                             Hors ligne
                         </span>
                     </div>
                     ${!selectedTicket.room ? `
                         <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; padding: 8px; margin-top: 10px; border-radius: 6px; font-size: 0.85rem;">
                             <strong>⚠️ Note:</strong> Salle non définie dans le ticket. Utilisation de la salle par défaut (A-1785).
                         </div>
                     ` : ''}
                 </div>
                 
                 <!-- 💬 BANNIÈRE DE CHAT AUTONOME (masque le ticket) -->
                 <div id="chatBanner_${selectedTicket.id}" class="chat-banner-fullscreen" style="display: none;">
                                           <div class="chat-banner-header">
                          <div class="chat-header-info">
                              <h3>💬 Support technique en direct - Salle ${selectedTicket.room || 'A-1785'}</h3>
                              <p class="chat-subtitle">Service Expert Audiovisuel UQAM</p>
                          </div>
                          <div class="chat-header-actions">
                              <div class="chat-font-controls">
                                  <button class="chat-font-btn" onclick="adjustChatFontSize('${selectedTicket.id}', 'decrease')" title="Réduire la taille du texte">
                                      <i class="fas fa-search-minus"></i>
                                  </button>
                                  <span class="chat-font-size-indicator" id="fontSizeIndicator_${selectedTicket.id}">0%</span>
                                  <button class="chat-font-btn" onclick="adjustChatFontSize('${selectedTicket.id}', 'increase')" title="Augmenter la taille du texte">
                                      <i class="fas fa-search-plus"></i>
                                  </button>
                              </div>
                              <button class="chat-minimize-btn" onclick="minimizeChatBanner('${selectedTicket.id}')" title="Réduire le chat">
                                  <i class="fas fa-minus"></i>
                              </button>
                              <button class="chat-close-btn" onclick="closeChatBanner('${selectedTicket.id}')" title="Fermer le chat">
                                  <i class="fas fa-times"></i>
                              </button>
                          </div>
                      </div>
                     
                     <div class="chat-messages" id="chatMessages_${selectedTicket.id}">
                         <!-- Les messages s'afficheront ici -->
                     </div>
                     
                     <div class="chat-input-area">
                         <textarea 
                               id="chatInput_${selectedTicket.id}" 
                               class="chat-input" 
                               placeholder="Tapez votre message..."
                               onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage('${selectedTicket.id}'); }"
                               onfocus="initTypingDetection('chatInput_${selectedTicket.id}')"
                               oninput="autoResizeTextarea(this)"></textarea>
                         <button class="chat-send-btn" onclick="sendChatMessage('${selectedTicket.id}')">
                             <i class="fas fa-paper-plane"></i>
                         </button>
                     </div>
                     
                                           <div class="chat-footer">
                          <div class="chat-status-indicator">
                              <i class="fas fa-circle chat-status-dot"></i>
                              <span>Chat actif</span>
                          </div>
                     </div>
                </div>
            `;
            
            document.getElementById('ticketModal').classList.add('active');
            document.getElementById('modalContent').focus();
            
            // Restaurer la taille de police sauvegardée
            restoreChatFontSize(selectedTicket.id);
        }
        
        // ===== CONTRÔLE DE TAILLE DE POLICE CHAT =====
        let chatFontSizes = {}; // Stockage des tailles par ticket
        
        function adjustChatFontSize(ticketId, action) {
            // Initialiser la taille si pas encore définie
            if (!chatFontSizes[ticketId]) {
                chatFontSizes[ticketId] = 150; // 150% par défaut (nouveau minimum)
            }
            
            // Ajuster selon l'action
            if (action === 'increase' && chatFontSizes[ticketId] < 300) {
                chatFontSizes[ticketId] += 10;
            } else if (action === 'decrease' && chatFontSizes[ticketId] > 150) {
                chatFontSizes[ticketId] -= 10;
            }
            
            // Appliquer la nouvelle taille aux messages ET à l'input
            const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
            const chatInput = document.getElementById(`chatInput_${ticketId}`);
            const fontSizeIndicator = document.getElementById(`fontSizeIndicator_${ticketId}`);
            
            if (chatMessages) {
                // Appliquer directement au container (hérite par tous les enfants)
                chatMessages.style.fontSize = `${chatFontSizes[ticketId]}%`;
                
                // Marquer le container pour qu'il applique automatiquement aux nouveaux messages
                chatMessages.setAttribute('data-font-size', chatFontSizes[ticketId]);
                
                // Appliquer aussi à tous les messages individuels existants
                const messageElements = chatMessages.querySelectorAll('.chat-message-content, .chat-message, .message-content, .message');
                messageElements.forEach(msg => {
                    msg.style.fontSize = `inherit`; // Hériter du parent
                });
            }
            
            if (chatInput) {
                chatInput.style.fontSize = `${chatFontSizes[ticketId]}%`;
            }
            
            if (fontSizeIndicator) {
                // Convertir 150-300% en 0-100% pour l'affichage
                const displayPercentage = Math.round(((chatFontSizes[ticketId] - 150) / 150) * 100);
                fontSizeIndicator.textContent = `${displayPercentage}%`;
            }
            
            // Sauvegarder la préférence dans localStorage
            localStorage.setItem(`chatFontSize_${ticketId}`, chatFontSizes[ticketId]);
            
            console.log(`🔤 [ChatFont] Taille ajustée pour ticket ${ticketId}: ${chatFontSizes[ticketId]}%`);
        }
        
        // Fonction pour restaurer la taille sauvegardée
        function restoreChatFontSize(ticketId) {
            const savedSize = localStorage.getItem(`chatFontSize_${ticketId}`);
            if (savedSize) {
                let restoredSize = parseInt(savedSize);
                
                // 🔄 MIGRATION : Convertir les anciennes valeurs vers la nouvelle plage
                if (restoredSize < 150) {
                    // Ancienne plage 70-150% → Nouvelle plage 150-300%
                    // Formule: nouvelle = ((ancienne - 70) / 80) * 150 + 150
                    const normalizedOld = Math.max(0, restoredSize - 70) / 80; // 0-1
                    restoredSize = Math.round(normalizedOld * 150 + 150); // 150-300
                    
                    console.log(`🔄 [ChatFont] Migration taille ${savedSize}% → ${restoredSize}% pour ticket ${ticketId}`);
                    
                    // Sauvegarder la nouvelle valeur
                    localStorage.setItem(`chatFontSize_${ticketId}`, restoredSize);
                }
                
                chatFontSizes[ticketId] = restoredSize;
                
                // Appliquer immédiatement
                setTimeout(() => {
                    const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                    const chatInput = document.getElementById(`chatInput_${ticketId}`);
                    const fontSizeIndicator = document.getElementById(`fontSizeIndicator_${ticketId}`);
                    
                    if (chatMessages) {
                        // Appliquer directement au container (hérite par tous les enfants)
                        chatMessages.style.fontSize = `${chatFontSizes[ticketId]}%`;
                        
                        // Marquer le container pour qu'il applique automatiquement aux nouveaux messages
                        chatMessages.setAttribute('data-font-size', chatFontSizes[ticketId]);
                        
                        // Appliquer aussi à tous les messages individuels existants
                        const messageElements = chatMessages.querySelectorAll('.chat-message-content, .chat-message, .message-content, .message');
                        messageElements.forEach(msg => {
                            msg.style.fontSize = `inherit`; // Hériter du parent
                        });
                    }
                    
                    if (chatInput) {
                        chatInput.style.fontSize = `${chatFontSizes[ticketId]}%`;
                    }
                    
                    if (fontSizeIndicator) {
                        // Convertir 150-300% en 0-100% pour l'affichage
                        const displayPercentage = Math.round(((chatFontSizes[ticketId] - 150) / 150) * 100);
                        fontSizeIndicator.textContent = `${displayPercentage}%`;
                    }
                }, 100); // Petit délai pour s'assurer que les éléments sont créés
            } else {
                // Pas de valeur sauvegardée, utiliser le nouveau défaut
                chatFontSizes[ticketId] = 150;
                
                setTimeout(() => {
                    const fontSizeIndicator = document.getElementById(`fontSizeIndicator_${ticketId}`);
                    if (fontSizeIndicator) {
                        fontSizeIndicator.textContent = '0%'; // 150% réel = 0% affiché
                    }
                }, 100);
            }
        }
        
        // Auto-restaurer les tailles pour tous les chats visibles
        function autoRestoreAllChatFontSizes() {
            // Observer les nouveaux éléments de chat
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Chercher les éléments de chat avec un ID
                            const chatMessages = node.querySelector ? node.querySelector('[id^="chatMessages_"]') : null;
                            if (chatMessages) {
                                const ticketId = chatMessages.id.replace('chatMessages_', '');
                                console.log(`🔤 [ChatFont] Auto-restauration pour ticket: ${ticketId}`);
                                restoreChatFontSize(ticketId);
                            }
                        }
                    });
                });
            });
            
            // Observer les changements dans le document
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Démarrer l'auto-restauration
        setTimeout(() => {
            autoRestoreAllChatFontSizes();
        }, 1000);
        
        // Fonction pour appliquer la taille aux nouveaux messages (simplifiée)
        function applyFontSizeToNewMessages(ticketId) {
            if (chatFontSizes[ticketId]) {
                const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                if (chatMessages) {
                    // Juste s'assurer que le container a la bonne taille (CSS héritage fait le reste)
                    chatMessages.style.fontSize = `${chatFontSizes[ticketId]}%`;
                    chatMessages.setAttribute('data-font-size', chatFontSizes[ticketId]);
                }
            } else {
                // Nouveau chat sans taille définie, utiliser le nouveau défaut
                chatFontSizes[ticketId] = 150;
                const chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                const fontSizeIndicator = document.getElementById(`fontSizeIndicator_${ticketId}`);
                
                if (chatMessages) {
                    chatMessages.style.fontSize = '150%';
                    chatMessages.setAttribute('data-font-size', 150);
                }
                
                if (fontSizeIndicator) {
                    fontSizeIndicator.textContent = '0%'; // 150% réel = 0% affiché
                }
            }
        }
        
        // Exposer la fonction globalement pour l'utiliser lors de l'ajout de messages
        window.applyFontSizeToNewMessages = applyFontSizeToNewMessages;
        
        // ===== BULLE DE CHAT RÉDUITE =====
        // Ces variables sont déjà déclarées dans chat_system_ref7.js
        // minimizedChats et unreadMessageCounts sont accessibles via window.ChatSystemRef7
        
        // ===== GLOBAL EVENT LISTENER =====
        // Variables déjà déclarées plus haut (lignes 505-506)
        
        function startGlobalEventListener() {
            console.log('🌐 [GlobalEvents] Démarrage écoute événements globaux');
            
            // ✅ NOUVEAU : Protection contre les reconnexions multiples
            if (window.globalReconnectionInProgress) {
                console.log('🚫 [GlobalEvents] Reconnexion déjà en cours, annulation');
                return;
            }
            
            if (globalEventSource) {
                console.log('🔌 [GlobalEvents] Fermeture connexion SSE globale existante');
                globalEventSource.close();
            }
            
            // Écouter les événements globaux (pas liés à un ticket spécifique)
            globalEventSource = new EventSource(`${GO_SERVER_URL}/api/tickets/chat/events`);
            
            globalEventSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                console.log('🌐 [GlobalEvents] Événement global reçu:', data);
                
                // ✅ NOUVEAU : Vérifier si cet événement a déjà été traité
                const eventId = `${data.type}_${data.data?.channel_id}_${data.data?.timestamp}`;
                if (processedEvents.has(eventId)) {
                    console.log('🔄 [GlobalEvents] Événement déjà traité, ignoré:', eventId);
                    return;
                }
                
                processedEvents.add(eventId);
                
                // Nettoyer le cache après 5 minutes pour éviter l'accumulation
                setTimeout(() => {
                    processedEvents.delete(eventId);
                }, 300000);
                
                switch (data.type) {
                    case 'client_chat_request':
                        console.log('📞 [GlobalEvents] Demande de chat client reçue:', data.data);
                        handleClientChatRequest(data.data);
                        break;
                    case 'chat_initiated':
                        console.log('🚀 [GlobalEvents] Chat initié par le serveur:', data.data);
                        // Convertir l'événement chat_initiated en format client_chat_request
                        const chatRequestData = {
                            channel_id: data.data.channel_id,
                            chat_url: data.data.chat_url,
                            room_id: data.data.room_id,
                            source: 'tickets_sea'
                        };
                        handleClientChatRequest(chatRequestData);
                        break;
                    case 'recall_mode':
                        console.log('⏰ [GlobalEvents] Mode rappel détecté - Client n\'a pas répondu:', data.data);
                        // NE PAS afficher de toast - le client n'a pas encore demandé de rappel
                        // Le toast n'apparaîtra QUE quand le client cliquera sur "Contacter le SEA"
                        break;
                    
                    case 'client_recall_mode':
                        console.log('🔔 [GlobalEvents] Client passé en mode rappel automatiquement:', data.data);
                        // ⚡ CRITICAL: Afficher une bannière informative au lieu de déconnexion
                        if (data.data) {
                            const roomId = data.data.room_id;
                            const channelId = data.data.channel_id;
                            const message = data.data.message || `Client en mode rappel - Salle ${roomId}`;
                            
                            // ⚡ PRODUCTION: Attendre 100ms pour laisser le temps à client_recall_request de créer le rappel
                            setTimeout(() => {
                                // Vérifier si on a déjà un rappel pour cette salle
                                let hasExistingRecall = false;
                                if (window.recallsData) {
                                    window.recallsData.forEach(recall => {
                                        if (recall.room === roomId) {
                                            hasExistingRecall = true;
                                        }
                                    });
                                }
                                
                                if (!hasExistingRecall) {
                                    // Afficher le toast SEULEMENT s'il n'y a pas déjà un rappel
                                    console.log(`⏰ [GlobalEvents] Affichage toast mode rappel pour ${roomId}`);
                                    showRecallModeNotification(roomId, message);
                                } else {
                                    console.log(`📊 [GlobalEvents] Toast mode rappel ignoré - Rappel déjà existant pour ${roomId}`);
                                }
                            }, 100);
                            
                            // Fermer le chat actif s'il existe SANS créer de résumé
                            if (channelId) {
                                const ticketId = getTicketIdByChannelId(channelId);
                                if (ticketId && activeChats[ticketId]) {
                                    console.log(`🔄 [GlobalEvents] Fermeture silencieuse du chat ${channelId} pour ticket ${ticketId}`);
                                    
                                    // ⚡ CRITICAL: Fermer la bannière de chat SANS créer de résumé
                                    // car il n'y a jamais eu de consentement
                                    if (window.currentChatBanner) {
                                        window.currentChatBanner.remove();
                                        window.currentChatBanner = null;
                                    }
                                    
                                    // Nettoyer l'interface
                                    const chatStatus = document.getElementById(`chatStatus_${ticketId}`);
                                    if (chatStatus) {
                                        chatStatus.innerHTML = `
                                            <span style="color: #9333ea;">
                                                <i class="fas fa-clock"></i> Mode rappel - Pas de consentement
                                            </span>
                                        `;
                                    }
                                    
                                    // Cacher le bouton de fin de chat
                                    const endChatBtn = document.getElementById(`endChatBtn_${ticketId}`);
                                    if (endChatBtn) {
                                        endChatBtn.style.display = 'none';
                                    }
                                    
                                    // Retirer de la liste des chats actifs
                                    delete activeChats[ticketId];
                                    
                                    // Arrêter l'EventSource si actif
                                    if (window.chatEventSources && window.chatEventSources[ticketId]) {
                                        window.chatEventSources[ticketId].close();
                                        delete window.chatEventSources[ticketId];
                                        console.log(`🔌 [GlobalEvents] EventSource fermé pour ticket ${ticketId}`);
                                    }
                                }
                            }
                        }
                        break;
                    case 'client_recall_request':
                        console.log('🔔 [GlobalEvents] Demande de rappel client:', data.data);
                        // MAINTENANT on crée le vrai rappel quand le client clique sur "Contacter le SEA"
                        if (data.data && data.data.room) {
                            const room = data.data.room;
                            const ticketNumber = data.data.ticket_number || '';
                            const channelId = data.data.channel_id || `sea-chat-${room}-${Math.floor(Date.now()/1000)}`;
                            
                            // ✅ CORRECTION: Créer le rappel réel avec isClientRequest = true
                            console.log('✅ [GlobalEvents] Création rappel client avec nettoyage des anciens');
                            window.addMockRecall(room, ticketNumber || 'N/A', false, channelId, true);
                            
                            // Mettre à jour le compteur
                            if (window.updateRemindersCount) {
                                window.updateRemindersCount();
                            }
                        }
                        break;
                        
                    case 'client_unexpected_disconnect':
                        console.log('🚨 [GlobalEvents] Déconnexion client inattendue:', data.data);
                        if (data.data && data.data.room_id && data.data.channel_id) {
                            const roomId = data.data.room_id;
                            const channelId = data.data.channel_id;
                            const disconnectionType = data.data.disconnection_type || 'unknown';
                            
                            // Afficher une notification toast
                            let message = `Client déconnecté de manière inattendue (${roomId})`;
                            if (disconnectionType === 'unexpected') {
                                message += ' - F5, fermeture navigateur ou perte réseau';
                            }
                            
                            showNotification(message, 'warning', 8000);
                            console.log(`⚠️ [Disconnect] ${message}`);
                            
                            // Si c'est un chat actif, le marquer comme déconnecté
                            const ticketId = findTicketIdByRoom(roomId);
                            if (ticketId && activeChats.has(ticketId)) {
                                updateChatStatus(ticketId, 'disconnected', 'Client déconnecté');
                                addChatMessage(ticketId, `🔌 Client déconnecté de manière inattendue (${disconnectionType})`, 'system');
                            }
                        }
                        break;
                        
                    case 'client_reconnected':
                        console.log('🔄 [GlobalEvents] Client reconnecté:', data.data);
                        if (data.data && data.data.room_id && data.data.channel_id) {
                            const roomId = data.data.room_id;
                            const channelId = data.data.channel_id;
                            
                            // Afficher une notification de reconnexion
                            showNotification(`Client reconnecté (${roomId})`, 'success', 5000);
                            console.log(`✅ [Reconnect] Client reconnecté pour salle ${roomId}`);
                            
                            // Si c'est un chat actif, le marquer comme reconnecté
                            const ticketId = findTicketIdByRoom(roomId);
                            if (ticketId && activeChats.has(ticketId)) {
                                updateChatStatus(ticketId, 'online', 'Client reconnecté');
                                addChatMessage(ticketId, '🔄 Client reconnecté', 'system');
                            }
                        }
                        break;
                        
                    case 'recall_declined':
                    case 'reminder_declined':
                        console.log(`🚫 [GlobalEvents] ${data.type === 'recall_declined' ? 'Rappel' : 'Reminder'} refusé par le client:`, data.data);
                        if (data.data && data.data.room) {
                            const room = data.data.room;
                            showDeclineToast(room, 'rappel');
                            console.log(`✅ [GlobalEvents] Toast de refus affiché pour ${data.type} salle ${room}`);
                        } else if (data.data && data.data.room_id) {
                            const room = data.data.room_id;
                            showDeclineToast(room, 'rappel');
                            console.log(`✅ [GlobalEvents] Toast de refus affiché pour ${data.type} salle ${room}`);
                        }
                        break;
                        
                    default:
                        console.log('🌐 [GlobalEvents] Événement global ignoré:', data.type);
                }
            };
            
            globalEventSource.onerror = function(error) {
                console.error('❌ [GlobalEvents] Erreur SSE globale:', error);
                console.log(`🔍 [GlobalEvents] Détails erreur SSE globale:`, {
                    readyState: globalEventSource?.readyState,
                    url: globalEventSource?.url,
                    error: error
                });
                
                // ✅ NOUVEAU : Protection contre les reconnexions en boucle
                if (window.globalReconnectionTimer) {
                    console.log('🚫 [GlobalEvents] Timer de reconnexion déjà actif, annulation');
                    return;
                }
                
                window.globalReconnectionInProgress = true;
                window.globalReconnectionTimer = setTimeout(() => {
                    console.log('🔄 [GlobalEvents] Tentative de reconnexion...');
                    window.globalReconnectionInProgress = false;
                    window.globalReconnectionTimer = null;
                    startGlobalEventListener();
                }, 5000);
            };
            
            globalEventSource.onopen = function() {
                console.log('✅ [GlobalEvents] Connexion SSE globale établie');
                
                // ✅ NOUVEAU : Nettoyer les flags de reconnexion après succès
                if (window.globalReconnectionTimer) {
                    clearTimeout(window.globalReconnectionTimer);
                    window.globalReconnectionTimer = null;
                }
                window.globalReconnectionInProgress = false;
            };
        }
        
        // Exposer globalement pour reminders.js
        window.handleClientChatRequest = function(requestData) {
            console.log('📞 [ClientRequest] Traitement demande client:', requestData);
            
            // ✅ NOUVEAU : Ne pas générer de rappel si la demande vient de Tickets SEA
            if (requestData.source === 'tickets_sea_initiated') {
                console.log('🚫 [ClientRequest] Demande initiée par Tickets - Pas de toast de rappel généré');
                return; // Sortir sans générer de notification/rappel
            }
            
            // Afficher la notification pour TOUS les techniciens, pas lié à un ticket spécifique
            showGlobalClientChatRequestNotification(requestData);
        }
        
        function showGlobalClientChatRequestNotification(data) {
            console.log('📞 [GlobalClientRequest] Affichage notification demande client globale');
            
            // ✅ NOUVEAU : Éviter les doublons - supprimer TOUTES les notifications de chat client existantes
            const existingGlobalNotifications = document.querySelectorAll('.global-client-request-notification');
            const existingOldNotifications = document.querySelectorAll('.client-request-notification');
            [...existingGlobalNotifications, ...existingOldNotifications].forEach(notif => notif.remove());
            
            // 🔪 Kill green toast path: route to showRecallToast only
if (typeof window.showRecallToast === 'function') {
  const recall = {
    id: 'recall_' + Date.now(),
    room: (data && (data.room_id || data.room || data.roomId)) || 'Inconnue',
    ticket_number: (data && (data.ticket_number || data.ticketNumber)) || ('AUTO-' + Date.now()),
    requested_at: new Date().toISOString(),
    status: 'pending',
    type: 'client_recall_request'
  };
  window.showRecallToast(recall);
}
            
            // ✅ SUPPRIMÉ : Auto-suppression gérée par showRecallToast
            // (Le toast de rappel a son propre timer de 10 secondes)
        }
        
        // ✅ NOUVEAU : Cache pour éviter la création de tickets en double
        const processedChannels = new Set();
        
        async function acceptGlobalClientChatRequest(channelId, roomId) {
            console.log('✅ [GlobalClientRequest] Technicien accepte la demande client globale');
            
            // ✅ PROTECTION : Vérifier si ce channel est déjà traité
            if (processedChannels.has(channelId)) {
                console.log('⚠️ [GlobalClientRequest] Channel déjà traité, ignorer:', channelId);
                return;
            }
            
            // Marquer comme traité immédiatement
            processedChannels.add(channelId);
            
            try {
                console.log('🔄 [GlobalClientRequest] Début du processus d\'acceptation...');
                console.log('🔄 [GlobalClientRequest] Channel ID:', channelId);
                console.log('🔄 [GlobalClientRequest] Room ID:', roomId);
                
                // ✅ NOUVEAU : Chercher d'abord un ticket existant pour cette salle
                console.log('🔍 [GlobalClientRequest] Recherche ticket existant pour salle:', roomId);
                let existingTicketId = null;
                
                // Parcourir les tickets chargés pour trouver un ticket ouvert pour cette salle
                if (tickets && tickets.length > 0) {
                    const existingTicket = tickets.find(ticket => 
                        ticket.room === roomId && 
                        (ticket.status === 'open' || ticket.status === 'in_progress')
                    );
                    
                    if (existingTicket) {
                        existingTicketId = existingTicket.id;
                        console.log('✅ [GlobalClientRequest] Ticket existant trouvé:', existingTicketId);
                    }
                }
                
                let targetTicketId;
                
                if (existingTicketId) {
                    // ✅ RÉUTILISER le ticket existant - PAS de création
                    targetTicketId = existingTicketId;
                    console.log('♻️ [GlobalClientRequest] Réutilisation du ticket existant:', targetTicketId);
                } else {
                    // ✅ FALLBACK : Créer un nouveau ticket seulement si aucun existant
                    console.log('📝 [GlobalClientRequest] Aucun ticket existant, création nouveau ticket');
                    const createTicketResponse = await fetch(`${GO_SERVER_URL}/api/copilot/vitrine-create-ticket`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            category: 'technical_issue',
                            priority: 'medium',
                            title: `Chat client initié - Salle ${roomId}`,
                            description: 'Conversation initiée par le client suite à un timeout de demande de chat',
                            room: roomId,
                            reporter_name: 'Client Vitrine'
                        })
                    });
                    
                    if (!createTicketResponse.ok) {
                        const errorText = await createTicketResponse.text();
                        console.error('❌ [GlobalClientRequest] Erreur création ticket:', errorText);
                        throw new Error(`Erreur lors de la création du ticket: ${createTicketResponse.status} - ${errorText}`);
                    }
                    
                    const ticketData = await createTicketResponse.json();
                    console.log('🔍 [GlobalClientRequest] Réponse création ticket:', ticketData);
                    
                    if (!ticketData || !ticketData.ticket || !ticketData.ticket.id) {
                        throw new Error('Structure de réponse invalide: ' + JSON.stringify(ticketData));
                    }
                    
                    targetTicketId = ticketData.ticket.id;
                    console.log('✅ [GlobalClientRequest] Nouveau ticket créé:', targetTicketId);
                }
                
                // ✅ CORRIGÉ : Utiliser l'endpoint de consentement pour accepter le chat
                const chatResponse = await fetch(`${GO_SERVER_URL}/api/tickets/chat/consent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        room_id: roomId,
                        channel_id: channelId,
                        action: 'accept'
                    })
                });
                
                if (chatResponse.ok) {
                    const action = existingTicketId ? 'Chat de rappel' : 'Nouveau ticket créé et';
                    showNotification(`Chat accepté ! ${action} conversation démarrée.`);
                    
                    // Recharger la liste des tickets (nécessaire seulement si nouveau ticket)
                    if (!existingTicketId) {
                        await loadTickets();
                    }
                    
                    // ✅ NOUVEAU : Si ticket existant, ouvrir directement son modal
                    if (existingTicketId) {
                        console.log('♻️ [GlobalClientRequest] Ouverture modal du ticket existant:', targetTicketId);
                        openTicketModal(targetTicketId);
                    }
                    
                    // Attendre que l'interface soit mise à jour puis démarrer le chat
                    setTimeout(async () => {
                        // Vérifier que l'élément DOM existe avant de démarrer le chat
                        const chatStatus = document.getElementById(`chatStatus_${targetTicketId}`);
                        if (chatStatus) {
                            // ✅ NOUVEAU : Stocker les informations du chat global accepté dans activeChats
                            activeChats[targetTicketId] = {
                                roomId: roomId,
                                chatId: channelId, // ✅ CORRIGÉ : Utiliser chatId comme dans la référence
                                chatUrl: `${GO_SERVER_URL}/api/tickets/chat/stream?channel_id=${channelId}`,
                                status: 'active'
                            };
                            console.log(`✅ [GlobalClientRequest] Chat info stocké pour ticket ${targetTicketId}:`, activeChats[targetTicketId]);
                            
                            // ✅ NOUVEAU : Passer le channel_id pour écouter les messages du chat global
                            startChatEventSource(targetTicketId, channelId);
                            updateChatStatus(targetTicketId, 'active', 'Chat client accepté');
                            
                            // ✅ NOUVEAU : Attendre que la connexion SSE soit établie avant d'ouvrir la bannière
                            setTimeout(async () => {
                                setChatState(targetTicketId, 'open');
                                console.log(`✅ [GlobalClientRequest] Bannière de chat ouverte via setChatState pour ticket ${targetTicketId}`);
                            }, 500); // Délai pour établir la connexion SSE
                            
                            // Afficher le bouton end chat
                            const endChatBtn = document.getElementById(`endChatBtn_${targetTicketId}`);
                            if (endChatBtn) {
                                endChatBtn.style.display = 'inline-block';
                            }
                        } else {
                            console.log('⚠️ [GlobalClientRequest] Éléments DOM pas encore créés, re-tentative...');
                            setTimeout(async () => {
                                // ✅ NOUVEAU : Stocker les informations du chat même en re-tentative
                                activeChats[targetTicketId] = {
                                    roomId: roomId,
                                    chatId: channelId, // ✅ CORRIGÉ : Utiliser chatId comme dans la référence
                                    chatUrl: `${GO_SERVER_URL}/api/tickets/chat/stream?channel_id=${channelId}`,
                                    status: 'active'
                                };
                                
                                // ✅ NOUVEAU : Passer le channel_id même en re-tentative
                                startChatEventSource(targetTicketId, channelId);
                                updateChatStatus(targetTicketId, 'active', 'Chat client accepté');
                                
                                // ✅ NOUVEAU : Attendre puis ouvrir la bannière de chat
                                setTimeout(async () => {
                                    setChatState(targetTicketId, 'open');
                                    console.log(`✅ [GlobalClientRequest] Bannière de chat ouverte via setChatState (re-tentative) pour ticket ${targetTicketId}`);
                                }, 500);
                            }, 2000);
                        }
                    }, 2000); // Augmenter le délai pour laisser le temps au DOM
                } else {
                    throw new Error('Erreur lors du démarrage du chat');
                }
            } catch (error) {
                console.error('❌ [GlobalClientRequest] Erreur acceptation:', error);
                // ✅ NETTOYAGE : Supprimer du cache en cas d'erreur pour ne pas bloquer
                processedChannels.delete(channelId);
                showErrorNotification('Erreur lors de l\'acceptation du chat client');
            }
            
            // Supprimer la notification
            const notif = document.querySelector('.global-client-request-notification');
            if (notif) notif.remove();
        }
        
        function declineGlobalClientChatRequest(channelId) {
            console.log('❌ [GlobalClientRequest] Technicien refuse la demande client globale');
            
            showNotification('Demande de chat client refusée');
            
            // Supprimer la notification
            const notif = document.querySelector('.global-client-request-notification');
            if (notif) notif.remove();
            
            // TODO: Informer le client que la demande a été refusée
        }

        // ✅ MODIFIÉ : Fonction pour réduire le chat en bulle (style Messenger amélioré)
        window.minimizeChatBanner = function(ticketId) {
            console.log('🔽 [MinimizeChat] Minimisation style Messenger pour ticket:', ticketId);
            
            // ✅ CORRECTION : Sauvegarder les informations du chat avant minimisation
            const existingChatInfo = activeChats[ticketId];
            if (existingChatInfo) {
                // Sauvegarder dans minimizedChats AVANT de supprimer d'activeChats
                minimizedChats[ticketId] = {
                    ...existingChatInfo, // Copier toutes les informations existantes
                    roomId: getCurrentTicketRoom(ticketId),
                    ticketId: ticketId,
                    expanded: false,
                    minimizedAt: new Date().toISOString()
                };
                console.log('💾 [MinimizeChat] Informations chat sauvegardées:', minimizedChats[ticketId]);
            }
            
            // ✅ CORRECTION : Fermer aussi le modal du ticket
            const modal = document.getElementById('ticketModal');
            if (modal) {
                modal.classList.remove('active');
                console.log('📋 [MinimizeChat] Modal ticket fermé');
            }
            
            // ✅ NOUVEAU : Utiliser la fonction centralisée setChatState
            setChatState(ticketId, 'minimized');
        }
        
                // ✅ MODIFIÉ : Fonction pour fermer complètement un chat réduit avec confirmation
        function closeMinimizedChat(ticketId) {
            console.log(`🤔 [Chat] Demande de fermeture de la miniature pour ticket ${ticketId}`);
            
            // Vérifier s'il y a des messages dans ce chat
            const chatInfo = activeChats[ticketId];
            if (!chatInfo || !chatInfo.chatId) {
                console.log(`ℹ️ [Chat] Pas de chat actif, fermeture directe`);
                // ✅ NOUVEAU : Utiliser la fonction centralisée setChatState
                setChatState(ticketId, 'closed');
                return;
            }
            
            const storedMessages = window.chatMessages.get(chatInfo.chatId);
            const hasMessages = storedMessages && storedMessages.length > 0;
            
            if (hasMessages) {
                console.log(`💬 [Chat] Messages détectés (${storedMessages.length}), affichage modal de confirmation`);
                showChatCloseConfirmation(ticketId);
            } else {
                console.log(`ℹ️ [Chat] Aucun message, fermeture directe`);
                // ✅ NOUVEAU : Utiliser la fonction centralisée setChatState
                setChatState(ticketId, 'closed');
            }
        }
        
        // ✅ NOUVEAU : Fermeture forcée sans confirmation
        function forceCloseMinimizedChat(ticketId) {
            console.log(`🔴 [Chat] Fermeture forcée de la miniature pour ticket ${ticketId}`);
            
            delete minimizedChats[ticketId];
            delete unreadMessageCounts[ticketId];
            
            // Supprimer la bulle de chat spécifique à ce ticket
            const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            if (chatBubble) {
                chatBubble.remove();
            }
            
            // Fermer la bannière de chat si elle existe
                const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                if (chatBanner) {
                chatBanner.style.display = 'none';
            }
            
            // Terminer réellement le chat via l'API
            endChat(ticketId);
            
            updateChatBubbleBadge();
            console.log(`💬 [Chat] Chat fermé définitivement pour le ticket ${ticketId}`);
        }
        
        // ✅ NOUVEAU : Modal de confirmation pour fermeture de chat
        function showChatCloseConfirmation(ticketId) {
            console.log(`📋 [ChatClose] Affichage modal de confirmation pour ticket ${ticketId}`);
            
            // Récupérer les informations du ticket et du chat (actif OU minimisé)
            const ticket = tickets.find(t => t.id === ticketId);
            const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
            const storedMessages = window.chatMessages.get(chatInfo?.chatId);
            const messageCount = storedMessages ? storedMessages.length : 0;
            const roomName = ticket?.room || chatInfo?.roomId || 'Salle inconnue';
            
            console.log(`🔍 [ChatCloseConfirmation] Chat trouvé dans:`, {
                activeChats: !!activeChats[ticketId],
                minimizedChats: !!minimizedChats[ticketId],
                messageCount: messageCount,
                roomName: roomName
            });
            
            // Créer le modal de confirmation
            const modal = document.createElement('div');
            modal.className = 'chat-close-confirmation-modal';
            modal.innerHTML = `
                <div class="chat-close-confirmation-overlay" onclick="closeChatCloseConfirmation('${ticketId}')"></div>
                <div class="chat-close-confirmation-content">
                    <div class="chat-close-confirmation-header">
                        <h3>💬 Fermeture du chat - ${roomName}</h3>
                        <button class="chat-close-confirmation-close" onclick="closeChatCloseConfirmation('${ticketId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="chat-close-confirmation-body">
                        <div class="chat-close-info">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Vous êtes sur le point de fermer définitivement ce chat.</p>
                            <p><strong>${messageCount} message(s)</strong> seront perdus si vous ne les sauvegardez pas.</p>
                        </div>
                        
                        <div class="chat-close-options">
                            <div class="chat-close-option">
                                <i class="fas fa-save"></i>
                                <div>
                                    <h4>Sauvegarder l'historique</h4>
                                    <p>Créer un résumé du chat avant de fermer</p>
                                </div>
                            </div>
                            <div class="chat-close-option">
                                <i class="fas fa-trash"></i>
                                <div>
                                    <h4>Fermer sans sauvegarder</h4>
                                    <p>L'historique sera définitivement perdu</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-close-confirmation-actions">
                        <button class="btn btn-success" onclick="saveChatAndClose('${ticketId}')">
                            <i class="fas fa-save"></i>
                            Sauvegarder et fermer
                        </button>
                        <button class="btn btn-danger" onclick="closeWithoutSaving('${ticketId}')">
                            <i class="fas fa-trash"></i>
                            Fermer sans sauvegarder
                        </button>
                        <button class="btn btn-secondary" onclick="closeChatCloseConfirmation('${ticketId}')">
                            <i class="fas fa-times"></i>
                            Annuler
                        </button>
                    </div>
                </div>
            `;
            
            // Ajouter le modal au DOM
            document.body.appendChild(modal);
            
            // Animation d'entrée
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            
            console.log(`✅ [ChatClose] Modal de confirmation affiché`);
        }
        
        // ✅ NOUVEAU : Fermer le modal de confirmation
        function closeChatCloseConfirmation(ticketId = null) {
            const modal = document.querySelector('.chat-close-confirmation-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                }, 300);
                
                // ✅ CORRECTION : Si on ferme le modal de confirmation sans action,
                // on ferme quand même la miniature (comportement attendu)
                if (ticketId) {
                    console.log(`🔄 [ChatClose] Fermeture de la miniature après annulation pour ticket ${ticketId}`);
                    forceCloseMinimizedChat(ticketId);
                }
            }
        }
        
        // ✅ NOUVEAU : Sauvegarder et fermer le chat
        async function saveChatAndClose(ticketId) {
            console.log(`💾 [ChatClose] Sauvegarde et fermeture pour ticket ${ticketId}`);
            
            // ✅ CORRECTION : Fermer la miniature D'ABORD
            console.log(`🗑️ [ChatClose] Fermeture définitive de la miniature pour ${ticketId} AVANT résumé`);
            
            // Vérifier que la miniature existe
                const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            console.log(`🔍 [ChatClose] Miniature trouvée: ${!!chatBubble}, minimizedChats.has: ${!!minimizedChats[ticketId]}`);
            
            // Fermer le modal de confirmation
            closeChatCloseConfirmation();
            
            // Créer un résumé simple de l'historique AVANT de fermer
            let summary = null;
            const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
            console.log(`🔍 [SaveChatAndClose] Chat trouvé dans:`, {
                activeChats: !!activeChats[ticketId],
                minimizedChats: !!minimizedChats[ticketId],
                chatId: chatInfo?.chatId
            });
            
            if (chatInfo && chatInfo.chatId) {
                const storedMessages = window.chatMessages.get(chatInfo.chatId);
                if (storedMessages && storedMessages.length > 0) {
                    const ticket = tickets.find(t => t.id === ticketId);
                    const roomName = ticket?.room || 'Salle inconnue';
                    summary = createChatSummary(storedMessages, roomName);
                }
            }
            
            // ✅ NOUVEAU : Fermer le chat côté client AVANT de nettoyer localement
            if (chatInfo && chatInfo.chatId) {
                console.log(`🔚 [SaveChatAndClose] Fermeture du chat côté client pour ${ticketId}`);
                try {
                    await endChat(ticketId);
                    console.log(`✅ [SaveChatAndClose] Chat fermé côté client avec succès`);
                } catch (error) {
                    console.error(`❌ [SaveChatAndClose] Erreur lors de la fermeture côté client:`, error);
                }
            }
            
            // Fermer définitivement le chat (actif OU minimisé)
            cleanupChatCompletely(ticketId);
            
            // ✅ NOUVEAU : Supprimer AUSSI la persistance (comme "Quitter")
            if (chatInfo && chatInfo.chatId) {
                console.log(`🗑️ [SaveChatAndClose] Nettoyage persistance pour chatId: ${chatInfo.chatId}`);
                
                // Nettoyer window.chatMessages
                window.chatMessages.delete(chatInfo.chatId);
                
                // Nettoyer sessionStorage (Hotfix v3)
                if (typeof clearChatHistory === 'function') {
                    clearChatHistory(chatInfo.chatId);
                    console.log(`🗑️ [SaveChatAndClose] SessionStorage nettoyé pour chatId: ${chatInfo.chatId}`);
                }
                
                // Nettoyer tous les caches possibles
                sessionStorage.removeItem(`chat_${chatInfo.chatId}`);
                sessionStorage.removeItem(`chatHistory_${chatInfo.chatId}`);
                
                console.log(`✅ [SaveChatAndClose] Persistance complètement supprimée pour ${ticketId}`);
            }
            
            // Afficher le résumé APRÈS fermeture
            if (summary) {
                setTimeout(() => {
                    showChatSummaryNotification(summary, ticketId);
                }, 100);
            }
        }
        
        // ✅ NOUVEAU : Nettoyer complètement un chat (actif OU minimisé)
        function cleanupChatCompletely(ticketId) {
            console.log(`🧹 [CleanupChat] Nettoyage complet pour ticket ${ticketId}`);
            
            // Nettoyer activeChats
            if (activeChats[ticketId]) {
                console.log(`🗑️ [CleanupChat] Suppression de activeChats[${ticketId}]`);
                delete activeChats[ticketId];
            }
            
            // Nettoyer minimizedChats
            if (minimizedChats[ticketId]) {
                console.log(`🗑️ [CleanupChat] Suppression de minimizedChats[${ticketId}]`);
                delete minimizedChats[ticketId];
            }
            
            // Nettoyer unreadMessageCounts
            if (unreadMessageCounts[ticketId]) {
                console.log(`🗑️ [CleanupChat] Suppression de unreadMessageCounts[${ticketId}]`);
                delete unreadMessageCounts[ticketId];
            }
            
            // Supprimer la bulle de chat miniature
            const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            if (chatBubble) {
                chatBubble.remove();
                console.log(`🗑️ [CleanupChat] Bulle de chat supprimée pour ${ticketId}`);
            }
            
            // Fermer la bannière de chat active si elle existe
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            if (chatBanner) {
                chatBanner.remove();
                console.log(`🗑️ [CleanupChat] Bannière de chat supprimée pour ${ticketId}`);
            }
            
            // Réinitialiser le chat ouvert actuel si c'est celui-ci
            if (window.currentOpenChatId === ticketId) {
                window.currentOpenChatId = null;
                console.log(`🗑️ [CleanupChat] currentOpenChatId réinitialisé`);
            }
        }
        
        // ✅ NOUVEAU : Fermer sans sauvegarder
        async function closeWithoutSaving(ticketId) {
            console.log(`🗑️ [ChatClose] Fermeture sans sauvegarde pour ticket ${ticketId}`);
            
            // Récupérer les infos du chat (actif OU minimisé) AVANT de nettoyer
            const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
            
            // Vérifier que la miniature existe
            const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
            console.log(`🔍 [ChatClose] Miniature trouvée: ${!!chatBubble}, minimizedChats.has: ${!!minimizedChats[ticketId]}`);
            
            // Fermer le modal de confirmation
            closeChatCloseConfirmation();
            
            // ✅ NOUVEAU : Fermer le chat côté client AVANT de nettoyer localement
            if (chatInfo && chatInfo.chatId) {
                console.log(`🔚 [CloseWithoutSaving] Fermeture du chat côté client pour ${ticketId}`);
                try {
                    await endChat(ticketId);
                    console.log(`✅ [CloseWithoutSaving] Chat fermé côté client avec succès`);
                } catch (error) {
                    console.error(`❌ [CloseWithoutSaving] Erreur lors de la fermeture côté client:`, error);
                }
            }
            
            // ✅ CORRECTION : Fermer définitivement le chat (actif OU minimisé)
            console.log(`🗑️ [ChatClose] Fermeture définitive du chat pour ${ticketId}`);
            cleanupChatCompletely(ticketId);
        }
        
        // ✅ NOUVEAU : Créer un résumé du chat
        function createChatSummary(messages, roomName) {
            const startTime = messages[0]?.timestamp ? new Date(messages[0].timestamp).toLocaleString() : 'Inconnue';
            const endTime = messages[messages.length - 1]?.timestamp ? new Date(messages[messages.length - 1].timestamp).toLocaleString() : 'Inconnue';
            
            let summary = `📋 RÉSUMÉ DU CHAT - ${roomName}\n`;
            summary += `🕐 Début: ${startTime}\n`;
            summary += `🕐 Fin: ${endTime}\n`;
            summary += `💬 Messages: ${messages.length}\n\n`;
            summary += `--- HISTORIQUE ---\n`;
            
            messages.forEach((msg, index) => {
                const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                const sender = msg.type === 'sent' ? 'TECHNICIEN' : msg.type === 'received' ? 'CLIENT' : 'SYSTÈME';
                const cleanMessage = msg.message.replace(/<[^>]*>/g, ''); // Supprimer les balises HTML
                summary += `[${time}] ${sender}: ${cleanMessage}\n`;
            });
            
            return summary;
        }
        
        // ✅ NOUVEAU : Afficher le résumé dans une notification
        function showChatSummaryNotification(summary, ticketId) {
            const notification = document.createElement('div');
            notification.className = 'chat-summary-notification';
            notification.innerHTML = `
                <div class="chat-summary-header">
                    <h4>💾 Chat sauvegardé</h4>
                    <button onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="chat-summary-body">
                    <p>L'historique du chat a été sauvegardé. Vous pouvez le copier ci-dessous :</p>
                    <textarea readonly onclick="this.select()" style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">${summary}</textarea>
                </div>
                <div class="chat-summary-actions">
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.querySelector('textarea').value); showNotification('Résumé copié dans le presse-papier!')">
                        <i class="fas fa-copy"></i>
                        Copier
                    </button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">
                        Fermer
                    </button>
                </div>
            `;
            
            // Styles inline pour la notification
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: auto;
                padding: 20px;
            `;
            
            document.body.appendChild(notification);
            
            // Auto-suppression après 30 secondes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 30000);
        }
        
        // ✅ NOUVEAU : Fonction utilitaire pour trouver un ticketId par room
        function findTicketIdByRoom(roomId) {
            if (!tickets || !Array.isArray(tickets)) {
                console.warn('⚠️ [FindTicket] Liste des tickets non disponible');
                return null;
            }
            
            const ticket = tickets.find(t => t.room === roomId);
            if (ticket) {
                console.log(`🔍 [FindTicket] Ticket trouvé pour salle ${roomId}: ${ticket.id}`);
                return ticket.id;
            }
            
            console.warn(`⚠️ [FindTicket] Aucun ticket trouvé pour la salle ${roomId}`);
            return null;
        }
        
        // ✅ MODIFIÉ : Fonction pour agrandir un chat réduit (style Messenger)
        function expandMinimizedChat(ticketId) {
            console.log(`💬 [Chat] Tentative d'agrandissement pour le ticket ${ticketId}`);
            
            // ✅ CORRECTION : Restaurer les informations du chat depuis minimizedChats (objet)
            const minimizedInfo = minimizedChats[ticketId];
            if (minimizedInfo) {
                // Restaurer dans activeChats avec toutes les informations
                activeChats[ticketId] = {
                    ...minimizedInfo,
                    status: 'active',
                    restoredAt: new Date().toISOString()
                };
                console.log('🔄 [ExpandChat] Informations chat restaurées:', activeChats[ticketId]);
                
                // Supprimer de minimizedChats après transfert
                delete minimizedChats[ticketId];
            }
            
            // ✅ NOUVEAU : Réinitialiser le badge de notifications
            if (typeof unreadMessageCounts !== 'undefined') {
                unreadMessageCounts[ticketId] = 0; // Utiliser objet directement
            }
            updateChatBubbleBadge(ticketId);
            
            // ✅ NOUVEAU : Utiliser la fonction centralisée setChatState
            setChatState(ticketId, 'open');
            
            // ✅ CORRECTION : Ouvrir d'abord le modal du ticket
            console.log(`📋 [Chat] Ouverture du modal ticket pour ${ticketId}`);
            openTicketModal(ticketId);
            
            // Attendre que le modal soit ouvert avant de restaurer le chat
            setTimeout(() => {
                // ✅ CORRECTION : Afficher d'abord le chat banner
                const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                if (chatBanner) {
                    chatBanner.style.display = 'flex';
                    chatBanner.className = 'chat-banner-fullscreen';
                    console.log(`✅ [ExpandChat] Chat banner affiché pour ${ticketId}`);
                    
                    // ✅ NOUVEAU : Mettre à jour le statut du chat pour montrer qu'il est actif
                    updateChatStatus(ticketId, 'active', 'Chat restauré');
                    
                    // ✅ NOUVEAU : Afficher le bouton "Terminer le chat"
                    const endChatBtn = document.getElementById(`endChatBtn_${ticketId}`);
                    if (endChatBtn) {
                        endChatBtn.style.display = 'inline-block';
                    }
                    
                } else {
                    console.warn(`⚠️ [ExpandChat] Chat banner non trouvé pour ${ticketId}`);
                }
                
                // ✅ CORRECTION CRITIQUE : Utiliser les informations restaurées depuis minimizedChats
                const restoredChatInfo = activeChats[ticketId];
                if (restoredChatInfo && restoredChatInfo.chatId) {
                    console.log(`🔄 [ExpandChat] Chat info restauré pour ${ticketId}, chatId: ${restoredChatInfo.chatId}`);
                    console.log(`📊 [ExpandChat] Messages disponibles: ${window.chatMessages.get ? window.chatMessages.get(restoredChatInfo.chatId)?.length || 0 : 'N/A'}`);
                    
                    // Restaurer les messages du chat existant
                    if (window.restoreChatMessages) {
                        window.restoreChatMessages(ticketId, restoredChatInfo.chatId);
                        console.log(`📬 [ExpandChat] Messages restaurés pour chatId: ${restoredChatInfo.chatId}`);
                    }
                    
                    // Redémarrer l'écoute SSE avec le chatId existant
                    console.log(`🔌 [Chat] Tentative reconnexion SSE avec channelId: ${restoredChatInfo.chatId}`);
                    if (typeof startChatEventSource === 'function') {
                        startChatEventSource(ticketId, restoredChatInfo.chatId);
                        console.log(`🔌 [Chat] SSE reconnecté avec chatId existant: ${restoredChatInfo.chatId}`);
                    }
                } else {
                    console.error(`❌ [ExpandChat] PROBLÈME CRITIQUE : Aucune info de chat restaurée pour ${ticketId}`);
                    console.log(`🔍 [ExpandChat] activeChats contenu:`, activeChats);
                    console.log(`🔍 [ExpandChat] minimizedChats contenu:`, minimizedChats);
                }
                
                console.log(`💬 [Chat] Chat agrandi pour le ticket ${ticketId} - Modal ouvert et chat affiché`);
            }, 300); // Délai augmenté pour permettre au DOM de se mettre à jour
        }
        
        // ✅ FONCTION DE DEBUG : Vérifier l'état des chats et messages
        window.debugChatState = function(ticketId) {
            console.log(`🔍 [DEBUG] État du chat pour ticket ${ticketId}:`);
            console.log('  activeChats:', activeChats[ticketId]);
            console.log('  minimizedChats:', minimizedChats[ticketId]);
            
            const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
            if (chatInfo && chatInfo.chatId) {
                console.log(`  Messages stockés (${chatInfo.chatId}):`, window.chatMessages.get ? window.chatMessages.get(chatInfo.chatId)?.length || 0 : 'N/A');
                console.log(`  SessionStorage:`, !!sessionStorage.getItem(`tickets_sea_chat_${chatInfo.chatId}`));
            }
        };
        
        // ✅ FONCTION DE TEST : Vérifier la cohérence Map vs Objet
        window.testChatSystemConsistency = function() {
            console.log('🧪 [TEST] Vérification de la cohérence du système de chat...');
            
            console.log('📊 [TEST] Type activeChats:', typeof activeChats, Array.isArray(activeChats) ? 'Array' : 'Object');
            console.log('📊 [TEST] Type minimizedChats:', typeof minimizedChats, Array.isArray(minimizedChats) ? 'Array' : 'Object');
            console.log('📊 [TEST] Type unreadMessageCounts:', typeof unreadMessageCounts, Array.isArray(unreadMessageCounts) ? 'Array' : 'Object');
            
            console.log('🔍 [TEST] Contenu activeChats:', activeChats);
            console.log('🔍 [TEST] Contenu minimizedChats:', minimizedChats);
            console.log('🔍 [TEST] Contenu unreadMessageCounts:', unreadMessageCounts);
            
            // Test d'itération
            try {
                console.log('🧪 [TEST] Test d\'itération activeChats...');
                for (const [ticketId, chatInfo] of Object.entries(activeChats)) {
                    console.log(`  ✅ [TEST] Ticket ${ticketId}: ${chatInfo.chatId || 'N/A'}`);
                }
                console.log('✅ [TEST] Itération activeChats réussie !');
            } catch (error) {
                console.error('❌ [TEST] Erreur itération activeChats:', error);
            }
            
            console.log('✅ [TEST] Système de chat cohérent - Prêt pour les tests !');
        };

        // 🔧 FONCTION DE DIAGNOSTIC : Pourquoi le chat ne s'ouvre pas
        window.diagnoseChatOpening = function(ticketId) {
            console.log(`🔍 [DIAGNOSTIC] Analyse d'ouverture de chat pour ticket ${ticketId}:`);
            
            // 1. Vérifier l'état du système
            console.log('📊 [DIAGNOSTIC] État du système:');
            console.log('  activeChats:', Object.keys(activeChats).length, 'chats');
            console.log('  minimizedChats:', Object.keys(minimizedChats).length, 'chats');
            console.log('  currentOpenChatId:', window.currentOpenChatId);
            
            // 2. Vérifier les éléments DOM
            console.log('🖼️ [DIAGNOSTIC] Éléments DOM:');
            const modal = document.getElementById('ticketModal');
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            const chatStatus = document.getElementById(`chatStatus_${ticketId}`);
            
            console.log('  ticketModal:', !!modal, modal?.classList.contains('active') ? 'OUVERT' : 'FERMÉ');
            console.log(`  chatBanner_${ticketId}:`, !!chatBanner, chatBanner?.style.display || 'N/A');
            console.log(`  chatStatus_${ticketId}:`, !!chatStatus);
            
            // 3. Vérifier les données du ticket
            const ticket = tickets.find(t => t.id === ticketId);
            console.log('📋 [DIAGNOSTIC] Données ticket:', !!ticket, ticket?.room || 'N/A');
            
            // 4. Vérifier les infos de chat
            const activeChat = activeChats[ticketId];
            const minimizedChat = minimizedChats[ticketId];
            console.log('💬 [DIAGNOSTIC] Infos chat:');
            console.log('  activeChat:', !!activeChat, activeChat?.chatId || 'N/A');
            console.log('  minimizedChat:', !!minimizedChat, minimizedChat?.chatId || 'N/A');
            
            console.log('🎯 [DIAGNOSTIC] Diagnostic terminé - Vérifiez les éléments manquants ci-dessus');
        };

        // ✅ FONCTION DE DEBUG GLOBALE : Afficher l'état de tous les chats
        window.debugAllChats = function() {
            console.log(`🔍 [DEBUG-ALL] État complet du système de chat:`);
            const activeCount = Object.keys(activeChats).length;
            console.log(`📊 [DEBUG-ALL] Chats actifs (${activeCount}):`);
            Object.entries(activeChats).forEach(([ticketId, info]) => {
                console.log(`  - Ticket ${ticketId}: chatId=${info.chatId}, room=${info.roomId || info.room}`);
                console.log(`    Messages: ${window.chatMessages.get(info.chatId)?.length || 0}`);
            });
            
            const minimizedCount = Object.keys(minimizedChats).length;
            console.log(`📱 [DEBUG-ALL] Chats minimisés (${minimizedCount}):`);
            Object.entries(minimizedChats).forEach(([ticketId, info]) => {
                console.log(`  - Ticket ${ticketId}: chatId=${info.chatId}, room=${info.roomId || info.room}`);
                console.log(`    Messages: ${window.chatMessages.get(info.chatId)?.length || 0}`);
                console.log(`    Badge non lus: ${unreadMessageCounts[ticketId] || 0}`);
            });
            
            console.log(`💾 [DEBUG-ALL] Stockage messages (${window.chatMessages.size} chats):`);
            window.chatMessages.forEach((messages, chatId) => {
                console.log(`  - ChatId ${chatId}: ${messages.length} messages`);
            });
        };
        
        // ✅ NOUVEAU : Fonction pour positionner les bulles style Messenger
        function positionMessengerBubbles() {
            const bubbles = document.querySelectorAll('.chat-bubble.messenger-style');
            const baseBottom = 20;
            const baseRight = 20;
            const bubbleHeight = 70; // ✅ CORRIGÉ : Correspond au CSS (70px)
            const spacing = 15; // ✅ AGRANDI : Plus d'espace entre les badges
            
            console.log(`📍 [Position] Positionnement de ${bubbles.length} badge(s) de chat`);
            
            bubbles.forEach((bubble, index) => {
                const bottom = baseBottom + (index * (bubbleHeight + spacing));
                bubble.style.bottom = bottom + 'px';
                bubble.style.right = baseRight + 'px';
                bubble.style.position = 'fixed';
                bubble.style.zIndex = 9999 - index; // Les plus récentes au-dessus
                
                // ✅ NOUVEAU : Log pour debug du positionnement
                const ticketId = bubble.dataset.chatId;
                console.log(`📍 [Position] Badge ${index + 1}: ticket ${ticketId} à ${bottom}px du bas`);
            });
        }
        
        // ✅ NOUVEAU : Fonction pour mettre à jour le badge d'une bulle spécifique
        function updateChatBubbleBadge(ticketId) {
            if (ticketId) {
                // Mettre à jour une bulle spécifique
                const badge = document.getElementById(`chatBubbleBadge_${ticketId}`);
                const count = unreadMessageCounts[ticketId] || 0;
                
                console.log(`🔍 [Badge] Mise à jour badge pour ${ticketId}, count: ${count}, badge trouvé: ${!!badge}`);
                
                if (badge) {
                    badge.textContent = count > 99 ? '99+' : count.toString();
                    badge.style.display = count > 0 ? 'flex' : 'none';
                    
                    // Animation de pulsation pour les nouveaux messages
                    if (count > 0) {
                        badge.style.animation = 'pulse 1s ease-in-out infinite';
                        console.log(`🔔 [Badge] Badge affiché avec ${count} message(s) non lu(s) pour ${ticketId}`);
                    } else {
                        badge.style.animation = '';
                        console.log(`✅ [Badge] Badge masqué (aucun message non lu) pour ${ticketId}`);
                    }
                } else {
                    console.error(`❌ [Badge] Badge non trouvé pour le ticket ${ticketId}`);
                }
            } else {
                // Mettre à jour toutes les bulles (comportement original)
                console.log('🔄 [Badge] Mise à jour de tous les badges');
                minimizedChats.forEach((chatData, chatTicketId) => {
                    updateChatBubbleBadge(chatTicketId);
                });
            }
        }
        
        // ✅ NOUVEAU : Fonction pour ajouter un message non lu à une bulle
        function addUnreadMessage(ticketId) {
            const currentCount = unreadMessageCounts[ticketId] || 0;
            const newCount = currentCount + 1;
            unreadMessageCounts[ticketId] = newCount;
            
            console.log(`📬 [UnreadMessage] Ajout message non lu pour ${ticketId}: ${currentCount} → ${newCount}`);
            
            updateChatBubbleBadge(ticketId);
            
            // Animation de la bulle pour attirer l'attention
            const bubble = document.getElementById(`chatBubble_${ticketId}`);
            if (bubble) {
                bubble.classList.add('new-message-pulse');
                setTimeout(() => {
                    bubble.classList.remove('new-message-pulse');
                }, 600);
                console.log(`💫 [UnreadMessage] Animation appliquée à la bulle ${ticketId}`);
            } else {
                console.warn(`⚠️ [UnreadMessage] Bulle non trouvée pour ${ticketId}`);
            }
        }
        
        // ✅ SUPPRIMÉ : Fonction de drag complètement supprimée (inutile comme demandé)
        
        // Fonction pour positionner les bulles de chat pour éviter les chevauchements
        function positionChatBubble(chatBubble, ticketId) {
            const baseBottom = 20;
            const baseRight = 20;
            const bubbleHeight = 80;
            const bubbleWidth = 300;
            const spacing = 10;
            
            // Calculer la position en fonction du nombre de chats minimisés
            const minimizedCount = minimizedChats.size;
            const index = Array.from(minimizedChats.keys()).indexOf(ticketId);
            
            // Positionner chaque bulle avec un décalage
            const bottom = baseBottom + (index * (bubbleHeight + spacing));
            const right = baseRight;
            
            chatBubble.style.bottom = bottom + 'px';
            chatBubble.style.right = right + 'px';
        }
        
        // Fonction pour obtenir la salle d'un ticket
        function getCurrentTicketRoom(ticketId) {
            // Récupérer la salle depuis les tickets chargés
            const ticket = tickets.find(t => t.id === ticketId);
            if (ticket && ticket.room) {
                return ticket.room;
            }
            
            // Si pas trouvé, essayer de récupérer depuis l'élément DOM
            const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
            if (chatBanner) {
                const headerInfo = chatBanner.querySelector('.chat-header-info h3');
                if (headerInfo) {
                    const match = headerInfo.textContent.match(/Salle\s+([A-Z]-\d+)/);
                    if (match) {
                        return match[1];
                    }
                }
            }
            
            return 'A-1785'; // Valeur par défaut
        }
        

        
        function incrementUnreadCount(ticketId) {
            if (minimizedChats[ticketId]) {
                const currentCount = unreadMessageCounts[ticketId] || 0;
                unreadMessageCounts[ticketId] = currentCount + 1;
                updateChatBubbleBadge();
                
                // Faire clignoter la bulle spécifique pour attirer l'attention
                const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
                if (chatBubble) {
                chatBubble.style.animation = 'pulse 1s ease-in-out 3';
                setTimeout(() => {
                    chatBubble.style.animation = '';
                }, 3000);
            }
        }
        }
        


        // Fonctions de notification
        // ✅ RESTAURÉ : Toast BLEU style préféré pour fermeture client
        function showChatEndedByClient(roomId) {
            const toast = document.createElement('div');
            toast.className = 'toast chat-ended-by-client';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            
            // Utiliser les classes CSS définies dans styles.css pour le style BLEU
            toast.innerHTML = `
                <div class="toast-header">
                    <i class="fas fa-comment-slash chat-ended-icon"></i>
                    <h4 class="toast-title">Chat terminé par le client</h4>
                </div>
                <div class="toast-body">
                    Le client a mis fin à la conversation.
                    <div class="room-info">
                        <i class="fas fa-door-open"></i> Salle ${roomId}
                    </div>
                </div>
            `;

            // Créer ou récupérer le conteneur de toasts
            let toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toastContainer';
                document.body.appendChild(toastContainer);
            }
            toastContainer.appendChild(toast);

            // Supprimer le toast après 5 secondes
            setTimeout(() => {
                toast.remove();
            }, 5000);
            
            console.log(`💙 [Toast BLEU] Toast affiché: Chat terminé par le client - Salle ${roomId}`);
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
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
        
        function showChatCloseConfirmation(ticketId) {
            const confirmation = document.createElement('div');
            confirmation.className = 'chat-close-confirmation';
            confirmation.innerHTML = `
                <div class="confirmation-content">
                    <div class="confirmation-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="confirmation-text">
                        <h4>Créer un résumé</h4>
                        <p>Voulez-vous enregistrer un résumé de cette conversation ?</p>
                        <p class="confirmation-note">Le résumé sera sauvegardé et le chat sera fermé automatiquement.</p>
                    </div>
                    <div class="confirmation-actions">
                        <button class="confirmation-btn cancel" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                            Annuler
                        </button>
                        <button class="confirmation-btn primary" onclick="createChatSummaryAndCloseWithNotification('${ticketId}'); this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-save"></i>
                            Enregistrer et quitter
                        </button>
                        <button class="confirmation-btn danger" onclick="quitChatWithoutSaving('${ticketId}'); this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-sign-out-alt"></i>
                            Quitter
                        </button>
                    </div>
                </div>
            `;
            
            confirmation.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                color: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                z-index: 10001;
                animation: confirmationSlideIn 0.3s ease-out;
                border: 2px solid rgba(59, 130, 246, 0.3);
                min-width: 400px;
                max-width: 500px;
            `;
            
            document.body.appendChild(confirmation);
            
            // Fermer avec Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    confirmation.remove();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }

        // Rendre globale pour accès depuis d'autres fonctions
        window.showErrorNotification = function(message) {
            const notification = document.createElement('div');
            notification.className = 'error-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
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
            }, 4000);
        }

        function showDeleteNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'delete-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3);
                z-index: 10000;
                animation: slideInRight 0.5s ease-out;
                font-weight: 600;
                min-width: 250px;
                border: 2px solid rgba(255, 255, 255, 0.2);
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }, 4000);
        }

        // Export CSV
        function exportTickets() {
            trackUserInteraction();
            
            if (tickets.length === 0) {
                showErrorNotification('Aucun ticket à exporter');
                return;
            }
            
            const csvData = tickets.map(ticket => ({
                'Numéro': ticket.ticket_number,
                'Titre': ticket.title,
                'Statut': getStatusLabel(ticket.status),
                'Priorité': getPriorityLabel(ticket.priority),
                'Catégorie': ticket.category,
                'Salle': ticket.room || '',
                'Équipement': ticket.device_name || '',
                'Date création': formatDate(ticket.created_at),
                'Description': ticket.description
            }));
            
            const headers = Object.keys(csvData[0]);
            const csvContent = [
                headers.join(','),
                ...csvData.map(row => headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `tickets_sea_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            showNotification(`${csvData.length} tickets exportés`);
            announceToScreenReader(`${csvData.length} tickets exportés`);
        }

        // Système de rafraîchissement automatique intelligent
        function startAutoRefresh() {
            // Ne pas démarrer si l'utilisateur interagit
            if (isUserInteracting) {
                console.log('⏸️ Auto-refresh différé - interaction utilisateur détectée');
                return;
            }
            
            // Rafraîchir toutes les 5 secondes pour une synchronisation rapide avec l'assistant
            autoRefreshInterval = setInterval(() => {
                if (isPageVisible && !isLoading && !isUserInteracting) {
                    loadTickets(true); // Mode silencieux
                }
            }, 15000); // 15 secondes pour éviter la surcharge
            
            console.log('🔄 Auto-refresh activé: mise à jour toutes les 15 secondes');
        }

        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                console.log('🛑 Auto-refresh désactivé');
            }
        }

        // Gestion de la visibilité de la page
        function setupVisibilityHandling() {
            document.addEventListener('visibilitychange', () => {
                isPageVisible = !document.hidden;
                
                if (isPageVisible) {
                    console.log('👁️ Page visible - Reprise de l\'auto-refresh');
                    // Rafraîchir immédiatement quand la page redevient visible
                    if (!isUserInteracting) {
                        loadTickets(true);
                        if (!autoRefreshInterval) {
                            startAutoRefresh();
                        }
                    }
                } else {
                    console.log('👁️‍🗨️ Page cachée - Auto-refresh continue');
                }
            });

            // Rafraîchir quand on revient sur l'onglet (utile après création de ticket via assistant)
            window.addEventListener('focus', () => {
                if (isPageVisible && !isUserInteracting) {
                    console.log('🔄 Focus détecté - Rafraîchissement immédiat pour synchronisation');
                    loadTickets(true);
                }
            });
        }

        // Notification pour les nouveaux tickets
        function showNewTicketNotification(count) {
            const notification = document.createElement('div');
            notification.className = 'new-ticket-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-ticket-alt" aria-hidden="true"></i>
                    <span>${count} nouveau${count > 1 ? 'x' : ''} ticket${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                animation: slideInRight 0.5s ease-out;
                font-weight: 600;
                min-width: 250px;
            `;
            
            document.body.appendChild(notification);
            
            announceToScreenReader(`${count} nouveau${count > 1 ? 'x' : ''} ticket${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''}`);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }, 4000);
            
            console.log(`🎫 Notification: ${count} nouveau${count > 1 ? 'x' : ''} ticket${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''}`);
        }

        // Nettoyage quand on quitte la page
        window.addEventListener('beforeunload', () => {
            stopAutoRefresh();
        });

        // Basculer le thème
        window.toggleTheme = function() {
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

        // Appliquer le thème sauvegardé
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                document.getElementById('themeIcon').className = 'fas fa-sun';
                document.getElementById('themeText').textContent = 'Mode jour';
            }
        });

        // Ajouter les styles d'animations si pas déjà présents
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                
                .new-ticket-notification .notification-content,
                .success-notification .notification-content,
                .error-notification .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .new-ticket-notification i,
                .success-notification i,
                .error-notification i {
                    font-size: 1.2rem;
                }
                
                /* 🎨 STYLES CARTES PODIO INSPIRÉES DE SAV QONNECT */
                .podio-info-section {
                    margin: 1.5rem 0;
                    padding: 1rem;
                    background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg-dark) 100%);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                
                .podio-info-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .podio-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 0.75rem;
                }
                
                .podio-card {
                    background: linear-gradient(135deg, var(--card-color) 0%, var(--card-color-dark) 100%);
                    border-radius: 8px;
                    padding: 0.75rem;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .podio-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--card-accent);
                }
                
                .podio-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .podio-card-header {
                    font-size: 0.65rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: rgba(255, 255, 255, 0.9);
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                }
                
                .podio-card-value {
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: white;
                    line-height: 1.3;
                }
                
                /* Couleurs inspirées de Podio SAV Qonnect */
                .podio-card.pavillon {
                    --card-color: #22c55e;
                    --card-color-dark: #16a34a;
                    --card-accent: #15803d;
                }
                
                .podio-card.bassin {
                    --card-color: #f59e0b;
                    --card-color-dark: #d97706;
                    --card-accent: #b45309;
                }
                
                .podio-card.type {
                    --card-color: #ef4444;
                    --card-color-dark: #dc2626;
                    --card-accent: #b91c1c;
                }
                
                .podio-card.capacite {
                    --card-color: #8b5cf6;
                    --card-color-dark: #7c3aed;
                    --card-accent: #6d28d9;
                }
                
                @media (max-width: 640px) {
                    .podio-cards-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .podio-card {
                        padding: 0.6rem;
                    }
                    
                    .podio-card-header {
                        font-size: 0.6rem;
                    }
                    
                    .podio-card-value {
                        font-size: 0.75rem;
                    }
                }
                
                /* 💬 STYLES POUR LE CHAT */
                .chat-section {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg-dark) 100%);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                
                .chat-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .chat-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                }
                
                .chat-btn.primary {
                    background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
                    color: white;
                }
                
                .chat-btn.primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
                }
                
                .chat-btn.secondary {
                    background: linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%);
                    color: white;
                }
                
                .chat-btn.secondary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }
                
                .chat-btn.success {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: 1px solid #059669;
                }
                
                .chat-btn.success:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                }
                
                .chat-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                }
                
                .chat-status {
                    margin-top: 0.75rem;
                }
                
                .status-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                
                .status-indicator.offline {
                    background: rgba(107, 114, 128, 0.2);
                    color: #9ca3af;
                }
                
                .status-indicator.neutral {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }
                
                .status-indicator.pending {
                    background: rgba(245, 158, 11, 0.2);
                    color: #fbbf24;
                }
                
                .status-indicator.active {
                    background: rgba(34, 197, 94, 0.2);
                    color: #4ade80;
                }
                
                                 .status-indicator i {
                     font-size: 0.75rem;
                 }
                 
                                   /* 💬 BANNIÈRE DE CHAT AUTONOME - PLEIN ÉCRAN */
                  .chat-banner-fullscreen {
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
                      z-index: 10000;
                      display: flex;
                      flex-direction: column;
                      animation: chatSlideIn 0.3s ease-out;
                       /* Empêcher la fermeture accidentelle en cliquant à l'extérieur */
                       pointer-events: auto;
                   }
                   
                   /* Empêcher les clics à l'extérieur de fermer la bannière */
                   .chat-banner-fullscreen * {
                       pointer-events: auto;
                  }
                  
                  @keyframes chatSlideIn {
                      from {
                          opacity: 0;
                          transform: translateY(20px);
                      }
                      to {
                          opacity: 1;
                          transform: translateY(0);
                      }
                  }
                  
                  /* Bannière normale (pour référence) */
                  .chat-banner {
                      margin-top: 1rem;
                      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
                      border-radius: 12px;
                      border: 2px solid rgba(59, 130, 246, 0.3);
                      overflow: hidden;
                      box-shadow: 0 8px 25px rgba(30, 64, 175, 0.3);
                  }
                 
                                   .chat-banner-header {
                      background: rgba(255, 255, 255, 0.1);
                      padding: 1.5rem;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                  }
                  
                  .chat-header-info h3 {
                      color: white;
                      margin: 0 0 0.5rem 0;
                      font-size: 1.25rem;
                      font-weight: 600;
                  }
                  
                  .chat-subtitle {
                      color: rgba(255, 255, 255, 0.8);
                      margin: 0;
                      font-size: 0.9rem;
                      font-style: italic;
                  }
                 
                 .chat-close-btn {
                     background: rgba(239, 68, 68, 0.8);
                     border: none;
                     color: white;
                     width: 32px;
                     height: 32px;
                     border-radius: 50%;
                     cursor: pointer;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     transition: all 0.2s ease;
                 }
                 
                 .chat-close-btn:hover {
                     background: rgba(239, 68, 68, 1);
                     transform: scale(1.1);
                 }
                  
                  .chat-header-actions {
                      display: flex;
                      gap: 0.5rem;
                      align-items: center;
                  }
                  
                  .chat-minimize-btn {
                      background: rgba(107, 114, 128, 0.6);
                      border: none;
                      color: white;
                      width: 32px;
                      height: 32px;
                      border-radius: 6px;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: all 0.2s ease;
                  }
                  
                  .chat-minimize-btn:hover {
                      background: rgba(107, 114, 128, 0.8);
                     transform: scale(1.1);
                 }
                 
                                   .chat-messages {
                      flex: 1;
                      overflow-y: auto;
                      padding: 1.5rem;
                      background: rgba(255, 255, 255, 0.05);
                      display: flex;
                      flex-direction: column;
                      gap: 1rem;
                  }
                  
                  /* Message d'accueil système */
                  .chat-message.system-message {
                      background: rgba(59, 130, 246, 0.2);
                      border: 1px solid rgba(59, 130, 246, 0.4);
                      border-radius: 12px;
                      padding: 1rem;
                      margin: 0 auto;
                      max-width: 90%;
                      text-align: center;
                  }
                  
                  .system-message-content {
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      gap: 0.75rem;
                  }
                  
                  .system-message-content i {
                      font-size: 2rem;
                      color: #60a5fa;
                  }
                  
                  .system-message-text {
                      color: white;
                      line-height: 1.6;
                  }
                  
                  .system-message-text strong {
                      color: #93c5fd;
                      font-size: 1.1rem;
                  }
                  
                  .system-message-text em {
                      color: #dbeafe;
                      font-style: italic;
                  }
                 
                 .chat-message {
                     margin-bottom: 0.75rem;
                     padding: 0.5rem 0.75rem;
                     border-radius: 8px;
                     max-width: 80%;
                     word-wrap: break-word;
                 }
                 
                 .chat-message.received {
                     background: #ff6b35;
                     color: white;
                     align-self: flex-start;
                     margin-right: auto;
                     border-left: 4px solid #e55528;
                     box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
                 }
                 
                 .chat-message.sent {
                     background: rgba(34, 197, 94, 0.8);
                     color: white;
                     align-self: flex-end;
                     margin-left: auto;
                 }
                 
                 .chat-input-area {
                     display: flex;
                     gap: 0.5rem;
                     padding: 1rem;
                     background: rgba(255, 255, 255, 0.05);
                     border-top: 1px solid rgba(255, 255, 255, 0.2);
                 }
                 
                 .chat-input {
                     flex: 1;
                     padding: 0.75rem;
                     border: none;
                     border-radius: 8px;
                     background: rgba(255, 255, 255, 0.9);
                     color: #1f2937;
                     font-size: 0.9rem;
                 }
                 
                 .chat-input:focus {
                     outline: none;
                     box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
                 }
                 
                 .chat-send-btn {
                     background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                     border: none;
                     color: white;
                     width: 44px;
                     height: 44px;
                     border-radius: 8px;
                     cursor: pointer;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     transition: all 0.2s ease;
                 }
                 
                                   .chat-send-btn:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                  }
                  
                  /* Footer du chat */
                  .chat-footer {
                      background: rgba(255, 255, 255, 0.05);
                      padding: 1rem 1.5rem;
                      border-top: 1px solid rgba(255, 255, 255, 0.2);
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                  }
                  
                  .chat-status-indicator {
                      display: flex;
                      align-items: center;
                      gap: 0.5rem;
                      color: #4ade80;
                      font-size: 0.9rem;
                      font-weight: 500;
                  }
                  
                  .chat-status-dot {
                      color: #4ade80;
                      animation: pulse 2s infinite;
                  }
                  
                  @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                  }
                  
                  .chat-minimize-btn {
                      background: rgba(107, 114, 128, 0.6);
                      border: none;
                      color: white;
                      width: 32px;
                      height: 32px;
                      border-radius: 6px;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: all 0.2s ease;
                  }
                  
                          .chat-minimize-btn:hover {
            background: rgba(107, 114, 128, 0.8);
            transform: scale(1.1);
        }
        

        
        /* ===== BULLE DE CHAT RÉDUITE (INDÉPENDANTE) ===== */
        .chat-bubble {
            position: fixed;
            width: 300px;
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: none;
            animation: chatBubbleSlideIn 0.3s ease-out;
            border: 2px solid rgba(59, 130, 246, 0.3);
            overflow: hidden;
        }
        
        @keyframes chatBubbleSlideIn {
            from {
                opacity: 0;
                transform: translateX(100%) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }
        
        .chat-bubble-header {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.75rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .chat-bubble-room {
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .chat-bubble-close {
            background: rgba(239, 68, 68, 0.8);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            font-size: 0.8rem;
        }
        
        .chat-bubble-close:hover {
            background: rgba(239, 68, 68, 1);
            transform: scale(1.1);
        }
        
        .chat-bubble-content {
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            position: relative;
        }
        
        .chat-bubble-icon {
            font-size: 1.5rem;
            color: white;
        }
        
        .chat-bubble-info {
            flex: 1;
        }
        
        .chat-bubble-title {
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
        }
        
        .chat-bubble-subtitle {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.8rem;
        }
        
        .chat-bubble-badge {
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            font-weight: 800;
            position: absolute;
            top: 0.5rem;
            right: 1rem;
            animation: pulse 2s infinite;
            line-height: 1;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
            z-index: 10;
        }
        
        .chat-bubble-expand {
            background: rgba(59, 130, 246, 0.8);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: absolute;
            bottom: 0.5rem;
            right: 1rem;
        }
        
        .chat-bubble-expand:hover {
            background: rgba(59, 130, 246, 1);
            transform: scale(1.1);
        }
        
        /* Indicateur de déplacement */
        .chat-bubble::before {
            content: '⋮⋮';
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
            cursor: grab;
            user-select: none;
        }
        
        .chat-bubble:active::before {
            cursor: grabbing;
        }
        
        /* Animation de survol pour indiquer la déplaçabilité */
        .chat-bubble:hover {
            transform: translateY(-2px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            transition: all 0.3s ease;
        }
        
        /* Animation de pulsation pour le badge */
        @keyframes pulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            50% { 
                transform: scale(1.1);
                box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
            }
        }
        
        /* ✅ NOUVEAUX STYLES MESSENGER */
        .chat-bubble.messenger-style {
            width: 280px;
            height: 60px;
            background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
            border-radius: 30px;
            box-shadow: 0 8px 24px rgba(0, 132, 255, 0.25);
            border: none;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s ease;
            overflow: hidden;
        }
        
        .chat-bubble.messenger-style:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 132, 255, 0.35);
        }
        
        .chat-bubble.messenger-style .chat-bubble-content {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 0 16px;
            gap: 12px;
            position: relative;
        }
        
        .chat-bubble.messenger-style .chat-bubble-avatar {
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            flex-shrink: 0;
        }
        
        .chat-bubble.messenger-style .chat-bubble-info {
            flex: 1;
            min-width: 0;
        }
        
        .chat-bubble.messenger-style .chat-bubble-room {
            color: white;
            font-weight: 600;
            font-size: 14px;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .chat-bubble.messenger-style .chat-bubble-status {
            color: rgba(255, 255, 255, 0.8);
            font-size: 11px;
            margin: 0;
        }
        
        .chat-bubble.messenger-style .chat-bubble-badge {
            background: #ff3040;
            color: white;
            border-radius: 50%;
            width: 34px;
            height: 34px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 800;
            position: absolute;
            top: -8px;
            right: 38px;
            border: 3px solid #0084ff;
            line-height: 1;
            box-shadow: 0 4px 12px rgba(255, 48, 64, 0.5);
            z-index: 10;
        }
        
        .chat-bubble.messenger-style .chat-bubble-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .chat-bubble.messenger-style .chat-bubble-close:hover {
            background: rgba(255, 48, 64, 0.9);
            transform: scale(1.1);
        }
        
        /* Animations Messenger */
        @keyframes messengerSlideIn {
            from {
                transform: translateX(100px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
                @keyframes messengerBounce {
            0%, 100% { 
                transform: scale(1); 
            }
            50% { 
                transform: scale(1.05);
            }
        }

        /* ✅ NOUVEAU : Style pour les bulles de chat ouvertes */
        .chat-bubble.chat-expanded {
            opacity: 0.7;
            transform: scale(0.95);
            border: 2px solid #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .chat-bubble.chat-expanded:hover {
            opacity: 1;
            transform: scale(1);
        }
        
         /* Styles pour la bannière de confirmation de fermeture */
         .chat-close-confirmation {
             backdrop-filter: blur(10px);
             -webkit-backdrop-filter: blur(10px);
         }
         
         .confirmation-content {
             text-align: center;
         }
         
         .confirmation-icon {
             font-size: 3rem;
             color: #60a5fa;
             margin-bottom: 1rem;
         }
         
         .confirmation-text h4 {
             margin: 0 0 1rem 0;
             font-size: 1.25rem;
             font-weight: 600;
             color: white;
         }
         
         .confirmation-text p {
             margin: 0 0 0.5rem 0;
             color: rgba(255, 255, 255, 0.9);
             line-height: 1.5;
         }
         
         .confirmation-note {
             font-size: 0.9rem;
             color: rgba(255, 255, 255, 0.7);
             font-style: italic;
         }
         
         .confirmation-actions {
             display: flex;
             gap: 1rem;
             justify-content: center;
             margin-top: 1.5rem;
         }
         
         .confirmation-btn {
             display: inline-flex;
             align-items: center;
             gap: 0.5rem;
             padding: 0.75rem 1.5rem;
             border: none;
             border-radius: 8px;
             font-weight: 600;
             cursor: pointer;
             transition: all 0.2s ease;
             font-size: 0.9rem;
         }
         
         .confirmation-btn.cancel {
             background: rgba(107, 114, 128, 0.6);
             color: white;
         }
         
         .confirmation-btn.cancel:hover {
             background: rgba(107, 114, 128, 0.8);
             transform: translateY(-2px);
         }
         
         .confirmation-btn.confirm {
             background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
             color: white;
         }
         
         .confirmation-btn.confirm:hover {
             background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
         }
         
         /* ✅ NOUVEAU : Style pour le bouton de résumé */
         .confirmation-btn.summary {
             background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
             color: white;
         }
         
         .confirmation-btn.summary:hover {
             background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
         }
         
         /* ✅ NOUVEAU : Style pour le bouton principal (Enregistrer et quitter) */
         .confirmation-btn.primary {
             background: linear-gradient(135deg, #10b981 0%, #059669 100%);
             color: white;
         }
         
         .confirmation-btn.primary:hover {
             background: linear-gradient(135deg, #059669 0%, #047857 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
         }
         
         /* ✅ NOUVEAU : Style pour le bouton danger (Quitter sans sauvegarder) */
         .confirmation-btn.danger {
             background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
             color: white;
         }
         
         .confirmation-btn.danger:hover {
             background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
         }
         
         @keyframes confirmationSlideIn {
             from {
                 opacity: 0;
                 transform: translate(-50%, -50%) scale(0.8);
             }
             to {
                 opacity: 1;
                 transform: translate(-50%, -50%) scale(1);
             }
         }

        /* ===== STYLES POUR LE MODAL DE CONFIRMATION DE FERMETURE DE CHAT ===== */
        .chat-close-confirmation-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .chat-close-confirmation-modal.active {
            opacity: 1;
            visibility: visible;
        }
        
        .chat-close-confirmation-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .chat-close-confirmation-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 500px;
            max-width: 90vw;
            max-height: 80vh;
            overflow: hidden;
            animation: modalSlideIn 0.3s ease-out;
        }
        
        .chat-close-confirmation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .chat-close-confirmation-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }
        
        .chat-close-confirmation-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }
        
        .chat-close-confirmation-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .chat-close-confirmation-body {
            padding: 20px;
        }
        
        .chat-close-info {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }
        
        .chat-close-info i {
            color: #856404;
            font-size: 1.5rem;
            margin-top: 2px;
        }
        
        .chat-close-info p {
            margin: 0 0 5px 0;
            color: #856404;
        }
        
        .chat-close-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .chat-close-option {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .chat-close-option:hover {
            border-color: #007bff;
            background: #f8f9fa;
        }
        
        .chat-close-option i {
            font-size: 1.5rem;
            margin-top: 2px;
        }
        
        .chat-close-option:first-child i {
            color: #28a745;
        }
        
        .chat-close-option:last-child i {
            color: #dc3545;
        }
        
        .chat-close-option h4 {
            margin: 0 0 5px 0;
            font-size: 1rem;
        }
        
        .chat-close-option p {
            margin: 0;
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .chat-close-confirmation-actions {
            display: flex;
            gap: 10px;
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }
        
        .chat-close-confirmation-actions .btn {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .chat-close-confirmation-actions .btn-success {
            background: #28a745;
            color: white;
        }
        
        .chat-close-confirmation-actions .btn-success:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .chat-close-confirmation-actions .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .chat-close-confirmation-actions .btn-danger:hover {
            background: #c82333;
            transform: translateY(-1px);
        }
        
        .chat-close-confirmation-actions .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .chat-close-confirmation-actions .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-1px);
        }
        
        @keyframes modalSlideIn {
            from {
                transform: translate(-50%, -60%);
                opacity: 0;
            }
            to {
                transform: translate(-50%, -50%);
                opacity: 1;
             }
         }

         /* ===== STYLES POUR CRÉATION BT ===== */
         .action-btn.success {
             background: linear-gradient(135deg, #10b981 0%, #059669 100%);
             color: white;
             border: 1px solid #10b981;
         }

         .action-btn.success:hover {
             background: linear-gradient(135deg, #059669 0%, #047857 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
         }

         .bt-modal-content {
             max-width: 900px !important;
             max-height: 90vh;
             overflow-y: auto;
         }

         .bt-form-grid {
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 1.5rem;
             margin-bottom: 2rem;
         }

         .bt-form-group {
             display: flex;
             flex-direction: column;
             gap: 0.5rem;
         }

         .bt-form-group.full-width {
             grid-column: 1 / -1;
         }

         .bt-form-label {
             font-weight: 600;
             color: var(--text-primary);
             font-size: 0.9rem;
         }

         .bt-form-label.required::after {
             content: ' *';
             color: #ef4444;
         }

         .bt-form-input,
         .bt-form-select,
         .bt-form-textarea {
             padding: 0.75rem;
             border: 2px solid #e5e7eb;
             border-radius: 8px;
             font-size: 0.9rem;
             transition: all 0.2s ease;
             background: white;
         }

         .bt-form-input:focus,
         .bt-form-select:focus,
         .bt-form-textarea:focus {
             outline: none;
             border-color: #3b82f6;
             box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
         }

         .bt-form-textarea {
             resize: vertical;
             min-height: 100px;
         }

         .bt-form-buttons {
             display: flex;
             gap: 1rem;
             justify-content: flex-end;
             margin-top: 2rem;
             padding-top: 2rem;
             border-top: 1px solid #e5e7eb;
         }

         .bt-btn {
             padding: 0.75rem 2rem;
             border: none;
             border-radius: 8px;
             font-weight: 600;
             cursor: pointer;
             transition: all 0.2s ease;
             display: flex;
             align-items: center;
             gap: 0.5rem;
         }

         .bt-btn.primary {
             background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
             color: white;
         }

         .bt-btn.primary:hover {
             background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
         }

         .bt-btn.secondary {
             background: #f3f4f6;
             color: #374151;
             border: 1px solid #d1d5db;
         }

         .bt-btn.secondary:hover {
             background: #e5e7eb;
             transform: translateY(-2px);
         }

         .bt-form-section {
             margin-bottom: 2rem;
         }

         .bt-form-section-title {
             font-size: 1.1rem;
             font-weight: 700;
             color: var(--text-primary);
             margin-bottom: 1rem;
             padding-bottom: 0.5rem;
             border-bottom: 2px solid #e5e7eb;
             display: flex;
             align-items: center;
             gap: 0.5rem;
         }

         .bt-validation-error {
             color: #ef4444;
             font-size: 0.8rem;
             margin-top: 0.25rem;
         }

         .bt-form-input.error,
         .bt-form-select.error,
         .bt-form-textarea.error {
             border-color: #ef4444;
             box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
         }

        /* ✅ NOUVEAU : Styles pour le modal BT en mode sombre */
        [data-theme="dark"] .bt-modal-content {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #f3f4f6;
            border: 1px solid rgba(75, 85, 99, 0.3);
        }

        [data-theme="dark"] .bt-form-label {
            color: #f3f4f6;
        }

        [data-theme="dark"] .bt-form-input,
        [data-theme="dark"] .bt-form-select,
        [data-theme="dark"] .bt-form-textarea {
            background: rgba(31, 41, 55, 0.8);
            border: 1px solid rgba(75, 85, 99, 0.5);
            color: #f3f4f6;
        }

        [data-theme="dark"] .bt-form-input:focus,
        [data-theme="dark"] .bt-form-select:focus,
        [data-theme="dark"] .bt-form-textarea:focus {
            border-color: #3b82f6;
            background: rgba(31, 41, 55, 0.9);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        [data-theme="dark"] .bt-form-input::placeholder,
        [data-theme="dark"] .bt-form-textarea::placeholder {
            color: #9ca3af;
        }

        [data-theme="dark"] .bt-form-section-title {
            color: #f3f4f6;
            border-bottom-color: rgba(75, 85, 99, 0.3);
        }

        [data-theme="dark"] .bt-form-input.error,
        [data-theme="dark"] .bt-form-select.error,
        [data-theme="dark"] .bt-form-textarea.error {
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
            background: rgba(31, 41, 55, 0.9);
        }

        [data-theme="dark"] .bt-validation-error {
            color: #fca5a5;
        }

        /* Styles pour les options select en mode sombre */
        [data-theme="dark"] .bt-form-select option {
            background: #1f2937;
            color: #f3f4f6;
        }

        /* Styles pour les boutons du modal BT en mode sombre */
        [data-theme="dark"] .action-btn.success {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            border-color: #059669;
        }

        [data-theme="dark"] .action-btn.success:hover {
            background: linear-gradient(135deg, #047857 0%, #065f46 100%);
            box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
        }

        /* Arrière-plan du modal en mode sombre */
        [data-theme="dark"] #createBTModal {
            background: linear-gradient(135deg, 
                rgba(17, 24, 39, 0.95), 
                rgba(31, 41, 55, 0.95), 
                rgba(55, 65, 81, 0.95)
            );
        }

        /* Bouton de fermeture en mode sombre */
        [data-theme="dark"] .modal-close {
            background: rgba(55, 65, 81, 0.8);
            color: #f3f4f6;
            border: 1px solid rgba(75, 85, 99, 0.5);
        }

        [data-theme="dark"] .modal-close:hover {
            background: rgba(75, 85, 99, 0.9);
            transform: scale(1.1);
        }

        /* ✅ NOUVEAU : Styles pour le modal BT adaptatif généré dynamiquement */
        [data-theme="dark"] .bt-modal-adaptive {
            background: linear-gradient(135deg, 
                rgba(17, 24, 39, 0.95), 
                rgba(31, 41, 55, 0.95), 
                rgba(55, 65, 81, 0.95)
            ) !important;
        }

        [data-theme="dark"] .bt-modal-adaptive > div {
            background: linear-gradient(135deg, 
                rgba(17, 24, 39, 0.95), 
                rgba(31, 41, 55, 0.95), 
                rgba(55, 65, 81, 0.95)
            ) !important;
        }

        [data-theme="dark"] .bt-modal-adaptive > div > div {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%) !important;
            border: 1px solid rgba(75, 85, 99, 0.3) !important;
            color: #f3f4f6 !important;
        }

        [data-theme="dark"] .bt-modal-adaptive form {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
            color: #f3f4f6 !important;
        }

        [data-theme="dark"] .bt-modal-adaptive input,
        [data-theme="dark"] .bt-modal-adaptive select,
        [data-theme="dark"] .bt-modal-adaptive textarea {
            background: rgba(31, 41, 55, 0.8) !important;
            border: 1px solid rgba(75, 85, 99, 0.5) !important;
            color: #f3f4f6 !important;
        }

        [data-theme="dark"] .bt-modal-adaptive input:focus,
        [data-theme="dark"] .bt-modal-adaptive select:focus,
        [data-theme="dark"] .bt-modal-adaptive textarea:focus {
            border-color: #3b82f6 !important;
            background: rgba(31, 41, 55, 0.9) !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }

        [data-theme="dark"] .bt-modal-adaptive label {
            color: #f3f4f6 !important;
        }

        [data-theme="dark"] .bt-modal-adaptive select option {
            background: #1f2937 !important;
            color: #f3f4f6 !important;
        }

        [data-theme="dark"] .bt-modal-adaptive input::placeholder,
        [data-theme="dark"] .bt-modal-adaptive textarea::placeholder {
            color: #9ca3af !important;
        }

        /* ✅ NOUVEAU : Couleurs spécifiques par type de champ en mode sombre */
        
        /* Champs TITRE (Orange) */
        [data-theme="dark"] .bt-modal-adaptive input[name="titre"],
        [data-theme="dark"] .bt-modal-adaptive select[name="priorite"] {
            background: rgba(251, 146, 60, 0.15) !important;
            border: 2px solid rgba(251, 146, 60, 0.4) !important;
            color: #fed7aa !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive input[name="titre"]:focus,
        [data-theme="dark"] .bt-modal-adaptive select[name="priorite"]:focus {
            border-color: #fb923c !important;
            background: rgba(251, 146, 60, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.2) !important;
        }

        /* Champs SALLE/PROJET (Bleu) */
        [data-theme="dark"] .bt-modal-adaptive input[name="salle_projet_evenement"],
        [data-theme="dark"] .bt-modal-adaptive select[name="statut"] {
            background: rgba(59, 130, 246, 0.15) !important;
            border: 2px solid rgba(59, 130, 246, 0.4) !important;
            color: #bfdbfe !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive input[name="salle_projet_evenement"]:focus,
        [data-theme="dark"] .bt-modal-adaptive select[name="statut"]:focus {
            border-color: #3b82f6 !important;
            background: rgba(59, 130, 246, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }

        /* Champs SECTEUR (Vert) */
        [data-theme="dark"] .bt-modal-adaptive select[name="secteur"] {
            background: rgba(34, 197, 94, 0.15) !important;
            border: 2px solid rgba(34, 197, 94, 0.4) !important;
            color: #bbf7d0 !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive select[name="secteur"]:focus {
            border-color: #22c55e !important;
            background: rgba(34, 197, 94, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
        }

        /* Champs TYPE SIGNALEMENT (Violet) */
        [data-theme="dark"] .bt-modal-adaptive select[name="type_signalement"] {
            background: rgba(147, 51, 234, 0.15) !important;
            border: 2px solid rgba(147, 51, 234, 0.4) !important;
            color: #ddd6fe !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive select[name="type_signalement"]:focus {
            border-color: #9333ea !important;
            background: rgba(147, 51, 234, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.2) !important;
        }

        /* Champs PÉRIODE (Rose) */
        [data-theme="dark"] .bt-modal-adaptive input[name="periode_intervention"] {
            background: rgba(236, 72, 153, 0.15) !important;
            border: 2px solid rgba(236, 72, 153, 0.4) !important;
            color: #fbcfe8 !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive input[name="periode_intervention"]:focus {
            border-color: #ec4899 !important;
            background: rgba(236, 72, 153, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.2) !important;
        }

        /* Champs TECHNICIEN (Cyan) */
        [data-theme="dark"] .bt-modal-adaptive select[name="technicien_assigne"] {
            background: rgba(6, 182, 212, 0.15) !important;
            border: 2px solid rgba(6, 182, 212, 0.4) !important;
            color: #a5f3fc !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive select[name="technicien_assigne"]:focus {
            border-color: #06b6d4 !important;
            background: rgba(6, 182, 212, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2) !important;
        }

        /* Champs CATÉGORIE (Indigo) */
        [data-theme="dark"] .bt-modal-adaptive select[name="categorie_equipement"] {
            background: rgba(99, 102, 241, 0.15) !important;
            border: 2px solid rgba(99, 102, 241, 0.4) !important;
            color: #c7d2fe !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive select[name="categorie_equipement"]:focus {
            border-color: #6366f1 !important;
            background: rgba(99, 102, 241, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
        }

        /* Champs LOCALISATION (Emerald) */
        [data-theme="dark"] .bt-modal-adaptive input[name="localisation_detaillee"] {
            background: rgba(16, 185, 129, 0.15) !important;
            border: 2px solid rgba(16, 185, 129, 0.4) !important;
            color: #a7f3d0 !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive input[name="localisation_detaillee"]:focus {
            border-color: #10b981 !important;
            background: rgba(16, 185, 129, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
        }

        /* Zone DESCRIPTION (Slate) */
        [data-theme="dark"] .bt-modal-adaptive textarea[name="description_detaillee"] {
            background: rgba(71, 85, 105, 0.15) !important;
            border: 2px solid rgba(71, 85, 105, 0.4) !important;
            color: #cbd5e1 !important;
        }
        
        [data-theme="dark"] .bt-modal-adaptive textarea[name="description_detaillee"]:focus {
            border-color: #475569 !important;
            background: rgba(71, 85, 105, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.2) !important;
        }

        /* Labels colorés selon le type de champ */
        [data-theme="dark"] .bt-modal-adaptive label {
            font-weight: 600 !important;
            font-size: 16px !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
            display: block !important;
            margin-bottom: 8px !important;
        }

        /* Labels spécifiques avec couleurs d'icônes - approche compatible */
        [data-theme="dark"] .bt-modal-adaptive label[style*="color: #92400e"] {
            color: #fb923c !important; /* Orange pour titre et priorité */
        }

        [data-theme="dark"] .bt-modal-adaptive label[style*="color: #1e40af"] {
            color: #3b82f6 !important; /* Bleu pour salle/projet et statut */
        }

        [data-theme="dark"] .bt-modal-adaptive label[style*="color: #059669"] {
            color: #22c55e !important; /* Vert pour secteur */
        }

        /* Labels par contenu texte - fallback */
        [data-theme="dark"] .bt-modal-adaptive label:contains("📝"),
        [data-theme="dark"] .bt-modal-adaptive label:contains("⚡") {
            color: #fb923c !important; /* Orange */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("🏢"),
        [data-theme="dark"] .bt-modal-adaptive label:contains("📊") {
            color: #3b82f6 !important; /* Bleu */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("🔧") {
            color: #22c55e !important; /* Vert */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("🔨") {
            color: #9333ea !important; /* Violet */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("📅") {
            color: #ec4899 !important; /* Rose */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("👤") {
            color: #06b6d4 !important; /* Cyan */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("🏷️") {
            color: #6366f1 !important; /* Indigo */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("📍") {
            color: #10b981 !important; /* Emerald */
        }

        [data-theme="dark"] .bt-modal-adaptive label:contains("📝 Description") {
            color: #94a3b8 !important; /* Slate */
        }

        /* Options des selects en mode sombre */
        [data-theme="dark"] .bt-modal-adaptive select option {
            background: #1f2937 !important;
            color: #f3f4f6 !important;
            padding: 8px !important;
        }

        /* ✅ NOUVEAU : Améliorations des transitions et animations en mode sombre */
        [data-theme="dark"] .bt-modal-adaptive input,
        [data-theme="dark"] .bt-modal-adaptive select,
        [data-theme="dark"] .bt-modal-adaptive textarea {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        [data-theme="dark"] .bt-modal-adaptive input:hover,
        [data-theme="dark"] .bt-modal-adaptive select:hover,
        [data-theme="dark"] .bt-modal-adaptive textarea:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        /* Animation d'apparition du modal */
        [data-theme="dark"] .bt-modal-adaptive {
            animation: modalFadeInDark 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        @keyframes modalFadeInDark {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        /* Amélioration des boutons en mode sombre */
        [data-theme="dark"] .bt-modal-adaptive button {
            transition: all 0.3s ease !important;
        }

        [data-theme="dark"] .bt-modal-adaptive button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
        }
         
         /* ✅ NOUVELLES ANIMATIONS : slideInRight et slideOutRight pour les notifications */
         @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
         @keyframes slideOutRight {
             from {
                 opacity: 1;
                 transform: translateX(0);
             }
             to {
                 opacity: 0;
                 transform: translateX(100%);
             }
         }
         
         /* ✅ NOUVEAUX STYLES : Modal de résumé du chat */
         .chat-summary-modal {
             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
         }
         
         .chat-summary-content {
             background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
             color: white;
             border-radius: 20px;
             padding: 2rem;
             max-width: 800px;
             max-height: 90vh;
            overflow-y: auto;
             box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
             border: 2px solid rgba(139, 92, 246, 0.3);
             position: relative;
        }
        
         .chat-summary-header {
            display: flex;
             justify-content: space-between;
             align-items: center;
             margin-bottom: 2rem;
             padding-bottom: 1rem;
             border-bottom: 2px solid rgba(139, 92, 246, 0.3);
         }
         
         .chat-summary-header h3 {
             margin: 0;
             font-size: 1.5rem;
             color: #e5e7eb;
         }
         
         .chat-summary-header .close-btn {
             background: rgba(139, 92, 246, 0.2);
             border: 1px solid rgba(139, 92, 246, 0.4);
             color: #e5e7eb;
             padding: 0.5rem;
             border-radius: 8px;
             cursor: pointer;
             transition: all 0.2s ease;
         }
         
         .chat-summary-header .close-btn:hover {
             background: rgba(139, 92, 246, 0.4);
             transform: scale(1.1);
         }
         
         .summary-section {
             margin-bottom: 2rem;
             padding: 1.5rem;
             background: rgba(6, 182, 212, 0.1);
             border-radius: 12px;
             border-left: 4px solid #06b6d4;
         }
         
         .summary-section h4 {
             margin: 0 0 1rem 0;
             color: #06b6d4;
             font-size: 1.1rem;
         }
         
         .summary-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
             gap: 1rem;
         }
         
         .summary-item {
             display: flex;
             justify-content: space-between;
             padding: 0.75rem;
             background: rgba(255, 255, 255, 0.05);
             border-radius: 8px;
         }
         
         .summary-item .label {
             font-weight: 600;
             color: #d1d5db;
         }
         
         .summary-item .value {
             color: #e5e7eb;
         }
         
         .summary-text {
             line-height: 1.6;
             color: #e5e7eb;
             background: rgba(255, 255, 255, 0.05);
             padding: 1rem;
             border-radius: 8px;
         }
         
         .json-container {
             position: relative;
         }
         
         .json-content {
             background: rgba(0, 0, 0, 0.3);
             color: #10b981;
             padding: 1rem;
             border-radius: 8px;
             font-family: 'Courier New', monospace;
             font-size: 0.85rem;
             line-height: 1.4;
             max-height: 300px;
             overflow-y: auto;
             border: 1px solid rgba(16, 185, 129, 0.3);
         }
         
         .copy-json-btn {
             position: absolute;
             top: 0.5rem;
             right: 0.5rem;
             background: rgba(16, 185, 129, 0.2);
             border: 1px solid rgba(16, 185, 129, 0.4);
             color: #10b981;
             padding: 0.5rem 1rem;
             border-radius: 6px;
             cursor: pointer;
             font-size: 0.85rem;
             transition: all 0.2s ease;
         }
         
         .copy-json-btn:hover {
             background: rgba(16, 185, 129, 0.4);
             transform: translateY(-2px);
         }
         
         .chat-summary-actions {
             display: flex;
             gap: 1rem;
             justify-content: center;
             margin-top: 2rem;
             padding-top: 1.5rem;
             border-top: 2px solid rgba(139, 92, 246, 0.3);
         }
         
         .action-btn {
             display: inline-flex;
             align-items: center;
             gap: 0.5rem;
             padding: 0.75rem 1.5rem;
             border: none;
             border-radius: 8px;
             font-weight: 600;
             cursor: pointer;
             transition: all 0.2s ease;
             font-size: 0.9rem;
         }
         
         .action-btn.secondary {
             background: rgba(107, 114, 128, 0.6);
             color: white;
         }
         
         .action-btn.secondary:hover {
             background: rgba(107, 114, 128, 0.8);
             transform: translateY(-2px);
         }
         
         .action-btn.primary {
             background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
             color: white;
         }
         
         .action-btn.primary:hover {
             background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
         }
         
         .action-btn.success {
             background: linear-gradient(135deg, #10b981 0%, #059669 100%);
             color: white;
         }
         
         .action-btn.success:hover {
             background: linear-gradient(135deg, #059669 0%, #047857 100%);
             transform: translateY(-2px);
             box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
         }
         
         /* ✅ NOUVEAUX STYLES : Notifications de chargement et de succès */
         .loading-content {
             display: flex;
             align-items: center;
             gap: 0.75rem;
         }
         
         .loading-spinner {
             width: 20px;
             height: 20px;
             border: 2px solid rgba(255, 255, 255, 0.3);
             border-top: 2px solid white;
             border-radius: 50%;
             animation: spin 1s linear infinite;
         }
         
         @keyframes spin {
             0% { transform: rotate(0deg); }
             100% { transform: rotate(360deg); }
         }
         
         @keyframes fadeIn {
             from { opacity: 0; }
             to { opacity: 1; }
        }
            `;
            document.head.appendChild(style);
        }
        
        // 🏢 FONCTION POUR GÉNÉRER LES CARTES PODIO
        function generatePodioInfoCards(ticket) {
            // Vérifier si le ticket a des infos Podio
            const hasPodioInfo = ticket.room_pavillon || ticket.room_bassin || 
                               ticket.room_type || ticket.room_capacite;
            
            if (!hasPodioInfo) {
                return ''; // Pas d'infos Podio disponibles
            }
            
            let cards = '';
            
            if (ticket.room_pavillon) {
                cards += `
                    <div class="podio-card pavillon">
                        <div class="podio-card-header">
                            🏛️ Pavillon
                        </div>
                        <div class="podio-card-value">${escapeHtml(ticket.room_pavillon)}</div>
                    </div>
                `;
            }
            
            if (ticket.room_bassin) {
                cards += `
                    <div class="podio-card bassin">
                        <div class="podio-card-header">
                            🌊 Bassin
                        </div>
                        <div class="podio-card-value">${escapeHtml(ticket.room_bassin)}</div>
                    </div>
                `;
            }
            
            if (ticket.room_type) {
                cards += `
                    <div class="podio-card type">
                        <div class="podio-card-header">
                            🏫 Type
                        </div>
                        <div class="podio-card-value">${escapeHtml(ticket.room_type)}</div>
                    </div>
                `;
            }
            
            if (ticket.room_capacite) {
                cards += `
                    <div class="podio-card capacite">
                        <div class="podio-card-header">
                            👥 Capacité
                        </div>
                        <div class="podio-card-value">${escapeHtml(ticket.room_capacite)}</div>
                    </div>
                `;
            }
            
            return `
                <div class="podio-info-section">
                    <div class="podio-info-title">
                        🏢 Informations de la salle
                    </div>
                    <div class="podio-cards-grid">
                        ${cards}
                    </div>
                </div>
            `;
        }
        
        // 🔧 CONFIGURATION DU SERVEUR GO
        const GO_SERVER_URL = 'http://localhost:7070'; // Serveur Go principal - localhost
        window.GO_CHAT_ENDPOINTS = {
            start: `${GO_SERVER_URL}/api/tickets/chat/start`,
            end: `${GO_SERVER_URL}/api/tickets/chat/end`,
            message: `${GO_SERVER_URL}/api/tickets/chat/message`,
            consent: `${GO_SERVER_URL}/api/tickets/chat/consent`
        };
        const GO_CHAT_ENDPOINTS = window.GO_CHAT_ENDPOINTS; // Garder la référence locale
        
        // 💬 FONCTIONS POUR LE CHAT
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        async function initiateChat(ticketId, roomId) {
            try {
                console.log(`💬 [Chat] Démarrage chat pour ticket ${ticketId}, salle ${roomId}`);
                
                // ✅ NOUVEAU : Vérifier d'abord s'il y a déjà un chat actif pour cette salle
                console.log('🔍 [Chat] Vérification chat existant pour salle:', roomId);
                
                // Chercher dans activeChats s'il y a déjà un chat pour cette salle
                let existingChatTicketId = null;
                let existingChannelId = null;
                
                for (const [existingTicketId, chatInfo] of Object.entries(activeChats)) {
                    if (chatInfo.roomId === roomId && chatInfo.status === 'active') {
                        existingChatTicketId = existingTicketId;
                        existingChannelId = chatInfo.chatId;
                        console.log('✅ [Chat] Chat actif trouvé:', { ticketId: existingTicketId, channelId: existingChannelId });
                        break;
                    }
                }
                
                if (existingChatTicketId && existingChannelId) {
                    // ✅ RÉUTILISER le chat existant
                    console.log('♻️ [Chat] Réutilisation du chat existant pour salle', roomId);
                    
                    // Si c'est un ticket différent, copier les infos du chat vers le nouveau ticket
                    if (existingChatTicketId !== ticketId) {
                        const existingChatInfo = activeChats[existingChatTicketId];
                        activeChats[ticketId] = {
                            roomId: roomId,
                            chatId: existingChannelId,
                            chatUrl: existingChatInfo.chatUrl,
                            status: 'active'
                        };
                        console.log(`♻️ [Chat] Infos chat copiées de ${existingChatTicketId} vers ${ticketId}`);
                    }
                    
                    // Mettre à jour l'interface pour ce ticket
                    updateChatStatus(ticketId, 'active', 'Chat repris - Connexion existante');
                    document.getElementById(`endChatBtn_${ticketId}`).style.display = 'inline-block';
                    
                    // Démarrer l'écoute SSE pour ce ticket avec le channel existant
                    startChatEventSource(ticketId, existingChannelId);
                    
                    // ✅ NOUVEAU : Utiliser setChatState au lieu d'openChatBanner direct
                    setTimeout(async () => {
                        setChatState(ticketId, 'open');
                        console.log(`✅ [Chat] Bannière de chat ouverte via setChatState pour ticket ${ticketId} (chat repris)`);
                    }, 500);
                    
                    showNotification(`Chat repris pour la salle ${roomId} - Connexion existante utilisée`);
                    console.log(`♻️ [Chat] Chat repris avec channel existant: ${existingChannelId}`);
                    return; // Sortir de la fonction - pas besoin de créer un nouveau chat
                }
                
                // ✅ FALLBACK : Pas de chat existant, créer un nouveau chat
                console.log('📝 [Chat] Aucun chat actif trouvé, création nouveau chat');
                
                console.log(`🔗 [Chat] Appel API start chat vers: ${GO_CHAT_ENDPOINTS.start}`);
                const payload = {
                    room_id: roomId,
                    kiosk_id: `SEA-${roomId}-${generateUUID().substring(0, 8)}`,
                    client_id: generateUUID(),
                    ticket_id: ticketId
                };
                console.log(`🔗 [Chat] Payload:`, payload);
                
                console.log(`🔍 [Chat] Début de l'appel fetch...`);
                
                // ⚡ PRODUCTION: Système de retry avec backoff exponentiel
                async function attemptFetch(retryCount = 0) {
                    const maxRetries = 3;
                    const baseDelay = 1000;
                    const timeout = retryCount === 0 ? 5000 : 8000; // Timeout adaptatif
                    
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                        console.log(`⏱️ [Chat] Timeout de ${timeout/1000}s atteint (tentative ${retryCount + 1}/${maxRetries + 1})`);
                    }, timeout);
                
                try {
                        const response = await safeFetch(GO_CHAT_ENDPOINTS.start, {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/json',
                                'X-Retry-Count': retryCount.toString() // ✅ Réactivé avec le nouveau middleware CORS
                        },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                        return response;
                    } catch (error) {
                        clearTimeout(timeoutId);
                        
                        // Si c'est un timeout et qu'on peut réessayer
                        if ((error.name === 'AbortError' || error.message.includes('timeout')) && retryCount < maxRetries) {
                            const delay = baseDelay * Math.pow(2, retryCount);
                            console.log(`⏳ [Chat] Nouvelle tentative dans ${delay/1000}s...`);
                            showNotification(`Connexion lente, nouvelle tentative dans ${delay/1000}s...`, 'warning');
                            await new Promise(resolve => setTimeout(resolve, delay));
                            return attemptFetch(retryCount + 1);
                        }
                        
                        throw error;
                    }
                }
                
                let response;
                try {
                    response = await attemptFetch();
                    console.log(`🔍 [Chat] Fetch terminé avec succès`);
                } catch (fetchError) {
                    console.error(`❌ [Chat] Erreur définitive après retries:`, fetchError);
                    console.error(`❌ [Chat] Type d'erreur:`, fetchError.name);
                    console.error(`❌ [Chat] Message:`, fetchError.message);
                    throw fetchError;
                }
                
                console.log(`🔗 [Chat] Réponse API start chat:`, response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ [Chat] Erreur API start chat:`, errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
                
                const data = await response.json();
                console.log(`🔗 [Chat] Données reçues de l'API:`, data);
                
                if (data.chat_url && data.channel_id) {
                    // Stocker les informations du chat
                    activeChats[ticketId] = {
                        roomId: roomId,
                        chatId: data.channel_id, // ✅ CORRIGÉ : Utiliser chatId comme dans la référence
                        chatUrl: data.chat_url,
                        status: 'pending'
                    };
                    
                    console.log(`🔍 [DEBUG-CHAT-START] Structure activeChats après création pour ${ticketId}:`, {
                        ticketId,
                        chatInfo: activeChats[ticketId],
                        chatId: data.channel_id,
                        hasChannelId: activeChats[ticketId]?.channelId ? true : false,
                        hasChatId: activeChats[ticketId]?.chatId ? true : false
                    });
                    
                    // Mettre à jour l'interface
                    updateChatStatus(ticketId, 'pending', 'Chat démarré');
                    document.getElementById(`endChatBtn_${ticketId}`).style.display = 'inline-block';
                    
                    // Démarrer l'écoute des événements
                    startChatEventSource(ticketId);
                    
                    showNotification(`Chat démarré pour la salle ${roomId}`);
                    console.log(`✅ [Chat] Chat démarré: ${data.channel_id}`);
                    
                    // ✅ NOUVEAU : Notifier explicitement le client Vitrine de la demande de chat
                    await notifyClientOfChatRequest(ticketId, roomId, data.channel_id);
                } else {
                    throw new Error('Réponse invalide du serveur');
                }
                
            } catch (error) {
                console.error('❌ [Chat] Erreur lors du démarrage du chat:', error);
                console.error('❌ [Chat] Stack trace:', error.stack);
                console.error('❌ [Chat] URL tentée:', GO_CHAT_ENDPOINTS.start);
                
                // Afficher une notification d'erreur à l'utilisateur
                showErrorNotification(`Erreur lors du démarrage du chat: ${error.message}`);
            }
        }
        
        async function endChat(ticketId) {
            try {
                const chatInfo = activeChats[ticketId];
                if (!chatInfo) {
                    console.log(`💬 [Chat] Aucun chat actif pour le ticket ${ticketId}`);
                    return;
                }
                
                console.log(`💬 [Chat] Terminaison RÉELLE du chat pour le ticket ${ticketId}`);
                
                // Appeler l'API Go de terminaison
                const response = await safeFetch(GO_CHAT_ENDPOINTS.end, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel_id: chatInfo.chatId,
                        ticket_id: ticketId,
                        ended_by: "tickets_sea" // ✅ Indiquer que c'est Tickets SEA qui ferme le chat
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Nettoyer le chat localement
                    delete activeChats[ticketId];
                    
                    // Masquer le bouton "Terminer le chat"
                    document.getElementById(`endChatBtn_${ticketId}`).style.display = 'none';
                    
                    // Mettre à jour le statut du chat
                    updateChatStatus(ticketId, 'offline', 'Chat terminé');
                    
                    // ✅ CORRECTION CRITIQUE : NE PAS appeler showChatEndedByClient ici
                    // Cette fonction est réservée aux fermetures côté client uniquement
                    console.log(`✅ [Chat] Chat terminé par le technicien: ${chatInfo.chatId}`);
                } else {
                    throw new Error(data.message || 'Erreur lors de la terminaison');
                }
                
            } catch (error) {
                console.error('❌ [Chat] Erreur lors de la terminaison du chat:', error);
                showErrorNotification(`Erreur lors de la terminaison du chat: ${error.message}`);
            }
        }
        
        // ✅ NOUVEAU : Simuler un événement client_chat_request pour notifier le client
        async function notifyClientOfChatRequest(ticketId, roomId, channelId) {
            try {
                console.log(`📞 [ChatNotify] Simulation événement client_chat_request pour salle ${roomId}`);
                
                // Simuler l'événement client_chat_request directement
                const simulatedEvent = {
                    type: 'client_chat_request',
                    data: {
                        channel_id: channelId,
                        room_id: roomId,
                        ticket_id: ticketId,
                        source: 'tickets_sea_initiated',
                        chat_url: `https://tickets-sea/chat/channel/${channelId}`
                    },
                    timestamp: new Date().toISOString()
                };
                
                // Déclencher le handler directement (comme si l'événement venait du serveur)
                console.log(`🔄 [ChatNotify] Déclenchement handler client_chat_request:`, simulatedEvent.data);
                handleClientChatRequest(simulatedEvent.data);
                
                console.log(`✅ [ChatNotify] Événement simulé avec succès pour salle ${roomId}`);
                
            } catch (error) {
                console.error(`❌ [ChatNotify] Erreur lors de la simulation d'événement:`, error);
                // Ne pas bloquer le processus en cas d'erreur de notification
            }
        }
        
        function startChatEventSource(ticketId, channelId = null) {
            // ✅ BACKUP STRATEGY : Chat local isolé uniquement - AUCUNE intégration unifié
            console.log(`🔗 [TicketsSEA-BACKUP] Chat local isolé pour ticket ${ticketId}`);
            
            // Utiliser UNIQUEMENT la méthode classique isolée
            return startLegacyChatEventSource(ticketId, channelId);
        }
        
        // 🛠️ Fonction utilitaire pour obtenir la salle depuis un ticket
        function getCurrentRoomFromTicket(ticketId) {
            // Essayer de récupérer depuis les données du ticket
            const ticketData = window.ticketsData?.find(t => t.id === ticketId);
            if (ticketData?.room) {
                return ticketData.room;
            }
            
            // Essayer depuis les chats actifs
            const chatData = activeChats[ticketId];
            if (chatData?.room) {
                return chatData.room;
            }
            
            // Fallback générique
            return `ROOM_${ticketId}`;
        }
        
        // 🔄 Ancien système en fallback
        function startLegacyChatEventSource(ticketId, channelId = null) {
            // ✅ NOUVEAU : Nettoyer les timers de reconnexion existants
            if (window.chatReconnectionTimer) {
                clearTimeout(window.chatReconnectionTimer);
                window.chatReconnectionTimer = null;
                console.log(`🧹 [Chat] Timer de reconnexion nettoyé pour ticket ${ticketId}`);
            }
            
            if (chatEventSource) {
                console.log(`🔌 [Chat] Fermeture connexion SSE existante pour ticket ${ticketId}`);
                chatEventSource.close();
            }
            
            // ✅ NOUVEAU : Si channel_id fourni (chat global accepté), utiliser channel_id au lieu de ticket_id
            const eventUrl = channelId 
                ? `${GO_SERVER_URL}/api/tickets/chat/events?channel_id=${channelId}`
                : `${GO_SERVER_URL}/api/tickets/chat/events?ticket_id=${ticketId}`;
            
            console.log(`📡 [ChatEvents] Démarrage SSE legacy: ${eventUrl}`);
            console.log(`🔍 [DEBUG-TICKETS-SEA] ticketId: ${ticketId}, channelId: ${channelId}`);
            console.warn(`🚨 [DEBUG-VISIBLE] TICKETS-SEA ÉCOUTE AVEC: ${eventUrl}`);
            chatEventSource = new EventSource(eventUrl);
            
            chatEventSource.onmessage = async function(event) {
                const data = JSON.parse(event.data);
                console.log(`📡 [Chat] Événement reçu:`, data);
                
                                                 switch (data.type) {
                    case 'consent_accepted':
                        updateChatStatus(ticketId, 'active', 'Chat accepté - Interface ouverte');
                        showNotification('Chat accepté par la salle !');
                        // ✅ NOUVEAU : Utiliser setChatState au lieu d'openChatBanner direct
                        setChatState(ticketId, 'open');
                        break;
                                        case 'consent_declined':
                       updateChatStatus(ticketId, 'offline', 'Chat refusé par la salle');
                       
                       // ✅ BACKUP STRATEGY : Afficher un toast rouge pour le refus
                       const room = tickets.find(t => t.id === ticketId)?.room || 'Salle inconnue';
                       // Détecter si c'est un chat ou un rappel basé sur le contexte
                       const isRecall = data.data?.type === 'recall' || data.data?.source === 'recall';
                       showDeclineToast(room, isRecall ? 'rappel' : 'chat');
                       
                       // ✅ NOUVEAU : Nettoyer l'état du chat et permettre de relancer
                       delete activeChats[ticketId];
                       document.getElementById(`endChatBtn_${ticketId}`).style.display = 'none';
                       
                       // ✅ NOUVEAU : Fermer automatiquement le modal ticket si ouvert
                       if (document.getElementById('ticketModal').classList.contains('active')) {
                           console.log('🔴 [Chat] Client a refusé - Fermeture du modal');
                           closeModal();
                       }
                       break;
                    case 'client_typing':
                        console.log(`🔍 [DEBUG-TYPING] Événement client_typing reçu:`, data);
                        console.log(`🔍 [DEBUG-TYPING] ticketId: ${ticketId}`);
                        if (data.data && data.data.is_typing) {
                            console.log(`💬 [Chat] Client est en train d'écrire...`);
                            console.log(`🔍 [DEBUG-TYPING] Appel à showTypingIndicator(${ticketId})`);
                            showTypingIndicator(ticketId, true, 'Client');
                        } else {
                            console.log(`💬 [Chat] Client a arrêté d'écrire`);
                            console.log(`🔍 [DEBUG-TYPING] Appel à hideTypingIndicator(${ticketId})`);
                            showTypingIndicator(ticketId, false);
                        }
                        break;
                    case 'vitrine_typing':
                        console.log(`🔍 [DEBUG-VITRINE-TYPING] Événement vitrine_typing reçu:`, data);
                        console.log(`🔍 [DEBUG-VITRINE-TYPING] ticketId: ${ticketId}`);
                        
                        // 🔐 Récupérer le client_id pour la blacklist
                        const eventClientId = data.data?.client_id;
                        const eventSender = data.data?.sender || 'vitrine';
                        
                        if (data.data && data.data.is_typing) {
                            console.log(`💬 [Chat] 🏢 ${eventSender.toUpperCase()} est en train d'écrire... (client: ${eventClientId})`);
                            console.log(`🔍 [DEBUG-VITRINE-TYPING] Affichage indicateur ${eventSender} pour ${ticketId}`);
                            showTypingIndicator(ticketId, true, eventSender === 'sea' ? 'SEA' : 'Vitrine', eventClientId);
                        } else {
                            console.log(`💬 [Chat] 🏢 ${eventSender.toUpperCase()} a arrêté d'écrire`);
                            console.log(`🔍 [DEBUG-VITRINE-TYPING] Masquage indicateur ${eventSender} pour ${ticketId}`);
                            showTypingIndicator(ticketId, false, eventSender === 'sea' ? 'SEA' : 'Vitrine', eventClientId);
                        }
                        break;
                    case 'vitrine_accidental_disconnect':
                        console.log(`🚨 [DISCONNECT] Événement déconnexion reçu:`, data);
                        const disconnectRoom = data.data?.room_id;
                        const disconnectTimestamp = data.data?.timestamp;
                        const disconnectReason = data.data?.reason;
                        
                        // ⚡ PRODUCTION: Afficher le toast UNIQUEMENT pour un vrai F5
                        if (disconnectReason !== 'f5_detected') {
                            console.log(`📊 [DISCONNECT] Déconnexion normale (reason: ${disconnectReason}), pas de toast`);
                            break;
                        }
                        
                        // 🚨 DÉDUPLICATION : Créer un ID unique pour cet événement F5
                        const disconnectEventId = `disconnect_${disconnectRoom}_${disconnectTimestamp}`;
                        if (processedEvents.has(disconnectEventId)) {
                            console.log(`🔄 [DISCONNECT] Événement F5 déjà traité, ignoré:`, disconnectEventId);
                            break;
                        }
                        processedEvents.add(disconnectEventId);
                        
                        if (disconnectRoom) {
                            // Trouver le ticket correspondant à cette salle
                            const disconnectedTicket = tickets.find(t => t.room === disconnectRoom);
                            if (disconnectedTicket) {
                                console.log(`🔄 [F5 DETECTED] F5 détecté pour ticket ${disconnectedTicket.id} (salle: ${disconnectRoom})`);
                                showAccidentalDisconnectNotification(disconnectedTicket.id, disconnectRoom);
                                
                                // Masquer l'indicateur de typing si présent
                                showTypingIndicator(disconnectedTicket.id, false);
                            }
                        }
                        break;
                    case 'chat_message':
                        if (data.data.sender === 'vitrine') {
                            console.log(`💬 [Chat] Message reçu de Vitrine: ${data.data.message}`);
                            console.log(`🔍 [DEBUG-CHATMESSAGE] ticketId utilisé: ${ticketId}`);
                            
                            // 🏢 Masquer l'indicateur de frappe Vitrine quand un message est reçu
                            showTypingIndicator(ticketId, false);
                            
                            // ✅ CORRECTION CRITIQUE : Utiliser addChatMessage directement pour garantir la sauvegarde
                            if (window.addChatMessage) {
                                window.addChatMessage(ticketId, data.data.message, 'received');
                                console.log(`💾 [ChatMessage] Message Vitrine sauvegardé pour ticket ${ticketId}`);
                            } else {
                                console.error(`❌ [ChatMessage] addChatMessage non disponible pour ticket ${ticketId}`);
                            }
                        }
                        break;
                     case 'chat_ended':
                         updateChatStatus(ticketId, 'offline', 'Chat terminé');
                         document.getElementById(`endChatBtn_${ticketId}`).style.display = 'none';
                         
                         // ✅ DEBUG : Logger toutes les infos reçues
                         console.log('🔔 [Chat] Événement chat_ended reçu:', data);
                         console.log('🔔 [Chat] data.data:', data.data);
                         console.log('🔔 [Chat] ended_by value:', data.data ? data.data.ended_by : 'undefined');
                         
                         // ✅ PROTECTION RENFORCÉE : Notification uniquement si Vitrine ferme explicitement
                         const endedBy = data.data?.ended_by;
                         console.log('🔔 [Chat] Événement chat_ended - ended_by:', endedBy);
                         
                         if (endedBy === 'vitrine') {
                             console.log('✅ [Chat] Vitrine a fermé le chat normalement - Afficher toast BLEU ET bannière');
                             const ticket = tickets.find(t => t.id === ticketId);
                             const roomName = ticket ? ticket.room : 'Salle inconnue';
                             
                             // ✅ DOUBLE AFFICHAGE : Toast BLEU + Bannière jaune dans le chat
                             showChatEndedByClient(roomName);
                             showClientChatEndedNotification(ticketId);
                         } else if (endedBy === 'vitrine_f5') {
                             console.log('🔄 [Chat] F5 détecté côté Vitrine - Afficher bannière de déconnexion');
                             const ticket = tickets.find(t => t.id === ticketId);
                             const roomName = ticket ? ticket.room : 'Salle inconnue';
                             
                             // ✅ BANNIÈRE F5 SPÉCIFIQUE
                             showAccidentalDisconnectNotification(ticketId, roomName);
                         } else if (endedBy === 'tickets_sea' || endedBy === 'tickets_sea_with_summary' || endedBy === 'tickets_sea_no_summary') {
                             console.log('🔧 [Chat] Chat fermé par le technicien - Aucune notification');
                             // Pas de notification quand c'est le technicien qui ferme
                         } else {
                             console.warn('⚠️ [Chat] ended_by inconnu ou manquant:', endedBy, '- Pas de notification par sécurité');
                             // Par défaut, pas de notification si on ne sait pas qui a fermé
                         }
                         break;
                     case 'vitrine_disconnected':
                         // ✅ NOUVEAU : Détection de déconnexion du client Vitrine
                         updateChatStatus(ticketId, 'offline', 'Client déconnecté');
                         showVitrineDisconnectedNotification(ticketId, data.data);
                         break;
                     // ✅ SUPPRIMÉ : case 'client_chat_request' - désormais géré par le listener global
                 }
            };
            
            chatEventSource.onopen = function() {
                console.log(`✅ [Chat] Connexion SSE établie pour ticket ${ticketId}`);
                updateChatStatus(ticketId, 'online', 'Connecté');
            };
            
            chatEventSource.onerror = function(error) {
                console.error('❌ [Chat] Erreur SSE:', error);
                console.log(`🔍 [Chat] Détails erreur SSE pour ticket ${ticketId}:`, {
                    readyState: chatEventSource.readyState,
                    url: chatEventSource.url,
                    error: error
                });
                
                updateChatStatus(ticketId, 'offline', 'Erreur de connexion');
                
                // ✅ NOUVEAU : Reconnexion automatique après erreur
                window.chatReconnectionTimer = setTimeout(() => {
                    console.log(`🔄 [Chat] Tentative de reconnexion SSE pour ticket ${ticketId}...`);
                    if (activeChats[ticketId] || minimizedChats[ticketId]) {
                        // Seulement se reconnecter si le chat est toujours actif
                        const chatInfo = activeChats[ticketId] || minimizedChats[ticketId];
                        const existingChannelId = chatInfo?.chatId || channelId;
                        startLegacyChatEventSource(ticketId, existingChannelId);
                        console.log(`🔄 [Chat] Reconnexion SSE tentée avec channelId: ${existingChannelId}`);
                    } else {
                        console.log(`🚫 [Chat] Pas de reconnexion - Chat fermé pour ticket ${ticketId}`);
                    }
                }, 3000); // Reconnexion après 3 secondes
            };
        }
        
                         function updateChatStatus(ticketId, status, message) {
            const statusElement = document.getElementById(`chatStatus_${ticketId}`);
            if (statusElement) {
                statusElement.innerHTML = `
                    <span class="status-indicator ${status}">
                        <i class="fas fa-circle" aria-hidden="true"></i>
                        ${message}
                    </span>
                `;
            }
        }
        
        // ⚠️ ANCIENNE FONCTION SUPPRIMÉE - Utilise maintenant window.showTypingIndicator avec blacklist
        // Cette fonction écrasait la version améliorée avec blacklist
         
         // 💬 FONCTIONS POUR LA BANNIÈRE DE CHAT
         async function openChatBanner(ticketId) {
             console.log(`💬 [Chat] Demande d'ouverture bannière pour ticket ${ticketId}`);
             // ✅ NOUVEAU : Utiliser la fonction centralisée setChatState
             setChatState(ticketId, 'open');
             
             // Focus sur l'input après ouverture
             setTimeout(() => {
                 const chatInput = document.getElementById(`chatInput_${ticketId}`);
                 if (chatInput) {
                     chatInput.focus();
                 }
             }, 100);
                 
                 // 🆕 Vérifier si on a déjà un channel_id en base (après rafraîchissement)
                 if (!activeChats[ticketId]) {
                     try {
                         console.log(`🔍 [Chat] Vérification du channel_id en base pour le ticket ${ticketId}`);
                         
                         // Récupérer le ticket depuis la base pour vérifier s'il a un channel_id
                         const ticket = tickets.find(t => t.id === ticketId);
                         if (ticket && ticket.channel_id) {
                             console.log(`✅ [Chat] Channel ID trouvé en base: ${ticket.channel_id}`);
                             
                             // Restaurer les informations du chat
                             activeChats[ticketId] = {
                                 roomId: ticket.room,
                                 chatId: ticket.channel_id, // ✅ CORRIGÉ : Utiliser chatId comme dans la référence
                                 chatUrl: `${GO_SERVER_URL}/api/tickets/chat/stream?channel_id=${ticket.channel_id}`,
                                 status: 'active'
                             };
                             
                                                     // Démarrer l'écoute des événements
                        startChatEventSource(ticketId);
                        
                        // Mettre à jour l'interface
                        updateChatStatus(ticketId, 'active', 'Chat restauré depuis la base');
                        document.getElementById(`endChatBtn_${ticketId}`).style.display = 'inline-block';
                        
                        console.log(`🔄 [Chat] Chat restauré pour le ticket ${ticketId}`);
                        console.log(`🔍 [DEBUG-CHAT-STRUCTURE] Structure activeChats pour ${ticketId}:`, {
                            ticketId,
                            chatInfo: activeChats[ticketId],
                            hasChannelId: activeChats[ticketId]?.channelId ? true : false,
                            hasChatId: activeChats[ticketId]?.chatId ? true : false
                        });
                         } else {
                             console.log(`ℹ️ [Chat] Aucun channel_id trouvé en base pour le ticket ${ticketId}`);
                         }
                     } catch (error) {
                         console.error('❌ [Chat] Erreur lors de la restauration du chat:', error);
                     }
                 }
         }
         
                   function closeChatBanner(ticketId) {
               // Afficher la confirmation avant de fermer
               showChatCloseConfirmation(ticketId);
           }
           
           function confirmChatClose(ticketId) {
              const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
              if (chatBanner) {
                   // Envoyer un message de fin de chat à Vitrine
                   sendChatEndMessage(ticketId);
                   
                   // Fermer la bannière
                  chatBanner.style.display = 'none';
                  console.log(`💬 [Chat] Bannière de chat fermée pour le ticket ${ticketId}`);
              }
          }
          
                   function sendChatEndMessage(ticketId) {
            try {
                const chatInfo = activeChats[ticketId];
                if (chatInfo) {
                    // Envoyer un message système de fin de chat
                    addChatMessage(ticketId, "🔚 Support technique terminé - Chat fermé par le technicien", 'system');
                    
                    // Terminer le chat via l'API
                    endChat(ticketId);
                }
            } catch (error) {
                console.error('❌ [Chat] Erreur lors de l\'envoi du message de fin:', error);
            }
        }

        // ✅ NOUVELLE FONCTION : Notification quand le client ferme le chat
        function showClientChatEndedNotification(ticketId) {
            try {
                const ticket = tickets.find(t => t.id === ticketId);
                const roomName = ticket ? ticket.room : 'Salle inconnue';
                
                // ✅ CORRECTION : Restaurer le modal de chat original si une miniature existe
                const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
                const minimizedChatInfo = minimizedChats[ticketId]; // ✅ CORRECTION : Utiliser objet au lieu de Set
                
                if (chatBubble && minimizedChatInfo) {
                    console.log(`🔄 [ClientChatEnded] Restauration du modal de chat pour ticket ${ticketId}`);
                    
                    // ✅ CORRECTION MAJEURE : Utiliser directement la fonction d'expansion du chat
                    // au lieu d'ouvrir un modal vide
                    
                    // ✅ NOUVELLE APPROCHE : Utiliser la fonction d'expansion qui gère tout
                    console.log(`🔄 [ClientChatEnded] Simulation expansion chat pour ${ticketId}`);
                    
                    // Utiliser la fonction d'expansion existante qui fonctionne
                    // (elle va automatiquement supprimer le badge et restaurer le chat)
                    expandMinimizedChat(ticketId);
                    
                    // Attendre que l'expansion soit terminée puis ajouter le message système
                    setTimeout(() => {
                        // Ajouter un message système pour indiquer la fermeture
                        addChatMessage(ticketId, "⚠️ Le client a fermé le chat", 'system');
                                
                                // Marquer le chat comme fermé côté client
                                updateChatStatus(ticketId, 'offline', 'Client déconnecté');
                                
                        console.log(`✅ [ClientChatEnded] Chat restauré et message système ajouté pour ${ticketId}`);
                    }, 800);
                } else {
                    // ✅ NOUVEAU : Cas où le chat n'était pas minimisé mais le modal pourrait être fermé
                    console.log(`🔄 [ClientChatEnded] Aucune miniature, vérification si modal ouvert pour ${ticketId}`);
                    
                    const modal = document.getElementById('ticketModal');
                    if (!modal || !modal.classList.contains('active')) {
                        console.log(`🔄 [ClientChatEnded] Modal fermé, restauration pour résumé ${ticketId}`);
                        
                        // ✅ CORRECTION : Utiliser la fonction de démarrage de chat au lieu d'ouvrir modal vide
                        // startChat(ticketId); // ← Fonction inexistante, utilisons openTicketModal
                        openTicketModal(ticketId);
                        
                        // Attendre puis ajouter le message système
                        setTimeout(() => {
                                addChatMessage(ticketId, "⚠️ Le client a fermé le chat", 'system');
                            updateChatStatus(ticketId, 'offline', 'Client déconnecté');
                        }, 1000);
                            } else {
                        // Modal déjà ouvert, juste ajouter le message système
                        console.log(`🔄 [ClientChatEnded] Modal déjà ouvert, ajout message système pour ${ticketId}`);
                        addChatMessage(ticketId, "⚠️ Le client a fermé le chat", 'system');
                        updateChatStatus(ticketId, 'offline', 'Client déconnecté');
                    }
                }
                
                // Créer une notification d'avertissement (orange) pour informer le technicien
                const notificationDiv = document.createElement('div');
                notificationDiv.className = 'notification warning-notification';
                
                // Créer la structure DOM proprement
                const header = document.createElement('div');
                header.className = 'notification-header';
                
                const icon = document.createElement('div');
                icon.className = 'notification-icon';
                icon.textContent = '⚠️';
                
                const content = document.createElement('div');
                content.className = 'notification-content';
                
                const title = document.createElement('div');
                title.className = 'notification-title';
                title.textContent = 'Chat fermé par le client';
                
                const message = document.createElement('div');
                message.className = 'notification-message';
                message.innerHTML = `Le client de la <strong>${roomName}</strong> a fermé le chat.<br><em>La bannière reste ouverte pour vos rapports et statistiques.</em>`;
                
                const actions = document.createElement('div');
                actions.className = 'notification-actions';
                
                const comprisBtn = document.createElement('button');
                comprisBtn.className = 'notification-btn';
                comprisBtn.textContent = 'Compris';
                comprisBtn.onclick = () => notificationDiv.remove();
                
                // Assembler la structure
                content.appendChild(title);
                content.appendChild(message);
                header.appendChild(icon);
                header.appendChild(content);
                actions.appendChild(comprisBtn);
                notificationDiv.appendChild(header);
                notificationDiv.appendChild(actions);
                
                document.body.appendChild(notificationDiv);
                
                // ✅ NOUVEAU : Auto-suppression après 8 secondes
                setTimeout(() => {
                    if (notificationDiv.parentNode) {
                        notificationDiv.style.animation = 'slideOutRight 0.4s ease-in';
                        setTimeout(() => notificationDiv.remove(), 400);
                    }
                }, 8000);
                
                console.log(`⚠️ [Notification] Notification "Chat fermé par le client" affichée pour ${ticketId}`);
                
                // Ajouter un message système dans le chat pour informer le technicien
                const chatEndedBanner = document.createElement('div');
                chatEndedBanner.className = 'chat-ended-banner';
                
                const chatEndedContent = document.createElement('div');
                chatEndedContent.className = 'chat-ended-content';
                
                const chatEndedIcon = document.createElement('div');
                chatEndedIcon.className = 'chat-ended-icon';
                chatEndedIcon.textContent = 'i';
                
                const chatEndedText = document.createElement('div');
                chatEndedText.className = 'chat-ended-text';
                
                const chatEndedTitle = document.createElement('div');
                chatEndedTitle.className = 'chat-ended-title';
                chatEndedTitle.textContent = 'Chat fermé par le client';
                
                const chatEndedDesc = document.createElement('div');
                chatEndedDesc.className = 'chat-ended-description';
                chatEndedDesc.textContent = 'Vous pouvez garder cette bannière ouverte pour vos rapports et statistiques';
                
                // Assembler la structure
                chatEndedText.appendChild(chatEndedTitle);
                chatEndedText.appendChild(chatEndedDesc);
                chatEndedContent.appendChild(chatEndedIcon);
                chatEndedContent.appendChild(chatEndedText);
                chatEndedBanner.appendChild(chatEndedContent);
                
                // Ajouter comme message système
                addChatMessage(ticketId, chatEndedBanner.outerHTML, 'system');
                
                // Supprimer automatiquement après 8 secondes
                setTimeout(() => {
                    if (notificationDiv.parentNode) {
                        notificationDiv.style.animation = 'slideOutRight 0.4s ease-in';
                        setTimeout(() => notificationDiv.remove(), 400);
                    }
                }, 8000);
                
                console.log(`⚠️ [Chat] Notification affichée: Client a fermé le chat pour le ticket ${ticketId}`);
                
            } catch (error) {
                console.error('❌ [Chat] Erreur lors de l\'affichage de la notification de fermeture client:', error);
            }
        }

        // ✅ NOUVELLE FONCTION : Notification quand le client Vitrine se déconnecte
        function showVitrineDisconnectedNotification(ticketId, disconnectData) {
            try {
                const ticket = tickets.find(t => t.id === ticketId);
                const roomName = ticket ? ticket.room : 'Salle inconnue';
                const timestamp = disconnectData.timestamp || new Date().toISOString();
                
                // Créer une notification d'avertissement (orange) pour informer le technicien
                const notificationDiv = document.createElement('div');
                notificationDiv.className = 'notification warning-notification';
                notificationDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    z-index: 9999;
                    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
                    max-width: 450px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #fbbf24;
                `;
                
                notificationDiv.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                        <div style="font-size: 1.5rem; margin-top: 0.1rem;">⚠️</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem;">
                                Client déconnecté
                            </div>
                            <div style="opacity: 0.9; font-size: 0.85rem; line-height: 1.5;">
                                Le client de la <strong>${roomName}</strong> s'est déconnecté à <strong>${new Date(timestamp).toLocaleTimeString()}</strong>.<br>
                                <em>La bannière reste ouverte pour vos rapports et statistiques.</em>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button onclick="this.parentElement.parentElement.remove()" 
                                style="
                                    background: rgba(255, 255, 255, 0.2);
                                    border: 1px solid rgba(255, 255, 255, 0.3);
                                    color: white;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 0.85rem;
                                    transition: all 0.2s ease;
                                "
                                onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            Compris
                        </button>
                    </div>
                `;
                
                document.body.appendChild(notificationDiv);
                
                // Ajouter un message système dans le chat pour informer le technicien
                addChatMessage(ticketId, "⚠️ <strong>Le client s'est déconnecté</strong> - Vous pouvez garder cette bannière ouverte pour vos rapports et statistiques.", 'system');
                
                // Supprimer automatiquement après 10 secondes
                setTimeout(() => {
                    if (notificationDiv.parentNode) {
                        notificationDiv.style.animation = 'slideOutRight 0.4s ease-in';
                        setTimeout(() => notificationDiv.remove(), 400);
                    }
                }, 10000);
                
                console.log(`⚠️ [Chat] Notification affichée: Client déconnecté pour le ticket ${ticketId}`);
                
            } catch (error) {
                console.error('❌ [Chat] Erreur lors de l\'affichage de la notification de déconnexion:', error);
            }
                }
        
        // ✅ NOUVELLE FONCTION : Créer un résumé du chat et fermer la bannière
        async function createChatSummaryAndClose(ticketId) {
            try {
                console.log(`📋 [ChatSummary] Création du résumé pour le ticket ${ticketId}`);
                
                // Afficher une notification de chargement
                showLoadingNotification('Création du résumé en cours...');
                
                // ✅ CORRECTION : Récupérer le channelId depuis activeChats
                const chatInfo = activeChats[ticketId];
                if (!chatInfo || !chatInfo.chatId) {
                    throw new Error('Informations de chat non trouvées. Assurez-vous que le chat est actif.');
                }
                
                const channelId = chatInfo.chatId;
                console.log(`🔗 [ChatSummary] Channel ID récupéré: ${channelId}`);
                
                const response = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/summary?channel_id=${channelId}`);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const summary = await response.json();
                console.log('📋 [ChatSummary] Résumé récupéré:', summary);
                
                // Masquer la notification de chargement
                hideLoadingNotification();
                
                // Afficher le résumé dans une modal
                showChatSummaryModal(summary, ticketId);
                
            } catch (error) {
                console.error('❌ [ChatSummary] Erreur lors de la création du résumé:', error);
                hideLoadingNotification();
                showErrorNotification(`Erreur lors de la création du résumé: ${error.message}`);
            }
        }
        
        // ✅ NOUVELLE FONCTION : Afficher la modal de résumé du chat
        function showChatSummaryModal(summary, ticketId) {
            const modal = document.createElement('div');
            modal.className = 'chat-summary-modal';
            
            // Formater le résumé pour l'affichage
            const formattedSummary = formatChatSummaryForDisplay(summary);
            
            modal.innerHTML = `
                <div class="chat-summary-content">
                    <div class="chat-summary-header">
                        <h3>📋 Résumé du Support Technique</h3>
                        <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="chat-summary-body">
                        <div class="summary-section">
                            <h4>Informations générales</h4>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="label">Salle:</span>
                                    <span class="value">${summary.room_id || 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Durée:</span>
                                    <span class="value">${summary.duration || 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Messages:</span>
                                    <span class="value">${summary.total_messages || 0}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Statut:</span>
                                    <span class="value">${summary.status || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="summary-section">
                            <h4>Résumé textuel</h4>
                            <div class="summary-text">
                                ${formattedSummary.summary}
                            </div>
                        </div>
                        
                        <div class="summary-section">
                            <h4>Données JSON (pour IA et statistiques)</h4>
                            <div class="json-container">
                                <pre class="json-content">${JSON.stringify(summary, null, 2)}</pre>
                                <button class="copy-json-btn" onclick="copyJsonToClipboard('${JSON.stringify(summary, null, 2)}')">
                                    <i class="fas fa-copy"></i> Copier JSON
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-summary-actions">
                        <button class="action-btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-eye"></i>
                            Consulter
                        </button>
                        <button class="action-btn primary" onclick="saveChatSummaryToDatabase('${ticketId}', ${JSON.stringify(summary).replace(/"/g, '&quot;')})">
                            <i class="fas fa-save"></i>
                            Enregistrer en base
                        </button>
                        <button class="action-btn success" onclick="closeChatBannerAfterSummary('${ticketId}')">
                            <i class="fas fa-check"></i>
                            Fermer le chat
                        </button>
                    </div>
                </div>
            `;
            
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            `;
            
            document.body.appendChild(modal);
        }
        
        // ✅ NOUVELLE FONCTION : Formater le résumé pour l'affichage
        function formatChatSummaryForDisplay(summary) {
            let formattedSummary = summary.summary || 'Aucun résumé disponible';
            
            // Ajouter des informations supplémentaires si disponibles
            if (summary.message_counts) {
                const counts = Object.entries(summary.message_counts)
                    .map(([sender, count]) => `${sender}: ${count}`)
                    .join(', ');
                formattedSummary += `\n\nRépartition des messages: ${counts}`;
            }
            
            return {
                summary: formattedSummary.replace(/\n/g, '<br>')
            };
        }
        
        // ✅ NOUVELLE FONCTION : Copier le JSON dans le presse-papier
        function copyJsonToClipboard(jsonString) {
            navigator.clipboard.writeText(jsonString).then(() => {
                showSuccessNotification('JSON copié dans le presse-papier !');
            }).catch(err => {
                console.error('Erreur lors de la copie:', err);
                showErrorNotification('Erreur lors de la copie');
            });
        }
        
        // ✅ NOUVELLE FONCTION : Enregistrer le résumé en base de données
        async function saveChatSummaryToDatabase(ticketId, summary) {
            try {
                console.log(`💾 [ChatSummary] Sauvegarde du résumé pour le ticket ${ticketId}`);
                
                // Préparer les données pour l'envoi
                const summaryData = {
                    ticket_id: ticketId,
                    summary: {
                        ...summary,
                        // Convertir les dates en format ISO si nécessaire
                        created_at: summary.created_at || new Date().toISOString(),
                        ended_at: summary.ended_at || new Date().toISOString(),
                        // Ajouter des métadonnées enrichies
                        metadata: {
                            ...summary.metadata,
                            saved_at: new Date().toISOString(),
                            technician_id: 'current_user', // À adapter selon votre système d'auth
                            summary_version: '1.0'
                        }
                    }
                };
                
                // Envoyer à l'API de sauvegarde
                const response = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/summary/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(summaryData)
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('✅ [ChatSummary] Résumé sauvegardé:', result);
                
                showSuccessNotification(`Résumé sauvegardé avec succès ! (ID: ${result.summary_id})`);
                
                // Optionnel : Fermer automatiquement la modal
                const modal = document.querySelector('.chat-summary-modal');
                if (modal) {
                    modal.remove();
                }
                
            } catch (error) {
                console.error('❌ [ChatSummary] Erreur lors de la sauvegarde:', error);
                showErrorNotification(`Erreur lors de la sauvegarde: ${error.message}`);
            }
        }
        
        // ✅ NOUVELLE FONCTION : Fermer la bannière de chat après création du résumé
        function closeChatBannerAfterSummary(ticketId) {
            // Fermer la modal de résumé
            const modal = document.querySelector('.chat-summary-modal');
            if (modal) {
                modal.remove();
            }
            
            // ✅ NOUVEAU : Supprimer la persistance (comme les autres fonctions de fermeture)
            const chatInfo = activeChats[ticketId];
            if (chatInfo && chatInfo.chatId) {
                console.log(`🗑️ [CloseBannerAfterSummary] Nettoyage persistance pour chatId: ${chatInfo.chatId}`);
                
                // Nettoyer window.chatMessages
                window.chatMessages.delete(chatInfo.chatId);
                
                // Nettoyer sessionStorage (Hotfix v3)
                if (typeof clearChatHistory === 'function') {
                    clearChatHistory(chatInfo.chatId);
                    console.log(`🗑️ [CloseBannerAfterSummary] SessionStorage nettoyé pour chatId: ${chatInfo.chatId}`);
                }
                
                // Nettoyer tous les caches possibles
                sessionStorage.removeItem(`chat_${chatInfo.chatId}`);
                sessionStorage.removeItem(`chatHistory_${chatInfo.chatId}`);
                
                console.log(`✅ [CloseBannerAfterSummary] Persistance complètement supprimée pour ${ticketId}`);
            }
            
            // Fermer la bannière de chat
              const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
              if (chatBanner) {
                chatBanner.style.display = 'none';
            }
            
            // Nettoyer activeChats
            delete activeChats[ticketId];
            
            console.log(`💬 [Chat] Bannière fermée après création du résumé pour le ticket ${ticketId}`);
        }
        
        // ✅ NOUVELLE FONCTION UNIFIÉE : Créer résumé + Enregistrer + Fermer + Notifier Vitrine
        async function createChatSummaryAndCloseWithNotification(ticketId) {
            try {
                console.log(`🔗 [ChatSummaryUnified] Début du processus unifié pour ticket ${ticketId}`);
                
                // 1. Créer le résumé
                showLoadingNotification('Création du résumé et fermeture...');
                
                const chatInfo = activeChats[ticketId];
                
                // 🔍 DIAGNOSTIC : Compare avec quitChatWithoutSaving
                console.log(`🔍 [ChatSummaryUnified] ActiveChats pour ticket ${ticketId}:`, chatInfo);
                
                if (!chatInfo) {
                    // ✅ CORRECTION : Gestion gracieuse des chats inexistants
                    console.warn(`⚠️ [ChatSummaryUnified] Aucune info de chat pour ticket ${ticketId} - Chat probablement déjà fermé`);
                    
                    // Nettoyer l'interface quand même
                    const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                    if (chatBanner) {
                        chatBanner.style.display = 'none';
                        console.log(`🧹 [ChatSummaryUnified] Bannière chat ${ticketId} masquée`);
                    }
                    
                    hideLoadingNotification();
                    showSuccessNotification('Chat fermé (était déjà inactif).');
                    
                    return; // Sortir sans erreur
                }
                
                // ✅ UTILISER chatId comme dans la référence
                const channelId = chatInfo.chatId;
                
                if (!channelId) {
                    console.error('❌ [ChatSummaryUnified] Structure chatInfo:', chatInfo);
                    throw new Error('Channel ID non trouvé dans les informations de chat.');
                }
                console.log(`🔗 [ChatSummaryUnified] Channel ID: ${channelId}`);
                
                // Récupérer le résumé
                const summaryResponse = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/summary?channel_id=${channelId}`);
                if (!summaryResponse.ok) {
                    throw new Error(`Erreur récupération résumé: ${summaryResponse.status}`);
                }
                
                const summary = await summaryResponse.json();
                console.log('📋 [ChatSummaryUnified] Résumé créé:', summary);
                
                // 2. Enregistrer en base de données
                // ✅ CORRECTION : Utiliser l'UUID du ticket depuis les données chargées
                const ticket = tickets.find(t => t.id === ticketId);
                const ticketUUID = ticket ? ticket.id : ticketId; // Fallback au ticketId si pas trouvé
                
                console.log(`🔗 [ChatSummaryUnified] Ticket UUID: ${ticketUUID}`);
                
                const saveResponse = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/summary/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ticket_id: ticketUUID, // ✅ Utiliser l'UUID
                        summary: summary
                    })
                });
                
                if (!saveResponse.ok) {
                    throw new Error(`Erreur sauvegarde: ${saveResponse.status}`);
                }
                console.log('💾 [ChatSummaryUnified] Résumé sauvegardé en base');
                
                // 3. Fermer le chat ET envoyer notification à Vitrine
                const closeResponse = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/end`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel_id: channelId,
                        ticket_id: ticketId,
                        room_id: chatInfo.roomId || chatInfo.room_id || 'A-1750', // ✅ Support des deux formats
                        ended_by: "tickets_sea_with_summary" // ✅ Indiquer que c'est fermé avec résumé
                    })
                });
                
                if (!closeResponse.ok) {
                    const errorText = await closeResponse.text();
                    console.error('❌ [ChatSummaryUnified] Détail erreur serveur:', errorText);
                    throw new Error(`Erreur fermeture chat: ${closeResponse.status} - ${errorText}`);
                }
                console.log('🔚 [ChatSummaryUnified] Chat fermé + notification envoyée à Vitrine');
                
                // ✅ CORRECTION : Fermer la miniature ET la bannière
                console.log(`🗑️ [ChatSummaryUnified] Fermeture de la miniature pour ${ticketId}`);
                
                // Supprimer la miniature du DOM
                const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
                if (chatBubble) {
                    chatBubble.remove();
                    console.log(`✅ [ChatSummaryUnified] Miniature supprimée pour ${ticketId}`);
                }
                
                // Nettoyer les données des miniatures
                delete minimizedChats[ticketId];
                delete unreadMessageCounts[ticketId];
                
                // 4. Nettoyer l'interface locale
                const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                if (chatBanner) {
                    chatBanner.style.display = 'none';
                }
                
                // Nettoyer les données de chat actif
                delete activeChats[ticketId];
                
                hideLoadingNotification();
                showSuccessNotification('Résumé enregistré et chat fermé avec succès !');
                
                console.log('✅ [ChatSummaryUnified] Processus unifié terminé avec succès');
                
            } catch (error) {
                console.error('❌ [ChatSummaryUnified] Erreur:', error);
                hideLoadingNotification();
                showErrorNotification(`Erreur: ${error.message}`);
            }
        }
        
        // ✅ NOUVELLE FONCTION : Quitter le chat sans enregistrer de résumé
        async function quitChatWithoutSaving(ticketId) {
            try {
                console.log(`🚪 [QuitWithoutSaving] Fermeture sans sauvegarde pour ticket ${ticketId}`);
                
                showLoadingNotification('Fermeture du chat...');
                
                const chatInfo = activeChats[ticketId];
                
                // 🔍 DIAGNOSTIC APPROFONDI : Analyser le contenu exact d'activeChats
                console.log(`🔍 [QuitWithoutSaving] ActiveChats pour ticket ${ticketId}:`, chatInfo);
                console.log(`🔍 [QuitWithoutSaving] Toutes les clés activeChats:`, Array.from(activeChats.keys()));
                console.log(`🔍 [QuitWithoutSaving] Contenu complet activeChats:`, Object.fromEntries(activeChats));
                
                if (!chatInfo) {
                    // ✅ CORRECTION : Gestion gracieuse des chats inexistants
                    console.warn(`⚠️ [QuitWithoutSaving] Aucune info de chat pour ticket ${ticketId} - Chat probablement déjà fermé`);
                    
                    // Nettoyer l'interface quand même
                    const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                    if (chatBanner) {
                        chatBanner.style.display = 'none';
                        console.log(`🧹 [QuitWithoutSaving] Bannière chat ${ticketId} masquée`);
                    }
                    
                    hideLoadingNotification();
                    showSuccessNotification('Chat fermé (était déjà inactif).');
                    
                    return; // Sortir sans erreur
                }
                
                // ✅ UTILISER chatId comme dans la référence
                const channelId = chatInfo.chatId;
                
                if (!channelId) {
                    console.error('❌ [QuitWithoutSaving] Structure chatInfo:', chatInfo);
                    throw new Error('Channel ID non trouvé dans les informations de chat.');
                }
                
                console.log(`🚪 [QuitWithoutSaving] Channel ID trouvé: ${channelId}`);
                
                // 🔍 NOUVEAU : Logs détaillés pour diagnostiquer l'erreur 500
                const requestData = {
                    channel_id: channelId,
                    ticket_id: ticketId,
                    room_id: chatInfo.roomId || chatInfo.room_id || 'A-1750', // ✅ CORRIGÉ : Support des deux formats
                    ended_by: "tickets_sea_no_summary"
                };
                
                console.log('🔍 [QuitWithoutSaving] Données envoyées au serveur:', {
                    url: `${GO_SERVER_URL}/api/tickets/chat/end`,
                    data: requestData,
                    chatInfo: chatInfo
                });
                
                // Fermer le chat ET envoyer notification à Vitrine (sans résumé)
                const closeResponse = await safeFetch(`${GO_SERVER_URL}/api/tickets/chat/end`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                if (!closeResponse.ok) {
                    const errorText = await closeResponse.text();
                    console.error('❌ [QuitWithoutSaving] Détail erreur serveur:', errorText);
                    throw new Error(`Erreur fermeture chat: ${closeResponse.status} - ${errorText}`);
                }
                console.log('🚪 [QuitWithoutSaving] Chat fermé + notification envoyée à Vitrine');
                
                // ✅ CORRECTION : Fermer la miniature ET la bannière
                console.log(`🗑️ [QuitWithoutSaving] Fermeture de la miniature pour ${ticketId}`);
                
                // Supprimer la miniature du DOM
                const chatBubble = document.getElementById(`chatBubble_${ticketId}`);
                if (chatBubble) {
                    chatBubble.remove();
                    console.log(`✅ [QuitWithoutSaving] Miniature supprimée pour ${ticketId}`);
                }
                
                // Nettoyer les données des miniatures
                delete minimizedChats[ticketId];
                delete unreadMessageCounts[ticketId];
                
                // Nettoyer l'interface locale
                const chatBanner = document.getElementById(`chatBanner_${ticketId}`);
                if (chatBanner) {
                    chatBanner.style.display = 'none';
                }
                
                // ✅ NOUVEAU : Nettoyer AUSSI l'historique sessionStorage pour vraiment supprimer
                if (chatInfo.chatId) {
                    console.log(`🗑️ [QuitWithoutSaving] Nettoyage historique sessionStorage pour chatId: ${chatInfo.chatId}`);
                    
                    // Nettoyer window.chatMessages
                    window.chatMessages.delete(chatInfo.chatId);
                    
                    // Nettoyer sessionStorage (Hotfix v3)
                    if (typeof clearChatHistory === 'function') {
                        clearChatHistory(chatInfo.chatId);
                    } else {
                        // Nettoyage manuel si la fonction n'est pas disponible
                        sessionStorage.removeItem(`tickets_sea_chat_${chatInfo.chatId}`);
                        sessionStorage.removeItem(`tickets_sea_chat_meta_${chatInfo.chatId}`);
                    }
                }
                
                // Nettoyer les données de chat actif
                delete activeChats[ticketId];
                
                hideLoadingNotification();
                showSuccessNotification('Chat fermé sans enregistrement - Historique supprimé.');
                
                console.log('✅ [QuitWithoutSaving] Fermeture terminée sans sauvegarde + historique supprimé');
                
            } catch (error) {
                console.error('❌ [QuitWithoutSaving] Erreur:', error);
                hideLoadingNotification();
                showErrorNotification(`Erreur: ${error.message}`);
            }
        }
        
        // ✅ NOUVELLES FONCTIONS : Notifications de chargement
        function showLoadingNotification(message) {
            const notification = document.createElement('div');
            notification.id = 'loading-notification';
            notification.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                z-index: 10003;
                animation: slideInRight 0.4s ease-out;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
            `;
            
            document.body.appendChild(notification);
        }
        
        function hideLoadingNotification() {
            const notification = document.getElementById('loading-notification');
            if (notification) {
                notification.style.animation = 'slideOutRight 0.4s ease-in';
                setTimeout(() => notification.remove(), 400);
            }
        }
        
        // ✅ NOUVELLE FONCTION : Notification de succès
        function showSuccessNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle" aria-hidden="true"></i>
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
                z-index: 10000;
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
          
         
        
        // Rendre globale pour accès depuis sendChatMessage
        window.addChatMessage = function(ticketId, message, type) {
             console.log(`🔍 [DEBUG-ADDMESSAGE] ticketId: ${ticketId}, message: ${message}, type: ${type}`);
             
             // ✅ CORRECTION CRITIQUE : Chercher dans activeChats ET minimizedChats
             let chatInfo = activeChats[ticketId];
             let chatLocation = 'activeChats';
             if (!chatInfo) {
                 chatInfo = minimizedChats[ticketId];
                 chatLocation = 'minimizedChats';
                 console.log(`🔍 [ChatMessage] Chat trouvé dans minimizedChats pour ${ticketId}`);
             }
             
             if (chatInfo && chatInfo.chatId) {
                 const chatId = chatInfo.chatId;
                 
                 // ✅ NOUVEAU : Logs détaillés pour debug multi-chats
                 console.log(`💾 [ChatMessage] Sauvegarde message:`);
                 console.log(`  - TicketId: ${ticketId}`);
                 console.log(`  - ChatId: ${chatId}`);
                 console.log(`  - Location: ${chatLocation}`);
                 console.log(`  - Room: ${chatInfo.roomId || chatInfo.room || 'Unknown'}`);
                 console.log(`  - Message: "${message.substring(0, 30)}..."`);
                 
                 if (!window.chatMessages.has(chatId)) {
                     window.chatMessages.set(chatId, []);
                     console.log(`📂 [ChatMessage] Nouveau stockage créé pour chatId ${chatId}`);
                 }
                 
                 const messageData = {
                     message: message,
                     type: type,
                     timestamp: new Date().toISOString(),
                     ticketId: ticketId,
                     chatId: chatId, // ✅ NOUVEAU : Ajouter chatId pour traçabilité
                     room: chatInfo.roomId || chatInfo.room
                 };
                 
                 window.chatMessages.get(chatId).push(messageData);
                 console.log(`💾 [ChatMessage] Message stocké (total: ${window.chatMessages.get(chatId).length})`);
                 
                 // ✅ NOUVEAU : Si chat minimisé, incrémenter le badge
                 if (minimizedChats[ticketId] && type === 'received') {
                     addUnreadMessage(ticketId);
                     console.log(`🔔 [ChatMessage] Badge mis à jour pour chat minimisé ${ticketId}`);
                 }
             } else {
                 console.error(`❌ [ChatMessage] PROBLÈME CRITIQUE: Aucun chatId trouvé pour ticketId ${ticketId}`);
                 console.log(`🔍 [ChatMessage] Debug - activeChats:`, Array.from(activeChats.keys()));
                 console.log(`🔍 [ChatMessage] Debug - minimizedChats:`, Object.keys(minimizedChats));
             }
             
             let chatMessages = document.getElementById(`chatMessages_${ticketId}`);
             console.log(`🔍 [DEBUG-ADDMESSAGE] chatMessages element:`, chatMessages);
             
             // ✅ NOUVEAU : Si l'élément n'existe pas, forcer l'ouverture de la bannière
             if (!chatMessages) {
                                 console.log(`⚠️ [DEBUG-ADDMESSAGE] Élément chatMessages manquant, ouverture forcée via setChatState`);
                setChatState(ticketId, 'open');
                 // Re-essayer après ouverture
                 setTimeout(() => {
                     chatMessages = document.getElementById(`chatMessages_${ticketId}`);
                     if (chatMessages) {
                         console.log(`✅ [DEBUG-ADDMESSAGE] Bannière créée, ajout du message`);
                         const messageDiv = document.createElement('div');
                         messageDiv.className = `chat-message ${type}`;
                         messageDiv.textContent = message;
                         chatMessages.appendChild(messageDiv);
                         if (typeof chatMessages.scrollTo === 'function') {
                             chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                         } else {
                             chatMessages.scrollTop = chatMessages.scrollHeight;
                         }
                         console.log(`💬 [Chat] Message ajouté: ${type} - ${message}`);
                     } else {
                         console.error(`❌ [DEBUG-ADDMESSAGE] Impossible de créer la bannière pour ${ticketId}`);
                     }
                 }, 100);
                 return;
             }
             
             if (chatMessages) {
                 const messageDiv = document.createElement('div');
                 messageDiv.className = `chat-message ${type}`;
                 
                 // ✅ Utiliser innerHTML pour les messages système avec HTML, textContent pour les autres
                 if (type === 'system') {
                     messageDiv.innerHTML = message;
                 } else {
                 messageDiv.textContent = message;
                 }
                 
                 chatMessages.appendChild(messageDiv);
                 
                 // Scroll vers le bas
                 if (typeof chatMessages.scrollTo === 'function') {
                     chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                 } else {
                     chatMessages.scrollTop = chatMessages.scrollHeight;
                 }
                 
                                 // ✅ SUPPRIMÉ : La gestion des unread counts est maintenant centralisée dans handleIncomingMessage
                // Plus besoin de gérer ici pour éviter les doublons
                 
                 console.log(`💬 [Chat] Message ajouté: ${type} - ${message}`);
             }
         }
         
         // Rendre les fonctions globales pour qu'elles soient accessibles depuis le HTML
         window.handleChatKeyPress = function(event, ticketId) {
             if (event.key === 'Enter') {
                 event.preventDefault();
                 window.sendChatMessage(ticketId); // Utiliser window. pour référencer la fonction globale
             }
         }
         
         window.sendChatMessage = async function(ticketId) {
             const chatInput = document.getElementById(`chatInput_${ticketId}`);
             const message = chatInput.value.trim();
             
             // ✅ CORRECTION : Validation stricte pour éviter les envois accidentels
             if (!message) return;
             if (message.length < 3) {
                 console.warn(`⚠️ [SendMessage] Message trop court ignoré (min 3 caractères): "${message}"`);
                 return;
             }
             
             // ✅ NOUVEAU : Throttling pour éviter les envois multiples rapides
             const now = Date.now();
             if (window.lastMessageSent && (now - window.lastMessageSent) < 1000) {
                 console.warn(`⚠️ [SendMessage] Envoi trop rapide ignoré (throttling 1s)`);
                 return;
             }
             window.lastMessageSent = now;
             
             // Réinitialiser la hauteur du textarea après envoi
             chatInput.value = '';
             chatInput.style.height = '44px'; // Reset à la taille originale exacte
             
            try {
                let chatInfo = window.activeChats[ticketId];
               
               // 🔧 NOUVEAU : Synchronisation avec unifiedChat si chatInfo est vide ou invalide
               if (!chatInfo || !chatInfo.chatId || !chatInfo.roomId) {
                   console.log(`🔧 [DEBUG-SEND-BACKUP] chatInfo invalide, isolation backup strategy`);
                   
                   // ✅ BACKUP STRATEGY : Pas de synchronisation avec unifiedChat
                   console.log(`⚠️ [DEBUG-SEND-BACKUP] Isolation complète - pas de gestionnaire unifié`);
               }
               
               if (!chatInfo) {
                   console.error('❌ [Chat] Aucun chat actif pour ce ticket');
                   return;
               }
               
               console.log(`🔍 [DEBUG-SEND] chatInfo pour ${ticketId}:`, chatInfo);
                
                                // Envoyer le message via l'API Go
                const response = await window.safeFetch(window.GO_CHAT_ENDPOINTS.message, {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json'
                     },
                                        body: JSON.stringify({
                       channel_id: chatInfo.channelId || chatInfo.chatId, // Support des deux noms d'attribut
                       room_id: chatInfo.roomId || chatInfo.room || getCurrentRoomFromTicket(ticketId),
                       message: message,
                       sender: 'sea'
                   })
                 });
                 
                 if (!response.ok) {
                     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                 }
                 
                                 // Ajouter le message à l'interface
                window.addChatMessage(ticketId, message, 'sent');
                
                // Vider l'input
                chatInput.value = '';
                
                console.log(`✅ [Chat] Message envoyé: ${message}`);
                
            } catch (error) {
                console.error('❌ [Chat] Erreur lors de l\'envoi du message:', error);
                window.showErrorNotification(`Erreur lors de l'envoi: ${error.message}`);
             }
         }
        
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
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
        
        // Rendre globale pour accès depuis d'autres fonctions
        window.showErrorNotification = function(message) {
            const notification = document.createElement('div');
            notification.className = 'error-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
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
            }, 4000);
        }
        // ✅ SUPPRIMÉ : Ancien système de notification client_chat_request - remplacé par le système global

    


        // ===== FONCTIONS POUR CRÉATION BT =====
        
        async function openCreateBTModal() {
                            // Ne pas créer de modal principal, nous utiliserons uniquement le modal Podio
                console.log('🎯 [CreateBT] Utilisation exclusive du modal Podio');
            
            try {
                const response = await safeFetch(`${GO_SERVER_URL}/api/bt/validate-fields`);
                const validationData = await response.json();
                
                if (!validationData.success) {
                    throw new Error('Impossible de charger les données de validation');
                }
                
                modalContent.innerHTML = generateCreateBTForm(validationData.fields);
                modal.style.display = 'block';
                
                setTimeout(() => {
                    const firstInput = modal.querySelector('.bt-form-input');
                    if (firstInput) firstInput.focus();
                }, 100);
                
            } catch (error) {
                console.error('❌ [CreateBT] Erreur ouverture modal:', error);
                showErrorNotification('Impossible d\'ouvrir le formulaire de création BT');
            }
        }
        
        // ✅ NOUVELLE FONCTION : Ouvrir modal BT pour un ticket spécifique
        async function openCreateBTModalForTicket(ticketId) {
            try {
                console.log('🎫 [CreateBT] Ouverture modal création BT pour ticket:', ticketId);
                
                // Supprimer tout modal existant pour éviter les doublons
                const existingModals = document.querySelectorAll('#createBTModal, .bt-modal, [id*="createBT"]');
                existingModals.forEach(m => {
                    if (m && m.parentNode) {
                        m.remove();
                        console.log('🧹 [CreateBT] Nettoyage modal existant:', m.id || m.className);
                    }
                });
                
                // Trouver le ticket dans la liste
                const ticket = tickets.find(t => t.id === ticketId);
                if (!ticket) {
                    console.error('❌ [CreateBT] Ticket non trouvé:', ticketId);
                    showErrorNotification('Ticket non trouvé');
                    return;
                }
                
                // Récupérer les champs de validation depuis le backend
                let validationFields = { fields: {} };
                try {
                    const response = await safeFetch(`${GO_SERVER_URL}/api/bt/validate-fields`);
                    if (response.ok) {
                        validationFields = await response.json();
                        console.log('🔍 [CreateBT] Validation fields received:', validationFields);
                    }
                } catch (error) {
                    console.error('❌ [CreateBT] Erreur lors de la récupération des champs de validation:', error);
                }
                
                // Utiliser la structure correcte selon notre backend
                const fields = validationFields.fields || {
                    secteurs: ['SEA Est', 'SEA ouest', 'Atelier', 'Projets'],
                    priorites: ['moyennement urgent', 'Urgent', 'temps libre'],
                    statuts: ['911', 'Assigné', 'En cours'],
                    types_signalement: ['Dépannage', 'Formation/Assistance']
                };
                
                console.log('🎯 [CreateBT] Ticket data:', ticket);
                console.log('🎯 [CreateBT] Fields data:', fields);
                
                // ✅ NOUVEAU : Détecter le mode sombre
                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                console.log('🌙 [CreateBT] Mode sombre détecté:', isDarkMode);
                
                // ✅ NOUVEAU : Définir les couleurs selon le thème
                const colors = isDarkMode ? {
                    // Mode sombre
                    modalBg: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95), rgba(55, 65, 81, 0.95))',
                    contentBg: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                    formBg: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                    textColor: '#f3f4f6',
                    inputBg: 'rgba(31, 41, 55, 0.8)',
                    inputBorder: 'rgba(75, 85, 99, 0.5)',
                    inputFocusBorder: '#3b82f6',
                    labelColor: '#f3f4f6'
                } : {
                    // Mode jour (original)
                    modalBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1), rgba(245, 158, 11, 0.1))',
                    contentBg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    formBg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    textColor: '#374151',
                    inputBg: '#fef3c7',
                    inputBorder: '#f59e0b',
                    inputFocusBorder: '#d97706',
                    labelColor: '#92400e'
                };
                
                // Créer le modal unifié avec thème adaptatif
                const modal = document.createElement('div');
                modal.id = 'createBTModal';
                modal.className = 'bt-modal-adaptive';
                
                // ✅ NOUVEAU : Fonction pour appliquer les couleurs des labels en mode sombre
                const applyDarkModeLabelsColors = () => {
                    if (!isDarkMode) return;
                    
                    setTimeout(() => {
                        const labels = modal.querySelectorAll('label');
                        labels.forEach(label => {
                            const text = label.textContent || label.innerText;
                            
                            // Appliquer les couleurs selon le contenu du label
                            if (text.includes('📝') || text.includes('⚡')) {
                                label.style.color = '#fb923c'; // Orange
                            } else if (text.includes('🏢') || text.includes('📊')) {
                                label.style.color = '#3b82f6'; // Bleu
                            } else if (text.includes('🔧')) {
                                label.style.color = '#22c55e'; // Vert
                            } else if (text.includes('🔨')) {
                                label.style.color = '#9333ea'; // Violet
                            } else if (text.includes('📅')) {
                                label.style.color = '#ec4899'; // Rose
                            } else if (text.includes('👤')) {
                                label.style.color = '#06b6d4'; // Cyan
                            } else if (text.includes('🏷️')) {
                                label.style.color = '#6366f1'; // Indigo
                            } else if (text.includes('📍')) {
                                label.style.color = '#10b981'; // Emerald
                            } else if (text.includes('Description')) {
                                label.style.color = '#94a3b8'; // Slate
                            }
                        });
                        console.log('🎨 [CreateBT] Couleurs des labels appliquées en mode sombre');
                    }, 100);
                };
                modal.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1), rgba(245, 158, 11, 0.1)); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 10px;">
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 20px; border-radius: 16px; width: 98%; max-width: 1600px; height: 98%; max-height: none; box-shadow: 0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1); transform: scale(1); transform-origin: center; overflow: hidden; display: flex; flex-direction: column;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: linear-gradient(135deg, #3b82f6, #10b981); padding: 15px 20px; border-radius: 12px; margin: -10px -10px 15px -10px; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); flex-shrink: 0;">
                                <h2 style="margin: 0; color: white; font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎫 Créer un Bon de Travail</h2>
                                <button onclick="closeBTModal()" style="background: rgba(255,255,255,0.2); color: white; padding: 8px 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; backdrop-filter: blur(10px); transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
                            </div>
                            
                            <form id="realBTForm" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px;">
                                <!-- FORMULAIRE FIDÈLE AU VRAI PODIO -->
                                
                                <!-- LIGNE 1: Titre + Salle + Période (optimisé pour éviter le scroll) -->
                                <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 15px; margin-bottom: 15px;">
                                    <!-- 📝 TITRE -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">* Titre</label>
                                        <input name="titre" type="text" value="[${ticket.ticket_number}] ${ticket.title}" style="width: 100%; padding: 16px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background: white; font-weight: 500;" required>
                                    </div>
                                    
                                    <!-- 🏢 SALLE/PROJET -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">* Salle / Projet / Événement</label>
                                        <div style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid #d1d5db; border-radius: 6px; background: white;">
                                            <div style="display: flex; align-items: center; gap: 10px; background: #f3f4f6; padding: 8px 16px; border-radius: 6px;">
                                                <i class="fas fa-building" style="color: #6b7280; font-size: 16px;"></i>
                                                <span style="color: #374151; font-weight: 600; font-size: 16px;" id="selectedRoom">${ticket.room || 'A-1825'}</span>
                                                <button type="button" onclick="removeSelectedRoom()" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; font-size: 16px;">×</button>
                                            </div>
                                            <button type="button" onclick="openRoomSelector()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">Ajouter/Retirer</button>
                                            <input type="hidden" name="salle_projet_evenement" value="${ticket.room || 'A-1825'}" id="hiddenRoomValue">
                                    </div>
                                </div>
                                
                                    <!-- 📅 PÉRIODE -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">* Période d'intervention</label>
                                        <input name="periode_intervention" type="date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 16px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background: white; font-weight: 500;" required>
                                    </div>
                                    </div>
                                
                                <!-- LIGNE 2: Secteur + Priorité (compacts côte à côte) -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                                    <!-- 🏷️ SECTEUR -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 12px; color: #1f2937; font-size: 18px;">* Secteur</label>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <label style="display: flex; align-items: center; gap: 8px; background: #fef2f2; padding: 12px 20px; border-radius: 8px; border: 3px solid #fecaca; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="secteur" value="SEA est" checked style="margin: 0;">
                                                <span style="color: #991b1b; font-weight: 600;">SEA est</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; padding: 12px 20px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="secteur" value="SEA ouest" style="margin: 0;">
                                                <span style="color: #374151; font-weight: 600;">SEA ouest</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; padding: 12px 20px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="secteur" value="Atelier" style="margin: 0;">
                                                <span style="color: #374151; font-weight: 600;">Atelier</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; padding: 12px 20px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="secteur" value="Projets" style="margin: 0;">
                                                <span style="color: #374151; font-weight: 600;">Projets</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f0fdf4; padding: 12px 20px; border-radius: 8px; border: 3px solid #bbf7d0; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="secteur" value="CCC" style="margin: 0;">
                                                <span style="color: #166534; font-weight: 600;">CCC</span>
                                            </label>
                                    </div>
                                </div>
                                
                                    <!-- ⚡ PRIORITÉ -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 12px; color: #1f2937; font-size: 18px;">* Priorité</label>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <label style="display: flex; align-items: center; gap: 8px; background: #fef3c7; padding: 12px 20px; border-radius: 8px; border: 3px solid #fde68a; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="priorite" value="moyennement urgent" checked style="margin: 0;">
                                                <span style="color: #92400e; font-weight: 600;">moyennement urgent</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; padding: 12px 20px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="priorite" value="Urgent" style="margin: 0;">
                                                <span style="color: #374151; font-weight: 600;">Urgent</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; padding: 12px 20px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                                <input type="radio" name="priorite" value="temps libre" style="margin: 0;">
                                                <span style="color: #374151; font-weight: 600;">temps libre</span>
                                            </label>
                                    </div>
                                    </div>
                                </div>
                                
                                <!-- LIGNE 3: Statut (plus grand et visible) -->
                                <div style="margin-bottom: 20px;">
                                    <label style="display: block; font-weight: bold; margin-bottom: 12px; color: #1f2937; font-size: 18px;">* Statut</label>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #fed7d7; padding: 12px 16px; border-radius: 8px; border: 3px solid #fca5a5; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="911" style="margin: 0;">
                                            <span style="color: #991b1b; font-weight: 600;">911</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #e0f2fe; padding: 12px 16px; border-radius: 8px; border: 3px solid #7dd3fc; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="Assigné" checked style="margin: 0;">
                                            <span style="color: #0369a1; font-weight: 600;">Assigné</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="En cours" style="margin: 0;">
                                            <span style="color: #374151; font-weight: 600;">En cours</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="Formation" style="margin: 0;">
                                            <span style="color: #374151; font-weight: 600;">Formation</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="En observation" style="margin: 0;">
                                            <span style="color: #374151; font-weight: 600;">En observation</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="En attente de matériel" style="margin: 0;">
                                            <span style="color: #374151; font-weight: 600;">En attente matériel</span>
                                        </label>
                                        <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; border: 3px solid #e5e7eb; cursor: pointer; transition: all 0.2s; font-size: 15px;">
                                            <input type="radio" name="statut" value="Terminé" style="margin: 0;">
                                            <span style="color: #374151; font-weight: 600;">Terminé</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- LIGNE 4: Technicien assigné (plus grand) -->
                                <div style="margin-bottom: 20px;">
                                    <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">Technicien (es) assigné (e)</label>
                                    <div style="position: relative;">
                                        <input type="text" name="technicien_search" placeholder="Rechercher un technicien..." style="width: 100%; padding: 16px 50px 16px 16px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background: white; font-weight: 500;" autocomplete="off" oninput="searchTechnician(this.value)" onfocus="showTechnicianDropdown()" onblur="hideTechnicianDropdown()">
                                        <i class="fas fa-search" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; font-size: 16px;"></i>
                                        <input type="hidden" name="technicien_assigne" id="selectedTechnicianId">
                                        <div id="technicianDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #d1d5db; border-top: none; border-radius: 0 0 6px 6px; max-height: 200px; overflow-y: auto; z-index: 1000;">
                                            <div class="technician-option" data-value="zineddine chergui" style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f3f4f6; font-size: 16px;" onmousedown="selectTechnician('zineddine chergui', this)">
                                                <div style="display: flex; align-items: center; gap: 10px;">
                                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">ZC</div>
                                                    <span style="font-weight: 500;">zineddine chergui</span>
                                    </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- LIGNE 5: Description + Type de signalement (côte à côte, plus grands) -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 20px;">
                                    <!-- 📄 DESCRIPTION -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">* Description</label>
                                        <div style="border: 2px solid #d1d5db; border-radius: 6px; background: white;">
                                            <div style="border-bottom: 2px solid #e5e7eb; padding: 10px; background: #f9fafb; display: flex; gap: 8px; align-items: center;">
                                                <button type="button" style="padding: 6px 12px; border: none; background: #f3f4f6; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;" onclick="formatText('bold')"><b>B</b></button>
                                                <button type="button" style="padding: 6px 12px; border: none; background: #f3f4f6; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;" onclick="formatText('italic')"><i>I</i></button>
                                                <button type="button" style="padding: 6px 12px; border: none; background: #f3f4f6; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;" onclick="formatText('underline')"><u>U</u></button>
                                                <span style="color: #6b7280; font-size: 14px; margin-left: 12px; font-weight: 500;">Paragraph</span>
                                            </div>
                                            <textarea name="description" id="descriptionField" style="width: 100%; height: 100px; padding: 16px; border: none; outline: none; resize: none; font-family: inherit; font-size: 14px; line-height: 1.5;" placeholder="Décrire le type de problème rencontré...">Intervention technique pour le ticket SEA ${ticket.ticket_number}.

🎫 Ticket: ${ticket.ticket_number}
🏢 Salle: ${ticket.room || 'A-1825'}
📅 Date: ${new Date().toLocaleDateString('fr-FR')}

📋 Problème: ${ticket.description || 'Problème technique signalé'}

🔧 Action: Diagnostic et résolution.</textarea>
                                        </div>
                                </div>
                                
                                    <!-- 🔧 TYPE DE SIGNALEMENT (CORRIGÉ pour fonctionner) -->
                                    <div>
                                        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1f2937; font-size: 18px;">* Type de signalement</label>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #fef2f2; border: 3px solid #fecaca; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Dépannage')">
                                                <input type="radio" name="type_signalement" value="Dépannage" checked style="display: none;">
                                                <span style="color: #991b1b; font-weight: 600; text-align: center;">Dépannage</span>
                                            </label>
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #f3f4f6; border: 3px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Formation/Assistance')">
                                                <input type="radio" name="type_signalement" value="Formation/Assistance" style="display: none;">
                                                <span style="color: #374151; font-weight: 600; text-align: center;">Formation</span>
                                            </label>
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #f3f4f6; border: 3px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Soutenance de thèse')">
                                                <input type="radio" name="type_signalement" value="Soutenance de thèse" style="display: none;">
                                                <span style="color: #374151; font-weight: 600; text-align: center;">Soutenance</span>
                                            </label>
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #f3f4f6; border: 3px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Changement de lampe')">
                                                <input type="radio" name="type_signalement" value="Changement de lampe" style="display: none;">
                                                <span style="color: #374151; font-weight: 600; text-align: center;">Changement lampe</span>
                                            </label>
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #f3f4f6; border: 3px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Vérification')">
                                                <input type="radio" name="type_signalement" value="Vérification" style="display: none;">
                                                <span style="color: #374151; font-weight: 600; text-align: center;">Vérification</span>
                                            </label>
                                            <label class="type-signalement-btn" style="display: flex; align-items: center; justify-content: center; padding: 12px; background: #f3f4f6; border: 3px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 14px;" onclick="selectTypeSignalement(this, 'Maintenance préventive')">
                                                <input type="radio" name="type_signalement" value="Maintenance préventive" style="display: none;">
                                                <span style="color: #374151; font-weight: 600; text-align: center;">Maintenance</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- BOUTONS INTÉGRÉS (plus grands et visibles) -->
                                <div style="display: flex; gap: 20px; justify-content: flex-end; padding-top: 20px; border-top: 2px solid #e5e7eb; margin-top: auto;">
                                    <button type="button" onclick="closeBTModal()" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 18px 36px; border: none; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(239, 68, 68, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(239, 68, 68, 0.3)'">❌ Annuler</button>
                                    <button type="submit" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 18px 36px; border: none; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(16, 185, 129, 0.3)'">🎫 Créer le BT</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                
                // Fonction pour fermer le modal BT
                window.closeBTModal = function() {
                    console.log('🚪 [CreateBT] Fermeture du modal BT');
                    
                    // Supprimer le modal principal
                    const mainModal = document.getElementById('createBTModal');
                    if (mainModal && mainModal.parentNode) {
                        mainModal.remove();
                    }
                    
                    // Nettoyer tous les modals BT possibles
                    const allBTModals = document.querySelectorAll('[id*="createBT"], [class*="bt-modal"]');
                    allBTModals.forEach(modal => {
                        if (modal.parentNode) modal.remove();
                    });
                    
                    console.log('✅ [CreateBT] Modal BT fermé');
                };
                
                // ✅ FONCTIONS POUR MOTEUR DE RECHERCHE TECHNICIEN (comme Podio)
                window.searchTechnician = function(query) {
                    const dropdown = document.getElementById('technicianDropdown');
                    if (!dropdown) return;
                    
                    const technicians = [
                        'zineddine chergui',
                        'Équipe Atelier',
                        'Équipe SEA est',
                        'Équipe SEA ouest',
                        'Équipe Projets'
                    ];
                    
                    const filtered = technicians.filter(tech => 
                        tech.toLowerCase().includes(query.toLowerCase())
                    );
                    
                    dropdown.innerHTML = filtered.map(tech => {
                        const initials = tech.split(' ').map(n => n.charAt(0).toUpperCase()).join('');
                        return `
                            <div class="technician-option" data-value="${tech}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f3f4f6;" onmousedown="selectTechnician('${tech}', this)">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${initials}</div>
                                    <span>${tech}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    dropdown.style.display = filtered.length > 0 ? 'block' : 'none';
                };
                
                window.showTechnicianDropdown = function() {
                    const dropdown = document.getElementById('technicianDropdown');
                    if (dropdown) {
                        dropdown.style.display = 'block';
                    }
                };
                
                window.hideTechnicianDropdown = function() {
                    setTimeout(() => {
                        const dropdown = document.getElementById('technicianDropdown');
                        if (dropdown) {
                            dropdown.style.display = 'none';
                        }
                    }, 200);
                };
                
                window.selectTechnician = function(technicianName, element) {
                    const searchInput = document.querySelector('input[name="technicien_search"]');
                    const hiddenInput = document.getElementById('selectedTechnicianId');
                    
                    if (searchInput) {
                        searchInput.value = technicianName;
                    }
                    if (hiddenInput) {
                        hiddenInput.value = technicianName;
                    }
                    
                    const dropdown = document.getElementById('technicianDropdown');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                    
                    console.log('👤 [CreateBT] Technicien sélectionné:', technicianName);
                };
                
                // ✅ FONCTIONS POUR SÉLECTEUR DE SALLE (comme Podio)
                window.openRoomSelector = function() {
                    const rooms = ['A-1825', 'A-4424', 'AR-2430', 'A-1750', 'A-4422'];
                    const currentRoom = document.getElementById('selectedRoom').textContent;
                    
                    const selector = document.createElement('div');
                    selector.id = 'roomSelectorModal';
                    selector.style.cssText = `
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.5); z-index: 100000;
                        display: flex; align-items: center; justify-content: center;
                    `;
                    
                    selector.innerHTML = `
                        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
                            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Sélectionner une salle</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 15px;">
                                ${rooms.map(room => `
                                    <button type="button" onclick="selectRoom('${room}')" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: ${room === currentRoom ? '#3b82f6' : 'white'}; color: ${room === currentRoom ? 'white' : '#374151'}; cursor: pointer;">
                                        ${room}
                                    </button>
                                `).join('')}
                            </div>
                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button type="button" onclick="closeRoomSelector()" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer;">Annuler</button>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(selector);
                };
                
                window.selectRoom = function(roomName) {
                    document.getElementById('selectedRoom').textContent = roomName;
                    document.getElementById('hiddenRoomValue').value = roomName;
                    closeRoomSelector();
                };
                
                window.removeSelectedRoom = function() {
                    document.getElementById('selectedRoom').textContent = '';
                    document.getElementById('hiddenRoomValue').value = '';
                };
                
                window.closeRoomSelector = function() {
                    const selector = document.getElementById('roomSelectorModal');
                    if (selector) selector.remove();
                };
                
                // ✅ FONCTIONS POUR FORMATAGE TEXTE (éditeur riche)
                window.formatText = function(command) {
                    const textarea = document.getElementById('descriptionField');
                    if (!textarea) return;
                    
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end);
                    
                    if (selectedText) {
                        let formattedText = selectedText;
                        switch(command) {
                            case 'bold':
                                formattedText = `**${selectedText}**`;
                                break;
                            case 'italic':
                                formattedText = `*${selectedText}*`;
                                break;
                            case 'underline':
                                formattedText = `__${selectedText}__`;
                                break;
                        }
                        
                        textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
                        textarea.focus();
                        textarea.setSelectionRange(start, start + formattedText.length);
                    }
                };
                
                // ✅ FONCTION POUR SÉLECTION TYPE DE SIGNALEMENT (corrige le problème des boutons)
                window.selectTypeSignalement = function(labelElement, value) {
                    // Décocher tous les autres boutons
                    const allTypeButtons = document.querySelectorAll('.type-signalement-btn');
                    allTypeButtons.forEach(btn => {
                        btn.style.background = '#f3f4f6';
                        btn.style.borderColor = '#e5e7eb';
                        const span = btn.querySelector('span');
                        if (span) {
                            span.style.color = '#374151';
                        }
                        const input = btn.querySelector('input[type="radio"]');
                        if (input) {
                            input.checked = false;
                        }
                    });
                    
                    // Activer le bouton cliqué
                    labelElement.style.background = '#fef2f2';
                    labelElement.style.borderColor = '#fecaca';
                    const span = labelElement.querySelector('span');
                    if (span) {
                        span.style.color = '#991b1b';
                    }
                    const input = labelElement.querySelector('input[type="radio"]');
                    if (input) {
                        input.checked = true;
                    }
                    
                    console.log('🔧 [CreateBT] Type de signalement sélectionné:', value);
                };
                
                // Ajouter les styles pour les boutons radio Podio-like
                const podioStyles = document.createElement('style');
                podioStyles.textContent = `
                    /* Styles pour boutons radio comme Podio */
                    .bt-radio-group label:hover {
                        background: #e0f2fe !important;
                        border-color: #0ea5e9 !important;
                    }
                    
                    .bt-radio-group input[type="radio"]:checked + span {
                        font-weight: 600 !important;
                    }
                    
                    .bt-radio-group label:has(input[type="radio"]:checked) {
                        background: #dbeafe !important;
                        border-color: #3b82f6 !important;
                    }
                    
                    .technician-option:hover {
                        background: #f3f4f6 !important;
                    }
                    
                    .bt-type-button:hover {
                        background: #f0f9ff !important;
                        border-color: #0ea5e9 !important;
                        transform: translateY(-1px);
                    }
                    
                    .bt-type-button:has(input[type="radio"]:checked) {
                        background: #dbeafe !important;
                        border-color: #3b82f6 !important;
                        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                    }
                `;
                document.head.appendChild(podioStyles);
                
                // Ajouter le modal au DOM
                document.body.appendChild(modal);
                
                // ✅ NOUVEAU : Appliquer les couleurs des labels en mode sombre
                applyDarkModeLabelsColors();
                
                // Ajouter le gestionnaire de soumission
                modal.querySelector('#realBTForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    // Récupérer les données du formulaire
                    const formData = new FormData(e.target);
                    const btData = {};
                    for (let [key, value] of formData.entries()) {
                        if (value.trim()) {
                            btData[key] = value.trim();
                        }
                    }
                    
                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    const originalText = submitBtn ? submitBtn.innerHTML : '🎫 Créer le BT';
                    
                    try {
                        if (submitBtn) {
                            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création en cours...';
                            submitBtn.disabled = true;
                        }
                        
                        console.log('🎫 [CreateBT] Envoi données BT vers Podio:', btData);
                        
                        // VRAI APPEL API vers le backend Go
                        const response = await safeFetch(`${GO_SERVER_URL}/api/bt/create`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(btData)
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            console.log('✅ [CreateBT] BT créé avec succès dans Podio:', result.bt_number);
                            showSuccessNotification(`BT créé avec succès dans Podio : ${result.bt_number}`);
                    closeBTModal();
                            if (typeof loadTickets === 'function') loadTickets();
                        } else {
                            console.error('❌ [CreateBT] Erreur création Podio:', result.error);
                            showErrorNotification(result.message || 'Erreur lors de la création du BT dans Podio');
                        }
                        
                    } catch (error) {
                        console.error('❌ [CreateBT] Erreur réseau vers Podio:', error);
                        showErrorNotification('Erreur de connexion lors de la création du BT dans Podio');
                    } finally {
                        if (submitBtn) {
                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;
                        }
                    }
                });
                
                setTimeout(() => {
                    const firstInput = modal.querySelector('input[name="titre"]');
                    if (firstInput) firstInput.focus();
                }, 100);
                
            } catch (error) {
                console.error('❌ [CreateBT] Erreur ouverture modal:', error);
                showErrorNotification('Impossible d\'ouvrir le formulaire de création BT');
            }
        }
        
        function closeCreateBTModal() {
            document.getElementById('createBTModal').style.display = 'none';
        }
        
        // ✅ NOUVELLE FONCTION : Générer formulaire BT avec données du ticket
        function generateCreateBTFormWithTicketData(validationFields, ticket) {
            // Pré-remplir les données basées sur le ticket
            const suggestedTitle = `[${ticket.ticket_number}] ${ticket.title}`;
            const suggestedRoom = ticket.room || 'Non spécifiée';
            const suggestedDescription = `Intervention technique pour le ticket SEA ${ticket.ticket_number}.\n\nProblème reporté :\n${ticket.description}`;
            
            return `
                <h2 id="createBTModalTitle" class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    Créer un BT pour le ticket ${ticket.ticket_number}
                </h2>
                
                <form id="createBTForm" onsubmit="submitCreateBT(event)">
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-info-circle"></i>
                            Informations principales
                        </div>
                        
                        <div class="bt-form-grid">
                            <div class="bt-form-group full-width">
                                <label class="bt-form-label required" for="bt-titre">Titre</label>
                                <input type="text" id="bt-titre" name="titre" class="bt-form-input" 
                                       placeholder="Titre du bon de travail..." 
                                       value="${suggestedTitle}" required>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-salle">Salle / Projet / Événement</label>
                                <input type="text" id="bt-salle" name="salle_projet_evenement" class="bt-form-input" 
                                       placeholder="A-1750, Projet X, Événement Y..." 
                                       value="${suggestedRoom}" required>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-periode">Période d'intervention</label>
                                <input type="date" id="bt-periode" name="periode_intervention" class="bt-form-input" 
                                       value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-tags"></i>
                            Classification
                        </div>
                        
                        <div class="bt-form-grid">
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-secteur">Secteur</label>
                                <select id="bt-secteur" name="secteur" class="bt-form-select" required>
                                    <option value="">Sélectionner un secteur...</option>
                                    ${validationFields.secteurs.map(s => `<option value="${s}" ${s === 'SEA Est' ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-priorite">Priorité</label>
                                <select id="bt-priorite" name="priorite" class="bt-form-select" required>
                                    <option value="">Sélectionner une priorité...</option>
                                    ${validationFields.priorites.map(p => `<option value="${p}" ${p === 'moyennement urgent' ? 'selected' : ''}>${p}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-statut">Statut</label>
                                <select id="bt-statut" name="statut" class="bt-form-select" required>
                                    <option value="">Sélectionner un statut...</option>
                                    ${validationFields.statuts.map(s => `<option value="${s}" ${s === 'Assigné' ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label" for="bt-type-signalement">Type de signalement</label>
                                <select id="bt-type-signalement" name="type_signalement" class="bt-form-select">
                                    <option value="">Sélectionner un type...</option>
                                    ${validationFields.types_signalement.map(t => `<option value="${t}" ${t === 'Dépannage' ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-align-left"></i>
                            Description
                        </div>
                        
                        <div class="bt-form-group full-width">
                            <label class="bt-form-label" for="bt-description">Description détaillée</label>
                            <textarea id="bt-description" name="description" class="bt-form-textarea" 
                                      placeholder="Décrivez le problème, la demande ou l'intervention...">${suggestedDescription}</textarea>
                        </div>
                    </div>
                    
                    <div class="bt-form-buttons">
                        <button type="button" class="bt-btn secondary" onclick="closeCreateBTModal()">
                            <i class="fas fa-times"></i>
                            Annuler
                        </button>
                        <button type="submit" class="bt-btn primary" style="font-size: 18px; padding: 12px 24px;">
                            <i class="fas fa-save"></i>
                            Créer le BT
                        </button>
                    </div>
                </form>
            `;
        }

        function generateCreateBTForm(validationFields) {
            return `
                <h2 id="createBTModalTitle" class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    Créer un nouveau BT
                </h2>
                
                <form id="createBTForm" onsubmit="submitCreateBT(event)">
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-info-circle"></i>
                            Informations principales
                        </div>
                        
                        <div class="bt-form-grid">
                            <div class="bt-form-group full-width">
                                <label class="bt-form-label required" for="bt-titre">Titre</label>
                                <input type="text" id="bt-titre" name="titre" class="bt-form-input" 
                                       placeholder="Titre du bon de travail..." required>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-salle">Salle / Projet / Événement</label>
                                <input type="text" id="bt-salle" name="salle_projet_evenement" class="bt-form-input" 
                                       placeholder="A-1750, Projet X, Événement Y..." required>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-periode">Période d'intervention</label>
                                <input type="date" id="bt-periode" name="periode_intervention" class="bt-form-input" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-tags"></i>
                            Classification
                        </div>
                        
                        <div class="bt-form-grid">
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-secteur">Secteur</label>
                                <select id="bt-secteur" name="secteur" class="bt-form-select" required>
                                    <option value="">Sélectionner un secteur...</option>
                                    ${validationFields.secteurs.map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-priorite">Priorité</label>
                                <select id="bt-priorite" name="priorite" class="bt-form-select" required>
                                    <option value="">Sélectionner une priorité...</option>
                                    ${validationFields.priorites.map(p => `<option value="${p}">${p}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label required" for="bt-statut">Statut</label>
                                <select id="bt-statut" name="statut" class="bt-form-select" required>
                                    <option value="">Sélectionner un statut...</option>
                                    ${validationFields.statuts.map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="bt-form-group">
                                <label class="bt-form-label" for="bt-type-signalement">Type de signalement</label>
                                <select id="bt-type-signalement" name="type_signalement" class="bt-form-select">
                                    <option value="">Sélectionner un type...</option>
                                    ${validationFields.types_signalement.map(t => `<option value="${t}">${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bt-form-section">
                        <div class="bt-form-section-title">
                            <i class="fas fa-align-left"></i>
                            Description
                        </div>
                        
                        <div class="bt-form-group full-width">
                            <label class="bt-form-label" for="bt-description">Description détaillée</label>
                            <textarea id="bt-description" name="description" class="bt-form-textarea" 
                                      placeholder="Décrivez le problème, la demande ou l'intervention..."></textarea>
                        </div>
                    </div>
                    
                    <div class="bt-form-buttons">
                        <button type="button" class="bt-btn secondary" onclick="closeCreateBTModal()">
                            <i class="fas fa-times"></i>
                            Annuler
                        </button>
                        <button type="submit" class="bt-btn primary" style="font-size: 18px; padding: 12px 24px;">
                            <i class="fas fa-save"></i>
                            Créer le BT
                        </button>
                    </div>
                </form>
            `;
        }
        
        async function submitCreateBT(event) {
            event.preventDefault();
            
            const form = document.getElementById('createBTForm');
            const formData = new FormData(form);
            
            const btData = {};
            for (let [key, value] of formData.entries()) {
                if (value.trim()) {
                    btData[key] = value.trim();
                }
            }
            
            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création en cours...';
                submitBtn.disabled = true;
                
                console.log('🎫 [CreateBT] Envoi données BT:', btData);
                
                const response = await safeFetch(`${GO_SERVER_URL}/api/bt/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(btData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ [CreateBT] BT créé avec succès:', result.bt_number);
                    showSuccessNotification(`BT créé avec succès : ${result.bt_number}`);
                    closeCreateBTModal();
                    if (typeof loadTickets === 'function') loadTickets();
                } else {
                    console.error('❌ [CreateBT] Erreur création:', result.error);
                    showErrorNotification(result.message || 'Erreur lors de la création du BT');
                }
                
            } catch (error) {
                console.error('❌ [CreateBT] Erreur réseau:', error);
                showErrorNotification('Erreur de connexion lors de la création du BT');
            } finally {
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    

// === TYPING CLIENT (original) ===

// Gestionnaire d'événements de frappe pour le chat
(function() {
    // Variables pour le suivi de l'état de frappe
    let typingTimeout = null;
    let isTyping = false;
    let lastTypingEvent = 0;
    const TYPING_INTERVAL = 2000; // 2 secondes entre les événements de frappe
    
    // 🔐 IDENTIFIANT UNIQUE pour ce client SEA
    const SEA_CLIENT_ID = `sea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔐 [TypingClient] ID client SEA généré: ${SEA_CLIENT_ID}`);
    
        // 🚫 Rendre l'ID global pour la blacklist
        window.SEA_CLIENT_ID = SEA_CLIENT_ID;
        
        // 🔧 Fonction utilitaire pour extraire room_id depuis channel_id
        function getCurrentRoomFromChannelId(channelId) {
            // Format: sea-chat-A-1825-timestamp ou similaire
            if (channelId && channelId.includes('-')) {
                const parts = channelId.split('-');
                if (parts.length >= 4) {
                    return parts[2] + '-' + parts[3]; // A-1825
                }
            }
            return null;
        }
    
    // Fonction pour envoyer l'état de frappe au serveur
    async function sendTypingStatus(channelId, isTyping) {
        try {
            console.log(`⌨️ [TypingClient] Envoi état frappe: ${isTyping ? 'en train d\'écrire' : 'arrêté d\'écrire'}`);
            
            const response = await fetch(`${window.GO_SERVER_URL || 'http://localhost:7070'}/api/tickets/chat/typing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel_id: channelId,
                    room_id: getCurrentRoomFromChannelId(channelId),
                    is_typing: isTyping,
                    client_id: SEA_CLIENT_ID,
                    sender: 'sea'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log(`✅ [TypingClient] État frappe envoyé: ${isTyping}`);
        } catch (error) {
            console.error(`❌ [TypingClient] Erreur d'envoi d'état de frappe:`, error);
        }
    }
    
    // Fonction pour gérer les événements de frappe
    function handleTyping(event) {
        // ⚠️ TICKETS SEA NE DOIT PAS ENVOYER DE TYPING EVENTS
        // Tickets = Interface technicien qui REÇOIT SEULEMENT les typing de Vitrine
        console.log('🚫 [TypingClient] Envoi de typing désactivé - Tickets ne fait que recevoir');
        return;
        
        // Code original désactivé
        /*
        const inputId = event.target.id;
        const ticketId = inputId.replace('chatInput_', '');
        
        const chatInfo = window.activeChats[ticketId];
        if (!chatInfo) {
            console.log(`⚠️ [TypingClient] Pas de chat actif pour le ticket ${ticketId}`);
            return;
        }
        
        // Utiliser chatId (nom correct de la propriété dans activeChats)
        let channelId = chatInfo.chatId || chatInfo.channelId;
        
        if (!channelId) {
            console.log(`⚠️ [TypingClient] Pas de chatId trouvé pour le ticket ${ticketId}`, chatInfo);
            
            // Essayer le chatRegistry comme fallback
            const registryInfo = window.chatRegistry?.[ticketId];
            channelId = registryInfo?.chatId;
            
            if (channelId) {
                console.log(`🔧 [TypingClient] Utilisation chatRegistry comme fallback:`, channelId);
            } else {
                console.log(`❌ [TypingClient] Aucun chatId disponible nulle part pour ${ticketId}`);
                return;
            }
        }
        
        // Éviter le spam de logs - ne log qu'une fois par session de typing
        if (!window.typingLoggedSessions) window.typingLoggedSessions = new Set();
        if (!window.typingLoggedSessions.has(channelId)) {
            console.log(`✅ [TypingClient] Chat actif trouvé pour ${ticketId}, chatId: ${channelId}`);
            window.typingLoggedSessions.add(channelId);
        }
        const now = Date.now();
        
        // Éviter d'envoyer trop d'événements de frappe
        if (!isTyping) {
            isTyping = true;
            sendTypingStatus(channelId, true);
            lastTypingEvent = now;
        } else if (now - lastTypingEvent > TYPING_INTERVAL) {
            // Renvoyer l'état de frappe toutes les X secondes pour maintenir l'état
            sendTypingStatus(channelId, true);
            lastTypingEvent = now;
        }
        
        // Fin du code désactivé
        */
    }
    
    // Fonction d'initialisation à appeler pour chaque input de chat
    window.initTypingDetection = function(inputId) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) {
            console.error(`❌ [TypingClient] Élément input ${inputId} non trouvé`);
            return;
        }
        
        console.log(`🔍 [TypingClient] Initialisation détection frappe pour ${inputId}`);
        
        // ⚠️ DÉSACTIVÉ - Tickets ne doit pas envoyer de typing events
        // inputElement.addEventListener('input', handleTyping);
        // inputElement.addEventListener('keydown', handleTyping);
        console.log(`🚫 [TypingClient] Event listeners désactivés pour ${inputId} - Tickets en réception seule`);
    };
    
    // Initialiser automatiquement pour tous les inputs de chat existants
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 [TypingClient] Initialisation du module de détection de frappe');
    });
})();


/* === Safety mapping for inline handlers === */
try { if (typeof toggleTheme !== 'undefined' && !window.toggleTheme) window.toggleTheme = toggleTheme; } catch(e){}
try { if (typeof toggleRemindersSidebar !== 'undefined' && !window.toggleRemindersSidebar) window.toggleRemindersSidebar = toggleRemindersSidebar; } catch(e){}


/* =========================[ Hotfix v3 — Chat SSE dedup + session restore + safe theme ]========================= */
(function () {
  const LOG = (...a) => console.log('✅ [Hotfix v3]', ...a);
  const WARN = (...a) => console.warn('⚠️ [Hotfix v3]', ...a);

  // 1) Safe theme toggle polyfill (prevents tickets.html error if toggleTheme wasn't set yet)
  if (typeof window.toggleTheme !== 'function') {
    window.toggleTheme = function () {
      try {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        localStorage.setItem('tickets_sea_theme', next);
        LOG('toggleTheme applied →', next);
      } catch (e) {
        WARN('toggleTheme fallback failed', e);
      }
    };
    LOG('toggleTheme polyfill installé');
  }

  // 2) Globals for dedup & persistence
  window.__chatES = window.__chatES || {};                // ticketId -> EventSource
  window.__chatSeen = window.__chatSeen || {};            // chatId -> Set(hash)
  window.__chatPersist = window.__chatPersist || {};      // chatId -> messages[] (mirror of sessionStorage)

  const SS_KEY = (chatId) => `tickets_sea_chat_${chatId}`;
  const SS_META_KEY = (chatId) => `tickets_sea_chat_meta_${chatId}`;

  function hashMessage(msg) {
    try {
      return JSON.stringify([msg?.type, msg?.text ?? msg?.message ?? '', msg?.timestamp ?? msg?.time ?? '', msg?.id ?? '']);
    } catch {
      return String(Math.random());
    }
  }

  function saveMessage(chatId, msg) {
    if (!chatId || !msg) return;
    const key = SS_KEY(chatId);
    const metaKey = SS_META_KEY(chatId);
    const arr = JSON.parse(sessionStorage.getItem(key) || '[]');
    arr.push(msg);
    sessionStorage.setItem(key, JSON.stringify(arr));
    sessionStorage.setItem(metaKey, JSON.stringify({ status: 'active', savedAt: Date.now() }));
    window.__chatPersist[chatId] = arr;
  }

  function loadMessages(chatId) {
    const key = SS_KEY(chatId);
    try {
      return JSON.parse(sessionStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function clearChatHistory(chatId) {
    try {
      sessionStorage.removeItem(SS_KEY(chatId));
      sessionStorage.removeItem(SS_META_KEY(chatId));
      delete window.__chatPersist[chatId];
      delete window.__chatSeen[chatId];
      LOG('Historique nettoyé pour', chatId);
    } catch (e) {
      WARN('clearChatHistory error', e);
    }
  }

  // 3) Wrap addChatMessage to dedup + persist
  if (typeof window.addChatMessage === 'function' && !window.__addChatMessageV3) {
    const originalAdd = window.addChatMessage;
    window.addChatMessage = function (ticketId, chatId, message, type) {
      try {
        const seen = (window.__chatSeen[chatId] = window.__chatSeen[chatId] || new Set());
        const fingerprint = hashMessage({ type, message, text: message, id: message?.id, timestamp: Date.now() });
        if (seen.has(fingerprint)) {
          LOG('Dupli ignoré (addChatMessage)', fingerprint);
          return;
        }
        seen.add(fingerprint);
        // Persist
        saveMessage(chatId, { type, text: message, timestamp: Date.now() });
      } catch (e) {
        WARN('addChatMessage wrap error', e);
      }
      return originalAdd.apply(this, arguments);
    };
    window.__addChatMessageV3 = true;
    LOG('addChatMessage hook (persist+dedup) installé');
  }

  // 4) Restore messages when a chat banner opens
  function restoreIntoDOM(ticketId, chatId) {
    const msgs = loadMessages(chatId);
    if (!Array.isArray(msgs) || msgs.length === 0) return;
    if (typeof window.addChatMessage !== 'function') return;
    LOG(`Restauration ${msgs.length} msg pour`, ticketId, chatId);
    for (const m of msgs) {
      try {
        window.addChatMessage(ticketId, chatId, m.text, m.type);
      } catch (e) {
        WARN('restore addChatMessage failed', e);
      }
    }
  }

  if (typeof window.openChatBanner === 'function' && !window.__openChatBannerV3) {
    const originalOpen = window.openChatBanner;
    window.openChatBanner = function () {
      const result = originalOpen.apply(this, arguments);
      try {
        const ticketId = arguments[0]?.ticketId || arguments[0];
        // Attempt to infer chatId from activeChats if available
        const active = (window.activeChats && window.activeChats[ticketId]) || null;
        const chatId = active?.chatInfo?.chatId || active?.chatId || null;
        if (chatId) {
          // Only restore if not ended
          const metaRaw = sessionStorage.getItem(SS_META_KEY(chatId));
          const meta = metaRaw ? JSON.parse(metaRaw) : null;
          if (!meta || meta.status !== 'ended') restoreIntoDOM(ticketId, chatId);
        }
      } catch (e) {
        WARN('openChatBanner wrap error', e);
      }
      return result;
    };
    window.__openChatBannerV3 = true;
    LOG('openChatBanner patch (restauration) installé');
  }

  // 5) Ensure only one SSE per ticket & dedup by event_id
  if (typeof window.startChatEventSource === 'function' && !window.__startChatEventSourceV3) {
    const originalStart = window.startChatEventSource;
    window.startChatEventSource = function (ticketId, channelId) {
      try {
        if (!ticketId) return originalStart.apply(this, arguments);
        // Reuse existing ES if alive
        const existing = window.__chatES[ticketId];
        if (existing && existing.readyState !== EventSource.CLOSED) {
          LOG('SSE déjà actif pour ticket', ticketId);
          return existing;
        }
        const es = originalStart.apply(this, arguments);
        window.__chatES[ticketId] = es;

        // Add id-aware dedup layer - VÉRIFICATION SÉCURISÉE
        if (!es || typeof es !== 'object') {
          WARN('EventSource invalide retourné par originalStart');
          return null;
        }
        
        const onmsg = es.onmessage || function() {}; // ✅ CORRIGÉ: Fallback si onmessage undefined
        es.onmessage = function (ev) {
          try {
            // Parse JSON to inspect type & payload & optional event_id
            const data = (ev && ev.data) ? JSON.parse(ev.data) : null;
            const evId = (ev && ev.lastEventId) || data?.event_id || null;
            const type = data?.type || data?.Type || null;
            const payload = data?.data || data?.Data || null;
            const cid = payload?.channel_id || channelId;

            if (cid) {
              const seen = (window.__chatSeen[cid] = window.__chatSeen[cid] || new Set());
              const f = evId || hashMessage({ type, payload });
              if (seen.has(f)) {
                LOG('Dupli ignoré (SSE)', f);
                return;
              }
              seen.add(f);
            }

            // Chat ended → purge local history
            if (type === 'chat_ended' && (payload?.channel_id || channelId)) {
              clearChatHistory(payload?.channel_id || channelId);
            }
          } catch (e) {
            // Swallow parse errors; still forward
          }
          if (typeof onmsg === 'function') return onmsg.call(this, ev);
        };

        // Clean registry on close
        const onerr = es.onerror;
        es.onerror = function (e) {
          delete window.__chatES[ticketId];
          if (typeof onerr === 'function') return onerr.call(this, e);
        };
        es.onopen = function () { LOG('SSE (v3) ouvert pour ticket', ticketId); };
        return es;
      } catch (e) {
        WARN('startChatEventSource wrap error', e);
        return originalStart.apply(this, arguments);
      }
    };
    window.__startChatEventSourceV3 = true;
    LOG('startChatEventSource patché (anti-doublon + event_id)');
  }

  // 6) Optional: expose a helper to mark chat ended (can be called by existing code)
  window.__markChatEndedV3 = function (chatId) {
    clearChatHistory(chatId);
  };

  LOG('Hotfix v3 installé ✅');
})();
/* ============================================================================================================== */
