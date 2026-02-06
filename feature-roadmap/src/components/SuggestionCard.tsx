import React from 'react';
import { Suggestion, User } from '../types/theme';
import './SuggestionCard.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  user: User;
  onVote: (id: string) => void;
  onShare: (suggestion: Suggestion) => void;
  onStatusChange: (id: string, status: string) => void;
  onSprintChange: (id: string, sprint: string) => void;
}

const statusColors: Record<string, string> = {
  'Under Review': '#f59e0b',
  'Planned': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Done': '#10b981',
};

const statuses = ['Under Review', 'Planned', 'In Progress', 'Done'];

function SuggestionCard({
  suggestion,
  user,
  onVote,
  onShare,
  onStatusChange,
  onSprintChange,
}: SuggestionCardProps): React.ReactElement {
  const hasVoted = suggestion.votedBy.includes(user.id);
  const isAdmin = user.role === 'admin';

  // Generate sprint options (current month + next 6 months)
  const getSprintOptions = (): string[] => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      options.push(`${monthName} ${year}`);
    }
    return options;
  };

  return (
    <div className="suggestion-card">
      <div className="card-vote">
        <button
          className={`vote-btn ${hasVoted ? 'voted' : ''}`}
          onClick={() => onVote(suggestion.id)}
          title={hasVoted ? 'Remove vote' : 'Upvote'}
        >
          <span className="vote-arrow">▲</span>
          <span className="vote-count">{suggestion.votes}</span>
        </button>
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{suggestion.title}</h3>
          <div className="card-badges">
            <span className="category-badge">{suggestion.category}</span>
            <span
              className="status-badge"
              style={{ backgroundColor: statusColors[suggestion.status] }}
            >
              {suggestion.status}
            </span>
            {suggestion.sprint && (
              <span className="sprint-badge">📅 {suggestion.sprint}</span>
            )}
          </div>
        </div>

        <p className="card-description">{suggestion.description}</p>

        <div className="card-footer">
          <span className="card-date">
            Added {new Date(suggestion.createdAt).toLocaleDateString()}
          </span>

          <div className="card-actions">
            <button className="action-btn share-btn" onClick={() => onShare(suggestion)}>
              📋 Share
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="admin-controls">
            <div className="control-group">
              <label>Status:</label>
              <select
                value={suggestion.status}
                onChange={(e) => onStatusChange(suggestion.id, e.target.value)}
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Sprint:</label>
              <select
                value={suggestion.sprint || ''}
                onChange={(e) => onSprintChange(suggestion.id, e.target.value)}
              >
                <option value="">Not scheduled</option>
                {getSprintOptions().map(sprint => (
                  <option key={sprint} value={sprint}>{sprint}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuggestionCard;
