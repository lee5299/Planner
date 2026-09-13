import 'dotenv/config';
import express from 'express';
import {createClient} from '@supabase/supabase-js';
import {resolve} from 'node:path';
import {z} from 'zod';
import {prepareSave} from './domain.ts';
import {emptyState,type State} from '../shared/model.ts';
const app=express();const port=Number(process.env.PORT)||3000;
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
app.disable('x-powered-by');app.use(express.json({limit:'2mb'}));
app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next()});
app.get('/api/health',(_req,res)=>res.json({configured:Boolean(db),storage:'Supabase PostgreSQL'}));
app.use('/api',(req,res,next)=>{if(!db){res.status(503).json({error:'Supabase 연결 설정이 필요합니다. .env와 DB 마이그레이션을 확인해 주세요.'});return}if(req.method!=='GET'){const origin=req.get('origin');if(origin&&new URL(origin).host!==req.get('host')){res.status(403).json({error:'허용되지 않은 요청입니다.'});return}}next()});
async function current(){const {data,error}=await db!.from('planner_workspaces').select('data,revision').eq('id','default').single();if(error)throw Error('DB_NOT_READY');return {state:(data.data as State)??emptyState(),revision:data.revision as number}}
app.get('/api/state',async(_req,res,next)=>{try{res.json(await current())}catch(e){next(e)}});
app.get('/api/history',async(_req,res,next)=>{try{const {data,error}=await db!.from('planner_revisions').select('revision,created_at,label,data').eq('workspace_id','default').order('revision',{ascending:false}).limit(500);if(error)throw error;res.json(data)}catch(e){next(e)}});
app.get('/api/export',async(_req,res,next)=>{try{const snapshot=await current();const {data,error}=await db!.from('planner_revisions').select('revision,created_at,label,data').eq('workspace_id','default').order('revision');if(error)throw error;res.setHeader('Content-Disposition','attachment; filename="plan-do-see.json"');res.json({schema:'pds-schema-v2',exportedAt:new Date().toISOString(),...snapshot,history:data})}catch(e){next(e)}});
const saveSchema=z.object({state:z.unknown(),revision:z.number().int().nonnegative(),requestId:z.string().uuid(),label:z.string().min(1).max(150)});
app.post('/api/state',async(req,res,next)=>{try{const body=saveSchema.parse(req.body);const {data:repeat,error:repeatError}=await db!.from('planner_revisions').select('revision,data').eq('workspace_id','default').eq('request_id',body.requestId).maybeSingle();if(repeatError)throw repeatError;if(repeat){res.json({revision:repeat.revision,state:repeat.data});return}const before=await current();if(before.revision!==body.revision){res.status(409).json({error:'다른 화면에서 기록이 변경됐습니다. 최신 기록을 불러온 뒤 다시 저장해 주세요.'});return}let state:State;try{state=prepareSave(before.state,body.state)}catch(e){res.status(400).json({error:e instanceof z.ZodError?'입력 형식과 날짜·숫자 범위를 확인해 주세요.':(e as Error).message});return}const {data,error}=await db!.rpc('save_planner',{p_revision:body.revision,p_request_id:body.requestId,p_label:body.label,p_data:state});if(error){if(error.message.includes('revision_conflict')){res.status(409).json({error:'다른 화면에서 변경되었습니다. 새로 불러와 주세요.'});return}throw error}res.json({state:data.data,revision:data.revision})}catch(e){next(e)}});
app.use('/api',(_req,res)=>res.status(404).json({error:'요청한 기능을 찾을 수 없습니다.'}));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(err instanceof z.ZodError?400:503).json({error:err instanceof z.ZodError?'요청 형식을 확인해 주세요.':'DB에 연결하지 못했습니다. 연결 설정과 마이그레이션을 확인한 뒤 다시 시도해 주세요.'})});
if(process.env.NODE_ENV==='production'||process.argv[1]?.endsWith('server.mjs')){app.use(express.static(resolve('dist/client')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/client/index.html')))}else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares)}
app.listen(port,'127.0.0.1',()=>console.log(`Plan Do See: http://localhost:${port}`));
