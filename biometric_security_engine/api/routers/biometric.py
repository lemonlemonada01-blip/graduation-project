from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import random

from ..schemas.biometric import StepChallengePayload, CircularChallengePayload, FaceRegisterRequest, FaceLoginRequest, ImagePayload
from ..services import biometric_service
from ..services.auth_service import create_jwt_token
from ..dependencies import get_db

router = APIRouter(prefix="/api/biometrics", tags=["Biometrics"])

@router.get("/challenge/generate")
def generate_motion_challenge():
    all_gestures = ["TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN"]
    selected = random.sample(all_gestures, 2)
    selected.append("CIRCULAR_MOTION")
    return {"challenges": selected}

@router.post("/challenge/verify_step")
def verify_motion_step(payload: StepChallengePayload):
    frame = biometric_service.decode_base64_image(payload.image_base64)
    try:
        result = biometric_service.verify_motion(frame, payload.challenge_type)
        if not result["passed"]:
            raise HTTPException(status_code=403, detail=f"Motion Challenge '{payload.challenge_type}' Failed. {result['detail']}")
        return {"status": "success", "detail": result["detail"], "angles": result["angles"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/challenge/verify_circular")
def verify_circular_motion(payload: CircularChallengePayload):
    angles_sequence = []
    for b64 in payload.frames_base64:
        frame = biometric_service.decode_base64_image(b64)
        try:
            angles = biometric_service.estimate_pose(frame)
            angles_sequence.append(angles)
        except ValueError:
            continue

    result = biometric_service.verify_circular(angles_sequence)
    if not result["passed"]:
        raise HTTPException(status_code=403, detail=f"Circular Motion Verification Failed. {result['detail']}")

    return {"status": "success", "message": "Circular Motion Verification Passed!", "detail": result["detail"]}

@router.post("/register")
def register_face(student_id: str = Body(...), image_base64: str = Body(...), liveness_token: str = Body(None), db: Session = Depends(get_db)):
    frame = biometric_service.decode_base64_image(image_base64)
    try:
        embedding, bbox, _ = biometric_service.register_student_face(frame)
        if not liveness_token or liveness_token != 'motion_verified':
            raise HTTPException(status_code=403, detail="Liveness verification required. Please complete the 3D Motion Challenge first.")
            
        from ..database.models import StudentBiometric
        encrypted_embedding = biometric_service.encrypt_vector(embedding)
        
        student_record = db.query(StudentBiometric).filter_by(student_id=student_id).first()
        if student_record:
            student_record.encrypted_embedding = encrypted_embedding
        else:
            student_record = StudentBiometric(student_id=student_id, encrypted_embedding=encrypted_embedding)
            db.add(student_record)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Student {student_id} successfully registered with high quality."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/authenticate")
def authenticate_face(payload: FaceLoginRequest, db: Session = Depends(get_db)):
    from ..database.models import StudentBiometric
    row = db.query(StudentBiometric).filter_by(student_id=payload.student_id).first()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"Student ID '{payload.student_id}' not found in database. Please register first.")
        
    stored_embedding = biometric_service.decrypt_vector(row.encrypted_embedding)
    frame = biometric_service.decode_base64_image(payload.image_base64)
    
    try:
        is_match, distance = biometric_service.verify_student_face(frame, stored_embedding)
        
        if is_match:
            token = create_jwt_token(payload.student_id)
            return {
                "authenticated": True,
                "token": token,
                "distance": distance,
                "message": "Identity Verified. Access Granted."
            }
        else:
            raise HTTPException(status_code=401, detail="Face does not match registered profile records.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/identify")
def identify_face(payload: ImagePayload, db: Session = Depends(get_db)):
    try:
        frame = biometric_service.decode_base64_image(payload.image_base64)
    except Exception as e:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": f"Image decode failed: {str(e)}"}

    from ..database.models import StudentBiometric
    rows = db.query(StudentBiometric).all()
    if not rows:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": "No students registered in biometric database."}

    database = {row.student_id: biometric_service.decrypt_vector(row.encrypted_embedding) for row in rows}

    try:
        result = biometric_service.identify_student_face(frame, database)
    except ValueError as e:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": str(e)}

    if result["authenticated"]:
        student_id = result["student_id"]
        from ..database.models import User
        user = db.query(User).filter((User.email == student_id) | (User.id == student_id)).first()
        student_name = user.full_name if user else student_id
        return {
            "authenticated": True,
            "student_id": student_id,
            "student_name": student_name,
            "distance": round(result["distance"], 4),
            "message": f"Identity matched: {student_name} ({student_id})"
        }
    else:
        dist = result.get("distance")
        return {
            "authenticated": False,
            "student_id": None,
            "student_name": None,
            "distance": round(dist, 4) if dist is not None else None,
            "message": "Face not recognized. No matching student found in database."
        }
