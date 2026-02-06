import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import * as api from './api';
import { User } from './types/theme';
import { IntegrationsProvider } from './context/IntegrationsContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
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
import PublicNavbar from './components/PublicNavbar';
import './App.css';

function App(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const location = useLocation();

  // Check if we're on the embed route
  const isEmbedRoute = location.pathname === '/embed';

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    // Check for existing token and validate it
    const token = api.getToken();
    if (token) {
      api.getCurrentUser()
        .then(savedUser => {
          setUser(savedUser);
        })
        .catch(() => {
          api.clearToken();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User): void => {
    setUser(loggedInUser);
    setShowLogin(false);
  };

  const handleLogout = (): void => {
    api.logout();
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

  const handleShowLogin = (): void => {
    setShowLogin(true);
  };

  const handleCloseLogin = (): void => {
    setShowLogin(false);
  };

  if (!user) {
    if (showLogin) {
      return <Login onLoginSuccess={handleLoginSuccess} onBack={handleCloseLogin} />;
    }

    return (
      <>
        <PublicNavbar onLoginClick={handleShowLogin} />
        <Routes>
          <Route path="/" element={<Landing onGetStarted={handleShowLogin} />} />
          <Route path="/pricing" element={<Pricing onGetStarted={handleShowLogin} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <IntegrationsProvider userId={user.id}>
      <div className="app">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onMenuToggle={toggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <div className="app-container">
          <Sidebar
            user={user}
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={closeMobileMenu}
          />
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
                  <Route path="/admin/embed" element={<Embed user={user} />} />
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
