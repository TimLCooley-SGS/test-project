import React, { useState, useEffect } from 'react';
import { fetchPublicPlans } from '../api';
import Icon from '../components/Icon';
import './Pricing.css';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: PlanFeature[];
  sort_order: number;
}

interface PricingProps {
  onGetStarted: () => void;
}

function Pricing({ onGetStarted }: PricingProps): React.ReactElement {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicPlans()
      .then((data) => setPlans(data))
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (cents: number) => {
    if (cents === 0) return '$0';
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="pricing-page">
      <section className="pricing-header">
        <h1>Simple, transparent pricing</h1>
        <p>Start free, upgrade when you're ready. No hidden fees.</p>

        <div className="pricing-interval-toggle">
          <button
            className={billingInterval === 'monthly' ? 'active' : ''}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingInterval === 'yearly' ? 'active' : ''}
            onClick={() => setBillingInterval('yearly')}
          >
            Yearly (save ~17%)
          </button>
        </div>
      </section>

      <section className="pricing-cards">
        {loading ? (
          <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: 'var(--color-textSecondary)' }}>Loading plans...</p>
        ) : plans.map(plan => {
          const isEnterprise = plan.slug === 'enterprise';
          const isFree = plan.price_monthly === 0 && !isEnterprise;
          const isFeatured = plan.slug === 'pro';
          const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;

          return (
            <div key={plan.id} className={`pricing-card${isFeatured ? ' featured' : ''}`}>
              {isFeatured && <div className="featured-badge">Most Popular</div>}
              <div className="pricing-card-header">
                <h3>{plan.name}</h3>
                {plan.description && <p className="pricing-description">{plan.description}</p>}
              </div>
              <div className="pricing-amount">
                <span className="price">{isEnterprise ? 'Custom' : formatPrice(price)}</span>
                {!isEnterprise && !isFree && (
                  <span className="period">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                )}
                {isFree && <span className="period">/month</span>}
              </div>
              <ul className="pricing-features">
                {(plan.features || []).map((f, i) => (
                  <li key={i} className={f.included ? '' : 'disabled'}>
                    <Icon
                      name={f.included ? 'check' : 'x'}
                      size={18}
                      color={f.included ? 'var(--color-accent)' : 'var(--color-textSecondary)'}
                    />
                    {f.text}
                  </li>
                ))}
              </ul>
              {isEnterprise ? (
                <button onClick={onGetStarted} className="pricing-btn secondary">
                  Contact Sales
                </button>
              ) : isFeatured ? (
                <button onClick={onGetStarted} className="pricing-btn primary">
                  Start 15-Day Free Trial
                </button>
              ) : (
                <button onClick={onGetStarted} className="pricing-btn secondary">
                  Get Started
                </button>
              )}
            </div>
          );
        })}
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
