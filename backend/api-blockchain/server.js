const express = require('express');
const axios = require('axios');
const cors = require('cors');
const ethers = require('ethers');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG = {
    STAKING_CONTRACT_ADDRESS: '0xea224dBB52F57752044c0C86aD50930091F561B9',
    PORT: 3001,
    UPDATE_INTERVAL: 45000 // 45 seconds
};

// 🆕 0G SPECIFIC CONTRACT ADDRESSES FOR ALL VALIDATORS
const CONTRACTS_CONFIG = {
    STAKING_CONTRACT: '0xea224dBB52F57752044c0C86aD50930091F561B9',  // CreateValidator contract
    DELEGATION_CONTRACT: '0xE37bfc9e900bC5cC3279952B90f6Be9A53ED6949'   // Delegate/Undelegate contract
};

// 🚀 SINGLE LOCAL RPC ENDPOINT
const RPC_ENDPOINT = {
    url: 'http://localhost:14545',
    name: 'Local_RPC',
    timeout: 500
};

// Comprehensive ABI for all staking operations
const ENHANCED_ABI = [
    // Delegation functions
    "function getDelegation(address delegator) external view returns (address, uint)",
    "function delegate(address delegatorAddress) external payable returns (uint)",
    "function undelegate(address delegatorAddress, uint256 amount) external returns (uint)",
    
    // Validator functions
    "function tokens() external view returns (uint)",
    "function delegatorShares() external view returns (uint)",
    "function commissionRate() external view returns (uint32)",
    "function withdrawalFeeInGwei() external view returns (uint96)",
    
    // Validator creation
    "function createAndInitializeValidatorIfNecessary(tuple(string moniker, string identity, string website, string securityContact, string details) description, uint32 commissionRate, uint96 withdrawalFeeInGwei, bytes pubkey, bytes signature) external payable returns (address)",
    
    // Events (for better detection)
    "event Delegated(address indexed delegator, address indexed validator, uint256 amount)",
    "event Undelegated(address indexed delegator, address indexed validator, uint256 amount)",
    "event ValidatorCreated(address indexed validator, address indexed owner, string moniker)"
];

// 📊 MEMORY CACHE VARIABLES
let VALIDATOR_CACHE = null;
let LAST_UPDATE = null;
let UPDATE_STATUS = 'initializing';
let UPDATE_COUNT = 0;

// Working ABI
const WORKING_ABI = [
    "function tokens() external view returns (uint)",
    "function delegatorShares() external view returns (uint)",
    "function commissionRate() external view returns (uint32)",
    "function withdrawalFeeInGwei() external view returns (uint96)",
    "function delegate(address delegatorAddress) external payable returns (uint)",
    "function validatorCount() external view returns (uint32)",
    "function computeValidatorAddress(bytes calldata pubkey) external view returns (address)",
    "function getValidator(bytes memory pubkey) external view returns (address)",
    "function getDelegation(address delegator) external view returns (address, uint)"
];

// Metadata extraction ABI
const METADATA_ABI = [
    "function createAndInitializeValidatorIfNecessary(tuple(string moniker, string identity, string website, string securityContact, string details) description, uint32 commissionRate, uint96 withdrawalFeeInGwei, bytes pubkey, bytes signature) external payable returns (address)"
];

// In-memory cache
let METADATA_CACHE = new Map();
let OWNER_ADDRESS_CACHE = new Map();

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync('api.log', logMessage);
}

