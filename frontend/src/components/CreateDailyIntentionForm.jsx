import { useState } from 'react';
import authFetch from '../utils/authFetch';

// It receives the token for the API call and a function to call on success
function CreateIntentionForm({ token, onDailyIntentionCreated }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState(3);
  const [blocks, setBlocks] = useState(3);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      // NEW: Call our declarative service function
      const data = await createDailyIntention({
        daily_intention_text: text,
        target_quantity: parseInt(target, 10),
        focus_block_count: parseInt(blocks, 10),
        is_refined: true, // As requested, we'll assume this is always true for now
      });

      // On success, call the function from the parent to pass the new intention up
      onDailyIntentionCreated(data);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-teal-400 mb-4">What will you set as your Daily Intention?</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="intention-text" className="block text-sm font-medium text-gray-300">
            Describe your single, measurable outcome for the day that is in alignment with your HRGA.
          </label>
          <textarea
            id="intention-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            rows={3}
          />
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="target-quantity" className="block text-sm font-medium text-gray-300">Target Quantity</label>
            <input
              id="target-quantity"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              min="1"
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="focus-blocks" className="block text-sm font-medium text-gray-300">Focus Blocks</label>
            <input
              id="focus-blocks"
              type="number"
              value={blocks}
              onChange={(e) => setBlocks(e.target.value)}
              required
              min="1"
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
        {error && <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md">{error}</div>}
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            Commit to Today's Daily Intention
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateIntentionForm;