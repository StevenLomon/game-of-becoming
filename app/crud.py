from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Import modules
from . import models, schemas, utils 

def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
    """Creates a new user and all associated records in a single transaction"""
    new_user = models.User(
        name=user_data.name.strip(),
        email=user_data.email.strip()
    )
    db.add(new_user)
    db.flush() 

    user_auth = models.UserAuth(
        user_id=new_user.id,
        password_hash=utils.get_password_hash(user_data.password.strip())
    )
    db.add(user_auth)

    new_stats = models.CharacterStats(user_id=new_user.id)
    db.add(new_stats)
    
    return new_user

def get_user(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()

def create_daily_intention(db: Session, intention: schemas.DailyIntentionCreate, user_id: int):
    """
    Creates a new Daily Intention in the database and links it to a user.
    """
    # Create the SQLAlchemy model instance from the Pydantic schema data
    db_intention = models.DailyIntention(
        daily_intention_text=intention.daily_intention_text,
        target_quantity=intention.target_quantity,
        focus_block_count=intention.focus_block_count,
        user_id=user_id
    )
    
    db.add(db_intention)
    db.commit()
    db.refresh(db_intention)
    return db_intention

def get_user_active_intention(db: Session, user_id: int) -> models.DailyIntention | None:
    """Gets the active Daily Intention for a user for the current day."""
    today = datetime.now(timezone.utc).date()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    end_of_day = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)

    return db.query(models.DailyIntention).filter(
        models.DailyIntention.user_id == user_id,
        models.DailyIntention.created_at >= start_of_day,
        models.DailyIntention.created_at <= end_of_day,
        models.DailyIntention.status == 'active'
    ).first()

def get_or_create_user_stats(db: Session, user_id: int) -> models.CharacterStats:
    stats = db.query(models.CharacterStats).filter(models.CharacterStats.user_id == user_id).first()
    if not stats:
        stats = models.CharacterStats(user_id=user_id)
        db.add(stats)
    return stats

def get_character_stats(db: Session, user_id: int) -> models.CharacterStats | None:
    return db.query(models.CharacterStats).filter(models.CharacterStats.user_id == user_id).first()

def update_character_stats(
    db: Session, user_id: int, xp: int = 0, clarity: int = 0, discipline: int = 0, resilience: int = 0
) -> models.CharacterStats:
    stats = get_or_create_user_stats(db, user_id=user_id)
    stats.xp += xp
    stats.clarity += clarity
    stats.discipline += discipline
    stats.resilience += resilience
    db.add(stats)
    return stats

def update_intention_progress(db: Session, intention: models.DailyIntention, progress: int) -> models.DailyIntention:
    intention.current_quantity = progress
    db.commit()
    db.refresh(intention)
    return intention

def update_intention_status(db: Session, intention: models.DailyIntention, status: str) -> models.DailyIntention:
    intention.status = status
    return intention