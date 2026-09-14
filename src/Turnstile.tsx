import {useEffect,useRef} from 'react';

type TurnstileApi={
 render:(container:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void;theme:'light'})=>string;
 remove:(widgetId:string)=>void;
};

declare global{interface Window{turnstile?:TurnstileApi}}

let scriptPromise:Promise<void>|null=null;
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const existing=document.querySelector<HTMLScriptElement>('script[data-plan-do-see-turnstile]');
  const script=existing??document.createElement('script');
  const onLoad=()=>resolve();
  const onError=()=>reject(Error('turnstile_load_failed'));
  script.addEventListener('load',onLoad,{once:true});
  script.addEventListener('error',onError,{once:true});
  if(!existing){
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.async=true;
   script.defer=true;
   script.dataset.planDoSeeTurnstile='true';
   document.head.appendChild(script);
  }
 });
 return scriptPromise;
}

export function Turnstile({siteKey,resetKey,onToken,onError}:{siteKey:string;resetKey:number;onToken:(token:string)=>void;onError:()=>void}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let disposed=false;
  let widgetId:string|undefined;
  onToken('');
  void loadTurnstile().then(()=>{
   if(disposed||!container.current||!window.turnstile)return;
   widgetId=window.turnstile.render(container.current,{
    sitekey:siteKey,
    callback:onToken,
    'expired-callback':()=>onToken(''),
    'error-callback':()=>{onToken('');onError()},
    theme:'light'
   });
  }).catch(onError);
  return ()=>{
   disposed=true;
   if(widgetId&&window.turnstile)window.turnstile.remove(widgetId);
  };
 },[siteKey,resetKey,onToken,onError]);
 return <div className="turnstile" ref={container}/>;
}
