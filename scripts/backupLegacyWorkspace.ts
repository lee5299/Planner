import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({quiet:true});
const url=process.env.VITE_SUPABASE_URL?.trim();
const key=process.env.VITE_SUPABASE_ANON_KEY?.trim();
if(!url||!key)throw Error('Supabase 공개 환경변수가 필요합니다.');

const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:workspace,error:workspaceError}=await supabase.from('planner_workspaces').select('*').eq('id','default').single();
if(workspaceError||!workspace)throw Error(`기존 작업공간 백업 실패 (${workspaceError?.code??'no_data'})`);

const revisions:unknown[]=[];
const pageSize=500;
for(let from=0;;from+=pageSize){
 const {data,error}=await supabase.from('planner_revisions').select('*').eq('workspace_id','default').order('revision',{ascending:true}).range(from,from+pageSize-1);
 if(error)throw Error(`변경 이력 백업 실패 (${error.code??'unknown'})`);
 revisions.push(...(data??[]));
 if((data?.length??0)<pageSize)break;
}

const exportedAt=new Date().toISOString();
const safeTimestamp=exportedAt.replaceAll(':','-');
const directory=resolve('backups');
const output=resolve(directory,`planner-before-auth.${safeTimestamp}.private.json`);
mkdirSync(directory,{recursive:true});
const contents=JSON.stringify({schema:'planner-before-auth-v1',exportedAt,workspace,revisions},null,2);
writeFileSync(output,contents,'utf8');
console.log(JSON.stringify({output,workspaceRevision:workspace.revision,revisionCount:revisions.length,bytes:Buffer.byteLength(contents)}));
