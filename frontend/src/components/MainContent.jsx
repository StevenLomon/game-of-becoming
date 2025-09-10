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
  // UPDATED: The root div is now a grid container that will handle the animation.
  <div className={`grid h-full transition-[grid-template-rows] duration-1000 ease-in-out ${isCreatingIntention ? 'grid-rows-[0fr_1fr]' : 'grid-rows-[1fr_auto]'}`}>
    {/* --- NEW STABLE LAYOUT --- */}

    {/* 1. This div wraps the content that appears and disappears. */}
    {/* It will be placed in the first grid row, which animates its height. */}
    <div className="overflow-hidden">

      {/* UPDATED: Single source of truth wrapper for the opacity transition */}
      <div className={`transition-opacity duration-700 ease-in-out ${isCreatingIntention ? 'opacity-0' : 'opacity-100'}`}>
        {/* All the previous content now lives inside the opacity wrapper, unchanged. */}
        {error && (
          <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* UPDATED: By removing the top-level ternary, we ensure a stable layout for the animation */}
        {intention?.daily_result ? (
            <DailyResultDisplay
              result={intention.daily_result}
              refreshGameState={refreshGameState}
            />
          ) : (
            // This is the main execution view.
            // This container and its children are now ALWAYS in the DOM.
            <div className="flex flex-col h-full">
              <DailyIntentionHeader intention={intention} onComplete={handleCompleteIntention} />

              <div className="flex-grow">
                {/* This middle section contains the dynamic view (focus/progress) */}
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
      </div>

      {/* 2. The AIChatBox is ALWAYS rendered here, in the same position in the tree. */}
      {/* It is now simply the second grid row. */}
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