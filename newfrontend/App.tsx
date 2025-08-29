import { useState } from 'react';
import { Providers } from './providers';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Validators } from './components/Validators';
import { Uptime } from './components/Uptime';
import { Blocks } from './components/Blocks';
import { Transactions } from './components/Transactions';
import { TransactionDetail } from './components/TransactionDetail';
import { Staking } from './components/Staking';
import { Governance } from './components/Governance';
import { Toaster } from 'sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const handleTransactionDetail = (hash: string) => {
    setTransactionHash(hash);
    setCurrentPage('transactionDetail');
  };

  const handleBackToTransactions = () => {
    setCurrentPage('transactions');
    setTransactionHash(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'validators':
        return <Validators />;
      case 'uptime':
        return <Uptime />;
      case 'blocks':
        return <Blocks />;
      case 'transactions':
        return <Transactions onViewDetails={handleTransactionDetail} />;
      case 'transactionDetail':
        return <TransactionDetail hash={transactionHash} onBack={handleBackToTransactions} />;
      case 'staking':
        return <Staking />;
      case 'governance':
        return <Governance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <Header currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="min-h-screen">
          {renderPage()}
        </main>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          duration={5000}
        />
      </div>
    </Providers>
  );
}