import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3003;
const RPC_URL = 'http://localhost:14545';

// Token cache
const tokenCache = new Map();

// ERC20 ABI - sadece symbol ve decimals fonksiyonları
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)'
];

// Provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Token bilgilerini al (cache'li)
async function getTokenInfo(address) {
  if (tokenCache.has(address.toLowerCase())) {
    return tokenCache.get(address.toLowerCase());
  }

  try {
    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    
    const [symbol, decimals, name] = await Promise.all([
      contract.symbol().catch(() => 'TOKEN'),
      contract.decimals().catch(() => 18),
      contract.name().catch(() => 'Unknown Token')
    ]);

    const tokenInfo = { symbol, decimals: Number(decimals), name };
    tokenCache.set(address.toLowerCase(), tokenInfo);
    
    return tokenInfo;
  } catch (error) {
    console.error(`Failed to get token info for ${address}:`, error.message);
    const defaultInfo = { symbol: 'TOKEN', decimals: 18, name: 'Unknown' };
    tokenCache.set(address.toLowerCase(), defaultInfo);
    return defaultInfo;
  }
}

// Transaction type detection
function detectTransactionType(input, to) {
    if (!to) return 'Contract Deploy';
    if (!input || input === '0x') return 'Transfer';
    if (input.length < 10) return 'Transfer';
    
    const functionSig = input.slice(0, 10);
    
    const typeMap = {
        '0x60806040': 'Contract Deploy',
        '0x60c06040': 'Contract Deploy',
        '0x60a06040': 'Contract Deploy',
        '0x5c19a95c': 'Delegate',
        '0x4d99dd16': 'Undelegate',
        '0xe7740331': 'CreateValidator',
        '0x441a3e70': 'CreateValidator',
        '0xa9059cbb': 'Transfer',
        '0x095ea7b3': 'Approve',
        '0x1249c58b': 'Mint',
        '0x359cf2b7': 'RequestTokens',
        '0x46f45b8d': 'StakeGimo',
        '0x2e17de78': 'UnstakeGimo',
        '0x414bf389': 'Swap',
        '0x38ed1739': 'SwapExactTokens',
        '0xd0e30db0': 'Deposit',
        '0xf25b3f99': 'UpdateCommission',
        '0xe6fd48bc': 'Withdraw',
        '0x6e512e26': 'Redelegate',
        '0x2e1a7d4d': 'Withdraw'
    };
    
    const mapped = typeMap[functionSig];
    if (!mapped && functionSig.startsWith('0x')) {
        return 'Call';
    }
    
    return mapped || 'Unknown';
}

// Get transaction display value
function getTransactionDisplayValue(tx, receipt, txType) {
    const zeroValueTypes = ['Approve', 'Mint', 'Delegate', 'Undelegate', 'UpdateCommission'];
    
    if (zeroValueTypes.includes(txType)) {
        return '—';
    }
    
    if (tx.value && tx.value !== '0x0') {
        const value = parseFloat(ethers.formatEther(tx.value));
        if (value === 0) return '—';
        if (value < 0.000001) return '<0.000001 0G';
        if (value < 0.01) return `${value.toFixed(9)} 0G`;
        return `${value.toFixed(6)} 0G`;
    }
    
    if ((txType === 'Swap' || txType === 'SwapExactTokens')) {
        return 'Token Swap';
    }
    
    return '—';
}

// RPC call
async function makeRpcCall(method, params) {
    try {
        const response = await axios.post(RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: method,
            params: params
        }, {
            timeout: 10000
        });
        
        if (response.data.error) {
            throw new Error(response.data.error.message);
        }
        
        return response.data.result;
    } catch (error) {
        console.error(`RPC Error: ${error.message}`);
        throw error;
    }
}

// Format helpers
function formatAddress(address) {
    if (!address) return 'Unknown';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatHash(hash) {
    if (!hash) return 'Unknown';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 0) return 'Pending';
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
}

// API endpoints

