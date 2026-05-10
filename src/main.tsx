import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { WalletProvider } from './contexts/WalletContext.tsx'
import { TransactionProvider } from './contexts/TransactionContext.tsx'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WalletProvider>
          <TransactionProvider>
            <App />
          </TransactionProvider>
        </WalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
