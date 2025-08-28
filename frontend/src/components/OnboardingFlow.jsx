import { useState } from "react";
import { submitOnboardingStep } from "../services/api";

function OnboardingFlow({ onOnboardingComplete }) {
    // State to manage to manage the entire conversation flow
    const [step, setStep] = useState('vision');
    const [prompt, setPrompt] = useState("Let's start with your North Star. In the next 1-3 years, what is the single most important vision you have for your business?");
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await submitOnboardingStep(step, userInput);

            if (response.nextStep) {
                // If there is a next step, update and continue the conversation
                setStep(response.nextStep);
                setPrompt(response.ai_response);
                setUserInput(''); // Clear the input for the next step
            } else {
                // If next_step is null, onboarding is complete!
                onOnboardingComplete();
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
    <div className="text-center">
      <div className="mb-6 p-4 bg-gray-900 rounded-lg min-h-[100px]">
        <p className="text-lg text-gray-300 italic">"{prompt}"</p>
      </div>

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
    </div>
  );
}

export default OnboardingFlow;