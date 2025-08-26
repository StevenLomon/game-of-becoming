# FILE: tests/test_daily_loop.py
# DIAGNOSTIC VERSION

from freezegun import freeze_time
import json

# --- Reusable Mock Service Functions ---

def mock_intention_approved(db, user, intention_data):
    """
    DIAGNOSTIC MOCK: If you see this message in the logs, the new test file is running.
    """
    # This print statement is the most important part of the diagnosis.
    print("--- DIAGNOSTIC: The v4 MOCK FUNCTION IS RUNNING ---")
    
    return {
        "id": 1,
        "daily_intention_text": intention_data.daily_intention_text,
        "target_quantity": intention_data.target_quantity,
        "needs_refinement": False,
        "ai_feedback": "Mock: Approved!",
        "clarity_stat_gain": 1
    }

def mock_reflection_success(db, user, daily_intention):
    return {"succeeded": True, "ai_feedback": "Mock Success!", "recovery_quest": None, "discipline_stat_gain": 1, "xp_awarded": 20}

def mock_reflection_failed(db, user, daily_intention):
    return {"succeeded": False, "ai_feedback": "Mock Fail.", "recovery_quest": "What happened?", "discipline_stat_gain": 0, "xp_awarded": 0}

def mock_recovery_quest_coaching(db, user, result, response_text):
    return {"ai_coaching_feedback": "Mock Coaching.", "resilience_stat_gain": 1, "xp_awarded": 15}

# --- Tests ---

def test_create_and_get_daily_intention(client, user_token, monkeypatch):
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"daily_intention_text": "Write tests", "target_quantity": 5, "focus_block_count": 3, "is_refined": True}
    create_resp = client.post("/intentions", headers=headers, json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["daily_intention_text"] == "Write tests"
    get_resp = client.get("/intentions/today/me", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == create_resp.json()["id"]

def test_complete_intention_updates_stats_and_streak(client, long_lived_user_token, monkeypatch): # Now uses long_lived_user_token instead of the regular user_token
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_success)
    headers = {"Authorization": f"Bearer {long_lived_user_token}"}

    # --- Day 1 ---
    with freeze_time("2025-08-26"):
        client.put("/users/me", headers=headers, json={"hrga": "Test HRGA"})
        client.post("/intentions", headers=headers, json={"daily_intention_text": "First day", "target_quantity": 1, "focus_block_count": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)
        
        day1_user_resp = client.get("/users/me", headers=headers)
        day1_user = day1_user_resp.json()
        
        # DIAGNOSTIC PRINT for the /users/me response
        print(f"--- DIAGNOSTIC: DAY 1 /users/me status code: {day1_user_resp.status_code} ---")
        print(f"--- DIAGNOSTIC: DAY 1 /users/me JSON response: {json.dumps(day1_user)} ---")
        
        assert day1_user["current_streak"] == 1

    # --- Day 2 ---
    with freeze_time("2025-08-27"):
        client.post("/intentions", headers=headers, json={"daily_intention_text": "Second day", "target_quantity": 1, "focus_block_count": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)
        
        day2_user_resp = client.get("/users/me", headers=headers)
        day2_user = day2_user_resp.json()

        # DIAGNOSTIC PRINT for the /users/me response
        print(f"--- DIAGNOSTIC: DAY 2 /users/me status code: {day2_user_resp.status_code} ---")
        print(f"--- DIAGNOSTIC: DAY 2 /users/me JSON response: {json.dumps(day2_user)} ---")

        day2_stats = client.get("/users/me/stats", headers=headers).json()
        assert day2_user["current_streak"] == 2
        assert day2_stats["discipline"] > 0
        assert day2_stats["xp"] > 0

# Note: The third test is omitted for brevity but uses the same mock and is covered by the first print statement.
# The original code for it is correct.