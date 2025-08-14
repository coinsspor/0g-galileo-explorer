import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Interfaces
interface Validator {
    rank: number;
    moniker: string;
    address: string;
    votingPower: number;
    totalStaked: number;
    status: string;
    commissionRate: string;
    identity?: string;
    website?: string;
    avatarUrl?: string;
    ownerAddress?: string;
}

interface DelegationData {
    validator: {
        address: string;
        moniker: string;
        commissionRate: string;
        status: string;
        totalStaked: number;
    };
    delegation: {
        shares: string;
        tokens: number;
        method: string;
    };
}

interface DelegatorInfo {
    address: string;
    staked: number;
    shares: string;
    discoveryMethod: string;
    percentage: number;
    rank: number;
}

interface ValidatorAnalytics {
    success: boolean;
    validator: {
        address: string;
        moniker: string;
        totalStaked: number;
        commissionRate: string;
    };
    delegation_analysis: {
        totalDelegated: number;
        delegatorCount: number;
        scannedAddresses: number;
        activeDelegators: number;
        discoveryMethods: {
            fromEvents: number;
            fromKnownChecks: number;
        };
    };
    statistics: {
        averageStake: number;
        medianStake: number;
        largestStake: number;
        smallestStake: number;
        giniCoefficient: number;
        top10Percentage: number;
        concentration: string;
        stakingDistribution: {
            "Large (>10%)": number;
            "Medium (1-10%)": number;
            "Small (<1%)": number;
        };
    };
    delegators: DelegatorInfo[];
}

interface ManageDelegationProps {
    validators: Validator[];
}

const NETWORK_CONFIG = {
    chainId: '0x40D9',
    chainName: '0G Galileo Testnet',
    nativeCurrency: {
        name: '0G',
        symbol: '0G',
        decimals: 18
    },
    rpcUrls: ['https://0g-evmrpc-galileo.coinsspor.com/'],
    blockExplorerUrls: ['https://0ggalileoexplorer.coinsspor.com/']
};

