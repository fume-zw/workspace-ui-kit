-- 定期スケジュールを勤務から分離する。
-- activity_labels は shift_labels と同型。schedule_entries.kind に activity を足す。

create table if not exists public.activity_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  display_type text not null default 'time_block'
    check (display_type in ('time_block', 'all_day_marker')),
  default_start_time time,
  default_end_time time,
  ends_next_day boolean not null default false,
  color_token text not null default 'primary',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_labels_user_id_sort_order_idx
  on public.activity_labels (user_id, sort_order);

create or replace function public.set_activity_labels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_activity_labels_updated_at on public.activity_labels;
create trigger trg_activity_labels_updated_at
  before update on public.activity_labels
  for each row execute procedure public.set_activity_labels_updated_at();

alter table public.activity_labels enable row level security;

create policy "activity_labels_select_own"
  on public.activity_labels for select
  using (auth.uid() = user_id);

create policy "activity_labels_insert_own"
  on public.activity_labels for insert
  with check (auth.uid() = user_id);

create policy "activity_labels_update_own"
  on public.activity_labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "activity_labels_delete_own"
  on public.activity_labels for delete
  using (auth.uid() = user_id);

alter table public.schedule_entries
  add column if not exists activity_label_id uuid
    references public.activity_labels (id) on delete set null;

create index if not exists schedule_entries_activity_label_id_idx
  on public.schedule_entries (activity_label_id)
  where activity_label_id is not null;

-- 既存の「定期」勤務ラベルを activity_labels へ移す（id を維持してエントリを付け替える）。
insert into public.activity_labels (
  id,
  user_id,
  name,
  display_type,
  default_start_time,
  default_end_time,
  ends_next_day,
  color_token,
  sort_order,
  archived_at,
  created_at,
  updated_at
)
select
  id,
  user_id,
  name,
  display_type,
  default_start_time,
  default_end_time,
  ends_next_day,
  color_token,
  sort_order,
  archived_at,
  created_at,
  updated_at
from public.shift_labels
where category = 'activity'
on conflict (id) do nothing;

alter table public.schedule_entries
  drop constraint if exists schedule_entries_kind_check;

alter table public.schedule_entries
  add constraint schedule_entries_kind_check
  check (kind in ('event', 'shift', 'life', 'activity'));

update public.schedule_entries se
set
  kind = 'activity',
  activity_label_id = se.shift_label_id,
  shift_label_id = null
where se.shift_label_id in (select id from public.activity_labels);

delete from public.shift_labels
where category = 'activity';

drop policy if exists "schedule_entries_insert_own" on public.schedule_entries;
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
    and (
      event_label_id is null
      or exists (
        select 1
        from public.event_labels el
        where el.id = event_label_id
          and el.user_id = auth.uid()
      )
    )
    and (
      life_label_id is null
      or exists (
        select 1
        from public.life_labels ll
        where ll.id = life_label_id
          and ll.user_id = auth.uid()
      )
    )
    and (
      activity_label_id is null
      or exists (
        select 1
        from public.activity_labels al
        where al.id = activity_label_id
          and al.user_id = auth.uid()
      )
    )
  );

drop policy if exists "schedule_entries_update_own" on public.schedule_entries;
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
    and (
      event_label_id is null
      or exists (
        select 1
        from public.event_labels el
        where el.id = event_label_id
          and el.user_id = auth.uid()
      )
    )
    and (
      life_label_id is null
      or exists (
        select 1
        from public.life_labels ll
        where ll.id = life_label_id
          and ll.user_id = auth.uid()
      )
    )
    and (
      activity_label_id is null
      or exists (
        select 1
        from public.activity_labels al
        where al.id = activity_label_id
          and al.user_id = auth.uid()
      )
    )
  );
