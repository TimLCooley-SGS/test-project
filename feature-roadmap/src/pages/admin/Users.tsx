import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api';
import { User } from '../../types/theme';
import Icon from '../../components/Icon';
import './Users.css';

interface UsersProps {
  user: User;
}

function Users({ user }: UsersProps): React.ReactElement {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const maxUsers = user.planLimits?.maxUsers ?? 0;
  const atLimit = maxUsers > 0 && users.length >= maxUsers;

  const loadUsers = async (): Promise<void> => {
    try {
      const data = await api.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (userId: string): Promise<void> => {
    const u = users.find(u => u.id === userId);
    if (!u) return;

    const newRole: 'admin' | 'user' = u.role === 'admin' ? 'user' : 'admin';
    try {
      await api.updateUser(userId, { role: newRole });
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user role:', err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);

    try {
      await api.inviteUser(inviteEmail, inviteName, inviteRole);
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteForm(false);
      await loadUsers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddUserClick = (): void => {
    setInviteError('');
    setInviteSuccess('');
    setShowInviteForm(true);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Manage Users</h1>
          <p>View users and manage their roles</p>
        </div>
        {!showInviteForm && (
          <button className="add-user-btn" onClick={handleAddUserClick}>
            + Add User
          </button>
        )}
      </div>

      {inviteSuccess && (
        <div className="invite-banner success">
          <Icon name="check" size={16} color="#16a34a" />
          <span>{inviteSuccess}</span>
          <button className="banner-close" onClick={() => setInviteSuccess('')}>&times;</button>
        </div>
      )}

      {inviteError && !showInviteForm && (
        <div className="invite-banner error">
          <span>{inviteError}</span>
          <button className="banner-close" onClick={() => setInviteError('')}>&times;</button>
        </div>
      )}

      {showInviteForm && (
        atLimit ? (
          <div className="invite-form-card limit-reached">
            <div className="limit-reached-content">
              <Icon name="lock" size={28} color="var(--color-textSecondary)" />
              <div>
                <h3>User Limit Reached</h3>
                <p>Your plan allows a maximum of {maxUsers} users. Upgrade to add more team members.</p>
              </div>
            </div>
            <div className="limit-reached-actions">
              <button className="btn-upgrade-inline" onClick={() => navigate('/admin/billing')}>
                Upgrade Plan
              </button>
              <button className="btn-cancel-inline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form className="invite-form-card" onSubmit={handleInviteSubmit}>
            <h3>Invite New User</h3>
            {inviteError && (
              <div className="invite-form-error">{inviteError}</div>
            )}
            <div className="invite-form-fields">
              <div className="invite-field">
                <label htmlFor="invite-name">Name</label>
                <input
                  id="invite-name"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="invite-field">
                <label htmlFor="invite-email">Email</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="invite-field">
                <label htmlFor="invite-role">Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="invite-form-actions">
              <button type="submit" className="btn-invite" disabled={inviteLoading}>
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
              <button type="button" className="btn-cancel-inline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )
      )}

      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>
            &times;
          </button>
        )}
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <p className="empty-message">
            {searchTerm ? 'No users found matching your search' : 'No users yet'}
          </p>
        ) : (
          filteredUsers.map(u => (
            <div key={u.id} className="user-item">
              <div className="user-avatar">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{u.name}</span>
                <span className="user-email">{u.email}</span>
              </div>
              <div className="user-role">
                <span className={`role-badge ${u.role}`}>
                  {u.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              <button
                className={`toggle-btn ${u.role === 'admin' ? 'demote' : 'promote'}`}
                onClick={() => handleToggleRole(u.id)}
              >
                {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
              </button>
            </div>
          ))
        )}
      </div>

      {maxUsers > 0 && (
        <div className="users-info">
          <p>{users.length} of {maxUsers} users allowed</p>
        </div>
      )}
    </div>
  );
}

export default Users;
