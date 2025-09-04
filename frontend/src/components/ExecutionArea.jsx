// Decides whether to show the active timer or the "Start Focus Block" button
import { useState, useEffect } from "react";
import ActiveFocusBlock from './ActiveFocusBlock';
import CreateFocusBlockModal from './CreateFocusBlockModal';
import { createFocusBlock } from '../services/api'; 

function ExecutionArea({ user, intention, onBlockCreated, onBlockCompleted }) { //'user' prop added in order to display "Welcome, NAME"
    // Find if there's a block that is started out but not yet completed
    const activeBlock = intention ? intention.focus_blocks.find(b => b.status === 'in progress') : null;

    const [isModalOpen, setIsModalOpen] = useState(false); // State to control our "Start Focus Block" modal
    const [currentTime, setCurrentTime] = useState(new Date());

    // Our "Embassy's" subscription to the browser's clock
    useEffect(() => {
        // Set an interval to update the time every second (?) (1000ms)
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // The cleanup function: When the component unmounts, we clear the interval
        // to prevent memory leaks
        return () => clearInterval(timerId);
    }, []); // The empty dependency array ensures the effect only runs once on mount

    // This function will be passed to the modal to handle form submission
    const handleCreateBlock = async (blockData) => {
        try {
            // Call the API service with the data from the modal
            await createFocusBlock(
                blockData.focus_block_intention, 
                blockData.duration_minutes
            );

            // On success, close the modal and refresh the game state
            setIsModalOpen(false);
            onBlockCreated(); // This function is passed down from the Dashboard and fetches the new state with an active block
        } catch (error) {
            console.error("Failed to create focus block:", error);
            setIsModalOpen(false); // Close the modal even on error
        }
    };

    // Format the time for display using toLocaleTimeString for clean AM/PM format
    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const userFirstName = user.name.split(' ')[0]; // Grab the first name from the 'user' prop to display it

    return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      {activeBlock ? (
        // If a block is active, show the timer component
        <ActiveFocusBlock block={activeBlock} onBlockCompleted={onBlockCompleted} />
      ) : (
        // If no block is active, show our beautiful "Start Sprint" button
        <>
            {/* Welcome message */}
            <h3 className="text-2xl font-bold text-gray-400 mb-4">Welcome, {userFirstName}</h3>
          
            {/* Current time formatted as AM/PM */}
            <h3 className="text-4xl font-mono font-bold text-white mb-6">{formattedTime}</h3>

            <button
                onClick={() => setIsModalOpen(true)}
                className="w-48 h-48 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold text-teal-400 border-4 border-gray-600 hover:bg-teal-800 hover:border-teal-600 transition-colors duration-300"
            >
                Start Focus Block
            </button>
            
            <CreateFocusBlockModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateBlock}
            />
        </>
      )}
    </div>
  );
}

export default ExecutionArea;