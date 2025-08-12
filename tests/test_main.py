from fastapi.testclient import TestClient
# No need to import the app here since the 'client' fixture provides it

def test_read_root(client: TestClient):
    """
    Test that the root endpoint '/' serves the main dashboard HTML page.
    """
    response = client.get("/")
    assert response.status_code == 200
    # Check that the response is HTML
    assert "text/html" in response.headers['content-type']
    
    # Check for a key element from our new dashboard.html file
    assert "<h1>Welcome, Player!</h1>" in response.text
    assert "Set Your Daily Intention" in response.text
