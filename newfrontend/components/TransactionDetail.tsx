import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Clock, Copy, ArrowRight } from 'lucide-react';

interface TransactionDetailProps {
  hash: string | null;
  onBack: () => void;
}

interface TokenTransfer {
  from: string;
  to: string;
  value: string;
  tokenAddress: string;
  tokenSymbol: string;
}

interface TransactionDetailData {
  hash: string;
  from: string;
  to: string;
  value: string;
  fee: string;
  gasUsed: string;
  gasPrice: string;
  gasLimit?: string;
  nonce?: number;
  status: string;
  type: string;
  block: number;
  blockHash?: string;
  timestamp: string;
  timeAgo: string;
  input?: string;
  tokenTransfers?: TokenTransfer[];
}

export function TransactionDetail({ hash, onBack }: TransactionDetailProps) {
  const [transaction, setTransaction] = useState<TransactionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      if (!hash) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/transaction/${hash}`);
        const data = await response.json();
        
        if (data.success) {
          setTransaction(data.transaction);
        } else {
          setError(data.error || 'Transaction not found');
        }
      } catch (err) {
        setError('Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [hash]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle className="h-5 w-5 text-chart-4" />;
      case 'Failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading transaction details...</div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-4">{error || 'Transaction not found'}</p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Transaction Details</h1>
          <p className="text-muted-foreground">View detailed information about this transaction</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transactions
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon(transaction.status)}
            <span>Transaction Overview</span>
            <Badge 
              variant={transaction.status === 'Success' ? 'default' : transaction.status === 'Failed' ? 'destructive' : 'secondary'}
              className={transaction.status === 'Success' ? 'bg-chart-4 text-black' : ''}
            >
              {transaction.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <code className="text-sm break-all">{transaction.hash}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transaction.hash)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <Badge variant="outline">{transaction.type}</Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Block</p>
              <p className="font-mono">#{transaction.block}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
              <p>{transaction.timeAgo} ({new Date(transaction.timestamp).toLocaleString()})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">From</p>
            <div className="flex items-center gap-2">
              <code className="text-sm">{transaction.from}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transaction.from)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">To</p>
            <div className="flex items-center gap-2">
              <code className="text-sm">{transaction.to}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transaction.to)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Value</p>
              <p className="text-primary font-semibold">{transaction.value}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Transaction Fee</p>
              <p className="text-muted-foreground">{transaction.fee}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {transaction.tokenTransfers && transaction.tokenTransfers.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Token Transfers ({transaction.tokenTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transaction.tokenTransfers.map((transfer, index) => (
                <div key={index} className="border-l-2 border-primary pl-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Transfer #{index + 1}</span>
                    <Badge variant="secondary">{transfer.tokenSymbol}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">From:</span>
                      <code className="text-xs">{transfer.from}</code>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">To:</span>
                      <code className="text-xs">{transfer.to}</code>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Amount: </span>
                      <span className="text-primary font-semibold">{transfer.value} {transfer.tokenSymbol}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Token: </span>
                      <code className="text-xs">{formatAddress(transfer.tokenAddress)}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Gas Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Gas Used</p>
              <p className="font-mono">{transaction.gasUsed}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Gas Price</p>
              <p className="font-mono">{transaction.gasPrice}</p>
            </div>

            {transaction.gasLimit && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Gas Limit</p>
                <p className="font-mono">{transaction.gasLimit}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(transaction.nonce !== undefined || transaction.blockHash) && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.nonce !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nonce</p>
                <p className="font-mono">{transaction.nonce}</p>
              </div>
            )}

            {transaction.blockHash && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Block Hash</p>
                <code className="text-sm break-all">{transaction.blockHash}</code>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}