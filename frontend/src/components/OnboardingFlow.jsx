import { useState, useEffect } from "react";
import { submitOnboardingStep } from "../services/api";

// This function will determine the starting point of the conversation
const getInitialStep = (user) => {
  if (!user.vision) return 'vision';
  if (!user.milestone) return 'milestone';
  if (!user.constraint) return 'constraint';
  if (!user.hla) return 'hla';
  return 'complete'; // Should not happen if Dashboard logic is correct
};

// This function provides the correct prompt for each step
const getPromptForStep = (step, user) => {
    switch (step) {
        case 'vision':
            return "Let's start with your North Star. In the next 1-3 years, what is the single most important vision you have for your business?";
        case 'milestone':
            return `Wonderful. Your North Star is: ${user.vision}. What's ONE milestone you can hit in the next 90 days that moves you in the direction of that North Star?`;
        case 'constraint':
            return `Locked in. Your 90-Day Milestone is to: ${user.milestone}. What's the #1 obstacle, the 'Boss', holding you back from hitting this milestone?`;
        case 'hla':
            return `Got it. The Boss blocking your milestone is: ${user.constraint}. Now for the clarity question: What's the ONE commitment your future self would act on today to become the kind of person who defeats this Boss?`;
        default:
            return "Welcome! Let's get started.";
    }
};

function OnboardingFlow({ user, onFlowStepComplete }) {
    // Use our new helper function to initialize the state correctly
    const [step, setStep] = useState(getInitialStep(user));
    const [prompt, setPrompt] = useState(getPromptForStep(step, user));
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(null);
    const [error, setError] = useState(null);

    // We now use "The Embassy" to listen for changes and synchronize the 
    // component's internal state with the props from its parents
    useEffect(() => {
        // When the user prop changes, we recalculate our "GPS position"
        const newStep = getInitialStep(user);
        const newPrompt = getPromptForStep(newStep, user);

        // And update our internal state to reflect the new reality
        setStep(newStep);
        setPrompt(newPrompt);
    }, [user]); // Only re-run when the 'user' prop changes

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // We don't need the response data here anymore
            await submitOnboardingStep(step, userInput);

            // After every successful step, we tell the parent to refresh.
            onFlowStepComplete();

            // The original logic for handling the *final* step is now implicitly
            // handled by the Dashboard's re-render

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