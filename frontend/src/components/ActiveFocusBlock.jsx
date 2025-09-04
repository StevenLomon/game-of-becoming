// Now 2.0 to match the circular Focus Block UI of ExecutionArea.jsx!
import { useState, useEffect, useCallback } from 'react';
import { updateFocusBlock } from '../services/api';

function ActiveFocusBlock({ block, token, onBlockCompleted }) {
    // --- START OF TIMER LOGIC ---

    // Calculate the total duration in seconds from the start. This is our "100%" value.
    const totalDuration = block.duration_minutes * 60;

    // A helper function to calculate time left based on the server's timestamp
    const calculateRemainingTime = () => {
        // Get the start time from the database record (and convert it to milliseconds)
        const startTimeMs = new Date(block.created_at + 'Z').getTime();
        // Calculate the total duration in milliseconds
        const durationMs = block.duration_minutes * 60 * 1000;
        // Determine the exta time the timer should end
        const endTimeMs = startTimeMs + durationMs;

        // Get the current time in milliseconds
        const nowMs = new Date().getTime();

        // The remaining time is the difference
        const remainingMs = endTimeMs - nowMs;

        // Return the remaining time in seconds, ensuring it's not negative
        return Math.max(0, Math.floor(remainingMs / 1000));
    }

    // THE DISPLAY: Initializing our state by *calculating* the remaining time
    const [timeLeft, setTimeLeft] = useState(calculateRemainingTime());

    // THE CIRCLE: Using SVG and math
    const radius = 80; // The size of our circle
    const circumference = 2 * Math.PI * radius; // Total length of the circle's border

    // Calculate how much of the circle's border shuold be "drawn" to show progress
    const progress = timeLeft / totalDuration;
    const strokeDashOffset = circumference * (1 - progress);

    // THE TICKING MECHANISM & CLEANUP: This effect runs when the component mounts
    useEffect(() => {
        // Don't start the timer if the time is already up.
        if (timeLeft <= 0) return;

        // Set an interval to "tick" every 1000 milliseconds (1 second).
        const timerId = setInterval(() => {
            setTimeLeft((prevTime) => Math.max(0, prevTime - 1)); // Decrement time by 1. Now wrapped in Math.max() to ensure it never dips below 0
        }, 1000);

        // THE "CANCEL" BUTTON: This is the cleanup funciton.
        // React runs this when the component unmounts (disappears).
        // It prevents the timer from running in the background forever.
        return () => clearInterval(timerId);

    }, []); // The effect only runs *once* when the component mounts

    // With our second effect in action now; we need to use useCallback to satisfy the dependency array of our new "watchdog" effect.
    // This tells React that `handleComplete` itself won't change unless its own dependencies change
    const handleComplete = useCallback(async () => {
        try {
            const completionData = await updateFocusBlock(block.id, { status: 'completed' }); // Get the full response

            onBlockCompleted(completionData); // UPDATED: Tell parent to re-fetch AND pass the full data object up!
        } catch(error) {
            console.error("Failed to complete Focus Block:", error);
        }
    }, [block.id, token, onBlockCompleted]);

    // A second "Watchdog" effect that looks for the timer to hit zero and auto-complete the Focus Block (Single Responsibility Principle in action!)
    useEffect(() => {
        // If the timer hits 0, call the handleComplete function
        if (timeLeft === 0) {
            handleComplete();
        }
    }, [timeLeft, handleComplete]); // We depend on timeLeft, and also handleComplete in case it changes

    // Helper variables to format the display from total seconds to e.g. 16:24
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const displayTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

    return (
    <div className="flex flex-col items-center justify-center">
      <h3 className="text-2xl font-bold text-gray-400 mb-4">Focus Block: {block.focus_block_intention}</h3>
      
      {/* The SVG-based circular timer */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          {/* The background circle (the gray track) */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="#4A5568" // This is Tailwind's gray-600
            strokeWidth="15"
          />
          {/* The foreground circle (the green progress) */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="#48BB78" // This is Tailwind's green-500
            strokeWidth="15"
            strokeDasharray={circumference}
            strokeDashOffset={strokeDashOffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)" // This makes the circle start from the top
            style={{ transition: 'stroke-dashoffset 1s linear' }} // This animates the timer smoothly
          />
        </svg>
        {/* The text inside the circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-white">{displayTime}</span>
        </div>
      </div>

      {/* The developer-only "Mark as Complete" button */}
      <button
        onClick={handleComplete}
        className="mt-8 bg-gray-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm"
      >
        Mark as Complete (Dev)
      </button>
    </div>
  );
}

export default ActiveFocusBlock;