-- Rôles : le modèle est ouvert (rôle « autre », aucun plafond), les fonctions du lot 1 sont fermées (CA62, CA63, D13).
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Repart d'une base vide : le seed (foyer et comptes fictifs) est retiré, puis tout est annulé par le rollback.
delete from public.households;
delete from auth.users;

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

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Nombre de lignes touchées par une écriture, exécutée avec le rôle courant.
create function tests.affected(p_sql text) returns bigint language plpgsql as $$
declare
  v_rows bigint;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

grant execute on all functions in schema tests to authenticated, anon;

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1',
   'authenticated', 'authenticated', 'maman@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1',
   'authenticated', 'authenticated', 'papa@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e1',
   'authenticated', 'authenticated', 'nounou1@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e2',
   'authenticated', 'authenticated', 'nounou2@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e3',
   'authenticated', 'authenticated', 'nounou3@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000f1',
   'authenticated', 'authenticated', 'sansfoyer@example.test', now());

insert into public.households (id, name) values ('00000000-0000-4000-8000-000000000001', 'Foyer de test');
insert into public.children (id, household_id, first_name, birth_date)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Test', '2025-03-15');
insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'maman', 'Maman');

-- Fonctions du lot 1 : le rôle « autre » est refusé (CA63) -------------------------------------
-- Foyer incomplet (Maman seule).
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select throws_ok($$ select public.invite_member('nounou1@example.test', 'autre') $$, 'P0001', 'role_not_allowed',
  'foyer incomplet : invitation avec le rôle autre refusée');
select throws_ok($$ select public.update_my_membership('Maman', 'autre') $$, 'P0001', 'role_not_allowed',
  'changer son propre rôle pour autre est refusé');
select tests.logout();
select is((select role::text from public.household_members), 'maman', 'le rôle de A est inchangé');
select is((select count(*) from public.household_invitations), 0::bigint, 'aucune invitation créée');

select tests.login('00000000-0000-4000-8000-0000000000f1', 'sansfoyer@example.test');
select throws_ok($$ select public.create_household('Léa', '2025-03-15', 'autre', 'Nounou') $$, 'P0001', 'role_not_allowed',
  'créer un foyer avec le rôle autre est refusé');
select tests.logout();
select is((select count(*) from public.households), 1::bigint, 'aucun foyer créé');

-- Modèle : Maman et Papa uniques, « autre » sans plafond (CA62) --------------------------------
insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'papa', 'Papa');

select throws_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f1', 'papa', 'Second papa') $$,
  '23505', null, 'un second papa dans le même foyer est refusé');
select throws_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f1', 'maman', 'Seconde maman') $$,
  '23505', null, 'une seconde maman dans le même foyer est refusée');
select lives_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'autre', 'Nounou') $$,
  'un membre de rôle autre est accepté');
select lives_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e2', 'autre', 'Nounou 2') $$,
  'un quatrième membre est accepté');
select lives_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e3', 'autre', 'Nounou 3') $$,
  'un cinquième membre est accepté');
select is((select count(*) from public.household_members), 5::bigint, 'aucun plafond de membres');
select throws_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'autre', 'Doublon') $$,
  '23505', null, 'un utilisateur déjà membre ne peut pas l''être une seconde fois');

-- Foyer complet, parent : le rôle autre reste refusé.
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select throws_ok($$ select public.invite_member('nounou4@example.test', 'autre') $$, 'P0001', 'role_not_allowed',
  'foyer complet : invitation avec le rôle autre refusée');
select tests.logout();

-- Une invitation « autre » insérée à la main ne peut pas être acceptée (CA63).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at)
  values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000f2',
          'authenticated', 'authenticated', 'nounou4@example.test', now());
insert into public.household_invitations (household_id, email, role, invited_by)
  values ('00000000-0000-4000-8000-000000000001', 'nounou4@example.test', 'autre', '00000000-0000-4000-8000-0000000000a1');

select tests.login('00000000-0000-4000-8000-0000000000f2', 'nounou4@example.test');
select throws_ok($$ select public.accept_invitation('Nounou') $$, 'P0001', 'role_not_allowed',
  'accepter une invitation de rôle autre est refusé');
select tests.logout();
select is((select count(*) from public.household_members), 5::bigint, 'personne n''a été ajouté');

-- Un membre « autre » est étanche (D13) --------------------------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000e1', 'nounou1@example.test');
select is((select count(*) from public.households), 1::bigint, 'autre : lit le foyer');
select is((select count(*) from public.children), 1::bigint, 'autre : lit l''enfant');
select is((select count(*) from public.household_invitations), 0::bigint, 'autre : ne lit aucune invitation');
select is(tests.affected($$ update public.households set name = 'Piraté' $$), 0::bigint,
  'autre : ne modifie pas le foyer');
select is(tests.affected($$ update public.children set first_name = 'Piraté' $$), 0::bigint,
  'autre : ne modifie pas l''enfant');
select is(tests.affected($$ delete from public.household_invitations $$), 0::bigint,
  'autre : ne supprime aucune invitation');
select throws_ok($$ select public.invite_member('x@example.test', 'papa') $$, 'P0001', 'not_allowed',
  'autre : ne peut pas inviter');
select throws_ok($$ select public.update_my_membership('Nounou', 'maman') $$, 'P0001', 'not_allowed',
  'autre : ne peut pas changer son rôle');
select tests.logout();

select * from finish();
rollback;
