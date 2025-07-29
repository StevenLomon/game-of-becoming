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
    daily_intentions = relationship("DailyIntention", back_populates="user")
    auth = relationship("UserAuth", uselist=False, back_populates="user") # One-to-one relationship with UserAuth

class UserAuth(Base):
    __tablename__ = "user_auth"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime, nullable=True) # For analytics, nullable if user has never logged in

    # Relationships
    user = relationship("User", back_populates="auth")

class DailyIntention(Base):
    __tablename__ = "daily_intentions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    daily_intention_text = Column(Text, nullable=False)
    focus_block_count = Column(Integer, nullable=False)
    ai_feedback = Column(Text, nullable=True) # Null if Claude API is to fail. Will be given using async retry if this was to be the case
    user_response_to_ai_feedback = Column(Text, nullable=True)
    user_agreed_with_ai = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True) # Index for quick retrieval of daily intentions

    # Relationships
    user = relationship("User", back_populates="daily_intentions")