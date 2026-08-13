begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'farm-attachments',
  'farm-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  action_log_id uuid references public.action_logs(id) on delete cascade,
  issue_record_id uuid references public.issue_records(id) on delete cascade,
  storage_path text not null unique check (char_length(trim(storage_path)) > 0),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  constraint attachments_exactly_one_parent check (num_nonnulls(action_log_id, issue_record_id) = 1)
);

create index attachments_action_log_created_at_idx
on public.attachments (action_log_id, created_at desc)
where action_log_id is not null;

create index attachments_issue_record_created_at_idx
on public.attachments (issue_record_id, created_at desc)
where issue_record_id is not null;

alter table public.attachments enable row level security;

grant select, insert on public.attachments to authenticated;

create policy "members can read attachments"
on public.attachments for select
using (
  exists (
    select 1
    from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where action_log.id = attachments.action_log_id
      and public.has_farm_access(task.farm_id)
  )
  or exists (
    select 1
    from public.issue_records issue_record
    join public.farm_tasks task on task.id = issue_record.farm_task_id
    where issue_record.id = attachments.issue_record_id
      and public.has_farm_access(task.farm_id)
  )
);

create policy "members can create attachments"
on public.attachments for insert
with check (
  exists (
    select 1
    from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where action_log.id = attachments.action_log_id
      and public.has_farm_access(task.farm_id)
  )
  or exists (
    select 1
    from public.issue_records issue_record
    join public.farm_tasks task on task.id = issue_record.farm_task_id
    where issue_record.id = attachments.issue_record_id
      and public.has_farm_access(task.farm_id)
  )
);

create policy "farm members can read attachment objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'farm-attachments'
  and exists (
    select 1
    from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where task.farm_id::text = (storage.foldername(name))[1]
      and action_log.id::text = (storage.foldername(name))[2]
      and public.has_farm_access(task.farm_id)
  )
);

create policy "farm members can upload attachment objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'farm-attachments'
  and exists (
    select 1
    from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where task.farm_id::text = (storage.foldername(name))[1]
      and action_log.id::text = (storage.foldername(name))[2]
      and public.has_farm_access(task.farm_id)
  )
);

create policy "farm members can remove failed attachment objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'farm-attachments'
  and not exists (
    select 1
    from public.attachments attachment
    where attachment.storage_path = name
  )
  and exists (
    select 1
    from public.action_logs action_log
    join public.farm_tasks task on task.id = action_log.farm_task_id
    where task.farm_id::text = (storage.foldername(name))[1]
      and action_log.id::text = (storage.foldername(name))[2]
      and public.has_farm_access(task.farm_id)
  )
);

commit;
