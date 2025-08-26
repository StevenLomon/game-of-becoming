# No need to import TestClient here, the `client` fixture provides it.
from freezegun import freeze_time

def test_register_user_success(client):
    """
    Test successful user registration.
    The `client` argument is automatically provided by pytest from conftest.py
    Doesn't include HRGA anymore!
    """
    response = client.post(
        "/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            # HRGA is no longer part of the initial registration
            "password": "a_strong_password"
        }
    )
    
    # Assert that the request was successful
    assert response.status_code == 201

    # Assert the response body is correct
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
    assert data["hrga"] is None # Verify that HRGA is null initially
    
    # IMPORTANT: Assert that the password is NOT returned
    assert "password_hash" not in data


def test_register_user_duplicate_email(client):
    """
    Test that registering with a duplicate email fails.
    """
    user_data = {
        "name": "Test User",
        "email": "test@example.com",
        "hrga": "My test HRGA",
        "password": "a_strong_password"
    }

    # First registration should succeed
    response1 = client.post("/register", json=user_data)
    assert response1.status_code == 201

    # Second registration with the same email should fail
    response2 = client.post("/register", json=user_data)
    assert response2.status_code == 400
    assert response2.json() == {"detail": "Email already registered. Ready to log in instead?"}

@freeze_time("2025-08-26")
def test_onboarding_sets_hrga_and_starts_streak(client, user_token):
    """
    Verify that the onboarding endpoint (`PUT /users/me`) sets the HRGA
    and correctly initializes the user's streak to 1.
    """
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Check initial stage (hrga is null, streak is 0)
    initial_user_resp = client.get("/users/me", headers=headers)
    assert initial_user_resp.status_code == 200
    initial_user_data = initial_user_resp.json()
    assert initial_user_data["hrga"] is None
    assert initial_user_data["current_streak"] == 0

    # 2. Complete the Onboarding
    onboarding_payload = {"hrga": "My new awesome HRGA!"}
    update_resp = client.put("/users/me", headers=headers, json=onboarding_payload)
    assert update_resp.status_code == 200

    # 3. Verify the final state
    final_user_resp = client.get("/users/me", headers=headers)
    assert final_user_resp.status_code == 200
    final_user_data = final_user_resp.json()
    assert final_user_data["hrga"] == "My new awesome HRGA!"
    assert final_user_data["current_streak"] == 1 # Streak should be "ignited" to 1