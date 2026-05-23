import React, { useState, useMemo } from 'react';
import { Plus, Search, Settings, ToggleRight, Trash2, Code2, Shield, AlertCircle } from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import type { ConnectedRepo, RepositoryRule } from '../types/repository.types';
import Spinner from '../components/common/Spinner';

type SortField = 'name' | 'language' | 'recent';
type SortOrder = 'asc' | 'desc';

// ─── Security Mode Badge ────────────────────────────────────────────────────────

interface SecurityModeBadgeProps {
  strictMode: boolean;
}

const SecurityModeBadge: React.FC<SecurityModeBadgeProps> = ({ strictMode }) => {
  const config = strictMode
    ? { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Strict Security' }
    : { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Standard Rules' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} ${config.text} text-xs font-medium border ${config.border}`}>
      <Shield size={12} />
      {config.label}
    </span>
  );
};

// ─── Language Badge ───────────────────────────────────────────────────────────

interface LanguageBadgeProps {
  language?: string | null;
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
  repo: ConnectedRepo;
  onConfigure: (repo: ConnectedRepo) => void;
  onToggle: (repo: ConnectedRepo) => void;
  onDelete: (repo: ConnectedRepo) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repo, onConfigure, onToggle, onDelete }) => (
  <div className="p-5 rounded-lg bg-gradient-to-br from-white/5 to-white/3 border border-white/10 hover:border-white/20 transition-all duration-300 group">
    {/* Header */}
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-mono font-semibold text-cyan-400 group-hover:text-cyan-300 truncate">
            {repo.repositoryFullName}
          </h3>
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
      <SecurityModeBadge strictMode={repo.rules.strictMode} />
      <LanguageBadge language={repo.meta?.language} />
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/3 border border-white/5 mb-4 text-xs">
      <div>
        <div className="text-slate-400 mb-1">Webhook</div>
        <div className="text-lg font-bold text-cyan-400">{repo.webhookId ? 'Connected' : 'Missing'}</div>
      </div>
      <div>
        <div className="text-slate-400 mb-1">Lint Ignore</div>
        <div className="text-cyan-400 font-semibold">{repo.rules.ignoreLinting ? 'Enabled' : 'Disabled'}</div>
      </div>
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
  repo: ConnectedRepo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (repoId: string, rules: Partial<RepositoryRule>) => void;
}

const RepositorySettings: React.FC<RepositorySettingsProps> = ({ repo, isOpen, onClose, onSave }) => {
  const [strictMode, setStrictMode] = React.useState(repo.rules.strictMode);
  const [ignoreLinting, setIgnoreLinting] = React.useState(repo.rules.ignoreLinting);
  const [checkPerformance, setCheckPerformance] = React.useState(repo.rules.checkPerformance);
  const [minConfidence, setMinConfidence] = React.useState(repo.rules.minConfidence);

  const handleSave = () => {
    onSave(repo._id, {
      strictMode,
      ignoreLinting,
      checkPerformance,
      minConfidence,
    });
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
                <div className="text-sm text-white font-mono">{repo.repositoryFullName}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Language</div>
                  <div className="text-sm text-white">{repo.meta?.language || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Stars</div>
                  <div className="text-sm text-white">{repo.meta?.stargazersCount || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rules Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white mb-3">Analysis Rules</h3>
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Strict Mode</div>
                <div className="text-xs text-slate-400">Enable strict security scanning. Fails PRs on any high-severity finding.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={ignoreLinting}
                  onChange={(e) => setIgnoreLinting(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Ignore Linting</div>
                <div className="text-xs text-slate-400">Skip stylistic and linter issues. Focus solely on code quality and security.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={checkPerformance}
                  onChange={(e) => setCheckPerformance(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Check Performance</div>
                <div className="text-xs text-slate-400">Analyze code for performance anti-patterns and potential bottlenecks.</div>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Minimum Confidence: {minConfidence.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="text-xs text-slate-400 mt-1">
                Only report findings with a confidence score above this threshold.
              </div>
            </div>
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
  const { connectedRepos, isLoading, updateRules, toggleActive, disconnectRepo } = useRepository();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedRepo, setSelectedRepo] = useState<ConnectedRepo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Filter logic
  const filtered = useMemo(() => {
    let result = connectedRepos;

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
          r.repositoryFullName.toLowerCase().includes(term) ||
          (r.meta?.language && r.meta.language.toLowerCase().includes(term))
      );
    }

    return result;
  }, [connectedRepos, searchTerm, filterActive]);

  // Sort logic
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.repositoryFullName.toLowerCase();
          bVal = b.repositoryFullName.toLowerCase();
          break;
        case 'language':
          aVal = (a.meta?.language || '').toLowerCase();
          bVal = (b.meta?.language || '').toLowerCase();
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
    total: connectedRepos.length,
    active: connectedRepos.filter((r) => r.isActive).length,
    inactive: connectedRepos.filter((r) => !r.isActive).length,
    languages: new Set(connectedRepos.filter((r) => r.meta?.language).map((r) => r.meta?.language)).size,
  };

  // Handlers
  const handleConfigure = (repo: ConnectedRepo) => {
    setSelectedRepo(repo);
    setIsSettingsOpen(true);
  };

  const handleToggle = (repo: ConnectedRepo) => {
    toggleActive(repo._id, !repo.isActive);
  };

  const handleDelete = (repo: ConnectedRepo) => {
    if (confirm(`Are you sure you want to delete ${repo.repositoryFullName}?`)) {
      disconnectRepo(repo._id);
    }
  };

  const handleSave = (repoId: string, rules: Partial<RepositoryRule>) => {
    updateRules(repoId, rules);
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
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size={32} />
          </div>
        ) : sorted.length > 0 ? (
          <div>
            <div className="text-sm text-slate-400 mb-4">
              Showing {sorted.length} of {connectedRepos.length} repositories
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((repo) => (
                <RepositoryCard
                  key={repo._id}
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
