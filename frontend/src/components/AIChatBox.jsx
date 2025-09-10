// src/components/AIChatBox.jsx

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, createDailyIntention } from '../services/api';
import Typewriter from './Typewriter';

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

function AIChatBox({ user, isFullScreen, onIntentionCreated, creationContext, isTutorialActive }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creationStep, setCreationStep] = useState('AWAITING_TEXT');
  const chatContainerRef = useRef(null);
  const prevIsFullScreenRef = useRef(isFullScreen);

  // This is the core of the fix. We determine if we are in a transition state
  // DURING the render, not after it in an effect.
  const isTransitioning = prevIsFullScreenRef.current && !isFullScreen;

  useEffect(() => {
    // This effect now has one job: manage the welcome messages when not transitioning.
    if (!user || isTransitioning) return;

    // The logic from here is simplified because we know we aren't in a transition.
    if (isFullScreen) {
      if (messages.length === 0) {
        const welcomeText = (creationContext === 'post_onboarding')
          ? `Thank you for letting me know more about your business, ${user.name.split(' ')[0]}. I am excited to act as your Clarity and Execution AI Oracle for this journey.\n\n To start off; let's forge your focus for today. What do you wish to set as your Daily Intention?\n\n An intention in line with your Highest Leverage Action that, if completed, would move you closer to your Stretch Goal?`
          : `Welcome, ${user.name.split(' ')[0]}. Let's forge your focus for today. What do you wish to set as your Daily Intention?`;
        setMessages([{ sender: 'ai', text: welcomeText }]);
      }
    } else if (isTutorialActive) {
      if (messages.length > 0) setMessages([]);
    } else {
      // This runs for a normal day OR after the tutorial is finished.
      if (messages.length === 0) {
        const timer = setTimeout(() => {
          setMessages([{ sender: 'ai', text: `Welcome to your execution space. How can I help you focus today?` }]);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [isFullScreen, user, creationContext, isTutorialActive, isTransitioning, messages.length]);

  // This simple effect runs after every render to keep our memory updated for the next render.
  useEffect(() => {
    prevIsFullScreenRef.current = isFullScreen;
  });
  
  // This effect for auto-scrolling is correct.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const userMessageText = message.trim();
    if (!userMessageText) return;

    const userMessage = { sender: 'user', text: userMessageText };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      if (isFullScreen) {
        const response = await createDailyIntention(userMessageText, creationStep);
        const aiMessage = { sender: 'ai', text: response.ai_message };
        setMessages(prev => [...prev, aiMessage]);
        setCreationStep(response.next_step);

        if (response.next_step === 'COMPLETE') {
          setTimeout(() => {
            onIntentionCreated(response.intention_payload);
          }, 2350);
        }
      } else {
        const response = await sendChatMessage(userMessageText);
        const aiMessage = { sender: 'ai', text: response.ai_response};
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: 'ai', text: "Sorry, I'm having troubles connecting. Please try again."};
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = `
    absolute bottom-0 left-0 right-0
    flex flex-col bg-gray-900 p-4
    transition-all duration-1000 ease-in-out
    ${isFullScreen ? 'h-full rounded-lg' : 'h-96'}
  `;

  return (
    <div className={containerClasses}>
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 pr-2">
        <div className="space-y-4">
          {/* We conditionally render the messages. If we're transitioning, we render nothing. */}
          {!isTransitioning && messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'user' ? (
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-lg bg-teal-600 text-white">
                  {msg.text}
                </div>
              ) : (
                <div className="text-gray-300 w-full text-lg whitespace-pre-line">
                  <Typewriter key={msg.text} text={msg.text} baseSpeed={25} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start p-4">
              <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse-heartbeat"></div>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isLoading ? "AI is thinking..." : "Send a message..."}
          disabled={isLoading}
          className="flex-grow bg-gray-700 rounded-full py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button type="submit" className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 transition-colors">
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

export default AIChatBox;