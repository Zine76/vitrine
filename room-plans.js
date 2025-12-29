// Module des plans unifilaires - Version avec chemin rÃ©seau UQAM
// Note: Les navigateurs bloquent l'accÃ¨s direct aux chemins file:// et \\
// Solution: Afficher le chemin pour copier/coller dans l'explorateur Windows

(function() {
    console.log('ðŸ“‹ [RoomPlans] Module des plans unifilaires chargÃ© - Version locale');
    
    // Configuration des plans disponibles avec leurs chemins rÃ©seau
    const PLANS_CONFIG = {
        'A-1825': {
            path: '\\\\index\\Donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\A (Pavillon Hubert-Aquin)\\A-1785\\Plan_unifilaire_A1785_20230113.pdf',
            name: 'Plan_unifilaire_A1785_20230113.pdf'
        }
    };
    
    const AVAILABLE_PLANS = Object.keys(PLANS_CONFIG);
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
            const planConfig = PLANS_CONFIG[roomName];
            if (planConfig) {
                console.log('âœ… [RoomPlans] Plan disponible pour:', roomName);
                planSection.style.display = 'block';
                noPlanSection.style.display = 'none';
                
                if (planLink) {
                    // Afficher le nom du fichier
                    planLink.innerHTML = '<i class=\"fas fa-external-link-alt\"></i> ' + planConfig.name;
                    planLink.href = '#';
                    planLink.title = 'Cliquez pour copier le chemin du plan';
                    
                    planLink.onclick = function(e) {
                        e.preventDefault();
                        
                        // Copier le chemin dans le presse-papiers
                        navigator.clipboard.writeText(planConfig.path).then(function() {
                            // Afficher confirmation
                            const originalText = planLink.innerHTML;
                            planLink.innerHTML = '<i class=\"fas fa-check\"></i> Chemin copiÃ© !';
                            planLink.style.backgroundColor = '#10b981';
                            
                            setTimeout(function() {
                                planLink.innerHTML = originalText;
                                planLink.style.backgroundColor = '';
                            }, 2000);
                            
                            // Afficher aussi une alerte avec le chemin
                            alert('Chemin copiÃ© dans le presse-papiers !\\n\\nCollez-le dans l\\'Explorateur Windows (Win+E) :\\n\\n' + planConfig.path);
                            
                            console.log('ðŸ“„ [RoomPlans] Chemin copiÃ©:', planConfig.path);
                        }).catch(function(err) {
                            console.error('âŒ [RoomPlans] Erreur copie:', err);
                            // Fallback: afficher le chemin dans une alerte
                            prompt('Copiez ce chemin et collez-le dans l\\'Explorateur Windows:', planConfig.path);
                        });
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
    console.log('ðŸŒ [RoomPlans] Configuration pour rÃ©seau UQAM');
})();
