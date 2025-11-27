"""Common helper utilities for the Medicare backend."""
from __future__ import annotations

from datetime import datetime
from math import ceil
import re
from typing import Iterable, Any

from bson import ObjectId


def serialize_doc(document: Any):
    """Convert MongoDB ObjectId fields to strings for JSON serialization."""
    if document is None:
        return None

    if isinstance(document, (str, int, float, bool)):
        return document

    if isinstance(document, ObjectId):
        return str(document)

    if isinstance(document, datetime):
        return document.isoformat()

    if isinstance(document, list):
        return [serialize_doc(item) for item in document]

    if not isinstance(document, dict):
        return document

    serialized = {}
    for key, value in document.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, list):
            serialized[key] = [serialize_doc(item) for item in value]
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        else:
            serialized[key] = value

    if "_id" in document:
        serialized["_id"] = str(document["_id"])

    return serialized


def slugify(value: str) -> str:
    """Generate a URL-friendly slug from the given value."""

    value = value or ""
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def safe_float(value, default: float | None = 0.0) -> float | None:
    """Safely coerce a value to float, returning a default when conversion fails."""

    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value, default: int | None = 0) -> int | None:
    """Safely coerce a value to int, returning a default when conversion fails."""

    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def build_paginated_response(items: Iterable, total: int, page: int, per_page: int):
    """Build a consistent pagination payload."""
    per_page = max(per_page, 1)
    total_pages = ceil(total / per_page) if total else 1
    return {
        "items": list(items),
        "total": total,
        "page": page,
        "pages": total_pages,
        "per_page": per_page,
    }
