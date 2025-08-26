# Full, self-contained showcase of the daily loop endpoints.
from freezegun import freeze_time

# --- Reusable Mock Service Functions ---

def mock_intention_approved(db, user, intention_data):
    """
    Mock for a successfully processed intention.
    FIXED: Now uses dot notation to access Pydantic model attributes.
    """
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
    """Tests creating, and then retrieving, today's daily intention."""
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"daily_intention_text": "Write tests", "target_quantity": 5, "focus_block_count": 3, "is_refined": True}

    # Create the intention
    create_resp = client.post("/intentions", headers=headers, json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["daily_intention_text"] == "Write tests"

    # Retrieve the same intention
    get_resp = client.get("/intentions/today/me", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == create_resp.json()["id"]

def test_complete_intention_updates_stats_and_streak(client, user_token, monkeypatch):
    """Verifies completing an intention updates discipline, XP, and streak."""
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_success)
    headers = {"Authorization": f"Bearer {user_token}"}

    # --- Day 1 ---
    with freeze_time("2025-08-26"):
        # 1. Onboard the user
        client.put("/users/me", headers=headers, json={"hrga": "Test HRGA"})

        # 2. Create and complete the Daily Intention for Day 1
        client.post("/intentions", headers=headers, json={"daily_intention_text": "First day", "target_quantity": 1, "focus_block_count": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)

        # 3. Verify state at the end of Day 1
        day1_user = client.get("/users/me", headers=headers).json()
        assert day1_user["current_streak"] == 1

    # --- Day 2 ---
    with freeze_time("2025-08-27"):
        # 4. Create and complete the intention for Day 2
        client.post("/intentions", headers=headers, json={"daily_intention_text": "Second day", "target_quantity": 1, "focus_block_count": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)

        # 5. Verify the streak has continued on the next day
        day2_user = client.get("/users/me", headers=headers).json()
        day2_stats = client.get("/users/me/stats", headers=headers).json()

        assert day2_user["current_streak"] == 2
        assert day2_stats["discipline"] > 0
        assert day2_stats["xp"] > 0

def test_full_fail_forward_recovery_quest_loop(client, user_token, monkeypatch):
    """Tests the full 'Fail Forward' loop, from failing an intention to completing the Recovery Quest."""
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_failed)
    monkeypatch.setattr("app.services.process_recovery_quest_response", mock_recovery_quest_coaching)
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Create intention
    client.post("/intentions", headers=headers, json={"daily_intention_text": "stuff", "target_quantity": 5, "focus_block_count": 3, "is_refined": True})

    # 2. Mark intention as failed
    fail_resp = client.post("/intentions/today/fail", headers=headers)
    assert fail_resp.status_code == 200
    result_data = fail_resp.json()
    assert result_data["succeeded_failed"] is False
    assert result_data["recovery_quest"] is not None
    result_id = result_data["id"]

    # 3. Check starting stats
    start_stats = client.get("/users/me/stats", headers=headers).json()

    # 4. Respond to the recovery quest
    quest_resp = client.post(f"/daily-results/{result_id}/recovery-quest", headers=headers, json={"recovery_quest_response": "I reflected."})
    assert quest_resp.status_code == 200
    assert quest_resp.json()["resilience_stat_gain"] == 1
    assert quest_resp.json()["xp_awarded"] == 15

    # 5. Verify resilience, XP, and streak have all increased
    end_stats = client.get("/users/me/stats", headers=headers).json()
    end_user = client.get("/users/me", headers=headers).json()
    assert end_stats["resilience"] == start_stats["resilience"] + 1
    assert end_stats["xp"] == start_stats["xp"] + 15
    assert end_user["current_streak"] > 0