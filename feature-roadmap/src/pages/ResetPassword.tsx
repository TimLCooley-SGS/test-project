import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import Icon from '../components/Icon';
import './ResetPassword.css';

function ResetPassword(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Feature Roadmap</h1>
          <p>Reset your password</p>
        </div>

        <div className="login-content">
          {success ? (
            <div className="reset-success">
              <Icon name="check" size={32} color="#16a34a" />
              <h2>Password Reset!</h2>
              <p>Your password has been reset successfully.</p>
              <button
                className="login-submit-btn"
                onClick={() => navigate('/')}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h2>Set New Password</h2>
              <p className="login-info">Enter your new password below</p>

              {error && <div className="login-error">{error}</div>}

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-field">
                  <label htmlFor="password">New Password</label>
                  <div className="password-field-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
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
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    minLength={8}
                  />
                </div>

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? 'Please wait...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
