import React from 'react';
import Icon from './Icon';
import {useTheme} from './theme';

export default function PasswordVisibilityIcon({visible}:{visible:boolean}){
 const {colors}=useTheme();
 return <Icon name={visible?'EyeOff':'Eye'} size={22} color={colors.green}/>;
}
