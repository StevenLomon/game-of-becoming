const authFetch = async(url, options = {}) => {
    // Get the token from localStorage on every request
    const token = localStorage.getItem('authToken');

    // Prepare the headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the actual fetch call
    const response = await fetch(url, { ...options, headers });

    // This is our global bouncer. If we ever get a 401, we trigger a logout
    if (response.status === 401) {
        // We use a custom event to signal a logout to the App component
        window.dispatchEvent(new CustomEvent('auth-error'));
        // We still throw an error so the calling component knows the request failed
        throw new Error('Session expired. Please log in again');
    }

    return response;
};


export default authFetch;