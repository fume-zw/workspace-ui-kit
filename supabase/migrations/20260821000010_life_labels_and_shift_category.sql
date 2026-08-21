-- 生活ラベル（睡眠・お風呂・食事）と、勤務ラベルの種別（勤務 / 定期）。
-- schedule_entries.kind に life を足す。

create table if not exists public.life_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  color_token text not null default 'primary',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists life_labels_user_id_sort_order_idx
  on public.life_labels (user_id, sort_order);

create or replace function public.set_life_labels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_life_labels_updated_at on public.life_labels;
create trigger trg_life_labels_updated_at
  before update on public.life_labels
  for each row execute procedure public.set_life_labels_updated_at();

alter table public.life_labels enable row level security;

create policy "life_labels_select_own"
  on public.life_labels for select
  using (auth.uid() = user_id);

create policy "life_labels_insert_own"
  on public.life_labels for insert
  with check (auth.uid() = user_id);

create policy "life_labels_update_own"
  on public.life_labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "life_labels_delete_own"
  on public.life_labels for delete
  using (auth.uid() = user_id);

alter table public.schedule_entries
  add column if not exists life_label_id uuid
    references public.life_labels (id) on delete set null;

create index if not exists schedule_entries_life_label_id_idx
  on public.schedule_entries (life_label_id)
  where life_label_id is not null;

alter table public.schedule_entries
  drop constraint if exists schedule_entries_kind_check;

alter table public.schedule_entries
  add constraint schedule_entries_kind_check
  check (kind in ('event', 'shift', 'life'));

alter table public.shift_labels
  add column if not exists category text not null default 'work';

alter table public.shift_labels
  drop constraint if exists shift_labels_category_check;

alter table public.shift_labels
  add constraint shift_labels_category_check
  check (category in ('work', 'activity'));

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
  );

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
    (p_user_id, '睡眠', 'schedule-indigo', 1),
    (p_user_id, 'お風呂', 'schedule-teal', 2),
    (p_user_id, '食事', 'schedule-orange', 3);
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
  end loop;
end;
$$;

-- 既存の「睡眠」イベントを生活へ移す。
update public.schedule_entries se
set
  kind = 'life',
  life_label_id = ll.id,
  event_label_id = null
from public.life_labels ll
where se.user_id = ll.user_id
  and ll.name = '睡眠'
  and se.kind = 'event'
  and se.title = '睡眠';
