import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, type Signer, IdentifierKind } from '@xmtp/browser-sdk';
import { useWallet } from './WalletContext';

interface XMTPContextType {
  client: Client | null;
  isConnectingXMTP: boolean;
  initClient: () => Promise<void>;
  disconnectXMTP: () => void;
  error: string | null;
}

const XMTPContext = createContext<XMTPContextType | undefined>(undefined);

export const XMTPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, provider } = useWallet();
  const [client, setClient] = useState<Client | null>(null);
  const [isConnectingXMTP, setIsConnectingXMTP] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the XMTP client
  const initClient = useCallback(async () => {
    if (!address || !provider) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsConnectingXMTP(true);
      setError(null);
      
      // Polyfill global if missing (some SDK internals expect it)
      if (typeof (window as any).global === 'undefined') {
        (window as any).global = window;
      }

      console.log("Starting XMTP V3 init for address:", address);
      console.log("crossOriginIsolated:", window.crossOriginIsolated);
      
      const ethersSigner = await provider.getSigner();
      console.log("Got ethers signer");
      
      const xmtpSigner: Signer = {
        type: 'EOA',
        getIdentifier: () => ({
          identifier: address,
          identifierKind: IdentifierKind.Ethereum,
        }),
        signMessage: async (message: string): Promise<Uint8Array> => {
          console.log("SIGNING TRIGGERED - Message:", message.slice(0, 20) + "...");
          const signature = await ethersSigner.signMessage(message);
          console.log("SIGNING SUCCESSFUL");
          const hex = signature.slice(2);
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          }
          return bytes;
        },
      };
      


      console.log("Initializing XMTP V3 client (Production)...");

      // Retry up to 3 times — XMTP identity API can transiently fail
      let xmtpClient: Client | null = null;
      let lastErr: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          xmtpClient = await Client.create(xmtpSigner, { env: 'production' } as any);
          break;
        } catch (e: any) {
          lastErr = e;
          console.warn(`[XMTP] Attempt ${attempt} failed:`, e.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }

      if (!xmtpClient) throw lastErr;

      console.log("XMTP V3 client initialized and activated successfully!");
      setClient(xmtpClient);

    } catch (err: any) {
      console.error("CRITICAL: Failed to initialize XMTP client:", err);
      const msg: string = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('Unknown error')) {
        setError("Can't reach XMTP network. Check your connection and try again.");
      } else {
        setError(msg || "Failed to initialize messaging");
      }
    } finally {
      setIsConnectingXMTP(false);
    }
  }, [address, provider]);

  // Disconnect / clean up
  const disconnectXMTP = useCallback(() => {
    setClient(null);
    setError(null);
  }, []);

  // Automatically disconnect if the wallet changes
  useEffect(() => {
    if (!address) {
      disconnectXMTP();
    }
  }, [address, disconnectXMTP]);

  return (
    <XMTPContext.Provider value={{ client, isConnectingXMTP, initClient, disconnectXMTP, error }}>
      {children}
    </XMTPContext.Provider>
  );
};

export const useXMTP = () => {
  const context = useContext(XMTPContext);
  if (context === undefined) {
    throw new Error('useXMTP must be used within an XMTPProvider');
  }
  return context;
};
