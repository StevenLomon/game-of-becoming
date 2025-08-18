import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // 'useState' is a React Hook to manage a piece of state
  const [message, setMessage] = useState('Loading message from backend...')

  // 'useEffect' is a React Hook to run code after the component renders
  useEffect(() => {
    // This function will be called once the component first mounts
    const fetchMessage = async () => {
      try {
        // We call our backend via our proxy. The path is relative, and we use /api
        const response = await fetch('/api/');
        const data = await response.json();
        setMessage(data.message); // Update the state with the message from the API
      } catch (error) {
        setMessage('Failed to fetch message from backend.');
        console.error("Error fetching data:", error)
      }
    };

    fetchMessage(); 
  }, []); // The empty array [] means this effect only runs once

  return (
    // Use Tailwind classes to style the main container
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white font-sans">
      
      {/* Main content card */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
        
        <h1 className="text-4xl font-bold text-teal-400 mb-4">
          The Game of Becoming
        </h1>
        
        <div className="bg-gray-700 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-gray-300 mb-2">
            Backend Connection Status:
          </h2>
          <p className="text-teal-300 font-mono">
            {message}
          </p>
        </div>

      </div>
    </div>
  )
}

export default App
