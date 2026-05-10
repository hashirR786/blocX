import React from 'react';
import { TrendingUp, Activity, ShieldCheck, Search } from 'lucide-react';

const RightSidebar: React.FC = () => {
  const trends = [
    { tag: '#PolygonAmoy', posts: '12.5K', isHot: true },
    { tag: '#Web3Social', posts: '8,240', isHot: false },
    { tag: '#BlocXLaunch', posts: '5,102', isHot: true },
  ];

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      
      {/* Search - Glass Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-textMuted group-focus-within:text-white transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          placeholder="Search network..." 
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary focus:bg-[var(--surface-hover)] transition-all placeholder:text-textMuted shadow-sm backdrop-blur-md"
        />
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
            <span className="text-green-400 font-mono flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> 1,024</span>
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
                {trend.isHot && <span className="text-accent text-[10px] uppercase font-bold border border-accent/30 bg-accent/10 px-1.5 rounded-sm">Hot</span>}
              </div>
              <div className="font-bold text-white group-hover:text-primary transition-colors text-lg">{trend.tag}</div>
              <div className="text-textMuted text-xs mt-1">{trend.posts} posts</div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default RightSidebar;
