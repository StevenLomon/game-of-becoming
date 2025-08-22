// frontend/src/components/ConfirmationModal.jsx

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  // If the modal isn't open, render nothing.
  if (!isOpen) {
    return null;
  }

  return (
    // The Modal Backdrop: a semi-transparent overlay that covers the whole screen.
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      {/* The Modal Content Box */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-gray-300 mb-6">
          {children}
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 rounded-md font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;