from typing import Any, Dict, List, Optional

class APIException(Exception):
    """
    Base class for custom API Exceptions.
    """
    def __init__(
        self,
        status_code: int = 500,
        message: str = "An unexpected error occurred.",
        errors: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.errors = errors

class BadRequestException(APIException):
    def __init__(self, message: str = "Bad Request", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=400, message=message, errors=errors)

class UnauthorizedException(APIException):
    def __init__(self, message: str = "Unauthorized", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=401, message=message, errors=errors)

class ForbiddenException(APIException):
    def __init__(self, message: str = "Forbidden", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=403, message=message, errors=errors)

class NotFoundException(APIException):
    def __init__(self, message: str = "Resource Not Found", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=404, message=message, errors=errors)

class ConflictException(APIException):
    def __init__(self, message: str = "Conflict", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=409, message=message, errors=errors)

class UnprocessableException(APIException):
    def __init__(self, message: str = "Unprocessable Entity", errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(status_code=422, message=message, errors=errors)
