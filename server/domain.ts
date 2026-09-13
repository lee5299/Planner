import {stateSchema,careAt,today,type State} from '../shared/model.ts';
export function prepareSave(previous:State,input:unknown,now=new Date()):State{
 const next=stateSchema.parse(input);const stamp=now.toISOString();
 for(const key of ['care','logs','projects','stages','tasks','executions','rules','plans','reviews'] as const){const ids=next[key].map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error('중복 ID입니다');}
 for(const key of ['projects','stages','tasks','executions','rules','plans','care'] as const){for(const old of previous[key]){if(!next[key].some(x=>x.id===old.id))throw Error('기존 기록은 삭제 대신 보관해 주세요');}}
 for(const old of previous.care){if(JSON.stringify(next.care.find(x=>x.id===old.id))!==JSON.stringify(old))throw Error('과거 목표는 새 버전으로 수정해 주세요');}
 for(const old of previous.plans){if(JSON.stringify(next.plans.find(x=>x.id===old.id))!==JSON.stringify(old))throw Error('과거 계획을 덮어쓸 수 없습니다');}
 const dates=next.care.map(x=>x.effective);if(new Set(dates).size!==dates.length)throw Error('같은 날짜의 목표 설정이 이미 있습니다. 다음 날짜를 선택해 주세요');
 const logKeys=next.logs.map(l=>l.date+':'+l.actionId);if(new Set(logKeys).size!==logKeys.length)throw Error('같은 날 같은 실천 기록은 하나만 저장할 수 있습니다');
 for(const l of next.logs){if(l.date>today(next.timezone,now))throw Error('미래 실천은 기록할 수 없습니다');const old=previous.logs.find(x=>x.id===l.id);if(old){l.name=old.name;l.category=old.category;l.threshold=old.threshold;l.actionId=old.actionId;l.categoryId=old.categoryId;l.date=old.date}else{const c=careAt(next,l.date)?.categories.find(c=>c.id===l.categoryId);const a=c?.actions.find(a=>a.id===l.actionId);if(!c||!a)throw Error('해당 날짜의 실천 항목을 찾을 수 없습니다');l.name=a.name;l.category=c.name;l.threshold=c.threshold;}}
 for(const st of next.stages){if(!next.projects.some(p=>p.id===st.projectId))throw Error('단계의 프로젝트가 없습니다');}
 for(const t of next.tasks){const old=previous.tasks.find(x=>x.id===t.id);if(t.projectId&&!next.projects.some(p=>p.id===t.projectId))throw Error('업무의 프로젝트가 없습니다');if(t.stageId&&!next.stages.some(st=>st.id===t.stageId&&st.projectId===t.projectId))throw Error('업무와 단계의 프로젝트가 다릅니다');t.originalDate=old?.originalDate??t.date;t.createdAt=old?.createdAt??stamp;t.unplanned=old?.unplanned??t.unplanned;t.completedAt=t.status==='done'?(old?.status==='done'?old.completedAt:stamp):'';}
 for(const r of next.rules){if(r.projectId&&!next.projects.some(p=>p.id===r.projectId))throw Error('반복 목표의 프로젝트가 없습니다');if(r.stageId&&!next.stages.some(st=>st.id===r.stageId&&st.projectId===r.projectId))throw Error('반복 목표의 단계가 없습니다');}
 const occurrences=next.tasks.filter(t=>t.ruleId).map(t=>t.ruleId+':'+t.originalDate);if(new Set(occurrences).size!==occurrences.length)throw Error('같은 반복 업무가 중복되었습니다');
 for(const e of next.executions){if(!next.tasks.some(t=>t.id===e.taskId))throw Error('실행 기록의 업무가 없습니다');if(e.date>today(next.timezone,now))throw Error('미래 실행 기록은 저장할 수 없습니다');const old=previous.executions.find(x=>x.id===e.id);if(old&&JSON.stringify(old)!==JSON.stringify(e))throw Error('저장된 실행 기록은 변경할 수 없습니다');e.createdAt=old?.createdAt??stamp;if(e.start&&e.end){e.minutes=Math.round((Date.parse(e.end)-Date.parse(e.start))/60000*100)/100;}}
 const reviewKeys=next.reviews.map(r=>r.area+r.date);if(new Set(reviewKeys).size!==reviewKeys.length)throw Error('하루 돌아보기가 중복되었습니다');
 for(const plan of next.plans){if(!next.projects.some(p=>p.id===plan.projectId))throw Error('계획의 프로젝트가 없습니다');for(const a of plan.allocations)if(!next.stages.some(st=>st.id===a.stageId&&st.projectId===plan.projectId)||a.end<a.start)throw Error('단계 일정이 올바르지 않습니다');if(!previous.plans.some(x=>x.id===plan.id))plan.createdAt=stamp;}
 return next;
}
