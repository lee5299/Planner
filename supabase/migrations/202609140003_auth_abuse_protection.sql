-- GENERATED from shared/securityConfig.ts by pnpm security:sync. Do not edit by hand.
-- Supabase SQL Editor에는 아직 실행하지 않는다. 먼저 docs/T07_AUTH.md의 적용 순서를 확인한다.

begin;

create table if not exists public.planner_password_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 failed_attempts integer not null default 0 check (failed_attempts >= 0),
 window_started_at timestamptz not null default now(),
 locked_until timestamptz null,
 updated_at timestamptz not null default now()
);

revoke all on table public.planner_password_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.planner_password_attempts to supabase_auth_admin;

create or replace function public.hook_planner_password_verification(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
 max_failures constant integer := 5;
 failure_window constant interval := interval '5 minutes';
 lock_duration constant interval := interval '5 minutes';
 target_user uuid := nullif(event ->> 'user_id', '')::uuid;
 password_valid boolean := coalesce((event ->> 'valid')::boolean, false);
 attempt public.planner_password_attempts%rowtype;
 current_time timestamptz := now();
begin
 if target_user is null then
  return jsonb_build_object('decision', 'continue');
 end if;

 -- user_id가 유일한 제한 키다. X-Forwarded-For를 포함한 요청 헤더는 읽거나 신뢰하지 않는다.
 insert into public.planner_password_attempts(user_id, failed_attempts, window_started_at, updated_at)
 values(target_user, 0, current_time, current_time)
 on conflict (user_id) do nothing;

 select * into attempt
 from public.planner_password_attempts
 where user_id = target_user
 for update;

 if attempt.locked_until is not null and attempt.locked_until > current_time then
  return jsonb_build_object('error', jsonb_build_object(
   'http_code', 429,
   'message', '이메일 또는 비밀번호를 확인하거나 잠시 후 다시 시도해 주세요.'
  ));
 end if;

 if password_valid then
  delete from public.planner_password_attempts where user_id = target_user;
  return jsonb_build_object('decision', 'continue');
 end if;

 if attempt.window_started_at + failure_window <= current_time then
  attempt.failed_attempts := 1;
  attempt.window_started_at := current_time;
 else
  attempt.failed_attempts := attempt.failed_attempts + 1;
 end if;

 if attempt.failed_attempts >= max_failures then
  attempt.locked_until := current_time + lock_duration;
 end if;

 update public.planner_password_attempts
 set failed_attempts = attempt.failed_attempts,
     window_started_at = attempt.window_started_at,
     locked_until = attempt.locked_until,
     updated_at = current_time
 where user_id = target_user;

 if attempt.locked_until is not null then
  return jsonb_build_object('error', jsonb_build_object(
   'http_code', 429,
   'message', '이메일 또는 비밀번호를 확인하거나 잠시 후 다시 시도해 주세요.'
  ));
 end if;

 return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_planner_password_verification(jsonb) from public, anon, authenticated;
grant execute on function public.hook_planner_password_verification(jsonb) to supabase_auth_admin;

commit;
