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
    const endpoint = "/login";
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
  const endpoint = "/register";
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
  const endpoint = "/users/me"; 
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
  const endpoint = "/users/me"; 
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
    const endpoint = "/users/me/stats"; 
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await authFetch(url);

    if (!response.ok) {
        throw new Error("Failed to fetch character stats.");
    }

    return response.json();
}