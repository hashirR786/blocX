import React from 'react';
import { useTransaction } from '../../contexts/TransactionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Wallet } from 'lucide-react';

const TransactionOverlay: React.FC = () => {
  const { txState, txMessage } = useTransaction();

  return (
    <AnimatePresence>
      {txState !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-panel p-8 max-w-md w-full flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/20 blur-3xl rounded-full" />

            <div className="relative z-10 flex flex-col items-center">
              {txState === 'awaiting_signature' && (
                <>
                  <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
                    <div className="bg-primary/20 p-4 rounded-full border border-primary/50">
                      <Wallet className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Awaiting Signature</h2>
                  <p className="text-textMuted">Please confirm the transaction in your Web3 wallet...</p>
                </>
              )}

              {txState === 'mining' && (
                <>
                  <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-2">Mining Transaction</h2>
                  <p className="text-textMuted">Waiting for network confirmation. This may take a few moments...</p>
                </>
              )}

              {txState === 'success' && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <CheckCircle className="w-20 h-20 text-green-400 mb-6" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                  <p className="text-textMuted">{txMessage || 'Transaction confirmed successfully.'}</p>
                </>
              )}

              {txState === 'error' && (
                <>
                  <AlertCircle className="w-20 h-20 text-red-500 mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-2">Transaction Failed</h2>
                  <p className="text-textMuted">{txMessage || 'Something went wrong.'}</p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionOverlay;
