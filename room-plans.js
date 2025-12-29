// Module des plans unifilaires - Version reseau UQAM

(function() {
    console.log('[RoomPlans] Module des plans unifilaires charge');
    
    var PLANS_CONFIG = {
        'A-1825': '\\\\index\\Donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\A (Pavillon Hubert-Aquin)\\A-1785\\Plan_unifilaire_A1785_20230113.pdf'
    };
    
    var AVAILABLE_PLANS = Object.keys(PLANS_CONFIG);
    console.log('[RoomPlans] Plans disponibles:', AVAILABLE_PLANS);
    
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
            
            var planPath = PLANS_CONFIG[roomName];
            if (planPath) {
                console.log('[RoomPlans] Plan disponible pour:', roomName);
                planSection.style.display = 'block';
                noPlanSection.style.display = 'none';
                
                if (planLink) {
                    planLink.href = planPath;
                    planLink.target = '_blank';
                }
            } else {
                console.log('[RoomPlans] Aucun plan disponible pour:', roomName);
                planSection.style.display = 'none';
                noPlanSection.style.display = 'block';
            }
        }
    };
    
    console.log('[RoomPlans] Module initialise avec', AVAILABLE_PLANS.length, 'plans');
})();
