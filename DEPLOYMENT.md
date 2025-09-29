# 🚀 Déploiement sur DigitalOcean App Platform

Ce guide explique comment déployer l'application SteamCity IoT Platform sur DigitalOcean App Platform.

## 📋 Prérequis

- Compte DigitalOcean avec accès à App Platform
- Repository GitHub `steamcity/steamcity_io` configuré
- Application préparée avec les optimisations de production

## 🏗️ Méthode 1: Déploiement automatique (Recommandé)

### Via l'interface DigitalOcean

1. **Connexion à DigitalOcean**
   - Accédez à [cloud.digitalocean.com](https://cloud.digitalocean.com)
   - Naviguez vers "Apps" dans le menu de gauche

2. **Création de l'App**
   - Cliquez sur "Create App"
   - Sélectionnez "GitHub" comme source
   - Autorisez l'accès au repository `steamcity/steamcity_io`
   - Sélectionnez la branche `main`

3. **Configuration automatique**
   - App Platform détectera automatiquement qu'il s'agit d'une app Node.js
   - La configuration sera basée sur `.do/app.yaml`

4. **Variables d'environnement**
   ```
   NODE_ENV=production
   PORT=8080
   ```

5. **Déploiement**
   - Cliquez sur "Create Resources"
   - Le déploiement prendra 3-5 minutes

## 🏗️ Méthode 2: Déploiement via CLI

### Installation de doctl

```bash
# macOS avec Homebrew
brew install doctl

# Autres systèmes - téléchargez depuis:
# https://github.com/digitalocean/doctl/releases
```

### Configuration

```bash
# Authentification
doctl auth init

# Créer l'app depuis le fichier de configuration
doctl apps create --spec .do/app.yaml

# Suivre le statut du déploiement
doctl apps list
```

## 🔧 Configuration de production

### Variables d'environnement requises

| Variable | Valeur | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Mode de production |
| `PORT` | `8080` | Port utilisé par App Platform |

### Domaine personnalisé (optionnel)

1. Dans l'interface App Platform, allez dans "Settings"
2. Section "Domains"
3. Ajoutez votre domaine personnalisé
4. Configurez les enregistrements DNS selon les instructions

## 📊 Monitoring et logs

### Accès aux logs
```bash
# Via CLI
doctl apps logs <app-id>

# Ou via l'interface web dans l'onglet "Runtime Logs"
```

### Métriques disponibles
- CPU et RAM usage
- Requêtes HTTP
- Temps de réponse
- Erreurs

## 🔄 Déploiement continu

### Automatique
- Chaque push sur `main` déclenche un déploiement automatique
- Les builds prennent environ 2-3 minutes

### Manuel
```bash
# Forcer un redéploiement
doctl apps create-deployment <app-id>
```

## 🛠️ Dépannage

### Problèmes courants

1. **App ne démarre pas**
   - Vérifiez les logs: `doctl apps logs <app-id>`
   - Vérifiez que `PORT` est défini sur `8080`

2. **Assets statiques non trouvés**
   - Vérifiez que le dossier `public` est bien inclus
   - Contrôlez le `.dockerignore`

3. **API non accessible**
   - Vérifiez les routes dans `src/index.js`
   - Confirmez que le health check fonctionne: `/api/health`

### Health check
L'application expose un endpoint de santé sur `/api/health`:
```json
{
  "status": "OK",
  "message": "SteamCity IoT Platform is running",
  "version": "3.0.0",
  "timestamp": "2024-..."
}
```

## 📈 Performance

### Optimisations incluses
- **Compression** des assets statiques
- **Cache headers** pour les fichiers statiques (24h)
- **Security headers** en production
- **CORS** configuré pour les domaines de production

### Scaling
- Instance par défaut: `basic-xxs` (0.5 vCPU, 0.5GB RAM)
- Scaling automatique selon la charge
- Possibilité d'ajuster dans les paramètres de l'app

## 💰 Coûts estimés

| Plan | Spécifications | Prix mensuel |
|------|----------------|--------------|
| Basic XXS | 0.5 vCPU, 0.5GB RAM | ~$5 USD |
| Basic XS | 1 vCPU, 1GB RAM | ~$12 USD |

*Prix indicatifs - consultez la tarification DigitalOcean pour les prix actuels*

## 📞 Support

- Documentation DigitalOcean App Platform: https://docs.digitalocean.com/products/app-platform/
- Support technique DigitalOcean via ticket
- Community forum: https://www.digitalocean.com/community/