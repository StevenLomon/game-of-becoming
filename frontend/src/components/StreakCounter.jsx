// A simple, focused component for displaying the streak
// It receives teh current streak as a prop from its parent
function StreakCounter({ currentStreak }) {
    // A guard clause: if the streak is 0 or not yet loaded, we don't show anything
    // This prevents showing "0 day streak 🌱" on a user's first day
    if (!currentStreak || currentStreak === 0) {
        return null;
    }

    return (
    <div className="mt-4 text-center bg-gray-900 p-2 rounded-lg border border-orange-500 shadow-lg">
      <p className="text-lg font-bold text-orange-400">
        {currentStreak}-day Streak 🌱
      </p>
    </div>
  );
}

export default StreakCounter;