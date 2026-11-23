"""Authenticated adapter for the imported Sites UI. Uses the existing core tables."""
from datetime import date
from uuid import UUID, uuid4
from urllib.parse import unquote, quote
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from psycopg.types.json import Jsonb
from backend.main import db, user

router = APIRouter(prefix='/api',tags=['Customer workspace'])

def valid_id(value):
    try: return str(UUID(str(value)))
    except (ValueError, TypeError): raise HTTPException(422, 'Invalid record ID')

def required(body, key):
    value=body.get(key)
    if not isinstance(value,str) or not value.strip(): raise HTTPException(422,f'{key} is required')
    return value.strip()[:10000]

def valid_date(body,key):
    value=required(body,key)
    try: date.fromisoformat(value)
    except ValueError: raise HTTPException(422,f'{key} must use YYYY-MM-DD')
    return value

def permitted(c,table,rid):
    # table names are supplied only by the fixed internal call sites below.
    row=c.execute(f'SELECT * FROM {table} WHERE id=%s',(valid_id(rid),)).fetchone()
    if not row: raise HTTPException(404,'Record not found')
    return row

def profile(c,uid):
    return c.execute('SELECT name FROM users WHERE id=%s',(uid,)).fetchone()['name']

def customer_view(row,name):
    extra=row['ui']
    return {**extra,'id':str(row['id']),'name':row['name'],'unit':row['business_unit'],
      'owner':extra.get('owner') or name,'location':extra.get('location',''),
      'initials':''.join(w[0] for w in row['name'].split()[:2]),'color':'#e7f2ec','ink':'#4d8770',
      'sentiment':'Neutral','criticality':extra.get('criticality','Standard'),
      'stakeholders':extra.get('stakeholders') or ([{'name':row['stakeholders'],'role':'Contact','function':'','location':'','criticality':'Medium'}] if row['stakeholders'] else [])}

def meeting_view(row,name):
    return {'type':'Customer connect','participants':name,'leader':name,'category':'Concern' if row['concerns'] else 'Appreciation','theme':'Service delivery','function':'Operations','status':'Submitted','feedbackEntries':[],
      **row['ui'],'id':str(row['id']),'customer':str(row['customer_id']),'date':row['meeting_date'].isoformat(),
      'summary':row['summary'],'sentiment':row['sentiment'].title(),'feedback':row['ui'].get('feedback',row['concerns'] or row['appreciation']), 'visibility':'Private'}

def action_view(row,name):
    return {'owner':name,'priority':'Medium','function':'Operations','meeting':'','updates':[],**row['ui'],
      'id':str(row['id']),'customer':str(row['customer_id']),'description':row['description'],'due':row['due_date'].isoformat(),
      'status':'Awaiting confirmation' if row['status']!='closed' and row['ui'].get('status')=='Awaiting confirmation' else row['status'].capitalize(),
      'closure':row['closure_remarks']}

@router.get('/state')
def state(uid=Depends(user),c=Depends(db)):
    name=profile(c,uid)
    return {'customers':[customer_view(r,name) for r in c.execute('SELECT * FROM customers ORDER BY name').fetchall()],
      'interactions':[meeting_view(r,name) for r in c.execute('SELECT * FROM meetings ORDER BY meeting_date DESC').fetchall()],
      'actions':[action_view(r,name) for r in c.execute('SELECT * FROM actions ORDER BY due_date').fetchall()],
      'upcoming':[],'settings':{},'audit':[{'id':str(r['id']),'customer':str(r['customer_id']),'event':r['event'],'text':r['note'],'date':r['created_on'].isoformat(),'owner':name} for r in c.execute('SELECT * FROM workspace_events ORDER BY created_on DESC').fetchall()]}

def audit(c,uid,cid,event,note):
    c.execute('INSERT INTO workspace_events(id,owner_id,customer_id,event,note) VALUES(%s,%s,%s,%s,%s)',(str(uuid4()),uid,cid,event,note))

@router.post('/customers')
def save_customer(body:dict,uid=Depends(user),c=Depends(db)):
    name=required(body,'name'); unit=required(body,'unit'); rid=body.get('id')
    if rid:
        old=permitted(c,'customers',rid)
        extra={**old['ui'],**body,'stakeholders':customer_view(old,profile(c,uid))['stakeholders']}
        row=c.execute('UPDATE customers SET name=%s,business_unit=%s,ui=%s WHERE id=%s RETURNING *',(name,unit,Jsonb(extra),rid)).fetchone()
    else:
        row=c.execute('INSERT INTO customers(id,owner_id,name,business_unit,ui) VALUES(%s,%s,%s,%s,%s) RETURNING *',(str(uuid4()),uid,name,unit,Jsonb({**body,'stakeholders':[]}))).fetchone()
    audit(c,uid,row['id'],'Customer profile saved',name)
    return {'ok':True,'record':customer_view(row,profile(c,uid))}

@router.post('/stakeholders')
def save_stakeholder(body:dict,uid=Depends(user),c=Depends(db)):
    row=permitted(c,'customers',body.get('customer')); stakeholder=body.get('stakeholder',{})
    required(stakeholder,'name');required(stakeholder,'role')
    contacts=customer_view(row,profile(c,uid))['stakeholders']; index=body.get('index')
    if type(index) is int and 0<=index<len(contacts): contacts[index]=stakeholder
    else: contacts.append(stakeholder)
    c.execute('UPDATE customers SET ui=%s,stakeholders=%s WHERE id=%s',(Jsonb({**row['ui'],'stakeholders':contacts}),', '.join(s['name'] for s in contacts),row['id']))
    audit(c,uid,row['id'],'Stakeholder saved',stakeholder['name'])
    return {'ok':True}

