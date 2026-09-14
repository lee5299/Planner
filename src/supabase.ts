import {createClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured=Boolean(url&&key);
const supabase=isSupabaseConfigured?createClient(url!,key!,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}):null;

export function supabaseClient(){
 if(!supabase)throw Error('Supabase 환경변수가 필요합니다. .env 설정을 확인해 주세요.');
 return supabase;
}
