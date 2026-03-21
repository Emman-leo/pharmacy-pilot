import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import './Login.css';

export default function Login({ defaultMode = 'login' }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const api = useApi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/app');
      } else {
        // Password strength validation for register
        if (password.length < 8) {
          setLoading(false);
          return setError('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          setLoading(false);
          return setError('Password must contain at least one uppercase letter and one number');
        }
        const user = await register(email, password, fullName);
        if (!user) {
          // No session returned — email confirmation required
          setConfirmationSent(true);
          return;
        }
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email) {
      setError('Enter your email above first.');
      return;
    }
    try {
      await api.post('/auth/forgot-password', { email });
      setResetMessage('If an account exists for this email, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  // Show confirmation message after signup
  if (confirmationSent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Check your email</h1>
          <p className="login-subtitle">
            We sent a confirmation link to <strong>{email}</strong>. 
            Click the link to activate your account, then come back to log in.
          </p>
          <button
            type="button"
            className="login-toggle"
            onClick={() => {
              setConfirmationSent(false);
              setMode('login');
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Pharmacy Pilot</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="login-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          {mode === 'login' && (
            <button
              type="button"
              className="login-forgot"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
          {error && <p className="login-error">{error}</p>}
          {resetMessage && <p className="login-reset">{resetMessage}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button type="button" className="login-toggle" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
