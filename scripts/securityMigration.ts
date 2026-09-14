import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {authSecurityConfig as config} from '../shared/securityConfig.ts';

const target=resolve('supabase/migrations/202609140003_auth_abuse_protection.sql');
const sqlText=(value:string)=>value.replaceAll("'","''");
const minutes=(seconds:number)=>{
 if(!Number.isInteger(seconds)||seconds<=0||seconds%60!==0)throw Error('보안 시간 설정은 양의 분 단위여야 합니다.');
 return seconds/60;
};

export function renderSecurityMigration(){
 if(!Number.isInteger(config.minimumPasswordLength)||config.minimumPasswordLength<8)throw Error('최소 비밀번호 길이는 8자 이상이어야 합니다.');
 if(!Number.isInteger(config.failedPasswordLimit)||config.failedPasswordLimit<1)throw Error('실패 횟수 제한은 양의 정수여야 합니다.');
 if(config.trustForwardedFor)throw Error('클라이언트 전달 IP 헤더는 로그인 제한 근거로 신뢰할 수 없습니다.');
 if(!config.captcha.required||config.captcha.provider!=='turnstile')throw Error('공개 인증 화면에는 Turnstile이 필수입니다.');
 if(!config.genericLoginError.trim())throw Error('공통 로그인 오류 문구가 필요합니다.');
 const windowMinutes=minutes(config.failedPasswordWindowSeconds);
 const lockMinutes=minutes(config.accountLockSeconds);
 return `-- GENERATED from shared/securityConfig.ts by pnpm security:sync. Do not edit by hand.
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
 max_failures constant integer := ${config.failedPasswordLimit};
 failure_window constant interval := interval '${windowMinutes} minutes';
 lock_duration constant interval := interval '${lockMinutes} minutes';
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
   'message', '${sqlText(config.genericLoginError)}'
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
   'message', '${sqlText(config.genericLoginError)}'
  ));
 end if;

 return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_planner_password_verification(jsonb) from public, anon, authenticated;
grant execute on function public.hook_planner_password_verification(jsonb) to supabase_auth_admin;

commit;
`;
}

const output=renderSecurityMigration();
if(process.argv.includes('--write')){
 writeFileSync(target,output,'utf8');
}else if(process.argv.includes('--check')){
 let current='';
 try{current=readFileSync(target,'utf8')}catch{}
 if(current!==output){
  console.error('보안 설정과 생성된 SQL이 다릅니다. pnpm security:sync를 실행하세요.');
  process.exitCode=1;
 }
}
