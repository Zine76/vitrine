/**
 * Configuration des plans unifilaires par salle
 * Chaque salle peut avoir son plan PDF exclusif
 */

window.RoomPlansConfig = {
    // Base de données des plans disponibles
    availablePlans: {
        'A-1825': {
            name: 'Plan unifilaire A-1825',
            url: 'file://index/Donnees.01/SAV/Accueil/Soutien/Atelier/plans/plans_branchements/A%20(Pavillon%20Hubert-Aquin)/A-1825/P-5044_plans_unifilaire-MMC.pdf',
            description: 'Plan électrique multimédia avec captation',
            pavillon: 'Pavillon A (Hubert-Aquin)',
            type: 'MMC'
        }
        // ✅ FUTUR : Ajouter d'autres salles ici
        // 'B-2500': {
        //     name: 'Plan unifilaire B-2500',
        //     url: 'file://path/to/B-2500/plan.pdf',
        //     description: 'Plan électrique salle B-2500',
        //     pavillon: 'Pavillon B',
        //     type: 'Standard'
        // },
        // 'J-2430': {
        //     name: 'Plan unifilaire J-2430', 
        //     url: 'file://path/to/J-2430/plan.pdf',
        //     description: 'Plan électrique salle J-2430',
        //     pavillon: 'Pavillon J',
        //     type: 'Laboratoire'
        // }
    },

    /**
     * Obtient les informations du plan pour une salle donnée
     * @param {string} roomId - Identifiant de la salle (ex: 'A-1825')
     * @returns {object|null} - Informations du plan ou null si non trouvé
     */
    getPlanForRoom: function(roomId) {
        if (!roomId) return null;
        
        // Normaliser l'ID de la salle (majuscules, nettoyage)
        const normalizedRoomId = roomId.toString().toUpperCase().trim();
        
        console.log(`📋 [RoomPlans] Recherche plan pour: "${normalizedRoomId}"`);
        
        // Recherche directe
        if (this.availablePlans[normalizedRoomId]) {
            console.log(`✅ [RoomPlans] Plan trouvé pour ${normalizedRoomId}`);
            return this.availablePlans[normalizedRoomId];
        }
        
        // Recherche flexible (au cas où il y aurait des variations de format)
        for (let key in this.availablePlans) {
            if (key.toUpperCase() === normalizedRoomId) {
                console.log(`✅ [RoomPlans] Plan trouvé avec clé flexible "${key}" pour ${normalizedRoomId}`);
                return this.availablePlans[key];
            }
        }
        
        console.log(`❌ [RoomPlans] Aucun plan trouvé pour ${normalizedRoomId}`);
        console.log(`📋 [RoomPlans] Plans disponibles:`, Object.keys(this.availablePlans));
        
        return null;
    },

    /**
     * Met à jour l'affichage de la section plan unifilaire
     * @param {string} roomId - Identifiant de la salle
     */
    updatePlanSection: function(roomId) {
        console.log(`📋 [RoomPlans] Mise à jour section pour: "${roomId}"`);
        
        const planSection = document.getElementById('technicalPlanSection');
        const noPlanSection = document.getElementById('technicalNoPlan');
        const planLink = document.getElementById('technicalPlanLink');
        
        if (!planSection || !noPlanSection || !planLink) {
            console.error('❌ [RoomPlans] Éléments HTML manquants dans la page technique');
            return;
        }
        
        const planInfo = this.getPlanForRoom(roomId);
        
        if (planInfo) {
            // Plan disponible - afficher le lien
            console.log(`✅ [RoomPlans] Affichage du lien pour ${roomId}:`, planInfo.name);
            
            planLink.href = planInfo.url;
            planLink.title = `Ouvrir ${planInfo.name} - ${planInfo.description}`;
            
            // Mettre à jour le texte du lien si nécessaire
            const linkText = planLink.querySelector('span');
            if (linkText) {
                linkText.textContent = planInfo.name;
            }
            
            planSection.style.display = 'block';
            noPlanSection.style.display = 'none';
            
            console.log(`🔗 [RoomPlans] Lien configuré: ${planInfo.url}`);
        } else {
            // Aucun plan disponible
            console.log(`📋 [RoomPlans] Aucun plan pour ${roomId} - affichage message`);
            
            planSection.style.display = 'none';
            noPlanSection.style.display = 'block';
        }
    },

    /**
     * Ajoute un nouveau plan pour une salle
     * @param {string} roomId - Identifiant de la salle
     * @param {object} planInfo - Informations du plan
     */
    addPlan: function(roomId, planInfo) {
        const normalizedRoomId = roomId.toString().toUpperCase().trim();
        this.availablePlans[normalizedRoomId] = planInfo;
        console.log(`✅ [RoomPlans] Plan ajouté pour ${normalizedRoomId}:`, planInfo.name);
    },

    /**
     * Liste tous les plans disponibles
     * @returns {array} - Liste des salles avec plans
     */
    listAvailableRooms: function() {
        return Object.keys(this.availablePlans);
    }
};

console.log('📋 [RoomPlans] Module des plans unifilaires chargé');
console.log('📋 [RoomPlans] Plans disponibles:', window.RoomPlansConfig.listAvailableRooms());
