import { useState, useEffect, useRef } from 'react';

function Typewriter({ text, speed = 50 }) {
    const [displayedText, setDisplayedText] = useState('');
    // Create a ref to hold the current index
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset displayed text and index when the text prop changes
        setDisplayedText('');
        indexRef.current = 0;

        const typingInterval = setInterval(() => {
            // Get the current index from the ref
            const currentIndex = indexRef.current;

            if (currentIndex < text.length) {
                // Update the state with the next character
                setDisplayedText(prevText => prevText + text.charAt(currentIndex));
                // Increment the index in the ref for the next tick
                indexRef.current = currentIndex + 1;
            } else {
                // We're done, clear the interval
                clearInterval(typingInterval);
            }
        }, speed);

        // Cleanup function to clear the interval when the component unmounts
        return () => {
            clearInterval(typingInterval);
        };
    }, [text, speed]); // Rerun the effect if the text or speed changes

    return <p>{displayedText}</p>;
}

export default Typewriter;