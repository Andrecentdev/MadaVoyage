# Déployer Mada-Brousse 2.0 sur Render + Supabase

## 1. Base de données (Supabase)
1. Créez un projet Supabase, récupérez la chaîne de connexion Postgres (Project Settings → Database → Connection string, mode "Session" ou "Transaction").
2. Ouvrez le SQL editor de Supabase et exécutez, dans l'ordre :
   - `sql/schema.sql` (crée les tables — pour une **nouvelle** base)
   - `sql/seed.sql` (données de démo : trajets, chauffeurs, promos, compte admin `admin` / `mada2025`)

   Si vous avez **déjà** une base créée avec une version précédente du projet, exécutez plutôt `sql/migration_v2.sql` : il met à jour la structure (sièges alphanumériques, statut "en attente", messagerie, date de voyage) sans perdre vos données existantes.

## 2. Service web (Render)
1. Créez un "Web Service" Render à partir de ce dossier (ou du dépôt Git contenant ce code).
2. Build command : `npm install`
3. Start command : `npm start`
4. Variable d'environnement à définir : `DATABASE_URL` = la chaîne de connexion Supabase de l'étape 1.
   (`PORT` est fourni automatiquement par Render.)
5. Déployez. Le site sera disponible sur l'URL fournie par Render.

## Notes
- Les photos de chauffeurs uploadées depuis l'admin sont stockées dans `public/images/drivers/` sur le disque du serveur. Sur Render, le disque n'est **pas persistant** entre les déploiements par défaut — pour conserver les photos uploadées en production, ajoutez un "Persistent Disk" Render monté sur `public/images/drivers`, ou migrez ce stockage vers Supabase Storage plus tard si besoin.
- Changez le mot de passe admin par défaut (`admin` / `mada2025`) avant la mise en production.
