import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSuggestions, getCategories, getEmbedConfig, updateSuggestion, addSuggestion, generateId } from '../storage';
import { Suggestion } from '../types/theme';
import { EmbedView as EmbedViewType } from '../types/embed';
import Icon from '../components/Icon';
import './EmbedView.css';

const statusColors: Record<string, string> = {
  'Under Review': '#f59e0b',
  'Planned': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Done': '#10b981',
};

function EmbedView(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<EmbedViewType>('suggestions');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Get config and URL params
  const config = getEmbedConfig();
  const showHeader = searchParams.get('header') !== 'false';
  const showVoting = searchParams.get('voting') !== 'false';
  const showFilters = searchParams.get('filters') !== 'false';
  const allowSubmit = searchParams.get('submit') === 'true';
  const view = (searchParams.get('view') as EmbedViewType) || config.defaultView;
  const customCssEnabled = searchParams.get('css') === 'custom';

  useEffect(() => {
    setSuggestions(getSuggestions());
    setCategories(getCategories());
    setActiveView(view);
  }, [view]);

  // Inject custom CSS if enabled
  useEffect(() => {
    if (customCssEnabled && config.customCss) {
      const style = document.createElement('style');
      style.id = 'embed-custom-css';
      style.textContent = config.customCss;
      document.head.appendChild(style);

      return () => {
        const existing = document.getElementById('embed-custom-css');
        if (existing) existing.remove();
      };
    }
  }, [customCssEnabled, config.customCss]);

  const handleVote = (suggestionId: string) => {
    if (!showVoting) return;

    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // For embed, we use a simple localStorage key for anonymous voting
    const votedKey = `embed_voted_${suggestionId}`;
    const hasVoted = localStorage.getItem(votedKey) === 'true';

    let updates: Partial<Suggestion>;

    if (hasVoted) {
      updates = { votes: Math.max(0, suggestion.votes - 1) };
      localStorage.removeItem(votedKey);
    } else {
      updates = { votes: suggestion.votes + 1 };
      localStorage.setItem(votedKey, 'true');
    }

    const updated = updateSuggestion(suggestionId, updates);
    setSuggestions(updated);
  };

  const hasVoted = (suggestionId: string): boolean => {
    return localStorage.getItem(`embed_voted_${suggestionId}`) === 'true';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newCategory) return;

    const newSuggestion: Suggestion = {
      id: generateId(),
      title: newTitle,
      description: newDescription,
      category: newCategory,
      status: 'Under Review',
      sprint: null,
      votes: 0,
      votedBy: [],
      createdBy: 'embed-user',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = addSuggestion(newSuggestion);
    setSuggestions(updated);
    setShowForm(false);
    setNewTitle('');
    setNewDescription('');
    setNewCategory('');
  };

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions
      .filter(s => filterCategory === 'all' || s.category === filterCategory)
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .sort((a, b) => b.votes - a.votes);
  }, [suggestions, filterCategory, filterStatus]);

  // Group by month for roadmap view
  const roadmapMonths = useMemo(() => {
    const scheduled = suggestions.filter(s => s.sprint && ['Planned', 'In Progress', 'Done'].includes(s.status));
    const grouped: Record<string, Suggestion[]> = {};

    scheduled.forEach(s => {
      const month = s.sprint!;
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(s);
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedMonths.map(month => ({
      month,
      items: grouped[month].sort((a, b) => b.votes - a.votes),
    }));
  }, [suggestions]);

  const statuses = ['Under Review', 'Planned', 'In Progress', 'Done'];

  return (
    <div className="embed-view">
      {showHeader && (
        <div className="embed-header">
          <h1>{activeView === 'roadmap' ? 'Product Roadmap' : 'Feature Suggestions'}</h1>
          <p>
            {activeView === 'roadmap'
              ? 'See what we\'re working on and what\'s coming next'
              : 'Vote on features you\'d like to see'}
          </p>
        </div>
      )}

      {config.allowedViews.length > 1 && config.allowedViews.includes('both') === false && (
        <div className="embed-tabs">
          {config.allowedViews.includes('suggestions') && (
            <button
              className={`embed-tab ${activeView === 'suggestions' ? 'active' : ''}`}
              onClick={() => setActiveView('suggestions')}
            >
              Suggestions
            </button>
          )}
          {config.allowedViews.includes('roadmap') && (
            <button
              className={`embed-tab ${activeView === 'roadmap' ? 'active' : ''}`}
              onClick={() => setActiveView('roadmap')}
            >
              Roadmap
            </button>
          )}
        </div>
      )}

      {activeView === 'suggestions' && (
        <>
          {showFilters && (
            <div className="embed-filters">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}

          {showForm && allowSubmit && (
            <form onSubmit={handleSubmit} className="embed-suggestion-card" style={{ marginBottom: '12px' }}>
              <div className="embed-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Suggestion title..."
                  style={{
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.95rem',
                  }}
                  required
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your suggestion..."
                  rows={3}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                  required
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ flex: 1, padding: '10px' }}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button type="submit" style={{
                    padding: '10px 20px',
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    color: 'white',
                    cursor: 'pointer',
                  }}>
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="embed-suggestions">
            {filteredSuggestions.length === 0 ? (
              <div className="embed-empty">
                <span className="embed-empty-icon"><Icon name="lightbulb" size={48} /></span>
                <p>No suggestions yet</p>
              </div>
            ) : (
              filteredSuggestions.map(suggestion => (
                <div key={suggestion.id} className="embed-suggestion-card">
                  <div className="embed-vote">
                    <button
                      className={`embed-vote-btn ${hasVoted(suggestion.id) ? 'voted' : ''} ${!showVoting ? 'disabled' : ''}`}
                      onClick={() => handleVote(suggestion.id)}
                      disabled={!showVoting}
                      title={showVoting ? (hasVoted(suggestion.id) ? 'Remove vote' : 'Upvote') : 'Voting disabled'}
                    >
                      <span className="embed-vote-arrow">▲</span>
                      <span className="embed-vote-count">{suggestion.votes}</span>
                    </button>
                  </div>

                  <div className="embed-card-content">
                    <div className="embed-card-header">
                      <h3 className="embed-card-title">{suggestion.title}</h3>
                      <div className="embed-card-badges">
                        <span className="embed-badge category">{suggestion.category}</span>
                        <span
                          className="embed-badge status"
                          style={{ backgroundColor: statusColors[suggestion.status] }}
                        >
                          {suggestion.status}
                        </span>
                      </div>
                    </div>

                    <p className="embed-card-description">{suggestion.description}</p>

                    <span className="embed-card-date">
                      Added {new Date(suggestion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {allowSubmit && !showForm && (
            <button className="embed-submit-btn" onClick={() => setShowForm(true)}>
              + New Suggestion
            </button>
          )}
        </>
      )}

      {activeView === 'roadmap' && (
        <div className="embed-roadmap">
          {roadmapMonths.length === 0 ? (
            <div className="embed-empty">
              <span className="embed-empty-icon"><Icon name="map" size={48} /></span>
              <p>No scheduled items yet</p>
            </div>
          ) : (
            roadmapMonths.map(({ month, items }) => (
              <div key={month} className="embed-roadmap-month">
                <div className="embed-month-header">
                  <h3>{month}</h3>
                  <span className="embed-month-count">{items.length} items</span>
                </div>
                <div className="embed-month-items">
                  {items.map(item => (
                    <div key={item.id} className="embed-roadmap-item">
                      <span
                        className="embed-item-status"
                        style={{ backgroundColor: statusColors[item.status] }}
                      />
                      <span className="embed-item-title">{item.title}</span>
                      <span className="embed-item-votes">▲ {item.votes}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="embed-powered-by">
        Powered by <a href="/" target="_blank" rel="noopener noreferrer">Feature Roadmap</a>
      </div>
    </div>
  );
}

export default EmbedView;
