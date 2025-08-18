import { useState } from 'react';
import LoginForm from './components/LoginForm'
import RegistrationForm from './components/RegistrationForm';
import Dashboard from './components/Dashboard';

// A new component to manage the authentication view
function AuthScreen({ onLoginSuccess }) {
  const [view, setView] = useState('login');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // This function will be passed down from AuthScreen to the RegistrationForm
  const handleRegisterSuccess = () => {
    setRegistrationSuccess(true);
    setView('login'); // Switch back to the login view
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
      {registrationSuccess && (
        <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6 text-center">
          Registration successful! Please log in.
        </div>
      )}
      {view === 'login' ? (
        <LoginForm onLoginSuccess={onLoginSuccess} />
      ) : (
        <RegistrationForm onRegisterSuccess={handleRegisterSuccess} />
      )}
      <div className="mt-6 text-center">
        {view === 'login' ? (
          <p className="text-sm text-gray-400">Don't have an account? <button onClick={() => setView('register')} className="font-medium text-teal-400 hover:text-teal-300">Register</button></p>
        ) : (
          <p className="text-sm text-gray-400">Already have an account? <button onClick={() => setView('login')} className="font-medium text-teal-400 hover:text-teal-300">Log In</button></p>
        )}
      </div>
    </div>
  );
}

function App() {
  // The 'token' is now managed here, at the top level!
  const [token, setToken] = useState(null);

  const handleLogout = () => {
    setToken(null); // Logging out is as simple as clearing the token
  }

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white font-sans">
      {token ? (
        // If we have a token, show the Dashboard
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        // If we don't have a token, show the AuthScreen
        <AuthScreen onLoginSuccess={setToken} />
      )}
    </div>
  );
}


export default App