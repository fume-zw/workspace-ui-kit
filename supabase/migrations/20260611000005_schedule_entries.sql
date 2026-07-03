-- schedule_entries: イベント予定・勤務予定

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('event', 'shift')),
  title text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  shift_label_id uuid references public.shift_labels (id) on delete set null,
  time_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entries_time_order check (ends_at >= starts_at)
);

create index if not exists schedule_entries_user_id_starts_at_idx
  on public.schedule_entries (user_id, starts_at);

create index if not exists schedule_entries_shift_label_id_idx
  on public.schedule_entries (shift_label_id)
  where shift_label_id is not null;

create or replace function public.set_schedule_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_schedule_entries_updated_at on public.schedule_entries;
create trigger trg_schedule_entries_updated_at
  before update on public.schedule_entries
  for each row execute procedure public.set_schedule_entries_updated_at();

alter table public.schedule_entries enable row level security;

create policy "schedule_entries_select_own"
  on public.schedule_entries for select
  using (auth.uid() = user_id);

create policy "schedule_entries_insert_own"
  on public.schedule_entries for insert
  with check (
    auth.uid() = user_id
    and (
      shift_label_id is null
      or exists (
        select 1
        from public.shift_labels sl
        where sl.id = shift_label_id
          and sl.user_id = auth.uid()
      )
    )
  );

create policy "schedule_entries_update_own"
  on public.schedule_entries for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      shift_label_id is null
      or exists (
        select 1
        from public.shift_labels sl
        where sl.id = shift_label_id
          and sl.user_id = auth.uid()
      )
    )
  );

create policy "schedule_entries_delete_own"
  on public.schedule_entries for delete
  using (auth.uid() = user_id);
