import React,{useEffect,useState} from 'react';
import {AppState,ScrollView,View,Text as SystemText,Pressable,ActivityIndicator,Platform} from 'react-native';
import {Text,TextInput} from './src/typography';
import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {Poppins_400Regular} from '@expo-google-fonts/poppins/400Regular';
import {Poppins_500Medium} from '@expo-google-fonts/poppins/500Medium';
import {Poppins_600SemiBold} from '@expo-google-fonts/poppins/600SemiBold';
import {Poppins_700Bold} from '@expo-google-fonts/poppins/700Bold';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import Workspace from './src/App';
import PasswordVisibilityIcon from './src/PasswordVisibilityIcon';
import LoginScreen from './src/LoginScreen';
import {authenticate,signOut,sessionClient} from './src/api';
import {sessionKey} from './src/sessionStorage';
import {ThemeProvider,useTheme} from './src/theme';
if(Platform.OS==='web') require('./src/web.css');
if(Platform.OS!=='web'){
 void SplashScreen.preventAutoHideAsync().catch(()=>{});
 SplashScreen.setOptions({duration:300,fade:true});
}
export default function App(){return <ThemeProvider><ThemedApp/></ThemeProvider>}
function ThemedApp(){
 const {colors:C}=useTheme();
 const [fontsLoaded,fontError]=useFonts({Poppins_400Regular,Poppins_500Medium,Poppins_600SemiBold,Poppins_700Bold});
 useEffect(()=>{
  if(Platform.OS!=='web'&&(fontsLoaded||fontError))void SplashScreen.hideAsync().catch(()=>{});
 },[fontsLoaded,fontError]);
 if(!fontsLoaded)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg}}>{fontError?<SystemText accessibilityRole="alert" style={{color:C.dark}}>Unable to load Poppins. Please restart the app.</SystemText>:<ActivityIndicator accessibilityLabel="Loading fonts" color={C.green}/>}</View>;
 return <SafeAreaProvider><AppContent/></SafeAreaProvider>;
}
function AppContent(){
 const {colors:C}=useTheme();
 const [restoring,setRestoring]=useState(true);
 const [sessionId,setSessionId]=useState('');
 const [passwordVisible,setPasswordVisible]=useState(false);
 const [user,U]=useState(''),[reg,R]=useState(false),[form,F]=useState({name:'',email:'',password:''}),[busy,B]=useState(false),[error,E]=useState('');
 useEffect(()=>{
   let active=true;
   const unsubscribe=sessionClient.subscribe(value=>{if(active){U(value?.name||'');setSessionId(value?.session_id||'');if(!value)setPasswordVisible(false)}});
   const restore=()=>sessionClient.restore().catch(()=>{if(active)E('Could not restore your session. Check device storage and retry.')});
   restore().finally(()=>{if(active)setRestoring(false)});
   const resume=AppState.addEventListener('change',state=>{if(state==='active')void restore()});
   const expire=setInterval(()=>{if(Platform.OS==='web'&&sessionClient.current&&sessionClient.current.expires_at*1000<=Date.now())void sessionClient.ensure().catch(()=>{if(active)E('Your one-hour session ended. Please sign in again.')})},1000);
   const storage=(event:StorageEvent)=>{if(event.key===sessionKey||event.key===null)void restore()};
   const focus=()=>{void restore()};
   if(Platform.OS==='web'){window.addEventListener('storage',storage);window.addEventListener('focus',focus)}
   return()=>{active=false;unsubscribe();resume.remove();clearInterval(expire);if(Platform.OS==='web'){window.removeEventListener('storage',storage);window.removeEventListener('focus',focus)}};
 },[]);
 if(restoring)return <SafeAreaView style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.green}/><Text style={{marginTop:12}}>Restoring your session…</Text></SafeAreaView>;
 async function submit(){B(true);E('');try{const d=await authenticate(reg?'register':'login',form);U(d.name);F({...form,password:''});setPasswordVisible(false)}catch(e:any){E(e.message)}finally{B(false)}}
 const login=<LoginScreen reg={reg} form={form} busy={busy} error={error} onChange={(key,value)=>F(previous=>({...previous,[key]:value}))} onSubmit={submit} onToggleMode={()=>{R(!reg);E('');setPasswordVisible(false)}}/>;
 return <SafeAreaView edges={user?['top','left','right']:['top','right','bottom','left']} style={{flex:1,backgroundColor:C.bg}}>{user?<Workspace key={sessionId} userName={user} onSignOut={async()=>{await signOut()}}/>:login}</SafeAreaView>
}
