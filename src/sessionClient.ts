export type Session={token:string;name:string;expires_at:number;client:'web'|'mobile';refresh_token?:string;user_id?:string;session_id?:string};
type Storage={get:()=>Promise<string|null>;set:(v:string)=>Promise<void>;remove:()=>Promise<void>};
type Fetcher=(url:string,options?:RequestInit)=>Promise<Response>;
// Window.fetch requires the Window receiver. Never store the bare native method
// on a client instance, where `this.fetcher()` would give it the wrong receiver.
const globalFetch:Fetcher=(url,options)=>globalThis.fetch(url,options);

export class SessionClient {
  diagnostics=false;
  timeoutMs=30000;
  private responses=new WeakMap<Response,{method:string;url:string;request_id:string}>();
  current:Session|null=null;
  private listeners=new Set<(value:Session|null)=>void>();
  private renewal:Promise<void>|null=null;
  private generation=0;
  private persistence=Promise.resolve();
  constructor(private storage:Storage,private platform:'web'|'mobile',private base:string,private fetcher:Fetcher=globalFetch,private clock=()=>Date.now()){}
  private async send(path:string,options:RequestInit={},transport:Fetcher=this.fetcher){
    const method=options.method||'GET',started=Date.now();
    const request_id=globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
    let url='[invalid API address]';
    try{const parsed=new URL(this.base+path);url=parsed.origin+parsed.pathname}catch{}
    const context={method,url,request_id,platform:this.platform};
    const log=(level:'info'|'warn'|'error',fields:Record<string,unknown>)=>{if(this.diagnostics)console[level]('[GCC360 API]',{...context,...fields})};
    const controller=new AbortController();
    const abort=()=>controller.abort();
    if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(abort,this.timeoutMs);
    log('info',{event:'request.started'});
    try{
      const headers=new Headers(options.headers);headers.set('X-Request-ID',request_id);
      const response=await transport(this.base+path,{...options,headers,signal:controller.signal});
      const serverId=response.headers.get('X-Request-ID')||request_id;
      this.responses.set(response,{method,url,request_id:serverId});
      log(response.status>=500?'error':response.ok?'info':'warn',{event:'request.completed',request_id:serverId,status:response.status,duration_ms:Date.now()-started});
      return response;
    }catch(error){
      const timedOut=controller.signal.aborted;
      log('error',{event:timedOut?'request.aborted':'request.network_error',duration_ms:Date.now()-started,error_type:error instanceof Error?error.name:'UnknownError',hint:'Check the API host/port, backend process, LAN/firewall and browser CORS. A network failure may never reach the backend.'});
      throw Error(`${method} ${url}: ${timedOut?'request timed out or was cancelled':'could not reach the API'}. Check the backend address, network and CORS. Request ID: ${request_id}`);
    }finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',abort)}
  }
  subscribe(fn:(value:Session|null)=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  private emit(){this.listeners.forEach(fn=>fn(this.current))}
  private write(operation:()=>Promise<void>){const pending=this.persistence.then(operation,operation);this.persistence=pending.catch(()=>{});return pending}
  private async save(value:Session){const version=this.generation;await this.write(async()=>{if(version!==this.generation)return;await this.storage.set(JSON.stringify(value));if(version===this.generation){this.current=value;this.emit()}})}
  async clear(){this.generation++;this.current=null;this.emit();await this.write(()=>this.storage.remove())}
  async updateName(name:string){if(this.current)await this.save({...this.current,name})}
  private async json(response:Response){
    try{return await response.json()}catch{
      const context=this.responses.get(response);
      if(this.diagnostics)console.error('[GCC360 API]',{event:'response.invalid_json',...context,status:response.status});
      throw Error(`The API returned invalid JSON (${response.status}; request ID: ${context?.request_id||'unavailable'}). Check the backend or proxy response.`);
    }
  }
  private async error(response:Response):Promise<never>{
    const data=await response.json().catch(()=>({}));
    const message=typeof data.detail==='string'?data.detail:Array.isArray(data.detail)?data.detail.map((e:any)=>`${e.loc.slice(1).join('.')}: ${e.msg}`).join('; '):'Unable to complete the request. Please retry.';
    const context=this.responses.get(response);
    throw Error(context?`${message} (${response.status}; request ID: ${context.request_id})`:message);
  }
  async restore(){
    const version=this.generation;
    await this.persistence;
    const raw=await this.storage.get();
    if(version!==this.generation)return this.current;
    if(!raw){if(this.current)await this.clear();return null}
    let value:Session;
    try{value=JSON.parse(raw);if(!value.token||typeof value.name!=='string'||!Number.isFinite(value.expires_at)||value.client!==this.platform||(this.platform==='mobile'&&!value.refresh_token))throw Error()}catch{await this.clear();return null}
    this.current=value;
    try{await this.ensure();}catch(e){if(!this.current)return null;this.emit();return this.current}
    // An offline restart preserves the stored mobile session; API errors can be retried.
    try{const r=await this.authorizedFetch('/auth/me');if(!r.ok)await this.error(r);const account=await this.json(r);if(account.name&&this.current&&account.name!==this.current.name)await this.updateName(account.name)}catch(e){if(!this.current)return null}
    this.emit();return this.current;
  }
  async authenticate(mode:'login'|'register',body:any){
    const response=await this.send('/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,client:this.platform})});
    if(!response.ok)return this.error(response);
    const value:Session=await this.json(response);this.generation++;await this.save(value);return value;
  }
  private async refresh(){
    if(this.renewal)return this.renewal;
    const saved=this.current,version=this.generation;
    if(!saved?.refresh_token){await this.clear();throw Error('Please sign in again.')}
    this.renewal=(async()=>{
      const response=await this.send('/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:saved.refresh_token})});
      if(version!==this.generation)throw Error('Session changed');
      if(!response.ok){if(response.status===401)await this.clear();return this.error(response)}
      const value=await this.json(response);if(version===this.generation)await this.save(value);
    })().finally(()=>{this.renewal=null});
    return this.renewal;
  }
  async ensure(){
    const saved=this.current;
    if(!saved)throw Error('Please sign in again.');
    if(saved.expires_at*1000>this.clock()+(this.platform==='mobile'?30000:0))return;
    if(this.platform==='web'){await this.clear();throw Error('Your one-hour session ended. Please sign in again.')}
    await this.refresh();
  }
  async headers(){await this.ensure();return {Authorization:`Bearer ${this.current!.token}`}}
  async authorizedFetch(path:string,options:RequestInit={},fetcher:Fetcher=this.fetcher){
    const version=this.generation;
    let response=await this.send(path,{...options,headers:{...options.headers,...await this.headers()}},fetcher);
    if(response.status===401&&version===this.generation&&this.current){
      if(this.platform==='mobile'){
        await this.refresh();
        response=await this.send(path,{...options,headers:{...options.headers,...await this.headers()}},fetcher);
      }
      if(response.status===401&&version===this.generation)await this.clear();
    }
    return response;
  }
  async request(path:string,method='GET',body?:any){
    const r=await this.authorizedFetch(path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(!r.ok)return this.error(r);return r.status===204?null:this.json(r);
  }
  async logout(){
    if(!this.current)return;
    try{await this.request('/auth/logout','POST')}catch(e){if(this.current)throw e}
    await this.clear();
  }
}
