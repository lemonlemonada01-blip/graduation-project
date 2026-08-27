import cv2
import numpy as np
import os
import math
from typing import Tuple, Dict, Any, List, Optional

class LivenessDetector:
    """
    Robust Single-Frame Liveness Detection using an ONNX-based Silent Face Anti-Spoofing Model (MiniFASNet).
    This model detects texture and depth discrepancies to block presentation attacks (printed photos, phones).
    """

    def __init__(self, model_path: str = "models/minifasnet.onnx"):
        self.model_path = model_path
        self.net = None
        
        if os.path.exists(self.model_path):
            try:
                self.net = cv2.dnn.readNetFromONNX(self.model_path)
            except Exception as e:
                print(f"[WARNING] Failed to load ONNX model: {e}")
        else:
            print(f"[WARNING] Liveness model not found at {self.model_path}. Using fallback heuristic.")

    def _fallback_liveness_check(self, face_crop: np.ndarray) -> Tuple[bool, float]:
        if face_crop is None or face_crop.size == 0:
            return False, 0.0

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_live = 35.0 < laplacian_var < 2000.0
        confidence = min(max(laplacian_var / 500.0, 0.0), 1.0)
        return is_live, float(confidence)

    def verify_liveness(self, frame: np.ndarray, face_bbox: Tuple[int, int, int, int]) -> Tuple[bool, float]:
        top, right, bottom, left = face_bbox
        h, w = frame.shape[:2]
        
        crop_top = max(0, top - int((bottom - top) * 0.2))
        crop_bottom = min(h, bottom + int((bottom - top) * 0.2))
        crop_left = max(0, left - int((right - left) * 0.2))
        crop_right = min(w, right + int((right - left) * 0.2))

        face_crop = frame[crop_top:crop_bottom, crop_left:crop_right]

        if self.net is None:
            return self._fallback_liveness_check(face_crop)

        blob = cv2.dnn.blobFromImage(face_crop, 1.0, (80, 80), (104.0, 117.0, 123.0), False, False)
        self.net.setInput(blob)
        preds = self.net.forward()
        
        # Apply Softmax to raw ONNX output logits
        # MiniFASNet v2: Index 0 = Real Face, Index 1 = Paper Spoof, Index 2 = Screen Spoof
        exp_preds = np.exp(preds - np.max(preds))
        probs = exp_preds / np.sum(exp_preds, axis=1, keepdims=True)
        real_score = float(probs[0][0])
        
        return real_score >= 0.5, real_score


