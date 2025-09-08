import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, createDailyIntention } from '../services/api';
import Typewriter from './Typewriter';

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
      ? `Welcome, ${user.name.split(' ')[0]}. Let's forge your focus for today. What do you wish to set as your Daily Intention?`
      : `Welcome to your execution space. How can I help you focus today?`;
    return [{ sender: 'ai', text: welcomeText }];
  });
  const [isLoading, setIsLoading] = useState(false); // State to handle when the AI is "thinking"
  const [isRefining, setIsRefining] = useState(false); // The "short-term memory" for the Daily Intention Forge conversation
  const [originalIntention, setOriginalIntention] = useState(''); // We'll also hold onto the original text if we need it

  // NEW STATE: This is our state machine. It mirrors the backend Enum.
  // It's the "single source of truth" for what the chat is currently trying to do.
  const [creationStep, setCreationStep] = useState('AWAITING_TEXT');

  // Dynamically set the container classes based on the mode. UPDATE:Now with a smooth transition!
  const containerClasses = isFullScreen
    ? "flex flex-col h-full bg-gray-900 p-4 rounded-lg transition-all duration-[850ms] ease-in-out" // Full screen
    : "flex flex-col h-96 bg-gray-900 p-4 rounded-lg mt-8 transition-all duration-[850ms] ease-in-out"; // Standard footer; fixed height so that we can implement a scrollable chat box

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

  // This "Embassy" is now a sophisticated orchestrator for the mode change.
  useEffect(() => {
    // This effect runs the moment `isFullScreen` changes.
    // We only care about the transition from true -> false.
    if (isFullScreen === false) {
      
      // STEP 1: Immediately reset the messages to an empty array.
      // This happens in the same browser tick that the animation starts.
      // The user will see an empty chatbox smoothly resizing.
      setMessages([]);

      // STEP 2: Set a timer to add the new welcome message *after* the
      // animation is complete. Your animation is 850ms, so let's wait
      // a little longer than that for a nice rhythm.
      const executionWelcome = {
        sender: 'ai',
        text: `Welcome to your execution space. How can I help you focus today?`
      };
      
      const welcomeTimer = setTimeout(() => {
        setMessages([executionWelcome]);
      }, 2350); // Wait 1.2 seconds before showing the welcome.

      // A good practice is to clean up the timer if the component unmounts mid-sequence.
      return () => clearTimeout(welcomeTimer);
    }
  }, [isFullScreen]); // This effect is perfectly dependent on `isFullScreen`.

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
      if (isFullScreen) {
        // --- CREATION PLAYBOOK v2 (The Multi-step State Machine) ---

        // 1. Call our updated API service, sending the user's text and our current state.
        const response = await createDailyIntention(userMessageText, creationStep);

        // 2. Display the AI's response message
        const aiMessage = { sender: 'ai', text: response.ai_message };
        setMessages(prev => [...prev, aiMessage]);

        // 3. Update our state to follow the backend's instructions
        setCreationStep(response.next_step);

        // 4. If the conversation is complete, hand off to the Dashboard AFTER a pause.
        if (response.next_step === 'COMPLETE') {
          // setTimeout to create a deliberate pause. This ensures the user has time 
          // to read the final confirmation before the UI transition begins.
          setTimeout(() => {
            onIntentionCreated(response.intention_payload);
          }, 2350);
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
                {/* UPDATED: If the message is from the AI, use our new Typewriter component! */}
                {msg.sender === 'ai' ? (
                  <Typewriter text={msg.text} speed={25} />
                ) : (
                  msg.text // User messages appear instantly
                )}
              </div>
            </div>
          ))}
          {/* Show a "typing" indicator while the AI is thinking */}
          {isLoading && (
            <div className="flex justify-start">
              {/* UPDATED: Replace the old text bubble with our pulsing orb */}
              <div className="flex items-center justify-center space-x-2 p-2">
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse-orb [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse-orb [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse-orb"></div>
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