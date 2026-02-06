import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ user }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Menu</h3>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">💡</span>
            <span>Suggestions</span>
          </NavLink>
          <NavLink to="/roadmap" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🗺️</span>
            <span>Roadmap</span>
          </NavLink>
        </div>

        {user.role === 'admin' && (
          <div className="nav-section">
            <h3 className="nav-title">Admin</h3>
            <NavLink to="/admin/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏷️</span>
              <span>Categories</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👥</span>
              <span>Users</span>
            </NavLink>
            <NavLink to="/admin/theme" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🎨</span>
              <span>Theme</span>
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
