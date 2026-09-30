-- Invitation et acceptation (CA6, CA25 à CA34, CA51).
-- A (maman) fonde le foyer ; B (papa@example.test) est invité ; C est un autre compte sans foyer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1',
   'authenticated', 'authenticated', 'autre@example.test', now());

insert into public.households (id, name) values ('00000000-0000-4000-8000-000000000001', 'Foyer de test');
insert into public.children (id, household_id, first_name, birth_date)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Test', '2025-03-15');
insert into public.household_members (household_id, user_id, role, display_name)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'maman', 'Maman');

-- Invitation --------------------------------------------------------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select lives_ok($$ select public.invite_member(' Papa@Example.TEST ', 'papa') $$, 'A invite papa@example.test');
select is((select email from public.household_invitations), 'papa@example.test',
  'l''adresse est enregistrée en minuscules, sans espaces');
select is((select role::text from public.household_invitations), 'papa', 'le rôle de l''invitation est papa');
select is((select invited_by from public.household_invitations), '00000000-0000-4000-8000-0000000000a1'::uuid,
  'l''invitation garde l''auteur');

select throws_ok($$ select public.invite_member('MAMAN@example.test', 'papa') $$, 'P0001', 'already_member',
  'inviter sa propre adresse (autre casse) : refusé');
select throws_ok($$ select public.invite_member('papa@example.test', 'papa') $$, 'P0001', 'invitation_pending',
  'seconde invitation, même adresse : refusée');
select throws_ok($$ select public.invite_member('PAPA@example.test', 'papa') $$, 'P0001', 'invitation_pending',
  'seconde invitation, autre casse : refusée');
select throws_ok($$ select public.invite_member('quelquun@example.test', 'papa') $$, 'P0001', 'invitation_pending',
  'seconde invitation, autre adresse : refusée');
select is((select count(*) from public.household_invitations), 1::bigint, 'une seule invitation en attente');
select tests.logout();

select tests.login('00000000-0000-4000-8000-0000000000c1', 'autre@example.test');
select throws_ok($$ select public.invite_member('x@example.test', 'papa') $$, 'P0001', 'not_member',
  'C (sans foyer) : invitation refusée');
select tests.logout();

-- L'invité voit le nom du foyer et son rôle, pas la table des invitations (D6).
select tests.login('00000000-0000-4000-8000-0000000000b1', 'papa@example.test');
select results_eq(
  $$ select status, household_name, invited_role::text from public.get_onboarding_state() $$,
  $$ values ('invited'::text, 'Foyer de test'::text, 'papa'::text) $$,
  'B : état « invited » avec le nom du foyer et le rôle');
select is((select count(*) from public.household_invitations), 0::bigint, 'B ne lit pas la table des invitations');
select tests.logout();

-- Un autre compte ne peut pas accepter l'invitation de B (CA33, CA51).
select tests.login('00000000-0000-4000-8000-0000000000c1', 'autre@example.test');
select throws_ok($$ select public.accept_invitation('Intrus') $$, 'P0001', 'invitation_not_found',
  'C : acceptation refusée');
select is((select status from public.get_onboarding_state()), 'no_household', 'C : état « no_household »');
select tests.logout();
select is((select count(*) from public.household_members), 1::bigint, 'aucun membre ajouté par C');

-- Rôle réservé à l'invitation (CA34).
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select throws_ok($$ select public.update_my_membership('Maman', 'papa') $$, 'P0001', 'role_reserved',
  'A : prendre le rôle de l''invitation en attente est refusé');
select lives_ok($$ select public.update_my_membership(' Maman chérie ', 'maman') $$,
  'A : changer son nom d''affichage est accepté');
select tests.logout();
select is((select display_name from public.household_members where role = 'maman'), 'Maman chérie',
  'le nom d''affichage est enregistré, sans espaces');

-- Acceptation (CA30 à CA32) ----------------------------------------------------------------------
select tests.login('00000000-0000-4000-8000-0000000000b1', 'papa@example.test');
select lives_ok($$ select public.accept_invitation(' Papa ') $$, 'B accepte l''invitation');
select is(public.accept_invitation('Papa'), '00000000-0000-4000-8000-000000000001'::uuid,
  'B accepte une seconde fois : même foyer, sans erreur');
select is((select status from public.get_onboarding_state()), 'member', 'B : état « member »');
select tests.logout();

select is((select count(*) from public.household_members), 2::bigint, 'B n''est pas ajouté en double');
select is((select role::text || '/' || display_name from public.household_members
            where user_id = '00000000-0000-4000-8000-0000000000b1'), 'papa/Papa',
  'B a le rôle de l''invitation et le nom saisi');
select isnt((select accepted_at from public.household_invitations), null, 'l''invitation est marquée acceptée');

-- Foyer complet : plus d'invitation possible (CA29) ; une invitation acceptée ne se supprime pas.
select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select throws_ok($$ select public.invite_member('nounou@example.test', 'maman') $$, 'P0001', 'role_taken',
  'foyer complet : invitation en maman refusée');
select throws_ok($$ select public.invite_member('nounou@example.test', 'papa') $$, 'P0001', 'role_taken',
  'foyer complet : invitation en papa refusée');
select is(tests.affected($$ delete from public.household_invitations $$), 0::bigint,
  'A : une invitation acceptée ne se supprime pas');
select tests.logout();

-- Annulation (CA28) : B est retiré du foyer par le propriétaire pour rejouer le parcours.
delete from public.household_members where user_id = '00000000-0000-4000-8000-0000000000b1';
delete from public.household_invitations;

select tests.login('00000000-0000-4000-8000-0000000000a1', 'maman@example.test');
select lives_ok($$ select public.invite_member('papa@example.test', 'papa') $$, 'A invite de nouveau papa@example.test');
select is(tests.affected($$ delete from public.household_invitations where accepted_at is null $$), 1::bigint,
  'A annule l''invitation en attente');
select lives_ok($$ select public.invite_member('papa@example.test', 'papa') $$, 'le formulaire d''invitation est de nouveau possible');
select is(tests.affected($$ delete from public.household_invitations where accepted_at is null $$), 1::bigint,
  'A annule de nouveau l''invitation');
select tests.logout();

select tests.login('00000000-0000-4000-8000-0000000000b1', 'papa@example.test');
select throws_ok($$ select public.accept_invitation('Papa') $$, 'P0001', 'invitation_not_found',
  'B : acceptation d''une invitation annulée refusée');
select is((select status from public.get_onboarding_state()), 'no_household', 'B : état « no_household » après annulation');
select tests.logout();
select is((select count(*) from public.household_members), 1::bigint, 'B n''est pas membre après l''annulation');

select * from finish();
rollback;
