import { useState } from 'react';
import { submitRecoveryQuestResponse } from '../services/api';

function AnswerRecoveryQuestForm({ resultId, onReflectionSubmitted }) {
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Call our declarative service function
      const submissionResult = await submitRecoveryQuestResponse(resultId, responseText);

      // Hand the report over to the parent when the call is made
      onReflectionSubmitted(submissionResult);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="recovery-response" className="block text-sm font-medium text-gray-300">
          Your Reflection:
        </label>
        <textarea
          id="recovery-response"
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          rows={4}
          placeholder="What's the insight here? What can you learn from today?"
        />
      </div>
      {error && <div className="bg-red-900 border-red-700 text-red-300 px-4 py-3 rounded-md">{error}</div>}
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500"
        >
          {isSubmitting ? 'Submitting...' : 'Submit and Gain Resilience'}
        </button>
      </div>
    </form>
  );
}

export default AnswerRecoveryQuestForm;
