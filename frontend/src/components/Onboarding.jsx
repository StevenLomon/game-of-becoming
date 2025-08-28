import { useState } from 'react';
import { updateUserProfile } from '../services/api';

// This component will need the user's token to make an authenticated API call
function Onboarding({ token, onOnboardingComplete }) {
    const [hla, setHLA] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        try {
            // NEW: Call our declarative service function
            const data = await updateUserProfile({ hla: hla });

            // Tell the parent component that onboarding is done
            onOnboardingComplete(data); // Pass the updated user data up

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
                <label htmlFor="hla" className="block text-sm font-medium text-gray-300 text-left">
                    What is your Highest Leverage Activity (HLA)?
                </label>
                <textarea
                    id="hla"
                    required
                    value={hla}
                    onChange={(e) => setHLA(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="e.g., 'Send personalized outreach messages to new prospects on X.'"
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