function DailyResultDisplay({ result }) {
  const succeeded = result.succeeded_failed;

  return (
    <div className={`mt-6 p-4 rounded-lg border ${succeeded ? 'bg-green-900 border-green-700' : 'bg-red-900 border-red-700'}`}>
      <h3 className="text-xl font-bold text-white mb-2">
        {succeeded ? "Quest Complete!" : "Quest Incomplete"}
      </h3>
      
      {/* Display the AI's feedback */}
      <p className="text-gray-300 italic">"{result.ai_feedback}"</p>

      {/* --- NEW: The Rewards Section --- */}
      {succeeded && result.discipline_stat_gain > 0 && (
        <div className="text-center bg-gray-900 p-3 rounded-lg mb-4">
          <p className="text-md font-medium text-gray-400">Reward Earned</p>
          <p className="text-xl font-bold text-yellow-400">
            + {result.discipline_stat_gain} Discipline
          </p>
        </div>
      )}

      {/* Conditionally render the Recovery Quest if the day was a failure */}
      {!succeeded && result.recovery_quest && (
        <div className="mt-4 pt-4 border-t border-red-700">
          <h4 className="font-bold text-red-300">Recovery Quest:</h4>
          <p className="text-white mt-1">{result.recovery_quest}</p>
          {/* We'll add a form here later to let the user respond */}
        </div>
      )}

      {/* --- NEW: The Forward-Looking Message --- */}
      <p className="text-center text-gray-500 mt-4 text-sm">
        Well done. Rest and prepare for your next quest tomorrow.
      </p>
    </div>
  );
}

export default DailyResultDisplay;