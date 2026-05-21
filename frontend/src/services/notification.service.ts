import api from './api';

export interface Notification {
  _id: string;
  requestId: string;
  eventType: string;
  outcome: string;
  repositoryFullName?: string;
  pullRequestNumber?: number;
  failureReason?: string;
  createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  const { data } = await api.get<{ success: boolean; notifications: Notification[] }>('/notifications');
  return data.notifications;
};

const notificationService = {
  getNotifications,
};

export default notificationService;
