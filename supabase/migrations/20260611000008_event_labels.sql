-- event_labels: イベント用ラベルマスター（会議・私用・通院 等。名前 + 色）
-- 勤務ラベル（shift_labels）と違い、時刻・表示タイプは持たない。

create table if not exists public.event_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  color_token text not null default 'primary',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_labels_user_id_sort_order_idx
  on public.event_labels (user_id, sort_order);

create or replace function public.set_event_labels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_event_labels_updated_at on public.event_labels;
create trigger trg_event_labels_updated_at
  before update on public.event_labels
  for each row execute procedure public.set_event_labels_updated_at();

alter table public.event_labels enable row level security;

create policy "event_labels_select_own"
  on public.event_labels for select
  using (auth.uid() = user_id);

create policy "event_labels_insert_own"
  on public.event_labels for insert
  with check (auth.uid() = user_id);

create policy "event_labels_update_own"
  on public.event_labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "event_labels_delete_own"
  on public.event_labels for delete
  using (auth.uid() = user_id);

-- schedule_entries に event_label_id を追加。
alter table public.schedule_entries
  add column if not exists event_label_id uuid
    references public.event_labels (id) on delete set null;

create index if not exists schedule_entries_event_label_id_idx
  on public.schedule_entries (event_label_id)
  where event_label_id is not null;

-- insert/update ポリシーを event_label_id の所有チェック込みに置き換える。
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
  );
