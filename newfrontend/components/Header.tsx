import { useState } from 'react';
import { Menu, X, Server, Shield, BarChart } from 'lucide-react';
import { Button } from './ui/button';
import { ConnectWalletButton } from './ConnectWalletButton';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: null },
    { id: 'validators', label: 'Validators', icon: null },
    { id: 'uptime', label: 'Uptime', icon: null },
    { id: 'blocks', label: 'Blocks', icon: null },
    { id: 'transactions', label: 'Transactions', icon: null },
    { id: 'staking', label: 'Staking', icon: null },
    { id: 'governance', label: 'Governance', icon: null },
    { id: 'rpc-monitoring', label: 'RPC Scanner', icon: Server },
    { id: 'contract-checker', label: 'Token Explorer', icon: Shield },
    { id: 'contract-deployment', label: 'Contract Deploy', icon: BarChart }, // Kısalttım
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-6 h-20 flex items-center">
        {/* Logo - Fixed width left section */}
        <div className="flex items-center space-x-3 w-64">
          <img 
            src="/logo.png" 
            alt="0G Network" 
            className="h-10 w-12 object-contain flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          {/* Fallback logo */}
          <div 
            className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-full items-center justify-center hidden"
            style={{ display: 'none' }}
          >
            <span className="text-white font-bold text-lg">0G</span>
          </div>
          <span className="text-lg font-semibold whitespace-nowrap hidden sm:block">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Explorer
            </span>
          </span>
        </div>

        {/* Desktop Navigation - Center */}
        <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'default' : 'ghost'}
                onClick={() => onPageChange(item.id)}
                className={`text-xs ${currentPage === item.id ? 'bg-primary text-primary-foreground glow-effect' : 'hover:bg-primary/10'}`} // text-xs eklendi
                size="sm"
              >
                {Icon && <Icon className="w-3 h-3 mr-1" />} {/* İkon küçültüldü */}
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Right Section - Services & Wallet */}
        <div className="flex items-center space-x-2 w-64 justify-end">
          {/* Services Dropdown or Buttons */}
          <div className="hidden lg:flex items-center space-x-1">
            <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755455125928" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs"> {/* text-xs eklendi */}
                Snapshot
              </Button>
            </a>
            <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755119233098" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs"> {/* text-xs eklendi */}
                Guide
              </Button>
            </a>
            <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs"> {/* text-xs eklendi */}
                Resources
              </Button>
            </a>
          </div>
          
          <ConnectWalletButton />
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation - değişmedi */}
      {isMenuOpen && (
        <div className="lg:hidden bg-card border-t border-border p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? 'default' : 'ghost'}
                  onClick={() => {
                    onPageChange(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full justify-start ${
                    currentPage === item.id ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {item.label}
                </Button>
              );
            })}
            {/* Mobile Services */}
            <div className="border-t border-border pt-2 mt-2 space-y-2">
              <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755455125928" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                  Snapshot
                </Button>
              </a>
              <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755119233098" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                  Guide
                </Button>
              </a>
              <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                  Resources
                </Button>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}