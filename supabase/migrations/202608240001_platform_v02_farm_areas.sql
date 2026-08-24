begin;

create table public.farm_areas (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(trim(description)) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, name)
);

create index farm_areas_farm_name_idx on public.farm_areas (farm_id, name);

create trigger farm_areas_set_updated_at
before update on public.farm_areas
for each row execute function public.set_updated_at();

alter table public.farm_areas enable row level security;

grant select, insert, update, delete on public.farm_areas to authenticated;

create policy "farm members can read farm areas"
on public.farm_areas for select
using (public.has_farm_access(farm_id));

create policy "farm managers can create farm areas"
on public.farm_areas for insert
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

create policy "farm managers can update farm areas"
on public.farm_areas for update
using (public.has_farm_role(farm_id, array['owner', 'admin']))
with check (public.has_farm_role(farm_id, array['owner', 'admin']));

create policy "farm managers can delete farm areas"
on public.farm_areas for delete
using (public.has_farm_role(farm_id, array['owner', 'admin']));

commit;
