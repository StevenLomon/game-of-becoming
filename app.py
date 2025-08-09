from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from typing import Annotated
from dotenv import load_dotenv
import os, math, anthropic

from database import get_db
from security import create_access_token, get_current_user
from utils import get_password_hash, verify_password
from crud import create_user, get_user_by_email, get_or_create_user_stats, get_today_intention

# Load environment variables
load_dotenv()

# Import models and schemas
from models import Base, User, UserAuth, CharacterStats, DailyIntention, FocusBlock, DailyResult
from schemas import (
    TokenResponse, TokenData,
    UserCreate, UserUpdate, UserResponse, CharacterStatsResponse,
    DailyIntentionCreate, DailyIntentionUpdate, DailyIntentionResponse,
    DailyIntentionCreateResponse, DailyIntentionRefinementResponse, 
    FocusBlockCreate, FocusBlockResponse, FocusBlockUpdate,
    DailyResultCreate, DailyResultResponse, RecoveryQuestResponse, RecoveryQuestInput
)

# Create tables
# Base.metadata.create_all(bind=engine) Not needed now that we have Alembic

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI app setup
app = FastAPI(
    title="Game of Becoming API",
    description="Gamify your business growth with AI-driven daily intentions and feedback.",
    version="1.0.0",
    docs_url="/docs" # Interactive API docs at /docs
)

# Utility functions
def calculate_level(xp: int) -> int:
    """Calculates user level based on total XP."""
    if xp < 0:
        return 1
    return math.floor((xp / 100) ** 0.5) + 1

# Claude AI setup
anthropic_client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

# AI COACH FUNCTIONS

# Updated AI analysis function with Smart Detection to see if refinement is needed!
def analyze_daily_intention(
        intention_text: str, target_quantity: int, focus_block_count: int, user_hrga: str
        ) -> tuple[str, bool]:
    """
    Claude analyzes the Daily Intention for clarity, actiontability and alignment with user's HRGA.
    Updated: determines if refinement is needed! 
    Returns (ai_feedback, needs_refinement)
    This is the AI Coach's "Clarity Enforcer" role.
    """
    # NEW: AI Kill Switch
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock 'APPROVED' response. ---")
        return "Mock feedback: This is a clear and actionable intention!", False
    
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. Your role is to analyze daily intentions, provide encouraging actionable feedback, and determine if they need refinement before commitment.

        User's Highest Revenue Generated Activity (HRGA): {user_hrga}
        Today's Daily Intention: {intention_text}
        Target Quantity: {target_quantity}
        Planned Focus Block Count: {focus_block_count}

        Analyze this intention and provide encouraging, actionable feedback while determining if refinement is needed based on:
        - Is it specific and measurable?
        - Is it actionable with clear next steps?
        - Does it align well with their HRGA?
        - Is the target quantity realistic and meaningful?

        CRITICAL: Start your response with either:
        - "NEEDS_REFINEMENT:" if the intention needs to be more specific/actionable/aligned
        - "APPROVED:" if the intention is clear and ready for commitment

        Then provide your coaching feedback.

        Provide 2-3 sentences maximum. Be encouraging and action-oriented.

        Examples:
        NEEDS_REFINEMENT: This intention is quite vague. What specific modules will you complete? Consider being more specific about your deliverables - perhaps "Complete modules 1-3 of Webinar Academy and draft one compelling offer" would give you clearer success criteria.

        APPROVED: Your intention to send 5 LinkedIn outreaches is clear, specific, and directly aligned with your HRGA! With 4 focus blocks allocated, you have plenty of time to craft quality messages while maintaining a sustainable daily pace.

        NEEDS_REFINEMENT: While learning is valuable, this doesn't directly support your LinkedIn outreach HRGA. Consider balancing today's training with 1-2 focus blocks of immediate income-generating outreach activities.

        APPROVED: Love how you've broken down the webinar training into measurable modules with a concrete deliverable! This intention directly supports your LinkedIn outreach HRGA by helping you create a compelling offer.

        NEEDS_REFINEMENT: While building a website can be important, this intention needs more specificity and doesn't directly support your LinkedIn outreach HRGA. Consider refining to something like "Complete homepage and about page copy that highlights my LinkedIn outreach services" and dedicating 1 of your 3 focus blocks to actual LinkedIn outreach to maintain revenue momentum.

        Your response:
        """

        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            messages=[{"role": "user", 
                       "content": prompt
                }]
        )

        ai_response = response.content[0].text.strip()

        # Parse the AI response
        if ai_response.startswith("NEEDS_REFINEMENT:"):
            feedback = ai_response[18:].strip() # Remove "NEEDS_REFINEMENT:" prefix
            return feedback, True
        elif ai_response.startswith("APPROVED:"):
            feedback = ai_response[9:].strip() # Remove "APPROVED:" prefix
            return feedback, False
        else:
            # Fallback: if format is unexpected, assume it's approved
            return ai_response, False
    
    except Exception as e:
        # Fallback to static respones if Claude API fails
        print(f"Claude API call failed: {e}") 
        fallback_feedback = f"Great! '{intention_text}' is clear and actionable. You've planned {focus_block_count} focus blocks. Let's make it happen!"
        return fallback_feedback, False

def generate_recovery_quest(
        intention_text: str, completion_rate: float, target_quantity: int, completed_quantity: int
    ) -> str:
    """
    Claude generates a personalized Recovery Quest based on failure pattern.
    This is the AI Coach's "Fail Forward Guide" role.
    """
    # NEW: AI Kill Switch
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock recovery quest. ---")
        return "Mock Quest: What was the main obstacle you encountered today?"
    
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user failed to complete their Daily Intention, and you need to generate a Recovery Quest - a reflective question that turns failure into valuable data and learning.

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
        - "You were just one outreach away from your goal - what was happening in your environment or mindset when you stopped at 4 that prevented that final connection?"

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
        print(f"Claude API call failed: {e}") 
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
    # NEW: AI Kill Switch
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock coaching response. ---")
        return "Mock Coaching: That's a great insight. How can you use it tomorrow?"
    
    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user has reflected on their failed intention and shared their insight. Provide encouraging, wisdom-building coaching.

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
        - "Great self-awareness in identifying Snapchat as your specific distraction trigger - that's the kind of precise insight that leads to meaningful change. Your proactive solution to turn off notifications shows you're taking ownership of your environment, and since you still achieved 80% of your goal, you're clearly capable of strong execution when you eliminate these small barriers. Tomorrow's outreach will be even more focused now that you've made this adjustment!"


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
        print(f"Claude API call failed: {e}") 
        return f"Thank you for that honest reflection. Recognizing '{user_reflection}' as a pattern is the first step to breaking through it. Tomorrow's intention will be even stronger because of this insight!"

def generate_success_feedback(
        intention_text: str, target_quantity: int, user_hrga: str
    ) -> str:
    """
    Claude celebrates successful intention completion.
    This is the AI Coach's "Momentum Builder" role.
    """
    # NEW: AI Kill Switch
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock success feedback. ---")
        return "Mock Success: Great job on completing your intention!"

    try:
        prompt = f"""
        You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user has successfully completed their daily intention! Celebrate their win and build momentum.

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
        print(f"Claude API call failed: {e}") 
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

