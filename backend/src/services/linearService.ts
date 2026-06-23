/**
 * @file src/services/linearService.ts
 * @description Service for integrating with Linear GraphQL API.
 */

import axios from 'axios';
import { logger } from '../lib/logger';
import { INotificationSettings } from '../models/NotificationSettings';

export async function createLinearIssue(
  settings: INotificationSettings,
  title: string,
  description: string
): Promise<void> {
  if (!settings.linearEnabled || !settings.linearApiKey || !settings.linearTeamId) {
    return;
  }

  const log = logger.child({ module: 'linearService', teamId: settings.linearTeamId });

  try {
    const query = `
      mutation IssueCreate($title: String!, $description: String, $teamId: String!) {
        issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
          success
          issue {
            id
            title
          }
        }
      }
    `;

    const variables = {
      title,
      description,
      teamId: settings.linearTeamId
    };

    const response = await axios.post(
      'https://api.linear.app/graphql',
      { query, variables },
      {
        headers: {
          'Authorization': settings.linearApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      log.error({ errors: response.data.errors }, 'Linear GraphQL returned errors');
      return;
    }

    log.info('Successfully created Linear issue');
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as Error & { response?: { data?: any } };
    log.error({ error: err.message, data: err.response?.data }, 'Failed to create Linear issue');
  }
}
