import { IntegrationCategory, IntegrationMeta, IntegrationType } from '../types/integrations';

// Category labels for UI display
export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, string> = {
  'product-management': 'Product Management',
};

// Preset metadata for each integration type
export const INTEGRATION_PRESETS: IntegrationMeta[] = [
  {
    type: 'jira',
    name: 'Jira',
    icon: 'external-link',
    description: 'Create issues in Atlassian Jira',
    category: 'product-management',
    fields: [
      {
        key: 'baseUrl',
        label: 'Jira URL',
        type: 'url',
        placeholder: 'https://your-domain.atlassian.net',
        required: true,
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'your-email@company.com',
        required: true,
      },
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your Jira API token',
        required: true,
      },
      {
        key: 'projectKey',
        label: 'Project Key',
        type: 'text',
        placeholder: 'e.g., PROJ',
        required: true,
      },
      {
        key: 'issueType',
        label: 'Issue Type',
        type: 'text',
        placeholder: 'e.g., Story, Task, Bug',
        required: true,
      },
    ],
  },
  {
    type: 'linear',
    name: 'Linear',
    icon: 'arrow-right',
    description: 'Create issues in Linear',
    category: 'product-management',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Linear API key',
        required: true,
      },
      {
        key: 'teamId',
        label: 'Team ID',
        type: 'text',
        placeholder: 'Your Linear team ID',
        required: true,
      },
    ],
  },
  {
    type: 'asana',
    name: 'Asana',
    icon: 'check',
    description: 'Create tasks in Asana',
    category: 'product-management',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Your Asana access token',
        required: true,
      },
      {
        key: 'workspaceGid',
        label: 'Workspace GID',
        type: 'text',
        placeholder: 'Your Asana workspace GID',
        required: true,
      },
      {
        key: 'projectGid',
        label: 'Project GID',
        type: 'text',
        placeholder: 'Your Asana project GID',
        required: true,
      },
    ],
  },
];

// Get metadata for a specific integration type
export function getIntegrationMeta(type: IntegrationType): IntegrationMeta | undefined {
  return INTEGRATION_PRESETS.find((preset) => preset.type === type);
}

// Get all integrations grouped by category
export function getIntegrationsByCategory(): Record<IntegrationCategory, IntegrationMeta[]> {
  const grouped: Record<IntegrationCategory, IntegrationMeta[]> = {
    'product-management': [],
  };

  INTEGRATION_PRESETS.forEach((preset) => {
    grouped[preset.category].push(preset);
  });

  return grouped;
}

// Get all integration types
export function getAllIntegrationTypes(): IntegrationType[] {
  return INTEGRATION_PRESETS.map((preset) => preset.type);
}
