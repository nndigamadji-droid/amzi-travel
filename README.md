# AMZI TRAVEL

Site d’agence au départ du Tchad, catalogue administrable, devis persistants et espace de gestion protégé. Le bleu, l’or, le logo et les destinations prioritaires sont conservés.

## Démarrage

Node.js 24 ou ultérieur, sans bibliothèque à installer. Exécuter `node server.mjs` ou double-cliquer sur `Demarrer-AMZI.cmd`.

Site : http://127.0.0.1:4180 — Gestion : http://127.0.0.1:4180/admin/.

Le premier administrateur choisit lui-même son identifiant et un mot de passe d’au moins 14 caractères. Aucun compte par défaut n’est installé. Voir GUIDE_UTILISATION.md pour les opérations de l’agence.

## Fonctions

Catalogue SQLite chargé par API, filtres par pays et projet, fiches et préremplissage du devis. Le formulaire propose e-mail ou téléphone/WhatsApp et demande la ville de départ au Tchad. Une référence est confirmée après insertion transactionnelle seulement.

La gestion fournit recherche, filtres, notes, statuts, historique et export CSV. L’administrateur crée des comptes ; le conseiller suit les demandes ; l’éditeur gère les destinations sans accéder aux coordonnées des clients. Le catalogue permet ajout, modification et mise en brouillon. Les valeurs affichées sont échappées.

Sessions opaques en base, cookie HttpOnly SameSite Strict, expiration après huit heures, contrôle CSRF, origine HTTP contrôlée, limite de taille et de fréquence, mots de passe hachés avec scrypt et sel individuel. Les requêtes SQLite utilisent des paramètres. Seuls les fichiers publics autorisés sont servis ; la base, les secrets, les tests et les sources du serveur ne sont pas accessibles par HTTP.

Les coordonnées fournies sont intégrées : Sounarow@gmail.com, +235 66 57 05 79 et +235 69 56 02 56. Les liens de contact ne constituent pas un envoi automatique.

## Configuration

Copier `.env.example` en `.env` et lancer `node --env-file=.env server.mjs`. Le lanceur Windows charge ce fichier s’il existe. `PORT` vaut 4180, `AMZI_DATA_DIR` désigne un dossier privé de données. Le serveur écoute uniquement sur 127.0.0.1.

Les notifications nécessitent RESEND_API_KEY, NOTIFY_FROM et NOTIFY_TO. Le destinataire par défaut est Sounarow@gmail.com et l’expéditeur doit être vérifié chez Resend. Sans configuration, les demandes restent enregistrées et consultables, avec le statut Non configurée.

La file est persistante, un échec ne supprime pas le dossier et une relance est possible depuis la gestion. Cinq tentatives automatiques au maximum sont prévues, espacées d’au moins une minute. Une notification ne contient que la référence et le lien de gestion. Le statut envoyé signifie accepté par le service, pas distribué ou lu. Aucun e-mail externe n’a été envoyé pendant la vérification.

## Sauvegardes

`node scripts/backup.mjs` crée un instantané cohérent de SQLite. Le serveur crée un instantané quotidien dans data/backups et conserve les instantanés automatiques trente jours. Les sauvegardes manuelles ne sont pas purgées automatiquement.

Conserver une copie distincte des sources et des photographies. Les fichiers de données ne sont pas chiffrés par le programme ; utiliser un disque chiffré et un support de sauvegarde protégé avant exploitation réelle. Voir le guide pour restaurer dans un nouveau dossier sans écraser les données existantes.

## Vérification

`node --test tests/*.test.mjs` utilise des dossiers temporaires séparés de la base de l’agence. Couverture : catalogue, dates, caractères spéciaux, persistance, doublons, validation serveur, accès, CSRF, rôles, export, notifications en échec, limitation de fréquence, redémarrage et reprise depuis un instantané. Les comptes fictifs des tests ne sont pas installés dans la base de livraison.

Les essais visuels et fonctionnels du navigateur sont distincts des essais sur téléphone physique, d’un audit complet d’accessibilité et d’un audit de sécurité indépendant.

## Limites avant publication

La livraison est locale. Aucun paiement, billet émis, réservation fournisseur, compte voyageur, blog ou traduction n’est intégré. Le CMS couvre les destinations ; les autres textes restent dans les fichiers. La création des comptes est fournie ; désactivation, modification des rôles, récupération du mot de passe et authentification multifacteur restent à ajouter avant exploitation élargie. Le tableau charge les 2 000 dernières demandes ; l’export porte sur l’ensemble.

