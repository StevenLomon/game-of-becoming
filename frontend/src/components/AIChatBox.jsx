// frontend/src/components/AIChatBox.jsx
import { useState } from 'react';

// The Paper Plane SVG icon for the send button
const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6"
  >
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

function AIChatBox() {
  const [message, setMessage] = useState('');

  // Placeholder for messages. In the future, this will come from props.
  const messageHistory = [
    { sender: 'ai', text: 'Great work on the first Focus Block! How are you feeling?' },
    { sender: 'user', text: 'Feeling good! Ready for the next sprint.' },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    console.log('Sending message:', message);
    // In the future, this will call an API service
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4 rounded-lg mt-8">
      {/* Message History Area */}
      <div className="flex-grow overflow-y-auto mb-4 pr-2">
        <div className="space-y-4">
          {messageHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input Area */}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message..."
          className="flex-grow bg-gray-700 rounded-full py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 transition-colors"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

export default AIChatBox;