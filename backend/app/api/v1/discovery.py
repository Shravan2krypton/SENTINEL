from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import require_roles, get_current_user
from app.schemas.discovery import DiscoveryScanRequest, DiscoveryResultsResponse, ImportCamerasRequest, ImportCamerasResponse
from app.services.discovery_service import discovery_service

router = APIRouter(prefix="/discovery", tags=["Discovery Center (P1)"])

@router.post("/start", response_model=DiscoveryResultsResponse)
async def start_discovery_scan(
    payload: DiscoveryScanRequest,
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR"]))
):
    """
    Triggers scoped network discovery across authorized CCTV subnets, ONVIF devices, and VMS servers.
    """
    res = await discovery_service.scan_network(
        subnet=payload.network_subnet,
        scan_sentinel=payload.scan_sentinel_grid,
        scan_onvif=payload.scan_onvif,
        scan_vms=payload.scan_vms_api,
        scan_nvr=payload.scan_nvr
    )
    return res

@router.get("/results", response_model=DiscoveryResultsResponse)
async def get_discovery_results(
    current_user = Depends(require_roles(["ADMIN", "OPERATOR", "INVESTIGATOR"]))
):
    """
    Returns candidate camera discovery results.
    """
    return discovery_service.get_results()

@router.post("/import", response_model=ImportCamerasResponse)
async def import_discovered_cameras(
    payload: ImportCamerasRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["ADMIN", "OPERATOR"]))
):
    """
    Imports and registers candidate cameras into the PostGIS camera grid with specified processing policy.
    """
    return discovery_service.import_cameras(payload, db)
