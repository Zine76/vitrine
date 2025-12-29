// Module des plans unifilaires - Version avec chemin reseau UQAM
// Note: Les navigateurs bloquent l acces direct aux chemins file:// et \\
// Solution: Afficher le chemin pour copier/coller dans l explorateur Windows

(function() {
    console.log('[RoomPlans] Module des plans unifilaires charge - Version locale');
    
    // Configuration des plans disponibles avec leurs chemins reseau
    var PLANS_CONFIG = {
        'A-1825': {
            path: '\\\\index\\Donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\A (Pavillon Hubert-Aquin)\\A-1785\\Plan_unifilaire_A1785_20230113.pdf',
            name: 'Plan_unifilaire_A1785_20230113.pdf'
        }
    };
    
    var AVAILABLE_PLANS = Object.keys(PLANS_CONFIG);
    console.log('[RoomPlans] Plans disponibles:', AVAILABLE_PLANS);
    
    // Configuration globale pour les plans
    window.RoomPlansConfig = {
        updatePlanSection: function(roomName) {
            console.log('[RoomPlans] Mise a jour section plan pour:', roomName);
            
            var planSection = document.getElementById('technicalPlanSection');
            var noPlanSection = document.getElementById('technicalNoPlan');
            var planLink = document.getElementById('technicalPlanLink');
            
            if (!planSection || !noPlanSection) {
                console.warn('[RoomPlans] Elements DOM manquants');
                return;
            }
            
            // Verifier si un plan existe pour cette salle
            var planConfig = PLANS_CONFIG[roomName];
            if (planConfig) {
                console.log('[RoomPlans] Plan disponible pour:', roomName);
                planSection.style.display = 'block';
                noPlanSection.style.display = 'none';
                
                if (planLink) {
                    // Afficher le nom du fichier
                    planLink.innerHTML = '<i class="fas fa-external-link-alt"></i> ' + planConfig.name;
                    planLink.href = '#';
                    planLink.title = 'Cliquez pour copier le chemin du plan';
                    
                    planLink.onclick = function(e) {
                        e.preventDefault();
                        
                        // Copier le chemin dans le presse-papiers
                        navigator.clipboard.writeText(planConfig.path).then(function() {
                            // Afficher confirmation
                            var originalText = planLink.innerHTML;
                            planLink.innerHTML = '<i class="fas fa-check"></i> Chemin copie !';
                            planLink.style.backgroundColor = '#10b981';
                            
                            setTimeout(function() {
                                planLink.innerHTML = originalText;
                                planLink.style.backgroundColor = '';
                            }, 2000);
                            
                            // Afficher aussi une alerte avec le chemin
                            alert('Chemin copie dans le presse-papiers !\n\nCollez-le dans Explorateur Windows (Win+E) :\n\n' + planConfig.path);
                            
                            console.log('[RoomPlans] Chemin copie:', planConfig.path);
                        }).catch(function(err) {
                            console.error('[RoomPlans] Erreur copie:', err);
                            // Fallback: afficher le chemin dans une alerte
                            prompt('Copiez ce chemin et collez-le dans Explorateur Windows:', planConfig.path);
                        });
                    };
                }
            } else {
                console.log('[RoomPlans] Aucun plan disponible pour:', roomName);
                planSection.style.display = 'none';
                noPlanSection.style.display = 'block';
            }
        }
    };
    
    // Initialisation
    console.log('[RoomPlans] Module local initialise avec', AVAILABLE_PLANS.length, 'plans');
    console.log('[RoomPlans] Configuration pour reseau UQAM');
})();
