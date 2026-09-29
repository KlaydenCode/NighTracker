# Carnet de nuits — Spécification fonctionnelle et technique

> Source de vérité du projet. Toute tâche doit s'y référer. Si une demande contredit ce document, on met d'abord la spec à jour, puis on code.

## 1. Contexte et objectif

Deux parents veulent suivre le sommeil de leur fille, âgée de **18 mois** au lancement du projet, qui a du mal à faire ses nuits. L'app remplace un carnet papier de suivi « soir et nuit » sur 2 semaines, fourni pour le pédiatre.

Objectifs :

1. Saisir vite et sans friction ce qui se passe le soir, pendant la nuit et au réveil, y compris à 3 h du matin, d'une main.
2. Partager les données entre les deux parents en temps réel.
3. Produire un bilan objectif sur une période d'observation et un export PDF pour le médecin.

## 2. Principes

- **Décrire, ne pas interpréter.** L'app affiche des faits et des tendances, jamais une « cause » des réveils ni un diagnostic.
- **Choix fermés d'abord, texte libre ensuite.** Les champs à choix alimentent les stats ; la note libre complète.
- **Saisie de nuit = priorité absolue.** Un réveil doit pouvoir être enregistré en 1 tap, et complété plus tard.
- **Tout est modifiable après coup.** On saisit l'essentiel sur le moment, on corrige le matin.
- **Données de santé d'un enfant = données sensibles.** Accès strictement limité au foyer.

## 3. Utilisateurs

