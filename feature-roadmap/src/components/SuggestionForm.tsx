import React, { useState } from 'react';
import './SuggestionForm.css';

interface SuggestionFormProps {
  categories: string[];
  onSubmit: (title: string, description: string, category: string) => void;
  onCancel: () => void;
}

function SuggestionForm({ categories, onSubmit, onCancel }: SuggestionFormProps): React.ReactElement {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      alert('Please fill in all fields');
      return;
    }
    onSubmit(title.trim(), description.trim(), category);
  };

  return (
    <form className="suggestion-form" onSubmit={handleSubmit}>
      <h3>New Suggestion</h3>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title for your suggestion"
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your suggestion in detail..."
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="submit-btn">
          Submit Suggestion
        </button>
      </div>
    </form>
  );
}

export default SuggestionForm;
