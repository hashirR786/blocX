import React, { useState } from 'react';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import CreatePost from '../post/CreatePost';
import TransactionOverlay from '../common/TransactionOverlay';
import ConnectWallet from '../common/ConnectWallet';
import { X, Home, User, Bell, Zap, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useNotifications } from '../../contexts/NotificationsContext';


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="min-h-screen bg-background flex justify-center relative overflow-x-hidden">
      <TransactionOverlay />
      
      {/* Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white">Create Post</h2>
              <button 
                onClick={() => setIsPostModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <CreatePost onClose={() => setIsPostModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0C10]/95 backdrop-blur-xl border-t border-[var(--border)] pb-safe">
        <div className="flex items-center justify-around p-2">
          <NavLink to="/" className={({isActive}) => cn("p-3 rounded-xl transition-all", isActive ? "text-white bg-white/10" : "text-textMuted hover:text-white")}>
            <Home className="w-6 h-6" />
          </NavLink>
          <NavLink to="/messages" className={({isActive}) => cn("p-3 rounded-xl transition-all", isActive ? "text-white bg-white/10" : "text-textMuted hover:text-white")}>
            <MessageSquare className="w-6 h-6" />
          </NavLink>
          
          {/* Center Post Button */}
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] -mt-8 border-4 border-[#0B0C10] transition-transform active:scale-95"
          >
            <Zap className="w-6 h-6 fill-white" />
          </button>

          <NavLink to="/notifications" className={({isActive}) => cn("p-3 rounded-xl transition-all relative", isActive ? "text-white bg-white/10" : "text-textMuted hover:text-white")}>
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" className={({isActive}) => cn("p-3 rounded-xl transition-all", isActive ? "text-white bg-white/10" : "text-textMuted hover:text-white")}>
            <User className="w-6 h-6" />
          </NavLink>
        </div>
      </div>


      <div className="flex w-full max-w-[1400px] justify-center px-0 md:px-4 lg:px-8 gap-6 pt-0 md:pt-6">
        {/* Left Sidebar - Floating Dock on Desktop */}
        <header className="hidden md:flex w-[88px] xl:w-[260px] shrink-0 sticky top-6 h-[calc(100vh-3rem)]">
          <Sidebar onPostClick={() => setIsPostModalOpen(true)} />
        </header>

        {/* Center Feed */}
        <main className="flex-1 min-w-0 max-w-[650px] flex flex-col min-h-screen pb-[80px] md:pb-6 relative z-10">
          {/* Mobile Top Header */}
          <div className="md:hidden sticky top-0 z-20 bg-[#0B0C10]/80 backdrop-blur-xl border-b border-[var(--border)] py-3 px-4 mb-4 flex justify-between items-center shadow-lg">
             <h1 className="text-2xl glow-text">blocX</h1>
             <ConnectWallet />
          </div>
          
          <div className="w-full flex-1">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Floating Stats */}
        <aside className="hidden lg:block w-[320px] shrink-0 sticky top-6 h-[calc(100vh-3rem)]">
           <RightSidebar />
        </aside>
      </div>
    </div>
  );
};

export default Layout;
