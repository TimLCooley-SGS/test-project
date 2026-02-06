import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import './Pricing.css';

interface PricingProps {
  onGetStarted: () => void;
}

function Pricing({ onGetStarted }: PricingProps): React.ReactElement {
  return (
    <div className="pricing-page">
      <section className="pricing-header">
        <h1>Simple, transparent pricing</h1>
        <p>Start free, upgrade when you're ready. No hidden fees.</p>
      </section>

      <section className="pricing-cards">
        <div className="pricing-card">
          <div className="pricing-card-header">
            <h3>Starter</h3>
            <p className="pricing-description">For small teams getting started</p>
          </div>
          <div className="pricing-amount">
            <span className="price">$0</span>
            <span className="period">/month</span>
          </div>
          <ul className="pricing-features">
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Up to 50 feature requests
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Unlimited voters
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Public roadmap
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Basic categories
            </li>
            <li className="disabled">
              <Icon name="x" size={18} color="var(--color-textSecondary)" />
              Custom branding
            </li>
            <li className="disabled">
              <Icon name="x" size={18} color="var(--color-textSecondary)" />
              Integrations
            </li>
          </ul>
          <button onClick={onGetStarted} className="pricing-btn secondary">
            Get Started
          </button>
        </div>

        <div className="pricing-card featured">
          <div className="featured-badge">Most Popular</div>
          <div className="pricing-card-header">
            <h3>Pro</h3>
            <p className="pricing-description">For growing product teams</p>
          </div>
          <div className="pricing-amount">
            <span className="price">$49</span>
            <span className="period">/month</span>
          </div>
          <ul className="pricing-features">
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Unlimited feature requests
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Unlimited voters
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Public & private roadmap
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Custom categories
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Custom branding & colors
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Jira, Linear, Asana integrations
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Priority support
            </li>
          </ul>
          <button onClick={onGetStarted} className="pricing-btn primary">
            Start 15-Day Free Trial
          </button>
        </div>

        <div className="pricing-card">
          <div className="pricing-card-header">
            <h3>Enterprise</h3>
            <p className="pricing-description">For large organizations</p>
          </div>
          <div className="pricing-amount">
            <span className="price">Custom</span>
          </div>
          <ul className="pricing-features">
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Everything in Pro
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              SSO / SAML authentication
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              CRM integrations (Salesforce, HubSpot)
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Impact scoring by revenue
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Custom domain
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              Dedicated support
            </li>
            <li>
              <Icon name="check" size={18} color="var(--color-accent)" />
              SLA guarantee
            </li>
          </ul>
          <button onClick={onGetStarted} className="pricing-btn secondary">
            Contact Sales
          </button>
        </div>
      </section>

      <section className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>How does the 15-day free trial work?</h4>
            <p>
              Start using all Pro features immediately. No credit card required.
              At the end of 15 days, choose to upgrade or continue with the free Starter plan.
            </p>
          </div>
          <div className="faq-item">
            <h4>Can I change plans later?</h4>
            <p>
              Absolutely! You can upgrade or downgrade your plan at any time.
              Changes take effect on your next billing cycle.
            </p>
          </div>
          <div className="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>
              We accept all major credit cards (Visa, Mastercard, American Express)
              and can arrange invoicing for Enterprise customers.
            </p>
          </div>
          <div className="faq-item">
            <h4>Is there a discount for annual billing?</h4>
            <p>
              Yes! Pay annually and get 2 months free. That's $490/year for Pro
              instead of $588.
            </p>
          </div>
        </div>
      </section>

      <section className="pricing-cta">
        <h2>Ready to get started?</h2>
        <p>Join thousands of product teams building better products.</p>
        <button onClick={onGetStarted} className="cta-button">
          Start Your Free Trial
        </button>
      </section>
    </div>
  );
}

export default Pricing;
