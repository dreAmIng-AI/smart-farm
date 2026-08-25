begin;

-- Keep every existing ActionLog-origin IssueRecord valid while allowing one
-- standalone Observation to become one non-diagnostic IssueRecord.
alter table public.issue_records
  add column observation_id uuid references public.observations(id) on delete restrict;

alter table public.issue_records
  alter column action_log_id drop not null,
  alter column farm_task_id drop not null,
  alter column crop_cycle_id drop not null;

create unique index issue_records_observation_id_unique
  on public.issue_records (observation_id)
  where observation_id is not null;

alter table public.issue_records
  add constraint issue_records_exactly_one_origin
  check (
    (observation_id is null and action_log_id is not null and farm_task_id is not null)
    or
    (observation_id is not null and action_log_id is null and farm_task_id is null)
  );

create index issue_records_observation_created_at_idx
  on public.issue_records (observation_id, created_at desc)
  where observation_id is not null;

drop policy if exists "members can read issue records" on public.issue_records;
create policy "members can read issue records"
on public.issue_records for select
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
  or exists (
    select 1
    from public.observations observation
    where observation.id = issue_records.observation_id
      and public.has_farm_access(observation.farm_id)
  )
);

drop policy if exists "members can create issue records" on public.issue_records;
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
  or exists (
    select 1
    from public.observations observation
    where observation.id = issue_records.observation_id
      and observation.crop_cycle_id is not distinct from issue_records.crop_cycle_id
      and public.has_farm_access(observation.farm_id)
  )
);

drop policy if exists "farm managers can update issue status" on public.issue_records;
create policy "farm managers can update issue status"
on public.issue_records for update
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_role(task.farm_id, array['owner', 'admin'])
  )
  or exists (
    select 1
    from public.observations observation
    where observation.id = issue_records.observation_id
      and public.has_farm_role(observation.farm_id, array['owner', 'admin'])
  )
)
with check (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_role(task.farm_id, array['owner', 'admin'])
  )
  or exists (
    select 1
    from public.observations observation
    where observation.id = issue_records.observation_id
      and public.has_farm_role(observation.farm_id, array['owner', 'admin'])
  )
);

create or replace function public.create_observation_issue(
  p_observation_id uuid,
  p_severity text,
  p_expert_review_required boolean
)
returns table (issue_id uuid, issue_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_observation public.observations%rowtype;
  created_issue_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record an observation issue';
  end if;

  if p_severity is null or p_severity not in ('low', 'medium', 'high', 'unknown') then
    raise exception 'Unsupported issue severity: %', p_severity;
  end if;

  select *
  into selected_observation
  from public.observations
  where id = p_observation_id
  for update;

  if not found or not public.has_farm_access(selected_observation.farm_id) then
    raise exception 'Observation not found or not accessible';
  end if;

  insert into public.issue_records (
    observation_id,
    crop_cycle_id,
    observed_symptom,
    severity,
    expert_review_required
  )
  values (
    selected_observation.id,
    selected_observation.crop_cycle_id,
    selected_observation.content,
    p_severity,
    coalesce(p_expert_review_required, false)
  )
  returning id into created_issue_id;

  return query select created_issue_id, 'open'::text;
end;
$$;

-- A Follow-up remains a regular FarmTask. Observation-origin Issues can create
-- one only when their Observation supplies the required CropCycle context.
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
  source_observation public.observations%rowtype;
  source_farm_id uuid;
  source_crop_cycle_id uuid;
  source_verification_status text;
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

  select * into selected_issue from public.issue_records where id = p_issue_id;
  if not found then
    raise exception 'Issue record not found or not accessible';
  end if;

  if selected_issue.status not in ('open', 'needs_review') then
    raise exception 'Follow-up tasks can only be created for unresolved issues';
  end if;

  if selected_issue.farm_task_id is not null then
    select * into source_task from public.farm_tasks where id = selected_issue.farm_task_id;
    if not found or not public.has_farm_role(source_task.farm_id, array['owner', 'admin']) then
      raise exception 'Only Farm owners or admins can create a follow-up task';
    end if;
    source_farm_id := source_task.farm_id;
    source_crop_cycle_id := source_task.crop_cycle_id;
    source_verification_status := source_task.verification_status;
  else
    select * into source_observation from public.observations where id = selected_issue.observation_id;
    if not found or not public.has_farm_role(source_observation.farm_id, array['owner', 'admin']) then
      raise exception 'Only Farm owners or admins can create a follow-up task';
    end if;
    if source_observation.crop_cycle_id is null then
      raise exception 'A CropCycle is required before creating a follow-up task from this observation';
    end if;
    source_farm_id := source_observation.farm_id;
    source_crop_cycle_id := source_observation.crop_cycle_id;
    source_verification_status := 'draft';
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
  ) values (
    source_farm_id,
    source_crop_cycle_id,
    null,
    selected_issue.id,
    trim(p_title),
    'follow_up',
    '사용자가 기록한 IssueRecord 재확인을 위한 후속 작업입니다.',
    p_priority,
    p_scheduled_for,
    '[]'::jsonb,
    source_verification_status,
    'issue_followup',
    'pending',
    true
  ) returning id into created_task_id;

  return query select created_task_id, 'pending'::text, p_scheduled_for;
