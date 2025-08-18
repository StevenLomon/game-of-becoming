import { useState } from 'react';

// This component will need the user's token to make an authenticated API call
function Onboarding({ token, onBoardingComplete }) {
    const [hrga, setHRGA] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        try {
            // NOTE: We need a new backend endpoint for this!
            // We will create PUT /users/me in the next step
            const response = await fetch('api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Send the auth token
                },
                body: JSON.stringify({hrga: hrga}),
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = 'An unknown error occurred. Failed to save HRGA';
                if (data.detail) {
                    // Check if detail is an array (Pydantic error) or a string
                    if (Array.isArray(data.detail)) {
                        // It's a Pydantic error, so we pull the 'msg' from the first error object.
                        errorMessage = data.detail[0].msg;
                    } else {
                        // It's our custom HTTPExcetion, so details is just a string
                        errorMessage = data.detail;
                    }
                }
                throw new Error(errorMessage);
            }

            // Tell the parent component that onboarding is done
            onBoardingComplete(data); // Pass the updated user data up

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-teal-400 mb-2">One Last Step...</h1>
            <p className="text-gray-400 mb-6">Define your single most important goal to get started.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                <label htmlFor="hrga" className="block text-sm font-medium text-gray-300 text-left">
                    What is your Highest Revenue-Generating Activity (HRGA)?
                </label>
                <textarea
                    id="hrga"
                    required
                    value={hrga}
                    onChange={(e) => setHrga(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="e.g., 'Sending 5 personalized outreach emails per day to new prospects in the SaaS industry.'"
                />
                </div>
                {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md">
                    {error}
                </div>
                )}
                <div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none"
                >
                    Save and Start My Journey
                </button>
                </div>
            </form>
        </div>
    );
}


export default Onboarding;