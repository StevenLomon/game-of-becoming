import AnswerRecoveryQuestForm from "./AnswerRecoveryQuestForm";

function UnresolvedQuest({ intention, token, onQuestResolved }) {
    // The backend already confirms this is an unresolved quest, so it will have a daily_result object
    const result = intention.daily_result;

    // A safety check in case the data is not what we expect
    if (!result || !result.recovery_quest) {
        return (
            <div className="text-center p-4 bg-gray-700 rounded-lg">
                <h2 className="text-xl font-bold text-yellow-400">Attention Required</h2>
                <p className="text-gray-300 mt-2">
                There was an issue loading your unresolved quest from yesterday. Please refresh the page.
                </p>
            </div>
        );
    }

    // This handler will be passed to our form. When the form succeeds, it calls this
    const handleResolution = () => {
        // We just need to call the function the Dashboard gave us
        onQuestResolved();
    }

    return (
    <div className="text-center p-6 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg">
      <h2 className="text-2xl font-bold text-yellow-400 mb-2">Next-Day Accountability</h2>
      <p className="text-gray-300 mb-4">
        You didn't complete your Daily Intention yesterday. Let's turn it into a learning opportunity to preserve your streak.
      </p>
      
      <div className="mt-4 pt-4 border-t border-yellow-800">
        <h4 className="font-bold text-yellow-300">Yesterday's Recovery Quest:</h4>
        <p className="text-white mt-1 text-lg italic">"{result.recovery_quest}"</p>
        
        {/* We reuse the same form component we use in the normal end-of-day flow! */}
        <AnswerRecoveryQuestForm
          token={token}
          resultId={result.id}
          onReflectionSubmitted={handleResolution} // On success, we trigger the refresh
        />
      </div>
    </div>
  );
}

export default UnresolvedQuest;