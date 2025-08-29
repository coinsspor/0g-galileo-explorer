import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Activity, Calendar, TrendingUp, AlertTriangle, RefreshCw, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface UptimeValidator {
  validator: string;
  moniker: string;
  signedBlocks: number;
  totalBlocks: number;
  uptimePercentage: number;
  status: string;
  uptimeRank?: number;
  missedBlocks?: number;
  proposedBlocks?: number;
  lastSeen?: string;
}

type SortField = 'uptimePercentage' | 'moniker' | 'missedBlocks' | 'uptimeRank';
type SortDirection = 'asc' | 'desc';

export function Uptime() {
  const [validators, setValidators] = useState<UptimeValidator[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('uptimeRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [timeRange, setTimeRange] = useState('100blocks');

  const fetchUptimeData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/v2/uptime/grid');
      const data = await response.json();
      
      if (data.success) {
        setValidators(data.data || []);
        setNetworkStats(data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch uptime data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUptimeData();
    const interval = setInterval(fetchUptimeData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    await fetch('/api/v2/uptime/refresh', { method: 'POST' });
    setTimeout(fetchUptimeData, 2000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'uptimePercentage' ? 'desc' : 'asc');
    }
  };

  const filteredAndSortedValidators = validators
    .filter(validator => 
      validator.moniker.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'uptimeRank') {
        const aRank = a.uptimeRank || 999;
        const bRank = b.uptimeRank || 999;
        return sortDirection === 'asc' ? aRank - bRank : bRank - aRank;
      }
      
      if (sortField === 'moniker') {
        return sortDirection === 'asc' 
          ? a.moniker.localeCompare(b.moniker)
          : b.moniker.localeCompare(a.moniker);
      }
      
      if (sortField === 'uptimePercentage') {
        return sortDirection === 'asc' 
          ? a.uptimePercentage - b.uptimePercentage
          : b.uptimePercentage - a.uptimePercentage;
      }
      
      if (sortField === 'missedBlocks') {
        const aMissed = a.missedBlocks || 0;
        const bMissed = b.missedBlocks || 0;
        return sortDirection === 'asc' ? aMissed - bMissed : bMissed - aMissed;
      }
      
      return 0;
    });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const getUptimeColorClass = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-chart-4';
      case 'good': return 'text-yellow-500';
      case 'warning': return 'text-orange-500';
      case 'poor': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Activity className="h-4 w-4 text-chart-4" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'warning':
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const excellentCount = validators.filter(v => v.status === 'excellent').length;
  const poorCount = validators.filter(v => v.status === 'poor' || v.status === 'critical').length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Validator Uptime</h1>
          <p className="text-muted-foreground">
            Monitoring last {networkStats?.blockRange?.total || 100} blocks performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search validators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100blocks">
                Last 100 blocks (Active)
              </SelectItem>
              <SelectItem value="7d" disabled>
                7 Days (Not Active)
              </SelectItem>
              <SelectItem value="30d" disabled>
                30 Days (Not Active)
              </SelectItem>
              <SelectItem value="90d" disabled>
                90 Days (Not Active)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Network Uptime</CardTitle>
            <Activity className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-chart-4 roll-in">
              {networkStats?.averageUptime || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last {networkStats?.blockRange?.total || 100} blocks
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Validators</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl roll-in">{validators.length}</div>
            <p className="text-xs text-muted-foreground">
              Monitoring performance
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Excellent Performers</CardTitle>
            <Activity className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-chart-4 roll-in">{excellentCount}</div>
            <p className="text-xs text-muted-foreground">
              &gt;98% uptime
            </p>
          </CardContent>
        </Card>

        <Card className="card-depth card-3d hover:glow-gradient-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Issues Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-500 roll-in">{poorCount}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-depth">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Validator Performance (Last 100 Blocks)</CardTitle>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('uptimeRank')}
                className="text-xs"
              >
                Sort by Rank {getSortIcon('uptimeRank')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('uptimePercentage')}
                className="text-xs"
              >
                Sort by Uptime {getSortIcon('uptimePercentage')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('moniker')}
                className="text-xs"
              >
                Sort by Name {getSortIcon('moniker')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('missedBlocks')}
                className="text-xs"
              >
                Sort by Missed {getSortIcon('missedBlocks')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading uptime data...</p>
            </div>
          ) : filteredAndSortedValidators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No validators found matching "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedValidators.map((validator) => {
                const displayRank = validator.uptimeRank || 0;
                return (
                  <div 
                    key={validator.validator}
                    className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-all duration-300 hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(validator.status)}
                        <div>
                          <h4 className="font-semibold">{validator.moniker}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Rank: #{displayRank}</span>
                            <span>Signed: {validator.signedBlocks}/{validator.totalBlocks}</span>
                            <span>Missed: {validator.missedBlocks || 0}</span>
                            {validator.proposedBlocks > 0 && (
                              <span className="text-primary">Proposed: {validator.proposedBlocks}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={getUptimeColorClass(validator.status)}>
                        {validator.uptimePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uptime Performance</span>
                        <span className={getUptimeColorClass(validator.status)}>
                          {validator.uptimePercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={validator.uptimePercentage} 
                        className="h-3"
                      />
                      {validator.lastSeen && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last seen: {new Date(validator.lastSeen).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}