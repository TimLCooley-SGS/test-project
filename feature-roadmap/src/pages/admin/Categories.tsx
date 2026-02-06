import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import { Category } from '../../types/theme';
import './Categories.css';

function Categories(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadCategories = async (): Promise<void> => {
    try {
      const data = await api.fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    if (categories.some(c => c.name.toLowerCase() === newCategory.trim().toLowerCase())) {
      alert('Category already exists');
      return;
    }

    try {
      await api.createCategory(newCategory.trim());
      await loadCategories();
      setNewCategory('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add category';
      alert(message);
    }
  };

  const handleDelete = async (category: Category): Promise<void> => {
    if (window.confirm(`Delete category "${category.name}"? Suggestions with this category will keep it.`)) {
      try {
        await api.deleteCategory(category.id);
        await loadCategories();
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  const handleEdit = (category: Category): void => {
    setEditingId(category.id);
    setEditValue(category.name);
  };

  const handleSaveEdit = async (category: Category): Promise<void> => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }

    if (editValue.trim() !== category.name && categories.some(c => c.name.toLowerCase() === editValue.trim().toLowerCase())) {
      alert('Category already exists');
      return;
    }

    try {
      await api.updateCategory(category.id, { name: editValue.trim() });
      await loadCategories();
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="categories-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Manage Categories</h1>
          <p>Add, edit, or remove categories for suggestions</p>
        </div>
      </div>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Enter new category name"
          maxLength={50}
        />
        <button type="submit" className="add-btn">
          + Add Category
        </button>
      </form>

      <div className="categories-list">
        {categories.length === 0 ? (
          <p className="empty-message">No categories yet. Add one above!</p>
        ) : (
          categories.map(category => (
            <div key={category.id} className="category-item">
              {editingId === category.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    maxLength={50}
                  />
                  <button
                    className="save-btn"
                    onClick={() => handleSaveEdit(category)}
                  >
                    Save
                  </button>
                  <button
                    className="cancel-edit-btn"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="category-name">{category.name}</span>
                  <div className="category-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(category)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Categories;
