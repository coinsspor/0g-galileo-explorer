import { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { X, AlertCircle, Lock, Wallet, Coins, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StakeModalProps {
  validator: {
    moniker: string;
    address: string;
    commissionRate: string;
    totalStaked: number;
    votingPower: number;
    status: string;
    avatarUrl?: string;
  };
  onClose: () => void;
}

export function StakeModal({ validator, onClose }: StakeModalProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: balance } = useBalance({ address: walletAddress });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeShares, setUnstakeShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stake');
  const [sliderValue, setSliderValue] = useState(0);
  const [unstakeSliderValue, setUnstakeSliderValue] = useState(0);
  const [stakedBalance, setStakedBalance] = useState('0');
  const [loadingStaked, setLoadingStaked] = useState(false);
  
  const OG_CHAIN_ID = 16601;

  useEffect(() => {
    const fetchStakedBalance = async () => {
      if (!walletAddress || !validator.address) return;
      
      setLoadingStaked(true);
      try {
        const response = await fetch('https://evmrpc-testnet.0g.ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: validator.address,
              data: '0x00000000' + walletAddress.slice(2).padStart(64, '0')
            }, 'latest'],
            id: 1
          })
        });
        
        const data = await response.json();
        
        if (data.result && data.result !== '0x' && data.result !== '0x0') {
          const hex = data.result.replace('0x', '');
          if (hex.length >= 64) {
            const sharesHex = hex.slice(0, 64);
            const shares = parseInt(sharesHex, 16);
            const stakedInOG = shares / Math.pow(10, 18);
            setStakedBalance(stakedInOG.toFixed(6));
          }
        }
        
        if (stakedBalance === '0') {
          const apiResponse = await fetch(`/api/delegations/${walletAddress}`);
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            const delegation = apiData.delegations?.find((d: any) => 
              d.validator.address.toLowerCase() === validator.address.toLowerCase()
            );
            if (delegation) {
              setStakedBalance(delegation.delegation.tokens.toFixed(6));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch staked balance:', error);
      } finally {
        setLoadingStaked(false);
      }
    };

    fetchStakedBalance();
  }, [walletAddress, validator.address, activeTab]);

  useEffect(() => {
    if (chainId !== OG_CHAIN_ID && switchChain) {
      switchChain({ chainId: OG_CHAIN_ID });
    }
  }, [chainId, switchChain]);

  const getValidatorAvatar = () => {
    if (validator.avatarUrl) return validator.avatarUrl;
    
    const letter = validator.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#00d9ff', '#7c3aed'];
    const color = colors[validator.moniker.charCodeAt(0) % 2];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="20" fill="url(#grad)"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="18" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    if (balance) {
      const amount = (parseFloat(balance.formatted) * value / 100).toFixed(6);
      setStakeAmount(amount);
    }
  };

  const handleUnstakeSliderChange = (value: number) => {
    setUnstakeSliderValue(value);
    const amount = (parseFloat(stakedBalance) * value / 100).toFixed(6);
    setUnstakeShares(amount);
  };

  const handleAmountChange = (value: string) => {
    setStakeAmount(value);
    if (balance && value) {
      const percentage = (parseFloat(value) / parseFloat(balance.formatted)) * 100;
      setSliderValue(Math.min(100, Math.max(0, percentage)));
    } else {
      setSliderValue(0);
    }
  };

  const handleUnstakeAmountChange = (value: string) => {
    setUnstakeShares(value);
    if (stakedBalance && parseFloat(stakedBalance) > 0 && value) {
      const percentage = (parseFloat(value) / parseFloat(stakedBalance)) * 100;
      setUnstakeSliderValue(Math.min(100, Math.max(0, percentage)));
    } else {
      setUnstakeSliderValue(0);
    }
  };

  const handleStake = async () => {
    if (!walletAddress || !window.ethereum) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      const amountInWei = (parseFloat(stakeAmount) * Math.pow(10, 18)).toString(16);
      const functionSignature = '0x5c19a95c';
      const delegatorParam = walletAddress.slice(2).padStart(64, '0');
      const callData = functionSignature + delegatorParam;
      
      const txParams = {
        from: walletAddress,
        to: validator.address,
        value: '0x' + amountInWei,
        data: callData
      };
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
      
      toast.success('Stake transaction sent!', {
        description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });
      
      setStakeAmount('');
      setSliderValue(0);
      setTimeout(onClose, 2000);
      
    } catch (error: any) {
      toast.error('Stake failed', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!walletAddress || !window.ethereum) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!unstakeShares || parseFloat(unstakeShares) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      const withdrawalFee = '1000000000';
      const sharesInWei = (parseFloat(unstakeShares) * Math.pow(10, 18)).toString(16);
      
      const undelegateMethodId = '0x4d99dd16';
      const withdrawalAddressParam = walletAddress.slice(2).padStart(64, '0');
      const sharesParam = sharesInWei.padStart(64, '0');
      const callData = undelegateMethodId + withdrawalAddressParam + sharesParam;
      
      const txParams = {
        from: walletAddress,
        to: validator.address,
        value: '0x' + parseInt(withdrawalFee).toString(16),
        data: callData
      };
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
      
      toast.success('Unstake transaction sent!', {
        description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });
      
      setUnstakeShares('');
      setUnstakeSliderValue(0);
      setTimeout(onClose, 2000);
      
    } catch (error: any) {
      toast.error('Unstake failed', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedAPY = 12.5;
  const dailyRewards = stakeAmount ? (parseFloat(stakeAmount) * estimatedAPY / 365 / 100).toFixed(6) : '0';
  const monthlyRewards = stakeAmount ? (parseFloat(stakeAmount) * estimatedAPY / 12 / 100).toFixed(4) : '0';

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl">
          <CardHeader className="relative pb-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="text-center space-y-4 py-8">
              <Wallet className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-bold">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Please connect your wallet to stake or unstake tokens
              </p>
              <Button
                className="bg-gradient-to-r from-primary to-purple-600"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-purple-600/20 relative pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">Stake Your 0G Tokens</h2>
            <p className="text-sm text-muted-foreground">Choose your validator</p>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getValidatorAvatar()}
                  alt={`${validator.moniker} avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{validator.moniker}</p>
                  <p className="text-xs text-muted-foreground">Commission: {validator.commissionRate}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Power: {validator.votingPower?.toFixed(2)}%
              </Badge>
            </div>
          </div>

          {/* Tab Buttons with Inline Styles */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg">
            <button
              onClick={() => setActiveTab('stake')}
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: activeTab === 'stake' ? '#10b981' : 'transparent',
                color: activeTab === 'stake' ? 'white' : '#9ca3af',
                boxShadow: activeTab === 'stake' ? '0 10px 25px rgba(16, 185, 129, 0.3)' : 'none',
                transform: activeTab === 'stake' ? 'scale(1.05)' : 'scale(1)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Coins className="h-4 w-4" />
              Stake
            </button>
            
            <button
              onClick={() => setActiveTab('unstake')}
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: activeTab === 'unstake' ? '#ef4444' : 'transparent',
                color: activeTab === 'unstake' ? 'white' : '#9ca3af',
                boxShadow: activeTab === 'unstake' ? '0 10px 25px rgba(239, 68, 68, 0.3)' : 'none',
                transform: activeTab === 'unstake' ? 'scale(1.05)' : 'scale(1)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Unstake
            </button>
          </div>

          {/* Stake Tab Content */}
          {activeTab === 'stake' && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Balance</span>
                <span className="font-medium">{balance ? parseFloat(balance.formatted).toFixed(4) : '0'} OG</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Stake</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pr-12 text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    OG
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg transition-all duration-300 pointer-events-none"
                    style={{ width: `${sliderValue}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="relative w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer z-10"
                  />
                </div>
                <div className="flex justify-between">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => handleSliderChange(val)}
                      className={`text-xs transition-all ${
                        sliderValue === val 
                          ? 'text-green-500 font-medium scale-110' 
                          : 'text-muted-foreground hover:text-green-500'
                      }`}
                    >
                      {val === 100 ? 'MAX' : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You will stake</span>
                  <span className="font-medium">{stakeAmount || '0'} OG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. APY</span>
                  <span className="text-green-500 font-medium">{estimatedAPY}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Rewards</span>
                  <span className="text-green-500">~{dailyRewards} OG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rewards</span>
                  <span className="text-green-500 font-medium">~{monthlyRewards} OG</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-white"
                  onClick={handleStake}
                  disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                >
                  {loading ? 'Processing...' : 'Confirm Staking'}
                </Button>
              </div>
            </div>
          )}

          {/* Unstake Tab Content */}
          {activeTab === 'unstake' && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Currently Staked
                </span>
                <span className="font-medium text-orange-500">
                  {loadingStaked ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    `${stakedBalance} OG`
                  )}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Unstake</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={unstakeShares}
                    onChange={(e) => handleUnstakeAmountChange(e.target.value)}
                    className="pr-12 text-lg"
                    disabled={parseFloat(stakedBalance) === 0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    OG
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg transition-all duration-300 pointer-events-none"
                    style={{ width: `${unstakeSliderValue}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={unstakeSliderValue}
                    onChange={(e) => handleUnstakeSliderChange(Number(e.target.value))}
                    className="relative w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer z-10"
                    disabled={parseFloat(stakedBalance) === 0}
                  />
                </div>
                <div className="flex justify-between">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => handleUnstakeSliderChange(val)}
                      className={`text-xs transition-all ${
                        unstakeSliderValue === val 
                          ? 'text-red-500 font-medium scale-110' 
                          : 'text-muted-foreground hover:text-red-500'
                      }`}
                      disabled={parseFloat(stakedBalance) === 0}
                    >
                      {val === 100 ? 'MAX' : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-500 font-medium">21 Day Unbonding Period</p>
                  <p className="text-amber-400/80 text-xs mt-1">
                    Tokens will be locked during unbonding
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-500/90 hover:to-orange-500/90 text-white"
                  onClick={handleUnstake}
                  disabled={loading || !unstakeShares || parseFloat(unstakeShares) <= 0 || parseFloat(stakedBalance) === 0}
                >
                  {loading ? 'Processing...' : 'Confirm Unstaking'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}