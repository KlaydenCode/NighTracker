# 000 — Socle technique (Nuxt, Tailwind, PWA, Supabase, CI, Vercel)

- **Statut** : en revue
- **Lot** : 0 (cf. SPEC §10)
- **Références spec** : SPEC §4 (Stack), §6.2 (Règles UX, thème uniquement), §10 (Lots), §12 (Décisions Nuxt 4 et Tailwind v3), CLAUDE.md (Stack, Sécurité, Git)

## 1. Besoin (product-owner)

### Contexte
Avant de saisir la moindre nuit, il faut un socle qui tourne : l'application se construit, se teste, se déploie et s'installe sur un téléphone. Ce lot ne livre aucune fonctionnalité de suivi. Il pose la base commune (Nuxt 4, Tailwind v3, PWA, Supabase local, CI, Vercel) sur laquelle les lots 1 à 9 s'appuient. Critère de fin (SPEC §10) : page d'accueil déployée, CI verte.

### User stories
- En tant que parent, je veux ouvrir l'adresse de l'app sur mon téléphone et voir une page d'accueil en français, sombre et sans blanc pur, afin de ne pas être ébloui si je l'ouvre la nuit.
- En tant que parent, je veux pouvoir installer l'app sur l'écran d'accueil de mon téléphone avec son icône, afin de l'ouvrir en un tap comme une application.
- En tant que parent, je veux qu'un écran clair s'affiche si le réseau est coupé, afin de comprendre la situation au lieu de voir une page d'erreur du navigateur.
- En tant que parent (porteur du projet), je veux que chaque changement soit vérifié automatiquement et qu'une version en ligne soit publiée à partir de `main`, afin que les lots suivants puissent être livrés sans casser l'existant.
- En tant que parent (porteur du projet), je veux qu'aucun secret ne soit dans le dépôt et qu'aucune clé d'administration n'existe côté client, afin de protéger les données de santé de notre fille dès le premier jour.

### Critères d'acceptation

Application et outillage
- [ ] CA1 — Étant donné un clone neuf du dépôt, quand j'exécute `npm install` puis `npm run dev`, alors l'app démarre et la page d'accueil s'affiche sans erreur en console.
- [ ] CA2 — Étant donné le projet installé, quand j'exécute `npm run lint`, `npm run typecheck`, `npm run test` et `npm run build`, alors les quatre commandes se terminent avec succès.
- [ ] CA3 — Étant donné la configuration TypeScript, quand je l'inspecte, alors le mode strict est activé et le code applicatif se trouve sous `app/` (Nuxt 4).
- [ ] CA4 — Étant donné l'exécution de `npm run test`, quand Vitest se lance, alors au moins un test trivial (fichier de test présent et passant) prouve que l'outillage fonctionne.
- [ ] CA5 — Étant donné les modules `@nuxtjs/supabase`, `@vite-pwa/nuxt` et `@nuxtjs/tailwindcss`, quand le build est lancé, alors chacun fonctionne avec Nuxt 4 sans contournement bloquant (vérification de compatibilité demandée par SPEC §12 ; le résultat est noté dans la fiche à l'étape d'implémentation).

Tailwind v3
- [ ] CA6 — Étant donné les dépendances du projet, quand j'inspecte `package.json`, le fichier de verrouillage et les feuilles de style, alors `tailwindcss` est en version 3.x, la configuration est dans `tailwind.config.ts`, et il n'existe ni `@tailwindcss/vite`, ni `@tailwindcss/postcss`, ni directive `@import "tailwindcss"`.

Page d'accueil et thème
- [ ] CA7 — Étant donné un téléphone (largeur 360 px), quand j'ouvre `/`, alors la page affiche le titre de l'app « Carnet de nuits » en français, sans défilement horizontal et sans écran contextuel (« Ce soir », « Cette nuit », « Ce matin » sont hors périmètre).
- [ ] CA8 — Étant donné un appareil sans préférence de thème, quand j'ouvre `/`, alors le fond est sombre par défaut, et aucun élément de la page n'utilise le blanc pur (`#fff`) ni pour le fond, ni pour le texte (SPEC §6.2).
- [ ] CA9 — Étant donné la page d'accueil, quand elle contient un élément interactif éventuel, alors sa zone tactile fait au moins 48 px de haut et de large (cible tactile, SPEC §6.2). Si la page n'a aucun élément interactif, ce critère est sans objet.
- [ ] CA10 — Étant donné la page d'accueil, quand je la parcours, alors elle ne contient aucun son, aucune vibration, et aucune formulation causale ou médicale (SPEC §2, §6.2).

PWA
- [ ] CA11 — Étant donné la version déployée ouverte sur un téléphone compatible, quand je consulte le manifeste, alors il contient le nom « Carnet de nuits », des icônes (dont une icône adaptée à l'écran d'accueil) et une couleur de thème sombre, et le navigateur propose l'installation.
- [ ] CA12 — Étant donné l'app déjà chargée une fois puis le réseau coupé (mode avion), quand je navigue vers une page non mise en cache ou que je recharge, alors un écran hors-ligne en français, sombre et sans blanc pur s'affiche, à la place de la page d'erreur du navigateur.
- [ ] CA13 — Étant donné l'audit PWA du navigateur (Lighthouse ou équivalent) sur la version déployée, quand je le lance, alors la catégorie « installable » est validée.

