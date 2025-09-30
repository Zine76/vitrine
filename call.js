/**
 * Vitrine Call System - WebRTC Audio Call Module
 * Handles device selection, call initiation, and WebRTC communication
 */

// ===============================================
// CONFIGURATION
// ===============================================
const getBackendUrl = () => {
    // Utiliser la configuration du backend définie par Alt+Ctrl+J (même clé que vitrine.html)
    const savedIp = localStorage.getItem('vitrine.backend.ip') || localStorage.getItem('backendIp') || 'localhost';
    const port = savedIp.includes(':') ? '' : ':7070';
    return `${savedIp}${port}`;
};

const CALL_CONFIG = {
    get wsUrl() {
        const backend = getBackendUrl();
        return `ws://${backend}/ws/call`;
    },
    get apiUrl() {
        const backend = getBackendUrl();
        return `http://${backend}`;
    },
    get iceServers() {
        // Utiliser la configuration ICE dynamique si disponible
        if (window.iceConfigLoader && window.iceConfigLoader.config) {
            return window.iceConfigLoader.config.callConfig.iceServers;
        }
        // Fallback vers la configuration statique
        return [
            // STUN local UQAM (priorité - à configurer)
            // { urls: 'stun:stun.uqam.ca:3478' },
            // STUN Google (fallback actuel)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // TURN pour cas complexes (futur)
            // { 
            //     urls: 'turn:turn.uqam.ca:3478',
            //     username: 'user',
            //     credential: 'pass'
            // }
        ];
    },
    // Configuration audio optimisée
    audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
    },
    // Timeouts optimisés
    offerTimeout: 10000,
    answerTimeout: 10000,
    iceTimeout: 30000,
    reconnectDelay: 3000,
    heartbeatInterval: 30000
};

// ===============================================
// STATE MANAGEMENT
// ===============================================
let callState = {
    ws: null,
    pc: null,
    localStream: null,
    remoteAudio: null,
    vitrineSessionId: null,
    roomId: null,
    roomLabel: null,
    isInCall: false,
    isWaiting: false,
    isMuted: false,
    callTimer: null,
    callStartTime: null,
    heartbeatInterval: null
};

// ===============================================
// INITIALIZATION
// ===============================================

