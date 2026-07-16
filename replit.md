# Mada-Brousse 2.0

Site de réservation de taxi-brousse à Madagascar (projet de démonstration).

## Stack

- Backend : Node.js + Express (`server.js`)
- Frontend : HTML/CSS/JS statique servi depuis `public/` (pas de framework, CSS maison, icônes SVG inline)
- Base de données : PostgreSQL (base Replit intégrée, via le package `pg`)

## Comment lancer le projet

Le workflow **Start application** lance `npm start` (= `node server.js`) sur le port 5000, avec sortie en webview. Il redémarre automatiquement après un changement de code serveur.

## Base de données

Le projet a été importé avec un `server.js` qui pointait vers une base MySQL locale (XAMPP) inexistante dans cet environnement, sans aucun fichier de schéma SQL fourni. Le backend a été adapté pour utiliser la base PostgreSQL intégrée de Replit (`DATABASE_URL`) via `pg`, avec un schéma recréé à partir de l'usage du code (`server.js` + `public/js/app.js` + pages HTML) :

- `trips` (trajets), `occupied_seats` (sièges occupés), `reservations`, `admins`, `promos`

Les tables ont été seedées avec les mêmes données de démo mentionnées dans le README original (identifiants admin `admin` / `mada2025`, codes promo `MADA10` et `BROUSSE2025`, chauffeurs/trajets repris de l'onglet Admin).

Le tableau "Chauffeurs" de l'admin est devenu dynamique (table `drivers`, avec photo uploadée via `multer` dans `public/images/drivers/`). Deux tables supplémentaires ont été ajoutées : `drivers` (chauffeurs) et `customers` (inscriptions rapides faites depuis l'admin). La table `trips` a une colonne `image_url` (photo de destination, choisie parmi `public/images/destinations/`).

## Bug corrigé : nombres renvoyés en string par `pg`

`pg` renvoie les colonnes `NUMERIC` (prix, totaux, valeur des promos) sous forme de **string**, contrairement à `mysql2` qui les renvoyait en `number`. Ça cassait l'addition des revenus dans l'admin (`+` faisait de la concaténation). Corrigé à la source : `server.js` caste les champs numériques (`price`, `total`, `value`, `rating`, `trips_completed`) en `Number` avant de répondre en JSON (voir la fonction `toNumbers()`). Si une nouvelle route renvoie une colonne `NUMERIC`/`DECIMAL`, penser à la caster pareil.

## Fonctionnalités ajoutées (juillet 2026)

- Assistant de chat FAQ (bulle en bas à droite, réponses pré-écrites) injecté sur toutes les pages client via `MB.initChat()` dans `app.js` — pas d'IA/API externe, purement basé sur des règles. Désactivé sur les pages admin via l'attribut `data-no-chat` sur `<body>`.
- Admin : nouvel onglet **Trajets** (ajout d'un trajet avec sélection d'une photo de destination parmi celles de `public/images/destinations/`), onglet **Chauffeurs** enrichi (ajout avec photo), onglet **Clients** (inscription rapide nom + téléphone pour les réservations par téléphone/guichet).
- Logo pro (`public/images/logo.svg`) ajouté dans la barre de navigation de toutes les pages (`.brand-logo`, classe CSS déjà présente mais jamais utilisée). Favicon (`public/favicon.svg`) maintenant référencé partout.
- `public/images/destinations/` compte 12 photos (6 initiales + Nosy Be, Morondava, Isalo, Andasibe, Île Sainte-Marie, Ranomafana) — visibles automatiquement dans le sélecteur admin (l'API liste le dossier).
- Les pages "nues" (réservation, sièges, paiement, confirmation, mes réservations, connexion admin) ont maintenant une photo de fond discrète (`public/images/bg-madagascar.jpg`, classe `body.page-bg` dans `style.css`) avec un dégradé clair/sombre pour rester lisible ; les cartes blanches restent opaques par-dessus.
- Boutons modernisés (dégradés, ombre, effet de survol) sans toucher à la palette de couleurs existante.

## User preferences

Aucune préférence spécifique enregistrée pour l'instant.
