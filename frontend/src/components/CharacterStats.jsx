// Helper component to keep the JSX clean and avoid repetition
// Can be thought of as a "label maker" for our stats display

// Modified to accept a 'displayValue' prop for custom text
function StatItem({ label, value, displayValue }) {
    return (
    <div className="text-center">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      {/* If a custom displayValue is provided, use it. Otherwise, just show the value. */}
      <p className="text-2xl font-bold text-teal-400">{displayValue || value}</p>
    </div>
  );
}

// Our main component for this file. The "Display Case" itself. Receives the stats and arranges them
function CharacterStats({ stats }) {
    // "Guard clause": Ensures that if the stats data hasn't arrived yet from the parent component,
    // we simply show a loading state instead of trying to render with missing data, which would cause
    // an error
    if (!stats) {
        return <div className="text-gray-400 mb-4">Loading stats...</div>;
    }

    // NEW: Calculate the XP at the start of the current level
    // This is the total XP needed to reach the current level.
    const xpAtLevelStart = stats.xp_for_next_level - stats.xp_needed_to_level;
    
    // NEW: Calculate the user's progress within the current level
    const currentLevelProgress = stats.xp - xpAtLevelStart;
    
    // NEW: Calculate the total XP required to get from the start of this level to the next
    const xpForThisLevel = stats.xp_for_next_level - xpAtLevelStart;

    return (
    <div className="mb-8 p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-300 text-left mb-4">Character Stats</h2>
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Level" value={stats.level} />
          {/* USE THE NEW `displayValue` PROP to show the progress */}
          <StatItem 
            label="XP" 
            value={stats.xp} 
            displayValue={`${currentLevelProgress} / ${xpForThisLevel}`}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatItem label="Clarity" value={stats.clarity} />
          <StatItem label="Discipline" value={stats.discipline} />
          <StatItem label="Resilience" value={stats.resilience} />
        </div>
      </div>
    </div>
  );
}

export default CharacterStats;
