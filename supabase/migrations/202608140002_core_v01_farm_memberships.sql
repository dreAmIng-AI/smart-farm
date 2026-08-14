begin;

create table public.farm_invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 320),
  role text not null check (role in ('admin', 'farmer')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'accepted' and accepted_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and accepted_at is null)
    or (status in ('pending', 'expired') and accepted_at is null and revoked_at is null)
  )
);

create unique index farm_invitations_one_pending_email_idx
on public.farm_invitations (farm_id, email)
where status = 'pending';

create index farm_invitations_farm_status_idx
on public.farm_invitations (farm_id, status, created_at desc);

alter table public.farm_invitations enable row level security;

create or replace function public.has_farm_role(
  target_farm_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_memberships membership
    where membership.farm_id = target_farm_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

create policy "farm managers can read invitations"
on public.farm_invitations for select
using (public.has_farm_role(farm_id, array['owner', 'admin']));

create or replace function public.get_farm_collaboration(p_farm_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  members jsonb;
  invitations jsonb;
begin
  select membership.role
  into actor_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = auth.uid();

  if actor_role is null then
    raise exception 'Farm not found or not accessible';
  end if;

  if actor_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'actorRole', actor_role,
      'members', '[]'::jsonb,
      'invitations', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', membership.user_id,
        'email', user_account.email,
        'role', membership.role,
        'createdAt', membership.created_at
      )
      order by
        case membership.role
          when 'owner' then 1
          when 'admin' then 2
          else 3
        end,
        user_account.email
    ),
    '[]'::jsonb
  )
  into members
  from public.farm_memberships membership
  join auth.users user_account on user_account.id = membership.user_id
  where membership.farm_id = p_farm_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', invitation.id,
        'email', invitation.email,
        'role', invitation.role,
        'status', invitation.status,
        'expiresAt', invitation.expires_at,
        'createdAt', invitation.created_at
      )
      order by invitation.created_at desc
    ),
    '[]'::jsonb
  )
  into invitations
  from public.farm_invitations invitation
  where invitation.farm_id = p_farm_id
    and invitation.status = 'pending'
    and invitation.expires_at > now();

  return jsonb_build_object(
    'actorRole', actor_role,
    'members', members,
    'invitations', invitations
  );
end;
$$;

