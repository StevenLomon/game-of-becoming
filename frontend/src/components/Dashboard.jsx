import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';
import CreateFocusBlockForm from './CreateFocusBlockForm';
import ActiveFocusBlock from './ActiveFocusBlock';

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
  // State to hold the user's Daily Intention for the day and Focus Blocks
  const [intention, setIntention] = useState(null);
  const [focusBlocks, setFocusBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // A new function to fetch *all* data; Daily Intentions and Focus Blocks
  const fetchAllData = async () => {
    setIsLoading(true); // Set loading state
    try {
      // Fetch Daily Intention
      const intentionRes = await fetch('/api/intentions/today/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (intentionRes.status == 404) {
        setIntention(null);
        setFocusBlocks([]); // No Daily Intention means no Focus Block
      } else if (intentionRes.ok) {
        const intentionData = intentionRes.json();
        setIntention(intentionData);

        // If Daily Intention exists, fetch its Focus Blocks
        const blocksRes = await fetch('/api/intentions/today/me/focus-blocks', {
          headers: { 'Authorization': `Bearer: ${token}`},
        });
        if (blocksRes.ok) {
          const blocksData = blocksRes.json();
          setFocusBlocks(blocksData);
        }
      } else {
        throw new Error('Failed to fetch data.')
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all data when the component is mounted
  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Find the currently active Focus Blocks (if any)
  const activeBlock = focusBlocks.find(b => b.status === 'pending' || b.staus === 'in progress');


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
        <div>
          <DisplayIntention intention={intention} />
          {/* Conditional rendering for the focus block section */}
          {activeBlock ? (
            <ActiveFocusBlock block={activeBlock} token={token} onBlockCompleted={fetchAllData} />
          ) : (
            <CreateFocusBlockForm token={token} onBlockCreated={fetchAllData} />
          )}
        </div>
      ) : (
        <CreateDailyIntentionForm token={token} onIntentionCreated={fetchAllData} />
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