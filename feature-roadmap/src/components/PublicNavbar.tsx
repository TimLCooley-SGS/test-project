import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import './PublicNavbar.css';

interface PublicNavbarProps {
  onLoginClick: () => void;
}

function PublicNavbar({ onLoginClick }: PublicNavbarProps): React.ReactElement {
  const { theme } = useTheme();
  const location = useLocation();

  return (
    <nav className="public-navbar">
      <div className="public-navbar-container">
        <Link to="/" className="public-navbar-brand">
          {theme.logos.main ? (
            <img src={theme.logos.main} alt="Logo" className="public-brand-logo" />
          ) : (
            <span className="public-brand-icon">
              <Icon name="rocket" size={28} color="var(--color-primary)" />
            </span>
          )}
          {theme.logos.showBrandName && (
            <span className="public-brand-text">{theme.logos.brandName}</span>
          )}
        </Link>

        <div className="public-navbar-links">
          <Link
            to="/"
            className={`public-nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/pricing"
            className={`public-nav-link ${location.pathname === '/pricing' ? 'active' : ''}`}
          >
            Pricing
          </Link>
        </div>

        <div className="public-navbar-actions">
          <button onClick={onLoginClick} className="public-login-btn">
            Log In
          </button>
          <button onClick={onLoginClick} className="public-signup-btn">
            Start Free Trial
          </button>
        </div>
      </div>
    </nav>
  );
}

export default PublicNavbar;
