import { useState, useEffect } from 'react';
import { getUserProfile, getCharacterStats, getGameState } from '../services/api';
import Onboarding from './Onboarding';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';
import CreateFocusBlockForm from './CreateFocusBlockForm';
import ActiveFocusBlock from './ActiveFocusBlock';
import UpdateProgressForm from './UpdateProgressForm';
import CharacterStats from './CharacterStats';
import DailyResultDisplay from './DailyResultDisplay';
import ConfirmationModal from './ConfirmationModal';
import RewardDisplay from './RewardDisplay';
import StreakCounter from './StreakCounter';
import UnresolvedQuest from './UnresolvedQuest'; 

function DisplayIntention({ intention, onComplete }) { // New onComplete prop for conditional rendering of "Complete Quest" button
  // Derive the count of completed Focus Blocks from the intention's props
  const completedBlocksCount = intention.focus_blocks.filter(
    (block) => block.status === 'completed'
  ).length;

  // Determine if the quest is ready to be completed
  const isCompletable = intention.completed_quantity >= intention.target_quantity;

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
        
        {/* The New "Complete Quest" Button */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={onComplete}
            disabled={!isCompletable}
            className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Complete Quest
          </button>
        </div>
      </div>
    </div>
  )
}

function MainApp({ user, token, stats, intention, refreshGameState }) { // Include our net refreshGameState as a prop
  // The intention and isLoading pieces of state are now managed by Dashboard, not MainApp
  // These pieces of state that are left are specific to MainApp's UI logic
  const [view, setView] = useState('focus'); // // Manage the UI view after a Focus Block is completed; 'focus' or 'progress'
  const [error, setError] = useState(null);
  const [isFailConfirmVisible, setIsFailConfirmVisible] = useState(false);
  const [lastReward, setLastReward] = useState(null);

  // const refreshGameState is now also managed by the Dashboard!

  // Fetch all data when the component is mounted
  useEffect(() => {
    refreshGameState();
  }, [token]);

  // Switch the view to the Daily Intention progress update form and include XP gain
  const handleFocusBlockCompleted = (completionData) => {
    // We received the full response, which includes xp_awarded
    setLastReward( { XP: completionData.xp_awarded });
    setView('progress');
  };

  // After progress is updated, re-fetch all data and switch back to the 'focus' view
  const handleProgressUpdated = () => {
    setLastReward(null); // Clear the last reward when progress is updated
    refreshGameState();
    setView('focus');
  };

  // A new handler for *opening* the "Confirm Failing Forward" modal
  const handleFailIntentionClick = () => {
    setError(null); // Reset errors when opening the modal
    setIsFailConfirmVisible(true); // Just open the modal
  };

  // The updated handler for confirming the action in the modal; no more window.confirm
  const confirmFailIntention = async () => {
    setIsFailConfirmVisible(false); // Close the modal first
    try {
        // Call our declarative service function
        await failDailyIntention();
        await refreshGameState();
    } catch (err) {
        setError(err.message);
    }
  };

  // New handler for completing a Daily Intention
  const handleCompleteIntention = async () => {
    setError(null);
    try {
        // Call our declarative service function
        await completeDailyIntention();
        await refreshGameState();
    } catch (err) {
        setError(err.message);
    }
  };

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
        <p className="text-gray-400">Your HLA: "{user.hla}"</p>
        {/* Render the StreakCounter and pass the streak from the user object */}
        <StreakCounter currentStreak={user.current_streak} />
      </div>

      {/* We pass the fetched stats data down as a prop. */}
      <CharacterStats stats={stats} />

      {/* Show errors if there are any! */}
      {error && (
        <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* The core logic is updated: If a Daily Intention exists... */}
      {intention ? (
        // ...and it has a daily_result, show the "Reflection Room"
        intention.daily_result ? (
          <DailyResultDisplay 
            result={intention.daily_result} 
            token={token}
            refreshGameState={refreshGameState}
          />
        ) : (
          // ...otherwise, show the main "Execution Loop" UI
          <div>
            <DisplayIntention intention={intention} onComplete={handleCompleteIntention} />

            {/* Conditionally render our new RewardDisplay */}
            {view === 'progress' && <RewardDisplay rewards={lastReward} />}
            
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

            {/* --- The "Fail Forward" Button --- */}
            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <button
                onClick={handleFailIntentionClick} // We now use the modal click handler
                className="text-gray-400 hover:text-white hover:bg-gray-700 py-2 px-4 rounded-md text-sm"
              >
                I can't finish my quest today.
              </button>
            </div>

          </div>
        )
      ) : (
        // If no intention exists at all, show the creation form
        <CreateDailyIntentionForm token={token} onDailyIntentionCreated={refreshGameState} />
      )}

      {/* Render the "Fail Forward" modal conditionally */}
      <ConfirmationModal
        isOpen={isFailConfirmVisible}
        onClose={() => setIsFailConfirmVisible(false)}
        onConfirm={confirmFailIntention}
        title="End Today's Quest?"
      >
        <p>Are you sure you want to end today's quest? This will move you to your evening reflection.</p>
      </ConfirmationModal>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
    // State to hold the full user profile
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    // New state to hold the unresoved intention from the grace day
    const [unresolvedIntention, setUnresolvedIntention] = useState(null);
    // This state now lives in the Dashboard, not MainApp
    const [isLoading, setIsLoading] = useState(true);

    // This is our "Control Panel"
    const refreshGameState = async () => {
      // We don't set loading to true here, since this is for *updates*,
      // not the initial screen-blocking load
      try {
        const gameState = await getGameState();
        setUser(gameState.user);
        setStats(gameState.stats);
        // We now explicitly set both types of intentions
        setIntention(gameState.todays_intention);
        setUnresolvedIntention(gameState.unresolved_intention);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // This is our "Embassy"
    useEffect(() => {
        // Renamed for clarity
        const fetchInitialGameState = async () => {
            setIsLoading(true); // This is the initial load
            try {
                // The API service handles the token, URL, and error checking for us now!
                // Using our new definitive endpoint for the game state
                const gameState = await gameState();
                
                setUser(gameState.user);
                setStats(gameState.stats);
                setIntention(gameState.todays_intention);
                setUnresolvedIntention(gameState.unresolved_intention);

            } catch (err) {
                setError(err.message);
            } finally {
              setIsLoading(false); // Set loading false at the end
            }
        };
        fetchInitialGameState();
    }, [token]); // Re-run this effect if the token changes. onLogout not used anymore and therefore removed

    const handleOnboardingComplete = (updatedUser) => {
        // When onboarding is done, update the user state with the new data
        setUser(updatedUser);
    };

    // --- CONDITIONAL RENDER LOGIC
    if (isLoading) { // Use the new loading state
        return <div className="text-gray-400">Loading your quest...</div>;
    }
    if (error) {
    return <div className="text-red-400">Error: {error}</div>;
    }
    // Update the loading condition to wait for BOTH user and stats
    if (!user || !stats) {
        // This can happen briefly before the first fetch completes
        return <div className="text-gray-400">Loading profile...</div>;
    }

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-2xl">
      {/* The Logout button is always available */}
      <button
        onClick={onLogout}
        className="absolute top-4 right-4 py-1 px-3 border border-gray-600 rounded-md text-sm text-gray-400 hover:bg-gray-700"
      >
        Log Out
      </button>

      {/* THE CORE RENDER LOGIC: A clear order of priority.
                1. Onboarding must be completed first.
                2. Unresolved quests must be handled next.
                3. Finally, show the main app.
      */}
      {!user.hla ? (
                <Onboarding token={token} onOnboardingComplete={handleOnboardingComplete} />
            ) : unresolvedIntention ? (
                <UnresolvedQuest 
                    intention={unresolvedIntention} 
                    token={token} 
                    onQuestResolved={refreshGameState} // Pass the refresh function
                />
            ) : (
                <MainApp 
                    user={user} 
                    token={token} 
                    stats={stats} // Pass the pieces...
                    intention={intention} // ... of state down
                    refreshGameState={refreshGameState} // Pass the control panel button down
                />
            )}
    </div>
  );
}

export default Dashboard;