# Déploiement Netlify et Hostinger

## Architecture préparée
Netlify sert les pages publiques et les fichiers de l’espace agence. Les requêtes `/api/*` sont transmises à Hostinger par une réécriture interne. Le navigateur garde une origine unique : les sessions, le cookie sécurisé et les contrôles d’origine sont conservés.

Hostinger doit pouvoir exécuter Node.js 24 ou ultérieur et conserver le dossier SQLite sur un stockage persistant. La base actuelle reste locale ; aucune donnée client n’est incluse dans les sources ou dans le dossier public.

## Paramètres Hostinger
- `NODE_ENV=production`
- `PUBLIC_ORIGIN=https://NOM-DU-SITE.netlify.app`
- `AMZI_BACKEND_HOST=HOTE-HTTPS-DU-SERVEUR` (sans protocole ni chemin)
- `AMZI_DATA_DIR=CHEMIN-PRIVE-PERSISTANT`
- `AMZI_HOST=0.0.0.0` uniquement si l’hébergement demande une écoute réseau ; derrière un proxy local, conserver `127.0.0.1`.

Le serveur refuse le démarrage en production sans administrateur initial. Le compte doit être initialisé dans un environnement privé avant l’exposition ; aucun compte par défaut ne sera créé. Les secrets et la base ne doivent jamais entrer dans Git ou dans le répertoire public Netlify.

## Paramètres Netlify
`AMZI_BACKEND_ORIGIN` doit contenir l’origine HTTPS du serveur Hostinger. La commande de préparation refuse de construire sans cette adresse. `netlify.toml` définit Node.js 24, la commande de préparation et le dossier `dist`. Le script utilise une liste fermée de fichiers publics et génère les quatre pages dédiées, les règles de sécurité et le relais API.

## Vérification avant ouverture
Contrôler les quatre pages, le catalogue réel via `/api/catalog`, la connexion et les rôles de l’espace agence, un devis dans un environnement de contrôle séparé, sa persistance après redémarrage et l’inaccessibilité de SQLite et des secrets par HTTP. Aucune commande de déploiement n’est une preuve suffisante à elle seule.

## État
Configuration préparée ; publication en attente des connexions Netlify et Hostinger et de la vérification de l’offre Hostinger. Aucune URL publique ne doit être annoncée avant validation du serveur et du relais API.
