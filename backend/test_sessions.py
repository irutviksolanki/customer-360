"""Real PostgreSQL auth tests. All test users and sessions are rolled back."""
from contextlib import contextmanager
from datetime import timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from backend import main, sessions


@pytest.fixture
def auth(monkeypatch):
    c=main.connection()
    @contextmanager
    def test_connection():
        yield c
    monkeypatch.setattr(main,'connection',test_connection)
    with TestClient(main.app) as client:
        yield client,c
    c.rollback();c.close()


def register(client,platform):
    r=client.post('/auth/register',json={'name':'Session Test','email':str(uuid4())+'@example.test','password':'Test-only-password-123','client':platform})
    assert r.status_code==201
    return r.json()


def headers(session):
    return {'Authorization':'Bearer '+session['token']}


def test_web_session_is_one_hour_and_not_refreshable(auth):
    client,c=auth
    s=register(client,'web')
    claims=jwt.decode(s['token'],main.secret(),algorithms=['HS256'],audience=sessions.AUDIENCE,issuer=sessions.ISSUER)
    assert 3599<=claims['exp']-claims['iat']<=3601
    assert 'refresh_token' not in s
    assert client.get('/auth/me',headers=headers(s)).status_code==200
    # Even a valid signed JWT cannot outlive the web session's database expiry.
    c.execute('UPDATE app_sessions SET expires_at=%s WHERE id=%s',(sessions.now()-timedelta(seconds=1),claims['sid']))
    assert client.get('/api/state',headers=headers(s)).status_code==401


def test_mobile_renewal_survives_access_expiry_and_logout_revokes_both(auth):
    client,c=auth
    s=register(client,'mobile')
    claims=jwt.decode(s['token'],main.secret(),algorithms=['HS256'],audience=sessions.AUDIENCE)
    assert 899<=claims['exp']-claims['iat']<=901
    row=c.execute('SELECT * FROM app_sessions WHERE id=%s',(claims['sid'],)).fetchone()
    assert row['expires_at'] is None
    assert row['refresh_hash']!=s['refresh_token']
    expired={**claims,'exp':sessions.now()-timedelta(seconds=1)}
    assert client.get('/auth/me',headers={'Authorization':'Bearer '+jwt.encode(expired,main.secret(),algorithm='HS256')}).status_code==401
    r=client.post('/auth/refresh',json={'refresh_token':s['refresh_token']})
    assert r.status_code==200
    renewed=r.json()
    assert client.get('/auth/me',headers=headers(renewed)).status_code==200
    assert client.post('/auth/logout',headers=headers(renewed)).status_code==204
    assert client.get('/auth/me',headers=headers(s)).status_code==401
    assert client.get('/auth/me',headers=headers(renewed)).status_code==401
    assert client.post('/auth/refresh',json={'refresh_token':s['refresh_token']}).status_code==401


def test_mobile_refresh_is_not_usable_by_another_account(auth):
    client,c=auth
    first=register(client,'mobile');second=register(client,'mobile')
    parts=first['refresh_token'].split('.')
    parts[0]=second['refresh_token'].split('.')[0]
    assert client.post('/auth/refresh',json={'refresh_token':'.'.join(parts)}).status_code==401
    assert client.post('/auth/refresh',json={'refresh_token':'invalid'}).status_code==401
    assert client.post('/auth/refresh',json={'refresh_token':second['refresh_token']}).status_code==200


def test_logout_only_ends_the_selected_device_session(auth):
    client,c=auth
    first=register(client,'mobile')
    uid=jwt.decode(first['token'],main.secret(),algorithms=['HS256'],audience=sessions.AUDIENCE)['sub']
    owner=c.execute('SELECT * FROM users WHERE id=%s',(uid,)).fetchone()
    second=sessions.create(c,owner,'web',main.secret())
    assert client.post('/auth/logout',headers=headers(second)).status_code==204
    assert client.get('/auth/me',headers=headers(second)).status_code==401
    assert client.get('/auth/me',headers=headers(first)).status_code==200
