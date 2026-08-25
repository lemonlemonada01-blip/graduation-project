import face_recognition
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any

class BiometricFaceEngine:
    """
    High-Accuracy Face Detection & Embedding Extractor (Module 1 & 3).
    """
    
    def __init__(self, authentication_tolerance: float = 0.45):
        self.authentication_tolerance = authentication_tolerance

    def _normalize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Normalizes lighting and scale for optimal face_recognition performance.
        """
        # Ensure image is in RGB format for face_recognition
        if len(image.shape) == 3 and image.shape[2] == 3:
            # OpenCV loads as BGR, face_recognition expects RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image
            
        # Optional: Resize massive images to speed up detection
        max_width = 1200
        if rgb_image.shape[1] > max_width:
            ratio = max_width / rgb_image.shape[1]
            rgb_image = cv2.resize(rgb_image, (max_width, int(rgb_image.shape[0] * ratio)))
            
        return rgb_image

    def extract_face(self, image: np.ndarray, strict_quality: bool = True) -> Tuple[List[float], Tuple[int, int, int, int], dict]:
        """
        Validates exactly one face in the frame, extracts embedding and bounding box.
        Also runs Image Quality Assessment (IQA) to reject bad enrollments.
        Returns: (128D embedding vector, Bounding Box, Landmarks)
        """
        from .quality import FaceQualityAssessor
        
        rgb_image = self._normalize_image(image)
        
        # Detect face locations
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        
        if len(face_locations) == 0:
            raise ValueError("No face detected in the image.")
        if len(face_locations) > 1:
            raise ValueError(f"Multiple faces ({len(face_locations)}) detected. Registration requires exactly ONE face.")
            
        face_location = face_locations[0]
        
        if strict_quality:
            assessor = FaceQualityAssessor()
            qa_result = assessor.assess_quality(rgb_image, face_location)
            if not qa_result["passed"]:
                raise ValueError(f"Image Quality Check Failed: {qa_result['reason']}")
        
        # Extract 128D embedding
        face_encodings = face_recognition.face_encodings(rgb_image, known_face_locations=[face_location])
        
        if not face_encodings:
            raise ValueError("Failed to extract face embedding.")
            
        # Get landmarks for active liveness
        face_landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations=[face_location])
        landmarks = face_landmarks_list[0] if face_landmarks_list else {}
            
        embedding = face_encodings[0].tolist()
        return embedding, face_location, landmarks

    def extract_multiple_faces(self, image: np.ndarray) -> List[Tuple[List[float], Tuple[int, int, int, int]]]:
        """
        Extracts embeddings for all faces in the frame. Useful for classroom group attendance.
        """
        rgb_image = self._normalize_image(image)
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        
        if not face_locations:
            return []
            
        face_encodings = face_recognition.face_encodings(rgb_image, known_face_locations=face_locations)
        
        results = []
        for encoding, location in zip(face_encodings, face_locations):
            results.append((encoding.tolist(), location))
            
        return results

    def verify_identity(self, live_embedding: List[float], stored_embedding: List[float]) -> Tuple[bool, float]:
        """
        Compares two 128D vectors. Returns (is_match, distance).
        Strict tolerance (e.g. 0.45) prevents false positives (twins/lookalikes).
        """
        live_np = np.array(live_embedding)
        stored_np = np.array(stored_embedding)
        
        # Euclidean distance
        distance = float(np.linalg.norm(live_np - stored_np))
        
        is_match = distance <= self.authentication_tolerance
        return is_match, distance

    def search_1_to_n(self, live_embedding: List[float], database: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Searches for the closest match in a dictionary of { "student_id": [128D_vector] }.
        """
        best_match_id = None
        best_distance = float('inf')
        
        live_np = np.array(live_embedding)
        
        for student_id, stored_emb in database.items():
            stored_np = np.array(stored_emb)
            distance = float(np.linalg.norm(live_np - stored_np))
            
            if distance < best_distance:
                best_distance = distance
                best_match_id = student_id
                
        if best_distance <= self.authentication_tolerance:
            return {"authenticated": True, "student_id": best_match_id, "distance": best_distance}
            
        return {"authenticated": False, "student_id": None, "distance": best_distance}

    def process_stream_frame(self, frame: np.ndarray, required_pose: str) -> Dict[str, Any]:
        """
        Processes a single video frame for continuous auto-capture.
        Downscales the image dynamically for performance.
        Returns detection status, quality, pose match, and optionally the embedding.
        """
        from .quality import FaceQualityAssessor
        from .liveness import ActiveLivenessDetector

        result = {
            "detected": False,
            "quality_ok": False,
            "pose_matched": False,
            "embedding": None,
            "reason": ""
        }

        # Dynamic downscaling for performance
        h, w = frame.shape[:2]
        max_dim = 640
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            process_frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        else:
            scale = 1.0
            process_frame = frame

        rgb_image = self._normalize_image(process_frame)

        # Detect face locations
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        if not face_locations:
            result["reason"] = "No face detected"
            return result
        if len(face_locations) > 1:
            result["reason"] = "Multiple faces detected"
            return result
            
        result["detected"] = True
        face_location = face_locations[0]

        # Check Quality
        assessor = FaceQualityAssessor()
        qa_result = assessor.assess_quality(rgb_image, face_location)
        if not qa_result["passed"]:
            result["reason"] = qa_result["reason"]
            return result
            
        result["quality_ok"] = True

        # Extract Landmarks to check pose
        face_landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations=[face_location])
        if not face_landmarks_list:
            result["reason"] = "Failed to extract landmarks"
            return result
            
        landmarks = face_landmarks_list[0]

        if required_pose == "STRAIGHT":
            # Just require a relatively straight face
            angles = ActiveLivenessDetector.estimate_head_pose(landmarks, process_frame.shape[:2])
            is_straight = abs(angles["yaw"]) < 10 and abs(angles["pitch"]) < 10
            if not is_straight:
                result["reason"] = "Look straight at the camera"
                return result
            result["pose_matched"] = True
        else:
            # Check specific challenge pose
            pose_result = ActiveLivenessDetector.verify_motion_challenge(landmarks, required_pose, process_frame.shape[:2])
            if not pose_result["passed"]:
                result["reason"] = pose_result["detail"]
                return result
            result["pose_matched"] = True

        # Only extract embedding if quality and pose are matched (to save CPU)
        if result["pose_matched"]:
            face_encodings = face_recognition.face_encodings(rgb_image, known_face_locations=[face_location])
            if face_encodings:
                result["embedding"] = face_encodings[0].tolist()

        return result

