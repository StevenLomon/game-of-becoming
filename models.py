from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship # To define relationships between models
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hrga = Column(Text, nullable=False) # Highest Revenue Generated Activity. Unlimited text field - let users be as comprehensive as they wish
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships - added as I go


class UserAuth(Base):
    __tablename__ = "user_auth"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime, nullable=True) # For analytics, nullable if user has never logged in

    # Relationships
    user = relationship("User", back_populates="auth")