end;
$$;

drop policy if exists "members can read attachments" on public.attachments;
create policy "members can read attachments"
on public.attachments for select
using (
  exists (
    select 1 from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where action_log.id = attachments.action_log_id and public.has_farm_access(task.farm_id)
  ) or exists (
    select 1 from public.issue_records issue_record
    left join public.farm_tasks task on task.id = issue_record.farm_task_id
    left join public.observations observation on observation.id = issue_record.observation_id
    where issue_record.id = attachments.issue_record_id
      and (public.has_farm_access(task.farm_id) or public.has_farm_access(observation.farm_id))
  )
);

drop policy if exists "members can create attachments" on public.attachments;
create policy "members can create attachments"
on public.attachments for insert
with check (
  exists (
    select 1 from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where action_log.id = attachments.action_log_id and public.has_farm_access(task.farm_id)
  ) or exists (
    select 1 from public.issue_records issue_record
    left join public.farm_tasks task on task.id = issue_record.farm_task_id
    left join public.observations observation on observation.id = issue_record.observation_id
    where issue_record.id = attachments.issue_record_id
      and (public.has_farm_access(task.farm_id) or public.has_farm_access(observation.farm_id))
  )
);

drop policy if exists "farm members can read attachment objects" on storage.objects;
create policy "farm members can read attachment objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'farm-attachments' and (
    exists (
      select 1 from public.action_logs action_log
      join public.farm_tasks task on task.id = action_log.farm_task_id
      where task.farm_id::text = (storage.foldername(name))[1]
        and action_log.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(task.farm_id)
    ) or exists (
      select 1 from public.issue_records issue_record
      join public.observations observation on observation.id = issue_record.observation_id
      where observation.farm_id::text = (storage.foldername(name))[1]
        and issue_record.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(observation.farm_id)
    )
  )
);

drop policy if exists "farm members can upload attachment objects" on storage.objects;
create policy "farm members can upload attachment objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'farm-attachments' and (
    exists (
      select 1 from public.action_logs action_log
      join public.farm_tasks task on task.id = action_log.farm_task_id
      where task.farm_id::text = (storage.foldername(name))[1]
        and action_log.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(task.farm_id)
    ) or exists (
      select 1 from public.issue_records issue_record
      join public.observations observation on observation.id = issue_record.observation_id
      where observation.farm_id::text = (storage.foldername(name))[1]
        and issue_record.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(observation.farm_id)
    )
  )
);

drop policy if exists "farm members can remove failed attachment objects" on storage.objects;
create policy "farm members can remove failed attachment objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'farm-attachments'
  and not exists (select 1 from public.attachments attachment where attachment.storage_path = name)
  and (
    exists (
      select 1 from public.action_logs action_log
      join public.farm_tasks task on task.id = action_log.farm_task_id
      where task.farm_id::text = (storage.foldername(name))[1]
        and action_log.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(task.farm_id)
    ) or exists (
      select 1 from public.issue_records issue_record
      join public.observations observation on observation.id = issue_record.observation_id
      where observation.farm_id::text = (storage.foldername(name))[1]
        and issue_record.id::text = (storage.foldername(name))[2]
        and public.has_farm_access(observation.farm_id)
    )
  )
);

revoke all on function public.create_observation_issue(uuid, text, boolean) from public;
grant execute on function public.create_observation_issue(uuid, text, boolean) to authenticated;
revoke all on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) from public;
grant execute on function public.create_issue_follow_up_task(uuid, text, timestamptz, text) to authenticated;

commit;
