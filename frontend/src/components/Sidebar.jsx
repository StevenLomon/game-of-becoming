function Sidebar({ user, stats }) {
    // A guard clause to prevent errors if stats haven't loaded yet.
    if (!stats) {
        return <div className="w-1/4 bg-gray-900 p-6 rounded-l-lg"></div>;
    }

    // Calculate the progress for the XP bar
    const xpPercentage = (stats.xp / stats.xp_for_next_level) * 100;

    return (
        // This will be our fixed sidebar
        <div className="w-1/4 bg-gray-900 p-6 rounded-l-lg text-white">
            <h1 className="text-2xl font-bold">xecute.app</h1>
            
            <div className="mt-8">
                <div className="flex justify-between text-sm text-gray-400">
                <span>XP: {stats.xp} / {stats.xp_for_next_level}</span>
                <span>LVL: {stats.level}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${xpPercentage}%` }}
                ></div>
                </div>
            </div>

            {/* Placeholder for navigation links from the mockup */}
            <nav className="mt-10">
                <ul className="space-y-4">
                <li><a href="#" className="block py-2 px-4 rounded bg-gray-700 text-white">Daily Intention</a></li>
                <li><a href="#" className="block py-2 px-4 rounded text-gray-400 hover:bg-gray-700 hover:text-white">Character</a></li>
                <li><a href="#" className="block py-2 px-4 rounded text-gray-400 hover:bg-gray-700 hover:text-white">Milestones</a></li>
                <li><a href="#" className="block py-2 px-4 rounded text-gray-400 hover:bg-gray-700 hover:text-white">Schedule</a></li>
                <li><a href="#" className="block py-2 px-4 rounded text-gray-400 hover:bg-gray-700 hover:text-white">Settings</a></li>
                </ul>
            </nav>
        </div>
    );
}

export default Sidebar;