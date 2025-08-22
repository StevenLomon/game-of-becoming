import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';
import CreateFocusBlockForm from './CreateFocusBlockForm';
import ActiveFocusBlock from './ActiveFocusBlock';
import UpdateProgressForm from './UpdateProgressForm';
import CharacterStats from './CharacterStats';

function DisplayIntention({ intention }) {
  // Derive the count of completed Focus Blocks from the intention's props
  const completedBlocksCount = intention.focus_blocks.filter(
    (block) => block.status === 'completed'
  ).length;

  // A new component to display the existing intention
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-400">Today's Quest:</h2>
      <div className="mt-2 bg-gray-700 p-4 rounded-lg">
        <p className="text-xl text-white">{intention.daily_intention_text}</p>
        <p className="text-md text-gray-300 mt-2">
          Progress: {intention.completed_quantity} / {intention.target_quantity}
        </p>
        <p className="text-md text-gray-300">
          Focus Blocks: {completedBlocksCount} / {intention.focus_block_count}
        </p>
      </div>
    </div>
  )
}

function MainApp({ user, token, stats }) { // stats now included as a prop!
  // State to hold the user's Daily Intention for the day and Focus Blocks
  const [intention, setIntention] = useState(null); // Now also includes Focus Blocks
  const [isLoading, setIsLoading] = useState(true);
  // New state to manage the UI view after a block is completed
  const [view, setView] = useState('focus'); // 'focus' or 'progress'
  // New state to manage race conditions; our "lock" state
  const [isCreatingResult, setIsCreatingResult] = useState(false);

  // A new function to fetch *all* data; Daily Intentions and Focus Blocks
  const fetchAllData = async () => {
    setIsLoading(true); // Set loading state
    try {
      // Fetch Daily Intention AND Focus Blocks now in one endpoint!
      const response = await fetch('/api/intentions/today/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status == 404) {
        setIntention(null);
      } else if (response.ok) {
        const intentionData = await response.json();
        setIntention(intentionData);
      } else {
        throw new Error('Failed to fetch Daily Intention data.')
      }
    } catch (error) {
      console.error('Failed to fetch Daily Intention data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all data when the component is mounted
  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Our new "watchdog effect" to handle Daily Intention auto-completion flow
  useEffect(() => {
    // Check if the intention exists and its status is 'completed'
    // We also add a check to see if a Daily Result has already been created for it
    const hasDailyResult = !!intention?.daily_result;

    // Updated condition to handle race conditions; only run if status is completed, 
    // there's no result yet, AND we aren't already in the middle of creating one
    if (intention?.status === 'completed' && !hasDailyResult && !isCreatingResult) {
      console.log("Daily Intention completed! Creating Daily Result...");

      const createDailyResult = async () => {
        setIsCreatingResult(true); // LOCK!
        try {
          const response = await fetch('/api/daily-results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            // The backend knows which Daily Intention to use based on the user's token
            });

            if (!response.ok) {
              throw new Error('Failed to create Daily Result');
            }

            const resultData = await response.json();
            console.log("Successfully created Daily Result:", resultData);

            // On success, we should re-fetch all data to get the new result included in our state
            fetchAllData();

        } catch (error) {
          console.error("Error creating Daily Result:", error);
        } finally {
          setIsCreatingResult(false); // UNLOCK!
        }
      };

        createDailyResult();
    }
  }, [intention, token, isCreatingResult]); // This effect depends on the Daily Intention object, the token and our new "lock"

  // After a Focus Block is created, switch the view to the Daily Intention progress update form
  const handleFocusBlockCompleted = () => {
    setView('progress');
  }

  // After progress is updated, re-fetch all data and switch back to the 'focus' view
  const handleProgressUpdated = () => {
    fetchAllData();
    setView('focus');
  }

  // Find the currently active Focus Blocks (if any)
  const activeBlock = intention ? intention.focus_blocks.find(b => b.status === 'pending' || b.status === 'in progress') : null;


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

      {/* We pass the fetched stats data down as a prop. */}
      <CharacterStats stats={stats} />

      {intention ? (
        <div>
          <DisplayIntention intention={intention} />
          
          {view === 'focus' && (
            activeBlock ? (
              <ActiveFocusBlock block={activeBlock} token={token} onBlockCompleted={handleFocusBlockCompleted} />
            ) : (
              <CreateFocusBlockForm token={token} onBlockCreated={fetchAllData} />
            )
          )}

          {view === 'progress' && (
            <UpdateProgressForm 
              token={token} 
              onProgressUpdated={handleProgressUpdated}
              currentProgress={intention.completed_quantity}
            />
          )}

        </div>
      ) : (
        <CreateDailyIntentionForm token={token} onDailyIntentionCreated={fetchAllData} />
      )}
    </div>
  );
}

function Dashboard({ token, onLogout }) {
    // State to hold the full user profile
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    // Modified to fetch both user and stats data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // We create two promises, one for each API call
                const userPromise = await fetch('api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const statsPromise = await fetch('api/users/me/stats', {
                  headers: { 'Authorization': `Bearer ${token}` },
                })

                // Promise.all lets us run these two in parallel for efficiency
                const [userResponse, statsResponse] = await Promise.all([userPromise, statsPromise]);

                // Handle potential 401 Unauthorized for either request
                if (userResponse.status === 401 || statsResponse.status === 401) {
                  // The token is invalid or expired. Call the onLogout function passed down
                  // from the App component
                  onLogout();
                  return;
                }

                if (!userResponse.ok) throw new Error('Failed to fetch user profile.');
                if (!statsResponse.ok) throw new Error('Failed to fetch character stats.');
                
                const userData = await userResponse.json();
                const statsData = await statsResponse.json();
                
                setUser(userData);
                setStats(statsData);

            } catch (err) {
                setError(err.message);
            }
        };
        fetchInitialData();
    }, [token, onLogout]); // Re-run this effect if the token changes. onLogout also added since it's used inside the effect

    const handleOnboardingComplete = (updatedUser) => {
        // When onboarding is done, update the user state with the new data
        setUser(updatedUser);
    };

    // --- CONDITIONAL RENDER LOGIC
    if (error) {
    return <div className="text-red-400">Error: {error}</div>;
    }
    // Update the loading condition to wait for BOTH user and stats
    if (!user || !stats) {
        return <div className="text-gray-400">Loading profile...</div>;
    }

    // Conditional Rendering: Show Onboarding or the Main App
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-2xl">
      {user.hrga ? (
        <MainApp user={user} token={token} stats={stats} />
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