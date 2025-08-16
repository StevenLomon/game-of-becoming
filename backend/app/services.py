from typing import Any
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os

# Import modules
from . import models
from . import schemas
from .llm_providers.factory import get_llm_provider

# --- Our Secret Sauce: Pydantic Models for Structured AI Responses ensuring reliable AI output ---

class IntentionAnalysisResponse(BaseModel):
    is_strong_intention: bool = Field(description="True if the intention is clear, specific, and ready for commitment. False if it needs refinement.")
    feedback: str = Field(description="Encouraging, actionable coaching feedback for the user (2-3 sentences max).")
    clarity_stat_gain: int = Field(description="Set to 1 if is_strong_intention is true, otherwise 0.")

class DailyReflectionResponse(BaseModel):
    ai_feedback: str = Field(description="AI coach's feedback on the user's day. If successful, a celebratory message. If failed, an acknowledgement of the completion rate.")
    recovery_quest: str | None = Field(description="A specific, thoughtful, and actionable recovery quest (a single question) if the day was a failure. Null if successful.")
    discipline_stat_gain: int = Field(description="Discipline stat points to award (1 for success, 0 for failure).")

class RecoveryQuestCoachingResponse(BaseModel):
    ai_coaching_feedback: str = Field(description="Encouraging, wisdom-building coaching based on the user's reflection (2-3 sentences max).")
    resilience_stat_gain: int = Field(description="Set to 1 for completing the reflection.")


# --- Service Functions (Business Logic Layer) ---
# All functions include a db object in their signature for future-proofing: the rules
# are simple in this MVP version but they won't always be simple. For V2 and future versions
# we want to use db to fetch the user's history to give better feedback!

def create_and_process_intention(db: Session, user: models.User, intention_data: schemas.DailyIntentionCreate) -> dict[str, Any]:
    """
    Analyzes a daily intention using the AI Coach's "Clarity Enforcer" role.
    This replaces analyze_daily_intention from main.py.
    """
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock 'APPROVED' response. ---")
        return {
            "needs_refinement": False,
            "ai_feedback": "Mock feedback: This is a clear and actionable intention!",
            "clarity_stat_gain": 1
        }
    
    llm_provider = get_llm_provider()
    
    system_prompt = f"""
    You are the AI Accountability and Clarity Coach for The Game of Becoming™. Your role is to analyze daily intentions and provide encouraging, actionable feedback.

    Your task is to determine if the user's intention is strong and clear enough for them to commit to. A strong intention is specific, measurable, actionable, and aligned with their main goal.

    Analyze the user's intention based on these criteria and respond with a JSON object that matches this Pydantic model:
    class IntentionAnalysisResponse(BaseModel):
        is_strong_intention: bool = Field(description="True if the intention is clear, specific, and ready for commitment. False if it needs refinement.")
        feedback: str = Field(description="Encouraging, actionable coaching feedback for the user (2-3 sentences max).")
        clarity_stat_gain: int = Field(description="Set to 1 if is_strong_intention is true, otherwise 0.")
    """

    user_prompt = f"""
    Here is the user's data:
    - User's Highest Revenue Generating Activity (HRGA): "{user.hrga}"
    - Today's Daily Intention: "{intention_data.daily_intention_text}"
    - Target Quantity: {intention_data.target_quantity}
    - Planned Focus Block Count: {intention_data.focus_block_count}

    Analyze this intention. Is it specific, measurable, actionable, and aligned with their HRGA?

    Example of a strong intention:
    - Intention: "Send 5 personalized LinkedIn connection requests to potential clients in the SaaS industry."
    - Analysis: This is strong. It's specific (LinkedIn requests), measurable (5), actionable, and likely aligns with a sales HRGA.
    - Your Response: {{"is_strong_intention": true, "feedback": "Your intention to send 5 LinkedIn outreaches is clear, specific, and directly aligned with your HRGA! With your planned focus blocks, you're well-equipped to succeed.", "clarity_stat_gain": 1}}

    Example of an intention needing refinement:
    - Intention: "Work on my business."
    - Analysis: This is vague. It's not specific or measurable.
    - Your Response: {{"is_strong_intention": false, "feedback": "This intention is a good start, but it's a bit vague. How can you make it more specific? For example, 'Complete Module 1 of the marketing course' would give you a clear target.", "clarity_stat_gain": 0}}
    
    Now, analyze the user's data and provide your JSON response.
    """
    
    analysis = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=IntentionAnalysisResponse
    )

    if "error" in analysis:
        return {"needs_refinement": False, "ai_feedback": "Great! Let's get to work.", "clarity_stat_gain": 1}

    return {
        "needs_refinement": not analysis.get("is_strong_intention"),
        "ai_feedback": analysis.get("feedback"),
        "clarity_stat_gain": analysis.get("clarity_stat_gain"),
    }

def complete_focus_block(
        db: Session, 
        user: models.User, 
        block: models.FocusBlock # Future-proofing: kept for future, more complex XP rules
) -> dict[str, Any]:
    """Awards XP for a completed Focus Block. Returns data for the endpoint to commit."""
    # In the future, the logic here could inspect the 'block' object's properties
    # (e.g., duration, intention text) to award variable XP.
    xp_to_award = 10 # Business rule: 10 XP per block
    return {"xp_awarded": xp_to_award}

