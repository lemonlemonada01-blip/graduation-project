import cv2
import numpy as np
import base64
import requests
import time

# --- Helper Methods ---
def encode_image(img_path: str) -> str:
    """Read an image and convert to Base64."""
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not read image at {img_path}. Create some dummy images first!")
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def generate_dummy_images():
    """Generates a dummy red image and a noisy/blurry image for testing."""
    print("Generating dummy images for test...")
    # 1. 'Live' Image (Just a clean sharp face replacement for demo)
    img_live = np.zeros((300, 300, 3), dtype=np.uint8)
    cv2.circle(img_live, (150, 150), 50, (255, 255, 255), -1)  # Draw a white circle (dummy face)
    cv2.imwrite("test_live.jpg", img_live)
    
    # 2. 'Spoof' Image (Blurry/Noisy to fail liveness)
    img_spoof = cv2.GaussianBlur(img_live, (25, 25), 0)
    cv2.imwrite("test_spoof.jpg", img_spoof)

# --- API Interaction ---
API_URL = "http://127.0.0.1:8000/api/biometrics"

def test_registration(student_id: str, img_path: str):
    print(f"\n--- Testing Registration for {student_id} ---")
    payload = {
        "student_id": student_id,
        "image_base64": encode_image(img_path)
    }
    resp = requests.post(f"{API_URL}/register", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")

def test_authentication(student_id: str, img_path: str, expect_spoof: bool = False):
    print(f"\n--- Testing Authentication for {student_id} ({'SPOOF' if expect_spoof else 'LIVE'}) ---")
    payload = {
        "student_id": student_id,
        "image_base64": encode_image(img_path)
    }
    resp = requests.post(f"{API_URL}/authenticate", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")

if __name__ == "__main__":
    print("NOTE: You must have the FastAPI server running via `uvicorn api.main:app --reload` first.")
    # Please provide real images of yourself to test accuracy. 
    # For now, if you run this, it will fail because 'test_live.jpg' is just a circle, not a real human face that face_recognition can detect.
    # To truly test this, replace "test_live.jpg" and "test_spoof.jpg" with your own photos!
    
    # generate_dummy_images()
    # time.sleep(1)
    # try:
    #     test_registration("STU-1001", "test_live.jpg")
    #     test_authentication("STU-1001", "test_spoof.jpg", expect_spoof=True)
    #     test_authentication("STU-1001", "test_live.jpg", expect_spoof=False)
    # except Exception as e:
    #     print(f"Error during testing: {e}")
    #     print("Remember to use real human face photos!")
    print("Demo script written successfully. Replace the dummy paths with real images and uncomment the test lines to run.")
