/**
 * @file src/services/jiraService.ts
 * @description Service for integrating with Jira Cloud REST API.
 */

import axios from 'axios';
import { logger } from '../lib/logger';
import { INotificationSettings } from '../models/NotificationSettings';

export async function createJiraIssue(
  settings: INotificationSettings,
  title: string,
  description: string
): Promise<void> {
  if (!settings.jiraEnabled || !settings.jiraUrl || !settings.jiraEmail || !settings.jiraApiToken || !settings.jiraProjectKey) {
    return;
  }

  const log = logger.child({ module: 'jiraService', project: settings.jiraProjectKey });

  try {
    const auth = Buffer.from(`${settings.jiraEmail}:${settings.jiraApiToken}`).toString('base64');
    
    // Format Jira domain, ensuring no trailing slash
    const baseUrl = settings.jiraUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/rest/api/2/issue`;

    const payload = {
      fields: {
        project: {
          key: settings.jiraProjectKey
        },
        summary: title,
        description: description,
        issuetype: {
          name: 'Bug' // Default to Bug type
        }
      }
    };

    await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    log.info('Successfully created Jira issue');
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as Error & { response?: { data?: any } };
    log.error({ error: err.message, data: err.response?.data }, 'Failed to create Jira issue');
  }
}
