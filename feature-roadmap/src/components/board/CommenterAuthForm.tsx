import React, { useState } from 'react';
import { useBoardAuth } from '../../context/BoardAuthContext';

export default function CommenterAuthForm() {
  const { signup, login } = useBoardAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="board-auth-form">
      <p className="board-auth-prompt">Sign in to leave a comment</p>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="board-auth-input"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="board-auth-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="board-auth-input"
        />
        {error && <p className="board-auth-error">{error}</p>}
        <button type="submit" disabled={submitting} className="board-auth-submit">
          {submitting ? '...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <button
        className="board-auth-toggle"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </div>
  );
}
