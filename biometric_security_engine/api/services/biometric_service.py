import base64
import cv2
import numpy as np
from fastapi import HTTPException
from core.face_engine import BiometricFaceEngine
from core.liveness import LivenessDetector, ActiveLivenessDetector
from ..config import settings

face_engine = BiometricFaceEngine(authentication_tolerance=settings.authentication_tolerance)
liveness_detector = LivenessDetector(model_path=settings.minifasnet_model_path)

def decode_base64_image(b64_string: str) -> np.ndarray:
    try:
        if len(b64_string) > settings.max_b64_size_bytes:
            raise ValueError("Image payload exceeds maximum allowed size (15MB).")
        if "," in b64_string:
            b64_string = b64_string.split(",")[1]
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Decoded image is empty or corrupted.")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 Image: {e}")

def verify_motion(frame, challenge_type: str):
    _, _, landmarks = face_engine.extract_face(frame, strict_quality=False)
    return ActiveLivenessDetector.verify_motion_challenge(landmarks, challenge_type, frame.shape)

def estimate_pose(frame):
    _, _, landmarks = face_engine.extract_face(frame, strict_quality=False)
    return ActiveLivenessDetector.estimate_head_pose(landmarks, frame.shape)

def verify_circular(angles_sequence):
    return ActiveLivenessDetector.verify_circular_sequence(angles_sequence)

def register_student_face(frame):
    return face_engine.extract_face(frame, strict_quality=True)

def verify_student_face(live_frame, stored_embedding):
    live_embedding, bbox, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.verify_identity(live_embedding, stored_embedding)

def identify_student_face(live_frame, database):
    live_embedding, bbox, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.search_1_to_n(live_embedding, database)

# --- Security Layer (Application-Level Encryption) ---
from cryptography.fernet import Fernet
fernet = Fernet(settings.biometric_encryption_key.encode('utf-8'))

def encrypt_vector(embedding: list) -> str:
    """Serializes and encrypts a 128D facial vector using AES-256."""
    emb_str = ",".join(map(str, embedding))
    encrypted_bytes = fernet.encrypt(emb_str.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_vector(encrypted_str: str) -> list:
    """Decrypts and deserializes a 128D facial vector."""
    decrypted_bytes = fernet.decrypt(encrypted_str.encode('utf-8'))
    emb_str = decrypted_bytes.decode('utf-8')
    return [float(x) for x in emb_str.split(',')]
