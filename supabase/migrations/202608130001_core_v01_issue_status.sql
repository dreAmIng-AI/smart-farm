begin;

grant update (status, resolved_at) on public.issue_records to authenticated;

create policy "members can update issue status"
on public.issue_records for update
using (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
)
with check (
  exists (
    select 1
    from public.farm_tasks task
    where task.id = issue_records.farm_task_id
      and public.has_farm_access(task.farm_id)
  )
);

commit;
