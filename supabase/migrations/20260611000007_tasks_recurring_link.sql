-- tasks: 定期タスク生成インスタンスとの紐づけ

alter table public.tasks
  add column if not exists recurring_template_id uuid
    references public.recurring_task_templates (id) on delete set null;

alter table public.tasks
  add column if not exists recurrence_instance_date date;

create unique index if not exists tasks_recurring_instance_unique_idx
  on public.tasks (recurring_template_id, recurrence_instance_date)
  where recurring_template_id is not null
    and recurrence_instance_date is not null;

create index if not exists tasks_recurring_template_id_idx
  on public.tasks (recurring_template_id)
  where recurring_template_id is not null;

-- RLS: recurring_template_id は本人のテンプレートのみ
drop policy if exists "tasks_update_own" on public.tasks;

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.task_statuses ts
      where ts.id = status_id
        and ts.user_id = auth.uid()
    )
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
    and (
      recurring_template_id is null
      or exists (
        select 1
        from public.recurring_task_templates rt
        where rt.id = recurring_template_id
          and rt.user_id = auth.uid()
      )
    )
  );

drop policy if exists "tasks_insert_own" on public.tasks;

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.task_statuses ts
      where ts.id = status_id
        and ts.user_id = auth.uid()
    )
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
    and (
      recurring_template_id is null
      or exists (
        select 1
        from public.recurring_task_templates rt
        where rt.id = recurring_template_id
          and rt.user_id = auth.uid()
      )
    )
  );
