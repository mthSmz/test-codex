# Poème du jour — #tendances
Déployable sur **Vercel**.  
- API: `/api/poem` (génère le poème du jour via OpenAI)  
- Page: `/` (affiche le poème)

## Variables d'environnement
- `OPENAI_API_KEY` (obligatoire)
- `OPENAI_MODEL` (optionnel, défaut: gpt-4o-mini)

## Déploiement
1. Connecter le repo à Vercel.
2. Ajouter `OPENAI_API_KEY` dans Project → Settings → Environment Variables.
3. Déployer → ouvrir l'URL.
