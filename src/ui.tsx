import {useEffect,useRef,type ReactNode} from 'react';
import {X,Plus,ArrowUpRight} from 'lucide-react';
import type {State,Snapshot} from '../shared/model';
export type Store={state:State;snapshot:Snapshot;save:(next:State,label:string)=>Promise<boolean>;busy:boolean};
export function Modal({title,children,close}:{title:string;children:ReactNode;close:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const active=document.activeElement as HTMLElement;ref.current?.showModal();return()=>active?.focus()},[]);return <dialog ref={ref} onCancel={close} onClick={e=>{if(e.target===ref.current)close()}}><header><h2>{title}</h2><button className="icon" aria-label="닫기" onClick={close}><X size={20}/></button></header>{children}</dialog>}
export function Empty({title,detail,action,onAction}:{title:string;detail:string;action?:string;onAction?:()=>void}){return <div className="empty"><div className="empty-mark"><Plus size={24}/></div><h3>{title}</h3><p>{detail}</p>{action&&<button className="primary" onClick={onAction}>{action}<ArrowUpRight size={15}/></button>}</div>}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function Progress({progress,status}:{progress:number;status:string}){return <div className="progress-wrap"><button className="progress-button" aria-label={`진행률 ${Math.round(progress*100)}%, ${status}`} onClick={e=>e.currentTarget.classList.toggle('show-tip')}><span className={'track '+(status==='촉박'||status==='기한 초과'?'urgent':status==='주의'?'caution':'')}><span style={{width:`${progress*100}%`}}/></span><span className="progress-tip">진행률 {Math.round(progress*100)}% · {status}</span></button><span className={'status '+(status==='촉박'||status==='기한 초과'?'urgent':'')}>{status}</span></div>}
export const statusNames={todo:'할 일',doing:'진행 중',done:'완료',blocked:'보류',cancelled:'취소'};
export const priorityNames={high:'상',medium:'중',low:'하'};
