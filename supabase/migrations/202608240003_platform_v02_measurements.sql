begin;

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  farm_area_id uuid,
  crop_cycle_id uuid,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  observed_at timestamptz not null,
  metric_code text not null check (char_length(trim(metric_code)) between 1 and 100),
  value_numeric numeric not null,
  unit text not null check (char_length(trim(unit)) between 1 and 50),
  note text check (note is null or char_length(trim(note)) <= 1000),
  created_at timestamptz not null default now(),
  constraint measurements_farm_area_context_fkey
    foreign key (farm_area_id, farm_id)
    references public.farm_areas (id, farm_id)
    on delete restrict,
  constraint measurements_crop_cycle_context_fkey
    foreign key (crop_cycle_id, farm_id)
    references public.crop_cycles (id, farm_id)
    on delete restrict
);

create index measurements_farm_observed_at_idx
  on public.measurements (farm_id, observed_at desc);

alter table public.measurements enable row level security;

grant select, insert on public.measurements to authenticated;

create policy "farm members can read measurements"
on public.measurements for select
using (public.has_farm_access(farm_id));

create policy "farm members can create their measurements"
on public.measurements for insert
with check (
  public.has_farm_access(farm_id)
  and recorded_by = auth.uid()
);

commit;
