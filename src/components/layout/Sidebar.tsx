import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Vote, Bell, Feather } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useWallet } from '../../contexts/WalletContext';

interface SidebarProps {
  onPostClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onPostClick }) => {
  const { address, connect, isConnecting } = useWallet();
  const links = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Governance', path: '/governance', icon: Vote },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  return (
    <aside className="h-full flex flex-col items-center xl:items-start py-4 xl:px-4 bg-background w-full">
      {/* Logo */}
      <div className="w-14 h-14 flex items-center justify-center xl:justify-start xl:w-full xl:px-4 mb-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full cursor-pointer transition-colors">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primaryHover bg-clip-text text-transparent tracking-tighter">
          BlocX
        </h1>
      </div>

      <nav className="flex-1 w-full space-y-1 mt-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <div key={link.path} className="w-full flex justify-center xl:justify-start">
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-5 p-3 xl:px-4 xl:py-3 rounded-full transition-colors group",
                    isActive 
                      ? "font-bold text-textMain" 
                      : "font-normal text-textMain hover:bg-black/10 dark:hover:bg-white/10"
                  )
                }
              >
                <Icon className="w-7 h-7" strokeWidth={2.5} />
                <span className="hidden xl:block text-xl">{link.name}</span>
              </NavLink>
            </div>
          );
        })}
        
        {/* Post Button */}
        <div className="w-full flex justify-center xl:justify-start mt-4 px-2 xl:px-0">
          <button onClick={onPostClick} className="w-12 h-12 xl:w-11/12 xl:h-14 bg-primary hover:bg-primaryHover text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors shadow-sm">
            <Feather className="w-6 h-6 xl:hidden" />
            <span className="hidden xl:block">Post</span>
          </button>
        </div>
      </nav>

      {/* User Mini Profile / Connect Button */}
      <div className="mt-auto w-full flex justify-center xl:justify-start mb-4 px-2 xl:px-0">
        {address ? (
          <div onClick={connect} className="inline-flex items-center gap-3 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors w-full">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 shrink-0 flex items-center justify-center text-white font-bold text-xs">
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div className="hidden xl:block overflow-hidden">
              <div className="font-bold text-textMain text-sm truncate">Web3 User</div>
              <div className="text-textMuted text-sm truncate">@{address.slice(0, 6)}...{address.slice(-4)}</div>
            </div>
          </div>
        ) : (
          <button 
            onClick={connect}
            disabled={isConnecting}
            className="w-12 h-12 xl:w-full xl:h-14 bg-surface border border-border hover:bg-black/5 dark:hover:bg-white/5 text-textMain rounded-full flex items-center justify-center font-bold text-lg transition-colors shadow-sm"
          >
            <span className="hidden xl:block">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            <span className="xl:hidden">🦊</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
