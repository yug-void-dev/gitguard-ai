import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import type { Review } from '../types/review.types';
import Spinner from '../components/common/Spinner';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    reviews,
    totalItems,
    isLoading,
    filters,
    setFilters,
  } = useReviews({ status: 'all' });

  const navigate = useNavigate();

  // Local filtering for search (if backend search isn't fully implemented yet)
  const filtered = reviews.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.repository.fullName.toLowerCase().includes(term) ||
      r.prTitle.toLowerCase().includes(term) ||
      r.prNumber.toString().includes(term)
    );
  });

  const stats = {
    total: totalItems,
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
                    value={filters.status || 'all'}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size={32} />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">
              Showing {filtered.length} reviews
            </div>
            {filtered.map((review) => (
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
