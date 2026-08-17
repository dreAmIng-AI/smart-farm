begin;

-- Supabase installs pgcrypto in the extensions schema. These security-definer
-- functions intentionally use search_path = public, so the digest function
-- must be schema-qualified for both invitation creation and acceptance.
select extensions.digest('farm-invitation-schema-check', 'sha256');

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
  if normalized_email is null
    or char_length(normalized_email) > 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid invitation email is required';
  end if;

  update public.farm_invitations invitation
  set status = 'revoked',
      revoked_at = now()
  where invitation.farm_id = p_farm_id
    and invitation.email = normalized_email
    and invitation.status = 'pending';

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
    encode(extensions.digest(raw_token::text, 'sha256'), 'hex'),
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
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
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

commit;
