import { useState, useEffect } from 'react';
import { Providers } from './providers';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Validators } from './components/Validators';
import { Uptime } from './components/Uptime';
import { Blocks } from './components/Blocks';
import { BlockDetail } from './components/BlockDetail';
import { Transactions } from './components/Transactions';
import { TransactionDetail } from './components/TransactionDetail';
import { Staking } from './components/Staking';
import { Governance } from './components/Governance';
import { RPCMonitoring } from './components/RPCMonitoring';
import ContractChecker from './components/ContractChecker';
import { ContractDeployment } from './components/ContractDeployment';
import { Toaster } from 'sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [blockHash, setBlockHash] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState('');

  const handleTransactionDetail = (hash: string) => {
    setPreviousPage(currentPage);
    setTransactionHash(hash);
    setCurrentPage('transactionDetail');
  };

  const handleBackToTransactions = () => {
    setCurrentPage('transactions');
    setTransactionHash(null);
  };
  
  const handleBackToContractChecker = () => {
    setCurrentPage('contract-checker');
    setTransactionHash(null);
  };

  const handleTokenDetail = (address: string) => {
    setTokenAddress(address);
    setCurrentPage('tokenDetail');
  };

  const handleBackToContractDeployment = () => {
    setCurrentPage('contract-deployment');
    setTokenAddress(null);
  };

  // Navigation event listeners
  useEffect(() => {
    const handleNavigateToTransaction = (event: CustomEvent) => {
      if (event.detail.fromBlock) {
        // BlockDetail'den transaction'a git
        setPreviousPage('blockDetail');
        setTransactionHash(event.detail.hash);
        setCurrentPage('transactionDetail');
      } else {
        // Blocks listesinden block detail'e git
        setBlockHash(event.detail.hash);
        setCurrentPage('blockDetail');
        setPreviousPage('blocks');
      }
    };
    
    window.addEventListener('navigateToTransaction' as any, handleNavigateToTransaction);
    return () => {
      window.removeEventListener('navigateToTransaction' as any, handleNavigateToTransaction);
    };
  }, []);

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
      case 'blockDetail':
        return <BlockDetail 
          hash={blockHash} 
          onBack={() => {
            setCurrentPage('blocks');
            setBlockHash(null);
          }} 
        />;
      case 'transactions':
        return <Transactions onViewDetails={handleTransactionDetail} />;
      case 'transactionDetail':
        return <TransactionDetail 
          hash={transactionHash} 
          onBack={() => {
            // Hangi sayfadan geldiğine göre geri dön
            if (previousPage === 'contract-checker') {
              setCurrentPage('contract-checker');
            } else if (previousPage === 'blockDetail') {
              setCurrentPage('blockDetail');
            } else if (previousPage === 'blocks') {
              setCurrentPage('blocks');
            } else {
              setCurrentPage('transactions');
            }
            setTransactionHash(null);
            setPreviousPage('');
          }} 
        />;
      case 'staking':
        return <Staking />;
      case 'governance':
        return <Governance />;
      case 'rpc-monitoring':
        return <RPCMonitoring />;
      case 'contract-checker':
        return <ContractChecker onViewDetails={handleTransactionDetail} />;
      case 'contract-deployment':
        return <ContractDeployment />;
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
