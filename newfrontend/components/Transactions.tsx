import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Plus,
  Code,
  Terminal
} from 'lucide-react';

interface TransactionsProps {
  onViewDetails?: (hash: string) => void;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  fee: string;
  gasUsed: string;
  gasPrice: string;
  status: string;
  type: string;
  block: number | string;
  timeAgo: string;
  fullHash?: string;
  fullFrom?: string;
  fullTo?: string;
}

export function Transactions({ onViewDetails }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState(''); // Tablo filtreleme için ayrı state
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    successful: 0,
    failed: 0,
    pending: 0,
    tps: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions');
        const data = await response.json();
        
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
          setSummary(data.summary);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tableFilter === '' || 
                         tx.hash.toLowerCase().includes(tableFilter.toLowerCase()) ||
                         tx.from.toLowerCase().includes(tableFilter.toLowerCase()) ||
                         tx.to.toLowerCase().includes(tableFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || tx.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle className="h-4 w-4 text-chart-4" />;
      case 'Failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Transfer':
        return <ArrowUpRight className="h-4 w-4 text-primary" />;
      case 'Contract Deploy':
        return <Code className="h-4 w-4 text-purple-500" />;
      case 'Swap':
      case 'SwapExactTokens':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'Approve':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Mint':
        return <Plus className="h-4 w-4 text-yellow-500" />;
      case 'Call':
        return <Terminal className="h-4 w-4 text-gray-500" />;
      case 'Delegate':
      case 'Undelegate':
        return <ArrowDownLeft className="h-4 w-4 text-orange-500" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-accent" />;
    }
  };

  const handleViewDetails = (tx: Transaction) => {
    if (onViewDetails) {
      const fullHash = tx.fullHash || tx.hash.replace('...', '');
      onViewDetails(fullHash);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === '') return;
    
    if (searchTerm.startsWith('0x') && searchTerm.length === 66) {
      try {
        const response = await fetch(`/api/search/${searchTerm}`);
        const data = await response.json();
        
        if (data.success && data.type === 'transaction') {
          if (onViewDetails) {
            onViewDetails(data.data.hash);
          }
        } else {
          alert('Transaction not found');
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Transactions</h1>
          <p className="text-muted-foreground">Track all network transactions in real-time</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter full tx hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Button 
              onClick={handleSearch}
              size="sm"
              variant="outline"
            >
              Search
            </Button>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="swap">Swap</SelectItem>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="mint">Mint</SelectItem>
              <SelectItem value="delegate">Delegate</SelectItem>
              <SelectItem value="call">Call</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-chart-4" />
              <span className="text-sm text-muted-foreground">Successful</span>
            </div>
            <p className="text-xl mt-1">{summary.successful}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-xl mt-1">{summary.pending}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-xl mt-1">{summary.failed}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">TPS</span>
            </div>
            <p className="text-xl mt-1">{summary.tps}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 20).map((tx) => (
                  <TableRow key={tx.hash} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(tx.status)}
                        <Badge 
                          variant={
                            tx.status === 'Success' ? 'default' : 
                            tx.status === 'Failed' ? 'destructive' : 
                            'secondary'
                          }
                          className={tx.status === 'Success' ? 'bg-chart-4 text-black' : ''}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{tx.hash}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(tx.type)}
                        <span className="text-sm">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{tx.from}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{tx.to}</span>
                    </TableCell>
                    <TableCell className={tx.value === '—' ? 'text-muted-foreground' : 'text-primary'}>
                      {tx.value}
                    </TableCell>
                    <TableCell className={tx.fee === '—' ? 'text-muted-foreground' : 'text-muted-foreground'}>
                      {tx.fee}
                    </TableCell>
                    <TableCell>
                      {tx.status === 'Pending' ? (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          Pending
                        </Badge>
                      ) : (
                        <span className="font-mono">#{tx.block}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{tx.timeAgo}</span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(tx)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}