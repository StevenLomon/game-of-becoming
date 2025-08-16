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
    <>
      <h1>The Game of Becoming</h1>
      <div className="card">
        <h2>Backend Connection Status:</h2>
        <p>{message}</p>
      </div>
    </>
  )
}

export default App
