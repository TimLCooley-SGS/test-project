import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { initializeStorage, getCurrentUser, setCurrentUser, clearCurrentUser, getUsers } from './storage';
import { User } from './types/theme';
import { IntegrationsProvider } from './context/IntegrationsContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Roadmap from './pages/Roadmap';
import EmbedView from './pages/EmbedView';
import Categories from './pages/admin/Categories';
import Users from './pages/admin/Users';
import Theme from './pages/admin/Theme';
import Integrations from './pages/admin/Integrations';
import Embed from './pages/admin/Embed';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import './App.css';

function App(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check if we're on the embed route
  const isEmbedRoute = location.pathname === '/embed';

  useEffect(() => {
    // Initialize localStorage with default data
    initializeStorage();

    // Check for existing session
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (role: 'admin' | 'user'): void => {
    const users = getUsers();
    const selectedUser = role === 'admin'
      ? users.find(u => u.role === 'admin')
      : users.find(u => u.role === 'user');

    if (selectedUser) {
      setCurrentUser(selectedUser);
      setUser(selectedUser);
    }
  };

  const handleLogout = (): void => {
    clearCurrentUser();
    setUser(null);
  };

  // Render embed view without authentication or app shell
  if (isEmbedRoute) {
    return (
      <Routes>
        <Route path="/embed" element={<EmbedView />} />
      </Routes>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <IntegrationsProvider userId={user.id}>
      <div className="app">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="app-container">
          <Sidebar user={user} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/roadmap" element={<Roadmap />} />
              {user.role === 'admin' && (
                <>
                  <Route path="/admin/categories" element={<Categories />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/theme" element={<Theme />} />
                  <Route path="/admin/integrations" element={<Integrations />} />
                  <Route path="/admin/embed" element={<Embed />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </IntegrationsProvider>
  );
}

export default App;