// Initialiser la configuration ICE dynamique
async function initializeIceConfig() {
    try {
        console.log('🔄 Initialisation de la configuration ICE...');
        
        // Charger la configuration depuis le service TURN/STUN
        const backend = getBackendUrl();
        const turnServiceUrl = backend.replace(':7070', ':8080'); // Service TURN sur port 8080
        
        const response = await fetch(`${turnServiceUrl}/integration/vitrine`);
        if (response.ok) {
            const config = await response.json();
            window.iceConfigLoader = {
                config: config,
                lastUpdate: new Date(),
                ttl: config.ttlSeconds || 3600
            };
            
            console.log('✅ Configuration ICE chargée:', {
                iceServers: config.callConfig.iceServers.length,
                ttl: config.ttlSeconds,
                realm: config.realm
            });
        } else {
            console.warn('⚠️ Impossible de charger la configuration ICE, utilisation du fallback');
        }
    } catch (error) {
        console.warn('⚠️ Erreur lors du chargement de la configuration ICE:', error);
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', initializeIceConfig);
function initializeCallSystem() {
    // Check backend configuration first
    const backendIp = localStorage.getItem('vitrine.backend.ip') || localStorage.getItem('backendIp');
    console.log('🎤 [Call System] Initialisation avec backend:', backendIp || 'NON CONFIGURÉ');
    
    // Get or create session ID
    callState.vitrineSessionId = localStorage.getItem('vitrineSessionId');
    if (!callState.vitrineSessionId) {
        callState.vitrineSessionId = generateUUID();
        localStorage.setItem('vitrineSessionId', callState.vitrineSessionId);
    }
    
    // Get room information from page context
    callState.roomId = window.currentTicketId || `room-${Date.now()}`;
    
    // Try multiple sources for room name - LIMITER la longueur pour éviter la "bible"
    let roomName = window.roomLabel || 
                   document.querySelector('.room-name')?.textContent?.trim() ||
                   document.querySelector('[class*="room"]')?.textContent?.trim() ||
                   document.querySelector('h1')?.textContent?.trim() ||
                   document.querySelector('h2')?.textContent?.trim() ||
                   document.title?.replace(' - Vitrine', '').trim();
    
    // LIMITER la longueur du nom de salle pour éviter d'envoyer tout le contenu HTML
    if (roomName && roomName.length > 50) {
        console.log('⚠️ Room name too long, truncating:', roomName.substring(0, 50) + '...');
        roomName = roomName.substring(0, 50).trim();
    }
    
    // If still no room name, try to extract from URL or use a more descriptive default
    if (!roomName || roomName === 'Salle inconnue' || roomName.length === 0) {
        const urlMatch = window.location.pathname.match(/[A-Z]-\d+/);
        roomName = urlMatch ? `Salle ${urlMatch[0]}` : 'Salle de cours';
    }
    
    // FORCER un nom de salle spécifique pour les tests
    // TODO: Remplacer par la vraie détection de salle
    if (roomName === 'Salle de cours' || roomName.includes('Backend')) {
        roomName = 'Salle A-1825'; // Nom de salle par défaut pour les tests
    }
    
    console.log('🏢 Room name detected:', roomName);
    
    callState.roomLabel = roomName;
    
    // Initialize UI
    initializeUI();
    
    // Check for saved device preferences
    checkSavedDevices();
    
    // Utilisation des préférences Windows par défaut
    
    console.log('📞 Call system initialized', {
        sessionId: callState.vitrineSessionId,
        roomId: callState.roomId,
        roomLabel: callState.roomLabel
    });
    
    // Handle page unload - end call if active
    window.addEventListener('beforeunload', () => {
        if (callState.isInCall || callState.isWaiting) {
            console.log('📞 Page unloading - ending call');
            // Envoyer immédiatement le message de fin d'appel
            if (callState.ws && callState.ws.readyState === WebSocket.OPEN) {
                callState.ws.send(JSON.stringify({
                    type: 'CALL_ENDED',
                    roomId: callState.roomId,
                    reason: 'page_unload'
                }));
            }
            endCall();
        }
    });
    
    // Handle page visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && (callState.isInCall || callState.isWaiting)) {
            console.log('📞 Page hidden - maintaining call state');
        }
    });
}

// ===============================================
// UI INITIALIZATION
// ===============================================
function initializeUI() {
    // Add call button to page
    if (!document.querySelector('.floating-call-btn')) {
        const callBtn = document.createElement('button');
        callBtn.className = 'floating-call-btn';
        callBtn.innerHTML = '<i class="fas fa-phone"></i>';
        callBtn.title = 'Appeler le support technique';
        callBtn.setAttribute('aria-label', 'Appeler le support technique');
        callBtn.onclick = handleCallButtonClick;
        document.body.appendChild(callBtn);
    }
    
    // Create modal container if not exists
    if (!document.querySelector('#callModal')) {
        createCallModal();
    }
    
    // Create audio elements
    if (!document.querySelector('#remoteAudio')) {
        const remoteAudio = document.createElement('audio');
        remoteAudio.id = 'remoteAudio';
        remoteAudio.autoplay = true;
        document.body.appendChild(remoteAudio);
        callState.remoteAudio = remoteAudio;
    }
    
    if (!document.querySelector('#waitingAudio')) {
        const waitingAudio = document.createElement('audio');
        waitingAudio.id = 'waitingAudio';
        // Utiliser le vrai fichier waiting.mp3 depuis GitHub
        waitingAudio.src = 'https://zine76.github.io/vitrine/assets/audio/waiting.mp3';
        waitingAudio.loop = true;
        waitingAudio.volume = 0.3; // Volume modéré
        document.body.appendChild(waitingAudio);
    }
    
    // ringingAudio supprimé - utilisation uniquement de waitingAudio
}

// New function to handle call button click
function handleCallButtonClick() {
    console.log('📞 [Call] Démarrage appel direct avec préférences Windows...');
    
    // Toujours démarrer l'appel directement - utiliser les préférences Windows par défaut
    startCallDirectly();
}

