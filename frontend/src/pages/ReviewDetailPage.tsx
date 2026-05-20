import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Zap, X } from 'lucide-react';
import { getReview } from '../services/review.service';
import type { Review } from '../types/review.types';

const statusConfig = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: CheckCircle2 },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Clock },
  failed: { bg: 'bg-red-500/15', text: 'text-red-400', icon: AlertCircle },
} as const;

const severityConfig = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  info: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
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

const SeverityBadge: React.FC<{ severity: Review['findings'][number]['severity'] }> = ({ severity }) => {
  const config = severityConfig[severity];

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const FindingCard: React.FC<{ finding: Review['findings'][number] }> = ({ finding }) => (
  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono">
          {finding.file}:{finding.line}
          <SeverityBadge severity={finding.severity} />
        </div>
        <p className="text-sm text-slate-200 font-medium">{finding.message}</p>
      </div>
      <div className="text-right text-slate-400 text-xs">
        <div>Confidence</div>
        <div className="mt-1 text-sm font-semibold text-cyan-300">{Math.round(finding.confidence * 100)}%</div>
      </div>
    </div>
    <div className="rounded-lg border-l-2 border-cyan-500/40 bg-slate-950/60 p-3">
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-cyan-300">Suggestion:</span> {finding.suggestion}
      </p>
    </div>
  </div>
);

const ReviewDetailPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) {
      setError('Review ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getReview(reviewId)
      .then((data) => setReview(data))
      .catch((fetchError) => {
        const message = fetchError?.response?.data?.message ?? fetchError.message ?? 'Unable to load review.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [reviewId]);

  const createdAt = review ? new Date(review.createdAt) : null;
  const updatedAt = review ? new Date(review.updatedAt) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 px-8 py-10 text-center shadow-2xl shadow-black/40">
          <p className="text-xl font-semibold">Loading review details...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl shadow-black/50">
          <h1 className="text-3xl font-bold mb-4">Review not found</h1>
          <p className="text-slate-400 mb-6">{error ?? 'The review does not exist or could not be loaded.'}</p>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="gg-btn"
          >
            Back to history
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Review details</p>
            <h1 className="text-4xl font-bold">{review.repository.fullName} #{review.prNumber}</h1>
            <p className="text-slate-300 mt-2">{review.prTitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge status={review.status} />
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
            >
              <X size={16} />
              Back to history
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Vulnerabilities</p>
            <p className="text-4xl font-bold text-red-400">{review.metrics.vulnerabilitiesCount}</p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Performance issues</p>
            <p className="text-4xl font-bold text-amber-400">{review.metrics.performanceIssuesCount}</p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Quality score</p>
            <p className="text-4xl font-bold text-emerald-400">{review.metrics.codeQualityScore}%</p>
            <p className="text-sm text-slate-400 mt-2">Generated at {updatedAt?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <section className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-slate-400">Summary</p>
                  <h2 className="text-xl font-semibold text-white">Review overview</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{review.findings.length} findings</div>
              </div>
              <p className="text-slate-300 leading-relaxed">{review.summary}</p>
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-sm text-slate-400">Findings</p>
                  <h2 className="text-xl font-semibold text-white">Detailed issues</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                  <Zap size={16} />
                  {review.findings.length} issues detected
                </div>
              </div>

              {review.findings.length > 0 ? (
                <div className="space-y-4">
                  {review.findings.map((finding) => (
                    <FindingCard key={`${finding.file}-${finding.line}`} finding={finding} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-5 text-slate-300">
                  <p className="text-sm text-emerald-200 font-semibold">No vulnerabilities or issues found.</p>
                  <p className="text-sm text-slate-400 mt-2">This review shows a clean audit with no flagged findings.</p>
                </div>
              )}
            </section>

            {review.diffData ? (
              <section className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-sm text-slate-400">Diff</p>
                    <h2 className="text-xl font-semibold text-white">Review diff data</h2>
                  </div>
                </div>
                <pre className="max-h-[360px] overflow-auto rounded-2xl bg-slate-950/80 p-4 text-[0.95rem] leading-6 text-slate-200 whitespace-pre-wrap break-words border border-white/10">
                  {review.diffData}
                </pre>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <p className="text-sm text-slate-400 mb-3">Repository</p>
              <p className="text-base font-semibold text-white">{review.repository.fullName}</p>
              <p className="text-slate-400 mt-2">Pull request #{review.prNumber}</p>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
                <p className="text-sm text-slate-300">{createdAt?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Updated</p>
                <p className="text-sm text-slate-300">{updatedAt?.toLocaleString()}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailPage;
