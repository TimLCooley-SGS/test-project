import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import './PlansAndBilling.css';

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
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  is_active: boolean;
  sort_order: number;
  allow_theme: boolean;
  allow_integrations: boolean;
  allow_embed: boolean;
  max_users: number;
}

interface Payment {
  id: string;
  organization_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  plan_name: string;
  invoice_url: string;
  created_at: string;
}

interface StripeMode {
  mode: 'test' | 'live';
  testKeySet: boolean;
  liveKeySet: boolean;
}

type Tab = 'plans' | 'payments';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  features: [] as PlanFeature[],
  sort_order: 0,
  allow_theme: false,
  allow_integrations: false,
  allow_embed: false,
  max_users: 0,
};

function PlansAndBilling(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stripeMode, setStripeMode] = useState<StripeMode | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, paymentsData, modeData] = await Promise.all([
        api.fetchPlatformPlans(),
        api.fetchPlatformPayments(),
        api.fetchStripeMode(),
      ]);
      setPlans(plansData);
      setPayments(paymentsData);
      setStripeMode(modeData);
    } catch (err) {
      console.error('Failed to load plans/payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = async (newMode: 'test' | 'live') => {
    if (!stripeMode || newMode === stripeMode.mode) return;

    if (newMode === 'live') {
      if (!stripeMode.liveKeySet) {
        alert('Live Stripe key is not configured. Set STRIPE_LIVE_SECRET_KEY in your environment.');
        return;
      }
      if (!window.confirm(
        'Switch to LIVE mode? This will use real Stripe keys and process real payments. Are you sure?'
      )) return;
    }

    setSwitchingMode(true);
    try {
      const updated = await api.updateStripeMode(newMode);
      setStripeMode(updated);
      // Reload payments to show data for the new mode
      const paymentsData = await api.fetchPlatformPayments();
      setPayments(paymentsData);
    } catch (err: any) {
      alert(err.message || 'Failed to switch Stripe mode');
    } finally {
      setSwitchingMode(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, features: [] });
    setShowForm(true);
  };

  const openEditForm = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: (plan.features || []).map(f =>
        typeof f === 'string' ? { text: f, included: true } : f
      ),
      sort_order: plan.sort_order,
      allow_theme: plan.allow_theme || false,
      allow_integrations: plan.allow_integrations || false,
      allow_embed: plan.allow_embed || false,
      max_users: plan.max_users || 0,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm, features: [] });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      alert('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updatePlatformPlan(editingId, form);
      } else {
        await api.createPlatformPlan(form as any);
      }
      await loadData();
      cancelForm();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Deactivate this plan? Existing subscribers will not be affected.')) return;
    try {
      await api.deletePlatformPlan(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate plan');
    }
  };

  const updateFeature = (index: number, field: 'text' | 'included', value: string | boolean) => {
    const updated = [...form.features];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, features: updated });
  };

  const addFeature = () => {
    setForm({ ...form, features: [...form.features, { text: '', included: true }] });
  };

  const removeFeature = (index: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div className="plans-billing-page"><p>Loading...</p></div>;
  }

  return (
    <div className="plans-billing-page">
      <div className="page-header">
        <h1>Plans & Billing</h1>
        <p>Manage subscription plans and view payment history</p>
      </div>

      <div className="billing-tabs">
        <button
          className={`billing-tab ${tab === 'plans' ? 'active' : ''}`}
          onClick={() => setTab('plans')}
        >
          Plans
        </button>
        <button
          className={`billing-tab ${tab === 'payments' ? 'active' : ''}`}
          onClick={() => setTab('payments')}
        >
          Payments
        </button>
      </div>

      {tab === 'plans' && (
        <>
          <div className="plans-toolbar">
            <button className="add-plan-btn" onClick={openCreateForm}>
              + Create Plan
            </button>
            {stripeMode && (
              <div className="stripe-mode-toggle">
                <div className="stripe-mode-pills">
                  <button
                    className={`stripe-mode-pill test ${stripeMode.mode === 'test' ? 'active' : ''}`}
                    onClick={() => handleModeSwitch('test')}
                    disabled={switchingMode}
                  >
                    Test
                  </button>
                  <button
                    className={`stripe-mode-pill live ${stripeMode.mode === 'live' ? 'active' : ''}`}
                    onClick={() => handleModeSwitch('live')}
                    disabled={switchingMode}
                  >
                    Live
                  </button>
                </div>
              </div>
            )}
          </div>

          {showForm && (
            <div className="plan-form-card">
              <h3>{editingId ? 'Edit Plan' : 'Create Plan'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Pro"
                  />
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value })}
                    placeholder="e.g. pro"
                    disabled={!!editingId}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief plan description"
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Price (cents)</label>
                  <input
                    type="number"
                    value={form.price_monthly}
                    onChange={e => setForm({ ...form, price_monthly: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Yearly Price (cents)</label>
                  <input
                    type="number"
                    value={form.price_yearly}
                    onChange={e => setForm({ ...form, price_yearly: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="feature-gates-section">
                <label className="section-label">Feature Gates</label>
                <div className="feature-gates-grid">
                  <label className="gate-checkbox">
                    <input
                      type="checkbox"
                      checked={form.allow_theme}
                      onChange={e => setForm({ ...form, allow_theme: e.target.checked })}
                    />
                    <span>Theme Customization</span>
                  </label>
                  <label className="gate-checkbox">
                    <input
                      type="checkbox"
                      checked={form.allow_integrations}
                      onChange={e => setForm({ ...form, allow_integrations: e.target.checked })}
                    />
                    <span>Integrations</span>
                  </label>
                  <label className="gate-checkbox">
                    <input
                      type="checkbox"
                      checked={form.allow_embed}
                      onChange={e => setForm({ ...form, allow_embed: e.target.checked })}
                    />
                    <span>Embed Widget</span>
                  </label>
                  <div className="gate-input">
                    <label>Max Users (0 = unlimited)</label>
                    <input
                      type="number"
                      value={form.max_users}
                      onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>
              </div>

              <div className="features-editor">
                <label>Features</label>
                {form.features.map((f, i) => (
                  <div key={i} className="feature-item">
                    <label className="feature-included-toggle" title={f.included ? 'Included' : 'Not included'}>
                      <input
                        type="checkbox"
                        checked={f.included}
                        onChange={e => updateFeature(i, 'included', e.target.checked)}
                      />
                      <span className={`feature-check-icon ${f.included ? 'included' : 'excluded'}`}>
                        {f.included ? '\u2713' : '\u2717'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={f.text}
                      onChange={e => updateFeature(i, 'text', e.target.value)}
                      placeholder="Feature description"
                    />
                    <button className="feature-remove" onClick={() => removeFeature(i)}>&times;</button>
                  </div>
                ))}
                <button className="add-feature-btn" onClick={addFeature}>+ Add Feature</button>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}
                </button>
                <button className="btn btn-cancel" onClick={cancelForm}>Cancel</button>
              </div>
            </div>
          )}

          <div className="plans-table-wrap">
            {plans.length === 0 ? (
              <div className="empty-state">No plans configured</div>
            ) : (
              <table className="plans-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Monthly</th>
                    <th>Yearly</th>
                    <th>Status</th>
                    <th>Stripe</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id}>
                      <td><strong>{plan.name}</strong></td>
                      <td>{plan.slug}</td>
                      <td>{formatPrice(plan.price_monthly)}</td>
                      <td>{formatPrice(plan.price_yearly)}</td>
                      <td>
                        <span className={`plan-active-badge ${plan.is_active ? 'active' : 'inactive'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{plan.stripe_product_id ? '\u2713 Synced' : '\u2014'}</td>
                      <td>
                        <div className="plan-actions-cell">
                          <button className="btn-edit" onClick={() => openEditForm(plan)}>Edit</button>
                          {plan.is_active && (
                            <button className="btn-deactivate" onClick={() => handleDeactivate(plan.id)}>
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <>
        {stripeMode && (
          <div className="plans-toolbar">
            <div />
            <div className="stripe-mode-toggle">
              <div className="stripe-mode-pills">
                <button
                  className={`stripe-mode-pill test ${stripeMode.mode === 'test' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('test')}
                  disabled={switchingMode}
                >
                  Test
                </button>
                <button
                  className={`stripe-mode-pill live ${stripeMode.mode === 'live' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('live')}
                  disabled={switchingMode}
                >
                  Live
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="platform-payments-table-wrap">
          {payments.length === 0 ? (
            <div className="empty-state">No payments recorded</div>
          ) : (
            <table className="platform-payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.created_at)}</td>
                    <td>{p.organization_name}</td>
                    <td>{p.plan_name}</td>
                    <td>${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                    <td>
                      <span className={`payment-status ${p.status}`}>{p.status}</span>
                    </td>
                    <td>
                      {p.invoice_url ? (
                        <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="invoice-link">
                          View
                        </a>
                      ) : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
      )}
    </div>
  );
}

export default PlansAndBilling;
