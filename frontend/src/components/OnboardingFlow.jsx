import { useState } from 'react';
// Import our new V2 API function
import { submitOnboardingV2Step } from '../services/api';

function OnboardingFlow({ user, onFlowStepComplete }) {
  // --- STATE ---
  // The component now manages the current step of the conversation,
  // the prompt to display, and the user's input.
  const [step, setStep] = useState('AWAITING_BUSINESS_STAGE');
  const [prompt, setPrompt] = useState("Let's begin. What kind of business are you running or considering starting?");
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userInput.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      // Call our new V2 service with the current input and step
      const response = await submitOnboardingV2Step(userInput, step);

      // Clear the input field for the next step
      setUserInput('');

      // Update our state based on the backend's instructions
      setStep(response.next_step);
      setPrompt(response.ai_message);

      // If the backend tells us the flow is complete, we notify the Dashboard
      if (response.next_step === 'COMPLETE') {
        // We use a timeout to let the user read the final message
        setTimeout(() => {
          onFlowStepComplete();
        }, 3000); // 3-second pause on the final message
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // The UI is now simpler, driven entirely by the 'prompt' state.
  return (
    <div className="text-center">
      <div className="mb-6 p-4 bg-gray-900 rounded-lg min-h-[100px]">
        <p className="text-lg text-gray-300 italic">"{prompt}"</p>
      </div>

      {/* We prevent form submission if the conversation is complete */}
      {step !== 'COMPLETE' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              rows={3}
              placeholder="Your response..."
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 disabled:cursor-wait"
            >
              {isLoading ? 'Thinking...' : 'Continue'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default OnboardingFlow;