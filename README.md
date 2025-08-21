# 🎯 VITRINE SAVQONNECT - VERSION GITHUB HYBRIDE

## 📋 ARCHITECTURE DE DÉPLOIEMENT

Cette version sépare l'application Vitrine SavQonnect en **3 fichiers distincts** pour un déploiement hybride **GitHub/Local**.

### 🗂️ STRUCTURE DES FICHIERS

```
Github-version/
├── vitrine.html     ← Fichier LOCAL (PC salles) avec configuration réseau
├── app.js          ← Fichier GITHUB avec logique JavaScript pure  
├── style.css       ← Fichier GITHUB avec styles CSS purs
└── README.md       ← Cette documentation
```

### 🌐 DÉPLOIEMENT HYBRIDE

#### **GitHub (Ressources statiques)**
- `app.js` : Logique JavaScript pure, **AUCUNE URL backend**
- `style.css` : Styles CSS complets, **neutralité réseau**
- `assets/` : Images et ressources (déjà sur GitHub)

#### **Local (PC des salles)**
- `vitrine.html` : Interface + configuration réseau spécifique UQAM

## ⚙️ CONFIGURATION RÉSEAU

### **Backend automatique avec fallback intelligent**
1. **Primaire** : `C46928_DEE.ddns.uqam.ca:7070` (DDNS UQAM)
2. **Fallback** : `132.208.182.90:7070` (IP directe)

### **Détection automatique**
```javascript
detectBestBackend()  // Teste DDNS → IP directe si échec
```

## 🔧 INSTALLATION

### **1. GitHub - Upload des ressources**
```bash
# Upload sur GitHub Zine76/vitrine
- app.js
- style.css  
- assets/ (déjà existant)
```

### **2. PC Salles - Déploiement local**
```bash
# Copier uniquement vitrine.html sur chaque PC
cp vitrine.html /path/to/local/pc/
```

## 🚀 UTILISATION

### **Ouverture de l'application**
1. Ouvrir `vitrine.html` en local sur le PC de la salle
2. L'application charge automatiquement CSS/JS depuis GitHub
3. La configuration réseau reste locale au PC (VPN UQAM)

### **Avantages de cette architecture**
- ✅ **Maintenance centralisée** : CSS/JS sur GitHub
- ✅ **Configuration locale** : Réseau adapté à chaque PC
- ✅ **Neutralité réseau** : Aucune URL dans les fichiers GitHub
- ✅ **Fallback intelligent** : DDNS → IP directe automatique
- ✅ **Compatibilité VPN** : Fonctionne avec Cisco VPN UQAM

## 🔗 URLS DE CHARGEMENT

### **CSS GitHub**
```html
<link href="https://raw.githubusercontent.com/Zine76/vitrine/refs/heads/main/style.css" rel="stylesheet"/>
```

### **JavaScript GitHub**
```html
<script src="https://raw.githubusercontent.com/Zine76/vitrine/refs/heads/main/app.js"></script>
```

### **Assets GitHub**
```html
<img src="https://github.com/Zine76/vitrine/raw/main/assets/Vitrine.png" alt="Vitrine">
```

## 🛡️ SÉCURITÉ ET NEUTRALITÉ

### **Validation de neutralité réseau**
- ❌ **Aucune URL backend** dans `app.js`
- ❌ **Aucune URL backend** dans `style.css`
- ✅ **Configuration locale** dans `vitrine.html` uniquement

### **Backend configuré localement**
```javascript
// Dans vitrine.html uniquement
var DEV_BASE = 'https://C46928_DEE.ddns.uqam.ca:7070';
var FALLBACK_BASE = 'https://132.208.182.90:7070';
```

## 🔄 FONCTIONNALITÉS PRÉSERVÉES

Toutes les fonctionnalités de `vitrine-lock-integrated-LOCKED-FINAL.html` sont **identiques** :

- ✅ Verrouillage de salle
- ✅ API PATCH v6 (gestion fetch/XHR)
- ✅ Chat temps réel (SSE)
- ✅ Création de tickets
- ✅ Interface complète
- ✅ Fallback réseau intelligent

## 📊 AVANTAGES TECHNIQUES

### **Maintenance**
- **Centralisée** : Modifications CSS/JS via GitHub
- **Décentralisée** : Configuration réseau par PC

### **Performance**
- **Cache CDN** : GitHub sert les ressources statiques
- **Réseau local** : Backend accessible en VPN UQAM

### **Évolutivité**
- **Mises à jour** : Push GitHub → Actualisation automatique
- **Compatibilité** : Adaptable à différents réseaux

## 🎯 RÉSULTAT

**Mission accomplie** : Refactorisation réussie avec **fonctionnalité identique** et **architecture distribuée propre**.

---

*Version: 3.9 CAL PODIO ALFA - GitHub Edition*  
*Créé par: Assistant IA - Cahier des charges respecté*
