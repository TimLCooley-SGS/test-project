import React, { useState, useEffect, useRef } from 'react';
import { useIntegrations } from '../context/IntegrationsContext';
import { Suggestion } from '../types/theme';
import { SuggestionPush } from '../types/integrations';
import { getIntegrationMeta } from '../integrations/presets';
import { getCurrentUser } from '../storage';
import './PushToIntegration.css';

interface PushToIntegrationProps {
  suggestion: Suggestion;
}

function PushToIntegration({ suggestion }: PushToIntegrationProps): React.ReactElement | null {
  const { integrations, pushSuggestion, getSuggestionPushes } = useIntegrations();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushes, setPushes] = useState<SuggestionPush[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enabledIntegrations = integrations.filter((i) => i.enabled);

  useEffect(() => {
    setPushes(getSuggestionPushes(suggestion.id));
  }, [suggestion.id, getSuggestionPushes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePush = async (integrationId: string): Promise<void> => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(integrationId);
    setError(null);

    try {
      const pushRecord = await pushSuggestion(suggestion.id, integrationId, user.id);
      setPushes((prev) => [...prev, pushRecord]);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push');
    } finally {
      setLoading(null);
    }
  };

  const isPushedTo = (integrationId: string): boolean => {
    return pushes.some((p) => p.integrationId === integrationId);
  };

  const getPushForIntegration = (integrationId: string): SuggestionPush | undefined => {
    return pushes.find((p) => p.integrationId === integrationId);
  };

  // Don't render if no integrations are enabled
  if (enabledIntegrations.length === 0) {
    return null;
  }

  return (
    <div className="push-integration" ref={dropdownRef}>
      <button
        className="push-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading !== null}
      >
        <span>🔗</span>
        <span>Push to...</span>
      </button>

      {isOpen && (
        <div className="push-dropdown">
          <div className="push-dropdown-header">Push to Integration</div>

          {loading && (
            <div className="push-loading">
              <div className="push-spinner"></div>
              <span>Pushing...</span>
            </div>
          )}

          {error && (
            <div className="push-error">{error}</div>
          )}

          {!loading && enabledIntegrations.map((integration) => {
            const meta = getIntegrationMeta(integration.type);
            const alreadyPushed = isPushedTo(integration.id);
            const push = getPushForIntegration(integration.id);

            return (
              <button
                key={integration.id}
                className="push-dropdown-item"
                onClick={() => !alreadyPushed && handlePush(integration.id)}
                disabled={alreadyPushed}
              >
                <span className="push-dropdown-icon">{meta?.icon || '🔗'}</span>
                <span className="push-dropdown-name">{integration.name}</span>
                {alreadyPushed && push && (
                  <a
                    href={push.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="push-dropdown-status"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View →
                  </a>
                )}
              </button>
            );
          })}
        </div>
      )}

      {pushes.length > 0 && !isOpen && (
        <div className="pushed-links">
          {pushes.map((push) => {
            const integration = integrations.find((i) => i.id === push.integrationId);
            const meta = integration ? getIntegrationMeta(integration.type) : null;
            return (
              <a
                key={push.id}
                href={push.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pushed-link"
                title={`View in ${integration?.name || push.integrationType}`}
              >
                <span className="pushed-link-icon">{meta?.icon || '🔗'}</span>
                <span>{push.externalId}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PushToIntegration;
