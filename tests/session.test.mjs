import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the real session controller without loading React Native in Node.
const source=fs.readFileSync(new URL('../src/sessionClient.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {SessionClient}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const ok=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status});
function fixture(platform){
 let raw=null,time=1000000,refreshes=0;
 const storage={get:async()=>raw,set:async v=>{raw=v},remove:async()=>{raw=null}};
 const value={token:'access',name:'Test Owner',client:platform,expires_at:time/1000+(platform==='web'?3600:900),...(platform==='mobile'?{refresh_token:'opaque-device-credential'}:{})};
 const fetcher=async(url,options)=>{
  if(url.endsWith('/auth/login'))return ok(value);
  if(url.endsWith('/auth/refresh')){refreshes++;return ok({...value,token:'renewed',expires_at:time/1000+900})}
  if(url.endsWith('/auth/logout'))return ok(null,204);
  return ok({name:'Test Owner'});
 };
 return {storage,value,fetcher,clock:()=>time,advance:ms=>{time+=ms},raw:()=>raw,count:()=>refreshes,
  make:()=>new SessionClient(storage,platform,'http://test',fetcher,()=>time)};
}

test('web reload preserves login and the original absolute one-hour expiry',async()=>{
 const f=fixture('web'),first=f.make();await first.authenticate('login',{});
 f.advance(30*60*1000);
 const reloaded=f.make();assert.equal((await reloaded.restore()).name,'Test Owner');
 assert.equal(reloaded.current.expires_at,f.value.expires_at);
 f.advance(30*60*1000);
 await assert.rejects(()=>reloaded.ensure(),/one-hour/);
 assert.equal(reloaded.current,null);assert.equal(f.raw(),null);assert.equal(f.count(),0);
});

test('mobile restart after a long absence renews without a login',async()=>{
 const f=fixture('mobile');await f.make().authenticate('login',{});f.advance(365*86400000);
 const restarted=f.make();assert.equal((await restarted.restore()).name,'Test Owner');
 assert.equal(restarted.current.token,'renewed');assert.equal(f.count(),1);
});

test('simultaneous expired mobile requests share a single renewal',async()=>{
 const f=fixture('mobile'),client=f.make();await client.authenticate('login',{});f.advance(901000);
 await Promise.all([client.request('/api/state'),client.request('/auth/me'),client.headers()]);
 assert.equal(f.count(),1);
});

test('manual logout clears persistent storage and notifies the UI',async()=>{
 const f=fixture('mobile'),client=f.make();await client.authenticate('login',{});
 let seen='initial';client.subscribe(s=>{seen=s});await client.logout();
 assert.equal(seen,null);assert.equal(f.raw(),null);assert.equal(await f.make().restore(),null);
});

test('temporary mobile network failure retains the stored session for retry',async()=>{
 const f=fixture('mobile');await f.make().authenticate('login',{});f.advance(901000);
 const offline=new SessionClient(f.storage,'mobile','http://test',async()=>{throw Error('offline')},f.clock);
 assert.equal((await offline.restore()).name,'Test Owner');assert.notEqual(f.raw(),null);
});

test('revoked mobile renewal clears the session instead of retrying forever',async()=>{
 const f=fixture('mobile');await f.make().authenticate('login',{});f.advance(901000);
 const revoked=new SessionClient(f.storage,'mobile','http://test',async()=>ok({detail:'revoked'},401),f.clock);
 assert.equal(await revoked.restore(),null);assert.equal(f.raw(),null);
});

test('web reload after one hour cannot resurrect an expired login',async()=>{
 const f=fixture('web');await f.make().authenticate('login',{});f.advance(3601000);
 assert.equal(await f.make().restore(),null);assert.equal(f.raw(),null);assert.equal(f.count(),0);
});

test('a mobile access-token rejection renews and retries the original request',async()=>{
 const f=fixture('mobile');let attempts=0;
 const client=new SessionClient(f.storage,'mobile','http://test',async(url,options)=>{
  if(url.endsWith('/api/state')){attempts++;return attempts===1?ok({detail:'expired'},401):ok({customers:[]})}
  return f.fetcher(url,options);
 },f.clock);
 await client.authenticate('login',{});assert.deepEqual(await client.request('/api/state'),{customers:[]});
 assert.equal(attempts,2);assert.equal(f.count(),1);
});

test('default fetch retains the global receiver for login, restore, renewal and logout',async(t)=>{
 const f=fixture('mobile');let calls=0;
 t.mock.method(globalThis,'fetch',function(url,options){
  if(this!==globalThis)throw new TypeError('Illegal invocation');
  calls++;return f.fetcher(url,options);
 });
 const client=new SessionClient(f.storage,'mobile','http://test',undefined,f.clock);
 await client.authenticate('login',{});
 await client.request('/api/state');
 f.advance(901000);
 const restarted=new SessionClient(f.storage,'mobile','http://test',undefined,f.clock);
 assert.equal((await restarted.restore()).name,'Test Owner');
 await restarted.logout();
 assert.ok(calls>=5);assert.equal(f.raw(),null);
});

test('HTTP diagnostics correlate failures without logging credentials or query values',async(t)=>{
 const f=fixture('web'),events=[];
 for(const level of ['info','warn','error'])t.mock.method(console,level,(...args)=>events.push(args));
 f.value.token='JWT_SECRET_DO_NOT_LOG';
 const client=new SessionClient(f.storage,'web','http://api.test',async(url,options)=>{
  assert.match(options.headers.get('X-Request-ID'),/^[a-f0-9-]{36}$/);
  if(url.includes('/api/state'))return new Response(JSON.stringify({detail:'Test validation failure'}),{status:422,headers:{'X-Request-ID':'server-correlation-id'}});
  return f.fetcher(url,options);
 },f.clock);
 client.diagnostics=true;
 await client.authenticate('login',{password:'PASSWORD_SECRET_DO_NOT_LOG'});
 await assert.rejects(()=>client.request('/api/state?secret=QUERY_SECRET_DO_NOT_LOG'),/422; request ID: server-correlation-id/);
 const text=JSON.stringify(events);
 assert.ok(text.includes('server-correlation-id'));assert.ok(text.includes('request.completed'));
 for(const secret of ['JWT_SECRET_DO_NOT_LOG','PASSWORD_SECRET_DO_NOT_LOG','QUERY_SECRET_DO_NOT_LOG'])assert.ok(!text.includes(secret));
});

test('network failures identify the target endpoint without leaking raw error values',async(t)=>{
 const events=[];for(const level of ['info','error'])t.mock.method(console,level,(...args)=>events.push(args));
 const f=fixture('web');
 const client=new SessionClient(f.storage,'web','http://api.test',async()=>{throw Error('RAW_PASSWORD_SECRET')},f.clock);
 client.diagnostics=true;
 await assert.rejects(()=>client.authenticate('login',{}),/POST http:\/\/api.test\/auth\/login: could not reach the API/);
 assert.ok(JSON.stringify(events).includes('request.network_error'));
 assert.ok(!JSON.stringify(events).includes('RAW_PASSWORD_SECRET'));
});

test('profile name changes persist across reload without extending session expiry',async()=>{
 const f=fixture('web'),client=f.make();await client.authenticate('login',{});
 const expires=client.current.expires_at,token=client.current.token;
 await client.updateName('New Display Name');
 assert.equal(JSON.parse(f.raw()).name,'New Display Name');
 assert.equal(client.current.expires_at,expires);assert.equal(client.current.token,token);
 // Server is the source of truth when restoring a session edited on another device.
 const restored=new SessionClient(f.storage,'web','http://test',async()=>ok({name:'Server Display Name'}),f.clock);
 assert.equal((await restored.restore()).name,'Server Display Name');
 assert.equal(restored.current.expires_at,expires);
});
