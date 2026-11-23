import logging
from uuid import UUID,uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.diagnostics import RequestDiagnostics, logger
from backend.main import app


class Capture(logging.Handler):
    def __init__(self):
        super().__init__();self.events=[]
    def emit(self,record):
        self.events.append(record.diagnostic)


def test_validation_logs_fields_but_never_passwords_or_query_values():
    capture=Capture();logger.addHandler(capture)
    try:
        with TestClient(app) as client:
            rid=str(uuid4())
            r=client.post('/auth/login?secret=QUERY_SECRET',json={'email':'x','password':'PWSECRET'},headers={'X-Request-ID':rid,'Authorization':'Bearer TOKEN_SECRET'})
            assert r.status_code==422
            assert r.headers['X-Request-ID']==rid
            assert 'input' not in str(r.json())
        assert any(e.get('validation') for e in capture.events)
        text=str(capture.events)
        for value in ['QUERY_SECRET','PWSECRET','TOKEN_SECRET']:
            assert value not in text
    finally:logger.removeHandler(capture)


def test_exception_includes_trace_and_request_id_but_not_exception_values():
    capture=Capture();logger.addHandler(capture)
    isolated=FastAPI();isolated.add_middleware(RequestDiagnostics)
    @isolated.get('/failure')
    def fail():raise RuntimeError('DATABASE_PASSWORD_SECRET')
    try:
        with TestClient(isolated) as client:
            r=client.get('/failure')
        assert r.status_code==500
        assert r.json()['request_id']==r.headers['X-Request-ID']
        UUID(r.headers['X-Request-ID'])
        event=next(e for e in capture.events if e['event']=='request.exception')
        assert event['error_type']=='RuntimeError'
        assert any(f['function']=='fail' for f in event['trace'])
        assert 'DATABASE_PASSWORD_SECRET' not in str(capture.events)+r.text
    finally:logger.removeHandler(capture)


def test_swagger_and_openapi_include_jwt_security_and_cors_request_ids():
    with TestClient(app) as client:
        assert client.get('/docs').status_code==200
        spec=client.get('/openapi.json').json()
        assert spec['components']['securitySchemes']['HTTPBearer']['bearerFormat']=='JWT'
        assert '/auth/login' in spec['paths'] and '/api/state' in spec['paths']
        r=client.options('/auth/login',headers={'Origin':'http://unapproved.example','Access-Control-Request-Method':'POST'})
        assert r.status_code==400 and r.headers.get('X-Request-ID')