- 2 parents (rôles d'affichage : Maman, Papa), chacun avec son compte.
- Un **foyer** regroupe les parents et l'enfant. Pas d'inscription publique : accès sur invitation.
- Tiers éventuels (grand-parent, nounou) : hors périmètre V1, mais le modèle prévoit la valeur `autre`.

## 4. Stack

| Couche | Choix |
|---|---|
| Front | **Nuxt 4** (structure `app/`), Vue 3 `<script setup lang="ts">`, TypeScript strict |
| UI | **Tailwind CSS v3** via le module `@nuxtjs/tailwindcss` (config `tailwind.config.ts`), mode sombre par défaut. Pas de Tailwind v4 ni de `@tailwindcss/vite` : ne jamais mélanger les deux. |
| PWA | `@vite-pwa/nuxt` (installable, icône, écran hors-ligne) |
| Back / BDD | Supabase : Postgres, Auth (lien magique), Realtime, RLS |
| Intégration | `@nuxtjs/supabase` |
| Tests | Vitest (logique de calcul), Playwright (parcours clés, lot 5+) |
| Hébergement | Vercel, déploiement auto sur push `main`, previews sur PR |
| Qualité | ESLint, `vue-tsc`, CI GitHub Actions |

## 5. Modèle de données

Conventions : identifiants en anglais, `snake_case`, clés `uuid`, horodatages `timestamptz`, textes UI en français.

### 5.1 Enums

```sql
create type caregiver         as enum ('maman', 'papa', 'autre');
create type fall_asleep_mode  as enum ('seule', 'avec_presence', 'bercee', 'autre');
create type waking_behavior   as enum ('calme', 'bouge', 'appelle', 'pleure', 'autre');
create type intensity         as enum ('non', 'un_peu', 'beaucoup');
create type morning_mood      as enum ('souriante', 'normale', 'grognon', 'pleurs');
create type health_signal     as enum ('ronflements', 'respiration_bruyante', 'pauses_respiratoires',
                                       'douleur', 'vomissements', 'fievre', 'demangeaisons', 'autre');
```

Listes de tags (texte, extensibles sans migration, valeurs proposées par défaut dans l'UI) :

- `bedtime_activities` : bain, histoire, câlin, chanson, jeu calme, jeu agité, écran, sortie
- `parent_actions` : présence, parole, main posée, bercer, prise dans les bras, biberon, eau, tétine, change, canapé, lit des parents
- `context_tags` : dents, rhume, fièvre, vaccin, crèche/nounou, journée inhabituelle, visite, voyage

### 5.2 Tables

**households** — `id`, `name`, `created_at`

**household_members** — `household_id`, `user_id` (→ `auth.users`), `role caregiver`, `display_name`, PK (`household_id`, `user_id`)

**children** — `id`, `household_id`, `first_name`, `birth_date date`

**observation_periods** — `id`, `child_id`, `label`, `start_date`, `end_date` (défaut : +13 jours)

**nights** — une ligne par soir (`unique (child_id, night_date)`)

| Colonne | Type | Source |
|---|---|---|
| `night_date` | date | date du **soir** |
| `last_meal_at` | timestamptz | carnet |
| `meal_eaten` | intensity | demande initiale (`non` / `un_peu` / `beaucoup`) |
| `last_bottle_at` | timestamptz | carnet |
| `last_bottle_ml` | int | demande initiale |
| `routine_started_at` | timestamptz | carnet |
| `put_to_bed_by` | caregiver | carnet (« Qui couche ? ») |
| `bedtime_activities` | text[] | carnet |
| `in_bed_at` | timestamptz | carnet (« Au lit ») |
| `fell_asleep_at` | timestamptz | carnet (« Endormie ») |
| `fall_asleep_mode` | fall_asleep_mode | carnet |
| `fall_asleep_place` | text | demande initiale (lit, bras, canapé…) |
| `context_tags` | text[] | idée |
| `evening_notes` | text | |
| `final_wake_at` | timestamptz | carnet (réveil définitif) |
| `morning_mood` | morning_mood | carnet |
| `morning_fatigue` | intensity | carnet |
| `night_summary` | text | carnet (« Comment s'est passée la nuit ? ») |
| `health_signals` | health_signal[] | carnet (conseil de bas de page) |
| `observations` | text | carnet |
| `created_by`, `updated_by` | uuid | audit |
| `created_at`, `updated_at` | timestamptz | |

**night_wakings** — une ligne par réveil nocturne

| Colonne | Type | Source |
|---|---|---|
| `night_id` | uuid | |
| `woke_at` | timestamptz, requis | carnet |
| `back_asleep_at` | timestamptz, nullable | carnet (réveil « ouvert » tant que null) |
| `behaviors` | waking_behavior[] | carnet (« Que fait-elle ? ») |
| `crying` | intensity | carnet |
| `crying_minutes` | int | carnet (« Combien de temps ? ») |
| `intervened_by` | caregiver | carnet |
| `parent_actions` | text[] | carnet (« Que fait le parent ? ») |
| `back_asleep_place` | text | demande initiale |
| `notes` | text | |
| `created_by`, `created_at`, `updated_at` | | |

Contrainte : `back_asleep_at is null or back_asleep_at > woke_at`.

**naps** *(lot 9)* — `id`, `child_id`, `started_at`, `ended_at`, `place`

### 5.3 Règles temporelles

- Une nuit appartient à la date du soir. La saisie d'une heure seule se convertit ainsi : heure ≥ 12:00 → `night_date` ; heure < 12:00 → `night_date + 1 jour`.
- Fuseau de référence : `Europe/Paris`. Stocker en UTC, afficher en local.

### 5.4 Sécurité (RLS)

- RLS activée sur **toutes** les tables.
- Fonction `is_household_member(household_id uuid) returns boolean` (`security definer`, `search_path` fixé).
- Chaque table est filtrée via la chaîne `child → household`. Lecture et écriture réservées aux membres du foyer.
- Aucune clé `service_role` côté client. Invitation par email : table `household_invitations (household_id, email, role, accepted_at)`.

## 6. Écrans

| Route | Rôle |
|---|---|
| `/login` | Lien magique |
| `/` | **Écran contextuel** : de 17 h à 23 h → « Ce soir » ; de 23 h à 7 h → « Cette nuit » ; de 7 h à 11 h → « Ce matin ». Accès aux deux autres en 1 tap. |
| `/nuits/[date]/soir` | Formulaire soirée |
| `/nuits/[date]/reveils` | Liste des réveils de la nuit + édition |
| `/nuits/[date]/matin` | Formulaire matin + signaux santé |
| `/nuits/[date]` | Frise chronologique de la nuit (lecture) |
| `/historique` | Liste des nuits, badges (nb réveils, signaux) |
| `/bilan` | Bilan de la période d'observation |
| `/export` | Génération du PDF |
| `/reglages` | Foyer, enfant, membres, invitations, période d'observation |

### 6.1 Actions rapides de nuit

- **« Elle se réveille »** : crée un `night_waking` avec `woke_at = now()` et `intervened_by = rôle de l'utilisateur`.
- **« Rendormie »** : renseigne `back_asleep_at = now()` sur le réveil ouvert.
- Ensuite, une feuille facultative propose : comportement, pleurs, actions du parent. Tout peut rester vide.
- Si un réveil ouvert existe, le bouton principal devient « Rendormie ».

### 6.2 Règles UX

- Mobile d'abord, mode sombre par défaut, luminosité faible la nuit (pas de blanc pur).
- Cibles tactiles ≥ 48 px, boutons principaux en bas de l'écran (zone du pouce).
- Toute heure est pré-remplie à « maintenant », arrondie à 5 min, et modifiable par un sélecteur rapide (−15 / −5 / +5).
- Enregistrement automatique des formulaires, pas de bouton « Valider » bloquant.
- Aucun son, aucune vibration.

## 7. Calculs et bilan

Logique en **fonctions pures** dans `app/utils/sleep-stats.ts`, couvertes par Vitest.

Par nuit :

- **Latence d'endormissement** = `fell_asleep_at − in_bed_at`
- **Durée d'éveil** d'un réveil = `back_asleep_at − woke_at` (ignorée si ouvert)
- **Sommeil nocturne total** = `(final_wake_at − fell_asleep_at) − Σ durées d'éveil`
- **Plus long bloc de sommeil** = plus grand intervalle entre endormissement, réveils et réveil définitif

Bilan de période (reprend le tableau « Bilan après 2 semaines » du carnet) :

| Indicateur | Calcul |
|---|---|
| Heure habituelle du coucher | médiane de `in_bed_at` (minutes relatives à 12:00 pour gérer minuit) |
| Durée avant endormissement | médiane et min/max de la latence |
| Nombre moyen de réveils | moyenne par nuit |
| Horaires de réveil fréquents | histogramme par tranches de 30 min |
| Réaction habituelle | fréquence de chaque `waking_behavior` et de `crying` |
| Personne qui intervient le plus | répartition de `intervened_by` |
| Ce qui favorise le retour au sommeil | médiane de durée d'éveil par `parent_actions`, avec effectif `n` |
| Différences selon qui couche | latence, nb de réveils, sommeil total par `put_to_bed_by` |
| Autres observations | liste des nuits avec `health_signals` ou `observations` |

Règles d'affichage :

- Toujours afficher l'effectif `n`. Si `n < 3` : « données insuffisantes ».
- Formulations descriptives uniquement (« retour au sommeil plus court en médiane quand… »), jamais causales.
- Mention permanente : « Ce bilan décrit le sommeil ; il ne permet pas à lui seul de déterminer la cause des réveils. »

## 8. Export PDF

- Contenu : identité de l'enfant (prénom, âge), période, bilan, puis une page par nuit (soirée, réveils, matin).
- Les nuits avec signaux de santé apparaissent en tête, dans un encadré.
- Mise en page proche du carnet papier, pour que le pédiatre s'y retrouve.
- Génération côté client (impression navigateur avec feuille de style `@media print`), sans service tiers.

## 9. Hors-ligne et temps réel

- Temps réel : abonnement Supabase Realtime sur `nights` et `night_wakings` du foyer.
- Hors-ligne (lot 0, provisoire) : le service worker affiche un écran `offline.html` quand une navigation échoue sans réseau. Remplacé au lot 8 par une app qui s'ouvre hors ligne.
- Hors-ligne (lot 8) : file d'attente locale (IndexedDB) des écritures, rejouée au retour du réseau. Conflit : dernier écrit gagne, par champ modifié.

## 10. Lots de livraison

| Lot | Contenu | Critère de fin |
|---|---|---|
| 0 | Socle : Nuxt, Tailwind, PWA, Supabase, CI, déploiement Vercel | Page d'accueil déployée, CI verte |
| 1 | Auth lien magique, foyer, enfant, invitation | Les 2 parents voient le même foyer |
| 2 | Formulaire soirée | Une nuit complète saisie et relue |
| 3 | Réveils + actions rapides | Réveil en 1 tap, frise d'une nuit |
| 4 | Matin + signaux santé | Nuit clôturée, badge signaux |
| 5 | Historique + frise | Navigation entre nuits |
| 6 | Bilan de période | Tableau du carnet calculé, tests verts |
| 7 | Export PDF | PDF lisible imprimé |
| 8 | Hors-ligne + temps réel | Saisie en mode avion puis synchro |
| 9 | Siestes, contexte de journée | V2 |

## 11. Hors périmètre V1

Notifications, multi-enfants dans l'UI (le modèle le permet), comptes tiers, IA d'analyse, intégration objets connectés.

## 12. Décisions

| Sujet | Décision | Conséquences |
|---|---|---|
| Âge de l'enfant | 18 mois au lancement | Tous les champs du §5 sont pertinents (dernier biberon, `biberon` dans `parent_actions`). Siestes utiles mais gardées au lot 9. L'âge affiché (PDF, réglages) est calculé depuis `children.birth_date`, jamais codé en dur. Aucun repère « normal pour l'âge » affiché (principe §2). |
| Nuxt 3 ou 4 | **Nuxt 4** | Code applicatif sous `app/` (`app/pages`, `app/components`, `app/composables`, `app/utils`, `app/types`). `supabase/`, `public/` et `server/` restent à la racine. Vérifier la compatibilité Nuxt 4 de chaque module au lot 0 (`@nuxtjs/supabase`, `@vite-pwa/nuxt`, `@nuxtjs/tailwindcss`). |
| Tailwind | **v3** via `@nuxtjs/tailwindcss` | Dépendance `tailwindcss@^3` épinglée. Aucune dépendance `@tailwindcss/vite`, `@tailwindcss/postcss` ni directive `@import "tailwindcss"`. Le module n'évolue plus (sa v7 vise Tailwind v4) : si un futur Nuxt le casse, rouvrir cette décision. |
| Rendu | **SPA** (`ssr: false`) | Tout le rendu se fait dans le navigateur, à l'heure du téléphone (les serveurs Vercel sont en UTC). Prépare le hors-ligne du lot 8. |
| Node / TypeScript | **Node 24** (`.nvmrc`, `engines`) · **TypeScript 5.9** | Nuxt 4.5 exige Node ≥ 24.11. TypeScript 7 est incompatible avec ESLint et `vue-tsc` : ne pas monter de version sans vérifier leur compatibilité. |
| Clé Supabase côté client | Clé **publique** (`anon` ou `sb_publishable_…`) | Exposée via `NUXT_PUBLIC_SUPABASE_KEY`. Jamais de clé `service_role` / `sb_secret_…` côté client. |

## 13. Questions ouvertes

- Rétention des données après la période : conserver, archiver, ou supprimer ?
