# Poème du jour — #tendances
Déployable sur **Vercel**.

- API publique: `/api/today`  (lit KV)
- Cron Vercel: `/api/daily-rotate` (protégé; déclenche 1×/jour à 14:00 UTC pour garantir la génération à 15h/16h Paris)
- Stockage: Vercel KV, clé `poem:YYYY-MM-DD`

## Variables d'environnement
- `OPENAI_API_KEY` (obligatoire)
- `OPENAI_MODEL` (optionnel, défaut: gpt-4o-mini)
- `CRON_SECRET` (pour sécuriser `/api/cron-generate`)

## Déploiement
1. Connecter le repo à Vercel.
2. Ajouter `OPENAI_API_KEY`, `CRON_SECRET` (et `OPENAI_MODEL` si besoin) dans Project → Settings → Environment Variables.
3. Déployer → ouvrir l'URL.
