import { useState, useEffect } from 'react';

function ActiveFocusBlock({ block, token, onBlockCompleted }) {
    // --- START OF TIMER LOGIC ---

    // THE DISPLAY: Initializing our state with the block's duration in seconds
    const [timeLeft, setTimeLeft] = useState(block.duration_minutes * 60);

    // THE TICKING MECHANISM & CLEANUP: This effect runs when the component mounts
    useEffect(() => {
        // Don't start the timer if the time is already up.
        if (timeLeft <= 0) return;

        // Set an interval to "tick" every 1000 milliseconds (1 second).
        const timerId = setInterval(() => {
            setTimeLeft((prevTime) => prevTime - 1); // Decrement time by 1
        }, 1000);

        // THE "CANCEL" BUTTON: This is the cleanup funciton.
        // React runs this when the component unmounts (disappears).
        // It prevents the timer from running in the background forever.
        return () => clearInterval(timerId);

    }, [timeLeft]); // This dependency array makes the effect re-run if timeLeft changes

    // Helper variables to format the display from total seconds.
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const handleComplete = async () => {
        try {
            const response = await fetch(`/api/focus-blocks/${block.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'completed' }),
            });
            if (!response.ok) {
                let errorMessage = 'Failed to complete Focus Block.';
                if (data.detail) {
                errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
                }
                throw new Error(errorMessage);
            }
            onBlockCompleted(); // Tell parent to re-fetch
        } catch(error) {
            console.error("Failed to complete Focus Block:", error);
        }
    };

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