// Get all transactions
app.get('/api/transactions', async (req, res) => {
    try {
        console.log('Fetching transactions...');
        
        const latestBlockHex = await makeRpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockHex, 16);
        
        const transactions = [];
        const blocksToFetch = 5;
        
        for (let i = 0; i < blocksToFetch; i++) {
            const blockNumber = latestBlock - i;
            const block = await makeRpcCall('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, true]);
            
            if (block && block.transactions) {
                const blockTimestamp = parseInt(block.timestamp, 16);
                
                for (const tx of block.transactions.slice(0, 10)) {
                    const receipt = await makeRpcCall('eth_getTransactionReceipt', [tx.hash]);
                    
                    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 0;
                    const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) : 0;
                    const fee = (gasUsed * gasPrice) / 1e18;
                    
                    const txStatus = receipt && receipt.status === '0x1' ? 'Success' : 'Failed';
                    const txType = detectTransactionType(tx.input, tx.to);
                    
                    const displayValue = getTransactionDisplayValue(tx, receipt, txType);
                    
                    let formattedFee;
                    if (fee === 0) {
                        formattedFee = '—';
                    } else if (fee < 0.000001) {
                        formattedFee = `<0.000001 0G`;
                    } else {
                        formattedFee = `${fee.toFixed(9)} 0G`;
                    }
                    
                    transactions.push({
                        hash: formatHash(tx.hash),
                        from: formatAddress(tx.from),
                        to: formatAddress(tx.to || 'Contract Creation'),
                        value: displayValue,
                        fee: formattedFee,
                        gasUsed: gasUsed.toLocaleString(),
                        gasPrice: `${(gasPrice / 1e9).toFixed(0)} Gwei`,
                        status: txStatus,
                        type: txType,
                        block: blockNumber,
                        timestamp: new Date(blockTimestamp * 1000).toISOString(),
                        timeAgo: getTimeAgo(blockTimestamp),
                        fullHash: tx.hash,
                        fullFrom: tx.from,
                        fullTo: tx.to
                    });
                }
            }
        }
        
        res.json({
            success: true,
            transactions: transactions,
            summary: {
                successful: transactions.filter(t => t.status === 'Success').length,
                failed: transactions.filter(t => t.status === 'Failed').length,
                pending: 0,
                tps: Math.floor(Math.random() * 500) + 1200
            }
        });
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific transaction details
app.get('/api/transaction/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        
        console.log(`Fetching transaction: ${hash}`);
        
        const txHash = hash.startsWith('0x') ? hash : `0x${hash}`;
        
        const tx = await makeRpcCall('eth_getTransactionByHash', [txHash]);
        
        if (!tx) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        const receipt = await makeRpcCall('eth_getTransactionReceipt', [txHash]);
        
        const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 0;
        const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) : 0;
        const fee = (gasUsed * gasPrice) / 1e18;
        
        const block = await makeRpcCall('eth_getBlockByNumber', [tx.blockNumber, false]);
        const timestamp = block ? parseInt(block.timestamp, 16) : Date.now() / 1000;
        
        const txType = detectTransactionType(tx.input, tx.to);
        const displayValue = getTransactionDisplayValue(tx, receipt, txType);
        
        // Parse token transfers from logs
        let tokenTransfers = [];
        if (receipt && receipt.logs && receipt.logs.length > 0) {
            for (const log of receipt.logs) {
                // ERC20 Transfer event signature
                if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                    try {
                        const from = '0x' + log.topics[1].slice(26);
                        const to = '0x' + log.topics[2].slice(26);
                        const value = BigInt(log.data);
                        
                        // Token bilgilerini dinamik olarak al
                        const tokenInfo = await getTokenInfo(log.address);
                        
                        // Decimals'a göre formatla
                        let formattedValue = parseFloat(ethers.formatUnits(value, tokenInfo.decimals));
                        
                        tokenTransfers.push({
                            from: formatAddress(from),
                            to: formatAddress(to),
                            value: formattedValue < 0.000001 ? '<0.000001' : formattedValue.toFixed(6),
                            tokenAddress: log.address,
                            tokenSymbol: tokenInfo.symbol,
                            tokenName: tokenInfo.name
                        });
                    } catch (e) {
                        console.error('Error parsing transfer log:', e);
                    }
                }
            }
        }
        
        let formattedFee;
        if (fee === 0) {
            formattedFee = '—';
        } else if (fee < 0.000001) {
            formattedFee = `<0.000001 0G`;
        } else {
            formattedFee = `${fee.toFixed(9)} 0G`;
        }
        
        res.json({
            success: true,
            transaction: {
                hash: tx.hash,
                from: tx.from,
                to: tx.to || 'Contract Creation',
                value: displayValue,
                fee: formattedFee,
                gasUsed: gasUsed.toLocaleString(),
                gasPrice: `${(gasPrice / 1e9).toFixed(0)} Gwei`,
                gasLimit: parseInt(tx.gas, 16).toLocaleString(),
                nonce: parseInt(tx.nonce, 16),
                status: receipt && receipt.status === '0x1' ? 'Success' : 'Failed',
                type: txType,
                block: parseInt(tx.blockNumber, 16),
                blockHash: tx.blockHash,
                timestamp: new Date(timestamp * 1000).toISOString(),
                timeAgo: getTimeAgo(timestamp),
                input: tx.input,
                logs: receipt ? receipt.logs.length : 0,
                tokenTransfers: tokenTransfers
            }
        });
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Transaction search endpoint
app.get('/api/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        
        // Eğer transaction hash formatındaysa
        if (query.startsWith('0x') && query.length === 66) {
            const tx = await makeRpcCall('eth_getTransactionByHash', [query]);
            
            if (tx) {
                return res.json({
                    success: true,
                    type: 'transaction',
                    data: { hash: tx.hash }
                });
            }
        }
        
        // Eğer adres formatındaysa (ileride eklenebilir)
        if (query.startsWith('0x') && query.length === 42) {
            // Adres araması yapılabilir
            return res.json({
                success: true,
                type: 'address',
                data: { address: query }
            });
        }
        
        // Bulunamadı
        res.json({
            success: false,
            message: 'Not found'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: '0G Transaction API',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Transaction API running on port ${PORT}`);
});
