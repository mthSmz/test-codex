# Clone Agar.io 10 joueurs

Cette démo en HTML5 propose une version simplifiée d'Agar.io jouable dans un
navigateur moderne. Une partie comporte toujours 10 cellules : vous contrôlez
une cellule avec la souris et les 9 autres sont pilotées par des IA basiques.

## Lancer le jeu

1. Ouvrez le fichier `index.html` dans votre navigateur (double-clic ou
   glisser-déposer dans une fenêtre du navigateur).
2. Déplacez la souris pour diriger votre cellule. Mangez les cellules et les
   particules plus petites pour grossir et dominez le classement.

## Fonctionnalités

- Carte 2D avec zoom dynamique centré sur le joueur humain.
- 9 bots avec un comportement d'évitement et de chasse simplifié.
- 300 particules de nourriture qui réapparaissent en continu.
- Classement en direct des 10 participants.
- Réapparition automatique des joueurs éliminés après un court délai.
- Générateur d'identifiants robuste : `crypto.randomUUID` →
  `crypto.getRandomValues` → identifiant horodaté unique en ultime recours.

## Dépannage : conflit récurrent sur le README

Si vous voyez apparaître des marqueurs `<<<<<<<`, `=======`, `>>>>>>>` dans le
README, c'est que deux branches ont modifié exactement la même puce de la
section « Fonctionnalités ». Git ne peut pas deviner laquelle choisir : il faut
éditer manuellement la ligne pour conserver une unique formulation, puis
supprimer les marqueurs avant d'enregistrer le fichier.

En pratique :

1. `git status` pour identifier les fichiers en conflit.
2. Ouvrez `README.md`, supprimez les marqueurs et gardez une seule version de
   la puce (celle ci-dessus résume déjà les trois niveaux de repli).
3. `git add README.md` puis poursuivez votre merge ou votre rebase.

Ce projet ne nécessite aucune dépendance ni serveur : tout est géré côté client.

## Déployer en ligne

Le jeu est un site statique constitué uniquement d'un fichier `index.html` :
il peut donc être publié gratuitement via n'importe quel hébergeur de pages
statiques. Voici deux méthodes simples :

### Option 1 : GitHub Pages

1. Créez un dépôt GitHub contenant `index.html` et `README.md`.
   - Sur la page **Create a new repository**, choisissez une visibilité (Public
     ou Private), laissez l'option *Add README* activée et laissez `.gitignore`
     et la licence désactivés. C'est exactement la configuration montrée dans
     la capture d'écran « Create a new repository » : seul le README initial est
     créé automatiquement.
   - Validez avec **Create repository**.
2. Poussez vos modifications sur la branche `main`.
3. Dans les paramètres du dépôt, ouvrez **Pages** et sélectionnez la branche
   `main`, dossier racine (`/`).
4. Validez : GitHub déploie automatiquement le site. L'URL finale est
   `https://<votre-utilisateur>.github.io/<nom-du-depot>/`.

### Option 2 : Netlify (drag & drop)

1. Créez un compte gratuit sur [Netlify](https://www.netlify.com/).
2. Depuis le tableau de bord, cliquez sur **Add new site** > **Deploy manually**.
3. Glissez-déposez le fichier `index.html` (ou un dossier contenant ce fichier).
4. Netlify fournit immédiatement une URL publique pour jouer.

Pour d'autres hébergeurs (Vercel, Render, GitLab Pages, etc.), utilisez le même
principe : indiquez que le site est statique et importez simplement `index.html`.
