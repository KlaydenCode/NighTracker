-- Structure : RLS, fonctions d'appartenance, liste exacte des politiques, droits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- RLS activée sur les quatre tables (CA46).
select ok((select relrowsecurity from pg_class where oid = 'public.households'::regclass),
  'RLS activée sur households');
select ok((select relrowsecurity from pg_class where oid = 'public.household_members'::regclass),
  'RLS activée sur household_members');
select ok((select relrowsecurity from pg_class where oid = 'public.children'::regclass),
  'RLS activée sur children');
select ok((select relrowsecurity from pg_class where oid = 'public.household_invitations'::regclass),
  'RLS activée sur household_invitations');

-- Fonctions d'appartenance : security definer, search_path fixé.
select ok((select prosecdef from pg_proc where oid = 'public.is_household_member(uuid)'::regprocedure),
  'is_household_member est security definer');
select ok((select prosecdef from pg_proc where oid = 'public.is_household_parent(uuid)'::regprocedure),
  'is_household_parent est security definer');
select ok((select proconfig @> array['search_path=""']
             from pg_proc where oid = 'public.is_household_member(uuid)'::regprocedure),
  'is_household_member a un search_path fixé');
select ok((select proconfig @> array['search_path=""']
             from pg_proc where oid = 'public.is_household_parent(uuid)'::regprocedure),
  'is_household_parent a un search_path fixé');

-- Toute fonction security definer du schéma public a un search_path fixé.
select is(
  (select count(*) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)),
  0::bigint,
  'toute fonction security definer de public fixe son search_path');

-- Liste exacte des politiques (tout ce qui n'est pas listé est refusé).
select policies_are('public', 'households',
  array['households_select_member', 'households_update_parent'], 'politiques de households');
select policies_are('public', 'household_members',
  array['household_members_select_member'], 'politiques de household_members');
select policies_are('public', 'children',
  array['children_select_member', 'children_update_parent'], 'politiques de children');
select policies_are('public', 'household_invitations',
  array['household_invitations_select_parent', 'household_invitations_delete_pending'],
  'politiques de household_invitations');

-- Droits du rôle anon : aucun, ni sur les tables ni sur les fonctions (CA47).
select ok(not exists (
  select 1
  from unnest(array['public.households', 'public.household_members', 'public.children',
                    'public.household_invitations']) as t(name),
       unnest(array['select', 'insert', 'update', 'delete']) as p(priv)
  where has_table_privilege('anon', t.name, p.priv)
), 'anon n''a aucun droit sur les tables');

select ok(not exists (
  select 1 from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and has_function_privilege('anon', p.oid, 'execute')
), 'anon ne peut exécuter aucune fonction de public');

-- Droits de authenticated : ni le crochet, ni les fonctions d'appui internes.
select ok(not exists (
  select 1 from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('hook_before_user_created', 'current_confirmed_email', 'is_passwordless_session')
    and has_function_privilege('authenticated', p.oid, 'execute')
), 'authenticated ne peut exécuter ni le crochet ni les fonctions d''appui');

-- Aucun droit d'écriture direct sur les membres.
select ok(not exists (
  select 1
  from unnest(array['insert', 'update', 'delete']) as p(priv)
  where has_table_privilege('authenticated', 'public.household_members', p.priv)
), 'authenticated n''écrit pas directement dans household_members');

select * from finish();
rollback;
