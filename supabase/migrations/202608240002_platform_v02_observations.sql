begin;

alter table public.farm_areas
  add constraint farm_areas_id_farm_id_key unique (id, farm_id);

alter table public.crop_cycles
  add constraint crop_cycles_id_farm_id_key unique (id, farm_id);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  farm_area_id uuid,
  crop_cycle_id uuid,
  observed_by uuid not null references auth.users(id) on delete restrict,
  observed_at timestamptz not null,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint observations_farm_area_context_fkey
    foreign key (farm_area_id, farm_id)
    references public.farm_areas (id, farm_id)
    on delete restrict,
  constraint observations_crop_cycle_context_fkey
    foreign key (crop_cycle_id, farm_id)
    references public.crop_cycles (id, farm_id)
    on delete restrict
);

create index observations_farm_observed_at_idx
  on public.observations (farm_id, observed_at desc);

create index observations_farm_area_observed_at_idx
  on public.observations (farm_area_id, observed_at desc)
  where farm_area_id is not null;

alter table public.observations enable row level security;

grant select, insert on public.observations to authenticated;

create policy "farm members can read observations"
on public.observations for select
using (public.has_farm_access(farm_id));

create policy "farm members can create their observations"
on public.observations for insert
with check (
  public.has_farm_access(farm_id)
  and observed_by = auth.uid()
);

commit;
