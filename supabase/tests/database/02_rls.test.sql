-- RLS : cloisonnement du foyer (CA37, CA41, CA42, CA47 à CA50, D3).
-- A (maman) et B (papa) sont membres ; C est un compte connecté sans foyer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

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
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1',
   'authenticated', 'authenticated', 'autre@example.test', now());

insert into public.households (id, name) values ('00000000-0000-4000-8000-000000000001', 'Foyer de test');
insert into public.children (id, household_id, first_name, birth_date)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Test', '2025-03-15');
insert into public.household_members (household_id, user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'maman', 'Maman'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'papa', 'Papa');
insert into public.household_invitations (id, household_id, email, role, invited_by)
  values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
          'invite@example.test', 'papa', '00000000-0000-4000-8000-0000000000a1');

-- Sans session (clé publique seule) : aucun droit (CA47) -------------------------------------
select tests.as_anon();
select throws_ok($$ select * from public.households $$, '42501', null, 'anon : lecture de households refusée');
select throws_ok($$ select * from public.household_members $$, '42501', null, 'anon : lecture de household_members refusée');
select throws_ok($$ select * from public.children $$, '42501', null, 'anon : lecture de children refusée');
select throws_ok($$ select * from public.household_invitations $$, '42501', null, 'anon : lecture de household_invitations refusée');
select throws_ok($$ insert into public.households (name) values ('x') $$, '42501', null, 'anon : insertion de foyer refusée');
select throws_ok($$ update public.children set first_name = 'x' $$, '42501', null, 'anon : modification d''enfant refusée');
select throws_ok($$ delete from public.household_invitations $$, '42501', null, 'anon : suppression d''invitation refusée');
select throws_ok($$ select public.get_onboarding_state() $$, '42501', null, 'anon : get_onboarding_state refusée');
select tests.logout();

-- Compte C, connecté mais étranger au foyer (CA48, CA49) -------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000c1', 'autre@example.test');
select is((select count(*) from public.households), 0::bigint, 'C : zéro foyer');
select is((select count(*) from public.household_members), 0::bigint, 'C : zéro membre');
select is((select count(*) from public.children), 0::bigint, 'C : zéro enfant');
select is((select count(*) from public.household_invitations), 0::bigint, 'C : zéro invitation');
select is((select count(*) from public.households where id = '00000000-0000-4000-8000-000000000001'), 0::bigint,
  'C : filtre direct sur l''identifiant du foyer, zéro ligne');
select is((select count(*) from public.children where id = '00000000-0000-4000-8000-000000000002'), 0::bigint,
  'C : filtre direct sur l''identifiant de l''enfant, zéro ligne');
select is((select count(*) from public.household_invitations where email = 'invite@example.test'), 0::bigint,
  'C : les adresses des invitations restent invisibles');
select throws_ok($$ insert into public.children (household_id, first_name, birth_date)
  values ('00000000-0000-4000-8000-000000000001', 'Intrus', '2025-01-01') $$, '42501', null,
  'C : insertion d''un enfant refusée');
select throws_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c1', 'papa', 'Intrus') $$,
  '42501', null, 'C : ajout dans household_members refusé');
select throws_ok($$ insert into public.household_invitations (household_id, email, role)
  values ('00000000-0000-4000-8000-000000000001', 'x@example.test', 'papa') $$, '42501', null,
  'C : création d''invitation refusée');
select throws_ok($$ delete from public.households $$, '42501', null, 'C : suppression du foyer refusée');
select throws_ok($$ delete from public.children $$, '42501', null, 'C : suppression de l''enfant refusée');
select is(tests.affected($$ update public.households set name = 'Piraté' $$), 0::bigint,
  'C : modification du foyer, zéro ligne touchée');
select is(tests.affected($$ update public.children set first_name = 'Piraté' $$), 0::bigint,
  'C : modification de l''enfant, zéro ligne touchée');
