import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import './Analytics.css';

interface AnalyticsData {
  totalOrganizations: number;
  totalUsers: number;
  totalSuggestions: number;
  totalVotes: number;
  recentSuggestions: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    organization_name: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    organization_name: string;
  }>;
}

function Analytics(): React.ReactElement {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchPlatformAnalytics()
      .then(setData)
      .catch(err => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="platform-page"><p>Loading...</p></div>;
  if (!data) return <div className="platform-page"><p>Failed to load analytics.</p></div>;

  const statusLabel: Record<string, string> = {
    under_review: 'Under Review',
    planned: 'Planned',
    in_progress: 'In Progress',
    done: 'Done',
  };

  return (
    <div className="platform-page analytics-page">
      <div className="page-header">
        <h1>Platform Analytics</h1>
        <p>Overview of activity across all organizations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{data.totalOrganizations}</div>
          <div className="stat-label">Organizations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.totalUsers}</div>
          <div className="stat-label">Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.totalSuggestions}</div>
          <div className="stat-label">Suggestions</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.totalVotes}</div>
          <div className="stat-label">Votes</div>
        </div>
      </div>

      <div className="analytics-columns">
        <section className="analytics-section">
          <h2>Recent Suggestions</h2>
          <div className="activity-list">
            {data.recentSuggestions.length === 0 ? (
              <p className="empty-text">No suggestions yet</p>
            ) : (
              data.recentSuggestions.map(s => (
                <div key={s.id} className="activity-item">
                  <div className="activity-title">{s.title}</div>
                  <div className="activity-meta">
                    <span className={`activity-status status-${s.status}`}>
                      {statusLabel[s.status] || s.status}
                    </span>
                    <span className="activity-org">{s.organization_name}</span>
                    <span className="activity-date">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="analytics-section">
          <h2>Newest Users</h2>
          <div className="activity-list">
            {data.recentUsers.length === 0 ? (
              <p className="empty-text">No users yet</p>
            ) : (
              data.recentUsers.map(u => (
                <div key={u.id} className="activity-item">
                  <div className="activity-title">{u.name}</div>
                  <div className="activity-meta">
                    <span className="activity-email">{u.email}</span>
                    <span className="activity-org">{u.organization_name}</span>
                    <span className="activity-date">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Analytics;
