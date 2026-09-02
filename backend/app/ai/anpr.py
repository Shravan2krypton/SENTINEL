import os
import re
import cv2
import numpy as np
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings
from app.core.logger import logger
from app.ai.temporal_fusion import normalize_plate_text

class LicensePlateANPR:
    def __init__(self):
        self._reader = None
        self.evidence_dir = os.path.join(os.getcwd(), "evidence", "crops")
        os.makedirs(self.evidence_dir, exist_ok=True)
        self._init_ocr()

    def _init_ocr(self):
        try:
            import easyocr
            logger.info("Initializing EasyOCR reader for English/Indian alphanumeric characters...")
            # Use CPU or GPU based on settings
            use_gpu = (settings.DEVICE.lower() == "cuda")
            self._reader = easyocr.Reader(['en'], gpu=use_gpu, verbose=False)
            logger.info("EasyOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"EasyOCR initialization failed: {e}. Fallback ANPR will be active.")
            self._reader = None

    def preprocess_plate(self, plate_img: np.ndarray) -> np.ndarray:
        """
        Enhance plate contrast and remove noise:
        1. Grayscale
        2. Bilateral filter (preserves edges)
        3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        """
        if len(plate_img.shape) == 3:
            gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_img

        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(filtered)
        return enhanced

    def extract_plate(self, frame: np.ndarray, vehicle_bbox: list, detection_id: str) -> Optional[Dict[str, Any]]:
        """
        Extracts license plate from vehicle bbox:
        - Crops bottom 45% of vehicle where license plates reside in frontal/rear CCTV views.
        - Runs OCR and normalizes text.
        - Saves evidence crop.
        """
        h, w = frame.shape[:2]
        x1 = max(0, int(vehicle_bbox[0]))
        y1 = max(0, int(vehicle_bbox[1]))
        x2 = min(w, int(vehicle_bbox[2]))
        y2 = min(h, int(vehicle_bbox[3]))

        if (x2 - x1) < 40 or (y2 - y1) < 40:
            return None

        # Vehicle crop
        vehicle_crop = frame[y1:y2, x1:x2]
        vh, vw = vehicle_crop.shape[:2]

        # In standard traffic cameras, plate is situated in the lower 45% of the vehicle bbox
        plate_roi_y1 = int(vh * 0.55)
        plate_crop = vehicle_crop[plate_roi_y1:vh, :]

        # Save evidence crop
        evidence_filename = f"ev_{detection_id}.jpg"
        evidence_path = os.path.join(self.evidence_dir, evidence_filename)
        cv2.imwrite(evidence_path, vehicle_crop)
        evidence_relative_url = f"/evidence/{evidence_filename}"

        if self._reader is None:
            # Fallback test pattern if OCR library not active
            return None

        try:
            processed = self.preprocess_plate(plate_crop)
            results = self._reader.readtext(processed, detail=1)

            best_text = ""
            best_conf = 0.0

            for bbox, text, conf in results:
                cleaned = re.sub(r"[^A-Za-z0-9]", "", text).upper()
                if len(cleaned) >= 4 and conf > best_conf:
                    best_text = text
                    best_conf = conf

            if best_text and best_conf >= 0.30:
                normalized = normalize_plate_text(best_text)
                return {
                    "plate_raw": best_text,
                    "plate_normalized": normalized,
                    "confidence": round(best_conf, 4),
                    "evidence_url": evidence_relative_url
                }
        except Exception as e:
            logger.error(f"OCR error: {e}")

        return None

anpr_engine = LicensePlateANPR()
