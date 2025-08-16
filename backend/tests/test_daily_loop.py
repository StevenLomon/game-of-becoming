#Full, self-contained showcase of the daily loop endpoints.

# --- Reusable Mock Service Functions ---
# These functions mimic the behavior of our real service layer for predictable testing.

def mock_intention_approved(db, user, intention_data):
    """A mock for services.create_and_process_intention that always approves."""
    return {
        "needs_refinement": False,
        "ai_feedback": "Mock feedback: This is a clear and actionable intention!",
        "clarity_stat_gain": 1
    }

def mock_reflection_failed(db, user, daily_intention):
    """A mock for services.create_daily_reflection for a failed intention."""
    return {
        "succeeded": False,
        "ai_feedback": "Mock Fail: Let's reflect on what happened.",
        "recovery_quest": "What was the main obstacle you faced today?",
        "discipline_stat_gain": 0
    }

def mock_recovery_quest_coaching(db, user, result, response_text):
    """A mock for services.process_recovery_quest_response."""
    return {
        "ai_coaching_feedback": "Mock Coaching: That's a valuable insight. You've earned resilience!",
        "resilience_stat_gain": 1
    }

# --- Existing Tests (Now with Mocking) ---

def test_creat_daily_intention_unauthenticated_fails(client):
    """Verify that an unatuhenticated user receives a 401 error when trying to create a Daily Intention"""
    payload = {
        "daily_intention_text": "Try to sneak in",
        "target_quantity": 1,
        "focus_block_count": 1,
        "is_refined": True
    }
    # No headers are sent with this request
    response = client.post("/intentions", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_create_daily_intention_flow(client, user_token, monkeypatch):
    """Authenticated user creates a Daily Intention."""
    # Replace the real service function with our mock for this test
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)

    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "daily_intention_text": "Send 5 cold emails",
        "target_quantity": 5,
        "focus_block_count": 3,
        "is_refined": True,
    }

    resp = client.post("/intentions", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text


def test_daily_results_cannot_get_duplicated(client, user_token, monkeypatch):
    """Endpoint refuses double DailyResult for today."""
    # We need to mock both service calls that will happen in this test
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_failed)


    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Create todays Daily Intention (prerequisite)
    client.post(
        "/intentions",
        headers=headers,
        json={
            "daily_intention_text": "Write API tests",
            "target_quantity": 1,
            "focus_block_count": 1,
            "is_refined": True,
        },
    )

    # 2. First evening reflection should succeed
    r1 = client.post("/daily-results", headers=headers)
    assert r1.status_code == 201

    # 3. Duplicate call must return 400
    r2 = client.post("/daily-results", headers=headers)
    assert r2.status_code == 400, r2.text
    assert "already exists" in r2.json()["detail"]


def test_completed_focus_block_awards_xp(client, user_token, monkeypatch):
    """Completing a Focus Block awards +10 XP. (service mock value)"""
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)


    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Daily Intention for today
    i_resp = client.post(
        "/intentions",
        headers=headers,
        json={
            "daily_intention_text": "Finish API tests",
            "target_quantity": 1,
            "focus_block_count": 1,
            "is_refined": True,
        },
    )
    assert i_resp.status_code == 201

    # 2. Create & complete one Focus Block
    f_resp = client.post(
        "/focus-blocks",
        headers=headers,
        json={"focus_block_intention": "Finish endpoint tests", "duration_minutes": 30},
    )
    assert f_resp.status_code == 201
    block_id = f_resp.json()["id"]

    # 3. Check user xp before, complete the Focus Block and compare
    start = client.get("/users/me/stats", headers=headers).json()
    start_xp = start["xp"]

    client.patch(
        f"/focus-blocks/{block_id}",
        headers=headers,
        json={"status": "completed"},
    )

    end = client.get("/users/me/stats", headers=headers).json()
    assert end["xp"] == start_xp + 10

