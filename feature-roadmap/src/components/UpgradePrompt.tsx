import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import './UpgradePrompt.css';

interface UpgradePromptProps {
  featureName: string;
}

function UpgradePrompt({ featureName }: UpgradePromptProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-card">
        <div className="upgrade-prompt-icon">
          <Icon name="lock" size={48} color="var(--color-textSecondary)" />
        </div>
        <h2>This feature requires an upgrade</h2>
        <p className="upgrade-prompt-feature">{featureName}</p>
        <p className="upgrade-prompt-desc">
          Your current plan does not include this feature. Upgrade your plan to unlock it.
        </p>
        <div className="upgrade-prompt-actions">
          <button className="btn-upgrade" onClick={() => navigate('/admin/billing')}>
            Upgrade Now
          </button>
          <button className="btn-go-back" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;
