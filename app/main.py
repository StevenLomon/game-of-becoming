from __future__ import annotations  # keep ForwardRef happy with annotation-handling

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Annotated
from dotenv import load_dotenv
import math

# ---- Internal package imports (namespaced) ----
import app.crud as crud
import app.database as database
import app.security as security
import app.services as services
import app.utils as utils
import app.models as models
import app.schemas as schemas

# Load environment variables
load_dotenv()

# FastAPI app setup
app = FastAPI(
    title="Game of Becoming API",
    description="Gamify your business growth with AI-driven daily intentions and feedback.",
    version="1.0.0",
    docs_url="/docs"
)

# --- UTILITY FUNCTIONS ---

def calculate_level(xp: int) -> int:
    """Calculates user level based on total XP."""
    if xp < 0: return 1
    return math.floor((xp / 100) ** 0.5) + 1

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

@app.post("/login", response_model=schemas.TokenResponse)
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


# --- USER ENDPOINTS ---

# Simplified using create_user in crud.py
@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Register a new user and their associated records. 
    Also now creates their initial character stats

    The user starts their Game of Becoming journey here!
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
        return schemas.UserResponse.model_validate(new_user)
    
    except Exception as e:
        db.rollback()  # Roll back on any error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}"
        )

@app.get("/users/me", response_model=schemas.UserResponse)
def get_user(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    """Get the profile for the currently logged-in user for the frontend to display user informaiton."""
    # The 'get_current_user' dependency has already done all the work:
    # 1. It got the token.
    # 2. It validated the token.
    # 3. It fetched the user from the database.
    # 4. It handled the "user not found" case.
    
    # Explicitly convert the SQLAlchemy User model to the Pydantic UserResponse model.
    return schemas.UserResponse.model_validate(current_user)

@app.get("/users/me/stats", response_model=schemas.CharacterStatsResponse)
def get_my_character_stats(
    current_user: Annotated[models.User, Depends(security.get_current_user)]
    ):
    """Get the character stats for the currently authenticated user."""
    # Access the stats directly through the relationship
    stats = current_user.character_stats

    # The user should always have stats, but it's good practice to check
    if not stats:
        raise HTTPException(status_code=404, detail="Character stats not found for your account.")

    # Calculate the level on the fly
    current_level = calculate_level(stats.xp)

    # Return a response that includes the calculated level
    return schemas.CharacterStatsResponse(
        user_id=stats.user_id,
        level=current_level, # Use the calculated value here
        xp=stats.xp,
        resilience=stats.resilience,
        clarity=stats.clarity,
        discipline=stats.discipline,
        commitment=stats.commitment
    )

# --- DAILY INTENTION ENDPOINTS ---

@app.post("/intentions", response_model=schemas.DailyIntentionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_daily_intention(
    intention_data: schemas.DailyIntentionCreate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    if crud.get_user_active_intention(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active daily intention already exists for today.")

    analysis_result = services.create_and_process_intention(db, current_user, intention_data)
    
    if intention_data.is_refined or not analysis_result.get("needs_refinement"):
        try:
            db_intention = models.DailyIntention(
                user_id=current_user.id,
                daily_intention_text=intention_data.daily_intention_text.strip(),
                target_quantity=intention_data.target_quantity,
                focus_block_count=intention_data.focus_block_count,
                ai_feedback=analysis_result.get("ai_feedback"),
            )
            db.add(db_intention)
            
            clarity_gain = analysis_result.get("clarity_stat_gain", 0)
            if clarity_gain > 0:
                crud.update_character_stats(db, current_user.id, clarity=clarity_gain)

            db.commit()
            db.refresh(db_intention)
            
            return schemas.DailyIntentionResponse.model_validate(db_intention)

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create intention: {e}")
    else:
        return schemas.DailyIntentionRefinementResponse(ai_feedback=analysis_result.get("ai_feedback"))
        
@app.get("/intentions/today/active", response_model=schemas.DailyIntentionResponse)
def get_my_active_intention(
    intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)]
):
    return intention

@app.patch("/intentions/today/progress", response_model=schemas.DailyIntentionResponse)
def update_intention_progress(
    progress_data: schemas.DailyIntentionUpdate,
    intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    db: Session = Depends(database.get_db),
):
    if progress_data.completed_quantity < intention.completed_quantity:
        raise HTTPException(status_code=400, detail="Cannot report less progress than already recorded.")

    try:
        intention.completed_quantity = min(progress_data.completed_quantity, intention.target_quantity)
        if intention.completed_quantity > 0 and intention.status == 'active':
             intention.status = 'in_progress'

        db.commit()
        db.refresh(intention)
        return intention
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {e}")

# --- FOCUS BLOCK ENDPOINTS ---

@app.post("/focus-blocks", response_model=schemas.FocusBlockResponse, status_code=status.HTTP_201_CREATED)
def create_focus_block(
    block_data: schemas.FocusBlockCreate,
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    db: Session = Depends(database.get_db)
):
    existing_active_block = db.query(models.FocusBlock).filter(
        models.FocusBlock.daily_intention_id == daily_intention.id,
        models.FocusBlock.status == 'in_progress'
    ).first()
    if existing_active_block:
        raise HTTPException(status_code=409, detail="An active Focus Block already exists.")

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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create Focus Block: {e}")

@app.patch("/focus-blocks/{block_id}", response_model=schemas.FocusBlockResponse)
def update_focus_block(
    update_data: schemas.FocusBlockUpdate,
    block: Annotated[models.FocusBlock, Depends(get_owned_focus_block)],
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    if block.created_at.date() != datetime.now(timezone.utc).date():
        raise HTTPException(status_code=403, detail="Focus Block from a previous day cannot be updated.")
    
    try:
        if update_data.status and update_data.status == "completed" and block.status != "completed":
            services.complete_focus_block(db, current_user, block)
            block.status = "completed"

        if update_data.pre_block_video_url is not None:
            block.pre_block_video_url = update_data.pre_block_video_url
        if update_data.post_block_video_url is not None:
            block.post_block_video_url = update_data.post_block_video_url
        
        db.commit()
        db.refresh(block)
        return block
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Focus Block: {e}")

# --- DAILY RESULTS ENDPOINTS ---

@app.post("/daily-results", response_model=schemas.DailyResultResponse, status_code=status.HTTP_201_CREATED)
def create_daily_result(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_daily_intention)],
    db: Session = Depends(database.get_db)
):
    if db.query(models.DailyResult).filter(models.DailyResult.daily_intention_id == daily_intention.id).first():
        raise HTTPException(status_code=400, detail="Daily Result already exists for this intention.")

    # Determine outcome and update intention status
    if daily_intention.completed_quantity >= daily_intention.target_quantity:
        services.mark_intention_complete(db, current_user, daily_intention)
    else:
        services.mark_intention_failed(db, current_user, daily_intention)
    
    # Call service for reflection AI
    reflection_result = services.create_daily_reflection(db, current_user, daily_intention)

    try:
        db_result = models.DailyResult(
            daily_intention_id=daily_intention.id,
            succeeded=reflection_result.get("succeeded"),
            ai_feedback=reflection_result.get("ai_feedback"),
            recovery_quest=reflection_result.get("recovery_quest")
        )
        db.add(db_result)
        db.commit()
        db.refresh(db_result)
        return db_result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create Daily Result: {e}")

@app.post("/daily-results/{result_id}/recovery-quest", response_model=schemas.RecoveryQuestResponse)
def respond_to_recovery_quest(
    result_id: int,
    quest_response: schemas.RecoveryQuestInput,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(database.get_db)
):
    result = get_owned_daily_result(result_id, current_user, db) # Use dependency as a function
    if not result.recovery_quest:
        raise HTTPException(status_code=400, detail="No Recovery Quest available for this result.")

    coaching_result = services.process_recovery_quest_response(db, current_user, result, quest_response.recovery_quest_response)
    
    try:
        result.recovery_quest_response = quest_response.recovery_quest_response.strip()
        
        resilience_gain = coaching_result.get("resilience_stat_gain", 0)
        if resilience_gain > 0:
            crud.update_character_stats(db, current_user.id, resilience=resilience_gain)
        
        db.commit()

        return schemas.RecoveryQuestResponse(
            recovery_quest_response=result.recovery_quest_response,
            ai_coaching_feedback=coaching_result.get("ai_coaching_feedback")
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to respond to Recovery Quest: {e}")