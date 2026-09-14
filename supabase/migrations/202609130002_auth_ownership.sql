-- 플랜두씨 과제 7: Supabase Auth 기반 사용자별 작업공간
--
-- 주의: 이 파일을 실행하면 과제 6의 익명 공개 접근이 즉시 차단됩니다.
-- docs/T07_AUTH.md의 백업 및 전환 순서를 먼저 확인하고, 인증 UI가 준비된 뒤 실행하세요.

begin;

-- 계정 삭제 시 작업공간과 변경 이력이 함께 정리될 수 있도록 외래 키를 연결한다.
alter table public.planner_workspaces
 drop constraint if exists planner_workspaces_owner_id_fkey;
alter table public.planner_workspaces
 add constraint planner_workspaces_owner_id_fkey
 foreign key (owner_id) references auth.users(id) on delete cascade;

alter table public.planner_revisions
 drop constraint if exists planner_revisions_workspace_id_fkey;
alter table public.planner_revisions
 add constraint planner_revisions_workspace_id_fkey
 foreign key (workspace_id) references public.planner_workspaces(id) on delete cascade;

create unique index if not exists planner_workspaces_one_per_owner
 on public.planner_workspaces(owner_id)
 where owner_id is not null;

-- auth.uid()만 확인하면 로그아웃 직후에도 만료 전 JWT가 잠시 통할 수 있다.
-- 현재 JWT의 session_id가 auth.sessions에 실제로 남아 있을 때만 소유자로 인정한다.
create or replace function public.current_planner_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
 select (select auth.uid())
 where (select auth.uid()) is not null
   and exists (
    select 1
    from auth.sessions as session
    where session.id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and session.user_id = (select auth.uid())
      and (session.not_after is null or session.not_after > now())
   );
$$;

revoke all on function public.current_planner_user_id() from public, anon;
grant execute on function public.current_planner_user_id() to authenticated;

-- 과제 6의 공개 정책을 제거한다.
drop policy if exists "public read default workspace" on public.planner_workspaces;
drop policy if exists "public update default workspace" on public.planner_workspaces;
drop policy if exists "public read default revisions" on public.planner_revisions;
drop policy if exists "public insert default revisions" on public.planner_revisions;
drop policy if exists "owner workspace access" on public.planner_workspaces;
drop policy if exists "owner revision access" on public.planner_revisions;

alter table public.planner_workspaces enable row level security;
alter table public.planner_revisions enable row level security;

create policy "owner workspace access" on public.planner_workspaces
 for all to authenticated
 using (owner_id = (select public.current_planner_user_id()))
 with check (owner_id = (select public.current_planner_user_id()));

create policy "owner revision access" on public.planner_revisions
 for all to authenticated
 using (exists (
  select 1 from public.planner_workspaces as workspace
  where workspace.id = planner_revisions.workspace_id
    and workspace.owner_id = (select public.current_planner_user_id())
 ))
 with check (exists (
  select 1 from public.planner_workspaces as workspace
  where workspace.id = planner_revisions.workspace_id
    and workspace.owner_id = (select public.current_planner_user_id())
 ));

-- 브라우저에서 테이블을 직접 건드리는 경로는 닫고, 아래 RPC만 공개한다.
-- 이 때문에 다른 계정의 ID를 넣은 직접 읽기·수정·삭제 요청은 권한 오류가 된다.
revoke all on table public.planner_workspaces, public.planner_revisions from anon, authenticated;

create or replace function public.load_planner()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 caller_id uuid := public.current_planner_user_id();
 current_row public.planner_workspaces%rowtype;
begin
 if caller_id is null then
  raise exception 'authentication_required' using errcode = '42501';
 end if;

 select * into current_row
 from public.planner_workspaces
 where owner_id = caller_id;

 if not found then
  insert into public.planner_workspaces(id, owner_id, data)
  values (
   caller_id::text,
   caller_id,
   '{"timezone":"Asia/Seoul","care":[],"logs":[],"projects":[],"stages":[],"tasks":[],"executions":[],"rules":[],"plans":[],"reviews":[]}'::jsonb
  )
  on conflict do nothing;

  select * into current_row
  from public.planner_workspaces
  where owner_id = caller_id;
 end if;

 if not found then
  raise exception 'workspace_conflict' using errcode = '23505';
 end if;

 return jsonb_build_object('revision', current_row.revision, 'data', current_row.data);
end;
$$;

create or replace function public.load_planner_history(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 caller_id uuid := public.current_planner_user_id();
 result jsonb;
begin
 if caller_id is null then
  raise exception 'authentication_required' using errcode = '42501';
 end if;

 select coalesce(jsonb_agg(to_jsonb(history_row) order by history_row.revision desc), '[]'::jsonb)
 into result
 from (
  select revision.revision, revision.created_at, revision.label, revision.data
  from public.planner_revisions as revision
  join public.planner_workspaces as workspace on workspace.id = revision.workspace_id
  where workspace.owner_id = caller_id
  order by revision.revision desc
  limit least(greatest(coalesce(p_limit, 500), 1), 500)
 ) as history_row;

 return result;
end;
$$;

create or replace function public.save_planner(
 p_revision bigint,
 p_request_id uuid,
 p_label text,
 p_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 caller_id uuid := public.current_planner_user_id();
 current_row public.planner_workspaces%rowtype;
 prior public.planner_revisions%rowtype;
begin
 if caller_id is null then
  raise exception 'authentication_required' using errcode = '42501';
 end if;
 if p_revision is null or p_revision < 0
    or p_request_id is null
    or p_label is null or char_length(p_label) not between 1 and 150
    or p_data is null or jsonb_typeof(p_data) <> 'object' then
  raise exception 'invalid_data' using errcode = '22023';
 end if;

 select * into current_row
 from public.planner_workspaces
 where owner_id = caller_id
 for update;
 if not found then
  raise exception 'workspace_missing' using errcode = 'P0002';
 end if;

 select * into prior
 from public.planner_revisions
 where workspace_id = current_row.id and request_id = p_request_id;
 if found then
  return jsonb_build_object('revision', prior.revision, 'data', prior.data);
 end if;

 if current_row.revision <> p_revision then
  raise exception 'revision_conflict' using errcode = '40001';
 end if;

 update public.planner_workspaces
 set data = p_data, revision = p_revision + 1, updated_at = now()
 where id = current_row.id and owner_id = caller_id;

 insert into public.planner_revisions(workspace_id, revision, request_id, label, data)
 values(current_row.id, p_revision + 1, p_request_id, p_label, p_data);

 return jsonb_build_object('revision', p_revision + 1, 'data', p_data);
end;
$$;

revoke all on function public.load_planner() from public, anon;
revoke all on function public.load_planner_history(integer) from public, anon;
revoke all on function public.save_planner(bigint, uuid, text, jsonb) from public, anon;
grant execute on function public.load_planner() to authenticated;
grant execute on function public.load_planner_history(integer) to authenticated;
grant execute on function public.save_planner(bigint, uuid, text, jsonb) to authenticated;

commit;
