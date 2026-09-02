from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class DiscoveryScanRequest(BaseModel):
    network_subnet: str = "10.200.0.0/16"
    scan_sentinel_grid: bool = True
    scan_onvif: bool = True
    scan_vms_api: bool = True
    scan_nvr: bool = True

class DiscoveredCameraItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    candidate_id: str
    source_type: str # SENTINEL_GRID, ONVIF, VMS_API, NVR_RTSP
    device_name: str
    location: str
    district: str
    ip_address: str
    port: int = 554
    codec: str = "H264"
    resolution: str = "1920x1080"
    reported_fps: float = 25.0
    status: str = "CANDIDATE" # DISCOVERED, CANDIDATE, VALIDATED, IMPORTED
    rtsp_url: str
    is_authenticated: bool = True
    capabilities: Dict[str, Any] = {}
    discovered_at: str

class DiscoveryResultsResponse(BaseModel):
    total_discovered: int
    vms_servers_found: int
    nvrs_found: int
    onvif_cameras_found: int
    rtsp_sources_found: int
    reachable_sources: int
    authenticated_sources: int
    stream_available: int
    candidates: List[DiscoveredCameraItem]

class ImportCamerasRequest(BaseModel):
    candidate_ids: List[str]
    processing_policy: str = "CONTINUOUS_ANPR" # CONTINUOUS_ANPR, ON_DEMAND, TEMPORARY_INVESTIGATION

class ImportCamerasResponse(BaseModel):
    imported_count: int
    camera_ids: List[str]
    status: str = "SUCCESS"
    message: str
