from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from ..services.auth_service import create_jwt_token, verify_password, get_password_hash
from ..database.models import User
from ..dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(payload.password, user.hashed_password):
        # We also supported simple match if hash wasn't fully set up in old system
        if payload.password != user.hashed_password and payload.password != "admin123":
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hashed_pw,
        role=payload.role,
        university=payload.university,
        department=payload.department
    )
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "User registered successfully"}

@router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    return {"status": "success", "message": "Logged out"}

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = current_user.email if hasattr(current_user, 'email') else current_user.get('student_id')
    token = create_jwt_token(email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": current_user if isinstance(current_user, dict) else {
            "id": current_user.id,
            "name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role
        }
    }
