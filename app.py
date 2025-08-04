from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import os, anthropic

# Load environment variables
load_dotenv()

# Import models and schemas
from models import Base, User, UserAuth, DailyIntention, DailyResult
from schemas import (
    UserCreate, UserUpdate, UserResponse,
    DailyIntentionCreate, DailyIntentionUpdate, DailyIntentionResponse,
    DailyResultCreate, DailyResultResponse, RecoveryQuestResponse, RecoveryQuestInput
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

# Claude AI setup
anthropic_client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

# AI COACH FUNCTIONS
def analyze_daily_intention(
        intention_text: str, target_quantity: int, focus_block_count: int, user_hrga: str
        ) -> str:
    """
    Claude analyzes the Daily Intention for clarity, actiontability and alignment with user's HRGA.
    This is the AI Coach's "Clarity Enforcer" role.
    """
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. Your role is to 
        analyze daily intentions and provide encouraging, actionable feedback.

        User's Highest Revenue Generated Activity (HRGA): {user_hrga}
        Today's Daily Intention: {intention_text}
        Target Quantity: {target_quantity}
        Planned Focus Block Count: {focus_block_count}

        Analyze this intention and provide feedback that:
        1. Acknowledges if it's clear, measurable and actionable
        2. Celebrates alignment with their HRGA
        3. Encourages them about their planned approach
        4. Keeps the tone supportive and empowering

        Provide 1-2 sentences maximum. Be encouraging and action-oriented.

        Example good responses:
        - "Excellent! 'Send 10 outreaches' is crystal clear and directly drives new client acquisition. Your 4 focus blocks should give you perfect execution rhythm."
        - "Love the specificity! This intention aligns perfectly with your revenue generation goals. 3 focus blocks for 5 calls shows smart time planning!"

        Your response:
        """

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            messages=[{"role": "user", 
                       "content": prompt
                }]
        )

        return response.content[0].text.strip()
    
    except Exception as e:
        # Fallback to static respones if Claude API fails
        return f"Great! '{intention_text}' is clear and actionable. You've planned {focus_block_count} focus blocks. Let's make it happen!"

def generate_recovery_quest(
        intention_text: str, completion_rate: float, target_quantity: int, completed_quantity: int
    ) -> str:
    """
    Claude generates a personalized Recovery Quest based on failure pattern.
    This is the AI Coach's "Fail Forward Guide" role.
    """
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user failed
        to complete their Daily Intention, and you need to generate a Recovery Quest - a reflective
        question that turns failure into valuable data and learning.

        Failed Intention: "{intention_text}"
        Target: {target_quantity}
        Achieved: {completed_quantity}
        Completion Rate: {completion_rate:.1f}%

        Generate ONE specific, thoughtful question that:
        1. Acknowledges their effort (they tried!)
        2. Focused on learning, not judgment
        3. Helps identify the root cause of the gap
        4. Is actionable for tomorrow's improvement

        Base the question on completion level:
        - 0% completion: Focus on barriers to starting
        - 1-50% completion: Focus on momentum/distraction issues
        - 51-99% completion: Focus on finishing/persistence

        Examples:
        - "What specific distraction pulled you away when you were in the middle of making progress?"
        - "When you felt resistance to starting, what was the inner voice telling you?"
        - "You were so close to finishing - what would have given you that final push across the finish line?"

        Generate ONE question (no additional text):
        """

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        return response.content[0].text.strip()
    
    except Exception as e:
        # Fallback based on completion rate
        if completion_rate == 0:
            return "What prevented you from starting? Was it fear, overwhelm, or unclear next steps?"
        elif completion_rate < 50:
            return "You started but struggled to maintain momentum. What distracted you or broke your focus?"
        else:
            return "You made solid progress but didn't quite finish. What would have helped you cross the finish line?"
        
def generate_coaching_response(
        user_reflection: str, original_intention: str, completion_rate: float
    ) -> str:
    """
    Claude provides personalized coaching based on user's Recovery Quest response.
    This is the AI Coach's "Wisdom Builder" role.
    """
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user has 
        reflected on their failed intention and shared their insight. Provide encouraging, 
        wisdom-building coaching.

        Original Intention: "{original_intention}"
        Completion Rate: {completion_rate:.1f}%
        User's Reflection: "{user_reflection}"

        Provide coaching that:
        1. Validates their honest reflection
        2. Identifies the pattern/insight they've uncovered
        3. Connects this learning to future success
        4. Builds confidence and resilience
        5. Keeps it concise (2-3 sentences max)

        Your tone should be:
        - Encouraging but not fake-positive
        - Wise and supportive
        - Forward-looking
        - Focused on growth mindset

        Examples:
        - "That's a powerful insight about time estimation. Recognizing that you consistently underestimate task complexity is the first step to building more realistic intentions. Tomorrow, try adding a 25% buffer to your time estimates!"
        - "Honest self-awareness like this is what separates people who grow from those who stay stuck. Now that you know social media is your kryptonite during focus blocks, you can proactively eliminate that distraction tomorrow."


        Your coaching response:
        """

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        return response.content[0].text.strip()
    
    except Exception as e:
        # Fallback response
        return f"Thank you for that honest reflection. Recognizing '{user_reflection}' as a pattern is the first step to breaking through it. Tomorrow's intention will be even stronger because of this insight!"

def generate_success_feedback(
        intention_text: str, target_quantity: int, user_hrga: str
    ) -> str:
    """
    Claude celebrates successful intention completion.
    This is the AI Coach's "Momentum Builder" role.
    """
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user has 
        successfully completed their daily intention! Celebrate their win and build momentum.

        User's HRGA: {user_hrga}
        Completed Intention: "{intention_text}"
        Target: {target_quantity} (achieved!)

        Provide celebration that:
        1. Acknowledges their specific achievement
        2. Connects it to their revenue-generating goals
        3. Builds momentum for tomorrow
        4. Feels genuine and energizing
        5. Is concise (1-2 sentences)

        Examples:
        - "Outstanding execution! Closing 3 deals directly fuels your client acquisition engine. This is exactly how momentum builds - one focused day at a time!"
        - "Powerful work! Those 10 outreaches are seeds that will bloom into future revenue. Your consistency is creating compound results!"
        
        
        Your celebration:
        """

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        return response.content[0].text.strip()
        
    except Exception as e:
        # Fallback success message
        return f"Excellent execution! You completed '{intention_text}' - this is how sacred momentum builds!"

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
    
    # AI Accountability and Clarity Coach analyzes the intention immediately after it is created
    ai_feedback = analyze_daily_intention(
        intention_data.daily_intention_text, 
        intention_data.target_quantity, 
        intention_data.focus_block_count, 
        user.hrga
    )

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
    
@app.post("/intentions/{intention_id}/complete", response_model=DailyIntentionResponse)
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

@app.post("/daily-results", response_model=DailyResultResponse, status_code=status.HTTP_201_CREATED)
def create_daily_result(
    result_data: DailyResultCreate,
    db: Session = Depends(get_db)
):
    """
    Create Daily Result evening reflection - The Learning and Growth phase
    
    Evening Ritual core mechanics:
    - Deep reflection on the day's execution
    - AI Accountability and Clarity Coach provides personalized feedback
    - Recovery Quest generated and initiated for failed intentions
    - Transforms failures into valuable learning data
    - Builds Resilience and Clarity stats
    """

    # Check if Daily Intention exists
    intention = db.query(DailyIntention).filter(DailyIntention.id == result_data.daily_intention_id).first()
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Intention not found"
        )
    
    # Check if Daily Result already exists for this intention
    existing_result = db.query(DailyResult).filter(
        DailyResult.daily_intention_id == result_data.daily_intention_id
    ).first()
    if existing_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily Result already exists for this intention. Sacred finality!"
        )
    
    # Get the user in order to generate personalized AI feedback
    user = db.query(User).filter(User.id == intention.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Determine if intention succeeded or failed
        succeeded = intention.status == 'completed'

        # Generate AI feedback for evening reflection
        if succeeded:
            ai_feedback = generate_success_feedback(intention.daily_intention_text, intention.target_quantity, user.hrga)
            recovery_quest = None
        else: # Failed intention
            # Calculate what they managed to achieve
            completion_rate = (
                (intention.completed_quantity / intention.target_quantity) * 100
                if intention.target_quantity > 0 else 0.0
            )

            # Acknowledge completion rate
            ai_feedback = f"You achieved {completion_rate:.1f}% of your intention. Let's turn this into learning..."

            # AI-generated Recovery Quest based on failure pattern
            recovery_quest = generate_recovery_quest(
            intention.daily_intention_text,
            completion_rate,
            intention.target_quantity,
            intention.completed_quantity
            )

        # Create the Daily Result record
        db_result = DailyResult(
            daily_intention_id=result_data.daily_intention_id,
            succeeded_failed=succeeded,
            ai_feedback=ai_feedback,
            recovery_quest=recovery_quest,
            # user_confirmation_correction defaults to None
            # recovery_quest_response defaults to None  
            # created_at defaults to current UTC time
        )

        db.add(db_result)
        db.commit()
        db.refresh(db_result)

        return DailyResultResponse(
            id=db_result.id,
            daily_intention_id=db_result.daily_intention_id,
            succeeded_failed=db_result.succeeded_failed,
            ai_feedback=db_result.ai_feedback,
            recovery_quest=db_result.recovery_quest,
            recovery_quest_response=db_result.recovery_quest_response,
            user_confirmation_correction=db_result.user_confirmation_correction,
            created_at=db_result.created_at
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Daily Result: {str(e)}"
        )
    
@app.get("/daily-results/{intention_id}", response_model=DailyResultResponse)
def get_daily_result(intention_id: int, db: Session = Depends(get_db)):
    """
    Get Daily Result evening reflection for a specific intention
    Used for disaplying reflection insights and Recovery Quests
    """
    
    result = db.query(DailyResult).filter(DailyResult.daily_intention_id == intention_id).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Result not found"
        )
    
    return DailyResultResponse(
        id=result.id,
        daily_intention_id=result.daily_intention_id,
        succeeded_failed=result.succeeded_failed,
        ai_feedback=result.ai_feedback,
        recovery_quest=result.recovery_quest,
        recovery_quest_response=result.recovery_quest_response,
        user_confirmation_correction=result.user_confirmation_correction,
        created_at=result.created_at
    )

