-- shift_labels: 勤務ラベルマスター（採血当番・当直・休み 等）

create table if not exists public.shift_labels (
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

create index if not exists shift_labels_user_id_sort_order_idx
  on public.shift_labels (user_id, sort_order);

create or replace function public.set_shift_labels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_shift_labels_updated_at on public.shift_labels;
create trigger trg_shift_labels_updated_at
  before update on public.shift_labels
  for each row execute procedure public.set_shift_labels_updated_at();

alter table public.shift_labels enable row level security;

create policy "shift_labels_select_own"
  on public.shift_labels for select
  using (auth.uid() = user_id);

create policy "shift_labels_insert_own"
  on public.shift_labels for insert
  with check (auth.uid() = user_id);

create policy "shift_labels_update_own"
  on public.shift_labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shift_labels_delete_own"
  on public.shift_labels for delete
  using (auth.uid() = user_id);
