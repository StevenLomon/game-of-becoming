from pydantic import BaseModel, validator, Field
from typing import Optional
from datetime import datetime

# =============================================================================
# DAILY INTENTIONS SCHEMAS
# =============================================================================

class DailyIntentionCreate(BaseModel):
    """Schema for creating a new Daily Intention"""
    daily_intention_text: str = Field(..., min_length=1, max_length=2000)
    focus_block_count: int = Field(..., gt=0, le=30)  # Assuming a reasonable range for amount of focus blocks in a day

    @validator('daily_intention_text')
    def validate_daily_intention_text(cls, v):
        # Strip whitespace and ensure not empty
        v = v.strip()
        if not v:
            raise ValueError("Daily intention cannot be empty or just whitespace")
        return v

    @validator('focus_block_count')
    def validate_focus_block_count(cls, v):
        if v < 1:
            raise ValueError('Focus block count must be at least 1')
        if v > 30:
            raise ValueError('Focus block count cannot exceed 30')
        return v