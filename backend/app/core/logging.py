import sys
import os
from loguru import logger

def setup_logging():
    # Remove default logger
    logger.remove()

    # Console Logger (standard stdout for cloud / local / serverless logs)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        enqueue=True,
    )

    # File Logger (only in environments where filesystem is writable)
    try:
        os.makedirs("logs", exist_ok=True)
        logger.add(
            "logs/backend_errors.log",
            rotation="20 MB",
            retention="30 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
            level="ERROR",
            enqueue=True,
        )
    except Exception:
        # Silently ignore in read-only serverless environments
        pass
