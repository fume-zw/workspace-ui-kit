-- recurring_task_templates: 定期タスクの繰り返しルール

create table if not exists public.recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  default_status_id uuid not null references public.task_statuses (id) on delete restrict,
  recurrence_preset text not null
    check (recurrence_preset in ('daily', 'weekly', 'monthly_date', 'monthly_nth_weekday')),
  weekdays smallint[] not null default '{}',
  month_day smallint,
  nth smallint,
  weekday smallint,
  end_type text not null default 'never'
    check (end_type in ('until_date', 'count', 'never')),
  end_date date,
  end_count integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_task_templates_user_id_idx
  on public.recurring_task_templates (user_id);

create or replace function public.set_recurring_task_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_recurring_task_templates_updated_at on public.recurring_task_templates;
create trigger trg_recurring_task_templates_updated_at
  before update on public.recurring_task_templates
  for each row execute procedure public.set_recurring_task_templates_updated_at();

alter table public.recurring_task_templates enable row level security;

create policy "recurring_task_templates_select_own"
  on public.recurring_task_templates for select
  using (auth.uid() = user_id);

create policy "recurring_task_templates_insert_own"
  on public.recurring_task_templates for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.task_statuses ts
      where ts.id = default_status_id
        and ts.user_id = auth.uid()
    )
  );

create policy "recurring_task_templates_update_own"
  on public.recurring_task_templates for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.task_statuses ts
      where ts.id = default_status_id
        and ts.user_id = auth.uid()
    )
  );

create policy "recurring_task_templates_delete_own"
  on public.recurring_task_templates for delete
  using (auth.uid() = user_id);
