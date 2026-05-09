import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { Wallet, Loader2, LogOut } from 'lucide-react';

const ConnectWallet: React.FC = () => {
  const { address, isConnecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="relative group">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-full hover:border-primary transition-colors text-sm font-medium"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          {address}
        </button>
        {/* Dropdown for disconnect (simple approach using group-hover) */}
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <button 
            onClick={disconnect}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-border transition-colors rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primaryHover text-white rounded-full font-medium transition-colors disabled:opacity-70"
    >
      {isConnecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4" />
      )}
      Connect Wallet
    </button>
  );
};

export default ConnectWallet;
