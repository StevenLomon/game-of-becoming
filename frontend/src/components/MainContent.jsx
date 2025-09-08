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
    // This root div remains the same, providing the flex-column context.
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* --- NEW STABLE LAYOUT --- */}

      {/* 1. Wrapper for all "Execution Mode" content. */}
      {/* THE FIX: We no longer use `hidden`. Instead, we animate max-height and opacity. */}
      {/* We add transition classes here so the container itself animates. */}
      <div
        className={`flex flex-col flex-grow transition-all duration-1000 ease-in-out overflow-hidden ${
          isCreatingIntention ? 'max-h-0 opacity-0' : 'max-h-screen opacity-100'
        }`}
      >
        {intention ? (
          // If an intention exists, we decide what part of the execution flow to show.
          intention.daily_result ? (
            <DailyResultDisplay
              result={intention.daily_result}
              refreshGameState={refreshGameState}
            />
          ) : (
            // This is the main execution view.
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
            </>
          )
        ) : (
          // This fallback now lives safely inside the conditionally hidden wrapper.
          <p>Loading your day...</p>
        )}
      </div>

      {/* 2. The AIChatBox is ALWAYS rendered here, in the same position in the tree. */}
      {/* Its state will be preserved, and its CSS transitions will now work because */}
      {/* the component itself is never unmounted during a mode change. */}
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