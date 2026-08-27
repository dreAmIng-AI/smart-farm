begin;

alter table public.external_data_snapshots
  drop constraint if exists external_data_snapshots_module_check;

alter table public.external_data_snapshots
  add constraint external_data_snapshots_module_check
  check (module in ('weather', 'disease_pest'));

commit;