@app.post("/login", response_model=TokenResponse)
def login_for_access_token(
    # This is the "magic" part. FastAPI will automatically handle getting the 
    # 'username' and 'password' from the form body and put them into this 'form_data' object.
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], # Annotated can be seen as a sticky note
    db: Session = Depends(get_db)
):
    """
    The Bouncer. Now using OAuth2PasswordRequestForm to handle form data. 
    1. Uses the standard OAuth2PasswordRequestForm to handle form data.
    2. Finds the user in the database via the new crud function.
    3. Verifies the password using the security function.
    4. If valid, creates and returns a JWT (the wristband).
    """
    # 1. Find the user by their email (which OAuth2 calls 'username')
    user = get_user_by_email(db, email=form_data.username)

    # 2. Verify that the user exists and that the password is correct
    if not user or not verify_password(form_data.password, user.auth.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # We use a generic error to prevent attackers from guessing valid emails.
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # 3. If credentials are valid, create the access token
    # The 'sub' (subject) claim in the token is the user's ID
    access_token = create_access_token(data={"sub": str(user.id)})

    # 4. Return the token in the standard Bearer format
    return {"access_token": access_token, "token_type": "bearer"}


# USER ENDPOINTS

# Simplified using create_user in crud.py
@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user and their associated records. 
    Also now creates their initial character stats

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
        new_user = create_user(db=db, user_data=user_data)
        db.commit()
        db.refresh(new_user)

        # Return the user 
        return new_user
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}"
        )

@app.get("/users/me", response_model=UserResponse)
def get_user(current_user: Annotated[User, Depends(get_current_user)]):
    """Get the profile for the currently logged-in user for the frontend to display user informaiton."""
    # The 'get_current_user' dependency has already done all the work:
    # 1. It got the token.
    # 2. It validated the token.
    # 3. It fetched the user from the database.
    # 4. It handled the "user not found" case.
    
    # All we have to do is return the user object it gives us.
    # FastAPI's 'response_model' will handle converting it to the
    # safe UserResponse schema automatically.
    return current_user

