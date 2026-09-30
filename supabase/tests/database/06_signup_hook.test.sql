-- Crochet « before user created » : seule une adresse invitée obtient un compte (CA14, CA16).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Repart d'une base vide : le seed (foyer et comptes fictifs) est retiré, puis tout est annulé par le rollback.
delete from public.households;
delete from auth.users;

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1',
   'authenticated', 'authenticated', 'maman@example.test', now());

insert into public.households (id, name) values ('00000000-0000-4000-8000-000000000001', 'Foyer de test');
insert into public.household_invitations (id, household_id, email, role, invited_by) values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
   'papa@example.test', 'papa', '00000000-0000-4000-8000-0000000000a1');

select is(public.hook_before_user_created('{"user": {"email": "inconnu@example.test"}}'::jsonb) ? 'error', true,
  'adresse inconnue : le compte est refusé');

select is(public.hook_before_user_created('{"user": {"email": "inconnu@example.test"}}'::jsonb) #>> '{error,http_code}', '403',
  'adresse inconnue : refus en 403');

select is(public.hook_before_user_created('{"user": {"email": "  Papa@Example.TEST "}}'::jsonb), '{}'::jsonb,
  'adresse invitée (casse et espaces différents) : le compte est accepté');

select is(public.hook_before_user_created('{"user": {"email": ""}}'::jsonb) ? 'error', true,
  'adresse vide : refus');

select is(public.hook_before_user_created('{"user": {}}'::jsonb) ? 'error', true,
  'adresse absente : refus');

update public.household_invitations set accepted_at = now();
select is(public.hook_before_user_created('{"user": {"email": "papa@example.test"}}'::jsonb) ? 'error', true,
  'invitation déjà acceptée : refus');

update public.household_invitations set accepted_at = null;
delete from public.household_invitations;
select is(public.hook_before_user_created('{"user": {"email": "papa@example.test"}}'::jsonb) ? 'error', true,
  'invitation annulée : refus (adresse sans compte, CA16)');

select ok(has_function_privilege('supabase_auth_admin', 'public.hook_before_user_created(jsonb)', 'execute'),
  'supabase_auth_admin peut exécuter le crochet');

select ok(not has_function_privilege('service_role', 'public.hook_before_user_created(jsonb)', 'execute'),
  'service_role ne peut pas exécuter le crochet (supabase_auth_admin seulement)');

select ok(not has_function_privilege('authenticated','public.hook_before_user_created(jsonb)', 'execute'),
  'authenticated ne peut pas exécuter le crochet');

select * from finish();
rollback;
