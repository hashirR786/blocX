import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Vote, Bell, Zap, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useWallet } from '../../contexts/WalletContext';
import { useNotifications } from '../../contexts/NotificationsContext';

interface SidebarProps {
  onPostClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onPostClick }) => {
  const { address, connect, isConnecting, disconnect } = useWallet();
  const { unreadCount } = useNotifications();
  const links = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Governance', path: '/governance', icon: Vote },
    { name: 'Alerts', path: '/notifications', icon: Bell },
  ];


  return (
    <aside className="h-full w-full glass-panel flex flex-col items-center xl:items-start py-6 px-2 xl:px-5">
      {/* Logo */}
      <div className="w-full flex items-center justify-center xl:justify-start mb-8 px-2">
        <h1 className="text-3xl font-extrabold glow-text tracking-tighter hidden xl:block">
          blocX
        </h1>
        <div className="xl:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-white font-bold text-xl">X</span>
        </div>
      </div>

      <nav className="flex-1 w-full space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                cn(
                  "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-white/10 text-white shadow-inner" 
                    : "text-textMuted hover:bg-white/5 hover:text-white"
                )
              }
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors">
                <Icon className="w-6 h-6" strokeWidth={2} />
                {link.path === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden xl:block text-lg font-medium">{link.name}</span>
            </NavLink>
          );
        })}
        
        {/* Post Button */}
        <div className="w-full mt-6 pt-6 border-t border-[var(--border)]">
          <button 
            onClick={onPostClick} 
            className="w-full glass-button bg-primary/20 hover:bg-primary/40 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all group"
          >
            <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="hidden xl:block">New Post</span>
          </button>
        </div>
      </nav>

      {/* User Mini Profile / Connect Button */}
      <div className="mt-auto w-full pt-4 border-t border-[var(--border)]">
        {address ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-black/20 w-full overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-primary to-accent shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10">
                {address.slice(2, 4).toUpperCase()}
              </div>
              <div className="hidden xl:block overflow-hidden flex-1">
                <div className="font-bold text-white text-sm truncate">Web3 ID</div>
                <div className="text-textMuted text-xs font-mono truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
              </div>
            </div>
            <button 
              onClick={disconnect}
              className="w-full p-2 text-red-400 hover:bg-red-500/10 rounded-xl flex items-center justify-center xl:justify-start gap-3 transition-colors text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden xl:block">Disconnect</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={connect}
            disabled={isConnecting}
            className="w-full glass-button py-3 text-white flex items-center justify-center gap-2 font-bold"
          >
            {isConnecting ? (
              <span className="hidden xl:block">Connecting...</span>
            ) : (
              <>
                <span className="xl:hidden">🦊</span>
                <span className="hidden xl:block">Connect Wallet</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
