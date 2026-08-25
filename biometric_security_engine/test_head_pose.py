import cv2
import numpy as np
from core.liveness import ActiveLivenessDetector

# Create dummy landmarks for testing
dummy_landmarks = {
    "nose_bridge": [(100, 100), (100, 110), (100, 120), (100, 130)],
    "chin": [(50, 50 + i*10) for i in range(17)],
    "left_eye": [(70, 80), (75, 75), (80, 75), (85, 80), (80, 85), (75, 85)],
    "right_eye": [(115, 80), (120, 75), (125, 75), (130, 80), (125, 85), (120, 85)],
    "top_lip": [(80, 150), (85, 145), (90, 145), (100, 147), (110, 145), (115, 145), (120, 150)]
}

angles = ActiveLivenessDetector.estimate_head_pose(dummy_landmarks, (480, 640))
print("ESTIMATED ANGLES:", angles)

check_left = ActiveLivenessDetector.verify_motion_challenge(dummy_landmarks, "TURN_LEFT")
print("TURN_LEFT CHECK:", check_left)
