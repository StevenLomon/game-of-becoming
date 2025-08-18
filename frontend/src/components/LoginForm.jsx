import { useState } from 'react';

function loginForm() {
    // 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [token, setToken] = useState(null);

    // This function will be called when the form is submitted
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent the default browser form submission
        setError(null); // Reset any previous errors

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                // We need to format the data as form data for the backend
                body: new URLSearchParams({
                    username: email,
                    password: password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle errors from teh API (e.g., 401 Unauthorized)
                throw new Error(data.detail || 'Failed to log in.');
            }

            // If login is successful, store the token
            setToken(data.access_token);
        } catch (err) {
            setError(err.message);
        }
    };

    // If we have a token, show a success message
    if (token) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-green-400">Login Successful!</h2>
                <p className="text-gray-400 mt-2">Your token has been received</p>
            </div>
        );
    }

    // Otherwise, show the login form
    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-sm">
            <h2 className="text-3xl font-bold text-center text-white">Game of Becoming Log In</h2>
            <div>
                <label htmlFor="email" className="block text-sm front-medium text-gray-300">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus: ring-teal-500 focus:border-teal-500"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
                </label>
                <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
            </div>

            {/* Display an error message if one exists */}
            {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            <div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm font-medium text-whtie bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
                >
                    Login
                </button>
            </div>
        </form>
    );
}

export default loginForm;