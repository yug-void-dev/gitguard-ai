import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { getReviews } from '../services/review.service';
import type { Review } from '../types/review.types';

const statusConfig = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: CheckCircle2 },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Clock },
  failed: { bg: 'bg-red-500/15', text: 'text-red-400', icon: AlertCircle },
} as const;

const StatusBadge: React.FC<{ status: Review['status'] }> = ({ status }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${config.bg} ${config.text} text-sm font-semibold`}>
      <Icon size={16} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ReviewCard: React.FC<{ review: Review; onClick: () => void }> = ({ review, onClick }) => (
  <div
    onClick={onClick}
    className="cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:shadow-lg hover:shadow-indigo-500/10"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">{review.repository.fullName}</p>
        <h3 className="text-lg font-semibold text-white truncate">{review.prTitle}</h3>
        <p className="text-sm text-slate-400 mt-2 truncate">Pull request #{review.prNumber}</p>
      </div>
      <StatusBadge status={review.status} />
    </div>

    <div className="mt-4 text-sm text-slate-400 line-clamp-2">{review.summary}</div>

    <div className="mt-5 grid gap-2 sm:grid-cols-3 text-xs text-slate-400">
      <div className="rounded-2xl bg-slate-950/70 p-3">
        <div className="font-semibold text-white">{review.metrics.vulnerabilitiesCount}</div>
        <div>Vulnerabilities</div>
      </div>
      <div className="rounded-2xl bg-slate-950/70 p-3">
        <div className="font-semibold text-white">{review.metrics.performanceIssuesCount}</div>
        <div>Performance issues</div>
      </div>
      <div className="rounded-2xl bg-slate-950/70 p-3">
        <div className="font-semibold text-white">{review.metrics.codeQualityScore}%</div>
        <div>Quality score</div>
      </div>
    </div>
  </div>
);

type SortField = 'date' | 'vulnerabilities' | 'score';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);

    getReviews()
      .then(setReviews)
      .catch((err) => {
        const message = err?.response?.data?.message ?? err.message ?? 'Unable to load reviews.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredReviews = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return reviews
      .filter((review) => {
        if (statusFilter !== 'all' && review.status !== statusFilter) {
          return false;
        }

        if (!query) return true;

        return (
          review.repository.fullName.toLowerCase().includes(query) ||
          review.prTitle.toLowerCase().includes(query) ||
          review.prNumber.toString().includes(query)
        );
      })
      .sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortField) {
          case 'vulnerabilities':
            aValue = a.metrics.vulnerabilitiesCount;
            bValue = b.metrics.vulnerabilitiesCount;
            break;
          case 'score':
            aValue = a.metrics.codeQualityScore;
            bValue = b.metrics.codeQualityScore;
            break;
          case 'date':
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
  }, [reviews, searchTerm, statusFilter, sortField, sortOrder]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Review center</p>
              <h1 className="text-4xl font-bold text-white">Reviews</h1>
              <p className="mt-2 text-slate-400">Browse the latest review results and open details for each item.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="gg-btn"
              >
                View history
              </button>
              <button
                type="button"
                onClick={() => navigate('/repositories')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Manage repositories
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total reviews</p>
              <p className="mt-3 text-3xl font-semibold text-white">{reviews.length}</p>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Completed</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-400">{reviews.filter((review) => review.status === 'completed').length}</p>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pending</p>
              <p className="mt-3 text-3xl font-semibold text-amber-400">{reviews.filter((review) => review.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">Review list</p>
                <h2 className="text-2xl font-semibold text-white">All reviews</h2>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                <label className="block text-slate-400">
                  <span className="sr-only">Search reviews</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search reviews"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-10 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </label>

                <label className="block text-slate-400">
                  <span className="sr-only">Filter status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="all">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>

                <label className="block text-slate-400">
                  <span className="sr-only">Sort reviews</span>
                  <select
                    value={`${sortField}-${sortOrder}`}
                    onChange={(event) => {
                      const [field, order] = event.target.value.split('-') as [SortField, SortOrder];
                      setSortField(field);
                      setSortOrder(order);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="date-desc">Newest first</option>
                    <option value="date-asc">Oldest first</option>
                    <option value="vulnerabilities-desc">Most vulns</option>
                    <option value="vulnerabilities-asc">Fewest vulns</option>
                    <option value="score-desc">Top score</option>
                    <option value="score-asc">Lowest score</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-10 text-center text-slate-400">Loading reviews…</div>
              ) : error ? (
                <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center text-red-200">
                  <p className="font-semibold">Unable to load reviews</p>
                  <p className="mt-2 text-sm text-slate-300">{error}</p>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-10 text-center text-slate-400">
                  <p className="font-semibold text-white">No reviews found</p>
                  <p className="mt-2 text-sm">Try a different search or filter.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onClick={() => navigate(`/history/${review.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
              <div className="flex items-center gap-3 text-slate-400">
                <Filter size={18} />
                <p className="font-semibold text-white">Review insights</p>
              </div>
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Clean reviews</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">{reviews.filter((review) => review.metrics.vulnerabilitiesCount === 0).length}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Issues detected</p>
                  <p className="mt-2 text-xl font-semibold text-amber-300">{reviews.reduce((sum, review) => sum + review.metrics.vulnerabilitiesCount, 0)}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Average quality</p>
                  <p className="mt-2 text-xl font-semibold text-cyan-300">
                    {reviews.length > 0
                      ? Math.round(reviews.reduce((sum, review) => sum + review.metrics.codeQualityScore, 0) / reviews.length)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
              <div className="flex items-center gap-3 text-slate-400">
                <Zap size={18} />
                <p className="font-semibold text-white">Usage</p>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Reviews are loaded from the backend API and show current pull request audit status.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
