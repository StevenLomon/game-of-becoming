import { useState, useEffect, useCallback } from 'react';
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
    const [unresolvedIntention, setUnresolvedIntention] = useState(null); // The unresoved intention from the grace day
    const [isLoading, setIsLoading] = useState(true);
    // // New state: Our "Master Switch" for the UI mode; Daily Intention
    // const [isCreatingIntention, setIsCreatingIntention] = useState(false);
    // No longer used! We will derive this state directly in the render logic, making
    // this component more declarative. Less imperative force, more declarative flow
    // Not everything needs to useState!

    // CHANGED: This is now our single, robust "Control Panel" for all data fetching.
    // Wrap the entire function in useCallback.
    // The empty dependency array `[]` means this function will be created ONLY ONCE
    // for the entire life of the component, giving it a stable identity.
    const refreshGameState = useCallback(async () => {
      // Set loading to true at the beginning of ANY refresh.
      // This prevents the UI from trying to render with partial or stale data.
      // setIsLoading(true);
      // UPDATED: We no longer set a loading state inside the refresh function.
    // It will now just fetch data and update the props of the already-visible components.
      try {
        const gameState = await getGameState();
        setUser(gameState.user);
        setStats(gameState.stats);
        // We now explicitly set both types of intentions
        setIntention(gameState.todays_intention);
        setUnresolvedIntention(gameState.unresolved_intention);

        // Set our new mode state based on the fetched data.
        // If there's no unresolved quest AND no intention for today, we are in creation mode.
        // setIsCreatingIntention(!gameState.unresolved_intention && !gameState.todays_intention);
        // No longer setting state here. We will derive this value below.
      } catch (err) {
        setError(err.message);
      } 
      // finally {
      //   // Ensure loading is set to false after the operation is complete,
      //   // whether it succeeded or failed.
      //   setIsLoading(false);
      // } No longer needed!
    }, []);

    // This "Embassy" is now simpler. It just triggers the refresh.
    // UPDATED: The initial fetch now also manages the initial loading state!
    useEffect(() => {
        // // Renamed for clarity
        // const fetchInitialGameState = async () => {
        //     setIsLoading(true); // This is the initial load
        //     // try {
        //     //     // The API service handles the token, URL, and error checking for us now!
        //     //     // Using our new definitive endpoint for the game state
        //     //     const gameState = await getGameState();
                
        //     //     setUser(gameState.user);
        //     //     setStats(gameState.stats);
        //     //     setIntention(gameState.todays_intention);
        //     //     setUnresolvedIntention(gameState.unresolved_intention);

        //     // } catch (err) {
        //     //     setError(err.message);
        //     // } finally {
        //     //   setIsLoading(false); // Set loading false at the end
        //     // }
        //     // No try block or API call needed! Simply call the Control Panel!! Single source of truth
        //     await refreshGameState();
        //     setIsLoading(false);
        // };
        // fetchInitialGameState();
        const fetchInitialData = async () => {
            // No need to set isLoading(true) here, it's already true by default.
            await refreshGameState();
            setIsLoading(false); // Turn off the loader ONLY after the first load.
        };

        fetchInitialData();
    }, []); // Run this effect only ONCE on mount.

    const handleOnboardingComplete = () => {
        // Its only job is to refresh the game state after the final step.
        refreshGameState();
    };

    // This function will be passed down to the chatbox to switch modes.
    const handleIntentionCreated = () => {
      refreshGameState(); // This will automatically set isCreatingIntention to false.
    };


    // --- DERIVE STATE: The Architect's Approach ---
    // Instead of storing isCreatingIntention in state (the Handyman's patch),
    // we derive it on every render. This is more "honest" with React and prevents
    // our state from ever getting out of sync. This is our new single source of truth.
    const isCreatingIntention = !unresolvedIntention && !intention;

    // --- DERIVE THE CONTEXT FOR THE WELCOME MESSAGE ---
    // Heuristic: If the user is in creation mode AND their streak is 1 AND xp is 0,
    // we can be confident they just finished onboarding. Clearly separating a user who 
    // has just completed onboarding versus a user who has a broken streak.
    const isPostOnboarding = isCreatingIntention && user?.current_streak === 1 && stats?.xp === 0; // Use optional chaining
    const creationContext = isPostOnboarding ? 'post_onboarding' : 'daily_check_in';


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
        <div className="flex flex-col flex-grow min-h-[90vh] p-8 w-full">
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
            // Pass down the new mode and the handler function to MainContent
            <MainContent
              user={user}
              token={token}
              intention={intention}
              isCreatingIntention={isCreatingIntention} // Now using our derived value
              onIntentionCreated={handleIntentionCreated}
              refreshGameState={refreshGameState}
              creationContext={creationContext}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;