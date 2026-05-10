import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import CreatePost from '../post/CreatePost';
import TransactionOverlay from '../common/TransactionOverlay';
import { X } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

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

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full z-50 glass-panel rounded-none border-x-0 border-b-0 border-t border-[var(--border)]">
        <Navbar />
      </div>

      <div className="flex w-full max-w-[1400px] justify-center px-0 md:px-4 lg:px-8 gap-6 pt-0 md:pt-6">
        {/* Left Sidebar - Floating Dock on Desktop */}
        <header className="hidden md:flex w-[88px] xl:w-[260px] shrink-0 sticky top-6 h-[calc(100vh-3rem)]">
          <Sidebar onPostClick={() => setIsPostModalOpen(true)} />
        </header>

        {/* Center Feed */}
        <main className="flex-1 min-w-0 max-w-[650px] flex flex-col min-h-screen pb-24 md:pb-6 relative z-10">
          {/* Mobile Top Nav */}
          <div className="md:hidden sticky top-0 z-10 glass-panel rounded-none border-x-0 border-t-0 py-3 px-4 mb-4">
             <h1 className="text-2xl font-bold glow-text tracking-tight">blocX</h1>
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
