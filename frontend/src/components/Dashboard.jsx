import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';

function MainApp({ user, token }) {
    // This will be the main application view for an onboarded user
    return (
    <div>
      <h1 className="text-3xl font-bold text-teal-400">Main Application</h1>
      <p className="text-gray-400 mt-2">Welcome, {user.name}!</p>
      <p className="text-gray-400">Your HRGA is set: "{user.hrga}"</p>
      {/* We will build the Daily Intention form here next */}
    </div>
  );
}

function Dashboard({ token, onLogout }) {
    // State to hold the full user profile
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    // Fetch the user's full profile when the component mounts
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch user profile.');
                }
                const userData = await response.json();
                setUser(userData);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchUser();
    }, [token]); // Re-run this effect if the token changes

    const handleOnboardingComplete = (updatedUser) => {
        // When onboarding is done, update the user state with the new data
        setUser(updatedUser);
    };

    // --- CONDITIONAL RENDER LOGIC
    if (error) {
    return <div className="text-red-400">Error: {error}</div>;
    }
    if (!user) {
        return <div className="text-gray-400">Loading profile...</div>;
    }

    // Conditional Rendering: Show Onboarding or the Main App
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-2xl">
      {user.hrga ? (
        <MainApp user={user} token={token} />
      ) : (
        <Onboarding token={token} onboardingComplete={handleOnboardingComplete} />
      )}
      <button
        onClick={onLogout}
        className="absolute top-4 right-4 py-1 px-3 border border-gray-600 rounded-md text-sm text-gray-400 hover:bg-gray-700"
      >
        Log Out
      </button>
    </div>
  );
}

export default Dashboard;