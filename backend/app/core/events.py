import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Callable, List, Optional
from pydantic import BaseModel, Field
from loguru import logger

class SystemEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "sentinel_core"
    camera_id: Optional[str] = None
    correlation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payload: Dict[str, Any] = Field(default_factory=dict)

class EventBus:
    """
    Abstract Event Bus supporting local in-memory pub-sub with clean pluggability for Kafka.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[SystemEvent], Any]]] = {}
        self._queue: asyncio.Queue[SystemEvent] = asyncio.Queue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None

    def subscribe(self, event_type: str, handler: Callable[[SystemEvent], Any]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.debug(f"Subscribed handler {handler.__name__ if hasattr(handler, '__name__') else str(handler)} to {event_type}")

    async def publish(self, event: SystemEvent):
        await self._queue.put(event)

    def publish_sync(self, event: SystemEvent):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.publish(event))
            else:
                loop.run_until_complete(self.publish(event))
        except Exception:
            # Fallback if no loop is running
            self._dispatch_sync(event)

    def _dispatch_sync(self, event: SystemEvent):
        handlers = self._subscribers.get(event.event_type, []) + self._subscribers.get("*", [])
        for handler in handlers:
            try:
                res = handler(event)
                if asyncio.iscoroutine(res):
                    asyncio.create_task(res)
            except Exception as e:
                logger.error(f"Error executing handler for {event.event_type}: {e}")

    async def _process_queue(self):
        while self._running:
            try:
                event = await self._queue.get()
                handlers = self._subscribers.get(event.event_type, []) + self._subscribers.get("*", [])
                for handler in handlers:
                    try:
                        res = handler(event)
                        if asyncio.iscoroutine(res):
                            await res
                    except Exception as e:
                        logger.error(f"Error handling event {event.event_type}: {e}")
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"EventBus dispatch error: {e}")

    def start(self):
        if not self._running:
            self._running = True
            try:
                self._worker_task = asyncio.create_task(self._process_queue())
                logger.info("EventBus worker background task started.")
            except RuntimeError:
                pass

    async def stop(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

event_bus = EventBus()
