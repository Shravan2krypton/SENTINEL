from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class VMSAdapter(ABC):
    """
    Standard VMS Federation Interface adhering to 'Federate, Don't Replace'.
    Provides uniform abstraction across Milestone, Genetec, Hikvision, ONVIF, and RTSP.
    """
    @abstractmethod
    def discover_cameras(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_stream(self, camera_id: str, stream_type: str = "MAIN") -> Optional[str]:
        pass

    @abstractmethod
    def get_camera_status(self, camera_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_events(self, camera_id: str) -> List[Dict[str, Any]]:
        pass

class RTSPAdapter(VMSAdapter):
    """Native standard RTSP/TCP adapter."""
    def __init__(self, host: str, port: int = 554, transport: str = "tcp"):
        self.host = host
        self.port = port
        self.transport = transport

    def discover_cameras(self) -> List[Dict[str, Any]]:
        return []

    def get_stream(self, camera_id: str, stream_type: str = "MAIN") -> Optional[str]:
        return f"rtsp://{self.host}:{self.port}/stream/{camera_id}?transport={self.transport}"

    def get_camera_status(self, camera_id: str) -> Dict[str, Any]:
        return {"camera_id": camera_id, "status": "ONLINE", "protocol": "RTSP/TCP"}

    def get_events(self, camera_id: str) -> List[Dict[str, Any]]:
        return []

class ONVIFAdapter(VMSAdapter):
    """ONVIF Profile S/T discovery adapter."""
    def __init__(self, host: str, port: int = 80, username: str = "", password: str = ""):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

    def discover_cameras(self) -> List[Dict[str, Any]]:
        return []

    def get_stream(self, camera_id: str, stream_type: str = "MAIN") -> Optional[str]:
        return f"rtsp://{self.host}:554/onvif1"

    def get_camera_status(self, camera_id: str) -> Dict[str, Any]:
        return {"camera_id": camera_id, "status": "ONLINE", "protocol": "ONVIF"}

    def get_events(self, camera_id: str) -> List[Dict[str, Any]]:
        return []
