from datetime import datetime
import re
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field, computed_field

from app.models.template import TemplateCategory

class TemplateBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    category: TemplateCategory = TemplateCategory.Marketing
    message: str = Field(..., min_length=1)

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[TemplateCategory] = None
    message: Optional[str] = None

class TemplateResponse(BaseModel):
    id: uuid.UUID
    title: str
    category: TemplateCategory
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

    @computed_field
    @property
    def name(self) -> str:
        """
        Alias 'title' to 'name' for frontend compatibility.
        """
        return self.title

    @computed_field
    @property
    def variables(self) -> List[str]:
        """
        Extract unique variable placeholders from the message text (e.g. '{name}' -> 'name').
        """
        matches = re.findall(r"\{([a-zA-Z0-9_]+)\}", self.message)
        seen = set()
        # Deduplicate while preserving order
        return [x for x in matches if not (x in seen or seen.add(x))]
