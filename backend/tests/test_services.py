from datetime import date, datetime
from freezegun import freeze_time
from app import services
from app import models

# By freezing time at a specific date, we make our tests deterministic.
# They will always run as if "toaday" is '2025-08-26
@freeze_time("2025-08-26")
def test_update_user_streak_first_time():
    """Verify that the first successful actions sets the streak to 1"""
    user = models.User()
    assert user.current_streak == 0

    services.update_user_streak(user)

    assert user.current_streak == 1
    assert user.longest_streak == 1
    # We can now assert the exact date, not just `date.today()`
    assert user.last_streak_update.date() == date(2025, 8, 26)

@freeze_time("2025-08-26")
def test_update_user_streak_continuation():
    """Verify that a successful action on a consecutive day continues the streak."""
    user = models.User(
        current_streak=3,
        longest_streak=3,
        # The last update was "yesterday"
        last_streak_update=datetime(2025, 8, 25)
    )
    
    services.update_user_streak(user)
    
    assert user.current_streak == 4
    assert user.longest_streak == 4

@freeze_time("2025-08-26")
def test_update_user_streak_grace_day_used():
    """Verify a streak is broken after one missed day."""
    user = models.User(
        current_streak=5,
        longest_streak=5,
        # The last update was two days ago, so "yesterday" was missed.
        last_streak_update=datetime(2025, 8, 24)
    )

    services.update_user_streak(user)

    assert user.current_streak == 1 # Streak resets
    assert user.longest_streak == 5 # Longest is preserved

@freeze_time("2025-08-26")
def test_update_user_streak_already_updated_today():
    """Verify multiple actions on the same day do not increase the streak."""
    user = models.User(
        current_streak=2,
        longest_streak=2,
        last_streak_update=datetime(2025, 8, 26) # Already updated today
    )

    updated = services.update_user_streak(user)

    assert updated is False
    assert user.current_streak == 2