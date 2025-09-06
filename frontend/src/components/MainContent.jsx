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
function MainContent({ user, token, intention, refreshGameState }) {
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
    // This top-level container is our main flex column. It's perfect.
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {intention ? (
        intention.daily_result ? (
          <DailyResultDisplay 
            result={intention.daily_result} 
            token={token}
            refreshGameState={refreshGameState}
          />
        ) : (
          // This is the main execution view. It's a flex column.
          <>
            {/* 1. The Header (takes up its own height) */}
            <DailyIntentionHeader intention={intention} onComplete={handleCompleteIntention} />

            {/* 2. The Main Content Area (this div will grow) */}
            {/* We give this div 'flex-grow' so it expands to fill all available
                vertical space, pushing the AIChatBox to the bottom. */}
            <div className="flex-grow mt-8">
              {view === 'progress' && <RewardDisplay rewards={lastReward} />}
              
              {view === 'focus' && (
                activeBlock ? (
                  <ActiveFocusBlock block={activeBlock} onBlockCompleted={handleFocusBlockCompleted} />
                ) : (
                  <ExecutionArea user={user} intention={intention} onBlockCreated={refreshGameState} onBlockCompleted={handleFocusBlockCompleted} />
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

            {/* 3. The Footer (sits at the bottom) */}
            <AIChatBox user={user} />
          </>
        )
      ) : (
        <CreateDailyIntentionForm token={token} onDailyIntentionCreated={refreshGameState} />
      )}
    </div>
  );
}

export default MainContent;