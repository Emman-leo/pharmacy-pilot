import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [tier, setTier]       = useState('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const api = useApi();
  const apiRef = useRef(api);

  useEffect(() => {
    const token = localStorage.getItem('pharmacy_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiRef.current.get('/auth/user')
      .then(({ user: u, profile: p, tier: t, subscription_status: ss, trial_ends_at: tea, current_period_end: cpe, is_super_admin: isa }) => {
        setUser(u);
        setProfile(p || {});
        setTier(t || 'starter');
        setSubscriptionStatus(ss || 'trial');
        setTrialEndsAt(tea);
        setCurrentPeriodEnd(cpe);
        setIsSuperAdmin(isa || false);
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
      const { user, profile, tier: t, subscription_status: ss, trial_ends_at: tea, current_period_end: cpe, is_super_admin: isa } = await api.get('/auth/user');
      setUser(user);
      setProfile(profile || {});
      setTier(t || 'starter');
      setSubscriptionStatus(ss || 'trial');
      setTrialEndsAt(tea);
      setCurrentPeriodEnd(cpe);
      setIsSuperAdmin(isa || false);
      return user;
    }
    throw new Error('Login failed');
  };

  const register = async (email, password, full_name) => {
    const { user: u, session } = await api.post('/auth/register', { email, password, full_name });
    if (session?.access_token) {
      localStorage.setItem('pharmacy_token', session.access_token);
      const { user, profile, tier: t, subscription_status: ss, trial_ends_at: tea, current_period_end: cpe, is_super_admin: isa } = await api.get('/auth/user');
      setUser(user);
      setProfile(profile || {});
      setTier(t || 'starter');
      setSubscriptionStatus(ss || 'trial');
      setTrialEndsAt(tea);
      setCurrentPeriodEnd(cpe);
      setIsSuperAdmin(isa || false);
      return user;
    }
    // No session = email confirmation required
    return null;
  };

  const logout = () => {
    localStorage.removeItem('pharmacy_token');
    setUser(null);
    setProfile(null);
    setTier('starter');
    setSubscriptionStatus('trial');
    setTrialEndsAt(null);
    setCurrentPeriodEnd(null);
    setIsSuperAdmin(false);
  };

  const value = {
    user,
    profile,
    tier,
    subscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    isSuperAdmin,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'ADMIN',
    needsOnboarding: !!user && !profile?.pharmacy_id && !isSuperAdmin,
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
