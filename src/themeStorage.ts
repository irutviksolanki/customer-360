export const themeKey='gcc360.appearance.v1';
export const themeStorage={get:async()=>window.localStorage.getItem(themeKey),set:async(value:string)=>{window.localStorage.setItem(themeKey,value)}};
