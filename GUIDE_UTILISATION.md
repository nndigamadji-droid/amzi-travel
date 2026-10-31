# Utiliser AMZI TRAVEL

## Démarrer le site

Double-cliquez sur `Demarrer-AMZI.cmd`. Laissez sa fenêtre ouverte pendant l’utilisation. Le site fonctionne avec Node.js 24 ou ultérieur ; aucune installation de bibliothèque supplémentaire n’est nécessaire.

Ouvrez http://127.0.0.1:4180 pour le site et http://127.0.0.1:4180/admin/ pour la gestion. Le site est accessible sur cet ordinateur ; cette adresse n’est pas une adresse publique à partager avec les clients.

Pour arrêter le service, utilisez Ctrl+C dans la fenêtre de démarrage. Évitez de lancer plusieurs exemplaires sur le même port.

## Créer votre premier accès

Lors de la première ouverture de l’espace agence, choisissez votre identifiant et un mot de passe personnel d’au moins 14 caractères. Vous devenez administrateur. Aucun compte de test ni mot de passe par défaut n’est installé dans la base de l’agence. Connectez-vous ensuite avec ces accès.

Les identifiants utilisent de 3 à 64 lettres sans accent, chiffres, points, tirets ou caractères `_` et `@`. Conservez le mot de passe dans un gestionnaire de mots de passe. Aucun service de récupération par e-mail n’est activé dans cette version.

## Traiter les demandes

Le visiteur choisit une destination et un service, précise sa ville de départ au Tchad et choisit une réponse par e-mail ou téléphone/WhatsApp. La demande est confirmée uniquement après enregistrement dans la base. Une référence commence par AMZI, suivie de la date et d’un identifiant.

Dans Demandes de devis, recherchez un nom, une destination ou une référence. Ouvrez le dossier, consultez les coordonnées et ajoutez vos notes internes. Les statuts sont reçue, en traitement, devis transmis, conclue et classée. Le journal indique l’auteur et la date des changements, dans le fuseau du Tchad.

Le bouton d’enregistrement du suivi n’envoie pas de devis au client. Transmettez votre proposition commerciale par le canal convenu. Le site ne crée pas de réservation et n’émet aucun billet.

L’export CSV contient les coordonnées des clients. Réservez ce fichier aux personnes qui traitent effectivement les demandes. Les cellules pouvant être interprétées comme des formules sont neutralisées lors de l’export.

Le tableau charge jusqu’à 2 000 demandes récentes ; l’export porte sur l’ensemble des demandes. Une pagination devra remplacer cette limite si l’activité atteint ce volume.

## Gérer le catalogue

Dans Destinations, modifiez les titres, les présentations, les étiquettes et l’image parmi les photographies fournies. Une destination en brouillon reste visible dans cet espace et disparaît du catalogue public. Rechargez le site pour consulter une modification publiée.

Ajoutez une destination avec une référence unique en minuscules et tirets. Les départs restent au Tchad et les tarifs sur devis. Le tarif final, les frais et les conditions des compagnies ou agences partenaires sont précisés dans votre proposition au client.

Les coordonnées, la présentation institutionnelle, les services et les textes juridiques sont dans les fichiers du site ; ils ne sont pas modifiables par ce premier écran de gestion du catalogue. L’ajout de nouvelles photos se fait dans `assets`, avec leurs droits vérifiés, avant de les sélectionner dans l’administration.

## Comptes de l’équipe

L’administrateur peut créer des comptes. Le conseiller consulte et suit les demandes, mais ne modifie pas les destinations. L’éditeur gère les destinations et n’accède pas aux coordonnées des clients. Les sessions expirent après huit heures ; utilisez Se déconnecter sur un poste partagé.

Cette version permet la création de comptes. La modification des rôles, la désactivation d’un compte et la récupération de mot de passe nécessitent encore une intervention technique. L’authentification multifacteur n’est pas intégrée à cette première version locale.

## Notifications et contacts

Les coordonnées confirmées sont Sounarow@gmail.com, +235 66 57 05 79 et +235 69 56 02 56. Les liens de téléphone, d’e-mail et de WhatsApp ouvrent le service choisi par le visiteur ; ils ne prouvent pas qu’un message a été envoyé.

Les notifications automatiques nécessitent un compte d’envoi configuré. Sans ce compte, les dossiers sont enregistrés normalement et la gestion indique Non configurée. Consultez l’espace agence pour les nouvelles demandes. Une adresse Gmail de réception ne suffit pas pour autoriser un envoi automatique depuis le site.

## Données et sauvegardes

La base est dans `data/amzi.sqlite`. Ne la supprimez pas lors d’une mise à jour des fichiers du site. Les comptes, les destinations publiées et les demandes y sont conservés. Les fichiers de données et les sauvegardes ne sont pas accessibles par HTTP et ne sont pas inclus dans l’archive de livraison.

Le serveur crée un instantané quotidien dans `data/backups` et conserve ces instantanés trente jours. Cette sauvegarde locale couvre la base, pas les photographies ou les sources. Faites aussi une copie de l’application et une copie séparée de la base sur un support protégé. Le chiffrement dépend actuellement du disque ou du support choisi ; il n’est pas fourni par le programme.

Pour une sauvegarde immédiate, utilisez `node scripts/backup.mjs` dans le dossier du site. La sauvegarde SQLite peut s’effectuer pendant l’utilisation du site. Les fichiers manuels ne sont pas effacés automatiquement.

Pour restaurer : arrêtez le serveur, conservez le dossier de données actuel intact, créez un nouveau dossier de données et copiez l’instantané choisi sous le nom `amzi.sqlite` dans ce nouveau dossier. Lancez ensuite le serveur avec `AMZI_DATA_DIR` désignant ce dossier. Vérifiez les comptes, le catalogue et plusieurs dossiers avant de reprendre l’activité. Cette méthode permet de revenir au dossier précédent sans l’écraser. Les sauvegardes contiennent des données personnelles et les empreintes des accès ; protégez-les comme la base principale.

## Avant la publication sur Internet

Le site est volontairement local et non indexable. Une mise en ligne nécessite le domaine, l’hébergement HTTPS, l’adresse et l’identité juridique complètes de l’agence, les conditions commerciales, les règles de conservation et les justificatifs applicables. L’adresse postale du siège n’a pas été fournie. Les photographies restent des illustrations à valider pour l’exploitation commerciale.

Les contrôles réalisés sur navigateur et tailles simulées ne constituent pas une validation sur téléphone réel ni un audit indépendant de sécurité ou d’accessibilité. Les paiements, la billetterie connectée, les réservations, les comptes voyageurs, le blog et la traduction ne sont pas intégrés à cette première version.

## Améliorations de la version 1.1

Les filtres de destination et de projet restent dans l’adresse du catalogue et sont restaurés au rechargement. Les erreurs du devis apparaissent près du champ concerné ; le premier champ invalide reçoit le focus. En cas de coupure réseau, les informations saisies restent disponibles pour une nouvelle tentative.

Lorsque vous fermez un dossier ou une destination modifiée sans enregistrement, une fenêtre permet de continuer la modification ou de l’abandonner. Continuer conserve votre saisie et vous permet ensuite de l’enregistrer. Le bleu et l’or sont conservés avec des textes plus grands et des contrastes renforcés.
