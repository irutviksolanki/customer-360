import os
from datetime import datetime, timedelta, timezone, date
from uuid import uuid4
import jwt
import psycopg
from psycopg.rows import dict_row
from pwdlib import PasswordHash
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from backend import sessions
from backend.diagnostics import configure, RequestDiagnostics

load_dotenv()
configure()
app = FastAPI(title='Customer360 by Welspun GCC API', version='0.1.0',
    description='''Customer 360 API. Register or log in under Authentication, copy the returned `token`, click **Authorize**, and paste the token without the Bearer prefix. Web sessions last one hour; mobile sessions use `/auth/refresh`. Logout revokes the current device. Every response includes `X-Request-ID`; match it in `.local/logs/api.log`. Request bodies and credentials are excluded from logs.''',
    swagger_ui_parameters={'displayRequestDuration':True,'persistAuthorization':False})
app.add_middleware(CORSMiddleware, allow_origins=[ "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://192.168.31.41:8081", *[origin.strip() for origin in os.getenv('WEB_ORIGIN','').split(',') if origin.strip()]], allow_methods=['*'], allow_headers=['*'],expose_headers=['X-Request-ID'])
# Added last so diagnostics also wraps CORS preflight failures.
app.add_middleware(RequestDiagnostics)

@app.exception_handler(RequestValidationError)
async def validation_error(request:Request, exc:RequestValidationError):
    request.state.validation=[{'field':'.'.join(map(str,e['loc'])),'type':e['type']} for e in exc.errors()]
    # FastAPI normally echoes the invalid input, including login passwords.
    errors=[{'loc':e['loc'],'msg':e['msg'],'type':e['type']} for e in exc.errors()]
    return JSONResponse({'detail':errors,'request_id':request.state.request_id},status_code=422)
passwords = PasswordHash.recommended()
bearer = HTTPBearer(bearerFormat='JWT',description='Paste the token returned by /auth/login or /auth/register.')

def connection():
    return psycopg.connect(os.environ['DATABASE_URL'], row_factory=dict_row)

def secret():
    value = os.environ.get('JWT_SECRET','')
    if len(value)<32 or value.startswith('REPLACE_'):
        raise RuntimeError('Configure JWT_SECRET with a random secret')
    return value

def user(auth: HTTPAuthorizationCredentials = Depends(bearer)):
    with connection() as c:
        return str(sessions.validate(c,auth.credentials,secret())['owner_id'])

def db(uid=Depends(user)):
    with connection() as c:
        c.execute("SELECT set_config('app.user_id', %s, true)",(uid,))
        yield c

class Credentials(BaseModel):
    email: str = Field(min_length=5,max_length=254)
    password: str = Field(min_length=10,max_length=128,json_schema_extra={'format':'password'})
    name: str = Field(default='',max_length=100)
    client: Literal['web','mobile'] = 'web'

def session(row, client='web'):
    with connection() as c:
        return sessions.create(c,row,client,secret())

class SessionResponse(BaseModel):
    token: str
    name: str
    expires_at: int
    client: Literal['web','mobile']
    user_id: str
    session_id: str
    refresh_token: str | None = None

@app.post('/auth/register',status_code=201,tags=['Authentication'],response_model=SessionResponse,response_model_exclude_none=True)
def register(body: Credentials):
    if '@' not in body.email or not body.name.strip():
        raise HTTPException(422,'A name and valid email are required')
    with connection() as c:
        try:
            row=c.execute('INSERT INTO users VALUES(%s,%s,%s,%s) RETURNING *',(str(uuid4()),body.email.strip().lower(),body.name.strip(),passwords.hash(body.password))).fetchone()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(409,'Email is already registered')
    return session(row,body.client)

@app.post('/auth/login',tags=['Authentication'],response_model=SessionResponse,response_model_exclude_none=True)
def login(body: Credentials):
    with connection() as c:
        row=c.execute('SELECT * FROM users WHERE email=%s',(body.email.strip().lower(),)).fetchone()
    if not row or not passwords.verify(body.password,row['password_hash']):
        raise HTTPException(401,'Email or password is incorrect')
    return session(row,body.client)

