from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status, Depends
from app.schemas.sentinel_ingest import SentinelCatalogueResponse, SentinelCameraItem
from app.api.v1.auth import require_roles
from app.models.user import User

router = APIRouter(tags=["Sentinel Ingest Gateway"])

# Real-time state of cameras in the Sentinel Grid catalogue
# Dynamic discovery allows new cameras to be ingested without restart
SENTINEL_GRID_CATALOGUE: List[dict] = [
    {
        "camera_id": "CAM-GJ-VAD-001",
        "name": "Vadodara Express Highway Entry (NH-48)",
        "location": "Golden Chokdi, Vadodara",
        "district": "Vadodara",
        "department_id": "DEPT_VADODARA_TRAFFIC",
        "latitude": 22.3482,
        "longitude": 73.2201,
        "codec": "H264",
        "resolution": "1920x1080",
        "reported_fps": 25.0,
        "bitrate_kbps": 4096,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/vadodara_nh48_chokdi",
        "hls_url": "/api/streams/CAM-GJ-VAD-001/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False, "aspect_ratio": "16:9", "color_space": "bt709"},
        "capabilities": {"anpr": True, "ptz": False, "night_vision": True}
    },
    {
        "camera_id": "CAM-GJ-VAD-002",
        "name": "Vadodara Alkapuri RC Dutt Road",
        "location": "Alkapuri, Vadodara",
        "district": "Vadodara",
        "department_id": "DEPT_VADODARA_TRAFFIC",
        "latitude": 22.3129,
        "longitude": 73.1812,
        "codec": "H265",
        "resolution": "2560x1440",
        "reported_fps": 30.0,
        "bitrate_kbps": 6144,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/vadodara_alkapuri",
        "hls_url": "/api/streams/CAM-GJ-VAD-002/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False, "aspect_ratio": "16:9", "color_space": "bt709"},
        "capabilities": {"anpr": True, "ptz": True, "night_vision": True}
    },
    {
        "camera_id": "CAM-GJ-AND-001",
        "name": "Anand Express Highway Toll Plaza (NE-1)",
        "location": "Vasad-Anand Expressway Toll, Anand",
        "district": "Anand",
        "department_id": "DEPT_ANAND_HIGHWAY",
        "latitude": 22.5298,
        "longitude": 72.9832,
        "codec": "H264",
        "resolution": "1920x1080",
        "reported_fps": 25.0,
        "bitrate_kbps": 3072,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/anand_expressway_toll",
        "hls_url": "/api/streams/CAM-GJ-AND-001/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False, "aspect_ratio": "16:9"},
        "capabilities": {"anpr": True, "ptz": False, "night_vision": True}
    },
    {
        "camera_id": "CAM-GJ-AND-002",
        "name": "Anand Amul Dairy Circle",
        "location": "Amul Dairy Road, Anand",
        "district": "Anand",
        "department_id": "DEPT_ANAND_HIGHWAY",
        "latitude": 22.5645,
        "longitude": 72.9289,
        "codec": "H264",
        "resolution": "1920x1080",
        "reported_fps": 20.0,
        "bitrate_kbps": 2048,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/anand_amul_circle",
        "hls_url": "/api/streams/CAM-GJ-AND-002/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False},
        "capabilities": {"anpr": True, "ptz": False}
    },
    {
        "camera_id": "CAM-GJ-AHM-001",
        "name": "Ahmedabad SP Ring Road Expressway Interchange",
        "location": "SP Ring Road, Odhav Junction, Ahmedabad",
        "district": "Ahmedabad",
        "department_id": "DEPT_AHMEDABAD_COMMAND",
        "latitude": 23.0039,
        "longitude": 72.6710,
        "codec": "H264",
        "resolution": "1920x1080",
        "reported_fps": 30.0,
        "bitrate_kbps": 4096,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/ahmedabad_sp_ring_road",
        "hls_url": "/api/streams/CAM-GJ-AHM-001/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False},
        "capabilities": {"anpr": True, "ptz": False, "night_vision": True}
    },
    {
        "camera_id": "CAM-GJ-AHM-002",
        "name": "Ahmedabad SG Highway ISKCON Cross Road",
        "location": "SG Highway, Ahmedabad",
        "district": "Ahmedabad",
        "department_id": "DEPT_AHMEDABAD_COMMAND",
        "latitude": 23.0284,
        "longitude": 72.5068,
        "codec": "H265",
        "resolution": "2560x1440",
        "reported_fps": 25.0,
        "bitrate_kbps": 5120,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/ahmedabad_sg_highway",
        "hls_url": "/api/streams/CAM-GJ-AHM-002/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False},
        "capabilities": {"anpr": True, "ptz": True, "night_vision": True}
    },
    {
        "camera_id": "CAM-GJ-GND-001",
        "name": "Gandhinagar CH-3 Circle Secretariat",
        "location": "Sector 11, Gandhinagar",
        "district": "Gandhinagar",
        "department_id": "DEPT_GANDHINAGAR_HQ",
        "latitude": 23.2156,
        "longitude": 72.6369,
        "codec": "H264",
        "resolution": "1920x1080",
        "reported_fps": 25.0,
        "bitrate_kbps": 2048,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/gandhinagar_secretariat",
        "hls_url": "/api/streams/CAM-GJ-GND-001/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False},
        "capabilities": {"anpr": True, "ptz": False}
    },
    {
        "camera_id": "CAM-GJ-SUR-001",
        "name": "Surat Ring Road Majura Gate",
        "location": "Majura Gate, Surat",
        "district": "Surat",
        "department_id": "DEPT_SURAT_SURVEILLANCE",
        "latitude": 21.1762,
        "longitude": 72.8223,
        "codec": "H265",
        "resolution": "1920x1080",
        "reported_fps": 30.0,
        "bitrate_kbps": 3072,
        "live_status": "ONLINE",
        "rtsp_url": "rtsp://stream.gujaratcctv.gov.in/live/surat_majura_gate",
        "hls_url": "/api/streams/CAM-GJ-SUR-001/feed",
        "whep_url": None,
        "stream_properties": {"interlaced": False},
        "capabilities": {"anpr": True, "ptz": True}
    }
]

