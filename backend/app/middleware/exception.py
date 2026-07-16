from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger

from app.core.exceptions import APIException

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        """
        Handles custom APIExceptions and returns them wrapped in our standard JSON envelope.
        """
        logger.warning(f"API Exception: {exc.message} on path {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": None,
                "errors": exc.errors
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """
        Handles FastAPI validation errors (Pydantic v2 schemas validation)
        and converts them to a structured errors list.
        """
        errors = []
        for error in exc.errors():
            # Get the field path (loc) without 'body' or 'query' prefix if present
            loc = error.get("loc", [])
            field = ".".join(str(x) for x in loc[1:]) if len(loc) > 1 else ".".join(str(x) for x in loc)
            errors.append({
                "field": field,
                "message": error.get("msg", "Invalid value")
            })

        logger.info(f"Validation Error on {request.url.path}: {errors}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Validation failed",
                "data": None,
                "errors": errors
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """
        Catch-all handler for unhandled backend exceptions (Status 500).
        """
        logger.exception(f"Unhandled Exception on {request.url.path}: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "An internal server error occurred.",
                "data": None,
                "errors": [{"message": "Internal Server Error"}]
            }
        )
