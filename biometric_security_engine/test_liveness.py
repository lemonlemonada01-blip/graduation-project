import cv2
import numpy as np

net = cv2.dnn.readNetFromONNX("models/minifasnet.onnx")
blob = cv2.dnn.blobFromImage(np.zeros((80, 80, 3), dtype=np.uint8), 1.0, (80, 80))
net.setInput(blob)
preds = net.forward()

exp_preds = np.exp(preds - np.max(preds))
probs = exp_preds / np.sum(exp_preds, axis=1, keepdims=True)

print("RAW PREDS:", preds)
print("PROBS:", probs)
