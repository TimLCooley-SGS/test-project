import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import './Landing.css';

interface LandingProps {
  onGetStarted: () => void;
}

function Landing({ onGetStarted }: LandingProps): React.ReactElement {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Let Your Customers Drive Your Product Roadmap
          </h1>
          <p className="hero-subtitle">
            Collect feature requests, let users vote on what matters most, and build
            what your customers actually want. Prioritize with confidence.
          </p>
          <div className="hero-actions">
            <button onClick={onGetStarted} className="hero-cta-primary">
              Start 15-Day Free Trial
            </button>
            <Link to="/pricing" className="hero-cta-secondary">
              View Pricing
            </Link>
          </div>
          <p className="hero-note">No credit card required</p>
        </div>
        <div className="hero-visual">
          <div className="hero-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="mockup-content">
              <div className="mockup-card">
                <div className="mockup-vote">
                  <Icon name="chevron-up" size={16} />
                  <span>47</span>
                </div>
                <div className="mockup-text">
                  <div className="mockup-title"></div>
                  <div className="mockup-desc"></div>
                </div>
                <div className="mockup-badge"></div>
              </div>
              <div className="mockup-card">
                <div className="mockup-vote active">
                  <Icon name="chevron-up" size={16} />
                  <span>32</span>
                </div>
                <div className="mockup-text">
                  <div className="mockup-title"></div>
                  <div className="mockup-desc"></div>
                </div>
                <div className="mockup-badge planned"></div>
              </div>
              <div className="mockup-card">
                <div className="mockup-vote">
                  <Icon name="chevron-up" size={16} />
                  <span>28</span>
                </div>
                <div className="mockup-text">
                  <div className="mockup-title"></div>
                  <div className="mockup-desc"></div>
                </div>
                <div className="mockup-badge progress"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Everything you need to prioritize features</h2>
          <p>Simple, powerful tools to collect feedback and make data-driven decisions</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="chevron-up" size={24} />
            </div>
            <h3>Upvoting System</h3>
            <p>Let customers vote on features they want most. See what matters at a glance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="map" size={24} />
            </div>
            <h3>Visual Roadmap</h3>
            <p>Share your product roadmap publicly or privately. Keep everyone aligned.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="users" size={24} />
            </div>
            <h3>Customer Insights</h3>
            <p>Understand which customers are requesting what. Prioritize by revenue impact.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="tags" size={24} />
            </div>
            <h3>Categories & Status</h3>
            <p>Organize requests by category. Track status from review to done.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="external-link" size={24} />
            </div>
            <h3>Integrations</h3>
            <p>Push approved features to Jira, Linear, or Asana with one click.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Icon name="palette" size={24} />
            </div>
            <h3>White Label</h3>
            <p>Customize colors, logos, and branding to match your product.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-header">
          <h2>How it works</h2>
          <p>Get started in minutes, not hours</p>
        </div>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Collect Ideas</h3>
            <p>Customers submit feature requests through your branded portal</p>
          </div>
          <div className="step-arrow">
            <Icon name="arrow-right" size={24} />
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Gather Votes</h3>
            <p>Users upvote the features they want, showing clear priorities</p>
          </div>
          <div className="step-arrow">
            <Icon name="arrow-right" size={24} />
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Build & Ship</h3>
            <p>Focus on high-impact features and keep customers informed</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to build what customers want?</h2>
          <p>Start your 15-day free trial. No credit card required.</p>
          <button onClick={onGetStarted} className="cta-button">
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Icon name="rocket" size={24} color="var(--color-primary)" />
            <span>Feature Roadmap</span>
          </div>
          <div className="footer-links">
            <Link to="/pricing">Pricing</Link>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Feature Roadmap. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
