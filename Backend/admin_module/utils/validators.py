import re
from bson import ObjectId

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email: str) -> bool:
    return bool(email and EMAIL_REGEX.match(email))


def to_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


__all__ = ["is_valid_email", "to_object_id"]
