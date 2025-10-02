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
                    // Construire l'URL du plan avec le vrai chemin
                    let planUrl;
                    if (roomName === 'A-1825') {
                        // Chemin réseau Windows - essayer plusieurs formats
                        planUrl = '\\\\index\\Donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\A (Pavillon Hubert-Aquin)\\A-1825\\P-5044_plans_unifilaire-MMC.pdf';
                        
                        // Ajouter un gestionnaire d'erreur pour essayer un format alternatif
                        planLink.onclick = function(e) {
                            e.preventDefault();
                            // Essayer d'ouvrir avec le format UNC
                            try {
                                window.open(planUrl, '_blank');
                            } catch (error) {
                                // Si ça échoue, essayer avec file://
                                const fileUrl = 'file://index/Donnees.01/SAV/Accueil/Soutien/Atelier/plans/plans_branchements/A%20(Pavillon%20Hubert-Aquin)/A-1825/P-5044_plans_unifilaire-MMC.pdf';
                                window.open(fileUrl, '_blank');
                            }
                        };
                    } else {
                        planUrl = `https://example.com/plans/${roomName}.pdf`;
                    }
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
