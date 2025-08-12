from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Annotated
from dotenv import load_dotenv
import math

# Import our layered modules
from . import crud, models, schemas, security, services
from .database import get_db

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

def get_current_user_active_intention(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(get_db)
) -> models.DailyIntention:
    """Dependency to get the current user's active intention for today."""
    intention = crud.get_user_active_intention(db, user_id=current_user.id)
    if not intention:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active Daily Intention for today not found."
        )
    return intention

def get_owned_focus_block(
    block_id: int,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(get_db)
) -> models.FocusBlock:
    """Dependency to get a specific Focus Block owned by the current user."""
    block = db.query(models.FocusBlock).join(models.DailyIntention).filter(
        models.FocusBlock.id == block_id,
        models.DailyIntention.user_id == current_user.id
    ).first()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Focus Block not found.")
    return block

def get_owned_daily_result(
    result_id: int,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(get_db)
) -> models.DailyResult:
    """Dependency to get a specific DailyResult owned by the current user."""
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
    return {"message": "Welcome to The Game of Becoming API!", "docs_url": "/docs"}

@app.post("/login", response_model=schemas.TokenResponse)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.auth.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# --- USER ENDPOINTS ---

@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")
    try:
        new_user = crud.create_user(db=db, user_data=user_data)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create user: {e}")

@app.get("/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    return current_user

@app.get("/users/me/stats", response_model=schemas.CharacterStatsResponse)
def get_my_stats(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(get_db)
):
    stats = crud.get_character_stats(db, user_id=current_user.id)
    if not stats:
        raise HTTPException(status_code=404, detail="Character stats not found.")
    
    response = schemas.CharacterStatsResponse.model_validate(stats)
    response.level = calculate_level(stats.xp)
    return response

# --- DAILY INTENTION ENDPOINTS ---

@app.post("/intentions", response_model=schemas.DailyIntentionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_daily_intention(
    intention_data: schemas.DailyIntentionCreate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    db: Session = Depends(get_db)
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
    intention: Annotated[models.DailyIntention, Depends(get_current_user_active_intention)]
):
    return intention

@app.patch("/intentions/today/progress", response_model=schemas.DailyIntentionResponse)
def update_intention_progress(
    progress_data: schemas.DailyIntentionUpdate,
    intention: Annotated[models.DailyIntention, Depends(get_current_user_active_intention)],
    db: Session = Depends(get_db),
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
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_active_intention)],
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    daily_intention: Annotated[models.DailyIntention, Depends(get_current_user_active_intention)],
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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