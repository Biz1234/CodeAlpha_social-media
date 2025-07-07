
import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="space-x-4">
          <Link to="/" className="text-blue-500 hover:underline font-semibold">
            Home
          </Link>
          {user && (
            <>
              <Link
                to={`/profile/${user.username}`}
                className="text-blue-500 hover:underline font-semibold"
              >
                Profile
              </Link>
              <Link
                to="/messages"
                className="text-blue-500 hover:underline font-semibold"
              >
                Messages
              </Link>
            </>
          )}
        </div>
        <div className="space-x-4">
          {user ? (
            <>
              <span className="text-gray-600">@{user.username}</span>
              <button
                onClick={handleLogout}
                className="text-blue-500 hover:underline font-semibold"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-blue-500 hover:underline font-semibold">
                Login
              </Link>
              <Link to="/register" className="text-blue-500 hover:underline font-semibold">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
