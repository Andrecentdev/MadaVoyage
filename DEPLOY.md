# Déployer Mada-Brousse 2.0 sur Render + Supabase

## 1. Base de données (Supabase)
1. Créez un projet Supabase, récupérez la chaîne de connexion Postgres (Project Settings → Database → Connection string, mode **"Session"**).
   - Elle ressemble à : `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`
2. Ouvrez le SQL editor de Supabase et exécutez, dans l'ordre :
   - `sql/schema.sql` (crée les tables)
   - `sql/seed.sql` (données de démo : trajets + images, chauffeurs, promos, compte admin `admin` / `mada2025`)

## 2. Service web (Render)
1. Créez un "Web Service" Render à partir du dépôt Git contenant ce code.
2. Build command : `npm install`
3. Start command : `npm start`
4. Variable d'environnement à définir sur Render :
   - `DATABASE_URL` = la chaîne de connexion Supabase de l'étape 1
   (`PORT` est fourni automatiquement par Render.)
5. Déployez. Le site sera disponible sur l'URL fournie par Render.

## ⚠️ Problèmes fréquents en production

### Images de trajets absentes
Les images des trajets viennent de la colonne `image_url` dans la table `trips` de Supabase.
Si vous voyez des cartes sans image, c'est que le `seed.sql` n'a pas été exécuté **ou** que les trajets ont été ajoutés sans sélectionner de photo depuis l'admin.
→ Ré-exécutez `sql/seed.sql` dans le SQL editor Supabase, ou ajoutez les trajets depuis la page Admin en choisissant une photo de destination.

### Sélection des sièges : "erreur de chargement"
Cause la plus probable : la connexion à Supabase échoue (SSL manquant ou `DATABASE_URL` incorrecte).
Supabase exige **SSL**. Le code le gère automatiquement pour toute base distante (non-localhost), mais vérifiez que :
- `DATABASE_URL` est bien définie dans les variables d'environnement Render (pas d'espace, pas de guillemets autour).
- Vous utilisez la chaîne mode **"Session"** (port 5432), pas le mode "Transaction" (port 6543 / pgBouncer) qui a des limitations.

### Photos de chauffeurs disparaissent après redéploiement
Normal : le disque Render n'est pas persistant. Pour conserver les photos uploadées, ajoutez un **"Persistent Disk"** Render monté sur `/public/images/drivers`, ou migrez vers Supabase Storage.

## Sécurité
- Changez le mot de passe admin par défaut (`admin` / `mada2025`) avant la mise en production.
