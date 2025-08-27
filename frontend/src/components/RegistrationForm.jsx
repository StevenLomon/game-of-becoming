import { useState } from 'react';
import { registerUser } from '../services/api';

// We receive a function 'onRegisterSuccess' as a prop
function RegistrationForm({ onRegisterSuccess }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // HRGA state is removed
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        try {
            const registerData = await registerUser({ name, email, password });

            // If registration is successful, call the function passed in from the parent
            onRegisterSuccess();

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
            <h2 className="text-3xl font-bold text-center text-white">Create Account</h2>
            {/* Name Input */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                <input
                    id="name" type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
            </div>
            {/* Email Input */}
            <div>
                <label htmlFor="email-reg" className="block text-sm font-medium text-gray-300">Email</label>
                <input
                    id="email-reg" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
            </div>
            {/* Password Input */}
            <div>
                <label htmlFor="password-reg" className="block text-sm font-medium text-gray-300">Password</label>
                <input
                    id="password-reg" type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
            </div>
            {/* HRGA Input has been removed */}

            {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            <div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border rounded-md font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
                >
                    Register
                </button>
            </div>
        </form>
    );
}

export default RegistrationForm;