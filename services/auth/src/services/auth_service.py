import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import RefreshToken, User
from ..schemas import LoginResponse, TokenRefreshResponse


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hash."""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

    def _hash_token(self, token: str) -> str:
        """Hash a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        user = await self.get_user_by_email(email)
        if user is None:
            return None
        if not user.is_active:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user

    async def create_user(self, email: str, password: str, role: str = "songwriter") -> User:
        """Create a new user."""
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            role=role,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    def create_access_token(self, user: User) -> tuple[str, int]:
        """Create a JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
        expires_in = settings.access_token_expire_minutes * 60

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }

        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return token, expires_in

    async def create_refresh_token(self, user: User) -> str:
        """Create a refresh token and store in database."""
        token = secrets.token_urlsafe(64)
        token_hash = self._hash_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(refresh_token)
        await self.db.flush()

        return token

    async def create_tokens(self, user: User) -> LoginResponse:
        """Create both access and refresh tokens."""
        access_token, expires_in = self.create_access_token(user)
        refresh_token = await self.create_refresh_token(user)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

    def verify_access_token(self, token: str) -> Optional[dict]:
        """Verify and decode an access token."""
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            if payload.get("type") != "access":
                return None
            return payload
        except JWTError:
            return None

    async def verify_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """Verify a refresh token."""
        token_hash = self._hash_token(token)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalar_one_or_none()

    async def refresh_access_token(self, refresh_token: str) -> Optional[TokenRefreshResponse]:
        """Refresh an access token using a refresh token."""
        token_record = await self.verify_refresh_token(refresh_token)
        if token_record is None:
            return None

        user = await self.get_user_by_id(token_record.user_id)
        if user is None or not user.is_active:
            return None

        access_token, expires_in = self.create_access_token(user)

        return TokenRefreshResponse(
            access_token=access_token,
            expires_in=expires_in,
        )

    async def revoke_token(self, refresh_token: str) -> bool:
        """Revoke a specific refresh token."""
        token_record = await self.verify_refresh_token(refresh_token)
        if token_record is None:
            return False

        token_record.revoked_at = datetime.now(timezone.utc)
        await self.db.flush()
        return True

    async def revoke_all_tokens(self, user_id: UUID) -> None:
        """Revoke all refresh tokens for a user."""
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        )
        tokens = result.scalars().all()

        for token in tokens:
            token.revoked_at = datetime.now(timezone.utc)

        await self.db.flush()

    async def initiate_password_reset(self, email: str) -> Optional[str]:
        """Initiate password reset (generate token, would send email in production)."""
        user = await self.get_user_by_email(email)
        if user is None:
            return None

        # In production, generate a token, store it, and send email
        # For now, just return a placeholder
        reset_token = secrets.token_urlsafe(32)
        # TODO: Store token and send email
        return reset_token

    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using reset token."""
        # TODO: Verify token from database
        # For now, this is a placeholder
        return False
