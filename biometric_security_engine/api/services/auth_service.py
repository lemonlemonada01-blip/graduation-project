import jwt
import datetime
from ..config import settings


def create_jwt_token(student_id: str) -> str:
    payload = {
        "sub": student_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.access_token_expire_minutes),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

import hashlib

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Check if the DB has plaintext passwords (legacy)
    if plain_password == hashed_password:
        return True
    # Otherwise check hash
    return get_password_hash(plain_password) == hashed_password
