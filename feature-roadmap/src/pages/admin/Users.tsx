import React, { useState, useEffect } from 'react';
import { getUsers, updateUser } from '../../storage';
import { User } from '../../types/theme';
import './Users.css';

function Users(): React.ReactElement {
  const [users, setUsersState] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setUsersState(getUsers());
  }, []);

  const handleToggleRole = (userId: string): void => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';
    const updated = updateUser(userId, { role: newRole });
    setUsersState(updated);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Manage Users</h1>
        <p>View users and manage their roles</p>
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
                  {user.role === 'admin' ? '👑 Admin' : '👤 User'}
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

      <div className="users-info">
        <p>
          <strong>Note:</strong> This is a demo. In a real application, user data would come from a database.
        </p>
      </div>
    </div>
  );
}

export default Users;