def create_daily_reflection(db: Session, user: models.User, daily_intention: models.DailyIntention) -> dict[str, Any]:
    """
    Generates the end-of-day reflection, celebrating success or creating a recovery quest for failure.
    This combines generate_success_feedback and generate_recovery_quest from main.py.
    """
    succeeded = daily_intention.status == "completed"
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock reflection. ---")
        if succeeded:
            return {"succeeded": True, "ai_feedback": "Mock Success: Great job!", "recovery_quest": None, "discipline_stat_gain": 1}
        else:
            return {"succeeded": False, "ai_feedback": "Mock Fail: Let's reflect.", "recovery_quest": "What was the main obstacle?", "discipline_stat_gain": 0}

    llm_provider = get_llm_provider()
    
    system_prompt = f"""
    You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user is ending their day. Your job is to provide a final reflection.
    
    If the user SUCCEEDED, your feedback should be a concise, genuine, and energizing celebration (1-2 sentences).
    If the user FAILED, you must generate a Recovery Quest - a single, thoughtful question that turns failure into learning, based on their completion rate. Also provide introductory feedback.
    
    You must respond in a JSON object matching this Pydantic model:
    class DailyReflectionResponse(BaseModel):
        ai_feedback: str = Field(description="If successful, a celebratory message. If failed, an acknowledgement of the completion rate.")
        recovery_quest: str | None = Field(description="A specific, actionable recovery quest (a single question) if the day was a failure. Null if successful.")
        discipline_stat_gain: int = Field(description="1 for success, 0 for failure.")
    """

    completion_rate = (daily_intention.completed_quantity / daily_intention.target_quantity) * 100 if daily_intention.target_quantity > 0 else 0
    outcome_text = "SUCCEEDED" if succeeded else "FAILED"

    user_prompt = f"""
    User Data:
    - User's Name: {user.name}
    - User's HRGA: "{user.hrga}"
    - Daily Intention: "{daily_intention.daily_intention_text}"
    - Target: {daily_intention.target_quantity}
    - Achieved: {daily_intention.completed_quantity}
    - Outcome: {outcome_text}

    Task: Generate the JSON response.

    If the outcome was SUCCEEDED:
    - Acknowledge the specific achievement and connect it to their goals.
    - Example: {{"ai_feedback": "Outstanding execution! Completing all {daily_intention.target_quantity} units directly fuels your HRGA. This is how momentum builds!", "recovery_quest": null, "discipline_stat_gain": 1}}

    If the outcome was FAILED:
    - Set 'ai_feedback' to: "You achieved {completion_rate:.0f}% of your intention. Let's turn this into learning..."
    - Create a 'recovery_quest' based on the completion level:
        - 0% completion: Focus on barriers to starting. (e.g., "When you felt resistance to starting, what was the inner voice telling you?")
        - 1-50% completion: Focus on momentum/distraction issues. (e.g., "What specific distraction pulled you away when you were in the middle of making progress?")
        - 51-99% completion: Focus on finishing/persistence. (e.g., "You were so close! What was happening in your environment or mindset that prevented that final step?")
    - Example: {{"ai_feedback": "You achieved 40% of your intention. Let's turn this into learning...", "recovery_quest": "What specific distraction pulled you away when you were in the middle of making progress?", "discipline_stat_gain": 0}}
    """
    
    reflection = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=DailyReflectionResponse
    )
    
    if "error" in reflection:
        return {"succeeded": succeeded, "ai_feedback": "Great work reflecting today.", "recovery_quest": None, "discipline_stat_gain": 1 if succeeded else 0}
    
    reflection["succeeded"] = succeeded
    return reflection

def process_recovery_quest_response(db: Session, user: models.User, result: models.DailyResult, response_text: str) -> dict[str, Any]:
    """
    Provides personalized coaching based on a user's reflection on failure.
    This replaces generate_coaching_response from main.py.
    """
    if os.getenv("DISABLE_AI_CALLS") == "True":
        print("--- AI CALL DISABLED: Returning mock coaching. ---")
        return {"ai_coaching_feedback": "Mock Coaching: That's a great insight.", "resilience_stat_gain": 1}

    llm_provider = get_llm_provider()
    
    system_prompt = f"""
    You are the AI Accountability and Clarity Coach for The Game of Becoming™. A user has reflected on their failed intention. Your role is to provide encouraging, wisdom-building coaching.
    
    Your coaching should be empathetic, validate their reflection, identify the insight, and connect it to future success. Keep it concise (2-3 sentences max).
    
    Respond in a JSON object matching this Pydantic model:
    class RecoveryQuestCoachingResponse(BaseModel):
        ai_coaching_feedback: str = Field(description="Encouraging, wisdom-building coaching based on the user's reflection (2-3 sentences max).")
        resilience_stat_gain: int = Field(description="Set this to 1, as the user gains resilience for reflecting.")
    """

    user_prompt = f"""
    Context:
    - User's Name: {user.name}
    - Original Failed Intention: "{result.daily_intention.daily_intention_text}"
    - The Recovery Quest they were asked: "{result.recovery_quest}"
    - The user's reflection/response: "{response_text}"

    Task: Provide your JSON coaching response.

    Example:
    - User's Reflection: "I got distracted by checking social media."
    - Your Response: {{"ai_coaching_feedback": "That's a powerful insight. Recognizing that social media is a trigger is the first step to managing it. Tomorrow, you can build a plan to proactively avoid it during your focus blocks!", "resilience_stat_gain": 1}}
    """
    
    coaching = llm_provider.generate_structured_response(
        system_prompt=system_prompt, user_prompt=user_prompt, response_model=RecoveryQuestCoachingResponse
    )
    
    if "error" in coaching:
        return {"ai_coaching_feedback": "Thank you for sharing. This is how we grow.", "resilience_stat_gain": 1}
        
    return coaching