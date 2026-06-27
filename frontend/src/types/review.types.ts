export interface ReviewFinding {
  _id?: string;
  id?: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  suggestion: string;
  confidence: number;
}

export interface ReviewMetrics {
  vulnerabilitiesCount: number;
  performanceIssuesCount: number;
  codeQualityScore: number;
}

export interface ReviewRepository {
  owner: string;
  name: string;
  fullName: string;
}

export interface Review {
  id: string;
  repository: ReviewRepository;
  prNumber: number;
  prTitle: string;
  status: 'pending' | 'completed' | 'failed';
  findings: ReviewFinding[];
  summary: string;
  metrics: ReviewMetrics;
  diffData?: string;
  triggeredBy?: string;
  createdAt: string;
  updatedAt: string;
}
