// components/BlockDetail.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  Clock, 
  Hash, 
  Copy,
  ExternalLink,
  Layers,
  Database,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface BlockDetailProps {
  hash: string | null;
  onBack: () => void;
}

export function BlockDetail({ hash, onBack }: BlockDetailProps) {
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTxPage, setCurrentTxPage] = useState(1);
  const txPerPage = 10;

  useEffect(() => {
    if (hash) {
      fetchBlockDetail();
    }
  }, [hash]);

  const fetchBlockDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks/${hash}`);
      const data = await response.json();
      if (data.success) {
        setBlock(data.block);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading block details...</p>
        </div>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-4">Block not found</p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blocks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paginatedTxs = block.transactions?.slice((currentTxPage - 1) * txPerPage, currentTxPage * txPerPage) || [];
  const totalTxPages = Math.ceil((block.transactions?.length || 0) / txPerPage);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Block #{block.hash}</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="text-sm">
            Transactions {block.transactions?.length > 0 && `(${block.transactions.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                {/* Block Height */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Block Height</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{block.height.toLocaleString()}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(block.height.toString())}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Block Hash */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Block Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{block.hash}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(block.hash)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Parent Hash */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Parent Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{block.parentHash}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(block.parentHash)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Transactions */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{block.transactions?.length || 0}</span>
                </div>

                {/* Gas Info */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Limit | Gas Used</span>
                  <span className="font-mono text-sm">
                    {parseInt(block.gasLimit).toLocaleString()} | {parseInt(block.gasUsed).toLocaleString()} 
                    ({((parseInt(block.gasUsed) / parseInt(block.gasLimit)) * 100).toFixed(2)}%)
                  </span>
                </div>

                {/* Timestamp */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="text-sm">{formatTimestamp(block.timestamp)} +{block.timeAgo}</span>
                </div>

                {/* Size */}
                {block.size && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-mono">{block.size} bytes</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {block.transactions && block.transactions.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Txn Hash</TableHead>
                        <TableHead className="text-muted-foreground">From</TableHead>
                        <TableHead className="text-muted-foreground">To</TableHead>
                        <TableHead className="text-muted-foreground">Value</TableHead>
                        <TableHead className="text-muted-foreground">Gas Fee</TableHead>
                        <TableHead className="text-muted-foreground">Gas Price</TableHead>
                        <TableHead className="text-muted-foreground">Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTxs.map((tx: any) => (
                        <TableRow key={tx.hash} className="hover:bg-muted/30">
                          <TableCell>
                            <button 
                              className="text-primary hover:underline font-mono text-sm flex items-center gap-1"
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('navigateToTransaction', { 
                                  detail: { hash: tx.hash, fromBlock: true }
                                }));
                              }}
                            >
                              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center mr-1">
                                <Activity className="h-2.5 w-2.5" />
                              </div>
                              {formatAddress(tx.hash)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-primary">{formatAddress(tx.from)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-primary">{formatAddress(tx.to)}</span>
                          </TableCell>
                          <TableCell>{tx.value} 0G</TableCell>
                          <TableCell className="text-muted-foreground">
                            &lt; 0.000001 0G
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            0.00 Gneuron
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {block.timeAgo}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalTxPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentTxPage === 1}
                        onClick={() => setCurrentTxPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {currentTxPage} / {totalTxPages} page
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentTxPage === totalTxPages}
                        onClick={() => setCurrentTxPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions in this block
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
