import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Coins, Shield, Plus, Minus, ArrowRight, Activity, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface Delegation {
  validator: {
    address: string;
    moniker: string;
    commissionRate: string;
    status: string;
    totalStaked: number;
    avatarUrl?: string;
    identity?: string;
  };
  delegation: {
    shares: string;
    tokens: number;
    method: string;
  };
}

interface Validator {
  address: string;
  moniker: string;
  commissionRate: string;
  status: string;
  totalStaked: number;
  votingPower: number;
  avatarUrl?: string;
  identity?: string;
  uptime?: number;
}

export function Staking() {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ 
    address: walletAddress,
    watch: true
  });
  
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeDialog, setShowStakeDialog] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);

  const totalStaked = delegations.reduce((sum, d) => sum + d.delegation.tokens, 0);
  const availableBalance = balance ? parseFloat(balance.formatted) : 0;

  const fetchKeybaseAvatar = async (identity: string) => {
    if (!identity || identity.length < 16) return null;
    
    try {
      const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=basics,pictures`);
      const data = await response.json();
      
      if (data.status?.code === 0 && data.them?.[0]?.pictures?.primary?.url) {
        return data.them[0].pictures.primary.url;
      }
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
    }
    return null;
  };

  const fetchValidators = async () => {
    try {
      const response = await fetch('/api/validators');
      const data = await response.json();
      
      if (data.validators) {
        const validatorsWithAvatars = await Promise.all(
          data.validators
            .filter((v: Validator) => v.status === 'Aktif')
            .map(async (validator: Validator) => {
              let avatarUrl = validator.avatarUrl;
              
              if (validator.identity && validator.identity.length >= 16) {
                const keybaseAvatar = await fetchKeybaseAvatar(validator.identity);
                if (keybaseAvatar) {
                  avatarUrl = keybaseAvatar;
                }
              }
              
              return { ...validator, avatarUrl };
            })
        );
        
        setValidators(validatorsWithAvatars);
      }
    } catch (error) {
      console.error('Failed to fetch validators:', error);
    }
  };

  const fetchDelegations = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/delegations/${walletAddress}`);
      const data = await response.json();
      
      if (data.success && data.delegations) {
        const delegationsWithAvatars = await Promise.all(
          data.delegations.map(async (delegation: Delegation) => {
            let avatarUrl = delegation.validator.avatarUrl;
            
            if (delegation.validator.identity && delegation.validator.identity.length >= 16) {
              const keybaseAvatar = await fetchKeybaseAvatar(delegation.validator.identity);
              if (keybaseAvatar) {
                avatarUrl = keybaseAvatar;
              }
            }
            
            const validator = validators.find(v => v.address === delegation.validator.address);
            if (validator?.avatarUrl) {
              avatarUrl = validator.avatarUrl;
            }
            
            return {
              ...delegation,
              validator: {
                ...delegation.validator,
                avatarUrl
              }
            };
          })
        );
        
        setDelegations(delegationsWithAvatars);
      }
    } catch (error) {
      console.error('Failed to fetch delegations:', error);
      toast.error('Failed to load delegations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidators();
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchDelegations();
    }
  }, [walletAddress, isConnected, validators]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchValidators(),
        fetchDelegations(),
        refetchBalance()
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // ManageDelegation.tsx'teki gibi basit ve çalışan versiyon
  const handleStake = async () => {
    if (!walletAddress || !window.ethereum || !selectedValidator || !stakeAmount) {
      toast.error('Please fill all fields');
      return;
    }

    if (parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const amountInWei = (parseFloat(stakeAmount) * Math.pow(10, 18)).toString();
      const functionSignature = '0x5c19a95c';
      const delegatorParam = walletAddress.slice(2).padStart(64, '0');
      const callData = functionSignature + delegatorParam;
      
      const txParams = {
        from: walletAddress,
        to: selectedValidator,
        value: '0x' + BigInt(amountInWei).toString(16),
        data: callData
      };
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
      
      toast.success('Stake transaction sent!', {
        description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });
      
      setShowStakeDialog(false);
      setStakeAmount('');
      setSelectedValidator('');
      
      // Refresh after transaction
      setTimeout(async () => {
        await refetchBalance();
        await fetchDelegations();
      }, 3000);
      
    } catch (error: any) {
      toast.error('Stake failed', {
        description: error.message
      });
    }
  };

  // ManageDelegation.tsx'teki gibi basit versiyon
  const handleUnstake = async () => {
    if (!walletAddress || !window.ethereum || !selectedDelegation || !unstakeAmount) {
      toast.error('Please fill all fields');
      return;
    }

    if (parseFloat(unstakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const withdrawalFee = '1000000000'; // Fixed 1 Gwei fee
      const amountInWei = (parseFloat(unstakeAmount) * Math.pow(10, 18)).toString();
      
      const undelegateMethodId = '0x4d99dd16';
      const withdrawalAddressParam = walletAddress.slice(2).padStart(64, '0');
      const amountParam = BigInt(amountInWei).toString(16).padStart(64, '0');
      const callData = undelegateMethodId + withdrawalAddressParam + amountParam;
      
      const txParams = {
        from: walletAddress,
        to: selectedDelegation.validator.address,
        value: '0x' + BigInt(withdrawalFee).toString(16),
        data: callData
      };
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
      
      toast.success('Unstake transaction sent!', {
        description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });
      
      setShowUnstakeDialog(false);
      setUnstakeAmount('');
      setSelectedDelegation(null);
      
      // Refresh after transaction
      setTimeout(async () => {
        await refetchBalance();
        await fetchDelegations();
      }, 3000);
      
    } catch (error: any) {
      toast.error('Unstake failed', {
        description: error.message
      });
    }
  };

  const getValidatorAvatar = (validator: any) => {
    if (validator.avatarUrl) {
      return validator.avatarUrl;
    }
    
    const letter = validator.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#00d9ff', '#7c3aed', '#f093fb', '#f5576c'];
    const colorIndex = validator.address ? 
      parseInt(validator.address.slice(-6), 16) % colors.length : 
      0;
    const color = colors[colorIndex];
    
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

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="card-depth max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to view and manage your delegations
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Staking</h1>
          <p className="text-muted-foreground">Manage your 0G token delegations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Staked</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaked.toFixed(4)} OG</div>
            <p className="text-xs text-muted-foreground">
              Across {delegations.length} validators
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Available Balance</CardTitle>
            <Shield className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBalance.toFixed(4)} OG</div>
            <p className="text-xs text-muted-foreground">
              Ready to stake
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Delegations</CardTitle>
            <Activity className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delegations.length}</div>
            <p className="text-xs text-muted-foreground">
              Active validators
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-depth">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>My Delegations</CardTitle>
          <Button 
            onClick={() => setShowStakeDialog(true)}
            style={{
              background: 'linear-gradient(135deg, #00d9ff 0%, #00b8d4 100%)',
              color: 'white'
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Delegation
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading delegations...</p>
            </div>
          ) : delegations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active delegations</p>
              <Button 
                onClick={() => setShowStakeDialog(true)}
                variant="outline"
              >
                Start Staking
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {delegations.map((delegation, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img
                      src={getValidatorAvatar(delegation.validator)}
                      alt={delegation.validator.moniker}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getValidatorAvatar({ moniker: delegation.validator.moniker, address: delegation.validator.address });
                      }}
                    />
                    <div className="space-y-1">
                      <h4 className="font-medium">{delegation.validator.moniker}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Staked: {delegation.delegation.tokens.toFixed(4)} OG</span>
                        <span>Commission: {delegation.validator.commissionRate}</span>
                        <Badge 
                          variant={delegation.validator.status === 'Aktif' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {delegation.validator.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedValidator(delegation.validator.address);
                        setShowStakeDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Stake
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDelegation(delegation);
                        setShowUnstakeDialog(true);
                      }}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Unstake
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showStakeDialog} onOpenChange={setShowStakeDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Stake 0G Tokens</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select Validator</Label>
              <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a validator" />
                </SelectTrigger>
                <SelectContent>
                  {validators.map((validator) => (
                    <SelectItem key={validator.address} value={validator.address}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={getValidatorAvatar(validator)} 
                          alt={validator.moniker}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getValidatorAvatar({ moniker: validator.moniker, address: validator.address });
                          }}
                        />
                        {validator.moniker} - {validator.commissionRate}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount to Stake</Label>
              <div className="relative">
                <Input
                  placeholder="0.00"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="pr-12"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  OG
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Available: {availableBalance.toFixed(4)} OG
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowStakeDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStake}
                style={{
                  background: 'linear-gradient(135deg, #00d9ff 0%, #00b8d4 100%)',
                  color: 'white'
                }}
              >
                Stake Tokens
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnstakeDialog} onOpenChange={setShowUnstakeDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Unstake from {selectedDelegation?.validator.moniker}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Amount to Unstake (0G)</Label>
              <div className="relative">
                <Input
                  placeholder="0.00"
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="pr-12"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  OG
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Staked: {selectedDelegation?.delegation.tokens.toFixed(4)} OG
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400">
                ⚠️ Unstaking will require a 21-day unbonding period
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowUnstakeDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleUnstake}>
                Unstake Tokens
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}