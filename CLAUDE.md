# CLAUDE.md — Carnet de nuits

PWA de suivi du sommeil d'un enfant, utilisée par deux parents. La spec complète est dans `SPEC.md` : **lis-la avant toute tâche**. Si une demande la contredit, signale-le et propose une mise à jour de la spec avant de coder.

## Stack

Nuxt 4 · Vue 3 `<script setup lang="ts">` · TypeScript strict · Tailwind CSS **v3** via `@nuxtjs/tailwindcss` (jamais de v4 / `@tailwindcss/vite`) · `@vite-pwa/nuxt` · Supabase (Postgres, Auth, Realtime, RLS) via `@nuxtjs/supabase` · Vitest · Vercel

## Commandes

```bash
npm run dev          # serveur de dev
npm run build        # build de prod
npm run lint         # ESLint
npm run typecheck    # vue-tsc --noEmit
npm run test         # Vitest
npx supabase migration new <nom>   # nouvelle migration
npx supabase db reset              # rejoue migrations + seed en local
npx supabase gen types typescript --local > app/types/database.ts
```

Avant de déclarer une tâche finie : `lint`, `typecheck` et `test` doivent passer.

## Structure

```
supabase/migrations/   SQL versionné (jamais modifier une migration déjà appliquée)
supabase/seed.sql      données de dev (un foyer, un enfant, 3 nuits)
app/types/database.ts      types générés — ne pas éditer à la main
app/utils/sleep-stats.ts   calculs purs (latence, éveils, bilan) + tests à côté
app/composables/           accès données (useNights, useWakings…)
app/components/            composants UI réutilisables
app/pages/                 routes (cf. SPEC §6)
docs/tasks/            fiches de tâche (une par fonctionnalité)
```

## Conventions

- Identifiants de code et de BDD en anglais ; textes d'interface en français.
- Pas d'accès Supabase direct dans les pages : passer par un composable.
- Toute logique de calcul va dans `app/utils/`, sous forme de fonction pure testée.
- Dates : stocker en UTC (`timestamptz`), afficher en `Europe/Paris`. Règle de rattachement d'une heure à la nuit : SPEC §5.3.
- UI : mobile d'abord, mode sombre par défaut, cibles ≥ 48 px, heure pré-remplie à « maintenant ». Relire SPEC §6.2 pour tout écran de saisie.
- Aucune formulation causale ou médicale dans l'UI (SPEC §2).

## Sécurité — non négociable

- RLS activée sur chaque nouvelle table, avec politique via `is_household_member()`.
- Jamais de clé `service_role` côté client ni dans un fichier commité.
- `.env` jamais commité ; tenir `.env.example` à jour.
- Pas de données réelles de l'enfant dans le seed, les tests ou les captures.

## Git

- Une branche par fiche : `feat/<numero>-<slug>`.
- Commits courts, au présent, en français : `feat(reveils): action rapide « Rendormie »`.
- Ne jamais pousser sur `main` ni forcer un push sans demande explicite.

## Équipe d'agents

Quatre sous-agents dans `.claude/agents/`, à enchaîner dans cet ordre :

1. **product-owner** : transforme une demande en fiche `docs/tasks/NNN-slug.md` (user stories, critères d'acceptation).
2. **tech-lead** : ajoute le plan technique à la fiche (fichiers, migration, RLS, tests). Ne code pas.
3. **developer** : implémente la fiche, écrit les tests, fait passer lint/typecheck/test.
4. **reviewer** : relit le diff contre la fiche et la spec, rend un verdict.

L'humain valide la fiche après l'étape 2, et le verdict après l'étape 4. Le modèle de fiche est `docs/tasks/_TEMPLATE.md`.
