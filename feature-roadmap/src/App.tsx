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
import Billing from './pages/admin/Billing';
import PlatformOrganizations from './pages/platform/Organizations';
import PlatformUsers from './pages/platform/PlatformUsers';
import PlatformSettings from './pages/platform/Settings';
import PlatformAnalytics from './pages/platform/Analytics';
import PlansAndBilling from './pages/platform/PlansAndBilling';
import Profile from './pages/Profile';
import PublicBoard from './pages/PublicBoard';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PublicNavbar from './components/PublicNavbar';
import UpgradePrompt from './components/UpgradePrompt';
import './App.css';

function App(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [boardSlug, setBoardSlug] = useState<string | null>(null);
  const location = useLocation();

  // Check if we're on the embed, reset-password, or board route
  const isEmbedRoute = location.pathname === '/embed';
  const isResetPasswordRoute = location.pathname === '/reset-password';
  const isBoardRoute = location.pathname.startsWith('/board/');

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

  // Fetch boardSlug from branding endpoint
  useEffect(() => {
    api.fetchPlatformBranding()
      .then(branding => {
        if (branding.boardSlug) setBoardSlug(branding.boardSlug);
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (loggedInUser: User): void => {
    setUser(loggedInUser);
    setShowLogin(false);
  };

  const handleLogout = (): void => {
    api.logout();
    setUser(null);
  };

  const handleShowLogin = (): void => {
    setAuthMode('login');
    setShowLogin(true);
  };

  const handleShowSignup = (): void => {
    setAuthMode('register');
    setShowLogin(true);
  };

  const handleCloseLogin = (): void => {
    setShowLogin(false);
  };

  // Render embed view without authentication or app shell
  if (isEmbedRoute) {
    return (
      <Routes>
        <Route path="/embed" element={<EmbedView />} />
      </Routes>
    );
  }

  // Render reset-password page without authentication
  if (isResetPasswordRoute) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  // Render public board pages without authentication
  if (isBoardRoute) {
    return (
      <>
        <PublicNavbar onLoginClick={handleShowLogin} onSignupClick={handleShowSignup} boardSlug={boardSlug} />
        <Routes>
          <Route path="/board/:slug" element={<PublicBoard />} />
          <Route path="/board/:slug/roadmap" element={<PublicBoard />} />
        </Routes>
        {showLogin && <Login onLoginSuccess={handleLoginSuccess} onBack={handleCloseLogin} initialMode={authMode} />}
      </>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    if (showLogin) {
      return <Login onLoginSuccess={handleLoginSuccess} onBack={handleCloseLogin} initialMode={authMode} />;
    }

    return (
      <>
        <PublicNavbar onLoginClick={handleShowLogin} onSignupClick={handleShowSignup} boardSlug={boardSlug} />
        <Routes>
          <Route path="/" element={<Landing onGetStarted={handleShowSignup} />} />
          <Route path="/pricing" element={<Pricing onGetStarted={handleShowSignup} />} />
          <Route path="/board/:slug" element={<PublicBoard />} />
          <Route path="/board/:slug/roadmap" element={<PublicBoard />} />
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
              <Route path="/profile" element={<Profile user={user} onUserUpdate={(u) => setUser(u)} />} />
              {user.role === 'admin' && (
                <>
                  <Route path="/admin/categories" element={<Categories />} />
                  <Route path="/admin/users" element={<Users user={user} />} />
                  <Route path="/admin/theme" element={
                    !user.isSuperAdmin && !user.planLimits?.allowTheme
                      ? <UpgradePrompt featureName="Theme Customization" />
                      : <Theme />
                  } />
                  <Route path="/admin/integrations" element={
                    !user.isSuperAdmin && !user.planLimits?.allowIntegrations
                      ? <UpgradePrompt featureName="Integrations" />
                      : <Integrations />
                  } />
                  <Route path="/admin/embed" element={
                    !user.isSuperAdmin && !user.planLimits?.allowEmbed
                      ? <UpgradePrompt featureName="Embed Widget" />
                      : <Embed user={user} />
                  } />
                  <Route path="/admin/billing" element={<Billing />} />
                </>
              )}
              {user.isSuperAdmin && (
                <>
                  <Route path="/platform/organizations" element={<PlatformOrganizations />} />
                  <Route path="/platform/users" element={<PlatformUsers />} />
                  <Route path="/platform/settings" element={<PlatformSettings />} />
                  <Route path="/platform/analytics" element={<PlatformAnalytics />} />
                  <Route path="/platform/billing" element={<PlansAndBilling />} />
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
