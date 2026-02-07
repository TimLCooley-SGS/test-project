import React, { useState } from 'react';
import { Suggestion, User } from '../types/theme';
import PushToIntegration from './PushToIntegration';
import Icon from './Icon';
import { formatCurrency } from '../storage';
import './SuggestionCard.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  user: User;
  onVote: (id: string) => void;
  onShare: (suggestion: Suggestion) => void;
  onStatusChange: (id: string, status: string) => void;
  onSprintChange: (id: string, sprint: string) => void;
  onRequirementsChange: (id: string, requirements: string) => void;
  onJiraSync: (id: string) => void;
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
  onRequirementsChange,
  onJiraSync,
}: SuggestionCardProps): React.ReactElement {
  const hasVoted = suggestion.votedBy.includes(user.id);
  const isAdmin = user.role === 'admin';
  const [showRequirements, setShowRequirements] = useState(!!suggestion.requirements);
  const [requirements, setRequirements] = useState(suggestion.requirements || '');
  const [jiraSuccess, setJiraSuccess] = useState(false);

  const impactScore = suggestion.impactScore || 0;

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

  const handleRequirementsChange = (value: string): void => {
    setRequirements(value);
    onRequirementsChange(suggestion.id, value);
  };

  const handleAddToJira = (): void => {
    onJiraSync(suggestion.id);
    setJiraSuccess(true);
    setTimeout(() => setJiraSuccess(false), 3000);
  };

  return (
    <div className="suggestion-card">
      <div className="card-vote">
        <button
          className={`vote-btn ${hasVoted ? 'voted' : ''}`}
          onClick={() => onVote(suggestion.id)}
          title={hasVoted ? 'Remove vote' : 'Upvote'}
        >
          <span className="vote-arrow"><Icon name="chevron-up" size={16} /></span>
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
              <span className="sprint-badge"><Icon name="calendar" size={12} /> {suggestion.sprint}</span>
            )}
            {suggestion.jiraSynced && (
              <span className="jira-badge"><Icon name="external-link" size={12} /> In Jira</span>
            )}
            {isAdmin && impactScore > 0 && (
              <span className="impact-badge" title="Impact Score based on customer value">
                <Icon name="chevron-up" size={12} /> {formatCurrency(impactScore)}
              </span>
            )}
          </div>
        </div>

        <p className="card-description">{suggestion.description}</p>

        <div className="card-footer">
          <span className="card-date">
            Added {new Date(suggestion.createdAt).toLocaleDateString()}{suggestion.createdByName ? ` by ${suggestion.createdByName}` : ''}
          </span>

          <div className="card-actions">
            <button className="action-btn share-btn" onClick={() => onShare(suggestion)}>
              <Icon name="share" size={14} /> Share
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

            <button
              className={`requirements-btn ${showRequirements ? 'active' : ''}`}
              onClick={() => setShowRequirements(!showRequirements)}
            >
              <Icon name="file-text" size={14} /> {suggestion.requirements ? 'Edit Requirements' : 'Create Requirements'}
            </button>

            <PushToIntegration suggestion={suggestion} userId={user.id} />
          </div>
        )}

        {isAdmin && showRequirements && (
          <div className="requirements-section">
            <div className="requirements-header">
              <h4>Requirements</h4>
              {suggestion.jiraSynced && suggestion.jiraSyncedAt && (
                <span className="synced-info">
                  Synced to Jira on {new Date(suggestion.jiraSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <textarea
              className="requirements-input"
              value={requirements}
              onChange={(e) => handleRequirementsChange(e.target.value)}
              placeholder="Define the requirements for this feature...

Example:
- User Story: As a user, I want to...
- Acceptance Criteria:
  1. Given... When... Then...
  2. Given... When... Then...
- Technical Notes:
  - API endpoints needed
  - Database changes
  - UI components"
              rows={8}
            />
            <div className="requirements-actions">
              {jiraSuccess ? (
                <div className="jira-success">
                  <Icon name="check" size={14} /> Successfully added to Jira!
                </div>
              ) : (
                <button
                  className="jira-btn"
                  onClick={handleAddToJira}
                  disabled={!requirements.trim() || suggestion.jiraSynced}
                >
                  <Icon name="external-link" size={14} /> {suggestion.jiraSynced ? 'Already in Jira' : 'Add to Jira'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuggestionCard;
