import { useState, useEffect } from 'react';

function Typewriter({ text, baseSpeed = 40 }) {
    // We now use state for both the displayed text and the index
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        // We only proceed if there are still characters to type
        if (index < text.length) {
            // Schedule the next character to be added
            const timerId = setTimeout(() => {
                // This will add the next character based on the current index
                setDisplayedText(prev => prev + text.charAt(index));
                
                // And then we increment the index to trigger the next loop
                setIndex(prev => prev + 1);
            }, baseSpeed + (Math.random() * (baseSpeed * 0.75))); // Retain your random delay

            // The cleanup function is now tied to the timerId
            return () => clearTimeout(timerId);
        }
    }, [index, text, baseSpeed]); // The effect re-runs whenever index, text, or speed changes

    // When the `text` prop changes, we need to reset the state.
    // We can do this with a separate effect.
    useEffect(() => {
      setDisplayedText('');
      setIndex(0);
    }, [text]);

    return <span>{displayedText}</span>;
}

export default Typewriter;