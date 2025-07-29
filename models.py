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
    ai_coaching_logs = relationship("AICoachingLog", back_populates="user")
    auth = relationship("UserAuth", back_populates="user", uselist=False) # One-to-one relationship with UserAuth

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
    daily_results = relationship("DailyResult", back_populates="daily_intentions", uselist=False) # One-to-one relationship with DailyResult

class DailyResult(Base):
    __tablename__ = "daily_results"

    id = Column(Integer, primary_key=True, index=True)
    daily_intention_id = Column(Integer, ForeignKey("daily_intentions.id"), nullable=False)
    succeeded_failed = Column(Boolean, nullable=False)
    ai_feedback = Column(Text, nullable=True)
    user_confirmation_correction = Column(Boolean, nullable=True) # User can confirm or correct AI feedback. True is confirmation, False is correction
    recovery_quest = Column(Text, nullable=True) # Null if user succeeded in their Daily Intention
    recovery_quest_response = Column(Text, nullable=True) # Null if no Recovery Quest was given
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    daily_intention = relationship("DailyIntention", back_populates="daily_results")

class AICoachingLog(Base):
    __tablename__ = "ai_coaching_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_text = Column(Text, nullable=False) # What someone submitted/said
    ai_feedback = Column(Text, nullable=False) # AI's coaching response
    coaching_trigger = Column(String(50), nullable=False) # Trigger for the AI coaching, e.g. 'daily_intention', 'evening_assessment', 'recovery_quest' etc. String now, Enum in V2
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="ai_coaching_logs")