create or replace function public.create_farm_invitation(
  p_farm_id uuid,
  p_email text,
  p_role text
)
returns table (
  id uuid,
  email text,
  role text,
  token uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  normalized_email text;
  raw_token uuid;
  created_invitation public.farm_invitations%rowtype;
begin
  select membership.role
  into actor_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only farm owners or admins can create invitations';
  end if;

  if p_role not in ('admin', 'farmer') then
    raise exception 'Invitation role must be admin or farmer';
  end if;

  if actor_role = 'admin' and p_role <> 'farmer' then
    raise exception 'Farm admins can invite farmers only';
  end if;

  normalized_email := lower(trim(p_email));
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' then
    raise exception 'A valid invitation email is required';
  end if;

  update public.farm_invitations
  set status = 'revoked',
      revoked_at = now()
  where farm_id = p_farm_id
    and email = normalized_email
    and status = 'pending';

  raw_token := gen_random_uuid();

  insert into public.farm_invitations (
    farm_id,
    email,
    role,
    token_hash,
    invited_by
  )
  values (
    p_farm_id,
    normalized_email,
    p_role,
    encode(digest(raw_token::text, 'sha256'), 'hex'),
    auth.uid()
  )
  returning * into created_invitation;

  return query
  select
    created_invitation.id,
    created_invitation.email,
    created_invitation.role,
    raw_token,
    created_invitation.expires_at;
end;
$$;

create or replace function public.accept_farm_invitation(p_token uuid)
returns table (
  farm_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.farm_invitations%rowtype;
  signed_in_email text;
  existing_member_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to accept an invitation';
  end if;

  select lower(user_account.email)
  into signed_in_email
  from auth.users user_account
  where user_account.id = auth.uid();

  if signed_in_email is null then
    raise exception 'A signed-in email is required to accept an invitation';
  end if;

  select *
  into invitation
  from public.farm_invitations
  where token_hash = encode(digest(p_token::text, 'sha256'), 'hex')
  for update;

  if not found or invitation.status <> 'pending' then
    raise exception 'Invitation not found or already handled';
  end if;

  if invitation.expires_at <= now() then
    update public.farm_invitations
    set status = 'expired'
    where id = invitation.id;

    raise exception 'Invitation has expired';
  end if;

  if invitation.email <> signed_in_email then
    raise exception 'This invitation belongs to a different email address';
  end if;

  select membership.role
  into existing_member_role
  from public.farm_memberships membership
  where membership.farm_id = invitation.farm_id
    and membership.user_id = auth.uid();

  if existing_member_role is not null then
    raise exception 'This user is already a Farm member';
  end if;

  insert into public.farm_memberships (farm_id, user_id, role)
  values (invitation.farm_id, auth.uid(), invitation.role);

  update public.farm_invitations
  set status = 'accepted',
      accepted_at = now()
  where id = invitation.id;

  return query select invitation.farm_id, invitation.role;
end;
$$;

create or replace function public.update_farm_member_role(
  p_farm_id uuid,
  p_member_user_id uuid,
  p_role text
)
returns table (
  user_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
begin
  select membership.role
  into actor_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = auth.uid();

  if actor_role is distinct from 'owner' then
    raise exception 'Only the farm owner can change member roles';
  end if;

  if p_role not in ('admin', 'farmer') then
    raise exception 'Member role must be admin or farmer';
  end if;

  select membership.role
  into target_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = p_member_user_id
  for update;

  if target_role is null then
    raise exception 'Farm member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'The farm owner role cannot be changed';
  end if;

  update public.farm_memberships
  set role = p_role
  where farm_id = p_farm_id
    and user_id = p_member_user_id;

  return query select p_member_user_id, p_role;
end;
$$;

create or replace function public.remove_farm_member(
  p_farm_id uuid,
  p_member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
begin
  select membership.role
  into actor_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only farm owners or admins can remove members';
  end if;

  select membership.role
  into target_role
  from public.farm_memberships membership
  where membership.farm_id = p_farm_id
    and membership.user_id = p_member_user_id
  for update;

  if target_role is null then
    raise exception 'Farm member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'The farm owner cannot be removed';
  end if;

  if actor_role = 'admin' and target_role <> 'farmer' then
    raise exception 'Farm admins can remove farmers only';
  end if;

  delete from public.farm_memberships
  where farm_id = p_farm_id
    and user_id = p_member_user_id;
end;
$$;

create or replace function public.revoke_farm_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  invitation public.farm_invitations%rowtype;
begin
  select *
  into invitation
  from public.farm_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  select membership.role
  into actor_role
  from public.farm_memberships membership
  where membership.farm_id = invitation.farm_id
    and membership.user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only farm owners or admins can revoke invitations';
  end if;

  if actor_role = 'admin' and invitation.role <> 'farmer' then
    raise exception 'Farm admins can revoke farmer invitations only';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Only pending invitations can be revoked';
  end if;

  update public.farm_invitations
  set status = 'revoked',
      revoked_at = now()
  where id = invitation.id;
end;
$$;

revoke all on function public.has_farm_role(uuid, text[]) from public;
revoke all on function public.get_farm_collaboration(uuid) from public;
revoke all on function public.create_farm_invitation(uuid, text, text) from public;
revoke all on function public.accept_farm_invitation(uuid) from public;
revoke all on function public.update_farm_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_farm_member(uuid, uuid) from public;
revoke all on function public.revoke_farm_invitation(uuid) from public;

grant select on public.farm_invitations to authenticated;
grant execute on function public.has_farm_role(uuid, text[]) to authenticated;
grant execute on function public.get_farm_collaboration(uuid) to authenticated;
grant execute on function public.create_farm_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_farm_invitation(uuid) to authenticated;
grant execute on function public.update_farm_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_farm_member(uuid, uuid) to authenticated;
grant execute on function public.revoke_farm_invitation(uuid) to authenticated;

commit;
