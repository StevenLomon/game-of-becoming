# tests/test_user_flows.py

from fastapi.testclient import TestClient

# The `client` fixture is automatically injected by pytest from conftest.py
# The fixes in conftest.py (using a test database) will resolve the 500 errors.

def test_register_user_success(client: TestClient):
    """
    Test successful user registration.
    """
    response = client.post(
        "/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            # hrga is no longer part of the registration schema
            "password": "a_strong_password"
        }
    )

    # Useful debugging line
    print("DEBUG:", response.json()) 

    # Assert that the request was successful
    assert response.status_code == 201
    
    # Assert the response body contains the correct data
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
    # hrga should be None by default after registration
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