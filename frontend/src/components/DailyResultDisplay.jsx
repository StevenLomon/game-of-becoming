function DailyResultDisplay({ result }) {
  const succeeded = result.succeeded_failed;

  return (
    <div className={`mt-6 p-4 rounded-lg border ${succeeded ? 'bg-green-900 border-green-700' : 'bg-red-900 border-red-700'}`}>
      <h3 className="text-xl font-bold text-white mb-2">
        {succeeded ? "Quest Complete!" : "Quest Incomplete"}
      </h3>
      
      {/* Display the AI's feedback */}
      <p className="text-gray-300 italic">"{result.ai_feedback}"</p>

      {/* Conditionally render the Recovery Quest if the day was a failure */}
      {!succeeded && result.recovery_quest && (
        <div className="mt-4 pt-4 border-t border-red-700">
          <h4 className="font-bold text-red-300">Recovery Quest:</h4>
          <p className="text-white mt-1">{result.recovery_quest}</p>
          {/* We'll add a form here later to let the user respond */}
        </div>
      )}
    </div>
  );
}

export default DailyResultDisplay;