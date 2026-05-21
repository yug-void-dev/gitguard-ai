import api from './api';

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueMetricsResponse {
  success: boolean;
  message: string;
  data: {
    queueName: string;
    counts: QueueCounts;
    isPaused: boolean;
    capturedAt: string;
  };
}

export const getQueueMetrics = async (): Promise<QueueMetricsResponse['data']> => {
  const { data } = await api.get<QueueMetricsResponse>('/queue/metrics');
  return data.data;
};

const queueService = {
  getQueueMetrics,
};

export default queueService;
