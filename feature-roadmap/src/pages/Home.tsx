import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Suggestion, User, Category } from '../types/theme';
import SuggestionForm from '../components/SuggestionForm';
import SuggestionCard from '../components/SuggestionCard';
import Icon from '../components/Icon';
import './Home.css';

interface HomeProps {
  user: User;
}

type SortOption = 'votes' | 'newest' | 'oldest' | 'impact';

function Home({ user }: HomeProps): React.ReactElement {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('votes');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = async (): Promise<void> => {
    try {
      const [suggestionsData, categoriesData] = await Promise.all([
        api.fetchSuggestions(),
        api.fetchCategories(),
      ]);
      setSuggestions(suggestionsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSuggestion = async (title: string, description: string, categoryName: string): Promise<void> => {
    try {
      const category = categories.find(c => c.name === categoryName);
      await api.createSuggestion(title, description, category?.id);
      await loadData();
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create suggestion:', err);
      alert('Failed to create suggestion. Please try again.');
    }
  };

  const handleVote = async (suggestionId: string): Promise<void> => {
    try {
      await api.voteSuggestion(suggestionId);
      const updated = await api.fetchSuggestions();
      setSuggestions(updated);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleStatusChange = async (suggestionId: string, status: string): Promise<void> => {
    try {
      await api.updateSuggestion(suggestionId, { status: status as Suggestion['status'] });
      const updated = await api.fetchSuggestions();
      setSuggestions(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSprintChange = async (suggestionId: string, sprint: string): Promise<void> => {
    try {
      await api.updateSuggestion(suggestionId, { sprint: sprint || null });
      const updated = await api.fetchSuggestions();
      setSuggestions(updated);
    } catch (err) {
      console.error('Failed to update sprint:', err);
    }
  };

  const handleShare = (suggestion: Suggestion): void => {
    const url = `${window.location.origin}/?suggestion=${suggestion.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleRequirementsChange = async (suggestionId: string, requirements: string): Promise<void> => {
    try {
      await api.updateSuggestion(suggestionId, { requirements });
    } catch (err) {
      console.error('Failed to update requirements:', err);
    }
  };

  const handleJiraSync = async (suggestionId: string): Promise<void> => {
    try {
      await api.updateSuggestion(suggestionId, { requirements: suggestions.find(s => s.id === suggestionId)?.requirements || '' });
      const updated = await api.fetchSuggestions();
      setSuggestions(updated);
    } catch (err) {
      console.error('Failed to sync to Jira:', err);
    }
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
      if (sortBy === 'impact') return (b.impactScore || 0) - (a.impactScore || 0);
      return 0;
    });

  const isAdmin = user.role === 'admin';

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
            {isAdmin && <option value="impact">Impact Score</option>}
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
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
