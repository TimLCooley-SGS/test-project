import React, { useState } from 'react';
import { Suggestion } from '../types/theme';
import './RoadmapMonth.css';

interface ExtendedSuggestion extends Suggestion {
  rolledOver?: boolean;
  originalSprint?: string | null;
}

interface RoadmapMonthProps {
  month: string;
  suggestions: ExtendedSuggestion[];
  status: 'past' | 'current' | 'future';
  isCurrent: boolean;
}

const statusColors: Record<string, string> = {
  'Planned': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Done': '#10b981',
};

function RoadmapMonth({ month, suggestions, status, isCurrent }: RoadmapMonthProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(status !== 'past');

  // Count by status
  const counts = suggestions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`roadmap-month ${status} ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="month-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="month-info">
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <h3 className="month-title">
            {month}
            {isCurrent && <span className="current-badge">Current</span>}
          </h3>
        </div>
        <div className="month-stats">
          {counts['Done'] > 0 && (
            <span className="stat done">{counts['Done']} done</span>
          )}
          {counts['In Progress'] > 0 && (
            <span className="stat in-progress">{counts['In Progress']} in progress</span>
          )}
          {counts['Planned'] > 0 && (
            <span className="stat planned">{counts['Planned']} planned</span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="month-content">
          {suggestions.map(suggestion => (
            <div key={suggestion.id} className={`roadmap-item ${suggestion.rolledOver ? 'rolled-over' : ''}`}>
              <span
                className="item-status-dot"
                style={{ backgroundColor: statusColors[suggestion.status] }}
              ></span>
              <div className="item-content">
                <div className="item-header">
                  <h4 className="item-title">{suggestion.title}</h4>
                  {suggestion.rolledOver && suggestion.originalSprint && (
                    <span className="rolled-over-badge" title={`Originally scheduled for ${suggestion.originalSprint}`}>
                      ↻ from {suggestion.originalSprint}
                    </span>
                  )}
                </div>
                <p className="item-description">{suggestion.description}</p>
                <div className="item-meta">
                  <span className="item-category">{suggestion.category}</span>
                  <span
                    className="item-status"
                    style={{ color: statusColors[suggestion.status] }}
                  >
                    {suggestion.status}
                  </span>
                  <span className="item-votes">
                    ▲ {suggestion.votes} votes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoadmapMonth;
