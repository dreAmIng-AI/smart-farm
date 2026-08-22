begin;

alter table public.farm_tasks
add column assigned_user_id uuid references auth.users(id) on delete set null;

create index farm_tasks_farm_assigned_user_idx
on public.farm_tasks (farm_id, assigned_user_id)
where assigned_user_id is not null;

-- A manager can update FarmTask rows through RLS, but the assignee must still
-- belong to the same Farm even if a direct database update is attempted.
create or replace function public.validate_farm_task_assignee_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1
    from public.farm_memberships membership
    where membership.farm_id = new.farm_id
      and membership.user_id = new.assigned_user_id
  ) then
    raise exception 'FarmTask assignee must be an active member of the Farm';
  end if;

  return new;
end;
$$;

create trigger farm_tasks_validate_assignee_membership
before insert or update of farm_id, assigned_user_id on public.farm_tasks
for each row execute function public.validate_farm_task_assignee_membership();

-- Removing a member also clears only their coordination assignment. It does
-- not delete FarmTask records or their execution history.
create or replace function public.clear_removed_farm_member_task_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.farm_tasks
  set assigned_user_id = null
  where farm_id = old.farm_id
    and assigned_user_id = old.user_id;

  return old;
end;
$$;

create trigger farm_memberships_clear_task_assignments
after delete on public.farm_memberships
for each row execute function public.clear_removed_farm_member_task_assignments();

create or replace function public.assign_farm_task(
  p_task_id uuid,
  p_assigned_user_id uuid
)
returns table (task_id uuid, assigned_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_task public.farm_tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to assign a FarmTask';
  end if;

  select *
  into selected_task
  from public.farm_tasks
  where id = p_task_id
  for update;

  if not found or not public.has_farm_role(selected_task.farm_id, array['owner', 'admin']) then
    raise exception 'FarmTask not found or not manageable';
  end if;

  if selected_task.status not in ('pending', 'in_progress') then
    raise exception 'FarmTask assignment is only available before completion: %', selected_task.status;
  end if;

  if p_assigned_user_id is not null and not exists (
    select 1
    from public.farm_memberships membership
    where membership.farm_id = selected_task.farm_id
      and membership.user_id = p_assigned_user_id
  ) then
    raise exception 'FarmTask assignee must be an active member of the Farm';
  end if;

  return query
  update public.farm_tasks
  set assigned_user_id = p_assigned_user_id
  where id = selected_task.id
  returning farm_tasks.id, farm_tasks.assigned_user_id;
end;
$$;

revoke all on function public.validate_farm_task_assignee_membership() from public;
revoke all on function public.clear_removed_farm_member_task_assignments() from public;
revoke all on function public.assign_farm_task(uuid, uuid) from public;
grant execute on function public.assign_farm_task(uuid, uuid) to authenticated;

commit;
