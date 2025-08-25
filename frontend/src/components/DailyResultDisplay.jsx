import { useState } from 'react';
import AnswerRecoveryQuestForm from './AnswerRecoveryQuestForm';
import RewardDisplay from './RewardDisplay';

// This component now needs the token and a way to refresh the parent's state
function DailyResultDisplay({ result, token, refreshGameState }) {
  const succeeded = result.succeeded_failed;

  // This component now has its own state to track; if the reflection has been submitted
  // We initialize it based on whether the data from the server *already* has a response
  const [isSubmitted, setIsSubmitted] = useState(!!result.recovery_quest_response);
  // New state to hold the final reward data after submission
  const [finalCoaching, setFinalCoaching] = useState(null);

  // This is the handler that our form will call on success
  const handleReflectionSubmitted = (submissionResult) => {
    setFinalCoaching(submissionResult) // Store the full result from the submission
    setIsSubmitted(true); // Update our local state to hide the form
    refreshGameState(); // Call the parent's refresh function to get the new stats and AI feedback
  };

  // Determine which AI feedback to show
  const aiFeedback = finalCoaching?.ai_coaching_feedback || result.ai_feedback;
  const resilienceGain = finalCoaching?.resilience_stat_gain || 0;

  return (
    <div className={`mt-6 p-6 rounded-lg border ${succeeded ? 'bg-gray-800 border-green-700' : 'bg-red-900 border-red-700'}`}>
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          {succeeded ? "Quest Complete!" : "Quest Incomplete"}
        </h3>
        {/* Display the AI's feedback */}
        <p className="text-gray-300 italic mb-4">"{aiFeedback}"</p>
      </div>

      {/* The updated Rewards Section: we now use our reusable RewardDisplay for ALL rewards */}
      <RewardDisplay
        rewards={{
          XP: result.xp_awarded,
          Discipline: result.discipline_stat_gain,
          Resilience: resilienceGain // This will be 0 unless a reflection was just submitted
        }}
      />

      {/* The upgraded Recovery Quest Section */}
      {!succeeded && result.recovery_quest && (
        <div className="mt-4 pt-4 border-t border-red-700">
          <h4 className="font-bold text-red-300">Recovery Quest:</h4>
          <p className="text-white mt-1">{result.recovery_quest}</p>
          
          {/* If a response exists (or was just submitted, show it. Otherwise, show the form. */}
          {isSubmitted && result.recovery_quest_response ? (
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm">Your Reflection:</p>
              <p className="italic text-white">"{result.recovery_quest_response}"</p>

              {/* Here we can display the final AI coaching feedback once it's in the data */}
              {/* For now, this confirms the submission worked. */}
            </div>
          ) : (
            <AnswerRecoveryQuestForm
              token={token}
              resultId={result.id}
              onReflectionSubmitted={handleReflectionSubmitted}
            />
          )}
        </div>
      )}

      {/* Show the final message only if the day is truly "done" */}
      {(succeeded || isSubmitted) && (
        <p className="text-center text-gray-500 mt-4 text-sm">
          Well done. Rest and prepare for your next quest tomorrow.
        </p>
      )}
    </div>
  );
}

export default DailyResultDisplay;