// A simple component to display the details of the current daily intention.
function DisplayIntention({ intention, onComplete }) {
  const completedBlocksCount = intention.focus_blocks.filter(
    (block) => block.status === 'completed'
  ).length;

  const isCompletable = intention.completed_quantity >= intention.target_quantity;

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <h2 className="text-xl font-bold text-white">Daily Intention:</h2>
      <p className="text-gray-300 mt-2">{intention.daily_intention_text}</p>
      <div className="mt-4 text-sm text-gray-400">
        <span>Progress: {intention.completed_quantity} / {intention.target_quantity}</span>
        <span className="ml-4">Focus Blocks: {completedBlocksCount} / {intention.focus_block_count}</span>
      </div>
      <div className="mt-6">
        <button
          onClick={onComplete}
          disabled={!isCompletable}
          className="w-full py-2 px-4 rounded-md font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Finish Daily Intention
        </button>
      </div>
    </div>
  );
}

export default DisplayIntention;