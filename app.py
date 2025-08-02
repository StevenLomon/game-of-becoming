from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import os
from datetime import datetime, timezone, timedelta

# Improt models and schemas
from models import Base, User, UserAuth, DailyIntention
from schemas import (
    UserCreate, UserUpdate, UserResponse,
    DailyIntentionCreate, DailyIntentionUpdate, DailyIntentionResponse
)

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
    docs_url="/docs" # Interactive API docs at /docs
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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_email(db: Session, email: str) -> User | None:
    """Get a user by email. Returns None if not found."""
    return db.query(User).filter(User.email == email).first()

def get_today_intention(db: Session, user_id: int) -> DailyIntention | None:
    """Get today's Daily Intention for a user. Returns None if not found."""
    today = datetime.now(timezone.utc).date()
    return db.query(DailyIntention).filter(
        DailyIntention.user_id == user_id,
        DailyIntention.created_at >= datetime.combine(today, datetime.min.time()),
        DailyIntention.created_at < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).first()


# ENDPOINTS
@app.get("/")
def read_root():
    """Welcome root endpoint - the beginning of the transformational journey!"""
    return {
        "message": "Welcome to The Game of Becoming API!",
        "description": "Ready to turn your exectution blockers into breakthrough momentum?",
        "docs": "Visit /docs for interactive API documentation.",
    }

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user. Handles the complete registration flow:
    1. Validates incoming data (Pydantic handles this automatically)
    2. Checks if email already exists (no duplicates allowed)
    3. Creates User record with business profile
    4. Creates UserAuth record with securely hashed password
    5. Returns UserResponse with user details and no password! Security first

    The user starts their Game of Becoming journey here!
    """

    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Ready to log in instead?"
        )
    
    try:
        # Create the User record
        new_user = User(
            name=user_data.name.strip(),
            email=user_data.email.strip(),
            hrga=user_data.hrga.strip(),
            # default_focus_block_duration defaults to 50 minutes (from model)
            # registered_at defaults to current UTC time (from model)
        )

        # Add and flush to get the user ID (but no commit yet!)
        db.add(new_user)
        db.flush() # This assigns the ID without committing the transaction

        # Create the UserAuth record with hashed password
        user_auth = UserAuth(
            user_id=new_user.id,
            password_hash=hash_password(user_data.password.strip()),
            # created_at defaults to current UTC time (from model)
        )

        # Add auth record and commit both records together
        db.add(user_auth)
        db.commit() # Commit both User and UserAuth records

        # Refresh to get all the default values from the database
        db.refresh(new_user)

        # Return UserResponse without password
        return UserResponse(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            hrga=new_user.hrga,
            registered_at=new_user.registered_at
        )
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}"
        )

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and deployment verification"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "service": "Game of Becoming API",
        "version": "1.0.0"
    }

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user profile by ID. Userful for frontend to display user informaiton."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        hrga=user.hrga,
        registered_at=user.registered_at
    )