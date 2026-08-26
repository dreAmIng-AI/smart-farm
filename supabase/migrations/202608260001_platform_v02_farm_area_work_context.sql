begin;

-- A FarmArea belongs to exactly one Farm.  The composite key lets the
-- database enforce that a selected area and its CropCycle/FarmTask have the
-- same Farm without storing a separate FarmPlan or adding a trigger.
alter table public.farm_areas
  add constraint farm_areas_farm_id_id_key unique (farm_id, id);

alter table public.crop_cycles
  add column farm_area_id uuid;

alter table public.crop_cycles
  add constraint crop_cycles_farm_area_same_farm_fkey
  foreign key (farm_id, farm_area_id)
  references public.farm_areas (farm_id, id)
  on delete restrict;

create index crop_cycles_farm_area_idx
  on public.crop_cycles (farm_area_id)
  where farm_area_id is not null;

alter table public.farm_tasks
  add column farm_area_id uuid;

alter table public.farm_tasks
  add constraint farm_tasks_farm_area_same_farm_fkey
  foreign key (farm_id, farm_area_id)
  references public.farm_areas (farm_id, id)
  on delete restrict;

create index farm_tasks_farm_area_scheduled_idx
  on public.farm_tasks (farm_area_id, scheduled_for)
  where farm_area_id is not null;

-- A TaskTemplate remains crop-independent.  Only the actual FarmTask takes
-- the optional area context from the selected CropCycle at generation time.
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
      farm_area_id,
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
      selected_cycle.farm_area_id,
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

revoke all on function public.generate_planned_farm_tasks(uuid) from public;
grant execute on function public.generate_planned_farm_tasks(uuid) to authenticated;

commit;
