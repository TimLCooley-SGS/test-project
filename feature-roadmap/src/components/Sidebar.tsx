import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types/theme';
import './Sidebar.css';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

interface SidebarProps {
  user: User;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, collapsed, onClick }: NavItemProps): React.ReactElement {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

function Sidebar({ user, isMobileOpen, onMobileClose }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    // Update CSS variable for main content margin
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '60px' : '240px'
    );
  }, [collapsed]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleCollapsed = (): void => {
    setCollapsed(prev => !prev);
  };

  const handleNavClick = (): void => {
    // Close mobile menu when a link is clicked
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-title">Menu</h3>
            <NavItem to="/" icon="💡" label="Suggestions" collapsed={collapsed} onClick={handleNavClick} />
            <NavItem to="/roadmap" icon="🗺️" label="Roadmap" collapsed={collapsed} onClick={handleNavClick} />
          </div>

          {user.role === 'admin' && (
            <div className="nav-section">
              <h3 className="nav-title">Admin</h3>
              <NavItem to="/admin/categories" icon="🏷️" label="Categories" collapsed={collapsed} onClick={handleNavClick} />
              <NavItem to="/admin/users" icon="👥" label="Users" collapsed={collapsed} onClick={handleNavClick} />
              <NavItem to="/admin/theme" icon="🎨" label="Theme" collapsed={collapsed} onClick={handleNavClick} />
              <NavItem to="/admin/integrations" icon="🔗" label="Integrations" collapsed={collapsed} onClick={handleNavClick} />
              <NavItem to="/admin/embed" icon="📦" label="Embed" collapsed={collapsed} onClick={handleNavClick} />
            </div>
          )}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="toggle-icon">{collapsed ? '»' : '«'}</span>
        </button>
      </aside>
    </>
  );
}

export default Sidebar;
