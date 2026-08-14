create or replace function public.enforce_crop_cycle_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'active' then
    if new.status <> old.status then
      raise exception 'Ended crop cycle cannot change status';
    end if;

    new.ended_at = old.ended_at;
  elsif new.status in ('completed', 'cancelled') then
    new.ended_at = now();
  else
    new.ended_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists crop_cycles_enforce_lifecycle on public.crop_cycles;

create trigger crop_cycles_enforce_lifecycle
before update on public.crop_cycles
for each row execute function public.enforce_crop_cycle_lifecycle();

revoke all on function public.enforce_crop_cycle_lifecycle() from public;
