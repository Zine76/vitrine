/**
 * Module de test de connexion pour Vitrine
 * Ce script permet de diagnostiquer les problèmes de connexion aux backends
 */

// Configuration
const TEST_ENDPOINTS = [
    {
        name: 'Serveur Principal (DDNS UQAM)',
        url: 'http://C46928_DEE.ddns.uqam.ca:7070',
        endpoints: [
            { path: '/api/health', name: 'Santé API' },
            { path: '/api/chat/stream', name: 'Stream Chat' },
            { path: '/api/chat/events/vitrine', name: 'Événements Vitrine' }
        ]
    },
    {
        name: 'Serveur Secondaire (Tailscale)',
        url: 'http://sav-atl-por-8.tail12c6c1.ts.net:7070',
        endpoints: [
            { path: '/api/health', name: 'Santé API' },
            { path: '/api/chat/stream', name: 'Stream Chat' },
            { path: '/api/chat/events/vitrine', name: 'Événements Vitrine' }
        ]
    }
];

// État global
let testResults = {};
let testInProgress = false;

// Initialisation du module
function initConnectionTest() {
    console.log('🔌 [ConnectionTest] Initialisation du module de test de connexion');
    
    // Créer le bouton de test
    createTestButton();
    
    // Exposer les fonctions publiques
    window.runConnectionTest = runConnectionTest;
    window.getConnectionTestResults = () => testResults;
    
    console.log('✅ [ConnectionTest] Module de test de connexion initialisé');
}

// Création du bouton de test
function createTestButton() {
    // Vérifier si le bouton existe déjà
    if (document.getElementById('connectionTestBtn')) {
        return;
    }
    
    // Créer le bouton
    const button = document.createElement('button');
    button.id = 'connectionTestBtn';
    button.innerHTML = '🔍 Tester Connexion';
    button.title = 'Diagnostiquer les problèmes de connexion au backend';
    
    // Appliquer les styles
    button.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
    `;
    
    // Ajouter des styles pour le hover
    const style = document.createElement('style');
    style.textContent = `
        #connectionTestBtn:hover {
            background: #2563eb;
        }
        
        #connectionTestBtn:active {
            transform: scale(0.98);
        }
        
        #connectionTestModal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            color: #333;
        }
        
        #connectionTestModal h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        
        #connectionTestModal .server-group {
            margin-bottom: 20px;
        }
        
        #connectionTestModal .server-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        #connectionTestModal .endpoint-test {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        #connectionTestModal .endpoint-name {
            flex: 1;
        }
        
        #connectionTestModal .test-result {
            font-weight: bold;
        }
        
        #connectionTestModal .test-success {
            color: #10b981;
        }
        
        #connectionTestModal .test-failure {
            color: #ef4444;
        }
        
        #connectionTestModal .test-pending {
            color: #f59e0b;
        }
        
        #connectionTestModal .close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
        }
        
        #connectionTestModal .actions {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        #connectionTestModal button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        #connectionTestModal .retest-btn {
            background: #3b82f6;
            color: white;
        }
        
        #connectionTestModal .close-modal-btn {
            background: #e5e7eb;
            color: #374151;
        }
        
        #connectionTestOverlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        }
    `;
    
    // Ajouter le bouton et les styles au document
    document.head.appendChild(style);
    document.body.appendChild(button);
    
    // Ajouter un gestionnaire d'événements pour lancer le test
    button.addEventListener('click', () => {
        runConnectionTest();
    });
}

// Création de la modal de résultats
function createResultsModal() {
    // Supprimer la modal existante si elle existe
    const existingModal = document.getElementById('connectionTestModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Supprimer l'overlay existant s'il existe
    const existingOverlay = document.getElementById('connectionTestOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'connectionTestOverlay';
    
    // Créer la modal
    const modal = document.createElement('div');
    modal.id = 'connectionTestModal';
    
    // Contenu initial de la modal
    modal.innerHTML = `
        <button class="close-btn" title="Fermer">&times;</button>
        <h2>Diagnostic de Connexion</h2>
        <div id="testResults">
            <p>Test en cours, veuillez patienter...</p>
        </div>
        <div class="actions">
            <button class="retest-btn">Relancer le test</button>
            <button class="close-modal-btn">Fermer</button>
        </div>
    `;
    
    // Ajouter la modal et l'overlay au document
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Gestionnaires d'événements pour fermer la modal
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Gestionnaire d'événement pour relancer le test
    modal.querySelector('.retest-btn').addEventListener('click', () => {
        runConnectionTest();
    });
}

// Fermeture de la modal
function closeModal() {
    const modal = document.getElementById('connectionTestModal');
    const overlay = document.getElementById('connectionTestOverlay');
    
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

// Mise à jour des résultats dans la modal
function updateResultsInModal() {
    const resultsContainer = document.getElementById('testResults');
    if (!resultsContainer) return;
    
    let html = '';
    
    // Parcourir les serveurs et leurs endpoints
    TEST_ENDPOINTS.forEach(server => {
        html += `<div class="server-group">`;
        html += `<div class="server-name">${server.name}</div>`;
        
        // Résultats pour chaque endpoint
        server.endpoints.forEach(endpoint => {
            const fullUrl = `${server.url}${endpoint.path}`;
            const result = testResults[fullUrl];
            
            let statusClass = 'test-pending';
            let statusText = 'En attente...';
            
            if (result) {
                if (result.success) {
                    statusClass = 'test-success';
                    statusText = `✓ OK (${result.time}ms)`;
                } else {
                    statusClass = 'test-failure';
                    statusText = `✗ ${result.error || 'Erreur'}`;
                }
            }
            
            html += `
                <div class="endpoint-test">
                    <div class="endpoint-name">${endpoint.name} (${endpoint.path})</div>
                    <div class="test-result ${statusClass}">${statusText}</div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    // Ajouter des recommandations basées sur les résultats
    html += `<div class="recommendations">`;
    html += `<h3>Recommandations</h3>`;
    
    const allFailed = Object.values(testResults).every(result => !result.success);
    const someFailed = Object.values(testResults).some(result => !result.success);
    const allSucceeded = Object.values(testResults).every(result => result.success);
    
    if (allFailed) {
        html += `<p>❌ <strong>Problème de connexion réseau détecté</strong> - Aucun serveur n'est accessible.</p>`;
        html += `<ul>`;
        html += `<li>Vérifiez votre connexion Internet</li>`;
        html += `<li>Vérifiez si un pare-feu bloque les connexions</li>`;
        html += `<li>Contactez l'administrateur système</li>`;
        html += `</ul>`;
    } else if (someFailed) {
        html += `<p>⚠️ <strong>Problèmes de connexion partiels détectés</strong> - Certains endpoints ne sont pas accessibles.</p>`;
        
        // Vérifier si un serveur complet est inaccessible
        const server1Failed = TEST_ENDPOINTS[0].endpoints.every(endpoint => {
            const fullUrl = `${TEST_ENDPOINTS[0].url}${endpoint.path}`;
            return testResults[fullUrl] && !testResults[fullUrl].success;
        });
        
        const server2Failed = TEST_ENDPOINTS[1].endpoints.every(endpoint => {
            const fullUrl = `${TEST_ENDPOINTS[1].url}${endpoint.path}`;
            return testResults[fullUrl] && !testResults[fullUrl].success;
        });
        
        if (server1Failed && !server2Failed) {
            html += `<p>Le serveur principal (DDNS UQAM) est inaccessible, mais le serveur secondaire (Tailscale) fonctionne.</p>`;
            html += `<p>L'application devrait utiliser automatiquement le serveur secondaire.</p>`;
        } else if (!server1Failed && server2Failed) {
            html += `<p>Le serveur secondaire (Tailscale) est inaccessible, mais le serveur principal (DDNS UQAM) fonctionne.</p>`;
            html += `<p>L'application devrait utiliser automatiquement le serveur principal.</p>`;
        } else {
            html += `<p>Certains endpoints spécifiques sont inaccessibles. Cela peut affecter certaines fonctionnalités de l'application.</p>`;
        }
    } else if (allSucceeded) {
        html += `<p>✅ <strong>Tous les tests ont réussi</strong> - La connexion aux serveurs est fonctionnelle.</p>`;
        html += `<p>Si vous rencontrez toujours des problèmes, il pourrait s'agir d'un problème intermittent ou d'un autre type d'erreur.</p>`;
    }
    
    html += `</div>`;
    
    resultsContainer.innerHTML = html;
}

