// frontend/src/services/api.js

// Our secure transport utility
import authFetch from "../utils/authFetch";

// This remains our single source of truth for the backend's address
const API_BASE_URL = import.meta.env.VITE_API_URL;

// A helper function to handle common error parsing
async function handleErrors(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
    let errorMessage = 'An unknown error occurred.';
    if (errorData.detail) {
      errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0].msg : errorData.detail;
    }
    throw new Error(errorMessage);
  }
  return response;
}

/**
 * Handles the login process, which uses a non-JSON, public endpoint.
 * This function also stores the received token in local storage for later use by authFetch.
 * @param {object} credentials - Object containing username and password.
 * @returns {Promise<object>} - The successful response data from the login endpoint.
 */
export async function loginUser(credentials) {
  const endpoint = "/api/login";
  const url = `${API_BASE_URL}${endpoint}`;

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

  const data = await handleErrors(response).then(res => res.json());

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

  return handleErrors(response).then(res => res.json());
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

  return handleErrors(response).then(res => res.json());
}

/**
 * Updates the user's profile, specifically their HLA, during onboarding.
 * @param {object} updateData - The data to update the user with (e.g., { hla: '...' }).
 * @returns {Promise<object>} - The updated user's data.
 */
export async function updateUserProfile(updateData) {
  const endpoint = "/api/users/me";
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });

  return handleErrors(response).then(res => res.json());
}

/**
 * Fetches the user's character stats.
 * @returns {Promise<object>} - The character stats data.
 */
export async function getCharacterStats() {
    const endpoint = "/api/users/me/stats"; 
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url);

    return handleErrors(response).then(res => res.json());
}

/**
 * Fetches the entire game state in a single call.
 * @returns {Promise<object>} - The comprehensive game state object.
 */
export async function getGameState() {
    const endpoint = "/api/users/me/game-state";
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url);

    return handleErrors(response).then(res => res.json());
}

/**
 * Creates a new Daily Intention.
 * @param {object} intentionData - The intention data, including text, target, and block count.
 * @returns {Promise<object>} - The newly created Daily Intention object from the backend.
 */
export async function createDailyIntention(intentionData) {
    const endpoint = '/api/intentions';
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify(intentionData),
    });

    return handleErrors(response).then(res => res.json());
}

/**
 * Fetches the current user's Daily Intention for today.
 * Handles the special case where no intention exists for the day (404),
 * returning null instead of throwing an error.
 * @returns {Promise<object | null>} - The Daily Intention object or null if not found.
 */
export async function getTodaysIntention() {
    const endpoint = '/api/intentions/today/me';
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await authFetch(url);

    // If the intention doesn't exist yet, we return null.
    if (response.status === 404) {
        return null;
    }

    // For any other non-OK status, we throw a generic error.
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || 'Failed to fetch Daily Intention Data.');
    }
    
    // If successful, return the parsed JSON.
    return response.json();
}

/**
 * Updates the completed quantity for the current day's Daily Intention.
 * @param {number} quantity - The new completed quantity.
 * @returns {Promise<object>} - The updated Daily Intention object.
 */
export async function updateDailyIntentionProgress(quantity) {
  const endpoint = "/api/intentions/today/progress";
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await authFetch(url, {
    method: "PATCH",
    body: JSON.stringify({
      completed_quantity: parseInt(quantity, 10),
    }),
  });

  return handleErrors(response).then((res) => res.json());
}

/**
 * Marks the current day's Daily Intention as completed.
 * @returns {Promise<object>} - The Daily Result for the completed intention.
 */
export async function completeDailyIntention() {
    const endpoint = '/api/intentions/today/complete';
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url, {
        method: 'POST',
    });

    return handleErrors(response).then(res => res.json());
}

/**
 * Marks the current day's Daily Intention as failed.
 * @returns {Promise<object>} - The Daily Result for the failed intention, including a recovery quest.
 */
export async function failDailyIntention() {
    const endpoint = '/api/intentions/today/fail';
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url, {
        method: 'POST',
    });

    return handleErrors(response).then(res => res.json());
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

    return handleErrors(response).then(res => res.json());
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

    return handleErrors(response).then(res => res.json());
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

    return handleErrors(response).then(res => res.json());
}