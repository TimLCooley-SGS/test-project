import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import { User } from '../../types/theme';
import './Users.css';

function Users(): React.ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';
    try {
      await api.updateUser(userId, { role: newRole });
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user role:', err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Manage Users</h1>
          <p>View users and manage their roles</p>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>
            ×
          </button>
        )}
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <p className="empty-message">
            {searchTerm ? 'No users found matching your search' : 'No users yet'}
          </p>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <div className="user-role">
                <span className={`role-badge ${user.role}`}>
                  {user.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              <button
                className={`toggle-btn ${user.role === 'admin' ? 'demote' : 'promote'}`}
                onClick={() => handleToggleRole(user.id)}
              >
                {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Users;