def create_action(c,uid,body,cid,meeting):
    description=required(body,'description');due=valid_date(body,'due');required(body,'owner')
    if body.get('priority') not in ['Low','Medium','High','Critical']: raise HTTPException(422,'Choose an action priority')
    rid=str(uuid4()); extra={**body,'meeting':str(meeting),'status':'Open','updates':[],'closure':''}
    c.execute('INSERT INTO actions(id,owner_id,customer_id,description,due_date,ui) VALUES(%s,%s,%s,%s,%s,%s)',(rid,uid,cid,description,due,Jsonb(extra)))
    return rid

@router.post('/interactions')
def save_meeting(body:dict,uid=Depends(user),c=Depends(db)):
    cid=permitted(c,'customers',body.get('customer'))['id'];day=valid_date(body,'date')
    if body.get('sentiment') not in ['Positive','Neutral','Concerned','Critical']: raise HTTPException(422,'Select a sentiment')
    draft=body.get('status')=='Draft'
    if not draft:
        for key in ['summary','type','participants']: required(body,key)
    rid=body.get('id'); previous=permitted(c,'meetings',rid) if rid else None
    if previous and previous['customer_id']!=cid: raise HTTPException(422,'An existing interaction cannot move to another customer')
    rid=str(previous['id']) if previous else str(uuid4())
    # Follow-up fields belong to the draft until first submission; editing a submitted meeting must not duplicate actions.
    if body.get('followup') and not draft and (not previous or previous['ui'].get('status')=='Draft'):
        create_action(c,uid,body,cid,rid)
    feedback=body.get('feedback','');category=body.get('category')
    values=(day,body.get('summary',''),body['sentiment'].lower(),feedback if category=='Concern' else '',feedback if category=='Appreciation' else '',Jsonb({**body,'visibility':'Private','status':'Draft' if draft else 'Submitted'}))
    if previous:
        c.execute('UPDATE meetings SET meeting_date=%s,summary=%s,sentiment=%s,concerns=%s,appreciation=%s,ui=%s WHERE id=%s',(*values,rid))
    else:
        c.execute('INSERT INTO meetings(meeting_date,summary,sentiment,concerns,appreciation,ui,id,owner_id,customer_id) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)',(*values,rid,uid,cid))
    audit(c,uid,cid,'Draft saved' if draft else 'Interaction captured',body.get('summary',''))
    return {'ok':True,'record':{'id':rid}}

@router.post('/actions')
def add_action(body:dict,uid=Depends(user),c=Depends(db)):
    cid=permitted(c,'customers',body.get('customer'))['id'];m=permitted(c,'meetings',body.get('meeting'))
    if m['customer_id']!=cid: raise HTTPException(422,'Source interaction must belong to this customer')
    rid=create_action(c,uid,body,cid,m['id']);audit(c,uid,cid,'Commitment added',body['description'])
    return {'ok':True,'record':{'id':rid}}

@router.post('/actions/{aid}')
def update_action(aid:UUID,body:dict,uid=Depends(user),c=Depends(db)):
    row=permitted(c,'actions',aid);due=valid_date(body,'due');required(body,'owner')
    status=body.get('status')
    if status not in ['Open','In progress','Awaiting confirmation','Closed']: raise HTTPException(422,'Invalid status')
    closure=body.get('closure','').strip()
    if status in ['Awaiting confirmation','Closed'] and not closure: raise HTTPException(422,'Closure notes are required')
    if status=='Closed' and body.get('confirmation') is not True: raise HTTPException(422,'Customer confirmation is required')
    if body.get('evidence'):
        permitted(c,'evidence',str(body['evidence']).split('/')[-1])
    extra={**row['ui'],**body,'updates':[*row['ui'].get('updates',[]),{'date':date.today().isoformat(),'text':body.get('update') or status}]}
    c.execute('UPDATE actions SET due_date=%s,status=%s,closure_remarks=%s,ui=%s WHERE id=%s',(due,'in progress' if status=='Awaiting confirmation' else status.lower(),closure,Jsonb(extra),aid))
    audit(c,uid,row['customer_id'],'Commitment updated',row['description']+' · '+status)
    return {'ok':True}

@router.post('/evidence')
async def upload(request:Request,uid=Depends(user),c=Depends(db)):
    name=unquote(request.headers.get('x-filename','evidence'))[:200]
    if name.rsplit('.',1)[-1].lower() not in ['pdf','png','jpg','jpeg','txt','docx']: raise HTTPException(422,'Use PDF, PNG, JPEG, TXT or DOCX')
    data=bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data)>5*1024*1024: raise HTTPException(413,'Choose a file smaller than 5 MB')
    rid=str(uuid4());c.execute('INSERT INTO evidence VALUES(%s,%s,%s,%s)',(rid,uid,name,bytes(data)))
    return {'url':'/api/evidence/'+rid,'name':name}

@router.get('/evidence/{eid}')
def download(eid:UUID,c=Depends(db)):
    row=permitted(c,'evidence',eid)
    return Response(bytes(row['content']),media_type='application/octet-stream',headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(row['name'],safe=''),'X-Content-Type-Options':'nosniff'})
