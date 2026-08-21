-- 睡眠・出勤・帰宅を「記録」枠にする。生活からは睡眠を外す。
-- 記録はタイトルなし（ラベル名のみ）。出勤・帰宅は時刻バー。ICS には出さない。

create table if not exists public.record_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  code text not null
    check (code in ('sleep', 'clock_in', 'clock_out')),
  display_type text not null default 'span'
    check (display_type in ('span', 'marker')),
  color_token text not null default 'primary',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists record_labels_user_id_sort_order_idx
  on public.record_labels (user_id, sort_order);

create or replace function public.set_record_labels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_record_labels_updated_at on public.record_labels;
create trigger trg_record_labels_updated_at
  before update on public.record_labels
  for each row execute procedure public.set_record_labels_updated_at();

alter table public.record_labels enable row level security;

create policy "record_labels_select_own"
  on public.record_labels for select
  using (auth.uid() = user_id);

create policy "record_labels_insert_own"
  on public.record_labels for insert
  with check (auth.uid() = user_id);

create policy "record_labels_update_own"
  on public.record_labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "record_labels_delete_own"
  on public.record_labels for delete
  using (auth.uid() = user_id);

alter table public.schedule_entries
  add column if not exists record_label_id uuid
    references public.record_labels (id) on delete set null;

create index if not exists schedule_entries_record_label_id_idx
  on public.schedule_entries (record_label_id)
  where record_label_id is not null;

-- 既存の生活「睡眠」ラベルを記録へ移す（id を維持してエントリを付け替える）。
insert into public.record_labels (
  id,
  user_id,
  name,
  code,
  display_type,
  color_token,
  sort_order,
  archived_at,
  created_at,
  updated_at
)
select distinct on (user_id)
  id,
  user_id,
  name,
  'sleep',
  'span',
  color_token,
  sort_order,
  archived_at,
  created_at,
  updated_at
from public.life_labels
where name = '睡眠'
order by user_id, archived_at nulls first, created_at
on conflict (id) do nothing;

alter table public.schedule_entries
  drop constraint if exists schedule_entries_kind_check;

alter table public.schedule_entries
  add constraint schedule_entries_kind_check
  check (kind in ('event', 'shift', 'life', 'activity', 'record'));

update public.schedule_entries se
set
  kind = 'record',
  record_label_id = se.life_label_id,
  life_label_id = null
where se.life_label_id in (
  select id from public.record_labels where code = 'sleep'
);

update public.schedule_entries se
set
  kind = 'record',
  record_label_id = rl.id,
  life_label_id = null
from public.record_labels rl
where se.user_id = rl.user_id
  and rl.code = 'sleep'
  and se.kind = 'life'
  and se.title = '睡眠'
  and se.record_label_id is null;

delete from public.life_labels
where name = '睡眠';

create or replace function public.seed_default_life_labels(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.life_labels where user_id = p_user_id limit 1
  ) then
    return;
  end if;

  insert into public.life_labels (user_id, name, color_token, sort_order)
  values
    (p_user_id, 'お風呂', 'schedule-teal', 1),
    (p_user_id, '食事', 'schedule-orange', 2);
end;
$$;

create or replace function public.seed_default_record_labels(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.record_labels (user_id, name, code, display_type, color_token, sort_order)
  values
    (p_user_id, '睡眠', 'sleep', 'span', 'schedule-indigo', 1),
    (p_user_id, '出勤', 'clock_in', 'marker', 'chart-3', 2),
    (p_user_id, '帰宅', 'clock_out', 'marker', 'chart-1', 3)
  on conflict (user_id, code) do nothing;
end;
$$;

create or replace function public.handle_new_user_schedule_labels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_shift_labels(new.id);
  perform public.seed_default_event_labels(new.id);
  perform public.seed_default_life_labels(new.id);
  perform public.seed_default_record_labels(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_schedule_labels on auth.users;
create trigger on_auth_user_created_schedule_labels
  after insert on auth.users
  for each row execute procedure public.handle_new_user_schedule_labels();

do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform public.seed_default_life_labels(r.id);
    perform public.seed_default_record_labels(r.id);
  end loop;
end;
$$;

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
    and (
      record_label_id is null
      or exists (
        select 1
        from public.record_labels rl
        where rl.id = record_label_id
          and rl.user_id = auth.uid()
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
    and (
      record_label_id is null
      or exists (
        select 1
        from public.record_labels rl
        where rl.id = record_label_id
          and rl.user_id = auth.uid()
      )
    )
  );
