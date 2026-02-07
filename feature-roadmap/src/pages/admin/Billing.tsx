import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import Icon from '../../components/Icon';
import './Billing.css';

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
}

interface Subscription {
  id: string;
  plan_name: string;
  plan_slug: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  features: string[];
  price_monthly: number;
  price_yearly: number;
}

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  plan_name: string;
  invoice_url: string;
  created_at: string;
}

function Billing(): React.ReactElement {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const showSuccess = urlParams.get('success') === 'true';
  const showCanceled = urlParams.get('canceled') === 'true';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, subData, invoicesData] = await Promise.all([
        api.fetchBillingPlans(),
        api.fetchBillingSubscription(),
        api.fetchBillingInvoices(),
      ]);
      setPlans(plansData);
      setSubscription(subData.subscription);
      setCurrentPlan(subData.currentPlan || 'starter');
      setTrialEndsAt(subData.trialEndsAt);
      setHasStripeCustomer(subData.hasStripeCustomer);
      setPayments(invoicesData);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { url } = await api.createCheckoutSession(planId, billingInterval);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to open billing portal');
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div className="billing-page"><p>Loading...</p></div>;
  }

  return (
    <div className="billing-page">
      <div className="page-header">
        <h1>Billing</h1>
        <p>Manage your subscription and payment history</p>
      </div>

      {showSuccess && (
        <div className="billing-alert success">
          Subscription activated successfully! It may take a moment to update.
        </div>
      )}
      {showCanceled && (
        <div className="billing-alert info">
          Checkout was canceled. No changes were made.
        </div>
      )}

      {/* Current Plan */}
      <div className="current-plan-card">
        <h2>Current Plan</h2>
        <div className="plan-details">
          <span className="plan-name-display">
            {subscription?.plan_name || currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </span>
          {subscription && (
            <span className={`status-badge ${subscription.status}`}>
              {subscription.status.replace('_', ' ')}
            </span>
          )}
          {!subscription && trialEndsAt && (
            <span className="status-badge trialing">Trial</span>
          )}
        </div>

        <div className="plan-meta">
          {trialEndsAt && (
            <span>Trial ends: {formatDate(trialEndsAt)}</span>
          )}
          {subscription?.current_period_end && (
            <span>
              Current period: {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
            </span>
          )}
          {subscription?.cancel_at_period_end && (
            <span style={{ color: '#b91c1c' }}>Cancels at end of period</span>
          )}
        </div>

        <div className="plan-actions">
          {hasStripeCustomer && (
            <button className="btn btn-secondary" onClick={handleManageBilling}>
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div className="plan-selection">
        <h2>Available Plans</h2>
        <div className="interval-toggle">
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

        <div className="plans-grid">
          {plans.map(plan => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isCurrent = plan.slug === currentPlan || plan.slug === subscription?.plan_slug;
            const isEnterprise = plan.slug === 'enterprise';
            const isFree = plan.price_monthly === 0 && plan.slug !== 'enterprise';

            return (
              <div key={plan.id} className={`plan-card ${isCurrent ? 'current' : ''}`}>
                <div className="plan-card-name">{plan.name}</div>
                <div className="plan-card-description">{plan.description}</div>
                <div className="plan-card-price">
                  {isEnterprise ? 'Custom' : formatPrice(price)}
                  {!isEnterprise && !isFree && (
                    <span>/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                  )}
                </div>
                <ul className="plan-card-features">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className={f.included ? '' : 'disabled'}>
                      <Icon
                        name={f.included ? 'check' : 'x'}
                        size={16}
                        color={f.included ? 'var(--color-accent)' : 'var(--color-textSecondary)'}
                      />
                      {f.text}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button className="btn btn-secondary" disabled>Current Plan</button>
                ) : isEnterprise ? (
                  <button className="btn btn-secondary" onClick={() => window.open('mailto:support@example.com', '_blank')}>
                    Contact Sales
                  </button>
                ) : isFree ? (
                  <button className="btn btn-secondary" disabled>Free</button>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {checkoutLoading === plan.id ? 'Redirecting...' : 'Subscribe'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div className="payment-history">
        <h2>Payment History</h2>
        <div className="payments-table-wrap">
          {payments.length === 0 ? (
            <div className="empty-payments">No payments yet</div>
          ) : (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.created_at)}</td>
                    <td>${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                    <td>
                      <span className={`payment-status ${p.status}`}>{p.status}</span>
                    </td>
                    <td>{p.plan_name}</td>
                    <td>
                      {p.invoice_url ? (
                        <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="invoice-link">
                          View
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Billing;
