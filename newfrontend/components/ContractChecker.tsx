import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, Activity, ChevronRight, Sparkles, Zap, Diamond, Package, ExternalLink, Copy, CheckCircle, Image, Grid3x3, BarChart3, Code, ArrowLeft, Download, RefreshCw, Eye, Clock, Hash, Coins, FileText } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Props interface
interface TokenExplorerProps {
  onViewDetails?: (hash: string) => void;
}

// NFT Inventory Component
const NFTInventory = ({ tokenAddress, setSelectedNFT }) => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/tokens/${tokenAddress}/inventory?limit=12`)
      .then(res => res.json())
      .then(data => {
        setNfts(data.nfts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tokenAddress]);
  
  const handleNFTClick = (nft) => {
    fetch(`/api/tokens/${tokenAddress}/nft/${nft.tokenId}`)
      .then(res => res.json())
      .then(data => setSelectedNFT(data))
      .catch(console.error);
  };
  
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ 
            backgroundColor: '#0d0e23', 
            borderRadius: '8px', 
            height: '280px',
            animation: 'pulse 1.5s infinite'
          }} />
        ))}
      </div>
    );
  }
  
  if (nfts.length === 0) {
    return <p style={{ color: '#9ca3af' }}>No NFTs found in this collection</p>;
  }
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
      {nfts.map((nft, i) => (
        <div 
          key={i}
          style={{ 
            backgroundColor: '#0d0e23', 
            border: '1px solid #374151',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(168, 85, 247, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={() => handleNFTClick(nft)}
        >
          <div style={{ 
            width: '100%', 
            height: '200px',
            backgroundColor: '#1a1b3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={nft.image} 
              alt={nft.name}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div style="color: #6b7280; font-size: 48px;">🖼️</div>';
              }}
            />
          </div>
          <div style={{ padding: '12px' }}>
            <p style={{ fontWeight: '500', color: 'white', marginBottom: '4px' }}>
              {nft.name}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              #{nft.tokenId}
            </p>
            {nft.attributes?.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {nft.attributes.slice(0, 2).map((attr, j) => (
                  <span 
                    key={j}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      color: '#a855f7'
                    }}
                  >
                    {attr.trait_type}: {attr.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Analysis Chart Component
const AnalysisChart = ({ tokenData, tokenAddress }) => {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    if (tokenAddress) {
      fetch(`/api/tokens/${tokenAddress}/analysis`)
        .then(res => res.json())
        .then(data => {
          if (data.history && data.history.length > 0) {
            setChartData(data.history.map(h => ({
              date: h.date,
              transfers: h.transfer_count,
              senders: h.unique_senders,
              receivers: h.unique_receivers
            })));
          }
        })
        .catch(() => {
          const transferCount = tokenData?.transfer_count || 100;
          setChartData([
            { date: 'Day 1', transfers: Math.floor(transferCount * 0.7), senders: 50, receivers: 60 },
            { date: 'Day 2', transfers: Math.floor(transferCount * 0.8), senders: 60, receivers: 70 },
            { date: 'Day 3', transfers: Math.floor(transferCount * 0.9), senders: 70, receivers: 80 },
            { date: 'Today', transfers: transferCount, senders: 80, receivers: 90 },
          ]);
        });
    }
  }, [tokenAddress, tokenData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#1a1b3a', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '14px', color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorTransfers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
          <YAxis stroke="#9ca3af" fontSize={11} />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="transfers" 
            stroke="#00d4ff" 
            fillOpacity={1} 
            fill="url(#colorTransfers)" 
            strokeWidth={2}
            name="Transfers"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Component
export default function TokenExplorer({ onViewDetails }: TokenExplorerProps) {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({ erc20_count: 0, erc721_count: 0, erc1155_count: 0 });
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [tokenType, setTokenType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState('transfers');
  const [copied, setCopied] = useState('');
  const [holders, setHolders] = useState([]);
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    fetchTokens();
  }, [tokenType, searchQuery, currentPage]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/tokens?type=${tokenType}&search=${searchQuery}&page=${currentPage}`
      );
      const data = await response.json();
      
      setTokens(data.tokens || []);
      setStats(data.stats || { erc20_count: 0, erc721_count: 0, erc1155_count: 0 });
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('API Error:', error);
      setTokens([]);
    }
    setLoading(false);
  };

  const fetchTokenDetail = async (address: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tokens/${address}`);
      const data = await response.json();
      setSelectedToken(data.token);
      setHolders(data.holders || []);
      setTransfers(data.transfers || []);
    } catch (error) {
      console.error('Token detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: any) => {
    if (!num) return '0';
    if (typeof num === 'string') {
      num = parseFloat(num);
      if (isNaN(num)) return '0';
    }
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toLocaleString();
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatSupply = (supply: string, decimals: number) => {
    if (!supply || supply === '0') return '0';
    try {
      const num = BigInt(supply) / BigInt(10 ** (decimals || 18));
      return formatNumber(Number(num));
    } catch {
      return '0';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };
  
  // Navigation functions
  const goToTransaction = (hash: string) => {
    console.log('Going to transaction:', hash);
    if (onViewDetails) {
      onViewDetails(hash);
    }
  };
  
  const goToAddress = (address: string) => {
    console.log('Going to address:', address);
    // Address detail functionality can be added later
  };

  // NFT Detail View
  if (selectedNFT) {
    return (
      <div className="container mx-auto px-6 py-8">
        <button 
          onClick={() => setSelectedNFT(null)}
          style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collection
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'white' }}>NFT Detail</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
            <div style={{ 
              width: '100%', 
              maxWidth: '500px', 
              margin: '0 auto',
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0d0e23',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <img 
                src={selectedNFT.image || "https://via.placeholder.com/400"} 
                alt={selectedNFT.name}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/400";
                }}
              />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>{selectedNFT.name}</h2>
            <p style={{ color: '#9ca3af', marginBottom: '16px' }}>{selectedNFT.description}</p>
          </div>

          <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontWeight: '500', marginBottom: '16px', color: 'white' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Token ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: 'white' }}>{selectedNFT.tokenId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Token Standard</span>
                <span style={{ fontSize: '14px', color: 'white' }}>{selectedNFT.tokenStandard}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Contract</span>
                <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: '14px' }}>{formatAddress(selectedNFT.contractAddress)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Owner</span>
                <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: '14px' }}>{formatAddress(selectedNFT.owner)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Creator</span>
                <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: '14px' }}>{formatAddress(selectedNFT.creator)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Minted</span>
                <span style={{ fontSize: '14px', color: 'white' }}>{selectedNFT.mintedTime}</span>
              </div>
            </div>
            
            {selectedNFT.metadata?.attributes && selectedNFT.metadata.attributes.length > 0 && (
              <>
                <h3 style={{ fontWeight: '500', marginTop: '24px', marginBottom: '16px', color: 'white' }}>Attributes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {selectedNFT.metadata.attributes.map((attr, i) => (
                    <div key={i} style={{ backgroundColor: '#0d0e23', padding: '8px', borderRadius: '6px', border: '1px solid #374151' }}>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>{attr.trait_type}</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>{attr.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Token Detail View
  if (selectedToken) {
    const isNFT = selectedToken.type === 'erc721' || selectedToken.type === 'erc1155';

    return (
      <div className="container mx-auto px-6 py-8">
        <button 
          onClick={() => {
            setSelectedToken(null);
            setActiveTab('transfers');
          }}
          style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Token List
        </button>

        <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: selectedToken.type === 'erc20' ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' :
                           selectedToken.type === 'erc721' ? 'linear-gradient(135deg, #a855f7, #c084fc)' :
                           'linear-gradient(135deg, #10b981, #34d399)',
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: '20px'
              }}>
                {selectedToken.symbol?.charAt(0) || 'T'}
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                  {selectedToken.name}
                  <span style={{ color: '#9ca3af', fontSize: '18px' }}>({selectedToken.symbol})</span>
                </h1>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>
                  {selectedToken.type?.toUpperCase()} Token on 0G Chain
                </p>
              </div>
            </div>
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: selectedToken.type === 'erc20' ? 'rgba(59, 130, 246, 0.2)' :
                              selectedToken.type === 'erc721' ? 'rgba(168, 85, 247, 0.2)' :
                              'rgba(16, 185, 129, 0.2)',
              color: selectedToken.type === 'erc20' ? '#3b82f6' :
                     selectedToken.type === 'erc721' ? '#a855f7' :
                     '#10b981',
              border: `1px solid ${selectedToken.type === 'erc20' ? 'rgba(59, 130, 246, 0.3)' :
                                   selectedToken.type === 'erc721' ? 'rgba(168, 85, 247, 0.3)' :
                                   'rgba(16, 185, 129, 0.3)'}`
            }}>
              {selectedToken.type?.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Contract</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ color: '#a855f7', fontSize: '14px' }}>{formatAddress(selectedToken.address)}</code>
                <button onClick={() => copyToClipboard(selectedToken.address)}>
                  {copied === selectedToken.address ? 
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} /> : 
                    <Copy style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                  }
                </button>
              </div>
            </div>
            {selectedToken.type === 'erc20' && (
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>Decimals</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{selectedToken.decimals}</p>
              </div>
            )}
            <div>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Total Supply</p>
              <p style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{formatSupply(selectedToken.total_supply, selectedToken.decimals)}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Holders</p>
              <p style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{formatNumber(selectedToken.holder_count)}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Transfers</p>
              <p style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{formatNumber(selectedToken.transfer_count)}</p>
            </div>
            {selectedToken.deploy_block && (
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>Deploy Block</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{formatNumber(selectedToken.deploy_block)}</p>
              </div>
            )}
            {selectedToken.deployer && (
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>Deployer</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#a855f7' }}>{formatAddress(selectedToken.deployer)}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '24px', padding: '0 24px', paddingTop: '16px', borderBottom: '1px solid #374151' }}>
            {['Transfers', 'Holders', 'Analysis', isNFT && 'Inventory', 'Contract'].filter(Boolean).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab!.toLowerCase())}
                style={{
                  paddingBottom: '12px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  transition: 'all 0.2s',
                  color: activeTab === tab!.toLowerCase() ? '#a855f7' : '#9ca3af',
                  borderBottom: activeTab === tab!.toLowerCase() ? '2px solid #a855f7' : '2px solid transparent'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px' }}>
            {activeTab === 'transfers' && (
              <div>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }}>
                  Recent transfers (Total: {formatNumber(selectedToken.transfer_count)})
                </p>
                {transfers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #374151' }}>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>Txn Hash</th>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>From</th>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>To</th>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>Value</th>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>Block</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((tx: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.5)' }}>
                            <td style={{ padding: '12px 0' }}>
                              <button
                                onClick={() => goToTransaction(tx.tx_hash)}
                                style={{ 
                                  color: '#a855f7',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  font: 'inherit',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {formatAddress(tx.tx_hash)}
                              </button>
                            </td>
                            <td style={{ padding: '12px 0' }}>
                              <button
                                onClick={() => goToAddress(tx.from_address)}
                                style={{ 
                                  color: 'white',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  font: 'inherit',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#a855f7';
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {formatAddress(tx.from_address)}
                              </button>
                            </td>
                            <td style={{ padding: '12px 0' }}>
                              → 
                              <button
                                onClick={() => goToAddress(tx.to_address)}
                                style={{ 
                                  color: 'white',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  marginLeft: '4px',
                                  font: 'inherit',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#a855f7';
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {formatAddress(tx.to_address)}
                              </button>
                            </td>
                            <td style={{ padding: '12px 0', color: 'white' }}>
                              {(selectedToken.type === 'erc721' || selectedToken.type === 'erc1155') ? (
                                <button 
                                  onClick={() => {
                                    const tokenId = tx.value;
                                    fetch(`/api/tokens/${selectedToken.address}/nft/${tokenId}`)
                                      .then(res => res.json())
                                      .then(data => {
                                        setSelectedNFT(data);
                                      })
                                      .catch(err => console.error('NFT fetch error:', err));
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    borderRadius: '4px',
                                    color: '#a855f7',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.3)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  View NFT #{tx.value}
                                </button>
                              ) : (
                                formatSupply(tx.value, selectedToken.decimals)
                              )}
                            </td>
                            <td style={{ padding: '12px 0', color: '#9ca3af' }}>{tx.block_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af' }}>No recent transfers</p>
                )}
              </div>
            )}

            {activeTab === 'holders' && (
              <div>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }}>
                  Top holders ({selectedToken.holder_count} total)
                </p>
                {holders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #374151' }}>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>Address</th>
                          <th style={{ textAlign: 'right', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>Balance</th>
                          <th style={{ textAlign: 'right', padding: '12px 0', color: '#9ca3af', fontWeight: '400' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holders.map((holder: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.5)' }}>
                            <td style={{ padding: '12px 0', color: 'white' }}>{holder.rank || i + 1}</td>
                            <td style={{ padding: '12px 0' }}>
                              <button
                                onClick={() => goToAddress(holder.address)}
                                style={{ 
                                  color: '#a855f7',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  font: 'inherit',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {formatAddress(holder.address)}
                              </button>
                            </td>
                            <td style={{ padding: '12px 0', textAlign: 'right', color: 'white' }}>{formatSupply(holder.balance, selectedToken.decimals)}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right', color: 'white' }}>{holder.percentage?.toFixed(2) || '0.00'}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af' }}>No holder data available</p>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div>
                <div style={{ backgroundColor: '#0d0e23', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '16px', color: 'white' }}>Token Statistics</h3>
                  <AnalysisChart tokenData={selectedToken} tokenAddress={selectedToken?.address} />
                </div>
              </div>
            )}

            {activeTab === 'inventory' && isNFT && (
              <div>
                <NFTInventory tokenAddress={selectedToken.address} setSelectedNFT={setSelectedNFT} />
              </div>
            )}

            {activeTab === 'contract' && (
              <div>
                <div style={{ backgroundColor: '#0d0e23', border: '1px solid #374151', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '16px', color: 'white' }}>Contract Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Address</p>
                      <p style={{ color: '#a855f7', fontFamily: 'monospace' }}>{selectedToken.address}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Type</p>
                      <p style={{ color: 'white' }}>{selectedToken.type?.toUpperCase()}</p>
                    </div>
                    {selectedToken.deploy_block && (
                      <div>
                        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Deploy Block</p>
                        <p style={{ color: 'white' }}>{formatNumber(selectedToken.deploy_block)}</p>
                      </div>
                    )}
                    {selectedToken.deployer && (
                      <div>
                        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Deployer</p>
                        <p style={{ color: '#a855f7', fontFamily: 'monospace' }}>{selectedToken.deployer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Token List View
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Token Explorer</h1>
        <p className="text-muted-foreground text-lg">Browse all tokens on 0G Chain</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: '#00d4ff', fontSize: '14px', marginBottom: '4px' }}>ERC-20 Tokens</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: 'white' }}>{stats.erc20_count}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Fungible tokens</p>
            </div>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
            </div>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: '#a855f7', fontSize: '14px', marginBottom: '4px' }}>ERC-721 NFTs</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: 'white' }}>{stats.erc721_count}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Non-fungible tokens</p>
            </div>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Diamond style={{ width: '24px', height: '24px', color: '#a855f7' }} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px', padding: '24px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: '#10b981', fontSize: '14px', marginBottom: '4px' }}>ERC-1155 Tokens</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: 'white' }}>{stats.erc1155_count}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Multi-standard</p>
            </div>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package style={{ width: '24px', height: '24px', color: '#10b981' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All Tokens', icon: <Sparkles className="w-4 h-4" />, color: '#9ca3af' },
            { value: 'erc20', label: 'ERC-20', icon: <Zap className="w-4 h-4" />, color: '#3b82f6' },
            { value: 'erc721', label: 'ERC-721', icon: <Diamond className="w-4 h-4" />, color: '#a855f7' },
            { value: 'erc1155', label: 'ERC-1155', icon: <Package className="w-4 h-4" />, color: '#10b981' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => {
                setTokenType(type.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                backgroundColor: tokenType === type.value ? '#00d4ff' : '#1a1b3a',
                color: tokenType === type.value ? 'white' : '#9ca3af',
                border: tokenType === type.value ? 'none' : '1px solid #374151',
                boxShadow: tokenType === type.value ? '0 10px 25px rgba(0, 212, 255, 0.25)' : 'none'
              }}
            >
              {React.cloneElement(type.icon, { style: { color: tokenType === type.value ? 'white' : type.color } })}
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, symbol or address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              backgroundColor: '#1a1b3a',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: 'white'
            }}
          />
        </div>

        <button
          onClick={fetchTokens}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: '#1a1b3a',
            border: '1px solid #374151',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div style={{ backgroundColor: '#1a1b3a', border: '1px solid #374151', borderRadius: '8px' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #374151' }}>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                A total of <span style={{ color: 'white', fontWeight: '500' }}>{tokens.length}</span> records found
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151' }}>
                    <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token</th>
                    <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract</th>
                    <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                    <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supply</th>
                    <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transfers</th>
                    <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Holders</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token: any) => {
                    const colors = {
                      erc20: ['#3b82f6', '#60a5fa'],
                      erc721: ['#a855f7', '#c084fc'],
                      erc1155: ['#10b981', '#34d399']
                    };
                    const [color1, color2] = colors[token.type] || colors.erc20;
                    
                    return (
                      <tr 
                        key={token.address} 
                        style={{ borderBottom: '1px solid #374151', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => fetchTokenDetail(token.address)}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ 
                              width: '32px', 
                              height: '32px', 
                              background: `linear-gradient(135deg, ${color1}, ${color2})`,
                              borderRadius: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              color: 'white', 
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {token.symbol?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <p style={{ fontWeight: '500', color: 'white' }}>{token.name}</p>
                              <p style={{ fontSize: '14px', color: '#6b7280' }}>{token.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <code style={{ fontSize: '14px', color: '#a855f7' }}>{formatAddress(token.address)}</code>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: token.type === 'erc20' ? 'rgba(59, 130, 246, 0.2)' :
                                            token.type === 'erc721' ? 'rgba(168, 85, 247, 0.2)' :
                                            'rgba(16, 185, 129, 0.2)',
                            color: token.type === 'erc20' ? '#3b82f6' :
                                   token.type === 'erc721' ? '#a855f7' :
                                   '#10b981'
                          }}>
                            {token.type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: 'white' }}>
                          {formatSupply(token.total_supply, token.decimals)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500', color: 'white' }}>
                          {formatNumber(token.transfer_count)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500', color: 'white' }}>
                          {formatNumber(token.holder_count)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Page {currentPage} of {totalPages}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#1a1b3a',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: currentPage === 1 ? '#4b5563' : '#d1d5db',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#1a1b3a',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: currentPage === totalPages ? '#4b5563' : '#d1d5db',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}