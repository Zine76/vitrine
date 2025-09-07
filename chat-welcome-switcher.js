/**
 * Gestionnaire de styles pour le message d'accueil du chat
 * Permet de basculer entre différents designs
 */

const WelcomeMessageStyles = {
    // Style 1: Bulle moderne avec gradient (par défaut)
    style1: () => `
        <div class="welcome-message-container">
            <div class="welcome-bubble">
                <div class="welcome-content">
                    <div class="welcome-icon">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div class="welcome-text">
                        <div class="welcome-text-title">
                            Bonjour ! 👋
                            <span class="welcome-status">
                                <span class="welcome-status-dot"></span>
                                En ligne
                            </span>
                        </div>
                        <div class="welcome-text-subtitle">
                            Technicien SEA à votre service
                        </div>
                        <div class="welcome-text-question">
                            Comment puis-je vous aider ?
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    // Style 2: Carte minimaliste moderne
    style2: () => `
        <div class="welcome-container-v2">
            <div class="welcome-card-v2">
                <div class="welcome-avatar-v2">
                    <i class="fas fa-headset"></i>
                    <div class="welcome-presence-v2"></div>
                </div>
                <div class="welcome-message-v2">
                    <div class="welcome-greeting-v2">
                        Bonjour <span class="welcome-emoji-v2">👋</span>
                        <span class="welcome-badge-v2">Disponible</span>
                    </div>
                    <div class="welcome-role-v2">
                        Technicien SEA • Prêt à vous aider
                    </div>
                </div>
            </div>
        </div>
    `,
    
    // Style 3: Notification style
    style3: () => `
        <div class="welcome-container-v2">
            <div class="welcome-notification-v3">
                <div class="welcome-icon-v3">
                    <i class="fas fa-comments"></i>
                </div>
                <div class="welcome-text-v3">
                    <div class="welcome-title-v3">Support SEA en ligne</div>
                    <div class="welcome-desc-v3">Comment puis-je vous assister ?</div>
                </div>
            </div>
        </div>
    `,
    
    // Style 4: Ultra compact (une ligne)
    style4: () => `
        <div style="display: flex; justify-content: center; padding: 0.5rem;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 1rem; font-size: 0.75rem;">
                <span style="color: #3b82f6;">💬</span>
                <span style="color: #475569;">Technicien SEA disponible</span>
                <span style="color: #10b981;">●</span>
            </div>
        </div>
    `
};

// Fonction pour changer le style du message d'accueil
function switchWelcomeStyle(styleNumber) {
    const styleKey = `style${styleNumber}`;
    if (!WelcomeMessageStyles[styleKey]) {
        console.error(`Style ${styleNumber} non disponible`);
        return;
    }
    
    // Sauvegarder le choix
    localStorage.setItem('chat-welcome-style', styleNumber);
    
    // Si le chat est ouvert, mettre à jour immédiatement
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const existingWelcome = chatMessages.querySelector('.chat-message.system-message');
        if (existingWelcome) {
            existingWelcome.innerHTML = WelcomeMessageStyles[styleKey]();
        }
    }
    
    console.log(`✨ Style de message d'accueil changé: Style ${styleNumber}`);
}

// Fonction pour obtenir le style actuel
function getCurrentWelcomeStyle() {
    const saved = localStorage.getItem('chat-welcome-style');
    return saved ? parseInt(saved) : 1; // Style 1 par défaut
}

// Fonction pour créer le message d'accueil avec le style sauvegardé
function createWelcomeMessage() {
    const styleNumber = getCurrentWelcomeStyle();
    const styleKey = `style${styleNumber}`;
    return WelcomeMessageStyles[styleKey] ? WelcomeMessageStyles[styleKey]() : WelcomeMessageStyles.style1();
}

// Export pour utilisation dans app.js
if (typeof window !== 'undefined') {
    window.WelcomeMessageManager = {
        switchStyle: switchWelcomeStyle,
        getCurrentStyle: getCurrentWelcomeStyle,
        createMessage: createWelcomeMessage,
        styles: WelcomeMessageStyles
    };
}

// Raccourcis clavier pour tester les styles (Ctrl+Shift+1-4)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        switchWelcomeStyle(parseInt(e.key));
        
        // Afficher une notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        notification.textContent = `Style ${e.key} appliqué`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
});
