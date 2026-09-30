-- Accueil : état d'onboarding et création du foyer (CA18 à CA23).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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

grant execute on all functions in schema tests to authenticated, anon;

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1',
   'authenticated', 'authenticated', 'maman@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1',
   'authenticated', 'authenticated', 'autre@example.test', now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000d1',
   'authenticated', 'authenticated', 'nonconfirme@example.test', null);

-- Aucun foyer : le premier parent peut en créer un ---------------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select is((select status from public.get_onboarding_state()), 'create', 'aucun foyer : état « create »');

-- Refus avant toute création.
select throws_ok($$ select public.create_household('   ', '2025-03-15', 'maman', 'Maman') $$, 'P0001', 'invalid_input',
  'prénom vide : refusé');
select throws_ok($$ select public.create_household('Léa', '2025-03-15', 'maman', '  ') $$, 'P0001', 'invalid_input',
  'nom d''affichage vide : refusé');
select throws_ok($$ select public.create_household('Léa', (now() at time zone 'Europe/Paris')::date + 2, 'maman', 'Maman') $$,
  'P0001', 'invalid_input', 'date de naissance future : refusée');
select throws_ok($$ select public.create_household(repeat('a', 51), '2025-03-15', 'maman', 'Maman') $$,
  'P0001', 'invalid_input', 'prénom de 51 caractères : refusé');
select throws_ok($$ select public.create_household('Léa', '2025-03-15', 'maman', repeat('a', 31)) $$,
  'P0001', 'invalid_input', 'nom d''affichage de 31 caractères : refusé');
select tests.logout();
select is((select count(*) from public.households), 0::bigint, 'aucun foyer créé par les refus');
select is((select count(*) from public.children), 0::bigint, 'aucun enfant créé par les refus (tout ou rien)');

-- Compte dont l'adresse n'est pas confirmée.
select tests.login('00000000-0000-4000-8000-0000000000d1', 'nonconfirme@example.test');
select throws_ok($$ select public.create_household('Léa', '2025-03-15', 'maman', 'Maman') $$, 'P0001', 'not_authenticated',
  'adresse non confirmée : création refusée');
select throws_ok($$ select * from public.get_onboarding_state() $$, 'P0001', 'not_authenticated',
  'adresse non confirmée : get_onboarding_state refusée');
select tests.logout();

-- Prénom de 45 caractères : nom du foyer tronqué à 50, sans espace final (CA21).
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select lives_ok($$ select public.create_household(repeat('a', 45), '2025-03-15', 'maman', 'Maman') $$,
  'prénom de 45 caractères : foyer créé');
select tests.logout();
select is((select char_length(name) from public.households), 50, 'le nom du foyer est tronqué à 50 caractères');
delete from public.households;

select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select lives_ok($$ select public.create_household(repeat('a', 40) || ' ' || repeat('b', 4), '2025-03-15', 'maman', 'Maman') $$,
  'prénom dont la troncature tombe sur une espace : foyer créé');
select tests.logout();
select is((select name from public.households), 'Foyer de ' || repeat('a', 40),
  'la troncature retire l''espace final');
delete from public.households;

-- Création nominale ------------------------------------------------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select lives_ok($$ select public.create_household(' Léa ', '2025-03-15', 'maman', ' Maman ') $$,
  'création du foyer par le premier parent');
select tests.logout();

select is((select name from public.households), 'Foyer de Léa', 'le nom du foyer est « Foyer de {prénom} »');
select is((select first_name from public.children), 'Léa', 'l''enfant est créé, prénom sans espaces');
select is((select birth_date from public.children), '2025-03-15'::date, 'la date de naissance est enregistrée');
select is((select count(*) from public.household_members
            where user_id = '00000000-0000-4000-8000-0000000000a1' and role = 'maman' and display_name = 'Maman'),
  1::bigint, 'le créateur est membre, avec son rôle et son nom');

-- Un second foyer est refusé, par A comme par C (CA22) -----------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select throws_ok($$ select public.create_household('Autre', '2025-03-15', 'papa', 'Papa') $$, 'P0001', 'household_exists',
  'A : second foyer refusé');
select is((select status from public.get_onboarding_state()), 'member', 'A : état « member »');
select tests.logout();

select tests.login('00000000-0000-4000-8000-0000000000c1', 'autre@example.test');
select throws_ok($$ select public.create_household('Autre', '2025-03-15', 'papa', 'Papa') $$, 'P0001', 'household_exists',
  'C : second foyer refusé');
select is((select status from public.get_onboarding_state()), 'no_household',
  'C : sans invitation, alors qu''un foyer existe, état « no_household »');
select tests.logout();

select is((select count(*) from public.households), 1::bigint, 'il n''existe toujours qu''un foyer');
select throws_ok($$ insert into public.households (name) values ('Second foyer') $$, '23505', null,
  'insertion directe d''un second foyer : refusée par l''index unique');

select * from finish();
rollback;
