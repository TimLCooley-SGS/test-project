import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/theme';
import Icon from './Icon';
import './Navbar.css';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

function Navbar({ user, onLogout, onMenuToggle, isMobileMenuOpen }: NavbarProps): React.ReactElement {
  const { theme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className={`hamburger-btn ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div className="navbar-brand">
          {theme.logos.main ? (
            <img src={theme.logos.main} alt="Logo" className="brand-logo" />
          ) : (
            <span className="brand-icon">
              <Icon name="rocket" size={24} color="var(--color-primary)" />
            </span>
          )}
          {theme.logos.showBrandName && (
            <span className="brand-text">{theme.logos.brandName}</span>
          )}
        </div>
      </div>
      <div className="navbar-user">
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className={`user-role ${user.role}`}>{user.role}</span>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
