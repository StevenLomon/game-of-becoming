import { useState, useEffect, useRef } from 'react';

function Typewriter({ text, baseSpeed = 40 }) {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setDisplayedText('');
        indexRef.current = 0;

        const typeNextChunk = () => {
            const currentIndex = indexRef.current;
            if (currentIndex >= text.length) {
                // We're done, no more characters to type
                return;
            }

            // Find the next space or punctuation to get a more natural word-based chunk
            const nextWordEndIndex = text.indexOf(' ', currentIndex + 1) || text.length;
            const nextPunctuationIndex = text.indexOf('.', currentIndex + 1) || text.length;
            const chunkEndIndex = Math.min(nextWordEndIndex, nextPunctuationIndex);
            
            // Determine the chunk of characters to add
            const chunk = text.substring(currentIndex, chunkEndIndex + 1);
            
            // Add the chunk to the displayed text
            setDisplayedText(prevText => prevText + chunk);
            
            // Update the index for the next call
            indexRef.current = chunkEndIndex + 1;

            // Introduce a randomized delay for a more natural feel
            const randomDelay = baseSpeed + (Math.random() * (baseSpeed * 0.75));
            
            // Store the timeout ID in a ref
            timeoutRef.current = setTimeout(typeNextChunk, randomDelay);
        };

        // Start the typing process
        typeNextChunk();

        // Cleanup function to clear the timeout if the component unmounts or reruns
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [text, baseSpeed]); // Rerun the effect if the text or baseSpeed changes

    return <p>{displayedText}</p>;
}

export default Typewriter;