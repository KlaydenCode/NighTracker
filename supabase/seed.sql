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
