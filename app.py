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


# GENERAL ENDPOINTS

@app.get("/")
def read_root():
    """Welcome root endpoint - the beginning of the transformational journey!"""
    return {
        "message": "Welcome to The Game of Becoming API!",
        "description": "Ready to turn your exectution blockers into breakthrough momentum?",
        "docs": "Visit /docs for interactive API documentation.",
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and deployment verification"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "service": "Game of Becoming API",
        "version": "1.0.0"
    }


# USER ENDPOINTS

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


# DAILY INTENTIONS ENDPOINTS

@app.post("/intentions", response_model=DailyIntentionResponse, status_code=status.HTTP_201_CREATED)
def create_daily_intention(
    intention_data: DailyIntentionCreate,
    db: Session = Depends(get_db),
):
    """
    Create today's Daily Intention - The One Thing that matters!

    AI Coach forces clarity upfront:
    - AI Coach analyzes intention before saving
    - Value intentions will trigger refinement process
    - Only clear, actionable intentions are saved
    - This prevents clutter, confusion and failure before it starts!

    Core App Mechanics:
    - One intention per day (enforces clarity and focus)
    - Must be measurable with target quantity
    - User estimates focus block count needed (self-awareness building!)
    - This starts the daily execution and learning loop!
    """

    # Check if user exists
    user = db.query(User).filter(User.id == intention_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if today's Daily Intention already exists
    existing_intention = get_today_intention(db, intention_data.user_id)
    if existing_intention:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily Intention already exists for today. Ready to update it instead?"
        )
    
    # TODO: AI COACH INTEGRATION POINT
    # AI Accountability and Clarity Coach analyzes the intention immediately after it is created
    # For MVP, we'll assume all intentions are clear and actionable enough to save
    # V2: Add actual AI analysis and refinement logic here
    ai_feedback = f"Great! '{intention_data.daily_intention_text}' is clear and actionable. You've planned {intention_data.validate_focus_block_count} focus blocks. Let's make it happen!"

    try:
        # Create today's intention
        db_intention = DailyIntention(
            user_id=intention_data.user_id,
            daily_intention_text=intention_data.daily_intention_text.strip(),
            target_quantity=intention_data.target_quantity,
            focus_block_count=intention_data.focus_block_count,
            ai_feedback=ai_feedback,  # AI feedback on intention clarity
            # completed_quantity defaults to 0 (from model)
            # status defaults to 'pending' (from model)
            # created_at defaults to current UTC time (from model)
        )

        db.add(db_intention)
        db.commit()
        db.refresh(db_intention)  # Refresh to get all default values from the database

        return DailyIntentionResponse(
            id=db_intention.id,
            user_id=db_intention.user_id,
            daily_intention_text=db_intention.daily_intention_text,
            target_quantity=db_intention.target_quantity,
            completed_quantity=db_intention.completed_quantity,
            focus_block_count=db_intention.focus_block_count,
            completion_percentage=0.0,  # Initial percentage is 0%
            status=db_intention.status,
            created_at=db_intention.created_at,
            ai_feedback=db_intention.ai_feedback #AI Coach's immediate feedback
        )
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Daily Intention: {str(e)}"
        )
    

@app.get("/intentions/today/{user_id}", response_model=DailyIntentionResponse)
def get_today_daily_intention(user_id: int, db: Session = Depends(get_db)):
    """
    Get today's Daily Intention for a user.
    
    The core of the Daily Commitment Screen!
    """

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get today's intention
    intention = get_today_intention(db, user_id)
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Daily Intention found for today. Ready to create one?"
        )
    
    # Calculate completion percentage
    completion_percentage = (
        (intention.completed_quantity / intention.target_quantity) * 100
        if intention.target_quantity > 0 else 0.0
    )

    return DailyIntentionResponse(
        id=intention.id,
        user_id=intention.user_id,
        daily_intention_text=intention.daily_intention_text,
        target_quantity=intention.target_quantity,
        completed_quantity=intention.completed_quantity,
        focus_block_count=intention.focus_block_count,
        completion_percentage=completion_percentage,
        status=intention.status,
        created_at=intention.created_at
    )

