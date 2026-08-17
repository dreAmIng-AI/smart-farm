begin;

-- The original function escaped the dot twice in its PostgreSQL regular
-- expression, so every normal email address was rejected. Keep the same
-- invitation flow and access checks; only correct the validation pattern.
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

commit;
