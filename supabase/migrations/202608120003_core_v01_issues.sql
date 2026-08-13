begin;

create table public.issue_records (
  id uuid primary key default gen_random_uuid(),
  action_log_id uuid not null unique references public.action_logs(id) on delete cascade,
  farm_task_id uuid not null references public.farm_tasks(id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles(id) on delete cascade,
  observed_symptom text not null check (char_length(trim(observed_symptom)) > 0),
  severity text not null check (severity in ('low', 'medium', 'high', 'unknown')),
  status text not null default 'open' check (status in ('open', 'needs_review', 'resolved', 'closed_without_action')),
  expert_review_required boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.farm_tasks
  add constraint farm_tasks_parent_issue_id_fkey
  foreign key (parent_issue_id)
  references public.issue_records(id)
  on delete set null;

create index issue_records_farm_task_created_at_idx
on public.issue_records (farm_task_id, created_at desc);

create index issue_records_crop_cycle_status_idx
on public.issue_records (crop_cycle_id, status, created_at desc);

create unique index farm_tasks_followup_issue_schedule_unique
on public.farm_tasks (parent_issue_id, scheduled_for)
where parent_issue_id is not null;

alter table public.issue_records enable row level security;

grant select, insert on public.issue_records to authenticated;

create policy "members can read issue records"
on public.issue_records for select
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
);

create policy "members can create issue records"
on public.issue_records for insert
with check (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and task.crop_cycle_id = issue_records.crop_cycle_id
      and public.has_farm_access(task.farm_id)
  )
);

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
security invoker
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

  if not found then
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
security invoker
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

  if selected_issue.status not in ('open', 'needs_review') then
    raise exception 'Follow-up tasks can only be created for unresolved issues';
  end if;

  select *
  into source_task
  from public.farm_tasks
  where id = selected_issue.farm_task_id;

  if not found then
    raise exception 'Source farm task not found or not accessible';
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
    '사용자가 기록한 IssueRecord 재확인을 위한 후속 작업입니다.',
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

revoke all on function public.record_farm_task_issue(uuid, text, timestamptz, text, text, boolean) from public;
grant execute on function public.record_farm_task_issue(uuid, text, timestamptz, text, text, boolean) to authenticated;

revoke all on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) from public;
grant execute on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) to authenticated;

commit;
