import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  IntegrationConfig,
  SuggestionPush,
  IntegrationsContextType,
} from '../types/integrations';
import {
  getIntegrations,
  setIntegrations as saveIntegrations,
  getPushHistory,
  addPushRecord,
  generateId,
} from '../storage';
import {
  pushSuggestionToIntegration,
  testIntegrationConnection,
} from '../services/integrationService';
import { getSuggestions } from '../storage';

const IntegrationsContext = createContext<IntegrationsContextType | null>(null);

interface IntegrationsProviderProps {
  children: ReactNode;
  userId: string;
}

export function IntegrationsProvider({ children, userId }: IntegrationsProviderProps): React.ReactElement {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => {
    return getIntegrations();
  });

  const [pushHistory, setPushHistory] = useState<SuggestionPush[]>(() => {
    return getPushHistory();
  });

  // Persist integrations to localStorage whenever they change
  useEffect(() => {
    saveIntegrations(integrations);
  }, [integrations]);

  const addIntegration = useCallback((config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>): IntegrationConfig => {
    const now = new Date().toISOString();
    const newIntegration = {
      ...config,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    } as IntegrationConfig;

    setIntegrations((prev) => [...prev, newIntegration]);
    return newIntegration;
  }, []);

  const updateIntegration = useCallback((id: string, updates: Partial<IntegrationConfig>): void => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id
          ? { ...integration, ...updates, updatedAt: new Date().toISOString() } as IntegrationConfig
          : integration
      )
    );
  }, []);

  const deleteIntegration = useCallback((id: string): void => {
    setIntegrations((prev) => prev.filter((integration) => integration.id !== id));
  }, []);

  const toggleIntegration = useCallback((id: string): void => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id
          ? { ...integration, enabled: !integration.enabled, updatedAt: new Date().toISOString() }
          : integration
      )
    );
  }, []);

  const pushSuggestion = useCallback(async (
    suggestionId: string,
    integrationId: string,
    pushUserId: string
  ): Promise<SuggestionPush> => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (!integration.enabled) {
      throw new Error('Integration is disabled');
    }

    const suggestions = getSuggestions();
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    const pushRecord = await pushSuggestionToIntegration(integration, suggestion, pushUserId);
    addPushRecord(pushRecord);
    setPushHistory((prev) => [...prev, pushRecord]);

    return pushRecord;
  }, [integrations]);

  const getSuggestionPushes = useCallback((suggestionId: string): SuggestionPush[] => {
    return pushHistory.filter((p) => p.suggestionId === suggestionId);
  }, [pushHistory]);

  const testConnection = useCallback(async (config: IntegrationConfig): Promise<{ success: boolean; message: string }> => {
    return testIntegrationConnection(config);
  }, []);

  const value: IntegrationsContextType = {
    integrations,
    pushHistory,
    addIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegration,
    pushSuggestion,
    getSuggestionPushes,
    testConnection,
  };

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations(): IntegrationsContextType {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
}

export default IntegrationsContext;
