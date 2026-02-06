import React, { useState, useEffect } from 'react';
import { getCategories, addCategory, deleteCategory, setCategories } from '../../storage';
import './Categories.css';

function Categories(): React.ReactElement {
  const [categories, setCategoriesState] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setCategoriesState(getCategories());
  }, []);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    if (categories.includes(newCategory.trim())) {
      alert('Category already exists');
      return;
    }

    const updated = addCategory(newCategory.trim());
    setCategoriesState(updated);
    setNewCategory('');
  };

  const handleDelete = (category: string): void => {
    if (window.confirm(`Delete category "${category}"? Suggestions with this category will keep it.`)) {
      const updated = deleteCategory(category);
      setCategoriesState(updated);
    }
  };

  const handleEdit = (index: number): void => {
    setEditingIndex(index);
    setEditValue(categories[index]);
  };

  const handleSaveEdit = (index: number): void => {
    if (!editValue.trim()) {
      setEditingIndex(null);
      return;
    }

    if (editValue.trim() !== categories[index] && categories.includes(editValue.trim())) {
      alert('Category already exists');
      return;
    }

    const updated = [...categories];
    updated[index] = editValue.trim();
    setCategories(updated);
    setCategoriesState(updated);
    setEditingIndex(null);
  };

  const handleCancelEdit = (): void => {
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1>Manage Categories</h1>
        <p>Add, edit, or remove categories for suggestions</p>
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
          categories.map((category, index) => (
            <div key={index} className="category-item">
              {editingIndex === index ? (
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
                    onClick={() => handleSaveEdit(index)}
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
                  <span className="category-name">{category}</span>
                  <div className="category-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(index)}
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
