function ActiveFocusBlock({ block, token, onBlockCompleted }) {
    const handleComplete = async () => {
        try {
            const response = await fetch(`/api/focus-blocks/${block.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'complete' }),
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
        <p className="text-gray-400 mt-1">Duration: {block.duration_minutes} minutes</p>
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