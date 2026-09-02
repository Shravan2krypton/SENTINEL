import asyncio
import os
import cv2
import numpy as np
from datetime import datetime, timedelta, timezone
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from app.core.database import SessionLocal
from app.models.camera import Camera
from app.models.detection import ANPRDetection
from app.models.watchlist import WatchlistEntry
from app.models.alert import Alert
from app.services.sentinel_client import sentinel_client
from loguru import logger

def seed_demo_journey():
    """
    Seeds the canonical Gujarat hackathon demonstration case:
    Vehicle 'GJ06AB1234' (Silver Tata Harrier, Stolen in Vadodara)
    Transiting along the National Express Corridor:
      1. Vadodara Express Highway Entry (CAM-GJ-VAD-001) at 10:21
      2. Anand Express Highway Toll Plaza (CAM-GJ-AND-001) at 10:48
      3. Ahmedabad SP Ring Road Interchange (CAM-GJ-AHM-001) at 11:27
    """
    db = SessionLocal()
    try:
        # 1. Ensure cameras are synced
        cameras_count = db.query(Camera).count()
        if cameras_count == 0:
            import asyncio
            cat = asyncio.run(sentinel_client.fetch_catalogue())
            sentinel_client.sync_catalogue_to_db(cat, db)

        # 2. Add Watchlist Entry for GJ06AB1234
        target_plate = "GJ06AB1234"
        wl = db.query(WatchlistEntry).filter(WatchlistEntry.plate_number == target_plate).first()
        if not wl:
            wl = WatchlistEntry(
                id="wl_demo_gj06ab1234",
                plate_number=target_plate,
                category="stolen",
                priority="CRITICAL",
                description="Silver Tata Harrier reported stolen from Alkapuri, Vadodara (FIR #884/2026). Urgent intercept required.",
                vehicle_make_model="Tata Harrier XZA+ (Silver)",
                owner_name="Suresh Patel / Gujarat Logistics",
                case_number="FIR-VAD-884-2026",
                status="ACTIVE",
                created_by="admin"
            )
            db.add(wl)
            db.commit()
            logger.info(f"Seeded Watchlist Target: {target_plate}")

        # 3. Create mock evidence crop images
        evidence_dir = os.path.join(os.getcwd(), "evidence", "crops")
        os.makedirs(evidence_dir, exist_ok=True)

        def create_mock_crop(filename: str, cam_name: str, plate_text: str):
            filepath = os.path.join(evidence_dir, filename)
            if not os.path.exists(filepath):
                img = np.zeros((240, 480, 3), dtype=np.uint8)
                img[:] = (50, 55, 60)
                # Vehicle rear
                cv2.rectangle(img, (60, 40), (420, 200), (140, 140, 150), -1)
                cv2.circle(img, (110, 195), 25, (20, 20, 20), -1)
                cv2.circle(img, (370, 195), 25, (20, 20, 20), -1)
                # Number plate
                cv2.rectangle(img, (160, 120), (320, 170), (0, 215, 255), -1)
                cv2.putText(img, plate_text, (175, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)
                cv2.putText(img, f"SENTINEL CCTV: {cam_name}", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
                cv2.imwrite(filepath, img)

        create_mock_crop("ev_demo_vad_01.jpg", "CAM-GJ-VAD-001 (Vadodara)", target_plate)
        create_mock_crop("ev_demo_and_01.jpg", "CAM-GJ-AND-001 (Anand)", target_plate)
        create_mock_crop("ev_demo_ahm_01.jpg", "CAM-GJ-AHM-001 (Ahmedabad)", target_plate)

        # 4. Create chronologically ordered detections
        base_time = datetime.now(timezone.utc).replace(hour=10, minute=21, second=0, microsecond=0)

        demo_detections = [
            {
                "id": "det_demo_vad_1021",
                "camera_id": "CAM-GJ-VAD-001",
                "plate_raw": "GJ 06 AB 1234",
                "plate_normalized": target_plate,
                "confidence": 0.94,
                "timestamp_pts": base_time,
                "vehicle_class": "car",
                "track_id": 102,
                "bbox": [180.0, 220.0, 540.0, 460.0],
                "evidence_reference": "/evidence/ev_demo_vad_01.jpg"
            },
            {
                "id": "det_demo_and_1048",
                "camera_id": "CAM-GJ-AND-001",
                "plate_raw": "GJ06AB1234",
                "plate_normalized": target_plate,
                "confidence": 0.96,
                "timestamp_pts": base_time + timedelta(minutes=27),
                "vehicle_class": "car",
                "track_id": 405,
                "bbox": [210.0, 190.0, 600.0, 480.0],
                "evidence_reference": "/evidence/ev_demo_and_01.jpg"
            },
            {
                "id": "det_demo_ahm_1127",
                "camera_id": "CAM-GJ-AHM-001",
                "plate_raw": "GJ-06-AB-1234",
                "plate_normalized": target_plate,
                "confidence": 0.98,
                "timestamp_pts": base_time + timedelta(minutes=66),
                "vehicle_class": "car",
                "track_id": 812,
                "bbox": [150.0, 240.0, 580.0, 510.0],
                "evidence_reference": "/evidence/ev_demo_ahm_01.jpg"
            }
        ]

        for d in demo_detections:
            existing_det = db.query(ANPRDetection).filter(ANPRDetection.id == d["id"]).first()
            if not existing_det:
                cam = db.query(Camera).filter(Camera.id == d["camera_id"]).first()
                geom_expr = ST_SetSRID(ST_MakePoint(cam.longitude, cam.latitude), 4326) if cam else None
                new_det = ANPRDetection(
                    id=d["id"],
                    camera_id=d["camera_id"],
                    plate_raw=d["plate_raw"],
                    plate_normalized=d["plate_normalized"],
                    confidence=d["confidence"],
                    timestamp_pts=d["timestamp_pts"],
                    vehicle_class=d["vehicle_class"],
                    track_id=d["track_id"],
                    bbox=d["bbox"],
                    evidence_reference=d["evidence_reference"],
                    geom=geom_expr
                )
                db.add(new_det)

        # 5. Create active Alert for the latest detection
        latest_alert = db.query(Alert).filter(Alert.plate_number == target_plate).first()
        if not latest_alert:
            alert = Alert(
                id="alert_demo_ahm_hit",
                alert_type="WATCHLIST_HIT",
                severity="CRITICAL",
                plate_number=target_plate,
                watchlist_id=wl.id if wl else None,
                camera_id="CAM-GJ-AHM-001",
                timestamp_pts=base_time + timedelta(minutes=66),
                confidence=0.98,
                evidence_url="/evidence/ev_demo_ahm_01.jpg",
                status="ACTIVE",
                notes="CRITICAL HIT: Stolen Tata Harrier intercepted on Ahmedabad SP Ring Road Interchange. Heading west towards SG Highway."
            )
            db.add(alert)

        db.commit()
        logger.info("Demo journey across Vadodara -> Anand -> Ahmedabad seeded successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding demo journey: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_journey()
