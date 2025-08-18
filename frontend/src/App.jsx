// In frontend/src/App.jsx

import LoginForm from './components/LoginForm' // Import our new component

function App() {
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white font-sans">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <LoginForm />
      </div>
    </div>
  )
}

export default App