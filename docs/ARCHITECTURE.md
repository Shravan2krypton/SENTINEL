# Sentinel CCTV Intelligence Platform — Architecture Specification

## Architecture Tenet
> **"FEDERATE, DON'T REPLACE"**

The Sentinel platform introduces an interoperability and AI intelligence layer above existing municipal and highway CCTV/VMS infrastructure across Gujarat State.

---

## High-Level Logical Architecture

```
                       SENTINEL / EXISTING CCTV
                                  │
                                  ▼
                        CAMERA DISCOVERY (/api/ingest)
                                  │
                                  ▼
                         CAMERA REGISTRY (PostgreSQL + PostGIS)
                                  │
                                  ▼
                         VMS / STREAM ADAPTERS (RTSP / ONVIF)
                                  │
                                  ▼
                         STREAM MANAGER (TCP / Backoff Reconnect)
                                  │
                                  ▼
                             DECODER (H.264 / H.265)
                                  │
                                  ▼
                            FRAME PIPELINE (PTS Preservation)
                                  │
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
        LIVE VIEWER                               AI ANALYTICS
     (Low-Latency MJPEG)                   (Ultralytics YOLOv8)
                                                       │
                                                       ▼
                                              VEHICLE DETECTION
                                                       │
                                                       ▼
                                               PLATE ROI DETECTOR
                                                       │
                                                       ▼
                                            PREPROCESSING & EASYOCR
                                                       │
                                                       ▼
                                              TEMPORAL OCR FUSION
                                                       │
                                                       ▼
                                              CAMERA-LOCAL TRACKING
                                                   (ByteTrack)
                                                       │
                                                       ▼
                                              EVENT NORMALIZATION
                                                       │
                                                       ▼
                                            EVENT BUS / WEBSOCKETS
                                                       │
                                  ┌────────────────────┴────────────────────┐
                                  ▼                                         ▼
                           WATCHLIST ENGINE                        CORRELATION ENGINE
                                  │                                         │
                                  ▼                                         ▼
                            ALERTS DISPATCH                        VEHICLE JOURNEY
                                  │                                (Observed vs Inferred)
                                  └────────────────────┬────────────────────┘
                                                       │
                                                       ▼
                                              GIS / COMMAND UI
```

---

## Critical Engineering Principles & Compliance

1. **PTS Timestamp Propagation**: Frame arrival wall-clock time is never substituted for video presentation timestamps (PTS). Speed, dwell, and journey metrics use actual video PTS.
2. **RTSP over TCP**: All RTSP stream connections default to `rtsp_transport=tcp` to eliminate packet drop and UDP packet artifacting.
3. **Exponential Backoff Reconnection**: Failed camera streams reconnect with exponential backoff ($2\text{s} \to 4\text{s} \to 8\text{s} \to 16\text{s} \to 30\text{s}\text{ max}$).
4. **Temporal OCR Fusion**: Aggregates and weights multiple OCR readings across frames for a single tracked vehicle using character consensus and frequency scoring.
5. **Observed vs Inferred Movement**: Strict evidentiary distinction between **Observed Detections** at verified camera nodes and **Inferred Movement** along highway transit corridors (NH-48 / NE-1).
6. **Government Integration Adapters**: Abstracted connectors for VAHAN, Sarathi, and CCTNS without unsupported integration claims.
