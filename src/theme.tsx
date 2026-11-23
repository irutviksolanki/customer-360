import React,{createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {ActivityIndicator,Platform,StatusBar,useColorScheme,View} from 'react-native';
import {darkColors,lightColors,parseThemePreference,resolveTheme,type ThemeColors,type ThemePreference} from './themePalette';
import {themeStorage,themeKey} from './themeStorage';

type Theme={colors:ThemeColors;isDark:boolean;preference:ThemePreference;setPreference:(value:ThemePreference)=>Promise<void>};
const ThemeContext=createContext<Theme>({colors:lightColors,isDark:false,preference:'system',setPreference:async()=>{}});
export const useTheme=()=>useContext(ThemeContext);

export function ThemeProvider({children}:{children:ReactNode}){
 const system=useColorScheme();
 const [preference,setMode]=useState<ThemePreference>('system'),[ready,setReady]=useState(false);
 const isDark=resolveTheme(preference,system)==='dark',colors=isDark?darkColors:lightColors;
 useEffect(()=>{
  let active=true;
  themeStorage.get().then(value=>{if(active)setMode(parseThemePreference(value))}).catch(()=>{}).finally(()=>{if(active)setReady(true)});
  const sync=(event:StorageEvent)=>{if(event.key===themeKey||event.key===null)setMode(parseThemePreference(event.newValue))};
  if(Platform.OS==='web')window.addEventListener('storage',sync);
  return()=>{active=false;if(Platform.OS==='web')window.removeEventListener('storage',sync)};
 },[]);
 useEffect(()=>{if(Platform.OS==='web'){document.documentElement.style.colorScheme=isDark?'dark':'light';document.documentElement.style.setProperty('--gcc-background',colors.bg);document.documentElement.style.setProperty('--gcc-text',colors.dark);document.documentElement.style.setProperty('--gcc-line',colors.line)}},[isDark,colors]);
 async function setPreference(value:ThemePreference){await themeStorage.set(value);setMode(value)}
 return <ThemeContext.Provider value={{colors,isDark,preference,setPreference}}><StatusBar barStyle={isDark?'light-content':'dark-content'}/>{ready?children:<View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg}}><ActivityIndicator color={colors.green}/></View>}</ThemeContext.Provider>;
}
