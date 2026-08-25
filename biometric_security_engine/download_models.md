# Downloading Anti-Spoofing Models

For the `core/liveness.py` module to function accurately in a production environment, you need to download a pre-trained Silent Face Anti-Spoofing Model (such as MiniFASNet) in ONNX format.

## Steps to Setup

1. **Create Models Directory**:
   ```bash
   mkdir -p models
   ```

2. **Download the ONNX Model**:
   You can find pre-trained MiniFASNet weights from various open-source repositories (like `minivision`'s Silent-Face-Anti-Spoofing repository).
   
   If you have a `.pth` (PyTorch) model, you will need to export it to `.onnx`.
   
   For ease of use, place the downloaded file exactly here:
   `d:\AI engine\biometric_security_engine\models\minifasnet.onnx`

3. **Verify**:
   When the FastAPI server starts, `cv2.dnn.readNetFromONNX()` will attempt to load the file. If it successfully parses the file, the engine will use Deep Learning for liveness detection instead of the basic fallback heuristic.

> Note: If you do not download the model, the engine will still run! It will just fall back to a basic Laplacian variance check to detect extreme blurriness (which is highly insecure for production but good for testing API flow).
