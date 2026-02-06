import React, { useState, useEffect } from 'react';
import { getSuggestions } from '../storage';
import { Suggestion } from '../types/theme';
import RoadmapMonth from '../components/RoadmapMonth';
import './Roadmap.css';

type MonthStatus = 'past' | 'current' | 'future';

function Roadmap(): React.ReactElement {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    setSuggestions(getSuggestions());
  }, []);

  // Get only suggestions that are scheduled (have a sprint) or are in progress/done
  const roadmapSuggestions = suggestions.filter(
    s => s.sprint && ['Planned', 'In Progress', 'Done'].includes(s.status)
  );

  // Group suggestions by sprint (month)
  const groupedByMonth = roadmapSuggestions.reduce<Record<string, Suggestion[]>>((acc, suggestion) => {
    const sprint = suggestion.sprint!;
    if (!acc[sprint]) {
      acc[sprint] = [];
    }
    acc[sprint].push(suggestion);
    return acc;
  }, {});

  // Sort months chronologically
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  // Determine which months are current, past, or future
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear();

  const categorizeMonth = (monthStr: string): MonthStatus => {
    const monthDate = new Date(monthStr);
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);

    if (monthDate < currentDate) return 'past';
    if (monthDate.getTime() === currentDate.getTime()) return 'current';
    return 'future';
  };

  return (
    <div className="roadmap-page">
      <div className="page-header">
        <h1>Product Roadmap</h1>
        <p>See what's planned and track our progress</p>
      </div>

      <div className="roadmap-legend">
        <div className="legend-item">
          <span className="legend-dot planned"></span>
          <span>Planned</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot in-progress"></span>
          <span>In Progress</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot done"></span>
          <span>Done</span>
        </div>
      </div>

      {sortedMonths.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗺️</span>
          <p>No items on the roadmap yet</p>
          <span className="empty-subtext">
            Admins can add items to the roadmap by assigning sprints to suggestions
          </span>
        </div>
      ) : (
        <div className="roadmap-timeline">
          {sortedMonths.map(month => (
            <RoadmapMonth
              key={month}
              month={month}
              suggestions={groupedByMonth[month]}
              status={categorizeMonth(month)}
              isCurrent={month === currentMonth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Roadmap;
