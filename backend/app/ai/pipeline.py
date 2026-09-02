import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import numpy as np
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from app.core.logger import logger
from app.core.events import event_bus, SystemEvent
from app.models.detection import ANPRDetection, VehicleTrack
from app.models.camera import Camera
from app.ai.detector import vehicle_detector
from app.ai.tracker import CameraTracker
from app.ai.anpr import anpr_engine
from app.ai.temporal_fusion import temporal_fusion

class AIPipeline:
    def __init__(self):
        self._trackers: Dict[str, CameraTracker] = {}

    def get_tracker(self, camera_id: str) -> CameraTracker:
        if camera_id not in self._trackers:
            self._trackers[camera_id] = CameraTracker(camera_id=camera_id)
        return self._trackers[camera_id]

    def process_frame(
        self,
        camera_id: str,
        frame: np.ndarray,
        pts_timestamp: float,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        End-to-end AI Frame Inference Pipeline:
        1. Vehicle Detection (YOLOv8)
        2. Camera-local tracking (CameraTracker)
        3. License Plate Crop + Preprocessing + OCR (anpr_engine)
        4. Temporal OCR Multi-frame Fusion (temporal_fusion)
        5. ANPR confirmation & Database persistence
        6. Watchlist Evaluation & Alert trigger
        """
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            return []

        # Convert pts float to timezone-aware datetime
        pts_datetime = datetime.fromtimestamp(pts_timestamp, tz=timezone.utc)

        # 1. Vehicle Detection
        detections = vehicle_detector.detect(frame, pts_timestamp)
        if not detections:
            return []

        # 2. Camera-local Tracking
        tracker = self.get_tracker(camera_id)
        active_tracks = tracker.update(detections, pts_timestamp)

        results = []

        for track in active_tracks:
            # 3. License plate extraction from vehicle bounding box
            det_id = f"det_{camera_id}_{track.track_id}_{int(pts_timestamp * 1000)}"
            anpr_res = anpr_engine.extract_plate(frame, track.bbox, det_id)

            if anpr_res:
                raw_plate = anpr_res["plate_raw"]
                conf = anpr_res["confidence"]
                evidence_url = anpr_res["evidence_url"]

                # 4. Temporal OCR Fusion across frames for this tracked vehicle
                track_key = f"{camera_id}_{track.track_id}"
                fused_plate, fused_conf, count = temporal_fusion.add_observation(
                    track_key=track_key,
                    raw_plate=raw_plate,
                    confidence=conf,
                    pts=pts_timestamp
                )

                if fused_plate:
                    track.confirmed_plate = fused_plate
                    track.plate_confidence = fused_conf

                    # 5. Persist high-confidence ANPR Detection in PostgreSQL/PostGIS
                    geom_expr = ST_SetSRID(ST_MakePoint(camera.longitude, camera.latitude), 4326)
                    db_det = ANPRDetection(
                        id=det_id,
                        camera_id=camera_id,
                        plate_raw=raw_plate,
                        plate_normalized=fused_plate,
                        confidence=fused_conf,
                        timestamp_pts=pts_datetime,
                        vehicle_class=track.vehicle_class,
                        track_id=track.track_id,
                        bbox=track.bbox,
                        evidence_reference=evidence_url,
                        geom=geom_expr
                    )
                    db.add(db_det)
                    db.commit()

                    # Publish normalized internal events
                    event_bus.publish_sync(SystemEvent(
                        event_type="ANPRConfirmed",
                        camera_id=camera_id,
                        payload={
                            "detection_id": det_id,
                            "plate": fused_plate,
                            "confidence": fused_conf,
                            "vehicle_class": track.vehicle_class,
                            "track_id": track.track_id,
                            "location": camera.location_name,
                            "district": camera.district,
                            "pts": pts_datetime.isoformat(),
                            "evidence_url": evidence_url
                        }
                    ))

                    results.append({
                        "detection_id": det_id,
                        "track_id": track.track_id,
                        "vehicle_class": track.vehicle_class,
                        "plate_normalized": fused_plate,
                        "confidence": fused_conf,
                        "bbox": track.bbox,
                        "evidence_url": evidence_url
                    })

        return results

ai_pipeline = AIPipeline()
