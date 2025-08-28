import { useState } from 'react';
import { updateUserProfile } from '../services/api';
import OnboardingFlow from './OnboardingFlow';

// This component's only job is to set the stage and render the flow.
function Onboarding({ onOnboardingComplete }) {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-teal-400 mb-2">Welcome to the Game of Becoming</h1>
            <p className="text-gray-400 mb-6">Let's find your focus and begin your first streak.</p>
            <OnboardingFlow onOnboardingComplete={onOnboardingComplete} />
        </div>
    );
}

export default Onboarding;