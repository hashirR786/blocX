import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, Menu } from 'lucide-react';
import ConnectWallet from '../common/ConnectWallet';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface md:bg-transparent md:border-none">
      <div className="flex items-center gap-2 md:hidden">
        <Menu className="w-6 h-6 text-textMain" />
        <Link to="/" className="text-2xl logo-script">blocX</Link>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden md:block flex-1" />

      <div className="flex items-center gap-3">
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full hover:bg-surface text-textMuted hover:text-textMain transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <ConnectWallet />
      </div>
    </nav>
  );
};

export default Navbar;
