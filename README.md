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

Sans `.env`, l'app démarre quand même : la page `/login` affiche un encart qui nomme la variable manquante.

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
npx supabase test db          # tests pgTAP (RLS et fonctions SQL), Docker requis
```

## Variables d'environnement

| Variable | Contenu |
|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NUXT_PUBLIC_SUPABASE_KEY` | Clé **publique** (`anon` ou `sb_publishable_…`) |

Ne jamais mettre de clé `service_role` / `sb_secret_…` dans le dépôt, dans Vercel ou dans la CI. `.env` n'est jamais commité.

## Déploiement

Vercel détecte Nuxt : un push sur `main` déploie en production, chaque pull request obtient une URL de prévisualisation. La CI GitHub Actions (`.github/workflows/ci.yml`) exécute lint, typecheck, tests et build (job `verifier`), puis les tests de base pgTAP et la vérification des types générés (job `base`, Docker fourni par GitHub), sans aucun secret.

## Étapes manuelles (à faire par l'humain)

1. **Supabase distant** : créer le projet Supabase (région Europe de préférence), noter l'URL du projet et la clé publique `anon`. Ne jamais copier la clé `service_role` dans un fichier du dépôt ni dans Vercel.
2. **Fichier `.env` local** : copier `.env.example` en `.env` et y renseigner l'URL et la clé `anon` (fichier non commité).
3. **Vercel** : créer le projet Vercel et l'importer depuis https://github.com/KlaydenCode/NighTracker (framework Nuxt détecté, branche de production `main`).
4. **Variables Vercel** : saisir l'URL Supabase et la clé `anon` dans les variables d'environnement Vercel (Production et Preview).
5. **Protection de `main`** (recommandé) : dans GitHub, exiger que la CI soit verte avant fusion.
6. **Vérification finale sur téléphone** : ouvrir l'URL de production, installer l'app, couper le réseau et constater l'écran hors-ligne.

## Connexion, foyer et invitation (lot 1)

L'app ne connaît ni mot de passe ni inscription publique : on se connecte avec un **code à 6 chiffres** reçu par email (saisi dans l'app, y compris installée sur iPhone) ou avec le **lien** du même email (dans un navigateur). Code et lien sont valables 15 minutes ; un nouveau code remplace l'ancien. Les comptes sont fermés côté serveur : seule une adresse invitée obtient un compte (crochet `hook_before_user_created`). Le premier parent est créé à la main (étape 4 ci-dessous), le second est invité depuis `/reglages`.

### Essais en local

```bash
npx supabase start        # Docker requis ; affiche l'URL locale et la clé publique
npx supabase db reset     # migrations + seed : un foyer fictif, deux comptes en @example.test
```

Pour utiliser la base locale, mettre dans `.env` l'URL locale (`http://127.0.0.1:54321`) et la clé publique affichées par `npx supabase start` (ou `npx supabase status`). Attention : le `.env` habituel peut pointer vers le projet distant ; vérifier avant de lancer `npm run dev`.

- Les emails de connexion ne sont pas envoyés : ils arrivent dans la boîte mail de test, http://127.0.0.1:54324. Le code est dans l'objet du message.
- Comptes du seed : `maman@example.test` et `papa@example.test` (sans mot de passe : connexion par code).
- Rejouer le parcours « premier parent puis invité » : dans Studio (http://127.0.0.1:54323, SQL Editor), exécuter `truncate public.households cascade;`. `maman@example.test` arrive alors sur « Créer le foyer », puis peut inviter `invite@example.test`, dont le code arrive dans la boîte mail de test.
- Après un changement de `supabase/config.toml` : `npx supabase stop` puis `npx supabase start`.
- Après une migration : `npx supabase db reset`, puis, depuis **Git Bash** (la redirection `>` de PowerShell 5 écrit en UTF-16), `npx supabase gen types typescript --local > app/types/database.ts`.

### Tests de base (pgTAP)

```bash
npx supabase start        # ou : npx supabase db start
npx supabase test db      # supabase/tests/database/*.test.sql
```

Ils vérifient la RLS, les fonctions d'invitation, les rôles et le crochet d'inscription. Ils ne tournent pas dans `npm run test` (Docker requis) ; la CI les exécute dans le job `base`.

### Étapes manuelles du lot 1 (à faire par l'humain)

Ordre d'exécution : **1, 3, 2, 5, 4, 6, 7** (les inscriptions sont fermées avant que les tables n'existent ; le crochet est actif avant la création du premier parent). Aucun identifiant SMTP ni adresse réelle n'est saisi dans le dépôt, dans `.env.example`, dans Vercel ni dans une conversation avec un agent.

