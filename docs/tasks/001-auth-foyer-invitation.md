# 001 — Authentification par lien magique, foyer, enfant, invitation

- **Statut** : prête
- **Lot** : 1 (cf. SPEC §10)
- **Références spec** : SPEC §2 (données sensibles), §3 (Utilisateurs), §4 (Auth, tests), §5.1 (enum `caregiver`), §5.2 (`households`, `household_members`, `children`), §5.4 (RLS, `is_household_member()`, `household_invitations`), §6 (`/login`, `/reglages`), §6.2 (règles UX), §10 (lots 1 et 9), §11 (hors périmètre : comptes tiers), §12 (SPA, clé publique, âge calculé, décisions ajoutées), CLAUDE.md (Sécurité)

## 1. Besoin (product-owner)

### Contexte
Le socle (lot 0) est en ligne mais ne connaît personne. Ce lot rend l'app utilisable par exactement deux personnes : chaque parent se connecte avec un code à 6 chiffres reçu par email (ou, dans un navigateur, avec le lien contenu dans le même email), le premier crée le foyer et la fiche de l'enfant, le second est invité et rejoint le même foyer. Rien n'est saisi sur le sommeil dans ce lot : il pose l'identité et le cloisonnement des données (SPEC §2) sur lesquels les lots 2 à 9 s'appuient. Critère de fin (SPEC §10) : les 2 parents voient le même foyer.

Le point délicat est une contradiction apparente de la spec (§3 : « pas d'inscription publique, accès sur invitation ») : il faut bien que le tout premier foyer naisse quelque part, et que la personne invitée puisse recevoir un lien alors qu'elle n'a pas encore de compte. La réponse retenue (Q1, tranchée par l'humain : comptes fermés, un seul foyer par installation) se traduit dans les critères CA14 à CA17 et CA22.

Le code à 6 chiffres n'est pas un confort : sur iPhone, un lien d'email ne s'ouvre jamais dans la PWA installée (stockage séparé de Safari). Avec le lien seul, l'app installée serait inutilisable. Le code, saisi dans l'app là où on l'a demandé, est donc obligatoire (décision A1) ; le lien reste utilisable dans un navigateur.

Contrainte à anticiper (lot 9, hors lot 1) : une nounou sera invitée plus tard pour saisir les informations liées à son activité de la journée (siestes). Elle n'aura accès qu'à cette saisie : ni les nuits, ni le bilan, ni les réglages du foyer. Le lot 1 ne construit rien de cela, mais ne doit pas fermer la porte : Maman et Papa restent uniques dans le foyer, le rôle `autre` n'est pas interdit par le modèle et aucun plafond de « 2 membres » n'existe en base. L'écran du lot 1 n'invite que le second parent.

Risque accepté : les prévisualisations Vercel utilisent la base Supabase de production. L'humain l'accepte pour ce lot (une branche en test agit sur les vraies données, dans les limites de la RLS) ; à réévaluer avant le lot 2.

### User stories
- US1 — En tant que parent, je veux recevoir par email un code à 6 chiffres (et un lien) et entrer dans l'app en saisissant ce code, afin de ne pas avoir de mot de passe à retenir, y compris depuis l'app installée sur mon téléphone.
- US14 — En tant que parent sur iPhone, je veux pouvoir me connecter dans l'app installée sans dépendre de l'ouverture d'un lien, afin que l'app installée soit utilisable.
- US15 — En tant que parent qui se trompe de chiffre à 3 h du matin, je veux un message d'erreur simple en français et pouvoir redemander un code sans tout ressaisir, afin de ne pas rester bloqué.
- US2 — En tant que parent, je veux rester connecté sur mon téléphone après avoir fermé l'app, afin de ne jamais devoir retrouver un email à 3 h du matin.
- US3 — En tant que parent, je veux pouvoir me déconnecter, afin de protéger les données si je prête ou perds mon téléphone.
- US4 — En tant que parent, je veux qu'un visiteur non connecté ne voie aucune donnée et soit renvoyé vers la page de connexion, afin de protéger les données de santé de notre fille.
- US5 — En tant que parent, je veux qu'une adresse email qui n'a pas été autorisée ne puisse ni créer de compte ni recevoir de lien ou de code, sans que l'app révèle qui est autorisé, afin qu'aucun inconnu n'entre dans le foyer.
- US6 — En tant que premier parent, je veux créer le foyer et la fiche de notre fille (prénom, date de naissance), choisir mon rôle (Maman ou Papa) et mon nom d'affichage, afin de démarrer le carnet en une seule étape courte.
- US7 — En tant que parent connecté qui n'a pas de foyer, je veux un message clair sur ce qui manque et la marche à suivre, afin de ne pas rester devant un écran vide.
- US8 — En tant que parent, je veux inviter l'autre parent avec son adresse email, afin qu'il ou elle accède au même carnet.
- US9 — En tant que parent, je veux voir l'invitation en attente et pouvoir l'annuler, afin de corriger une faute de frappe dans l'adresse.
- US10 — En tant que second parent invité, je veux me connecter avec l'adresse invitée et rejoindre le foyer en un geste, afin de voir immédiatement le carnet de notre fille.
- US11 — En tant que parent, je veux consulter et corriger dans `/reglages` le foyer, l'enfant (avec son âge calculé), les membres et les invitations, afin de garder des informations justes.
- US12 — En tant que parent, je veux que l'autre parent et moi voyions exactement le même foyer et le même enfant, afin de partager un seul carnet.
- US13 — En tant que parent, je veux que personne en dehors de notre foyer ne puisse lire ni modifier nos données, afin d'avoir confiance dans l'outil.

### Critères d'acceptation

Convention de test : « Parent A » est le premier parent, « Parent B » le second parent invité, « Compte C » un compte connecté qui n'est pas membre du foyer de A (foyer d'un autre jeu de test, ou sans foyer). Les comptes de test sont fictifs (adresses en `@example.test`).

