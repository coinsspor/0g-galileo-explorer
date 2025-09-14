import { useState, useEffect } from 'react';
import { Server, Activity, Zap, Copy, CheckCircle, Clock, Search, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface RPC {
  url: string;
  latency: number;
  peers: number;
}

export function RPCMonitoring() {
  const [rpcs, setRpcs] = useState<RPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latency');
  const [copied, setCopied] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [nextUpdateText, setNextUpdateText] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    excellent: 0,
    good: 0,
    slow: 0,
    avgLatency: 0
  });

  useEffect(() => {
    fetchRPCs();
    const interval = setInterval(fetchRPCs, 3600000); // Her saat
    return () => clearInterval(interval);
  }, []);

  const fetchRPCs = async () => {
    try {
      const response = await fetch('/rpc_data.json?t=' + Date.now());
      const data = await response.json();
      
      const excellent = data.rpcs.filter((r: RPC) => r.latency < 100);
      const good = data.rpcs.filter((r: RPC) => r.latency >= 100 && r.latency < 500);
      const slow = data.rpcs.filter((r: RPC) => r.latency >= 500);
      
      setStats({
        total: data.rpcs.length,
        excellent: excellent.length,
        good: good.length,
        slow: slow.length,
        avgLatency: Math.round(data.rpcs.reduce((a: number, b: RPC) => a + b.latency, 0) / data.rpcs.length)
      });
      
      setRpcs(data.rpcs);
      
      // lastUpdate'i timestamp olarak sakla ve next update'i hesapla
      if (data.lastUpdate) {
        const updateTime = new Date(data.lastUpdate).getTime();
        setLastUpdateTime(updateTime);
        
        // 1 saat sonrasını hesapla
        const nextUpdate = new Date(updateTime + 3600000);
        setNextUpdateText(nextUpdate.toLocaleTimeString());
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch RPCs:', error);
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 100) return 'text-green-400';
    if (latency < 300) return 'text-yellow-400';
    if (latency < 500) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLatencyBadge = (latency: number, index: number) => {
    if (index === 0) {
      return (
        <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-xs rounded-full text-white font-bold">
          FASTEST
        </span>
      );
    }
    if (latency < 50) {
      return (
        <span className="ml-2 px-2 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-xs rounded-full text-white">
          EXCELLENT
        </span>
      );
    }
    if (latency < 100) {
      return (
        <span className="ml-2 px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-xs rounded-full text-white">
          FAST
        </span>
      );
    }
    return null;
  };

  const filteredRpcs = rpcs
    .filter(rpc => 
      rpc.url.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'latency') return a.latency - b.latency;
      if (sortBy === 'peers') return b.peers - a.peers;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header with Timer */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Server className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">EVM RPC Network Scanner</h1>
              <p className="text-muted-foreground">0G Testnet - {stats.total} Active EVM Endpoints</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Last updated: {lastUpdateTime > 0 ? new Date(lastUpdateTime).toLocaleTimeString() : 'Loading...'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span>Next update: <span className="font-bold text-primary">{nextUpdateText || 'Loading...'}</span></span>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-400 font-medium mb-1">Automatic EVM RPC Discovery</p>
              <p className="text-muted-foreground">
                This scanner automatically discovers and tests all EVM RPC endpoints across the entire 0G network. 
                It recursively scans peer connections to find EVM-compatible nodes (ports 8545-65545) and verifies chain ID (0x40d9). 
                Full network scans are performed hourly to discover new nodes and update latency metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total EVM RPCs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Server className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Excellent</p>
                <p className="text-2xl font-bold text-green-400">{stats.excellent}</p>
                <p className="text-xs text-muted-foreground">&lt;100ms</p>
              </div>
              <Zap className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.good}</p>
                <p className="text-xs text-muted-foreground">100-500ms</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{stats.avgLatency}ms</p>
                <p className="text-xs text-muted-foreground">Network avg</p>
              </div>
              <Clock className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search EVM RPC endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="latency">Sort by Latency</option>
            <option value="peers">Sort by Peers</option>
          </select>
        </div>
      </div>

      {/* RPC Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">EVM Endpoint</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Latency</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Peers</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRpcs.map((rpc, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">
                    {index + 1}
                    {getLatencyBadge(rpc.latency, index)}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm">{rpc.url}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${getLatencyColor(rpc.latency)}`}>
                      {rpc.latency}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {rpc.peers}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(rpc.url)}
                    >
                      {copied === rpc.url ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}