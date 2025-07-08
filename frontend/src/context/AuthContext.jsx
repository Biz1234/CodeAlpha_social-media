import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios
        .get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          console.log('AuthContext: User fetched:', response.data);
          setUser(response.data);
        })
        .catch((err) => {
          console.error('AuthContext: Fetch user error:', err.response?.data, err.response?.status, err.message);
          localStorage.removeItem('token');
          setUser(null);
        });
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      console.log('AuthContext: Login successful:', response.data.user);
    } catch (err) {
      console.error('AuthContext: Login error:', err.response?.data, err.response?.status, err.message);
      throw err;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      console.log('AuthContext: Register successful:', response.data.user);
    } catch (err) {
      console.error('AuthContext: Register error:', err.response?.data, err.response?.status, err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    console.log('AuthContext: Logged out');
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('token');
    if (token && user) {
      try {
        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('AuthContext: Profile refreshed:', response.data);
        setUser(response.data);
      } catch (err) {
        console.error('AuthContext: Refresh profile error:', err.response?.data, err.response?.status, err.message);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};