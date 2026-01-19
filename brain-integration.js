/**
 * Room Brain Integration for Vitrine V1.2
 * 
 * This module provides Brain-first diagnosis for Vitrine.
 * Brain is the authoritative source for action gating and escalation decisions.
 * 
 * V1.2 Changes:
 * - Support for state machine diagnosis (COLLECTING -> DETECTING -> ACTING -> VERIFYING -> RESOLVED/ESCALATED)
 * - Evidence-first display: What I See / What I Did / Result / Why Escalated
 * - EvidencePack support for enriched ticket creation
 * - Confidence indicators (High/Medium/Low)
 * 
 * Usage:
 * 1. Copy this file to Annexe/Vitrine-Github-version/brain-integration.js
 * 2. Include this script in vitrine.html after app.js:
 *    <script src="brain-integration.js"></script>
 * 3. Set window.VITRINE_USES_BRAIN = true to enable (or use localStorage)
 * 
 * Fallback: If Brain is unavailable (timeout 2s), falls back to Copilot.
 * 
 * @version 1.2
 * @author SAVQonnect Team
 */

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    
    // ✅ FIX DOUBLE-ESCALATION: Réduit de 15s à 8s pour finir AVANT EscalationManager (12s)
    const BRAIN_TIMEOUT_MS = 8000; // 8 seconds timeout for Brain API
    const BRAIN_API_VERSION = '1.2';
    
    // V1.2 State Machine states
    const DIAGNOSIS_STATES = {
        COLLECTING: 'COLLECTING',
        DETECTING: 'DETECTING',
        ACTING: 'ACTING',
        VERIFYING: 'VERIFYING',
        RESOLVED: 'RESOLVED',
        ESCALATE_CANDIDATE: 'ESCALATE_CANDIDATE',
        ESCALATED: 'ESCALATED',
        ERROR: 'ERROR'
    };
    
    // Feature flag - can be set via localStorage or window global
    window.VITRINE_USES_BRAIN = window.VITRINE_USES_BRAIN || 
        localStorage.getItem('vitrine.uses.brain') === 'true';

    // ============================================================================
    // BRAIN API CLIENT
    // ============================================================================

    /**
     * Call Brain diagnose endpoint
     * @param {string} room - Room code (e.g., "A-1750")
     * @param {string} userDescription - User's problem description
     * @param {string[]} symptoms - Detected symptoms
     * @returns {Promise<Object|null>} Brain response or null if failed
     */
    async function callBrainDiagnose(room, userDescription, symptoms = []) {
        if (!window.VITRINE_USES_BRAIN) {
            console.log('[Brain] Integration disabled (VITRINE_USES_BRAIN=false)');
            return null;
        }

        // Try multiple sources for API base URL
        let apiBase = window.currentAPI || window.API_BASE_URL;
        
        // Fallback: try to get from localStorage (app.js stores it there)
        if (!apiBase) {
            const storedIP = localStorage.getItem('savqonnect_backend_ip');
            if (storedIP) {
                apiBase = storedIP.startsWith('http') ? storedIP : `http://${storedIP}:7070`;
                console.log(`[Brain] Using localStorage API: ${apiBase}`);
            }
        }
        
        // Fallback: for file:// protocol, use default local IP
        if (!apiBase && window.location.protocol === 'file:') {
            apiBase = 'http://192.168.2.48:7070';
            console.log(`[Brain] Using fallback API base: ${apiBase}`);
        }
        
        if (!apiBase) {
            console.warn('[Brain] No API base URL configured');
            return null;
        }

        const endpoint = `${apiBase}/api/rooms/${encodeURIComponent(room)}/brain/diagnose`;
        
        console.log(`🧠 [Brain] Calling diagnose for room ${room}: "${userDescription}"`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), BRAIN_TIMEOUT_MS);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    room: room,
                    user_description: userDescription,
                    symptoms: symptoms,
                    source: 'vitrine'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[Brain] API returned ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            console.log(`🧠 [Brain] Response received:`, data);
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`[Brain] Request timed out after ${BRAIN_TIMEOUT_MS}ms`);
            } else {
                console.error('[Brain] Request failed:', error.message);
            }
            return null;
        }
    }

    /**
     * Process Brain's decision and execute appropriate actions
     * V1.2: Supports both legacy brain_decision and new state machine format
     * @param {Object} brainResponse - Response from Brain diagnose endpoint
     * @returns {boolean} True if Brain handled the request, false to fallback
     */
    async function processBrainDecision(brainResponse) {
        if (!brainResponse) {
            console.log('[Brain] No response, falling back to Copilot');
            return false;
        }

        const correlationId = brainResponse.correlation_id || 'unknown';
        
        // V1.2: Check for state machine response first
        if (brainResponse.state) {
            console.log(`🧠 [Brain V1.2] State machine response: ${brainResponse.state} (${correlationId})`);
            return await processStateMachineResponse(brainResponse);
        }
        
        // Legacy V1.1: brain_decision format
        if (!brainResponse.brain_decision) {
            console.log('[Brain] No decision in response, falling back to Copilot');
            return false;
        }

        const decision = brainResponse.brain_decision;
        
        console.log(`🧠 [Brain] Processing decision: ${decision.decision} (${correlationId})`);

        switch (decision.decision) {
            case 'auto_fix':
                return await handleAutoFix(decision, correlationId);
            
            case 'escalate':
                return handleEscalation(decision, brainResponse);
            
            case 'monitor':
                return handleMonitor(decision, brainResponse);
            
            case 'ignore':
                // User reported a problem → escalate anyway with enriched diagnostic
                return handleIgnore(decision, brainResponse);
            
            default:
                console.warn(`[Brain] Unknown decision type: ${decision.decision}`);
                return false;
        }
    }
    
    /**
     * V1.2: Process state machine response
     * @param {Object} response - State machine response
     * @returns {boolean} True if handled
     */
    async function processStateMachineResponse(response) {
        const correlationId = response.correlation_id || 'unknown';
        const state = response.state;
        
        // Display Vitrine evidence panel
        if (response.vitrine_display) {
            displayEvidencePanel(response.vitrine_display, response);
        }
        
        switch (state) {
            case DIAGNOSIS_STATES.RESOLVED:
                console.log(`✅ [Brain V1.2] Problem resolved (${correlationId})`);
                return handleResolved(response);
                
            case DIAGNOSIS_STATES.ESCALATED:
                console.log(`🚨 [Brain V1.2] Escalation with evidence pack (${correlationId})`);
                return handleEscalatedWithEvidence(response);
                
            case DIAGNOSIS_STATES.ERROR:
                console.error(`❌ [Brain V1.2] Diagnosis error (${correlationId})`);
                // Fallback to legacy handling via brain_decision if available
                if (response.brain_decision) {
                    return processBrainDecision({ brain_decision: response.brain_decision, correlation_id: correlationId });
                }
                return false;
                
            default:
                // For intermediate states, check brain_decision
                if (response.brain_decision) {
                    const decision = response.brain_decision;
                    switch (decision.decision) {
                        case 'auto_fix':
                            return await handleAutoFix(decision, correlationId);
                        case 'escalate':
                            return handleEscalation(decision, response);
                        case 'monitor':
                            return handleMonitor(decision, response);
                        case 'ignore':
                            return handleIgnore(decision, response);
                    }
                }
                console.warn(`[Brain V1.2] Unhandled state: ${state}`);
                return false;
        }
    }
    
    /**
     * V1.2: Handle RESOLVED state - show success message
     */
    function handleResolved(response) {
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }
        
        // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
        if (window.EscalationManager) {
            window.EscalationManager.markHandled();
        } else if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
        }
        
        // Show success banner
        if (typeof showAutoActionResult === 'function') {
            const display = response.vitrine_display || {};
            showAutoActionResult({
                type: 'brain_resolved',
                description: display.what_i_did || 'Correction automatique'
            }, { 
                message: display.result || 'Probleme resolu',
                confidence: display.confidence || 'High'
            });
        }
        
        return true;
    }
    
    /**
     * V1.2: Handle ESCALATED state with evidence pack
     */
    function handleEscalatedWithEvidence(response) {
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }
        
        // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
        if (window.EscalationManager) {
            window.EscalationManager.markHandled();
        } else if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
        }
        
        // Build enriched diagnostic from evidence pack
        const evidencePack = response.evidence_pack;
        const display = response.vitrine_display || {};
        
        // Store for ticket creation
        window.__BRAIN_LAST_DIAGNOSTIC__ = {
            decision: response.brain_decision,
            response: response,
            evidence_pack: evidencePack,
            timestamp: new Date().toISOString(),
            diagnostic_text: buildDiagnosticTextFromEvidence(evidencePack, display)
        };
        
        console.log('🧠 [Brain V1.2] Evidence pack stored for ticket:', window.__BRAIN_LAST_DIAGNOSTIC__);
        
        // Show escalation banner
        if (typeof showSEAEscalationBanner === 'function') {
            const room = response.room_name || window.roomCache?.room || 'unknown';
            showSEAEscalationBanner({
                intent: 'brain_escalation_v2',
                confidence: response.overall_confidence || 0.95,
                room: room,
                escalation_reason: display.why_escalated || evidencePack?.escalation_reason || 'Escalade apres diagnostic',
                brain_decision: response.brain_decision,
                brain_diagnostic: window.__BRAIN_LAST_DIAGNOSTIC__.diagnostic_text,
                evidence_pack: evidencePack,
                correlation_id: response.correlation_id
            });
        }
        
        return true;
    }
    
    /**
     * V1.2: Build diagnostic text from evidence pack
     */
    function buildDiagnosticTextFromEvidence(evidencePack, display) {
        const lines = [];
        
        lines.push(`=== DIAGNOSTIC ROOM BRAIN V1.2 ===`);
        
        // What I See
        if (display.what_i_see) {
            lines.push(`\n📋 CE QUE JE VOIS:`);
            lines.push(`   ${display.what_i_see}`);
        }
        
        // What I Did
        if (display.what_i_did) {
            lines.push(`\n🔧 CE QUE J'AI FAIT:`);
            lines.push(`   ${display.what_i_did}`);
        }
        
        // Result
        if (display.result) {
            lines.push(`\n📊 RESULTAT:`);
            lines.push(`   ${display.result}`);
        }
        
        // Why Escalated
        if (display.why_escalated) {
            lines.push(`\n⚠️ RAISON DE L'ESCALADE:`);
            lines.push(`   ${display.why_escalated}`);
        }
        
        // Confidence
        if (display.confidence) {
            lines.push(`\n🎯 CONFIANCE: ${display.confidence}`);
        }
        
        // Evidence Pack details
        if (evidencePack) {
            // Anomalies detected
            if (evidencePack.anomalies_detected && evidencePack.anomalies_detected.length > 0) {
                lines.push(`\n🔍 ANOMALIES DETECTEES:`);
                evidencePack.anomalies_detected.forEach(a => {
                    lines.push(`   - ${a.device_name}: ${a.description} (${(a.confidence * 100).toFixed(0)}%)`);
                });
            }
            
            // Actions attempted
            if (evidencePack.actions_attempted && evidencePack.actions_attempted.length > 0) {
                lines.push(`\n🔧 ACTIONS TENTEES:`);
                evidencePack.actions_attempted.forEach(a => {
                    const status = a.success ? '✅ Succes' : '❌ Echec';
                    lines.push(`   - ${a.action_type} sur ${a.device_name}: ${status}`);
                    if (a.error) {
                        lines.push(`     Erreur: ${a.error}`);
                    }
                });
            }
            
            // Final conclusion
            if (evidencePack.final_conclusion) {
                lines.push(`\n📝 CONCLUSION:`);
                lines.push(`   ${evidencePack.final_conclusion}`);
            }
        }
        
        lines.push(`\n=== FIN DIAGNOSTIC V1.2 ===`);
        
        return lines.join('\n');
    }
    
    /**
     * V1.2: Display evidence panel in Vitrine UI
     */
    function displayEvidencePanel(display, response) {
        // Check if we have a container for evidence display
        let evidencePanel = document.getElementById('brain-evidence-panel');
        
        if (!evidencePanel) {
            // Create the panel if it doesn't exist
            evidencePanel = document.createElement('div');
            evidencePanel.id = 'brain-evidence-panel';
            evidencePanel.className = 'brain-evidence-panel';
            
            // Insert after the diagnostic loading or at the top of main content
            const container = document.querySelector('.diagnostic-container') || document.body;
            container.insertBefore(evidencePanel, container.firstChild);
        }
        
        // Build panel content
        const confidenceClass = (display.confidence || 'Medium').toLowerCase();
        const stateEmoji = getStateEmoji(response.state);
        
        evidencePanel.innerHTML = `
            <div class="evidence-header">
                <span class="evidence-state">${stateEmoji} ${response.state || 'DIAGNOSTIC'}</span>
                <span class="evidence-confidence confidence-${confidenceClass}">${display.confidence || 'Medium'}</span>
            </div>
            <div class="evidence-body">
                ${display.what_i_see ? `<div class="evidence-row"><strong>📋 Ce que je vois:</strong> ${display.what_i_see}</div>` : ''}
                ${display.what_i_did ? `<div class="evidence-row"><strong>🔧 Ce que j'ai fait:</strong> ${display.what_i_did}</div>` : ''}
                ${display.result ? `<div class="evidence-row"><strong>📊 Resultat:</strong> ${display.result}</div>` : ''}
                ${display.why_escalated ? `<div class="evidence-row escalation-reason"><strong>⚠️ Escalade:</strong> ${display.why_escalated}</div>` : ''}
            </div>
        `;
        
        evidencePanel.style.display = 'block';
        
        // Add CSS if not already present
        addEvidencePanelStyles();
    }
    
    /**
     * Get emoji for state
     */
    function getStateEmoji(state) {
        const emojis = {
            'COLLECTING': '📡',
            'DETECTING': '🔍',
            'ACTING': '🔧',
            'VERIFYING': '✅',
            'RESOLVED': '✅',
            'ESCALATE_CANDIDATE': '⚠️',
            'ESCALATED': '🚨',
            'ERROR': '❌'
        };
        return emojis[state] || '🧠';
    }
    
    /**
     * Add CSS styles for evidence panel
     */
    function addEvidencePanelStyles() {
        if (document.getElementById('brain-evidence-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'brain-evidence-styles';
        style.textContent = `
            .brain-evidence-panel {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid #0f3460;
                border-radius: 12px;
                padding: 16px;
                margin: 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #e0e0e0;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            }
            .evidence-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #0f3460;
            }
            .evidence-state {
                font-weight: 600;
                font-size: 14px;
                color: #00d9ff;
            }
            .evidence-confidence {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            .confidence-high {
                background: rgba(0, 200, 83, 0.2);
                color: #00c853;
            }
            .confidence-medium {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
            }
            .confidence-low {
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
            }
            .evidence-body {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .evidence-row {
                font-size: 13px;
                line-height: 1.5;
            }
            .evidence-row strong {
                color: #90caf9;
            }
            .escalation-reason {
                background: rgba(255, 152, 0, 0.1);
                padding: 8px 12px;
                border-radius: 8px;
                border-left: 3px solid #ff9800;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle auto_fix decision - execute Brain-authorized actions
     */
    async function handleAutoFix(decision, correlationId) {
        if (!decision.auto_actions || decision.auto_actions.length === 0) {
            console.log('[Brain] auto_fix decision but no actions provided');
            return false;
        }

        console.log(`🔧 [Brain] Executing ${decision.auto_actions.length} auto-fix action(s)`);
        
        // Show waiting banner
        if (typeof showWaitingBanner === 'function') {
            showWaitingBanner('🧠 Correction automatique Brain...', decision.reasoning || 'Exécution des actions autorisées');
        }

        let allSucceeded = true;
        
        for (const action of decision.auto_actions) {
            console.log(`🔧 [Brain] Executing action: ${action.action_type} on ${action.device_name}`);
            
            try {
                // Use existing executeAction if available, otherwise call Brain action endpoint
                if (typeof executeAction === 'function') {
                    await executeAction(action.action_type, action.device_id, {
                        device_name: action.device_name,
                        correlation_id: correlationId
                    });
                } else {
                    // Direct call to Brain action endpoint
                    const apiBase = window.currentAPI || window.API_BASE_URL;
                    const room = window.roomCache?.room || 'unknown';
                    await fetch(`${apiBase}/api/rooms/${room}/brain/actions/${action.action_id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: 'Brain auto-fix', correlation_id: correlationId })
                    });
                }
            } catch (error) {
                console.error(`[Brain] Action ${action.action_type} failed:`, error);
                allSucceeded = false;
            }
        }

        // Hide waiting banner after actions
        setTimeout(() => {
            if (typeof hideWaitingBanner === 'function') {
                hideWaitingBanner();
            }
            
            if (allSucceeded) {
                if (typeof showAutoActionResult === 'function') {
                    showAutoActionResult({
                        type: 'brain_auto_fix',
                        description: 'Correction Brain terminée'
                    }, { message: decision.reasoning || 'Actions exécutées avec succès' });
                }
            }
        }, 3000);

        return true;
    }

    /**
     * Handle escalation decision - show SEA banner with Brain's recommendation
     */
    function handleEscalation(decision, brainResponse) {
        console.log(`🚨 [Brain] Escalation recommended: ${decision.bt_urgency || 'standard'}`);
        
        // Hide loading overlay
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }

        // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
        if (window.EscalationManager) {
            window.EscalationManager.markHandled();
            console.log('🧠 [Brain] Timer marqué traité via EscalationManager');
        } else if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
        }

        // 🧠 Store Brain diagnostic for ticket creation
        // This will be used when the SEA ticket is created
        window.__BRAIN_LAST_DIAGNOSTIC__ = {
            decision: decision,
            response: brainResponse,
            timestamp: new Date().toISOString(),
            diagnostic_text: buildDiagnosticText(decision, brainResponse)
        };
        console.log('🧠 [Brain] Diagnostic stored for ticket creation:', window.__BRAIN_LAST_DIAGNOSTIC__);

        // Show SEA escalation banner with Brain's reasoning
        if (typeof showSEAEscalationBanner === 'function') {
            const room = window.roomCache?.room || 'unknown';
            showSEAEscalationBanner({
                intent: 'brain_escalation',
                confidence: 0.95,
                room: room,
                escalation_reason: decision.reasoning || 'Brain recommande une escalade',
                brain_decision: decision,
                brain_diagnostic: window.__BRAIN_LAST_DIAGNOSTIC__.diagnostic_text,
                correlation_id: brainResponse.correlation_id
            });
        }

        return true;
    }

    /**
     * Build a human-readable diagnostic text from Brain's decision
     */
    function buildDiagnosticText(decision, brainResponse) {
        const lines = [];
        
        lines.push(`=== DIAGNOSTIC ROOM BRAIN ===`);
        lines.push(`Décision: ${decision.decision || 'escalate'}`);
        lines.push(`Confiance: ${(decision.confidence * 100).toFixed(0)}%`);
        
        if (decision.reasoning) {
            lines.push(`\nRaisonnement: ${decision.reasoning}`);
        }
        
        if (decision.why_template) {
            lines.push(`\nExplication: ${decision.why_template}`);
        }

        // Include matched patterns if available
        if (brainResponse.matched_patterns && brainResponse.matched_patterns.length > 0) {
            lines.push(`\nPatterns détectés:`);
            brainResponse.matched_patterns.forEach(p => {
                lines.push(`  - ${p.title || p.id}: ${p.severity || 'INFO'}`);
            });
        }

        // Include device states if available
        if (brainResponse.snapshot && brainResponse.snapshot.devices) {
            lines.push(`\nÉtat des équipements:`);
            brainResponse.snapshot.devices.forEach(d => {
                const status = d.is_online ? '✅ En ligne' : '❌ Hors ligne';
                lines.push(`  - ${d.name}: ${status}`);
            });
        }

        // Include attempted actions
        if (decision.actions_attempted && decision.actions_attempted.length > 0) {
            lines.push(`\nActions tentées:`);
            decision.actions_attempted.forEach(a => {
                const result = a.success ? '✅ Succès' : '❌ Échec';
                lines.push(`  - ${a.action_type}: ${result}`);
            });
        }

        lines.push(`\n=== FIN DIAGNOSTIC ===`);
        
        return lines.join('\n');
    }

    /**
     * Handle monitor decision - Brain suggests monitoring
     * BUT: User reported a problem, so we STILL escalate with enriched diagnostic
     */
    function handleMonitor(decision, brainResponse) {
        console.log(`👀 [Brain] Monitor recommended, but user reported a problem - ESCALATING`);
        console.log(`🧠 [Brain] Reasoning: ${decision.reasoning}`);
        
        // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
        if (window.EscalationManager) {
            window.EscalationManager.markHandled();
            console.log('🧠 [Brain] Timer marqué traité via EscalationManager');
        } else if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
            console.log('🧠 [Brain] Timer escalade annulé - escalade manuelle');
        }
        
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }

        // 🧠 Store Brain diagnostic for ticket creation
        window.__BRAIN_LAST_DIAGNOSTIC__ = {
            decision: decision,
            response: brainResponse,
            timestamp: new Date().toISOString(),
            diagnostic_text: buildDiagnosticTextForMonitor(decision, brainResponse)
        };
        console.log('🧠 [Brain] Diagnostic stocké pour ticket (monitor → escalade):', window.__BRAIN_LAST_DIAGNOSTIC__);

        // Show SEA escalation banner
        if (typeof showSEAEscalationBanner === 'function') {
            const room = window.roomCache?.room || 'unknown';
            showSEAEscalationBanner({
                intent: 'user_reported_problem',
                confidence: 0.85,
                room: room,
                escalation_reason: `Problème signalé. Brain recommande surveillance: ${decision.reasoning || 'Situation à surveiller'}`,
                brain_decision: decision,
                brain_diagnostic: window.__BRAIN_LAST_DIAGNOSTIC__.diagnostic_text,
                correlation_id: brainResponse?.correlation_id || 'unknown'
            });
        }

        return true;
    }

    /**
     * Build diagnostic text for "monitor" decisions
     */
    function buildDiagnosticTextForMonitor(decision, brainResponse) {
        const lines = [];
        
        lines.push(`=== DIAGNOSTIC ROOM BRAIN ===`);
        lines.push(`👀 SURVEILLANCE RECOMMANDÉE`);
        lines.push(`Problème signalé par l'usager`);
        lines.push(`Confiance: ${((decision.confidence || 0.7) * 100).toFixed(0)}%`);
        
        if (decision.reasoning) {
            lines.push(`\nRaisonnement: ${decision.reasoning}`);
        }

        // Include device states if available
        if (brainResponse && brainResponse.room_snapshot && brainResponse.room_snapshot.devices) {
            lines.push(`\nÉtat des équipements:`);
            brainResponse.room_snapshot.devices.forEach(d => {
                const status = d.is_online !== false ? '✅ En ligne' : '❌ Hors ligne';
                lines.push(`  - ${d.name || d.device_type}: ${status}`);
            });
        }

        lines.push(`\n⚠️ Brain recommandait une surveillance.`);
        lines.push(`Ticket créé suite au signalement usager.`);
        lines.push(`\n=== FIN DIAGNOSTIC ===`);
        
        return lines.join('\n');
    }

    /**
     * Handle ignore decision - Brain says "no anomaly detected"
     * BUT: User reported a problem, so we STILL escalate with enriched diagnostic
     * The diagnostic will help the technician understand the system state
     */
    function handleIgnore(decision, brainResponse) {
        console.log(`🧠 [Brain] No anomaly detected, but user reported a problem - ESCALATING ANYWAY`);
        console.log(`🧠 [Brain] Reasoning: ${decision.reasoning}`);
        
        // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
        if (window.EscalationManager) {
            window.EscalationManager.markHandled();
            console.log('🧠 [Brain] Timer marqué traité via EscalationManager');
        } else if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
            console.log('🧠 [Brain] Timer escalade annulé - escalade manuelle');
        }
        
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }

        // 🧠 Store Brain diagnostic for ticket creation
        // Even if Brain says "ignore", the diagnostic is valuable for the technician
        window.__BRAIN_LAST_DIAGNOSTIC__ = {
            decision: decision,
            response: brainResponse,
            timestamp: new Date().toISOString(),
            diagnostic_text: buildDiagnosticTextForIgnore(decision, brainResponse)
        };
        console.log('🧠 [Brain] Diagnostic stocké pour ticket (ignore → escalade):', window.__BRAIN_LAST_DIAGNOSTIC__);

        // Show SEA escalation banner - user reported a problem, we escalate
        if (typeof showSEAEscalationBanner === 'function') {
            const room = window.roomCache?.room || 'unknown';
            showSEAEscalationBanner({
                intent: 'user_reported_problem',
                confidence: 0.95,
                room: room,
                escalation_reason: `Problème signalé par l'usager. Diagnostic Brain: ${decision.reasoning || 'Aucune anomalie détectée'}`,
                brain_decision: decision,
                brain_diagnostic: window.__BRAIN_LAST_DIAGNOSTIC__.diagnostic_text,
                correlation_id: brainResponse?.correlation_id || 'unknown'
            });
        }

        return true;
    }

    /**
     * Build diagnostic text for "ignore" decisions (no anomaly but user reported problem)
     */
    function buildDiagnosticTextForIgnore(decision, brainResponse) {
        const lines = [];
        
        lines.push(`=== DIAGNOSTIC ROOM BRAIN ===`);
        lines.push(`⚠️ PROBLÈME SIGNALÉ PAR L'USAGER`);
        lines.push(`Analyse Brain: Aucune anomalie détectée`);
        lines.push(`Confiance: ${((decision.confidence || 0.8) * 100).toFixed(0)}%`);
        
        if (decision.reasoning) {
            lines.push(`\nRaisonnement: ${decision.reasoning}`);
        }

        // Include device states if available
        if (brainResponse && brainResponse.room_snapshot && brainResponse.room_snapshot.devices) {
            lines.push(`\nÉtat des équipements (tous OK selon Brain):`);
            brainResponse.room_snapshot.devices.forEach(d => {
                const status = d.is_online !== false ? '✅ En ligne' : '❌ Hors ligne';
                lines.push(`  - ${d.name || d.device_type}: ${status}`);
            });
        }

        lines.push(`\n⚠️ NOTE: L'usager a quand même signalé un problème.`);
        lines.push(`Vérification sur place recommandée.`);
        lines.push(`\n=== FIN DIAGNOSTIC ===`);
        
        return lines.join('\n');
    }

    // ============================================================================
    // TICKET EXISTENCE CHECK
    // ============================================================================

    /**
     * Check if an open ticket already exists for the room
     * @param {string} room - Room code
     * @returns {Promise<Object|null>} Existing ticket or null
     */
    async function checkExistingTicket(room) {
        // Try multiple sources for API base URL
        let apiBase = window.currentAPI || window.API_BASE_URL;
        if (!apiBase) {
            const storedIP = localStorage.getItem('savqonnect_backend_ip');
            if (storedIP) {
                apiBase = storedIP.startsWith('http') ? storedIP : `http://${storedIP}:7070`;
            }
        }
        if (!apiBase && window.location.protocol === 'file:') {
            apiBase = 'http://192.168.2.48:7070';
        }
        
        if (!apiBase) {
            console.warn('[Brain] No API base URL for ticket check');
            return null;
        }

        try {
            // Ne pas filtrer par status côté serveur - on vérifie tous les statuts actifs côté client
            const response = await fetch(`${apiBase}/api/copilot/vitrine-list-tickets?room=${encodeURIComponent(room)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                console.warn(`[Brain] Ticket check failed: ${response.status}`);
                return null;
            }

            const data = await response.json();
            
            // Check if there are open tickets
            if (data.tickets && data.tickets.length > 0) {
                const openTicket = data.tickets.find(t => 
                    t.status === 'open' || t.status === 'created' || t.status === 'in_progress'
                );
                if (openTicket) {
                    console.log(`🎫 [Brain] Ticket existant trouvé: ${openTicket.ticket_number || openTicket.id}`);
                    return openTicket;
                }
            }
            
            return null;
        } catch (error) {
            console.error('[Brain] Error checking existing ticket:', error.message);
            return null;
        }
    }

    // ============================================================================
    // INTEGRATION HOOKS
    // ============================================================================

    /**
     * Intercept problem report to use Brain first
     * FLOW:
     * 1. Check if ticket already exists for room → show existing ticket banner
     * 2. If no ticket → call Brain diagnose
     * 3. Brain auto_fix → execute correction
     * 4. Brain escalate → create enriched ticket
     * 5. Brain ignore → show "no action needed" message
     */
    function wrapSendProblemReport() {
        if (typeof window.sendProblemReport !== 'function') {
            console.warn('[Brain] sendProblemReport not found, cannot wrap');
            return;
        }

        const originalSendProblemReport = window.sendProblemReport;

        window.sendProblemReport = async function() {
            // Check if Brain integration is enabled
            if (!window.VITRINE_USES_BRAIN) {
                console.log('[Brain] Disabled, using original Copilot flow');
                return originalSendProblemReport.apply(this, arguments);
            }

            // Get current room and message
            const room = window.roomCache?.room || (typeof getCurrentRoom === 'function' ? getCurrentRoom() : '');
            const problemInput = document.getElementById('problemInput');
            const message = problemInput?.value?.trim() || '';

            if (!room || !message) {
                console.log('[Brain] Missing room or message, using original flow');
                return originalSendProblemReport.apply(this, arguments);
            }

            console.log(`🧠 [Brain] Intercepting problem report for room ${room}`);

            // Show loading indicator
            if (typeof showDiagnosticLoading === 'function') {
                showDiagnosticLoading();
            }

            // ═══════════════════════════════════════════════════════════════
            // STEP 1: Check if ticket already exists for this room
            // ═══════════════════════════════════════════════════════════════
            console.log(`🎫 [Brain] STEP 1: Vérification ticket existant pour ${room}...`);
            const existingTicket = await checkExistingTicket(room);
            
            if (existingTicket) {
                console.log(`🎫 [Brain] Ticket existant détecté: ${existingTicket.ticket_number || existingTicket.id}`);
                
                // ✅ FIX DOUBLE-ESCALATION: Utiliser markHandled() pour empêcher callback timer
                if (window.EscalationManager) {
                    window.EscalationManager.markHandled();
                } else if (typeof clearEscalationTimeout === 'function') {
                    clearEscalationTimeout();
                }

                // Hide loading
                if (typeof hideDiagnosticLoading === 'function') {
                    hideDiagnosticLoading();
                }
                
                // Show existing ticket banner
                if (typeof showExistingTicketBanner === 'function') {
                    showExistingTicketBanner({
                        number: existingTicket.ticket_number || existingTicket.id,
                        room: room,
                        title: existingTicket.title || 'Ticket en cours',
                        status: existingTicket.status || 'open',
                        timestamp: existingTicket.created_at || new Date().toISOString()
                    });
                } else {
                    // Fallback: show message
                    if (typeof addMessage === 'function') {
                        addMessage('system', `🎫 Un ticket ${existingTicket.ticket_number || existingTicket.id} est déjà ouvert pour cette salle. Veuillez patienter.`, {
                            suggestions: ['Voir le ticket', 'Nouveau problème']
                        });
                    }
                }
                
                // Clear input
                if (problemInput) problemInput.value = '';
                return;
            }
            
            console.log(`✅ [Brain] Pas de ticket existant pour ${room}`);

            // ═══════════════════════════════════════════════════════════════
            // STEP 2: Call Brain diagnose
            // ═══════════════════════════════════════════════════════════════
            console.log(`🧠 [Brain] STEP 2: Appel Brain diagnose pour ${room}...`);
            
            // Detect symptoms from message
            const symptoms = detectSymptoms(message);
            
            // Call Brain
            const brainResponse = await callBrainDiagnose(room, message, symptoms);

            // If Brain responded with a decision, process it
            if (brainResponse && brainResponse.brain_decision) {
                const decision = brainResponse.brain_decision.decision;
                console.log(`🧠 [Brain] STEP 3: Traitement décision Brain: ${decision}`);
                
                const handled = await processBrainDecision(brainResponse);
                if (handled) {
                    console.log(`✅ [Brain] Décision ${decision} traitée avec succès`);
                    // Clear input on success
                    if (problemInput) problemInput.value = '';
                    return;
                }
            }

            // Fallback to original Copilot flow
            console.log('[Brain] Falling back to Copilot');
            return originalSendProblemReport.apply(this, arguments);
        };

        console.log('✅ [Brain] sendProblemReport wrapped successfully');
    }

    /**
     * Detect symptoms from user message
     */
    function detectSymptoms(message) {
        const symptoms = [];
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('son') || lowerMessage.includes('audio') || lowerMessage.includes('pas de son')) {
            symptoms.push('no_audio');
        }
        if (lowerMessage.includes('micro') || lowerMessage.includes('sourdine') || lowerMessage.includes('mute')) {
            symptoms.push('mute_suspected');
        }
        if (lowerMessage.includes('image') || lowerMessage.includes('écran noir') || lowerMessage.includes('vidéo')) {
            symptoms.push('no_video');
        }
        if (lowerMessage.includes('projecteur') || lowerMessage.includes('allume')) {
            symptoms.push('projector_issue');
        }

        return symptoms;
    }

    // ============================================================================
    // TICKET CREATION INTERCEPTOR
    // ============================================================================

    /**
     * Wrap the fetch API to intercept ticket creation and inject Brain diagnostic
     * Also handles 409 Conflict (duplicate ticket) response
     */
    function wrapFetchForTicketCreation() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(url, options) {
            // Intercept ticket creation calls
            if (typeof url === 'string' && url.includes('/api/copilot/vitrine-create-ticket') && options?.method === 'POST') {
                console.log('🧠 [Brain] Intercepting ticket creation request');
                
                try {
                    // Parse and enrich the request body with Brain diagnostic
                    let body = JSON.parse(options.body || '{}');
                    
                    // Inject Brain diagnostic if available
                    const brainDiagnostic = getBrainDiagnosticForTicket();
                    if (brainDiagnostic) {
                        body.brain_diagnostic = brainDiagnostic;
                        console.log('🧠 [Brain] Diagnostic injected into ticket request');
                    }
                    
                    // Update the request
                    options.body = JSON.stringify(body);
                    
                    // Make the actual request
                    const response = await originalFetch.call(this, url, options);
                    
                    // Handle 409 Conflict (duplicate ticket)
                    if (response.status === 409) {
                        const data = await response.clone().json();
                        console.log('🚫 [Brain] Ticket doublon détecté:', data);
                        
                        // Show duplicate warning to user
                        showDuplicateTicketWarning(data);
                        
                        // Clear diagnostic even on conflict
                        clearBrainDiagnostic();
                        
                        return response;
                    }
                    
                    // Clear diagnostic after successful creation
                    if (response.ok) {
                        const data = await response.clone().json();
                        if (data.success) {
                            clearBrainDiagnostic();
                            console.log('🧠 [Brain] Diagnostic cleared after ticket creation');
                        }
                    }
                    
                    return response;
                    
                } catch (error) {
                    console.error('🧠 [Brain] Error intercepting ticket creation:', error);
                    // Fall through to original fetch on error
                }
            }
            
            // For all other requests, use original fetch
            return originalFetch.apply(this, arguments);
        };
        
        console.log('✅ [Brain] Fetch interceptor installed for ticket creation');
    }

    /**
     * Show a warning when a duplicate ticket is detected
     * Uses the existing ticket banner UI from app.js
     */
    function showDuplicateTicketWarning(data) {
        const existingTicket = data.existing_ticket || 'inconnu';
        const canAutoFix = data.can_auto_fix || false;
        const room = window.roomCache?.room || 'unknown';
        
        console.log(`🎫 [Brain] Affichage bannière ticket existant: ${existingTicket}`);
        
        // 🆕 Use the existing ticket banner function from app.js
        if (typeof window.showExistingTicketBanner === 'function') {
            window.showExistingTicketBanner({
                number: existingTicket,
                room: room,
                title: `Ticket existant pour ${room}`,
                status: 'open',
                timestamp: new Date().toISOString()
            });
            console.log(`✅ [Brain] Bannière ticket existant affichée: ${existingTicket}`);
            return;
        }
        
        // Fallback: Try hasExistingTicket + showExistingTicketBanner pattern
        if (typeof window.hasExistingTicket === 'function') {
            // Set the ticket info for the banner
            window.__existingTicketInfo__ = {
                number: existingTicket,
                room: room
            };
        }
        
        // Fallback: addMessage
        const message = `⚠️ Un ticket ${existingTicket} est déjà ouvert pour cette salle.`;
        const subMessage = canAutoFix 
            ? 'Vous pouvez toujours essayer une correction automatique via Brain.' 
            : 'Veuillez attendre que le ticket existant soit traité.';
        
        if (typeof window.addMessage === 'function') {
            window.addMessage('system', `${message}\n\n${subMessage}`, {
                suggestions: canAutoFix ? ['Réessayer auto-fix', 'Voir ticket existant'] : ['OK']
            });
        } else if (typeof window.showTicketStatusMessage === 'function') {
            window.showTicketStatusMessage(`${message} ${subMessage}`, 'warning');
        } else {
            // Fallback: simple alert
            alert(`${message}\n\n${subMessage}`);
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize Brain integration when DOM is ready
     */
    function initBrainIntegration() {
        console.log(`🧠 [Brain] Initializing integration v${BRAIN_API_VERSION}`);
        console.log(`🧠 [Brain] VITRINE_USES_BRAIN = ${window.VITRINE_USES_BRAIN}`);

        // Install fetch interceptor for ticket creation (always, even if Brain disabled)
        wrapFetchForTicketCreation();

        // Wait for app.js to be loaded
        if (typeof window.sendProblemReport === 'function') {
            wrapSendProblemReport();
        } else {
            // Retry after a short delay
            setTimeout(() => {
                if (typeof window.sendProblemReport === 'function') {
                    wrapSendProblemReport();
                } else {
                    console.warn('[Brain] sendProblemReport still not available after delay');
                }
            }, 1000);
        }
    }

    /**
     * Get Brain diagnostic text for ticket enrichment
     * Called by app.js when creating SEA tickets
     */
    function getBrainDiagnosticForTicket() {
        const diagnostic = window.__BRAIN_LAST_DIAGNOSTIC__;
        if (!diagnostic) {
            console.log('[Brain] No stored diagnostic for ticket enrichment');
            return null;
        }

        // Check if diagnostic is recent (within last 5 minutes)
        const diagTime = new Date(diagnostic.timestamp);
        const now = new Date();
        const ageMinutes = (now - diagTime) / 1000 / 60;
        
        if (ageMinutes > 5) {
            console.log(`[Brain] Diagnostic too old (${ageMinutes.toFixed(1)} min), skipping`);
            return null;
        }

        console.log('[Brain] Returning diagnostic for ticket enrichment');
        return diagnostic.diagnostic_text;
    }

    /**
     * Clear stored diagnostic (call after ticket creation)
     */
    function clearBrainDiagnostic() {
        window.__BRAIN_LAST_DIAGNOSTIC__ = null;
        console.log('[Brain] Diagnostic cleared');
    }

    /**
     * 🧪 TEST FUNCTION: Simulate Brain escalation for testing
     * Call from console: BrainIntegration.testEscalation()
     */
    function testEscalation() {
        console.log('🧪 [TEST] Simulation escalade Brain...');
        
        const room = window.roomCache?.room || 'A-1825';
        
        // Mock Brain response with escalation
        const mockBrainResponse = {
            room_snapshot: {
                room_id: room,
                devices: [
                    { name: 'Projecteur Epson EB-L200SW', is_online: false, device_type: 'projector' },
                    { name: 'Sennheiser TCC2', is_online: true, device_type: 'microphone' },
                    { name: 'Extron DTP2 T 211', is_online: true, device_type: 'switcher' }
                ]
            },
            brain_decision: {
                decision: 'escalate',
                escalation_level: 'high',
                reasoning: '🧪 [TEST] Projecteur hors ligne détecté - intervention technique requise',
                bt_recommended: true,
                bt_urgency: 'urgent',
                confidence: 0.92,
                why_template: 'Le projecteur ne répond pas aux commandes PJLink. Vérifier alimentation et connexion réseau.'
            },
            correlation_id: 'brain-TEST-' + Date.now(),
            processed_at: new Date().toISOString(),
            summary: `Room ${room}: ISSUE (score: 45/100) - TEST MODE`
        };
        
        console.log('🧪 [TEST] Mock Brain response:', mockBrainResponse);
        
        // Process the mock decision
        const handled = processBrainDecision(mockBrainResponse);
        
        if (handled) {
            console.log('✅ [TEST] Escalation simulée avec succès!');
            console.log('🧪 [TEST] Diagnostic stocké:', window.__BRAIN_LAST_DIAGNOSTIC__);
            console.log('📋 [TEST] Cliquez sur "Créer ticket" pour tester l\'injection du diagnostic');
        } else {
            console.error('❌ [TEST] Échec simulation escalade');
        }
        
        return handled;
    }

    // Export functions for external use
    window.BrainIntegration = {
        callBrainDiagnose,
        processBrainDecision,
        checkExistingTicket,  // Check if ticket exists for room
        getBrainDiagnosticForTicket,
        clearBrainDiagnostic,
        testEscalation,  // 🧪 TEST: Simulate escalation
        setEnabled: (enabled) => {
            window.VITRINE_USES_BRAIN = enabled;
            localStorage.setItem('vitrine.uses.brain', enabled ? 'true' : 'false');
            console.log(`🧠 [Brain] Integration ${enabled ? 'enabled' : 'disabled'}`);
        },
        isEnabled: () => window.VITRINE_USES_BRAIN,
        version: BRAIN_API_VERSION
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBrainIntegration);
    } else {
        initBrainIntegration();
    }

})();
