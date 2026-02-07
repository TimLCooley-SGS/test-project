import React, { useState, useRef } from 'react';
import { User } from '../types/theme';
import * as api from '../api';
import './Profile.css';

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      // Draw centered/cropped square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function Profile({ user, onUserUpdate }: ProfileProps): React.ReactElement {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [company, setCompany] = useState(user.company || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      setAvatarPreview(dataUrl);
      setAvatarData(dataUrl);
    } catch {
      setError('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (showPassword && newPassword) {
      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const updates: any = {};
      if (name !== user.name) updates.name = name;
      if (email !== user.email) updates.email = email;
      if (company !== (user.company || '')) updates.company = company;
      if (avatarData) updates.avatarUrl = avatarData;
      if (showPassword && newPassword) updates.password = newPassword;

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setSaving(false);
        return;
      }

      const updated = await api.updateUser(user.id, updates);
      onUserUpdate({
        ...user,
        name: updated.name,
        email: updated.email,
        company: updated.company,
        avatarUrl: updated.avatarUrl,
      });
      setAvatarData(null);
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <h1>Edit Profile</h1>

      <div className="profile-avatar-section">
        <div className="profile-avatar" onClick={handleAvatarClick} title="Change photo">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" />
          ) : (
            <div className="profile-avatar-initial">{initial}</div>
          )}
        </div>
        <span className="profile-avatar-hint">Click to change photo</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {success && <div className="profile-success">{success}</div>}
      {error && <div className="profile-error">{error}</div>}

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>Company</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>

        {!showPassword ? (
          <button
            type="button"
            className="profile-password-toggle"
            onClick={() => setShowPassword(true)}
          >
            Change password
          </button>
        ) : (
          <div className="profile-password-fields">
            <div className="form-field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="form-field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="button"
              className="profile-password-toggle"
              onClick={() => {
                setShowPassword(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel password change
            </button>
          </div>
        )}

        <div className="profile-actions">
          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
