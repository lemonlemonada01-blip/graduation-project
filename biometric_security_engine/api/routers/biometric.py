from __future__ import annotations

import logging
import random

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..schemas.biometric import (
    CircularChallengePayload,
    FaceLoginRequest,
    ImagePayload,
    StepChallengePayload,
)
from ..services import biometric_service
from ..services.auth_service import create_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/biometrics", tags=["Biometrics"])


def _normalise_student_id(value: object) -> str:
    student_id = str(value or "").strip()
    if not student_id:
        raise HTTPException(status_code=422, detail="student_id is required")
    return student_id


def _find_user_for_student_id(db: Session, student_id: str):
    """Resolve an external/string biometric ID without an int-varchar cast.

    Student biometric IDs are strings and may be either a user's email or a
    numeric users.id. PostgreSQL rejects some implicit comparisons between an
    integer column and a non-numeric string, so the integer query is performed
    only after the value has been proven numeric.
    """

    from ..database.models import User

    user = db.query(User).filter(User.email == student_id).first()
    if user is None and student_id.isdigit():
        user = db.query(User).filter(User.id == int(student_id)).first()
    return user


@router.get("/challenge/generate")
def generate_motion_challenge():
    # The browser wizard verifies pose challenges frame-by-frame. Circular
    # motion remains available through its dedicated endpoint, but it is not
    # mixed into the default wizard because that endpoint needs a frame
    # sequence rather than a single verify_step request.
    all_gestures = ["TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN"]
    selected = random.sample(all_gestures, 2)
    return {"challenges": selected}


@router.post("/challenge/verify_step")
def verify_motion_step(payload: StepChallengePayload):
    frame = biometric_service.decode_base64_image(payload.image_base64)
    try:
        result = biometric_service.verify_motion(frame, payload.challenge_type)
        if not result["passed"]:
            # A normal frame while the user is moving is not an API failure.
            # Returning 200 prevents the browser stream from throwing and
            # retrying the same frame as an error on every poll.
            return {"status": "in_progress", "detail": result["detail"], "angles": result.get("angles", {})}
        return {"status": "success", "detail": result["detail"], "angles": result.get("angles", {})}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/challenge/verify_circular")
def verify_circular_motion(payload: CircularChallengePayload):
    angles_sequence = []
    for encoded_frame in payload.frames_base64:
        frame = biometric_service.decode_base64_image(encoded_frame)
        try:
            angles_sequence.append(biometric_service.estimate_pose(frame))
        except ValueError:
            continue

    result = biometric_service.verify_circular(angles_sequence)
    if not result["passed"]:
        raise HTTPException(status_code=403, detail=f"Circular Motion Verification Failed. {result['detail']}")

    return {"status": "success", "message": "Circular Motion Verification Passed!", "detail": result["detail"]}


@router.post("/register")
def register_face(
    student_id: str = Body(...),
    image_base64: str = Body(...),
    frames_base64: list[str] | None = Body(None),
    liveness_token: str | None = Body(None),
    db: Session = Depends(get_db),
):
    student_id = _normalise_student_id(student_id)
    if liveness_token != "motion_verified":
        raise HTTPException(status_code=403, detail="Liveness verification required. Please complete the 3D Motion Challenge first.")

    frame = biometric_service.decode_base64_image(image_base64)
    frames = [frame]
    for encoded_frame in frames_base64 or []:
        frames.append(biometric_service.decode_base64_image(encoded_frame))
    try:
        if frames_base64:
            embedding, _, _ = biometric_service.register_student_face_frames(frames)
        else:
            embedding, _, _ = biometric_service.register_student_face(frame)
        encrypted_embedding = biometric_service.encrypt_vector(embedding)

        from ..database.models import StudentBiometric

        student_record = db.query(StudentBiometric).filter(StudentBiometric.student_id == student_id).first()
        if student_record is None:
            db.add(StudentBiometric(student_id=student_id, encrypted_embedding=encrypted_embedding))
        else:
            student_record.encrypted_embedding = encrypted_embedding

        db.commit()
        return {"status": "success", "message": f"Student {student_id} successfully registered with high quality."}
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to store biometric enrollment for %s", student_id)
        raise HTTPException(status_code=503, detail="Biometric database is unavailable.") from exc


@router.post("/authenticate")
def authenticate_face(payload: FaceLoginRequest, db: Session = Depends(get_db)):
    student_id = _normalise_student_id(payload.student_id)
    from ..database.models import StudentBiometric

    try:
        row = db.query(StudentBiometric).filter(StudentBiometric.student_id == student_id).first()
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch biometric record for %s", student_id)
        raise HTTPException(status_code=503, detail="Biometric database is unavailable.") from exc

    if row is None:
        raise HTTPException(status_code=404, detail=f"Student ID '{student_id}' not found in database. Please register first.")

    try:
        stored_embedding = biometric_service.decrypt_vector(row.encrypted_embedding)
        frame = biometric_service.decode_base64_image(payload.image_base64)
        if payload.frames_base64:
            frames = [frame] + [biometric_service.decode_base64_image(encoded_frame) for encoded_frame in payload.frames_base64]
            is_match, distance, _ = biometric_service.verify_student_face_frames(frames, stored_embedding)
        else:
            is_match, distance = biometric_service.verify_student_face(frame, stored_embedding)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to decrypt or verify biometric record for %s", student_id)
        raise HTTPException(status_code=500, detail="Stored biometric data is invalid or unreadable.") from exc

    if not is_match:
        raise HTTPException(status_code=401, detail="Face does not match registered profile records.")

    user = _find_user_for_student_id(db, student_id)
    token_subject = user.email if user else student_id
    return {
        "authenticated": True,
        "token": create_jwt_token(token_subject),
        "distance": distance,
        "message": "Identity Verified. Access Granted.",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
        } if user else None,
    }


@router.post("/identify")
def identify_face(payload: ImagePayload, db: Session = Depends(get_db)):
    try:
        frame = biometric_service.decode_base64_image(payload.image_base64)
        frames = [frame] + [biometric_service.decode_base64_image(encoded_frame) for encoded_frame in (payload.frames_base64 or [])]
    except HTTPException as exc:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": exc.detail}

    from ..database.models import StudentBiometric

    try:
        rows = db.query(StudentBiometric).all()
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch biometric records for identification")
        raise HTTPException(status_code=503, detail="Biometric database is unavailable.") from exc

    database = {}
    for row in rows:
        try:
            database[str(row.student_id)] = biometric_service.decrypt_vector(row.encrypted_embedding)
        except Exception:
            # One corrupt legacy row must not prevent valid students from being
            # identified. It can be re-enrolled to repair that row.
            logger.warning("Skipping unreadable biometric record for %s", row.student_id)

    if not database:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": "No valid students registered in biometric database."}

    try:
        if payload.frames_base64:
            result = biometric_service.identify_student_face_frames(frames, database)
        else:
            result = biometric_service.identify_student_face(frame, database)
    except ValueError as exc:
        return {"authenticated": False, "student_id": None, "student_name": None, "distance": None, "message": str(exc)}

    if result["authenticated"]:
        student_id = str(result["student_id"])
        user = _find_user_for_student_id(db, student_id)
        student_name = user.full_name if user else student_id
        return {
            "authenticated": True,
            "student_id": student_id,
            "student_name": student_name,
            "distance": round(result["distance"], 4),
            "message": f"Identity matched: {student_name} ({student_id})",
        }

    distance = result.get("distance")
    return {
        "authenticated": False,
        "student_id": None,
        "student_name": None,
        "distance": round(distance, 4) if distance is not None else None,
        "message": "Face not recognized. No matching student found in database.",
    }
