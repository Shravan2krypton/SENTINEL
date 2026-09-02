import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.temporal_fusion import normalize_plate_text, temporal_fusion

client = TestClient(app)

def test_health_endpoint():
    """Verify Section 6 & Phase 1 Health Endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["components"]["database"]["status"] == "UP"
    assert "3.6" in data["components"]["database"]["postgis_version"]
    assert data["components"]["ai_engine"]["status"] == "READY"
    assert data["system_metrics"]["cpu_percent"] >= 0

def test_sentinel_ingest_catalogue():
    """Verify Section 7 & Rule 2 Dynamic Catalogue Discovery."""
    response = client.get("/api/ingest")
    assert response.status_code == 200
    catalogue = response.json()
    assert catalogue["total_cameras"] > 0
    assert len(catalogue["cameras"]) > 0
    
    # Check Vadodara camera item structure
    vad_cam = next((c for c in catalogue["cameras"] if "VAD" in c["camera_id"]), None)
    assert vad_cam is not None
    assert "latitude" in vad_cam
    assert "longitude" in vad_cam
    assert vad_cam["codec"] in ("H264", "H265")

def test_camera_sync_and_listing():
    """Verify Section 8 Camera Registry."""
    sync_res = client.post("/api/cameras/sync-sentinel")
    assert sync_res.status_code == 200
    
    list_res = client.get("/api/cameras")
    assert list_res.status_code == 200
    cameras = list_res.json()
    assert len(cameras) >= 5

def test_auth_login():
    """Verify Section 28 Authentication & RBAC."""
    login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Sentinel@2026"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "Admin"

def test_temporal_ocr_fusion():
    """Verify Section 16 & Rule 16 Temporal Multi-Frame Fusion."""
    track_key = "test_cam_track_99"
    # Observation 1
    p1, c1, cnt1 = temporal_fusion.add_observation(track_key, "GJ-06-AB-1234", 0.81, 1000.1)
    # Observation 2
    p2, c2, cnt2 = temporal_fusion.add_observation(track_key, "GJ06AB1234", 0.93, 1000.2)
    # Observation 3
    p3, c3, cnt3 = temporal_fusion.add_observation(track_key, "GJ06AB1234", 0.95, 1000.3)

    assert p3 == "GJ06AB1234"
    assert c3 > 0.90
    assert cnt3 == 3

def test_plate_text_normalization():
    """Verify OCR error corrections for Indian plate syntax."""
    assert normalize_plate_text("gj-06-ab-1234") == "GJ06AB1234"
    assert normalize_plate_text("G1-06-AB-1234") == "GJ06AB1234"
    assert normalize_plate_text("GJ-O6-AB-1234") == "GJ06AB1234"

def test_watchlist_crud_and_matching():
    """Verify Section 19 & 20 Watchlist and Alert Engine."""
    # Login as admin to get token
    login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Sentinel@2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add vehicle to watchlist
    target_plate = "GJ06AB1234"
    wl_res = client.post("/api/watchlist", json={
        "plate_number": target_plate,
        "category": "stolen",
        "priority": "CRITICAL",
        "description": "Reported stolen in Alkapuri, Vadodara. High priority alert.",
        "vehicle_make_model": "Tata Harrier (Silver)"
    }, headers=headers)
    # Either 201 or 409 if already added
    assert wl_res.status_code in (201, 409)

    # Check alert stats endpoint
    stats_res = client.get("/api/alerts/summary/stats")
    assert stats_res.status_code == 200
    assert "active_total" in stats_res.json()

def test_journey_reconstruction_structure():
    """Verify Section 23 & 24 Observed vs Inferred Movement distinction."""
    login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Sentinel@2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    journey_res = client.get("/api/vehicles/GJ06AB1234/journey", headers=headers)
    assert journey_res.status_code == 200
    journey = journey_res.json()
    assert "plate_number" in journey
    assert "steps" in journey
    assert "observed_points" in journey
    assert "inferred_polyline" in journey

if __name__ == "__main__":
    test_health_endpoint()
    test_sentinel_ingest_catalogue()
    test_camera_sync_and_listing()
    test_auth_login()
    test_temporal_ocr_fusion()
    test_plate_text_normalization()
    test_watchlist_crud_and_matching()
    test_journey_reconstruction_structure()
    print("All backend integration tests passed successfully!")
