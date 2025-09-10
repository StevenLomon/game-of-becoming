/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        // UPDATED: This animation creates a more subtle "heartbeat" pulse
        // by gently scaling the orb up and changing its opacity.
        'pulse-heartbeat': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.1)', opacity: '1' },
        }
      },
      animation: {
        // We give it a new name to be clear about its purpose.
        'pulse-heartbeat': 'pulse-heartbeat 2s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}