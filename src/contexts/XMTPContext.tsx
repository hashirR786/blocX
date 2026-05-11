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
      
      const identifier = {
        identifier: address,
        identifierKind: IdentifierKind.Ethereum,
      };

      console.log("Checking if XMTP client can be built from local storage...");
      try {
        const existingClient = await Client.build(identifier, {
          env: 'production',
        } as any);
        if (existingClient) {
          console.log("Existing XMTP client found and built!");
          setClient(existingClient);
          return;
        }
      } catch (e) {
        console.log("No existing client found, proceeding to create...");
      }

      console.log("CALLING Client.create(signer, { env: 'production' })...");
      const xmtpClient = await Client.create(xmtpSigner, {
        env: 'production',
      } as any);
      
      console.log("XMTP V3 client created successfully!");
      
      // Ensure identity is registered on the network
      try {
        if (!xmtpClient.isRegistered) {
          console.log("Identity not registered, calling registerIdentity()...");
          await xmtpClient.registerIdentity();
          console.log("Identity registered successfully!");
        }
      } catch (regError) {
        console.warn("Registration check/call failed (might already be registered):", regError);
      }

      setClient(xmtpClient);
      
    } catch (err: any) {
      console.error("CRITICAL: Failed to initialize XMTP client:", err);
      setError(err.message || "Failed to initialize messaging");
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