Supabase (local)
- [ ] CA14 — Étant donné le dossier `supabase/` initialisé par la CLI, quand j'exécute `npx supabase db reset` en local, alors la commande réussit avec un dossier `migrations` vide (ou contenant seulement un fichier sans effet) et un `seed.sql` vide ou minimal, ne contenant aucune table métier ni donnée de l'enfant.
- [ ] CA15 — Étant donné le module `@nuxtjs/supabase` configuré, quand l'app démarre sans variables Supabase renseignées, alors la page d'accueil et l'écran hors-ligne restent accessibles et le message d'erreur éventuel indique clairement quelle variable manque (l'app ne plante pas à blanc).

Sécurité et accès restreint au foyer
- [ ] CA16 — Étant donné l'état du dépôt, quand je liste les fichiers suivis par git et l'historique du lot, alors `.env` n'y figure pas, `.env` est dans `.gitignore`, et `.env.example` existe avec chaque variable attendue (au minimum l'URL et la clé publique `anon` de Supabase), sans valeur réelle.
- [ ] CA17 — Étant donné le code et la configuration (Nuxt, CI, Vercel), quand je recherche `service_role`, alors aucune clé de ce type n'apparaît dans un fichier commité, ni dans une variable exposée au client (`NUXT_PUBLIC_*` ou équivalent).
- [ ] CA18 — Étant donné que ce lot ne lit ni n'écrit aucune donnée du foyer ni de l'enfant (aucune table, aucune session), quand la page d'accueil est chargée, alors aucune requête de données métier n'est émise vers Supabase. L'accès restreint au foyer (auth, RLS via `is_household_member()`) est introduit au lot 1.

CI GitHub Actions
- [ ] CA19 — Étant donné le dépôt https://github.com/KlaydenCode/NighTracker, quand une pull request est ouverte vers `main` ou qu'un commit est poussé sur `main`, alors un workflow GitHub Actions exécute `lint`, `typecheck`, `test` et `build`, et affiche chacun comme une étape distincte lisible.
- [ ] CA20 — Étant donné une modification qui casse l'une de ces quatre commandes (par exemple une erreur de type volontaire), quand la CI s'exécute, alors le workflow est en échec et le statut rouge est visible sur la pull request.
- [ ] CA21 — Étant donné le workflow de CI, quand il s'exécute, alors il n'a besoin d'aucun secret de production (le build passe avec des valeurs factices ou vides pour les variables Supabase) et aucun secret n'est affiché dans les journaux.
- [ ] CA22 — Étant donné la branche `main` après fusion de ce lot, quand je consulte l'onglet Actions, alors la dernière exécution est verte (critère de fin du lot 0).

Déploiement Vercel
- [ ] CA23 — Étant donné le projet Vercel relié au dépôt, quand un commit arrive sur `main`, alors un déploiement de production est déclenché automatiquement et la page d'accueil est accessible sur l'URL de production (critère de fin du lot 0).
- [ ] CA24 — Étant donné une pull request ouverte, quand Vercel a terminé, alors une URL de prévisualisation est disponible et affiche la page d'accueil.
- [ ] CA25 — Étant donné la configuration Vercel, quand je consulte les variables d'environnement, alors seules l'URL et la clé publique `anon` de Supabase y figurent, aucune clé `service_role`.

Documentation minimale
- [ ] CA26 — Étant donné le dépôt, quand un nouveau contributeur ouvre le fichier `README.md`, alors il y trouve en quelques lignes comment installer, lancer, tester et déployer le projet, et la liste des étapes manuelles ci-dessous.

### Étapes manuelles (à faire par l'humain, hors de portée des agents)

Ces actions nécessitent des comptes et des secrets. Elles doivent être listées telles quelles dans le `README.md` (CA26). Aucun agent ne saisit ni ne stocke de secret.

1. **Supabase distant** : créer le projet Supabase (région Europe de préférence), noter l'URL du projet et la clé publique `anon`. Ne jamais copier la clé `service_role` dans un fichier du dépôt ni dans Vercel.
2. **Fichier `.env` local** : copier `.env.example` en `.env` et y renseigner l'URL et la clé `anon` (fichier non commité).
3. **Vercel** : créer le projet Vercel et l'importer depuis https://github.com/KlaydenCode/NighTracker (framework Nuxt détecté, branche de production `main`).
4. **Variables Vercel** : saisir l'URL Supabase et la clé `anon` dans les variables d'environnement Vercel (Production et Preview).
5. **Protection de `main`** (recommandé) : dans GitHub, exiger que la CI soit verte avant fusion.
6. **Vérification finale sur téléphone** : ouvrir l'URL de production, installer l'app, couper le réseau et constater l'écran hors-ligne (CA11, CA12).

