from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import re

def normalize_plate_text(raw_text: str) -> str:
    """
    Clean and normalize Indian license plate characters:
    - Uppercase, strip whitespace, hyphens, and non-alphanumeric chars.
    - Fix common OCR confusions in state/district codes:
      e.g. 'O' vs '0', 'I' vs '1', 'B' vs '8', 'S' vs '5', 'Z' vs '2'.
    """
    if not raw_text:
        return ""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
    
    # Common Indian vehicle plate pattern: 2 letters (State) + 2 digits (RTO) + 1-3 letters (Series) + 4 digits
    # For Gujarat plates starting with GJ:
    if len(cleaned) >= 4 and cleaned.startswith("G"):
        # Fix 2nd character to 'J' if OCR read '1' or 'I'
        if cleaned[1] in ("1", "I", "T"):
            cleaned = "GJ" + cleaned[2:]
            
    # Fix digit slots (chars 2 and 3) if letters were read
    if len(cleaned) >= 4 and cleaned.startswith("GJ"):
        char2 = cleaned[2].replace("O", "0").replace("D", "0").replace("I", "1").replace("Z", "2").replace("S", "5").replace("B", "8")
        char3 = cleaned[3].replace("O", "0").replace("D", "0").replace("I", "1").replace("Z", "2").replace("S", "5").replace("B", "8")
        cleaned = "GJ" + char2 + char3 + cleaned[4:]

    return cleaned

class TemporalOCRFusion:
    """
    Fuses multiple OCR detections of the same tracked vehicle over consecutive frames.
    Uses confidence-weighted voting and character-level consensus.
    """
    def __init__(self, min_observations: int = 2, min_confidence: float = 0.55):
        self.min_observations = min_observations
        self.min_confidence = min_confidence
        # track_key -> list of (raw_plate, normalized_plate, confidence, pts_timestamp)
        self._history: Dict[str, List[Tuple[str, str, float, float]]] = defaultdict(list)

    def add_observation(self, track_key: str, raw_plate: str, confidence: float, pts: float) -> Tuple[Optional[str], float, int]:
        """
        Record a new frame observation and return (final_plate, aggregated_confidence, observation_count)
        if threshold is reached.
        """
        normalized = normalize_plate_text(raw_plate)
        if not normalized or len(normalized) < 4:
            return None, 0.0, 0

        self._history[track_key].append((raw_plate, normalized, confidence, pts))
        return self.get_fused_result(track_key)

    def get_fused_result(self, track_key: str) -> Tuple[Optional[str], float, int]:
        observations = self._history.get(track_key, [])
        if not observations:
            return None, 0.0, 0

        # Frequency and confidence-weighted score for each unique normalized candidate
        scores: Dict[str, float] = defaultdict(float)
        counts: Dict[str, int] = defaultdict(int)

        for _, norm, conf, _ in observations:
            scores[norm] += conf
            counts[norm] += 1

        # Select candidate with highest cumulative weighted confidence
        best_plate = max(scores.keys(), key=lambda p: scores[p])
        count = counts[best_plate]
        avg_confidence = scores[best_plate] / count

        # Aggregated confidence with boost for multiple agreeing frames
        agreement_boost = min(0.15, (count - 1) * 0.04)
        final_confidence = min(0.99, avg_confidence + agreement_boost)

        if count >= self.min_observations and final_confidence >= self.min_confidence:
            return best_plate, round(final_confidence, 4), count
        elif count == 1 and final_confidence >= 0.85:
            # High-confidence single frame allows early confirmation
            return best_plate, round(final_confidence, 4), count

        return None, round(final_confidence, 4), count

    def prune_track(self, track_key: str):
        if track_key in self._history:
            del self._history[track_key]

temporal_fusion = TemporalOCRFusion()
