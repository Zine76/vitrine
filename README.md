# 🎬 Vitrine - Assistant Salle Audiovisuelle

**Interface utilisateur pour la gestion des salles audiovisuelles avec système d'appels WebRTC intégré.**

## 🚀 Déploiement Rapide

### Option 1 : GitHub Pages (Recommandé)
1. Ouvrir directement : [https://zine76.github.io/vitrine/vitrine.html](https://zine76.github.io/vitrine/vitrine.html)
2. Configurer l'IP du backend avec `Alt+Ctrl+J`
3. C'est tout ! 🎉

### Option 2 : Déploiement Local
1. Télécharger tous les fichiers
2. Ouvrir `vitrine.html` dans un navigateur
3. Configurer l'IP du backend avec `Alt+Ctrl+J`

## ⚙️ Configuration Backend

### Configuration Automatique
- **Raccourci clavier** : `Alt+Ctrl+J`
- **Exemples d'IP** :
  - `localhost` (développement local)
  - `192.168.1.100` (IP locale)
  - `sav-atl-por-8.ddns.uqam.ca` (serveur distant)

### Vérification de l'IP Locale
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

## 🎯 Fonctionnalités

### 🏢 Gestion des Salles
- **Saisie obligatoire** de salle au démarrage
- **Cache persistant** des préférences
- **Plans unifilaires** intégrés
- **Enrichissement Podio** automatique

### 📞 Système d'Appels WebRTC
- **Appels audio** en temps réel
- **Configuration automatique** des périphériques audio
- **Son d'attente** intégré
- **Gestion des erreurs** robuste

### 🎨 Interface Moderne
- **Mode clair/sombre** automatique
- **Design responsive** (mobile/desktop)
- **Animations fluides**
- **Accessibilité** optimisée

### 💬 Chat Intégré
- **Messages en temps réel** (SSE)
- **Indicateur de frappe**
- **Restauration automatique** des messages
- **Résumé avec confirmation**

## 📁 Structure du Projet

```
Vitrine-Github-version/
├── vitrine.html              # Page principale
├── call.js                   # Système d'appels WebRTC
├── call.css                  # Styles système d'appels
├── app.js                    # Logique principale
├── style.css                 # Styles principaux
├── chat-welcome.css          # Styles bannière chat
├── sidebar.css               # Styles barre latérale
├── room-plans.js             # Plans unifilaires
└── assets/
    ├── SEA2.png              # Logo SEA
    └── audio/
        └── waiting.mp3       # Son d'attente
```

## 🔧 Configuration Technique

### Prérequis
- **Navigateur moderne** (Chrome, Firefox, Safari, Edge)
- **Accès microphone** (pour les appels)
- **Connexion réseau** au backend

### Backend Requis
- **Go backend** avec WebSocket support
- **Endpoints** : `/ws/call`, `/api/...`
- **CORS** configuré pour l'origine

### Périphériques Audio
- **Configuration automatique** au premier lancement
- **Sauvegarde persistante** des préférences
- **Détection automatique** des périphériques

## 🎵 Fichiers Audio

### `waiting.mp3`
- **Usage** : Son d'attente pendant les appels
- **Format** : MP3, 44.1kHz
- **Durée** : ~3 secondes en boucle
- **Volume** : Réduit automatiquement (0.2)

## 🚨 Dépannage

### Problème : "Backend non configuré"
1. Vérifier la connexion réseau
2. Utiliser `Alt+Ctrl+J` pour reconfigurer
3. Tester avec `localhost` en premier

### Problème : Pas de son d'attente
1. Vérifier les permissions audio du navigateur
2. Tester avec un autre navigateur
3. Vérifier la console (F12) pour les erreurs

### Problème : Configuration audio répétée
1. Vider le cache du navigateur
2. Vérifier les permissions microphone
3. Redémarrer le navigateur

## 📱 Compatibilité

### Navigateurs Supportés
- ✅ **Chrome** 80+
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+

### Appareils
- ✅ **Desktop** (Windows, Mac, Linux)
- ✅ **Mobile** (iOS, Android)
- ✅ **Tablette** (iPad, Android)

## 🔒 Sécurité

- **HTTPS** recommandé en production
- **Permissions audio** gérées par le navigateur
- **Pas de stockage** de données sensibles
- **CORS** configuré côté backend

## 📞 Support

Pour toute question ou problème :
1. Vérifier la console (F12)
2. Tester avec `localhost`
3. Vérifier la configuration réseau

---

**Développé pour l'UQAM - Service d'Aide Audiovisuelle** 🎓
