import asyncio
import json
from typing import Set
from fastapi import WebSocket
from loguru import logger
import redis.asyncio as aioredis
from app.core.config import settings

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.redis_client = None
        self.pubsub = None
        self.listener_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WS MANAGER] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"[WS MANAGER] Client disconnected. Total active: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"[WS MANAGER] Error sending message: {e}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        
        payload = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.append(connection)
                
        for connection in disconnected:
            self.disconnect(connection)

    async def start_redis_listener(self):
        """
        Starts a background task that listens to Redis Pub/Sub channel and broadcasts to clients.
        """
        logger.info("[WS MANAGER] Starting Redis Pub/Sub broadcast listener...")
        try:
            self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe("sms_ws_broadcast")
            
            self.listener_task = asyncio.create_task(self._redis_message_loop())
        except Exception as e:
            logger.error(f"[WS MANAGER] Failed to initialize Redis Listener: {e}")

    async def _redis_message_loop(self):
        logger.info("[WS MANAGER] Redis message loop started.")
        try:
            while True:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    data = message.get("data")
                    if data:
                        try:
                            event_data = json.loads(data)
                            await self.broadcast(event_data)
                        except Exception as e:
                            logger.error(f"[WS MANAGER] Error decoding/broadcasting event: {e}")
                await asyncio.sleep(0.01)
        except asyncio.CancelledError:
            logger.info("[WS MANAGER] Redis listener message loop cancelled.")
        except Exception as e:
            logger.error(f"[WS MANAGER] Exception in Redis message loop: {e}")
            # Try to reconnect after a short delay
            await asyncio.sleep(3)
            asyncio.create_task(self.start_redis_listener())

    async def stop_redis_listener(self):
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                pass
        if self.pubsub:
            await self.pubsub.unsubscribe("sms_ws_broadcast")
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info("[WS MANAGER] Redis listener stopped.")

manager = ConnectionManager()
