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
  from public, anon, authenticated, service_role;

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
