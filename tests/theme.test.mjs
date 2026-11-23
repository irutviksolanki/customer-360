import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

async function load(path){const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}
const {parseThemePreference,resolveTheme,lightColors,darkColors}=await load('../src/themePalette.ts');

test('system preference follows the OS while explicit light/dark preferences stay fixed',()=>{
 assert.equal(resolveTheme('system','dark'),'dark');assert.equal(resolveTheme('system','light'),'light');
 assert.equal(resolveTheme('system',null),'light');assert.equal(resolveTheme('light','dark'),'light');assert.equal(resolveTheme('dark','light'),'dark');
 for(const value of [null,'unknown','{"theme":"dark"}'])assert.equal(parseThemePreference(value),'system');
 assert.equal(parseThemePreference('light'),'light');assert.equal(parseThemePreference('dark'),'dark');
});

function luminance(hex){const channels=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(values[0]+.05)/(values[1]+.05)}
test('light and dark text, buttons and status badges meet normal-text contrast',()=>{
 for(const [name,colors] of [['light',lightColors],['dark',darkColors]]){
  for(const [foreground,background] of [['dark','bg'],['dark','surface'],['muted','surface'],['onAccent','accent'],['green','soft'],['red','negativeBg'],['amber','warningBg'],['positiveInk','positiveBg'],['infoInk','infoBg'],['purpleInk','purpleBg'],['toastInk','toastBg']]){
   assert.ok(contrast(colors[foreground],colors[background])>=4.5,`${name} ${foreground}/${background}: ${contrast(colors[foreground],colors[background]).toFixed(2)}`);
  }
 }
});

test('web appearance preference persists independently of logout storage',async(t)=>{
 const data=new Map(),original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}}});
 t.after(()=>{if(original)Object.defineProperty(globalThis,'window',original);else delete globalThis.window});
 const {themeStorage,themeKey}=await load('../src/themeStorage.ts');
 const {sessionStorage,sessionKey}=await load('../src/sessionStorage.ts');
 assert.notEqual(themeKey,sessionKey);
 await themeStorage.set('dark');await sessionStorage.set('test-session');await sessionStorage.remove();
 assert.equal(await themeStorage.get(),'dark');assert.equal(await sessionStorage.get(),null);
 await themeStorage.set('system');assert.equal(await themeStorage.get(),'system');
});
