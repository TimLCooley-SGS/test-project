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

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await api.updatePlatformOrganization(id, { is_active: !currentActive });
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, is_active: !currentActive } : o));
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
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
              <th>Users</th>
              <th>Suggestions</th>
              <th>Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">No organizations found</td></tr>
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
                  <td className="num-cell">{org.user_count}</td>
                  <td className="num-cell">{org.suggestion_count}</td>
                  <td>
                    <button
                      className={`status-toggle ${org.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(org.id, org.is_active)}
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
