import { useState, useEffect } from 'react';
import { getGameState } from '../services/api';
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
// UI Rehaul!
import Sidebar from './Sidebar';
import MainContent from './MainContent';

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

// The MainApp component is no longer needed in Dashboard.jsx! It's logic will be moved to a new component
// Dashboard is the "Head Chef" for the entire view, handling all state and data handling

function Dashboard({ token, onLogout }) {
    // State to hold the full user profile
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [intention, setIntention] = useState(null);
    const [error, setError] = useState(null);
    // New state to hold the unresoved intention from the grace day
    const [unresolvedIntention, setUnresolvedIntention] = useState(null);
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
                const gameState = await getGameState();
                
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
        // Its only job is to refresh the game state after the final step.
        refreshGameState();
    };


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

    // --- CONDITIONAL RENDER LOGIC: UPDATED FOR UI REHAUL
  return (
    // This container now sets the overall size and feel of the app on the page
    <div className="bg-gray-800 w-full max-w-7xl mx-auto shadow-lg rounded-lg min-h-[90vh]">
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
      {/* Main flex container for the two-column layout */}
      <div className="flex">
        {/* Pass the necessary data down to the Sidebar */}
        <Sidebar user={user} stats={stats} />

        {/* Main content area */}
        <div className="flex-grow min-h-[90vh] p-8 w-full">
          {/* Conditional rendering logic remains here in the orchestrator */}
          {isLoading ? (
            <p className="text-gray-400">Loading your quest...</p>
          ) : !user.hla ? (
            <Onboarding 
              user={user} 
              token={token} 
              onFlowStepComplete={refreshGameState} 
            />
          ) : unresolvedIntention ? (
            <UnresolvedQuest 
              intention={unresolvedIntention} 
              token={token} 
              onQuestResolved={refreshGameState} 
            />
          ) : (
            // Pass all necessary data and functions down to the MainContent area
            <MainContent 
              user={user}
              token={token}
              stats={stats}
              intention={intention}
              refreshGameState={refreshGameState}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;