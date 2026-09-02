from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class ANPRDetection(Base):
    __tablename__ = "anpr_detections"

    id = Column(String(64), primary_key=True, index=True)
    camera_id = Column(String(100), ForeignKey("cameras.id"), nullable=False, index=True)
    plate_raw = Column(String(30), nullable=False, index=True)
    plate_normalized = Column(String(30), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    timestamp_pts = Column(DateTime(timezone=True), nullable=False, index=True)  # Video PTS timestamp
    vehicle_class = Column(String(30), default="car", index=True)               # car, motorcycle, bus, truck
    track_id = Column(Integer, nullable=True, index=True)                       # Camera-local track ID
    bbox = Column(JSON, nullable=False)                                          # [x1, y1, x2, y2]
    evidence_reference = Column(String(500), nullable=True)                      # Path to plate/vehicle crop
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)   # Spatial position of camera
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    camera = relationship("Camera", back_populates="detections")

    __table_args__ = (
        Index("idx_plate_norm_pts", "plate_normalized", "timestamp_pts"),
        Index("idx_camera_pts", "camera_id", "timestamp_pts"),
    )

class VehicleTrack(Base):
    __tablename__ = "vehicle_tracks"

    id = Column(String(64), primary_key=True, index=True)
    camera_id = Column(String(100), ForeignKey("cameras.id"), nullable=False, index=True)
    local_track_id = Column(Integer, nullable=False)
    vehicle_class = Column(String(30), default="car")
    first_seen_pts = Column(DateTime(timezone=True), nullable=False)
    last_seen_pts = Column(DateTime(timezone=True), nullable=False)
    final_plate = Column(String(30), nullable=True, index=True)
    plate_confidence = Column(Float, default=0.0)
    observation_count = Column(Integer, default=1)
    trajectory = Column(JSON, default=list)  # list of {x, y, pts}
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
