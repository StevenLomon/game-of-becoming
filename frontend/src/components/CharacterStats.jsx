// Helper component to keep the JSX clean and avoid repetition
// Can be thought of as a "label maker" for our stats display
function StatItem({ label, value }) {
    return (
    <div className="text-center">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-teal-400">{value}</p>
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

    return (
    <div className="mb-8 p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-300 text-left mb-4">Character Stats</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatItem label="Level" value={stats.level} />
        <StatItem label="XP" value={stats.xp} />
        <StatItem label="Clarity" value={stats.clarity} />
        <StatItem label="Discipline" value={stats.discipline} />
        {/* We can add Resilience and Commitment here later or as you see fit! */}
      </div>
    </div>
  );
}

export default CharacterStats;
