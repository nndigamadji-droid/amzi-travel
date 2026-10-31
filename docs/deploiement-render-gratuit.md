# AMZI — Render gratuit et Netlify

## Architecture
Les pages et les fichiers de gestion sont servis par Netlify. Les appels `/api/*` sont relayés à un service Render Free. Aucun disque Render payant n’est utilisé.

La base locale de l’agence n’est pas copiée. Une base cloud distincte reçoit le catalogue initial et un compte administrateur créé avec un secret aléatoire. Les coordonnées d’accès sont conservées dans un fichier privé local, hors Git.

## Persistance
La base cloud est chiffrée avec AES-256-GCM avant transfert vers un magasin Netlify Blobs privé. La clé de chiffrement reste dans la configuration secrète Render et le dossier privé de déploiement ; Netlify ne reçoit que la base chiffrée et un jeton propre au stockage AMZI.

Chaque opération repart de l’état distant. Les écritures sont sérialisées dans chaque instance, puis enregistrées avec contrôle de version atomique. Une confirmation HTTP et la référence de devis sont renvoyées seulement après la sauvegarde distante. En cas de conflit, le traitement est rejoué sur la version récente ; après trois conflits, l’utilisateur reçoit une erreur et conserve ses champs. Une indisponibilité du stockage ne crée pas de fausse confirmation.

Le serveur refuse les autres hôtes et les écritures provenant d’une autre origine. Les cookies restent sécurisés. Des compteurs persistants limitent les tentatives par action et par minute sur l’ensemble du service.

## Limites
Render Free peut se mettre en veille : la première ouverture de l’API peut être lente. Netlify et Render restent soumis à leurs quotas gratuits. L’état chiffré est limité à 4 Mo dans cette version ; au-delà, une migration est nécessaire et les nouvelles écritures échouent sans confirmation. Ce mécanisme convient à une petite activité ; il ne remplace pas une base gérée pour un trafic important.

Les notifications e-mail automatiques ne sont pas configurées. Les devis sont accessibles dans l’espace agence. L’instantané courant persiste à travers les déploiements, mais aucune rotation de sauvegardes historiques n’est encore fournie pour cette variante : prévoir des exports et une sauvegarde privée distincte avant une exploitation importante.

## Contrôles
Tests de chiffrement, refus sans secret, conflit de version, panne de stockage, doublon et reprise après redémarrage dans des dossiers temporaires. La base locale de l’agence n’est pas utilisée par ces tests.

## Configuration
Netlify : `AMZI_STATE_TOKEN`, installé uniquement dans la configuration de la fonction `amzi-state`. Render : `AMZI_STATE_URL`, `AMZI_STATE_TOKEN`, `AMZI_STATE_KEY`, `PUBLIC_ORIGIN`, fournis par fichier secret. Aucun de ces secrets ne doit entrer dans Git, les journaux ou le répertoire `dist`.

La commande Render est `node --env-file=/etc/secrets/amzi-runtime.env scripts/start-render-free.mjs`. Le contrôle de disponibilité utilise `/health` pour ne pas relire la base à chaque vérification.
