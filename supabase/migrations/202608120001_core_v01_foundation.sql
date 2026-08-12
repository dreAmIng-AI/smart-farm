begin;

create extension if not exists pgcrypto;

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  region_code text not null check (char_length(trim(region_code)) > 0),
  cultivation_environment text not null check (cultivation_environment in ('facility', 'open_field')),
  cultivation_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farm_memberships (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'farmer', 'admin')),
  created_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

create table public.crop_cycles (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  crop_code text not null check (char_length(trim(crop_code)) > 0),
  cultivar text,
  transplant_date date not null,
  growth_stage text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  crop_code text not null check (char_length(trim(crop_code)) > 0),
  cultivar text,
  growth_stage text,
  task_type text not null,
  title text not null,
  reason text not null,
  timing jsonb not null default '{}'::jsonb,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  evidence jsonb not null default '[]'::jsonb,
  verification_status text not null default 'draft' check (verification_status in ('draft', 'evidence_checked', 'expert_reviewed', 'field_validated')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (crop_code, cultivar, task_type, title, version)
);

create table public.farm_tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles(id) on delete cascade,
  task_template_id uuid references public.task_templates(id) on delete set null,
  parent_issue_id uuid,
  title text not null,
  task_type text not null,
  reason text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  scheduled_for timestamptz not null,
  due_at timestamptz,
  evidence jsonb not null default '[]'::jsonb,
  verification_status text not null check (verification_status in ('draft', 'evidence_checked', 'expert_reviewed', 'field_validated')),
  source_type text not null check (source_type in ('template', 'manual', 'issue_followup')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'issue_reported', 'cancelled')),
  result_required boolean not null default true,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (crop_cycle_id, task_template_id, scheduled_for)
);

create index crop_cycles_farm_id_idx on public.crop_cycles (farm_id);
create index farm_tasks_crop_cycle_schedule_idx on public.farm_tasks (crop_cycle_id, scheduled_for);
create index farm_tasks_today_idx on public.farm_tasks (farm_id, status, scheduled_for);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger farms_set_updated_at
before update on public.farms
for each row execute function public.set_updated_at();

create trigger crop_cycles_set_updated_at
before update on public.crop_cycles
for each row execute function public.set_updated_at();

create or replace function public.has_farm_access(target_farm_id uuid)
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
  );
$$;

create or replace function public.create_owner_farm_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a farm';
  end if;

  insert into public.farm_memberships (farm_id, user_id, role)
  values (new.id, auth.uid(), 'owner');

  return new;
end;
$$;

create trigger farms_create_owner_membership
after insert on public.farms
for each row execute function public.create_owner_farm_membership();

alter table public.farms enable row level security;
alter table public.farm_memberships enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.task_templates enable row level security;
alter table public.farm_tasks enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.farms to authenticated;
grant select on public.farm_memberships to authenticated;
grant select, insert, update on public.crop_cycles to authenticated;
grant select on public.task_templates to authenticated;
grant select, insert, update on public.farm_tasks to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.create_owner_farm_membership() from public;
revoke all on function public.has_farm_access(uuid) from public;
grant execute on function public.has_farm_access(uuid) to authenticated;

create policy "members can read farms"
on public.farms for select
using (public.has_farm_access(id));

create policy "authenticated users can create farms"
on public.farms for insert
with check (auth.uid() is not null);

create policy "members can update farms"
on public.farms for update
using (public.has_farm_access(id))
with check (public.has_farm_access(id));

create policy "users can read their farm memberships"
on public.farm_memberships for select
using (user_id = auth.uid());

create policy "members can read crop cycles"
on public.crop_cycles for select
using (public.has_farm_access(farm_id));

create policy "members can create crop cycles"
on public.crop_cycles for insert
with check (public.has_farm_access(farm_id));

create policy "members can update crop cycles"
on public.crop_cycles for update
using (public.has_farm_access(farm_id))
with check (public.has_farm_access(farm_id));

create policy "authenticated users can read task templates"
on public.task_templates for select
using (auth.uid() is not null);

create policy "members can read farm tasks"
on public.farm_tasks for select
using (public.has_farm_access(farm_id));

create policy "members can create farm tasks"
on public.farm_tasks for insert
with check (public.has_farm_access(farm_id));

create policy "members can update farm tasks"
on public.farm_tasks for update
using (public.has_farm_access(farm_id))
with check (public.has_farm_access(farm_id));

create or replace function public.generate_planned_farm_tasks(p_crop_cycle_id uuid)
returns table (generated_count integer, task_ids uuid[])
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_cycle public.crop_cycles%rowtype;
begin
  select *
  into selected_cycle
  from public.crop_cycles
  where id = p_crop_cycle_id
    and status = 'active';

  if not found then
    raise exception 'Active crop cycle not found';
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

revoke all on function public.generate_planned_farm_tasks(uuid) from public;
grant execute on function public.generate_planned_farm_tasks(uuid) to authenticated;

insert into public.task_templates (
  crop_code,
  cultivar,
  growth_stage,
  task_type,
  title,
  reason,
  timing,
  priority,
  evidence,
  verification_status,
  version
)
values
  (
    'strawberry',
    'seolhyang',
    'establishment',
    'observation',
    '초기 생육 상태 기록 (개발 Fixture)',
    '개발용 Draft Fixture로 초기 작기 상태를 기록하는 흐름을 검증합니다. 실제 농업 처방이 아닙니다.',
    '{"offsetDays": 0}'::jsonb,
    'medium',
    '[]'::jsonb,
    'draft',
    1
  ),
  (
    'strawberry',
    'seolhyang',
    'establishment',
    'observation',
    '초기 작업 환경 확인 (개발 Fixture)',
    '개발용 Draft Fixture로 다음 확인 작업의 계획·Today 조회를 검증합니다. 실제 농업 처방이 아닙니다.',
    '{"offsetDays": 1}'::jsonb,
    'medium',
    '[]'::jsonb,
    'draft',
    1
  ),
  (
    'test_crop',
    'test_variety',
    'test_stage',
    'observation',
    'Crop Independence 테스트 Fixture',
    'Core가 특정 작물 코드에 의존하지 않는지 검증하기 위한 Draft 데이터입니다.',
    '{"offsetDays": 0}'::jsonb,
    'low',
    '[]'::jsonb,
    'draft',
    1
  );

commit;
