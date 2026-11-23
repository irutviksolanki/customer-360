import * as SecureStore from 'expo-secure-store';
export const sessionKey='gcc360.session.v1';
export const sessionStorage={
  get:()=>SecureStore.getItemAsync(sessionKey),
  set:(value:string)=>SecureStore.setItemAsync(sessionKey,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
  remove:()=>SecureStore.deleteItemAsync(sessionKey),
};