select is(tests.affected($$ delete from public.household_invitations $$), 0::bigint,
  'C : suppression d''invitation, zéro ligne touchée');
select tests.logout();

select is((select name from public.households), 'Foyer de test', 'les données de A sont inchangées (foyer)');
select is((select count(*) from public.household_invitations), 1::bigint, 'les données de A sont inchangées (invitation)');

-- B, membre : ne modifie pas le rôle ni l'identité des membres (CA50) ----------------------------
select tests.login('00000000-0000-4000-8000-0000000000b1', 'papa@example.test');
select throws_ok($$ update public.household_members set role = 'papa'
  where user_id = '00000000-0000-4000-8000-0000000000a1' $$, '42501', null, 'B : modification du rôle de A refusée');
select throws_ok($$ update public.household_members set display_name = 'Piraté'
  where user_id = '00000000-0000-4000-8000-0000000000a1' $$, '42501', null, 'B : modification du nom de A refusée');
select throws_ok($$ update public.household_members set household_id = gen_random_uuid() $$, '42501', null,
  'B : changement de household_id refusé');
select throws_ok($$ update public.household_members set user_id = gen_random_uuid() $$, '42501', null,
  'B : changement de user_id refusé');
select throws_ok($$ insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c1', 'papa', 'Intrus') $$,
  '42501', null, 'B : insertion directe dans household_members refusée');
select throws_ok($$ update public.children set household_id = gen_random_uuid() $$, '42501', null,
  'B : changement du foyer de l''enfant refusé');
select throws_ok($$ delete from public.households $$, '42501', null, 'B : suppression du foyer refusée');
select throws_ok($$ delete from public.children $$, '42501', null, 'B : suppression de l''enfant refusée');
select throws_ok($$ delete from public.household_members $$, '42501', null, 'B : suppression d''un membre refusée');
select tests.logout();

-- A et B voient le même foyer (CA42) ; une modification de A est lue par B (CA37, CA41) ---------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select is((select count(*) from public.household_members), 2::bigint, 'A : voit les deux membres');
select is(tests.affected($$ update public.households set name = 'Foyer renommé' $$), 1::bigint,
  'A : modifie le nom du foyer');
select is(tests.affected($$ update public.children set first_name = 'Renommée' $$), 1::bigint,
  'A : modifie le prénom de l''enfant');
select tests.logout();

select tests.login('00000000-0000-4000-8000-0000000000b1', 'papa@example.test');
select is((select name from public.households), 'Foyer renommé', 'B : lit le nouveau nom du foyer');
select is((select first_name from public.children), 'Renommée', 'B : lit le nouveau prénom');
select is((select count(*) from public.household_members), 2::bigint, 'B : voit les deux membres');
select is((select count(*) from public.household_invitations), 1::bigint, 'B (parent) : voit l''invitation en attente');
select tests.logout();

-- Session ouverte par mot de passe : aucun accès (D3) -----------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test', 'password');
select is((select count(*) from public.households), 0::bigint, 'mot de passe : zéro foyer');
select is((select count(*) from public.household_members), 0::bigint, 'mot de passe : zéro membre');
select is((select count(*) from public.children), 0::bigint, 'mot de passe : zéro enfant');
select is((select count(*) from public.household_invitations), 0::bigint, 'mot de passe : zéro invitation');
select is(public.is_household_member('00000000-0000-4000-8000-000000000001'), false,
  'mot de passe : is_household_member est faux');
select is(tests.affected($$ update public.households set name = 'Piraté' $$), 0::bigint,
  'mot de passe : modification du foyer, zéro ligne touchée');
select throws_ok($$ select public.get_onboarding_state() $$, 'P0001', 'not_authenticated',
  'mot de passe : get_onboarding_state refusée');
select throws_ok($$ select public.invite_member('x@example.test', 'papa') $$, 'P0001', 'not_authenticated',
  'mot de passe : invite_member refusée');
select tests.logout();

select * from finish();
rollback;
