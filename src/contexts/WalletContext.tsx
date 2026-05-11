import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface WalletContextType {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  provider: BrowserProvider | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const web3Provider = new BrowserProvider(ethereum);
      setProvider(web3Provider);

      // Check if already connected
      ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          
          // Check network
          try {
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0x13882') {
              console.log("Not on Amoy testnet. Please switch.");
              // Optionally force switch here, or let the user click connect
            }
          } catch (e) {
            console.error(e);
          }
        }
      });

      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress(null);
        }
      });
      
      ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const connect = async () => {
    const ethereum = (window as any).ethereum;
    
    if (!ethereum) {
      // On mobile, MetaMask only injects window.ethereum inside its own browser.
      // Deep-link the user into MetaMask's built-in browser pointing to this app.
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const fullUrl = window.location.href.replace(/^https?:\/\//, '');
        const deepLink = `https://metamask.app.link/dapp/${fullUrl}`;
        window.location.href = deepLink;
        return;
      }
      // Desktop: just prompt to install
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    
    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);
      
      // Switch to Polygon Amoy network
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }], // 80002 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x13882',
                chainName: 'Polygon Amoy Testnet',
                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18
                },
                blockExplorerUrls: ['https://amoy.polygonscan.com/']
              }
            ]
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  return (
    <WalletContext.Provider value={{ address, isConnecting, connect, disconnect, provider }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
