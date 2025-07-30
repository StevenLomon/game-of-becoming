from pydantic import BaseModel, validator, Field
from typing import Optional
from datetime import datetime

# =============================================================================
# DAILY INTENTIONS SCHEMAS
# =============================================================================

class DailyIntentionCreate(BaseModel):
    """Schema for creating a new Daily Intention"""
    daily_intention_text: str = Field(...) # Mandatory field
    focus_block_count: int = Field(...)  

    @validator('daily_intention_text')
    def validate_daily_intention_text(cls, v):
        # Strip whitespace and ensure not empty
        v = v.strip()
        if not v:
            raise ValueError("Daily intention cannot be empty or just whitespace")
        if len(v) > 2000:
            raise ValueError("Daily intention cannot exceed 2000 characters")
        return v

    @validator('focus_block_count')
    def validate_focus_block_count(cls, v):
        if v < 1:
            raise ValueError('Focus block count must be at least 1')
        if v > 30:
            raise ValueError('Focus block count cannot exceed 30 - that\'s unrealistic for one day!') # Assuming a reasonable range for amount of focus blocks in a day
        return v