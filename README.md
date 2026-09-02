# SENTINEL CCTV INTELLIGENCE PLATFORM
### Interoperability & Intelligence Layer for the Gujarat State CCTV Grid

Built for the Government CCTV Integration Hackathon under the core principle:

> **"FEDERATE, DON'T REPLACE"**

The **Sentinel Platform** federates existing heterogeneous municipal and highway CCTV systems across Gujarat (Vadodara, Anand, Ahmedabad, Gandhinagar, Surat, Rajkot), normalizes video streams over RTSP/TCP, extracts real-time intelligence via an AI pipeline (YOLOv8 + EasyOCR + Temporal OCR Fusion + ByteTrack), correlates cross-camera detections, and reconstructs vehicle journeys with precise GIS mapping and timestamps.

---

## 🏛️ System Features & Highlights

1. **Dynamic Sentinel Ingest (`GET /api/ingest`)**: Zero hardcoding — dynamically discovers cameras, validates schemas via Pydantic, and synchronizes with PostGIS.
2. **Multi-Codec Support**: Tolerates mixed H.264 and H.265 compression over TCP (`rtsp_transport=tcp`) with exponential backoff reconnection.
3. **PTS Timestamp Pipeline**: Strict video presentation timestamp (PTS) preservation from decoder to database.
4. **Temporal OCR Fusion**: Aggregates multi-frame OCR observations for tracked vehicles to synthesize high-confidence plates.
5. **Vehicle Journey Reconstruction**: Reconstructs observed vehicle sightings across cameras while strictly distinguishing **Observed Detections** from **Inferred Highway Transit**.
6. **Target Watchlist & Real-Time Alerts**: Fast in-memory evaluation and WebSocket event broadcast to operations dashboards.
7. **VAHAN & Multi-VMS Adapters**: Extensible adapter interfaces for national vehicle registries and VMS vendors.
8. **RBAC & Append-Only Audit Logging**: Role-based access control (Admin, Operator, Investigator, Viewer, Auditor) with tamper-evident audit logging.
9. **Real Telemetry (`GET /health`)**: Live metrics from Neon PostgreSQL 18.6, PostGIS 3.6, hardware CPU/RAM, and AI readiness.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js v20+ / v24+
- PostgreSQL with PostGIS (Pre-configured with cloud Neon DB)

### 1. Run Backend Server
```powershell
# In project root:
$env:PYTHONPATH='backend'
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation & Swagger UI: `http://localhost:8000/docs`
Health Telemetry: `http://localhost:8000/health`

### 2. Run Frontend Dashboard
```powershell
cd frontend
npm run dev
```
Open Command Dashboard: `http://localhost:5173`

### 3. Run Automated Integration Test Suite
```powershell
$env:PYTHONPATH='backend'
python -m pytest backend/tests/test_backend.py -v
```

---

## 📁 Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entrypoint
│   │   ├── core/                # Database, config, security, event bus, logger
│   │   ├── models/              # Camera, Detection, Watchlist, Alert, User, AuditLog
│   │   ├── schemas/             # Pydantic schemas (Ingest, Journey, Camera, Alert)
│   │   ├── api/v1/              # REST & WebSocket API endpoints
│   │   ├── services/            # Sentinel Client, Stream Manager, Journey Service
│   │   ├── ai/                  # YOLOv8 detector, ANPR, Temporal Fusion, ByteTrack
│   │   └── integrations/        # VMS, VAHAN, and CCTNS adapters
│   ├── tests/                   # Pytest integration test suite
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application shell with WebSocket listener
│   │   ├── components/          # Navigation, LiveMap (Leaflet), StreamPlayer
│   │   ├── views/               # Dashboard, Live, GIS, VehicleSearch, Watchlist, etc.
│   │   └── lib/api.ts           # REST API client & WebSocket manager
│   ├── package.json
│   └── index.html
│
├── docs/
│   ├── ARCHITECTURE.md          # Full architectural design specification
│   └── DEMO_GUIDE.md            # Step-by-step judge demonstration script
└── README.md
```

---

## ⚖️ Hackathon Demonstration Case
- **Plate Number**: `GJ06AB1234`
- **Vehicle**: Silver Tata Harrier XZA+
- **Transit Corridor**: Vadodara Express Highway Entry (10:21) $\to$ Anand Toll Plaza (10:48) $\to$ Ahmedabad SP Ring Road (11:27)
- **Watchlist Classification**: Stolen Vehicle (Critical Priority)
