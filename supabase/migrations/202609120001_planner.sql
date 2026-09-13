-- Run once in Supabase SQL Editor. Server-only access; no public table policies.
create table if not exists public.planner_workspaces (
 id text primary key,
 owner_id uuid null references auth.users(id),
 revision bigint not null default 0,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.planner_revisions (
 workspace_id text not null references public.planner_workspaces(id),
 revision bigint not null,
 request_id uuid not null,
 label text not null,
 data jsonb not null,
 created_at timestamptz not null default now(),
 primary key(workspace_id,revision), unique(workspace_id,request_id)
);
alter table public.planner_workspaces enable row level security;
alter table public.planner_revisions enable row level security;
revoke all on public.planner_workspaces,public.planner_revisions from anon,authenticated;
grant all on public.planner_workspaces,public.planner_revisions to service_role;
insert into public.planner_workspaces(id,data) values ('default','{"timezone":"Asia/Seoul","care":[],"logs":[],"projects":[],"stages":[],"tasks":[],"executions":[],"rules":[],"plans":[],"reviews":[]}') on conflict do nothing;
create or replace function public.save_planner(p_revision bigint,p_request_id uuid,p_label text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_row public.planner_workspaces; prior public.planner_revisions;
begin
 select * into current_row from public.planner_workspaces where id='default' for update;
 select * into prior from public.planner_revisions where workspace_id='default' and request_id=p_request_id;
 if found then return jsonb_build_object('revision',prior.revision,'data',prior.data); end if;
 if current_row.revision<>p_revision then raise exception 'revision_conflict'; end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'invalid_data'; end if;
 update public.planner_workspaces set data=p_data,revision=p_revision+1,updated_at=now() where id='default';
 insert into public.planner_revisions(workspace_id,revision,request_id,label,data) values('default',p_revision+1,p_request_id,p_label,p_data);
 return jsonb_build_object('revision',p_revision+1,'data',p_data);
end $$;
revoke all on function public.save_planner(bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_planner(bigint,uuid,text,jsonb) to service_role;
