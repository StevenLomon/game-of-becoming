# FILE: tests/test_daily_loop.py
# FINAL POLISHED VERSION (No diagnostics)

from freezegun import freeze_time

# --- Mocks (Unchanged) ---
def mock_intention_approved(db, user, intention_data):
    return {"id": 1, "daily_intention_text": intention_data.daily_intention_text, "target_quantity": intention_data.target_quantity}
def mock_reflection_success(db, user, daily_intention):
    return {"succeeded": True, "ai_feedback": "Mock Success!", "recovery_quest": None, "discipline_stat_gain": 1, "xp_awarded": 20}
def mock_reflection_failed(db, user, daily_intention):
    return {"succeeded": False, "ai_feedback": "Mock Fail.", "recovery_quest": "What happened?", "discipline_stat_gain": 0, "xp_awarded": 0}

# --- Tests ---

def test_create_and_get_daily_intention(client, user_token, monkeypatch):
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"daily_intention_text": "Write tests", "target_quantity": 5, "is_refined": True}

    # Create the intention
    create_resp = client.post("/intentions", headers=headers, json=payload)
    assert create_resp.status_code == 201
    # FIX: A more robust assertion checks for the ID.
    assert "id" in create_resp.json()

    # Retrieve the intention to verify its contents.
    get_resp = client.get("/intentions/today/me", headers=headers)
    assert get_resp.status_code == 200
    # Now we can safely assert the content from the GET request.
    assert get_resp.json()["daily_intention_text"] == "Write tests"


def test_complete_intention_updates_stats_and_streak(client, long_lived_user_token, monkeypatch):
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_success)
    headers = {"Authorization": f"Bearer {long_lived_user_token}"}

    # Day 1
    with freeze_time("2025-08-26"):
        client.put("/users/me", headers=headers, json={"hrga": "Test HRGA"})
        client.post("/intentions", headers=headers, json={"daily_intention_text": "First day", "target_quantity": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)
        day1_user = client.get("/users/me", headers=headers).json()
        assert day1_user["current_streak"] == 1

    # Day 2
    with freeze_time("2025-08-27"):
        client.post("/intentions", headers=headers, json={"daily_intention_text": "Second day", "target_quantity": 1, "is_refined": True})
        client.patch("/intentions/today/progress", headers=headers, json={"completed_quantity": 1})
        client.post("/intentions/today/complete", headers=headers)
        day2_user = client.get("/users/me", headers=headers).json()
        assert day2_user["current_streak"] == 2