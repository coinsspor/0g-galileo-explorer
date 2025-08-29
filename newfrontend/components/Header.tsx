import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { ConnectWalletButton } from './ConnectWalletButton';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'validators', label: 'Validators' },
    { id: 'uptime', label: 'Uptime' },
    { id: 'blocks', label: 'Blocks' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'staking', label: 'Staking' },
    { id: 'governance', label: 'Governance' },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
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
          <span className="text-xl font-semibold whitespace-nowrap hidden sm:block">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Network Explorer
            </span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-2 flex-1 justify-center">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? 'default' : 'ghost'}
              onClick={() => onPageChange(item.id)}
              className={currentPage === item.id ? 'bg-primary text-primary-foreground glow-effect' : 'hover:bg-primary/10'}
              size="sm"
            >
              {item.label}
            </Button>
          ))}
          {/* Services Buttons */}
          <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755455125928" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              Snapshot
            </Button>
          </a>
          <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet&section=page-1755119233098" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              Guide
            </Button>
          </a>
          <a href="https://nodescenter.coinsspor.com/?project=0G-Chain-testnet" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              Resources
            </Button>
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-4">
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

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-card border-t border-border p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
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
                {item.label}
              </Button>
            ))}
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