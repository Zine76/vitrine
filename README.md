# 🎯 Vitrine - Interface de diagnostic et monitoring audiovisuel

[![Version](https://img.shields.io/badge/version-1.2-blue.svg)](https://github.com/Zine76/vitrine)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production-brightgreen.svg)](https://github.com/Zine76/vitrine)
[![Brain](https://img.shields.io/badge/Brain-V1.2-purple.svg)](brain-integration.js)

> Interface web standalone pour signaler des problemes techniques dans les salles de classe de l'UQAM. Compatible avec n'importe quel backend similaire a SavQonnect.

---

## 📋 Vue d'ensemble

**Vitrine** est une page web standalone (HTML/CSS/JavaScript) concue pour permettre aux usagers (professeurs, etudiants, personnel) de signaler des problemes techniques dans les salles de classe de l'UQAM. La page fonctionne comme une interface publique de diagnostic et de monitoring, sans necessiter d'authentification.

### ⚠️ Double usage

Vitrine sert **a la fois les usagers ET les techniciens** :
- **Mode usager** : Interface publique pour signaler des problemes (vue par defaut)
- **Mode technicien** : Page cachee accessible via un raccourci/cle secrete, affichant des ressources techniques avancees (plans PDF de salle, documentation equipements, outils de diagnostic)

### 🎯 Probleme resolu

Vitrine permet de signaler rapidement des problemes audiovisuels (projecteur, son, ecran tactile, etc.) directement depuis la salle, sans avoir a contacter le support par telephone ou email. Le systeme analyse automatiquement le probleme via **Room Brain** et peut proposer des solutions automatiques ou creer des tickets d'intervention.

### ⚠️ Compatibilite backend

Vitrine est concue pour fonctionner avec **n'importe quel backend similaire a SavQonnect**. Elle communique exclusivement via des endpoints API REST publics (sans authentification), ce qui permet une integration flexible avec differents systemes de monitoring audiovisuel. La page est **agnostique du backend** tant que celui-ci expose les endpoints documentes.

---

## 🧠 Room Brain Integration V1.2

**Nouveaute 2026**: Vitrine integre maintenant **Room Brain V1.2** avec le paradigme **Evidence-First, Action-First, Escalate-Last**.

### Pipeline de diagnostic

```
COLLECTING -> DETECTING -> ACTING -> VERIFYING -> RESOLVED/ESCALATED
```

### Fonctionnalites V1.2

| Fonctionnalite | Description |
|----------------|-------------|
| **State Machine** | Pipeline deterministe avec etats clairs |
| **Evidence Panel** | Affichage: Ce que je vois / Ce que j'ai fait / Resultat |
| **Confidence Indicators** | High / Medium / Low avec code couleur |
| **EvidencePack** | Diagnostic enrichi pour tickets |
| **Auto-Actions** | Corrections automatiques avec verification |
| **Smart Escalation** | Escalade uniquement apres echec des actions |

### Activation

```javascript
// Via console navigateur
BrainIntegration.setEnabled(true);

// Via localStorage
localStorage.setItem('vitrine.uses.brain', 'true');

// Via window global
window.VITRINE_USES_BRAIN = true;
```

### Test V1.2

```javascript
// Tester escalade V1.1
BrainIntegration.testEscalation();

// Tester state machine V1.2
BrainIntegration.testStateMachine();
```

---

## ✨ Fonctionnalites

### Pour les usagers

- ✅ **Signalement de probleme** : Interface simple pour decrire un probleme technique
- ✅ **Analyse Brain automatique** : Room Brain analyse le probleme et propose des solutions
- ✅ **Actions automatiques** : Resolution automatique si confiance >= 70%
- ✅ **Evidence Panel** : Affichage transparent de ce que Brain voit et fait
- ✅ **Creation de tickets** : Generation automatique de tickets d'intervention enrichis
- ✅ **Chat integre** : Communication bidirectionnelle avec le support technique
- ✅ **Monitoring en temps reel** : Affichage de l'etat des equipements et tickets en cours

### Pour les techniciens (mode cache)

- 🔧 **Plan PDF de la salle** : Affichage du plan technique de la salle
- 🔧 **Documentation equipements** : Acces aux fiches techniques et schemas
- 🔧 **Historique des interventions** : Consultation des interventions precedentes
- 🔧 **Details techniques** : Adresses IP, modeles, firmware des equipements
- 🔧 **Outils de diagnostic** : Tests de connectivite et outils avances
- 🔧 **EvidencePack** : Diagnostic complet dans les tickets

---

## 🚀 Installation

### Prerequis

- Serveur HTTP (Nginx, Apache, ou serveur de developpement)
- Backend compatible SavQonnect (ou backend personnalise avec endpoints documentes)

### Installation rapide

1. **Cloner le repository** :
   ```bash
   git clone https://github.com/Zine76/vitrine.git
   cd vitrine
   ```

2. **Configurer l'URL du backend** :
   Editer `app.js` et modifier la variable `API_BASE_URL` :
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

4. **Acceder a Vitrine** :
   Ouvrir `http://localhost:8000?room=A-1750` dans le navigateur

---

## 📖 Utilisation

### Mode usager (par defaut)

1. Acceder a l'URL de Vitrine avec le parametre `room` :
   ```
   https://vitrine.example.com?room=A-1750
   ```

2. Decrire le probleme dans le champ de texte

3. Cliquer sur "Signaler" ou appuyer sur Entree

4. **Room Brain V1.2** analyse automatiquement et peut :
   - Afficher l'Evidence Panel (ce qu'il voit)
   - Executer des actions automatiques (unmute, power on, etc.)
   - Verifier le resultat des actions
   - Creer un ticket enrichi si necessaire

### Mode technicien (cache)

**Methodes d'acces** :
- **Raccourci clavier** : `Ctrl+Shift+T` (configurable)
- **URL avec parametre** : `?mode=tech` ou `?key=technician`
- **Clic special** : Double-clic sur le logo ou titre

**Ressources disponibles** :
- Plan PDF de la salle
- Documentation des equipements
- Historique des interventions
- Outils de diagnostic

---

## 🔌 Integration backend

### Endpoints requis

Vitrine necessite les endpoints suivants (tous publics, sans authentification) :

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/api/rooms/{room}/brain/diagnose` | POST | **Brain V1.2** - Diagnostic complet |
| `/api/copilot/vitrine` | POST | Analyser un probleme (fallback) |
| `/api/copilot/vitrine-create-ticket` | POST | Creer un ticket |
| `/api/copilot/vitrine-list-tickets` | GET | Lister les tickets |
| `/api/copilot/vitrine-update-ticket` | POST | Mettre a jour un ticket |
| `/api/podio/vitrine-room-info` | GET | Informations de la salle |
| `/api/copilot/vitrine-monitoring-tickets` | GET | Tickets pour widget |
| `/api/copilot/vitrine-monitoring-devices` | GET | Equipements de la salle |
| `/api/tickets/chat/events/vitrine` | GET | Evenements SSE (temps reel) |

### Brain V1.2 Response Format

```json
{
  "state": "ESCALATED",
  "correlation_id": "brain-xxx-123",
  "overall_confidence": 0.85,
  "vitrine_display": {
    "what_i_see": "Microphone TCC2 en mode mute",
    "what_i_did": "Tentative unmute via SSC",
    "result": "Echec - appareil ne repond pas",
    "why_escalated": "Action automatique echouee",
    "confidence": "Medium"
  },
  "evidence_pack": {
    "anomalies_detected": [...],
    "actions_attempted": [...],
    "final_conclusion": "..."
  },
  "brain_decision": {
    "decision": "escalate",
    "confidence": 0.85,
    "reasoning": "..."
  }
}
```

### Configuration CORS

Le backend doit activer CORS pour tous les endpoints Vitrine :
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
```

### Documentation complete

Pour la documentation technique complete (endpoints detailles, formats de requete/reponse, architecture), voir [HANDOVER_VITRINE.md](HANDOVER_VITRINE.md).

---

## 📁 Structure du projet

```
vitrine/
├── vitrine.html            # Point d'entree principal
├── app.js                  # Logique JavaScript principale
├── brain-integration.js    # Integration Room Brain V1.2
├── room-plans.js           # Gestion des plans PDF (mode technicien)
├── graphSearch.js          # Recherche graphique
├── style.css               # Styles principaux
├── sidebar.css             # Styles de la sidebar
├── chat-welcome.css        # Styles du chat
├── assets/                 # Ressources (icones, images, fonts)
│   ├── icons/
│   ├── images/
│   └── fonts/
├── README.md               # Ce fichier
├── DEPLOYMENT.md           # Guide de deploiement
└── HANDOVER_VITRINE.md     # Documentation technique complete
```

---

## 🛠️ Developpement

### Structure du code

- **HTML** : Structure de la page, conteneurs, templates
- **CSS** : Styles, responsive design, theme
- **JavaScript** : Logique metier, appels API, rendu
- **brain-integration.js** : Integration Room Brain V1.2

### Configuration

Modifier `app.js` pour configurer :
- URL du backend (`API_BASE_URL`)
- Endpoints API (`ENDPOINTS`)
- Timeouts et retry (`TIMEOUTS`, `RETRY`)
- Mode technicien (`TECHNICIAN_MODE`)

### Brain Integration

Modifier `brain-integration.js` pour configurer :
- `BRAIN_TIMEOUT_MS` : Timeout API Brain (defaut: 15s)
- `BRAIN_API_VERSION` : Version API (1.2)
- Feature flag via `VITRINE_USES_BRAIN`

---

## 📝 Notes importantes

### Fonctionnalite "Appel" supprimee

La fonctionnalite **"Appel"** (appel telephonique direct au support) a ete **supprimee** de Vitrine. Les utilisateurs doivent desormais utiliser le systeme de tickets et de chat integre pour contacter le support technique.

### Compatibilite backend

Vitrine peut fonctionner avec n'importe quel backend qui expose les endpoints documentes. Voir la section "Integration backend" pour plus de details.

### Brain V1.2 Fallback

Si Room Brain n'est pas disponible (timeout, erreur), Vitrine retourne automatiquement au flux Copilot classique.

---

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de details.

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

Pour toute question ou probleme :
- Ouvrir une [issue](https://github.com/Zine76/vitrine/issues) sur GitHub
- Consulter la [documentation technique](HANDOVER_VITRINE.md)

---

## Changelog

### V1.2 (2026-01-18)
- **NEW**: Room Brain V1.2 avec state machine
- **NEW**: Evidence Panel UI (Ce que je vois / Ce que j'ai fait / Resultat)
- **NEW**: Indicateurs de confiance (High/Medium/Low)
- **NEW**: EvidencePack pour tickets enrichis
- **NEW**: Fonction testStateMachine() pour tests
- **FIX**: Compatibilite encodage (caracteres ASCII)

### V1.1 (2025-12)
- Integration Room Brain initiale
- Support brain_decision format
- Auto-fix avec verification

### V1.0 (2025-09)
- Version initiale
- Integration Copilot
- Mode usager et technicien

---

**Derniere mise a jour** : 2026-01-18

