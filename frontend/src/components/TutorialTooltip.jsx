import { useEffect, useState } from 'react';

function TutorialTooltip({ targetRef, text, onNext }) {
  const [position, setPosition] = useState(null);

  // This "Embassy" useEffect calculates the position of the highlight
  // It runs when the component mounts and whenever the window is resized.
  useEffect(() => {
    const calculatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [targetRef]);

  if (!position) return null;

  return (
    // The main container is a fixed overlay that covers the screen
    <div className="fixed inset-0 z-50">
      {/* 1. The dimming backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-75"></div>

      {/* 2. The glowing highlight, positioned over the target element */}
      <div
        className="absolute transition-all duration-500 ease-in-out border-4 border-yellow-400 rounded-lg shadow-lg"
        style={{
          top: position.top - 8,    // A small offset for padding
          left: position.left - 8,
          width: position.width + 16,
          height: position.height + 16,
          boxShadow: '0 0 20px 5px rgba(250, 204, 21, 0.7)', // The "glow" effect
        }}
      ></div>

      {/* 3. The tooltip box, positioned below the highlight */}
      <div
        className="absolute bg-gray-800 p-4 rounded-lg text-white shadow-xl max-w-sm"
        style={{
          top: position.top + position.height + 20, // 20px below the highlight
          left: position.left,
        }}
      >
        <p className="text-lg">{text}</p>
        <button
          onClick={onNext}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default TutorialTooltip;