from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
from ..database.models import User
import random
import string
from ..services.auth_service import get_password_hash

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/")
def get_users(
    search: str = None,
    role: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if search:
        query = query.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
        
    users = query.all()
    
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "role": u.role,
            "uni": u.university,
            "dept": u.department,
            "status": u.status,
            "created_at": u.created_at
        })
        
    return {"users": result}

@router.put("/{userId}")
def update_user(userId: int, user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if "full_name" in user_data:
        user.full_name = user_data["full_name"]
    if "email" in user_data:
        user.email = user_data["email"]
    if "role" in user_data:
        user.role = user_data["role"]
    if "university" in user_data:
        user.university = user_data["university"]
    if "department" in user_data:
        user.department = user_data["department"]
    if "status" in user_data:
        user.status = user_data["status"]
        
    db.commit()
    db.refresh(user)
    
    return {
        "status": "ok",
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "uni": user.university,
            "dept": user.department,
            "status": user.status,
            "created_at": user.created_at
        }
    }

@router.patch("/{userId}/status")
def update_user_status(userId: int, status_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
        
    user.status = new_status
    db.commit()
    
    return {
        "status": "ok",
        "user_id": user.id,
        "new_status": user.status
    }

@router.delete("/{userId}")
def delete_user(userId: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    
    return {
        "status": "ok",
        "message": "User deleted successfully"
    }

@router.post("/{userId}/reset-password")
def reset_password(userId: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    user.hashed_password = get_password_hash(temp_password)
    db.commit()
    
    return {
        "status": "ok",
        "message": "Password reset successfully",
        "temp_password": temp_password
    }
