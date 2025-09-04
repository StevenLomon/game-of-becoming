// CreateFocusBlockForm 2.0!
import { useState } from 'react';

// We receive props to control the modal's state and handle submission
function CreateFocusBlockModal({ isOpen, onClose, onSubmit }) {
    const [intention, setIntention] = useState('');
    const [duration, setDuration] = useState(50);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        // Pass the data up to the parent (ExecutionArea)
        onSubmit({ focus_block_intention: intention, duration_minutes: duration });
    };

    return (
    // Modal Backdrop
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      {/* Modal Content */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-teal-400 mb-6">Start an Execution Sprint</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="block-intention" className="block text-sm font-medium text-gray-300">
              What is your specific intention for this Focus Block?
            </label>
            <input
              id="block-intention" type="text" required
              value={intention} onChange={(e) => setIntention(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-300">
              Duration (minutes)
            </label>
            <input
              id="duration" type="number" required min="1"
              value={duration} onChange={(e) => setDuration(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700">
              Start Focus Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateFocusBlockModal;