import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { fetchBoardSuggestions, fetchBoardCategories, boardVote, fetchPlatformBranding } from '../api';
import { generateFingerprint } from '../utils/fingerprint';
import { Category } from '../types/theme';
import Icon from '../components/Icon';
import { BoardAuthProvider } from '../context/BoardAuthContext';
import CommentSection from '../components/board/CommentSection';
import './PublicBoard.css';

const statusColors: Record<string, string> = {
  under_review: '#f59e0b',
  planned: '#3b82f6',
  in_progress: '#8b5cf6',
  done: '#10b981',
};

const statusLabels: Record<string, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
};

interface BoardSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string | null;
  status: string;
  sprint: string | null;
  votes: number;
  commentCount: number;
  createdAt: string;
  createdByName?: string;
  hasVoted: boolean;
}

function PublicBoard(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  const [suggestions, setSuggestions] = useState<BoardSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('Feature Roadmap');

  const isRoadmapView = location.pathname.endsWith('/roadmap');
  const [activeView, setActiveView] = useState<'suggestions' | 'roadmap'>(
    isRoadmapView ? 'roadmap' : 'suggestions'
  );
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sync activeView when URL changes
  useEffect(() => {
    setActiveView(location.pathname.endsWith('/roadmap') ? 'roadmap' : 'suggestions');
  }, [location.pathname]);

  // Fetch branding
  useEffect(() => {
    fetchPlatformBranding()
      .then((branding) => {
        if (branding.brandName) setBrandName(branding.brandName);
      })
      .catch(() => {});
  }, []);

  // Load data
  useEffect(() => {
    if (!slug) {
      setError('Invalid board URL');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        const fp = await generateFingerprint();
        if (cancelled) return;
        setFingerprint(fp);

        const [suggestionsData, categoriesData] = await Promise.all([
          fetchBoardSuggestions(slug!, fp),
          fetchBoardCategories(slug!),
        ]);

        if (cancelled) return;
        setSuggestions(suggestionsData);
        setCategories(categoriesData);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load board data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [slug]);

  const handleVote = useCallback(async (suggestionId: string) => {
    if (!slug || !fingerprint) return;

    setSuggestions(prev => prev.map(s => {
      if (s.id !== suggestionId) return s;
      return {
        ...s,
        hasVoted: !s.hasVoted,
        votes: s.hasVoted ? Math.max(0, s.votes - 1) : s.votes + 1,
      };
    }));

    try {
      await boardVote(slug, suggestionId, fingerprint);
    } catch {
      setSuggestions(prev => prev.map(s => {
        if (s.id !== suggestionId) return s;
        return {
          ...s,
          hasVoted: !s.hasVoted,
          votes: s.hasVoted ? Math.max(0, s.votes - 1) : s.votes + 1,
        };
      }));
    }
  }, [slug, fingerprint]);

  const filteredSuggestions = useMemo(() => {
    return suggestions
      .filter(s => filterCategory === 'all' || s.category === filterCategory)
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .sort((a, b) => b.votes - a.votes);
  }, [suggestions, filterCategory, filterStatus]);

  const roadmapMonths = useMemo(() => {
    const scheduled = suggestions.filter(s => s.sprint && ['planned', 'in_progress', 'done'].includes(s.status));
    const grouped: Record<string, BoardSuggestion[]> = {};

    scheduled.forEach(s => {
      const month = s.sprint!;
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(s);
    });

    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedMonths.map(month => ({
      month,
      items: grouped[month].sort((a, b) => b.votes - a.votes),
    }));
  }, [suggestions]);

  const statuses = ['under_review', 'planned', 'in_progress', 'done'];

  if (loading) {
    return (
      <div className="board-page">
        <div className="board-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-page">
        <div className="board-error">
          <Icon name="alert-circle" size={48} />
          <h2>Board Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <BoardAuthProvider slug={slug!}>
    <div className="board-page">
      <div className="board-container">
        <div className="board-header">
          <h1>{activeView === 'roadmap' ? 'Product Roadmap' : 'Feature Suggestions'}</h1>
          <p>
            {activeView === 'roadmap'
              ? "See what we're working on and what's coming next"
              : 'Vote on features you\'d like to see'}
          </p>
        </div>

        <div className="board-tabs">
          <button
            className={`board-tab ${activeView === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveView('suggestions')}
          >
            Suggestions
          </button>
          <button
            className={`board-tab ${activeView === 'roadmap' ? 'active' : ''}`}
            onClick={() => setActiveView('roadmap')}
          >
            Roadmap
          </button>
        </div>

        {activeView === 'suggestions' && (
          <>
            <div className="board-filters">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </div>

            <div className="board-suggestions">
              {filteredSuggestions.length === 0 ? (
                <div className="board-empty">
                  <span className="board-empty-icon"><Icon name="lightbulb" size={48} /></span>
                  <p>No suggestions yet</p>
                </div>
              ) : (
                filteredSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="board-suggestion-card">
                    <div className="board-vote">
                      <button
                        className={`board-vote-btn ${suggestion.hasVoted ? 'voted' : ''}`}
                        onClick={() => handleVote(suggestion.id)}
                        title={suggestion.hasVoted ? 'Remove vote' : 'Upvote'}
                      >
                        <span className="board-vote-arrow">&#9650;</span>
                        <span className="board-vote-count">{suggestion.votes}</span>
                      </button>
                    </div>

                    <div className="board-card-content">
                      <div className="board-card-header">
                        <h3 className="board-card-title">{suggestion.title}</h3>
                        <div className="board-card-badges">
                          {suggestion.category && (
                            <span className="board-badge category">{suggestion.category}</span>
                          )}
                          <span
                            className="board-badge status"
                            style={{ backgroundColor: statusColors[suggestion.status] }}
                          >
                            {statusLabels[suggestion.status] || suggestion.status}
                          </span>
                        </div>
                      </div>

                      {suggestion.description && (
                        <p className="board-card-description">{suggestion.description}</p>
                      )}

                      <span className="board-card-date">
                        Added {new Date(suggestion.createdAt).toLocaleDateString()}{suggestion.createdByName ? ` by ${suggestion.createdByName}` : ''}
                      </span>

                      <CommentSection
                        slug={slug!}
                        suggestionId={suggestion.id}
                        commentCount={suggestion.commentCount || 0}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeView === 'roadmap' && (
          <div className="board-roadmap">
            {roadmapMonths.length === 0 ? (
              <div className="board-empty">
                <span className="board-empty-icon"><Icon name="map" size={48} /></span>
                <p>No scheduled items yet</p>
              </div>
            ) : (
              roadmapMonths.map(({ month, items }) => (
                <div key={month} className="board-roadmap-month">
                  <div className="board-month-header">
                    <h3>{month}</h3>
                    <span className="board-month-count">{items.length} items</span>
                  </div>
                  <div className="board-month-items">
                    {items.map(item => (
                      <div key={item.id} className="board-roadmap-item">
                        <span
                          className="board-item-status"
                          style={{ backgroundColor: statusColors[item.status] }}
                        />
                        <span className="board-item-title">{item.title}</span>
                        <span className="board-item-votes">&#9650; {item.votes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="board-powered-by">
          Powered by <a href="/" rel="noopener noreferrer">{brandName}</a>
        </div>
      </div>
    </div>
    </BoardAuthProvider>
  );
}

export default PublicBoard;
