import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types/theme';
import './Sidebar.css';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

interface SidebarProps {
  user: User;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  collapsed: boolean;
}

function NavItem({ to, icon, label, collapsed }: NavItemProps): React.ReactElement {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

function Sidebar({ user }: SidebarProps): React.ReactElement {
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

  const toggleCollapsed = (): void => {
    setCollapsed(prev => !prev);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Menu</h3>
          <NavItem to="/" icon="💡" label="Suggestions" collapsed={collapsed} />
          <NavItem to="/roadmap" icon="🗺️" label="Roadmap" collapsed={collapsed} />
        </div>

        {user.role === 'admin' && (
          <div className="nav-section">
            <h3 className="nav-title">Admin</h3>
            <NavItem to="/admin/categories" icon="🏷️" label="Categories" collapsed={collapsed} />
            <NavItem to="/admin/users" icon="👥" label="Users" collapsed={collapsed} />
            <NavItem to="/admin/theme" icon="🎨" label="Theme" collapsed={collapsed} />
            <NavItem to="/admin/integrations" icon="🔗" label="Integrations" collapsed={collapsed} />
            <NavItem to="/admin/embed" icon="📦" label="Embed" collapsed={collapsed} />
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
  );
}

export default Sidebar;
