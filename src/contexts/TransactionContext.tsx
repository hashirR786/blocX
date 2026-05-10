import { createContext, useContext, useState, type ReactNode } from 'react';

export type TransactionState = 'idle' | 'awaiting_signature' | 'mining' | 'success' | 'error';

interface TransactionContextType {
  txState: TransactionState;
  setTxState: (state: TransactionState) => void;
  txMessage: string;
  setTxMessage: (msg: string) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [txMessage, setTxMessage] = useState<string>('');

  return (
    <TransactionContext.Provider value={{ txState, setTxState, txMessage, setTxMessage }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
}
