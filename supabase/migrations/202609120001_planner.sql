-- 플랜두씨 과제 6: 로그인 없는 공개 다이어리
-- Supabase SQL Editor에서 전체를 한 번 실행하세요.
-- 링크와 공개 키를 가진 사람은 같은 default 기록을 읽고 수정할 수 있습니다.

create table if not exists public.planner_workspaces (
 id text primary key,
 owner_id uuid null references auth.users(id),
 revision bigint not null default 0 check (revision >= 0),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 updated_at timestamptz not null default now()
);

create table if not exists public.planner_revisions (
 workspace_id text not null references public.planner_workspaces(id),
 revision bigint not null check (revision > 0),
 request_id uuid not null,
 label text not null check (char_length(label) between 1 and 150),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 created_at timestamptz not null default now(),
 primary key (workspace_id,revision),
 unique (workspace_id,request_id)
);

insert into public.planner_workspaces(id,data)
values ('default','{"timezone":"Asia/Seoul","care":[],"logs":[],"projects":[],"stages":[],"tasks":[],"executions":[],"rules":[],"plans":[],"reviews":[]}')
on conflict (id) do nothing;

alter table public.planner_workspaces enable row level security;
alter table public.planner_revisions enable row level security;

revoke all on table public.planner_workspaces,public.planner_revisions from anon,authenticated;
grant select,update on table public.planner_workspaces to anon,authenticated;
grant select,insert on table public.planner_revisions to anon,authenticated;

drop policy if exists "public read default workspace" on public.planner_workspaces;
create policy "public read default workspace" on public.planner_workspaces
 for select to anon,authenticated using (id = 'default');

drop policy if exists "public update default workspace" on public.planner_workspaces;
create policy "public update default workspace" on public.planner_workspaces
 for update to anon,authenticated using (id = 'default') with check (id = 'default' and owner_id is null);

drop policy if exists "public read default revisions" on public.planner_revisions;
create policy "public read default revisions" on public.planner_revisions
 for select to anon,authenticated using (workspace_id = 'default');

drop policy if exists "public insert default revisions" on public.planner_revisions;
create policy "public insert default revisions" on public.planner_revisions
 for insert to anon,authenticated with check (workspace_id = 'default');

create or replace function public.save_planner(
 p_revision bigint,
 p_request_id uuid,
 p_label text,
 p_data jsonb
) returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
 current_row public.planner_workspaces;
 prior public.planner_revisions; 
begin
 if p_request_id is null or char_length(p_label) not between 1 and 150 or jsonb_typeof(p_data) <> 'object' then
  raise exception 'invalid_data';
 end if;

 select * into current_row from public.planner_workspaces where id='default' for update;
 if not found then raise exception 'workspace_missing'; end if;

 select * into prior from public.planner_revisions where workspace_id='default' and request_id=p_request_id;
 if found then return jsonb_build_object('revision',prior.revision,'data',prior.data); end if;

 if current_row.revision <> p_revision then raise exception 'revision_conflict'; end if;

 update public.planner_workspaces
 set data=p_data,revision=p_revision+1,updated_at=now()
 where id='default';

 insert into public.planner_revisions(workspace_id,revision,request_id,label,data)
 values('default',p_revision+1,p_request_id,p_label,p_data);
 return jsonb_build_object('revision',p_revision+1,'data',p_data);
end;
$$;

revoke all on function public.save_planner(bigint,uuid,text,jsonb) from public;
grant execute on function public.save_planner(bigint,uuid,text,jsonb) to anon,authenticated;
