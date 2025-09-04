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
        
        {/* Progress details */}
        <div className="flex space-x-4 text-sm mt-1 text-gray-500">
          <span>Progress: {intention.completed_quantity} / {intention.target_quantity}</span>
          <span>Focus Blocks: {completedBlocksCount} / {intention.focus_block_count}</span>
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