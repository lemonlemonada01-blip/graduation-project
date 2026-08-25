import cv2
import numpy as np
from typing import Tuple, Dict, Any

class FaceQualityAssessor:
    """
    Image Quality Assessment (IQA) Gate.
    Rejects blurry, poorly lit, or off-center images to prevent bad enrollments.
    """
    
    def __init__(self, blur_threshold: float = 35.0, dark_threshold: float = 30.0, bright_threshold: float = 245.0, min_face_size: int = 80):
        self.blur_threshold = blur_threshold
        self.dark_threshold = dark_threshold
        self.bright_threshold = bright_threshold
        self.min_face_size = min_face_size

    def assess_quality(self, frame: np.ndarray, face_bbox: Tuple[int, int, int, int]) -> Dict[str, Any]:
        """
        Assess the quality of the face crop for enrollment.
        Returns a dictionary with 'passed' boolean and failure reasons.
        """
        top, right, bottom, left = face_bbox
        
        # Face size check
        if (bottom - top) < self.min_face_size or (right - left) < self.min_face_size:
            return {"passed": False, "reason": "Move closer to the camera"}

        face_crop = frame[max(0, top):bottom, max(0, left):right]
        
        if face_crop.size == 0:
            return {"passed": False, "reason": "Position your face within the guide"}

        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur Check (Laplacian Variance)
        laplacian_var = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
        if laplacian_var < self.blur_threshold:
            return {"passed": False, "reason": "Please hold your device steady"}

        # 2. Lighting Check (Mean Brightness)
        mean_brightness = np.mean(gray_crop)
        if mean_brightness < self.dark_threshold:
            return {"passed": False, "reason": "Move to a brighter area"}
        if mean_brightness > self.bright_threshold:
            return {"passed": False, "reason": "Reduce bright light behind you"}

        # Quality passed
        return {"passed": True, "reason": "Good quality."}
