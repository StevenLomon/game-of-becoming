// Decides whether to show the active timer or the "Start Focus Block" button
import { useState } from "react";
import ActiveFocusBlock from './ActiveFocusBlock';
import CreateFocusBlockModal from './CreateFocusBlockModal';

function ExecutionArea({ intention, onBlockCreated, onBlockCompleted }) {
    // Find if there's a block that is started out but not yet completed
    const activeBlock = intention ? intention.focus_blocks.find(b => b.status === 'in progress') : null;

    // State to control our "Start Focus Block" modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // This function will be passed to the modal to handle form submission
    const handleCreateBlock = async (blockData) => {
        // Here we'll call the API service, close the modal, and refresh the game state
        // For now, let's just log it.
        console.log("Creating block with:", blockData);
        setIsModalOpen(false);
        onBlockCreated(); // This function is passed down from the Dashboard
    };

    return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      {activeBlock ? (
        // If a block is active, show the timer component
        <ActiveFocusBlock block={activeBlock} onBlockCompleted={onBlockCompleted} />
      ) : (
        // If no block is active, show our beautiful "Start Sprint" button
        <>
          <h3 className="text-2xl font-bold text-gray-400 mb-4">Focus Block: 0 / {intention?.focus_block_count || 1}</h3>
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