@app.put("/intentions/{intention_id}/progress", response_model=DailyIntentionResponse)
def update_daily_intention_progress(
    intention_id: int,
    progress_data: DailyIntentionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update Daily Intenttion progress - the core of the Daily Execution Loop!
    - User reports progress after each Focus Block
    - System calculates completion percentage
    - Determines if intention is completed, in progress or failed
    """

    # Get the Daily Intention by id
    intention = db.query(DailyIntention).filter(DailyIntention.id == intention_id).first()
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Intention not found"
        )
    

    try:
        # Update progress: absolute, not incremental! Simpler mental model - "Where am I vs my goal?"
        intention.completed_quantity = progress_data.completed_quantity
        if intention.completed_quantity >= intention.target_quantity:
            intention.status = 'completed'
        elif intention.completed_quantity > 0:
            intention.status = 'in_progress'
        else:
            intention.status = 'pending'

        db.commit()
        db.refresh(intention)

        # Calculate completion percentage
        completion_percentage = (
            (intention.completed_quantity / intention.target_quantity) * 100
            if intention.target_quantity > 0 else 0.0
        )

        return DailyIntentionResponse(
            id=intention.id,
            user_id=intention.user_id,
            daily_intention_text=intention.daily_intention_text,
            target_quantity=intention.target_quantity,
            completed_quantity=intention.completed_quantity,
            focus_block_count=intention.focus_block_count,
            completion_percentage=completion_percentage,
            status=intention.status,
            created_at=intention.created_at
        )
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update Daily Intention progress: {str(e)}"
        )
    
@app.post("intentions/{intention_id}/complete", response_model=DailyIntentionResponse)
def complete_daily_intention(intention_id: int, db: Session = Depends(get_db)):
    """
    Mark Daily Intention as completed
    
    This triggers:
    - XP gain for the user
    - Discipline stat increase
    - Streak continuation
    """

    intention = db.query(DailyIntention).filter(DailyIntention.id == intention_id).first()
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Intention not found"
        )
    
    try:
        # Mark as completed
        intention.status = 'completed'
        intention.completed_quantity = intention.target_quantity  # Ensure full completion

        db.commit()
        db.refresh(intention)

        return DailyIntentionResponse(
            id=intention.id,
            user_id=intention.user_id,
            daily_intention_text=intention.daily_intention_text,
            target_quantity=intention.target_quantity,
            completed_quantity=intention.completed_quantity,
            focus_block_count=intention.focus_block_count,
            completion_percentage=100.0,  # Fully completed
            status=intention.status,
            created_at=intention.created_at
        )
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete Daily Intention: {str(e)}"
        )
    
@app.post("/intentions/{intention_id}/fail", response_model=DailyIntentionResponse)
def fail_daily_intention(intention_id: int, db: Session = Depends(get_db)):
    """
    Mark Daily Intention as failed
    
    This triggers the "Fail Forward" mechanism!
    - AI feedback on failure in order to re-frame failure
    - AI generates and initiates Recovery Quest
    - Opportunity to gain Resilience stat
    """

    intention = db.query(DailyIntention).filter(DailyIntention.id == intention_id).first()
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Intention not found"
        )
    
    try:
        # Mark as failed
        intention.status = 'failed'
        
        db.commit()
        db.refresh(intention)

        # Calculate the final completion percentage
        completion_percentage = (
            (intention.completed_quantity / intention.target_quantity) * 100
            if intention.target_quantity > 0 else 0.0
        )

        return DailyIntentionResponse(
            id=intention.id,
            user_id=intention.user_id,
            daily_intention_text=intention.daily_intention_text,
            target_quantity=intention.target_quantity,
            completed_quantity=intention.completed_quantity,
            focus_block_count=intention.focus_block_count,
            completion_percentage=completion_percentage,  # Percentage at the time of failure
            status=intention.status,
            created_at=intention.created_at
        )
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark Daily Intention as failed: {str(e)}"
        )
    

# DAILY RESULTS ENDPOINTS