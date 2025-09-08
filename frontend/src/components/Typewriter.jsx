import { useState, useEffect } from 'react';

function Typewriter({ text, speed = 50 }) {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        setDisplayedText(''); // Reset the text every time the `text`prop changes
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prevText => prevText + text.charAt(i));
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, speed);

        // Cleanup funciton to clear the interval if the component unmounts
        return () => {
            clearInterval(typingInterval);
        };
    }, [text, speed]); // Rerun the effect if the text or speed changes

    return <p>{displayedText}</p>;
}


export default Typewriter;