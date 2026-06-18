-- subtasks: Pane 3 下部のチェックリスト行

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subtasks_task_id_sort_order_idx
  on public.subtasks (task_id, sort_order);

create or replace function public.set_subtasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subtasks_updated_at on public.subtasks;
create trigger trg_subtasks_updated_at
  before update on public.subtasks
  for each row execute procedure public.set_subtasks_updated_at();

alter table public.subtasks enable row level security;

create policy "subtasks_select_own"
  on public.subtasks for select
  using (auth.uid() = user_id);

create policy "subtasks_insert_own"
  on public.subtasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.user_id = auth.uid()
    )
  );

create policy "subtasks_update_own"
  on public.subtasks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.user_id = auth.uid()
    )
  );

create policy "subtasks_delete_own"
  on public.subtasks for delete
  using (auth.uid() = user_id);
