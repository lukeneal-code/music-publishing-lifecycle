from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginResponse(BaseModel):
    """Response schema for successful login."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RegisterRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["songwriter", "viewer"] = "songwriter"


class TokenRefreshRequest(BaseModel):
    """Request schema for token refresh."""

    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Response schema for token refresh."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """Response schema for user data."""

    id: UUID
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """Request schema for password reset initiation."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Request schema for password reset confirmation."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # user_id
    email: str
    role: str
    exp: int
    iat: int
    type: Literal["access", "refresh"]
