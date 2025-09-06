# Vitrine - Application d'assistance audiovisuelle

## Améliorations de stabilité de connexion

La version actuelle intègre un nouveau système de gestion des connexions pour résoudre les problèmes de déconnexions fréquentes. Les principales améliorations sont :

### 1. Gestionnaire de connexion robuste (ConnectionManager)

Un nouveau module `connection-manager.js` a été ajouté pour gérer de manière centralisée toutes les connexions au backend. Ce module :

- Surveille en continu l'état de la connexion au backend
- Tente automatiquement de se reconnecter en cas de perte de connexion
- Utilise un système de backoff exponentiel pour les tentatives de reconnexion
- Bascule automatiquement entre l'URL principale et l'URL de secours
- Gère la reconnexion des EventSource (SSE) utilisés pour le chat et les notifications

### 2. Mécanisme de basculement entre backends

Le système peut maintenant basculer automatiquement entre deux backends :

- URL principale : celle configurée dans le localStorage ou par défaut (`c46928_dee.ddns.uqam.ca:7070`)
- URL de secours : `sav-atl-por-8.tail12c6c1.ts.net:7070`

En cas de perte de connexion avec l'URL principale, le système bascule automatiquement vers l'URL de secours après plusieurs tentatives de reconnexion.

### 3. Intégration avec le code existant

Le gestionnaire de connexion s'intègre de manière non-intrusive avec le code existant :

- Les fonctions de surveillance existantes (`setupBackendHealthWatch`) utilisent le ConnectionManager si disponible
- La fonction `restartSSEConnections` utilise également le ConnectionManager pour gérer les reconnexions
- L'interface utilisateur est mise à jour en temps réel pour refléter l'état de la connexion

### 4. Feedback utilisateur amélioré

- Indicateur visuel de l'état de la connexion (vert/rouge)
- Messages de statut plus précis ("Reconnexion en cours...", "Connexion perdue")
- Notifications lors des changements d'état de la connexion

## Installation

Le module est automatiquement chargé via le fichier HTML principal et s'initialise au chargement de la page.

## Utilisation pour les développeurs

Le gestionnaire de connexion est accessible globalement via `window.connectionManager` et expose les méthodes suivantes :

```javascript
// Vérifier l'état de la connexion
const isConnected = window.connectionManager.isConnected;

// Effectuer une requête avec retry automatique
try {
    const response = await window.connectionManager.fetchWithRetry('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    // Traiter la réponse
} catch (error) {
    // Gérer l'erreur
}

// Enregistrer un EventSource pour la gestion automatique des reconnexions
const eventSource = window.connectionManager.registerEventSource(
    'chat-events', 
    '/api/chat/events',
    { withCredentials: true }
);

// Ajouter un gestionnaire d'événement
window.connectionManager.addEventSourceHandler(
    'chat-events',
    'message',
    (event) => {
        console.log('Message reçu:', event.data);
    }
);
```

Cette solution devrait résoudre les problèmes de déconnexion fréquente de l'application Vitrine.