def test_level_up_mechanic_on_sufficient_xp(client, user_token, monkeypatch):
    """
    Verifies that the user's level increases from 1 to 2 after gaining 100 XP.
    """
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)

    
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Create a Daily Intention to attach the focus blocks to
    intention_payload = {
        "daily_intention_text": "Grind XP to level up",
        "target_quantity": 10,
        "focus_block_count": 10,
        "is_refined": True,
    }
    intention_resp = client.post("/intentions", headers=headers, json=intention_payload)
    assert intention_resp.status_code == 201

    # 2. Check the user's starting state
    start_stats = client.get("/users/me/stats", headers=headers).json()
    assert start_stats["level"] == 1
    assert start_stats["xp"] == 0

    # 3. Complete 10 Focus Blocks to gain 100 XP
    for i in range(10):
        # Create the block
        fb_create_resp = client.post(
            "/focus-blocks",
            headers=headers,
            json={"focus_block_intention": f"Block #{i+1}", "duration_minutes": 10},
        )
        assert fb_create_resp.status_code == 201
        block_id = fb_create_resp.json()["id"]

        # Complete the block
        fb_patch_resp = client.patch(
            f"/focus-blocks/{block_id}",
            headers=headers,
            json={"status": "completed"},
        )
        assert fb_patch_resp.status_code == 200

    # 4. Check the user's final state
    end_stats = client.get("/users/me/stats", headers=headers).json()
    assert end_stats["xp"] == 100
    assert end_stats["level"] == 2

def test_full_fail_forward_recovery_quest_loop(client, user_token, monkeypatch):
    """
    Tests the entire "Fail Forward" loop:
    1. Create an intention and fail to complete it.
    2. Create a daily result, which should trigger a recovery quest.
    3. Respond to the recovery quest.
    4. Verify that the user's 'resilience' stat has increased.
    """
    # This test requires mocking all three AI-driven service functions
    monkeypatch.setattr("app.services.create_and_process_intention", mock_intention_approved)
    monkeypatch.setattr("app.services.create_daily_reflection", mock_reflection_failed)
    monkeypatch.setattr("app.services.process_recovery_quest_response", mock_recovery_quest_coaching)


    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Create a Daily Intention
    intention_payload = {
        "daily_intention_text": "Send 5 Upwork proposals",
        "target_quantity": 5,
        "focus_block_count": 3,
        "is_refined": True
    }
    intention_resp = client.post("/intentions", headers=headers, json=intention_payload)
    assert intention_resp.status_code == 201

    # 2. Partially complete the intention (i.e. fail)
    progress_payload = {"completed_quantity": 3}
    progress_resp = client.patch("intentions/today/progress", headers=headers, json=progress_payload)
    assert progress_resp.status_code == 200
    assert progress_resp.json()["status"] == "in_progress"

    # 3. Trigger the evening reflection (Daily Result creation)
    # This is the step that should generate the Recovery Quest
    result_resp = client.post("/daily-results", headers=headers)
    assert result_resp.status_code == 201
    result_data = result_resp.json()
    assert result_data["succeeded_failed"] is False
    assert result_data["recovery_quest"] is not None # Verify a Recovery Quest was generated
    result_id = result_data["id"]

    # 4. Check the user's starting stats
    start_stats_resp = client.get("/users/me/stats", headers=headers)
    assert start_stats_resp.status_code == 200
    start_resilience = start_stats_resp.json()["resilience"]

    # 5. Respond to the Recovery Quest
    quest_response_payload = {
        "recovery_quest_response": "I got distracted by social media in the afternoon and lost my momentum."
    }
    quest_resp = client.post(
        f"/daily-results/{result_id}/recovery-quest",
        headers=headers,
        json=quest_response_payload
    )
    assert quest_resp.status_code == 200
    assert "ai_coaching_feedback" in quest_resp.json()

    # 6. Verify that the Resilience stat has increased
    end_stats_resp = client.get("/users/me/stats", headers=headers)
    assert end_stats_resp.status_code == 200
    end_resilience = end_stats_resp.json()["resilience"]
    assert end_resilience == start_resilience + 1