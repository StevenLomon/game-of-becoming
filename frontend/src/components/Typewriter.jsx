import { useState, useEffect } from 'react';

function Typewriter({ text, baseSpeed = 40 }) {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    // This effect handles the core typing logic
    useEffect(() => {
        // If the index has reached or exceeded the text length, we are done.
        if (index >= text.length) {
            return;
        }

        // Define a function that will get the next chunk of text
        const getNextChunk = () => {
            // Find the next space or punctuation to get a more natural word-based chunk
            const nextWordEndIndex = text.indexOf(' ', index + 1);
            const nextPunctuationIndex = text.indexOf('.', index + 1);
            
            // Determine the end of the next chunk. If a space or period is found,
            // we use the index of the one that comes first.
            let chunkEndIndex;
            if (nextWordEndIndex === -1 && nextPunctuationIndex === -1) {
                // If neither is found, take the rest of the text
                chunkEndIndex = text.length;
            } else if (nextWordEndIndex === -1) {
                chunkEndIndex = nextPunctuationIndex;
            } else if (nextPunctuationIndex === -1) {
                chunkEndIndex = nextWordEndIndex;
            } else {
                chunkEndIndex = Math.min(nextWordEndIndex, nextPunctuationIndex);
            }

            // Return the chunk of text and the new index to start from
            const chunk = text.substring(index, chunkEndIndex + 1);
            const newIndex = chunkEndIndex + 1;
            return { chunk, newIndex };
        };

        const timerId = setTimeout(() => {
            const { chunk, newIndex } = getNextChunk();

            // Append the chunk to the displayed text
            setDisplayedText(prev => prev + chunk);

            // Set the new index to trigger the next loop
            setIndex(newIndex);
        }, baseSpeed + (Math.random() * (baseSpeed * 0.75))); // Retain your random delay

        // The cleanup function is now tied to the timerId
        return () => clearTimeout(timerId);
    }, [index, text, baseSpeed]);

    // This separate effect handles the reset when the `text` prop changes
    useEffect(() => {
        setDisplayedText('');
        setIndex(0);
    }, [text]);

    return <span>{displayedText}</span>;
}

export default Typewriter;