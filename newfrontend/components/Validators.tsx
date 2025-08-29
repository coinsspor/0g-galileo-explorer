import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Search, ChevronUp, ChevronDown, Users, Activity, Shield, RefreshCw, Eye, Coins } from 'lucide-react';
import { ValidatorDetail } from './ValidatorDetail';
import { StakeModal } from './StakeModal';

interface Validator {
  rank: number;
  moniker: string;
  address: string;
  operatorAddress?: string;
  votingPower: number;
  commissionRate: string;
  status: string;
  totalStaked: number;
  identity?: string;
  avatarUrl?: string;
  uptime?: number;
  signedBlocks?: number;
  totalBlocks?: number;
}

type SortField = 'rank' | 'moniker' | 'votingPower' | 'uptime' | 'commissionRate' | 'totalStaked';
type SortDirection = 'asc' | 'desc';

export function Validators() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarCache, setAvatarCache] = useState<{[key: string]: string}>({});
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null);
  const [stakeModalValidator, setStakeModalValidator] = useState<Validator | null>(null);

  const fetchKeybaseAvatar = async (identity: string) => {
    if (!identity || identity.length < 16) return null;
    if (avatarCache[identity]) return avatarCache[identity];

    try {
      const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=basics,pictures`);
      const data = await response.json();
      
      if (data.status?.code === 0 && data.them?.[0]?.pictures?.primary?.url) {
        const avatarUrl = data.them[0].pictures.primary.url;
        setAvatarCache(prev => ({ ...prev, [identity]: avatarUrl }));
        return avatarUrl;
      }
    } catch (error) {}
    return null;
  };

  const fetchValidators = async () => {
    try {
      setIsRefreshing(true);
      
      const validatorsRes = await fetch('/api/validators');
      const validatorsData = await validatorsRes.json();
      
      let uptimeMap = new Map();
      try {
        const uptimeRes = await fetch('/api/v2/uptime/grid');
        const uptimeData = await uptimeRes.json();
        
        if (uptimeData.success && uptimeData.data) {
          uptimeData.data.forEach((item: any) => {
            uptimeMap.set(item.validator.toLowerCase(), {
              uptime: item.uptimePercentage || 0,
              signedBlocks: item.signedBlocks || 0,
              totalBlocks: item.totalBlocks || 0
            });
          });
        }
      } catch (error) {
        console.log('Uptime API error:', error);
      }
      
      if (validatorsData.validators) {
        const validatorsWithUptime = validatorsData.validators.map((v: any, index: number) => {
          const uptimeInfo = uptimeMap.get(v.address.toLowerCase()) || { uptime: 0, signedBlocks: 0, totalBlocks: 0 };
          
          return {
            ...v,
            rank: index + 1,
            uptime: uptimeInfo.uptime,
            signedBlocks: uptimeInfo.signedBlocks,
            totalBlocks: uptimeInfo.totalBlocks
          };
        });
        
        setValidators(validatorsWithUptime);
        setLoading(false);
        
        // Avatar'ları batch'ler halinde çek
        const batchSize = 5;
        for (let i = 0; i < validatorsWithUptime.length; i += batchSize) {
          const batch = validatorsWithUptime.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (v: any) => {
            const avatarUrl = v.identity ? await fetchKeybaseAvatar(v.identity) : null;
            return { ...v, avatarUrl };
          });
          
          const batchWithAvatars = await Promise.all(batchPromises);
          
          setValidators(prev => {
            const updated = [...prev];
            batchWithAvatars.forEach((v, idx) => {
              const globalIdx = i + idx;
              if (updated[globalIdx]) {
                updated[globalIdx] = v;
              }
            });
            return updated;
          });
          
          if (i + batchSize < validatorsWithUptime.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('API error:', error);
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchValidators();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleManualRefresh = () => {
    fetchValidators();
  };

  const handleValidatorClick = (address: string) => {
    setSelectedValidator(address);
  };

  const filteredAndSortedValidators = validators
    .filter(validator => 
      validator.moniker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      validator.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-500';
    if (uptime >= 95) return 'text-yellow-500';
    if (uptime >= 90) return 'text-orange-500';
    return 'text-red-500';
  };

  const getAvatarUrl = (validator: Validator) => {
    if (validator.avatarUrl) return validator.avatarUrl;
    
    const letter = validator.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    const color = colors[validator.rank % colors.length || 0];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="18" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>, validator: Validator) => {
    const letter = validator.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
    const color = colors[validator.rank % colors.length || 0];
    
    e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="18" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const formatStaked = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M 0G`;
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} 0G`;
  };

  const activeValidators = validators.filter(v => v.status === 'Aktif');
  const totalStaked = validators.reduce((sum, v) => sum + v.totalStaked, 0);
  const avgUptime = validators.length > 0 
    ? validators.reduce((sum, v) => sum + (v.uptime || 0), 0) / validators.length 
    : 0;

  // Eğer bir validator seçiliyse, detail sayfasını göster
  if (selectedValidator) {
    return (
      <ValidatorDetail 
        validatorAddress={selectedValidator} 
        onBack={() => setSelectedValidator(null)} 
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Validators</h1>
          <p className="text-muted-foreground">Discover and delegate to network validators</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search validators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Validators</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validators.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeValidators.length} active
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Average Uptime</CardTitle>
            <Activity className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-chart-4 font-bold">
              {avgUptime.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 100 blocks
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Staked</CardTitle>
            <Shield className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStaked(totalStaked)}
            </div>
            <p className="text-xs text-muted-foreground">
              Network security
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-depth">
        <CardHeader>
          <CardTitle>All Validators ({filteredAndSortedValidators.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading validators...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('rank')}>
                      <div className="flex items-center space-x-1">
                        <span>Rank</span>
                        {getSortIcon('rank')}
                      </div>
                    </TableHead>
                    <TableHead>Avatar</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('moniker')}>
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        {getSortIcon('moniker')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('votingPower')}>
                      <div className="flex items-center space-x-1">
                        <span>Voting Power</span>
                        {getSortIcon('votingPower')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('uptime')}>
                      <div className="flex items-center space-x-1">
                        <span>Uptime</span>
                        {getSortIcon('uptime')}
                      </div>
                    </TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('totalStaked')}>
                      <div className="flex items-center space-x-1">
                        <span>Total Staked</span>
                        {getSortIcon('totalStaked')}
                      </div>
                    </TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedValidators.map((validator) => (
                    <TableRow key={validator.address} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">#{validator.rank}</span>
                          <Badge variant={validator.status === 'Aktif' ? 'default' : 'destructive'} className={validator.status === 'Aktif' ? 'bg-green-500 text-white' : ''}>
                            {validator.status === 'Aktif' ? 'Active' : 'Jailed'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={getAvatarUrl(validator)}
                          alt={validator.moniker}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 cursor-pointer hover:scale-110 transition-transform"
                          onError={(e) => handleAvatarError(e, validator)}
                          onClick={() => handleValidatorClick(validator.address)}
                        />
                      </TableCell>
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleValidatorClick(validator.address)}
                        >
                          <div className="font-medium">{validator.moniker}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {validator.address.slice(0, 8)}...{validator.address.slice(-6)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {validator.votingPower?.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-sm font-bold ${getUptimeColor(validator.uptime || 0)}`}>
                            {validator.uptime?.toFixed(1) || '0.0'}%
                          </div>
                          <Progress value={validator.uptime || 0} className="h-2 w-20" />
                          {validator.totalBlocks > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {validator.signedBlocks}/{validator.totalBlocks}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{validator.commissionRate}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{formatStaked(validator.totalStaked)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleValidatorClick(validator.address)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
  size="sm" 
  style={{
    background: 'linear-gradient(135deg, #00d9ff 0%, #00b8d4 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 15px rgba(0, 217, 255, 0.3)'
  }}
  className="hover:opacity-90 transition-all"
  onClick={() => setStakeModalValidator(validator)}
>
  <Coins className="h-4 w-4 mr-1" />
  Stake
</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {stakeModalValidator && (
        <StakeModal 
          validator={stakeModalValidator}
          onClose={() => setStakeModalValidator(null)}
        />
      )}
    </div>
  );
}