class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1,max_length=512)

@app.post('/auth/refresh',tags=['Authentication'],response_model=SessionResponse,response_model_exclude_none=True)
def refresh_session(body:RefreshRequest):
    with connection() as c:
        return sessions.refresh(c,body.refresh_token,secret())

@app.get('/auth/me',tags=['Authentication'])
def me(uid=Depends(user)):
    with connection() as c:
        return c.execute('SELECT id,name FROM users WHERE id=%s',(uid,)).fetchone()

@app.post('/auth/logout',status_code=204,tags=['Authentication'])
def logout(auth:HTTPAuthorizationCredentials=Depends(bearer)):
    with connection() as c:
        row=sessions.validate(c,auth.credentials,secret())
        c.execute('UPDATE app_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=%s',(row['id'],))

class Customer(BaseModel):
    name: str = Field(min_length=1,max_length=200)
    business_unit: str = ''
    stakeholders: str = ''

@app.get('/customers')
def customers(c=Depends(db)):
    return c.execute('SELECT * FROM customers ORDER BY name').fetchall()

@app.post('/customers',status_code=201)
def customer(body:Customer,uid=Depends(user),c=Depends(db)):
    return c.execute('INSERT INTO customers VALUES(%s,%s,%s,%s,%s) RETURNING *',(str(uuid4()),uid,body.name,body.business_unit,body.stakeholders)).fetchone()

class Meeting(BaseModel):
    meeting_date: date
    summary: str = Field(min_length=1,max_length=10000)
    sentiment: Literal['positive','neutral','concerned','critical']
    concerns: str = ''
    appreciation: str = ''
    action: str = ''
    due_date: date | None = None

@app.get('/customers/{cid}/brief')
def brief(cid:str,c=Depends(db)):
    customer=c.execute('SELECT * FROM customers WHERE id=%s',(cid,)).fetchone()
    if not customer: raise HTTPException(404,'Customer not found')
    return {'customer':customer,'meetings':c.execute('SELECT * FROM meetings WHERE customer_id=%s ORDER BY meeting_date DESC',(cid,)).fetchall(),'actions':c.execute('SELECT *, (due_date < CURRENT_DATE AND status <> \'closed\') AS overdue FROM actions WHERE customer_id=%s ORDER BY due_date',(cid,)).fetchall()}

@app.post('/customers/{cid}/meetings',status_code=201)
def meeting(cid:str,body:Meeting,uid=Depends(user),c=Depends(db)):
    if not c.execute('SELECT id FROM customers WHERE id=%s',(cid,)).fetchone(): raise HTTPException(404,'Customer not found')
    if body.action.strip() and not body.due_date: raise HTTPException(422,'Action due date is required')
    row=c.execute('INSERT INTO meetings VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *',(str(uuid4()),uid,cid,body.meeting_date,body.summary,body.sentiment,body.concerns,body.appreciation)).fetchone()
    if body.action.strip(): c.execute('INSERT INTO actions(id,owner_id,customer_id,description,due_date) VALUES(%s,%s,%s,%s,%s)',(str(uuid4()),uid,cid,body.action,body.due_date))
    return row

class UpdateAction(BaseModel):
    status: Literal['open','in progress','closed']
    closure_remarks: str = ''

@app.patch('/actions/{aid}')
def action(aid:str,body:UpdateAction,c=Depends(db)):
    if body.status=='closed' and not body.closure_remarks.strip(): raise HTTPException(422,'Closure remarks are required')
    row=c.execute('UPDATE actions SET status=%s, closure_remarks=%s WHERE id=%s RETURNING *',(body.status,body.closure_remarks,aid)).fetchone()
    if not row: raise HTTPException(404,'Action not found')
    return row

@app.get('/health',tags=['System'])
def health():
    with connection() as c: c.execute('SELECT 1')
    return {'status':'ok'}

# Import after dependencies above are defined to share authentication and RLS transactions.
from backend.sites_ui import router as sites_ui_router
app.include_router(sites_ui_router)

from backend.profiles import router as profiles_router
app.include_router(profiles_router)
