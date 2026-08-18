begin;

create table public.farm_creator_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.farm_creator_permissions enable row level security;

revoke all on table public.farm_creator_permissions from public, anon, authenticated;

create or replace function public.can_create_farms()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.farm_creator_permissions permission
      where permission.user_id = auth.uid()
    );
$$;

revoke all on function public.can_create_farms() from public;
grant execute on function public.can_create_farms() to authenticated;

-- Existing Farm owners keep their ability to create additional Farms. Invited
-- admins and farmers are intentionally not seeded with this global permission.
insert into public.farm_creator_permissions (user_id)
select distinct membership.user_id
from public.farm_memberships membership
where membership.role = 'owner'
on conflict (user_id) do nothing;

drop policy if exists "authenticated users can create farms" on public.farms;
create policy "farm owners can create farms"
on public.farms for insert
with check (public.can_create_farms());

drop policy if exists "members can update farms" on public.farms;
create policy "farm managers can update farms"
on public.farms for update
using (public.has_farm_role(id, array['owner', 'admin']))
with check (public.has_farm_role(id, array['owner', 'admin']));

drop policy if exists "members can create crop cycles" on public.crop_cycles;
create policy "farm managers can create crop cycles"
on public.crop_cycles for insert
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

drop policy if exists "members can update crop cycles" on public.crop_cycles;
create policy "farm managers can update crop cycles"
on public.crop_cycles for update
using (public.has_farm_role(farm_id, array['owner', 'admin']))
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

drop policy if exists "members can create farm tasks" on public.farm_tasks;
create policy "farm managers can create farm tasks"
on public.farm_tasks for insert
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

drop policy if exists "members can update farm tasks" on public.farm_tasks;
create policy "farm managers can update farm tasks"
on public.farm_tasks for update
using (public.has_farm_role(farm_id, array['owner', 'admin']))
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

drop policy if exists "members can update issue status" on public.issue_records;
create policy "farm managers can update issue status"
on public.issue_records for update
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_role(task.farm_id, array['owner', 'admin'])
  )
)
with check (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_role(task.farm_id, array['owner', 'admin'])
  )
);

