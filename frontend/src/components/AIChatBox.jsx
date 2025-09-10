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
function AIChatBox({ user, isFullScreen, onIntentionCreated, creationContext }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]) // UPDATED: messages is being back to being initialized simple as an empty array
  const [isLoading, setIsLoading] = useState(false); // State to handle when the AI is "thinking"
  const [isRefining, setIsRefining] = useState(false); // The "short-term memory" for the Daily Intention Forge conversation
  const [originalIntention, setOriginalIntention] = useState(''); // We'll also hold onto the original text if we need it

  // NEW STATE: This is our state machine. It mirrors the backend Enum.
  // It's the "single source of truth" for what the chat is currently trying to do.
  const [creationStep, setCreationStep] = useState('AWAITING_TEXT');

  // Dynamically set the container classes based on the mode. UPDATED: Remove h-full and the transition classes. The grid parent now controls the height and animation.
  const containerClasses = isFullScreen
    ? "flex flex-col bg-gray-900 p-4 rounded-lg ease-in-out" // Full screen
    : "flex flex-col h-96 bg-gray-900 p-4 rounded-lg ease-in-out"; // Standard footer; fixed height so that we can implement a scrollable chat box

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

  // CHANGED: This "Embassy" now has a single, clear responsibility: manage the
  // welcome messages and transitions between modes (creation vs. execution).
  useEffect(() => {
    // Guard clause: Don't do anything until the user object is actually loaded.
    if (!user) return;

    if (isFullScreen) {
      // This is the creation mode. We set the initial welcome message.
      const welcomeText = (creationContext === 'post_onboarding')
        ? `Thank you for letting me know more about your business, ${user.name.split(' ')[0]}. I am excited to act as your Clarity and Execution AI Oracle for this journey. To start off; let's forge your focus for today. What do you wish to set as your Daily Intention?`
        : `Welcome, ${user.name.split(' ')[0]}. Let's forge your focus for today. What do you wish to set as your Daily Intention?`;
      
      setMessages(prevMessages => {
      // Only set if not already present as the first message
      if (
        prevMessages.length === 0 ||
        prevMessages[0].text !== welcomeText
      ) {
        return [{ sender: 'ai', text: welcomeText }];
      }
      return prevMessages;
    });

    } else {
      // This is the execution mode. We clear the chat and set the new welcome message
      // after the animation delay.
      setMessages([]); // Clear the slate
      const welcomeTimer = setTimeout(() => {
        setMessages([{
          sender: 'ai',
          text: `Welcome to your execution space. How can I help you focus today?`
        }]);
      }, 1000); // Shortened delay for a snappier feel
      return () => clearTimeout(welcomeTimer);
    }
    // THE DEPENDENCIES: We are being explicit. This effect should ONLY re-run if
    // the mode (isFullScreen), the user, or the context truly changes. Because `user` is
    // now stable from the Dashboard, this is safe.
  }, [isFullScreen, user, creationContext]);

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
                  {/* Conditional styling for the message content */}
                  {msg.sender === 'user' ? (
                      // Styles for user messages (chat bubble)
                      <div
                          className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-lg bg-teal-600 text-white"
                      >
                          {msg.text}
                      </div>
                  ) : (
                      // Styles for AI messages (full-width text)
                      <div className="text-gray-300 w-full text-lg">
                          <Typewriter key={msg.text} text={msg.text} baseSpeed={25} />
                      </div>
                  )}
              </div>
          ))}

          {/* Show a "typing" indicator while the AI is thinking */}
          {isLoading && (
              <div className="flex justify-start p-4">
                  <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse-heartbeat"></div>
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