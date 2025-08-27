import { useState, useEffect, useCallback } from 'react';
import { updateFocusBlock } from '../services/api';

function ActiveFocusBlock({ block, token, onBlockCompleted }) {
    // --- START OF TIMER LOGIC ---

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

    // THE DISPLAY: Initializing our state by *calculating* the remining time
    const [timeLeft, setTimeLeft] = useState(calculateRemainingTime());

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

    // Helper variables to format the display from total seconds.
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

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

    // A second effect that looks for the timer to hit zero and auto-complete the Focus Block (Single Responsibility Principle in action!)
    useEffect(() => {
        // If the timer hits 0, call the handleComplete function
        if (timeLeft === 0) {
            handleComplete();
        }
    }, [timeLeft, handleComplete]); // We depend on timeLeft, and also handleComplete in case it changes

    return (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-teal-500">
        <h3 className="text-lg font-bold text-teal-400">Active Focus Sprint:</h3>
        <p className="text-white mt-2 text-xl">"{block.focus_block_intention}"</p>
        {/* We replace the static duration with our dynamic timer display */}
        <p className="text-gray-400 mt-1 font-mono text-lg">
            {/* Display the timer, adding a leading zero to seconds if needed */}
            Time Remaining: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
        </p>
        <button
            onClick={handleComplete}
            className="mt-4 w-full py-2 px-4 border rounded-md font-medium text-white bg-green-600 hover:bg-green-700"
        >
            Mark as Complete
        </button>
        </div>
  );
}


export default ActiveFocusBlock;