// ===============================================
// MODAL CREATION
// ===============================================
function createCallModal() {
    const modalHTML = `
        <div id="callModal" class="call-modal-overlay">
            <div class="call-modal">
                <div class="call-modal-header">
                    <h2 class="call-modal-title">
                        <i class="fas fa-phone-alt"></i>
                        Appel au Support Technique
                    </h2>
                </div>
                <div class="call-modal-body">
                    <!-- Device Selection -->
                    <div id="deviceSelection" class="device-selection">
                        <div class="device-group">
                            <label class="device-label">Microphone</label>
                            <select id="micSelect" class="device-select">
                                <option value="">Microphone par défaut</option>
                            </select>
                        </div>
                        <div class="device-group">
                            <label class="device-label">Sortie Audio</label>
                            <select id="speakerSelect" class="device-select">
                                <option value="">Sortie par défaut</option>
                            </select>
                        </div>
                        <div class="call-actions">
                    <button class="call-btn call-btn-secondary" onclick="closeCallModal()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="call-btn call-btn-primary" onclick="startCall()">
                        <i class="fas fa-phone"></i> Appeler
                    </button>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <a href="#" onclick="resetAudioConfig(); return false;" style="color: #64748b; font-size: 0.85rem; text-decoration: underline;">
                        Réinitialiser la configuration audio
                    </a>
                </div>
            </div>
                    
                    <!-- Call Status -->
                    <div id="callStatus" class="call-status" style="display: none;">
                        <div class="call-status-icon ringing">
                            <i class="fas fa-phone-alt"></i>
                        </div>
                        <div class="call-status-text">Appel en cours...</div>
                        <div class="call-status-subtitle">Veuillez patienter</div>
                        <div class="audio-visualizer" style="display: none;">
                            <div class="audio-bar"></div>
                            <div class="audio-bar"></div>
                            <div class="audio-bar"></div>
                            <div class="audio-bar"></div>
                            <div class="audio-bar"></div>
                        </div>
                        <div class="call-timer" style="display: none;">00:00</div>
                        <div class="call-controls">
                            <button class="call-control-btn mute" onclick="toggleMute()">
                                <i class="fas fa-microphone"></i>
                            </button>
                            <button class="call-control-btn end-call" onclick="endCall()">
                                <i class="fas fa-phone-slash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Waiting Queue -->
                    <div id="callWaiting" class="call-waiting" style="display: none;">
                        <div class="call-waiting-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="call-waiting-text">En attente d'un technicien...</div>
                        <div class="call-waiting-position">Vous êtes en file d'attente</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===============================================
// DEVICE MANAGEMENT
// ===============================================
async function checkSavedDevices() {
    const savedMicId = localStorage.getItem('micDeviceId');
    const savedSpeakerId = localStorage.getItem('speakerDeviceId');
    
    console.log('🔍 [Audio] Vérification périphériques sauvegardés:', {
        mic: savedMicId ? '✅ Configuré' : '❌ Non configuré',
        speaker: savedSpeakerId ? '✅ Configuré' : '❌ Non configuré'
    });
    
    if (savedMicId && savedSpeakerId) {
        // Devices already configured
        const callBtn = document.querySelector('.floating-call-btn');
        if (callBtn) {
            callBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            callBtn.title = 'Appeler le support technique (périphériques configurés)';
        }
        console.log('✅ [Audio] Périphériques déjà configurés, appel direct possible');
    } else {
        console.log('⚠️ [Audio] Périphériques non configurés, modal requis');
    }
}

// Fonction supprimée - Utilisation des préférences Windows par défaut

async function showDeviceModal() {
    // Request permissions first
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('❌ Erreur accès microphone:', err);
        alert('Veuillez autoriser l\'accès au microphone pour passer un appel');
        return;
    }
    
    // Enumerate devices
    await populateDeviceSelects();
    
    // Show modal
    const modal = document.querySelector('#callModal');
    if (modal) {
        modal.classList.add('active');
        document.querySelector('#deviceSelection').style.display = 'block';
        document.querySelector('#callStatus').style.display = 'none';
        document.querySelector('#callWaiting').style.display = 'none';
    }
}

async function populateDeviceSelects() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const micSelect = document.querySelector('#micSelect');
        const speakerSelect = document.querySelector('#speakerSelect');
        
        // Clear existing options
        micSelect.innerHTML = '<option value="">Microphone par défaut</option>';
        speakerSelect.innerHTML = '<option value="">Sortie par défaut</option>';
        
        // Populate microphones
        const mics = devices.filter(d => d.kind === 'audioinput');
        mics.forEach(mic => {
            const option = document.createElement('option');
            option.value = mic.deviceId;
            option.textContent = mic.label || `Microphone ${mic.deviceId.substr(0, 8)}`;
            micSelect.appendChild(option);
        });
        
        // Populate speakers (only works in Chrome/Edge with HTTPS)
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker.deviceId;
            option.textContent = speaker.label || `Sortie ${speaker.deviceId.substr(0, 8)}`;
            speakerSelect.appendChild(option);
        });
        
        // Restore saved selections
        const savedMicId = localStorage.getItem('micDeviceId');
        const savedSpeakerId = localStorage.getItem('speakerDeviceId');
        
        if (savedMicId) micSelect.value = savedMicId;
        if (savedSpeakerId) speakerSelect.value = savedSpeakerId;
        
    } catch (err) {
        console.error('❌ Erreur énumération devices:', err);
    }
}

// ===============================================
// CALL MANAGEMENT
// ===============================================
async function startCallDirectly() {
    // Direct call using Windows default preferences
    const backendIp = localStorage.getItem('vitrine.backend.ip') || localStorage.getItem('backendIp');
    
    console.log('📞 [Call] Vérification backend IP:', {
        'vitrine.backend.ip': localStorage.getItem('vitrine.backend.ip'),
        'backendIp': localStorage.getItem('backendIp'),
        'final': backendIp
    });
    
    if (!backendIp) {
        alert('⚠️ Backend non configuré!\n\nUtilisez Alt+Ctrl+J pour configurer l\'adresse IP du serveur.');
        return;
    }
    
    // Show call status UI
    const modal = document.querySelector('#callModal');
    if (modal) {
        modal.classList.add('active');
        document.querySelector('#deviceSelection').style.display = 'none';
        document.querySelector('#callStatus').style.display = 'block';
    }
    
    // Utiliser les préférences Windows par défaut (pas de deviceId spécifique)
    console.log('📞 [Call] Utilisation des préférences Windows par défaut');
    
    // Start the actual call with default devices
    await initiateCall(null, null);
}

async function startCall() {
    console.log('📞 Starting call...');
    
    // Vérifier que le backend est configuré
    const backendIp = localStorage.getItem('vitrine.backend.ip') || localStorage.getItem('backendIp');
    if (!backendIp) {
        alert('⚠️ Backend non configuré!\n\nUtilisez Alt+Ctrl+J pour configurer l\'adresse IP du serveur.');
        closeCallModal();
        return;
    }
    
    // Save device preferences
    const micId = document.querySelector('#micSelect').value;
    const speakerId = document.querySelector('#speakerSelect').value;
    
    if (micId) localStorage.setItem('micDeviceId', micId);
    if (speakerId) localStorage.setItem('speakerDeviceId', speakerId);
    
    // Update UI
    document.querySelector('#deviceSelection').style.display = 'none';
    document.querySelector('#callStatus').style.display = 'block';
    
    // Start the actual call
    await initiateCall(micId, speakerId);
}

async function initiateCall(micId, speakerId) {
    console.log('📞 Initiating call with devices:', { micId, speakerId });
    
    // Son d'attente sera joué par playWaitingMusic() quand nécessaire
    
    // Get user media with Windows default preferences
    try {
        const constraints = {
            audio: {
                // Utiliser les préférences Windows par défaut si pas de deviceId spécifique
                ...(micId ? { deviceId: { exact: micId } } : {}),
                // Configuration audio optimisée
                echoCancellation: CALL_CONFIG.audioConstraints.echoCancellation,
                noiseSuppression: CALL_CONFIG.audioConstraints.noiseSuppression,
                autoGainControl: CALL_CONFIG.audioConstraints.autoGainControl,
                sampleRate: CALL_CONFIG.audioConstraints.sampleRate
            }
        };
        
        console.log('📞 [Audio] Contraintes getUserMedia:', constraints);
        callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set speaker if supported (utiliser les préférences Windows par défaut si pas spécifié)
        if (callState.remoteAudio.setSinkId && speakerId) {
            await callState.remoteAudio.setSinkId(speakerId);
        } else {
            console.log('📞 [Audio] Utilisation de la sortie audio Windows par défaut');
        }
        
    } catch (err) {
        console.error('❌ Erreur getUserMedia:', err);
        alert('Impossible d\'accéder au microphone');
        // Stop ringing
        if (ringingAudio) ringingAudio.pause();
        closeCallModal();
        return;
    }
    
    // Notify backend about new call
    try {
        const response = await fetch(`${CALL_CONFIG.apiUrl}/api/call/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: callState.roomId,
                vitrineSessionId: callState.vitrineSessionId,
                roomLabel: callState.roomLabel
            })
        });
        
        const data = await response.json();
        console.log('📞 Call start response:', data);
        
        if (data.queued) {
            showWaitingState();
            playWaitingMusic();
        }
        
    } catch (err) {
        console.error('❌ Erreur call start:', err);
    }
    
    // Connect WebSocket
    connectWebSocket();
}

