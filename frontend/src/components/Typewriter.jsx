import { useState, useEffect, useRef } from 'react';

function Typewriter({ text, baseSpeed = 40 }) {
    const [displayedText, setDisplayedText] = useState('');
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Always clear any existing timer when the effect re-runs (e.g., text changes)
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        // Reset the state for the new text
        setDisplayedText('');
        
        let currentIndex = 0;

        const typeCharacter = () => {
            if (currentIndex < text.length) {
                setDisplayedText(prev => prev + text[currentIndex]);
                currentIndex++;

                // SUGGESTION: Add natural pauses for punctuation
                const currentChar = text[currentIndex - 1];
                const delay = currentChar === '.' || currentChar === '?' || currentChar === '!'
                    ? baseSpeed * 12 // Longer pause for sentence end
                    : currentChar === ','
                    ? baseSpeed * 6 // Shorter pause for comma
                    : baseSpeed + (Math.random() * (baseSpeed * 0.75));

                timeoutRef.current = setTimeout(typeCharacter, delay);
            }
        };

        // Start the typing process
        typeCharacter();

        // The critical cleanup function: This runs when the component unmounts
        // or before the effect re-runs, preventing "zombie timers".
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [text, baseSpeed]); // This effect is now perfectly self-contained

    return <span>{displayedText}</span>; // Use a <span> for inline text
}

export default Typewriter;