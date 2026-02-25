import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './Login.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!supabase) {
        setError('Password reset is not configured. Please contact support.');
        setCheckingSession(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
      setCheckingSession(false);
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('Password reset is not configured. Please contact support.');
      return;
    }
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      localStorage.removeItem('pharmacy_token');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  if (checkingSession) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Checking reset link…</div>;
  }

  if (!hasSession && !success) {
    // No valid session from Supabase magic link
    return <Navigate to="/login" replace />;
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Password updated</h1>
          <p className="login-subtitle">Your password has been reset. You can now sign in with the new password.</p>
          <a href="/login" className="btn btn-primary btn-block">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Reset password</h1>
        <p className="login-subtitle">Enter a new password for your account.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="login-input"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}

