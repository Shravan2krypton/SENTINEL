from typing import List, Dict, Optional, Tuple
import numpy as np

def calculate_iou(boxA: List[float], boxB: List[float]) -> float:
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    boxAArea = max(1e-5, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1e-5, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    return interArea / float(boxAArea + boxBArea - interArea)

class TrackedVehicle:
    def __init__(self, track_id: int, bbox: List[float], vehicle_class: str, pts: float):
        self.track_id = track_id
        self.bbox = bbox
        self.vehicle_class = vehicle_class
        self.first_seen_pts = pts
        self.last_seen_pts = pts
        self.missed_frames = 0
        self.confirmed_plate: Optional[str] = None
        self.plate_confidence: float = 0.0
        self.trajectory: List[Tuple[float, float, float]] = [(
            (bbox[0] + bbox[2]) / 2.0,
            (bbox[1] + bbox[3]) / 2.0,
            pts
        )]

    def update(self, bbox: List[float], pts: float):
        self.bbox = bbox
        self.last_seen_pts = pts
        self.missed_frames = 0
        self.trajectory.append((
            (bbox[0] + bbox[2]) / 2.0,
            (bbox[1] + bbox[3]) / 2.0,
            pts
        ))

class CameraTracker:
    """
    Real-time multi-object tracker for camera-local vehicle identification.
    Ensures track IDs are camera-local as mandated by Rule 17.
    """
    def __init__(self, camera_id: str, iou_threshold: float = 0.35, max_missed: int = 15):
        self.camera_id = camera_id
        self.iou_threshold = iou_threshold
        self.max_missed = max_missed
        self._next_id = 1
        self.active_tracks: Dict[int, TrackedVehicle] = {}

    def update(self, detections: List[dict], pts: float) -> List[TrackedVehicle]:
        """
        detections: list of dicts with {"bbox": [x1, y1, x2, y2], "class": str, "conf": float}
        """
        matched_tracks = set()
        matched_detections = set()

        # Match existing tracks with new detections via IoU
        for track_id, track in list(self.active_tracks.items()):
            best_iou = 0.0
            best_det_idx = -1
            for idx, det in enumerate(detections):
                if idx in matched_detections:
                    continue
                iou = calculate_iou(track.bbox, det["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = idx

            if best_iou >= self.iou_threshold and best_det_idx >= 0:
                track.update(detections[best_det_idx]["bbox"], pts)
                matched_tracks.add(track_id)
                matched_detections.add(best_det_idx)
            else:
                track.missed_frames += 1

        # Prune expired tracks
        for track_id in list(self.active_tracks.keys()):
            if self.active_tracks[track_id].missed_frames > self.max_missed:
                del self.active_tracks[track_id]

        # Initialize new tracks for unmatched detections
        for idx, det in enumerate(detections):
            if idx not in matched_detections:
                new_track = TrackedVehicle(
                    track_id=self._next_id,
                    bbox=det["bbox"],
                    vehicle_class=det["class"],
                    pts=pts
                )
                self.active_tracks[self._next_id] = new_track
                self._next_id += 1

        return list(self.active_tracks.values())