@router.get("/ingest", response_model=SentinelCatalogueResponse)
async def get_sentinel_catalogue(
    district: Optional[str] = Query(None, description="Filter by district"),
    status: Optional[str] = Query(None, description="Filter by status (ONLINE, OFFLINE)")
):
    """
    Primary Sentinel Camera Grid Catalogue Ingest Endpoint.
    Dynamically serves all registered cameras across Gujarat CCTV network.
    """
    # Handle direct function invocation where FastAPI Query object is default
    dist_str = district if isinstance(district, str) else None
    stat_str = status if isinstance(status, str) else None

    cameras = SENTINEL_GRID_CATALOGUE
    if dist_str:
        cameras = [c for c in cameras if c.get("district", "").lower() == dist_str.lower()]
    if stat_str:
        cameras = [c for c in cameras if c.get("live_status", "").upper() == stat_str.upper()]

    validated_cameras = [SentinelCameraItem(**c) for c in cameras]
    return SentinelCatalogueResponse(
        gateway_id="SENTINEL_GRID_GUJARAT_GW01",
        timestamp=datetime.now(timezone.utc).isoformat(),
        total_cameras=len(validated_cameras),
        cameras=validated_cameras
    )

@router.post("/ingest/register", response_model=SentinelCameraItem, status_code=status.HTTP_201_CREATED)
async def register_sentinel_camera(
    camera: SentinelCameraItem,
    current_user: User = Depends(require_roles(["ADMIN"]))  # SEC-003: Only ADMIN can inject cameras
):
    """
    Dynamically register a new camera into the Sentinel Grid catalogue.
    Requires ADMIN role to prevent camera injection attacks.
    """
    existing_idx = next((i for i, c in enumerate(SENTINEL_GRID_CATALOGUE) if c["camera_id"] == camera.camera_id), None)
    camera_dict = camera.model_dump()
    if existing_idx is not None:
        SENTINEL_GRID_CATALOGUE[existing_idx] = camera_dict
    else:
        SENTINEL_GRID_CATALOGUE.append(camera_dict)
    return camera
