"""Integration tests on the configured development PostgreSQL DB; all rows roll back."""
import os
from uuid import uuid4
import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg.rows import dict_row
from backend.main import app, db, user

@pytest.fixture
def workspace():
    c=psycopg.connect(os.environ['DATABASE_URL'],row_factory=dict_row)
    actor=[str(uuid4())]
    other=str(uuid4())
    for uid in [actor[0],other]:
        c.execute('INSERT INTO users VALUES(%s,%s,%s,%s)',(uid,uid+'@example.test','Test Owner','not-a-login-hash'))
    def test_db():
        c.execute("SELECT set_config('app.user_id',%s,true)",(actor[0],))
        yield c
    app.dependency_overrides[db]=test_db
    app.dependency_overrides[user]=lambda:actor[0]
    with TestClient(app) as client:
        yield client,c,actor,other
    app.dependency_overrides.clear()
    c.rollback();c.close()

def create(client):
    response=client.post('/api/customers',json={'name':'UI test account','unit':'Finance'})
    assert response.status_code==200,response.text
    return response.json()['record']['id']

def test_capture_draft_submit_and_close(workspace):
    client,_,_,_=workspace
    cid=create(client)
    body={'customer':cid,'date':'2026-11-22','type':'Review','participants':'Owner, Customer','summary':'Discussed month end','sentiment':'Concerned','category':'Concern','feedback':'Need faster reporting','function':'Finance','followup':True,'description':'Improve reporting','owner':'Test Owner','due':'2026-11-30','priority':'High','status':'Draft'}
    draft=client.post('/api/interactions',json=body)
    assert draft.status_code==200,draft.text
    body.update(id=draft.json()['record']['id'],status='Submitted')
    assert client.post('/api/interactions',json=body).status_code==200
    assert client.post('/api/interactions',json=body).status_code==200
    state=client.get('/api/state').json()
    actions=[a for a in state['actions'] if a['customer']==cid]
    assert len(actions)==1
    action=actions[0]
    assert client.post('/api/actions/'+action['id'],json={**action,'status':'Closed'}).status_code==422
    assert client.post('/api/actions/'+action['id'],json={**action,'status':'Closed','closure':'Delivered','confirmation':True}).status_code==200
    assert any(a['id']==action['id'] and a['status']=='Closed' for a in client.get('/api/state').json()['actions'])

def test_database_ownership_and_cross_customer_access(workspace):
    client,c,actor,other=workspace
    cid=create(client)
    actor[0]=other
    assert cid not in [r['id'] for r in client.get('/api/state').json()['customers']]
    assert c.execute('SELECT * FROM customers WHERE id=%s',(cid,)).fetchone() is None
    response=client.post('/api/customers',json={'id':cid,'name':'Hijack','unit':'Other'})
    assert response.status_code==404

def test_stakeholders_and_evidence_are_private(workspace):
    client,_,actor,other=workspace
    cid=create(client)
    assert client.post('/api/stakeholders',json={'customer':cid,'stakeholder':{'name':'Customer Person','role':'CFO'}}).status_code==200
    assert next(c for c in client.get('/api/state').json()['customers'] if c['id']==cid)['stakeholders'][0]['role']=='CFO'
    evidence=client.post('/api/evidence',content=b'test evidence',headers={'X-Filename':'evidence.txt'})
    assert evidence.status_code==200,evidence.text
    url=evidence.json()['url']
    assert client.get(url).content==b'test evidence'
    actor[0]=other
    assert client.get(url).status_code==404

def test_authentication_is_required():
    with TestClient(app) as client:
        assert client.get('/api/state').status_code in [401,403]
