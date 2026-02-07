import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import './PlatformUsers.css';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
  organization_name: string;
  organization_slug: string;
  created_at: string;
  last_login_at: string | null;
}

function PlatformUsers(): React.ReactElement {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await api.fetchPlatformUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await api.updatePlatformUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleToggleSuperAdmin = async (id: string, current: boolean) => {
    try {
      await api.updatePlatformUser(id, { is_super_admin: !current });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_super_admin: !current } : u));
    } catch (err) {
      console.error('Failed to toggle super admin:', err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      await api.deletePlatformUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="platform-page"><p>Loading...</p></div>;

  return (
    <div className="platform-page">
      <div className="page-header">
        <h1>All Users</h1>
        <p>Manage users across all organizations</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or organization..."
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>×</button>
        )}
      </div>

      <div className="platform-table-wrap">
        <table className="platform-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Super Admin</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">No users found</td></tr>
            ) : (
              filtered.map(user => (
                <tr key={user.id}>
                  <td className="user-name-cell">{user.name}</td>
                  <td className="user-email-cell">{user.email}</td>
                  <td className="org-cell">{user.organization_name}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className={`sa-toggle ${user.is_super_admin ? 'on' : 'off'}`}
                      onClick={() => handleToggleSuperAdmin(user.id, user.is_super_admin)}
                    >
                      {user.is_super_admin ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="date-cell">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlatformUsers;
