begin;

alter table public.farms
  add column weather_location_label text,
  add column weather_grid_x integer,
  add column weather_grid_y integer,
  add column weather_location_updated_at timestamptz,
  add constraint farms_weather_location_context_check check (
    (weather_location_label is null and weather_grid_x is null and weather_grid_y is null and weather_location_updated_at is null)
    or (
      char_length(trim(weather_location_label)) between 1 and 100
      and weather_grid_x between 1 and 149
      and weather_grid_y between 1 and 253
      and weather_location_updated_at is not null
    )
  );

create table public.external_data_snapshots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  module text not null check (module in ('weather')),
  context_key text not null check (char_length(trim(context_key)) between 1 and 200),
  payload jsonb not null,
  provider text not null check (char_length(trim(provider)) between 1 and 100),
  source_name text not null check (char_length(trim(source_name)) between 1 and 200),
  source_reference text not null check (char_length(trim(source_reference)) between 1 and 1000),
  observed_at timestamptz,
  published_at timestamptz,
  retrieved_at timestamptz not null,
  expires_at timestamptz not null,
  verification_status text not null check (verification_status in ('official_source', 'cached_official_source')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, module, context_key)
);

create index external_data_snapshots_farm_module_idx
  on public.external_data_snapshots (farm_id, module, expires_at desc);

create trigger external_data_snapshots_set_updated_at
before update on public.external_data_snapshots
for each row execute function public.set_updated_at();

alter table public.external_data_snapshots enable row level security;

grant select, insert, update on public.external_data_snapshots to authenticated;

create policy "farm members can read external data snapshots"
on public.external_data_snapshots for select
using (public.has_farm_access(farm_id));

create policy "farm members can refresh external data snapshots"
on public.external_data_snapshots for insert
with check (public.has_farm_access(farm_id));

create policy "farm members can update external data snapshots"
on public.external_data_snapshots for update
using (public.has_farm_access(farm_id))
with check (public.has_farm_access(farm_id));

commit;
