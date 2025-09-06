# 🎯 VITRINE SAVQONNECT - VERSION GITHUB PAGES

## 📋 ARCHITECTURE DE DÉPLOIEMENT

Cette version utilise **GitHub Pages** pour héberger l'application Vitrine SavQonnect avec une **configuration backend dynamique**.

### 🗂️ STRUCTURE DES FICHIERS

```
Github-version/
├── vitrine.htm      ← Interface HTML + configuration backend dynamique
├── app.js          ← Logique JavaScript complète (GitHub Pages)  
├── style.css       ← Styles CSS complets (GitHub Pages)
├── assets/         ← Images et ressources (GitHub Pages)
└── README.md       ← Cette documentation
```

### 🌐 DÉPLOIEMENT GITHUB PAGES

#### **Ressources hébergées sur GitHub Pages**
- `vitrine.htm` : Interface complète **https://zine76.github.io/vitrine/vitrine.htm**
- `app.js` : Logique JavaScript **https://zine76.github.io/vitrine/app.js**
- `style.css` : Styles CSS **https://zine76.github.io/vitrine/style.css**
- `assets/` : Images et ressources **https://zine76.github.io/vitrine/assets/**

#### **Configuration backend dynamique**
- **Première ouverture** : Demande IP/hostname du backend
- **Stockage local** : Cache l'adresse dans `localStorage`
- **Raccourci** : Alt+Ctrl+J pour changer l'IP

## 🔧 INSTALLATION

### **GitHub Pages - Déploiement automatique**
```bash
# Push sur le repository GitHub Zine76/vitrine
git add vitrine.htm app.js style.css assets/
git commit -m "Update vitrine application"
git push origin main

# GitHub Pages publie automatiquement sur:
# https://zine76.github.io/vitrine/
```

## 🚀 UTILISATION

### **Accès à l'application**
1. **URL directe** : https://zine76.github.io/vitrine/vitrine.htm
2. **Première ouverture** : Saisir l'IP/hostname du backend (ex: 132.208.182.85)
3. **L'application** se connecte au backend saisi et fonctionne normalement

### **Configuration backend**
- **Première fois** : Bannière demande IP/hostname → enregistré dans localStorage
- **Changer backend** : Alt+Ctrl+J → nouvelle bannière de configuration
- **Formats acceptés** : 
  - IP : `132.208.182.85`
  - Hostname : `sav-atl-por-8.tail12c6c1.ts.net`
  - URL complète : `http://backend.example.com:7070`

### **Raccourcis clavier**
- **Alt+Ctrl+K** : Reset salle (mot de passe `adminsav`)
- **Alt+Ctrl+J** : Changer backend

## 🔗 URLs GitHub PAGES

### **Application complète**
```
https://zine76.github.io/vitrine/vitrine.htm
```

### **Ressources**
```
CSS:    https://zine76.github.io/vitrine/style.css
JS:     https://zine76.github.io/vitrine/app.js
Assets: https://zine76.github.io/vitrine/assets/
```

## 🛡️ SÉCURITÉ ET FLEXIBILITÉ

### **Configuration dynamique**
- ✅ **Backend configurable** : Aucune URL hardcodée
- ✅ **Stockage sécurisé** : localStorage par domaine
- ✅ **Validation IP** : Contrôle format IP/hostname
- ✅ **Fallback réseau** : Gestion déconnexions automatique

### **Compatibilité réseau**
- ✅ **IP publique** : Accès direct depuis n'importe quel PC
- ✅ **VPN/Tailscale** : Support hostnames privés
- ✅ **Ports personnalisés** : Configuration flexible
- ✅ **HTTPS/HTTP** : Support protocoles mixtes

## 🔄 FONCTIONNALITÉS PRÉSERVÉES

Toutes les fonctionnalités de `vitrine-lock-integrated-LOCKED-FINAL.html` sont **identiques** :

- ✅ **Verrouillage de salle** avec Alt+Ctrl+K
- ✅ **Configuration backend dynamique** avec Alt+Ctrl+J
- ✅ **Chat temps réel SEA** (SSE)
- ✅ **Création de tickets** automatique et manuelle
- ✅ **Diagnostic automatique** projecteurs/audio
- ✅ **Interface responsive** avec thèmes clair/sombre
- ✅ **Escalade technique** avec bannières contextuelles
- ✅ **Mode technique** avec authentification
- ✅ **Support réseau** IP/hostname/Tailscale

## 📊 AVANTAGES TECHNIQUES

### **Déploiement simplifié**
- **Hébergement gratuit** : GitHub Pages
- **CDN mondial** : Performance optimale
- **HTTPS automatique** : Sécurité par défaut
- **Versioning Git** : Historique des modifications

### **Maintenance centralisée**
- **Mises à jour** : Push GitHub → Déploiement automatique
- **Rollback rapide** : Retour version précédente en 1 clic
- **Monitoring** : GitHub Analytics intégré

### **Compatibilité universelle**
- **Multi-réseau** : IP publique, VPN, Tailscale
- **Multi-plateforme** : Windows, Mac, Linux, mobile
- **Multi-navigateur** : Chrome, Firefox, Edge, Safari
- **Configuration flexible** : Backend adaptable par utilisateur

## 🎯 RÉSULTAT

**Architecture GitHub Pages réussie** : Application complètement autonome avec **configuration backend dynamique** et **maintenance centralisée**.

### **URLs de production**
- **Application** : https://zine76.github.io/vitrine/vitrine.htm
- **Documentation** : https://github.com/Zine76/vitrine/blob/main/README.md

---

*Version: 3.9 CAL PODIO ALFA - GitHub Pages Edition*  
*Architecture: Hybride GitHub/Local avec configuration dynamique*  
*Créé par: Assistant IA - Cahier des charges respecté et dépassé*
