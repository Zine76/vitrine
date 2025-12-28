# 🚀 Guide de déploiement - Vitrine

Ce guide explique comment déployer la page Vitrine sur différents hébergeurs web.

---

## 📋 Prérequis

- Fichiers Vitrine (HTML, CSS, JS, assets)
- Backend SavQonnect (ou compatible) accessible
- Configuration de l'URL du backend dans `app.js`

---

## 🌐 Option 1 : GitHub Pages (Recommandé - Gratuit)

### Avantages
- ✅ Gratuit
- ✅ HTTPS automatique
- ✅ Déploiement automatique via Git
- ✅ CDN intégré

### Étapes

1. **Vérifier que le repository est sur GitHub** :
   ```bash
   git remote -v
   # Doit afficher : origin  https://github.com/Zine76/vitrine.git
   ```

2. **Activer GitHub Pages** :
   - Aller sur https://github.com/Zine76/vitrine
   - Settings → Pages
   - Source : `main` branch
   - Folder : `/ (root)`
   - Save

3. **Créer un fichier `index.html`** (si nécessaire) :
   ```bash
   # Si le fichier principal s'appelle app.js, créer index.html qui charge app.js
   ```

4. **Configurer l'URL du backend** :
   Éditer `app.js` et modifier :
   ```javascript
   const API_BASE_URL = 'https://votre-backend.example.com/api';
   ```

5. **Commit et push** :
   ```bash
   git add .
   git commit -m "chore: Configuration pour GitHub Pages"
   git push origin main
   ```

6. **Accéder à Vitrine** :
   - URL : `https://zine76.github.io/vitrine/`
   - Ou avec un domaine personnalisé (optionnel)

---

## 🌐 Option 2 : Netlify (Gratuit - Très simple)

### Avantages
- ✅ Gratuit (avec limitations)
- ✅ HTTPS automatique
- ✅ Déploiement continu depuis GitHub
- ✅ CDN global

### Étapes

1. **Créer un compte Netlify** :
   - Aller sur https://www.netlify.com
   - Sign up avec GitHub

2. **Nouveau site depuis Git** :
   - Cliquer sur "Add new site" → "Import an existing project"
   - Connecter GitHub
   - Sélectionner le repository `vitrine`
   - Branch : `main`
   - Build command : (laisser vide - site statique)
   - Publish directory : `/` (root)

3. **Déploiement automatique** :
   - Netlify déploie automatiquement à chaque push sur `main`
   - URL : `https://random-name-123.netlify.app`

---

## 🌐 Option 3 : Vercel (Gratuit - Très rapide)

### Avantages
- ✅ Gratuit
- ✅ HTTPS automatique
- ✅ Déploiement ultra-rapide
- ✅ CDN global (Edge Network)

### Étapes

1. **Déployer depuis GitHub** :
   - Aller sur https://vercel.com
   - Sign up avec GitHub
   - Import project → Sélectionner `vitrine`
   - Framework Preset : Other
   - Root Directory : `./`
   - Build Command : (laisser vide)
   - Output Directory : `./`

2. **Déploiement automatique** :
   - Vercel déploie automatiquement à chaque push
   - URL : `https://vitrine-xxx.vercel.app`

---

## 🌐 Option 4 : Serveur web classique (Nginx)

### Étapes

1. **Installer Nginx** :
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Copier les fichiers** :
   ```bash
   sudo cp -r vitrine/* /var/www/vitrine/
   sudo chown -R www-data:www-data /var/www/vitrine
   ```

3. **Configurer Nginx** :
   Créer `/etc/nginx/sites-available/vitrine` :
   ```nginx
   server {
       listen 80;
       server_name vitrine.uqam.ca;
       
       root /var/www/vitrine;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Activer le site** :
   ```bash
   sudo ln -s /etc/nginx/sites-available/vitrine /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Configurer HTTPS** :
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d vitrine.uqam.ca
   ```

---

## ⚙️ Configuration importante

### 1. Configurer l'URL du backend

Éditer `app.js` et modifier :
```javascript
const CONFIG = {
  API_BASE_URL: 'https://savqonnect.uqam.ca/api',
  // ...
};
```

### 2. Gérer CORS côté backend

Le backend doit autoriser les requêtes depuis le domaine de Vitrine.

---

## 🔒 Sécurité

### HTTPS obligatoire

- **GitHub Pages** : HTTPS automatique
- **Netlify/Vercel** : HTTPS automatique
- **Nginx** : Utiliser Let's Encrypt (certbot)

---

## 🧪 Tests après déploiement

1. **Vérifier l'accès** : Ouvrir l'URL de déploiement
2. **Tester les fonctionnalités** : Signalement, Monitoring, Mode technicien
3. **Vérifier les appels API** : DevTools → Network
4. **Tester sur mobile** : Vérifier le responsive

---

## 📝 Checklist de déploiement

- [ ] Fichiers copiés sur le serveur
- [ ] URL du backend configurée dans `app.js`
- [ ] CORS configuré côté backend
- [ ] HTTPS activé
- [ ] Tests fonctionnels effectués

---

**Dernière mise à jour** : 2025-01-XX

