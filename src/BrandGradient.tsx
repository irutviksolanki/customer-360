import React from 'react';
import {StyleSheet,View,type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useTheme} from './theme';

/** Shared Customer360 brand gradient for web and native UI. */
export const brandGradient=['#009EE3','#1D5179','#253D5E','#25565E','#27AE60'] as const;

export default function BrandGradient({children,style}:{children:React.ReactNode;style?:ViewStyle|ViewStyle[]}){
 const {isDark}=useTheme();
 if(isDark)return <View style={[styles.fill,styles.dark,style]}>{children}</View>;
 return <LinearGradient colors={brandGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.fill,style]}>{children}</LinearGradient>;
}

const styles=StyleSheet.create({fill:{overflow:'hidden'},dark:{backgroundColor:'#ffffff'}});
