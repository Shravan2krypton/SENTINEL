import asyncio
import json
from typing import Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.logger import logger
from app.core.events import event_bus, SystemEvent
from app.core.security import decode_access_token

router = APIRouter(tags=["Real-Time WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

ws_manager = ConnectionManager()

# Hook into the EventBus so all system events broadcast over WebSocket
def _broadcast_system_event(event: SystemEvent):
    payload = {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "timestamp": event.timestamp.isoformat(),
        "camera_id": event.camera_id,
        "correlation_id": event.correlation_id,
        "data": event.payload
    }
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(ws_manager.broadcast(payload))
    except RuntimeError:
        pass

event_bus.subscribe("*", _broadcast_system_event)

@router.websocket("/api/ws/alerts")
async def websocket_alerts_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="Bearer JWT token for WebSocket authentication")
):
    """
    SEC-002 FIX: WebSocket now requires a valid JWT token passed as ?token=<jwt>.
    Unauthenticated connections are rejected with close code 4001.
    """
    # Validate token before accepting the connection
    if not token:
        await websocket.close(code=4001, reason="Unauthorized: No authentication token provided")
        logger.warning("WebSocket connection rejected: no token provided")
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized: Invalid or expired token")
        logger.warning("WebSocket connection rejected: invalid token")
        return

    username = payload.get("sub", "unknown")
    role = payload.get("role", "unknown")
    logger.info(f"WebSocket authenticated: user={username} role={role}")

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {username}: {e}")
        ws_manager.disconnect(websocket)

