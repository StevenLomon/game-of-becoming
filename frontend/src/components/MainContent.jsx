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
function MainContent({ user, token, intention, isCreatingIntention, onIntentionCreated, refreshGameState, creationContext }) { // Receive the new props: isCreatingIntention and onIntentionCreated
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
    // 1. This is now our positioning context and clipping boundary.
    <div className="relative flex-grow overflow-hidden">
      
      {/* --- Main Execution Content --- */}
      {/* 2. This content is now always rendered "underneath" the chatbox. */}
      {/* We animate its opacity to fade it in as the chatbox shrinks. */}
      <div className={`h-full transition-opacity duration-1000 ease-in-out ${isCreatingIntention ? 'opacity-0' : 'opacity-100'}`}>
        {error && (
          <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
        {intention?.daily_result ? (
          <DailyResultDisplay
            result={intention.daily_result}
            refreshGameState={refreshGameState}
          />
        ) : (
          <div className="flex flex-col h-full">
            <DailyIntentionHeader intention={intention} onComplete={handleCompleteIntention} />
            <div className="flex-grow">
              {view === 'progress' ? (
                <>
                  <RewardDisplay rewards={lastReward} />
                  <UpdateProgressForm
                    onProgressUpdated={handleProgressUpdated}
                    currentProgress={intention?.completed_quantity || 0}
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
          </div>
        )}
      </div>

      {/* --- AIChatBox Overlay --- */}
      {/* 3. The chatbox is now an absolutely positioned overlay. */}
      <AIChatBox
        user={user}
        isFullScreen={isCreatingIntention}
        onIntentionCreated={onIntentionCreated}
        creationContext={creationContext}
      />
    </div>
  );
}

export default MainContent;