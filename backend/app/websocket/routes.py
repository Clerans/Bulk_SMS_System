from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from loguru import logger
from app.websocket.connection import get_websocket_user
from app.websocket.manager import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time notifications and statistics broadcasts.
    Authenticates via JWT token query parameter.
    """
    user = await get_websocket_user(token)
    if not user:
        logger.warning("[WS] Authentication failed. Rejecting connection.")
        # Close connection immediately with Policy Violation code
        await websocket.close(code=4008)
        return

    logger.info(f"[WS] Connection accepted for user: {user.email}")
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"[WS] User connection closed cleanly: {user.email}")
    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"[WS] Connection error for {user.email}: {e}")
