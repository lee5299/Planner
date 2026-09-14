import type {Session} from '@supabase/supabase-js';
import {supabaseClient} from './supabase';

export async function getAuthSession(){
 const {data,error}=await supabaseClient().auth.getSession();
 if(error)throw Error('인증 상태를 확인하지 못했습니다.');
 return data.session;
}

export function watchAuthSession(callback:(session:Session|null)=>void){
 return supabaseClient().auth.onAuthStateChange((_event,session)=>callback(session)).data.subscription;
}

export async function signIn(email:string,password:string,captchaToken:string){
 const {data,error}=await supabaseClient().auth.signInWithPassword({
  email,password,options:{captchaToken}
 });
 if(error||!data.session)throw Error('login_failed');
 return data.session;
}

export async function signUp(email:string,password:string,captchaToken:string){
 const {data,error}=await supabaseClient().auth.signUp({
  email,password,options:{captchaToken}
 });
 if(error)throw Error('signup_failed');
 return data.session;
}

export async function signOut(){
 const {error}=await supabaseClient().auth.signOut({scope:'local'});
 if(error)throw Error('logout_failed');
}
