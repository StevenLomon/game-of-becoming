function RewardDisplay({ rewards }) {
    // If there are no rewards, render nothing
    if (!rewards) {
        return null;
    }

    // Filter out any rewards that are zero
    const validRewards = Object.entries(rewards).filter(([key, value]) => value > 0);

    // If there are no valid (non-zero) rewards, render nothing
    if (validRewards.length === 0) {
        return null;
    }

    return (
    <div className="my-4 text-center bg-gray-900 p-3 rounded-lg">
      <p className="text-md font-medium text-gray-400">Reward Earned</p>
      <div className="flex justify-center items-center space-x-4">
        {validRewards.map(([key, value]) => (
          <p key={key} className="text-xl font-bold text-yellow-400">
            + {value} {key}
          </p>
        ))}
      </div>
    </div>
  );
}


export default RewardDisplay;