-- tasks: status_id + project_id へ移行、旧列を削除
-- 前提: public.tasks は 20260409120000_tasks.sql で作成済み（status text, genre, sub_status あり）
-- 前提: task_statuses は 20260611000000 で seed 済み

-- project_id（未割当 = null）
alter table public.tasks
  add column if not exists project_id uuid references public.projects (id) on delete set null;

-- status_id（text status から移行）
alter table public.tasks
  add column if not exists status_id uuid references public.task_statuses (id) on delete restrict;

update public.tasks t
set status_id = ts.id
from public.task_statuses ts
where ts.user_id = t.user_id
  and t.status_id is null
  and (
    (t.status = '未着手' and ts.code = 'not_started')
    or (t.status = '対応中' and ts.code = 'in_progress')
    or (t.status = '完了' and ts.code = 'done')
  );

-- 旧 status に無い値・空行は未着手へ
update public.tasks t
set status_id = ts.id
from public.task_statuses ts
where t.status_id is null
  and ts.user_id = t.user_id
  and ts.code = 'not_started';

alter table public.tasks
  alter column status_id set not null;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop column if exists status;
alter table public.tasks drop column if exists genre;
alter table public.tasks drop column if exists sub_status;

create index if not exists tasks_user_id_project_id_idx
  on public.tasks (user_id, project_id);

create index if not exists tasks_user_id_status_id_idx
  on public.tasks (user_id, status_id);

-- RLS: project_id / status_id のクロステーブル整合
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
  );
