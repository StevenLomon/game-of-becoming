from typing import Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# Import modules
from . import crud, models, schemas
from .llm_providers.factory import get_llm_provider

# Pydantic models for structured AI responses
class IntentionAnalysisResponse(BaseModel):
    is_strong_intention: bool = Field(...)
    feedback: str = Field(...)
    clarity_stat_gain: int = Field(...)

class DailyReflectionResponse(BaseModel):
    ai_feedback: str = Field(...)
    recovery_quest: str | None = Field(...)
    discipline_stat_gain: int = Field(...)

class RecoveryQuestCoachingResponse(BaseModel):
    ai_coaching_feedback: str = Field(...)
    resilience_stat_gain: int = Field(...)


def create_and_process_intention(db: Session, user: models.User, intention_data: schemas.DailyIntentionCreate) -> Dict[str, Any]:
    llm_provider = get_llm_provider()
    system_prompt = "You are an expert coach specializing in goal-setting and productivity."
    user_prompt = f"Analyze this daily intention for {user.name}: '{intention_data.daily_intention_text}'. Is it a strong, actionable intention? Provide feedback."
    
    structured_response = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=IntentionAnalysisResponse
    )

    if "error" in structured_response or not structured_response.get("is_strong_intention"):
        return {"needs_refinement": True, "ai_feedback": structured_response.get("feedback", "Could not analyze intention.")}
    else:
        return {"needs_refinement": False, "ai_feedback": structured_response.get("feedback"), "clarity_stat_gain": structured_response.get("clarity_stat_gain", 1)}

def complete_focus_block(db: Session, user: models.User, block: models.FocusBlock) -> Dict[str, Any]:
    xp_awarded = block.duration_minutes
    return {"xp_awarded": xp_awarded}

def mark_intention_complete(db: Session, user: models.User, intention: models.DailyIntention) -> Dict[str, Any]:
    crud.update_intention_status(db, intention, "completed")
    crud.update_character_stats(db, user.id, discipline=1)
    return {"status": "completed", "discipline_awarded": 1}

def mark_intention_failed(db: Session, user: models.User, intention: models.DailyIntention) -> Dict[str, Any]:
    crud.update_intention_status(db, intention, "failed")
    return {"status": "failed", "discipline_awarded": 0}

def create_daily_reflection(db: Session, user: models.User, daily_intention: models.DailyIntention) -> Dict[str, Any]:
    llm_provider = get_llm_provider()
    succeeded = daily_intention.status == "completed"
    outcome_text = "succeeded" if succeeded else "failed"

    system_prompt = "You are an AI Accountability Coach. Be supportive and insightful."
    user_prompt = f"{user.name} had an intention: '{daily_intention.daily_intention_text}'. They {outcome_text}. Provide feedback, and a recovery quest if they failed."
    
    structured_response = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=DailyReflectionResponse
    )
    
    if "error" in structured_response:
        return {"succeeded": succeeded, "ai_feedback": "Great work reflecting today.", "recovery_quest": None, "discipline_stat_gain": 1 if succeeded else 0}
    
    structured_response["succeeded"] = succeeded
    return structured_response

def process_recovery_quest_response(db: Session, user: models.User, result: models.DailyResult, response_text: str) -> Dict[str, Any]:
    llm_provider = get_llm_provider()
    system_prompt = "You are an AI Accountability Coach. Be empathetic and non-judgmental."
    user_prompt = f"{user.name} failed their intention. Quest: '{result.recovery_quest}'. Their reflection: '{response_text}'. Provide coaching feedback."
    
    structured_response = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=RecoveryQuestCoachingResponse
    )
    
    if "error" in structured_response:
        return {"ai_coaching_feedback": "Thank you for sharing. This is how we grow.", "resilience_stat_gain": 1}
        
    return structured_response
