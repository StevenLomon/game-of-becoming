# tests/test_main.py

from fastapi.testclient import TestClient

# The 'client' fixture is automatically injected by pytest from conftest.py
def test_read_root(client: TestClient):
    """
    Test that the root endpoint '/' serves the index.html file.
    """
    response = client.get("/")
    assert response.status_code == 200
    # Check that the response is an HTML file
    assert "text/html" in response.headers['content-type']
    # Check for a key element from our HTML file
    assert "<h1>Welcome to The Game of Becoming API</h1>" in response.text
