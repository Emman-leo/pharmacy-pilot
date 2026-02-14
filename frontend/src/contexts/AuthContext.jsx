import { createContext, useContext, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const token = localStorage.getItem('pharmacy_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/user')
      .then(({ user: u, profile: p }) => {
        setUser(u);
        setProfile(p || {});
      })
      .catch(() => {
        localStorage.removeItem('pharmacy_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { user: u, session } = await api.post('/auth/login', { email, password });
    if (session?.access_token) {
      localStorage.setItem('pharmacy_token', session.access_token);
      const { user, profile } = await api.get('/auth/user');
      setUser(user);
      setProfile(profile || {});
      return user;
    }
    throw new Error('Login failed');
  };

  const register = async (email, password, full_name) => {
    const { user: u, session } = await api.post('/auth/register', { email, password, full_name });
    if (session?.access_token) {
      localStorage.setItem('pharmacy_token', session.access_token);
      const { user, profile } = await api.get('/auth/user');
      setUser(user);
      setProfile(profile || {});
      return user;
    }
    return u;
  };

  const logout = () => {
    localStorage.removeItem('pharmacy_token');
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'ADMIN',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
