import * as SecureStore from 'expo-secure-store';
export const themeKey='gcc360.appearance.v1';
export const themeStorage={get:()=>SecureStore.getItemAsync(themeKey),set:(value:string)=>SecureStore.setItemAsync(themeKey,value)};
