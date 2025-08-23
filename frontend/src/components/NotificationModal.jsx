import { useEffect } from 'react';

function NotificationModal({ isOpen, onClose, duration = 3000, title, children }) {
    // When the modal is opened, its sets a timer in the browser
    useEffect(() => {
        let timer;
        if (isOpen) {
            // When the timer finishes, it calls the onClose function it received as a prop
            timer = setTimeout(() => {
                onClose();
            }, duration);
        }
        // The cleanup function: if the modal is closed early, we clear the timer
        // to prevent it from trying to close something that's already gone
        return () => clearTimeout(timer);
    }, [isOpen, duration, onClose]) // It re-runs if any of these change

    if (!isOpen) {
        return null;
    }

return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 text-center">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;