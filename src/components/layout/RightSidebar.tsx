import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, ShieldCheck, Search, Loader2, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserSearch, UserProfile } from '../../hooks/useUserSearch';

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const trends = [
  { tag: '#PolygonAmoy', posts: '12.5K', isHot: true },
  { tag: '#Web3Social', posts: '8,240', isHot: false },
  { tag: '#BlocXLaunch', posts: '5,102', isHot: true },
];

const RightSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { results, isSearching, search } = useUserSearch();

  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce((q: string) => search(q), 400), [search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      setShowDropdown(true);
      debouncedSearch(val);
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelect = (profile: UserProfile) => {
    setQuery('');
    setShowDropdown(false);
    navigate(`/user/${profile.address}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="h-full flex flex-col p-4 space-y-6">

      {/* Search */}
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching chain…
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-5 text-textMuted text-sm">
                <UserX className="w-6 h-6 opacity-40" />
                No registered users found
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

      {/* Network Stats Widget */}
      <div className="glass-panel p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" /> Network Status
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center text-textMuted">
            <span>TPS</span>
            <span className="text-white font-mono">42.5</span>
          </div>
          <div className="flex justify-between items-center text-textMuted">
            <span>Active Nodes</span>
            <span className="text-green-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> 1,024
            </span>
          </div>
          <div className="flex justify-between items-center text-textMuted">
            <span>Gas Price</span>
            <span className="text-white font-mono">30 gwei</span>
          </div>
        </div>
      </div>

      {/* Trending Widget */}
      <div className="glass-panel p-5 flex-1">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Trending Now
        </h3>
        <div className="space-y-4">
          {trends.map((trend, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="flex items-center gap-2 text-textMuted text-xs mb-1">
                <span>Trending in Web3</span>
                {trend.isHot && (
                  <span className="text-accent text-[10px] uppercase font-bold border border-accent/30 bg-accent/10 px-1.5 rounded-sm">
                    Hot
                  </span>
                )}
              </div>
              <div className="font-bold text-white group-hover:text-primary transition-colors text-lg">
                {trend.tag}
              </div>
              <div className="text-textMuted text-xs mt-1">{trend.posts} posts</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default RightSidebar;
