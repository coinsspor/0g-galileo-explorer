import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Vote, Users, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface Proposal {
  id: number;
  title: string;
  description: string;
  type: 'Parameter Change' | 'Software Upgrade' | 'Text Proposal' | 'Community Pool';
  status: 'Active' | 'Passed' | 'Rejected' | 'Pending';
  votingStart: string;
  votingEnd: string;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  noWithVetoVotes: number;
  totalVotes: number;
  quorum: number;
  turnout: number;
  proposer: string;
  deposit: string;
}

export function Governance() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [voteChoice, setVoteChoice] = useState('');
  const [voteReason, setVoteReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showVoteDialog, setShowVoteDialog] = useState(false);

  const userVotingPower = {
    totalPower: '2,500 0G',
    delegatedPower: '1,500 0G',
    selfPower: '1,000 0G',
    votingHistory: 12
  };

  const proposals: Proposal[] = [
    {
      id: 1,
      title: 'Increase Block Size Limit',
      description: 'Proposal to increase the maximum block size from 1MB to 2MB to improve transaction throughput and reduce fees.',
      type: 'Parameter Change',
      status: 'Active',
      votingStart: '2024-01-10T00:00:00Z',
      votingEnd: '2024-01-17T00:00:00Z',
      yesVotes: 67.5,
      noVotes: 23.2,
      abstainVotes: 7.8,
      noWithVetoVotes: 1.5,
      totalVotes: 145000,
      quorum: 33.4,
      turnout: 72.5,
      proposer: 'Validator Alpha',
      deposit: '5,000 0G'
    },
    {
      id: 2,
      title: 'Network Upgrade v2.1.0',
      description: 'Scheduled upgrade to improve consensus mechanism efficiency and add new smart contract features.',
      type: 'Software Upgrade',
      status: 'Active',
      votingStart: '2024-01-12T00:00:00Z',
      votingEnd: '2024-01-19T00:00:00Z',
      yesVotes: 89.2,
      noVotes: 7.3,
      abstainVotes: 2.1,
      noWithVetoVotes: 1.4,
      totalVotes: 162000,
      quorum: 33.4,
      turnout: 81.0,
      proposer: 'Core Development Team',
      deposit: '10,000 0G'
    },
    {
      id: 3,
      title: 'Community Pool Allocation',
      description: 'Allocate 50,000 0G from community pool for developer grants and ecosystem growth initiatives.',
      type: 'Community Pool',
      status: 'Passed',
      votingStart: '2024-01-01T00:00:00Z',
      votingEnd: '2024-01-08T00:00:00Z',
      yesVotes: 76.8,
      noVotes: 18.7,
      abstainVotes: 3.2,
      noWithVetoVotes: 1.3,
      totalVotes: 134000,
      quorum: 33.4,
      turnout: 67.0,
      proposer: 'Community DAO',
      deposit: '5,000 0G'
    },
    {
      id: 4,
      title: 'Reduce Inflation Rate',
      description: 'Proposal to reduce annual inflation rate from 8% to 6% to control token supply growth.',
      type: 'Parameter Change',
      status: 'Rejected',
      votingStart: '2023-12-20T00:00:00Z',
      votingEnd: '2023-12-27T00:00:00Z',
      yesVotes: 31.5,
      noVotes: 58.2,
      abstainVotes: 8.8,
      noWithVetoVotes: 1.5,
      totalVotes: 128000,
      quorum: 33.4,
      turnout: 64.0,
      proposer: 'Economic Committee',
      deposit: '5,000 0G'
    }
  ];

  const filteredProposals = proposals.filter(proposal => 
    statusFilter === 'all' || proposal.status.toLowerCase() === statusFilter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Passed':
        return <CheckCircle className="h-4 w-4 text-chart-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'Pending':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'Passed':
        return 'bg-chart-4/20 text-chart-4 border-chart-4/30';
      case 'Rejected':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Pending':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default:
        return '';
    }
  };

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl gradient-text mb-2">Governance</h1>
          <p className="text-muted-foreground">Participate in network governance and shape the future of 0G</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Proposals</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voting Power Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border hover:glow-effect transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Voting Power</CardTitle>
            <Vote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{userVotingPower.totalPower}</div>
            <p className="text-xs text-muted-foreground">
              Including delegations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:glow-effect transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Self Power</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{userVotingPower.selfPower}</div>
            <p className="text-xs text-muted-foreground">
              Direct voting power
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:glow-effect transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Delegated Power</CardTitle>
            <MessageSquare className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{userVotingPower.delegatedPower}</div>
            <p className="text-xs text-muted-foreground">
              From delegators
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:glow-effect transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Votes Cast</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{userVotingPower.votingHistory}</div>
            <p className="text-xs text-muted-foreground">
              Total proposals voted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      <div className="space-y-6">
        {filteredProposals.map((proposal) => (
          <Card key={proposal.id} className="bg-card border-border hover:glow-effect transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl">#{proposal.id} {proposal.title}</h3>
                    <Badge variant="outline" className={getStatusColor(proposal.status)}>
                      {getStatusIcon(proposal.status)}
                      <span className="ml-1">{proposal.status}</span>
                    </Badge>
                    <Badge variant="secondary">{proposal.type}</Badge>
                  </div>
                  <p className="text-muted-foreground">{proposal.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Proposer: {proposal.proposer}</span>
                    <span>Deposit: {proposal.deposit}</span>
                    {proposal.status === 'Active' && (
                      <span className="text-yellow-500">{formatTimeRemaining(proposal.votingEnd)}</span>
                    )}
                  </div>
                </div>
                {proposal.status === 'Active' && (
                  <Button 
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setShowVoteDialog(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Vote className="h-4 w-4 mr-2" />
                    Vote
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4>Voting Results</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-chart-4">Yes</span>
                      <span className="text-sm">{proposal.yesVotes}%</span>
                    </div>
                    <Progress value={proposal.yesVotes} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-destructive">No</span>
                      <span className="text-sm">{proposal.noVotes}%</span>
                    </div>
                    <Progress value={proposal.noVotes} className="h-2 bg-muted [&>div]:bg-destructive" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Abstain</span>
                      <span className="text-sm">{proposal.abstainVotes}%</span>
                    </div>
                    <Progress value={proposal.abstainVotes} className="h-2 bg-muted [&>div]:bg-muted-foreground" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-500">No with Veto</span>
                      <span className="text-sm">{proposal.noWithVetoVotes}%</span>
                    </div>
                    <Progress value={proposal.noWithVetoVotes} className="h-2 bg-muted [&>div]:bg-orange-500" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4>Voting Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Votes</span>
                      <span>{proposal.totalVotes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Turnout</span>
                      <span>{proposal.turnout}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quorum</span>
                      <span className={proposal.turnout >= proposal.quorum ? 'text-chart-4' : 'text-destructive'}>
                        {proposal.quorum}% {proposal.turnout >= proposal.quorum ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Voting Period</span>
                      <span className="text-sm">
                        {new Date(proposal.votingStart).toLocaleDateString()} - {new Date(proposal.votingEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Vote on Proposal #{selectedProposal?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedProposal && (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2">{selectedProposal.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedProposal.description}</p>
              </div>
              
              <div className="space-y-4">
                <Label>Your Vote</Label>
                <RadioGroup value={voteChoice} onValueChange={setVoteChoice}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" />
                    <Label htmlFor="yes" className="text-chart-4">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="text-destructive">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="abstain" id="abstain" />
                    <Label htmlFor="abstain" className="text-muted-foreground">Abstain</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no-with-veto" id="no-with-veto" />
                    <Label htmlFor="no-with-veto" className="text-orange-500">No with Veto</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Voting Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain your vote..."
                  value={voteReason}
                  onChange={(e) => setVoteReason(e.target.value)}
                  className="min-h-20"
                />
              </div>
              
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Voting Power:</span>
                  <span>{userVotingPower.totalPower}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!voteChoice}
                >
                  Submit Vote
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}