@app.get("/users/{user_id}/stats", response_model=CharacterStatsResponse)
def get_character_stats(user_id: int, db: Session = Depends(get_db)):
    stats = db.query(CharacterStats).filter(CharacterStats.user_id == user_id).first()
    if not stats:
        raise HTTPException(status_code=404, detail="Stats not found for this user.")

    # Calculate the level on the fly
    current_level = calculate_level(stats.xp)

    # Return a response that includes the calculated level
    return CharacterStatsResponse(
        user_id=stats.user_id,
        level=current_level, # Use the calculated value here
        xp=stats.xp,
        resilience=stats.resilience,
        clarity=stats.clarity,
        discipline=stats.discipline,
        commitment=stats.commitment
    )


# DAILY INTENTIONS ENDPOINTS

# Updated for Smart Detection!
@app.post("/intentions", response_model=DailyIntentionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_daily_intention(
    intention_data: DailyIntentionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Create today's Daily Intention - The One Thing that matters!
    Updated: handles both initial and refined submissions!
    Updated: now only creates a daily intention for the currently authenticated user.
    The user is identified by their JWT token.

    AI Coach forces clarity upfront:
    - AI Coach analyzes intention before saving
    - Value intentions will trigger refinement process
    - Only clear, actionable intentions are saved
    - This prevents clutter, confusion and failure before it starts!
    - NEW: A refined submission is treated as a "Sacred Commitment" and is always saved, turning execution into a learning opportunity even if the goal isn't "perfect"

    Core App Mechanics:
    - One intention per day (enforces clarity and focus)
    - NEW: ONE chance to refine intention!
    - Must be measurable with target quantity
    - User estimates focus block count needed (self-awareness building!)
    - This starts the daily execution and learning loop!

    Updated: Now also increases the user's Clarity stat!
    """

    # The get_current_user dependency already handles user validation.
    user = current_user 
    
    # Check if today's Daily Intention already exists
    existing_intention = get_today_intention(db, current_user.id)
    if existing_intention:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily Intention already exists for today. Ready to update it instead?"
        )
    
    # Updated: AI Accountability and Clarity Coach analyzes the intention immediately after it is created *AND* determines if refinement is needed
    ai_feedback, needs_refinement = analyze_daily_intention(
        intention_data.daily_intention_text, 
        intention_data.target_quantity, 
        intention_data.focus_block_count, 
        user.hrga
    )

    # NEW: Core Smart Detection logic
    # MODIFIED: The core logic now checks for the 'is_refined' flag
    # The intentino is saved only if it's a refined intention OR if the initial intention was approved
    if intention_data.is_refined or not needs_refinement:
        # --- SACRED COMMITMENT PATH ---
        # This code now only runs if the intention is APPROVED
        try:
            # Create today's intention
            db_intention = DailyIntention(
                user_id=current_user.id,
                daily_intention_text=intention_data.daily_intention_text.strip(),
                target_quantity=intention_data.target_quantity,
                focus_block_count=intention_data.focus_block_count,
                ai_feedback=ai_feedback,  # AI feedback on intention clarity
                # completed_quantity defaults to 0 (from model)
                # status defaults to 'pending' (from model)
                # created_at defaults to current UTC time (from model)
            )

            db.add(db_intention)

            # NEW: Increase Clarity stat
            stats = get_or_create_user_stats(db, user_id=current_user.id)
            stats.clarity += 1

            db.commit()
            db.refresh(db_intention)  # Refresh to get all default values from the database

            return DailyIntentionResponse(
                id=db_intention.id,
                user_id=current_user.id,
                daily_intention_text=db_intention.daily_intention_text,
                target_quantity=db_intention.target_quantity,
                completed_quantity=db_intention.completed_quantity,
                focus_block_count=db_intention.focus_block_count,
                completion_percentage=0.0,  # Initial percentage is 0%
                status=db_intention.status,
                created_at=db_intention.created_at,
                ai_feedback=db_intention.ai_feedback, # AI Coach's immediate feedback
                needs_refinement=False # Excplicitly set to False
            )
        
        except Exception as e:
            print(f"Database error: {e}") 
            db.rollback()  # Roll back on any error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Daily Intention: {str(e)}"
            )
    
    else:
    # --- INITIAL REFINEMENT NEEDED PATH ---
        # This path is only taken on the first submission if it needs refinement
        # Do NOT save to the database. Return feedback for the user to refine
        return DailyIntentionRefinementResponse(ai_feedback=ai_feedback)
    

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
        print(f"Database error: {e}") 
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
        print(f"Database error: {e}") 
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
        print(f"Database error: {e}") 
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark Daily Intention as failed: {str(e)}"
        )
    
# FOCUS BLOCK ENDPOINTS

@app.post("/focus-blocks", response_model=FocusBlockResponse, status_code=status.HTTP_201_CREATED)
def create_focus_block(block_data: FocusBlockCreate, db: Session = Depends(get_db)):
    """
    Create a new Focus Block when a user starts a timed execution sprint.
    Creates it by finding the user's active intention for the day.
    This logs the user's chunked-down intention for the block.
    NEW: Also ensures that the user has no other active Focus Blocks!
    """
    # Use the existing helper function to get today's Daily Intention for the user
    daily_intention = get_today_intention(db, user_id=block_data.user_id)
    
    # If the user has no intention for today, they can't create a focus block
    if not daily_intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Daily Intention found for today. Please create one first."
        )
    
    # NEW: Enforce "One Active Block at a Time" rule
    existing_active_block = db.query(FocusBlock).filter(
        FocusBlock.daily_intention_id == daily_intention.id,
        FocusBlock.status.in_(['pending', 'in_progress'])
    ).first()

    if existing_active_block:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflict is the perfect status code for this
            detail="You already have an active Focus Block. Please complete or update it before starting a new one."
        )
    
    # Create the new Focus Block instance if the check passes using the ID from the found intention
    new_block = FocusBlock(
        daily_intention_id=daily_intention.id,
        focus_block_intention=block_data.focus_block_intention,
        duration_minutes=block_data.duration_minutes
    )

    try:
        db.add(new_block)
        db.commit()
        db.refresh(new_block)
        return FocusBlockResponse.model_validate(new_block)
    except Exception as e:
        print(f"Database error on Focus Block creation: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Focus Block: {str(e)}"
        )
    
@app.put("/focus-blocks/{block_id}", response_model=FocusBlockResponse)
def update_focus_block(block_id: int, update_data: FocusBlockUpdate, db: Session = Depends(get_db)):
    """
    Update a Focus Block to add video URLs or change its status.
    Used for the "Proof & Review" step after a block.
    Updated: Each Focus Block now gives 10xp upon completion!
    """ 
    block = db.query(FocusBlock).filter(FocusBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Focus Block not found.")
    
    # NEW: Enforce "Sacred Finality"
    today = datetime.now(timezone.utc).date()
    if block.created_at.date() != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Focus Block is from a previous day and can no longer be updated."
        )

    try:
        # Update status if provided
        if update_data.status is not None:
            # NEW XP LOGIC
            # If the block is being marked as 'completed' and wasn't already
            if update_data.status == "completed" and block.status != "completed":
                # Get the user ID from the parent intention
                user_id = block.daily_intention.user_id
                stats = get_or_create_user_stats(db, user_id=user_id)
                stats.xp += 10 # Award 10 XP per block

            block.status = update_data.status.strip()

        # Update URLs if provided
        if update_data.pre_block_video_url is not None:
            block.pre_block_video_url = update_data.pre_block_video_url
        if update_data.post_block_video_url is not None:
            block.post_block_video_url = update_data.post_block_video_url

        db.commit()
        db.refresh(block)
        return FocusBlockResponse.model_validate(block)
    except Exception as e:
        print(f"Database error on Focus Block update: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update Focus Block: {str(e)}"
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

    Update: If successful, increase the user's Discipline stat!
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

            # NEW: Increase Discipline stat on success!
            stats = get_or_create_user_stats(db, user_id=intention.user_id)
            stats.discipline += 1

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
        print(f"Database error: {e}") 
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
    Respond to Recovery Quest - the "Fail Forward" magic and the sacred learning opportunity!
    
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

        # NEW: Increase Resilience stat for completing the quest
        stats = get_or_create_user_stats(db, user_id=original_intention.user_id)
        stats.resilience += 1

        # AI Coach analyzes the response and provides personalized coaching
        ai_coaching_response = generate_coaching_response(quest_response.recovery_quest_response, original_intention.daily_intention_text, completion_rate)

        db.commit()
        db.refresh(result)

        return RecoveryQuestResponse(
            recovery_quest_response=result.recovery_quest_response,
            ai_coaching_feedback=ai_coaching_response
        )
    
    except Exception as e:
        print(f"Database error: {e}") 
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to respond to Recovery Quest: {str(e)}"
        )