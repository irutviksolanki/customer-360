import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './typography';
import Icon from './Icon';
import {useTheme} from './theme';
import type {ThemePreference} from './themePalette';

export default function AppearanceControl(){
 const {colors:C,preference,setPreference}=useTheme();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function choose(value:ThemePreference){setBusy(true);setError('');try{await setPreference(value)}catch{setError('Unable to save appearance. Please retry.')}finally{setBusy(false)}}
 return <View style={{paddingVertical:16}}>
  <Text style={{color:C.muted,fontSize:10,fontWeight:'600',letterSpacing:1.5,marginBottom:10}}>APPEARANCE</Text>
  <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{flexDirection:'row',backgroundColor:C.elevated,borderRadius:12,padding:4,gap:3,borderWidth:1,borderColor:C.line}}>
   {(['light','dark','system'] as const).map(value=>{
    const selected=preference===value;
    return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} theme`} accessibilityState={{checked:selected,disabled:busy}} disabled={busy} onPress={()=>void choose(value)} style={({pressed})=>({flex:1,minWidth:0,minHeight:58,paddingVertical:8,gap:5,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:selected?C.accentBorder:'transparent',backgroundColor:selected?C.surface:'transparent',opacity:pressed?.65:busy&&!selected?.5:1})}>
     <Icon name={value==='light'?'Sun':value==='dark'?'Moon':'Monitor'} size={18} color={selected?C.green:C.muted}/>
     <Text style={{fontSize:10,lineHeight:15,color:selected?C.green:C.muted,fontWeight:selected?'600':'400'}}>{value[0].toUpperCase()+value.slice(1)}</Text>
    </Pressable>;
   })}
  </View>
  {!!error&&<Text accessibilityRole="alert" style={{fontSize:12,color:C.red,marginTop:8}}>{error}</Text>}
 </View>;
}
