from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    state = Column(String(50), default="Gujarat")
    district = Column(String(100), nullable=False)
    contact_email = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    cameras = relationship("Camera", back_populates="department")

class VMS(Base):
    __tablename__ = "vms_nodes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    vendor = Column(String(100), default="Generic RTSP/ONVIF")  # Milestone, Genetec, Hikvision, Dahua, RTSP
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=554)
    protocol = Column(String(20), default="RTSP")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    cameras = relationship("Camera", back_populates="vms")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(100), primary_key=True, index=True)  # dynamic external camera ID from Sentinel
    name = Column(String(200), nullable=False)
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    vms_id = Column(String(50), ForeignKey("vms_nodes.id"), nullable=True)
    location_name = Column(String(255), nullable=False)
    district = Column(String(100), default="Vadodara")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    
    # Stream capabilities & metadata from Sentinel catalogue
    codec = Column(String(20), default="H264")  # H264, H265
    resolution = Column(String(30), default="1920x1080")
    reported_fps = Column(Float, default=25.0)
    bitrate_kbps = Column(Integer, default=2048)
    rtsp_url = Column(String(500), nullable=False)
    hls_url = Column(String(500), nullable=True)
    whep_url = Column(String(500), nullable=True)
    capabilities = Column(JSON, default=dict)
    
    # Status
    status = Column(String(30), default="ONLINE")  # ONLINE, OFFLINE, DEGRADED, RECONNECTING
    is_ai_enabled = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    department = relationship("Department", back_populates="cameras")
    vms = relationship("VMS", back_populates="cameras")
    streams = relationship("Stream", back_populates="camera", cascade="all, delete-orphan")
    health_records = relationship("CameraHealth", back_populates="camera", cascade="all, delete-orphan")
    detections = relationship("ANPRDetection", back_populates="camera", cascade="all, delete-orphan")

class Stream(Base):
    __tablename__ = "camera_streams"

    id = Column(String(100), primary_key=True, index=True)
    camera_id = Column(String(100), ForeignKey("cameras.id"), nullable=False)
    stream_type = Column(String(30), default="MAIN")  # MAIN, SUB, SNAPSHOT
    url = Column(String(500), nullable=False)
    transport = Column(String(10), default="tcp")     # tcp, udp
    codec = Column(String(20), default="H264")
    resolution = Column(String(30), default="1920x1080")
    fps = Column(Float, default=25.0)
    is_active = Column(Boolean, default=True)

    camera = relationship("Camera", back_populates="streams")

class CameraHealth(Base):
    __tablename__ = "camera_health"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(100), ForeignKey("cameras.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False)  # ONLINE, OFFLINE, DEGRADED, RECONNECTING
    latency_ms = Column(Float, default=0.0)
    packet_loss_pct = Column(Float, default=0.0)
    actual_fps = Column(Float, default=0.0)
    reconnect_attempts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    camera = relationship("Camera", back_populates="health_records")
