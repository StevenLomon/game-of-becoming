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