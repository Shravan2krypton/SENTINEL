# Sentinel Platform — Hackathon Judge Demonstration Guide

This guide describes the end-to-end operational workflow for evaluating the Sentinel CCTV Intelligence Platform.

---

## 1. Launch Services

### Backend (FastAPI + Neon PostgreSQL + PostGIS)
```powershell
cd c:\Users\Nikhil\OneDrive\Desktop\Gujarat
$env:PYTHONPATH='backend'
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + TypeScript + Tailwind + Leaflet)
```powershell
cd c:\Users\Nikhil\OneDrive\Desktop\Gujarat\frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 2. Step-by-Step Judge Evaluation Walkthrough

### Step 1: Open Operations Dashboard
- The dashboard automatically connects as **Admin** and displays the live telemetry status across the Gujarat CCTV Grid.
- Real camera nodes are loaded from the cloud database with PostGIS spatial coordinates.

### Step 2: Dynamic Sentinel Catalogue Ingest (`GET /api/ingest`)
- Click **"Sync Sentinel Ingest"** on the top banner.
- Observe dynamic query to `GET /api/ingest`, discovery of all 8 statewide cameras, Pydantic validation, and local registry synchronization.

### Step 3: Statewide GIS Map
- Switch to the **"Statewide GIS"** view.
- Inspect geographically distributed cameras in Vadodara, Anand, Ahmedabad, Gandhinagar, Surat, and Rajkot.
- Click any camera node to view live resolution, codec (H.264 / H.265), and telemetry.

### Step 4: Live Monitoring & AI Video Stream
- Navigate to **"Live Monitoring"**.
- View the unified stream player showing real video frames with PTS timestamp OSD overlay and live AI bounding boxes.

### Step 5: Target Watchlist Engine
- Open **"Watchlist"**.
- Note active target plate `GJ06AB1234` (Silver Tata Harrier, Stolen in Vadodara).
- Click **"Add Target Vehicle"** to register any custom plate with Category (Stolen/Wanted) and Priority (Critical/High).

### Step 6: Real-Time Alerts Dispatch
- Switch to **"Real-Time Alerts"**.
- Notice high-priority automated alerts dispatched via WebSocket.
- Test the operational **"Acknowledge"** and **"Resolve"** buttons.

### Step 7: Vehicle Intelligence & Journey Reconstruction (The Core Showcase)
- Go to **"Vehicle Intelligence"**.
- Search target registration: `GJ06AB1234` and click **"Reconstruct Journey"**.
- Observe:
  1. **VAHAN Registry Profile**: Integrated lookup displaying owner (Suresh Patel), vehicle model (Tata Harrier), fuel type, and Vadodara RTO registration.
  2. **Interactive Spatial Map**: Numbered cyan pins indicating verified CCTV sightings and dashed yellow lines showing inferred highway transit along NH-48 / NE-1.
  3. **Structured Journey Chronology**:
     - Observation #1: Vadodara Express Highway Entry at 10:21 (Confidence 94%)
     - Inferred Transit: 38.2 km along NH-48 (~27 mins at ~85 km/h)
     - Observation #2: Anand Express Highway Toll Plaza at 10:48 (Confidence 96%)
     - Inferred Transit: 64.5 km along NE-1 (~39 mins at ~99 km/h)
     - Observation #3: Ahmedabad SP Ring Road Interchange at 11:27 (Confidence 98%)

### Step 8: Case Dossier & Export
- Open **"Case Dossier"**.
- Generate an official case file and click **"Print / Save PDF"** to create a court-admissible evidentiary document.

### Step 9: System Health & Audit Trail
- Open **"System Health"** to view real Neon PostgreSQL + PostGIS 3.6 latency, CPU/RAM utilization, and AI engine status.
- Open **"Audit Logs"** to view the immutable security log of all queries and vehicle searches performed during the session.
