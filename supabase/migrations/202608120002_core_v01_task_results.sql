begin;

create table public.action_logs (
  id uuid primary key default gen_random_uuid(),
  farm_task_id uuid not null references public.farm_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  action_type text not null check (action_type in ('viewed', 'started', 'completed', 'issue_reported', 'not_checked')),
  result_code text,
  note text,
  performed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index action_logs_farm_task_performed_at_idx
on public.action_logs (farm_task_id, performed_at desc);

alter table public.action_logs enable row level security;

grant select, insert on public.action_logs to authenticated;

create policy "members can read action logs"
on public.action_logs for select
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = action_logs.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
);

create policy "members can create their action logs"
on public.action_logs for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.farm_tasks task
    where task.id = action_logs.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
);

create or replace function public.record_farm_task_action(
  p_task_id uuid,
  p_action_type text,
  p_note text,
  p_performed_at timestamptz
)
returns table (action_log_id uuid, task_status text, completed_at timestamptz)
language plpgsql
security invoker
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

  if not found then
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

revoke all on function public.record_farm_task_action(uuid, text, text, timestamptz) from public;
grant execute on function public.record_farm_task_action(uuid, text, text, timestamptz) to authenticated;

commit;
