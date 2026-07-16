import sys
from loguru import logger

def setup_logging():
    # Remove default logger
    logger.remove()

    # Console Logger
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        enqueue=True,
    )

    # File Logger (for errors and warnings)
    logger.add(
        "logs/backend_errors.log",
        rotation="20 MB",
        retention="30 days",
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        enqueue=True,
    )
