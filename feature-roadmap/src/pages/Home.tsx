import React, { useState, useEffect } from 'react';
import { getSuggestions, addSuggestion, updateSuggestion, generateId, getCategories } from '../storage';
import { Suggestion, User } from '../types/theme';
import SuggestionForm from '../components/SuggestionForm';
import SuggestionCard from '../components/SuggestionCard';
import Icon from '../components/Icon';
import './Home.css';

interface HomeProps {
  user: User;
}

type SortOption = 'votes' | 'newest' | 'oldest';

function Home({ user }: HomeProps): React.ReactElement {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('votes');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    setSuggestions(getSuggestions());
    setCategories(getCategories());
  }, []);

  const handleAddSuggestion = (title: string, description: string, category: string): void => {
    const newSuggestion: Suggestion = {
      id: generateId(),
      title,
      description,
      category,
      status: 'Under Review',
      sprint: null,
      votes: 0,
      votedBy: [],
      createdBy: user.id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = addSuggestion(newSuggestion);
    setSuggestions(updated);
    setShowForm(false);
  };

  const handleVote = (suggestionId: string): void => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const hasVoted = suggestion.votedBy.includes(user.id);
    let updates: Partial<Suggestion>;

    if (hasVoted) {
      // Remove vote
      updates = {
        votes: suggestion.votes - 1,
        votedBy: suggestion.votedBy.filter(id => id !== user.id),
      };
    } else {
      // Add vote
      updates = {
        votes: suggestion.votes + 1,
        votedBy: [...suggestion.votedBy, user.id],
      };
    }

    const updated = updateSuggestion(suggestionId, updates);
    setSuggestions(updated);
  };

  const handleStatusChange = (suggestionId: string, status: string): void => {
    const updated = updateSuggestion(suggestionId, { status: status as Suggestion['status'] });
    setSuggestions(updated);
  };

  const handleSprintChange = (suggestionId: string, sprint: string): void => {
    const updated = updateSuggestion(suggestionId, { sprint: sprint || null });
    setSuggestions(updated);
  };

  const handleShare = (suggestion: Suggestion): void => {
    const url = `${window.location.origin}/?suggestion=${suggestion.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleRequirementsChange = (suggestionId: string, requirements: string): void => {
    const updated = updateSuggestion(suggestionId, { requirements });
    setSuggestions(updated);
  };

  const handleJiraSync = (suggestionId: string): void => {
    const updated = updateSuggestion(suggestionId, {
      jiraSynced: true,
      jiraSyncedAt: new Date().toISOString(),
    });
    setSuggestions(updated);
  };

  // Filter and sort suggestions
  // Hide "Done" by default - only show when explicitly filtered
  const filteredSuggestions = suggestions
    .filter(s => filterCategory === 'all' || s.category === filterCategory)
    .filter(s => {
      if (filterStatus === 'all') return s.status !== 'Done';
      return s.status === filterStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

  const statuses = ['Under Review', 'Planned', 'In Progress', 'Done'];

  return (
    <div className="home-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Feature Suggestions</h1>
          <p>Vote on existing ideas or suggest new features</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Suggestion'}
        </button>
      </div>

      {showForm && (
        <SuggestionForm
          categories={categories}
          onSubmit={handleAddSuggestion}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="votes">Most Votes</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="suggestions-list">
        {filteredSuggestions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="lightbulb" size={48} /></span>
            <p>No suggestions yet. Be the first to add one!</p>
          </div>
        ) : (
          filteredSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              user={user}
              onVote={handleVote}
              onShare={handleShare}
              onStatusChange={handleStatusChange}
              onSprintChange={handleSprintChange}
              onRequirementsChange={handleRequirementsChange}
              onJiraSync={handleJiraSync}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Home;
