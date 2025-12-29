// Module des plans unifilaires - Version compatible GitHub Pages + Backend
// Les plans sont servis via le backend pour Ã©viter les problÃ¨mes de sÃ©curitÃ© file://

(function() {
    console.log('ðŸ“‹ [RoomPlans] Module des plans unifilaires chargÃ© - Version locale');
    
    // Configuration des plans disponibles
    const AVAILABLE_PLANS = ['A-1825']; // Ajouter d'autres salles ici si nÃ©cessaire
    
    console.log('ðŸ“‹ [RoomPlans] Plans disponibles:', AVAILABLE_PLANS);
    
    // Configuration globale pour les plans
    window.RoomPlansConfig = {
        updatePlanSection: function(roomName) {
            console.log('ðŸ”§ [RoomPlans] Mise Ã  jour section plan pour:', roomName);
            
            const planSection = document.getElementById('technicalPlanSection');
            const noPlanSection = document.getElementById('technicalNoPlan');
            const planLink = document.getElementById('technicalPlanLink');
            
            if (!planSection || !noPlanSection) {
                console.warn('âš ï¸ [RoomPlans] Ã‰lÃ©ments DOM manquants');
                return;
            }
            
            // VÃ©rifier si un plan existe pour cette salle
            if (AVAILABLE_PLANS.includes(roomName)) {
                console.log('âœ… [RoomPlans] Plan disponible pour:', roomName);
                planSection.style.display = 'block';
                noPlanSection.style.display = 'none';
                
                if (planLink) {
                    // Utiliser l'API backend pour servir les plans
                    // Le backend doit exposer /api/room-plans/{room}.pdf
                    const backendBase = window.BACKEND_BASE || 'http://localhost:7070';
                    const planUrl = backendBase + '/api/room-plans/' + encodeURIComponent(roomName) + '.pdf';
                    
                    planLink.href = planUrl;
                    planLink.target = '_blank';
                    planLink.onclick = function(e) {
                        // Ouvrir dans un nouvel onglet
                        console.log('ðŸ“„ [RoomPlans] Ouverture du plan:', planUrl);
                    };
                }
            } else {
                console.log('âŒ [RoomPlans] Aucun plan disponible pour:', roomName);
                planSection.style.display = 'none';
                noPlanSection.style.display = 'block';
            }
        }
    };
    
    // Initialisation
    console.log('ðŸ“‹ [RoomPlans] Module local initialisÃ© avec', AVAILABLE_PLANS.length, 'plans');
    console.log('ðŸŒ [RoomPlans] Configuration pour localhost');
})();
