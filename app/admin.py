from __future__ import annotations

import hashlib
import hmac
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response

from app.config import settings

COOKIE_NAME = "ss_admin"
SESSION_SECONDS = 12 * 60 * 60
_KEY_PREFIX = b"snakespotter-admin-v1:"


def _secret_key() -> bytes:
    return hashlib.sha256(_KEY_PREFIX + settings.admin_password.encode("utf-8")).digest()


def _sign(payload: str) -> str:
    digest = hmac.new(_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{digest}"


def make_session_token() -> str:
    expiry = str(int(time.time()) + SESSION_SECONDS)
    return _sign(expiry)


def verify_session(token: str | None) -> bool:
    if not settings.admin_enabled or not token or "." not in token:
        return False
    payload, given = token.rsplit(".", 1)
    expected = hmac.new(_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, given):
        return False
    try:
        expiry = int(payload)
    except ValueError:
        return False
    return expiry > int(time.time())


def password_matches(given: str) -> bool:
    if not settings.admin_enabled:
        return False
    left = hashlib.sha256(given.encode("utf-8")).digest()
    right = hashlib.sha256(settings.admin_password.encode("utf-8")).digest()
    return hmac.compare_digest(left, right)


def cookie_secure(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto.split(",")[0].strip().lower() == "https"


def set_session_cookie(response: Response, request: Request) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=make_session_token(),
        max_age=SESSION_SECONDS,
        httponly=True,
        samesite="lax",
        secure=cookie_secure(request),
        path="/",
    )


def clear_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        samesite="lax",
        secure=cookie_secure(request),
    )


def require_admin(request: Request) -> None:
    if not settings.admin_enabled:
        raise HTTPException(status_code=403, detail="Admin is not configured")
    token = request.cookies.get(COOKIE_NAME)
    if not verify_session(token):
        raise HTTPException(status_code=401, detail="Admin sign-in required")


AdminAuth = Annotated[None, Depends(require_admin)]
