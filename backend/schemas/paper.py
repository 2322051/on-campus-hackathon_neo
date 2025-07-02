"""
backend/schemas/paper.py

This module defines the Pydantic schema for paper data.
The schema is designed to be extendable, allowing extra fields.
"""

from pydantic import BaseModel, Extra
from typing import List

class PaperModel(BaseModel):
    title: str
    authors: List[str]
    published: str  # ISO formatted date string
    summary: str
    url: str

    class Config:
        extra = Extra.allow
