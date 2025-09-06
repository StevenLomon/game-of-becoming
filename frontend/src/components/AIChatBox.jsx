import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, createDailyIntention } from '../services/api';

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

// Receive the new props: isFullScreen and onIntentionCreated
function AIChatBox({ user, isFullScreen, onIntentionCreated }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => {
    // Set the initial message based on the mode.
    const welcomeText = isFullScreen
      ? `Welcome, ${user.name.split(' ')[0]}. Let's forge your focus for today. What do you wish to set as your Daily Intention`
      : `Welcome to your execution space. How can I help you focus today?`;
    return [{ sender: 'ai', text: welcomeText }];
  });
  const [isLoading, setIsLoading] = useState(false); // State to handle when the AI is "thinking"
  // NEW STATE: The "short-term memory" for the Daily Intention Forge conversation
  const [isRefining, setIsRefining] = useState(false);
  // We'll also hold onto the original text if we need it
  const [originalIntention, setOriginalIntention] = useState('');

  // Dynamically set the container classes based on the mode
  const containerClasses = isFullScreen
    ? "flex flex-col h-full bg-gray-900 p-4 rounded-lg" // Full screen
    : "flex flex-col h-96 bg-gray-900 p-4 rounded-lg mt-8"; // Standard footer; fixed height so that we can implement a scrollable chat box

  // Our "Bookmark" for the auto-scroll feature
  const chatContainerRef = useRef(null);

  // The auto-scrolling effect
  useEffect(() => {
    // This effect runs every time the 'messages' array changes
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      // This command tells the browser to set the scroll position to the very bottom
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]); // The dependency array ensures this runs only when messages are added

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const userMessageText = message.trim();
    if (!userMessageText) return;

    // Optimistic Update for the User's Message
    // Add the user's message to the whiteboard immediately for a snappy UI
    const userMessage = { sender: 'user', text: userMessageText };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setMessage(''); // Clear the input field
    setIsLoading(true); // Show a loading state

    try {
      // UPDATED: Context-aware logic switch; correct "playbook" based on the mode
      if (isFullScreen) {
        // --- CREATION PLAYBOOK ---
        const intentionData = {
          // In a more advanced version, we'd use AI to parse these from text.
          // For now, we'll use sensible defaults.
          target_quantity: 1,
          focus_block_count: 1,
          daily_intention_text: userMessageText,
          is_refined: isRefining, // Our new state determines this!
        };

        const response = await createDailyIntention(intentionData);

        if (response.needs_refinement) {
          // The AI wants more clarity in the intention
          const aiMessage = { sender: 'ai', text: response.ai_feedback };
          setMessages(prev => [...prev, aiMessage]);
          setIsRefining(true); // Switch to refinement mode for the next message
        } else {
          // Success! The Daily Intention was created
          const successMessage = { sender: 'ai', text: "Excellent. Your Daily Intention is forged and locked in. Let's get executing."}
          setMessages(prev => [...prev, successMessage]);
          // The "hand-off"; we tell the Dashboard that the job is done
          onIntentionCreated(response);
        }

      } else {
        // --- EXECUTION (GENERAL CHAT) PLAYBOOK ---
        const response = await sendChatMessage(userMessageText);
        const aiMessage = { sender: 'ai', text: response.ai_response};
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      // Add an error message to the chat
      const errorMessage = { sender: 'ai', text: "Sorry, I'm having troubles connecting. Please try again."};
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false); // Stop the loading state
    }
  };

  return (
    // Apply the dynamic `containerClasses` variable here
    <div className={containerClasses}> 
      {/* Message History Area (overflow-y-auto is the magic that adds a scrollbar only when needed) */}
      <div 
        ref={chatContainerRef} // Attach the "bookmark"!
        className="flex-grow overflow-y-auto mb-4 pr-2"
      >
        <div className="space-y-4">
          {messages.map((msg, index) => (
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
          {/* Show a "typing" indicator while the AI is thinking */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-700 text-gray-300">
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Input Area */}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isLoading ? "AI is thinking..." : "Send a message..."} // Now dynamically uses the isLoading state
          disabled={isLoading}
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