class ActiveLivenessDetector:
    """
    Interactive 3D Head Pose & Motion Active Liveness Engine.
    Uses 3D Perspective-n-Point (solvePnP) algorithm on 68 facial landmarks
    to compute exact Pitch, Yaw, and Roll Euler angles.
    """
    
    # Generic 3D facial model coordinates (in mm)
    MODEL_POINTS_3D = np.array([
        (0.0, 0.0, 0.0),          # Nose tip
        (0.0, -330.0, -65.0),     # Chin
        (-225.0, 170.0, -135.0),  # Left eye left corner
        (225.0, 170.0, -135.0),   # Right eye right corner
        (-150.0, -150.0, -125.0), # Left mouth corner
        (150.0, -150.0, -125.0)   # Right mouth corner
    ], dtype=np.float64)

    @staticmethod
    def estimate_head_pose(landmarks: dict, frame_shape: Tuple[int, int] = (480, 640)) -> Dict[str, float]:
        """
        Calculates exact 3D Pitch, Yaw, and Roll angles (in degrees) from 2D facial landmarks.
        """
        required_keys = ["nose_bridge", "chin", "left_eye", "right_eye", "top_lip"]
        if not all(k in landmarks for k in required_keys):
            return {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

        try:
            # Extract 2D image coordinates corresponding to the 3D model
            image_points = np.array([
                landmarks["nose_bridge"][-1], # Nose tip
                landmarks["chin"][8],          # Chin
                landmarks["left_eye"][0],      # Left eye left corner
                landmarks["right_eye"][3],     # Right eye right corner
                landmarks["top_lip"][0],       # Left mouth corner
                landmarks["top_lip"][6]        # Right mouth corner
            ], dtype=np.float64)

            h, w = frame_shape[:2]
            focal_length = w
            center = (w / 2.0, h / 2.0)
            
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)
            
            dist_coeffs = np.zeros((4, 1)) # Assuming zero lens distortion

            success, rotation_vector, translation_vector = cv2.solvePnP(
                ActiveLivenessDetector.MODEL_POINTS_3D,
                image_points,
                camera_matrix,
                dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE
            )

            if not success:
                return {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

            # Convert Rotation Vector to Rotation Matrix
            rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
            proj_matrix = np.hstack((rotation_matrix, translation_vector))
            
            # Decompose Projection Matrix to Euler Angles (Pitch, Yaw, Roll)
            _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)
            pitch, yaw, roll = euler_angles[0][0], euler_angles[1][0], euler_angles[2][0]

            return {
                "pitch": float(pitch),
                "yaw": float(yaw),
                "roll": float(roll)
            }
        except Exception as e:
            print(f"[WARNING] Pose Estimation Error: {e}")
            return {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

    @classmethod
    def reset_session(cls):
        cls.blink_counter = 0
        cls.consecutive_frames = 0

    blink_counter = 0
    consecutive_frames = 0

    @classmethod
    def verify_motion_challenge(cls, landmarks: dict, challenge_type: str, frame_shape: Tuple[int, int] = (480, 640)) -> Dict[str, Any]:
        """
        Verifies if the face in the frame satisfies the requested gesture challenge.
        Challenge Types: 'BLINK', 'TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN', 'NOD'
        """
        if challenge_type == "BLINK":
            # The caller owns the temporal stability rule and requires two
            # successful responses. Keeping this check stateless avoids a
            # process-global counter leaking between users or browser tabs.
            passed = cls.detect_blink(landmarks)
            return {"passed": passed, "angles": {}, "detail": "Blink detected" if passed else "Blink once"}

        angles = cls.estimate_head_pose(landmarks, frame_shape)
        yaw = angles["yaw"]
        pitch = angles["pitch"]

        passed = False
        detail = ""

        if challenge_type == "TURN_LEFT":
            passed = yaw <= -15.0
            detail = f"Yaw: {yaw:.1f}° (Target: <= -15.0°)"
        elif challenge_type == "TURN_RIGHT":
            passed = yaw >= 15.0
            detail = f"Yaw: {yaw:.1f}° (Target: >= +15.0°)"
        elif challenge_type == "LOOK_UP":
            passed = pitch >= 12.0
            detail = f"Pitch: {pitch:.1f}° (Target: >= +12.0°)"
        elif challenge_type == "LOOK_DOWN" or challenge_type == "NOD":
            passed = pitch <= -12.0
            detail = f"Pitch: {pitch:.1f}° (Target: <= -12.0°)"
        else:
            detail = f"Unknown challenge type: {challenge_type}"

        return {
            "passed": passed,

            "angles": angles,
            "detail": detail
        }

    @staticmethod
    def verify_circular_sequence(angles_sequence: List[Dict[str, float]]) -> Dict[str, Any]:
        """Validate a short head-pose trajectory without requiring a fixed path.

        A live circular motion should move through more than one pose axis and
        cover a meaningful angular span. This is intentionally tolerant of
        dropped frames and camera mirroring; the endpoint remains available for
        clients that explicitly collect a frame sequence.
        """
        if len(angles_sequence) < 4:
            return {"passed": False, "detail": "Capture at least four motion frames."}
        try:
            yaw = np.asarray([float(item.get("yaw", 0.0)) for item in angles_sequence])
            pitch = np.asarray([float(item.get("pitch", 0.0)) for item in angles_sequence])
        except (TypeError, ValueError):
            return {"passed": False, "detail": "Motion angles are invalid."}
        if not np.isfinite(yaw).all() or not np.isfinite(pitch).all():
            return {"passed": False, "detail": "Motion angles are invalid."}
        yaw_span = float(yaw.max() - yaw.min())
        pitch_span = float(pitch.max() - pitch.min())
        travelled = float(np.abs(np.diff(yaw)).sum() + np.abs(np.diff(pitch)).sum())
        passed = (yaw_span >= 22.0 and pitch_span >= 12.0) or travelled >= 55.0
        return {
            "passed": passed,
            "detail": "Circular motion detected." if passed else "Move your head smoothly through a wider circle.",
        }

    @staticmethod
    def is_live(texture_pass: bool, blink_pass: bool) -> bool:
        # Require BOTH passive (texture) and active (blink or motion) liveness
        return texture_pass and blink_pass

    @staticmethod
    def calculate_ear(eye_points: list) -> float:
        def dist(p1, p2):
            return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

        v1 = dist(eye_points[1], eye_points[5])
        v2 = dist(eye_points[2], eye_points[4])
        h = dist(eye_points[0], eye_points[3])
        return (v1 + v2) / (2.0 * h)

    @staticmethod
    def detect_blink(landmarks: dict, ear_threshold: float = 0.21) -> bool:
        if "left_eye" not in landmarks or "right_eye" not in landmarks:
            return False
            
        left_ear = ActiveLivenessDetector.calculate_ear(landmarks["left_eye"])
        right_ear = ActiveLivenessDetector.calculate_ear(landmarks["right_eye"])
        avg_ear = (left_ear + right_ear) / 2.0
        return avg_ear < ear_threshold

