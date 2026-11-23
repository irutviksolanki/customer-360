import {Platform} from 'react-native';
import {sessionStorage} from './sessionStorage';
import {SessionClient} from './sessionClient';
export const apiBase=process.env.EXPO_PUBLIC_API_URL||(Platform.OS==='web'&&typeof window!=='undefined'&&!['localhost','127.0.0.1'].includes(window.location.hostname)?window.location.origin:'http://localhost:8000');
export const sessionClient=new SessionClient(sessionStorage,Platform.OS==='web'?'web':'mobile',apiBase);
sessionClient.diagnostics=process.env.EXPO_PUBLIC_API_DEBUG!=='false';
export const signOut=()=>sessionClient.logout();
export const authHeaders=()=>sessionClient.headers();
export const authenticate=(mode:'login'|'register',body:any)=>sessionClient.authenticate(mode,body);
export function api(path:string,method='GET',body?:any,_role?:string){return sessionClient.request('/api/'+path,method,body)}
export type Profile={id:string;name:string;email:string;designation:string;department:string;phone:string;location:string};
export type ProfileChanges=Omit<Profile,'id'|'email'>;
export const getProfile=():Promise<Profile>=>sessionClient.request('/profile');
export async function saveProfile(changes:ProfileChanges):Promise<Profile>{
 const profile=await sessionClient.request('/profile','PATCH',changes);
 await sessionClient.updateName(profile.name);
 return profile;
}
