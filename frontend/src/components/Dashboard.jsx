// This component receives the token and a function to handle logging out
function Dashboard({ token, onLogout }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-teal-400">Welcome to the Game of Becoming Dashboard!</h1>
      <p className="mt-4 text-gray-300">You are successfully logged in.</p>
      
      {/* A button to log out */}
      <div className="mt-8">
        <button
          onClick={onLogout}
          className="py-2 px-4 border rounded-md font-medium text-white bg-red-600 hover:bg-red-700"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;