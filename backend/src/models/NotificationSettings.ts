import mongoose, { Document, Schema, Model } from 'mongoose';

export interface INotificationSettings extends Document {
  userId: mongoose.Types.ObjectId;
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhook?: string;
  discordEnabled: boolean;
  discordWebhook?: string;
  jiraEnabled: boolean;
  jiraUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  linearEnabled: boolean;
  linearApiKey?: string;
  linearTeamId?: string;
  notifyOn: {
    reviewCompleted: boolean;
    reviewFailed: boolean;
    newComment: boolean;
  };
}

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    emailEnabled: { type: Boolean, default: true },
    slackEnabled: { type: Boolean, default: false },
    slackWebhook: { type: String, default: '' },
    discordEnabled: { type: Boolean, default: false },
    discordWebhook: { type: String, default: '' },
    jiraEnabled: { type: Boolean, default: false },
    jiraUrl: { type: String, default: '' },
    jiraEmail: { type: String, default: '' },
    jiraApiToken: { type: String, default: '' },
    jiraProjectKey: { type: String, default: '' },
    linearEnabled: { type: Boolean, default: false },
    linearApiKey: { type: String, default: '' },
    linearTeamId: { type: String, default: '' },
    notifyOn: {
      reviewCompleted: { type: Boolean, default: true },
      reviewFailed: { type: Boolean, default: true },
      newComment: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const NotificationSettings: Model<INotificationSettings> =
  mongoose.model<INotificationSettings>(
    'NotificationSettings',
    notificationSettingsSchema,
  );
