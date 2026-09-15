import {useCallback,useState,type FormEvent} from 'react';
import {Leaf,LogIn,UserPlus,ShieldCheck} from 'lucide-react';
import {authSecurityConfig} from '../shared/securityConfig';
import {signIn,signUp} from './auth';
import {isSupabaseConfigured} from './supabase';
import {Turnstile} from './Turnstile';

const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()??'';

function passwordPolicyError(password:string){
 if(password.length<authSecurityConfig.minimumPasswordLength)return `비밀번호는 ${authSecurityConfig.minimumPasswordLength}자 이상으로 입력해 주세요.`;
 const rules=authSecurityConfig.requiredPasswordCharacters;
 if(rules.uppercase&&!/[A-Z]/.test(password))return '영어 대문자를 1개 이상 포함해 주세요.';
 if(rules.lowercase&&!/[a-z]/.test(password))return '영어 소문자를 1개 이상 포함해 주세요.';
 if(rules.digit&&!/\d/.test(password))return '숫자를 1개 이상 포함해 주세요.';
 if(rules.symbol&&!/[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(password))return '특수문자를 1개 이상 포함해 주세요.';
 return '';
}

export function AuthScreen(){
 const [mode,setMode]=useState<'login'|'signup'>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [captchaToken,setCaptchaToken]=useState('');
 const [resetKey,setResetKey]=useState(0);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const captchaError=useCallback(()=>setError('보안 확인을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'),[]);
 const configured=isSupabaseConfigured&&Boolean(siteKey);

 function changeMode(next:'login'|'signup'){
  setMode(next);setPassword('');setMessage('');setError('');setCaptchaToken('');setResetKey(value=>value+1);
 }

 async function submit(event:FormEvent){
  event.preventDefault();setMessage('');setError('');
  if(!configured){setError('인증 환경 설정이 필요합니다.');return}
  if(!captchaToken){setError('보안 확인을 완료해 주세요.');return}
  if(mode==='signup'){
   const policyError=passwordPolicyError(password);
   if(policyError){setError(policyError);return;}
  }
  setBusy(true);
  try{
   if(mode==='login')await signIn(email.trim(),password,captchaToken);
   else{
    const session=await signUp(email.trim(),password,captchaToken);
    if(!session)setMessage('가입 요청을 확인했습니다. 이메일의 확인 링크를 열어 주세요.');
   }
  }catch{
   setError(authSecurityConfig.genericLoginError);
  }finally{
   setPassword('');setCaptchaToken('');setResetKey(value=>value+1);setBusy(false);
  }
 }

 return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title"><div className="auth-brand"><span className="brand-icon"><Leaf size={25}/></span><span>플랜두씨<small>PLAN · DO · SEE</small></span></div><div className="auth-shield"><ShieldCheck size={18}/>나의 기록은 로그인 후에만 열립니다.</div><h1 id="auth-title">{mode==='login'?'다시 만나 반가워요':'나만의 다이어리 시작하기'}</h1><p>{mode==='login'?'오늘의 계획과 기록을 이어가세요.':'이메일과 안전한 비밀번호로 계정을 만드세요.'}</p><div className="auth-tabs" role="tablist" aria-label="인증 방식"><button role="tab" aria-selected={mode==='login'} onClick={()=>changeMode('login')}>로그인</button><button role="tab" aria-selected={mode==='signup'} onClick={()=>changeMode('signup')}>회원가입</button></div><form onSubmit={event=>void submit(event)}><label className="field"><span>이메일</span><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label><label className="field"><span>비밀번호</span><input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='signup'?authSecurityConfig.minimumPasswordLength:undefined} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/>{mode==='signup'&&<small>{authSecurityConfig.minimumPasswordLength}자 이상, 영어 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해 주세요.</small>}</label>{siteKey?<Turnstile siteKey={siteKey} resetKey={resetKey} onToken={setCaptchaToken} onError={captchaError}/>:<div className="auth-config-error">Turnstile 공개 사이트 키가 필요합니다.</div>}{error&&<div className="error auth-error" role="alert">{error}</div>}{message&&<div className="auth-message" role="status">{message}</div>}<button className="primary auth-submit" type="submit" disabled={busy||!configured||!captchaToken}>{mode==='login'?<LogIn size={17}/>:<UserPlus size={17}/>} {busy?'확인 중…':mode==='login'?'로그인':'계정 만들기'}</button></form><small className="auth-security-note">보안 확인(CAPTCHA)을 통과한 요청만 보냅니다. 비밀번호와 인증값은 앱에 기록하지 않습니다.</small></section></main>;
}
