import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Search, Clock, Users, Hash, ExternalLink } from 'lucide-react';

interface Block {
  height: number;
  hash: string;
  timestamp: string;
  proposer: string;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
  reward: string;
  size: string;
  timeAgo: string;
}

export function Blocks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    // Generate mock block data
    const generateBlocks = () => {
      const mockBlocks: Block[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 20; i++) {
        const height = 2847563 - i;
        const timestamp = new Date(now - (i * 2100)).toISOString();
        const timeAgo = `${Math.floor((now - (now - (i * 2100))) / 1000)}s ago`;
        
        mockBlocks.push({
          height,
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          timestamp,
          proposer: `Validator ${String.fromCharCode(65 + (i % 6))}`,
          txCount: Math.floor(Math.random() * 150) + 50,
          gasUsed: `${(Math.random() * 8 + 2).toFixed(2)}M`,
          gasLimit: '10M',
          reward: `${(Math.random() * 2 + 0.5).toFixed(3)} 0G`,
          size: `${(Math.random() * 50 + 20).toFixed(1)} KB`,
          timeAgo
        });
      }
      
      return mockBlocks;
    };

    setBlocks(generateBlocks());

    // Simulate real-time updates
    const interval = setInterval(() => {
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks];
        const latestHeight = newBlocks[0]?.height || 2847563;
        const newBlock: Block = {
          height: latestHeight + 1,
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          timestamp: new Date().toISOString(),
          proposer: `Validator ${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
          txCount: Math.floor(Math.random() * 150) + 50,
          gasUsed: `${(Math.random() * 8 + 2).toFixed(2)}M`,
          gasLimit: '10M',
          reward: `${(Math.random() * 2 + 0.5).toFixed(3)} 0G`,
          size: `${(Math.random() * 50 + 20).toFixed(1)} KB`,
          timeAgo: 'Just now'
        };
        
        return [newBlock, ...newBlocks.slice(0, 19)];
      });
    }, 15000); // New block every 15 seconds for demo

    return () => clearInterval(interval);
  }, []);

  const filteredBlocks = blocks.filter(block => 
    block.height.toString().includes(searchTerm) ||
    block.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.proposer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Blocks</h1>
          <p className="text-muted-foreground">Explore the latest blocks on the 0G Network</p>
        </div>
        
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks, hashes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Latest Block</span>
            </div>
            <p className="text-xl mt-1">#{blocks[0]?.height.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Avg Block Time</span>
            </div>
            <p className="text-xl mt-1">2.1s</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Active Validators</span>
            </div>
            <p className="text-xl mt-1">124</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-chart-4" />
              <span className="text-sm text-muted-foreground">Total Transactions</span>
            </div>
            <p className="text-xl mt-1">15.2M</p>
          </CardContent>
        </Card>
      </div>

      {/* Blocks Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Latest Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Proposer</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Gas Used</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlocks.map((block, index) => (
                  <TableRow 
                    key={block.height}
                    className={`hover:bg-muted/50 ${index === 0 ? 'animate-pulse' : ''}`}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">#{block.height}</span>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Latest
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{formatHash(block.hash)}</span>
                    </TableCell>
                    <TableCell>{block.proposer}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {block.txCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{block.gasUsed}</div>
                        <div className="text-muted-foreground text-xs">/ {block.gasLimit}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-chart-4">{block.reward}</TableCell>
                    <TableCell>{block.size}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{block.timeAgo}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatTimestamp(block.timestamp)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
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