-- These RPCs continue to let every Farm member record an observed result or
-- issue, while the explicit membership check preserves the RLS boundary.
create or replace function public.record_farm_task_action(
  p_task_id uuid,
  p_action_type text,
  p_note text,
  p_performed_at timestamptz
)
returns table (action_log_id uuid, task_status text, completed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_task public.farm_tasks%rowtype;
  created_action_log_id uuid;
  updated_task_status text;
  updated_completed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record a task result';
  end if;

  if p_action_type not in ('completed', 'not_checked') then
    raise exception 'Unsupported action type: %', p_action_type;
  end if;

  select *
  into selected_task
  from public.farm_tasks
  where id = p_task_id
  for update;

  if not found or not public.has_farm_access(selected_task.farm_id) then
    raise exception 'Farm task not found or not accessible';
  end if;

  if selected_task.status not in ('pending', 'in_progress') then
    raise exception 'Farm task cannot record another result from status: %', selected_task.status;
  end if;

  insert into public.action_logs (
    farm_task_id,
    user_id,
    action_type,
    result_code,
    note,
    performed_at
  )
  values (
    selected_task.id,
    auth.uid(),
    p_action_type,
    p_action_type,
    nullif(trim(p_note), ''),
    p_performed_at
  )
  returning id into created_action_log_id;

  if p_action_type = 'completed' then
    update public.farm_tasks
    set status = 'completed',
        completed_at = p_performed_at
    where id = selected_task.id
    returning status, farm_tasks.completed_at
    into updated_task_status, updated_completed_at;
  else
    updated_task_status := selected_task.status;
    updated_completed_at := selected_task.completed_at;
  end if;

  return query
  select created_action_log_id, updated_task_status, updated_completed_at;
end;
$$;

create or replace function public.record_farm_task_issue(
  p_task_id uuid,
  p_note text,
  p_performed_at timestamptz,
  p_observed_symptom text,
  p_severity text,
  p_expert_review_required boolean
)
returns table (
  action_log_id uuid,
  issue_id uuid,
  task_status text,
  issue_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_task public.farm_tasks%rowtype;
  created_action_log_id uuid;
  created_issue_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to report an issue';
  end if;

  if p_performed_at is null then
    raise exception 'performed_at is required';
  end if;

  if nullif(trim(p_observed_symptom), '') is null then
    raise exception 'observed_symptom is required';
  end if;

  if p_severity is null or p_severity not in ('low', 'medium', 'high', 'unknown') then
    raise exception 'Unsupported issue severity: %', p_severity;
  end if;

  select *
  into selected_task
  from public.farm_tasks
  where id = p_task_id
  for update;

  if not found or not public.has_farm_access(selected_task.farm_id) then
    raise exception 'Farm task not found or not accessible';
  end if;

  if selected_task.status not in ('pending', 'in_progress') then
    raise exception 'Farm task cannot report an issue from status: %', selected_task.status;
  end if;

  insert into public.action_logs (
    farm_task_id,
    user_id,
    action_type,
    result_code,
    note,
    performed_at
  )
  values (
    selected_task.id,
    auth.uid(),
    'issue_reported',
    'observed_issue',
    nullif(trim(p_note), ''),
    p_performed_at
  )
  returning id into created_action_log_id;

  insert into public.issue_records (
    action_log_id,
    farm_task_id,
    crop_cycle_id,
    observed_symptom,
    severity,
    expert_review_required
  )
  values (
    created_action_log_id,
    selected_task.id,
    selected_task.crop_cycle_id,
    trim(p_observed_symptom),
    p_severity,
    coalesce(p_expert_review_required, false)
  )
  returning id into created_issue_id;

  update public.farm_tasks
  set status = 'issue_reported'
  where id = selected_task.id;

  return query
  select created_action_log_id, created_issue_id, 'issue_reported'::text, 'open'::text;
end;
$$;

create or replace function public.create_issue_follow_up_task(
  p_issue_id uuid,
  p_title text,
  p_scheduled_for timestamptz,
  p_priority text
)
returns table (
  farm_task_id uuid,
  task_status text,
  scheduled_for timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_issue public.issue_records%rowtype;
  source_task public.farm_tasks%rowtype;
  created_task_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a follow-up task';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Follow-up title is required';
  end if;

  if p_scheduled_for is null then
    raise exception 'scheduled_for is required';
  end if;

  if p_priority is null or p_priority not in ('low', 'medium', 'high') then
    raise exception 'Unsupported task priority: %', p_priority;
  end if;

  select *
  into selected_issue
  from public.issue_records
  where id = p_issue_id;

  if not found then
    raise exception 'Issue record not found or not accessible';
  end if;

  select *
  into source_task
  from public.farm_tasks
  where id = selected_issue.farm_task_id;

  if not found or not public.has_farm_role(source_task.farm_id, array['owner', 'admin']) then
    raise exception 'Only Farm owners or admins can create a follow-up task';
  end if;

  if selected_issue.status not in ('open', 'needs_review') then
    raise exception 'Follow-up tasks can only be created for unresolved issues';
  end if;

  insert into public.farm_tasks (
    farm_id,
    crop_cycle_id,
    task_template_id,
    parent_issue_id,
    title,
    task_type,
    reason,
    priority,
    scheduled_for,
    evidence,
    verification_status,
    source_type,
    status,
    result_required
  )
  values (
    source_task.farm_id,
    source_task.crop_cycle_id,
    null,
    selected_issue.id,
    trim(p_title),
    'follow_up',
    'Follow-up task created from an IssueRecord for verification.',
    p_priority,
    p_scheduled_for,
    '[]'::jsonb,
    source_task.verification_status,
    'issue_followup',
    'pending',
    true
  )
  returning id into created_task_id;

  return query
  select created_task_id, 'pending'::text, p_scheduled_for;
end;
$$;

create or replace function public.generate_planned_farm_tasks(p_crop_cycle_id uuid)
returns table (generated_count integer, task_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_cycle public.crop_cycles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to generate FarmTasks';
  end if;

  select *
  into selected_cycle
  from public.crop_cycles
  where id = p_crop_cycle_id
    and status = 'active';

  if not found or not public.has_farm_role(selected_cycle.farm_id, array['owner', 'admin']) then
    raise exception 'Active CropCycle not found or not manageable';
  end if;

  return query
  with inserted as (
    insert into public.farm_tasks (
      farm_id,
      crop_cycle_id,
      task_template_id,
      title,
      task_type,
      reason,
      priority,
      scheduled_for,
      evidence,
      verification_status,
      source_type,
      status,
      result_required
    )
    select
      selected_cycle.farm_id,
      selected_cycle.id,
      template.id,
      template.title,
      template.task_type,
      template.reason,
      template.priority,
      ((selected_cycle.transplant_date + coalesce((template.timing ->> 'offsetDays')::integer, 0))::timestamp at time zone 'UTC'),
      template.evidence,
      template.verification_status,
      'template',
      'pending',
      true
    from public.task_templates template
    where template.crop_code = selected_cycle.crop_code
      and (template.cultivar is null or template.cultivar = selected_cycle.cultivar)
    on conflict (crop_cycle_id, task_template_id, scheduled_for) do nothing
    returning id
  )
  select count(*)::integer, coalesce(array_agg(id), '{}'::uuid[])
  from inserted;
end;
$$;

revoke all on function public.record_farm_task_action(uuid, text, text, timestamptz) from public;
revoke all on function public.record_farm_task_issue(uuid, text, timestamptz, text, text, boolean) from public;
revoke all on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) from public;
revoke all on function public.generate_planned_farm_tasks(uuid) from public;

grant execute on function public.record_farm_task_action(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.record_farm_task_issue(uuid, text, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.generate_planned_farm_tasks(uuid) to authenticated;

commit;
