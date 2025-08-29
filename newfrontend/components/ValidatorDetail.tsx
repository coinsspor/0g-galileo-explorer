import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { 
  Copy, 
  ExternalLink, 
  Shield, 
  Users, 
  Coins, 
  Percent, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Globe,
  Mail,
  Activity,
  Key,
  Lock,
  FileText,
  User,
  Fingerprint,
  Award,
  Hash,
  Server,
  Trophy,
  Info,
  AlertCircle
} from 'lucide-react';

interface ValidatorDetailProps {
  validatorAddress: string;
  onBack: () => void;
}

export function ValidatorDetail({ validatorAddress, onBack }: ValidatorDetailProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [validator, setValidator] = useState<any>(null);
  const [delegators, setDelegators] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [uptime, setUptime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Keybase avatar fetch fonksiyonu
  const fetchKeybaseAvatar = async (identity: string) => {
    if (!identity || identity.length < 16) return null;

    try {
      const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=basics,pictures`);
      const data = await response.json();
      
      if (data.status?.code === 0 && data.them?.[0]?.pictures?.primary?.url) {
        return data.them[0].pictures.primary.url;
      }
    } catch (error) {
      console.error('Avatar fetch error:', error);
    }
    return null;
  };

  useEffect(() => {
    fetchValidatorData();
  }, [validatorAddress]);

  const fetchValidatorData = async () => {
    try {
      setLoading(true);

      const validatorsRes = await fetch('/api/validators');
      const validatorsData = await validatorsRes.json();
      
      // Sort validators by totalStaked to get correct rank
      const sortedValidators = validatorsData.validators?.sort((a: any, b: any) => b.totalStaked - a.totalStaked) || [];
      
      // Find validator with correct rank
      const validatorIndex = sortedValidators.findIndex(
        (v: any) => v.address.toLowerCase() === validatorAddress.toLowerCase()
      );
      
      const validatorInfo = sortedValidators[validatorIndex];
      
      if (validatorInfo) {
        // Add correct rank based on index
        validatorInfo.rank = validatorIndex + 1;
        setValidator(validatorInfo);
        
        // Avatar'ı fetch et
        if (validatorInfo.identity) {
          const avatar = await fetchKeybaseAvatar(validatorInfo.identity);
          setAvatarUrl(avatar);
        }
      }

      // Uptime verisini doğru endpoint'ten al
      try {
        const uptimeRes = await fetch(`/api/v2/uptime/${validatorAddress}`);
        const uptimeData = await uptimeRes.json();
        if (uptimeData.success && uptimeData.data) {
          setUptime(uptimeData.data);
        }
      } catch (error) {
        // Alternatif uptime endpoint'i dene
        try {
          const uptimeRes = await fetch('/api/v2/uptime/grid');
          const uptimeData = await uptimeRes.json();
          if (uptimeData.success && uptimeData.data) {
            const validatorUptime = uptimeData.data.find(
              (item: any) => item.validator.toLowerCase() === validatorAddress.toLowerCase()
            );
            setUptime(validatorUptime);
          }
        } catch (error) {
          console.error('Uptime fetch error:', error);
        }
      }

      try {
        const delegatorsRes = await fetch(`/api/validator-delegators/${validatorAddress}`);
        const delegatorsData = await delegatorsRes.json();
        if (delegatorsData.success && delegatorsData.delegators) {
          setDelegators(delegatorsData.delegators.list || []);
        }
      } catch (error) {
        console.error('Delegators fetch error:', error);
      }

      try {
        const txRes = await fetch(`/api/validator-transactions/${validatorAddress}`);
        const txData = await txRes.json();
        if (txData.success && txData.transactions) {
          setTransactions(txData.transactions.recent || []);
        }
      } catch (error) {
        console.error('Transactions fetch error:', error);
      }

    } catch (error) {
      console.error('Error fetching validator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch (err) {
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(`${label} copied!`);
      } catch (err) {
        toast.error('Failed to copy');
      }
      document.body.removeChild(textArea);
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 12)}...${address.slice(-8)}`;

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'Delegate': return 'bg-green-500 text-white border-green-500';
      case 'Undelegate': return 'bg-red-500 text-white border-red-500';
      case 'CreateValidator': return 'bg-primary text-primary-foreground border-primary';
      case 'Withdraw': return 'bg-amber-500 text-white border-amber-500';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    
    const letter = validator?.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
    const color = colors[validator?.rank % colors.length || 0];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="40" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="32" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const letter = validator?.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
    const color = colors[validator?.rank % colors.length || 0];
    
    e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="40" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="32" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const filteredTransactions = transactionFilter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type.toLowerCase() === transactionFilter);

  const transactionCounts = {
    all: transactions.length,
    delegate: transactions.filter(tx => tx.type === 'Delegate').length,
    undelegate: transactions.filter(tx => tx.type === 'Undelegate').length,
    createvalidator: transactions.filter(tx => tx.type === 'CreateValidator').length,
    withdraw: transactions.filter(tx => tx.type === 'Withdraw').length,
    others: transactions.filter(tx => tx.type === 'Others').length
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading validator details...</p>
        </div>
      </div>
    );
  }

  if (!validator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Validators
        </Button>
        <p className="mt-4">Validator not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="hover:bg-primary/10">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Validators
        </Button>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background via-background/95 to-background shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
        
        <CardContent className="relative p-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            {/* Sol Kısım - Avatar ve Temel Bilgiler */}
            <div className="flex items-start gap-6 flex-1">
              <div className="relative group">
                {/* Animated glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 animate-pulse transition-opacity"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-40 animate-spin-slow"></div>
                <Avatar className="relative h-32 w-32 border-4 border-primary/30 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shadow-2xl">
                  <AvatarImage 
                    src={getAvatarUrl()} 
                    alt={validator.moniker}
                    onError={handleAvatarError}
                    className="rounded-full"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white text-3xl font-bold">
                    {validator.moniker.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-background ${
                  validator.status === 'Aktif' 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50'
                } animate-pulse`}>
                  {validator.status === 'Aktif' ? 
                    <CheckCircle className="h-4 w-4 text-white m-auto mt-0.5" /> : 
                    <XCircle className="h-4 w-4 text-white m-auto mt-0.5" />
                  }
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">
                      <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
                        {validator.moniker}
                      </span>
                    </h1>
                    <Badge className={`${
                      validator.status === 'Aktif' 
                        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-500 border-green-500/30" 
                        : "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-500 border-red-500/30"
                    } px-3 py-1`}>
                      <div className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${validator.status === 'Aktif' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                        {validator.status === 'Aktif' ? 'Active' : 'Jailed'}
                      </div>
                    </Badge>
                    <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30">
                      <Trophy className="h-3 w-3 mr-1" />
                      #{validator.rank || validator.position || 1}
                    </Badge>
                  </div>
                  
                  {/* İletişim Bilgileri */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {validator.website && (
                      <a 
                        href={validator.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 transition-all duration-300 group border border-blue-500/20"
                      >
                        <Globe className="h-4 w-4 text-blue-500 group-hover:rotate-12 transition-transform" />
                        <span className="text-sm text-blue-500 font-medium">Website</span>
                        <ExternalLink className="h-3 w-3 text-blue-500/60" />
                      </a>
                    )}
                    
                    {validator.securityContact && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 group">
                        <Mail className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-orange-500 font-medium truncate max-w-[200px]">{validator.securityContact}</span>
                        <button
                          className="p-0 hover:bg-transparent"
                          onClick={() => {
                            navigator.clipboard.writeText(validator.securityContact);
                            toast.success('Security Contact copied!');
                          }}
                        >
                          <Copy className="h-3 w-3 text-orange-500/60 hover:text-orange-500 cursor-pointer" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sağ Kısım - Uptime Circle Chart ve Stats */}
            <div className="flex items-center gap-6">
              {/* Uptime Circle Chart */}
              <div className="relative w-28 h-28">
                <svg className="transform -rotate-90 w-28 h-28">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="url(#gradient)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - (uptime?.uptimePercentage || 0) / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                      {uptime?.uptimePercentage?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-xs text-muted-foreground">Uptime</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {delegators.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Delegators</div>
                </div>
                
                <Button 
                  size="lg"
                  className="relative overflow-hidden bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-600/90 hover:to-pink-600/90 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 group"
                >
                  <span className="relative z-10 flex items-center">
                    <Coins className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                    Delegate Now
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Uptime Blocks Grid */}
          {uptime?.blocks && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Last 100 Blocks Performance</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-sm bg-gradient-to-r from-green-500 to-emerald-500"></div>
                    Signed
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-sm bg-gradient-to-r from-red-500 to-red-600"></div>
                    Missed
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-20 gap-1">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-full rounded-sm transition-all duration-300 hover:scale-150 hover:z-10 ${
                      i < (uptime?.signedBlocks || 0) 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm shadow-green-500/30' 
                        : 'bg-gradient-to-r from-red-500 to-red-600 shadow-sm shadow-red-500/30'
                    }`}
                    title={`Block ${i + 1}: ${i < (uptime?.signedBlocks || 0) ? 'Signed' : 'Missed'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Voting Power</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl roll-in">{validator.votingPower?.toFixed(2) || '0.00'}%</div>
            <Progress value={validator.votingPower || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Staked</CardTitle>
            <Coins className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-chart-4 roll-in">
              {validator.totalStaked >= 1000000 
                ? `${(validator.totalStaked / 1000000).toFixed(2)}M`
                : validator.totalStaked.toLocaleString()} 0G
            </div>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Commission</CardTitle>
            <Percent className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-secondary roll-in">{validator.commissionRate}</div>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl roll-in">{uptime?.uptimePercentage?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {uptime?.signedBlocks || 0}/{uptime?.totalBlocks || 0} blocks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="info">Validator Info</TabsTrigger>
          <TabsTrigger value="delegators">Delegators ({delegators.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          {/* Ana Bilgi Kartları Grid - Daha Büyük ve Renkli */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Validator Address */}
            <Card className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 border-0 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-background min-h-[140px]">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 rounded-l-xl"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 group-hover:scale-110 transition-transform shadow-lg">
                        <User className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-purple-100">Validator Address</h3>
                        <p className="text-xs text-purple-300/70">Contract address</p>
                      </div>
                    </div>
                                          <div className="relative group/code">
                      <code className="text-xs font-mono bg-gradient-to-r from-purple-900/30 to-purple-800/20 px-4 py-3 rounded-xl block break-all text-purple-200 border border-purple-500/30 group-hover/code:border-purple-400/50 transition-all">
                        {validator.address}
                      </code>
                      <div 
                        className="absolute top-2 right-2 p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 transition-all opacity-0 group-hover/code:opacity-100 cursor-pointer"
                        onClick={() => copyToClipboard(validator.address, 'Validator Address')}
                      >
                        <Copy className="h-4 w-4 text-purple-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Public Key */}
            <Card className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 border-0 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-background min-h-[140px]">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 rounded-l-xl"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 group-hover:scale-110 transition-transform shadow-lg">
                        <Key className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-cyan-100">Public Key</h3>
                        <p className="text-xs text-cyan-300/70">Consensus key</p>
                      </div>
                    </div>
                                          <div className="relative group/code">
                      <code className="text-xs font-mono bg-gradient-to-r from-cyan-900/30 to-cyan-800/20 px-4 py-3 rounded-xl block break-all text-cyan-200 border border-cyan-500/30 group-hover/code:border-cyan-400/50 transition-all">
                        {validator.publicKey || 'Not available'}
                      </code>
                      <div 
                        className="absolute top-2 right-2 p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 transition-all opacity-0 group-hover/code:opacity-100 cursor-pointer"
                        onClick={() => copyToClipboard(validator.publicKey || 'Not available', 'Public Key')}
                      >
                        <Copy className="h-4 w-4 text-cyan-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity */}
            {validator.identity && (
              <Card className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 border-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-background min-h-[140px]">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 rounded-l-xl"></div>
                <CardContent className="relative p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 group-hover:scale-110 transition-transform shadow-lg">
                          <Fingerprint className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-emerald-100">Identity</h3>
                          <p className="text-xs text-emerald-300/70">Keybase verification</p>
                        </div>
                      </div>
                      <div className="relative group/code">
                        <code className="text-xs font-mono bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 px-4 py-3 rounded-xl block break-all text-emerald-200 border border-emerald-500/30 group-hover/code:border-emerald-400/50 transition-all">
                          {validator.identity}
                        </code>
                        <div 
                          className="absolute top-2 right-2 p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 transition-all opacity-0 group-hover/code:opacity-100 cursor-pointer"
                          onClick={() => copyToClipboard(validator.identity, 'Identity')}
                        >
                          <Copy className="h-4 w-4 text-emerald-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operator Address */}
            {validator.operatorAddress && (
              <Card className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 border-0 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-background min-h-[140px]">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-l-xl"></div>
                <CardContent className="relative p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/20 group-hover:scale-110 transition-transform shadow-lg">
                          <Shield className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-blue-100">Operator Address</h3>
                          <p className="text-xs text-blue-300/70">Operator account</p>
                        </div>
                      </div>
                      <div className="relative group/code">
                        <code className="text-xs font-mono bg-gradient-to-r from-blue-900/30 to-blue-800/20 px-4 py-3 rounded-xl block break-all text-blue-200 border border-blue-500/30 group-hover/code:border-blue-400/50 transition-all">
                          {validator.operatorAddress}
                        </code>
                        <div 
                          className="absolute top-2 right-2 p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-all opacity-0 group-hover/code:opacity-100 cursor-pointer"
                          onClick={() => copyToClipboard(validator.operatorAddress, 'Operator Address')}
                        >
                          <Copy className="h-4 w-4 text-blue-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Description Card - Full Width Animated */}
          {validator.details && (
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 rounded-l-xl"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent"></div>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 shadow-lg">
                    <Info className="h-6 w-6 text-amber-400" />
                  </div>
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    About This Validator
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-100/80 leading-relaxed pl-14 pr-4">
                  {validator.details}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="delegators" className="space-y-6">
          <Card className="card-depth">
            <CardHeader>
              <CardTitle>Delegators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Staked</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegators.map((delegator, index) => (
                      <TableRow key={delegator.address}>
                        <TableCell>#{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="font-mono text-sm">{formatAddress(delegator.address)}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(delegator.address, 'Address')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-chart-4">{delegator.staked?.toFixed(2) || '0'} 0G</TableCell>
                        <TableCell>{delegator.percentage || '0'}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="card-depth">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transactions</CardTitle>
                <div className="flex gap-2">
                  {Object.entries(transactionCounts).map(([type, count]) => (
                    count > 0 && (
                      <Button
                        key={type}
                        variant={transactionFilter === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTransactionFilter(type)}
                        className={transactionFilter === type ? (
                          type === 'undelegate' 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : type === 'delegate'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : type === 'withdraw'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : ''
                        ) : ''}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                        <Badge variant="secondary" className="ml-2">
                          {count}
                        </Badge>
                      </Button>
                    )
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hash</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Block</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.hash}>
                        <TableCell>
                          <code className="font-mono text-sm">{tx.shortHash || formatAddress(tx.hash)}</code>
                        </TableCell>
                        <TableCell>
                          <span 
                            className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: tx.type === 'Undelegate' ? '#ef4444' : 
                                             tx.type === 'Delegate' ? '#22c55e' :
                                             tx.type === 'Withdraw' ? '#f59e0b' :
                                             tx.type === 'CreateValidator' ? '#8b5cf6' : '#6b7280',
                              color: 'white'
                            }}
                          >
                            {tx.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'SUCCESS' ? 'default' : 'destructive'}>
                            {tx.status === 'SUCCESS' ? 
                              <CheckCircle className="h-3 w-3" /> : 
                              <XCircle className="h-3 w-3" />
                            }
                            <span className="ml-1">{tx.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.amount} 0G</TableCell>
                        <TableCell>{tx.blockNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}