# tests/test_user_flows.py

from fastapi.testclient import TestClient

def test_register_user_success(client: TestClient):
    """
    Test successful user registration.
    HRGA should be None upon initial creation.
    """
    response = client.post(
        "/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            # hrga is no longer sent during registration
            "password": "a_strong_password"
        }
    )

    # Assert that the request was successful
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
    # Assert that HRGA is correctly None after registration
    assert data["hrga"] is None

def test_register_user_duplicate_email(client: TestClient):
    """
    Test that registering with a duplicate email fails.
    """
    user_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "a_strong_password"
    }

    # First registration should succeed
    response1 = client.post("/register", json=user_data)
    assert response1.status_code == 201

    # Second registration with the same email should fail
    response2 = client.post("/register", json=user_data)
    assert response2.status_code == 400
    assert response2.json() == {"detail": "Email already registered."}
