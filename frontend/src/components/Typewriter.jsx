import { useState, useEffect, useRef } from 'react';

// Added a new prop: chunkSize, with a default of 5
function Typewriter({ text, speed = 50, chunkSize = 5 }) {
    const [displayedText, setDisplayedText] = useState('');
    // Create a ref to hold the current index
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset displayed text and index when the text prop changes
        setDisplayedText('');
        indexRef.current = 0;

        const typingInterval = setInterval(() => {
            const currentIndex = indexRef.current;

            if (currentIndex < text.length) {
                // Determine how many characters to add in this chunk
                const charactersToAdd = Math.min(chunkSize, text.length - currentIndex);
                
                // Get the chunk of text to display
                const nextChunk = text.substring(currentIndex, currentIndex + charactersToAdd);

                // Update the state with the new chunk
                setDisplayedText(prevText => prevText + nextChunk);
                
                // Increment the index by the size of the chunk
                indexRef.current = currentIndex + charactersToAdd;
            } else {
                // We're done, clear the interval
                clearInterval(typingInterval);
            }
        }, speed);

        // Cleanup function to clear the interval when the component unmounts
        return () => {
            clearInterval(typingInterval);
        };
    }, [text, speed, chunkSize]); // Rerun the effect if the text, speed, or chunk size changes

    return <p>{displayedText}</p>;
}

export default Typewriter;