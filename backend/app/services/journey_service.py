import math
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.detection import ANPRDetection
from app.models.camera import Camera
from app.models.watchlist import WatchlistEntry
from app.schemas.journey import VehicleJourneyResponse, JourneyStep
from app.core.logger import logger

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class VehicleJourneyService:
    def reconstruct_journey(self, plate_number: str, db: Session) -> VehicleJourneyResponse:
        """
        Reconstructs observed vehicle journey and infers corridor transit between detections.
        Strictly distinguishes OBSERVED DETECTION from INFERRED MOVEMENT.
        """
        # Clean plate
        clean_plate = plate_number.replace("-", "").replace(" ", "").upper()

        # Query all detections for this vehicle sorted chronologically by PTS timestamp
        detections = (
            db.query(ANPRDetection, Camera)
            .join(Camera, ANPRDetection.camera_id == Camera.id)
            .filter(ANPRDetection.plate_normalized == clean_plate)
            .order_by(ANPRDetection.timestamp_pts.asc())
            .all()
        )

        # Check watchlist status
        wl_entry = db.query(WatchlistEntry).filter(
            WatchlistEntry.plate_number == clean_plate,
            WatchlistEntry.status == "ACTIVE"
        ).first()

        if not detections:
            return VehicleJourneyResponse(
                plate_number=clean_plate,
                total_detections=0,
                districts_traversed=[],
                total_estimated_distance_km=0.0,
                is_watchlist_hit=bool(wl_entry),
                watchlist_category=wl_entry.category if wl_entry else None,
                steps=[],
                observed_points=[],
                inferred_polyline=[]
            )

        steps: List[JourneyStep] = []
        observed_points: List[List[float]] = []
        inferred_polyline: List[List[float]] = []
        districts_traversed: List[str] = []
        total_distance = 0.0

        step_idx = 1
        prev_det = None
        prev_cam = None

        for det, cam in detections:
            observed_points.append([cam.latitude, cam.longitude])
            inferred_polyline.append([cam.latitude, cam.longitude])

            if cam.district not in districts_traversed:
                districts_traversed.append(cam.district)

            # If there was a previous camera detection, insert an INFERRED_TRANSIT step
            if prev_det is not None and prev_cam is not None:
                dist_km = haversine_distance_km(prev_cam.latitude, prev_cam.longitude, cam.latitude, cam.longitude)
                time_diff = (det.timestamp_pts - prev_det.timestamp_pts).total_seconds()
                duration_mins = round(max(1.0, time_diff / 60.0), 1)
                speed_kmh = round((dist_km / (time_diff / 3600.0)), 1) if time_diff > 0 else 0.0
                total_distance += dist_km

                # Generate intermediate corridor label
                corridor = f"Transit via NH-48 / NE-1 Corridor ({prev_cam.district} → {cam.district})"

                steps.append(JourneyStep(
                    step_number=step_idx,
                    step_type="INFERRED_TRANSIT",
                    timestamp=prev_det.timestamp_pts,
                    location_name=corridor,
                    district=f"{prev_cam.district} to {cam.district}",
                    latitude=(prev_cam.latitude + cam.latitude) / 2.0,
                    longitude=(prev_cam.longitude + cam.longitude) / 2.0,
                    distance_km=dist_km,
                    duration_minutes=duration_mins,
                    estimated_speed_kmh=speed_kmh,
                    corridor_name=corridor,
                    observation_notes=f"Inferred movement between {prev_cam.name} and {cam.name}. (Not continuously observed)."
                ))
                step_idx += 1

            # Add actual OBSERVED DETECTION step
            steps.append(JourneyStep(
                step_number=step_idx,
                step_type="OBSERVED_DETECTION",
                timestamp=det.timestamp_pts,
                camera_id=cam.id,
                camera_name=cam.name,
                location_name=cam.location_name,
                district=cam.district,
                latitude=cam.latitude,
                longitude=cam.longitude,
                confidence=det.confidence,
                evidence_url=det.evidence_reference,
                vehicle_class=det.vehicle_class,
                observation_notes=f"Observed on camera {cam.id} with confidence {det.confidence:.2f}."
            ))
            step_idx += 1

            prev_det = det
            prev_cam = cam

        return VehicleJourneyResponse(
            plate_number=clean_plate,
            total_detections=len(detections),
            start_time=detections[0][0].timestamp_pts,
            end_time=detections[-1][0].timestamp_pts,
            districts_traversed=districts_traversed,
            total_estimated_distance_km=round(total_distance, 2),
            is_watchlist_hit=bool(wl_entry),
            watchlist_category=wl_entry.category if wl_entry else None,
            steps=steps,
            observed_points=observed_points,
            inferred_polyline=inferred_polyline
        )

journey_service = VehicleJourneyService()
