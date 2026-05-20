import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Finding {
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low' | 'info';
  message: string;
  suggestion: string;
  confidence: number;
}

interface Metrics {
  vulnerabilitiesCount: number;
  performanceIssuesCount: number;
  codeQualityScore: number;
}

interface Review {
  id: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  prNumber: number;
  prTitle: string;
  status: 'pending' | 'completed' | 'failed';
  findings: Finding[];
  summary: string;
  metrics: Metrics;
  createdAt: Date;
  updatedAt: Date;
}

type SortField = 'date' | 'vulnerabilities' | 'score';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockReviews: Review[] = [
  {
    id: '1',
    repository: { owner: 'myorg', name: 'api-service', fullName: 'myorg/api-service' },
    prNumber: 542,
    prTitle: 'feat: add authentication middleware',
    status: 'completed',
    findings: [
      { file: 'src/auth/middleware.ts', line: 42, severity: 'high', message: 'SQL injection vulnerability', suggestion: 'Use parameterized queries', confidence: 0.95 },
      { file: 'src/auth/utils.ts', line: 18, severity: 'medium', message: 'Weak password validation', suggestion: 'Enforce minimum 12 characters', confidence: 0.87 },
      { file: 'src/routes/auth.ts', line: 105, severity: 'low', message: 'Missing error logging', suggestion: 'Add logger.error call', confidence: 0.72 },
    ],
    summary: 'Review completed. Found 3 issues: 1 high severity vulnerability detected in SQL query handling. 2 medium severity issues related to authentication logic.',
    metrics: { vulnerabilitiesCount: 1, performanceIssuesCount: 0, codeQualityScore: 78 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '2',
    repository: { owner: 'myorg', name: 'frontend-app', fullName: 'myorg/frontend-app' },
    prNumber: 315,
    prTitle: 'refactor: migrate to React hooks',
    status: 'completed',
    findings: [
      { file: 'src/components/Dashboard.tsx', line: 67, severity: 'medium', message: 'Missing dependency in useEffect', suggestion: 'Add dependency array', confidence: 0.92 },
      { file: 'src/hooks/useData.ts', line: 23, severity: 'low', message: 'Console.log left in code', suggestion: 'Remove debug statements', confidence: 0.99 },
    ],
    summary: 'Code quality review complete. 2 issues found affecting performance and maintainability.',
    metrics: { vulnerabilitiesCount: 0, performanceIssuesCount: 1, codeQualityScore: 82 },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: '3',
    repository: { owner: 'myorg', name: 'backend-core', fullName: 'myorg/backend-core' },
    prNumber: 89,
    prTitle: 'feat: implement caching layer',
    status: 'completed',
    findings: [],
    summary: 'Excellent code quality. No vulnerabilities detected. All security best practices followed.',
    metrics: { vulnerabilitiesCount: 0, performanceIssuesCount: 0, codeQualityScore: 95 },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    repository: { owner: 'myorg', name: 'data-pipeline', fullName: 'myorg/data-pipeline' },
    prNumber: 167,
    prTitle: 'fix: handle edge cases in data processing',
    status: 'pending',
    findings: [],
    summary: 'Analysis in progress...',
    metrics: { vulnerabilitiesCount: 0, performanceIssuesCount: 0, codeQualityScore: 0 },
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '5',
    repository: { owner: 'myorg', name: 'ml-models', fullName: 'myorg/ml-models' },
    prNumber: 203,
    prTitle: 'upgrade: TensorFlow to 2.14',
    status: 'failed',
    findings: [],
    summary: 'Analysis failed: Unable to parse Python syntax. Review manually.',
    metrics: { vulnerabilitiesCount: 0, performanceIssuesCount: 0, codeQualityScore: 0 },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

// ─── Status Badge Component ────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'pending' | 'completed' | 'failed';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: CheckCircle2 },
    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Clock },
    failed: { bg: 'bg-red-500/15', text: 'text-red-400', icon: AlertCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.text} text-xs font-medium`}>
      <Icon size={14} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};


// ─── Review Card Component ────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  onClick: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onClick }) => (
  <div
    onClick={onClick}
    className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/3 border border-white/10 hover:border-white/20 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 group"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Repository & PR */}
        <div className="mb-2">
          <h3 className="text-sm font-mono text-cyan-400 group-hover:text-cyan-300 transition-colors">
            {review.repository.fullName} #{review.prNumber}
          </h3>
          <p className="text-sm text-white font-medium truncate">{review.prTitle}</p>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{review.summary}</p>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs">
          {review.metrics.vulnerabilitiesCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={14} />
              <span>{review.metrics.vulnerabilitiesCount} vuln</span>
            </div>
          )}
          {review.metrics.performanceIssuesCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Zap size={14} />
              <span>{review.metrics.performanceIssuesCount} perf</span>
            </div>
          )}
          {review.metrics.codeQualityScore > 0 && (
            <div className="text-emerald-400">
              Quality: <span className="font-semibold">{review.metrics.codeQualityScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={review.status} />
        <div className="text-xs text-slate-500">
          {new Date(review.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main History Page ────────────────────────────────────────────────────────

const HistoryPage: React.FC = () => {
  const [reviews] = useState<Review[]>(mockReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Filter and sort logic
  const filtered = useMemo(() => {
    let result = reviews;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.repository.fullName.toLowerCase().includes(term) ||
          r.prTitle.toLowerCase().includes(term) ||
          r.prNumber.toString().includes(term)
      );
    }

    return result;
  }, [reviews, searchTerm, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'vulnerabilities':
          aVal = a.metrics.vulnerabilitiesCount;
          bVal = b.metrics.vulnerabilitiesCount;
          break;
        case 'score':
          aVal = a.metrics.codeQualityScore;
          bVal = b.metrics.codeQualityScore;
          break;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return copy;
  }, [filtered, sortField, sortOrder]);

  const stats = {
    total: reviews.length,
    completed: reviews.filter((r) => r.status === 'completed').length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    failed: reviews.filter((r) => r.status === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Review History</h1>
          <p className="text-slate-400">Explore and analyze all pull request reviews</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-slate-400 mb-1">Total Reviews</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-sm text-emerald-400 mb-1">Completed</div>
            <div className="text-3xl font-bold text-emerald-400">{stats.completed}</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="text-sm text-amber-400 mb-1">Pending</div>
            <div className="text-3xl font-bold text-amber-400">{stats.pending}</div>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-sm text-red-400 mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Search & Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by repo, PR title, or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center gap-2"
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 rounded-lg bg-white/3 border border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Sort By</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="date">Date</option>
                    <option value="vulnerabilities">Vulnerabilities</option>
                    <option value="score">Quality Score</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {sorted.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">
              Showing {sorted.length} of {reviews.length} reviews
            </div>
            {sorted.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => navigate(`/history/${review.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg bg-white/3 border border-white/10">
            <p className="text-slate-400 mb-2">No reviews found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryPage;