const ManageDelegation: React.FC<ManageDelegationProps> = ({ validators }) => {
    // State management
    const [currentAccount, setCurrentAccount] = useState<string | null>(null);
    const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
    const [myDelegations, setMyDelegations] = useState<DelegationData[]>([]);
    const [walletBalance, setWalletBalance] = useState<string>('0');
    const [totalStaked, setTotalStaked] = useState<string>('0');
    const [validatorAnalytics, setValidatorAnalytics] = useState<ValidatorAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [delegateAmount, setDelegateAmount] = useState<string>('');
    const [undelegateShares, setUndelegateShares] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const [showAnalytics, setShowAnalytics] = useState(false);
    
    // 🔧 KEYBASE CACHE - App.tsx'ten kopyalandı
    const [keybaseCache, setKeybaseCache] = useState<{[identity: string]: string}>({});
    const [avatarLoadingCount, setAvatarLoadingCount] = useState(0);

    // 🔧 DÜZELTILMIŞ API URL - HTML ile tam uyumlu
    const API_BASE_V1 = (() => {
        if (typeof window !== 'undefined') {
            // Development mode - try multiple endpoints
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:3001';
            }
            // Production mode
            return `http://${window.location.hostname}:3001`;
        }
        return 'http://localhost:3001';
    })();

    // Utility functions
    const formatAmount = (amount: number | string): string => {
        if (!amount) return '0';
        const num = parseFloat(amount.toString());
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    const log = (message: string): void => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        setLogs(prev => [...prev.slice(-49), logMessage]);
        console.log(logMessage);
    };

    // 🔧 KEYBASE AVATAR FETCH - App.tsx'ten tam kopyalandı
    const fetchKeybaseAvatar = async (identity: string): Promise<string> => {
        if (!identity || identity.length < 16) return '';
        
        if (keybaseCache[identity]) {
            return keybaseCache[identity];
        }

        try {
            setAvatarLoadingCount(prev => prev + 1);
            console.log(`🔍 Fetching avatar for identity: ${identity}`);
            
            const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=basics,pictures`);
            if (!response.ok) throw new Error('Keybase API error');
            
            const data = await response.json();
            
            if (data.status.code === 0 && data.them && data.them.length > 0) {
                const user = data.them[0];
                if (user.pictures && user.pictures.primary && user.pictures.primary.url) {
                    const avatarUrl = user.pictures.primary.url;
                    
                    console.log(`🖼 Avatar found for ${identity}: ${avatarUrl}`);
                    
                    setKeybaseCache(prev => ({
                        ...prev,
                        [identity]: avatarUrl
                    }));
                    
                    return avatarUrl;
                } else {
                    console.log(`🚫 No avatar found for ${identity}`);
                }
            } else {
                console.log(`🚫 Keybase user not found for ${identity}`);
            }
        } catch (error) {
            console.log(`🚨 Keybase API error for ${identity}:`, error);
        } finally {
            setAvatarLoadingCount(prev => prev - 1);
        }
        
        return '';
    };

    // 🔧 AVATAR FETCH ALL - App.tsx'ten kopyalandı
    const fetchAllAvatars = async (validators: Validator[]) => {
        const identityValidators = validators.filter(v => v.identity && v.identity.length >= 16);
        
        console.log(`🔍 Starting avatar fetch for ${identityValidators.length} validators with identity...`);
        
        const batchSize = 3;
        for (let i = 0; i < identityValidators.length; i += batchSize) {
            const batch = identityValidators.slice(i, i + batchSize);
            
            await Promise.allSettled(
                batch.map(async (validator) => {
                    if (validator.identity) {
                        await fetchKeybaseAvatar(validator.identity);
                    }
                })
            );
            
            if (i + batchSize < identityValidators.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log(`🎉 Avatar fetching completed. Cache size: ${Object.keys(keybaseCache).length}`);
    };

    // 🔧 DÜZELTILMIŞ Avatar function - App.tsx'teki keybase logic ile
    const getAvatarUrl = (validator: Validator): string => {
        // 🔧 Önce keybase cache'ini kontrol et
        if (validator.identity && keybaseCache[validator.identity]) {
            return keybaseCache[validator.identity];
        }
        
        if (validator.avatarUrl && validator.avatarUrl.startsWith('http')) {
            return validator.avatarUrl;
        }
        
        const letter = validator.moniker ? validator.moniker.charAt(0).toUpperCase() : '🚫';
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
        const colorIndex = validator.rank ? validator.rank % colors.length : 0;
        const color = colors[colorIndex];
        
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="30" fill="${color}"/>
                <text x="30" y="38" text-anchor="middle" fill="white" font-family="system-ui" font-size="24" font-weight="bold">${letter}</text>
            </svg>
        `)}`;
    };

    // Wallet functions
    const connectWallet = async (): Promise<void> => {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask is not installed! Please install MetaMask to continue.');
            return;
        }

        try {
            log('🔗 Connecting to MetaMask...');
            
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            setCurrentAccount(accounts[0]);
            log(`✅ Connected: ${accounts[0]}`);
            
            await fetchBalance(accounts[0]);
            await loadMyDelegations(accounts[0]);
            
        } catch (error: any) {
            log(`❌ Connection failed: ${error.message}`);
        }
    };

    const disconnectWallet = (): void => {
        setCurrentAccount(null);
        setMyDelegations([]);
        setWalletBalance('0');
        setTotalStaked('0');
        setShowAnalytics(false);
        setValidatorAnalytics(null);
        log('🔌 Wallet disconnected');
    };

    const addNetwork = async (): Promise<void> => {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask is not installed!');
            return;
        }

        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [NETWORK_CONFIG]
            });
            log('✅ 0G Network added to MetaMask');
        } catch (error: any) {
            log(`❌ Failed to add network: ${error.message}`);
        }
    };

    const fetchBalance = async (account: string): Promise<void> => {
        if (!account) return;

        try {
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [account, 'latest']
            });
            
            const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
            setWalletBalance(formatAmount(balanceInEth));
            
        } catch (error: any) {
            log(`❌ Balance fetch failed: ${error.message}`);
        }
    };

    // 🔧 DÜZELTILMIŞ API functions - HTML ile uyumlu
    const loadMyDelegations = async (account: string): Promise<void> => {
        if (!account) return;
        
        setLoading(true);
        setError(null);
        try {
            log('📊 Loading wallet delegations...');
            
            // 🔧 Multiple endpoint attempts like HTML
            const endpoints = [
                `${API_BASE_V1}/api/delegations/${account}`,
                `http://localhost:3001/api/delegations/${account}`,
                `/api/delegations/${account}`
            ];

            let lastError: Error | null = null;
            let success = false;

            for (const endpoint of endpoints) {
                try {
                    log(`🔍 Trying endpoint: ${endpoint}`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    
                    const response = await fetch(endpoint, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        mode: 'cors'
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        if (response.status === 404) {
                            log('ℹ️ No delegations found for this wallet');
                            setMyDelegations([]);
                            setTotalStaked('0');
                            success = true;
                            break;
                        }
                        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        setMyDelegations(data.delegations || []);
                        setTotalStaked(formatAmount(data.totalDelegated || 0));
                        log(`✅ ${data.summary || 'Delegations loaded successfully'}`);
                        success = true;
                        break;
                    } else {
                        throw new Error(data.error || 'Unknown error');
                    }
                    
                } catch (error) {
                    lastError = error as Error;
                    log(`⚠️ Failed endpoint ${endpoint}: ${(error as Error).message}`);
                    continue;
                }
            }

            if (!success && lastError) {
                throw lastError;
            }
            
        } catch (error: any) {
            log(`❌ All delegation endpoints failed: ${error.message}`);
            // Don't show error for network issues in development
            if (!error.message.includes('Failed to fetch')) {
                setError(`Failed to load delegations: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // 🎯 DEĞIŞEN FONKSİYON 1: Analytics - API call yerine mevcut verileri kullan
    const loadValidatorAnalytics = async (validatorAddress: string): Promise<void> => {
        if (!validatorAddress) return;
        
        setLoading(true);
        setError(null);
        
        try {
            log(`📊 Generating analytics for validator: ${validatorAddress}`);
            
            // Seçili validator'ı bul
            const validator = validators.find(v => v.address === validatorAddress);
            if (!validator) {
                throw new Error('Validator not found');
            }
            
            // Bu validator ile delegation'ımızı bul
            const validatorDelegation = myDelegations.find(d => d.validator.address === validatorAddress);
            
            if (validatorDelegation) {
                // Kendi delegation'ımızla analytics
                const singleValidatorAnalytics: ValidatorAnalytics = {
                    success: true,
                    validator: {
                        address: validator.address,
                        moniker: validator.moniker,
                        totalStaked: validator.totalStaked,
                        commissionRate: validator.commissionRate
                    },
                    delegation_analysis: {
                        totalDelegated: validatorDelegation.delegation.tokens,
                        delegatorCount: 1,
                        scannedAddresses: 1,
                        activeDelegators: 1,
                        discoveryMethods: { fromEvents: 1, fromKnownChecks: 0 }
                    },
                    statistics: {
                        averageStake: validatorDelegation.delegation.tokens,
                        medianStake: validatorDelegation.delegation.tokens,
                        largestStake: validatorDelegation.delegation.tokens,
                        smallestStake: validatorDelegation.delegation.tokens,
                        giniCoefficient: 0,
                        top10Percentage: 100,
                        concentration: 'Your Delegation',
                        stakingDistribution: {
                            "Large (>10%)": 1,
                            "Medium (1-10%)": 0,
                            "Small (<1%)": 0
                        }
                    },
                    delegators: [{
                        address: currentAccount || 'your-address',
                        staked: validatorDelegation.delegation.tokens,
                        shares: validatorDelegation.delegation.shares,
                        discoveryMethod: 'wallet',
                        percentage: 100,
                        rank: 1
                    }]
                };
                
                setValidatorAnalytics(singleValidatorAnalytics);
                setShowAnalytics(true);
                log(`✅ Analytics generated for ${validator.moniker}: ${formatAmount(validatorDelegation.delegation.tokens)} 0G`);
            } else {
                // Delegation yok ama validator bilgilerini göster
                const noStakeAnalytics: ValidatorAnalytics = {
                    success: true,
                    validator: {
                        address: validator.address,
                        moniker: validator.moniker,
                        totalStaked: validator.totalStaked,
                        commissionRate: validator.commissionRate
                    },
                    delegation_analysis: {
                        totalDelegated: 0,
                        delegatorCount: 0,
                        scannedAddresses: 0,
                        activeDelegators: 0,
                        discoveryMethods: { fromEvents: 0, fromKnownChecks: 0 }
                    },
                    statistics: {
                        averageStake: 0,
                        medianStake: 0,
                        largestStake: 0,
                        smallestStake: 0,
                        giniCoefficient: 0,
                        top10Percentage: 0,
                        concentration: 'No Delegation',
                        stakingDistribution: {
                            "Large (>10%)": 0,
                            "Medium (1-10%)": 0,
                            "Small (<1%)": 0
                        }
                    },
                    delegators: []
                };
                
                setValidatorAnalytics(noStakeAnalytics);
                setShowAnalytics(true);
                log(`ℹ️ No delegation found with ${validator.moniker}`);
            }
            
        } catch (error: any) {
            log(`❌ Analytics generation failed: ${error.message}`);
            setError(`Failed to generate analytics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 🎯 EKLENEN FONKSİYON 2: Portfolio Analytics
    const showPortfolioAnalytics = (): void => {
        console.log('📊 Showing portfolio analytics with existing data');
        
        // Mevcut delegation verilerinden analytics oluştur
        if (!myDelegations || myDelegations.length === 0) {
            alert('No delegation data available. Please connect your wallet and check your delegations.');
            return;
        }

        // Portfolio analizi
        const portfolioAnalysis = {
            totalStaked: parseFloat(totalStaked.replace(/,/g, '')),
            validatorCount: myDelegations.length,
            avgStakePerValidator: myDelegations.reduce((sum, d) => sum + d.delegation.tokens, 0) / myDelegations.length,
            maxStake: Math.max(...myDelegations.map(d => d.delegation.tokens)),
            minStake: Math.min(...myDelegations.map(d => d.delegation.tokens)),
            avgCommission: myDelegations.reduce((sum, d) => {
                const comm = parseFloat(d.validator.commissionRate?.replace('%', '') || '5');
                return sum + comm;
            }, 0) / myDelegations.length
        };

        // Analytics data'sını hazırla
        const analyticsData: ValidatorAnalytics = {
            success: true,
            validator: {
                address: 'portfolio',
                moniker: 'My Portfolio',
                totalStaked: portfolioAnalysis.totalStaked,
                commissionRate: `${portfolioAnalysis.avgCommission.toFixed(2)}%`
            },
            delegation_analysis: {
                totalDelegated: portfolioAnalysis.totalStaked,
                delegatorCount: 1, // Sen
                scannedAddresses: 1,
                activeDelegators: 1,
                discoveryMethods: {
                    fromEvents: 1,
                    fromKnownChecks: 0
                }
            },
            statistics: {
                averageStake: portfolioAnalysis.avgStakePerValidator,
                medianStake: portfolioAnalysis.avgStakePerValidator,
                largestStake: portfolioAnalysis.maxStake,
                smallestStake: portfolioAnalysis.minStake,
                giniCoefficient: 0.3, // Varsayılan
                top10Percentage: 100, // Hepsi senin
                concentration: 'Personal Portfolio',
                stakingDistribution: {
                    "Large (>10%)": myDelegations.filter(d => (d.delegation.tokens / portfolioAnalysis.totalStaked * 100) > 10).length,
                    "Medium (1-10%)": myDelegations.filter(d => {
                        const pct = d.delegation.tokens / portfolioAnalysis.totalStaked * 100;
                        return pct >= 1 && pct <= 10;
                    }).length,
                    "Small (<1%)": myDelegations.filter(d => (d.delegation.tokens / portfolioAnalysis.totalStaked * 100) < 1).length
                }
            },
            delegators: myDelegations.map((del, index) => ({
                address: del.validator.address,
                staked: del.delegation.tokens,
                shares: del.delegation.shares,
                discoveryMethod: 'wallet',
                percentage: (del.delegation.tokens / portfolioAnalysis.totalStaked) * 100,
                rank: index + 1
            }))
        };

        setValidatorAnalytics(analyticsData);
        setShowAnalytics(true);
        
        // Analytics bölümüne scroll
        setTimeout(() => {
            const analyticsElement = document.getElementById('validator-analytics-section');
            if (analyticsElement) {
                analyticsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 500);
        
        log(`✅ Portfolio analytics generated: ${myDelegations.length} validators, ${formatAmount(portfolioAnalysis.totalStaked)} 0G total`);
    };

    // Staking operations
    const prepareDelegate = async (): Promise<void> => {
        if (!currentAccount) {
            alert('Please connect your wallet first!');
            return;
        }
        
        if (!selectedValidator) {
            alert('Please select a validator first!');
            return;
        }
        
        if (!delegateAmount || parseFloat(delegateAmount) <= 0) {
            alert('Please enter a valid amount!');
            return;
        }

        try {
            log(`🚀 Delegating ${delegateAmount} 0G to ${selectedValidator.moniker}...`);
            
            const amountInWei = (parseFloat(delegateAmount) * Math.pow(10, 18)).toString();
            const functionSignature = '0x5c19a95c';
            const delegatorParam = currentAccount.slice(2).padStart(64, '0');
            const callData = functionSignature + delegatorParam;
            
            const txParams = {
                from: currentAccount,
                to: selectedValidator.address,
                value: '0x' + BigInt(amountInWei).toString(16),
                data: callData
            };
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });
            
            log(`✅ Delegate transaction sent! Hash: ${txHash}`);
            log(`🔗 Explorer: https://0ggalileoexplorer.coinsspor.com/tx/${txHash}`);
            
            setDelegateAmount('');
            
            // Refresh data after transaction
            setTimeout(async () => {
                await refreshAllData();
            }, 3000);
            
        } catch (error: any) {
            log(`❌ Delegate failed: ${error.message}`);
        }
    };

    const prepareUndelegate = async (): Promise<void> => {
        if (!currentAccount) {
            alert('Please connect your wallet first!');
            return;
        }
        
        if (!selectedValidator) {
            alert('Please select a validator first!');
            return;
        }
        
        if (!undelegateShares || parseFloat(undelegateShares) <= 0) {
            alert('Please enter valid shares!');
            return;
        }

        try {
            log(`⚠️ Undelegating ${undelegateShares} shares from ${selectedValidator.moniker}...`);
            
            const withdrawalFee = '1000000000';
            const sharesInWei = (parseFloat(undelegateShares) * Math.pow(10, 18)).toString();
            
            const undelegateMethodId = '0x4d99dd16';
            const withdrawalAddressParam = currentAccount.slice(2).padStart(64, '0');
            const sharesParam = BigInt(sharesInWei).toString(16).padStart(64, '0');
            const callData = undelegateMethodId + withdrawalAddressParam + sharesParam;
            
            const txParams = {
                from: currentAccount,
                to: selectedValidator.address,
                value: '0x' + BigInt(withdrawalFee).toString(16),
                data: callData
            };
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });
            
            log(`✅ Undelegate transaction sent! Hash: ${txHash}`);
            log(`🔗 Explorer: https://0ggalileoexplorer.coinsspor.com/tx/${txHash}`);
            
            setUndelegateShares('');
            
            // Refresh data after transaction
            setTimeout(async () => {
                await refreshAllData();
            }, 3000);
            
        } catch (error: any) {
            log(`❌ Undelegate failed: ${error.message}`);
        }
    };

    const refreshAllData = async (): Promise<void> => {
        log('🔄 Refreshing all data...');
        
        if (currentAccount) {
            await fetchBalance(currentAccount);
            await loadMyDelegations(currentAccount);
        }
        
        if (selectedValidator && showAnalytics) {
            await loadValidatorAnalytics(selectedValidator.address);
        }
        
        log('✅ All data refreshed successfully!');
    };

    // Event handlers
    const selectValidator = (validator: Validator): void => {
        setSelectedValidator(validator);
        setShowAnalytics(false); // Reset analytics view
        log(`🎯 Selected validator: ${validator.moniker}`);
    };

    // 🔧 DÜZELTILMIŞ Analytics function with scroll
    const showValidatorAnalytics = (validator: Validator): void => {
        setSelectedValidator(validator);
        loadValidatorAnalytics(validator.address);
        log(`📊 Opening analytics for: ${validator.moniker}`);
        
        // 📊 Scroll to analytics section after loading
        setTimeout(() => {
            const analyticsElement = document.getElementById('validator-analytics-section');
            if (analyticsElement) {
                analyticsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 800); // Biraz daha fazla bekle ki analytics yüklensin
    };

    // 🔧 DÜZELTILMIŞ Pie chart data generation - Portfolio destekli
    const generatePieChartData = () => {
        if (!validatorAnalytics) return [];

        // Portfolio analytics mı yoksa validator analytics mi?
        if (validatorAnalytics.validator.address === 'portfolio') {
            // Portfolio mode - her validator ayrı renk
            return myDelegations.map((delegation, index) => ({
                name: `${delegation.validator.moniker} (${((delegation.delegation.tokens / parseFloat(totalStaked.replace(/,/g, ''))) * 100).toFixed(1)}%)`,
                value: delegation.delegation.tokens,
                address: delegation.validator.address,
                rank: index + 1,
                isCurrentUser: true, // Portfolio'da hepsi kullanıcının
                validatorName: delegation.validator.moniker
            }));
        } else {
            // Single validator mode - delegator bazlı
            if (!validatorAnalytics.delegators.length) return [];

            const top5Delegators = validatorAnalytics.delegators.slice(0, 5);
            const others = validatorAnalytics.delegators.slice(5);
            const othersTotal = others.reduce((sum, d) => sum + d.staked, 0);

            const data = [
                ...top5Delegators.map((d, i) => ({
                    name: `#${i + 1} (${d.percentage.toFixed(1)}%)`,
                    value: d.staked,
                    address: d.address,
                    rank: d.rank,
                    isCurrentUser: currentAccount && d.address.toLowerCase() === currentAccount.toLowerCase()
                })),
                ...(othersTotal > 0 ? [{
                    name: `Others (${((othersTotal / validatorAnalytics.delegation_analysis.totalDelegated) * 100).toFixed(1)}%)`,
                    value: othersTotal,
                    address: '',
                    rank: 0,
                    isCurrentUser: false
                }] : [])
            ];

            return data;
        }
    };

    // Colors for pie chart - Daha fazla renk
    const COLORS = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];

    // Custom tooltip for pie chart with better readability
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: 'white',
                    padding: '12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    color: '#1f2937'
                }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', color: '#1f2937' }}>
                        {data.validatorName || data.name}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: '#059669' }}>
                        {formatAmount(data.value)} 0G
                    </p>
                    {data.isCurrentUser && !data.validatorName && (
                        <p style={{ margin: '0', color: '#10B981', fontWeight: 'bold', fontSize: '14px' }}>👤 YOU</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Auto-connect wallet on mount
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) {
                        setCurrentAccount(accounts[0]);
                        fetchBalance(accounts[0]);
                        loadMyDelegations(accounts[0]);
                        log('🔗 Wallet auto-connected');
                    }
                })
                .catch(() => console.log('No wallet auto-connection'));

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setCurrentAccount(accounts[0]);
                    fetchBalance(accounts[0]);
                    loadMyDelegations(accounts[0]);
                    log(`🔄 Account changed to: ${accounts[0]}`);
                } else {
                    disconnectWallet();
                }
            });
        }
    }, []);

    // 🔧 AVATAR FETCH when validators change - App.tsx logic
    useEffect(() => {
        if (validators && validators.length > 0) {
            // Delay avatar fetching a bit to avoid overwhelming keybase API
            setTimeout(() => {
                fetchAllAvatars(validators);
            }, 1000);
        }
    }, [validators]);

    // 🔧 Log keybase cache updates
    useEffect(() => {
        console.log(`🎉 Keybase cache updated. Total cached avatars: ${Object.keys(keybaseCache).length}`);
    }, [keybaseCache]);

    return (
        <div style={{ color: 'white', padding: '20px' }}>
            {/* 🔧 CSS Animations for Avatar Loading */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .avatar-pulse {
                    animation: pulse 2s infinite;
                }
            `}</style>
            
            {/* Header */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '30px',
                borderRadius: '15px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    🚀 0G Staking Management
                </h2>
                <p style={{ opacity: '0.9' }}>
                    Complete staking solution with live analytics and portfolio tracking
                </p>
            </div>

            {/* Main Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                {/* Wallet Connection */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '25px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <h3 style={{ marginBottom: '20px' }}>
                        💼 Wallet Connection & Balance
                    </h3>
                    <div style={{ marginBottom: '15px' }}>
                        <p><strong>Status:</strong> <span style={{ color: currentAccount ? '#10B981' : '#EF4444' }}>
                            {currentAccount ? 'Connected' : 'Not Connected'}
                        </span></p>
                        <p><strong>Address:</strong> {currentAccount ? 
                            `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` : '-'}</p>
                        <p><strong>💰 0G Balance:</strong> {walletBalance} 0G</p>
                        <p><strong>📊 Total Staked:</strong> {totalStaked} 0G</p>
                        <p><strong>🎯 Delegated Validators:</strong> {myDelegations.length}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {!currentAccount ? (
                            <button
                                onClick={connectWallet}
                                style={{
                                    background: '#10B981',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Connect MetaMask
                            </button>
                        ) : (
                            <button
                                onClick={disconnectWallet}
                                style={{
                                    background: '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Disconnect
                            </button>
                        )}
                        <button
                            onClick={addNetwork}
                            style={{
                                background: '#F59E0B',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Add 0G Network
                        </button>
                        <button
                            onClick={refreshAllData}
                            style={{
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Validator Selection */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '25px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <h3 style={{ marginBottom: '20px' }}>
                        🎯 Validator Selection
                    </h3>
                    
                    {/* Selected Validator Info Box */}
                    {selectedValidator && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            color: 'white'
                        }}>
                            <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '14px' }}>
                                ✅ Selected Validator for Operations:
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img
                                    src={getAvatarUrl(selectedValidator)}
                                    alt={`${selectedValidator.moniker} avatar`}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #10B981'
                                    }}
                                />
                                <div>
                                    <p style={{ margin: '0', fontWeight: 'bold', color: 'white' }}>
                                        {selectedValidator.moniker}
                                    </p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                                        Commission: {selectedValidator.commissionRate} | 
                                        Total: {formatAmount(selectedValidator.totalStaked)} 0G
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Select Validator:
                        </label>
                        <select
                            value={selectedValidator?.address || ''}
                            onChange={(e) => {
                                const validator = validators.find(v => v.address === e.target.value);
                                if (validator) selectValidator(validator);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '14px'
                            }}
                        >
                            <option value="" style={{ background: '#1f2937', color: 'white' }}>
                                Select a validator...
                            </option>
                            {validators.filter(v => v.status === 'Aktif').map(validator => (
                                <option 
                                    key={validator.address} 
                                    value={validator.address}
                                    style={{ background: '#1f2937', color: 'white' }}
                                >
                                    {validator.moniker} ({validator.commissionRate}) - {formatAmount(validator.totalStaked)} 0G
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {selectedValidator && (
                        <button
                            onClick={() => showValidatorAnalytics(selectedValidator)}
                            style={{
                                background: '#8B5CF6',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                width: '100%'
                            }}
                        >
                            📊 View Validator Analytics
                        </button>
                    )}
                </div>
            </div>

            {/* Staking Operations */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '30px'
            }}>
                <h3 style={{ marginBottom: '20px' }}>
                    ⚡ Staking Operations
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Delegate */}
                    <div>
                        <h4 style={{ marginBottom: '15px' }}>
                            📈 Delegate
                        </h4>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                Amount (0G):
                            </label>
                            <input
                                type="number"
                                value={delegateAmount}
                                onChange={(e) => setDelegateAmount(e.target.value)}
                                placeholder="Enter amount to delegate"
                                step="0.001"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <button
                            onClick={prepareDelegate}
                            disabled={!currentAccount || !selectedValidator}
                            style={{
                                background: !currentAccount || !selectedValidator ? '#6B7280' : '#10B981',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                cursor: !currentAccount || !selectedValidator ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                width: '100%'
                            }}
                        >
                            🚀 Delegate Now
                        </button>
                    </div>

                    {/* Undelegate */}
                    <div>
                        <h4 style={{ marginBottom: '15px' }}>
                            📉 Undelegate
                        </h4>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                Shares:
                            </label>
                            <input
                                type="number"
                                value={undelegateShares}
                                onChange={(e) => setUndelegateShares(e.target.value)}
                                placeholder="Enter shares to undelegate"
                                step="0.001"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <button
                            onClick={prepareUndelegate}
                            disabled={!currentAccount || !selectedValidator}
                            style={{
                                background: !currentAccount || !selectedValidator ? '#6B7280' : '#F59E0B',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                cursor: !currentAccount || !selectedValidator ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                width: '100%'
                            }}
                        >
                            ⚠️ Undelegate Now
                        </button>
                    </div>
                </div>
            </div>

            {/* My Delegations - Enhanced */}
            {currentAccount && myDelegations.length > 0 && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    color: '#1f2937'
                }}>
                    <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
                        💎 My Active Delegations
                    </h3>
                    
                    {/* Summary with Portfolio Analytics Button */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ color: '#1f2937' }}>📊 Portfolio Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{totalStaked}</div>
                                <div style={{ fontSize: '12px', color: '#1f2937' }}>Total Staked (0G)</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{myDelegations.length}</div>
                                <div style={{ fontSize: '12px', color: '#1f2937' }}>Delegated Validators</div>
                            </div>
                        </div>
                        
                        {/* 🆕 Portfolio Analytics Butonu */}
                        <button
                            onClick={showPortfolioAnalytics}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                                width: '100%',
                                marginTop: '15px'
                            }}
                            onMouseEnter={(e) => { 
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                            }}
                            onMouseLeave={(e) => { 
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                            }}
                        >
                            📊 View Portfolio Analytics
                        </button>
                    </div>

                    {/* Enhanced Delegations List with Avatars */}
                    <h4 style={{ color: '#1f2937', marginBottom: '15px' }}>💎 Your Active Stakes:</h4>
                    {myDelegations.map((delegation, index) => {
                        // Find validator to get avatar data
                        const validatorInfo = validators.find(v => v.address === delegation.validator.address) || {
                            moniker: delegation.validator.moniker,
                            address: delegation.validator.address,
                            rank: index + 1,
                            identity: undefined,
                            avatarUrl: undefined
                        } as Validator;

                        return (
                            <div key={index} style={{
                                background: 'rgba(255,255,255,0.95)',
                                color: '#1f2937',
                                padding: '20px',
                                margin: '10px 0',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {/* 👤 Avatar Added with Keybase Support */}
                                    <img
                                        src={getAvatarUrl(validatorInfo)}
                                        alt={`${delegation.validator.moniker} avatar`}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '2px solid #10B981'
                                        }}
                                        className={validatorInfo.identity && !keybaseCache[validatorInfo.identity] ? 'avatar-pulse' : ''}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            console.log(`🚨 Avatar error for ${delegation.validator.moniker}, falling back to SVG`);
                                            target.src = getAvatarUrl({ ...validatorInfo, identity: undefined, avatarUrl: undefined });
                                        }}
                                    />
                                    <div>
                                        <strong style={{ fontSize: '18px', color: '#1f2937' }}>🎯 {delegation.validator.moniker}</strong>
                                        <br />
                                        <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '16px' }}>
                                            💰 {formatAmount(delegation.delegation.tokens)} 0G
                                        </span>
                                        <br />
                                        <small style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {delegation.validator.address.slice(0, 8)}...{delegation.validator.address.slice(-8)}
                                        </small>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ 
                                        background: '#10B981', 
                                        color: 'white', 
                                        padding: '6px 12px', 
                                        borderRadius: '6px', 
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {delegation.validator.status}
                                    </span>
                                    <br />
                                    <small style={{ color: '#1f2937', marginTop: '5px', display: 'block' }}>
                                        Commission: {delegation.validator.commissionRate}
                                    </small>
                                    <br />
                                    <button
                                        onClick={() => {
                                            const validator = validators.find(v => v.address === delegation.validator.address);
                                            if (validator) {
                                                // Bu delegation için analytics
                                                const singleDelegationAnalytics: ValidatorAnalytics = {
                                                    success: true,
                                                    validator: {
                                                        address: delegation.validator.address,
                                                        moniker: delegation.validator.moniker,
                                                        totalStaked: delegation.validator.totalStaked || delegation.delegation.tokens,
                                                        commissionRate: delegation.validator.commissionRate
                                                    },
                                                    delegation_analysis: {
                                                        totalDelegated: delegation.delegation.tokens,
                                                        delegatorCount: 1,
                                                        scannedAddresses: 1,
                                                        activeDelegators: 1,
                                                        discoveryMethods: { fromEvents: 1, fromKnownChecks: 0 }
                                                    },
                                                    statistics: {
                                                        averageStake: delegation.delegation.tokens,
                                                        medianStake: delegation.delegation.tokens,
                                                        largestStake: delegation.delegation.tokens,
                                                        smallestStake: delegation.delegation.tokens,
                                                        giniCoefficient: 0,
                                                        top10Percentage: 100,
                                                        concentration: 'Your Delegation',
                                                        stakingDistribution: {
                                                            "Large (>10%)": 1,
                                                            "Medium (1-10%)": 0,
                                                            "Small (<1%)": 0
                                                        }
                                                    },
                                                    delegators: [{
                                                        address: currentAccount || 'your-address',
                                                        staked: delegation.delegation.tokens,
                                                        shares: delegation.delegation.shares,
                                                        discoveryMethod: 'wallet',
                                                        percentage: 100,
                                                        rank: 1
                                                    }]
                                                };
                                                
                                                setValidatorAnalytics(singleDelegationAnalytics);
                                                setShowAnalytics(true);
                                                
                                                setTimeout(() => {
                                                    const analyticsElement = document.getElementById('validator-analytics-section');
                                                    if (analyticsElement) {
                                                        analyticsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }
                                                }, 500);
                                                
                                                log(`📊 Delegation analytics: ${delegation.validator.moniker}, ${formatAmount(delegation.delegation.tokens)} 0G`);
                                            }
                                        }}
                                        style={{
                                            background: '#8B5CF6',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            marginTop: '5px',
                                            marginRight: '5px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        📊 Analytics
                                    </button>
                                    <button
                                        onClick={() => {
                                            const validator = validators.find(v => v.address === delegation.validator.address);
                                            if (validator) selectValidator(validator);
                                        }}
                                        style={{
                                            background: selectedValidator?.address === delegation.validator.address ? '#059669' : '#10B981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            cursor: selectedValidator?.address === delegation.validator.address ? 'default' : 'pointer',
                                            marginTop: '5px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {selectedValidator?.address === delegation.validator.address ? '✅ Selected' : '✅ Select'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 🔧 ENHANCED Validator Analytics with Better Readability */}
            {validatorAnalytics && showAnalytics && (
                <div 
                    id="validator-analytics-section"
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        padding: '25px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        color: '#1f2937'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#1f2937' }}>
                            📊 Validator Analytics: {validatorAnalytics.validator.moniker}
                        </h3>
                        <button
                            onClick={() => setShowAnalytics(false)}
                            style={{
                                background: '#6B7280',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ✕ Close
                        </button>
                    </div>
                    
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ background: '#F8FAFC', color: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                                {validatorAnalytics.delegation_analysis.delegatorCount}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1f2937' }}>Total Delegators</div>
                        </div>
                        <div style={{ background: '#F8FAFC', color: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                                {formatAmount(validatorAnalytics.delegation_analysis.totalDelegated)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1f2937' }}>Total Delegated (0G)</div>
                        </div>
                        <div style={{ background: '#F8FAFC', color: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                                {formatAmount(validatorAnalytics.statistics.averageStake)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1f2937' }}>Average Stake (0G)</div>
                        </div>
                        <div style={{ background: '#F8FAFC', color: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                                {validatorAnalytics.statistics.concentration}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1f2937' }}>Concentration Level</div>
                        </div>
                    </div>

                    {/* Enhanced Pie Chart and Delegator Table */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Enhanced Pie Chart with Better Readability */}
                        <div style={{ 
                            background: '#FFFFFF', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            border: '1px solid #E2E8F0'
                        }}>
                            <h4 style={{ color: '#1f2937', marginBottom: '15px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                🥧 {validatorAnalytics.validator.address === 'portfolio' ? 'Portfolio Distribution' : 'Delegation Distribution'}
                            </h4>
                            {generatePieChartData().length > 0 && (
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={generatePieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={120}
                                            dataKey="value"
                                            label={({name, percentage}) => `${name}`}
                                            labelLine={false}
                                        >
                                            {generatePieChartData().map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={COLORS[index % COLORS.length]}
                                                    stroke="#FFFFFF"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            content={<CustomTooltip />}
                                            contentStyle={{
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                color: '#1f2937'
                                            }}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            height={36}
                                            wrapperStyle={{ color: '#1f2937', fontSize: '12px' }}
                                            formatter={(value, entry) => {
                                                return (
                                                    <span style={{ 
                                                        color: '#1f2937',
                                                        fontSize: '12px'
                                                    }}>
                                                        {value}
                                                    </span>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Enhanced Top Delegators Table */}
                        <div style={{ 
                            background: '#FFFFFF', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            border: '1px solid #E2E8F0'
                        }}>
                            <h4 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                                🏆 Top Delegators
                            </h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {validatorAnalytics.delegators.slice(0, 10).map((delegator, index) => (
                                    <div key={delegator.address} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        borderBottom: '1px solid #E5E7EB',
                                        color: '#1f2937',
                                        fontSize: '13px',
                                        background: currentAccount && delegator.address.toLowerCase() === currentAccount.toLowerCase() ? 
                                            'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        borderRadius: '6px',
                                        margin: '2px 0'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <strong style={{ color: '#1f2937' }}>#{delegator.rank}</strong>
                                                {currentAccount && delegator.address.toLowerCase() === currentAccount.toLowerCase() && (
                                                    <span style={{ 
                                                        color: '#10B981', 
                                                        fontWeight: 'bold',
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px'
                                                    }}>
                                                        👤 YOU
                                                    </span>
                                                )}
                                            </div>
                                            <code style={{ fontSize: '11px', color: '#6B7280' }}>
                                                {delegator.address.slice(0, 8)}...{delegator.address.slice(-6)}
                                            </code>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ color: '#059669', fontSize: '14px' }}>{formatAmount(delegator.staked)} 0G</strong>
                                            <br />
                                            <span style={{ 
                                                fontSize: '11px', 
                                                color: '#1f2937',
                                                background: '#F3F4F6',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                {delegator.percentage.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Statistics */}
                    <div style={{
                        background: '#FFFFFF',
                        color: '#1f2937',
                        padding: '20px',
                        borderRadius: '12px',
                        marginTop: '20px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: '1px solid #E2E8F0'
                    }}>
                        <h4 style={{ marginBottom: '15px', color: '#1f2937' }}>📊 Advanced Statistical Analysis:</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', fontSize: '14px' }}>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>💰 Largest Stake:</strong><br />
                                <span style={{ color: '#059669', fontSize: '16px', fontWeight: 'bold' }}>{formatAmount(validatorAnalytics.statistics.largestStake)} 0G</span>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>💰 Smallest Stake:</strong><br />
                                <span style={{ color: '#8B5CF6', fontSize: '16px', fontWeight: 'bold' }}>{formatAmount(validatorAnalytics.statistics.smallestStake)} 0G</span>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>📈 Median Stake:</strong><br />
                                <span style={{ color: '#3B82F6', fontSize: '16px', fontWeight: 'bold' }}>{formatAmount(validatorAnalytics.statistics.medianStake)} 0G</span>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>📊 Gini Coefficient:</strong><br />
                                <span style={{ color: '#F59E0B', fontSize: '16px', fontWeight: 'bold' }}>{validatorAnalytics.statistics.giniCoefficient.toFixed(3)}</span>
                                <small style={{ display: 'block', color: '#6B7280' }}>0=equal, 1=concentrated</small>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>🏆 Top 10% Controls:</strong><br />
                                <span style={{ color: '#EF4444', fontSize: '16px', fontWeight: 'bold' }}>{validatorAnalytics.statistics.top10Percentage.toFixed(1)}%</span>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                <strong style={{ color: '#1f2937' }}>📊 Large Delegators:</strong><br />
                                <span style={{ color: '#059669', fontSize: '16px', fontWeight: 'bold' }}>{validatorAnalytics.statistics.stakingDistribution["Large (>10%)"]}</span>
                                <small style={{ display: 'block', color: '#6B7280' }}>&gt;10% of total</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    padding: '15px',
                    borderRadius: '8px',
                    marginTop: '20px'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(59, 130, 246, 0.9)',
                    color: 'white',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    zIndex: 1000
                }}>
                    🔄 Loading...
                </div>
            )}

            {/* 🔧 ENHANCED Logs Display - KALDIRILDI */}
        </div>
    );
};

export default ManageDelegation;
