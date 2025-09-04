function DailyIntentionHeader({ intention, onComplete }) {
  // A guard clause in case the intention is not yet loaded
  if (!intention) {
    return null; // Render nothing if there's no intention
  }

  // Logic to determine if the "Finish" button should be enabled
  const isCompletable = intention.completed_quantity >= intention.target_quantity;
  const completedBlocksCount = intention.focus_blocks.filter(b => b.status === 'completed').length;

  return (
    // The main container for the header. A flexbox to align items horizontally.
    <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg shadow-md mb-8">
      
      {/* Left side of the header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Daily Intention:</h2>
        <p className="text-gray-400">{intention.daily_intention_text}</p>
        
        {/* This parent div will hold our two vertically stacked lines of text. */}
        <div className="text-sm space-y-1">
          {/* Progress Line */}
          <div>
            <span className="font-bold text-white mr-2">Progress:</span>
            <span className="text-gray-400">{intention.completed_quantity} / {intention.target_quantity}</span>
          </div>
          {/* Focus Blocks Line */}
          <div>
            <span className="font-bold text-white mr-2">Focus Blocks:</span>
            <span className="text-gray-400">{completedBlocksCount} / {intention.focus_block_count}</span>
          </div>
        </div>
      </div>
      
      {/* Right side of the header */}
      <div>
        <button
          onClick={onComplete}
          disabled={!isCompletable}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Finish Daily Intention
        </button>
      </div>
    </div>
  );
}

export default DailyIntentionHeader;