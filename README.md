# Mada-Brousse 2.0 🚌

Site de reservation de taxi-brousse (projet de demonstration, donnees en localStorage).

## Lancer en local

```bash
npm install
npm start
```

Puis ouvrez http://localhost:3000

## Note importante sur les dependances

Le cahier des charges demandait Bootstrap 5.3.8 et Font Awesome 6.5.1 telecharges
et places dans `public/vendor/`. Cet environnement de generation n'a pas d'acces
reseau pour telecharger ces archives, donc le site a ete construit avec :
- une feuille de style **maison** (`public/css/style.css`) sur-mesure, sans
  dependance externe — ce qui respecte aussi la consigne « pas de framework
  lourd » et donne au site une identite visuelle propre (vert nature +
  rouge laterite, une reference a la terre malgache) plutot qu'un habillage
  Bootstrap generique ;
- des **icones SVG inline** a la place de Font Awesome (aucun fichier a
  telecharger, rendu net a toute taille) ;
- **Chart.js** est charge via CDN dans `admin.html`, comme autorise par le
  cahier des charges.

Si vous tenez a integrer Bootstrap/Font Awesome en local, telechargez les
archives depuis les liens du cahier des charges, decompressez-les dans
`public/vendor/bootstrap-5.3.8-dist/` et `public/vendor/fontawesome-free-6.5.1-web/`,
puis ajoutez les balises `<link>`/`<script>` correspondantes dans les pages —
le reste du site (routes, logique, donnees) n'a pas besoin de changer.

## Deploiement sur Render

1. Poussez ce dossier sur un depot GitHub :
   ```bash
   git init
   git add .
   git commit -m "Mada-Brousse 2.0"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/mada-brousse.git
   git push -u origin main
   ```
2. Sur [render.com](https://render.com), cliquez **New +** → **Web Service**.
3. Connectez votre depot GitHub `mada-brousse`.
4. Renseignez :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : Node
   - Render definit automatiquement `PORT`, deja gere par `server.js`.
5. Cliquez **Create Web Service**. Au bout de quelques minutes votre site est
   en ligne a une URL du type `https://mada-brousse.onrender.com`.

## Deploiement sur Vercel (alternative)

Vercel est pense pour du serverless ; pour un serveur Express classique comme
celui-ci, Render ou Railway sont plus directs. Si vous preferez Vercel,
ajoutez un fichier `vercel.json` a la racine :

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

puis lancez `vercel` depuis le dossier du projet (necessite le CLI Vercel et
un compte).

## Identifiants admin (demo)

- Identifiant : `admin`
- Mot de passe : `mada2025`

## Codes promo (demo)

- `MADA10` : -10 %
- `BROUSSE2025` : -5000 Ar