// ===============================================
// WEBSOCKET MANAGEMENT
// ===============================================
function connectWebSocket() {
    const wsUrl = `${CALL_CONFIG.wsUrl}?role=vitrine&sessionId=${callState.vitrineSessionId}&roomId=${callState.roomId}`;
    
    console.log('🔌 Connecting WebSocket:', wsUrl);
    
    callState.ws = new WebSocket(wsUrl);
    
    callState.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        sendWSMessage({ type: 'HELLO' });
        startHeartbeat();
    };
    
    callState.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('📨 WS Message:', message);
        await handleWSMessage(message);
    };
    
    callState.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };
    
    callState.ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        stopHeartbeat();
        
        // Attempt reconnect if still in call
        if (callState.isInCall) {
            setTimeout(connectWebSocket, CALL_CONFIG.reconnectDelay);
        }
    };
}

async function handleWSMessage(message) {
    switch (message.type) {
        case 'HELLO_OK':
            console.log('✅ Server acknowledged connection');
            break;
            
        case 'RINGING':
            showWaitingState();
            playWaitingMusic();
            break;
            
        case 'CALL_ACCEPTED':
            console.log('✅ Call accepted by technician');
            // Stop waiting music
            stopWaitingMusic();
            await setupWebRTC();
            showConnectedState();
            break;
            
        case 'RTC_OFFER':
            // This shouldn't happen for vitrine (we create offers)
            console.warn('Received unexpected RTC_OFFER');
            break;
            
        case 'RTC_ANSWER':
            console.log('📞 Received RTC answer');
            await handleRTCAnswer(message.payload);
            break;
            
        case 'RTC_ICE':
            console.log('🧊 Received ICE candidate');
            await handleICECandidate(message.payload);
            break;
            
        case 'CALL_ENDED':
            console.log('📞 Call ended by other party:', message.reason || 'unknown');
            // Arrêter immédiatement tous les sons
            const ringingAudio = document.querySelector('#ringingAudio');
            if (ringingAudio) {
                ringingAudio.pause();
                ringingAudio.currentTime = 0;
            }
            stopWaitingMusic();
            
            // Fermer la modal et réinitialiser l'état
            closeCallModal();
            resetCallState();
            
            // Afficher un message à l'utilisateur
            if (message.reason === 'page_unload') {
                showCallStatus('Appel terminé', 'L\'autre partie a fermé sa page');
            } else {
                showCallStatus('Appel terminé', 'L\'autre partie a raccroché');
            }
            break;
            
        case 'BUSY':
            console.log('⚠️ Technician busy');
            showWaitingState();
            break;
    }
}

