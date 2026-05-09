import React from 'react';
import { Search } from 'lucide-react';

const RightSidebar: React.FC = () => {
  return (
    <div className="w-full pr-8">
      {/* Search Bar */}
      <div className="sticky top-0 bg-background pt-2 pb-4 z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-textMuted group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search"
            className="block w-full pl-11 pr-4 py-3 bg-[#eff3f4] dark:bg-[#202327] border-none rounded-full text-textMain placeholder-textMuted focus:ring-1 focus:ring-primary focus:bg-background transition-colors outline-none"
          />
        </div>
      </div>

      {/* Trending Box */}
      <div className="bg-[#eff3f4] dark:bg-[#16181c] rounded-2xl p-4 mb-4">
        <h2 className="text-xl font-bold mb-4 text-textMain">What's happening</h2>
        
        <div className="space-y-4">
          <div className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
            <div className="text-xs text-textMuted mb-0.5">Web3 • Trending</div>
            <div className="font-bold text-textMain">#blocX</div>
            <div className="text-xs text-textMuted mt-0.5">12.5K posts</div>
          </div>
          
          <div className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
            <div className="text-xs text-textMuted mb-0.5">Technology • Trending</div>
            <div className="font-bold text-textMain">Polygon Amoy</div>
            <div className="text-xs text-textMuted mt-0.5">8,204 posts</div>
          </div>
        </div>
      </div>

      {/* Who to follow */}
      <div className="bg-[#eff3f4] dark:bg-[#16181c] rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4 text-textMain">Who to follow</h2>
        
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3 overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=user${i}`} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full bg-border"
                />
                <div className="truncate">
                  <div className="font-bold text-textMain text-sm truncate hover:underline">Web3 Builder {i}</div>
                  <div className="text-textMuted text-sm truncate">@builder{i}</div>
                </div>
              </div>
              <button className="bg-textMain text-background px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shrink-0 ml-2">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
