"""Authenticated, account-owned profile details. Login email stays read-only."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.main import db, user

router=APIRouter(prefix='/profile',tags=['Profile'])


class ProfileUpdate(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True,extra='forbid')
    name:str=Field(min_length=1,max_length=100)
    designation:str=Field(default='',max_length=100)
    department:str=Field(default='',max_length=100)
    phone:str=Field(default='',max_length=30)
    location:str=Field(default='',max_length=150)

    @field_validator('phone')
    @classmethod
    def valid_phone(cls,value):
        if value and (any(c not in '+0123456789 ()-' for c in value) or not 7<=sum(c.isdigit() for c in value)<=15):
            raise ValueError('Use a phone number with 7 to 15 digits, or leave it empty')
        return value


class ProfileResponse(BaseModel):
    id:UUID
    name:str
    email:str
    designation:str
    department:str
    phone:str
    location:str


def read_profile(c,uid):
    row=c.execute("""SELECT u.id,u.name,u.email,
      COALESCE(p.designation,'') AS designation,COALESCE(p.department,'') AS department,
      COALESCE(p.phone,'') AS phone,COALESCE(p.location,'') AS location
      FROM users u LEFT JOIN user_profiles p ON p.owner_id=u.id WHERE u.id=%s""",(uid,)).fetchone()
    if not row:raise HTTPException(404,'Account not found')
    return row


@router.get('',response_model=ProfileResponse)
def get_profile(uid=Depends(user),c=Depends(db)):
    return read_profile(c,uid)


@router.patch('',response_model=ProfileResponse)
def update_profile(body:ProfileUpdate,uid=Depends(user),c=Depends(db)):
    read_profile(c,uid)
    c.execute('UPDATE users SET name=%s WHERE id=%s',(body.name,uid))
    c.execute('''INSERT INTO user_profiles(owner_id,designation,department,phone,location)
      VALUES(%s,%s,%s,%s,%s) ON CONFLICT(owner_id) DO UPDATE SET
      designation=EXCLUDED.designation,department=EXCLUDED.department,
      phone=EXCLUDED.phone,location=EXCLUDED.location,updated_at=CURRENT_TIMESTAMP''',
      (uid,body.designation,body.department,body.phone,body.location))
    return read_profile(c,uid)
