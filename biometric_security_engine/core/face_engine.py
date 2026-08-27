from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

_DEEPFACE: Any | None = None
_DEEPFACE_IMPORT_ERROR: Exception | None = None
_YUNET: Any | None = None
_YUNET_IMPORT_ERROR: Exception | None = None
_YUNET_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "face_detection_yunet_2023mar.onnx"
_YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
_MODEL_LOCK = threading.Lock()

FaceBox = Tuple[int, int, int, int]  # top, right, bottom, left


class BiometricFaceEngine:
    """Face detection, liveness landmarks, and SFace embedding extraction.

    SFace is a modern 128-dimensional embedding model exposed by DeepFace.
    OpenCV YuNet supplies fast five-point detector landmarks used to preserve
    the application's active head-pose contract. Both components use prebuilt
    Python 3.12-compatible wheels and avoid native C++ compilation.
    """

    EMBEDDING_DIMENSION = 128

    def __init__(
        self,
        authentication_tolerance: float = 0.45,
        model_name: str = "SFace",
        detector_backend: str = "opencv",
    ) -> None:
        self.authentication_tolerance = authentication_tolerance
        self.model_name = model_name
        self.detector_backend = detector_backend

    @classmethod
    def _embedding_array(cls, embedding: List[float] | np.ndarray) -> np.ndarray:
        try:
            values = np.asarray(embedding, dtype=np.float64).reshape(-1)
        except (TypeError, ValueError) as exc:
            raise ValueError("Stored face embedding is not numeric.") from exc
        if values.shape != (cls.EMBEDDING_DIMENSION,):
            raise ValueError(
                f"Face embedding must contain {cls.EMBEDDING_DIMENSION} values; got {values.size}."
            )
        if not np.isfinite(values).all():
            raise ValueError("Face embedding contains invalid numeric values.")
        return values

    @staticmethod
    def _normalize_image(image: np.ndarray) -> np.ndarray:
        if image is None or not isinstance(image, np.ndarray) or image.size == 0:
            raise ValueError("Image is empty or invalid.")
        if image.ndim == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.ndim != 3 or image.shape[2] != 3:
            raise ValueError("Image must be a grayscale or three-channel BGR image.")

        max_width = 1200
        if image.shape[1] > max_width:
            ratio = max_width / image.shape[1]
            image = cv2.resize(
                image,
                (max_width, max(1, int(image.shape[0] * ratio))),
                interpolation=cv2.INTER_AREA,
            )
        return image

    @staticmethod
    def _load_deepface() -> Any:
        global _DEEPFACE, _DEEPFACE_IMPORT_ERROR
        if _DEEPFACE is not None:
            return _DEEPFACE
        if _DEEPFACE_IMPORT_ERROR is not None:
            raise RuntimeError(
                "DeepFace is required for biometric processing. Install the Python 3.12 dependencies "
                "from requirements.txt and restart the API."
            ) from _DEEPFACE_IMPORT_ERROR
        with _MODEL_LOCK:
            if _DEEPFACE is not None:
                return _DEEPFACE
            try:
                from deepface import DeepFace
            except Exception as exc:
                _DEEPFACE_IMPORT_ERROR = exc
                raise RuntimeError(
                    "DeepFace could not be imported. Install the Python 3.12-compatible biometric dependencies "
                    "from requirements.txt."
                ) from exc
            _DEEPFACE = DeepFace
            return _DEEPFACE

    @staticmethod
    def _load_yunet() -> Any | None:
        global _YUNET, _YUNET_IMPORT_ERROR
        if _YUNET is not None:
            return _YUNET
        if _YUNET_IMPORT_ERROR is not None:
            return None
        with _MODEL_LOCK:
            if _YUNET is not None:
                return _YUNET
            try:
                if not _YUNET_MODEL_PATH.exists():
                    _YUNET_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
                    from urllib.request import urlretrieve
                    urlretrieve(_YUNET_MODEL_URL, _YUNET_MODEL_PATH)
                _YUNET = cv2.FaceDetectorYN_create(
                    str(_YUNET_MODEL_PATH), "", (320, 320), 0.60, 0.30, 5000
                )
            except Exception as exc:
                _YUNET_IMPORT_ERROR = exc
                return None
            return _YUNET

    def _detect_landmarks(self, image: np.ndarray) -> List[Dict[str, Any]]:
        height, width = image.shape[:2]
        detector = self._load_yunet()
        if detector is not None:
            detector.setInputSize((width, height))
            _, faces = detector.detect(image)
            output: List[Dict[str, Any]] = []
            for face in faces if faces is not None else []:
                row = np.asarray(face, dtype=np.float32).reshape(-1)
                if row.size < 15:
                    continue
                x, y, box_width, box_height = row[:4]
                output.append({
                    "facial_area": [int(x), int(y), int(x + box_width), int(y + box_height)],
                    "landmarks": {
                        "right_eye": [float(row[4]), float(row[5])],
                        "left_eye": [float(row[6]), float(row[7])],
                        "nose": [float(row[8]), float(row[9])],
                        "mouth_right": [float(row[10]), float(row[11])],
                        "mouth_left": [float(row[12]), float(row[13])],
                    },
                    "face_confidence": float(row[14]),
                })
            return output

        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        detections = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
        return [
            {
                "facial_area": [int(x), int(y), int(x + box_width), int(y + box_height)],
                "landmarks": {},
                "face_confidence": 0.5,
            }
            for x, y, box_width, box_height in detections
        ]

    def _represent(self, image: np.ndarray, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        deepface = self._load_deepface()
        representations: List[Dict[str, Any]] = []
        for detection in detections:
            top, right, bottom, left = self._record_box(detection, image.shape)
            face_width = right - left
            face_height = bottom - top
            margin_x = int(face_width * 0.18)
            margin_y = int(face_height * 0.22)
            crop = image[
                max(0, top - margin_y):min(image.shape[0], bottom + margin_y),
                max(0, left - margin_x):min(image.shape[1], right + margin_x),
            ]
            try:
                record = deepface.represent(
                    img_path=crop,
                    model_name=self.model_name,
                    detector_backend="skip",
                    enforce_detection=False,
                    align=False,
                    normalization="base",
                )
                if isinstance(record, list):
                    record = record[0] if record else None
                if isinstance(record, dict):
                    representations.append({
                        "embedding": record.get("embedding", []),
                        "facial_area": detection["facial_area"],
                        "landmarks": detection.get("landmarks", {}),
                        "face_confidence": detection.get("face_confidence", 0.0),
                    })
            except Exception as exc:
                raise ValueError(f"Face embedding extraction failed: {exc}") from exc
        if not representations:
            raise ValueError("Face embedding extraction returned no usable embeddings.")
        return representations

    @staticmethod
    def _box_from_area(area: Any, image_shape: Tuple[int, ...]) -> FaceBox:
        h, w = image_shape[:2]
        try:
            if isinstance(area, dict):
                x = int(area["x"])
                y = int(area["y"])
                width = int(area["w"])
                height = int(area["h"])
                x2, y2 = x + width, y + height
            else:
                x, y, x2, y2 = [int(value) for value in area[:4]]
        except (KeyError, TypeError, ValueError, IndexError) as exc:
            raise ValueError("Face detector returned an invalid facial area.") from exc

        left = max(0, min(max(0, w - 1), x))
        top = max(0, min(max(0, h - 1), y))
        right = max(left + 1, min(w, x2))
        bottom = max(top + 1, min(h, y2))
        return top, right, bottom, left

    @classmethod
    def _record_box(cls, record: Dict[str, Any], image_shape: Tuple[int, ...]) -> FaceBox:
        if "facial_area" not in record:
            raise ValueError("Face detector did not return a facial area.")
        return cls._box_from_area(record["facial_area"], image_shape)

    @staticmethod
    def _box_distance(first: FaceBox, second: FaceBox) -> float:
        first_center = ((first[3] + first[1]) / 2, (first[0] + first[2]) / 2)
        second_center = ((second[3] + second[1]) / 2, (second[0] + second[2]) / 2)
        return float(np.linalg.norm(np.asarray(first_center) - np.asarray(second_center)))

    @classmethod
    def _match_landmarks(
        cls,
        embedding_record: Dict[str, Any],
        landmark_records: List[Dict[str, Any]],
        image_shape: Tuple[int, ...],
    ) -> Dict[str, Any]:
        if not landmark_records:
            raise ValueError("Face detector did not return facial landmarks.")
        embedding_box = cls._record_box(embedding_record, image_shape)
        candidates = []
        for record in landmark_records:
            try:
                candidates.append((cls._box_distance(embedding_box, cls._record_box(record, image_shape)), record))
            except ValueError:
                continue
        if not candidates:
            raise ValueError("Face detector returned no usable facial landmarks.")
        return min(candidates, key=lambda item: item[0])[1]

    @staticmethod
    def _point(value: Any, fallback: Tuple[float, float]) -> Tuple[float, float]:
        try:
            return float(value[0]), float(value[1])
        except (TypeError, ValueError, IndexError, KeyError):
            return fallback

    @classmethod
    def _landmarks_for_liveness(
        cls,
        record: Dict[str, Any],
        face_box: FaceBox,
    ) -> Dict[str, List[Tuple[int, int]]]:
        top, right, bottom, left = face_box
        width = max(1, right - left)
        height = max(1, bottom - top)
        raw = record.get("landmarks") or {}

        center = (left + width / 2, top + height / 2)
        left_eye = cls._point(raw.get("left_eye"), (left + width * 0.32, top + height * 0.40))
        right_eye = cls._point(raw.get("right_eye"), (left + width * 0.68, top + height * 0.40))
        nose = cls._point(raw.get("nose"), (left + width * 0.50, top + height * 0.57))
        mouth_left = cls._point(raw.get("mouth_left"), (left + width * 0.38, top + height * 0.76))
        mouth_right = cls._point(raw.get("mouth_right"), (left + width * 0.62, top + height * 0.76))

        def eye_contour(eye: Tuple[float, float]) -> List[Tuple[int, int]]:
            points = []
            for angle in np.linspace(np.pi, -np.pi, 6, endpoint=False):
                points.append((
                    int(round(eye[0] + width * 0.08 * np.cos(angle))),
                    int(round(eye[1] + height * 0.025 * np.sin(angle))),
                ))
            return points

        chin = [
            (int(round(left + width * (0.18 + i * 0.08))), int(round(top + height * (0.86 + 0.035 * abs(8 - i) / 8))))
            for i in range(17)
        ]
        top_lip = [
            (
                int(round(mouth_left[0] + (mouth_right[0] - mouth_left[0]) * i / 6)),
                int(round(mouth_left[1] + (mouth_right[1] - mouth_left[1]) * i / 6 - height * 0.025 * (1 - abs(3 - i) / 3))),
            )
            for i in range(7)
        ]
        return {
            "nose_bridge": [(int(round((left_eye[0] + right_eye[0]) / 2)), int(round((left_eye[1] + right_eye[1]) / 2))), (int(round(nose[0])), int(round(nose[1])))],
            "chin": chin,
            "left_eye": eye_contour(left_eye),
            "right_eye": eye_contour(right_eye),
            "top_lip": top_lip,
        }

    def _extract_records(self, image: np.ndarray) -> List[Tuple[Dict[str, Any], FaceBox, Dict[str, List[Tuple[int, int]]]]]:
        normalized = self._normalize_image(image)
        landmarks = self._detect_landmarks(normalized)
        embeddings = self._represent(normalized, landmarks)
        output = []
        for embedding_record in embeddings:
            face_box = self._record_box(embedding_record, normalized.shape)
            # Landmarks are already matched by the new _represent flow.
            output.append((embedding_record, face_box, self._landmarks_for_liveness(embedding_record, face_box)))
        return output

    def extract_landmarks(
        self,
        image: np.ndarray,
    ) -> Tuple[FaceBox, Dict[str, List[Tuple[int, int]]]]:
        """Detect one face and return only landmarks for fast motion checks.

        Active liveness does not need a recognition embedding. Keeping this
        path detector-only reduces per-frame latency and prevents the browser
        from queuing heavyweight neural-network requests during a challenge.
        """
        normalized = self._normalize_image(image)
        landmark_records = self._detect_landmarks(normalized)
        if not landmark_records:
            raise ValueError("No face detected in the image.")
        if len(landmark_records) > 1:
            raise ValueError(f"Multiple faces ({len(landmark_records)}) detected. Keep only one face in frame.")
        record = landmark_records[0]
        face_box = self._record_box(record, normalized.shape)
        return face_box, self._landmarks_for_liveness(record, face_box)

    def extract_face(
        self,
        image: np.ndarray,
        strict_quality: bool = True,
    ) -> Tuple[List[float], FaceBox, Dict[str, List[Tuple[int, int]]]]:
        from .quality import FaceQualityAssessor

        records = self._extract_records(image)
        if len(records) == 0:
            raise ValueError("No face detected in the image.")
        if len(records) > 1:
            raise ValueError(f"Multiple faces ({len(records)}) detected. Registration requires exactly ONE face.")

        embedding_record, face_box, landmarks = records[0]
        embedding = self._embedding_array(embedding_record.get("embedding", []))
        if strict_quality:
            quality = FaceQualityAssessor().assess_quality(self._normalize_image(image), face_box)
            if not quality["passed"]:
                raise ValueError(f"Image Quality Check Failed: {quality['reason']}")
        return embedding.tolist(), face_box, landmarks

    def extract_multiple_faces(self, image: np.ndarray) -> List[Tuple[List[float], FaceBox]]:
        results = []
        for embedding_record, face_box, _ in self._extract_records(image):
            try:
                embedding = self._embedding_array(embedding_record.get("embedding", []))
                results.append((embedding.tolist(), face_box))
            except ValueError:
                continue
        return results

    def verify_identity(self, live_embedding: List[float], stored_embedding: List[float]) -> Tuple[bool, float]:
        live_np = self._embedding_array(live_embedding)
        stored_np = self._embedding_array(stored_embedding)
        live_norm = np.linalg.norm(live_np)
        stored_norm = np.linalg.norm(stored_np)
        if live_norm == 0 or stored_norm == 0:
            raise ValueError("Face embedding has zero magnitude.")
        similarity = float(np.dot(live_np, stored_np) / (live_norm * stored_norm))
        distance = 1.0 - max(-1.0, min(1.0, similarity))
        if distance < 1e-12:
            distance = 0.0
        return distance <= self.authentication_tolerance, distance

    def search_1_to_n(self, live_embedding: List[float], database: Dict[str, List[float]]) -> Dict[str, Any]:
        live_np = self._embedding_array(live_embedding)
        live_norm = np.linalg.norm(live_np)
        if live_norm == 0:
            raise ValueError("Face embedding has zero magnitude.")

        best_match_id = None
        best_distance = float("inf")
        for student_id, stored_embedding in database.items():
            try:
                stored_np = self._embedding_array(stored_embedding)
                stored_norm = np.linalg.norm(stored_np)
                if stored_norm == 0:
                    continue
                similarity = float(np.dot(live_np, stored_np) / (live_norm * stored_norm))
                distance = 1.0 - max(-1.0, min(1.0, similarity))
                if distance < 1e-12:
                    distance = 0.0
            except ValueError:
                continue
            if distance < best_distance:
                best_distance = distance
                best_match_id = str(student_id)

        return {
            "authenticated": best_match_id is not None and best_distance <= self.authentication_tolerance,
            "student_id": best_match_id if best_match_id is not None and best_distance <= self.authentication_tolerance else None,
            "distance": best_distance,
        }

    def process_stream_frame(self, frame: np.ndarray, required_pose: str) -> Dict[str, Any]:
        from .quality import FaceQualityAssessor
        from .liveness import ActiveLivenessDetector

        result: Dict[str, Any] = {"detected": False, "quality_ok": False, "pose_matched": False, "embedding": None, "reason": ""}
        try:
            records = self._extract_records(frame)
        except (RuntimeError, ValueError) as exc:
            result["reason"] = str(exc)
            return result
        if not records:
            result["reason"] = "No face detected"
            return result
        if len(records) > 1:
            result["reason"] = "Multiple faces detected"
            return result

        embedding_record, face_box, landmarks = records[0]
        result["detected"] = True
        quality = FaceQualityAssessor().assess_quality(self._normalize_image(frame), face_box)
        if not quality["passed"]:
            result["reason"] = quality["reason"]
            return result
        result["quality_ok"] = True

        if required_pose == "STRAIGHT":
            angles = ActiveLivenessDetector.estimate_head_pose(landmarks, frame.shape[:2])
            result["pose_matched"] = abs(angles["yaw"]) < 10 and abs(angles["pitch"]) < 10
            if not result["pose_matched"]:
                result["reason"] = "Look straight at the camera"
        else:
            pose = ActiveLivenessDetector.verify_motion_challenge(landmarks, required_pose, frame.shape[:2])
            result["pose_matched"] = bool(pose["passed"])
            if not result["pose_matched"]:
                result["reason"] = pose["detail"]

        if result["pose_matched"]:
            result["embedding"] = self._embedding_array(embedding_record.get("embedding", [])).tolist()
        return result
