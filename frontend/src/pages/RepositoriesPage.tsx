import React, { useState, useMemo } from 'react';
import { Plus, Search, Settings, ToggleRight, Trash2, GitBranch, Code2, Shield, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewMode = 'full' | 'security-only' | 'strict' | 'off';

interface Repository {
  id: string;
  githubId: number;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  reviewMode: ReviewMode;
  ignorePatterns: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewsCount?: number;
  lastReviewDate?: Date;
}

type SortField = 'name' | 'language' | 'reviews' | 'recent';
type SortOrder = 'asc' | 'desc';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockRepositories: Repository[] = [
  {
    id: '1',
    githubId: 123456,
    fullName: 'myorg/api-service',
    isPrivate: false,
    defaultBranch: 'main',
    language: 'TypeScript',
    reviewMode: 'full',
    ignorePatterns: ['*.test.ts', 'dist/**'],
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    reviewsCount: 42,
    lastReviewDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '2',
    githubId: 123457,
    fullName: 'myorg/frontend-app',
    isPrivate: false,
    defaultBranch: 'main',
    language: 'JavaScript',
    reviewMode: 'security-only',
    ignorePatterns: ['node_modules/**', '.next/**'],
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    reviewsCount: 28,
    lastReviewDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '3',
    githubId: 123458,
    fullName: 'myorg/data-pipeline',
    isPrivate: true,
    defaultBranch: 'develop',
    language: 'Python',
    reviewMode: 'strict',
    ignorePatterns: ['venv/**', '__pycache__/**'],
    isActive: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    reviewsCount: 15,
    lastReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    githubId: 123459,
    fullName: 'myorg/ml-models',
    isPrivate: true,
    defaultBranch: 'main',
    language: 'Python',
    reviewMode: 'full',
    ignorePatterns: ['models/**', 'datasets/**'],
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reviewsCount: 8,
    lastReviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    githubId: 123460,
    fullName: 'myorg/backend-core',
    isPrivate: false,
    defaultBranch: 'main',
    language: 'Go',
    reviewMode: 'strict',
    ignorePatterns: ['vendor/**'],
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    reviewsCount: 22,
    lastReviewDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: '6',
    githubId: 123461,
    fullName: 'myorg/legacy-service',
    isPrivate: false,
    defaultBranch: 'master',
    language: 'Java',
    reviewMode: 'off',
    ignorePatterns: [],
    isActive: false,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    reviewsCount: 0,
  },
];

// ─── Review Mode Badge ────────────────────────────────────────────────────────

interface ReviewModeBadgeProps {
  mode: ReviewMode;
}

const ReviewModeBadge: React.FC<ReviewModeBadgeProps> = ({ mode }) => {
  const modeConfig = {
    full: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Full Review' },
    'security-only': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Security Only' },
    strict: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Strict' },
    off: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Disabled' },
  };

  const config = modeConfig[mode];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.text} text-xs font-medium border ${config.border}`}>
      <Shield size={12} />
      {config.label}
    </span>
  );
};

// ─── Language Badge ───────────────────────────────────────────────────────────

interface LanguageBadgeProps {
  language: string | null;
}

const LanguageBadge: React.FC<LanguageBadgeProps> = ({ language }) => {
  if (!language) return <span className="text-xs text-slate-500">Unknown</span>;

  const languageColors: Record<string, string> = {
    TypeScript: 'bg-blue-500/20 text-blue-400',
    JavaScript: 'bg-yellow-500/20 text-yellow-400',
    Python: 'bg-green-500/20 text-green-400',
    Go: 'bg-cyan-500/20 text-cyan-400',
    Java: 'bg-orange-500/20 text-orange-400',
    Rust: 'bg-red-500/20 text-red-400',
    Ruby: 'bg-pink-500/20 text-pink-400',
    PHP: 'bg-purple-500/20 text-purple-400',
  };

  const colorClass = languageColors[language] || 'bg-slate-500/20 text-slate-400';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      <Code2 size={12} />
      {language}
    </span>
  );
};

// ─── Repository Card Component ────────────────────────────────────────────────

interface RepositoryCardProps {
  repo: Repository;
  onConfigure: (repo: Repository) => void;
  onToggle: (repo: Repository) => void;
  onDelete: (repo: Repository) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repo, onConfigure, onToggle, onDelete }) => (
  <div className="p-5 rounded-lg bg-gradient-to-br from-white/5 to-white/3 border border-white/10 hover:border-white/20 transition-all duration-300 group">
    {/* Header */}
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-mono font-semibold text-cyan-400 group-hover:text-cyan-300 truncate">
            {repo.fullName}
          </h3>
          {repo.isPrivate && (
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-200">
              Private
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <GitBranch size={12} />
          {repo.defaultBranch}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {repo.isActive ? (
          <div className="flex items-center gap-1 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold">Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-500">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-xs font-semibold">Inactive</span>
          </div>
        )}
      </div>
    </div>

    {/* Badges */}
    <div className="flex flex-wrap gap-2 mb-4">
      <ReviewModeBadge mode={repo.reviewMode} />
      <LanguageBadge language={repo.language} />
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/3 border border-white/5 mb-4 text-xs">
      <div>
        <div className="text-slate-400 mb-1">Reviews</div>
        <div className="text-lg font-bold text-cyan-400">{repo.reviewsCount ?? 0}</div>
      </div>
      {repo.lastReviewDate ? (
        <div>
          <div className="text-slate-400 mb-1">Last Review</div>
          <div className="text-cyan-400 font-mono text-xs">{new Date(repo.lastReviewDate).toLocaleDateString()}</div>
        </div>
      ) : (
        <div>
          <div className="text-slate-400 mb-1">Ignore Patterns</div>
          <div className="text-cyan-400">{repo.ignorePatterns.length}</div>
        </div>
      )}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => onConfigure(repo)}
        className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Settings size={16} />
        Configure
      </button>
      <button
        onClick={() => onToggle(repo)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          repo.isActive
            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
            : 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-400'
        }`}
        title={repo.isActive ? 'Disable' : 'Enable'}
      >
        <ToggleRight size={16} />
      </button>
      <button
        onClick={() => onDelete(repo)}
        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

