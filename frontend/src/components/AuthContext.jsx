import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, getAuthUser, setAuthData, clearAuthData } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(getAuthUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(getAuthToken());
    setUser(getAuthUser());
    setLoading(false);
  }, []);

  const loginUser = (newToken, username) => {
    setAuthData(newToken, username);
    setToken(newToken);
    setUser(username);
  };

  const logoutUser = () => {
    clearAuthData();
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    loginUser,
    logoutUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
