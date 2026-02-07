import React, { useState } from 'react';
import { User } from '../types/theme';
import { useTheme } from '../context/ThemeContext';
import * as api from '../api';
import Icon from '../components/Icon';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
}

type Mode = 'login' | 'register' | 'forgot';

function Login({ onLoginSuccess, onBack, initialMode = 'login' }: LoginProps): React.ReactElement {
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const data = await api.forgotPassword(email);
        setSuccessMessage(data.message);
        setLoading(false);
        return;
      }

      let result: { token: string; user: User };

      if (mode === 'login') {
        result = await api.login(email, password);
      } else {
        if (!name.trim() || !organizationName.trim()) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        result = await api.register(organizationName.trim(), name.trim(), email, password);
      }

      api.setToken(result.token);
      onLoginSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {onBack && (
          <button className="login-back-btn" onClick={onBack}>
            <Icon name="chevron-left" size={20} />
            Back
          </button>
        )}
        <div className="login-header">
          <h1>{theme.logos.brandName}</h1>
          <p>Suggest features, vote on ideas, and track progress</p>
        </div>

        <div className="login-content">
          <h2>
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Forgot Password'}
          </h2>
          <p className="login-info">
            {mode === 'login'
              ? 'Sign in to your account'
              : mode === 'register'
                ? 'Register a new organization'
                : 'Enter your email to receive a reset link'}
          </p>

          {error && <div className="login-error">{error}</div>}
          {successMessage && <div className="login-success">{successMessage}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-field">
                  <label htmlFor="orgName">Organization Name</label>
                  <input
                    id="orgName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Your company name"
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="name">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <div className="password-field-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="forgot-link-wrapper">
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => { setMode('forgot'); setError(''); setSuccessMessage(''); }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
            </button>
          </form>

          <div className="login-toggle">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button className="toggle-link" onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}>
                  Create one
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button className="toggle-link" onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
