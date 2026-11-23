"""Request diagnostics without bodies, headers, query values, or exception values."""
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import sys
import time
import traceback
from uuid import UUID, uuid4

from starlette.responses import JSONResponse

LOG_PATH = Path(__file__).resolve().parent.parent / '.local' / 'logs' / 'api.log'
logger = logging.getLogger('gcc360.api')


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({'time':self.formatTime(record), 'level':record.levelname,'pid':os.getpid(),
                           **record.diagnostic}, default=str)


def configure():
    if logger.handlers:
        return
    logger.setLevel(getattr(logging, os.getenv('API_LOG_LEVEL','INFO').upper(), logging.INFO))
    logger.propagate = False
    handlers=[logging.StreamHandler(sys.stdout)]
    # Serverless deployments have a read-only application filesystem. Their
    # stdout is captured by the provider's runtime logs instead.
    if not os.getenv('VERCEL'):
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(RotatingFileHandler(LOG_PATH,maxBytes=5_000_000,backupCount=3,encoding='utf-8'))
    for handler in handlers:
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)


def event(level, name, **fields):
    logger.log(level,name,extra={'diagnostic':{'event':name,**fields}})


class RequestDiagnostics:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type']!='http':
            return await self.app(scope,receive,send)
        started=time.perf_counter()
        headers=dict(scope.get('headers',[]))
        try:
            request_id=str(UUID(headers.get(b'x-request-id',b'').decode('ascii')))
        except (ValueError,UnicodeDecodeError):
            request_id=str(uuid4())
        state=scope.setdefault('state',{})
        state['request_id']=request_id
        status=500
        sent=False
        fields={'request_id':request_id,'method':scope['method'],'path':scope['path']}
        event(logging.INFO,'request.started',**fields)

        async def traced_send(message):
            nonlocal status,sent
            if message['type']=='http.response.start':
                status=message['status'];sent=True
                message['headers']=[(key,value) for key,value in message.get('headers',[]) if key.lower()!=b'x-request-id']+[(b'x-request-id',request_id.encode())]
            await send(message)

        try:
            await self.app(scope,receive,traced_send)
        except Exception as exc:
            # DB errors can contain passwords, SQL parameters and customer data.
            # Record exception class + SQLSTATE and stack locations, never str(exc).
            trace=[{'file':frame.filename,'line':frame.lineno,'function':frame.name}
                   for frame in traceback.extract_tb(exc.__traceback__)]
            causes=[]
            current=exc
            while current is not None and len(causes)<5:
                sqlstate=getattr(current,'sqlstate',None)
                hints={'42P01':'Missing table: check database migrations','42703':'Missing column: check database migrations',
                       '42501':'Database permission or RLS policy denied access','28P01':'Database login failed: check local credentials',
                       '23505':'Unique constraint conflict','23503':'Referenced record does not exist','23514':'Database check constraint failed'}
                causes.append({'type':type(current).__name__,'sqlstate':sqlstate,'hint':hints.get(sqlstate)})
                current=current.__cause__ or current.__context__
            event(logging.ERROR,'request.exception',**fields,error_type=type(exc).__name__,causes=causes,trace=trace)
            if sent:
                # Response already started: preserve streaming semantics.
                raise
            response=JSONResponse({'detail':'Internal server error. Share the request ID to locate the backend trace.','request_id':request_id},status_code=500)
            await response(scope,receive,traced_send)
        finally:
            reason={400:'Bad request; for OPTIONS check WEB_ORIGIN',401:'Authentication required, expired or revoked',403:'Access denied',404:'Route or record not found',422:'Validation failed',500:'Unhandled server error'}.get(status)
            event(logging.ERROR if status>=500 else logging.WARNING if status>=400 else logging.INFO,
                  'request.completed',**fields,status=status,duration_ms=round((time.perf_counter()-started)*1000,2),
                  route=getattr(scope.get('route'),'path',None),reason=reason,
                  validation=state.get('validation'))
