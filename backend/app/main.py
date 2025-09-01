from __future__ import annotations  # keep ForwardRef happy with annotation-handling

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware # NEW: Import the CORS middleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Annotated
from dotenv import load_dotenv
import math 

# ---- Internal package imports (namespaced) ----
from . import crud
from . import database
from . import security
from . import services
from . import utils
from . import models
from . import schemas

# Load environment variables
load_dotenv()

# FastAPI app setup
app = FastAPI(
    title="xecute.app API",
    description="Gamify your business growth with AI-driven daily intentions and execution loops.",
    version="1.0.0",
    docs_url="/docs"
)

# NEW: Configure CORS middleware
origins = [
    "https://game-of-becoming-mvp-frontend-v1.onrender.com",
    # Add other origins as needed (e.g., your local development URL)
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:5173", # This is Vite's default dev server port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- UTILITY FUNCTIONS ---

def calculate_level(xp: int) -> int:
    """Calculates user level based on total XP."""
    if xp < 0: return 1
    return math.floor((xp / 100) ** 0.5) + 1

# NEW: A helper function for the next level's XP threshold
def calculate_xp_for_level(level: int) -> int:
    """Calculates the total XP required to reach a given level."""
    if level <= 1:
        return 0
    # The formula for total XP to reach a level is 100 * (L-1)^2
    return 100 * (level - 1) ** 2

# --- ENDPOINT DEPENDENCIES ---

def get_current_user_daily_intention(
    # This dependency itself depends on our other dependencies
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
) -> models.DailyIntention:
    """
    A dependency that gets the current user's intention for today.

    It automatically handles authentication and database access.
    If an intention is found, it returns the DailyIntention object.
    If no intention is found, it raises a 404 error, stopping the request.
    """
    # Get today's Daily Intention for the currently logged in user
    intention = crud.get_today_intention(db, current_user.id)
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily Intention for today not found. Ready to create one?"
        )
    return intention

def get_current_user_stats(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
) -> models.CharacterStats:
    """
    A dependency that gets the current user's character stats.
    
    It automatically handles authentication and database access.
    It will always return a valid CharacterStats object, creating one
    if it doesn't exist. Valid object guaranteed.
    """
    # The crud function guarantees a stats object will be returned,
    # so we can just return its result directly. No check needed.
    return crud.get_or_create_user_stats(db, user_id=current_user.id)

def get_owned_focus_block(
        block_id: int, # We get this from the endpoint path parameter
        current_user: Annotated[models.User, Depends(security.get_current_user)], 
        db: Session = Depends(database.get_db)
) -> models.FocusBlock:
    """
    A dependency that gets a specific Focus Block by its ID, but only if
    it belongs to the currently authenticated user.

    Raises a 404 if the block is not found or not owned by the user.
    """
    # Join FocusBlock and DailyIntention and filter by BOTH block_id and user_id
    block = db.query(models.FocusBlock).join(models.DailyIntention).filter(
        models.FocusBlock.id == block_id,
        models.DailyIntention.user_id == current_user.id
    ).first()

    if not block:
        # We use 404 for both "not found" and "not owned" to avoid leaking information.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Focus Block not found.")
    
    return block

def get_owned_daily_result_by_intention_id(
        intention_id: int, # Gets this from the endpoint path parameter
        current_user: Annotated[models.User, Depends(security.get_current_user)],
        db: Session = Depends(database.get_db)
) -> models.DailyResult:
    """
    A dependency that gets a specific Daily Result by its parent intention's ID,
    but only if it belongs to the currently authenticated user.

    Raises a 404 if the result is not found or not owned by the user.
    """
    # This query links the DailyResult to the DailyIntention to check the user_id.
    result = db.query(models.DailyResult).join(models.DailyIntention).filter(
        models.DailyResult.daily_intention_id == intention_id,
        models.DailyIntention.user_id == current_user.id
    ).first()

    if not result:
        # Use 404 for security, hiding whether the result exists or is just not owned.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily Result not found.")
    
    return result

