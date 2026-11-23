from backend.test_sessions import auth, register, headers
from backend import main


def test_profile_defaults_and_updates_persist_without_relogin(auth):
    client,c=auth
    session=register(client,'web')
    response=client.get('/profile',headers=headers(session))
    assert response.status_code==200
    original=response.json()
    assert original['name']=='Session Test'
    assert original['designation']=='' and original['phone']==''
    assert 'password_hash' not in original
    changes={'name':'Updated Name','designation':'Finance Lead','department':'Finance',
             'phone':'+91 98765 43210','location':'Mumbai'}
    saved=client.patch('/profile',json=changes,headers=headers(session))
    assert saved.status_code==200
    assert all(saved.json()[key]==value for key,value in changes.items())
    assert saved.json()['email']==original['email']
    assert client.get('/profile',headers=headers(session)).json()==saved.json()
    assert client.get('/auth/me',headers=headers(session)).json()['name']=='Updated Name'
    # The original JWT is still accepted: profile edits don't replace the session.
    assert client.get('/api/state',headers=headers(session)).status_code==200


def test_profile_is_private_and_cannot_change_another_account(auth):
    client,c=auth
    first=register(client,'mobile');second=register(client,'web')
    own=client.patch('/profile',json={'name':'First User','location':'First location'},headers=headers(first))
    assert own.status_code==200
    assert client.get('/profile',headers=headers(second)).json()['location']==''
    assert c.execute('SELECT * FROM user_profiles WHERE owner_id=%s',(first['user_id'],)).fetchone() is None
    response=client.patch('/profile',json={'name':'Hijack','owner_id':first['user_id']},headers=headers(second))
    assert response.status_code==422
    assert client.get('/profile',headers=headers(first)).json()['name']=='First User'
    assert client.get('/profile/'+first['user_id'],headers=headers(second)).status_code==404


def test_profile_validation_readonly_email_and_authentication(auth):
    client,c=auth
    assert client.get('/profile').status_code in (401,403)
    session=register(client,'web')
    for changes in ({'name':'   '},{'name':'Valid','phone':'abc'},
                    {'name':'Valid','email':'replacement@example.test'},
                    {'name':'Valid','designation':'x'*101}):
        assert client.patch('/profile',json=changes,headers=headers(session)).status_code==422
    assert client.get('/profile',headers=headers(session)).json()['name']=='Session Test'
