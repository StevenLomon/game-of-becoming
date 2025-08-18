import { useState } from 'react';
import LoginForm from './components/LoginForm'
import RegistrationForm from './components/RegistrationForm';

function App() {
  // A piece of state to track which view to show
  const [view, setView] = useState('login');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // This function will be passed down to the RegistrationForm
  const handleRegisterSuccess = () => {
    setRegistrationSuccess(true);
    setView('login'); // Switch back to the login view
  }


  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white font-sans">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        
        {/* Show a success message after registration */}
        {registrationSuccess && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6 text-center">
            Registration successful! Please log in.
          </div>
        )}

        {/* Conditional rendering */}
        {view == 'login' ? (
         <LoginForm /> 
        ) : (
          <RegistrationForm onRegisterSuccess={handleRegisterSuccess} />
        )}

        {/* Link to toggle between views */}
        <div className="mt-6 text-center">
          {view === 'login' ? (
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <button onClick={() => setView('register')} className="font-medium text-teal-400 hover:text-teal-300">
                Register
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <button onClick={() => setView('login')} className="font-medium text-teal-400 hover:text-teal-300">
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


export default App