def get_owned_daily_result_by_result_id(
    result_id: int, # Gets this from the path
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
) -> models.DailyResult:
    """
    Dependency to get a DailyResult by its own ID, ensuring it belongs
    to the current user. This is the final ownership check.
    """
    # We query DailyResult, join its parent DailyIntention, and check the user_id.
    result = db.query(models.DailyResult).join(models.DailyIntention).filter(
        models.DailyResult.id == result_id,
        models.DailyIntention.user_id == current_user.id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Daily Result not found.")
    
    return result

# --- GENERAL ENDPOINTS ---

@app.get("/")
def read_root():
    """Welcome root endpoint - the beginning of the transformational journey!"""
    return {
        "message": "Welcome to the xecute.app API",
        "description": "Ready to turn your exectution blockers into breakthrough momentum?",
        "docs": "Visit /docs for interactive API documentation.",
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and deployment verification"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "service": "xecute.app API",
        "version": "1.0.0"
    }

@app.post("/api/login", response_model=schemas.TokenResponse)
def login_for_access_token(
    # This is the "magic" part. FastAPI will automatically handle getting the 
    # 'username' and 'password' from the form body and put them into this 'form_data' object.
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], # Annotated can be seen as a sticky note
    db: Session = Depends(database.get_db)
):
    """
    The Bouncer. Now using OAuth2PasswordRequestForm to handle form data. 
    1. Uses the standard OAuth2PasswordRequestForm to handle form data.
    2. Finds the user in the database via the new crud function.
    3. Verifies the password using the security function.
    4. If valid, creates and returns a JWT (the wristband).
    """
    # 1. Find the user by their email (which OAuth2 calls 'username')
    user = crud.get_user_by_email(db, email=form_data.username)

    # 2. Verify that the user exists and that the password is correct
    if not user or not utils.verify_password(form_data.password, user.auth.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # We use a generic error to prevent attackers from guessing valid emails.
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # 3. If credentials are valid, create the access token
    # The 'sub' (subject) claim in the token is the user's ID
    access_token = security.create_access_token(data={"sub": str(user.id)})

    # 4. Return the token in the standard Bearer format
    return {"access_token": access_token, "token_type": "bearer"}


# --- USER & ONBOARDING ENDPOINTS ---

# Simplified using create_user in crud.py
@app.post("/api/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Register a new user and their associated records. 
    Also now creates their initial character stats

    The user starts their xecute.app journey here
    """

    # Check if user already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Ready to log in instead?"
        )
    
    try:
        # Create the User record
        new_user = crud.create_user(db=db, user_data=user_data)
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
    
@app.put("/api/users/me", response_model=schemas.UserResponse)
def update_user_me(
    user_data: schemas.UserUpdate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    """
    Updates the profile for the currently authenticated user.
    Used for the onboarding flow to set the user's HLA.
    """
    try:
        # Update the user model with the new data
        current_user.hla = user_data.hla

        # The "ignition". By completing the onboarding, the user performs their first
        # successful action. We call the Streak Guardian to officially start their streak at 1
        services.update_user_streak(user=current_user)
        
        db.commit()
        db.refresh(current_user)
        
        return current_user
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user profile: {str(e)}"
        )

@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    """Get the profile for the currently logged-in user for the frontend to display user informaiton."""
    # The 'get_current_user' dependency has already done all the work:
    # 1. It got the token.
    # 2. It validated the token.
    # 3. It fetched the user from the database.
    # 4. It handled the "user not found" case.
    
    return current_user

@app.get("/api/users/me/stats", response_model=schemas.CharacterStatsResponse)
def get_my_character_stats(
    current_user: Annotated[models.User, Depends(security.get_current_user)]
    ):
    """Get the character stats for the currently authenticated user."""
    # Access the stats directly through the relationship
    stats = current_user.character_stats

    # The user should always have stats, but it's good practice to check
    if not stats:
        raise HTTPException(status_code=404, detail="Character stats not found for your account.")

    # Because 'level' is a calculated value and doesn't exist on the 'stats' object,
    # we must manually construct the response to include it. This is the correct pattern.
    return schemas.CharacterStatsResponse(
        user_id=stats.user_id,
        level=calculate_level(stats.xp),  # Use the calculated level value
        xp=stats.xp,
        resilience=stats.resilience,
        clarity=stats.clarity,
        discipline=stats.discipline,
        commitment=stats.commitment
    )

@app.get("/api/users/me/game-state", response_model=schemas.GameStateResponse)
def get_game_state(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    """
    The primary endpoint for the frontend to get all necessary data
    to render the user's current game state upon loading the app.
    """
    stats = crud.get_or_create_user_stats(db, current_user.id)
    todays_intention = crud.get_today_intention(db, current_user.id)
    unresolved_intention = crud.get_yesterday_incomplete_intention(db, current_user.id)

    # NEW: Calculate level and XP progression
    current_level = calculate_level(stats.xp)
    xp_for_next_level = calculate_xp_for_level(current_level + 1)
    xp_needed_to_level = xp_for_next_level - stats.xp

    # Manually construct the response object
    return schemas.GameStateResponse(
        user=current_user,
        stats=schemas.CharacterStatsResponse(
            user_id=stats.user_id,
            level=calculate_level(stats.xp),
            xp=stats.xp,
            xp_for_next_level=xp_for_next_level, # New XP field
            xp_needed_to_level=xp_needed_to_level, # New XP field
            resilience=stats.resilience,
            clarity=stats.clarity,
            discipline=stats.discipline,
            commitment=stats.commitment
        ),
        todays_intention=todays_intention,
        unresolved_intention=unresolved_intention
    )

@app.post("/api/onboarding/step", response_model=schemas.OnboardingStepResponse)
async def handle_onboarding_step(
    step_data: schemas.OnboardingStepInput,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    """
    Handles one step of the AI-driven conversational onboarding flow.
    """
    try:
        response_data = await services.process_onboarding_step(db, current_user, step_data)
        
        # If this is the final step, start the user's streak.
        if response_data.get("next_step") is None:
            services.update_user_streak(user=current_user)
            db.commit()

        return response_data

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during the onboarding process: {str(e)}"
        )
    

# --- DAILY INTENTION ENDPOINTS ---

# Updated for Smart Detection! And now async!
@app.post("/api/intentions", response_model=schemas.DailyIntentionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_intention(
    intention_data: schemas.DailyIntentionCreate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    stats: Annotated[models.CharacterStats, Depends(get_current_user_stats)],
    db: Session = Depends(database.get_db)
):
    """
    Create today's Daily Intention, now driven by the service layer.
    Handles initial submissions and refined submissions after AI feedback.
    """
    # 1. Check if today's Daily Intention for the currently logged in user already exists
    if crud.get_today_intention(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily Intention already exists for today! Get going making progress on it!"
        )
    
    # 2. Delegate AI prompts and logic to the service layer. Now awaited!
    analysis_result = await services.create_and_process_intention(db, current_user, intention_data)

    # 3. Handle the result using our precise business logic
    if intention_data.is_refined or not analysis_result.get("needs_refinement"):
        # Path 1: The intention is approved. Save it to the database
        try:
            db_intention = models.DailyIntention(
                user_id=current_user.id,
                daily_intention_text=intention_data.daily_intention_text.strip(),
                target_quantity=intention_data.target_quantity,
                focus_block_count=intention_data.focus_block_count,
                ai_feedback=analysis_result.get("ai_feedback")
            )
            db.add(db_intention)

            # Update Clarity stat using our dependency
            clarity_gain = analysis_result.get("clarity_stat_gain", 0)
            if clarity_gain > 0:
                stats.clarity += clarity_gain

            db.commit()
            db.refresh(db_intention)
            if clarity_gain > 0:
                db.refresh(stats)

            # We can't just return db_intention. We must manually construct the response
            # to include our calculated 'completion_percentage'.
            return schemas.DailyIntentionResponse(
                id=db_intention.id,
                user_id=db_intention.user_id,
                daily_intention_text=db_intention.daily_intention_text,
                target_quantity=db_intention.target_quantity,
                completed_quantity=db_intention.completed_quantity,
                focus_block_count=db_intention.focus_block_count,
                completion_percentage=0.0, # A new intention always starts at 0%
                status=db_intention.status,
                created_at=db_intention.created_at,
                ai_feedback=db_intention.ai_feedback,
                focus_blocks=db_intention.focus_blocks,
                daily_result=db_intention.daily_result
            )
        
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create intention: {e}")
    
    else:
        # Path 2: The intention needs refinement. Return the AI feedback
        # This is a manual construction because the object doesn't exist in the DB.
        return schemas.DailyIntentionRefinementResponse(ai_feedback=analysis_result.get("ai_feedback"))
        
@app.get("/api/intentions/today/me", response_model=schemas.DailyIntentionResponse)
def get_my_daily_intention(
    intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)]
    ):
    """
    Get today's Daily Intention for the currently logged in user.
    The core of the Daily Commitment Screen!
    UPDATE: Now includes all associated Focus Blocks
    UPDATE: Now also potentially includes a Daily Result
    """
    # 1. Calculate the value that doesn't exist in the database model.
    completion_percentage = (
        (intention.completed_quantity / intention.target_quantity) * 100
        if intention.target_quantity > 0 else 0.0
    )

    # 2. Because we have a calculated value, we MUST manually construct the Pydantic response model. 
    # Now includes focus_blocks list. The 'intention.focus_blocks' attribute is already populated thanks
    # to our eager loading in crud.py. No extra database query is needed here
    return schemas.DailyIntentionResponse(
        id=intention.id,
        user_id=intention.user_id,
        daily_intention_text=intention.daily_intention_text,
        target_quantity=intention.target_quantity,
        completed_quantity=intention.completed_quantity,
        focus_block_count=intention.focus_block_count,
        completion_percentage=completion_percentage, # Use the calculated value
        status=intention.status,
        created_at=intention.created_at,
        ai_feedback=intention.ai_feedback,
        focus_blocks=intention.focus_blocks,
        daily_result=intention.daily_result
    )

@app.patch("/api/intentions/today/progress", response_model=schemas.DailyIntentionResponse)
def update_daily_intention_progress(
    progress_data: schemas.DailyIntentionUpdate,
    intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    db: Session = Depends(database.get_db),
):
    """
    Updates Daily Intention progress for the currently logged in user - the core of the Daily Execution Loop!
    - User reports progress after each Focus Block
    - System calculates completion percentage
    - Determines if intention is completed, in progress or failed
    """
    # Strict Forward Progress: Users should not be able to report less progress than already recorded
    if progress_data.completed_quantity < intention.completed_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report less progress than you have already recorded."
        )

    try:
        # Update progress: absolute, not incremental! Simpler mental model - "Where am I vs my goal?"
        intention.completed_quantity = min(progress_data.completed_quantity, intention.target_quantity)
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

        return schemas.DailyIntentionResponse(
            id=intention.id,
            user_id=intention.user_id,
            daily_intention_text=intention.daily_intention_text,
            target_quantity=intention.target_quantity,
            completed_quantity=intention.completed_quantity,
            focus_block_count=intention.focus_block_count,
            completion_percentage=completion_percentage, # Use the calculated value
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

@app.post("/api/intentions/today/complete", response_model=schemas.DailyResultCompletionResponse)
async def complete_daily_intention(
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    stats: Annotated[models.CharacterStats, Depends(get_current_user_stats)],
    db: Session = Depends(database.get_db)
    ):
    """
    Marks the Daily Intention as completed AND creates the corresponding Daily Result
    in a single, atomic operation.
    
    This triggers:
    - XP gain for the user
    - Discipline stat increase
    - Streak continuation; now implemented!
    """
    # The dependency guarantees Daily Intention that belongs to the currently logged in user

    if daily_intention.daily_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A result for this intention has already been created."
        )
    
    # Ensure the intention is actually ready to be completed
    if daily_intention.completed_quantity < daily_intention.target_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intention progress is not yet complete."
        )
    
    try:
        # Mark as completed
        daily_intention.status = 'completed'

        # Call the service to get the reflection logic, Discipline stat gain and XP gain
        reflection_data = await services.create_daily_reflection(db=db, user=stats.user, daily_intention=daily_intention)
        discipline_gain = reflection_data.get("discipline_stat_gain", 0)
        xp_gain = reflection_data.get("xp_awarded", 0)

        # Create the DailyResult
        db_result = models.DailyResult(
            daily_intention_id=daily_intention.id,
            succeeded_failed=True, # Explicitly True
            ai_feedback=reflection_data["ai_feedback"],
            recovery_quest=None, # No recovery quest on success
            discipline_stat_gain=discipline_gain,
            xp_awarded=xp_gain # Save the XP gain to the database
        )
        db.add(db_result)

        # Update stats with BOTH rewards
        if discipline_gain > 0:
            stats.discipline += discipline_gain
        if xp_gain > 0:
            stats.xp += xp_gain

        # NEW: Streak implementation! This is a confirmed "successful action"
        services.update_user_streak(user=stats.user)

        # Explicitly add the user object to the session to ensure its changes are tracked 
        db.add(stats.user)

        # Commit all changes at once
        db.commit()
        db.refresh(db_result)
        db.refresh(stats)

        # Manually construct the final, rich response object
        return schemas.DailyResultCompletionResponse(
            id=db_result.id,
            daily_intention_id=db_result.daily_intention_id,
            succeeded_failed=db_result.succeeded_failed,
            ai_feedback=db_result.ai_feedback,
            recovery_quest=db_result.recovery_quest,
            recovery_quest_response=db_result.recovery_quest_response,
            user_confirmation_correction=db_result.user_confirmation_correction,
            created_at=db_result.created_at,
            discipline_stat_gain=discipline_gain, # Use the calculated value
            xp_awarded=xp_gain # Use the calculated value
        )
    
    except Exception as e:
        print(f"Database error: {e}") 
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete Daily Intention: {str(e)}"
        )
    
@app.post("/api/intentions/today/fail", response_model=schemas.DailyResultCompletionResponse)
async def fail_daily_intention(
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    stats: Annotated[models.CharacterStats, Depends(get_current_user_stats)],
    db: Session = Depends(database.get_db)
    ):
    """
    Triggers the "Fail Forward" mechanism by marking the Daily Intention as
    failed AND creating the corresponding Daily Result in a single, atomic operation.
    
    - AI feedback on failure in order to re-frame failure
    - AI generates and initiates Recovery Quest
    - Opportunity to gain Resilience stat
    """
    # The dependency once again guarantees Daily Intention that belongs to the currently logged in user
    # But we still need to check if the Daily Intention already has a Daily Result
    if daily_intention.daily_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A Daily Result for this Daily Intention has alreayd been created."
        )
    
    try:
        # Mark as failed
        daily_intention.status = 'failed'

        # --- Start of new, integrated logic ---

        # 1. Call the service to get the reflection logic
        reflection_data = await services.create_daily_reflection(db=db, user=stats.user, daily_intention=daily_intention)
        discipline_gain = reflection_data.get("discipline_stat_gain", 0) # Should be 0 for failure
        xp_gain = reflection_data.get("xp_awarded", 0) # Should also be 0 for failure

        # 2. Create the DailyResult database objcet
        db_result = models.DailyResult(
            daily_intention_id=daily_intention.id,
            succeeded_failed=False, # Explicitly False for failure
            ai_feedback=reflection_data["ai_feedback"],
            recovery_quest=reflection_data["recovery_quest"],
            discipline_stat_gain=discipline_gain,
            xp_awarded=xp_gain
        )
        db.add(db_result)

        # 3. Update user stats (Discipline and XP shouldn't change, but this is good practice)
        if discipline_gain > 0:
            stats.discipline += discipline_gain
        if xp_gain > 0:
            stats.xp += xp_gain
        
        # Commit all changes at once (status change and new result)
        db.commit()
        db.refresh(db_result)
        db.refresh(stats)

        # Manually construct the final, rich response object
        return schemas.DailyResultCompletionResponse(
            id=db_result.id,
            daily_intention_id=db_result.daily_intention_id,
            succeeded_failed=db_result.succeeded_failed,
            ai_feedback=db_result.ai_feedback,
            recovery_quest=db_result.recovery_quest,
            recovery_quest_response=db_result.recovery_quest_response,
            user_confirmation_correction=db_result.user_confirmation_correction,
            created_at=db_result.created_at,
            discipline_stat_gain=discipline_gain, # Use the calculated value, despite it being 0
            xp_awarded=0 # Use the calculated value, despite it being 0
        )
    
    except Exception as e:
        print(f"Database error: {e}") 
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark Daily Intention as failed: {str(e)}"
        )


# --- FOCUS BLOCK ENDPOINTS ---

@app.post("/api/focus-blocks", response_model=schemas.FocusBlockResponse, status_code=status.HTTP_201_CREATED)
def create_focus_block(
    block_data: schemas.FocusBlockCreate, 
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    db: Session = Depends(database.get_db)):
    """
    Create a new Focus Block when the currently logged in user starts a timed execution sprint.
    Creates it by finding the user's active intention for the day.
    This logs the user's chunked-down intention for the block.
    NEW: Also ensures that the user has no other active Focus Blocks!
    """
    # The dependency has already guaranteed the currently logged in user's Daily Intention!
    
    # NEW: Enforce "One Active Block at a Time" rule
    existing_active_block = db.query(models.FocusBlock).filter(
        models.FocusBlock.daily_intention_id == daily_intention.id,
        models.FocusBlock.status.in_(['pending', 'in_progress'])
    ).first()

    if existing_active_block:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflict is the perfect status code for this
            detail="You already have an active Focus Block. Please complete or update it before starting a new one."
        )
    
    # Create the new Focus Block instance if the check passes using the ID from the found intention
    new_block = models.FocusBlock(
        daily_intention_id=daily_intention.id,
        focus_block_intention=block_data.focus_block_intention,
        duration_minutes=block_data.duration_minutes
    )

    try:
        db.add(new_block)
        db.commit()
        db.refresh(new_block)
        return new_block
    except Exception as e:
        print(f"Database error on Focus Block creation: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Focus Block: {str(e)}"
        )

@app.patch("/api/focus-blocks/{block_id}", response_model=schemas.FocusBlockCompletionResponse)
def update_focus_block(
    update_data: schemas.FocusBlockUpdate, 
    block: Annotated[models.FocusBlock, Depends(get_owned_focus_block)],
    stats: Annotated[models.CharacterStats, Depends(get_current_user_stats)],
    db: Session = Depends(database.get_db)
    ):
    """
    Updates a Focus Block's status or video URLs.
    Awards XP upon completion by delegating to the service layer.
    """
    # The get_owned_focus_block dependency guarantees a Focus Block that belongs to the currently logged in user
    
    # This check ensures the block is from today, preserving the game's integrity.
    today = datetime.now(timezone.utc).date()
    if block.created_at.date() != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Focus Block is from a previous day and can no longer be updated."
        )

    try:
        # Flag to track if we need to commit stats changes
        xp_awarded = 0

        # Check if the block is being marked as completed for the first time
        if update_data.status == "completed" and block.status != "completed":
            # Delegate completion logic and xp gain to the service layer
            completion_result = services.complete_focus_block(db=db, user=stats.user, block=block)
            # Get the result from the service
            xp_awarded = completion_result.get("xp_awarded", 0)

        # Update the block's data from the request payload
        if update_data.status is not None:
            block.status = update_data.status.strip()
        if update_data.pre_block_video_url is not None:
            block.pre_block_video_url = update_data.pre_block_video_url
        if update_data.post_block_video_url is not None:
            block.post_block_video_url = update_data.post_block_video_url
        
        # Apply stat changes from the service call
        if xp_awarded > 0:
            stats.xp += xp_awarded

        db.commit()
        db.refresh(block)
        if xp_awarded > 0:
            db.refresh(stats)
            
        return schemas.FocusBlockCompletionResponse(
            id=block.id,
            daily_intention_id=block.daily_intention_id,
            status=block.status,
            pre_block_video_url=block.pre_block_video_url,
            post_block_video_url=block.post_block_video_url,
            created_at=block.created_at,
            focus_block_intention=block.focus_block_intention,
            duration_minutes=block.duration_minutes,
            xp_awarded=xp_awarded # Include our calculated field
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update Focus Block: {str(e)}"
        )


# --- DAILY RESULTS ENDPOINTS ---
# The old POST Daily Result creation endpoint /daily-results is no longer needed; 
# it is all taken care of by the /complete and /fail endpoints!

@app.get("/api/daily-results/{intention_id}", response_model=schemas.DailyResultResponse)
def get_daily_result(
    # The dependency does all the work: finds the result AND verifies ownership.
    result: Annotated[models.DailyResult, Depends(get_owned_daily_result_by_intention_id)]
    ):
    """
    Get the Daily Result for a specific, user-owned intention.
    Used for disaplying reflection insights and Recovery Quests
    """
    # The 'result' object is guaranteed to be the correct, owned DailyResult.
    return result

@app.post("/api/daily-results/{result_id}/recovery-quest", response_model=schemas.RecoveryQuestResponse)
async def respond_to_recovery_quest(
    quest_response: schemas.RecoveryQuestInput,
    result: Annotated[models.DailyResult, Depends(get_owned_daily_result_by_result_id)],
    stats: Annotated[models.CharacterStats, Depends(get_current_user_stats)],
    db: Session = Depends(database.get_db)
):
    """Submits user's reflection on a failed day and receives AI coaching via the service layer."""
    # The dependency already guarantees user-owned DailyResult.
    
    # Check if Recovery Quest exists; business logic check specific to this endpoint
    if not result.recovery_quest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Recovery Quest available for this result."
        )
    
    # Check if a response has already been submitted
    if result.recovery_quest_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A response for this Recovery Quest has already been submitted."
        )
        
    try:
        # Call the service to get the simulated AI coaching and stat gains
        coaching_data = await services.process_recovery_quest_response(
            db=db,
            user=stats.user,
            result=result,
            response_text=quest_response.recovery_quest_response
        )
        resilience_gain = coaching_data.get("resilience_stat_gain", 0)
        xp_awarded = coaching_data.get("xp_awarded", 0)

        # Apply the user's input and the service's results to the models
        result.recovery_quest_response = quest_response.recovery_quest_response.strip()
        result.xp_awarded = xp_awarded
        if resilience_gain > 0:
            stats.resilience += resilience_gain
        if xp_awarded > 0:
            stats.xp += xp_awarded
        
        # The user has successfully learned from failure. This is a "successful action",
        # so we call the Streak Guardian to preserve their streak.
        services.update_user_streak(user=stats.user)

        db.commit()
        db.refresh(result)
        if resilience_gain > 0:
            db.refresh(stats)
        if xp_awarded > 0:
            db.refresh(stats)

        # Return the data, using the coaching feedback from the service
        return schemas.RecoveryQuestResponse(
            recovery_quest_response=result.recovery_quest_response,
            ai_coaching_feedback=coaching_data["ai_coaching_feedback"],
            resilience_stat_gain=resilience_gain,
            xp_awarded=xp_awarded
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to respond to Recovery Quest: {str(e)}"
        )