// 📋 FICHIER LOCAL - TRACE DES MODIFICATIONS
// Module des plans unifilaires - Version locale pour localhost
// Ce fichier est gardé localement comme trace des modifications
// La vitrine.html utilise les fichiers GitHub + override local

(function() {
    console.log('📋 [RoomPlans] Module des plans unifilaires chargé - Version locale');
    
    // Configuration des plans disponibles
    const AVAILABLE_PLANS = ['A-1825']; // Ajouter d'autres salles ici si nécessaire
    
    console.log('📋 [RoomPlans] Plans disponibles:', AVAILABLE_PLANS);
    
    // Configuration globale pour les plans
    window.RoomPlansConfig = {
        updatePlanSection: function(roomName) {
            console.log('🔧 [RoomPlans] Mise à jour section plan pour:', roomName);
            
            const planSection = document.getElementById('technicalPlanSection');
            const noPlanSection = document.getElementById('technicalNoPlan');
            const planLink = document.getElementById('technicalPlanLink');
            
            if (!planSection || !noPlanSection) {
                console.warn('⚠️ [RoomPlans] Éléments DOM manquants');
                return;
            }
            
            // Vérifier si un plan existe pour cette salle
            if (AVAILABLE_PLANS.includes(roomName)) {
                console.log('✅ [RoomPlans] Plan disponible pour:', roomName);
                planSection.style.display = 'block';
                noPlanSection.style.display = 'none';
                
                if (planLink) {
                    // Construire l'URL du plan (ajuster selon votre structure)
                    const planUrl = `https://example.com/plans/${roomName}.pdf`;
                    planLink.href = planUrl;
                }
            } else {
                console.log('❌ [RoomPlans] Aucun plan disponible pour:', roomName);
                planSection.style.display = 'none';
                noPlanSection.style.display = 'block';
            }
        }
    };
    
    // Initialisation
    console.log('📋 [RoomPlans] Module local initialisé avec', AVAILABLE_PLANS.length, 'plans');
    console.log('🌐 [RoomPlans] Configuration pour localhost');
})();