// ===============================================
// WEBRTC MANAGEMENT
// ===============================================
async function setupWebRTC() {
    console.log('🎥 Setting up WebRTC...');
    
    const configuration = {
        iceServers: CALL_CONFIG.iceServers,
        iceCandidatePoolSize: 10
    };
    
    callState.pc = new RTCPeerConnection(configuration);
    
    // Timeout pour la connexion ICE
    const iceTimeout = setTimeout(() => {
        if (callState.pc && callState.pc.connectionState !== 'connected') {
            console.error('❌ ICE connection timeout');
            handleWebRTCError('Connexion WebRTC timeout - Vérifiez votre réseau');
        }
    }, CALL_CONFIG.iceTimeout);
    
    // Add local stream tracks
    callState.localStream.getTracks().forEach(track => {
        callState.pc.addTrack(track, callState.localStream);
    });
    
    // Handle ICE candidates
    callState.pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('🧊 Sending ICE candidate');
            sendWSMessage({
                type: 'RTC_ICE',
                roomId: callState.roomId,
                payload: event.candidate
            });
        }
    };
    
    // Handle connection state changes
    callState.pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', callState.pc.connectionState);
        if (callState.pc.connectionState === 'connected') {
            clearTimeout(iceTimeout);
            console.log('✅ WebRTC connected successfully');
        } else if (callState.pc.connectionState === 'failed') {
            console.error('❌ WebRTC connection failed');
            handleWebRTCError('Échec de la connexion WebRTC');
        } else if (callState.pc.connectionState === 'disconnected') {
            console.warn('⚠️ WebRTC disconnected');
        }
    };
    
    // Handle ICE connection state changes
    callState.pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', callState.pc.iceConnectionState);
        if (callState.pc.iceConnectionState === 'connected') {
            clearTimeout(iceTimeout);
        } else if (callState.pc.iceConnectionState === 'failed') {
            console.error('❌ ICE connection failed');
            handleWebRTCError('Échec de la connexion ICE - Problème réseau');
        }
    };
    
    // Handle remote stream
    callState.pc.ontrack = (event) => {
        console.log('🎵 Received remote track');
        callState.remoteAudio.srcObject = event.streams[0];
        callState.remoteAudio.play().catch(err => {
            console.error('❌ Erreur lecture audio:', err);
        });
    };
    
    // Create and send offer
    try {
        const offer = await callState.pc.createOffer({
            offerToReceiveAudio: true
        });
        
        await callState.pc.setLocalDescription(offer);
        
        console.log('📤 Sending RTC offer');
        sendWSMessage({
            type: 'RTC_OFFER',
            roomId: callState.roomId,
            payload: offer
        });
        
    } catch (err) {
        console.error('❌ Erreur création offer:', err);
        handleWebRTCError('Erreur lors de la création de l\'offre WebRTC');
    }
}

