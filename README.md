# 🎯 Vitrine - Interface de diagnostic et monitoring audiovisuel

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/Zine76/vitrine)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production-brightgreen.svg)](https://github.com/Zine76/vitrine)

> Interface web standalone pour signaler des problèmes techniques dans les salles de classe de l'UQAM. Compatible avec n'importe quel backend similaire à SavQonnect.

---

## 📋 Vue d'ensemble

**Vitrine** est une page web standalone (HTML/CSS/JavaScript) conçue pour permettre aux usagers (professeurs, étudiants, personnel) de signaler des problèmes techniques dans les salles de classe de l'UQAM. La page fonctionne comme une interface publique de diagnostic et de monitoring, sans nécessiter d'authentification.

### ⚠️ Double usage

Vitrine sert **à la fois les usagers ET les techniciens** :
- **Mode usager** : Interface publique pour signaler des problèmes (vue par défaut)
- **Mode technicien** : Page cachée accessible via un raccourci/clé secrète, affichant des ressources techniques avancées (plans PDF de salle, documentation équipements, outils de diagnostic)

### 🎯 Problème résolu

Vitrine permet de signaler rapidement des problèmes audiovisuels (projecteur, son, écran tactile, etc.) directement depuis la salle, sans avoir à contacter le support par téléphone ou email. Le système analyse automatiquement le problème via un moteur IA (RAG) et peut proposer des solutions automatiques ou créer des tickets d'intervention.

### ⚠️ Compatibilité backend

Vitrine est conçue pour fonctionner avec **n'importe quel backend similaire à SavQonnect**. Elle communique exclusivement via des endpoints API REST publics (sans authentification), ce qui permet une intégration flexible avec différents systèmes de monitoring audiovisuel. La page est **agnostique du backend** tant que celui-ci expose les endpoints documentés.

---

## ✨ Fonctionnalités

### Pour les usagers

- ✅ **Signalement de problème** : Interface simple pour décrire un problème technique
- ✅ **Analyse IA automatique** : Le système analyse le problème et propose des solutions
- ✅ **Actions automatiques** : Résolution automatique si confiance IA >= 0.9
- ✅ **Création de tickets** : Génération automatique de tickets d'intervention
- ✅ **Chat intégré** : Communication bidirectionnelle avec le support technique
- ✅ **Monitoring en temps réel** : Affichage de l'état des équipements et tickets en cours

### Pour les techniciens (mode caché)

- 🔧 **Plan PDF de la salle** : Affichage du plan technique de la salle
- 🔧 **Documentation équipements** : Accès aux fiches techniques et schémas
- 🔧 **Historique des interventions** : Consultation des interventions précédentes
- 🔧 **Détails techniques** : Adresses IP, modèles, firmware des équipements
- 🔧 **Outils de diagnostic** : Tests de connectivité et outils avancés

---

## 🚀 Installation

### Prérequis

- Serveur HTTP (Nginx, Apache, ou serveur de développement)
- Backend compatible SavQonnect (ou backend personnalisé avec endpoints documentés)

### Installation rapide

1. **Cloner le repository** :
   ```bash
   git clone https://github.com/Zine76/vitrine.git
   cd vitrine
   ```

2. **Configurer l'URL du backend** :
   Éditer `app.js` et modifier la variable `API_BASE_URL` :
   ```javascript
   const API_BASE_URL = 'https://votre-backend.example.com/api';
   ```

3. **Servir les fichiers** :
   ```bash
   # Avec Python
   python -m http.server 8000
   
   # Avec Node.js
   npx http-server -p 8000
   
   # Avec Nginx (production)
   # Copier les fichiers dans /var/www/vitrine/
   ```

4. **Accéder à Vitrine** :
   Ouvrir `http://localhost:8000?room=A-1750` dans le navigateur

---

## 📖 Utilisation

### Mode usager (par défaut)

1. Accéder à l'URL de Vitrine avec le paramètre `room` :
   ```
   https://vitrine.example.com?room=A-1750
   ```

2. Décrire le problème dans le champ de texte

3. Cliquer sur "Signaler" ou appuyer sur Entrée

4. Le système analyse automatiquement et peut :
   - Proposer des solutions
   - Exécuter des actions automatiques
   - Créer un ticket d'intervention

### Mode technicien (caché)

**Méthodes d'accès** :
- **Raccourci clavier** : `Ctrl+Shift+T` (configurable)
- **URL avec paramètre** : `?mode=tech` ou `?key=technician`
- **Clic spécial** : Double-clic sur le logo ou titre

**Ressources disponibles** :
- Plan PDF de la salle
- Documentation des équipements
- Historique des interventions
- Outils de diagnostic

---

## 🔌 Intégration backend

### Endpoints requis

Vitrine nécessite les endpoints suivants (tous publics, sans authentification) :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/copilot/vitrine` | POST | Analyser un problème |
| `/api/copilot/vitrine-create-ticket` | POST | Créer un ticket |
| `/api/copilot/vitrine-list-tickets` | GET | Lister les tickets |
| `/api/copilot/vitrine-update-ticket` | POST | Mettre à jour un ticket |
| `/api/podio/vitrine-room-info` | GET | Informations de la salle |
| `/api/copilot/vitrine-monitoring-tickets` | GET | Tickets pour widget |
| `/api/copilot/vitrine-monitoring-devices` | GET | Équipements de la salle |
| `/api/tickets/chat/events/vitrine` | GET | Événements SSE (temps réel) |

### Configuration CORS

Le backend doit activer CORS pour tous les endpoints Vitrine :
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
```

### Documentation complète

Pour la documentation technique complète (endpoints détaillés, formats de requête/réponse, architecture), voir [HANDOVER_VITRINE.md](HANDOVER_VITRINE.md).

---

## 📁 Structure du projet

```
vitrine/
├── index.html              # Point d'entrée principal
├── app.js                  # Logique JavaScript principale
├── room-plans.js           # Gestion des plans PDF (mode technicien)
├── style.css               # Styles principaux
├── sidebar.css             # Styles de la sidebar
├── assets/                 # Ressources (icônes, images, fonts)
│   ├── icons/
│   ├── images/
│   └── fonts/
├── README.md               # Ce fichier
└── HANDOVER_VITRINE.md     # Documentation technique complète
```

---

## 🛠️ Développement

### Structure du code

- **HTML** : Structure de la page, conteneurs, templates
- **CSS** : Styles, responsive design, thème
- **JavaScript** : Logique métier, appels API, rendu

### Configuration

Modifier `app.js` pour configurer :
- URL du backend (`API_BASE_URL`)
- Endpoints API (`ENDPOINTS`)
- Timeouts et retry (`TIMEOUTS`, `RETRY`)
- Mode technicien (`TECHNICIAN_MODE`)

---

## 📝 Notes importantes

### Fonctionnalité "Appel" supprimée

La fonctionnalité **"Appel"** (appel téléphonique direct au support) a été **supprimée** de Vitrine. Les utilisateurs doivent désormais utiliser le système de tickets et de chat intégré pour contacter le support technique.

### Compatibilité backend

Vitrine peut fonctionner avec n'importe quel backend qui expose les endpoints documentés. Voir la section "Intégration backend" pour plus de détails.

---

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👤 Auteur

**Zineddine Chergui** - UQAM

---

## 🔗 Liens utiles

- **Repository GitHub** : [https://github.com/Zine76/vitrine](https://github.com/Zine76/vitrine)
- **Documentation technique** : [HANDOVER_VITRINE.md](HANDOVER_VITRINE.md)
- **Backend SavQonnect** : [https://github.com/Zine76/savqonnect-core](https://github.com/Zine76/savqonnect-core)

---

## 📞 Support

Pour toute question ou problème :
- Ouvrir une [issue](https://github.com/Zine76/vitrine/issues) sur GitHub
- Consulter la [documentation technique](HANDOVER_VITRINE.md)

---

**Dernière mise à jour** : 2025-01-XX

