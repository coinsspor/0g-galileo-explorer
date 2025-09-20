import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Clock, 
  Hash, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Blocks as BlocksIcon,
  Activity,
  TrendingUp,
  ExternalLink,
  Layers
} from 'lucide-react';

export function Blocks() {
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const blocksPerPage = 10;

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 500); // 500ms = yarım saniye
    return () => clearInterval(interval);
  }, [currentPage]);

  const fetchBlocks = async () => {
    try {
      const response = await fetch(`/api/blocks?page=${currentPage}&limit=${blocksPerPage}`);
      const data = await response.json();
      if (data.success) {
        setBlocks(data.blocks || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return '';
    return `${hash.substring(0, 10)}...`;
  };

  const formatGasUsed = (gasUsed, gasLimit) => {
    if (!gasUsed || !gasLimit || gasUsed === '0' || gasLimit === '0') {
      return { percentage: 0, color: 'bg-gray-400' };
    }
    const percentage = (parseInt(gasUsed) / parseInt(gasLimit)) * 100;
    let color = 'bg-green-500';
    if (percentage > 70) color = 'bg-red-500';
    else if (percentage > 40) color = 'bg-yellow-500';
    return { percentage: percentage.toFixed(2), color };
  };

  const formatGasUsedAmount = (gasUsed) => {
    if (!gasUsed || gasUsed === '0') return '0';
    return parseInt(gasUsed).toLocaleString();
  };

  const formatAvgGasPrice = (gasPrice) => {
    if (!gasPrice || gasPrice === '0') return '0.00 Gneuron';
    
    const gasPriceNum = typeof gasPrice === 'string' ? parseFloat(gasPrice) : gasPrice;
    
    if (isNaN(gasPriceNum) || gasPriceNum === 0) return '0.00 Gneuron';
    
    // Wei to Gwei conversion
    const gwei = gasPriceNum / 1e9;
    
    // Her zaman Gneuron olarak göster
    return `${gwei.toFixed(2)} Gneuron`;
  };

  const handleHashClick = (blockHash) => {
    window.dispatchEvent(new CustomEvent('navigateToTransaction', { 
      detail: { hash: blockHash, fromBlock: false }
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-6">
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20">
              <BlocksIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Blocks</h1>
              <p className="text-muted-foreground">Latest blockchain blocks</p>
            </div>
          </div>
          <Button 
            onClick={fetchBlocks} 
            variant="outline" 
            size="sm"
            className="hover:scale-105 transition-transform"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all hover:scale-[1.02] border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Latest Block</p>
                <p className="text-2xl font-bold">{blocks[0]?.height || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:scale-[1.02] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Block Time</p>
                <p className="text-2xl font-bold">{stats?.avgBlockTime || 0}s</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:scale-[1.02] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg TX/Block</p>
                <p className="text-2xl font-bold">{stats?.avgTxCount || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:scale-[1.02] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total TXs</p>
                <p className="text-2xl font-bold">{stats?.totalTxCount || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Latest Blocks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && blocks.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading blocks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block Height</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Txn</TableHead>
                    <TableHead>Avg Gas Price</TableHead>
                    <TableHead>Gas Used</TableHead>
                    <TableHead>Gas Limit</TableHead>
                    <TableHead>Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block, index) => {
                    const gasInfo = formatGasUsed(block.gasUsed, block.gasLimit);
                    return (
                      <TableRow key={block.height} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-mono">#{block.height}</span>
                            {index === 0 && currentPage === 1 && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleHashClick(block.hash)}
                            className="text-primary hover:underline font-mono text-sm flex items-center gap-1 group"
                          >
                            {formatHash(block.hash)}
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {block.txCount > 0 ? (
                            <Badge variant="secondary">{block.txCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{formatAvgGasPrice(block.avgGasPrice)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatGasUsedAmount(block.gasUsed)}</span>
                            <Badge variant="outline" className="text-xs">
                              {gasInfo.percentage}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {parseInt(block.gasLimit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {block.timeAgo}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination - Sadece 10 sayfa */}
      <div className="flex items-center justify-center gap-2 bg-card rounded-lg p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(pageNum)}
              className="min-w-[40px]"
            >
              {pageNum}
            </Button>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === 10}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
