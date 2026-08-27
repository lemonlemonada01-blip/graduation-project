from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BIO_ROOT = ROOT / "biometric_security_engine"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BIO_ROOT))


def test_multiframe_enrollment_and_matching(monkeypatch):
    from biometric_security_engine.api.services import biometric_service

    class FakeFaceEngine:
        @staticmethod
        def _embedding_array(value):
            values = np.asarray(value, dtype=np.float64).reshape(-1)
            if values.size != 128:
                raise ValueError("wrong dimension")
            return values

        def extract_face(self, frame, strict_quality=True):
            vector = np.zeros(128, dtype=np.float64)
            vector[0] = 1.0
            vector[1] = float(frame[0, 0, 0]) / 100.0
            return vector.tolist(), (10, 110, 110, 10), {}

        def verify_identity(self, live_embedding, stored_embedding):
            live = self._embedding_array(live_embedding)
            stored = self._embedding_array(stored_embedding)
            live /= np.linalg.norm(live)
            stored /= np.linalg.norm(stored)
            distance = float(1.0 - np.dot(live, stored))
            return distance <= 0.45, distance

        def search_1_to_n(self, live_embedding, database):
            best_id = next(iter(database))
            matched, distance = self.verify_identity(live_embedding, database[best_id])
            return {"authenticated": matched, "student_id": best_id if matched else None, "distance": distance}

    fake_engine = FakeFaceEngine()
    monkeypatch.setattr(biometric_service, "face_engine", fake_engine)
    monkeypatch.setattr(biometric_service.liveness_detector, "net", None)

    frames = [np.full((120, 120, 3), value, dtype=np.uint8) for value in (5, 6, 7, 8)]
    embedding, face_box, metadata = biometric_service.register_student_face_frames(frames)
    assert len(embedding) == 128
    assert face_box == (10, 110, 110, 10)
    assert metadata["accepted_frames"] == 4

    matched, distance, verify_metadata = biometric_service.verify_student_face_frames(frames[:3], embedding)
    assert matched is True
    assert distance <= 0.45
    assert verify_metadata["accepted_frames"] == 3

    identified = biometric_service.identify_student_face_frames(frames[:3], {"student@example.test": embedding})
    assert identified["authenticated"] is True
    assert identified["student_id"] == "student@example.test"


def test_circular_motion_tolerates_dropped_frame_shape():
    from biometric_security_engine.core.liveness import ActiveLivenessDetector

    result = ActiveLivenessDetector.verify_circular_sequence(
        [
            {"yaw": -18, "pitch": -8},
            {"yaw": -4, "pitch": 8},
            {"yaw": 16, "pitch": 13},
            {"yaw": 8, "pitch": -5},
        ]
    )
    assert result["passed"] is True

    short = ActiveLivenessDetector.verify_circular_sequence([{"yaw": 0, "pitch": 0}] * 3)
    assert short["passed"] is False
