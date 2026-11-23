import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../src/mobileLayout.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {mobileDockLayout}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

test('dock reserves each device bottom inset and keeps content/toasts above its controls',()=>{
 for(const inset of [0,12,21,24,34,48]){
  const layout=mobileDockLayout(inset);
  assert.ok(layout.bottomPadding>=inset);
  assert.ok(layout.bottomPadding>=12);
  assert.equal(layout.height,1+12+48+layout.bottomPadding);
  assert.ok(layout.contentBottom>layout.height);
  assert.ok(layout.toastBottom>layout.height);
 }
});

test('a larger home-indicator inset is included once rather than doubled',()=>{
 const small=mobileDockLayout(12),iphone=mobileDockLayout(34);
 assert.equal(iphone.height-small.height,22);
 assert.equal(iphone.contentBottom-small.contentBottom,22);
});
