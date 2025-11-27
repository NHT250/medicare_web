"""Centralised list of allowed product categories.

These categories mirror the options exposed in the frontend. Keep the slugs
stable because they are used for filtering and validation across the app.
"""

from __future__ import annotations

FIXED_CATEGORIES: list[dict[str, str]] = [
    {
        "id": "cat-1",
        "name": "Pain Relief",
        "slug": "pain-relief",
        "icon": "fas fa-pills",
    },
    {
        "id": "cat-2",
        "name": "Vitamins",
        "slug": "vitamins",
        "icon": "fas fa-leaf",
    },
    {
        "id": "cat-3",
        "name": "Skin Care",
        "slug": "skin-care",
        "icon": "fas fa-hand-sparkles",
    },
    {
        "id": "cat-4",
        "name": "Heart Health",
        "slug": "heart-health",
        "icon": "fas fa-heartbeat",
    },
    {
        "id": "cat-5",
        "name": "Mental Health",
        "slug": "mental-health",
        "icon": "fas fa-brain",
    },
    {
        "id": "cat-6",
        "name": "Respiratory",
        "slug": "respiratory",
        "icon": "fas fa-lungs",
    },
]

ALLOWED_CATEGORY_SLUGS: set[str] = {category["slug"] for category in FIXED_CATEGORIES}