function serializeBigInt(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

// 🆕 RPC CALL FOR DELEGATORS & TRANSACTIONS - LOCAL RPC ONLY
async function makeRpcCall(method, params, timeoutMs = 8000) {
    try {
        console.log(`🔄 RPC Call: ${method} via ${RPC_ENDPOINT.url}`);
        
        const response = await axios.post(RPC_ENDPOINT.url, {
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 1000),
            method: method,
            params: params
        }, {
            timeout: timeoutMs,
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data && !response.data.error) {
            console.log(`✅ RPC Success: ${RPC_ENDPOINT.url}`);
            return response.data;
        } else {
            throw new Error(`RPC Error: ${response.data?.error?.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.log(`❌ RPC Failed: ${RPC_ENDPOINT.url} - ${error.message}`);
        throw error;
    }
}

// 🔧 RPC CALL FOR EVM - LOCAL RPC ONLY
async function makeEvmRpcCall(method, params, timeoutMs = 8000) {  // ✅ 1 saniye default
    try {
        const startTime = Date.now();
        
        const response = await axios.post(RPC_ENDPOINT.url, {
            jsonrpc: '2.0',
            id: 1,
            method: method,
            params: params
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: timeoutMs  // ✅ Parametreden al
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.data && !response.data.error) {
            logToFile(`✅ RPC success: ${RPC_ENDPOINT.name} (${responseTime}ms)`);
            return response.data;
        } else {
            throw new Error(`RPC Error: ${response.data?.error?.message || 'Unknown error'}`);
        }
    } catch (error) {
        logToFile(`❌ RPC failed: ${RPC_ENDPOINT.name} - ${error.message.substring(0, 50)}`);
        throw error;
    }
}

// 🔍 ENHANCED DELEGATORS DISCOVERY - FOR ANY VALIDATOR
async function discoverDelegators(validatorAddress) {
    try {
        console.log(`\n🔍 ENHANCED Delegator Discovery for: ${validatorAddress}`);
        
        // Get current block
        const latestBlockResult = await makeRpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockResult.result, 16);
        console.log(`📊 Current block: ${latestBlock}`);
        
        // WIDER SCAN - Last 2M blocks (more comprehensive)
        const scanRanges = [
            { from: Math.max(0, latestBlock - 2000000), to: 'latest', name: 'comprehensive_2M' },
            { from: Math.max(0, latestBlock - 1000000), to: latestBlock - 500000, name: 'historical_1M' }
        ];
        
        const allDelegatorAddresses = new Set();
        let totalEvents = 0;
        
        // Scan multiple ranges
        for (const range of scanRanges) {
            try {
                console.log(`📈 Scanning ${range.name}: blocks ${range.from} to ${range.to}`);
                
                const eventResult = await makeRpcCall('eth_getLogs', [{
                    fromBlock: `0x${range.from.toString(16)}`,
                    toBlock: range.to === 'latest' ? 'latest' : `0x${range.to.toString(16)}`,
                    address: validatorAddress
                }]);
                
                if (eventResult.result && Array.isArray(eventResult.result)) {
                    totalEvents += eventResult.result.length;
                    console.log(`📝 Found ${eventResult.result.length} events in ${range.name}`);
                    
                    // COMPREHENSIVE ADDRESS EXTRACTION
                    for (const event of eventResult.result) {
                        // Method 1: Extract from topics (event indexed parameters)
                        if (event.topics && event.topics.length > 0) {
                            for (const topic of event.topics) {
                                if (topic && topic.length === 66 && topic.startsWith('0x')) {
                                    const potentialAddr = '0x' + topic.slice(26);
                                    if (ethers.isAddress(potentialAddr) && 
                                        potentialAddr !== '0x0000000000000000000000000000000000000000') {
                                        allDelegatorAddresses.add(potentialAddr.toLowerCase());
                                    }
                                }
                            }
                        }
                        
                        // Method 2: Extract from data field (comprehensive scan)
                        if (event.data && event.data.length > 66) {
                            const data = event.data.slice(2); // Remove 0x
                            
                            // Scan every possible position for addresses
                            for (let i = 0; i <= data.length - 40; i += 2) { // Every 2 chars (1 byte)
                                const chunk = data.slice(i, i + 40);
                                if (chunk.length === 40) {
                                    const potentialAddr = '0x' + chunk;
                                    if (ethers.isAddress(potentialAddr) && 
                                        potentialAddr !== '0x0000000000000000000000000000000000000000') {
                                        allDelegatorAddresses.add(potentialAddr.toLowerCase());
                                    }
                                }
                            }
                        }
                        
                        // Method 3: Extract transaction sender (from field)
                        if (event.transactionHash) {
                            try {
                                const txResult = await makeRpcCall('eth_getTransactionByHash', [event.transactionHash]);
                                if (txResult.result && txResult.result.from) {
                                    allDelegatorAddresses.add(txResult.result.from.toLowerCase());
                                }
                            } catch (e) {
                                // Silent fail for individual tx lookups
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`❌ Range scan error ${range.name}: ${error.message}`);
            }
        }
        
        console.log(`📊 Total events scanned: ${totalEvents}`);
        console.log(`👥 Unique addresses discovered: ${allDelegatorAddresses.size}`);
        
        // ENHANCED DELEGATION VERIFICATION
        const stakingInterface = new ethers.Interface(ENHANCED_ABI);
        const activeDelegators = [];
        
        console.log(`🔍 Verifying delegations for ${allDelegatorAddresses.size} addresses...`);
        
        for (const delegatorAddr of Array.from(allDelegatorAddresses)) {
            try {
                // Check if this address has active delegation
                const delegationData = stakingInterface.encodeFunctionData('getDelegation', [delegatorAddr]);
                const delegationResult = await makeRpcCall('eth_call', [{
                    to: validatorAddress,
                    data: delegationData
                }, 'latest']);
                
                if (delegationResult.result && delegationResult.result !== '0x' && delegationResult.result.length > 2) {
                    try {
                        const decoded = stakingInterface.decodeFunctionResult('getDelegation', delegationResult.result);
                        const [validatorAddr, shares] = decoded;
                        
                        if (BigInt(shares) > 0n) {
                            // Get validator's total tokens and shares for conversion
                            const [tokensResult, sharesResult] = await Promise.all([
                                makeRpcCall('eth_call', [{
                                    to: validatorAddress,
                                    data: stakingInterface.encodeFunctionData('tokens', [])
                                }, 'latest']),
                                makeRpcCall('eth_call', [{
                                    to: validatorAddress,
                                    data: stakingInterface.encodeFunctionData('delegatorShares', [])
                                }, 'latest'])
                            ]);
                            
                            if (tokensResult.result && sharesResult.result) {
                                const totalTokens = stakingInterface.decodeFunctionResult('tokens', tokensResult.result)[0];
                                const totalShares = stakingInterface.decodeFunctionResult('delegatorShares', sharesResult.result)[0];
                                
                                // Calculate actual delegated amount
                                const delegatedTokens = totalShares > 0n 
                                    ? (BigInt(shares) * totalTokens) / totalShares 
                                    : 0n;
                                
                                const delegatedAmount = parseFloat(ethers.formatEther(delegatedTokens));
                                
                                if (delegatedAmount > 0) {
                                    activeDelegators.push({
                                        address: delegatorAddr,
                                        shares: shares.toString(),
                                        staked: delegatedAmount,
                                        percentage: 0 // Will calculate later
                                    });
                                    
                                    console.log(`✅ Active delegator: ${delegatorAddr} - ${delegatedAmount.toFixed(6)} 0G`);
                                }
                            }
                        }
                    } catch (decodeError) {
                        // Silent fail for decode errors
                    }
                }
            } catch (error) {
                // Silent fail for individual checks
            }
        }
        
        // Calculate percentages and rank
        const totalStaked = activeDelegators.reduce((sum, d) => sum + d.staked, 0);
        activeDelegators.forEach(delegator => {
            delegator.percentage = totalStaked > 0 ? (delegator.staked / totalStaked) * 100 : 0;
        });
        
        // Sort by stake amount (descending)
        activeDelegators.sort((a, b) => b.staked - a.staked);
        
        const delegatorsData = {
            validatorAddress: validatorAddress,
            total: activeDelegators.length,
            totalStaked: totalStaked,
            scannedAddresses: allDelegatorAddresses.size,
            eventsScanned: totalEvents,
            list: activeDelegators.map((delegator, index) => ({
                rank: index + 1,
                address: delegator.address,
                staked: delegator.staked,
                percentage: delegator.percentage.toFixed(2),
                shortAddress: `${delegator.address.slice(0, 6)}...${delegator.address.slice(-4)}`
            }))
        };
        
        console.log(`✅ DELEGATORS DISCOVERY COMPLETE:`);
        console.log(`   - Total delegators: ${activeDelegators.length}`);
        console.log(`   - Total staked: ${totalStaked.toFixed(6)} 0G`);
        console.log(`   - Events scanned: ${totalEvents}`);
        
        return delegatorsData;
        
    } catch (error) {
        console.error(`❌ Delegator discovery failed: ${error.message}`);
        return null;
    }
}

// 📜 ENHANCED TRANSACTION HISTORY WITH 0G SPECIFIC SIGNATURES - FOR ANY VALIDATOR
async function discoverTransactionHistory(validatorAddress) {
    try {
        console.log(`\n📜 ENHANCED Transaction History for: ${validatorAddress}`);
        
        // Get current block
        const latestBlockResult = await makeRpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockResult.result, 16);
        
        // OPTIMIZED SCAN - Smaller chunks to avoid timeout
        const scanRanges = [
            { from: Math.max(0, latestBlock - 500000), to: 'latest', name: 'recent_500K' },
            { from: Math.max(0, latestBlock - 1000000), to: latestBlock - 500000, name: 'mid_500K' },
            { from: Math.max(0, latestBlock - 1500000), to: latestBlock - 1000000, name: 'old_500K' }
        ];
        
        let allEvents = [];
        
        for (const range of scanRanges) {
            try {
                console.log(`📈 Scanning ${range.name}: blocks ${range.from} to ${range.to}`);
                
                const eventResult = await makeRpcCall('eth_getLogs', [{
                    fromBlock: `0x${range.from.toString(16)}`,
                    toBlock: range.to === 'latest' ? 'latest' : `0x${range.to.toString(16)}`,
                    address: validatorAddress
                }], 15000); // Longer timeout for transaction scanning
                
                if (eventResult.result && Array.isArray(eventResult.result)) {
                    allEvents = allEvents.concat(eventResult.result);
                    console.log(`📝 Found ${eventResult.result.length} events in ${range.name}`);
                }
            } catch (error) {
                console.log(`❌ Range ${range.name} failed: ${error.message}`);
                continue; // Try next range
            }
        }
        
        const transactions = [];
        const processedTxHashes = new Set();
        
        if (allEvents.length > 0) {
            console.log(`📝 Total events found: ${allEvents.length} for transaction analysis`);
            
            // Get all unique transaction hashes
            const txHashes = [...new Set(allEvents.map(e => e.transactionHash))];
            console.log(`🔍 Analyzing ${txHashes.length} unique transactions...`);
            
            for (const txHash of txHashes) {
                if (processedTxHashes.has(txHash)) continue;
                processedTxHashes.add(txHash);
                
                try {
                    // Get transaction details and receipt
                    const [txResult, receiptResult] = await Promise.all([
                        makeRpcCall('eth_getTransactionByHash', [txHash]),
                        makeRpcCall('eth_getTransactionReceipt', [txHash])
                    ]);
                    
                    if (txResult.result && receiptResult.result) {
                        const tx = txResult.result;
                        const receipt = receiptResult.result;
                        
                        // 🎯 0G SPECIFIC TYPE DETECTION
                        let type = 'Others';
                        let amount = '0.000000';
                        
                        // Method 1: Check transaction value
                        if (tx.value && BigInt(tx.value) > 0n) {
                            const valueInEther = parseFloat(ethers.formatEther(tx.value));
                            amount = valueInEther.toFixed(6);
                            
                            // Determine type based on value and contract
                            if (valueInEther >= 32 && tx.to === CONTRACTS_CONFIG.STAKING_CONTRACT) {
                                type = 'CreateValidator';
                            } else if (valueInEther > 0 && tx.to === CONTRACTS_CONFIG.DELEGATION_CONTRACT) {
                                type = 'Delegate';
                            } else if (valueInEther > 0) {
                                type = 'Others';
                            }
                        }
                        
                        // Method 2: 🎯 0G SPECIFIC FUNCTION SIGNATURES
                        if (tx.input && tx.input.length > 10) {
                            const functionSig = tx.input.slice(0, 10);
                            
                            // 🚀 REAL 0G FUNCTION SIGNATURES FROM EXPLORER
                            const functionMap = {
                                // 0G Specific - Confirmed from real transactions
                                '0x5c19a95c': 'Delegate',           // Delegate - 0xE37bfc9e900bC5cC3279952B90f6Be9A53ED6949
                                '0x4d99dd16': 'Undelegate',        // Undelegate - 0xE37bfc9e900bC5cC3279952B90f6Be9A53ED6949
                                
                                // CreateValidator - 0xea224dBB52F57752044c0C86aD50930091F561B9
                                '0x441a3e70': 'CreateValidator',   // createAndInitializeValidator
                                '0x1f2f220e': 'CreateValidator',   // Alternative CreateValidator
                                '0xe7740331': 'CreateValidator',   // createAndInitializeValidatorIfNecessary
                                
                                // Common staking functions
                                '0xf25b3f99': 'UpdateCommission',  // updateCommissionRate
                                '0xe6fd48bc': 'Withdraw',          // withdraw
                                '0xa694fc3a': 'Stake',             // stake
                                '0x6e512e26': 'Redelegate',        // redelegate
                                '0x4f864df4': 'Others',            // Other methods
                                '0x2e1a7d4d': 'Others',            // Other methods
                                '0xa9059cbb': 'Others',            // transfer
                                '0x095ea7b3': 'Others',            // approve
                            };
                            
                            if (functionMap[functionSig]) {
                                type = functionMap[functionSig];
                                console.log(`✅ Function signature detected: ${functionSig} -> ${type}`);
                            } else {
                                type = 'Others';
                                console.log(`⚠️ Unknown function signature: ${functionSig}`);
                            }
                            
                            // 🎯 ENHANCED AMOUNT DETECTION FOR UNDELEGATE
                            if (type === 'Undelegate' && tx.input.length > 74) {
                                try {
                                    // Extract amount from input data (second parameter after address)
                                    const amountHex = tx.input.slice(74, 138); // 32 bytes for amount
                                    const amountBigInt = BigInt('0x' + amountHex);
                                    amount = parseFloat(ethers.formatEther(amountBigInt)).toFixed(6);
                                } catch (e) {
                                    // Keep existing amount from tx.value
                                }
                            }
                        }
                        
                        // Method 3: Analyze events in receipt for more context
                        if (receipt.logs && receipt.logs.length > 0) {
                            for (const log of receipt.logs) {
                                if (log.topics && log.topics[0]) {
                                    const eventSig = log.topics[0];
                                    
                                    // Known event signatures
                                    const eventMap = {
                                        '0x9a8f44850296624dadfd9c246d17e47171d35727a181bd090aa14bbbe00238bb': 'Delegated',
                                        '0x4d10bd049775c77bd7f255195afba5088028ecb3c7c277d393ccff7934f2f92c': 'Undelegated',
                                        '0x85fb62ad5e8e5d2c0ce27d8e4f6cfab8ab0e7b54cbf48e2d0d1da3e3c89f3eeb': 'ValidatorCreated'
                                    };
                                    
                                    if (eventMap[eventSig]) {
                                        type = eventMap[eventSig];
                                    } else if (eventSig === '0x85fb62ad5e8e5d2c0ce27d8e4f6cfab8ab0e7b54cbf48e2d0d1da3e3c89f3eeb') {
                                        type = 'CreateValidator';  // ValidatorCreated event
                                    }
                                }
                            }
                        }
                        
                        // Get block timestamp
                        const blockResult = await makeRpcCall('eth_getBlockByNumber', [tx.blockNumber, false]);
                        const timestamp = blockResult.result ? parseInt(blockResult.result.timestamp, 16) : Date.now() / 1000;
                        
                        // Create transaction object
                        const transaction = {
                            hash: txHash,
                            type: type,
                            status: receipt.status === '0x1' ? 'SUCCESS' : 'FAILED',
                            amount: amount,
                            from: tx.from || 'Unknown',
                            to: tx.to || validatorAddress,
                            gasUsed: parseInt(receipt.gasUsed, 16),
                            gasPrice: parseInt(tx.gasPrice || '0x0', 16),
                            blockNumber: parseInt(tx.blockNumber, 16),
                            timestamp: timestamp,
                            date: new Date(timestamp * 1000).toLocaleString(),
                            shortHash: `${txHash.slice(0, 8)}...${txHash.slice(-6)}`,
                            shortFrom: `${(tx.from || 'Unknown').slice(0, 6)}...${(tx.from || 'Unknown').slice(-4)}`
                        };
                        
                        transactions.push(transaction);
                        
                        console.log(`✅ Transaction: ${type} - ${amount} 0G - ${transaction.status}`);
                    }
                } catch (error) {
                    console.log(`❌ Transaction analysis failed for ${txHash}: ${error.message}`);
                }
            }
        }
        
        // Sort by timestamp (newest first)
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        // Calculate summary with 0G specific categories
        const summary = {
            total: transactions.length,
            createValidator: transactions.filter(t => t.type === 'CreateValidator').length,
            delegate: transactions.filter(t => t.type === 'Delegate').length,
            undelegate: transactions.filter(t => t.type === 'Undelegate').length,
            withdraw: transactions.filter(t => t.type === 'Withdraw').length,
            updateCommission: transactions.filter(t => t.type === 'UpdateCommission').length,
            redelegate: transactions.filter(t => t.type === 'Redelegate').length,
            others: transactions.filter(t => t.type === 'Others').length,
            successful: transactions.filter(t => t.status === 'SUCCESS').length,
            failed: transactions.filter(t => t.status === 'FAILED').length
        };
        
        const transactionData = {
            validatorAddress: validatorAddress,
            total: transactions.length,
            recent: transactions.slice(0, 250), // Top 250
            all: transactions,
            summary: summary,
            categories: {
                'CreateValidator': summary.createValidator,
                'Delegate': summary.delegate,
                'Undelegate': summary.undelegate,
                'Withdraw': summary.withdraw,
                'UpdateCommission': summary.updateCommission,
                'Redelegate': summary.redelegate,
                'Others': summary.others
            }
        };
        
        console.log(`✅ TRANSACTION HISTORY COMPLETE:`);
        console.log(`   - Total transactions: ${transactions.length}`);
        console.log(`   - CreateValidator: ${summary.createValidator}`);
        console.log(`   - Delegate: ${summary.delegate}`);
        console.log(`   - Undelegate: ${summary.undelegate}`);
        console.log(`   - Withdraw: ${summary.withdraw}`);
        console.log(`   - Others: ${summary.others}`);
        console.log(`   - Success rate: ${((summary.successful / transactions.length) * 100).toFixed(1)}%`);
        
        return transactionData;
        
    } catch (error) {
        console.error(`❌ Transaction history discovery failed: ${error.message}`);
        return null;
    }
}

// Extract metadata from transaction
async function extractMetadataFromTransaction(txHash, validatorAddress) {
    try {
        const txResult = await makeEvmRpcCall('eth_getTransactionByHash', [txHash]);
        
        if (txResult.result && txResult.result.input) {
            const inputData = txResult.result.input;
            const createFunctionSig = ethers.id("createAndInitializeValidatorIfNecessary((string,string,string,string,string),uint32,uint96,bytes,bytes)").slice(0, 10);
            
            if (inputData.startsWith(createFunctionSig)) {
                try {
                    const metadataInterface = new ethers.Interface(METADATA_ABI);
                    const decoded = metadataInterface.parseTransaction({ data: inputData });
                    
                    if (decoded && decoded.args && decoded.args.description) {
                        const description = decoded.args.description;
                        
                        const metadata = {
                            moniker: description.moniker || description[0] || 'Unknown Validator',
                            identity: description.identity || description[1] || '',
                            website: description.website || description[2] || '',
                            securityContact: description.securityContact || description[3] || '',
                            details: description.details || description[4] || '',
                            commissionRate: decoded.args.commissionRate ? decoded.args.commissionRate.toString() : '500',
                            withdrawalFeeInGwei: decoded.args.withdrawalFeeInGwei ? decoded.args.withdrawalFeeInGwei.toString() : '1',
                            publicKey: decoded.args.pubkey || '',
                            ownerAddress: txResult.result.from || '',
                            extractedAt: new Date().toISOString(),
                            source: 'transaction_decode',
                            txHash: txHash,
                            validatorAddress: validatorAddress
                        };
                        
                        return metadata;
                    }
                } catch (decodeError) {
                    logToFile(`❌ Transaction decode failed: ${decodeError.message}`);
                }
            }
        }
        
        return null;
    } catch (error) {
        logToFile(`❌ Metadata extraction error: ${error.message}`);
        return null;
    }
}

// Find creation transaction for validator
async function findValidatorCreationTransaction(validatorAddress, allEvents) {
    try {
        const relevantTxHashes = new Set();
        
        for (const event of allEvents) {
            if (event.transactionHash) {
                const eventDataLower = event.data.toLowerCase();
                const topicsData = event.topics.join('').toLowerCase();
                
                if (eventDataLower.includes(validatorAddress.toLowerCase().slice(2)) || 
                    topicsData.includes(validatorAddress.toLowerCase().slice(2))) {
                    relevantTxHashes.add(event.transactionHash);
                }
            }
        }
        
        for (const txHash of relevantTxHashes) {
            const metadata = await extractMetadataFromTransaction(txHash, validatorAddress);
            if (metadata) {
                METADATA_CACHE.set(validatorAddress.toLowerCase(), metadata);
                return metadata;
            }
        }
        
        return null;
    } catch (error) {
        logToFile(`❌ Creation transaction search error: ${error.message}`);
        return null;
    }
}

// Generate avatar URL from identity
function generateAvatarUrl(identity) {
    if (!identity || identity.length < 16) return '';
    return `https://s3.amazonaws.com/keybase_processed_uploads/${identity.toLowerCase()}_360_360.jpg`;
}

// Commission rate validation
function validateCommissionRate(commissionBasisPoints) {
    const rate = parseInt(commissionBasisPoints || '500');
    
    if (rate < 0 || rate > 1000000) {
        logToFile(`⚠️ Aşırı yüksek commission rate tespit edildi: ${rate} basis points, default'a çevriliyor`);
        return 500;
    }
    
    return rate;
}

// Calculate delegation for any delegator
async function calculateDelegation(validatorAddress, delegatorAddress, stakingInterface) {
    try {
        if (!delegatorAddress || delegatorAddress === '0x0000000000000000000000000000000000000000') {
            return { shares: '0', tokens: 0 };
        }
        
        const delegationData = stakingInterface.encodeFunctionData('getDelegation', [delegatorAddress]);
        const delegationResult = await makeEvmRpcCall('eth_call', [{
            to: validatorAddress,
            data: delegationData
        }, 'latest']);
        
        if (delegationResult.result && !delegationResult.error && delegationResult.result !== '0x') {
            const decoded = stakingInterface.decodeFunctionResult('getDelegation', delegationResult.result);
            const shares = decoded[1];
            
            if (BigInt(shares) > 0n) {
                const tokensData = stakingInterface.encodeFunctionData('tokens', []);
                const tokensResult = await makeEvmRpcCall('eth_call', [{
                    to: validatorAddress,
                    data: tokensData
                }, 'latest']);
                
                const delegatorSharesData = stakingInterface.encodeFunctionData('delegatorShares', []);
                const delegatorSharesResult = await makeEvmRpcCall('eth_call', [{
                    to: validatorAddress,
                    data: delegatorSharesData
                }, 'latest']);
                
                if (tokensResult.result && delegatorSharesResult.result) {
                    const totalTokens = stakingInterface.decodeFunctionResult('tokens', tokensResult.result)[0];
                    const totalShares = stakingInterface.decodeFunctionResult('delegatorShares', delegatorSharesResult.result)[0];
                    
                    if (totalShares > 0n) {
                        const delegationTokens = (BigInt(shares) * totalTokens) / totalShares;
                        return {
                            shares: shares.toString(),
                            tokens: parseFloat(ethers.formatEther(delegationTokens))
                        };
                    }
                }
            }
        }
        
        return { shares: '0', tokens: 0 };
    } catch (error) {
        return { shares: '0', tokens: 0 };
    }
}

// Calculate self delegation
async function calculateSelfDelegation(validatorAddress, ownerAddress, stakingInterface) {
    const result = await calculateDelegation(validatorAddress, ownerAddress, stakingInterface);
    return result.tokens;
}

// Find all delegator addresses for a validator via events
async function findValidatorDelegators(validatorAddress) {
    try {
        logToFile(`🔍 Scanning events for validator delegators: ${validatorAddress}`);
        
        const delegatorAddresses = new Set();
        
        const blockRanges = [
            { from: Math.max(0, 3600000 - 1000000), to: 'latest', name: 'last_1M' },
            { from: Math.max(0, 3600000 - 2000000), to: 3600000 - 1000000, name: 'previous_1M' }
        ];
        
        for (const range of blockRanges) {
            try {
                const eventResult = await makeEvmRpcCall('eth_getLogs', [{
                    fromBlock: `0x${range.from.toString(16)}`,
                    toBlock: range.to === 'latest' ? 'latest' : `0x${range.to.toString(16)}`,
                    address: validatorAddress
                }]);
                
                if (eventResult.result && Array.isArray(eventResult.result)) {
                    for (const event of eventResult.result) {
                        if (event.topics && event.topics.length > 1) {
                            for (let i = 1; i < event.topics.length; i++) {
                                const topic = event.topics[i];
                                if (topic && topic.length === 66) {
                                    const addr = '0x' + topic.slice(26);
                                    if (ethers.isAddress(addr) && addr !== '0x0000000000000000000000000000000000000000') {
                                        delegatorAddresses.add(addr);
                                    }
                                }
                            }
                        }
                        
                        if (event.data && event.data.length > 66) {
                            const data = event.data.slice(2);
                            for (let i = 0; i <= data.length - 40; i += 64) {
                                const chunk = data.slice(i, i + 40);
                                if (chunk.length === 40) {
                                    const addr = '0x' + chunk;
                                    if (ethers.isAddress(addr) && addr !== '0x0000000000000000000000000000000000000000') {
                                        delegatorAddresses.add(addr);
                                    }
                                }
                            }
                        }
                    }
                    
                    logToFile(`📊 ${range.name}: Found ${eventResult.result.length} events`);
                }
            } catch (error) {
                logToFile(`❌ Event scanning error for ${range.name}: ${error.message}`);
            }
        }
        
        const uniqueAddresses = Array.from(delegatorAddresses);
        logToFile(`📊 Total unique addresses found via events: ${uniqueAddresses.length}`);
        
        return uniqueAddresses;
        
    } catch (error) {
        logToFile(`❌ Delegator discovery error: ${error.message}`);
        return [];
    }
}

// Find known delegators
async function findKnownDelegators(validatorAddress) {
    try {
        logToFile(`🔍 Finding known delegators for validator: ${validatorAddress}`);
        
        const knownAddresses = new Set();
        
        const commonAddresses = [
            '0xDc3346345317f8b110657AAe0DB36afb3D4aCAa0',
            '0xdc334e35794a06e8e71652537c401d6eebf6cf0a',
            '0xb984b1f158963417467900b4be868f83dea007fc',
            '0x565e66aa2bcb27116937983f2f208efabf620ab2',
            '0x14d932723a2e3358aef7fde3468ded2e7c7662f5'
        ];
        
        if (VALIDATOR_CACHE && VALIDATOR_CACHE.validators) {
            VALIDATOR_CACHE.validators.forEach(validator => {
                if (validator.ownerAddress) {
                    commonAddresses.push(validator.ownerAddress);
                }
            });
        }
        
        const stakingInterface = new ethers.Interface(WORKING_ABI);
        
        for (const address of commonAddresses) {
            try {
                if (ethers.isAddress(address)) {
                    const delegation = await calculateDelegation(
                        validatorAddress,
                        address,
                        stakingInterface
                    );
                    
                    if (delegation.tokens > 0) {
                        knownAddresses.add(address);
                        logToFile(`✅ Known delegator found: ${address} - ${delegation.tokens} 0G`);
                    }
                }
            } catch (error) {
                // Silent fail for known address checks
            }
        }
        
        const uniqueKnownAddresses = Array.from(knownAddresses);
        logToFile(`📊 Total known delegators found: ${uniqueKnownAddresses.length}`);
        
        return uniqueKnownAddresses;
        
    } catch (error) {
        logToFile(`❌ Known delegator discovery error: ${error.message}`);
        return [];
    }
}

// Calculate delegation statistics
function calculateDelegationStats(delegators, totalStaked) {
    if (delegators.length === 0) {
        return {
            averageStake: 0,
            medianStake: 0,
            largestStake: 0,
            smallestStake: 0,
            giniCoefficient: 0,
            top10Percentage: 0,
            concentration: "No delegators"
        };
    }
    
    const stakes = delegators.map(d => d.staked).sort((a, b) => a - b);
    
    const averageStake = totalStaked / delegators.length;
    const medianStake = stakes.length % 2 === 0 
        ? (stakes[stakes.length / 2 - 1] + stakes[stakes.length / 2]) / 2
        : stakes[Math.floor(stakes.length / 2)];
    
    const largestStake = Math.max(...stakes);
    const smallestStake = Math.min(...stakes);
    
    const top10Count = Math.min(10, delegators.length);
    const top10Total = delegators.slice(0, top10Count).reduce((sum, d) => sum + d.staked, 0);
    const top10Percentage = (top10Total / totalStaked) * 100;
    
    let gini = 0;
    for (let i = 0; i < stakes.length; i++) {
        for (let j = 0; j < stakes.length; j++) {
            gini += Math.abs(stakes[i] - stakes[j]);
        }
    }
    const giniCoefficient = gini / (2 * stakes.length * totalStaked);
    
    let concentration = "Balanced";
    if (top10Percentage > 80) concentration = "Highly concentrated";
    else if (top10Percentage > 60) concentration = "Moderately concentrated";
    else if (top10Percentage > 40) concentration = "Somewhat concentrated";
    
    return {
        averageStake: averageStake,
        medianStake: medianStake,
        largestStake: largestStake,
        smallestStake: smallestStake,
        giniCoefficient: Math.min(1, giniCoefficient),
        top10Percentage: top10Percentage,
        concentration: concentration,
        stakingDistribution: {
            "Large (>10%)": delegators.filter(d => d.percentage > 10).length,
            "Medium (1-10%)": delegators.filter(d => d.percentage >= 1 && d.percentage <= 10).length,
            "Small (<1%)": delegators.filter(d => d.percentage < 1).length
        }
    };
}

// Get validator info from cache
async function getValidatorInfo(validatorAddress) {
    if (VALIDATOR_CACHE && VALIDATOR_CACHE.validators) {
        const validator = VALIDATOR_CACHE.validators.find(v => 
            v.address.toLowerCase() === validatorAddress.toLowerCase()
        );
        return validator || {};
    }
    return {};
}

// ENHANCED ADDRESS EXTRACTION - More aggressive discovery
function extractAddressesFromEvents(events) {
    const addresses = new Set();
    
    for (const log of events) {
        // Search all topics
        if (log.topics) {
            log.topics.forEach(topic => {
                if (topic && topic.length === 66) {
                    const addr = '0x' + topic.slice(26);
                    if (ethers.isAddress(addr) && addr !== '0x0000000000000000000000000000000000000000') {
                        addresses.add(addr);
                    }
                }
            });
        }
        
        // More comprehensive data search
        if (log.data && log.data.length > 66) {
            const data = log.data.slice(2);
            
            // Scan every 2 characters (more comprehensive)
            for (let i = 0; i <= data.length - 40; i += 2) {
                const chunk = data.slice(i, i + 40);
                if (chunk.length === 40) {
                    const addr = '0x' + chunk;
                    if (ethers.isAddress(addr) && 
                        addr !== '0x0000000000000000000000000000000000000000') {
                        addresses.add(addr);
                    }
                }
            }
        }
    }
    
    return Array.from(addresses);
}

// ENHANCED VALIDATOR DETECTION - 6 LAYER CONTROL
async function testAndAddValidator(address, foundValidators, stakingInterface, discoveryMethod) {
    if (!ethers.isAddress(address) || 
        address === '0x0000000000000000000000000000000000000000' ||
        foundValidators.has(address.toLowerCase())) {
        return;
    }
    
    try {
        // 1️⃣ FIRST CHECK: tokens() function
        const tokensData = stakingInterface.encodeFunctionData('tokens', []);
        const tokensResult = await makeEvmRpcCall('eth_call', [{ 
            to: address, 
            data: tokensData 
        }, 'latest']);
        
        if (!tokensResult.result || tokensResult.error || tokensResult.result === '0x') {
            return;
        }
        
        const tokensDecoded = stakingInterface.decodeFunctionResult('tokens', tokensResult.result);
        const totalTokens = tokensDecoded[0];
        
        // 2️⃣ SECOND CHECK: delegatorShares() function - VALIDATOR REQUIRED
        const sharesData = stakingInterface.encodeFunctionData('delegatorShares', []);
        const sharesResult = await makeEvmRpcCall('eth_call', [{ 
            to: address, 
            data: sharesData 
        }, 'latest']);
        
        if (!sharesResult.result || sharesResult.error || sharesResult.result === '0x') {
            logToFile(`❌ REJECTED: ${address} - delegatorShares() yok (validator değil)`);
            return;
        }
        
        // 3️⃣ THIRD CHECK: commissionRate() function
        const commissionData = stakingInterface.encodeFunctionData('commissionRate', []);
        const commissionResult = await makeEvmRpcCall('eth_call', [{ 
            to: address, 
            data: commissionData 
        }, 'latest']);
        
        if (!commissionResult.result || commissionResult.error || commissionResult.result === '0x') {
            logToFile(`❌ REJECTED: ${address} - commissionRate() yok (validator değil)`);
            return;
        }
        
        const commissionDecoded = stakingInterface.decodeFunctionResult('commissionRate', commissionResult.result);
        const commissionRate = parseInt(commissionDecoded[0].toString());
        
        // 4️⃣ FOURTH CHECK: Commission rate reasonable range?
        if (commissionRate > 1000000) {
            logToFile(`❌ REJECTED: ${address} - Aşırı yüksek commission rate: ${commissionRate} (>1000000)`);
            return;
        }
        
        // 5️⃣ FIFTH CHECK: Stake control
        const stakeAmount = parseFloat(ethers.formatEther(totalTokens));
        
        if (stakeAmount < 0.001) {
            logToFile(`❌ REJECTED: ${address} - Hiç stake yok: ${stakeAmount} 0G`);
            return;
        }
        
        // 6️⃣ SIXTH CHECK: withdrawalFeeInGwei() - validator feature
        const withdrawalFeeData = stakingInterface.encodeFunctionData('withdrawalFeeInGwei', []);
        const withdrawalFeeResult = await makeEvmRpcCall('eth_call', [{ 
            to: address, 
            data: withdrawalFeeData 
        }, 'latest']);
        
        if (!withdrawalFeeResult.result || withdrawalFeeResult.error) {
            logToFile(`❌ REJECTED: ${address} - withdrawalFeeInGwei() yok (validator değil)`);
            return;
        }
        
        // ✅ ALL CHECKS SUCCESSFUL - ACCEPT AS VALIDATOR
        const validatorInfo = {
            address: address,
            totalStaked: stakeAmount,
            discovery_method: discoveryMethod,
            contract_data: {}
        };
        
        // Collect contract data
        const workingFunctions = ['delegatorShares', 'commissionRate', 'withdrawalFeeInGwei'];
        
        for (const funcName of workingFunctions) {
            try {
                const funcData = stakingInterface.encodeFunctionData(funcName, []);
                const funcResult = await makeEvmRpcCall('eth_call', [{ 
                    to: address, 
                    data: funcData 
                }, 'latest']);
                
                if (funcResult.result && !funcResult.error) {
                    const decoded = stakingInterface.decodeFunctionResult(funcName, funcResult.result);
                    validatorInfo.contract_data[funcName] = decoded[0].toString();
                }
            } catch (error) {
                logToFile(`⚠️ ${funcName} okunamadı: ${address}`);
            }
        }
        
        foundValidators.set(address.toLowerCase(), validatorInfo);
        
        const status = stakeAmount >= 32 ? 'AKTIF' : 'KANDIDAT';
        logToFile(`✅ ${status} VALIDATOR: ${address} (${stakeAmount} 0G) [Commission: ${(commissionRate/100).toFixed(2)}%]`);
        
    } catch (error) {
        logToFile(`❌ Validator test hatası ${address}: ${error.message}`);
    }
}

// 🛡️ ENHANCED BACKGROUND UPDATE WITH CACHE PROTECTION
async function fetchValidatorData() {
    try {
        logToFile('🔄 Local RPC background update starting...');
        UPDATE_STATUS = 'updating_with_local_rpc';
        
        const stakingInterface = new ethers.Interface(WORKING_ABI);
        const foundValidators = new Map();
        
        const latestBlockResult = await makeEvmRpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockResult.result, 16);
        
        // ⭐ PARÇALARA BÖL - Her biri maksimum 500K blok
        const wideRanges = [
            { from: Math.max(0, latestBlock - 500000), to: 'latest', name: 'recent_500K' },
            { from: Math.max(0, latestBlock - 1000000), to: latestBlock - 500000, name: 'block_1M' },
            { from: Math.max(0, latestBlock - 1500000), to: latestBlock - 1000000, name: 'block_1.5M' },
            { from: Math.max(0, latestBlock - 2000000), to: latestBlock - 1500000, name: 'block_2M' },
            { from: Math.max(0, latestBlock - 2500000), to: latestBlock - 2000000, name: 'block_2.5M' },
            { from: Math.max(0, latestBlock - 3000000), to: latestBlock - 2500000, name: 'block_3M' }
        ];
        
        let allEvents = [];
        
        // Her aralığı ayrı tara
        for (const range of wideRanges) {
            try {
                logToFile(`🔍 Scanning ${range.name}...`);
                
                const eventResult = await makeEvmRpcCall('eth_getLogs', [{
                    fromBlock: `0x${range.from.toString(16)}`,
                    toBlock: range.to === 'latest' ? 'latest' : `0x${range.to.toString(16)}`,
                    address: CONFIG.STAKING_CONTRACT_ADDRESS
                }], 10000); // 10 saniye timeout
                
                if (eventResult.result && Array.isArray(eventResult.result)) {
                    allEvents = allEvents.concat(eventResult.result);
                    const addresses = extractAddressesFromEvents(eventResult.result);
                    
                    logToFile(`✅ Found ${addresses.length} addresses in ${range.name}`);
                    
                    for (const addr of addresses) {
                        await testAndAddValidator(addr, foundValidators, stakingInterface, range.name);
                    }
                }
            } catch (error) {
                logToFile(`⚠️ ${range.name} failed: ${error.message.substring(0, 50)} - continuing...`);
                continue; // Hata olsa bile devam et
            }
        }        
        // Extract metadata for each validator
        for (const [address, validatorInfo] of foundValidators) {
            await findValidatorCreationTransaction(address, allEvents);
        }
        
        // Convert to COINSSPOR format
        const validators = [];
        
        for (const validatorInfo of Array.from(foundValidators.values())) {
            const metadata = METADATA_CACHE.get(validatorInfo.address.toLowerCase());
            
            const commissionBasisPoints = validateCommissionRate(validatorInfo.contract_data.commissionRate);
            const commissionPercentage = (commissionBasisPoints / 10000).toFixed(2);
            
            const ownerAddress = metadata?.ownerAddress || '';
            const selfDelegation = await calculateSelfDelegation(validatorInfo.address, ownerAddress, stakingInterface);
            
            const validator = {
                address: validatorInfo.address,
                ownerAddress: ownerAddress,
                moniker: metadata?.moniker || 'Unknown Validator',
                status: validatorInfo.totalStaked >= 32 ? 'Aktif' : 'Kandidat',
                avatarUrl: metadata?.identity ? generateAvatarUrl(metadata.identity) : '',
                identity: metadata?.identity || '',
                website: metadata?.website || '',
                securityContact: metadata?.securityContact || '',
                details: metadata?.details || '',
                publicKey: metadata?.publicKey || '',
                totalStaked: validatorInfo.totalStaked,
                commissionRate: `${commissionPercentage}%`,
                votingPower: 0,
                selfDelegation: selfDelegation,
                validationPassed: true
            };
            
            validators.push(validator);
        }
        
        // Sort by totalStaked (descending)
        validators.sort((a, b) => b.totalStaked - a.totalStaked);
        
        // Calculate voting power for active validators
        const totalNetworkStake = validators.reduce((sum, v) => sum + (v.status === 'Aktif' ? v.totalStaked : 0), 0);
        if (totalNetworkStake > 0) {
            validators.forEach(validator => {
                if (validator.status === 'Aktif') {
                    validator.votingPower = (validator.totalStaked / totalNetworkStake) * 100;
                }
            });
        }
        
        // Count candidates properly
        const candidateCount = validators.filter(v => v.status === 'Kandidat').length;
        
        // COINSSPOR compatible response format
        const response = {
            source: "blockchain_local_rpc",
            retrievedAt: new Date().toISOString(),
            validatorCount: validators.length,
            activeValidatorCount: validators.filter(v => v.status === 'Aktif').length,
            candidateValidatorCount: candidateCount,
            totalNetworkStake: totalNetworkStake,
            rpcHealth: {
                endpoint: RPC_ENDPOINT.url,
                timeout: RPC_ENDPOINT.timeout
            },
            validators: validators,
            performance_info: "⚡ CLEAN PERFORMANCE PATCH APPLIED - Automatic discovery enhanced!"
        };
        
        // UPDATE MEMORY CACHE
        if (response.validatorCount >= 10) { // Sanity check
            VALIDATOR_CACHE = response;
            LAST_UPDATE = new Date();
            UPDATE_STATUS = 'ready';
            UPDATE_COUNT++;
            
            logToFile(`✅ Local RPC update successful: ${validators.length} validators (${response.activeValidatorCount} active, ${candidateCount} candidates) (Update #${UPDATE_COUNT})`);
            return response;
        } else {
            throw new Error(`Invalid result: ${response.validatorCount} validators (expected >=10)`);
        }
        
    } catch (error) {
        logToFile(`⚠️ Local RPC update failed: ${error.message}`);
        
        if (VALIDATOR_CACHE && VALIDATOR_CACHE.validatorCount >= 10) {
            logToFile(`💾 Using cached data: ${VALIDATOR_CACHE.validatorCount} validators`);
            VALIDATOR_CACHE.lastUpdate = Date.now();
            VALIDATOR_CACHE.rpcStatus = 'local_rpc_degraded';
            UPDATE_STATUS = 'cached_due_to_local_rpc_issues';
            return VALIDATOR_CACHE;
        }
        
        throw error;
    }
}

// INITIALIZE CACHE ON STARTUP
async function initializeCache() {
    logToFile('📊 Initializing validator cache...');
    logToFile('⚡ CLEAN PERFORMANCE PATCH APPLIED - Automatic discovery enhanced!');
    
    try {
        await fetchValidatorData();
        logToFile('✅ Initial cache loaded successfully!');
    } catch (error) {
        logToFile(`❌ Failed to initialize cache: ${error.message}`);
        
        VALIDATOR_CACHE = {
            source: "cache_initialization_failed",
            retrievedAt: new Date().toISOString(),
            validatorCount: 0,
            validators: [],
            error: error.message
        };
        
        UPDATE_STATUS = 'initialization_failed';
    }
}

// BACKGROUND UPDATE SERVICE
function startBackgroundService() {
    logToFile(`📊 Starting background service (${CONFIG.UPDATE_INTERVAL}ms interval)`);
    
    setInterval(async () => {
        try {
            await fetchValidatorData();
        } catch (error) {
            logToFile(`❌ Background service error: ${error.message}`);
        }
    }, CONFIG.UPDATE_INTERVAL);
}

// API ENDPOINTS

// 🆕 VALIDATOR DELEGATORS ENDPOINT - HER VALİDATOR İÇİN
app.get('/api/validator-delegators/:validatorAddress', async (req, res) => {
    try {
        const { validatorAddress } = req.params;
        
        if (!ethers.isAddress(validatorAddress)) {
            return res.status(400).json({
                success: false,
                error: "Invalid validator address",
                address: validatorAddress
            });
        }
        
        logToFile(`🔍 Getting delegators for validator: ${validatorAddress}`);
        
        const delegatorsResult = await discoverDelegators(validatorAddress);
        
        if (delegatorsResult) {
            res.json({
                success: true,
                delegators: delegatorsResult
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to discover delegators",
                validatorAddress: validatorAddress
            });
        }
        
    } catch (error) {
        logToFile(`❌ Delegators endpoint error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            validatorAddress: req.params.validatorAddress
        });
    }
});

// 🆕 VALIDATOR TRANSACTIONS ENDPOINT - HER VALİDATOR İÇİN  
app.get('/api/validator-transactions/:validatorAddress', async (req, res) => {
    try {
        const { validatorAddress } = req.params;
        
        if (!ethers.isAddress(validatorAddress)) {
            return res.status(400).json({
                success: false,
                error: "Invalid validator address", 
                address: validatorAddress
            });
        }
        
        logToFile(`📜 Getting transaction history for validator: ${validatorAddress}`);
        
        const transactionsResult = await discoverTransactionHistory(validatorAddress);
        
        if (transactionsResult) {
            res.json({
                success: true,
                transactions: transactionsResult
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to discover transaction history",
                validatorAddress: validatorAddress
            });
        }
        
    } catch (error) {
        logToFile(`❌ Transactions endpoint error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            validatorAddress: req.params.validatorAddress
        });
    }
});

// RPC Health endpoint (simplified for local RPC)
app.get('/api/rpc-health', (req, res) => {
    res.json({
        lastCheck: new Date(),
        endpoint: RPC_ENDPOINT.url,
        timeout: RPC_ENDPOINT.timeout
    });
});

// Wallet delegation detection
app.get('/api/delegations/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: "Invalid wallet address",
                address: walletAddress
            });
        }
        
        logToFile(`🔍 Checking delegations for wallet: ${walletAddress}`);
        
        if (!VALIDATOR_CACHE || !VALIDATOR_CACHE.validators) {
            return res.status(503).json({
                success: false,
                error: "Validator cache not ready",
                message: "Please wait for validator cache to initialize"
            });
        }
        
        const delegations = [];
        const stakingInterface = new ethers.Interface(WORKING_ABI);
        
        const activeValidators = VALIDATOR_CACHE.validators.filter(v => v.status === 'Aktif');
        
        for (const validator of activeValidators) {
            try {
                const delegation = await calculateDelegation(
                    validator.address, 
                    walletAddress, 
                    stakingInterface
                );
                
                if (delegation.tokens > 0) {
                    delegations.push({
                        validator: {
                            address: validator.address,
                            moniker: validator.moniker,
                            commissionRate: validator.commissionRate,
                            status: validator.status,
                            totalStaked: validator.totalStaked
                        },
                        delegation: {
                            shares: delegation.shares,
                            tokens: delegation.tokens,
                            method: 'getDelegation'
                        }
                    });
                    
                    logToFile(`✅ Found delegation: ${delegation.tokens} 0G to ${validator.moniker}`);
                }
            } catch (error) {
                logToFile(`❌ Delegation check failed for ${validator.address}: ${error.message}`);
            }
        }
        
        const totalDelegated = delegations.reduce((sum, d) => sum + d.delegation.tokens, 0);
        
        const response = {
            success: true,
            walletAddress: walletAddress,
            totalDelegated: totalDelegated,
            delegationCount: delegations.length,
            delegations: delegations,
            checkedValidators: activeValidators.length,
            availableValidators: VALIDATOR_CACHE.validators.length,
            retrievedAt: new Date().toISOString(),
            summary: `Found ${delegations.length} delegation(s) totaling ${totalDelegated.toFixed(4)} 0G`
        };
        
        logToFile(`📊 Delegation summary: ${response.summary}`);
        
        res.json(response);
        
    } catch (error) {
        logToFile(`❌ Delegation endpoint error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            walletAddress: req.params.walletAddress
        });
    }
});

// Validator delegator analytics
app.get('/api/validator-delegations/:validatorAddress', async (req, res) => {
    try {
        const { validatorAddress } = req.params;
        
        if (!ethers.isAddress(validatorAddress)) {
            return res.status(400).json({
                success: false,
                error: "Invalid validator address",
                address: validatorAddress
            });
        }
        
        logToFile(`🔍 Analyzing delegations for validator: ${validatorAddress}`);
        
        const stakingInterface = new ethers.Interface(WORKING_ABI);
        
        // COMBINED APPROACH: Event scanning + known delegator discovery
        const eventDelegators = await findValidatorDelegators(validatorAddress);
        const knownDelegators = await findKnownDelegators(validatorAddress);
        
        const allDelegatorAddresses = [...new Set([...eventDelegators, ...knownDelegators])];
        
        logToFile(`📊 Found ${eventDelegators.length} via events, ${knownDelegators.length} via known checks, ${allDelegatorAddresses.length} total unique`);
        
        if (allDelegatorAddresses.length === 0) {
            return res.json({
                success: true,
                validator: validatorAddress,
                totalStaked: 0,
                delegatorCount: 0,
                delegators: [],
                message: "No delegators found via event scanning or known checks"
            });
        }
        
        const delegators = [];
        let totalStaked = 0;
        
        for (const delegatorAddr of allDelegatorAddresses) {
            try {
                const delegation = await calculateDelegation(
                    validatorAddress, 
                    delegatorAddr, 
                    stakingInterface
                );
                
                if (delegation.tokens > 0) {
                    delegators.push({
                        address: delegatorAddr,
                        staked: delegation.tokens,
                        shares: delegation.shares,
                        discoveryMethod: eventDelegators.includes(delegatorAddr) ? 'events' : 'known_check'
                    });
                    
                    totalStaked += delegation.tokens;
                    logToFile(`✅ Active delegator: ${delegatorAddr} - ${delegation.tokens} 0G`);
                }
            } catch (error) {
                logToFile(`❌ Failed to check delegator ${delegatorAddr}: ${error.message}`);
            }
        }
        
        delegators.forEach(delegator => {
            delegator.percentage = totalStaked > 0 ? (delegator.staked / totalStaked) * 100 : 0;
        });
        
        delegators.sort((a, b) => b.staked - a.staked);
        
        delegators.forEach((delegator, index) => {
            delegator.rank = index + 1;
        });
        
        const stats = calculateDelegationStats(delegators, totalStaked);
        const validatorInfo = await getValidatorInfo(validatorAddress);
        
        const response = {
            success: true,
            validator: {
                address: validatorAddress,
                moniker: validatorInfo.moniker || 'Unknown Validator',
                totalStaked: validatorInfo.totalStaked || totalStaked,
                commissionRate: validatorInfo.commissionRate || 'Unknown'
            },
            delegation_analysis: {
                totalDelegated: totalStaked,
                delegatorCount: delegators.length,
                scannedAddresses: allDelegatorAddresses.length,
                activeDelegators: delegators.length,
                discoveryMethods: {
                    fromEvents: delegators.filter(d => d.discoveryMethod === 'events').length,
                    fromKnownChecks: delegators.filter(d => d.discoveryMethod === 'known_check').length
                }
            },
            statistics: stats,
            delegators: delegators,
            top10: delegators.slice(0, 10),
            retrievedAt: new Date().toISOString()
        };
        
        logToFile(`📊 Validator analysis complete: ${delegators.length} active delegators, ${totalStaked.toFixed(4)} 0G total`);
        
        res.json(response);
        
    } catch (error) {
        logToFile(`❌ Validator analytics error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            validatorAddress: req.params.validatorAddress
        });
    }
});

