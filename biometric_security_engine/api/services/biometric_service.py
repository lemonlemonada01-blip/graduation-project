from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Sequence

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
    _, landmarks = face_engine.extract_landmarks(frame)
    return ActiveLivenessDetector.verify_motion_challenge(landmarks, challenge_type, frame.shape)


def estimate_pose(frame: np.ndarray) -> dict[str, float]:
    _, landmarks = face_engine.extract_landmarks(frame)
    return ActiveLivenessDetector.estimate_head_pose(landmarks, frame.shape)


def verify_circular(angles_sequence: list[dict[str, float]]) -> dict[str, Any]:
    return ActiveLivenessDetector.verify_circular_sequence(angles_sequence)


def register_student_face(frame: np.ndarray):
    return face_engine.extract_face(frame, strict_quality=True)


def _aggregate_embeddings(embeddings: Sequence[list[float]]) -> list[float]:
    """Build a robust enrollment vector from several good video frames.

    Embeddings are normalized before a median-centre outlier filter and a mean
    aggregation. This prevents one blurred or poorly aligned frame from
    dominating the stored biometric template.
    """
    if not embeddings:
        raise ValueError("No usable face frames were found.")
    matrix = np.asarray([face_engine._embedding_array(value) for value in embeddings], dtype=np.float64)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    if np.any(norms == 0):
        raise ValueError("A face embedding has zero magnitude.")
    normalized = matrix / norms
    centre = np.median(normalized, axis=0)
    centre_norm = np.linalg.norm(centre)
    if centre_norm == 0:
        raise ValueError("Unable to build a stable biometric template.")
    centre /= centre_norm
    consistency = normalized @ centre
    keep_count = min(len(normalized), max(2, min(5, len(normalized))))
    keep = np.argsort(consistency)[-keep_count:]
    aggregate = normalized[keep].mean(axis=0)
    aggregate_norm = np.linalg.norm(aggregate)
    if aggregate_norm == 0:
        raise ValueError("Unable to build a stable biometric template.")
    return (aggregate / aggregate_norm).astype(np.float64).tolist()


def _extract_video_embeddings(
    frames: Sequence[np.ndarray],
    *,
    minimum_frames: int,
    strict_quality: bool,
) -> tuple[list[list[float]], tuple[int, int, int, int], dict[str, Any]]:
    if not frames:
        raise ValueError("At least one camera frame is required.")
    if len(frames) > 20:
        raise ValueError("A maximum of 20 video frames may be submitted.")

    accepted: list[list[float]] = []
    best_box: tuple[int, int, int, int] | None = None
    passive_checked = 0
    passive_passed = 0
    for frame in frames:
        try:
            embedding, face_box, _ = face_engine.extract_face(frame, strict_quality=strict_quality)
            if getattr(liveness_detector, "net", None) is not None:
                passive_checked += 1
                is_live, _score = liveness_detector.verify_liveness(frame, face_box)
                if not is_live:
                    continue
                passive_passed += 1
            accepted.append(embedding)
            if best_box is None:
                best_box = face_box
        except (RuntimeError, ValueError):
            continue

    if len(accepted) < minimum_frames:
        raise ValueError(
            f"Only {len(accepted)} usable face frames were found; capture at least {minimum_frames} clear frames."
        )
    return accepted, best_box or (0, 1, 1, 0), {
        "accepted_frames": len(accepted),
        "submitted_frames": len(frames),
        "passive_liveness_checked": passive_checked,
        "passive_liveness_passed": passive_passed,
    }


def register_student_face_frames(frames: Sequence[np.ndarray]):
    embeddings, face_box, metadata = _extract_video_embeddings(frames, minimum_frames=3, strict_quality=True)
    return _aggregate_embeddings(embeddings), face_box, metadata


def verify_student_face(live_frame: np.ndarray, stored_embedding: list[float]):
    live_embedding, _, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.verify_identity(live_embedding, stored_embedding)


def verify_student_face_frames(frames: Sequence[np.ndarray], stored_embedding: list[float]):
    embeddings, _face_box, metadata = _extract_video_embeddings(frames, minimum_frames=2, strict_quality=True)
    aggregate = _aggregate_embeddings(embeddings)
    matched, distance = face_engine.verify_identity(aggregate, stored_embedding)
    if not matched:
        frame_results = [face_engine.verify_identity(embedding, stored_embedding) for embedding in embeddings]
        passing = sum(1 for frame_match, _ in frame_results if frame_match)
        matched = passing >= max(2, (len(frame_results) + 1) // 2)
        distance = min([distance, *[frame_distance for _match, frame_distance in frame_results]])
    metadata["matched"] = matched
    return matched, distance, metadata


def identify_student_face(live_frame: np.ndarray, database: dict[str, list[float]]):
    live_embedding, _, _ = face_engine.extract_face(live_frame, strict_quality=False)
    return face_engine.search_1_to_n(live_embedding, database)


def identify_student_face_frames(frames: Sequence[np.ndarray], database: dict[str, list[float]]):
    embeddings, _face_box, metadata = _extract_video_embeddings(frames, minimum_frames=2, strict_quality=True)
    aggregate = _aggregate_embeddings(embeddings)
    result = face_engine.search_1_to_n(aggregate, database)
    result["frame_metadata"] = metadata
    return result


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
