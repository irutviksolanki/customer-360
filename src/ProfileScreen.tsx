import React,{useEffect,useState} from 'react';
import {View,Pressable,ActivityIndicator,StyleSheet} from 'react-native';
import {Text,TextInput} from './typography';
import {useTheme} from './theme';
import type {ThemeColors} from './themePalette';
import BrandGradient from './BrandGradient';
import {getProfile,saveProfile,type Profile,type ProfileChanges} from './api';

const fields:[keyof ProfileChanges,string][]=[['name','Full name'],['designation','Designation'],['department','Department / function'],['phone','Phone number'],['location','Location']];
const editable=(p:Profile):ProfileChanges=>({name:p.name,designation:p.designation,department:p.department,phone:p.phone,location:p.location});

export default function ProfileScreen(){
 const {colors:C,isDark}=useTheme();const s=React.useMemo(()=>createStyles(C,isDark),[C,isDark]);
 const [profile,setProfile]=useState<Profile|null>(null),[form,setForm]=useState<ProfileChanges|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 useEffect(()=>{let active=true;getProfile().then(p=>{if(active){setProfile(p);setForm(editable(p))}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 async function retry(){setLoading(true);setError('');try{const p=await getProfile();setProfile(p);setForm(editable(p))}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function save(){if(!form)return;setError('');setSuccess('');if(!form.name.trim()){setError('Full name is required.');return}setSaving(true);try{const p=await saveProfile(form);setProfile(p);setForm(editable(p));setSuccess('Your profile has been updated.')}catch(e:any){setError(e.message)}finally{setSaving(false)}}
 if(loading)return <View style={{padding:48,alignItems:'center'}}><ActivityIndicator color={C.green}/><Text style={{marginTop:12}}>Loading your profile…</Text></View>;
 return <View style={s.card}>
  <Text accessibilityRole="header" style={s.title}>Personal information</Text>
  <Text style={s.description}>Keep your contact and professional details up to date.</Text>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!success&&<Text accessibilityRole="alert" style={s.success}>{success}</Text>}
  {!form||!profile?<Pressable accessibilityRole="button" onPress={retry} style={{borderRadius:7,overflow:'hidden'}}><BrandGradient style={s.button}><Text style={s.buttonText}>Retry loading profile</Text></BrandGradient></Pressable>:<>
   <Text style={s.label}>Login email (read-only)</Text>
   <TextInput accessibilityLabel="Login email, read-only" editable={false} value={profile.email} style={[s.input,{backgroundColor:C.elevated,color:C.muted}]}/>
   {fields.map(([key,label])=><View key={key} style={{marginBottom:18}}>
    <Text style={s.label}>{label}{key==='name'?' *':''}</Text>
    <TextInput accessibilityLabel={label} editable={!saving} value={form[key]} maxLength={key==='location'?150:key==='phone'?30:100} keyboardType={key==='phone'?'phone-pad':'default'} autoCapitalize={key==='phone'?'none':'words'} onChangeText={value=>{setForm({...form,[key]:value});setSuccess('')}} style={[s.input,{marginBottom:0}]}/>
   </View>)}
   <View style={{flexDirection:'row',gap:12,flexWrap:'wrap',marginTop:6}}>
    <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={[{borderRadius:7,overflow:'hidden'},saving&&{opacity:.6}]}><BrandGradient style={s.button}><Text style={s.buttonText}>{saving?'Saving…':'Save profile'}</Text></BrandGradient></Pressable>
    <Pressable accessibilityRole="button" disabled={saving} onPress={()=>{setForm(editable(profile));setError('');setSuccess('')}} style={[s.button,{backgroundColor:C.surface,borderWidth:1,borderColor:C.inputBorder}]}><Text style={{color:C.dark}}>Reset changes</Text></Pressable>
   </View>
  </>}
 </View>;
}

const createStyles=(C:ThemeColors,isDark:boolean)=>StyleSheet.create({card:{backgroundColor:C.surface,borderRadius:10,borderWidth:1,borderColor:C.line,padding:24,maxWidth:740,width:'100%'},title:{fontSize:20,fontWeight:'600',color:C.dark,marginBottom:8},description:{fontSize:14,color:C.muted,lineHeight:22,marginBottom:24},label:{fontSize:14,color:C.dark,marginBottom:8},input:{fontSize:16,borderWidth:1,borderColor:C.inputBorder,borderRadius:7,padding:12,marginBottom:18,color:C.dark},button:{paddingVertical:13,paddingHorizontal:20,borderRadius:7,alignItems:'center',justifyContent:'center',minHeight:46},buttonText:{fontSize:14,color:isDark?'#111111':C.onAccent,fontWeight:'600'},error:{backgroundColor:C.negativeBg,color:C.red,padding:12,borderRadius:6,marginBottom:20},success:{backgroundColor:C.soft,color:C.green,padding:12,borderRadius:6,marginBottom:20}});
