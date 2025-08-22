import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';
import CreateFocusBlockForm from './CreateFocusBlockForm';
import ActiveFocusBlock from './ActiveFocusBlock';
import UpdateProgressForm from './UpdateProgressForm';
import CharacterStats from './CharacterStats';
import DailyResultDisplay from './DailyResultDisplay';

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

function MainApp({ user, token, stats, setStats }) { // stats now included as a prop! And now setStats too; we not to not only show stats but also *update* them
  // State to hold the user's Daily Intention for the day and Focus Blocks
  const [intention, setIntention] = useState(null); // Now also includes Focus Blocks
  const [isLoading, setIsLoading] = useState(true);
  // New state to manage the UI view after a block is completed
  const [view, setView] = useState('focus'); // 'focus' or 'progress'
  // New state to manage race conditions; our "lock" state
  const [isCreatingResult, setIsCreatingResult] = useState(false);
  const [error, setError] = useState(null);

  // Renamed from fetchAllData to reflect its broader role
  const refreshGameState = async () => {
    // We only set the state to 'loading' on boot up
    try {
      const intentionPromise = await fetch('/api/intentions/today/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      }); // Daily Intention and Focus Blocks is fetched in one endpoint
      const statsPromise = await fetch('/api/users/me/stats', {
        headers: { 'Authorization': `Bearer ${token}`},
      });
      
      const [intentionResponse, statsResponse] = await Promise.all([intentionPromise, statsPromise]);

      if (intentionResponse.status == 404) {
        setIntention(null);
      } else if (intentionResponse.ok) {
        setIntention(await intentionResponse.json());
      } else {
        throw new Error('Failed to fetch Daily Intention Data.')
      }

      // Update the stats state
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      } else {
        throw new Error('Failed to fetch stats data.');
      }

    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      // We only set loading to false on the initial load
      setIsLoading(false);
    }
  };

  // Fetch all data when the component is mounted
  useEffect(() => {
    refreshGameState();
  }, [token]);

  // After a Focus Block is created, switch the view to the Daily Intention progress update form
  const handleFocusBlockCompleted = () => {
    setView('progress');
  }

  // After progress is updated, re-fetch all data and switch back to the 'focus' view
  const handleProgressUpdated = () => {
    refreshGameState();
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

      {/* The core logic is updated: If a Daily Intention exists... */}
      {intention ? (
        // ...and it has a daily_result, show the "Reflection Room"
        intention.daily_result ? (
          <DailyResultDisplay result={intention.daily_result} />
        ) : (
          // ...otherwise, show the main "Execution Loop" UI
          <div>
            <DisplayIntention intention={intention} />
            
            {view === 'focus' && (
              activeBlock ? (
                <ActiveFocusBlock block={activeBlock} token={token} onBlockCompleted={handleFocusBlockCompleted} />
              ) : (
                <CreateFocusBlockForm token={token} onBlockCreated={refreshGameState} />
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
        )
      ) : (
        // If no intention exists at all, show the creation form
        <CreateDailyIntentionForm token={token} onDailyIntentionCreated={refreshGameState} />
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
        <MainApp user={user} token={token} stats={stats} setStats={setStats} />
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