import {useState,useEffect,useCallback} from 'react';
import {Leaf,LayoutGrid,FolderKanban,Settings,ChevronLeft,ChevronRight,Download,RefreshCw,ArrowUpRight} from 'lucide-react';
import {emptyState,today,addDays,uid,type Snapshot,type State} from '../shared/model';
import {exportAll,isSupabaseConfigured,loadSnapshot,saveSnapshot} from './data';
import {Care} from './Care';
import {Projects} from './Projects';
import {Field,type Store} from './ui';

export default function App(){
 const [snapshot,setSnapshot]=useState<Snapshot>({state:emptyState(),revision:0});
 const [area,setArea]=useState(()=>localStorage.getItem('pds-area')||'care');
 const [date,setDate]=useState(today());
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [connected,setConnected]=useState(false);
 const [notice,setNotice]=useState('');

 const load=useCallback(async()=>{setLoading(true);try{setSnapshot(await loadSnapshot());setConnected(true);setError('')}catch(e){setConnected(false);setError((e as Error).message)}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);

 async function save(next:State,label:string){
  if(busy)return false;setBusy(true);setError('');setNotice('');const requestId=uid();
  try{
   let saved:Snapshot;
   try{saved=await saveSnapshot(snapshot,next,label,requestId)}catch(first){
    if(first instanceof Error&&first.message.includes('다른 화면'))throw first;
    saved=await saveSnapshot(snapshot,next,label,requestId);
   }
   setSnapshot(saved);setConnected(true);setNotice('저장되었습니다');return true;
  }catch(e){setError((e as Error).message);return false}finally{setBusy(false)}
 }

 async function downloadExport(){
  setBusy(true);setError('');
  try{const data=await exportAll(snapshot);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='plan-do-see.json';link.click();URL.revokeObjectURL(url)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }

 const store:Store={state:snapshot.state,snapshot,save,busy};
 function navigate(nextArea:string){setArea(nextArea);localStorage.setItem('pds-area',nextArea)}

 return <div className="app"><aside className="sidebar"><a className="brand" href="#" onClick={event=>{event.preventDefault();navigate('care')}}><span className="brand-icon"><Leaf size={23}/></span><span>플랜두씨<small>PLAN · DO · SEE</small></span></a><div className="nav-caption">나의 공간</div><nav><button className={area==='care'?'selected':''} onClick={()=>navigate('care')}><LayoutGrid size={18}/>자기관리</button><button className={area==='projects'?'selected':''} onClick={()=>navigate('projects')}><FolderKanban size={18}/>프로젝트</button></nav><div className="sidebar-note"><span className="tiny-leaf">✳</span><p>작은 기록이 모여<br/>나의 방향이 됩니다.</p></div><button className={'settings-link '+(area==='settings'?'selected':'')} onClick={()=>navigate('settings')}><Settings size={17}/>설정</button><div className="connection"><i className={connected?'online':''}/>{connected?'Supabase 연결됨':isSupabaseConfigured?'DB 연결 대기':'환경변수 필요'}</div></aside><main><div className="topline"><span>나의 다이어리 <span className="slash">/</span> {area==='care'?'자기관리':area==='projects'?'프로젝트':'설정'}</span><span>나를 위한, 오늘의 기록</span></div><div className="pagehead"><div><div className="eyebrow">{area==='care'?'A LITTLE CARE, EVERY DAY':area==='projects'?'ONE STEP AT A TIME':'MAKE IT YOURS'}</div><h1>{area==='care'?'나를 돌보는 하루':area==='projects'?'계획을 실천으로':'다이어리 설정'}</h1><p>{area==='care'?'잘한 날도, 쉬어간 날도. 있는 그대로 남겨보세요.':area==='projects'?'오늘 할 일을 정하고, 실제 걸어온 길을 돌아보세요.':'나의 기록 환경을 관리해요.'}</p></div>{area!=='settings'&&<div className="date-nav"><button className="icon" aria-label="이전 날" onClick={()=>setDate(addDays(date,-1))}><ChevronLeft size={17}/></button><input aria-label="기록 날짜" type="date" value={date} onChange={event=>event.target.value&&setDate(event.target.value)}/><button className="icon" aria-label="다음 날" onClick={()=>setDate(addDays(date,1))}><ChevronRight size={17}/></button><button onClick={()=>setDate(today(snapshot.state.timezone))}>오늘</button></div>}</div><div className="public-note">지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요</div>{error&&<div className="error" role="alert"><span>{error}</span><button onClick={()=>void load()}><RefreshCw size={14}/>다시 불러오기</button></div>}<div className="save-status" role="status">{busy?'저장 중…':loading?'기록을 불러오는 중…':notice}</div>{area==='care'?<Care store={store} date={date}/>:area==='projects'?<Projects store={store} date={date} setDate={setDate}/>:<section className="panel settings-panel"><h2>기록과 데이터</h2><Field label="기록 시간대"><select value={snapshot.state.timezone} onChange={event=>void save({...snapshot.state,timezone:event.target.value},'시간대 변경')}><option>Asia/Seoul</option><option>UTC</option><option>America/New_York</option><option>Europe/London</option></select></Field><p>프로젝트 과제 집계의 지연 판단은 서울 날짜를 사용합니다.</p><button className="button" disabled={busy||!connected} onClick={()=>void downloadExport()}><Download size={16}/>전체 기록 내보내기</button><hr/><h3>Supabase 연결</h3><p>브라우저용 공개 키와 RLS 정책으로 연결합니다. 비밀키는 필요하지 않습니다.</p><button onClick={()=>void load()}><RefreshCw size={16}/>연결 확인</button><hr/><p className="muted">현재 버전은 로그인 없는 공유 다이어리입니다. 인증과 개인별 접근 제한은 다음 버전에서 추가합니다.</p></section>}<footer><Leaf size={13}/>플랜두씨<span>계획하고, 실천하고, 다시 돌아보기.</span><ArrowUpRight size={13}/></footer></main></div>;
}