### Hors périmètre
- Authentification, lien magique, page `/login`, session, foyer, enfant, invitations (lot 1).
- Toute table métier, tout enum, toute politique RLS, la fonction `is_household_member()` et les types générés `app/types/database.ts` (lot 1). Le schéma n'est pas inclus dans ce lot.
- Écran contextuel (« Ce soir » / « Cette nuit » / « Ce matin »), formulaires, actions rapides, historique, bilan, export PDF.
- Hors-ligne avancé (file d'attente IndexedDB, synchro) et temps réel (lot 8) : ici, seulement l'écran hors-ligne statique de la PWA.
- Tests Playwright (lot 5 et suivants).
- Notifications, domaine personnalisé, analytics, suivi d'erreurs.
- Création des comptes et projets externes (Vercel, Supabase distant) : étapes manuelles ci-dessus.

### Questions ouvertes
- ~~**Nom d'affichage et identité visuelle.**~~ **Tranché (humain)** : icône « lune simple sur fond sombre » générée (SVG source `public/icon.svg` + PNG requis par le manifeste), remplaçable plus tard sans changer le manifeste.
- ~~**Gestionnaire de paquets et version de Node.**~~ **Tranché (humain)** : npm + Node LTS actuelle (24.x), épinglée dans `engines`, `.nvmrc` et la CI.
- ~~**Migration vide ou absente.**~~ **Tranché (humain)** : aucune migration dans ce lot, seulement `supabase/migrations/.gitkeep` ; première migration au lot 1.
- ~~**Protection de `main`.**~~ **Tranché (humain)** : activée par l'humain (étape manuelle 5) une fois la CI verte.
- **Rétention des données** (SPEC §13) : sans objet pour ce lot, aucune donnée n'est stockée. Question conservée pour le lot 1.

## 2. Plan technique (tech-lead)

### Décisions structurantes

| # | Décision | Raison |
|---|---|---|
| D1 | **Rendu SPA : `ssr: false`** dans `nuxt.config.ts`, build par `nuxt build` (preset Nitro `vercel` détecté automatiquement sur Vercel, `node-server` en local). Pas de `nuxt generate`. | Aucune donnée ne doit être rendue côté serveur (données de santé, session Supabase côté navigateur). Le serveur Vercel tourne en UTC : un rendu SSR de l'écran contextuel (lot 1+, heures « Ce soir / Cette nuit ») produirait des écarts d'hydratation avec l'heure `Europe/Paris` du téléphone. Le hors-ligne du lot 8 repose sur un shell client. `nuxt build` gère les routes dynamiques (`/nuits/[date]`) sans configuration de réécriture. |
| D2 | **Versions épinglées exactement** (`--save-exact`), voir tableau ci-dessous. **TypeScript 5.9.3, pas 7.x** (dernière `latest`). | `typescript-eslint` 8.71 exige `typescript <6.1.0` ; TS 7 (portage natif) n'est pas supporté par `vue-tsc`/Volar. |
| D3 | **Node 24 LTS** : `.nvmrc` = `24`, `engines.node` = `">=24.11.0 <25"`, `engines.npm` = `">=11"`. CI via `node-version-file: .nvmrc`. | Nuxt 4.5.2 exige `^22.19.0 \|\| ^24.11.0 \|\| >=26` ; machine de dev en 24.19.0 / npm 11.2.0. |
| D4 | **Variables Supabase** : `NUXT_PUBLIC_SUPABASE_URL` et `NUXT_PUBLIC_SUPABASE_KEY` (clé publique `anon`, ou « publishable » `sb_publishable_…`, les deux sont acceptées). Aucune autre variable. | Noms lus en priorité par `@nuxtjs/supabase` 2.0.10 et surchargeables à l'exécution (runtimeConfig). |
| D5 | **Absence de variables Supabase (CA15)** : `nuxt.config.ts` remplace une variable absente par une valeur sentinelle (`https://supabase-url-manquante.invalid`, `cle-supabase-manquante`) ; la fonction pure `missingSupabaseEnv()` détecte les sentinelles et la page d'accueil affiche un encart nommant la variable manquante ; `nuxt.config.ts` écrit un `console.warn` au build. | Vérifié dans le code du module : son plugin client appelle `createBrowserClient(url, key)` sans garde, et `supabase-js` lève « supabaseUrl is required » si l'URL est vide, donc l'app planterait à blanc. Le TLD `.invalid` ne résout jamais, et aucune requête n'est émise tant qu'aucune session n'existe (CA18). Conséquence : la CI n'a besoin d'aucune variable (CA21). |
| D6 | **Module Supabase** : `redirect: false` et `types: false` pour ce lot. | Par défaut le module redirige toute page vers `/login` (inexistante avant le lot 1) et cherche `~/types/database.types.ts` (warning). Au lot 1 : `redirect: true` et `types: '~/types/database.ts'` (`~` = `app/` sous Nuxt 4), conforme à CLAUDE.md. |
| D7 | **Hors-ligne (CA12)** : Workbox `generateSW`, `navigateFallback: null`, navigations en `NetworkOnly` avec `precacheFallback` vers `public/offline.html` (page statique autonome, CSS inline). SW désactivé en dev. | Le module met `navigateFallback: '/'` par défaut, ce qui servirait la page d'accueil au lieu de l'écran hors-ligne. `offline.html` ne dépend ni de Vue ni de Tailwind, donc s'affiche même si les bundles ne sont pas en cache. Le lot 8 remplacera cette stratégie par un shell applicatif en cache (voir Risques). |
| D8 | **Icônes** : `public/icon.svg` écrit à la main, PNG générés une fois par `@vite-pwa/assets-generator` (devDependency, preset `minimal-2023` avec fond sombre) puis **commités** ; pas de génération au build. | Le preset par défaut ajoute un fond **blanc** aux icônes `maskable` et Apple ; il faut un fichier de config (qui importe le paquet), donc la dépendance. Justification : devDependency seulement, peer optionnel officiel de `@vite-pwa/nuxt` (`^1.0.0`), aucun poids côté client. Alternative écartée : exporter les PNG à la main (non reproductible). Attention : la 2.0.0 est hors de la plage peer, rester en 1.0.4. |
| D9 | **Thème** : sombre uniquement (pas de `darkMode`, pas de variante claire). Fond `#0f172a` (slate-900), texte `#e2e8f0` (slate-200), accent lune `#fde68a` (amber-200). Fond appliqué aussi en `<style>` inline dans le `<head>` et dans `app/spa-loading-template.html` pour éviter le flash blanc avant le chargement du CSS (SPA). | SPEC §6.2 ; pas d'abstraction pour un mode clair non demandé. |
| D10 | **Qualité** : ESLint via `@nuxt/eslint` (config plate générée, `stylistic: true`, pas de Prettier). `typecheck` = `nuxt typecheck` (exécute `vue-tsc -b --noEmit` sur les références de projet Nuxt 4). Vitest en environnement `node`, sans `@nuxt/test-utils`. | Sous Nuxt 4, le `tsconfig.json` racine n'a que des `references` : `vue-tsc --noEmit` seul ne vérifierait rien. Les tests de ce lot et des lots 2 à 6 portent sur des fonctions pures : `@nuxt/test-utils` inutile. |
| D11 | **Supabase CLI** en devDependency épinglée (`supabase@2.118.0`) pour que `npx supabase …` (CLAUDE.md) utilise une version fixe. | Reproductibilité. `db reset` nécessite Docker (absent de la machine de dev actuellement). |
| D12 | **Aucun élément interactif sur `/`** (titre, phrase, éventuel encart de configuration) : CA9 sans objet. Le lien « Réessayer » de `offline.html` respecte néanmoins 48 × 48 px. | Plus simple. |

### Versions retenues (vérifiées via `npm view` le 2026-09-29)

| Paquet | Version | Type | Compatibilité vérifiée |
|---|---|---|---|
| `nuxt` | 4.5.2 | dep | engines Node `^24.11.0` ; tire `vue ^3.5.40`, `vue-router ^5.2.0`, `vite ^8.2.0`, peer `rolldown ~1.2.1` (installé automatiquement par npm 11) |
| `@nuxtjs/supabase` | 2.0.10 | dep | `@nuxt/kit ^4.5.2`, `@supabase/supabase-js ^2.112.2`, `@supabase/ssr ^0.12.4` ; compat `nuxt >=3.0.0` |
| `@vite-pwa/nuxt` | 1.1.1 | dep | `@nuxt/kit ^3.9.0` (fonctionne sous Nuxt 4) ; code dédié Nuxt 4 présent (`isNuxt4`, composants `nuxt4/`, `NuxtPwaManifest`) ; `vite-plugin-pwa ^1.2.0` (peer vite `^8.0.0` OK) |
| `@nuxtjs/tailwindcss` | 6.14.0 | dep | `@nuxt/kit ^3.16.0`, `tailwindcss ~3.4.17` ; dernière version publiée en avril 2025 (voir Risques) |
| `tailwindcss` | 3.4.19 | devDep | tag `v3-lts` ; déclaré explicitement pour CA6 et les types de `tailwind.config.ts` (déduplique avec la dépendance du module) |
| `typescript` | 5.9.3 | devDep | voir D2 |
| `vue-tsc` | 3.3.11 | devDep | peer `typescript >=5.0.0` |
| `eslint` | 10.11.0 | devDep | peer de `@nuxt/eslint(-config)` 1.17.0 : `^9 \|\| ^10` ; `typescript-eslint` 8.71 : `^10` OK. Repli autorisé sans autre décision : `9.39.5` si `npm install` signale un conflit de peer. |
| `@nuxt/eslint` | 1.17.0 | devDep | `@nuxt/kit ^4.5.1` |
| `vitest` | 5.0.2 | devDep | peer `vite ^8.0.0`, engines Node `^24.0.0` |
| `@vite-pwa/assets-generator` | 1.0.4 | devDep | dans la plage peer `^1.0.0` de `@vite-pwa/nuxt` (pas la 2.0.0) |
| `supabase` (CLI) | 2.118.0 | devDep | — |

Commandes d'installation (à exécuter telles quelles) :
```bash
npm install --save-exact nuxt@4.5.2 @nuxtjs/supabase@2.0.10 @vite-pwa/nuxt@1.1.1 @nuxtjs/tailwindcss@6.14.0
npm install --save-dev --save-exact tailwindcss@3.4.19 typescript@5.9.3 vue-tsc@3.3.11 eslint@10.11.0 @nuxt/eslint@1.17.0 vitest@5.0.2 @vite-pwa/assets-generator@1.0.4 supabase@2.118.0
```
`vue` et `vue-router` : ajouter en `dependencies` avec la plage de Nuxt (`vue@^3.5.40`, `vue-router@^5.2.0`), comme le fait le gabarit officiel. Après installation, `npm ls tailwindcss` doit ne montrer que des 3.4.x.

### Fichiers à créer / modifier

Ne pas utiliser `npm create nuxt` dans le dépôt (il écraserait `.gitignore` et pourrait réinitialiser git) : écrire les fichiers ci-dessous à la main. Ne pas commiter `fix-path.ps1` (script machine non suivi, présent à la racine) : ajouter les fichiers explicitement, pas de `git add .`.

| Fichier | Action | Raison |
|---|---|---|
| `package.json` | créer | `"name": "carnet-de-nuits"`, `"private": true`, `"type": "module"`, `engines` (D3). Scripts : `dev: nuxt dev`, `build: nuxt build`, `preview: nuxt preview`, `postinstall: nuxt prepare`, `lint: eslint .`, `typecheck: nuxt typecheck`, `test: vitest run`, `generate-pwa-assets: pwa-assets-generator`. Dépendances : tableau des versions. |
| `package-lock.json` | créer (généré) | Verrouillage, utilisé par `npm ci` en CI et sur Vercel. |
| `.nvmrc` | créer | Contenu : `24` (D3). |
| `tsconfig.json` | créer | Gabarit Nuxt 4 : `"files": []` et `references` vers `./.nuxt/tsconfig.app.json`, `./.nuxt/tsconfig.server.json`, `./.nuxt/tsconfig.shared.json`, `./.nuxt/tsconfig.node.json`. |
| `nuxt.config.ts` | créer | `compatibilityDate: '2026-09-01'`, `ssr: false` (D1), `devtools: { enabled: true }`, `typescript: { strict: true, typeCheck: false }` (CA3 explicite ; typecheck via script), `modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@vite-pwa/nuxt', '@nuxt/eslint']`, `tailwindcss: { viewer: false }`, `eslint: { config: { stylistic: true } }`, bloc `supabase` (D5, D6 : `url`/`key` = variable d'env ou sentinelle importée de `./app/utils/supabase-env`, `redirect: false`, `types: false`) avec `console.warn` listant les variables manquantes au build, bloc `app.head` (ci-dessous), bloc `pwa` (ci-dessous). |
| `app/app.vue` | créer | `<NuxtPwaManifest />` puis `<NuxtPage />`. Pas de layout. |
| `app/pages/index.vue` | créer | `<main>` pleine hauteur (`min-h-dvh`), centré, `px-6` ; `<h1>` « Carnet de nuits » ; une phrase descriptive (ex. « Le carnet de suivi du soir, de la nuit et du matin. ») ; si `missingSupabaseEnv(useRuntimeConfig().public.supabase)` n'est pas vide, encart `role="status"` : « Configuration incomplète : variable(s) manquante(s) : NUXT_PUBLIC_SUPABASE_URL. Voir le README. » Aucune formulation causale ou médicale, aucun élément interactif (D12), aucun appel à `useSupabaseClient`. Classes texte ≤ `text-slate-200`. |
| `app/assets/css/tailwind.css` | créer | Chemin par défaut du module sous Nuxt 4. Contenu : `@tailwind base; @tailwind components; @tailwind utilities;` puis `@layer base { html { color-scheme: dark } body { @apply bg-slate-900 text-slate-200 antialiased } }`. Aucune directive `@import "tailwindcss"` (CA6). |
| `tailwind.config.ts` | créer | `import type { Config } from 'tailwindcss'` ; `export default { content: [], theme: { extend: {} } } satisfies Config` (le module ajoute lui-même `app/**`). Pas de `darkMode` (D9). |
| `app/spa-loading-template.html` | créer | Écran de chargement SPA : `<div style="position:fixed;inset:0;background:#0f172a"></div>` (évite le flash blanc, D9). |
| `app/utils/supabase-env.ts` | créer | Fonction pure et constantes (signature ci-dessous). |
| `app/utils/supabase-env.test.ts` | créer | Tests Vitest de `missingSupabaseEnv` (CA4, CA15). |
| `tests/socle.test.ts` | créer | Tests de garde lisant le dépôt via `node:fs` (CA6, CA8, CA12, CA17), voir « Tests prévus ». |
| `vitest.config.ts` | créer | `defineConfig` de `vitest/config` : `test: { environment: 'node', include: ['app/**/*.test.ts', 'tests/**/*.test.ts'] }`. |
| `eslint.config.mjs` | créer | `import withNuxt from './.nuxt/eslint.config.mjs'` ; `export default withNuxt()`. |
| `public/icon.svg` | créer | `viewBox="0 0 512 512"`, `<rect width="512" height="512" fill="#0f172a"/>`, croissant de lune `fill="#fde68a"` tenant dans le cercle central de rayon 160 (zone sûre maskable). Aucun `#fff`. |
| `pwa-assets.config.ts` | créer | `defineConfig` + `minimal2023Preset` de `@vite-pwa/assets-generator/config` ; surcharger `maskable.resizeOptions` et `apple.resizeOptions` à `{ background: '#0f172a' }` ; `images: ['public/icon.svg']`. |
| `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico` | créer (générés par `npm run generate-pwa-assets`, commités) | Icônes du manifeste et de l'écran d'accueil iOS (CA11, CA13). |
| `public/offline.html` | créer | Page autonome : `<html lang="fr">`, `<meta name="viewport" …>`, `<meta name="theme-color" content="#0f172a">`, CSS inline (fond `#0f172a`, texte `#e2e8f0`, `color-scheme: dark`). Contenu : titre « Carnet de nuits », « Pas de connexion pour le moment. », « La page s'affichera à nouveau quand le réseau sera revenu. », lien `<a href="/">Réessayer</a>` stylé en bouton `min-height:48px; min-width:48px`. Aucun script. |
| `supabase/config.toml` | créer (via `npx supabase init`) | `project_id = "carnet-de-nuits"` ; `[auth] site_url = "http://localhost:3000"` ; `[db.seed] sql_paths = ["./seed.sql"]` (valeur par défaut). Répondre « N » aux questions VS Code / IntelliJ / Deno. Garder le `supabase/.gitignore` généré. |
| `supabase/migrations/.gitkeep` | créer | Décision validée : aucune migration (CA14). |
| `supabase/seed.sql` | créer | Une seule ligne de commentaire : `-- Données de développement fictives : ajoutées au lot 1 (jamais de données réelles).` |
| `.env.example` | créer | `NUXT_PUBLIC_SUPABASE_URL=` et `NUXT_PUBLIC_SUPABASE_KEY=` sans valeur, chacune précédée d'un commentaire (local : `http://127.0.0.1:54321` et clé `anon` affichée par `npx supabase start` ; distant : tableau de bord Supabase). Commentaire explicite : ne jamais ajouter la clé `service_role` / secrète. |
| `.github/workflows/ci.yml` | créer | Voir « CI » ci-dessous. |
| `README.md` | créer | Prérequis (Node 24, npm 11, Docker Desktop pour Supabase local), installation, commandes (`dev`, `lint`, `typecheck`, `test`, `build`, `preview`, `generate-pwa-assets`, `npx supabase start` / `db reset`), variables d'environnement, déploiement Vercel, et les 6 étapes manuelles de la section 1 recopiées telles quelles (CA26). |
| `.gitignore` | inchangé | Couvre déjà `.env`, `.env.*`, `!.env.example`, `.nuxt/`, `.output/`, `dev-dist/`, `supabase/.temp/`, `.vercel/`. |
| `vercel.json` | ne pas créer | Détection automatique de Nuxt par Vercel ; Node version réglée par `engines`. |

Signature de la fonction pure (`app/utils/supabase-env.ts`) :
```ts
export const SUPABASE_URL_PLACEHOLDER = 'https://supabase-url-manquante.invalid'
export const SUPABASE_KEY_PLACEHOLDER = 'cle-supabase-manquante'

/** Noms des variables d'environnement Supabase absentes (vides ou sentinelles). */
export function missingSupabaseEnv(config: { url?: string | null, key?: string | null }): string[]
// retourne, dans cet ordre, 'NUXT_PUBLIC_SUPABASE_URL' et/ou 'NUXT_PUBLIC_SUPABASE_KEY'
// si la valeur est absente, vide après trim, ou égale à la sentinelle.
```

Bloc `app.head` de `nuxt.config.ts` :
- `htmlAttrs: { lang: 'fr' }`, `title: 'Carnet de nuits'` ;
- `meta` : `theme-color` = `#0f172a`, `color-scheme` = `dark`, `description` ;
- `link` : `favicon.ico` (`sizes: '48x48'`), `icon.svg` (`type: 'image/svg+xml'`), `apple-touch-icon` → `/apple-touch-icon-180x180.png` ;
- `style: [{ innerHTML: 'html{background:#0f172a;color-scheme:dark}' }]` (D9).

Bloc `pwa` de `nuxt.config.ts` :
```ts
pwa: {
  registerType: 'autoUpdate',
  manifest: {
    name: 'Carnet de nuits',
    short_name: 'Carnet de nuits',
    description: 'Suivi des soirées, nuits et matins',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    navigateFallback: null,
    // Obligatoire : le module ajoute sinon un seul motif (_nuxt/builds/**/*.json) qui remplace les motifs par défaut.
    globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
    runtimeCaching: [{
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkOnly',
      options: { precacheFallback: { fallbackURL: '/offline.html' } },
    }],
  },
  client: { installPrompt: false },
  devOptions: { enabled: false },
},
```

CI (`.github/workflows/ci.yml`) :
- `name: CI` ; déclencheurs `pull_request` (branches `[main]`) et `push` (branches `[main]`) ;
- `permissions: { contents: read }` ; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` ;
- un job `verifier` sur `ubuntu-latest`, `timeout-minutes: 15`, **aucun `env` Supabase ni secret** (CA21, la sentinelle D5 suffit) ;
- étapes nommées : `actions/checkout@v5` ; `actions/setup-node@v5` avec `node-version-file: .nvmrc` et `cache: npm` ; « Installation » `npm ci` ; « Lint » `npm run lint` ; « Typecheck » `npm run typecheck` ; « Tests » `npm run test` ; « Build » `npm run build` (CA19).

### Base de données

Aucune migration dans ce lot (décision validée) : seulement `supabase/migrations/.gitkeep` et un `seed.sql` réduit à un commentaire. Pas de table, pas d'enum, pas de politique RLS, pas de `is_household_member()` (lot 1). `app/types/database.ts` n'est **pas** généré dans ce lot (rien à générer) ; au lot 1, après la première migration : `npx supabase gen types typescript --local > app/types/database.ts`, puis passer `supabase.types` à `'~/types/database.ts'` et `supabase.redirect` à `true` (D6).

### Tests prévus

| Test | Couvre |
|---|---|
| `app/utils/supabase-env.test.ts` : (1) URL et clé valides → `[]` ; (2) URL `undefined` → `['NUXT_PUBLIC_SUPABASE_URL']` ; (3) clé vide ou espaces → `['NUXT_PUBLIC_SUPABASE_KEY']` ; (4) les deux sentinelles → les deux noms, dans l'ordre URL puis clé. | CA4, CA15 (logique) |
| `tests/socle.test.ts` « Tailwind v3 » : `package.json` → `devDependencies.tailwindcss` commence par `3.` ; `package-lock.json` : toutes les entrées `node_modules/**/tailwindcss` ont une version `3.x`, aucune clé `@tailwindcss/vite` ni `@tailwindcss/postcss` ; aucun fichier `.css` / `.vue` sous `app/` ne contient `@import "tailwindcss"` ; `tailwind.config.ts` existe. | CA6 |
| `tests/socle.test.ts` « pas de blanc pur » : parcours (`readdirSync(…, { recursive: true })`) de `app/**/*.{vue,css,ts,html}`, `public/offline.html`, `public/icon.svg`, `tailwind.config.ts`, `nuxt.config.ts` (hors `*.test.ts`) ; aucun ne correspond à `/#fff(?:fff)?\b\|\b(?:bg\|text\|border\|fill\|stroke\|from\|to\|via)-white\b\|rgba?\(\s*255\s*,\s*255\s*,\s*255/i`. | CA8, CA12 (partie « sans blanc pur ») |
| `tests/socle.test.ts` « pas de secret » : sur les mêmes fichiers plus `.env.example`, `.github/workflows/ci.yml`, `supabase/**`, aucune correspondance à `/eyJ[\w-]{20,}\.[\w-]{20,}\|sb_secret_/` (JWT ou clé secrète) ; `.env.example` ne contient que les deux clés de D4 avec valeur vide. | CA16 (partie `.env.example`), CA17 |
| `tests/socle.test.ts` « hors-ligne » : `public/offline.html` existe, contient `lang="fr"` et aucune balise `<script`. | CA12 (statique) |
| Manuel — clone neuf : `git clone` dans un dossier temporaire, `npm ci`, `npm run dev`, ouvrir `http://localhost:3000`, console DevTools sans erreur (avertissements Vite tolérés). | CA1 |
| Manuel/CI — les quatre scripts passent localement puis en CI. | CA2, CA22 |
| Manuel — `nuxt.config.ts` contient `typescript.strict: true` ; `.nuxt/tsconfig.app.json` contient `"strict": true` ; aucun code applicatif hors `app/`. | CA3 |
| Manuel — `npm run build` sans erreur ; noter dans la section 3 la sortie (avertissements éventuels de chaque module). | CA5 |
| Manuel — DevTools, mode appareil 360 × 740 : titre visible, pas de barre de défilement horizontale (`document.documentElement.scrollWidth <= 360`), fond sombre. Relecture des textes de `index.vue` et `offline.html` (pas de son, pas de vibration, pas de causalité ni de terme médical). CA9 : sans objet (D12). | CA7, CA8, CA9, CA10 |
| Manuel — renommer `.env`, `npm run dev` : page d'accueil affichée avec l'encart nommant les deux variables, pas d'écran blanc ; avertissement au démarrage dans le terminal. | CA15 |
| Manuel — `npm run build && npm run preview`, DevTools > Application : manifeste (nom, icônes dont maskable, `theme_color` sombre), SW actif, `offline.html` présent dans le précache (`grep offline.html .output/public/sw.js`) ; puis Network « Offline », recharger `/` et naviguer vers `/xyz` → écran hors-ligne. Refaire sur téléphone après déploiement (étape manuelle 6). | CA11, CA12 |
| Manuel — Lighthouse (ou panneau Manifest de Chrome : « Installability » sans erreur) sur l'URL de prévisualisation Vercel. | CA13 |
| Manuel (humain, Docker requis) — `npx supabase start` puis `npx supabase db reset` → succès. | CA14 |
| Manuel — DevTools Network au chargement de `/` (avec un vrai `.env`) : aucune requête vers `*.supabase.co` ni `127.0.0.1:54321`. | CA18 |
| Manuel — `git ls-files \| grep -E '^\.env$'` vide ; `git log --all --diff-filter=A --name-only \| grep -E '(^\|/)\.env$'` vide ; `git grep -n service_role` ne renvoie que des mentions textuelles (docs, `.env.example`), aucune valeur. | CA16, CA17 |
| Manuel — sur la PR, pousser un commit temporaire avec une erreur de type (`const n: number = 'a'` dans `index.vue`) → étape « Typecheck » rouge, statut rouge sur la PR ; puis `git revert` de ce commit (pas de push forcé). | CA19, CA20 |
| Manuel (humain) — Vercel : déploiement de production sur `main`, URL de prévisualisation sur la PR, variables limitées aux deux de D4 (Production + Preview). | CA23, CA24, CA25 |
| Manuel — relecture du `README.md`. | CA26 |

### Étapes d'implémentation

1. **Branche et squelette Nuxt.** `git switch -c feat/000-socle` depuis `main` à jour. Créer `package.json`, `.nvmrc`, `tsconfig.json`, `nuxt.config.ts` (sans les blocs `supabase`/`pwa` pour l'instant), `app/app.vue` (sans `<NuxtPwaManifest />`), `app/pages/index.vue` (titre + phrase). Lancer les deux commandes d'installation. *Vérif.* : `npm run dev` affiche « Carnet de nuits » sur `http://localhost:3000`.
2. **Tailwind v3 et thème.** Ajouter `tailwind.config.ts`, `app/assets/css/tailwind.css`, `app/spa-loading-template.html`, bloc `app.head`. *Vérif.* : fond sombre sans flash blanc au rechargement ; `npm ls tailwindcss` → uniquement 3.4.x ; aucun paquet `@tailwindcss/*` dans le lockfile.
3. **Outillage qualité.** `vitest.config.ts`, `eslint.config.mjs`, `app/utils/supabase-env.ts` + test, `tests/socle.test.ts`. *Vérif.* : `npm run lint`, `npm run typecheck`, `npm run test` verts.
4. **Supabase.** Bloc `supabase` de `nuxt.config.ts` (D5, D6), encart dans `index.vue`, `.env.example`, `npx supabase init`, `supabase/migrations/.gitkeep`, `supabase/seed.sql`. *Vérif.* : app sans `.env` → encart visible, pas de plantage ; avec `.env` factice valide → pas d'encart, aucune requête Supabase au chargement ; tests toujours verts.
5. **PWA.** `public/icon.svg`, `pwa-assets.config.ts`, `npm run generate-pwa-assets`, contrôler visuellement les PNG (fond sombre, pas de blanc), `public/offline.html`, bloc `pwa`, `<NuxtPwaManifest />` dans `app.vue`. *Vérif.* : `npm run build && npm run preview`, contrôles CA11/CA12 en local (tableau des tests).
6. **CI et README.** `.github/workflows/ci.yml`, `README.md`. Commits courts en français (ex. `chore(socle): initialise Nuxt 4 et Tailwind v3`, `feat(pwa): manifeste, icônes et écran hors-ligne`, `ci: lint, typecheck, tests et build`), ajout explicite des fichiers (pas `fix-path.ps1`). `git push -u origin feat/000-socle`, ouvrir la PR vers `main`. *Vérif.* : CI verte avec quatre étapes distinctes ; test CA20 (commit d'erreur puis revert).
7. **Étapes humaines puis clôture.** L'humain réalise les étapes manuelles 1 à 4 (Supabase, `.env`, Vercel, variables) ; vérifier la preview (CA13, CA24), fusionner, vérifier la production et la CI de `main` (CA22, CA23), étape 6 sur téléphone, puis protection de `main` (étape 5). Renseigner la section 3 (dont le résultat CA5).

### Risques / points d'attention

- **Fuseau horaire / minuit (SPEC §5.3)** : aucun calcul d'heure dans ce lot. D1 (SPA) écarte le rendu serveur en UTC. La CI tourne en UTC alors que la machine de dev est en `Europe/Paris` : à partir du lot 2, les fonctions de `app/utils/` doivent prendre le fuseau `Europe/Paris` explicitement (via `Intl`), jamais celui de la machine, et les tests doivent passer dans les deux environnements (c'est une bonne détection des dépendances au fuseau).
- **RLS** : sans objet (aucune table). Point de vigilance : `@nuxtjs/supabase` lit aussi `SUPABASE_SERVICE_ROLE_KEY` / `NUXT_SUPABASE_SECRET_KEY` s'ils existent dans l'environnement (runtimeConfig privé, serveur). Ils ne doivent exister ni dans Vercel ni dans la CI (CA25).
- **Hors-ligne** : la stratégie « NetworkOnly + page hors-ligne » (D7) est volontairement temporaire. Au lot 8, il faudra mettre en cache le shell applicatif (`navigateFallback` vers le shell SPA) pour saisir en mode avion ; `offline.html` ne servira alors plus que de secours. Avec `registerType: 'autoUpdate'`, un nouveau SW s'active au rechargement suivant : sans effet sur les données dans ce lot.
- **Performance mobile** : en SPA, premier affichage = shell vide + JS. Le fond sombre inline et le template de chargement évitent l'éblouissement ; la page d'accueil n'a aucune dépendance lourde. Pas de police web (police système).
- **`@nuxtjs/tailwindcss` 6.14.0** : aucune version depuis avril 2025 (la v7 en bêta vise Tailwind v4). Fonctionne avec Nuxt 4 à ce jour, mais maintenance ralentie ; si un build Nuxt/Vite futur le casse, il faudra rouvrir la décision Tailwind v3 de SPEC §12 (pas de contournement silencieux).
- **Vite 8 / rolldown** : Nuxt 4.5 utilise Vite 8 (rolldown, CSS minifié par LightningCSS). Tailwind v3 passe par PostCSS via le module ; vérifier au build que les classes utilisées sont bien présentes dans le CSS final (contrôle visuel étape 2).
- **TypeScript 7** : `typescript@latest` est 7.0.2 ; un `npm install typescript` sans version casserait `vue-tsc` et ESLint. D'où l'épinglage exact. Même vigilance pour `@vite-pwa/assets-generator` (2.0.0 hors plage).
- **Supabase CLI** : `npm ci` télécharge le binaire en `postinstall` (y compris en CI et sur Vercel) : quelques secondes de plus, dépendance à GitHub Releases. `db reset` exige Docker Desktop, absent de la machine actuelle : CA14 est à vérifier par l'humain après installation de Docker.
- **Node 24** : LTS actif jusqu'en octobre 2026, puis maintenance jusqu'en avril 2028. Node 26 devient LTS en octobre 2026 : montée de version à planifier hors de ce lot.
- **Précache Workbox** : sans `globPatterns` explicite, le module ne précache que le manifeste d'app Nuxt (code vérifié dans `@vite-pwa/nuxt` 1.1.1) et `offline.html` manquerait. Vérifier la présence de `offline.html` dans `.output/public/sw.js`.
- **Documentation** : CLAUDE.md décrit `npm run typecheck` comme `vue-tsc --noEmit` ; il s'agira de `nuxt typecheck` (D10). Proposer la mise à jour de CLAUDE.md (humain) plutôt que de la modifier dans ce lot.

## 3. Implémentation (developer)

- Branche : `feat/000-socle`
- Écarts par rapport au plan et pourquoi :
  - `vue` et `vue-router` installés avec `^` par npm (résolus en 3.5.43 et 5.3.1, plus récents que ceux du plan) ; conforme à la consigne « plage de Nuxt ».
  - `nuxt.config.ts` : l'ordre des clés a été réorganisé par `eslint --fix` (règle `nuxt/nuxt-config-keys-order`), sans changement de contenu.
  - `supabase/config.toml` : `site_url` mis à `http://localhost:3000` et `project_id` à `carnet-de-nuits` comme prévu ; le reste est la valeur par défaut de la CLI.
  - Étape 6 du plan (push, PR, test CA20 sur GitHub) non faite : pas de push demandé.
- Compatibilité modules avec Nuxt 4 (CA5) : `@nuxtjs/tailwindcss` 6.14.0, `@nuxtjs/supabase` 2.0.10 et `@vite-pwa/nuxt` 1.1.1 fonctionnent au build sans contournement. Seuls avertissements : le `console.warn` volontaire sur les variables Supabase absentes, et un `DeprecationWarning` Node (DEP0155) venant de `@nuxt/nitro-server`/`@vue/shared`, sans impact. Le SW est généré (20 entrées précachées) et `offline.html` est présent dans `sw.js`.
- Vérifié localement : le build servi par `node .output/server/index.mjs` renvoie la page (lang fr, fond sombre inline, CSS Tailwind) et `manifest.webmanifest` (200). Icônes PNG contrôlées visuellement (fond sombre, pas de blanc).
- Non vérifiable ici (vérification humaine) : CA1 sur clone neuf, CA7 à 360 px, CA11 à CA13 (téléphone, Lighthouse), CA14 (Docker absent), CA18 (requêtes réseau avec vrai `.env`), CA19 à CA25 (GitHub, Vercel).
- Proposition (humain) : mettre à jour CLAUDE.md, `npm run typecheck` est `nuxt typecheck` et non `vue-tsc --noEmit`.
- Résultat `lint` / `typecheck` / `test` : `lint` OK, `typecheck` OK, `test` 31 tests OK (2 fichiers), `build` OK.

## 4. Revue (reviewer)

- **Verdict** : ✅ OK | 🔁 à corriger | ⛔ bloquant
- Détail : voir le rapport de revue.
