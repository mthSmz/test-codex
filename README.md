# Poème du jour

Application Next.js (App Router, TypeScript) prête pour un déploiement sur **Vercel**. Chaque jour à 15:00 (Europe/Paris), un poème est généré avec une ville française choisie aléatoirement et stocké dans Vercel KV.

## Configuration

### Variables d'environnement
Assurez-vous de configurer Vercel KV (intégration native ou variables suivantes) :

- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Scripts

- `npm run dev` — développement local
- `npm run build` — build de production
- `npm run start` — serveur de production

## Déploiement

1. Connectez ce dépôt à Vercel.
2. Configurez l'intégration **Vercel KV** ou définissez les variables d'environnement listées ci-dessus.
3. Poussez vos changements sur la branche `main` pour déclencher un déploiement.

## Cron

Le fichier `vercel.json` déclare un cron Vercel appelant `/api/cron/generate` chaque jour à 15:00 (Europe/Paris).

```json
{
  "crons": [
    { "path": "/api/cron/generate", "schedule": "0 15 * * *", "timeZone": "Europe/Paris" }
  ]
}
```

## Utilisation

- L'endpoint `GET /api/cron/generate` permet de déclencher manuellement la génération d'un nouveau poème.
- La page d'accueil (`/`) interroge toujours `GET /api/poems/latest` et affiche le dernier poème publié (avec `publishedAt` ≤ maintenant). Aucun écran d'attente n'est affiché.

## Développement local

1. Installez les dépendances : `npm install`.
2. Démarrez le serveur : `npm run dev`.
3. Définissez des variables KV locales (Upstash/Vercel KV) pour tester la persistance.
