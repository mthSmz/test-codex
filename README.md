# Poème du jour — #tendances
Déployable sur **Vercel**.

- API publique: `/api/today`  (lit KV)
- Cron Vercel: `/api/cron-generate`  (protégé; génère 1×/jour à 13:00 UTC)
- Stockage: Vercel KV, clé `poem:YYYY-MM-DD`

## Variables d'environnement
- `OPENAI_API_KEY` (obligatoire)
- `OPENAI_MODEL` (optionnel, défaut: gpt-4o-mini)
- `CRON_SECRET` (pour sécuriser `/api/cron-generate`)

## Déploiement
1. Connecter le repo à Vercel.
2. Ajouter `OPENAI_API_KEY`, `CRON_SECRET` (et `OPENAI_MODEL` si besoin) dans Project → Settings → Environment Variables.
3. Déployer → ouvrir l'URL.
