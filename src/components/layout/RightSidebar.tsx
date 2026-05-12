import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Activity, Search, Loader2, UserX, Zap,
  ChevronRight, Clock, BarChart2, Newspaper, ExternalLink,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { UserProfile } from '../../hooks/useUserSearch';
import { useNetworkStats, useWeb3News, useLatestProposal } from '../../hooks/useChainStats';

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatCountdown(endTime: number): string {
  const diff = endTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

// ── Skeleton pulse ────────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-block rounded bg-white/5 animate-pulse ${className}`} />
);

const RightSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { results, isSearching, search } = useUserSearch();
  const network  = useNetworkStats();
  const { news, loading: newsLoading } = useWeb3News();
  const { proposal, loading: propLoading } = useLatestProposal();

  const [query, setQuery]               = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce((q: string) => search(q), 400), [search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) { setShowDropdown(true); debouncedSearch(val); }
    else setShowDropdown(false);
  };

  const handleSelect = (profile: UserProfile) => {
    setQuery(''); setShowDropdown(false);
    navigate(`/user/${profile.address}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const now = Math.floor(Date.now() / 1000);
  const isActive = proposal ? proposal.endTime > now : false;
  const totalVotes = proposal ? proposal.yesVotes + proposal.noVotes + proposal.abstainVotes : 0;
  const yesPct = totalVotes > 0 ? Math.round((proposal!.yesVotes / totalVotes) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative group" ref={containerRef}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-textMuted group-focus-within:text-white transition-colors">
          {isSearching
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Search className="w-5 h-5" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true); }}
          placeholder="Search users or address…"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary focus:bg-[var(--surface-hover)] transition-all placeholder:text-textMuted shadow-sm backdrop-blur-md"
        />
        {showDropdown && (
          <div className="absolute top-full mt-2 left-0 right-0 z-50 glass-panel rounded-2xl overflow-hidden shadow-xl border border-border">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 p-4 text-textMuted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching chain…
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-5 text-textMuted text-sm">
                <UserX className="w-6 h-6 opacity-40" /> No registered users found
              </div>
            ) : (
              <div className="flex flex-col max-h-72 overflow-y-auto">
                {results.map(profile => (
                  <button
                    key={profile.address}
                    onClick={() => handleSelect(profile)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left w-full"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-surface flex items-center justify-center">
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.address}`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{profile.name}</p>
                      <p className="text-textMuted text-xs font-mono truncate">
                        {profile.address.slice(0, 8)}…{profile.address.slice(-6)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-accent border border-accent/30 bg-accent/10 px-1.5 py-0.5 rounded-sm uppercase font-bold">
                      On-chain
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Network Status ──────────────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-accent" /> Network Status
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Polygon Amoy
          </span>
        </h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-textMuted flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Gas Price
            </span>
            <span className="text-white font-mono">
              {network.loading ? <Skeleton className="w-16 h-4" /> : network.gasPrice}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-textMuted flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Block
            </span>
            <span className="text-white font-mono">
              {network.loading
                ? <Skeleton className="w-20 h-4" />
                : `#${network.blockNumber.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Web3 News ───────────────────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
          <Newspaper className="w-4 h-4 text-primary" /> Web3 News
        </h3>
        {newsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-3/4 h-3" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-textMuted text-xs text-center py-3">Could not load news</p>
        ) : (
          <div className="space-y-3">
            {news.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <p className="text-white text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-textMuted text-[10px]">{item.source}</span>
                  <span className="text-textMuted text-[10px]">·</span>
                  <span className="text-textMuted text-[10px]">{timeAgo(item.publishedOn)}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-textMuted opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Live Governance ─────────────────────────────────────────────────── */}
      {!propLoading && proposal && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-textMuted'}`} />
              {isActive ? 'Live Vote' : 'Latest Proposal'}
            </h3>
            <Link
              to="/governance"
              className="text-xs text-primary hover:text-accent transition-colors flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <p className="text-white text-sm font-medium leading-snug mb-3 line-clamp-2">
            {proposal.title}
          </p>

          {/* Vote bar */}
          <div className="mb-2">
            <div className="flex text-xs text-textMuted mb-1 justify-between">
              <span className="text-green-400">Yes {yesPct}%</span>
              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex">
              <div
                className="h-full bg-green-500/70 transition-all duration-500"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="h-full bg-red-500/70 transition-all duration-500"
                style={{ width: `${totalVotes > 0 ? Math.round((proposal.noVotes / totalVotes) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-textMuted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatCountdown(proposal.endTime)}
            </span>
            {isActive && (
              <Link
                to="/governance"
                className="text-xs font-semibold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded-full transition-colors"
              >
                Vote →
              </Link>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default RightSidebar;
