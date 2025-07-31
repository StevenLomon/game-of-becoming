from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import os
from datetime import datetime, timezone

# Improt models and schemas
from models import Base, User, UserAuth
from schemas import UserCreate, UserUpdate, UserResponse

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./game_of_becoming.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI app setup
app = FastAPI(
    title="Game of Becoming API",
    description="Gamify your business growth with AI-driven daily intentions and feedback.",
    version="1.0.0",
)

# Dependency generator to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() # The session is closed after use. Guaranteed clean up and no memory leaks

# Utility functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def get_user_by_email(db: Session, email: str) -> User | None:
    """Get a user by email."""
    return db.query(User).filter(User.email == email).first()