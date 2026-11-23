import React, {createContext, forwardRef, useContext} from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import {useTheme} from './theme';

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

const InheritedWeight = createContext<TextStyle['fontWeight']>('400');

function typography(style: TextProps['style'], inherited: TextStyle['fontWeight']) {
  const weight = StyleSheet.flatten(style)?.fontWeight ?? inherited ?? '400';
  const number = weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number(weight);
  const family = number >= 650 ? fonts.bold : number >= 550 ? fonts.semibold : number >= 450 ? fonts.medium : fonts.regular;
  // Static font files supply the real weight. Avoid platform-specific synthetic bold.
  return {weight, fontStyle: {fontFamily: family, fontWeight: 'normal' as const}};
}

export function Text({style, ...props}: TextProps) {
  const {colors}=useTheme();
  const {weight, fontStyle} = typography(style, useContext(InheritedWeight));
  return (
    <InheritedWeight.Provider value={weight}>
      <NativeText {...props} style={[{color:colors.dark},style, fontStyle]}/>
    </InheritedWeight.Provider>
  );
}

export const TextInput = forwardRef<React.ComponentRef<typeof NativeTextInput>, TextInputProps>(
  function PoppinsInput({style, ...props}, ref) {
    const {colors,isDark}=useTheme();
    const {fontStyle} = typography(style, useContext(InheritedWeight));
    return <NativeTextInput ref={ref} placeholderTextColor={colors.muted} selectionColor={colors.green} keyboardAppearance={isDark?'dark':'light'} {...props} style={[{color:colors.dark},style, fontStyle]}/>;
  },
);
