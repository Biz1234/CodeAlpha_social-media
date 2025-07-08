import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      console.log('AuthContext: Token found:', !!token);
      if (token) {
        try {
          const response = await axios.get('http://localhost:5000/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log('AuthContext: User fetched:', response.data);
          setUser(response.data);
          setLoading(false);
        } catch (err) {
          console.error('AuthContext: Token validation error:', err.response?.data?.error, err.response?.status);
          localStorage.removeItem('token');
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    };
    validateToken();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });
      console.log('AuthContext: Login successful:', response.data.user);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('AuthContext: Login error:', error.response?.data?.error);
      throw error.response?.data?.error || 'Login failed';
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password,
      });
      console.log('AuthContext: Registration successful');
    } catch (error) {
      console.error('AuthContext: Registration error:', error.response?.data?.error);
      throw error.response?.data?.error || 'Registration failed';
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="text-center mt-10 text-gray-600">Authenticating...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;