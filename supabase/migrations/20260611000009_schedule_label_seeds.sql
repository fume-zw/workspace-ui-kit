-- 勤務ラベル・イベントラベルの初期 seed（新規ユーザー + 既存ユーザーへのバックフィル）
-- 本人稼働ツール向けの医療系プリセット。ラベルが 1 件でもあればスキップ（手動登録を尊重）。

create or replace function public.seed_default_shift_labels(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.shift_labels where user_id = p_user_id limit 1
  ) then
    return;
  end if;

  insert into public.shift_labels (
    user_id,
    name,
    display_type,
    default_start_time,
    default_end_time,
    ends_next_day,
    color_token,
    sort_order
  )
  values
    (p_user_id, '採血当番', 'time_block', '07:00', '12:00', false, 'primary', 1),
    (p_user_id, '当直', 'time_block', '17:00', '09:00', true, 'chart-1', 2),
    (p_user_id, '休み', 'all_day_marker', null, null, false, 'muted-foreground', 3);
end;
$$;

create or replace function public.seed_default_event_labels(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.event_labels where user_id = p_user_id limit 1
  ) then
    return;
  end if;

  insert into public.event_labels (user_id, name, color_token, sort_order)
  values
    (p_user_id, '会議', 'calendar-saturday', 1),
    (p_user_id, '私用', 'chart-2', 2),
    (p_user_id, '通院', 'chart-3', 3);
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_schedule_labels on auth.users;
create trigger on_auth_user_created_schedule_labels
  after insert on auth.users
  for each row execute procedure public.handle_new_user_schedule_labels();

-- 既存ユーザーにも seed（ラベル 0 件のユーザーのみ関数内で投入）
do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform public.seed_default_shift_labels(r.id);
    perform public.seed_default_event_labels(r.id);
  end loop;
end;
$$;