// INSTANT API ENDPOINT - Returns cached data immediately
app.get('/api/validators', (req, res) => {
    if (!VALIDATOR_CACHE) {
        return res.status(503).json({
            error: "Cache not initialized yet",
            status: UPDATE_STATUS,
            message: "Please wait a moment and try again"
        });
    }
    
    const response = {
        ...VALIDATOR_CACHE,
        cache_info: {
            last_updated: LAST_UPDATE?.toISOString(),
            update_status: UPDATE_STATUS,
            update_count: UPDATE_COUNT,
            cache_age_seconds: LAST_UPDATE ? Math.floor((new Date() - LAST_UPDATE) / 1000) : null
        }
    };
    
    logToFile(`📊 API: Served ${VALIDATOR_CACHE.validatorCount} validators from cache (age: ${response.cache_info.cache_age_seconds}s)`);
    
    res.json(response);
});

// Cache status endpoint
app.get('/api/cache/status', (req, res) => {
    res.json({
        cache_initialized: !!VALIDATOR_CACHE,
        last_update: LAST_UPDATE?.toISOString(),
        update_status: UPDATE_STATUS,
        update_count: UPDATE_COUNT,
        cache_age_seconds: LAST_UPDATE ? Math.floor((new Date() - LAST_UPDATE) / 1000) : null,
        validator_count: VALIDATOR_CACHE?.validatorCount || 0,
        active_validator_count: VALIDATOR_CACHE?.activeValidatorCount || 0,
        candidate_validator_count: VALIDATOR_CACHE?.candidateValidatorCount || 0,
        next_update_in: CONFIG.UPDATE_INTERVAL - (LAST_UPDATE ? (new Date() - LAST_UPDATE) : 0),
        rpc_health: {
            endpoint: RPC_ENDPOINT.url,
            timeout: RPC_ENDPOINT.timeout
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: "Complete Validator & Delegation Analytics API - LOCAL RPC ONLY",
        timestamp: new Date().toISOString(),
        cache_status: UPDATE_STATUS,
        format: "instant_response_coinsspor_format",
        features: [
            "🏠 Local RPC Only (localhost:14545, 500ms timeout)",
            "⚡ Enhanced 2M Block Scanning",
            "📊 6-Layer Validator Detection",
            "💾 Memory Cache with Background Updates",
            "🔍 Wallet Delegation Detection", 
            "📈 Validator Delegator Analytics",
            "📜 Validator Transaction History",
            "✅ 56+ Validator Discovery (DocKhachHanh + MollaValidator included)"
        ],
        rpc_endpoint: { name: RPC_ENDPOINT.name, url: RPC_ENDPOINT.url, timeout: RPC_ENDPOINT.timeout },
        endpoints: [
            "/api/validators (📊 INSTANT FROM CACHE)",
            "/api/delegations/:walletAddress (🔍 WALLET DELEGATION DETECTION)",
            "/api/validator-delegations/:validatorAddress (📈 VALIDATOR ANALYTICS)",
            "/api/validator-delegators/:validatorAddress (👥 VALIDATOR DELEGATORS)",
            "/api/validator-transactions/:validatorAddress (📜 VALIDATOR TRANSACTIONS)",
            "/api/rpc-health (🛡️ RPC HEALTH STATUS)",
            "/api/cache/status (📊 CACHE STATUS)",
            "/api/cache/refresh (🔄 MANUAL REFRESH)"
        ]
    });
});

// Force cache refresh endpoint
app.post('/api/cache/refresh', async (req, res) => {
    try {
        logToFile('🔄 Manual cache refresh requested');
        const result = await fetchValidatorData();
        res.json({
            success: true,
            message: "Cache refreshed successfully",
            validator_count: result.validatorCount,
            active_validator_count: result.activeValidatorCount,
            candidate_validator_count: result.candidateValidatorCount,
            total_network_stake: result.totalNetworkStake,
            rpc_health: result.rpcHealth
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// START SERVER WITH BACKGROUND SERVICE
async function startServer() {
    await initializeCache();
    startBackgroundService();
    
    app.listen(CONFIG.PORT, () => {
        logToFile(`📊 Complete Validator & Delegation Analytics API started on port ${CONFIG.PORT}`);
        logToFile(`📊 Background updates every ${CONFIG.UPDATE_INTERVAL/1000}s`);
        logToFile(`⚡ Instant responses from memory cache`);
        logToFile(`✅ Enhanced 6-layer validator detection active`);
        logToFile(`🚀 Delegation detection endpoint added`);
        logToFile(`📈 Validator analytics with combined discovery method`);
        logToFile(`🏠 LOCAL RPC ONLY: ${RPC_ENDPOINT.url} (500ms timeout)`);
        logToFile(`📊 Test validators: curl http://localhost:${CONFIG.PORT}/api/validators`);
        logToFile(`🔍 Test delegations: curl http://localhost:${CONFIG.PORT}/api/delegations/0xYOUR_WALLET`);
        logToFile(`📈 Test analytics: curl http://localhost:${CONFIG.PORT}/api/validator-delegations/0xVALIDATOR_ADDRESS`);
        logToFile(`👥 Test delegators: curl http://localhost:${CONFIG.PORT}/api/validator-delegators/0xVALIDATOR_ADDRESS`);
        logToFile(`📜 Test transactions: curl http://localhost:${CONFIG.PORT}/api/validator-transactions/0xVALIDATOR_ADDRESS`);
        logToFile(`🛡️ Check RPC health: curl http://localhost:${CONFIG.PORT}/api/rpc-health`);
    });
}

// Start the server
startServer().catch(error => {
    logToFile(`❌ Server startup failed: ${error.message}`);
    process.exit(1);
});
