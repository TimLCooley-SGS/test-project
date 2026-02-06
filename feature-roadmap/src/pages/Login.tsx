import React from 'react';
import Icon from '../components/Icon';
import './Login.css';

interface LoginProps {
  onLogin: (role: 'admin' | 'user') => void;
  onBack?: () => void;
}

function Login({ onLogin, onBack }: LoginProps): React.ReactElement {
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
          <h1>Feature Roadmap</h1>
          <p>Suggest features, vote on ideas, and track progress</p>
        </div>

        <div className="login-content">
          <h2>Demo Login</h2>
          <p className="login-info">
            This is a demo application. Choose a role to explore:
          </p>

          <div className="login-buttons">
            <button
              className="login-btn admin-btn"
              onClick={() => onLogin('admin')}
            >
              <span className="btn-icon"><Icon name="settings" size={24} /></span>
              <span className="btn-text">
                <strong>Login as Admin</strong>
                <small>Manage suggestions, users & categories</small>
              </span>
            </button>

            <button
              className="login-btn user-btn"
              onClick={() => onLogin('user')}
            >
              <span className="btn-icon"><Icon name="users" size={24} /></span>
              <span className="btn-text">
                <strong>Login as User</strong>
                <small>Submit suggestions & vote</small>
              </span>
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p>Data is stored locally in your browser</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
