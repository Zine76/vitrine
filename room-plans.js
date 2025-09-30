// 📋 FICHIER LOCAL - TRACE DES MODIFICATIONS
// Module des plans unifilaires - Version locale pour localhost
// Ce fichier est gardé localement comme trace des modifications
// La vitrine.html utilise les fichiers GitHub + override local

(function() {
    console.log('📋 [RoomPlans] Module des plans unifilaires chargé - Version locale');
    
    // Configuration des plans disponibles
    const AVAILABLE_PLANS = ['A-1825']; // Seule A-1825 a un plan fonctionnel (démonstratif)
    
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
                    // Construire l'URL du plan selon la salle
                    let planUrl;
                    switch(roomName) {
                        case 'A-1825':
                            planUrl = '\\\\10.190.21.65\\donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\A (Pavillon Hubert-Aquin)\\A-1825\\P-5044_plans_unifilaire-MMC.pdf';
                            break;
                        default:
                            planUrl = `\\\\10.190.21.65\\donnees.01\\SAV\\Accueil\\Soutien\\Atelier\\plans\\plans_branchements\\${roomName}`;
                    }
                    planLink.href = planUrl;
                    console.log('🔗 [RoomPlans] URL plan configurée:', planUrl);
                }
            } else {
                console.log('❌ [RoomPlans] Aucun plan disponible pour:', roomName);
                planSection.style.display = 'none';
                noPlanSection.style.display = 'block';
                
                // Afficher la bannière de construction pour les autres salles
                if (noPlanSection) {
                    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                    const bgColor = isDarkMode ? 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                    const borderColor = isDarkMode ? '#d97706' : '#f59e0b';
                    const textColor = isDarkMode ? '#fbbf24' : '#92400e';
                    const subtitleColor = isDarkMode ? '#f59e0b' : '#a16207';
                    
                    noPlanSection.innerHTML = `
                        <div style="text-align: center; padding: 20px; background: ${bgColor}; border-radius: 12px; border: 2px solid ${borderColor};">
                            <div style="font-size: 2rem; margin-bottom: 15px;">🚧</div>
                            <h4 style="color: ${textColor}; margin: 0 0 10px 0; font-weight: 600;">Serveur de Plans en Construction</h4>
                            <p style="color: ${textColor}; margin: 0; font-size: 0.9rem;">
                                <strong>Développé par Nicholas Rivet</strong><br>
                                Les plans unifilaires pour cette salle seront bientôt disponibles.
                            </p>
                            <div style="margin-top: 15px; font-size: 0.8rem; color: ${subtitleColor};">
                                <em>💡 A-1825 est disponible à titre démonstratif</em>
                            </div>
                        </div>
                    `;
                }
            }
        }
    };
    
    // Initialisation
    console.log('📋 [RoomPlans] Module local initialisé avec', AVAILABLE_PLANS.length, 'plans');
    console.log('🌐 [RoomPlans] Configuration pour localhost');
})();
