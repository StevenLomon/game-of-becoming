// Our secure transport utility
import authFetch from "../utils/authFetch";

// This remains our single source of truth for the backend's address
const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Handles the login process, which uses a non-JSON, public endpoint.
 * This function also stores the received token in local storage for later use by authFetch.
 * @param {object} credentials - Object containing username and password.
 * @returns {Promise<object>} - The successful response data from the login endpoint.
 */
export async function loginUser(credentials) {
    const endpoint = "/api/login";
    const url = `${API_BASE_URL}${endpoint}`;

    // FastAPI's OAuth2PasswordRequestForm expects data in this format
    const formData = new URLSearchParams();
    formData.append("username", credentials.email);
    formData.append("password", credentials.password);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Login failed");
    }

    // Save the token to local storage for authFetch to use
    if (data.access_token) {
        localStorage.setItem("authToken", data.access_token);
    }

    return data;
}

/**
 * Handles user registration.
 * @param {object} userData - Object with user details.
 * @returns {Promise<object>} - The new user's data.
 */
export async function registerUser(userData) {
  const endpoint = "/api/register";
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMessage = "An unknown error occurred.";
    if (data.detail) {
      errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
    }
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Fetches the currently logged-in user's profile.
 * This is a protected route, so we use authFetch.
 * @returns {Promise<object>} - The user's profile data.
 */
export async function getUserProfile() {
  const endpoint = "/api/users/me"; 
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch user profile.");
  }

  return response.json();
}

/**
 * Updates the user's profile (e.g., to set the HRGA during onboarding).
 * @param {object} updateData - Data to update the user with.
 * @returns {Promise<object>} - The updated user's data.
 */
export async function updateUserProfile(updateData) {
  const endpoint = "/api/users/me"; 
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "An unknown error occurred." }));
    let errorMessage = "An unknown error occurred.";
    if (errorData.detail) {
        errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0].msg : errorData.detail;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetches the user's character stats.
 * @returns {Promise<object>} - The character stats data.
 */
export async function getCharacterStats() {
    const endpoint = "/api/users/me/stats"; 
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url);

    if (!response.ok) {
        throw new Error("Failed to fetch character stats.");
    }

    return response.json();
}

/**
 * Creates a new Focus Block for the current day's Daily Intention.
 * @param {string} intention - The specific intention for this block.
 * @param {number} duration - The duration of the block in minutes.
 * @returns {Promise<object>} - The new Focus Block object created on the backend.
 */
export async function createFocusBlock(intention, duration) {
    const endpoint = '/api/focus-blocks';
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          focus_block_intention: intention,
          duration_minutes: parseInt(duration, 10),
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        let errorMessage = 'Failed to create Focus Block.';
        if (data.detail) {
            errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        }
        throw new Error(errorMessage);
    }
    
    return data;
}

/**
 * Updates a specific Focus Block, typically to mark it as completed.
 * @param {number} blockId - The ID of the block to update.
 * @param {object} updateData - The data to patch the block with (e.g., { status: 'completed' }).
 * @returns {Promise<object>} - The updated Focus Block, including XP awarded.
 */
export async function updateFocusBlock(blockId, updateData) {
    const endpoint = `/api/focus-blocks/${blockId}`;
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (!response.ok) {
        let errorMessage = 'Failed to update Focus Block.';
        if (data.detail) {
            errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        }
        throw new Error(errorMessage);
    }
    
    return data;
}

/**
 * Submits the user's response to a Recovery Quest for a specific Daily Result.
 * @param {number} resultId - The ID of the Daily Result to respond to.
 * @param {object} responseText - The user's reflection text.
 * @returns {Promise<object>} - The full server response.
 */
export async function submitRecoveryQuestResponse(resultId, responseText) {
    const endpoint = `/api/daily-results/${resultId}/recovery-quest`;
    const url = `${API_BASE_URL}${endpoint}`;
  
    const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({ recovery_quest_response: responseText }),
      });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
      throw new Error(errorData.detail || 'Failed to submit reflection.');
    }

    return response.json();
}