Connexion et déconnexion
- [ ] CA1 — Étant donné un visiteur non connecté sur téléphone (360 px), quand il ouvre `/login`, alors il voit un seul champ « Adresse email » (clavier email, `autocomplete="email"`) et un bouton principal « Recevoir mon code » d'au moins 48 px de haut, placé en bas de l'écran, sur fond sombre sans blanc pur (SPEC §6.2), sans son ni vibration. Le champ du code n'apparaît qu'après l'envoi (CA2).
- [ ] CA2 — Étant donné une adresse autorisée (compte existant ou invitation en attente), quand elle est saisie et validée, alors l'écran affiche « Si cette adresse est autorisée, un email vient d'être envoyé avec un code à 6 chiffres et un lien. Pensez à regarder dans les courriers indésirables. », l'adresse saisie est rappelée avec un lien « Changer d'adresse » (48 px minimum), le champ « Code reçu par email » et le bouton « Valider le code » apparaissent (CA56 à CA60), et un email contenant le code et le lien est envoyé (en local : visible dans la boîte mail de test de Supabase). Le code et le lien du même email ont la même durée de validité, indiquée dans l'email (fixée par le tech-lead).
- [ ] CA3 — Étant donné le lien reçu, quand je l'ouvre dans le navigateur du téléphone, alors je suis connecté sans autre saisie et j'arrive sur `/` si j'ai un foyer, sur `/bienvenue` sinon. Le lien n'est pas requis pour se connecter : le code (CA56) suffit.
- [ ] CA4 — Étant donné un lien expiré ou déjà utilisé, quand je l'ouvre, alors je vois « Ce lien n'est plus valable. Demandez-en un nouveau. » avec un accès direct à `/login`, sans écran blanc ni message technique.
- [ ] CA5 — Étant donné une saisie qui n'est pas une adresse email, quand je valide, alors « Adresse email invalide » s'affiche sous le champ et aucune demande de lien n'est envoyée.
- [ ] CA6 — Étant donné une adresse saisie avec des espaces autour ou des majuscules (« Papa@Exemple.FR »), quand je valide, alors elle est traitée comme « papa@exemple.fr » (même compte, même invitation).
- [ ] CA7 — Étant donné une demande de code qui vient d'être envoyée, quand je touche de nouveau le bouton d'envoi, alors il est désactivé pendant l'envoi puis pendant 60 secondes avec le libellé « Renvoyer dans N s » ; ensuite il devient « Renvoyer un code » (CA59).
- [ ] CA8 — Étant donné que je suis connecté, quand je ferme puis rouvre l'app (onglet fermé ou PWA installée relancée), alors je suis toujours connecté et je n'ai pas à redemander de lien.
- [ ] CA9 — Étant donné que je suis connecté, quand je touche « Se déconnecter » dans `/reglages` (bouton d'au moins 48 px), alors je suis renvoyé vers `/login` et le retour arrière du navigateur n'affiche aucune donnée du foyer.
- [ ] CA10 — Étant donné que le réseau est coupé, quand je demande un code ou que je valide un code, alors « Pas de connexion. Réessayez dans un moment. » s'affiche, sans plantage, et le code saisi reste dans le champ. Étant donné des variables Supabase absentes, quand j'ouvre `/login`, alors un encart nomme la variable manquante et la page ne reste pas blanche (prolonge lot 0 CA15).

Protection des routes
- [ ] CA11 — Étant donné un visiteur non connecté, quand il ouvre `/`, `/reglages` ou `/bienvenue`, alors il est redirigé vers `/login`, aucune donnée du foyer n'est affichée et aucune requête de données métier n'est émise vers Supabase (le critère du lot 0 « aucune requête sur `/` » est remplacé par celui-ci : seul un visiteur sans session n'émet aucune requête).
- [ ] CA12 — Étant donné un parent connecté, quand il ouvre `/login`, alors il est redirigé vers `/`. Étant donné un parent connecté sans foyer, quand il ouvre `/` ou `/reglages`, alors il est redirigé vers `/bienvenue`. Étant donné un parent membre d'un foyer, quand il ouvre `/bienvenue`, alors il est redirigé vers `/`.
- [ ] CA13 — Étant donné le réseau coupé, quand une navigation échoue, alors l'écran statique `offline.html` du lot 0 s'affiche toujours, sans dépendre de la session.

Adresse non autorisée (pas d'inscription publique)
- [ ] CA14 — Étant donné une adresse sans compte et sans invitation en attente, quand elle demande un code sur `/login`, alors l'écran affiche exactement le même message que CA2 et le même champ de code, aucun compte n'est créé (aucune nouvelle ligne côté authentification) et aucun email n'est envoyé. Tout code saisi ensuite donne le message de CA57.
- [ ] CA15 — Étant donné une adresse autorisée et une adresse non autorisée, quand je compare ce qui est affiché à l'écran (texte, champ de code, durée d'attente perceptible, comportement du bouton, message après un code erroné), alors rien ne permet de distinguer les deux cas : l'app ne révèle pas quelles adresses sont autorisées.
- [ ] CA16 — Étant donné une invitation annulée pour une adresse qui n'a jamais eu de compte, quand cette adresse demande un code, alors le comportement est celui de CA14.
- [ ] CA17 — Étant donné que le porteur du projet a créé le compte du premier parent depuis le tableau de bord Supabase (étape manuelle 4, « Create new user »), quand ce parent demande un code avec son adresse, alors il reçoit l'email et se connecte par le code ou par le lien (CA2, CA3, CA56).

Premier parent : foyer et enfant (`/bienvenue`, mode « Créer le foyer »)
- [ ] CA18 — Étant donné un parent connecté sans foyer, sans invitation en attente, et qu'aucun foyer n'existe encore, quand il arrive sur `/bienvenue`, alors il voit : « Prénom de l'enfant », « Date de naissance » (sélecteur de date natif), « Mon rôle » (deux grands boutons Maman / Papa, sans pré-sélection ; aucun rôle « Autre » proposé), « Mon nom d'affichage » (pré-rempli avec « Maman » ou « Papa » dès que le rôle est choisi, modifiable), et un bouton principal « Créer le foyer » en bas de l'écran, d'au moins 48 px.
- [ ] CA19 — Étant donné ce formulaire, quand un champ est invalide, alors un message en français apparaît sous le champ et rien n'est créé : prénom obligatoire (1 à 50 caractères après suppression des espaces), date obligatoire et non postérieure à aujourd'hui, rôle obligatoire, nom d'affichage de 1 à 30 caractères.
- [ ] CA20 — Étant donné un formulaire valide, quand je touche « Créer le foyer », alors le foyer, l'enfant et mon appartenance au foyer (avec mon rôle et mon nom) sont créés ensemble, tout ou rien (si l'un échoue, aucun n'existe), puis j'arrive sur `/`. Deux touches rapides ne créent qu'un seul foyer.
- [ ] CA21 — Étant donné un foyer créé, quand je consulte son nom, alors il vaut « Foyer de {prénom de l'enfant} », tronqué à 50 caractères (sans espace final) si le prénom dépasse 41 caractères ; le nom généré respecte donc toujours la règle de CA41. Il est modifiable dans `/reglages` (CA41).
- [ ] CA22 — Étant donné qu'un foyer existe déjà, quand un compte sans foyer tente d'en créer un autre (par l'écran ou en appelant directement l'API avec la clé publique), alors la création est refusée et rien n'est créé (un seul foyer par installation en V1, cf. Q1).

Parent connecté sans foyer
- [ ] CA23 — Étant donné un parent connecté sans foyer, sans invitation en attente pour son adresse, alors qu'un foyer existe, quand il arrive sur `/bienvenue`, alors il voit « Aucun foyer n'est associé à cette adresse. Demandez à l'autre parent de vous inviter avec l'adresse que vous utilisez ici. » et un bouton « Se déconnecter » (48 px minimum) ; il ne voit ni le formulaire de création, ni aucune donnée d'un foyer.

Invitation du second parent (`/reglages`)
- [ ] CA24 — Étant donné un parent membre dont le foyer n'a pas encore à la fois un Maman et un Papa, et aucune invitation en attente, quand il ouvre `/reglages`, alors la section « Invitations » propose : « Adresse email de l'autre parent », un rôle (seul le rôle Maman ou Papa encore libre est proposé, pré-sélectionné ; jamais « Autre ») et un bouton « Inviter ».
- [ ] CA25 — Étant donné une adresse valide, quand je touche « Inviter », alors l'adresse est enregistrée en minuscules, sans espaces, avec le rôle choisi, et apparaît sous « Invitation en attente » avec le rôle et la date. L'app affiche : « Adresse autorisée. Aucun email d'invitation n'est envoyé : demandez à cette personne d'ouvrir l'app et de demander un code de connexion avec cette adresse. » avec un bouton « Copier l'adresse de l'app ».
- [ ] CA26 — Étant donné une adresse déjà membre du foyer (y compris la mienne, quelle que soit la casse), quand je tente de l'inviter, alors « Cette personne fait déjà partie du foyer. » s'affiche et rien n'est enregistré.
- [ ] CA27 — Étant donné une invitation déjà en attente, quand je consulte la section, alors le formulaire est remplacé par l'invitation en attente, et un second enregistrement (même adresse avec une casse différente, ou autre adresse) est refusé par l'API : « Une invitation est déjà en attente. Annulez-la pour en créer une autre. »
- [ ] CA28 — Étant donné une invitation en attente, quand je touche « Annuler l'invitation » puis confirme (« Annuler l'invitation pour {adresse} ? »), alors elle disparaît de la liste et le formulaire d'invitation réapparaît. Si la personne était déjà connectée sans avoir accepté, sa prochaine tentative d'acceptation affiche « Cette invitation n'existe plus. » et rien ne change dans le foyer.
- [ ] CA29 — Étant donné un foyer qui compte déjà un Maman et un Papa, quand j'ouvre `/reglages`, alors aucun formulaire d'invitation n'est proposé (l'interface n'invite pas de nounou) et l'API refuse toute nouvelle invitation, y compris avec le rôle `autre` (CA63).

Acceptation par le second parent (`/bienvenue`, mode « Rejoindre »)
- [ ] CA30 — Étant donné une invitation en attente pour « papa@exemple.test », quand B demande un code avec « Papa@Exemple.test » puis le saisit (ou ouvre le lien du même email), alors B est connecté et arrive sur `/bienvenue` : « Vous êtes invité·e à rejoindre le foyer « {nom du foyer} ». », le rôle attribué, un champ « Mon nom d'affichage » pré-rempli, et un bouton principal « Rejoindre le foyer » en bas de l'écran (48 px minimum).
- [ ] CA31 — Étant donné cet écran, quand B touche « Rejoindre le foyer », alors B devient membre avec le rôle de l'invitation et le nom saisi, l'invitation est marquée comme acceptée (elle n'apparaît plus en attente), et B arrive sur `/`.
- [ ] CA32 — Étant donné une invitation déjà acceptée, quand l'acceptation est déclenchée une seconde fois (double touche, second onglet), alors B n'est pas ajouté en double et arrive sur `/` sans message d'erreur.
- [ ] CA33 — Étant donné une personne invitée à « papa@exemple.test » qui se connecte avec une autre adresse, quand elle ouvre l'app, alors : si cette autre adresse n'a pas de compte, aucun email n'est envoyé (CA14) ; si elle a un compte, elle voit le message de CA23 ; dans les deux cas, l'invitation reste en attente et aucun accès au foyer n'est accordé. Sur `/login`, une phrase d'aide indique « Utilisez l'adresse à laquelle l'invitation a été autorisée. »
- [ ] CA34 — Étant donné une invitation pour le rôle « papa », quand le premier parent choisit le rôle « papa » pour lui-même dans `/reglages` avant l'acceptation, alors ce changement est refusé avec « Ce rôle est réservé à l'invitation en attente. » (Maman et Papa restent uniques dans le foyer, cf. Q4).

Écran `/reglages` et accueil `/`
- [ ] CA35 — Étant donné un parent membre, quand il ouvre `/reglages`, alors il voit dans cet ordre : « Foyer » (nom), « Enfant » (prénom, date de naissance, âge calculé), « Membres » (nom d'affichage et rôle de chacun, le sien marqué « (vous) »), « Invitations », « Compte » (« Se déconnecter »). Aucune section « période d'observation » (lot 6, cf. Q3).
- [ ] CA36 — Étant donné l'écran `/reglages`, quand je modifie le nom du foyer, le prénom, la date de naissance, mon nom d'affichage ou mon rôle puis quitte le champ, alors la valeur est enregistrée automatiquement avec un « Enregistré » discret, sans bouton « Valider » (SPEC §6.2). Une valeur invalide (règles de CA19) affiche l'erreur et la valeur précédente reste celle enregistrée.
- [ ] CA37 — Étant donné A qui modifie le prénom de l'enfant, quand B recharge l'app, alors B voit le nouveau prénom. La mise à jour sans rechargement (temps réel) n'est pas exigée dans ce lot.
- [ ] CA38 — Étant donné la fiche de l'enfant, quand la date de naissance change, alors l'âge affiché est recalculé depuis `birth_date` (jamais codé en dur, SPEC §12) selon la règle : moins de 24 mois révolus → « N mois » (« Moins d'un mois » à 0) ; 24 mois et plus → « N ans » ou « N ans et M mois ». Exemples : né le 2025-03-15, on est le 2026-09-15 → « 18 mois » ; le 2026-09-14 → « 17 mois ». Le calcul se fait sur la date du jour à `Europe/Paris`. Aucun repère « normal pour l'âge » n'est affiché (SPEC §2).
- [ ] CA39 — Étant donné un parent, quand il consulte la ligne de l'autre parent dans « Membres », alors son nom et son rôle sont en lecture seule ; il ne peut modifier que les siens. Aucun bouton ne permet de supprimer le foyer, l'enfant ou un membre.
- [ ] CA40 — Étant donné un parent membre, quand il ouvre `/`, alors il voit, sans autre action, le nom du foyer, le prénom de l'enfant avec son âge (CA38) et un lien « Réglages » (zone tactile de 48 px minimum). L'écran contextuel « Ce soir / Cette nuit / Ce matin » reste hors périmètre.
- [ ] CA41 — Étant donné le nom du foyer modifié dans `/reglages`, quand l'autre parent recharge, alors il voit le nouveau nom (même règle de validation que le prénom : 1 à 50 caractères).

Critère de fin du lot
- [ ] CA42 — Étant donné A et B connectés sur deux appareils ou navigateurs distincts, quand chacun ouvre `/` puis `/reglages`, alors ils voient le même nom de foyer, le même prénom d'enfant, le même âge, et la même liste de deux membres avec leurs rôles et noms d'affichage.

Usage de nuit (SPEC §6.2)
- [ ] CA43 — Étant donné un parent connecté qui rouvre l'app la nuit, quand elle s'ouvre, alors il arrive sur `/` sans étape intermédiaire ni écran de connexion (CA8), sur fond sombre, sans blanc pur (fond, texte, champs, boutons, encarts), sans son ni vibration.
- [ ] CA44 — Étant donné les écrans `/login`, `/bienvenue` et `/reglages` à 360 px de large, quand je les parcours (y compris `/login` à l'étape de saisie du code, clavier numérique ouvert), alors aucun défilement horizontal n'apparaît, toute cible tactile fait au moins 48 px de haut et de large, et l'action principale de `/login` (« Recevoir mon code », puis « Valider le code ») et de `/bienvenue` est en bas de l'écran, atteignable sans fermer le clavier.
- [ ] CA45 — Étant donné tous les textes de ce lot, quand je les relis, alors ils sont en français et ne contiennent aucune formulation causale ou médicale (SPEC §2).

Accès restreint au foyer (données sensibles, SPEC §2, §5.4)
- [ ] CA46 — Étant donné les tables `households`, `household_members`, `children` et `household_invitations`, quand j'inspecte la base, alors la RLS est activée sur chacune, chaque politique passe par `is_household_member()` (ou une règle équivalente vérifiant l'appartenance de l'utilisateur), et cette fonction est `security definer` avec un `search_path` fixé.
- [ ] CA47 — Étant donné un client qui n'a que la clé publique et aucune session, quand il lit ou écrit l'une de ces quatre tables, alors il obtient zéro ligne ou un refus, et aucune écriture n'aboutit.
- [ ] CA48 — Étant donné le Compte C (non membre du foyer de A), quand il lit ces quatre tables, y compris avec un filtre direct sur l'identifiant du foyer, de l'enfant ou de l'invitation de A, alors il obtient zéro ligne (adresses email des invitations comprises).
- [ ] CA49 — Étant donné le Compte C, quand il tente d'insérer un enfant, de modifier ou supprimer le foyer ou l'enfant de A, de s'ajouter dans `household_members` de A, ou de créer, lire ou supprimer une invitation de A, alors chaque tentative est refusée et les données de A sont inchangées.
- [ ] CA50 — Étant donné B membre du foyer, quand il tente de modifier le rôle ou le nom d'affichage de A, de changer le `household_id` ou le `user_id` d'une ligne de membre, ou de s'insérer directement dans `household_members` sans passer par l'acceptation d'une invitation, alors chaque tentative est refusée. Aucun client ne peut supprimer un foyer, un enfant ni un membre.
- [ ] CA51 — Étant donné une invitation en attente pour l'adresse de B, quand le Compte C tente de l'accepter (y compris en appelant directement l'API), alors la tentative est refusée : seul l'utilisateur dont l'adresse email de session correspond à l'invitation, sans tenir compte de la casse, peut l'accepter.
- [ ] CA52 — Étant donné le code et la configuration du lot, quand je recherche `service_role` et `sb_secret_`, alors rien n'apparaît dans un fichier commité ni dans une variable exposée au client ; les seules variables Supabase restent l'URL et la clé publique (SPEC §12, CLAUDE.md). De même, aucun identifiant SMTP (adresse Gmail dédiée, mot de passe d'application) n'apparaît dans un fichier commité, dans `.env.example` ni dans une variable Vercel : il n'est saisi que dans le tableau de bord Supabase.

Base, seed et tests
- [ ] CA53 — Étant donné la première migration du lot, quand j'exécute `npx supabase db reset` en local, alors migrations et seed passent ; le seed contient uniquement des données fictives (un foyer, un enfant au prénom fictif, deux membres en `@example.test`), aucune donnée réelle de l'enfant ; `app/types/database.ts` est régénéré et à jour (`npx supabase gen types typescript --local`).
- [ ] CA54 — Étant donné les règles de ce lot, quand `npm run test` s'exécute, alors des tests Vitest couvrent au minimum : le calcul d'âge (CA38, avec limites de mois et de fin de mois), la normalisation de l'adresse email (CA6), la validation des formulaires (CA19), la validation du format du code (CA58). Les critères de sécurité CA46 à CA51, CA62 et CA63 sont couverts par des tests automatisés rejouables en local ; ceux qui ne peuvent pas tourner en CI (Docker requis) sont listés dans la section 3 avec la manière de les rejouer.
- [ ] CA55 — Étant donné le lot terminé, quand `npm run lint`, `npm run typecheck`, `npm run test` et `npm run build` s'exécutent, alors les quatre réussissent, et la CI de la pull request est verte.

Code à 6 chiffres (décision A1 ; complète CA1 à CA4, CA7, CA14, CA15)
- [ ] CA56 — Étant donné un code reçu par email et encore valable, quand je le saisis dans le champ « Code reçu par email » puis touche « Valider le code », alors je suis connecté dans l'app où je l'ai saisi (navigateur ou PWA installée) et j'arrive sur `/` si j'ai un foyer, sur `/bienvenue` sinon ; le bouton est désactivé pendant la vérification (deux touches ne lancent qu'une vérification).
- [ ] CA57 — Étant donné un code erroné, expiré, déjà utilisé ou remplacé par un code plus récent (ou une série de tentatives refusée par la limite de Supabase), quand je valide, alors le même message neutre s'affiche sous le champ : « Code incorrect ou expiré. Demandez-en un nouveau. » ; il est en français, sans détail technique, ne dit pas quelle est la cause ni si l'adresse est autorisée (CA15) ; le champ reste actif pour une nouvelle saisie ; aucune session n'est ouverte.
- [ ] CA58 — Étant donné une saisie qui ne fait pas exactement 6 chiffres, quand je valide, alors « Le code contient 6 chiffres. » s'affiche sous le champ et aucune vérification n'est envoyée. Les espaces, tirets et lettres sont ignorés ou refusés sans plantage, et un code collé avec un espace (« 123 456 ») est accepté.
- [ ] CA59 — Étant donné l'écran de saisie du code, quand j'attends la fin du compte à rebours (CA7) puis touche « Renvoyer un code », alors un nouvel email avec un nouveau code est envoyé (même message neutre qu'au CA2, nouveau compte à rebours de 60 s), le champ du code est vidé, et l'ancien code n'est plus accepté (CA57). Le bouton « Changer d'adresse » (CA2) ramène à la saisie de l'adresse, sans recharger la page.
- [ ] CA60 — Étant donné un téléphone tenu d'une main à 3 h du matin (360 px, SPEC §6.2), quand j'arrive sur l'étape du code, alors : le champ est déjà actif, ouvre le clavier numérique (`inputmode="numeric"`, `autocomplete="one-time-code"`), fait au moins 48 px de haut, affiche les chiffres en grand caractère lisible ; « Valider le code », « Renvoyer un code » et « Changer d'adresse » font au moins 48 px et se touchent sans fermer le clavier ; fond sombre sans blanc pur, sans son ni vibration ; le message d'erreur reste visible avec le clavier ouvert.
- [ ] CA61 — Étant donné un iPhone avec l'app installée sur l'écran d'accueil (vérification manuelle en production, étape manuelle 7), quand je demande un code depuis l'app installée, lis l'email dans une autre app puis reviens dans l'app installée pour saisir le code, alors je suis connecté dans l'app installée, sans avoir touché le lien.

Membres, rôles et modèle ouvert à la nounou (décision « Nounou » ; voir Q4)
- [ ] CA62 — Étant donné la base au terme de ce lot, quand un test de base (en propriétaire, hors interface) ajoute des membres, alors : un second Maman ou un second Papa dans le même foyer est refusé ; un membre de rôle `autre` est accepté ; ajouter un troisième, un quatrième membre (rôle `autre`) est accepté : aucune règle de base de données ne plafonne le nombre de membres. Un utilisateur reste membre d'un seul foyer.
- [ ] CA63 — Étant donné les fonctions du lot 1 appelées avec la clé publique et une session valide, quand un parent tente de créer un foyer avec le rôle `autre`, d'inviter une adresse avec le rôle `autre`, ou de passer son propre rôle à `autre`, alors la tentative est refusée et rien n'est créé ni modifié : le lot 1 ne construit pas l'invitation d'une nounou (elle exigerait un modèle de droits limités, lot 9). L'interface ne propose le rôle « Autre » nulle part (CA18, CA24, CA36).

Envoi des emails (décision A3)
- [ ] CA64 — Étant donné le SMTP du compte Gmail dédié configuré dans le tableau de bord Supabase de production, quand une adresse autorisée qui n'est pas membre de l'organisation Supabase du projet (le second parent) demande un code, alors elle reçoit l'email (code et lien) en moins de 2 minutes, expéditeur lisible, en français ; vérification manuelle en production.

### Étapes manuelles (à faire par l'humain, hors de portée des agents)

Aucun agent ne saisit ni ne stocke de secret ni d'adresse email réelle. À recopier dans le `README.md`.

L'ordre exact (notamment celui du crochet d'inscription) est fixé par le tech-lead en section 2 ; la liste ci-dessous en donne le contenu.

1. **Envoi d'emails : compte Gmail dédié à l'app** (décision A3). Sans SMTP personnalisé, Supabase n'envoie qu'aux adresses membres de l'organisation du projet et limite fortement le nombre d'emails : le second parent ne recevrait rien.
   1. Créer un compte Gmail **dédié à l'app** (pas le compte personnel du porteur du projet).
   2. Activer la validation en deux étapes sur ce compte.
   3. Créer un mot de passe d'application (Compte Google > Sécurité > Mots de passe des applications) ; le noter dans un gestionnaire de mots de passe.
   4. Le saisir, avec l'adresse Gmail dédiée, dans le tableau de bord Supabase (Authentication > Emails > SMTP Settings). Ni dans le dépôt, ni dans `.env.example`, ni dans Vercel, ni dans une conversation avec un agent.
   Hôte, port, chiffrement, nom d'expéditeur et limites d'envoi de Gmail : à préciser par le tech-lead dans le `README.md`.
2. **Appliquer la migration** au projet Supabase distant (`npx supabase link` puis `npx supabase db push`), après relecture.
3. **Réglages Auth du projet distant** : URL du site = https://nigh-tracker.vercel.app/ ; ajouter aux « Redirect URLs » l'URL de production, `http://localhost:3000` et le motif des prévisualisations Vercel ; gabarits d'email contenant le code à 6 chiffres et le lien ; durée de validité du code (CA2).
4. **Créer le compte du premier parent** dans le tableau de bord Supabase : Authentication > Users > Add user > **« Create new user »** (« Auto Confirm User » coché). Ne pas utiliser « Send invitation » : le crochet d'inscription la refuserait. C'est la seule création de compte hors invitation (Q1).
5. **Activer le crochet d'authentification** qui refuse les comptes non invités (Q1, A2), dans l'ordre indiqué par le tech-lead.
6. **Contrôle en production** : demander un code avec une adresse inconnue ; aucun utilisateur nouveau ne doit apparaître dans Authentication > Users (CA14).
7. **Vérification finale sur téléphone** avec deux vrais comptes : connexion par code, création du foyer, invitation, acceptation, CA42, CA61 (iPhone, app installée), CA64 (email reçu par le second parent).

### Hors périmètre
- Tables `nights`, `night_wakings`, `observation_periods`, `naps`, leurs enums et listes de tags ; seul l'enum `caregiver` est créé (SPEC §5.1).
- Période d'observation dans `/reglages` : reportée au lot 6 (Q3).
- Écran contextuel de `/`, formulaires soirée / réveils / matin, historique, bilan, export PDF.
- Temps réel (abonnement Realtime) et hors-ligne avancé : lot 8. Ici, une modification est visible chez l'autre parent au rechargement.
- Envoi d'un email d'invitation par l'app (fonction serveur ou Edge Function avec clé d'administration). Le SMTP Gmail dédié, lui, fait partie du lot (étape manuelle 1).
- Retrait d'un membre, quitter le foyer, suppression du foyer, de l'enfant ou du compte, transfert de foyer, changement d'adresse email.
- **Nounou (lot 9)** : invitation d'une nounou, rôle « Autre » proposé dans l'interface, modèle de droits limités (accès à la seule saisie des informations liées à son activité de la journée, siestes ; ni nuits, ni bilan, ni réglages du foyer), écran de saisie de la nounou. Le lot 1 se borne à ne pas fermer la porte (Q4, CA62, CA63).
- Autres comptes tiers (grand-parent) ; plusieurs enfants dans l'UI (SPEC §11) ; plusieurs foyers par utilisateur ; ouverture à d'autres familles.
- Envoi du code par un autre canal que l'email (SMS) ; connexion sans saisie du code.
- Connexion par mot de passe ou par un fournisseur tiers (Google, Apple).
- Rétention des données (SPEC §13) : question toujours ouverte, sans effet sur ce lot.
- Notifications, analytics, tests Playwright (lot 5+).

### Questions et décisions

Toutes les questions ci-dessous sont **tranchées** par l'humain (validation n° 1), sauf Q10 qui reste ouverte sans effet sur ce lot. Les décisions A1 à A3 et « Nounou », issues du plan technique et de la validation, sont consignées à la suite (Q11 à Q14).

- **Q1 — TRANCHÉE : option A, validée telle quelle par l'humain.** « Pas d'inscription publique » : comment naît le premier foyer, et que se passe-t-il pour une adresse inconnue ?
  Options :
  - **A. Comptes fermés + un seul foyer (retenue).** Aucune adresse ne peut créer de compte sans y être autorisée : le premier parent est créé à la main par le porteur du projet dans Supabase (étape manuelle 4) ; le second est autorisé par l'invitation enregistrée dans l'app. Une adresse inconnue reçoit le message neutre de CA2 sans compte ni email (CA14, CA15). La création d'un foyer n'est possible que tant qu'aucun foyer n'existe (CA22) : un compte sans foyer ne peut donc jamais en fonder un second. Le mécanisme technique (par exemple un crochet d'authentification Supabase « avant création d'utilisateur » qui n'accepte que les adresses invitées) est laissé au tech-lead ; il doit respecter CA14 à CA17.
  - **B. Inscription ouverte, création de foyer libre.** Simple, mais contredit SPEC §3, envoie des emails à n'importe qui et laisse un inconnu fonder un foyer. Écartée.
  - **C. Invitation par email réel via une Edge Function.** Meilleure expérience (un vrai email « Vous êtes invité »), mais code serveur et clé d'administration côté Supabase : reportée à un lot ultérieur.
  - **D. Liste d'emails autorisés en configuration.** Met des adresses réelles dans la configuration et ne règle pas l'invité. Écartée.
  - **Décision : A.** Conséquence assumée par l'humain : l'app est mono-famille en V1 (un seul foyer par installation) ; ouvrir à d'autres familles exigera une décision de spec.
- **Q2 — TRANCHÉE (validée telle quelle) : l'app n'envoie pas d'email d'invitation.** L'invitation enregistre l'adresse autorisée et son rôle ; l'invité reçoit l'email de connexion standard de Supabase (code et lien) quand il le demande sur `/login`. L'inviteur le prévient lui-même (bouton « Copier l'adresse de l'app », CA25). Le mot « email » de SPEC §5.4 est précisé en conséquence (voir modifications de spec).
- **Q3 — TRANCHÉE (validée telle quelle). La période d'observation (SPEC §6) relève-t-elle du lot 1 ?** Décision : non. La table `observation_periods` et sa section de `/reglages` sont livrées au lot 6 avec le bilan ; `/reglages` du lot 1 n'affiche que foyer, enfant, membres, invitations, compte.
- **Q4 — TRANCHÉE, RÉÉCRITE après l'information « nounou » (contredit la réponse par défaut initiale). Limites du foyer.** Décision :
  - Un utilisateur appartient à un seul foyer.
  - Maman et Papa sont chacun **uniques** dans un foyer (au plus un Maman, au plus un Papa). Justification inchangée : `intervened_by` est déduit du rôle de l'utilisateur (SPEC §6.1) et le bilan compare les personnes qui interviennent (SPEC §7) ; deux membres au même rôle rendraient ces statistiques ambiguës.
  - **Le modèle n'interdit plus le rôle `autre`** et **aucun plafond de « 2 membres » n'existe en base** : une nounou (rôle `autre`, lot 9) pourra être ajoutée sans migration qui desserre une règle. Le plafond n'est plus une règle de base de données.
  - **L'interface et les fonctions du lot 1 restent fermées** : seul le second parent peut être invité ; le rôle « Autre » n'est proposé nulle part ; l'invitation avec le rôle `autre` est refusée par l'API (CA63). Ce que le modèle permet (CA62) et ce que l'app propose (CA24, CA29, CA63) sont volontairement différents.
  - La nounou (lot 9) aura des droits limités à la saisie des informations liées à son activité ; ce modèle de droits est hors lot 1 (Hors périmètre).
  Limite connue : le modèle n'accueille pas deux parents de même rôle ; à rouvrir si besoin.
- **Q5 — TRANCHÉE (validée telle quelle). Durée de vie et révocation d'une invitation.** Décision : pas d'expiration en V1 ; la révocation supprime la ligne (pas d'historique) ; une seule invitation en attente à la fois ; le rôle est celui encore libre.
- **Q6 — TRANCHÉE (validée telle quelle ; le tech-lead précise que la route de retour est à créer : `/confirm`). Où vit l'étape de création / d'acceptation ?** Décision : une nouvelle route `/bienvenue` (création du foyer ou acceptation d'invitation, selon la situation), plus la route de retour du lien magique. Ces routes ne figurent pas au tableau de SPEC §6 (modification proposée ci-dessous).
- **Q7 — TRANCHÉE (validée telle quelle). Nom du foyer.** Décision : non demandé à la création ; généré « Foyer de {prénom} » (tronqué à 50 caractères, CA21), modifiable dans `/reglages`.
- **Q8 — TRANCHÉE (validée telle quelle). Enregistrement automatique (SPEC §6.2) vs bouton.** Décision : `/reglages` enregistre automatiquement au fil des champs (CA36) ; `/bienvenue` garde un bouton explicite (« Créer le foyer », « Rejoindre le foyer ») car c'est une action unique et non une saisie de nuit.
- **Q9 — TRANCHÉE (validée telle quelle). Format d'affichage de l'âge.** Décision : règle de CA38 (mois révolus avant 24 mois, puis années et mois).
- **Q10 — OUVERTE (SPEC §13), sans effet sur ce lot. Rétention des données.** Sans objet dans ce lot, aucune suppression n'est proposée ; la question reste ouverte pour la fin de la période d'observation. (Non citée dans la validation de l'humain : laissée ouverte.)
- **Q11 — TRANCHÉE (arbitrage A1) : code à 6 chiffres, obligatoire.** Sur iPhone, un lien d'email ne s'ouvre jamais dans la PWA installée ; le lien seul rend l'app installée inutilisable. L'email de connexion contient un code à 6 chiffres que l'utilisateur saisit dans l'app, en plus du lien (le lien reste utilisable dans un navigateur). Traduit dans CA1 à CA4, CA7, CA14 à CA17 et CA56 à CA61.
- **Q12 — TRANCHÉE (arbitrage A2) : le compte du second parent est créé par l'invitation** (crochet d'authentification, comme dans Q1-A). L'alternative « deux comptes créés à la main » est écartée.
- **Q13 — TRANCHÉE (arbitrage A3) : SMTP d'un compte Gmail dédié à l'app**, avec mot de passe d'application. Rien à héberger, pas de nom de domaine. Fait partie des étapes manuelles du lot (étape 1) ; hôte, port et limites : tech-lead.
- **Q14 — TRANCHÉE : nounou.** Voir Q4. Ajout ultérieur au lot 9 avec droits limités ; le lot 1 ne ferme pas la porte et n'invite que le second parent.
- **Risque accepté** : les prévisualisations Vercel utilisent la base Supabase de production (voir Contexte).

### Modifications de `SPEC.md` proposées (appliquées après la validation humaine n° 1)

Liste complète, une modification par section, à appliquer telle quelle après validation. Le §4 (Auth), le §5.2 et le complément du §5.4 (crochet, fonctions) sont techniques et restent au tech-lead (section 2) ; voir en fin de liste ce qu'ils doivent respecter.

1. **§3, deuxième et troisième puces.**
   Avant (puce 2) : « Un **foyer** regroupe les parents et l'enfant. Pas d'inscription publique : accès sur invitation. »
   Après : « Un **foyer** regroupe les parents et l'enfant. Pas d'inscription publique : aucun compte ne peut être créé sans autorisation. Le premier parent est créé par le porteur du projet dans Supabase ; le second est invité depuis `/reglages`. En V1, l'app est mono-famille : un seul foyer par installation, un utilisateur n'appartient qu'à un seul foyer, et Maman et Papa sont chacun uniques dans le foyer. »
   Avant (puce 3) : « Tiers éventuels (grand-parent, nounou) : hors périmètre V1, mais le modèle prévoit la valeur `autre`. »
   Après : « **Nounou** (lot 9) : invitée par les parents avec le rôle `autre` et des droits limités. Elle n'accède qu'à la saisie des informations liées à son activité de la journée (siestes) ; elle ne voit ni les nuits, ni le bilan, ni les réglages du foyer. Le modèle n'interdit pas ce rôle (aucun plafond de membres), mais aucune invitation de tiers n'est proposée avant le lot 9. Autres tiers (grand-parent) : hors périmètre V1. »
2. **§5.4, dernière puce.** Avant : « Invitation par email : table `household_invitations (household_id, email, role, accepted_at)`. » Après : « Invitation : table `household_invitations (id, household_id, email, role, invited_by, created_at, accepted_at)`. L'adresse est stockée en minuscules ; une seule invitation en attente par foyer ; la révocation supprime la ligne ; pas d'expiration en V1. L'app n'envoie pas d'email d'invitation : elle autorise l'adresse, et Supabase Auth envoie l'email de connexion (code à 6 chiffres et lien) quand la personne le demande sur `/login`. L'acceptation est une action explicite, exécutée par une fonction `security definer` qui compare l'adresse de la session à celle de l'invitation, sans tenir compte de la casse. La création du foyer (foyer, enfant, membre) passe par une fonction unique, refusée si un foyer existe déjà. »
3. **§6, tableau des routes.**
   `/login` — Avant : « Lien magique ». Après : « Connexion par code à 6 chiffres reçu par email (le lien du même email fonctionne dans un navigateur) ».
   Ajouter la ligne : « `/bienvenue` | Création du foyer et de l'enfant (premier parent) ou acceptation d'une invitation (second parent) ; message si aucun foyer n'est associé au compte ».
   Ajouter la ligne : « `/confirm` | Retour du lien de l'email ; affiche un message si le lien n'est plus valable » (route créée par le tech-lead, D8).
   `/reglages` — Avant : « Foyer, enfant, membres, invitations, période d'observation ». Après : « Foyer, enfant, membres, invitations, déconnexion (période d'observation ajoutée au lot 6) ».
4. **§10, lot 1.** Avant : « Auth lien magique, foyer, enfant, invitation ». Après : « Auth par code à 6 chiffres (et lien), foyer, enfant, invitation du second parent, `/bienvenue`, `/reglages` (sans période d'observation). Le modèle n'interdit ni le rôle `autre` ni plus de deux membres. » Critère de fin inchangé : « Les 2 parents voient le même foyer ».
5. **§10, lot 9.** Avant : « Siestes, contexte de journée | V2 ». Après : « Siestes, contexte de journée ; invitation de la nounou (rôle `autre`, droits limités à la saisie de son activité de la journée) | V2 ».
6. **§11.** Avant : « Notifications, multi-enfants dans l'UI (le modèle le permet), comptes tiers, IA d'analyse, intégration objets connectés. » Après : « Notifications, multi-enfants dans l'UI (le modèle le permet), comptes tiers autres que la nounou (prévue au lot 9), IA d'analyse, intégration objets connectés. »
7. **§12, Décisions** : ajouter quatre lignes.
   « Connexion | Code à 6 chiffres **et** lien dans le même email de connexion | Sur iPhone, un lien d'email ne s'ouvre jamais dans la PWA installée (stockage séparé de Safari) : le code saisi dans l'app est le moyen de s'y connecter. Le lien reste utilisable dans un navigateur. »
   « Portée V1 | App mono-famille : un seul foyer, comptes fermés | Le premier parent est créé à la main dans Supabase, le second par l'invitation. Ouvrir à d'autres familles exigera une décision de spec. »
   « Envoi d'emails | SMTP d'un compte Gmail dédié à l'app (mot de passe d'application) | Sans SMTP personnalisé, Supabase n'envoie qu'aux membres de l'organisation du projet. Aucun nom de domaine à gérer ; identifiants saisis uniquement dans le tableau de bord Supabase. Limites d'envoi de Gmail : voir `README.md`. »
   « Rôles et nounou | Maman et Papa uniques par foyer ; rôle `autre` permis par le modèle ; nounou au lot 9 avec droits limités | Aucun plafond de membres en base. Au lot 1, l'interface n'invite que le second parent. Toute politique d'accès des lots 2 à 8 doit pouvoir exclure le rôle `autre`. »

À respecter par les compléments techniques (§4, §5.2, §5.4) : Auth « lien magique » devient « code à 6 chiffres ou lien magique » au §4 ; au §5.2, pas de « rôle `autre` refusé » ni de plafond de deux membres : seulement l'unicité de Maman et de Papa par foyer (par exemple `unique (household_id, role)` limitée aux rôles `maman` et `papa`) ; une seule invitation en attente par foyer et l'invitation d'un rôle `autre` refusée par la fonction d'invitation du lot 1 (CA63) restent compatibles.

## 2. Plan technique (tech-lead)

Plan aligné sur la section 1 après la validation humaine n° 1 (Q1 à Q14 tranchées). Légende des sources : **[testé]** = exécuté le 2026-09-30 sur une instance Supabase locale jetable, hors du dépôt (CLI 2.118.0, Auth `gotrue` v2.197.0, Postgres 17.6), avec la migration, le seed, la configuration et les gabarits d'email écrits ci-dessous ; **[lu]** = lu dans le code installé (`node_modules`), dans le source de Supabase Auth ou dans la documentation Supabase ; **[supposé]** = non vérifiable ici (projet distant, Gmail, téléphone).

### Décisions structurantes

| # | Décision | Raison |
|---|---|---|
| D1 | **Session dans `localStorage`, flux implicite** : `supabase.useSsrCookies: false` et `clientOptions.auth.flowType: 'implicit'`. | [lu] Avec `useSsrCookies: true` (défaut du module), `@supabase/ssr` force le flux PKCE et range les jetons dans des cookies envoyés à Vercel à chaque requête, sans utilité en SPA ; le cookie est marqué `secure`, ce qui gêne les essais en `http` sur le réseau local. `localStorage` persiste après fermeture (CA8). Le code et le lien sont vérifiés par l'app elle-même (D8, D14) : PKCE n'apporte rien. |
| D2 | **Comptes fermés côté serveur par un crochet Auth « before user created »** en fonction Postgres (`public.hook_before_user_created`) : une création de compte n'est acceptée que s'il existe une invitation en attente pour cette adresse. Les inscriptions restent activées, c'est le crochet qui filtre. Le client appelle `signInWithOtp` avec `shouldCreateUser: true`. | Q1-A et Q12. [testé] Adresse inconnue : `/otp` et `/signup` répondent 403, aucune ligne dans `auth.users`, aucun email (CA14, CA16). Adresse invitée : compte créé, email envoyé. Un compte créé par l'API d'administration (ce que fait « Create new user ») n'est pas soumis au crochet (CA17). `shouldCreateUser: false` seul ne protégerait rien : c'est un paramètre de la requête. |
| D3 | **Les sessions ouvertes par mot de passe n'ont accès à rien** : `is_household_member()`, `is_household_parent()` et toutes les fonctions du lot refusent un jeton dont la revendication `amr` contient la méthode `password`. | [testé] La faille est réelle : pendant qu'une invitation est en attente, un tiers peut créer le compte de l'adresse invitée par `/auth/v1/signup` avec son propre mot de passe ; dès que le vrai parent valide son code, le tiers se connecte par mot de passe. [testé] Sa session porte `amr: password` : il lit zéro ligne et toutes les fonctions lui répondent `not_authenticated`. Une session ouverte par code ou par lien porte `amr: otp`, y compris pour un compte créé par l'administrateur avec un mot de passe. |
| D4 | **Toute écriture sensible passe par une fonction `security definer`** : `create_household`, `invite_member`, `accept_invitation`, `update_my_membership`. Aucune politique d'insertion, de modification ni de suppression sur `household_members` ; aucune insertion directe sur `households`, `children`, `household_invitations`. | Les règles (un seul foyer, Maman et Papa uniques, adresse déjà membre, rôle réservé, rôle `autre` refusé au lot 1) exigent de lire `auth.users` ou plusieurs tables. CA50 devient vrai par construction. |
| D5 | **Ce que le modèle garantit, par contraintes** : index unique sur l'expression constante `(true)` de `households` (un seul foyer) ; `unique (user_id)` sur `household_members` (un seul foyer par utilisateur) ; index unique **partiel** sur `household_members (household_id, role) where role in ('maman','papa')` (au plus un Maman, au plus un Papa) ; index unique partiel sur `household_invitations (household_id) where accepted_at is null`. **Aucun plafond de membres, rôle `autre` permis** (CA62). Ce que le lot 1 refuse en plus (rôle `autre` à la création, à l'invitation, à l'acceptation, au changement de rôle, CA63) est dans les fonctions, pas dans le modèle. | Q4 réécrite et Q14. Résiste aux appels concurrents (CA20, CA22, CA27, CA32). Le lot 9 n'aura aucune contrainte à desserrer pour ajouter la nounou ; il modifiera les fonctions. |
| D6 | **L'invité ne lit pas la table des invitations** : il appelle `get_onboarding_state()`, qui renvoie son état (`member`, `invited`, `create`, `no_household`) et, s'il est invité, le nom du foyer et le rôle. `accept_invitation` ne prend **aucun identifiant** en paramètre : elle cherche l'invitation en attente dont l'adresse est celle du compte appelant. | Il faut à l'invité le nom du foyer (CA30), que la RLS lui refuse. Sans paramètre, rien à falsifier : un compte ne peut rejoindre que le foyer qui a invité sa propre adresse (CA51). L'adresse est lue dans `auth.users` (confirmée), pas dans le jeton. |
| D7 | **Un seul middleware global maison** (`app/middleware/auth.global.ts`), `supabase.redirect: false`. La décision de redirection est une fonction pure (`resolveAuthRedirect`). | [lu] Le middleware du module ne connaît que « session ou pas ». Une seule fonction pure couvre CA11 et CA12 en Vitest. Remplace la note D6 du lot 0 (« `redirect: true` au lot 1 »). |
| D8 | **Le lien de l'email pointe vers l'app, pas vers Supabase** : gabarit `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`, et la page `/confirm` (à créer) appelle `verifyOtp({ token_hash, type: 'email' })`. | Le code et le lien d'un même email partagent un seul jeton [testé : utiliser l'un invalide l'autre]. Avec le lien standard de Supabase, une messagerie qui ouvre les liens à l'avance consommerait le jeton, donc aussi le code, qui est le moyen de connexion obligatoire. Ici le jeton n'est consommé que si la page s'exécute dans un navigateur. [testé] Le lien ouvre une session (`amr: otp`) ; une adresse de retour non autorisée est remplacée par l'URL du site. Aucune lecture de jeton dans le fragment d'URL. |
| D9 | **Neutralité de l'écran de connexion.** Le message de CA2 et l'étape du code s'affichent 1,5 s après la touche, sans attendre la réponse et pour toute adresse ; toute réponse HTTP de l'envoi (succès, refus du crochet, limite d'envoi) donne le même écran ; toute réponse HTTP d'erreur de la vérification donne le message de CA57. Seule une absence de réponse réseau affiche « Pas de connexion ». | CA14, CA15, CA57. [testé] Code faux, code remplacé, code déjà utilisé et adresse sans compte reçoivent la même réponse (403 `otp_expired`), en 15 à 30 ms. L'envoi, lui, diffère en durée selon le cas : d'où le délai fixe. |
| D10 | **Tests de sécurité en pgTAP** (`supabase/tests/database/`, `npx supabase test db`), exécutés par un nouveau job de CI ; garde statique de la migration en Vitest. | Rejouable, sans clé `service_role`. [testé] 41 assertions de ce type passent sur l'instance locale, avec `supabase db start` seul. |
| D11 | **Déconnexion locale** : `signOut({ scope: 'local' })`. | Le défaut (`global`) déconnecterait aussi l'autre appareil du même parent (US2). Téléphone perdu : révoquer depuis le tableau de bord Supabase. |
| D12 | **Aucune nouvelle dépendance.** Emails en français par deux gabarits HTML versionnés (`supabase/templates/`). | pgTAP est fourni par l'image Postgres de Supabase ; le calcul d'âge utilise `Intl`. |
| D13 | **Deux niveaux d'appartenance dès le lot 1** : `is_household_member()` (tout membre) et `is_household_parent()` (rôle `maman` ou `papa`). Lecture du foyer, de ses membres et de l'enfant : membre. Modification du foyer et de l'enfant, lecture et suppression des invitations : parent. `invite_member` et `update_my_membership` exigent un appelant parent. | Sans cela, le jour où un membre `autre` existe, il lirait les adresses email des invitations et pourrait se donner le rôle d'un parent. Coût : une fonction de dix lignes et quatre assertions pgTAP. [testé] Un membre `autre` inséré en propriétaire lit zéro invitation, ne modifie pas le foyer, ne peut ni inviter ni changer de rôle. Les tables des lots 2 à 8 utiliseront `is_household_parent()`. |
| D14 | **Code : 6 chiffres, valable 15 minutes, comme le lien** (`otp_expiry = 900`). L'objet de l'email contient le code (« 123456 est votre code Carnet de nuits »). L'état « code demandé » (adresse et heure d'envoi) est conservé dans `localStorage` pendant 15 minutes. | La section 1 laisse la durée au tech-lead : 15 minutes couvrent l'aller-retour vers la messagerie et limitent l'exposition d'un code à 6 chiffres. Le code dans l'objet se lit dans la notification, sans ouvrir l'email. iOS peut recharger l'app installée quand on revient de la messagerie : sans mémoire de l'étape, il faudrait redemander un code, ce qui invalide celui qu'on vient de lire (CA61). |
| D15 | **Sur `/login`, la hauteur de l'écran suit la zone visible** (`window.visualViewport`), pas `100dvh`. | Sur iOS, le clavier recouvre le bas de la page sans la redimensionner : un bouton « en bas de l'écran » serait caché. CA44 et CA60 demandent l'action principale en bas et atteignable clavier ouvert. |

### Arbitrages rendus (validation humaine n° 1)

| Sujet | Décision | Effet sur le plan |
|---|---|---|
| A1 | Code à 6 chiffres obligatoire, en plus du lien | D8, D9, D14, D15 ; CA56 à CA61. |
| A2 | Le compte du second parent est créé par l'invitation | D2 et D3 conservées ; l'alternative « deux comptes créés à la main » est abandonnée. |
| A3 | SMTP d'un compte Gmail dédié | Étape manuelle 1, réglages ci-dessous, CA64. |
| A4 | Docker installé | Suppositions du premier passage testées (voir ci-dessous). |
| Nounou | Lot 9, droits limités ; le modèle ne ferme pas la porte | D5, D13 ; CA62, CA63. |
| Prévisualisations Vercel | Risque accepté | Reste listé dans les risques, sans action. |

### Vérifications faites sur l'instance locale

| Question | Résultat | Source |
|---|---|---|
| La migration et le seed passent-ils tels quels ? | Oui, par `supabase start` et par `supabase db start` seul. Un compte du seed se connecte par code. | [testé] |
| Le crochet en fonction `security definer` est-il accepté et appliqué ? | Oui (D2). | [testé] |
| CA59 : un nouveau code rend-il l'ancien inutilisable ? | **Oui**, pour un compte existant comme pour un compte invité pas encore confirmé. Un renvoi demandé avant le délai minimal du serveur est refusé (429) sans nouvel email : l'ancien code reste alors valable. | [testé] |
| CA57 : peut-on tout ramener à un seul message ? | **Oui.** Code faux, remplacé, déjà utilisé, adresse sans compte : même réponse 403 `otp_expired`. Code expiré : même réponse d'après le source. | [testé], expiration [lu] |
| Que fait Supabase après trop de tentatives ? | **Rien côté code** : 40 codes faux de suite ne bloquent ni le compte ni le code, et le bon code fonctionne encore ensuite. La seule limite est un plafond de vérifications par adresse IP (30 par 5 minutes par défaut, réponse 429 d'après la documentation), non appliqué sur l'instance locale. Voir Risques. | [testé] pour l'absence de blocage, [lu] pour le plafond |
| Une session ouverte par code porte-t-elle `amr: otp` ? | Oui, par code comme par lien. Une connexion par mot de passe porte `amr: password`. | [testé] |
| Le premier parent créé avec un mot de passe aléatoire se connecte-t-il par code sans ce mot de passe ? | Oui (compte créé par l'API d'administration, comme le fait le tableau de bord). | [testé] |
| Le scénario du compte pré-créé par un tiers est-il bloqué ? | Oui : connexion du tiers acceptée par Supabase Auth, mais zéro ligne lue et fonctions refusées. | [testé] |
| Un membre `autre` est-il étanche ? | Oui avec D13 (voir ligne D13). | [testé] |
| `gen types` fonctionne-t-il après `db start` ? | Oui ; le fichier sort non formaté (d'où l'exclusion ESLint). | [testé] |

### Désaccords et précisions par rapport à la section 1 (non modifiée)

1. **CA57, « série de tentatives refusée par la limite de Supabase ».** Exact pour l'écran (le message neutre couvre aussi ce cas), mais il n'existe pas de blocage après N essais sur un même code. Reformulation proposée : « … ou une vérification refusée par la limite de requêtes de Supabase … ».
2. **Étape manuelle 3, « Redirect URLs ».** Il faut y inscrire les adresses **avec `/confirm`** (`https://nigh-tracker.vercel.app/confirm`, `http://localhost:3000/confirm`, motif des prévisualisations terminé par `/confirm`). Sinon le lien de l'email renvoie à la racine du site de production, quel que soit l'endroit d'où le code a été demandé (le plan le rattrape, voir `resolveAuthRedirect`).
3. **Ordre des étapes manuelles.** La numérotation de la section 1 est conservée ; l'ordre d'exécution est 1, 3, 2, 5, 4, 6, 7 (voir plus bas).
4. **Ajouts non prévus par la section 1** : l'état « code demandé » conservé 15 minutes sur l'appareil (D14) ; le code dans l'objet de l'email (D14) ; la fonction `is_household_parent()` (D13). Textes d'interface ajoutés : « Ce rôle est déjà pris dans le foyer. », « Ce rôle n'est pas disponible. », « Cette action est réservée aux parents du foyer. », « Un foyer existe déjà. Demandez à l'autre parent de vous inviter. », « Votre session a expiré. Reconnectez-vous. », « Adresse copiée. », « Connexion en cours… », « Envoi en cours… ».
5. **CA59 est confirmé** tel qu'écrit. CA21 et CA41 sont cohérents depuis la réécriture (troncature à 50 caractères).

### Fichiers à créer / modifier

| Fichier | Action | Raison |
|---|---|---|
| `supabase/migrations/<horodatage>_auth_household.sql` | créer (`npx supabase migration new auth_household`) | Contenu complet dans « Base de données ». Supprimer `supabase/migrations/.gitkeep`. |
| `supabase/seed.sql` | modifier | Deux comptes fictifs, un foyer, un enfant (contenu ci-dessous). CA53. |
| `supabase/config.toml` | modifier | Bloc `[auth]` : `additional_redirect_urls = ["http://localhost:3000/confirm", "http://127.0.0.1:3000/confirm"]`. Bloc `[auth.email]` : `enable_confirmations = true` (comme en production), `otp_expiry = 900`, `otp_length = 6` (inchangé). Bloc `[auth.rate_limit]` : `email_sent = 100` (local uniquement). Décommenter et régler `[auth.hook.before_user_created]` : `enabled = true`, `uri = "pg-functions://postgres/public/hook_before_user_created"`. Ajouter `[auth.email.template.magic_link]` et `[auth.email.template.confirmation]`, chacun avec `subject = "{{ .Token }} est votre code Carnet de nuits"` et `content_path = "./supabase/templates/magic_link.html"` (resp. `confirmation.html`). Ne pas toucher au bloc `[auth.sms]`. Un changement de `config.toml` exige `npx supabase stop` puis `start`. |
| `supabase/templates/magic_link.html`, `supabase/templates/confirmation.html` | créer | Même contenu dans les deux (ci-dessous) : un compte neuf reçoit le gabarit « Confirm signup », un compte existant le gabarit « Magic Link ». À recopier dans le tableau de bord en production (étape manuelle 3). |
| `supabase/tests/database/01_schema.test.sql` … `06_signup_hook.test.sql` | créer | Tests pgTAP (D10). |
| `app/types/database.ts` | créer (généré) | `npx supabase gen types typescript --local > app/types/database.ts`, **depuis Git Bash** (la redirection `>` de PowerShell 5 écrit en UTF-16). Jamais édité à la main. |
| `nuxt.config.ts` | modifier | Bloc `supabase` : `redirect: false` (D7), `useSsrCookies: false`, `clientOptions: { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }` (D1 ; rien à détecter dans l'URL, D8), `types: '~/types/database.ts'`. Le reste est inchangé. |
| `eslint.config.mjs` | modifier | `withNuxt({ ignores: ['app/types/database.ts'] })`. |
| `app/utils/email.ts` + `.test.ts` | créer | `normalizeEmail`, `isValidEmail` (CA5, CA6). |
| `app/utils/otp-code.ts` + `.test.ts` | créer | `normalizeOtpCode`, `validateOtpCode` (CA58). |
| `app/utils/pending-login.ts` + `.test.ts` | créer | `serializePendingLogin`, `parsePendingLogin` (D14). |
| `app/utils/age.ts` + `.test.ts` | créer | `todayInParis`, `ageInMonths`, `formatAge` (CA38). |
| `app/utils/validation.ts` + `.test.ts` | créer | Règles de CA19, CA36, CA41, messages en français. |
| `app/utils/auth-routing.ts` + `.test.ts` | créer | `resolveAuthRedirect` (CA3, CA11, CA12). |
| `app/utils/supabase-errors.ts` + `.test.ts` | créer | `isNetworkError`, `errorToken`, `errorMessage` (CA10, CA15, CA57 et messages des fonctions). |
| `app/utils/cooldown.ts` + `.test.ts` | créer | `remainingSeconds` (CA7). |
| `app/composables/useAuth.ts` | créer | `requestCode`, `verifyCode`, `verifyLink`, `signOut`, état « code demandé ». |
| `app/composables/useHousehold.ts` | créer | État partagé du foyer (`useState`), chargement, création, acceptation, modifications. |
| `app/composables/useInvitations.ts` | créer | Invitation en attente : lire, créer, annuler. |
| `app/composables/useVisibleHeight.ts` | créer | Hauteur de la zone visible (`visualViewport`, repli `innerHeight`), mise à jour sur `resize` (D15). |
| `app/middleware/auth.global.ts` | créer | Applique `resolveAuthRedirect` (D7). |
| `app/components/AppField.vue` | créer | Libellé, champ, message d'erreur relié par `aria-describedby`, indicateur « Enregistré ». Champ : `min-h-12`, `bg-slate-800 text-slate-200 border-slate-600`. |
| `app/components/AppButton.vue` | créer | Bouton `min-h-12 min-w-12`, variantes `primary` (fond `amber-200`, texte `slate-900`), `secondary` (bordure `slate-600`) et `link`, état désactivé. |
| `app/components/RolePicker.vue` | créer | Deux grands boutons Maman / Papa (`role="radiogroup"`), sans pré-sélection, option `only` pour ne proposer qu'un rôle (CA18, CA24). Jamais « Autre ». |
| `app/components/EnvNotice.vue` | créer | Encart « Configuration incomplète… » repris de `index.vue` (CA10). |
| `app/pages/login.vue` | créer | CA1, CA2, CA5 à CA7, CA10, CA14, CA15, CA33, CA56 à CA60. |
| `app/pages/confirm.vue` | créer | CA3, CA4 (D8). |
| `app/pages/bienvenue.vue` | créer | CA18 à CA23, CA30 à CA32. |
| `app/pages/reglages.vue` | créer | CA9, CA24 à CA29, CA34 à CA39, CA41. |
| `app/pages/index.vue` | modifier | CA40 : nom du foyer, prénom et âge, lien « Réglages ». L'encart de configuration passe sur `/login`. |
| `tests/socle.test.ts` | modifier | Étendre « pas de secret » (CA52) : voir « Tests prévus ». |
| `tests/migration.test.ts` | créer | Garde statique de la migration et du seed, sans Docker. |
| `.github/workflows/ci.yml` | modifier | Nouveau job `base` (ci-dessous). Le job `verifier` est inchangé. |
| `README.md` | modifier | Étapes manuelles du lot avec les réglages Gmail (ci-dessous, sans aucun identifiant), essais en local (boîte mail de test `http://127.0.0.1:54324`, comptes du seed, remise à zéro du foyer), commande `npx supabase test db`. |
| `SPEC.md`, `CLAUDE.md`, `.env.example` | ne pas modifier | Modifications de spec appliquées après validation humaine. Aucune nouvelle variable d'environnement : les identifiants SMTP ne vivent que dans le tableau de bord Supabase (CA52). |

Gabarit d'email (identique dans les deux fichiers) :

```html
<h2>Carnet de nuits</h2>
<p>Votre code de connexion :</p>
<p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>Saisissez-le dans l'app, là où vous l'avez demandé. Dans un navigateur, vous pouvez aussi ouvrir ce lien :</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Ouvrir Carnet de nuits</a></p>
<p>Le code et le lien sont valables 15 minutes et ne servent qu'une fois. Un nouveau code remplace l'ancien.</p>
<p>Si vous n'avez rien demandé, ignorez ce message.</p>
```

Signatures des fonctions pures (`app/utils/`) :

```ts
// email.ts
export function normalizeEmail(input: string): string        // trim + minuscules
export function isValidEmail(email: string): boolean         // /^[^\s@]+@[^\s@]+\.[^\s@]+$/ et 254 caractères au plus, sur la valeur normalisée

// otp-code.ts
export function normalizeOtpCode(input: string): string      // retire espaces et tirets : « 123 456 » et « 123-456 » → « 123456 »
export function validateOtpCode(input: string): string | null // null si la valeur normalisée est exactement 6 chiffres, sinon « Le code contient 6 chiffres. »

// pending-login.ts — état « code demandé », conservé dans localStorage par useAuth
export const PENDING_LOGIN_KEY = 'carnet-de-nuits:connexion-en-attente'
export function serializePendingLogin(value: { email: string, sentAt: number }): string
export function parsePendingLogin(raw: string | null, now: number, validitySeconds?: number): { email: string, sentAt: number } | null
// null si absent, illisible, adresse invalide, ou plus vieux que validitySeconds (900 par défaut)

// age.ts — dates au format 'AAAA-MM-JJ', aucune dépendance au fuseau de la machine
export function todayInParis(now?: Date): string             // Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
export function ageInMonths(birthDate: string, today: string): number
export function formatAge(birthDate: string, today: string): string

// validation.ts — chaque fonction renvoie le message d'erreur ou null
export function validateFirstName(value: string): string | null      // « Le prénom est obligatoire. » / « 50 caractères maximum. »
export function validateHouseholdName(value: string): string | null  // « Le nom du foyer est obligatoire. » / « 50 caractères maximum. »
export function validateDisplayName(value: string): string | null    // « Le nom d'affichage est obligatoire. » / « 30 caractères maximum. »
export function validateBirthDate(value: string, today: string): string | null // « La date de naissance est obligatoire. » / « Date invalide. » / « La date ne peut pas être dans le futur. »
export function validateRole(value: string | null): string | null    // « Choisissez votre rôle. » ; seuls 'maman' et 'papa' sont acceptés
export function validateEmail(value: string): string | null          // « Adresse email invalide »

// auth-routing.ts
export type Membership = 'member' | 'none' | 'error'
export function resolveAuthRedirect(input: {
  path: string, hasSession: boolean, membership: Membership | null, hasLinkToken: boolean,
}): string | null                                                     // chemin cible, ou null pour laisser passer

// supabase-errors.ts
export function isNetworkError(error: unknown): boolean               // erreur Auth de nom 'AuthRetryableFetchError', ou erreur PostgREST sans code
export function errorToken(error: unknown): string                    // jeton renvoyé par les fonctions SQL (message d'une erreur P0001), 'network' ou 'unknown'
export function errorMessage(token: string): string                   // message français

// cooldown.ts
export function remainingSeconds(sentAt: number, now: number, durationSeconds?: number): number // 60 par défaut, jamais négatif
```

Règle de l'âge (`ageInMonths`) : mois révolus = `(a2 − a1) × 12 + (m2 − m1)`, moins 1 si le jour anniversaire du mois n'est pas atteint ; le jour anniversaire est `min(jour de naissance, dernier jour du mois courant)`. Donc né le 31 janvier : 1 mois le 28 février (29 en année bissextile) ; né le 29 février 2024 : 12 mois le 28 février 2025. `formatAge` : date future → chaîne vide ; 0 → « Moins d'un mois » ; 1 à 23 → « N mois » ; ensuite « N ans » ou « N ans et M mois » (le seuil est 24 mois, « 1 an » n'apparaît jamais).

Règles de `resolveAuthRedirect`, dans cet ordre (`hasLinkToken` : la requête contient `token_hash`) :

| Situation | Résultat |
|---|---|
| Pas de session, `hasLinkToken`, chemin différent de `/confirm` | `/confirm` (le middleware conserve la requête) |
| Pas de session, chemin `/login` ou `/confirm` | `null` |
| Pas de session, autre chemin | `/login` |
| Session, `member`, chemin `/login`, `/confirm` ou `/bienvenue` | `/` |
| Session, `member`, autre chemin | `null` |
| Session, `none`, chemin `/bienvenue` | `null` |
| Session, `none`, autre chemin | `/bienvenue` |
| Session, `error` (foyer non chargé), chemin `/login` ou `/confirm` | `/` |
| Session, `error`, autre chemin | `null` (la page affiche « Pas de connexion. Réessayez dans un moment. » et un bouton « Réessayer ») |

Jetons d'erreur et messages (`errorMessage`) :

| Jeton | Message |
|---|---|
| `network` | Pas de connexion. Réessayez dans un moment. |
| `invalid_code` | Code incorrect ou expiré. Demandez-en un nouveau. |
| `not_authenticated` | Votre session a expiré. Reconnectez-vous. |
| `household_exists` | Un foyer existe déjà. Demandez à l'autre parent de vous inviter. |
| `not_member` | Aucun foyer n'est associé à ce compte. |
| `not_allowed` | Cette action est réservée aux parents du foyer. |
| `already_member` | Cette personne fait déjà partie du foyer. |
| `invitation_pending` | Une invitation est déjà en attente. Annulez-la pour en créer une autre. |
| `role_taken` | Ce rôle est déjà pris dans le foyer. |
| `role_reserved` | Ce rôle est réservé à l'invitation en attente. |
| `role_not_allowed` | Ce rôle n'est pas disponible. |
| `invitation_not_found` | Cette invitation n'existe plus. |
| `invalid_input` | Certaines informations ne sont pas valides. |
| `unknown` | Une erreur est survenue. Réessayez dans un moment. |

Composables (seuls points d'accès à Supabase ; les pages n'appellent jamais `useSupabaseClient`) :

- `useAuth()` :
  - `requestCode(email)` : enregistre l'état « code demandé » (`{ email, sentAt }`) puis appelle `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/confirm', shouldCreateUser: true } })`. Renvoie `'sent'` pour toute réponse HTTP, `'offline'` si `isNetworkError` (D9).
  - `verifyCode(email, code)` : `verifyOtp({ email, token: code, type: 'email' })`. Renvoie `'ok'` (et efface l'état « code demandé »), `'invalid'` pour toute réponse HTTP d'erreur, `'offline'` si `isNetworkError`.
  - `verifyLink(tokenHash)` : `verifyOtp({ token_hash: tokenHash, type: 'email' })`, mêmes résultats.
  - `pendingLogin()` (lit et valide l'état par `parsePendingLogin`), `clearPendingLogin()`.
  - `signOut()` : `signOut({ scope: 'local' })`, vide l'état du foyer, puis `navigateTo('/login', { replace: true })` ; si l'appel échoue faute de réseau, renvoie `'offline'` et ne change rien.
- `useHousehold()` : état `useState('household')` de forme `{ status: 'idle' | 'member' | 'none' | 'error', userId, household: { id, name } | null, child: { id, first_name, birth_date } | null, members: { user_id, role, display_name }[] }`.
  - `ensureLoaded()` : lit l'identifiant du compte par `auth.getSession()` (lecture locale) ; si l'état est déjà chargé pour ce compte, ne fait rien ; sinon une seule requête `from('households').select('id, name, children(id, first_name, birth_date), household_members(user_id, role, display_name)').maybeSingle()` [testé]. Zéro ligne → `none`.
  - `refresh()`, `reset()`.
  - `getOnboardingState()` → `rpc('get_onboarding_state')`, première ligne.
  - `createHousehold({ firstName, birthDate, role, displayName })` → `rpc('create_household', …)` puis `refresh()`.
  - `acceptInvitation(displayName)` → `rpc('accept_invitation', …)` puis `refresh()`.
  - `updateHouseholdName(name)`, `updateChild({ first_name, birth_date })` : `update(…).eq('id', id).select().single()` (une modification qui ne touche aucune ligne est une erreur), puis mise à jour de l'état.
  - `updateMyMembership({ displayName, role })` → `rpc('update_my_membership', …)`.
  - Chaque méthode renvoie `{ ok: true }` ou `{ ok: false, token }` (jeton de `errorToken`).
- `useInvitations()` : `pending` (invitation avec `accepted_at is null`, ou `null`), `load()`, `invite(email, role)` → `rpc('invite_member', …)`, `revoke(id)` → `delete().eq('id', id)`.

Middleware `auth.global.ts` : lit `useSupabaseSession()` ; sans session, appelle `useHousehold().reset()` et n'émet aucune requête (CA11) ; avec session, `await ensureLoaded()` ; applique `resolveAuthRedirect` et, si le résultat n'est pas `null`, `navigateTo(cible, { replace: true })` (en conservant la requête quand la cible est `/confirm`).

Pages (toutes : fond et champs sombres, aucune classe de blanc, aucun son ni vibration, cibles de 48 px au moins ; action principale dans un pied `mt-auto` avec marge basse `env(safe-area-inset-bottom)`) :

- `/login` : conteneur `flex flex-col px-6` dont la hauteur est celle de `useVisibleHeight()` (D15). `<EnvNotice>` si `missingSupabaseEnv` n'est pas vide (formulaire alors désactivé). Deux étapes dans la même page, sans navigation.
  - Au montage : si `pendingLogin()` renvoie un état valide, ouvrir directement l'étape du code avec cette adresse et le compte à rebours restant (D14).
  - Étape « adresse » : un champ « Adresse email » (`type="email"`, `inputmode="email"`, `autocomplete="email"`, `autocapitalize="off"`), phrase d'aide « Utilisez l'adresse à laquelle l'invitation a été autorisée. » (CA33), bouton principal « Recevoir mon code ». À la validation : normaliser, valider (« Adresse email invalide », aucune requête) ; lancer `requestCode` ; bouton désactivé, libellé « Envoi en cours… » ; à 1,5 s, passer à l'étape du code.
  - Étape « code » : message de CA2 (`role="status"`), adresse rappelée et lien « Changer d'adresse » (revient à l'étape « adresse », efface l'état « code demandé », sans rechargement) ; champ « Code reçu par email » actif d'emblée (`inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength="7"`, `min-h-12`, `text-2xl tracking-widest`) ; message d'erreur juste sous le champ ; bouton secondaire « Renvoyer dans N s » puis « Renvoyer un code » (`remainingSeconds`, rafraîchi chaque seconde) ; bouton principal « Valider le code » en bas. « Valider le code » : `validateOtpCode` (« Le code contient 6 chiffres. », aucune requête) ; bouton désactivé pendant `verifyCode` ; `'ok'` → `navigateTo('/')` ; `'invalid'` → message de CA57, champ actif ; `'offline'` → « Pas de connexion. Réessayez dans un moment. », le code reste dans le champ (CA10). « Renvoyer un code » : vide le champ et le message d'erreur, relance `requestCode`, nouveau compte à rebours, même message (CA59).
  - À tout moment : si `requestCode` renvoie `'offline'`, revenir à l'étape « adresse » avec « Pas de connexion. Réessayez dans un moment. », effacer l'état « code demandé » et annuler le compte à rebours. Observer `useSupabaseSession()` : dès qu'une session apparaît (lien ouvert dans un autre onglet du même navigateur), `navigateTo('/')`.
- `/confirm` : n'est affichée que sans session (D7). Au montage, si la requête contient `token_hash` : afficher « Connexion en cours… », appeler `verifyLink` ; `'ok'` → `navigateTo('/', { replace: true })` ; `'offline'` → « Pas de connexion. Réessayez dans un moment. » et bouton « Réessayer » ; sinon, ou sans `token_hash` : « Ce lien n'est plus valable. Demandez-en un nouveau. » et bouton « Demander un nouveau code » vers `/login` (CA4).
- `/bienvenue` : appelle `getOnboardingState()` au montage, puis affiche un des trois modes. `create` : formulaire de CA18 (date : `<input type="date" :max="todayInParis()">`), validation de CA19 au clic, bouton désactivé pendant l'envoi ; en cas de `household_exists`, `refresh()` : si le compte est devenu membre (double touche), aller sur `/`, sinon afficher le message. `invited` : texte de CA30 avec nom du foyer et rôle, champ « Mon nom d'affichage » pré-rempli par le rôle (« Maman » ou « Papa »), bouton « Rejoindre le foyer ». `no_household` : message de CA23 et bouton « Se déconnecter ». `member` : `navigateTo('/')`.
- `/` : titre « Carnet de nuits », nom du foyer, « {prénom}, {âge} » (`formatAge(child.birth_date, todayInParis())`), lien « Réglages » (`min-h-12 min-w-12`).
- `/reglages` : sections dans l'ordre de CA35. Enregistrement à la sortie du champ (`blur` pour les textes, `change` pour la date et le rôle), seulement si la valeur a changé et passe la validation ; « Enregistré » pendant 2 s (`aria-live="polite"`) ; en cas d'erreur, message sous le champ et retour à la valeur enregistrée. Membres : la ligne du compte courant porte « (vous) » et est modifiable (`RolePicker` à deux rôles), les autres sont en lecture seule. Invitations : le formulaire n'apparaît que si aucune invitation n'est en attente **et** qu'un des rôles Maman ou Papa est libre (CA24, CA29) ; si une invitation est en attente : adresse, rôle, date, texte de CA25, bouton « Copier l'adresse de l'app » (`navigator.clipboard.writeText(window.location.origin)`, puis « Adresse copiée. » ; sans presse-papiers, afficher l'adresse en texte sélectionnable) et « Annuler l'invitation » avec **confirmation dans la page** (« Annuler l'invitation pour {adresse} ? », boutons « Oui, annuler » / « Non »), sans boîte de dialogue du système. Compte : « Se déconnecter ».

Job de CI à ajouter (`.github/workflows/ci.yml`), sans secret ni variable :

```yaml
  base:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Récupération du code
        uses: actions/checkout@v5
      - name: Node
        uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Installation
        run: npm ci
      - name: Base locale (migrations et seed)
        run: npx supabase db start
      - name: Tests de sécurité (pgTAP)
        run: npx supabase test db
      - name: Types à jour
        run: |
          npx supabase gen types typescript --local > "$RUNNER_TEMP/database.ts"
          diff --strip-trailing-cr "$RUNNER_TEMP/database.ts" app/types/database.ts
```

[testé en local] `supabase db start` applique la migration et le seed, et suffit à `test db` et à `gen types`. [supposé] Même comportement sur le runner GitHub.


### Base de données

Une seule migration. Le SQL ci-dessous est **celui qui a été exécuté** sur l'instance locale [testé : migration, seed, 41 assertions pgTAP, parcours complet par l'API]. Ne pas ajouter `force row level security` : `is_household_member()` et `is_household_parent()` évitent la récursion de politique sur `household_members` parce qu'elles s'exécutent avec les droits du propriétaire des tables, qui n'est pas soumis à la RLS.


```sql
-- Lot 1 : rôle des parents, foyer, membres, enfant, invitations, RLS et fonctions.

create type public.caregiver as enum ('maman', 'papa', 'autre');

-- Tables ------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint households_name_check
    check (name = btrim(name) and char_length(name) between 1 and 50)
);

-- V1 : un seul foyer par installation. Supprimer cet index pour en autoriser plusieurs.
create unique index households_singleton_idx on public.households ((true));

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.caregiver not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- V1 : un utilisateur n'appartient qu'à un seul foyer.
  constraint household_members_user_key unique (user_id),
  constraint household_members_display_name_check
    check (display_name = btrim(display_name) and char_length(display_name) between 1 and 30)
);

-- Maman et Papa sont chacun uniques dans un foyer. Le rôle « autre » n'est ni interdit
-- ni limité en nombre (nounou, lot 9).
create unique index household_members_parent_role_idx
  on public.household_members (household_id, role) where role in ('maman', 'papa');

create table public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  first_name text not null,
  birth_date date not null,
  created_at timestamptz not null default now(),
  constraint children_first_name_check
    check (first_name = btrim(first_name) and char_length(first_name) between 1 and 50),
  constraint children_birth_date_check
    check (birth_date <= (now() at time zone 'Europe/Paris')::date)
);

create index children_household_id_idx on public.children (household_id);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  role public.caregiver not null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint household_invitations_email_check
    check (email = lower(btrim(email)) and char_length(email) <= 254
           and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- Une seule invitation en attente par foyer (à rouvrir au lot 9 si besoin).
create unique index household_invitations_pending_idx
  on public.household_invitations (household_id) where accepted_at is null;
-- Recherche par adresse (crochet d'inscription, acceptation).
create index household_invitations_pending_email_idx
  on public.household_invitations (email) where accepted_at is null;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.children enable row level security;
alter table public.household_invitations enable row level security;

-- Fonctions d'appui --------------------------------------------------------

-- Vrai si l'appelant a une session qui n'a pas été ouverte par mot de passe.
-- L'app ne connecte que par le code ou le lien reçus par email.
create function public.is_passwordless_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not coalesce(
      ((select auth.jwt()) -> 'amr') @> '[{"method": "password"}]'::jsonb
      or ((select auth.jwt()) -> 'amr') @> '["password"]'::jsonb,
      false
    );
$$;

-- Adresse confirmée de l'appelant, en minuscules (null si non confirmée).
create function public.current_confirmed_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;

-- Membre du foyer, quel que soit son rôle.
create function public.is_household_member(household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_passwordless_session()
    and exists (
      select 1
      from public.household_members m
      where m.household_id = is_household_member.household_id
        and m.user_id = (select auth.uid())
    );
$$;

-- Parent du foyer (Maman ou Papa). Un membre « autre » n'est pas un parent.
create function public.is_household_parent(household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_passwordless_session()
    and exists (
      select 1
      from public.household_members m
      where m.household_id = is_household_parent.household_id
        and m.user_id = (select auth.uid())
        and m.role in ('maman', 'papa')
    );
$$;

-- Fonctions appelées par l'app ----------------------------------------------

-- État d'accueil : 'member', 'invited', 'create' (aucun foyer n'existe) ou 'no_household'.
create function public.get_onboarding_state()
returns table (status text, household_name text, invited_role public.caregiver)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := public.current_confirmed_email();
begin
  if v_uid is null or v_email is null or not public.is_passwordless_session() then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.household_members m where m.user_id = v_uid) then
    return query select 'member'::text, null::text, null::public.caregiver;
    return;
  end if;

  return query
    select 'invited'::text, h.name, i.role
    from public.household_invitations i
    join public.households h on h.id = i.household_id
    where i.email = v_email and i.accepted_at is null
    order by i.created_at
    limit 1;
  if found then
    return;
  end if;

  if exists (select 1 from public.households) then
    return query select 'no_household'::text, null::text, null::public.caregiver;
  else
    return query select 'create'::text, null::text, null::public.caregiver;
  end if;
end;
$$;

-- Crée le foyer, l'enfant et le premier membre, tout ou rien. Refusé si un foyer existe.
create function public.create_household(
  p_child_first_name text,
  p_birth_date date,
  p_role public.caregiver,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_first_name text := btrim(coalesce(p_child_first_name, ''));
  v_household_id uuid;
begin
  if v_uid is null or public.current_confirmed_email() is null
     or not public.is_passwordless_session() then
    raise exception 'not_authenticated';
  end if;
  if p_role is null or p_role not in ('maman', 'papa') then
    raise exception 'role_not_allowed';
  end if;
  if exists (select 1 from public.households) then
    raise exception 'household_exists';
  end if;

  insert into public.households (name)
  values (btrim(left('Foyer de ' || v_first_name, 50)))
  returning id into v_household_id;

  insert into public.children (household_id, first_name, birth_date)
  values (v_household_id, v_first_name, p_birth_date);

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_household_id, v_uid, p_role, btrim(coalesce(p_display_name, '')));

  return v_household_id;
exception
  when unique_violation then
    raise exception 'household_exists';
  when check_violation or not_null_violation then
    raise exception 'invalid_input';
end;
$$;

-- Autorise une adresse à rejoindre le foyer de l'appelant, comme second parent.
create function public.invite_member(p_email text, p_role public.caregiver)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_household_id uuid;
  v_my_role public.caregiver;
  v_invitation_id uuid;
begin
  if v_uid is null or not public.is_passwordless_session() then
    raise exception 'not_authenticated';
  end if;

  select m.household_id, m.role into v_household_id, v_my_role
  from public.household_members m where m.user_id = v_uid;
  if v_household_id is null then
    raise exception 'not_member';
  end if;
  if v_my_role not in ('maman', 'papa') then
    raise exception 'not_allowed';
  end if;
  -- Lot 1 : seul le second parent peut être invité (nounou : lot 9).
  if p_role is null or p_role not in ('maman', 'papa') then
    raise exception 'role_not_allowed';
  end if;

  -- Sérialise les changements de composition du foyer.
  perform 1 from public.households h where h.id = v_household_id for update;

  if exists (
    select 1
    from public.household_members m
    join auth.users u on u.id = m.user_id
    where m.household_id = v_household_id and lower(u.email) = v_email
  ) then
    raise exception 'already_member';
  end if;
  if exists (
    select 1 from public.household_invitations i
    where i.household_id = v_household_id and i.accepted_at is null
  ) then
    raise exception 'invitation_pending';
  end if;
  if exists (
    select 1 from public.household_members m
    where m.household_id = v_household_id and m.role = p_role
  ) then
    raise exception 'role_taken';
  end if;

  insert into public.household_invitations (household_id, email, role, invited_by)
  values (v_household_id, v_email, p_role, v_uid)
  returning id into v_invitation_id;

  return v_invitation_id;
exception
  when unique_violation then
    raise exception 'invitation_pending';
  when check_violation or not_null_violation then
    raise exception 'invalid_input';
end;
$$;

-- Accepte l'invitation en attente adressée à l'adresse confirmée de l'appelant.
-- Aucun identifiant en paramètre : on ne peut accepter que sa propre invitation.
create function public.accept_invitation(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := public.current_confirmed_email();
  v_invitation public.household_invitations%rowtype;
  v_household_id uuid;
begin
  if v_uid is null or v_email is null or not public.is_passwordless_session() then
    raise exception 'not_authenticated';
  end if;

  select i.* into v_invitation
  from public.household_invitations i
  where i.email = v_email and i.accepted_at is null
  order by i.created_at
  limit 1
  for update;

  if not found then
    -- Déjà acceptée (double touche, second onglet) : sans effet, sans erreur.
    select m.household_id into v_household_id
    from public.household_members m where m.user_id = v_uid;
    if v_household_id is not null then
      return v_household_id;
    end if;
    raise exception 'invitation_not_found';
  end if;

  -- Lot 1 : on ne rejoint un foyer que comme parent (nounou : lot 9).
  if v_invitation.role not in ('maman', 'papa') then
    raise exception 'role_not_allowed';
  end if;

  perform 1 from public.households h where h.id = v_invitation.household_id for update;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_invitation.household_id, v_uid, v_invitation.role,
          btrim(coalesce(p_display_name, '')));

  update public.household_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.household_id;
exception
  when unique_violation then
    raise exception 'role_taken';
  when check_violation or not_null_violation then
    raise exception 'invalid_input';
end;
$$;

-- Modifie le nom d'affichage et le rôle de l'appelant (parent), et rien d'autre.
create function public.update_my_membership(p_display_name text, p_role public.caregiver)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household_id uuid;
  v_role public.caregiver;
begin
  if v_uid is null or not public.is_passwordless_session() then
    raise exception 'not_authenticated';
  end if;

  select m.household_id, m.role into v_household_id, v_role
  from public.household_members m where m.user_id = v_uid;
  if v_household_id is null then
    raise exception 'not_member';
  end if;
  if v_role not in ('maman', 'papa') then
    raise exception 'not_allowed';
  end if;
  if p_role is null or p_role not in ('maman', 'papa') then
    raise exception 'role_not_allowed';
  end if;

  perform 1 from public.households h where h.id = v_household_id for update;

  if p_role is distinct from v_role and exists (
    select 1 from public.household_invitations i
    where i.household_id = v_household_id and i.accepted_at is null and i.role = p_role
  ) then
    raise exception 'role_reserved';
  end if;

  update public.household_members m
  set display_name = btrim(coalesce(p_display_name, '')), role = p_role
  where m.user_id = v_uid;
exception
  when unique_violation then
    raise exception 'role_taken';
  when check_violation or not_null_violation then
    raise exception 'invalid_input';
end;
$$;

-- Crochet Supabase Auth « before user created » : refuse toute création de compte
-- dont l'adresse n'a pas d'invitation en attente. Appelé par supabase_auth_admin.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if v_email <> '' and exists (
    select 1 from public.household_invitations i
    where i.email = v_email and i.accepted_at is null
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Signups not allowed')
  );
end;
$$;

-- Droits -------------------------------------------------------------------
-- Supabase accorde par défaut tous les droits aux rôles de l'API sur les nouveaux
-- objets de public : on retire tout, puis on n'accorde que le nécessaire.

revoke all on table
  public.households, public.household_members, public.children, public.household_invitations
  from anon, authenticated;

grant select on table
  public.households, public.household_members, public.children, public.household_invitations
  to authenticated;
grant update (name) on table public.households to authenticated;
grant update (first_name, birth_date) on table public.children to authenticated;
grant delete on table public.household_invitations to authenticated;

revoke all on function
  public.is_passwordless_session(),
  public.current_confirmed_email(),
  public.is_household_member(uuid),
  public.is_household_parent(uuid),
  public.get_onboarding_state(),
  public.create_household(text, date, public.caregiver, text),
  public.invite_member(text, public.caregiver),
  public.accept_invitation(text),
  public.update_my_membership(text, public.caregiver),
  public.hook_before_user_created(jsonb)
  from public, anon, authenticated;

grant execute on function
  public.is_household_member(uuid),
  public.is_household_parent(uuid),
  public.get_onboarding_state(),
  public.create_household(text, date, public.caregiver, text),
  public.invite_member(text, public.caregiver),
  public.accept_invitation(text),
  public.update_my_membership(text, public.caregiver)
  to authenticated;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- Politiques RLS -------------------------------------------------------------
-- Lecture du foyer, de ses membres et de l'enfant : tout membre.
-- Écriture, et tout ce qui touche aux invitations : parents seulement.

create policy households_select_member on public.households
  for select to authenticated
  using (public.is_household_member(id));

create policy households_update_parent on public.households
  for update to authenticated
  using (public.is_household_parent(id))
  with check (public.is_household_parent(id));

create policy household_members_select_member on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

create policy children_select_member on public.children
  for select to authenticated
  using (public.is_household_member(household_id));

create policy children_update_parent on public.children
  for update to authenticated
  using (public.is_household_parent(household_id))
  with check (public.is_household_parent(household_id));

create policy household_invitations_select_parent on public.household_invitations
  for select to authenticated
  using (public.is_household_parent(household_id));

create policy household_invitations_delete_pending on public.household_invitations
  for delete to authenticated
  using (public.is_household_parent(household_id) and accepted_at is null);
```

Politiques par opération (tout ce qui n'est pas listé est refusé ; le rôle `anon` n'a aucun droit sur ces tables) :

| Table | select | insert | update | delete |
|---|---|---|---|---|
| `households` | membre | aucune politique : `create_household` | parent, colonne `name` seulement | aucune |
| `household_members` | membre (voit les lignes de son foyer) | aucune : `create_household`, `accept_invitation` | aucune : `update_my_membership` (sa propre ligne, `display_name` et `role`, parent seulement) | aucune |
| `children` | membre | aucune : `create_household` | parent, colonnes `first_name` et `birth_date` | aucune |
| `household_invitations` | parent (l'invité passe par `get_onboarding_state`, D6) | aucune : `invite_member` | aucune : `accept_invitation` | parent, invitation en attente seulement |

Ce qui empêche un compte de s'ajouter à un foyer qui n'est pas le sien : aucun droit d'insertion sur `household_members` ; `accept_invitation` n'a pas de paramètre désignant un foyer ou une invitation et ne retient que l'invitation dont l'adresse égale l'adresse **confirmée** du compte, lue dans `auth.users` ; `create_household` est refusée dès qu'un foyer existe ; les sessions par mot de passe sont refusées partout (D3).

Modèle ouvert, fonctions fermées (Q4, Q14) :

| | Modèle (contraintes) | Fonctions du lot 1 |
|---|---|---|
| Second Maman ou second Papa | refusé (index partiel) | refusé (`role_taken`) |
| Membre de rôle `autre` | accepté, sans plafond (CA62) | jamais créé : `create_household`, `invite_member`, `accept_invitation` et `update_my_membership` répondent `role_not_allowed` (CA63) |
| Troisième membre et suivants | accepté | impossible à obtenir : il n'y a que deux rôles invitables |
| Ce que voit un membre `autre` s'il en existe un | le foyer, ses membres, l'enfant (lecture) | ni invitations, ni modification, ni changement de rôle (`not_allowed`) |

Pour le lot 9 (note, rien à construire ici) : ouvrir `invite_member` et `accept_invitation` au rôle `autre` ; décider si la nounou lit la liste des membres ; donner `is_household_member()` aux seules tables qu'elle saisit (siestes) et garder `is_household_parent()` partout ailleurs. **Une seule invitation en attente par foyer** : cela n'empêche pas d'inviter la nounou, seulement d'inviter deux personnes en même temps ; si le besoin apparaît, remplacer l'index `household_invitations_pending_idx` par un index sur `(household_id, email)`, sans reprise de données. À rouvrir au lot 9. Une invitation de rôle `autre` insérée à la main avant le lot 9 laisserait le crochet créer le compte, mais `accept_invitation` la refuse.

Seed (`supabase/seed.sql`), données fictives uniquement [testé] :


```sql
-- Données de développement fictives (jamais de données réelles).
-- Deux comptes sans mot de passe : connexion par code, lu dans la boîte mail de test locale.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1',
   'authenticated', 'authenticated', 'maman@example.test', '', now(),
   '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1',
   'authenticated', 'authenticated', 'papa@example.test', '', now(),
   '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
   '', '', '', '', '', '', '', '');

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email,
                          'email_verified', true, 'phone_verified', false),
       now(), now(), now()
from auth.users u
where u.email in ('maman@example.test', 'papa@example.test');

insert into public.households (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Foyer de Démo');

insert into public.children (id, household_id, first_name, birth_date)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
        'Démo', (current_date - interval '18 months')::date);

insert into public.household_members (household_id, user_id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'maman', 'Maman'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'papa', 'Papa');
```

Dans `auth.users`, les colonnes de jeton doivent valoir `''` et non `null` (sinon la connexion échoue) : c'est le cas ci-dessus, et un compte du seed se connecte bien par code [testé].

Pour rejouer en local le parcours du premier parent et de l'invité (le seed livre un foyer complet), exécuter dans Studio `truncate public.households cascade;` : `maman@example.test` arrive alors sur « Créer le foyer », peut inviter `invite@example.test`, et ce dernier obtient son code dans la boîte mail de test. À documenter dans le `README.md`.

Après la migration : `npx supabase db reset`, puis `npx supabase gen types typescript --local > app/types/database.ts` (Git Bash).

### Tests prévus

Trois niveaux. **CI, job `verifier`** : Vitest, sans Docker. **CI, job `base`** : pgTAP, Docker fourni par GitHub. **En local** : pgTAP exige Docker (`npx supabase db start` puis `npx supabase test db`) ; le branchement du crochet, l'envoi des emails et les parcours d'écran sont vérifiés à la main. À lister en section 3 (CA54) : les six fichiers pgTAP ne tournent pas dans `npm run test`.

Convention pgTAP [testée] : chaque fichier commence par `begin;`, `create extension if not exists pgtap with schema extensions;`, `select plan(N);`, et finit par `select * from finish(); rollback;`. Il supprime d'abord le foyer du seed (`delete from public.households;`), crée ses comptes dans `auth.users` (colonnes `instance_id`, `id`, `aud`, `role`, `email`, `email_confirmed_at` ; adresses en `@example.test`) et définit ces utilitaires :

```sql
create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.login(p_uid uuid, p_email text, p_method text default 'otp')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'email', p_email, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', p_method, 'timestamp', 1)))::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

grant execute on all functions in schema tests to authenticated, anon;
```

Un refus de droit se teste par `throws_ok($$ … $$, '42501', null, '…')`, un refus de fonction par `throws_ok($$ … $$, 'jeton', '…')`, une modification bloquée par la RLS par le nombre de lignes touchées (zéro).

| Test | Niveau | Couvre |
|---|---|---|
| `app/utils/age.test.ts` : exemples de CA38 (18 mois, 17 mois la veille) ; 0 → « Moins d'un mois » ; 1 mois ; 23 mois ; 24 mois → « 2 ans » ; 31 mois → « 2 ans et 7 mois » ; né le 31 janvier vu le 28 février et le 1er mars ; né le 29 février 2024 vu le 28 février 2025 ; date future → chaîne vide ; `todayInParis(new Date('2026-09-14T22:30:00Z'))` → `2026-09-15` et en hiver `T23:30:00Z` → lendemain | verifier | CA38, CA40, CA54 |
| `app/utils/email.test.ts` : « ` Papa@Exemple.FR ` » → `papa@exemple.fr` ; adresses invalides (sans `@`, sans domaine, avec espace, vide, plus de 254 caractères) | verifier | CA5, CA6, CA54 |
| `app/utils/otp-code.test.ts` : « 123456 », « 123 456 », « 123-456 », « ` 123456 ` » acceptés et normalisés ; 5 chiffres, 7 chiffres, « 12a456 », vide, lettres seules → « Le code contient 6 chiffres. » | verifier | CA58, CA54 |
| `app/utils/pending-login.test.ts` : aller-retour ; `null`, texte illisible, adresse invalide → `null` ; état de 14 min 59 s conservé, de 15 min rejeté | verifier | CA61 (mémoire de l'étape), CA59 |
| `app/utils/validation.test.ts` : chaque règle et chaque message ; prénom de 50 et 51 caractères, espaces seuls ; date vide, mal formée, égale à aujourd'hui, lendemain ; rôle `null`, `autre` ; nom d'affichage de 30 et 31 caractères | verifier | CA19, CA36, CA41, CA54, CA63 (interface) |
| `app/utils/auth-routing.test.ts` : une assertion par ligne du tableau de `resolveAuthRedirect`, pour `/`, `/reglages`, `/bienvenue`, `/login`, `/confirm`, une route inconnue ; `/` avec `token_hash` et sans session → `/confirm` | verifier | CA3, CA11, CA12 |
| `app/utils/supabase-errors.test.ts` : erreur de nom `AuthRetryableFetchError` → `network` ; erreurs Auth 403, 422, 429 → pas `network` (donc message neutre à l'envoi, `invalid_code` à la vérification, D9) ; erreur PostgREST sans code (échec de `fetch`) → `network` ; erreur `{ code: 'P0001', message: 'already_member' }` → jeton puis message de CA26 ; idem CA27, CA28, CA34, `role_not_allowed`, `not_allowed` ; jeton inconnu → message générique | verifier | CA10, CA15, CA22, CA26, CA27, CA28, CA34, CA57 |
| `app/utils/cooldown.test.ts` : 60 à l'envoi, 1 à 59 s, 0 à 60 s et au-delà | verifier | CA7, CA59 |
| `tests/socle.test.ts` (étendu) : aucun fichier de `app/`, `nuxt.config.ts`, `supabase/migrations/`, `supabase/seed.sql`, `supabase/templates/`, `supabase/tests/` ne contient `service_role`, `serviceKey`, `secretKey`, `serverSupabaseServiceRole`, `SUPABASE_SERVICE` ni `sb_secret_` ; aucun fichier suivi parmi `README.md`, `.env.example`, `nuxt.config.ts`, `supabase/config.toml`, `.github/workflows/ci.yml` ne contient d'adresse `@gmail.com` ni de ligne `pass =` non commentée ; `.env.example` inchangé (test existant) ; le test « pas de blanc pur » existant couvre les nouvelles pages et composants | verifier | CA52, CA43 (partie statique) |
| `tests/migration.test.ts` : pour chaque `create table public.X` des migrations, présence de `alter table public.X enable row level security` ; chaque fonction `security definer` a `set search_path = ''` ; aucune occurrence de `force row level security` ni de `to anon` ; aucune contrainte `check` sur `role` et aucun plafond de membres (`count(*)`) dans la migration ; toutes les adresses de `seed.sql` finissent par `@example.test` ; les deux gabarits d'email sont identiques et contiennent `{{ .Token }}` et `token_hash={{ .TokenHash }}` | verifier | CA46 (statique), CA53 (seed), CA62 (statique), CA2 (gabarits) |
| `01_schema.test.sql` : RLS active sur les quatre tables (`pg_class.relrowsecurity`) ; `is_household_member(uuid)` et `is_household_parent(uuid)` existent, sont `security definer`, ont un `search_path` fixé (`proconfig`) ; liste exacte des politiques par table (`policies_are`) ; `anon` n'a aucun droit sur les tables ni sur les fonctions ; `authenticated` ne peut exécuter ni le crochet ni `current_confirmed_email` | base | CA46, CA47 |
| `02_rls.test.sql` : foyer de A et B, C sans foyer. Sans session : lecture et écriture des quatre tables refusées. C : zéro ligne sur les quatre tables, y compris filtrées par identifiant ; insertion d'un enfant, modification et suppression du foyer et de l'enfant, insertion dans `household_members`, insertion, lecture et suppression d'invitation : refus ou zéro ligne touchée, données de A inchangées. B : modification du rôle ou du nom de A, de `household_id`, de `user_id`, insertion directe dans `household_members`, suppression d'un foyer, d'un enfant, d'un membre : refus. A et B : lisent le même foyer, le même enfant, les deux membres ; A modifie `name` et `first_name`, B lit la nouvelle valeur. A avec une session de méthode `password` : zéro ligne partout et fonctions refusées (D3) | base | CA37, CA41, CA42, CA47, CA48, CA49, CA50 |
| `03_onboarding.test.sql` : sans foyer, `get_onboarding_state` → `create` ; `create_household` crée foyer, enfant et membre, nom « Foyer de {prénom} » ; prénom de 45 caractères → nom de 50 caractères sans espace final ; prénom vide → `invalid_input` et aucune ligne ; date future → `invalid_input` ; second appel par A ou par C → `household_exists`, toujours un seul foyer ; insertion directe d'un second foyer (en propriétaire) → violation de l'index ; C après création → `no_household` ; compte à l'adresse non confirmée → `not_authenticated` | base | CA18, CA20, CA21, CA22, CA23 |
| `04_invitations.test.sql` : `invite_member(' Papa@Example.TEST ', 'papa')` enregistre `papa@example.test` ; adresse de A en majuscules → `already_member` ; seconde invitation (même adresse, autre casse, autre adresse) → `invitation_pending` ; rôle de A → `role_taken` ; C appelle `invite_member` → `not_member` ; B (adresse invitée) : `get_onboarding_state` → `invited` avec nom du foyer et rôle ; C appelle `accept_invitation` → `invitation_not_found`, aucun membre ajouté ; A change son rôle pour `papa` → `role_reserved` ; B accepte → membre avec le rôle de l'invitation, `accepted_at` renseigné ; B accepte de nouveau → même foyer, toujours deux membres, pas d'erreur ; foyer avec Maman et Papa → `invite_member` avec `maman` ou `papa` → `role_taken` ; invitation supprimée par A puis acceptation par B → `invitation_not_found` ; A supprime une invitation acceptée → zéro ligne | base | CA6, CA25, CA26, CA27, CA28, CA29, CA30, CA31, CA32, CA33, CA34, CA51 |
| `05_roles.test.sql` : **en propriétaire** : second `papa` dans le foyer → violation d'unicité ; second `maman` → idem ; un membre `autre` accepté ; un quatrième membre `autre` accepté ; un utilisateur déjà membre ajouté une seconde fois → refusé. **Par les fonctions** : `create_household(…, 'autre', …)`, `invite_member(…, 'autre')` (foyer incomplet et foyer complet), `update_my_membership(…, 'autre')` → `role_not_allowed`, rien créé ni modifié ; invitation de rôle `autre` insérée en propriétaire puis `accept_invitation` → `role_not_allowed`. **Membre `autre`** : lit le foyer et l'enfant, zéro invitation ; `update` du foyer et de l'enfant → zéro ligne ; `invite_member` et `update_my_membership` → `not_allowed` | base | CA62, CA63, CA29, D13 |
| `06_signup_hook.test.sql` : adresse inconnue → objet `error` ; adresse invitée (casse différente) → `{}` ; invitation supprimée → `error` ; invitation acceptée → `error` ; adresse vide → `error` ; `supabase_auth_admin` peut exécuter la fonction | base | CA14, CA16 (logique du crochet), CA2 |
| Job `base` : `supabase db start` réussit (migration et seed), `gen types` identique au fichier commité | base | CA53 |
| Manuel, Docker requis — crochet et neutralité : sur `/login`, demander un code pour `inconnu@example.test` : message et étape du code identiques, aucune ligne nouvelle dans `auth.users`, rien dans la boîte mail de test ; tout code saisi → message de CA57. Même essai par `curl` sur `/auth/v1/signup` avec un mot de passe : refus. Puis `maman@example.test` : même écran, au même moment ; email reçu avec code dans l'objet et lien | local | CA2, CA14, CA15, CA16 |
| Manuel, Docker requis — code : bon code → `/` ; code faux, code déjà utilisé → message de CA57, champ actif ; « 123 456 » collé accepté ; 5 chiffres → « Le code contient 6 chiffres. » sans requête ; double touche sur « Valider le code » → une seule requête ; « Renvoyer un code » après 60 s : nouvel email, champ vidé, ancien code refusé ; « Changer d'adresse » sans rechargement ; recharger la page à l'étape du code → l'étape revient avec l'adresse ; réseau coupé à la vérification → message, code conservé | local | CA7, CA10, CA56, CA57, CA58, CA59 |
| Manuel, Docker requis — lien : ouvrir le lien de l'email dans le navigateur → `/` ou `/bienvenue` ; le rouvrir → écran de CA4 ; lien puis code du même email → message de CA57 | local | CA3, CA4 |
| Manuel, Docker requis — parcours complet après `truncate` : code, `/bienvenue` (création), `/`, `/reglages`, invitation de `invite@example.test`, code de l'invité, « Rejoindre », deux navigateurs côte à côte ; double touche sur « Créer le foyer » et sur « Rejoindre » ; annulation d'invitation pendant que l'invité est sur `/bienvenue` | local | CA18 à CA21, CA23 à CA25, CA28, CA30 à CA32, CA35 à CA37, CA39 à CA42 |
| Manuel — DevTools, 360 × 740, sur `/login` (deux étapes), `/bienvenue`, `/reglages`, `/` : pas de défilement horizontal, cibles de 48 px au moins, action principale en bas, fond et champs sombres (y compris champ pré-rempli par le navigateur et sélecteur de date), chiffres du code lisibles, relecture des textes. Sur un vrai téléphone, clavier numérique ouvert : « Valider le code », « Renvoyer un code », « Changer d'adresse » et le message d'erreur restent visibles | local | CA1, CA43, CA44, CA45, CA60 |
| Manuel — onglet Réseau : sans session, ouvrir `/`, `/reglages`, `/bienvenue` → redirection vers `/login`, aucune requête vers `/rest/v1/` ; avec session, fermer et rouvrir le navigateur → `/` directement ; « Se déconnecter » puis retour arrière → `/login` ; réseau coupé sur `/login` → « Pas de connexion… » ; sans `.env` → encart de configuration ; navigation hors ligne → `offline.html` | local | CA8, CA9, CA10, CA11, CA13 |
| Manuel — `npm run lint`, `typecheck`, `test`, `build`, puis CI de la PR (jobs `verifier` et `base`) | local puis CI | CA55 |
| Manuel (humain, production, étapes 4 et 6) — compte créé par « Create new user » puis connexion par code ; adresse inconnue : aucun utilisateur créé | production | CA14, CA17 |
| Manuel (humain, production, étape 7) — deux vrais comptes sur deux téléphones ; iPhone, app installée : code demandé dans l'app, lu dans la messagerie, saisi dans l'app au retour ; email du second parent reçu en moins de 2 minutes, expéditeur « Carnet de nuits », en français | production | CA42, CA61, CA64 |

### Étapes d'implémentation

Branche : `feat/001-auth-foyer-invitation` (existante). Docker Desktop lancé.

1. **Base.** `npx supabase migration new auth_household`, y coller le SQL ; `supabase/seed.sql` ; `config.toml` ; gabarits d'email ; `npx supabase start` puis `npx supabase db reset` ; générer `app/types/database.ts` ; `eslint.config.mjs`. *Vérif.* : `db reset` sans erreur ; `database.ts` contient les quatre tables et les fonctions ; un code demandé pour `maman@example.test` arrive dans la boîte mail de test avec le code dans l'objet.
2. **Tests de sécurité.** Les six fichiers pgTAP, `tests/migration.test.ts`, extension de `tests/socle.test.ts`, job `base` de la CI. *Vérif.* : `npx supabase test db` et `npm run test` verts. Un test qui échoue révèle un défaut de la migration : corriger la migration (pas encore appliquée ailleurs), jamais le test.
3. **Fonctions pures.** Les huit fichiers de `app/utils/` et leurs tests. *Vérif.* : `npm run test` vert, y compris avec `TZ=UTC` (la CI est en UTC, la machine en `Europe/Paris`).
4. **Connexion et routes.** Bloc `supabase` de `nuxt.config.ts`, `useAuth`, `useVisibleHeight`, `useHousehold` (chargement seulement), middleware, composants, `/login` (deux étapes), `/confirm`. *Vérif.* : tests manuels « crochet et neutralité », « code » et « lien » ; redirections de CA11 et CA12.
5. **Accueil.** Reste de `useHousehold`, `/bienvenue` (trois modes), `/`. *Vérif.* : après `truncate`, création du foyer puis arrivée sur `/` avec nom, prénom et âge.
6. **Réglages et invitation.** `useInvitations`, `/reglages`. *Vérif.* : parcours complet à deux navigateurs (CA42), annulation, rôle réservé.
7. **Clôture.** `README.md` (dont réglages Gmail, sans identifiant), vérifications manuelles du tableau, `lint`, `typecheck`, `test`, `build`, section 3 de la fiche (écarts, tests non exécutés en CI et manière de les rejouer). Commits courts en français, fichiers ajoutés explicitement (par exemple `feat(base): foyer, membres, enfant, invitations et RLS`, `test(base): sécurité du foyer en pgTAP`, `feat(auth): connexion par code et protection des routes`, `feat(foyer): création, invitation et réglages`). Pas de push avant la validation humaine n° 2.

### Étapes manuelles : ordre d'exécution et réglages (numérotation de la section 1)

Ordre d'exécution : **1, 3, 2, 5, 4, 6, 7**. Les réglages passent avant la migration pour que les inscriptions soient fermées quand les tables apparaissent ; le crochet passe avant la création du premier parent pour qu'aucun inconnu ne puisse fonder le foyer.

- **Étape 1 — Gmail dédié.** Dans Authentication > Emails > SMTP Settings : hôte `smtp.gmail.com` ; port `587` (chiffrement STARTTLS ; `465` en TLS direct convient aussi) ; identifiant : l'adresse Gmail dédiée, entière ; mot de passe : le mot de passe d'application, sans espaces ; adresse d'expéditeur : **la même adresse Gmail** (Gmail remplace toute autre adresse) ; nom d'expéditeur : « Carnet de nuits ». Limites : [lu] une fois le SMTP personnel activé, Supabase plafonne à 30 emails par heure pour tout le projet (réglable dans Authentication > Rate Limits ; largement suffisant pour deux personnes) et impose un délai minimal entre deux emails à la même adresse ; [supposé, d'après la documentation de Google, non revérifié ici] un compte Gmail gratuit envoie au plus environ 500 messages par jour, et Google peut suspendre un compte qui sert uniquement à l'envoi automatique : se connecter à ce compte de temps en temps. Aucun de ces identifiants dans le dépôt, `.env.example`, Vercel ou une conversation avec un agent (CA52).
- **Étape 3 — Réglages Auth.** « Allow new users to sign up » **décoché pour l'instant** ; « Confirm email » activé ; connexions anonymes désactivées ; URL du site `https://nigh-tracker.vercel.app` ; « Redirect URLs » : `https://nigh-tracker.vercel.app/confirm`, `http://localhost:3000/confirm`, et le motif des prévisualisations Vercel terminé par `/confirm` ; gabarits « Magic Link » **et** « Confirm signup » : objet et contenu recopiés de `supabase/templates/` ; longueur du code : 6 ; durée de validité du code (« Email OTP Expiration ») : 900 secondes ; délai minimal entre deux emails à la même adresse : 50 secondes (un peu moins que le compte à rebours de 60 s de l'app, pour que « Renvoyer un code » ne soit jamais refusé en silence) ; dans Authentication > Rate Limits, abaisser le plafond de vérifications de code (par adresse IP, 30 par 5 minutes par défaut) à 10 par 5 minutes : décision de l'humain pour durcir le code à 6 chiffres, sans effet sur l'app (libellé exact du réglage à constater dans le tableau de bord).
- **Étape 2 — Migration.** `npx supabase link` puis `npx supabase db push`, après relecture.
- **Étape 5 — Crochet.** Authentication > Hooks > « Before User Created » > fonction Postgres `public.hook_before_user_created`. **Ensuite seulement**, recocher « Allow new users to sign up » (nécessaire pour que l'adresse invitée obtienne son compte). Vérifier que Authentication > Users est vide ; supprimer tout compte qui s'y trouverait.
- **Étape 4 — Premier parent.** Authentication > Users > Add user > « Create new user », « Auto Confirm User » coché, mot de passe long et aléatoire, non conservé (il ne sert jamais : D3). Pas « Send invitation ».
- **Étape 6 — Contrôle.** Sur `/login`, demander un code avec une adresse inconnue : aucun utilisateur nouveau dans Authentication > Users. S'il en apparaît un, le crochet n'est pas actif : le supprimer et reprendre l'étape 5.
- **Étape 7 — Vérification finale sur téléphone** : CA42, CA61 (iPhone, app installée, sans toucher le lien), CA64 (email reçu par le second parent).

### Risques / points d'attention

- **Sécurité et RLS.**
  - Le crochet n'est actif en production que si l'humain l'active (étape 5) ; rien dans le dépôt ne peut le garantir. S'il est oublié : des inconnus peuvent créer un compte et recevoir un email, mais ne lisent rien (RLS), ne fondent pas de foyer (il existe) et tombent sur l'écran de CA23. L'étape 6 détecte l'oubli.
  - **Code à 6 chiffres : pas de blocage après N essais** [testé]. La seule barrière est le plafond de vérifications par adresse IP de Supabase (30 par 5 minutes par défaut [lu]) et la validité de 15 minutes. Quelqu'un qui connaît l'adresse d'un parent peut déclencher un code toutes les minutes et tenter sa chance : environ 90 essais par fenêtre et par adresse IP, soit une chance sur 11 000. Risque faible pour une app familiale, non nul. Décision de l'humain : abaisser ce plafond dans Authentication > Rate Limits (étape manuelle 3, sans effet sur l'app) ; le passage à 8 chiffres est écarté (saisie de nuit).
  - Fuite résiduelle, non corrigible avec les points d'accès standard de Supabase : un appel direct à `/auth/v1/otp` répond 403 pour une adresse inconnue et 200 pour une adresse autorisée [testé]. CA15 est tenu à l'écran, pas au niveau de l'API.
  - La connexion par mot de passe ne peut pas être désactivée séparément dans Supabase : D3 la rend inutile pour lire ou écrire des données. Une session par mot de passe peut encore agir sur le compte Auth lui-même (déconnecter les autres appareils) : gêne, pas fuite.
  - [supposé] Le projet distant se comporte comme l'instance locale : même version d'Auth ou plus récente, rôle `postgres` autorisé à lire `auth.users`, revendication `amr` de même forme. Les étapes 6 et 7 confirment les deux premiers points. Pour `amr`, la garde D3 ne bloque que ce qu'elle reconnaît : si le projet distant émettait cette revendication sous une autre forme, les parents ne seraient pas gênés, mais la parade serait inopérante sans que rien ne le signale. Contrôle possible par l'humain à l'étape 7 : dans les outils du navigateur, lire le jeton d'accès et vérifier qu'il contient `"amr":[{"method":"otp",…}]`.
  - Prévisualisations Vercel sur la base de production : **risque accepté** par l'humain, à réévaluer avant le lot 2.
- **Email.**
  - Tout repose sur le compte Gmail dédié : s'il est suspendu ou si le mot de passe d'application est révoqué, personne ne peut plus se connecter (les sessions déjà ouvertes continuent de fonctionner). L'écran affiche quand même le message neutre.
  - Premier email possible dans les courriers indésirables (le message de CA2 le dit).
  - Une messagerie qui **exécute** les pages des liens reçus (rare) consommerait le jeton, donc aussi le code : il suffit alors de redemander un code. D8 écarte le cas courant (simple préchargement du lien).
  - Le code apparaît dans l'objet, donc dans la notification de l'écran verrouillé : choix de confort (D14), réversible en changeant l'objet des deux gabarits.
- **iOS.** La limite du lien est levée par le code. Restent : le rechargement de l'app installée au retour de la messagerie (traité par D14, à constater à l'étape 7) ; le clavier qui recouvre le bas de page (traité par D15, à constater sur un vrai iPhone) ; Safari efface le stockage d'un site non visité depuis sept jours quand l'app n'est pas installée : CA8 n'est garanti que pour l'app installée ou un usage régulier.
- **Donnée conservée sur l'appareil.** L'adresse email saisie reste 15 minutes dans `localStorage` (D14), puis est ignorée ; elle est effacée à la connexion et par « Changer d'adresse ».
- **Hors-ligne.** Inchangé par rapport au lot 0 : sans réseau, la navigation affiche `offline.html` (CA13). Si le réseau tombe après le chargement et que le jeton d'accès a expiré, le renouvellement échoue et l'utilisateur est renvoyé vers `/login` alors que sa session est toujours enregistrée ; elle revient au retour du réseau, et `/login` redirige alors vers `/`. À traiter au lot 8.
- **Fuseau horaire et minuit (SPEC §5.3).** Pas d'heure de nuit dans ce lot. L'âge et la borne de la date de naissance se calculent sur la date du jour à `Europe/Paris`, côté client (`todayInParis`) comme côté base (contrainte `children_birth_date_check`), jamais sur le fuseau de la machine ni sur UTC. L'âge affiché n'est pas recalculé si l'app reste ouverte au passage de minuit ; il l'est à la navigation suivante.
- **Performance mobile.** Une requête au démarrage pour un membre (foyer, enfant, membres), mise en cache dans l'état ; aucune requête pour un visiteur. [lu] Le module appelle `auth.getClaims()` à chaque changement de page : avec des clés de signature asymétriques la vérification est locale, avec l'ancienne clé symétrique c'est un appel réseau à chaque navigation. À surveiller ; sans effet sur les données.
- **Windows.** Générer `database.ts` depuis Git Bash ; depuis PowerShell 5, le fichier sort en UTF-16 et casse `typecheck`. Le contrôle « types à jour » de la CI ignore les fins de ligne.

### Modifications de `SPEC.md` : compléments techniques du tech-lead (appliquées après la validation humaine n° 1)

Ils complètent les sept modifications du product-owner, sans les répéter.

1. **§4, ligne Back / BDD.** Avant : « Supabase : Postgres, Auth (lien magique), Realtime, RLS ». Après : « Supabase : Postgres, Auth (code à 6 chiffres ou lien magique, reçus par email), Realtime, RLS ».
2. **§4, ligne Tests.** Avant : « Vitest (logique de calcul), Playwright (parcours clés, lot 5+) ». Après : « Vitest (logique de calcul), pgTAP (`npx supabase test db` : RLS et fonctions SQL), Playwright (parcours clés, lot 5+) ».
3. **§5.2.** Avant : « **households** — `id`, `name`, `created_at` ». Après : « **households** — `id`, `name`, `created_at`. En V1, un index unique limite la table à une ligne (app mono-famille). »
   Avant : « **household_members** — `household_id`, `user_id` (→ `auth.users`), `role caregiver`, `display_name`, PK (`household_id`, `user_id`) ». Après : « **household_members** — `household_id`, `user_id` (→ `auth.users`), `role caregiver`, `display_name`, `created_at`, PK (`household_id`, `user_id`). `unique (user_id)` en V1 ; unicité de `(household_id, role)` limitée aux rôles `maman` et `papa` ; le rôle `autre` est permis, sans plafond de membres. »
   Avant : « **children** — `id`, `household_id`, `first_name`, `birth_date date` ». Après : « **children** — `id`, `household_id`, `first_name`, `birth_date date`, `created_at` ».
4. **§5.4, puces 2 et 3.** Avant : « Fonction `is_household_member(household_id uuid) returns boolean` (`security definer`, `search_path` fixé). » et « Chaque table est filtrée via la chaîne `child → household`. Lecture et écriture réservées aux membres du foyer. » Après : « Fonctions `is_household_member(household_id uuid)` (tout membre) et `is_household_parent(household_id uuid)` (membre de rôle `maman` ou `papa`), `returns boolean`, `security definer`, `search_path` fixé. Les deux refusent une session ouverte par mot de passe : l'app ne connecte que par code ou par lien. » et « Chaque table est filtrée via la chaîne `child → household`. Foyer, membres et enfant : lecture par les membres, écriture par les parents. Invitations et tables des lots 2 à 8 (nuits, réveils, périodes d'observation) : parents seulement, via `is_household_parent()`. Les droits du rôle `autre` sont définis au lot 9. »
5. **§5.4, à la suite de la modification 2 du product-owner.** Ajouter : « Les comptes sont fermés côté serveur par le crochet Supabase Auth *before user created* (`hook_before_user_created`), à activer dans le tableau de bord : seule une adresse ayant une invitation en attente peut obtenir un compte. Fonctions de l'app : `get_onboarding_state()`, `create_household(…)`, `invite_member(email, role)`, `accept_invitation(display_name)`, `update_my_membership(display_name, role)` ; au lot 1 elles refusent le rôle `autre`. Aucune écriture directe sur `household_members`. »
6. **§6, ligne `/confirm`** (modification 3 du product-owner). Préciser : « `/confirm` | Retour du lien de l'email : la page vérifie le lien et connecte ; affiche un message si le lien n'est plus valable ».
7. **§12, Décisions.** Ajouter trois lignes : « Session | `localStorage`, flux implicite (`useSsrCookies: false`) | Aucun jeton envoyé à Vercel. » ; « Protection des routes | Middleware global maison, `supabase.redirect: false` | Redirections `/login`, `/bienvenue`, `/` décidées par une fonction pure testée. » ; « Code et lien de connexion | 6 chiffres, valables 15 minutes, un seul jeton pour les deux ; le lien pointe vers `/confirm`, qui le vérifie | Un nouveau code remplace l'ancien. Le lien n'est pas consommé par un simple préchargement de messagerie. »

Suggestion hors spec, pour `CLAUDE.md` (réservée à l'humain) : ajouter `npx supabase test db` aux commandes.


## 3. Implémentation (developer)

- Branche :
- Écarts par rapport au plan et pourquoi :
- Résultat `lint` / `typecheck` / `test` :

## 4. Revue (reviewer)

- **Verdict** : ✅ OK | 🔁 à corriger | ⛔ bloquant
- Détail : voir le rapport de revue.
