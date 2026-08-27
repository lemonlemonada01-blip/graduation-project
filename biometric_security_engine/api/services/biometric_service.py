from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException

try:
    from ...core.face_engine import BiometricFaceEngine
    from ...core.liveness import LivenessDetector, ActiveLivenessDetector
except ImportError:  # Supports launching with ``api`` as the top-level package.
    from core.face_engine import BiometricFaceEngine
    from core.liveness import LivenessDetector, ActiveLivenessDetector

from ..config import BASE_DIR, settings

face_engine = BiometricFaceEngine(authentication_tolerance=settings.authentication_tolerance)
_model_path = Path(settings.minifasnet_model_path)
if not _model_path.is_absolute():
    _model_path = BASE_DIR / _model_path
liveness_detector = LivenessDetector(model_path=str(_model_path))


# Versioned AES-256-GCM format. The key is deterministically derived from the
# configured secret so existing deployments do not need a new environment key.
_AES_VERSION = b"v2."
_AES_AAD = b"secure-feprh:biometric-embedding:v2"
_AES_KEY = hashlib.sha256(settings.biometric_encryption_key.encode("utf-8")).digest()
_AES_GCM = AESGCM(_AES_KEY)
try:
    _LEGACY_FERNET: Fernet | None = Fernet(settings.biometric_encryption_key.encode("utf-8"))
except (TypeError, ValueError):
    # New installations may use any secret string. Legacy Fernet support is
    # optional in that case, while AES-256-GCM remains fully available.
    _LEGACY_FERNET = None


def decode_base64_image(b64_string: str) -> np.ndarray:
    try:
        if not isinstance(b64_string, str) or not b64_string.strip():
            raise ValueError("Image payload is required.")
        if len(b64_string) > settings.max_b64_size_bytes:
            raise ValueError("Image payload exceeds maximum allowed size (15MB).")
        encoded = b64_string.split(",", 1)[1] if "," in b64_string else b64_string
        img_data = base64.b64decode(encoded, validate=True)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Decoded image is empty or corrupted.")
        return img
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 Image: {exc}") from exc


def verify_motion(frame: np.ndarray, challenge_type: str) -> dict[str, Any]:
    _, _, landmarks = face_engine.extract_face(frame, strict_quality=False)
    return ActiveLivenessDetector.verify_motion_challenge(landmarks, challenge_type, frame.shape)


def estimate_pose(frame: np.ndarray) -> dict[str, float]:
    _, _, landmarks = face_engine.extract_face(frame, strict_quality=False)
    return ActiveLivenessDetector.estimate_head_pose(landmarks, frame.shape)


def verify_circular(angles_sequence: list[dict[str, float]]) -> dict[str, Any]:
    return ActiveLivenessDetector.verify_circular_sequence(angles_sequence)


def register_student_face(frame: np.ndarray):
    return face_engine.extract_face(frame, strict_quality=True)


def verify_student_face(live_frame: np.ndarray, stored_embedding: list[float]):
    live_embedding, _, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.verify_identity(live_embedding, stored_embedding)


def identify_student_face(live_frame: np.ndarray, database: dict[str, list[float]]):
    live_embedding, _, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.search_1_to_n(live_embedding, database)


def _validated_embedding(embedding: list[float] | np.ndarray) -> list[float]:
    return BiometricFaceEngine._embedding_array(embedding).astype(np.float32).tolist()


def encrypt_vector(embedding: list[float] | np.ndarray) -> str:
    """Encrypt one SFace vector using AES-256-GCM.

    The ``v2.`` prefix identifies the authenticated AES-256-GCM format. The
    decryptor below still accepts legacy Fernet records so existing PostgreSQL
    biometric rows remain readable during a gradual re-enrollment migration.
    """
    vector = _validated_embedding(embedding)
    payload = json.dumps(vector, separators=(",", ":")).encode("utf-8")
    nonce = os.urandom(12)
    ciphertext = _AES_GCM.encrypt(nonce, payload, _AES_AAD)
    token = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")
    return (_AES_VERSION + token.encode("ascii")).decode("ascii")


def decrypt_vector(encrypted_str: str) -> list[float]:
    """Decrypt a v2 AES-256-GCM vector or a legacy Fernet vector."""
    if not isinstance(encrypted_str, str) or not encrypted_str:
        raise ValueError("Stored biometric vector is empty.")

    try:
        if encrypted_str.startswith(_AES_VERSION.decode("ascii")):
            packed = base64.urlsafe_b64decode(encrypted_str[len(_AES_VERSION):].encode("ascii"))
            if len(packed) <= 12:
                raise ValueError("Stored AES biometric vector is truncated.")
            plaintext = _AES_GCM.decrypt(packed[:12], packed[12:], _AES_AAD)
            vector = json.loads(plaintext.decode("utf-8"))
        else:
            if _LEGACY_FERNET is None:
                raise ValueError("Legacy biometric encryption key is invalid.")
            plaintext = _LEGACY_FERNET.decrypt(encrypted_str.encode("utf-8"))
            vector = [float(value) for value in plaintext.decode("utf-8").split(",")]
    except Exception as exc:
        raise ValueError("Stored biometric vector is invalid or unreadable.") from exc

    return _validated_embedding(vector)
