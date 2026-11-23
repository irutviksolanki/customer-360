"""Session contract: web expires after 1h; mobile refresh lasts until explicit revocation."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException

ISSUER = 'gcc360'
AUDIENCE = 'gcc360-app'


def now():
    return datetime.now(timezone.utc)


def scope(c, uid):
    c.execute("SELECT set_config('app.user_id',%s,true)", (str(uid),))


def encode_access(row, name, key, refresh_token=None):
    issued = now()
    expiry = row['expires_at'] if row['client']=='web' else issued+timedelta(minutes=15)
    claims = {'sub':str(row['owner_id']), 'sid':str(row['id']), 'iat':issued,
              'exp':expiry, 'iss':ISSUER, 'aud':AUDIENCE}
    result = {'token':jwt.encode(claims,key,algorithm='HS256'), 'name':name,
              'expires_at':int(expiry.timestamp()), 'client':row['client'],
              'user_id':str(row['owner_id']), 'session_id':str(row['id'])}
    if refresh_token:
        result['refresh_token'] = refresh_token
    return result


def create(c, owner, client, key):
    uid, sid = str(owner['id']), str(uuid4())
    scope(c, uid)
    refresh_token = f'{uid}.{sid}.{secrets.token_urlsafe(48)}' if client=='mobile' else None
    digest = hashlib.sha256(refresh_token.encode()).hexdigest() if refresh_token else None
    expiry = now()+timedelta(hours=1) if client=='web' else None
    row = c.execute('INSERT INTO app_sessions(id,owner_id,client,refresh_hash,expires_at) '
                    'VALUES(%s,%s,%s,%s,%s) RETURNING *', (sid,uid,client,digest,expiry)).fetchone()
    return encode_access(row,owner['name'],key,refresh_token)


def validate(c, token, key):
    try:
        claims = jwt.decode(token,key,algorithms=['HS256'],issuer=ISSUER,audience=AUDIENCE,
                            options={'require':['sub','sid','exp','iat']})
        uid, sid = str(UUID(claims['sub'])), str(UUID(claims['sid']))
    except (jwt.InvalidTokenError,ValueError,TypeError):
        raise HTTPException(401,'Session expired. Sign in again.')
    scope(c,uid)
    row = c.execute('SELECT * FROM app_sessions WHERE id=%s AND owner_id=%s', (sid,uid)).fetchone()
    if not row or row['revoked_at'] or (row['expires_at'] and row['expires_at']<=now()):
        raise HTTPException(401,'Session ended. Sign in again.')
    return row


def refresh(c, credential, key):
    try:
        uid, sid, _ = credential.split('.')
        uid, sid = str(UUID(uid)), str(UUID(sid))
    except (ValueError,AttributeError):
        raise HTTPException(401,'Invalid mobile session')
    scope(c,uid)
    row = c.execute('SELECT * FROM app_sessions WHERE id=%s AND owner_id=%s FOR UPDATE', (sid,uid)).fetchone()
    digest = hashlib.sha256(credential.encode()).hexdigest()
    if not row or row['client']!='mobile' or row['revoked_at'] or not secrets.compare_digest(row['refresh_hash'] or '',digest):
        raise HTTPException(401,'Mobile session ended. Sign in again.')
    owner = c.execute('SELECT name FROM users WHERE id=%s',(uid,)).fetchone()
    return encode_access(row,owner['name'],key,credential)
