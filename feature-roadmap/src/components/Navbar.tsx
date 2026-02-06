import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/theme';
import './Navbar.css';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

function Navbar({ user, onLogout }: NavbarProps): React.ReactElement {
  const { theme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {theme.logos.main ? (
          <img src={theme.logos.main} alt="Logo" className="brand-logo" />
        ) : (
          <span className="brand-icon">🚀</span>
        )}
        {theme.logos.showBrandName && (
          <span className="brand-text">{theme.logos.brandName}</span>
        )}
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
