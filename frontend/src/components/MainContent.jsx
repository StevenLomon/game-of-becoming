import { useState } from 'react';
import CreateDailyIntentionForm from './CreateDailyIntentionForm';
// import DisplayIntention from './DisplayIntention'; No longer used
import DailyIntentionHeader from './DailyIntentionHeader';
import ActiveFocusBlock from './ActiveFocusBlock'; // Updated to use circular UI
// import CreateFocusBlockForm from './CreateFocusBlockForm'; No longer used
import UpdateProgressForm from './UpdateProgressForm';
import RewardDisplay from './RewardDisplay';
// import ConfirmationModal from './ConfirmationModal'; The button that triggered this is no longer used
import DailyResultDisplay from './DailyResultDisplay';
import ExecutionArea from './ExecutionArea';
import AIChatBox from './AIChatBox';
import { completeDailyIntention, failDailyIntention } from '../services/api';

// This component now contains all the logic and UI for the main application area.
function MainContent({ user, token, intention, isCreatingIntention, onIntentionCreated, refreshGameState }) { // Receive the new props: isCreatingIntention and onIntentionCreated
  // These states are specific to the UI flow within the main content area.
  const [view, setView] = useState('focus');
  const [error, setError] = useState(null);
  const [isFailConfirmVisible, setIsFailConfirmVisible] = useState(false);
  const [lastReward, setLastReward] = useState(null);

  // All the handler functions from the old MainApp are moved here.
  const handleFocusBlockCompleted = (completionData) => {
    setLastReward({ XP: completionData.xp_awarded });
    setView('progress');
  };

  const handleProgressUpdated = () => {
    setLastReward(null);
    refreshGameState();
    setView('focus');
  };

  const handleFailIntentionClick = () => {
    setError(null);
    setIsFailConfirmVisible(true);
  };

  const confirmFailIntention = async () => {
    setIsFailConfirmVisible(false);
    try {
      await failDailyIntention();
      await refreshGameState();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompleteIntention = async () => {
    setError(null);
    try {
      await completeDailyIntention();
      await refreshGameState();
    } catch (err) {
      setError(err.message);
    }
  };

  const activeBlock = intention ? intention.focus_blocks.find(b => b.status === 'pending' || b.status === 'in_progress') : null;

  return (
    // This top-level container remains our clean flex column.
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* The new "Master Switch" logic */}
      {isCreatingIntention ? (
        // MODE 1: CREATION - Render ONLY the chat box in full-screen mode.
        <AIChatBox
          user={user}
          isFullScreen={true}
          onIntentionCreated={onIntentionCreated}
        />
      ) : intention ? (
        // MODE 2: EXECUTION - Render the standard execution view.
        // This logic is only reachable if an intention already exists.
        intention.daily_result ? (
          <DailyResultDisplay 
            result={intention.daily_result}
            refreshGameState={refreshGameState}
          />
        ) : (
          <>
            <DailyIntentionHeader intention={intention} onComplete={handleCompleteIntention} />
            
            <div className="flex-grow">
              {/* This middle section contains the dynamic view (focus/progress) */}
              {view === 'progress' ? (
                <>
                  <RewardDisplay rewards={lastReward} />
                  <UpdateProgressForm 
                    onProgressUpdated={handleProgressUpdated}
                    currentProgress={intention.completed_quantity}
                  />
                </>
              ) : (
                activeBlock ? (
                  <ActiveFocusBlock block={activeBlock} onBlockCompleted={handleFocusBlockCompleted} />
                ) : (
                  <ExecutionArea 
                    user={user} 
                    intention={intention} 
                    onBlockCreated={refreshGameState} 
                    onBlockCompleted={handleFocusBlockCompleted} 
                  />
                )
              )}
            </div>
            
            <AIChatBox user={user} isFullScreen={false} />
          </>
        )
      ) : (
        // Fallback for an edge case where there's no intention, but we're not in creation mode.
        // This could show a loading spinner or a message.
        <p>Loading your day...</p>
      )}
    </div>
  );
}

export default MainContent;