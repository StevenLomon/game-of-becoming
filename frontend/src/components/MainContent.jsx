import { useState, useRef } from 'react';
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
import TutorialTooltip from './TutorialTooltip'; // Our new component for the Post Onboarding Tutorial
import { completeDailyIntention, failDailyIntention } from '../services/api';

// This component now contains all the logic and UI for the main application area.
function MainContent({ user, token, intention, isCreatingIntention, onIntentionCreated, refreshGameState, creationContext, tutorialStep, setTutorialStep }) { // Receive the new props: isCreatingIntention and onIntentionCreated + UPDATED: tutorial props!
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

  // Refs for the tour
  const headerRef = useRef(null);
  const executionAreaRef = useRef(null);

  const handleNextTutorialStep = () => {
    if (tutorialStep === 'header') {
      setTutorialStep('focusBlock');
    } else if (tutorialStep === 'focusBlock') {
      setTutorialStep(null); // End the tutorial
    }
  };

  return (
    // 1. This is our positioning context. `flex-grow` allows it to fill the space.
    <div className="relative flex-grow">
      {/* --- RENDER THE TUTORIAL TOOLTIP --- */}
      {tutorialStep === 'header' ? (
        <TutorialTooltip
          targetRef={headerRef}
          text="Here you can view the Daily Intention you just forged and your progress towards it. Once you're done, you will be able to complete it and gain XP!"
          onNext={handleNextTutorialStep}
        />
      ) : tutorialStep === 'focusBlock' ? (
        <TutorialTooltip
          targetRef={executionAreaRef}
          text="Here you can start your first Focus Block and make progress towards completing your Daily Intention."
          onNext={handleNextTutorialStep}
        />
      ) : null}
      
      {/* --- Main Scrollable Content Area --- */}
      {/* 2. This container holds the execution view. It is always present. */}
      {/* It can scroll if content is long, and has padding at the bottom to make space for the chatbox. */}
      <div className={`h-full overflow-y-auto pb-96 transition-opacity duration-700 ease-in-out ${isCreatingIntention ? 'opacity-0' : 'opacity-100'}`}>
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
          intention && ( // Only render this block if there is an intention
            <div className="flex flex-col h-full">
              {/* Attach the ref to our wrapper div. UPDATE: Now also has conditional classes */}
              {/* When this is the active tutorial step, we make it `relative` and give it a z-index */}
              {/* higher than the overlay's backdrop (which is z-50). */}
              <div 
                ref={headerRef}
                className={`transition-all duration-300 mb-8 ${
                  tutorialStep === 'header' ? 'relative z-[60]' : ''
              }`}
              >
                <DailyIntentionHeader intention={intention} onComplete={handleCompleteIntention} />
              </div>
              <div className="flex-grow">
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
                    // Attach the ref to the ExecutionArea as well as the tutorial z-[60] logic
                    <div
                      ref={executionAreaRef}
                      className={`transition-all duration-300 ${
                        tutorialStep === 'focusBlock' ? 'relative z-[60]' : ''
                      }`}
                    >
                      <ExecutionArea
                        user={user}
                        intention={intention}
                        onBlockCreated={refreshGameState}
                        onBlockCompleted={handleFocusBlockCompleted}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* --- AIChatBox Overlay --- */}
      {/* 3. The chatbox is the animating overlay. */}
      <AIChatBox
        user={user}
        isFullScreen={isCreatingIntention}
        onIntentionCreated={onIntentionCreated}
        creationContext={creationContext}
        // Tell the chatbox not to run its welcome logic if the tutorial is active
        isTutorialActive={!!tutorialStep}
      />
    </div>
  );
}

export default MainContent;