// Exécution du test de connexion
async function runConnectionTest() {
    // Éviter les tests simultanés
    if (testInProgress) return;
    
    testInProgress = true;
    testResults = {};
    
    // Créer ou mettre à jour la modal
    createResultsModal();
    updateResultsInModal();
    
    console.log('🔍 [ConnectionTest] Démarrage du test de connexion');
    
    // Tester chaque serveur et ses endpoints
    for (const server of TEST_ENDPOINTS) {
        for (const endpoint of server.endpoints) {
            const fullUrl = `${server.url}${endpoint.path}`;
            
            try {
                console.log(`🔍 [ConnectionTest] Test de ${fullUrl}`);
                
                // Mesurer le temps de réponse
                const startTime = performance.now();
                
                // Effectuer la requête avec un timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${fullUrl}?t=${Date.now()}`, { 
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store'
                });
                
                clearTimeout(timeoutId);
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                // Enregistrer le résultat
                testResults[fullUrl] = {
                    success: response.ok,
                    status: response.status,
                    time: responseTime,
                    error: response.ok ? null : `HTTP ${response.status}`
                };
                
                console.log(`✅ [ConnectionTest] ${fullUrl} - ${response.ok ? 'OK' : 'Échec'} (${responseTime}ms)`);
            } catch (error) {
                // Enregistrer l'erreur
                testResults[fullUrl] = {
                    success: false,
                    error: error.name === 'AbortError' ? 'Timeout' : error.message
                };
                
                console.error(`❌ [ConnectionTest] ${fullUrl} - Erreur: ${error.message}`);
            }
            
            // Mettre à jour l'affichage après chaque test
            updateResultsInModal();
            
            // Petite pause entre les requêtes pour éviter de surcharger le serveur
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    testInProgress = false;
    console.log('✅ [ConnectionTest] Test de connexion terminé');
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('connection-test-complete', { 
        detail: { results: testResults } 
    }));
}

// Initialiser le module quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConnectionTest);
} else {
    initConnectionTest();
}

console.log('✅ [ConnectionTest] Module de test de connexion chargé');
