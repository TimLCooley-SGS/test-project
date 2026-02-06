import React from 'react';
import { User } from '../types/theme';
import './Navbar.css';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

function Navbar({ user, onLogout }: NavbarProps): React.ReactElement {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🚀</span>
        <span className="brand-text">Feature Roadmap</span>
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
