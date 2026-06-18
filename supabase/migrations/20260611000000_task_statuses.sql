-- task_statuses: タスク進捗の選択肢マスタ（ユーザーごと）
-- v1 初期 seed: 未着手 / 進行中 / 至急対応 / 保留中 / 完了（5 件）
-- 正本: workspace-ui-kit/supabase/migrations/

create table if not exists public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_statuses_user_id_code_key unique (user_id, code)
);

create index if not exists task_statuses_user_id_sort_order_idx
  on public.task_statuses (user_id, sort_order);

create or replace function public.set_task_statuses_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_task_statuses_updated_at on public.task_statuses;
create trigger trg_task_statuses_updated_at
  before update on public.task_statuses
  for each row execute procedure public.set_task_statuses_updated_at();

-- 新規ユーザーに 5 ステータスを seed
create or replace function public.seed_default_task_statuses(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_statuses (user_id, code, label, sort_order)
  values
    (p_user_id, 'not_started', '未着手', 1),
    (p_user_id, 'in_progress', '進行中', 2),
    (p_user_id, 'urgent', '至急対応', 3),
    (p_user_id, 'on_hold', '保留中', 4),
    (p_user_id, 'done', '完了', 5)
  on conflict (user_id, code) do nothing;
end;
$$;

-- サインアップ時に自動 seed
create or replace function public.handle_new_user_task_statuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_task_statuses(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_task_statuses on auth.users;
create trigger on_auth_user_created_task_statuses
  after insert on auth.users
  for each row execute procedure public.handle_new_user_task_statuses();

-- 既存ユーザーにも seed（初回 migration 適用時）
do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform public.seed_default_task_statuses(r.id);
  end loop;
end;
$$;

alter table public.task_statuses enable row level security;

create policy "task_statuses_select_own"
  on public.task_statuses for select
  using (auth.uid() = user_id);

create policy "task_statuses_insert_own"
  on public.task_statuses for insert
  with check (auth.uid() = user_id);

create policy "task_statuses_update_own"
  on public.task_statuses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_statuses_delete_own"
  on public.task_statuses for delete
  using (auth.uid() = user_id);