1. **Envoi d'emails : compte Gmail dédié à l'app** (pas le compte personnel). Sans SMTP personnalisé, Supabase n'envoie qu'aux membres de l'organisation du projet : le second parent ne recevrait rien.
   1. Créer le compte Gmail dédié, activer la validation en deux étapes.
   2. Créer un mot de passe d'application (Compte Google > Sécurité > Mots de passe des applications) et le noter dans un gestionnaire de mots de passe.
   3. Dans Supabase, Authentication > Emails > SMTP Settings : hôte `smtp.gmail.com` ; port `587` (STARTTLS ; `465` en TLS direct convient aussi) ; identifiant : l'adresse Gmail dédiée, entière ; mot de passe : le mot de passe d'application, sans espaces ; adresse d'expéditeur : la même adresse Gmail (Gmail remplace toute autre adresse) ; nom d'expéditeur : « Carnet de nuits ».
   - Limites : une fois le SMTP personnel activé, Supabase plafonne à 30 emails par heure pour tout le projet (réglable dans Authentication > Rate Limits, largement suffisant pour deux personnes) et impose un délai minimal entre deux emails à la même adresse. D'après la documentation de Google (non revérifiée), un compte Gmail gratuit envoie au plus environ 500 messages par jour, et Google peut suspendre un compte qui ne sert qu'à l'envoi automatique : s'y connecter de temps en temps.
3. **Réglages Auth du projet distant** (Authentication) :
   - « Allow new users to sign up » **décoché pour l'instant** ; « Confirm email » activé ; connexions anonymes désactivées.
   - URL du site : `https://nigh-tracker.vercel.app`.
   - « Redirect URLs » : `https://nigh-tracker.vercel.app/confirm`, `http://localhost:3000/confirm` et le motif des prévisualisations Vercel terminé par `/confirm`.
   - Gabarits « Magic Link » **et** « Confirm signup » : objet `{{ .Token }} est votre code Carnet de nuits` et contenu recopié de `supabase/templates/magic_link.html` (identique à `confirmation.html`).
   - Longueur du code : 6 ; durée de validité (« Email OTP Expiration ») : 900 secondes ; délai minimal entre deux emails à la même adresse : 50 secondes (un peu moins que le compte à rebours de 60 s de l'app).
   - Authentication > Rate Limits : abaisser le plafond de vérifications de code (par adresse IP, 30 par 5 minutes par défaut) à 10 par 5 minutes.
2. **Appliquer la migration** au projet distant, après relecture : `npx supabase link` puis `npx supabase db push`.
5. **Activer le crochet** : Authentication > Hooks > « Before User Created » > fonction Postgres `public.hook_before_user_created`. **Ensuite seulement**, recocher « Allow new users to sign up » (nécessaire pour que l'adresse invitée obtienne son compte). Vérifier qu'Authentication > Users est vide ; supprimer tout compte qui s'y trouverait.
4. **Créer le premier parent** : Authentication > Users > Add user > **« Create new user »**, « Auto Confirm User » coché, mot de passe long et aléatoire non conservé (il ne sert jamais : les sessions par mot de passe n'ont accès à rien). Ne pas utiliser « Send invitation ».
6. **Contrôle** : sur `/login`, demander un code avec une adresse inconnue ; aucun utilisateur nouveau ne doit apparaître dans Authentication > Users. S'il en apparaît un, le crochet n'est pas actif : le supprimer et reprendre l'étape 5.
7. **Vérification finale sur téléphone** avec deux vrais comptes : connexion par code, création du foyer, invitation, acceptation, mêmes données chez les deux parents ; sur iPhone, app installée : code demandé dans l'app, lu dans la messagerie, saisi dans l'app au retour ; email du second parent reçu en moins de 2 minutes, expéditeur « Carnet de nuits », en français. Contrôle possible du jeton d'accès (outils du navigateur) : il doit contenir `"amr":[{"method":"otp",…}]`.

Rappels : le code n'est pas bloqué après N essais, seul le plafond de vérifications par adresse IP de Supabase limite les tentatives (d'où l'abaissement à l'étape 3) ; les prévisualisations Vercel utilisent la base de production (risque accepté, à réévaluer avant le lot 2).