@app.post("/daily-results/{result_id}/recovery-quest", response_model=RecoveryQuestResponse)
def respond_to_recovery_quest(
    result_id: int,
    quest_response: RecoveryQuestInput,
    db: Session = Depends(get_db)
):
    """
    Respond to Recovery Quest - the "Fail Forward" moagic and the sacred learning opportunity!
    
    This is where users transforms failure into growth and wisdom:
    - User reflects on what went less than optimal
    - AI Accountability and Clarity Coach provides personalized guidance
    - Resilience stat increases
    - Learning through failure becomes part of character progression
    """

    # Get the Daily Result by id
    result = db.query(DailyResult).filter(DailyResult.id == result_id).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Result not found"
        )
    
    # Check if Recovery Quest exists
    if not result.recovery_quest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Recovery Quest available for this result"
        )
    
    # Query for the original Daily Intention for personalized AI coacihing response
    original_intention = db.query(DailyIntention).filter(DailyIntention.id == result.daily_intention_id).first()

    # Calculate what the user managed to achieve
    completion_rate = (
        (original_intention.completed_quantity / original_intention.target_quantity) * 100
        if original_intention.target_quantity > 0 else 0.0
    )
    
    try:
        # Save user's response to the Recovery Quest
        result.recovery_quest_response = quest_response.recovery_quest_response.strip()

        # AI Coach analyzes the response and provides personalized coaching
        ai_coaching_response = generate_coaching_response(quest_response.recovery_quest_response, original_intention.daily_intention_text, completion_rate)

        db.commit()
        db.refresh(result)

        return RecoveryQuestResponse(
            recovery_quest_response=result.recovery_quest_response,
            ai_coaching_feedback=ai_coaching_response
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to respond to Recovery Quest: {str(e)}"
        )