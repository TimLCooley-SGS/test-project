import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import './Organizations.css';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  user_count: number;
  suggestion_count: number;
  created_at: string;
  subscription_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
}

function Organizations(): React.ReactElement {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrgs = async () => {
    try {
      const data = await api.fetchPlatformOrganizations();
      setOrgs(data);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrgs(); }, []);

  const handlePlanChange = async (id: string, plan: string) => {
    try {
      await api.updatePlatformOrganization(id, { plan });
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, plan } : o));
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  const handleToggleActive = async (org: Org) => {
    if (org.is_active) {
      if (!window.confirm(`Deactivate "${org.name}"? This will prevent all users in this organization from accessing the platform.`)) {
        return;
      }
    }
    try {
      await api.updatePlatformOrganization(org.id, { is_active: !org.is_active });
      await loadOrgs();
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
  };

  const [canceling, setCanceling] = useState<string | null>(null);

  const handleCancelSubscription = async (org: Org) => {
    if (!window.confirm(`Cancel ${org.name}'s subscription? They will retain access until the current billing period ends.`)) {
      return;
    }
    setCanceling(org.id);
    try {
      await api.cancelOrgSubscription(org.id);
      await loadOrgs();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setCanceling(null);
    }
  };

  const getSubscriptionLabel = (org: Org) => {
    if (!org.subscription_status) return '\u2014';
    if (org.cancel_at_period_end && org.subscription_status === 'active') return 'Canceling';
    return org.subscription_status.charAt(0).toUpperCase() + org.subscription_status.slice(1);
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="platform-page"><p>Loading...</p></div>;

  return (
    <div className="platform-page">
      <div className="page-header">
        <h1>Organizations</h1>
        <p>Manage all organizations on the platform</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search organizations..."
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>×</button>
        )}
      </div>

      <div className="platform-table-wrap">
        <table className="platform-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Subscription</th>
              <th>Users</th>
              <th>Suggestions</th>
              <th>Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="empty-cell">No organizations found</td></tr>
            ) : (
              filtered.map(org => (
                <tr key={org.id} className={!org.is_active ? 'inactive-row' : ''}>
                  <td className="org-name">{org.name}</td>
                  <td className="org-slug">{org.slug}</td>
                  <td>
                    <select
                      value={org.plan}
                      onChange={e => handlePlanChange(org.id, e.target.value)}
                      className="plan-select"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td>
                    <span className={`sub-status ${org.cancel_at_period_end ? 'canceling' : (org.subscription_status || '')}`}>
                      {getSubscriptionLabel(org)}
                    </span>
                    {org.subscription_status === 'active' && !org.cancel_at_period_end && (
                      <button
                        className="cancel-sub-btn"
                        onClick={() => handleCancelSubscription(org)}
                        disabled={canceling === org.id}
                      >
                        {canceling === org.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                  <td className="num-cell">{org.user_count}</td>
                  <td className="num-cell">{org.suggestion_count}</td>
                  <td>
                    <button
                      className={`status-toggle ${org.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(org)}
                    >
                      {org.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="date-cell">{new Date(org.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Organizations;
