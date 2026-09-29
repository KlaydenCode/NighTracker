# Carnet de nuits

PWA de suivi du sommeil d'un enfant, pour deux parents. Spécification : `SPEC.md`. Conventions : `CLAUDE.md`.

Stack : Nuxt 4 (SPA) · Vue 3 · TypeScript · Tailwind CSS v3 · PWA · Supabase · Vitest · Vercel.

## Prérequis

- Node 24 (`.nvmrc`) et npm 11
- Docker Desktop (uniquement pour Supabase en local)

## Installation et lancement

```bash
npm install
cp .env.example .env   # puis renseigner les deux variables (voir ci-dessous)
npm run dev            # http://localhost:3000
```

Sans `.env`, l'app démarre quand même : la page d'accueil affiche un encart qui nomme la variable manquante.

## Commandes

```bash
npm run lint                  # ESLint
npm run typecheck             # nuxt typecheck (vue-tsc)
npm run test                  # Vitest
npm run build                 # build de production
npm run preview               # sert le build (PWA testable)
npm run generate-pwa-assets   # régénère les icônes PNG depuis public/icon.svg
npx supabase start            # Supabase local (Docker requis)
npx supabase db reset         # rejoue migrations + seed
```

## Variables d'environnement

| Variable | Contenu |
|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NUXT_PUBLIC_SUPABASE_KEY` | Clé **publique** (`anon` ou `sb_publishable_…`) |

Ne jamais mettre de clé `service_role` / `sb_secret_…` dans le dépôt, dans Vercel ou dans la CI. `.env` n'est jamais commité.

## Déploiement

Vercel détecte Nuxt : un push sur `main` déploie en production, chaque pull request obtient une URL de prévisualisation. La CI GitHub Actions (`.github/workflows/ci.yml`) exécute lint, typecheck, tests et build, sans aucun secret.

## Étapes manuelles (à faire par l'humain)

1. **Supabase distant** : créer le projet Supabase (région Europe de préférence), noter l'URL du projet et la clé publique `anon`. Ne jamais copier la clé `service_role` dans un fichier du dépôt ni dans Vercel.
2. **Fichier `.env` local** : copier `.env.example` en `.env` et y renseigner l'URL et la clé `anon` (fichier non commité).
3. **Vercel** : créer le projet Vercel et l'importer depuis https://github.com/KlaydenCode/NighTracker (framework Nuxt détecté, branche de production `main`).
4. **Variables Vercel** : saisir l'URL Supabase et la clé `anon` dans les variables d'environnement Vercel (Production et Preview).
5. **Protection de `main`** (recommandé) : dans GitHub, exiger que la CI soit verte avant fusion.
6. **Vérification finale sur téléphone** : ouvrir l'URL de production, installer l'app, couper le réseau et constater l'écran hors-ligne.
