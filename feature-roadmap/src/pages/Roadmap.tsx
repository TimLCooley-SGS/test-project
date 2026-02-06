import React, { useState, useEffect, useMemo } from 'react';
import { getSuggestions } from '../storage';
import { Suggestion } from '../types/theme';
import RoadmapMonth from '../components/RoadmapMonth';
import './Roadmap.css';

type MonthStatus = 'past' | 'current' | 'future';
type ViewMode = 'current' | 'past';

function Roadmap(): React.ReactElement {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  useEffect(() => {
    setSuggestions(getSuggestions());
  }, []);

  // Get current month info - memoized to avoid recalculation on every render
  const { currentMonthDate, currentMonth } = useMemo(() => {
    const now = new Date();
    return {
      currentMonthDate: new Date(now.getFullYear(), now.getMonth(), 1),
      currentMonth: now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear(),
    };
  }, []);

  // Parse month string to Date
  const parseMonth = (monthStr: string): Date => {
    return new Date(monthStr);
  };

  // Categorize a month as past, current, or future
  const categorizeMonth = (monthStr: string): MonthStatus => {
    const monthDate = parseMonth(monthStr);
    if (monthDate < currentMonthDate) return 'past';
    if (monthDate.getTime() === currentMonthDate.getTime()) return 'current';
    return 'future';
  };

  // Process suggestions: auto-rollover incomplete past items to current month
  const processedSuggestions = useMemo(() => {
    return suggestions
      .filter(s => s.sprint && ['Planned', 'In Progress', 'Done'].includes(s.status))
      .map(suggestion => {
        const sprintDate = parseMonth(suggestion.sprint!);
        // If item is in a past month and NOT done, roll it over to current month
        if (sprintDate < currentMonthDate && suggestion.status !== 'Done') {
          return {
            ...suggestion,
            sprint: currentMonth,
            rolledOver: true,
            originalSprint: suggestion.sprint,
          };
        }
        return { ...suggestion, rolledOver: false, originalSprint: null };
      });
  }, [suggestions, currentMonth, currentMonthDate]);

  // Filter by search term
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return processedSuggestions;
    const term = searchTerm.toLowerCase();
    return processedSuggestions.filter(
      s => s.title.toLowerCase().includes(term) ||
           s.description.toLowerCase().includes(term) ||
           s.category.toLowerCase().includes(term)
    );
  }, [processedSuggestions, searchTerm]);

  // Group suggestions by sprint (month)
  const groupedByMonth = filteredSuggestions.reduce<Record<string, (Suggestion & { rolledOver: boolean; originalSprint: string | null })[]>>((acc, suggestion) => {
    const sprint = suggestion.sprint!;
    if (!acc[sprint]) {
      acc[sprint] = [];
    }
    acc[sprint].push(suggestion);
    return acc;
  }, {});

  // Separate and sort months
  const allMonths = Object.keys(groupedByMonth);

  const futureMonths = allMonths
    .filter(m => categorizeMonth(m) === 'future')
    .sort((a, b) => parseMonth(a).getTime() - parseMonth(b).getTime());

  const currentMonths = allMonths.filter(m => categorizeMonth(m) === 'current');

  const pastMonths = allMonths
    .filter(m => categorizeMonth(m) === 'past')
    .sort((a, b) => parseMonth(b).getTime() - parseMonth(a).getTime()); // Most recent first

  // Current view: current month first, then future months
  const currentViewMonths = [...currentMonths, ...futureMonths];

  // Determine which months to display based on view mode
  const displayMonths = viewMode === 'current' ? currentViewMonths : pastMonths;

  return (
    <div className="roadmap-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Product Roadmap</h1>
          <p>See what's planned and track our progress</p>
        </div>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'current' ? 'active' : ''}`}
            onClick={() => setViewMode('current')}
          >
            Current
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'past' ? 'active' : ''}`}
            onClick={() => setViewMode('past')}
          >
            Past Releases
          </button>
        </div>
      </div>

      <div className="roadmap-controls">
        <div className="roadmap-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roadmap items..."
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
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
      </div>

      {displayMonths.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗺️</span>
          {searchTerm ? (
            <>
              <p>No items match your search</p>
              <span className="empty-subtext">Try a different search term</span>
            </>
          ) : viewMode === 'current' ? (
            <>
              <p>No items on the roadmap yet</p>
              <span className="empty-subtext">
                Admins can add items to the roadmap by assigning sprints to suggestions
              </span>
            </>
          ) : (
            <>
              <p>No past releases</p>
              <span className="empty-subtext">
                Completed items from previous months will appear here
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="roadmap-timeline">
          {displayMonths.map(month => (
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
