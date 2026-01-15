/**
 * Room Brain Integration for Vitrine V1.1
 * 
 * This module provides Brain-first diagnosis for Vitrine.
 * Brain is the authoritative source for action gating and escalation decisions.
 * 
 * Usage:
 * 1. Copy this file to Annexe/Vitrine-Github-version/brain-integration.js
 * 2. Include this script in vitrine.html after app.js:
 *    <script src="brain-integration.js"></script>
 * 3. Set window.VITRINE_USES_BRAIN = true to enable (or use localStorage)
 * 
 * Fallback: If Brain is unavailable (timeout 2s), falls back to Copilot.
 * 
 * @version 1.1
 * @author SAVQonnect Team
 */

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    
    const BRAIN_TIMEOUT_MS = 2000; // 2 seconds timeout for Brain API
    const BRAIN_API_VERSION = '1.1';
    
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

        const apiBase = window.currentAPI || window.API_BASE_URL;
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
     * @param {Object} brainResponse - Response from Brain diagnose endpoint
     * @returns {boolean} True if Brain handled the request, false to fallback
     */
    async function processBrainDecision(brainResponse) {
        if (!brainResponse || !brainResponse.brain_decision) {
            console.log('[Brain] No decision in response, falling back to Copilot');
            return false;
        }

        const decision = brainResponse.brain_decision;
        const correlationId = brainResponse.correlation_id || 'unknown';
        
        console.log(`🧠 [Brain] Processing decision: ${decision.decision} (${correlationId})`);

        switch (decision.decision) {
            case 'auto_fix':
                return await handleAutoFix(decision, correlationId);
            
            case 'escalate':
                return handleEscalation(decision, brainResponse);
            
            case 'monitor':
                return handleMonitor(decision);
            
            case 'ignore':
                return handleIgnore(decision);
            
            default:
                console.warn(`[Brain] Unknown decision type: ${decision.decision}`);
                return false;
        }
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

        // Cancel any existing escalation timer (Brain is now deciding)
        if (typeof clearEscalationTimeout === 'function') {
            clearEscalationTimeout();
        }

        // Show SEA escalation banner with Brain's reasoning
        if (typeof showSEAEscalationBanner === 'function') {
            const room = window.roomCache?.room || 'unknown';
            showSEAEscalationBanner({
                intent: 'brain_escalation',
                confidence: 0.95,
                room: room,
                escalation_reason: decision.reasoning || 'Brain recommande une escalade',
                brain_decision: decision,
                correlation_id: brainResponse.correlation_id
            });
        }

        return true;
    }

    /**
     * Handle monitor decision - suggest retry later
     */
    function handleMonitor(decision) {
        console.log(`👀 [Brain] Monitor recommended, retry after ${decision.retry_after_sec || 60}s`);
        
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }

        if (typeof addMessage === 'function') {
            addMessage('system', `👀 ${decision.reasoning || 'Surveillance recommandée'}`, {
                suggestions: ['Réessayer dans 1 minute', 'Signaler quand même']
            });
        }

        return true;
    }

    /**
     * Handle ignore decision - no action needed
     */
    function handleIgnore(decision) {
        console.log(`✅ [Brain] No action needed: ${decision.reasoning}`);
        
        if (typeof hideDiagnosticLoading === 'function') {
            hideDiagnosticLoading();
        }

        if (typeof addMessage === 'function') {
            addMessage('system', `✅ ${decision.reasoning || 'Aucune action requise'}`, {
                suggestions: ['Nouveau problème', 'Fermer']
            });
        }

        return true;
    }

    // ============================================================================
    // INTEGRATION HOOKS
    // ============================================================================

    /**
     * Intercept problem report to use Brain first
     * This wraps the original sendProblemReport function
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

            // Detect symptoms from message
            const symptoms = detectSymptoms(message);

            console.log(`🧠 [Brain] Intercepting problem report for room ${room}`);

            // Show loading indicator
            if (typeof showDiagnosticLoading === 'function') {
                showDiagnosticLoading();
            }

            // Call Brain first
            const brainResponse = await callBrainDiagnose(room, message, symptoms);

            // If Brain responded with a decision, process it
            if (brainResponse && brainResponse.brain_decision) {
                const handled = await processBrainDecision(brainResponse);
                if (handled) {
                    console.log('[Brain] Request handled by Brain');
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
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize Brain integration when DOM is ready
     */
    function initBrainIntegration() {
        console.log(`🧠 [Brain] Initializing integration v${BRAIN_API_VERSION}`);
        console.log(`🧠 [Brain] VITRINE_USES_BRAIN = ${window.VITRINE_USES_BRAIN}`);

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

    // Export functions for external use
    window.BrainIntegration = {
        callBrainDiagnose,
        processBrainDecision,
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