// ===============================================
// ERROR HANDLING
// ===============================================
function handleWebRTCError(message) {
    console.error('🚨 WebRTC Error:', message);
    
    // Afficher message d'erreur à l'utilisateur
    const modal = document.querySelector('#callModal');
    if (modal) {
        const statusDiv = modal.querySelector('#callStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="call-status">
                    <div class="call-status-icon error">❌</div>
                    <div class="call-status-text">Erreur de connexion</div>
                    <div class="call-status-subtitle">${message}</div>
                </div>
                <div class="call-controls">
                    <button class="call-control-btn end-call" onclick="endCall()">
                        <i class="fas fa-phone-slash"></i>
                        Fermer
                    </button>
                </div>
            `;
        }
    }
    
    // Nettoyer l'état
    if (callState.pc) {
        callState.pc.close();
        callState.pc = null;
    }
    
    if (callState.localStream) {
        callState.localStream.getTracks().forEach(track => track.stop());
        callState.localStream = null;
    }
    
    callState.isInCall = false;
    callState.isWaiting = false;
}

async function handleRTCAnswer(answer) {
    try {
        await callState.pc.setRemoteDescription(answer);
        console.log('✅ Remote description set');
    } catch (err) {
        console.error('❌ Erreur setRemoteDescription:', err);
    }
}

async function handleICECandidate(candidate) {
    try {
        await callState.pc.addIceCandidate(candidate);
        console.log('✅ ICE candidate added');
    } catch (err) {
        console.error('❌ Erreur addIceCandidate:', err);
    }
}

// ===============================================
// UI STATE MANAGEMENT
// ===============================================
function showWaitingState() {
    callState.isWaiting = true;
    
    const statusIcon = document.querySelector('.call-status-icon');
    const statusText = document.querySelector('.call-status-text');
    const statusSubtitle = document.querySelector('.call-status-subtitle');
    const waitingDiv = document.querySelector('#callWaiting');
    
    if (statusIcon) {
        statusIcon.className = 'call-status-icon waiting';
        statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
    }
    
    if (statusText) statusText.textContent = 'En attente...';
    if (statusSubtitle) statusSubtitle.textContent = 'Un technicien va bientôt répondre';
    if (waitingDiv) waitingDiv.style.display = 'block';
}

function showConnectedState() {
    callState.isInCall = true;
    callState.isWaiting = false;
    callState.callStartTime = Date.now();
    
    const statusIcon = document.querySelector('.call-status-icon');
    const statusText = document.querySelector('.call-status-text');
    const statusSubtitle = document.querySelector('.call-status-subtitle');
    const waitingDiv = document.querySelector('#callWaiting');
    const visualizer = document.querySelector('.audio-visualizer');
    const timer = document.querySelector('.call-timer');
    const floatingBtn = document.querySelector('.floating-call-btn');
    
    if (statusIcon) {
        statusIcon.className = 'call-status-icon connected';
        statusIcon.innerHTML = '<i class="fas fa-phone-alt"></i>';
    }
    
    if (statusText) statusText.textContent = 'Connecté';
    if (statusSubtitle) statusSubtitle.textContent = 'Vous êtes en communication avec un technicien';
    if (waitingDiv) waitingDiv.style.display = 'none';
    if (visualizer) {
        visualizer.style.display = 'flex';
        startAudioVisualizer();
    }
    if (timer) {
        timer.style.display = 'block';
        startCallTimer();
    }
    
    if (floatingBtn) {
        floatingBtn.classList.add('in-call');
        floatingBtn.innerHTML = '<i class="fas fa-phone-slash"></i>';
    }
}

// ===============================================
// CALL CONTROLS
// ===============================================
function toggleMute() {
    if (!callState.localStream) return;
    
    callState.isMuted = !callState.isMuted;
    
    callState.localStream.getAudioTracks().forEach(track => {
        track.enabled = !callState.isMuted;
    });
    
    const muteBtn = document.querySelector('.call-control-btn.mute');
    if (muteBtn) {
        if (callState.isMuted) {
            muteBtn.classList.add('active');
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        } else {
            muteBtn.classList.remove('active');
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
}

function endCall() {
    console.log('📞 Ending call...');
    
    // Envoyer le message de fin d'appel à l'autre partie
    if (callState.ws && callState.ws.readyState === WebSocket.OPEN && callState.roomId) {
        console.log('📤 Sending CALL_ENDED message to other party');
        callState.ws.send(JSON.stringify({
            type: 'CALL_ENDED',
            roomId: callState.roomId,
            reason: 'user_ended'
        }));
    }
    
    // Stop all audio
    const ringingAudio = document.querySelector('#ringingAudio');
    if (ringingAudio) {
        ringingAudio.pause();
        ringingAudio.currentTime = 0;
    }
    stopWaitingMusic();
    
    // Send end message
    if (callState.ws && callState.ws.readyState === WebSocket.OPEN) {
        sendWSMessage({
            type: 'CALL_END',
            roomId: callState.roomId
        });
    }
    
    // Clean up WebRTC
    if (callState.pc) {
        callState.pc.close();
        callState.pc = null;
    }
    
    // Stop local stream
    if (callState.localStream) {
        callState.localStream.getTracks().forEach(track => track.stop());
        callState.localStream = null;
    }
    
    // Close WebSocket
    if (callState.ws) {
        callState.ws.close();
        callState.ws = null;
    }
    if (callState.remoteAudio) {
        callState.remoteAudio.srcObject = null;
    }
    
    // Reset state
    callState.isInCall = false;
    callState.isWaiting = false;
    stopCallTimer();
    stopHeartbeat();
    stopAudioVisualizer();
    
    // Update UI
    closeCallModal();
    
    const floatingBtn = document.querySelector('.floating-call-btn');
    if (floatingBtn) {
        floatingBtn.classList.remove('in-call');
        floatingBtn.innerHTML = '<i class="fas fa-phone"></i>';
    }
}

// ===============================================
// UTILITIES
// ===============================================
function sendWSMessage(message) {
    if (callState.ws && callState.ws.readyState === WebSocket.OPEN) {
        callState.ws.send(JSON.stringify(message));
    }
}

function startHeartbeat() {
    callState.heartbeatInterval = setInterval(() => {
        sendWSMessage({ type: 'HEARTBEAT' });
    }, CALL_CONFIG.heartbeatInterval);
}

function stopHeartbeat() {
    if (callState.heartbeatInterval) {
        clearInterval(callState.heartbeatInterval);
        callState.heartbeatInterval = null;
    }
}

function startCallTimer() {
    callState.callTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callState.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timer = document.querySelector('.call-timer');
        if (timer) {
            timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 1000);
}

function stopCallTimer() {
    if (callState.callTimer) {
        clearInterval(callState.callTimer);
        callState.callTimer = null;
    }
}

function playWaitingMusic() {
    const audio = document.querySelector('#waitingAudio');
    if (audio) {
        audio.play().catch(err => {
            console.log('⚠️ Cannot play waiting music (user interaction required)');
        });
    }
}

function stopWaitingMusic() {
    const audio = document.querySelector('#waitingAudio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function closeCallModal() {
    const modal = document.querySelector('#callModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // If there's an active call or waiting state, end it
    if (callState.isInCall || callState.isWaiting) {
        console.log('📞 Modal closed during call - ending call');
        endCall();
    }
}

function resetCallState() {
    console.log('🔄 Resetting call state');
    
    // Réinitialiser tous les états
    callState.isInCall = false;
    callState.isWaiting = false;
    callState.roomId = null;
    callState.roomLabel = null;
    callState.callStartTime = null;
    callState.callTimer = null;
    
    // Arrêter tous les timers
    if (callState.callTimer) {
        clearInterval(callState.callTimer);
        callState.callTimer = null;
    }
    
    // Arrêter le heartbeat
    if (callState.heartbeatInterval) {
        clearInterval(callState.heartbeatInterval);
        callState.heartbeatInterval = null;
    }
    
    // Fermer la connexion WebRTC
    if (callState.pc) {
        callState.pc.close();
        callState.pc = null;
    }
    
    // Arrêter le stream local
    if (callState.localStream) {
        callState.localStream.getTracks().forEach(track => track.stop());
        callState.localStream = null;
    }
    
    // Réinitialiser l'UI
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.innerHTML = '<i class="fas fa-phone"></i> Appeler le support';
        callBtn.disabled = false;
    }
    
    console.log('✅ Call state reset complete');
}

// ===============================================
// AUDIO VISUALIZER
// ===============================================
let audioVisualizerInterval = null;

function startAudioVisualizer() {
    console.log('🎵 Starting audio visualizer...');
    
    if (audioVisualizerInterval) {
        clearInterval(audioVisualizerInterval);
    }
    
    const bars = document.querySelectorAll('.audio-visualizer .audio-bar');
    if (!bars.length) return;
    
    audioVisualizerInterval = setInterval(() => {
        bars.forEach((bar, index) => {
            // Simuler des niveaux audio réalistes
            const baseHeight = 20 + Math.random() * 60;
            const delay = index * 0.1;
            const variation = Math.sin(Date.now() / 200 + delay) * 20;
            const height = Math.max(10, baseHeight + variation);
            
            bar.style.height = height + '%';
            bar.style.backgroundColor = height > 60 ? '#ef4444' : height > 40 ? '#f59e0b' : '#10b981';
        });
    }, 100);
}

function stopAudioVisualizer() {
    if (audioVisualizerInterval) {
        clearInterval(audioVisualizerInterval);
        audioVisualizerInterval = null;
    }
    
    // Reset bars
    const bars = document.querySelectorAll('.audio-visualizer .audio-bar');
    bars.forEach(bar => {
        bar.style.height = '10%';
        bar.style.backgroundColor = '#10b981';
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===============================================
// INITIALIZATION ON LOAD
// ===============================================
document.addEventListener('DOMContentLoaded', initializeCallSystem);

// Function to reset audio configuration
function resetAudioConfig() {
    localStorage.removeItem('micDeviceId');
    localStorage.removeItem('speakerDeviceId');
    console.log('🔄 Audio configuration reset');
    alert('Configuration audio réinitialisée. La prochaine fois, vous pourrez choisir de nouveaux périphériques.');
    closeCallModal();
}

// Export for external use
window.vitrineCallSystem = {
    initializeCallSystem,
    showDeviceModal,
    startCall,
    endCall,
    toggleMute,
    resetAudioConfig
};
