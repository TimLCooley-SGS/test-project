import {
  IntegrationConfig,
  JiraConfig,
  LinearConfig,
  AsanaConfig,
  SuggestionPush,
} from '../types/integrations';
import { Suggestion } from '../types/theme';
import { generateId } from '../storage';

interface PushResult {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

// Push a suggestion to Jira
export async function pushToJira(
  config: JiraConfig,
  suggestion: Suggestion
): Promise<PushResult> {
  const url = `${config.baseUrl}/rest/api/3/issue`;
  const auth = btoa(`${config.email}:${config.apiToken}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary: suggestion.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: suggestion.description }],
              },
            ],
          },
          issuetype: { name: config.issueType },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.errorMessages?.join(', ') || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      externalId: data.key,
      externalUrl: `${config.baseUrl}/browse/${data.key}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to push to Jira',
    };
  }
}

// Push a suggestion to Linear
export async function pushToLinear(
  config: LinearConfig,
  suggestion: Suggestion
): Promise<PushResult> {
  const url = 'https://api.linear.app/graphql';

  const mutation = `
    mutation CreateIssue($title: String!, $description: String!, $teamId: String!) {
      issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          title: suggestion.title,
          description: suggestion.description,
          teamId: config.teamId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors.map((e: { message: string }) => e.message).join(', '));
    }

    if (!data.data?.issueCreate?.success) {
      throw new Error('Failed to create issue');
    }

    const issue = data.data.issueCreate.issue;
    return {
      success: true,
      externalId: issue.identifier,
      externalUrl: issue.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to push to Linear',
    };
  }
}

// Push a suggestion to Asana
export async function pushToAsana(
  config: AsanaConfig,
  suggestion: Suggestion
): Promise<PushResult> {
  const url = 'https://app.asana.com/api/1.0/tasks';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          name: suggestion.title,
          notes: suggestion.description,
          workspace: config.workspaceGid,
          projects: [config.projectGid],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      externalId: data.data.gid,
      externalUrl: `https://app.asana.com/0/${config.projectGid}/${data.data.gid}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to push to Asana',
    };
  }
}

// Route to correct handler based on integration type
export async function pushSuggestionToIntegration(
  config: IntegrationConfig,
  suggestion: Suggestion,
  userId: string
): Promise<SuggestionPush> {
  let result: PushResult;

  switch (config.type) {
    case 'jira':
      result = await pushToJira(config as JiraConfig, suggestion);
      break;
    case 'linear':
      result = await pushToLinear(config as LinearConfig, suggestion);
      break;
    case 'asana':
      result = await pushToAsana(config as AsanaConfig, suggestion);
      break;
    default:
      throw new Error(`Unknown integration type`);
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to push suggestion');
  }

  return {
    id: generateId(),
    suggestionId: suggestion.id,
    integrationId: config.id,
    integrationType: config.type,
    externalId: result.externalId!,
    externalUrl: result.externalUrl!,
    pushedAt: new Date().toISOString(),
    pushedBy: userId,
  };
}

// Test integration connection
export async function testIntegrationConnection(
  config: IntegrationConfig
): Promise<ConnectionTestResult> {
  try {
    switch (config.type) {
      case 'jira':
        return await testJiraConnection(config as JiraConfig);
      case 'linear':
        return await testLinearConnection(config as LinearConfig);
      case 'asana':
        return await testAsanaConnection(config as AsanaConfig);
      default:
        return { success: false, message: 'Unknown integration type' };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}

async function testJiraConnection(config: JiraConfig): Promise<ConnectionTestResult> {
  const url = `${config.baseUrl}/rest/api/3/myself`;
  const auth = btoa(`${config.email}:${config.apiToken}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  });

  if (response.ok) {
    const data = await response.json();
    return { success: true, message: `Connected as ${data.displayName || data.emailAddress}` };
  }

  if (response.status === 401) {
    return { success: false, message: 'Invalid credentials' };
  }

  return { success: false, message: `Connection failed: HTTP ${response.status}` };
}

async function testLinearConnection(config: LinearConfig): Promise<ConnectionTestResult> {
  const url = 'https://api.linear.app/graphql';
  const query = `query { viewer { id name email } }`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (response.ok) {
    const data = await response.json();
    if (data.data?.viewer) {
      return { success: true, message: `Connected as ${data.data.viewer.name || data.data.viewer.email}` };
    }
    if (data.errors) {
      return { success: false, message: data.errors[0]?.message || 'API error' };
    }
  }

  return { success: false, message: `Connection failed: HTTP ${response.status}` };
}

async function testAsanaConnection(config: AsanaConfig): Promise<ConnectionTestResult> {
  const url = 'https://app.asana.com/api/1.0/users/me';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    return { success: true, message: `Connected as ${data.data.name || data.data.email}` };
  }

  if (response.status === 401) {
    return { success: false, message: 'Invalid access token' };
  }

  return { success: false, message: `Connection failed: HTTP ${response.status}` };
}
