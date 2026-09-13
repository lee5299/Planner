import {useState} from 'react';
import {Plus,ArrowUpRight,Flower2,BookOpen} from 'lucide-react';
import {careAt,careMessage,uid,addDays,weekStart,today,daysBetween,type CareVersion} from '../shared/model';
import {Empty,type Store} from './ui';

type MandalaCell={kind:'goal'}|{kind:'category';category:number}|{kind:'action';category:number;action:number};

export function Care({store,date}:{store:Store;date:string}){
 const {state,save,busy}=store;
 const [tab,setTab]=useState('today');
 const [draft,setDraft]=useState<CareVersion|null>(null);
 const [cell,setCell]=useState<MandalaCell|null>(null);
 const [cellValue,setCellValue]=useState('');
 const [review,setReview]=useState<{date:string;text:string}|null>(null);
 const [markingActionId,setMarkingActionId]=useState('');
 const version=careAt(state,date);
 const display=draft??version;
 const week=weekStart(date);
 const oldReview=state.reviews.find(item=>item.date===date&&item.area==='care');
 const yesterday=state.reviews.find(item=>item.date===addDays(date,-1)&&item.area==='care');

 function nextVersion(){
  const now=today(state.timezone);
  const current=careAt(state,now);
  const existing=state.care.find(item=>item.effective===now);
  return {id:existing?.id??uid(),effective:now,goal:current?.goal??'',categories:structuredClone(current?.categories??[])};
 }
 function openGoals(){setDraft(current=>current??nextVersion());setCell(null);setCellValue('');setTab('goals')}
 function selectCell(next:MandalaCell){
  const current=draft??nextVersion();setDraft(current);setCell(next);
  if(next.kind==='goal')setCellValue(current.goal);
  else if(next.kind==='category')setCellValue(current.categories[next.category]?.name??'');
  else setCellValue(current.categories[next.category]?.actions[next.action]?.name??'');
 }
 function applyCell(){
  const value=cellValue.trim();if(!draft||!cell||!value)return;
  const next=structuredClone(draft);
  if(cell.kind==='goal')next.goal=value;
  if(cell.kind==='category'){const current=next.categories[cell.category];if(current)current.name=value;else next.categories.push({id:uid(),name:value,threshold:4,actions:[]})}
  if(cell.kind==='action'){const category=next.categories[cell.category];if(!category)return;const current=category.actions[cell.action];if(current)current.name=value;else category.actions.push({id:uid(),name:value})}
  setDraft(next);setCell(null);setCellValue('');
 }
 async function saveGoals(){
  if(!draft?.goal.trim()||!draft.categories.length)return;
  const effective=today(state.timezone);
  const current={...draft,effective};
  const base=state.care.some(item=>item.id===current.id)?state.care.map(item=>item.id===current.id?current:item):[...state.care,current];
  const care=base.map(item=>item.effective>effective?{...item,goal:current.goal,categories:structuredClone(current.categories)}:item);
  if(await save({...state,care},'자기관리 목표 설정')){setDraft(null);setCell(null);setTab('today')}
 }
 async function mark(actionId:string,categoryId:string,status:'done'|null){
  if(markingActionId)return;
  setMarkingActionId(actionId);
  const old=state.logs.find(item=>item.date===date&&item.actionId===actionId);
  const category=version!.categories.find(item=>item.id===categoryId)!;
  const action=category.actions.find(item=>item.id===actionId)!;
  const logs=state.logs.filter(item=>item.id!==old?.id);
  if(status)logs.push({id:old?.id??uid(),date,actionId,categoryId,status,name:action.name,category:category.name,threshold:category.threshold});
  try{await save({...state,logs},'자기관리 실천 기록')}finally{setMarkingActionId('')}
 }

 return <>
  <div className="tabs"><button className={tab==='today'?'active':''} onClick={()=>setTab('today')}>오늘 기록</button><button className={tab==='goals'?'active':''} onClick={openGoals}>나의 만다라트</button><button className={tab==='week'?'active':''} onClick={()=>setTab('week')}>주간 돌아보기</button></div>
  {tab==='today'?<>
   <section className="care-banner"><div><span className="eyebrow">MY NORTH STAR</span><h2>{version?.goal||'나는 어떤 사람이 되고 싶나요?'}</h2><p>{version?'오늘의 작은 실천으로 나의 이상에 한 걸음 더.':'나를 위한 목표부터 천천히 정해보세요.'}</p><button className="text-button" onClick={openGoals}>만다라트에서 설정<ArrowUpRight size={15}/></button></div><Flower2 className="banner-flower" size={100} strokeWidth={.8}/></section>
   {yesterday?.text&&<div className="note">어제의 나에게서 <span>{yesterday.text}</span></div>}
   <div className="section-title"><div><h2>오늘의 작은 실천</h2><p>흰색 실천 칸을 누르면 민트색으로 기록되고, 다시 누르면 해제됩니다.</p></div><span>{new Date(date+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})}</span></div>
   {!version?.categories.length?<Empty title="먼저 만다라트에 실천을 적어주세요" detail="핵심 목표 → 세부 목표 → 작은 실천 순서로 칸을 클릭해 입력할 수 있어요." action="만다라트 설정하기" onAction={openGoals}/>:<div className="today-mandala">{version.categories.map((category,index)=><section className="panel today-mandala-card" key={category.id}><header><span className="category-number">0{index+1}</span><h3>{category.name}</h3></header><div className="today-mandala-grid">{Array.from({length:9},(_,cellIndex)=>{if(cellIndex===4)return <div className="today-core" key="core">{category.name}</div>;const actionIndex=cellIndex<4?cellIndex:cellIndex-1;const action=category.actions[actionIndex];if(!action)return <button className="today-cell empty-cell" key={cellIndex} disabled>＋</button>;const log=state.logs.find(item=>item.date===date&&item.actionId===action.id);const checked=log?.status==='done';const marking=markingActionId===action.id;return <button className={'today-cell '+(checked?'done':'unmarked')} key={action.id} disabled={marking||date>today(state.timezone)} aria-busy={marking} aria-pressed={checked} aria-label={action.name+', '+(checked?'했다. 클릭하면 기록 해제':'미기록. 클릭하면 했다')} onClick={()=>void mark(action.id,category.id,checked?null:'done')}><span>{action.name}</span><small>{marking?'저장 중…':checked?'✓ 했다':'눌러서 기록'}</small></button>})}</div>{!category.actions.length&&<button className="text-button" onClick={openGoals}><Plus size={14}/>작은 실천 입력하기</button>}</section>)}</div>}
   <div className="gentle"><Flower2 size={21}/><p>{careMessage(state,date,date)}</p></div>
   <section className="panel reflection"><BookOpen size={20}/><div><h3>내일의 나에게</h3><p>내일 바꿔볼 점이 있다면, 한 줄만 남겨요.</p><textarea aria-label="자기관리 내일 바꿀 점" placeholder="조금 더 편안한 내일을 위해…" value={review?.date===date?review.text:oldReview?.text??''} onChange={event=>setReview({date,text:event.target.value})}/><button disabled={busy} onClick={()=>void save({...state,reviews:[...state.reviews.filter(item=>item.id!==oldReview?.id),{id:oldReview?.id??uid(),date,area:'care',text:review?.date===date?review.text:oldReview?.text??'',closed:true}]},'자기관리 하루 마무리')}>하루 마무리</button></div></section>
  </>:tab==='goals'?<section className="panel"><div className="section-title"><div><h2>칸을 눌러 만다라트 만들기</h2><p>핵심 목표 → 세부 목표 → 작은 실천 순서로 한 칸씩 입력하세요.</p></div><span>{draft?.effective}부터 적용</span></div>
   <div className="mandala">{Array.from({length:9},(_,blockIndex)=>blockIndex===4?<div className="mandala-block center-block" key="center">{Array.from({length:9},(_,cellIndex)=>{const categoryIndex=cellIndex<4?cellIndex:cellIndex-1;return <button key={cellIndex} className={cellIndex===4?'core':''} onClick={()=>selectCell(cellIndex===4?{kind:'goal'}:{kind:'category',category:categoryIndex})}>{cellIndex===4?display?.goal||'핵심 목표 ＋':display?.categories[categoryIndex]?.name||'세부 목표 ＋'}</button>})}</div>:<div className="mandala-block" key={blockIndex}>{Array.from({length:9},(_,cellIndex)=>{const categoryIndex=blockIndex<4?blockIndex:blockIndex-1;const actionIndex=cellIndex<4?cellIndex:cellIndex-1;const category=display?.categories[categoryIndex];return <button key={cellIndex} disabled={!category&&cellIndex!==4} className={cellIndex===4?'core':''} onClick={()=>selectCell(cellIndex===4?{kind:'category',category:categoryIndex}:{kind:'action',category:categoryIndex,action:actionIndex})}>{cellIndex===4?category?.name||'세부 목표 ＋':category?.actions[actionIndex]?.name||'작은 실천 ＋'}</button>})}</div>)}</div>
   {cell&&<form className="cell-editor" onSubmit={event=>{event.preventDefault();applyCell()}}><label><span>{cell.kind==='goal'?'핵심 목표':cell.kind==='category'?'세부 목표':'작은 실천'}</span><input autoFocus required maxLength={150} value={cellValue} onChange={event=>setCellValue(event.target.value)} placeholder="이 칸에 들어갈 내용을 입력하세요"/></label><div className="actions"><button type="button" onClick={()=>{setCell(null);setCellValue('')}}>취소</button><button className="primary">칸에 적용</button></div></form>}
   <div className="mandala-actions"><p className="muted">칸에 적용한 뒤 마지막에 전체 변경사항을 저장하세요. 기존 기록은 그대로 보존됩니다.</p><button className="primary" disabled={busy||!draft?.goal.trim()||!draft.categories.length} onClick={()=>void saveGoals()}>변경사항 저장</button></div>
  </section>:<section className="panel"><div className="section-title"><h2>이번 주, 나를 돌본 순간들</h2><span>{week} — {addDays(week,6)}</span></div><div className="gentle"><Flower2 size={22}/><p>{careMessage(state,week,addDays(week,6))}</p></div>{daysBetween(week,addDays(week,6)).map(day=><div className="week-care" key={day}><strong>{day.slice(5)}</strong><div>{state.logs.filter(item=>item.date===day).length?state.logs.filter(item=>item.date===day).map(log=><span className={log.status==='done'?'chip done':'chip'} key={log.id}>{log.category} · {log.name} {log.status==='done'?'✓':'쉬어감'}</span>):<span className="muted">{day>today(state.timezone)?'아직 오지 않은 하루':'남겨진 기록이 없어요'}</span>}</div></div>)}</section>}
 </>;
}