// ─── Configuration Modal Component ────────────────────────────────────────────

interface RepositorySettingsProps {
  repo: Repository;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRepo: Repository) => void;
}

const RepositorySettings: React.FC<RepositorySettingsProps> = ({ repo, isOpen, onClose, onSave }) => {
  const [reviewMode, setReviewMode] = React.useState<ReviewMode>(repo.reviewMode);
  const [ignorePatterns, setIgnorePatterns] = React.useState(repo.ignorePatterns.join('\n'));

  const handleSave = () => {
    const updatedRepo = {
      ...repo,
      reviewMode,
      ignorePatterns: ignorePatterns.split('\n').filter((p) => p.trim()),
    };
    onSave(updatedRepo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/10 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/80 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Repository Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Repository Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Repository</h3>
            <div className="p-4 rounded-lg bg-white/3 border border-white/5 space-y-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Full Name</div>
                <div className="text-sm text-white font-mono">{repo.fullName}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Default Branch</div>
                  <div className="text-sm text-white">{repo.defaultBranch}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Language</div>
                  <div className="text-sm text-white">{repo.language || 'Unknown'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Privacy</div>
                <div className="text-sm text-white">{repo.isPrivate ? 'Private' : 'Public'}</div>
              </div>
            </div>
          </div>

          {/* Review Mode */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Review Mode</h3>
            <select
              value={reviewMode}
              onChange={(e) => setReviewMode(e.target.value as ReviewMode)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="full">Full Review (Security + Quality)</option>
              <option value="security-only">Security Only</option>
              <option value="strict">Strict (Enhanced Checks)</option>
              <option value="off">Disabled</option>
            </select>
            <p className="text-xs text-slate-400 mt-2">
              {reviewMode === 'full' && 'Perform comprehensive security and code quality reviews on all pull requests.'}
              {reviewMode === 'security-only' && 'Only scan for security vulnerabilities. Skip general code quality checks.'}
              {reviewMode === 'strict' && 'Enhanced security checks with stricter quality standards and additional validations.'}
              {reviewMode === 'off' && 'Disable automatic reviews for this repository.'}
            </p>
          </div>

          {/* Ignore Patterns */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Ignore Patterns</h3>
            <textarea
              value={ignorePatterns}
              onChange={(e) => setIgnorePatterns(e.target.value)}
              placeholder="*.test.ts&#10;dist/**&#10;node_modules/**"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              rows={5}
            />
            <p className="text-xs text-slate-400 mt-2">One pattern per line. Use glob syntax. These files will be excluded from reviews.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/50 hover:shadow-xl"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Repositories Page ────────────────────────────────────────────────────

const RepositoriesPage: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>(mockRepositories);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Filter logic
  const filtered = useMemo(() => {
    let result = repositories;

    // Activity filter
    if (filterActive === 'active') {
      result = result.filter((r) => r.isActive);
    } else if (filterActive === 'inactive') {
      result = result.filter((r) => !r.isActive);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.fullName.toLowerCase().includes(term) ||
          (r.language && r.language.toLowerCase().includes(term)) ||
          r.defaultBranch.toLowerCase().includes(term)
      );
    }

    return result;
  }, [repositories, searchTerm, filterActive]);

  // Sort logic
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.fullName.toLowerCase();
          bVal = b.fullName.toLowerCase();
          break;
        case 'language':
          aVal = (a.language || '').toLowerCase();
          bVal = (b.language || '').toLowerCase();
          break;
        case 'reviews':
          aVal = a.reviewsCount ?? 0;
          bVal = b.reviewsCount ?? 0;
          break;
        case 'recent':
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) : aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });

    return copy;
  }, [filtered, sortField, sortOrder]);

  // Stats
  const stats = {
    total: repositories.length,
    active: repositories.filter((r) => r.isActive).length,
    inactive: repositories.filter((r) => !r.isActive).length,
    languages: new Set(repositories.filter((r) => r.language).map((r) => r.language)).size,
  };

  // Handlers
  const handleConfigure = (repo: Repository) => {
    setSelectedRepo(repo);
    setIsSettingsOpen(true);
  };

  const handleToggle = (repo: Repository) => {
    setRepositories(
      repositories.map((r) =>
        r.id === repo.id ? { ...r, isActive: !r.isActive } : r
      )
    );
  };

  const handleDelete = (repo: Repository) => {
    if (confirm(`Are you sure you want to delete ${repo.fullName}?`)) {
      setRepositories(repositories.filter((r) => r.id !== repo.id));
    }
  };

  const handleSave = (updatedRepo: Repository) => {
    setRepositories(
      repositories.map((r) =>
        r.id === updatedRepo.id ? updatedRepo : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Repositories</h1>
            <p className="text-slate-400">Manage and monitor your GitHub repositories</p>
          </div>
          <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold transition-all shadow-lg shadow-indigo-500/50 hover:shadow-xl flex items-center gap-2">
            <Plus size={18} />
            Add Repository
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-slate-400 mb-1">Total Repositories</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-sm text-emerald-400 mb-1">Active</div>
            <div className="text-3xl font-bold text-emerald-400">{stats.active}</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/30">
            <div className="text-sm text-slate-400 mb-1">Inactive</div>
            <div className="text-3xl font-bold text-slate-400">{stats.inactive}</div>
          </div>
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <div className="text-sm text-cyan-400 mb-1">Languages</div>
            <div className="text-3xl font-bold text-cyan-400">{stats.languages}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Filters & Sort */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filter */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Repositories</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Sort By */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="name">Sort by Name</option>
              <option value="language">Sort by Language</option>
              <option value="reviews">Sort by Reviews</option>
              <option value="recent">Sort by Recent</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {sorted.length > 0 ? (
          <div>
            <div className="text-sm text-slate-400 mb-4">
              Showing {sorted.length} of {repositories.length} repositories
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repo={repo}
                  onConfigure={handleConfigure}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg bg-white/3 border border-white/10 space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
            <p className="text-slate-400 font-medium">No repositories found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {selectedRepo && (
        <RepositorySettings
          repo={selectedRepo}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default RepositoriesPage;
