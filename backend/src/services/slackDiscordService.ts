import axios from 'axios';
import { logger } from '../lib/logger';
import { INotificationSettings } from '../models/NotificationSettings';

export interface WebhookPayload {
  title: string;
  message: string;
  url?: string;
  color?: string; // Hex color
}

export const sendSlackNotification = async (webhookUrl: string, payload: WebhookPayload): Promise<void> => {
  try {
    await axios.post(webhookUrl, {
      attachments: [
        {
          color: payload.color || '#36a64f',
          title: payload.title,
          title_link: payload.url,
          text: payload.message,
        }
      ]
    });
    logger.info('Slack notification sent successfully');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to send Slack notification');
  }
};

export const sendDiscordNotification = async (webhookUrl: string, payload: WebhookPayload): Promise<void> => {
  try {
    const colorInt = payload.color ? parseInt(payload.color.replace('#', ''), 16) : 3447003;
    await axios.post(webhookUrl, {
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          url: payload.url,
          color: colorInt,
        }
      ]
    });
    logger.info('Discord notification sent successfully');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to send Discord notification');
  }
};

export const dispatchNotifications = async (
  settingsList: INotificationSettings[],
  event: 'reviewCompleted' | 'reviewFailed' | 'newComment',
  payload: WebhookPayload
) => {
  for (const settings of settingsList) {
    if (!settings.notifyOn[event]) continue;

    if (settings.slackEnabled && settings.slackWebhook) {
      await sendSlackNotification(settings.slackWebhook, payload).catch(() => {});
    }
    
    if (settings.discordEnabled && settings.discordWebhook) {
      await sendDiscordNotification(settings.discordWebhook, payload).catch(() => {});
    }
  }
};
