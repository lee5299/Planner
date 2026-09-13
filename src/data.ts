import {createClient} from '@supabase/supabase-js';
import {stateSchema,type History,type Snapshot,type State} from '../shared/model';
import {prepareSave} from '../shared/prepareSave';

const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isSupabaseConfigured=Boolean(url&&key);
const supabase=isSupabaseConfigured?createClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false}}):null;

function client(){if(!supabase)throw Error('Supabase 환경변수가 필요합니다. .env 설정을 확인해 주세요.');return supabase;}
function dbError(error:{message:string;code?:string}|null):never{
 if(error?.message.includes('revision_conflict'))throw Error('다른 화면에서 변경되었습니다. 새로 불러와 주세요.');
 if(error?.code==='42P01'||error?.code==='PGRST205')throw Error('Supabase 테이블이 없습니다. 준비된 SQL을 먼저 실행해 주세요.');
 throw Error('Supabase에 연결하지 못했습니다. 프로젝트 URL, 공개 키, RLS 설정을 확인해 주세요.');
}

export async function loadSnapshot():Promise<Snapshot>{
 const {data,error}=await client().from('planner_workspaces').select('data,revision').eq('id','default').single();
 if(error||!data)dbError(error);return {state:stateSchema.parse(data.data),revision:Number(data.revision)};
}
export async function saveSnapshot(snapshot:Snapshot,next:State,label:string,requestId:string):Promise<Snapshot>{
 const state=prepareSave(snapshot.state,next);const {data,error}=await client().rpc('save_planner',{p_revision:snapshot.revision,p_request_id:requestId,p_label:label,p_data:state});
 if(error||!data)dbError(error);const result=data as {data:unknown;revision:number};return {state:stateSchema.parse(result.data),revision:Number(result.revision)};
}
export async function loadHistory():Promise<History[]>{
 const {data,error}=await client().from('planner_revisions').select('revision,created_at,label,data').eq('workspace_id','default').order('revision',{ascending:false}).limit(500);
 if(error)dbError(error);return (data??[]).map(row=>({...row,revision:Number(row.revision),data:stateSchema.parse(row.data)}));
}
export async function exportAll(snapshot:Snapshot){const history=await loadHistory();return {schema:'pds-schema-v2',exportedAt:new Date().toISOString(),...snapshot,history:[...history].reverse()};}
