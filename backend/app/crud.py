from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload

from . import models
from . import schemas
from . import utils

def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
    """
    Creates a new user and all associated records in a single transaction.
    NOTE: Does not include HLA, as that is set during onboarding in the MVP.
    """
    new_user = models.User(
        name=user_data.name.strip(),
        email=user_data.email.strip()
        # We intentionally omit 'hla' here, as it's nullable in the MVP schema
    )
    db.add(new_user)
    db.flush() # Assigns ID without committing

    # Create the UserAuth record
    user_auth = models.UserAuth(
        user_id=new_user.id,
        password_hash=utils.get_password_hash(user_data.password.strip())
    )
    db.add(user_auth)

    # Create the CharacterStats record
    new_stats = models.CharacterStats(user_id=new_user.id)
    db.add(new_stats)
    
    # We don't commit here! The endpoint will handle the commit/rollback
    return new_user

def get_user(db: Session, user_id: int) -> models.User | None:
    """
    Get a user by their unique ID, and eagerly load their auth and stats
    for efficient access in endpoint dependencies.
    """
    return db.query(models.User).options(
        joinedload(models.User.auth),
        joinedload(models.User.character_stats)
    ).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> models.User | None:
    """Get a user by email. Returns None if not found."""
    return db.query(models.User).filter(models.User.email == email).first()

def get_or_create_user_stats(db: Session, user_id: int) -> models.CharacterStats:
    """
    Fetches a user's stats, creating a new record if one doesn't exist.
    This guarantees that endpoints can safely attempt to modify stats.
    """
    stats = db.query(models.CharacterStats).filter(models.CharacterStats.user_id == user_id).first()
    if not stats:
        stats = models.CharacterStats(user_id=user_id)
        db.add(stats)
        # We don't commit here; we let the calling function handle the commit!
    return stats

def get_today_intention(db: Session, user_id: int) -> models.DailyIntention | None:
    """
    Get today's Daily Intention for a user, and eagerly load its
    associated Focus Blocks AND potential Daily Result to prevent lazy-load errors.
    """
    today = datetime.now(timezone.utc).date()
    return db.query(models.DailyIntention).options(
        joinedload(models.DailyIntention.focus_blocks),
        joinedload(models.DailyIntention.daily_result)
        ).filter(
        models.DailyIntention.user_id == user_id,
        models.DailyIntention.created_at >= datetime.combine(today, datetime.min.time()),
        models.DailyIntention.created_at < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).first()

def get_yesterday_incomplete_intention(db: Session, user_id: int) -> models.DailyIntention | None:
    """
    Finds an incomplete intention from yesterday for the "Grace Day" mechanic.
    An intention is incomplete if its status is 'pending' or 'in_progress'.
    """
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    start_of_yesterday = datetime.combine(yesterday, datetime.min.time())
    end_of_yesterday = datetime.combine(today, datetime.min.time())

    return db.query(models.DailyIntention).options(
        joinedload(models.DailyIntention.focus_blocks),
        joinedload(models.DailyIntention.daily_result) # Eager load!
    ).filter(
        models.DailyIntention.user_id == user_id,
        models.DailyIntention.created_at >= start_of_yesterday,
        models.DailyIntention.created_at < end_of_yesterday,
        models.DailyIntention.status.in_(['pending', 'in_progress'])
    )