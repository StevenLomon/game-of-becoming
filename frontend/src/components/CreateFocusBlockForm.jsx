import { useState } from 'react';
import authFetch from '../utils/authFetch';

function CreateFocusBlockForm({ token, onBlockCreated }) {
  const [intention, setIntention] = useState('');
  const [duration, setDuration] = useState(50);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await authFetch('/api/focus-blocks', {
        method: 'POST',
        body: JSON.stringify({
          focus_block_intention: intention,
          duration_minutes: parseInt(duration, 10),
        }),
      });

      const data = await response.json();
        if (!response.ok) {
            let errorMessage = 'Failed to create Focus Block.';
            if (data.detail) {
            errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
            }
            throw new Error(errorMessage);
        }
      onBlockCreated(); // Tell the parent to re-fetch data
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold text-teal-400 mb-4">Start an Execution Sprint</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="block-intention" className="block text-sm font-medium text-gray-300">
            What is your specific intention for this block?
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
        {error && <div className="bg-red-900 text-red-300 px-4 py-3 rounded-md">{error}</div>}
        <div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700">
            Start Focus Block
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateFocusBlockForm;