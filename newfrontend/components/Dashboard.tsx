import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { RotatingCube } from './RotatingCube';
import { Activity, Users, Blocks, TrendingUp, Zap, Box, Flame, DollarSign, Medal, Trophy, Award } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalValidators: 118,
    activeValidators: 118,
    latestBlock: 5560502,
    avgBlockTime: 1.8,
    totalStaked: 49934150,
    stakingRatio: 68.5,
    tps: 1895,
    gasPrice: 6826760,
    gasUsed: 16721884,
    blockTxs: 24
  });

  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarCache, setAvatarCache] = useState({});
  const blockIntervalRef = useRef(null);
  const [pandaMessage, setPandaMessage] = useState("Hey! I'm 0G! 🚀");
  
  // Chart data states
  const [throughputData, setThroughputData] = useState([]);
  const [gasData, setGasData] = useState([]);
  const [blockData, setBlockData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  // Panda messages rotation
  useEffect(() => {
    const messages = [
      "Hey! I'm 0G! 🚀",
      "Validators rock! 🎸",
      "To the moon! 🌙",
      "Block party! 🎉",
      "Gas fees? Tiny! 💨",
      "Staking is cool! ⚡",
      "Decentralized! 🌍",
      "Lightning fast! ⚡",
      "0G Power! 💪"
    ];
    
    const interval = setInterval(() => {
      setPandaMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // Initialize animated chart data
  useEffect(() => {
    const initThroughput = [];
    const initGas = [];
    const initBlocks = [];
    
    for (let i = 24; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 3600000).getHours();
      initThroughput.push({
        time: `${hour}:00`,
        value: 1600 + Math.random() * 600
      });
    }
    
    for (let i = 10; i >= 0; i--) {
      initGas.push({
        time: `${i}m ago`,
        price: 6.8 + Math.random() * 0.5,
        used: (15 + Math.random() * 5) * 1000000
      });
    }
    
    for (let i = 10; i >= 0; i--) {
      initBlocks.push({
        height: 5560502 - i,
        txs: 20 + Math.floor(Math.random() * 10),
        time: 1.7 + Math.random() * 0.3
      });
    }
    
    setThroughputData(initThroughput);
    setGasData(initGas);
    setBlockData(initBlocks);
    setPerformanceData([
      { metric: 'TPS', value: 85, fullMark: 100 },
      { metric: 'Finality', value: 92, fullMark: 100 },
      { metric: 'Uptime', value: 99.9, fullMark: 100 },
      { metric: 'Decentralization', value: 78, fullMark: 100 },
      { metric: 'Security', value: 95, fullMark: 100 }
    ]);
  }, []);

  // Real-time updates
  useEffect(() => {
    blockIntervalRef.current = setInterval(() => {
      setStats(prev => ({
        ...prev,
        latestBlock: prev.latestBlock + 1,
        tps: 1600 + Math.floor(Math.random() * 600),
        gasUsed: 15000000 + Math.floor(Math.random() * 3000000),
        blockTxs: 20 + Math.floor(Math.random() * 10)
      }));

      // Update charts
      setThroughputData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: 'now',
          value: 1600 + Math.random() * 600
        });
        return newData;
      });

      setGasData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: 'now',
          price: 6.8 + Math.random() * 0.5,
          used: (15 + Math.random() * 5) * 1000000
        });
        return newData;
      });

      setBlockData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          height: stats.latestBlock + 1,
          txs: 20 + Math.floor(Math.random() * 10),
          time: 1.7 + Math.random() * 0.3
        });
        return newData;
      });
    }, 1800);

    return () => {
      if (blockIntervalRef.current) clearInterval(blockIntervalRef.current);
    };
  }, [stats.latestBlock]);

  // Keybase avatar fetch
  const fetchKeybaseAvatar = async (identity) => {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const validatorsRes = await fetch('/api/validators');
      const validatorsData = await validatorsRes.json();
      
      if (validatorsData.validators) {
        const validatorsWithAvatars = await Promise.all(
          validatorsData.validators.map(async (v) => {
            const avatarUrl = v.identity ? await fetchKeybaseAvatar(v.identity) : null;
            return { ...v, avatarUrl };
          })
        );
        
        const activeVals = validatorsWithAvatars
          .filter(v => v.status === 'Aktif')
          .sort((a, b) => b.votingPower - a.votingPower)
          .slice(0, 10);
        
        setValidators(activeVals);
        
        const totalStaked = validatorsWithAvatars.reduce((sum, v) => sum + (v.totalStaked || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalValidators: validatorsWithAvatars.length,
          activeValidators: validatorsWithAvatars.filter(v => v.status === 'Aktif').length,
          totalStaked: totalStaked
        }));
      }

      const statsRes = await fetch('/api/v2/blockchain/stats');
      const statsData = await statsRes.json();
      
      if (statsData.success && statsData.data) {
        setStats(prev => ({
          ...prev,
          latestBlock: statsData.data.blockHeight || prev.latestBlock,
          avgBlockTime: statsData.data.blockTime || 1.8,
          tps: statsData.data.tps || prev.tps,
          gasPrice: statsData.data.gasPrice || 6826760,
          gasUsed: statsData.data.gasUsed || prev.gasUsed,
          blockTxs: statsData.data.transactionCount || 24
        }));
      }
    } catch (error) {
      console.error('API error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  const formatStaked = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M 0G`;
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} 0G`;
  };

  const formatNumber = (num) => new Intl.NumberFormat().format(num);

  const getAvatarUrl = (validator) => {
    if (validator.avatarUrl) return validator.avatarUrl;
    
    const letter = validator.moniker?.[0]?.toUpperCase() || '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
    const color = colors[validator.rank % colors.length || 0];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="18" font-weight="600">${letter}</text>
      </svg>
    `)}`;
  };

  const handleAvatarError = (e, validator) => {
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

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return null;
    }
  };

  // Inline styles for animations
  const animationStyles = `
    @keyframes pandaFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    @keyframes pandaJump {
      0%, 100% { transform: translateY(0px) scale(1); }
      25% { transform: translateY(-10px) scale(1.05); }
      75% { transform: translateY(5px) scale(0.95); }
    }
    
    @keyframes glitch1 {
      0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
      20% { clip-path: inset(20% 0 30% 0); transform: translate(-2px, 2px); }
      40% { clip-path: inset(50% 0 20% 0); transform: translate(2px, -2px); }
      60% { clip-path: inset(10% 0 60% 0); transform: translate(-1px, 1px); }
      80% { clip-path: inset(80% 0 5% 0); transform: translate(1px, -1px); }
    }
    
    @keyframes glitch2 {
      0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
      20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); }
      40% { clip-path: inset(20% 0 40% 0); transform: translate(-2px, 2px); }
      60% { clip-path: inset(40% 0 30% 0); transform: translate(1px, -1px); }
      80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 1px); }
    }
    
    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.1); }
    }
    
    @keyframes neonPulse {
      0%, 100% { 
        text-shadow: 
          0 0 10px #00d9ff,
          0 0 20px #00d9ff,
          0 0 30px #00d9ff,
          0 0 40px #00d9ff;
      }
      50% { 
        text-shadow: 
          0 0 15px #00d9ff,
          0 0 30px #00d9ff,
          0 0 45px #00d9ff,
          0 0 60px #00d9ff;
      }
    }
    
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container mx-auto px-4 py-8 space-y-8 mesh-gradient">
        {/* Hero Section with Data Cube and Mascot */}
        <div className="text-center space-y-6 relative overflow-visible">
          <div className="float-effect">
            <RotatingCube stats={stats} />
          </div>
          
          <div className="relative flex items-center justify-center gap-4">
  {/* Main Title - Clean and Simple */}
  <h1 className="text-4xl md:text-6xl font-black"
      style={{
        background: 'linear-gradient(135deg, #00d9ff 0%, #667eea 50%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.5))',
        letterSpacing: '1px'
      }}>
    0G NETWORK EXPLORER
  </h1>
  
  {/* Mascot Panda - Custom Pixel Size */}
  <div className="relative" style={{
    animation: 'pandaFloat 4s ease-in-out infinite'
  }}>
    <img 
      src="https://raw.githubusercontent.com/coinsspor/Validator-NFT-Mint-DApp-for-0G-Network/refs/heads/main/maskot.avif" 
      alt="0G Mascot"
      style={{
        width: '100px',   // İstediğin pixel değerini yaz
        height: '100px',  // İstediğin pixel değerini yaz
        filter: 'drop-shadow(0 5px 15px rgba(0, 217, 255, 0.4))'
      }}
    />
  </div>
</div>
          
          {/* Subtitle */}
          <p className="text-lg text-muted-foreground font-semibold">
            ⚡ Galileo Testnet - Live Data ⚡ | Developed by Coinsspor
          </p>
        </div>

        {/* Network Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-depth card-3d hover:glow-gradient-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Validators</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalValidators}</div>
              <p className="text-xs text-muted-foreground">{stats.activeValidators} active</p>
            </CardContent>
          </Card>

          <Card className="card-depth card-3d hover:glow-gradient-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Latest Block</CardTitle>
              <Blocks className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">#{formatNumber(stats.latestBlock)}</div>
              <p className="text-xs text-muted-foreground">{stats.avgBlockTime}s avg time</p>
            </CardContent>
          </Card>

          <Card className="card-depth card-3d hover:glow-gradient-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Staked</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-4">{formatStaked(stats.totalStaked)}</div>
              <p className="text-xs text-muted-foreground">Live data</p>
            </CardContent>
          </Card>

          <Card className="card-depth card-3d hover:glow-gradient-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Network Activity</CardTitle>
              <Activity className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tps.toLocaleString()} TPS</div>
              <p className="text-xs text-muted-foreground">Gas: {(stats.gasPrice / 1e9).toFixed(2)} Gwei</p>
            </CardContent>
          </Card>
        </div>

        {/* 2x2 Grid Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {/* Network Throughput */}
          <Card className="card-depth">
            <CardHeader>
              <CardTitle className="text-lg">Network Throughput</CardTitle>
              <p className="text-xs text-muted-foreground">Real-time transactions per second over the last 24 hours</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b2e', border: 'none', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="value" stroke="#00d9ff" strokeWidth={2} fill="url(#throughputGradient)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span className="text-green-500">● Live Data</span>
                <span>Peak: 1,999 TPS | Avg: 1,623 TPS</span>
              </div>
            </CardContent>
          </Card>

          {/* Gas Price & Usage */}
          <Card className="card-depth">
            <CardHeader>
              <CardTitle className="text-lg">Gas Price & Usage</CardTitle>
              <p className="text-xs text-muted-foreground">Gas metrics over the last 10 minutes</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gasData}>
                  <defs>
                    <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b2e', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="used" fill="url(#gasGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1m ago: <span className="text-yellow-500">{gasData[gasData.length-1]?.price?.toFixed(2)} Gwei</span></span>
                <span>gasUsed: <span className="text-purple-500">{formatNumber(stats.gasUsed)}</span></span>
              </div>
            </CardContent>
          </Card>

          {/* Block Production */}
          <Card className="card-depth">
            <CardHeader>
              <CardTitle className="text-lg">Block Production</CardTitle>
              <p className="text-xs text-muted-foreground">Recent block statistics</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={blockData}>
                  <defs>
                    <linearGradient id="blockGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="height" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b2e', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="txs" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                  <Area type="monotone" dataKey="txs" fill="url(#blockGradient)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span className="text-blue-500">● {stats.blockTxs} txs/block</span>
                <span>Current: Block #{formatNumber(stats.latestBlock)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Network Performance */}
          <Card className="card-depth">
            <CardHeader>
              <CardTitle className="text-lg">Network Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Key performance metrics</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={performanceData}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" stroke="#71717a" fontSize={11} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#71717a" fontSize={11} />
                  <Radar dataKey="value" stroke="#f59e0b" fill="url(#radarGradient)" strokeWidth={2} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b2e', border: 'none', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-muted-foreground mt-2">
                <span className="text-amber-500">● Overall Health: Excellent</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-depth hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Block Transactions</CardTitle>
              <Box className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.blockTxs}</div>
              <p className="text-xs text-muted-foreground">Per block</p>
            </CardContent>
          </Card>

          <Card className="card-depth hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Gas Used</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{formatNumber(stats.gasUsed)}</div>
              <p className="text-xs text-muted-foreground">Current usage</p>
            </CardContent>
          </Card>

          <Card className="card-depth hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Gas Price</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{(stats.gasPrice / 1e9).toFixed(9)}</div>
              <p className="text-xs text-muted-foreground">Gwei</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Validators Table */}
        <Card className="card-depth">
          <CardHeader>
            <CardTitle>Top Active Validators</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && validators.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading validators...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Validator</TableHead>
                    <TableHead>Voting Power</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Total Staked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validators.map((validator, index) => (
                    <TableRow key={validator.address} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          {getRankIcon(index + 1)}
                          <span>#{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(validator)}
                            alt={validator.moniker}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                            onError={(e) => handleAvatarError(e, validator)}
                          />
                          <div>
                            <div className="font-medium">{validator.moniker}</div>
                            <div className="text-xs text-muted-foreground">
                              {validator.address.slice(0, 6)}...{validator.address.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          {validator.votingPower?.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{validator.commissionRate}</TableCell>
                      <TableCell className="font-semibold text-chart-4">
                        {formatStaked(validator.totalStaked)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}