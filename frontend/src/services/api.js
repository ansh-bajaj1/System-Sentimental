const tokenKey = 'sentinel_token';

// Save token and username to localStorage
export const setAuthData = (token, username) => {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem('sentinel_username', username);
};

export const getAuthToken = () => {
  return localStorage.getItem(tokenKey);
};

export const getAuthUser = () => {
  return localStorage.getItem('sentinel_username');
};

export const clearAuthData = () => {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem('sentinel_username');
};

// API routes wrapper
export const apiRequest = async (url, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthData();
      // Only redirect if we are not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
};
