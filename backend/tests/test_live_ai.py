import pytest
import os

# This marker tells pytest: "Skip this entire file if the ANTHROPIC_API_KEY is not set."
# This prevents the test from running in CI/CD environments where the key isn't available.
pytestmark = pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY not set, skipping live AI tests"
)

# We also skip if the AI calls are explicitly disabled.
if os.getenv("DISABLE_AI_CALLS") == "True":
    pytestmark = pytest.mark.skipif(
        True, reason="DISABLE_AI_CALLS is set to True, skipping live AI tests"
    )

def test_live_create_intention_analysis(client, user_token):
    """
    This is a LIVE test that makes a real call to the Anthropic API.
    It does NOT use monkeypatching. Its purpose is to verify that our
    prompts and connection to the AI are working correctly.
    """
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # We provide a deliberately vague intention to test if the AI asks for refinement.
    payload = {
        "daily_intention_text": "work on my business",
        "target_quantity": 5,
        "focus_block_count": 3,
        "is_refined": False, # It's the first submission
    }

    # Make the real API call
    response = client.post("/intentions", headers=headers, json=payload)
    
    # Assert that the request was successful
    assert response.status_code == 201, f"API call failed: {response.text}"

    # Verify the AI's response
    data = response.json()
    print("Live AI Response:", data) # Print the response for manual verification

    # We expect the AI to correctly identify this as an intention needing refinement.
    assert data["needs_refinement"] is True
    assert "feedback" in data
    assert len(data["feedback"]) > 0 # Ensure the AI provided some feedback