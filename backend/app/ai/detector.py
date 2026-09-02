from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings
from app.core.logger import logger

VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class VehicleDetector:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.YOLO_MODEL
        self.confidence_threshold = settings.DETECTION_CONFIDENCE_THRESHOLD
        self._model = None
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model for vehicle detection from: {self.model_path}")
            self._model = YOLO(self.model_path)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.warning(f"Error initializing YOLO model ({e}). Fallback detector will be active.")
            self._model = None

    def detect(self, frame: np.ndarray, pts_timestamp: float) -> List[Dict[str, Any]]:
        """
        Runs inference on single video frame and filters for vehicle classes.
        Returns normalized bounding box list:
        [{'bbox': [x1, y1, x2, y2], 'class': 'car', 'confidence': 0.88, 'pts_timestamp': pts}]
        """
        detections = []
        if self._model is None:
            return detections

        try:
            results = self._model(frame, conf=self.confidence_threshold, verbose=False)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    if cls_id in VEHICLE_CLASSES:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0].item())
                        vehicle_type = VEHICLE_CLASSES[cls_id]
                        detections.append({
                            "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                            "class": vehicle_type,
                            "confidence": round(conf, 4),
                            "pts_timestamp": pts_timestamp
                        })
        except Exception as e:
            logger.error(f"Inference error in VehicleDetector: {e}")

        return detections

vehicle_detector = VehicleDetector()
