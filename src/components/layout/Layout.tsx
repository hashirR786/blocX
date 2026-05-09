import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import CreatePost from '../post/CreatePost';
import { X } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex justify-center relative">
      {/* Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 sm:pt-16 bg-white/20 dark:bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <button 
                onClick={() => setIsPostModalOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-textMain" />
              </button>
            </div>
            <CreatePost onClose={() => setIsPostModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full z-50 bg-background border-t border-border">
        <Navbar />
      </div>

      <div className="flex w-full max-w-[1265px] justify-between">
        {/* Left Sidebar (Desktop) */}
        <header className="hidden md:flex w-[88px] xl:w-[275px] shrink-0 sticky top-0 h-screen border-r border-border">
          <Sidebar onPostClick={() => setIsPostModalOpen(true)} />
        </header>

        {/* Center Feed */}
        <main className="flex-1 min-w-0 max-w-[600px] flex flex-col min-h-screen pb-16 md:pb-0">
          {/* Mobile Top Nav */}
          <div className="md:hidden sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border py-3 px-4">
             <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">blocX</h1>
          </div>
          
          <div className="w-full flex-1">
            {children}
          </div>
        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="hidden lg:block w-[350px] shrink-0 sticky top-0 h-screen border-l border-border pl-8 pt-4">
           <RightSidebar />
        </aside>
      </div>
    </div>
  );
};

export default Layout;
