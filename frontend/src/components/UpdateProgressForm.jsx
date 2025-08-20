import { useState } from 'react';

function UpdateProgressForm({ token, onProgressUpdated, currentProgress }) {
    // The form starrts with the current progress
    const [quantity, setQuantity] = useState(currentProgress);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        try {
            const response = await fetch('api/intentions/today/progress', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    completed_quantity: parseInt(quantity, 10),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                let errorMessage = 'Failed to update Daily Intention progress.';
                if (data.detail) {
                errorMessage = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
                }
                throw new Error(errorMessage);
            }
            onProgressUpdated(); // Tell the parent component to re-fetch all data
        } catch(err) {
            setError(err.message);
        }
    };

    return (
    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
      <h3 className="text-xl font-bold text-teal-400 mb-4">Update Your Quest Progress</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="progress-quantity" className="block text-sm font-medium text-gray-300">
            What is your new total progress?
          </label>
          <input
            id="progress-quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            min="0"
            className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white"
          />
        </div>
        {error && <div className="bg-red-900 text-red-300 px-4 py-3 rounded-md">{error}</div>}
        <div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700">
            Save Progress
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateProgressForm;