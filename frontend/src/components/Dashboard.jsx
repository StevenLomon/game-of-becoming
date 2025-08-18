import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';

function DisplayIntention({ intention }) {
  // A new component to display the existing intention
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-400">Today's Quest:</h2>
      <div className="mt-2 bg-gray-700 p-4 rounded-lg">
        <p className="text-xl text-white">{intention.daily_intention_text}</p>
        <p className="text-md text-gray-300 mt-2">
          Progress: {intention.completed_quantity} / {intention.target_quantity}
        </p>
      </div>
    </div>
  )
}

function MainApp({ user, token }) {
  // State to hold today's intention
  const [intention, setIntention] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch today's intention when the component mounts
  useEffect(() => {
    const fetchIntention = async () => {
      try {
        const response = await fetch('/api/intentions/today/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.status === 404) {
          // 404 is not an error, it just means no intention exists for today
          setIntention(null);
        } else if (response.ok) {
          const intentionData = await response.json();
          setIntention(intentionData);
        } else {
          throw new Error('Failed to fetch daily intention.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntention();
  }, [token]);

  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-gray-400">Loading your quest...</div>;
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome, {user.name}</h1>
        <p className="text-gray-400">Your HRGA: "{user.hrga}"</p>
      </div>

      {intention ? (
        // If an intention exists, display it
        <DisplayIntention intention={intention} />
      ) : (
        // If no intention exists, show the creation form
        <CreateDailyIntentionForm token={token} onDailyIntentionCreated={setIntention} />
      )}
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
        <Onboarding token={token} onOnboardingComplete={handleOnboardingComplete} />
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