La mise en ligne nécessite le domaine, l’hébergement et un reverse proxy HTTPS, l’identité juridique et l’adresse postale du siège, les conditions commerciales, les durées de conservation, la protection des sauvegardes et les droits des visuels. Le mode NODE_ENV=production refuse un démarrage sans compte initial et sans PUBLIC_ORIGIN en HTTPS. Le proxy local doit transmettre ce nom d’hôte ; les en-têtes d’adresse cliente ne sont pas approuvés automatiquement. Le programme ne configure ni le proxy, ni le certificat, ni l’hébergement. Le site reste non indexable.

## Visuels et sources

Logo fourni conservé sans modification. Photographies Unsplash illustratives, références dans assets/sources.json. La police DM Sans du site public est servie localement. Aucun outil publicitaire ou de mesure d’audience.

Références techniques : [SQLite Node.js](https://nodejs.org/api/sqlite.html), [cryptographie Node.js](https://nodejs.org/api/crypto.html), [API Resend](https://resend.com/docs/api-reference/emails/send-email).

## Version 2 aviation animée

Refonte de la page publique à partir des trois captures fournies : première référence pour la composition, grande image aéronautique, ciel bleu, typographie sans empattement, angles arrondis, recherche immédiate, cartes de destinations défilantes et services avec panneau bleu central. Aucun logo de partenaire, avis, prix ou rabais des références n’est attribué à AMZI TRAVEL.

GSAP 3.13.0 est fourni localement dans assets/gsap.js avec son en-tête de licence. Les modules motion.js et motion-state.mjs pilotent l’entrée de l’avion, son mouvement, dix messages accompagnés de photographies, avec le grand avion au premier plan. La préférence de réduction des animations est respectée, sans changer les paramètres du système. L’avion détouré est un asset généré pour le projet ; sa provenance est conservée. Le ciel est une photographie Unsplash. Ces visuels sont des illustrations et ne désignent pas une compagnie partenaire.

Les fonctions du catalogue et du devis, les rôles et la protection des modifications en cours restent en place. Tests : node --test tests/*.test.mjs. Le carrousel dispose de boutons précédent/suivant et d’un conteneur défilable au clavier. Le site demeure local ; cette refonte ne configure aucun hébergement.


## Pages dédiées

Les menus ouvrent /destinations, /agence, /services et /devis. Le serveur rend ces pages à partir du même index.html avec lib/pages.mjs et pages.css, sans modifier le catalogue ni les dossiers. Le catalogue transmet destination, service et projet au formulaire de la page devis. Les changements de navigation nécessitent le serveur Node ; les fichiers ne doivent pas être ouverts directement par file://.


## Dépôt GitHub

Les sources sont versionnées sur la branche `main`. Les dossiers `data/`, `backups/`, `verification/`, les bases SQLite et les fichiers `.env` sont exclus. Le fichier `.env.example` ne contient aucune clé. Les références graphiques de travail ne font pas partie du dépôt.

La publication des sources sur GitHub ne déploie pas le serveur. GitHub Pages seul ne peut pas exécuter les fonctions Node.js et SQLite nécessaires au catalogue et aux devis.

Une vérification automatique lance la suite de tests sous Node.js 24 à chaque publication de code et chaque demande de fusion.


## Préparation Netlify + Hostinger

La configuration conserve le site complet : Netlify sert les pages, Hostinger exécute le serveur Node.js 24 et conserve SQLite. La commande `npm run build:netlify` nécessite `AMZI_BACKEND_ORIGIN` et prépare uniquement les fichiers publics. Voir [le guide de déploiement](docs/deploiement-netlify-hostinger.md). La configuration est prête ; les accès aux comptes et la validation de l’offre Hostinger restent nécessaires avant publication.


## Variante gratuite Render + Netlify

Le serveur peut fonctionner avec `scripts/start-render-free.mjs` et un état distant chiffré conservé dans Netlify Blobs. La base cloud est séparée des données locales. Le déploiement utilise le plan Render `free`, sans disque payant. Voir [la configuration, les contrôles et les limites](docs/deploiement-render-gratuit.md).
