import { useState, useEffect } from 'react';
import './styles/global.css';
import UptimeGrid from './components/UptimeGrid';
import ManageDelegation from './components/ManageDelegation'; // 🆕 EKLENEN İMPORT

// Validator interface'ini genişlet
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
    securityContact?: string;
    publicKey?: string;
    details?: string;
    selfDelegation?: number;
    description?: string;
    commission?: {
        commission_rates: {
            rate: string;
            max_rate: string;
            max_change_rate: string;
        };
        update_time: string;
    };
    consensusAddress?: string;
    operatorAddress?: string;
    jailed?: boolean;
    tokens?: string;
    delegatorShares?: string;
    unbondingHeight?: string;
    unbondingTime?: string;
    minSelfDelegation?: string;
}

// 🆕 Delegator Interface
interface Delegator {
    rank: number;
    address: string;
    staked: number;
    percentage: string;
    shortAddress: string;
    shares?: string;
}

// 🆕 Transaction Interface
interface Transaction {
    hash: string;
    type: string;
    status: string;
    amount: string;
    from: string;
    to: string;
    gasUsed: number;
    gasPrice: number;
    blockNumber: number;
    timestamp: number;
    date: string;
    shortHash: string;
    shortFrom: string;
}

// 🆕 Validator Details Interface
interface ValidatorDetails {
    delegators: {
        total: number;
        totalStaked: number;
        list: Delegator[];
    } | null;
    transactions: {
        total: number;
        recent: Transaction[];
        summary: {
            total: number;
            createValidator: number;
            delegate: number;
            undelegate: number;
            withdraw: number;
            updateCommission: number;
            redelegate: number;
            others: number;
            successful: number;
            failed: number;
        };
        categories: {
            [key: string]: number;
        };
    } | null;
    loadingDelegators: boolean;
    loadingTransactions: boolean;
    errorDelegators: string | null;
    errorTransactions: string | null;
}

// 🆕 Blockchain Statistics Interface
interface BlockchainStats {
    currentBlock: number;
    totalAccounts: number;
    totalTransactions: number;
    tps: number;
    gasPrice: number;
    blockTime: number;
    blockTransactions: number;
    gasUsed: number;
    activeValidators: number;
    networkHealth: string;
}

interface ValidatorData {
    source?: string;
    retrievedAt?: string;
    validatorCount?: number;
    network: string;
    chain_name: string;
    last_updated: string;
    total_validators: number;
    total_voting_power: number;
    validators: Validator[];
}

interface KeybaseCache {
    [identity: string]: string;
}

function App() {
    const [loading, setLoading] = useState(true);
    const [validatorData, setValidatorData] = useState<ValidatorData | null>(null);
    const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [keybaseCache, setKeybaseCache] = useState<KeybaseCache>({});
    const [avatarLoadingCount, setAvatarLoadingCount] = useState(0);
    const [refreshTimeLeft, setRefreshTimeLeft] = useState(45);
    const [activeTab, setActiveTab] = useState<'validators' | 'uptime' | 'explorer' | 'delegation'>('validators'); // 🆕 GÜNCELLENEN TYPE

    // 🆕 Validator Details State
    const [validatorDetails, setValidatorDetails] = useState<{ [address: string]: ValidatorDetails }>({});
    const [selectedValidatorTab, setSelectedValidatorTab] = useState<'info' | 'delegators' | 'transactions'>('info');

    // 🆕 Blockchain Stats State
    const [blockchainStats, setBlockchainStats] = useState<BlockchainStats | null>(null);
    const [blockchainLoading, setBlockchainLoading] = useState(false);
    const [blockchainError, setBlockchainError] = useState<string | null>(null);

    // 🔧 API URL Functions - İki farklı API için
    const getValidatorApiUrl = (endpoint: string): string => {
        return `/api/${endpoint}`;
    };

    const getBlockchainApiUrl = (endpoint: string): string => {
        return `/api/v2/${endpoint}`;
    };

    const getDelegatorsApiUrl = (validatorAddress: string): string => {
        return getValidatorApiUrl(`validator-delegators/${validatorAddress}`);
    };

    const getTransactionsApiUrl = (validatorAddress: string): string => {
        return getValidatorApiUrl(`validator-transactions/${validatorAddress}`);
    };

    const getApiUrl = (): string => {
        return getValidatorApiUrl('validators');
    };

    // 🆕 Fetch Validator Delegators
    const fetchValidatorDelegators = async (validatorAddress: string): Promise<void> => {
        if (validatorDetails[validatorAddress]?.delegators) return; // Already loaded

        setValidatorDetails(prev => ({
            ...prev,
            [validatorAddress]: {
                ...prev[validatorAddress],
                loadingDelegators: true,
                errorDelegators: null
            }
        }));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch(getDelegatorsApiUrl(validatorAddress), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.delegators) {
                setValidatorDetails(prev => ({
                    ...prev,
                    [validatorAddress]: {
                        ...prev[validatorAddress],
                        delegators: data.delegators,
                        loadingDelegators: false,
                        errorDelegators: null
                    }
                }));
            } else {
                throw new Error(data.error || 'Failed to fetch delegators');
            }
        } catch (error) {
            console.error('Error fetching delegators:', error);
            setValidatorDetails(prev => ({
                ...prev,
                [validatorAddress]: {
                    ...prev[validatorAddress],
                    loadingDelegators: false,
                    errorDelegators: (error as Error).message
                }
            }));
        }
    };

    // 🆕 Fetch Validator Transactions
    const fetchValidatorTransactions = async (validatorAddress: string): Promise<void> => {
        if (validatorDetails[validatorAddress]?.transactions) return; // Already loaded

        setValidatorDetails(prev => ({
            ...prev,
            [validatorAddress]: {
                ...prev[validatorAddress],
                loadingTransactions: true,
                errorTransactions: null
            }
        }));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch(getTransactionsApiUrl(validatorAddress), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.transactions) {
                setValidatorDetails(prev => ({
                    ...prev,
                    [validatorAddress]: {
                        ...prev[validatorAddress],
                        transactions: data.transactions,
                        loadingTransactions: false,
                        errorTransactions: null
                    }
                }));
            } else {
                throw new Error(data.error || 'Failed to fetch transactions');
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setValidatorDetails(prev => ({
                ...prev,
                [validatorAddress]: {
                    ...prev[validatorAddress],
                    loadingTransactions: false,
                    errorTransactions: (error as Error).message
                }
            }));
        }
    };

    // 🔧 DÜZELTILMIŞ Blockchain Stats API Fetch
    const fetchBlockchainStats = async (): Promise<void> => {
        console.log('🔍 fetchBlockchainStats BAŞLADI');
        setBlockchainLoading(true);
        setBlockchainError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // 🔍 Blockchain Stats API endpoint (port 3002)
            const endpoint = getBlockchainApiUrl('blockchain/stats');
            console.log(`🔍 Trying endpoint: ${endpoint}`);
            
            const response = await fetch(endpoint, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📊 Raw API Response:', data);

            // 🔍 Detailed data validation
            if (data && data.success && data.data) {
                console.log('✅ Data validation passed');
                console.log('📊 Raw blockchain data:', data.data);
                
                // 🔧 DÜZELTILMIŞ FIELD MAPPING!
                const newStats = {
                    currentBlock: data.data.blockHeight || 3711375,           // ✅ blockHeight -> currentBlock
                    totalAccounts: 16234567,                                 // Static for now
                    totalTransactions: 199876543,                           // Static for now
                    tps: data.data.tps || 32.6,                            // ✅ Doğru
                    gasPrice: (data.data.gasPrice / 1e9) || 4.2,           // ✅ Wei'den Gwei'ye çevir
                    blockTime: data.data.blockTime || 1.6,                 // ✅ Doğru  
                    blockTransactions: data.data.transactionCount || 127,   // ✅ transactionCount -> blockTransactions
                    gasUsed: data.data.gasUsed || 2845632,                 // ✅ Doğru
                    activeValidators: 21,                                   // Will be updated from validator API
                    networkHealth: data.data.dataSource === 'live' ? 'Excellent' : 'Live'
                };
                
                console.log('🎯 Prepared stats object:', newStats);
                console.log('🔄 Calling setBlockchainStats...');
                
                setBlockchainStats(newStats);
                
                console.log('✅ setBlockchainStats called successfully');
                console.log('✅ Blockchain stats updated successfully');
            } else {
                console.error('❌ Data validation failed:', {
                    hasData: !!data,
                    hasSuccess: data?.success,
                    hasDataProperty: data?.data
                });
                throw new Error("Invalid blockchain data structure received");
            }

        } catch (error) {
            console.error('🚨 Final blockchain stats error:', error);
            setBlockchainError((error as Error).message);
            
            // Enhanced fallback data with logging
            const fallbackStats = {
                currentBlock: 3711375 + Math.floor(Math.random() * 100),
                totalAccounts: 16234567,
                totalTransactions: 199876543,
                tps: 32.6 + (Math.random() * 10 - 5),
                gasPrice: 4.2,
                blockTime: 1.6,
                blockTransactions: 127 + Math.floor(Math.random() * 50),
                gasUsed: 2845632 + Math.floor(Math.random() * 1000000),
                activeValidators: 21,
                networkHealth: 'Live (Fallback Data)'
            };
            
            console.log('🔄 Setting fallback stats:', fallbackStats);
            setBlockchainStats(fallbackStats);
            
        } finally {
            console.log('🏁 fetchBlockchainStats FINISHED');
            setBlockchainLoading(false);
        }
    };

    // 🆕 Format numbers compactly (1.2M, 3.4K)
    const formatCompactNumber = (num: number): string => {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    // 🆕 Generate Transaction Explorer Link
    const getTransactionLink = (txHash: string): string => {
        return `https://chainscan-galileo.0g.ai/tx/${txHash}`;
    };

    // 🆕 Generate Address Explorer Link
    const getAddressLink = (address: string): string => {
        return `https://chainscan-galileo.0g.ai/address/${address}`;
    };

    // 🆕 Get Transaction Type Color
    const getTransactionTypeColor = (type: string): string => {
        const colors: { [key: string]: string } = {
            'CreateValidator': '#8B5CF6',
            'Delegate': '#10B981',
            'Undelegate': '#F59E0B',
            'Withdraw': '#3B82F6',
            'UpdateCommission': '#6B7280',
            'Redelegate': '#8B5CF6',
            'Others': '#9CA3AF'
        };
        return colors[type] || '#9CA3AF';
    };

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

    const getAvatarUrl = (validator: Validator): string => {
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

    const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>, validator: Validator): void => {
        const target = e.target as HTMLImageElement;
        console.log(`🚨 Avatar error for ${validator.moniker}, falling back to SVG`);
        target.src = getAvatarUrl({ ...validator, identity: undefined, avatarUrl: undefined });
    };

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

    const fetchValidators = async (): Promise<void> => {
        setLoading(true);
        setFetchError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const response = await fetch(getApiUrl(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();

            if (data && data.validators && Array.isArray(data.validators)) {
                const sortedValidators = data.validators.sort((a: any, b: any) => b.votingPower - a.votingPower);
                
                const validatorsWithRank = sortedValidators.map((validator: any, index: number) => ({
                    ...validator,
                    rank: index + 1
                }));

                setValidatorData({
                    source: data.source,
                    retrievedAt: data.retrievedAt,
                    validatorCount: data.validatorCount,
                    network: "0gchain-16601",
                    chain_name: "0G Galileo Testnet",
                    last_updated: data.retrievedAt,
                    total_validators: data.validatorCount,
                    total_voting_power: data.validators
                        .filter((v: any) => v.status === 'Aktif')
                        .reduce((sum: number, v: any) => sum + v.totalStaked, 0),
                    validators: validatorsWithRank
                });
                
                console.log('🎉 Validators updated:', data.validatorCount, 'validators');
                console.log('📝 Sample validator data:', validatorsWithRank[0]);
                
                setTimeout(() => {
                    fetchAllAvatars(validatorsWithRank);
                }, 1000);
                
            } else {
                throw new Error("Invalid data received from API.");
            }

        } catch (error) {
            console.error('🚨 Error fetching validators:', error);
            setFetchError((error as Error).message);
            
            setValidatorData(prevData => prevData || {
                network: "0gchain-16601",
                chain_name: "0G Galileo Testnet",
                last_updated: new Date().toISOString(),
                total_validators: 0,
                total_voting_power: 0,
                validators: []
            });
        } finally {
            setLoading(false);
            setRefreshTimeLeft(45);
        }
    };

    // 🆕 Combined fetch function
    const fetchAllData = async (): Promise<void> => {
        await Promise.allSettled([
            fetchValidators(),
            fetchBlockchainStats()
        ]);
    };

    useEffect(() => {
        fetchAllData(); // 🆕 Fetch both APIs
        const interval = setInterval(() => {
            setRefreshTimeLeft(prev => {
                if (prev <= 1) {
                    fetchAllData(); // 🆕 Refresh both APIs
                    return 45;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number): string => {
        if (typeof num === 'string') {
            const parsed = parseFloat(num);
            return isNaN(parsed) ? '0' : parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const formatTime = (dateString: string): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleTimeString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const handleValidatorClick = (validator: Validator): void => {
        console.log('📝 Selected validator:', validator);
        setSelectedValidator(validator);
        setSelectedValidatorTab('info');
        
        // Initialize validator details if not exists
        if (!validatorDetails[validator.address]) {
            setValidatorDetails(prev => ({
                ...prev,
                [validator.address]: {
                    delegators: null,
                    transactions: null,
                    loadingDelegators: false,
                    loadingTransactions: false,
                    errorDelegators: null,
                    errorTransactions: null
                }
            }));
        }
    };

    const closeModal = (): void => {
        setSelectedValidator(null);
        setSelectedValidatorTab('info');
    };

    const getRankIcon = (rank: number): string => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    useEffect(() => {
        const metaCharset = document.querySelector('meta[charset]');
        if (!metaCharset) {
            const charset = document.createElement('meta');
            charset.setAttribute('charset', 'UTF-8');
            document.head.insertBefore(charset, document.head.firstChild);
        }

        const style = document.createElement('style');
        style.id = 'emoji-font-fix';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            html, body {
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            * {
                font-family: inherit;
            }
            
            .emoji-support {
                font-family: 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif !important;
                font-style: normal !important;
                font-weight: normal !important;
                text-rendering: optimizeLegibility !important;
                line-height: 1 !important;
                vertical-align: middle !important;
            }
            
            .emoji-text {
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Color Emoji', sans-serif;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes fadeInScale {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            @keyframes glow {
                0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
                50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
            }
            
            .spinner {
                animation: spin 1s linear infinite;
            }
            
            .modal-enter {
                animation: fadeInScale 0.3s ease-out;
            }

            .avatar-loading {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }
            
            .avatar-pulse {
                animation: pulse 2s infinite;
            }

            .live-glow {
                animation: glow 2s infinite;
            }

            /* Tab button styles */
            .tab-button {
                transition: all 0.3s ease;
                border-bottom: 3px solid transparent;
            }
            
            .tab-button.active {
                border-bottom-color: #FFD700;
                background: rgba(255, 255, 255, 0.15);
            }
            
            .tab-button:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            /* Validator detail tabs */
            .validator-tab {
                transition: all 0.3s ease;
                border-bottom: 2px solid transparent;
            }
            
            .validator-tab.active {
                border-bottom-color: #3B82F6;
                background: rgba(59, 130, 246, 0.1);
            }
            
            .validator-tab:hover {
                background: rgba(59, 130, 246, 0.05);
            }

            /* Transaction link styles */
            .tx-link {
                color: #3B82F6;
                text-decoration: none;
                transition: all 0.2s ease;
            }
            
            .tx-link:hover {
                color: #1D4ED8;
                text-decoration: underline;
            }

            /* Address link styles */
            .address-link {
                color: #8B5CF6;
                text-decoration: none;
                transition: all 0.2s ease;
                font-family: monospace;
            }
            
            .address-link:hover {
                color: #7C3AED;
                text-decoration: underline;
            }
        `;
        
        const existingStyle = document.getElementById('emoji-font-fix');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        document.head.appendChild(style);
        
        return () => {
            const styleToRemove = document.getElementById('emoji-font-fix');
            if (styleToRemove) {
                styleToRemove.remove();
            }
        };
    }, []);

    useEffect(() => {
        console.log(`🎉 Cache updated. Total cached avatars: ${Object.keys(keybaseCache).length}`);
    }, [keybaseCache]);

    if (loading && !validatorData) {
        return (
            <div className="emoji-text" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', flexDirection: 'column' }}>
                <div className="spinner" style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTop: '3px solid white',
                    borderRadius: '50%',
                    marginBottom: '20px'
                }}></div>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>
                        <span className="emoji-support">🔍</span> Loading 0G Data...
                    </h3>
                    <p style={{ margin: '0', opacity: '0.8' }}>This may take up to 45 seconds</p>
                    <p style={{ margin: '5px 0 0 0', opacity: '0.6', fontSize: '14px' }}>
                        Fetching blockchain stats and validators...
                    </p>
                </div>
            </div>
        );
    }

    if (!validatorData || fetchError) {
        return (
            <div className="emoji-text" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', flexDirection: 'column' }}>
                <span className="emoji-support">🚨</span> Failed to load validator data: {fetchError || "Unknown error"}.
                <button
                    onClick={fetchAllData}
                    style={{
                        marginTop: '20px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    <span className="emoji-support">🔄</span> Try Refresh
                </button>
            </div>
        );
    }

    const activeValidators = validatorData.validators.filter((v: Validator) => v.status === 'Aktif');
    const candidateValidators = validatorData.validators.filter((v: Validator) => v.status === 'Kandidat');

    return (
        <div className="emoji-text" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '20px' }}>
            {/* Header Section */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '40px',
                borderRadius: '20px',
                textAlign: 'center',
                marginBottom: '30px',
                color: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <img 
                        src="/0glogo.svg" 
                        alt="0G Logo" 
                        style={{ width: '80px', height: '80px', marginRight: '20px' }} 
                    />
                    <h1 style={{ fontSize: '3rem', margin: '0' }}>Galileo Explorer</h1>
                </div>
                
                <p style={{ fontSize: '1.2rem', opacity: '0.9', marginBottom: '10px' }}>
                    Ultra-modern explorer for 0G's EVM + AI + Storage ecosystem
                </p>
                
                {/* Live Update Indicator */}
                <div style={{ fontSize: '0.9rem', opacity: '0.7', marginBottom: '20px' }}>
                    <span className="emoji-support live-glow">🟢</span> LIVE • Last updated: {formatTime(validatorData.last_updated)} • 
                    <button 
                        onClick={fetchAllData}
                        style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            border: 'none', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            marginLeft: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <span className="emoji-support">🔄</span> Refresh
                    </button>
                    <span style={{ marginLeft: '10px', fontSize: '0.9rem' }}>
                        Next refresh in: {refreshTimeLeft}s
                    </span>
                </div>
                
                {/* Feature Badges */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    {[
                        { icon: '⚡', text: '2,500 TPS' },
                        { icon: '📦', text: 'Storage Network' },
                        { icon: '🤖', text: 'AI Compute' },
                        { icon: '📊', text: 'DA Layer' }
                    ].map((badge, i) => (
                        <div key={i} style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px'
                        }}>
                            <span className="emoji-support">{badge.icon}</span> {badge.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* 🆕 BLOCKCHAIN STATISTICS CARDS */}
            {blockchainStats && (
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ 
                        color: 'white', 
                        textAlign: 'center', 
                        marginBottom: '20px', 
                        fontSize: '1.8rem',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        <span className="emoji-support">⛓️</span> Live Blockchain Statistics
                        {blockchainError && (
                            <span style={{ fontSize: '0.7rem', color: '#F59E0B', marginLeft: '10px' }}>
                                (Using fallback data)
                            </span>
                        )}
                    </h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        {[
                            { 
                                title: 'Current Block', 
                                value: formatCompactNumber(blockchainStats.currentBlock), 
                                icon: '🧱', 
                                color: '#3B82F6',
                                subtitle: `Height: ${blockchainStats.currentBlock.toLocaleString()}`
                            },
                            { 
                                title: 'TPS', 
                                value: blockchainStats.tps.toFixed(1), 
                                icon: '⚡', 
                                color: '#10B981',
                                subtitle: 'Transactions/sec'
                            },
                            { 
                                title: 'Block Time', 
                                value: `${blockchainStats.blockTime}s`, 
                                icon: '⏱️', 
                                color: '#8B5CF6',
                                subtitle: 'Average time'
                            },
                            { 
                                title: 'Gas Price', 
                                value: `${blockchainStats.gasPrice}`, 
                                icon: '⛽', 
                                color: '#F59E0B',
                                subtitle: 'Gwei'
                            },
                            { 
                                title: 'Block Txs', 
                                value: blockchainStats.blockTransactions.toString(), 
                                icon: '📝', 
                                color: '#EF4444',
                                subtitle: 'Per block'
                            },
                            { 
                                title: 'Gas Used', 
                                value: formatCompactNumber(blockchainStats.gasUsed), 
                                icon: '🔥', 
                                color: '#06B6D4',
                                subtitle: 'Current usage'
                            }
                        ].map((stat, i) => (
                            <div key={i} style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                padding: '25px',
                                borderRadius: '15px',
                                textAlign: 'center',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                                onMouseEnter={(e) => { 
                                    e.currentTarget.style.transform = 'scale(1.05)'; 
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => { 
                                    e.currentTarget.style.transform = 'scale(1)'; 
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                <div style={{ 
                                    fontSize: '2.5rem', 
                                    marginBottom: '10px',
                                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                                }}>
                                    <span className="emoji-support">{stat.icon}</span>
                                </div>
                                <h3 style={{ 
                                    margin: '0 0 8px 0', 
                                    opacity: '0.9', 
                                    fontSize: '1rem',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                }}>
                                    {stat.title}
                                </h3>
                                <p style={{ 
                                    fontSize: '1.8rem', 
                                    fontWeight: 'bold', 
                                    margin: '0 0 5px 0',
                                    color: stat.color,
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    {stat.value}
                                </p>
                                <p style={{ 
                                    fontSize: '0.8rem', 
                                    opacity: '0.7', 
                                    margin: '0',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                }}>
                                    {stat.subtitle}
                                </p>
                                
                                {/* Live indicator for live data */}
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: blockchainError ? '#F59E0B' : '#10B981',
                                    animation: blockchainError ? 'none' : 'pulse 2s infinite'
                                }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MEVCUT Validator Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {[
                    { title: 'Total Validators', value: validatorData.total_validators, icon: '👥', color: '#3B82F6' },
                    { title: 'Active Validators', value: activeValidators.length, icon: '🌟', color: '#10B981' },
                    { title: 'Total Staked', value: `${formatNumber(validatorData.total_voting_power)} 0G`, icon: '💰', color: '#8B5CF6' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        padding: '30px',
                        borderRadius: '15px',
                        textAlign: 'center',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                            <span className="emoji-support">{stat.icon}</span>
                        </div>
                        <h3 style={{ margin: '0 0 10px 0', opacity: '0.9' }}>{stat.title}</h3>
                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0' }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '20px',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
                }}>
                    <button
                        className={`tab-button ${activeTab === 'validators' ? 'active' : ''}`}
                        onClick={() => setActiveTab('validators')}
                        style={{
                            flex: 1,
                            padding: '20px',
                            background: activeTab === 'validators' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'validators' ? '3px solid #FFD700' : '3px solid transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <span className="emoji-support">🏆</span> Validators ({validatorData.total_validators})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'uptime' ? 'active' : ''}`}
                        onClick={() => setActiveTab('uptime')}
                        style={{
                            flex: 1,
                            padding: '20px',
                            background: activeTab === 'uptime' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'uptime' ? '3px solid #FFD700' : '3px solid transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <span className="emoji-support">⏱️</span> Network Uptime
                    </button>
                    {/* 🆕 Explorer Tab */}
                    <button
                        className={`tab-button ${activeTab === 'explorer' ? 'active' : ''}`}
                        onClick={() => setActiveTab('explorer')}
                        style={{
                            flex: 1,
                            padding: '20px',
                            background: activeTab === 'explorer' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'explorer' ? '3px solid #FFD700' : '3px solid transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <span className="emoji-support">🔍</span> Explorer
                    </button>
                    {/* 🆕 MANAGE DELEGATION TAB */}
                    <button
                        className={`tab-button ${activeTab === 'delegation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('delegation')}
                        style={{
                            flex: 1,
                            padding: '20px',
                            background: activeTab === 'delegation' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'delegation' ? '3px solid #FFD700' : '3px solid transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <span className="emoji-support">🚀</span> Manage Delegation
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ padding: '30px' }}>
                    {activeTab === 'validators' ? (
                        <>
                            {/* Active Validators */}
                            <div style={{ marginBottom: '30px' }}>
                                <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '25px', fontSize: '1.8rem' }}>
                                    <span className="emoji-support">🏆</span> Active Validators ({activeValidators.length})
                                </h2>
                                
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {activeValidators.map((validator: Validator) => (
                                        <div key={validator.address}
                                             style={{
                                                 background: 'rgba(255, 255, 255, 0.95)',
                                                 padding: '20px',
                                                 borderRadius: '12px',
                                                 borderLeft: `4px solid ${validator.rank <= 3 ? '#FFD700' : '#667eea'}`,
                                                 transition: 'all 0.3s ease',
                                                 cursor: 'pointer',
                                                 boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                                             }}
                                             onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
                                             onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)'; }}
                                             onClick={() => handleValidatorClick(validator)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '300px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span className="emoji-support" style={{ fontSize: '1.5rem' }}>{getRankIcon(validator.rank)}</span>
                                                        <div>
                                                            <img
                                                                src={getAvatarUrl(validator)}
                                                                alt={`${validator.moniker} avatar`}
                                                                style={{ 
                                                                    width: '60px', 
                                                                    height: '60px', 
                                                                    borderRadius: '50%', 
                                                                    objectFit: 'cover', 
                                                                    border: '2px solid #667eea', 
                                                                    transition: 'transform 0.3s ease'
                                                                }}
                                                                className={validator.identity && !keybaseCache[validator.identity] ? 'avatar-pulse' : ''}
                                                                onError={(e) => handleAvatarError(e, validator)}
                                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 style={{ margin: '0', color: '#1f2937', fontSize: '1.3rem' }}>
                                                            {validator.moniker}
                                                        </h3>
                                                        <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                                            {validator.address.slice(0, 8)}...{validator.address.slice(-8)}
                                                        </p>
                                                        {validator.identity && (
                                                            <p style={{ margin: '2px 0 0 0', color: '#8B5CF6', fontSize: '0.7rem' }}>
                                                                <span className="emoji-support">🔑</span> {validator.identity}
                                                            </p>
                                                        )}
                                                        {validator.website && (
                                                            <p style={{ margin: '2px 0 0 0', color: '#3B82F6', fontSize: '0.7rem' }}>
                                                                <span className="emoji-support">🌐</span> {validator.website}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#059669' }}>
                                                        {validator.votingPower.toFixed(2)}%
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                                        {formatNumber(validator.totalStaked)} 0G
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#8B5CF6' }}>
                                                        Commission: {validator.commissionRate}
                                                    </div>
                                                    {/* 🆕 MANAGE DELEGATION BUTON */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTab('delegation');
                                                        }}
                                                        style={{
                                                            background: '#10B981',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            marginTop: '5px'
                                                        }}
                                                    >
                                                        Manage Delegation
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Candidate Validators */}
                            {candidateValidators.length > 0 && (
                                <div>
                                    <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '25px', fontSize: '1.8rem' }}>
                                        <span className="emoji-support">🔍</span> Candidate Validators ({candidateValidators.length})
                                    </h2>
                                    
                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        {candidateValidators.map((validator: Validator) => (
                                            <div key={validator.address}
                                                 style={{
                                                     background: 'rgba(255, 255, 255, 0.8)',
                                                     padding: '20px',
                                                     borderRadius: '12px',
                                                     borderLeft: `4px solid #F59E0B`,
                                                     transition: 'all 0.3s ease',
                                                     cursor: 'pointer',
                                                     boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                                                 }}
                                                 onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
                                                 onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)'; }}
                                                 onClick={() => handleValidatorClick(validator)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div>
                                                            <img
                                                                src={getAvatarUrl(validator)}
                                                                alt={`${validator.moniker} avatar`}
                                                                style={{ 
                                                                    width: '60px', 
                                                                    height: '60px', 
                                                                    borderRadius: '50%', 
                                                                    objectFit: 'cover', 
                                                                    border: '2px solid #F59E0B'
                                                                }}
                                                                className={validator.identity && !keybaseCache[validator.identity] ? 'avatar-pulse' : ''}
                                                                onError={(e) => handleAvatarError(e, validator)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h3 style={{ margin: '0', color: '#1f2937', fontSize: '1.2rem' }}>
                                                                {validator.moniker}
                                                            </h3>
                                                            <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                                                {validator.address.slice(0, 8)}...{validator.address.slice(-8)}
                                                            </p>
                                                            {validator.identity && (
                                                                <p style={{ margin: '2px 0 0 0', color: '#8B5CF6', fontSize: '0.7rem' }}>
                                                                    <span className="emoji-support">🔑</span> {validator.identity}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.9rem', color: '#F59E0B', fontWeight: 'bold' }}>
                                                            <span className="emoji-support">🔍</span> {validator.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === 'uptime' ? (
                        /* Uptime Grid Tab */
                        <UptimeGrid validators={validatorData.validators} />
                    ) : activeTab === 'explorer' ? (
                        /* 🆕 Explorer Tab */
                        <div style={{ textAlign: 'center', color: 'white' }}>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>
                                <span className="emoji-support">🔍</span> Blockchain Explorer
                            </h2>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '40px',
                                borderRadius: '15px',
                                marginBottom: '20px'
                            }}>
                                <span className="emoji-support" style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>🚧</span>
                                <h3 style={{ margin: '0 0 15px 0' }}>Coming Soon!</h3>
                                <p style={{ opacity: '0.8', margin: '0' }}>
                                    Latest Blocks, Recent Transactions, and Advanced Search functionality will be available here.
                                </p>
                            </div>
                            
                            {/* Preview features */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                {[
                                    { icon: '🧱', title: 'Latest Blocks', desc: 'Real-time block explorer' },
                                    { icon: '📝', title: 'Recent Transactions', desc: 'Transaction history & details' },
                                    { icon: '🔍', title: 'Advanced Search', desc: 'Search blocks, txs, addresses' }
                                ].map((feature, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        padding: '25px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                                            <span className="emoji-support">{feature.icon}</span>
                                        </div>
                                        <h4 style={{ margin: '0 0 8px 0' }}>{feature.title}</h4>
                                        <p style={{ margin: '0', opacity: '0.7', fontSize: '0.9rem' }}>
                                            {feature.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* 🆕 MANAGE DELEGATION TAB CONTENT */
                        <ManageDelegation 
                            validators={validatorData.validators.filter(v => v.status === 'Aktif')}
                        />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                <p>
                    <span className="emoji-support">🌎</span> 0G Galileo Testnet Explorer • Built with <span className="emoji-support">❤️</span> for the community • Next refresh in {refreshTimeLeft}s
                </p>
                {blockchainStats && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>
                        <span className="emoji-support">⛓️</span> Network: {blockchainStats.networkHealth} • 
                        Block: {blockchainStats.currentBlock.toLocaleString()} • 
                        TPS: {blockchainStats.tps}
                    </p>
                )}
            </div>

            {/* 🆕 ENHANCED Validator Detail Modal with Tabs */}
            {selectedValidator && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(5px)'
                }} onClick={closeModal}>
                    <div className="emoji-text modal-enter" style={{
                        background: 'white',
                        borderRadius: '15px',
                        padding: '0',
                        width: '95%',
                        maxWidth: '1200px',
                        position: 'relative',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        color: '#333',
                        maxHeight: '95vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{
                            padding: '30px 30px 20px 30px',
                            borderBottom: '2px solid #f0f0f0',
                            position: 'sticky',
                            top: 0,
                            background: 'white',
                            zIndex: 10
                        }}>
                            <button onClick={closeModal} style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#666',
                                padding: '5px',
                                borderRadius: '50%',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                ×
                            </button>
                            
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ position: 'relative' }}>
                                    <img 
                                        src={getAvatarUrl(selectedValidator)}
                                        alt="Validator Avatar" 
                                        style={{ 
                                            width: '80px', 
                                            height: '80px', 
                                            borderRadius: '50%', 
                                            border: '3px solid #667eea'
                                        }}
                                        onError={(e) => handleAvatarError(e, selectedValidator)}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <h2 style={{ margin: '0 0 5px 0', color: '#1f2937', fontSize: '1.8rem' }}>
                                        {selectedValidator.moniker}
                                    </h2>
                                    <p style={{ margin: '0', color: '#6b7280', fontSize: '0.9rem' }}>
                                        {selectedValidator.status === 'Aktif' ? 
                                            <>
                                                <span className="emoji-support">🌟</span> Active Validator
                                            </> : 
                                            <>
                                                <span className="emoji-support">🔍</span> Candidate Validator
                                            </>
                                        }
                                    </p>
                                    {selectedValidator.rank && (
                                        <p style={{ margin: '5px 0 0 0', color: '#8B5CF6', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            <span className="emoji-support">{getRankIcon(selectedValidator.rank)}</span> Rank {selectedValidator.rank}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                                        {selectedValidator.votingPower ? selectedValidator.votingPower.toFixed(2) : '0.00'}%
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Voting Power</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8B5CF6' }}>
                                        {formatNumber(selectedValidator.totalStaked || 0)} 0G
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Staked</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F59E0B' }}>
                                        {selectedValidator.commissionRate || 'N/A'}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Commission</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6' }}>
                                        {formatNumber(selectedValidator.selfDelegation || 0)} 0G
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Self Delegation</div>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div style={{ display: 'flex', gap: '0', borderRadius: '8px', background: '#f8fafc', padding: '4px' }}>
                                <button
                                    className={`validator-tab ${selectedValidatorTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setSelectedValidatorTab('info')}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        background: selectedValidatorTab === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: selectedValidatorTab === 'info' ? '#3B82F6' : '#6b7280',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <span className="emoji-support">ℹ️</span> Validator Info
                                </button>
                                <button
                                    className={`validator-tab ${selectedValidatorTab === 'delegators' ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedValidatorTab('delegators');
                                        fetchValidatorDelegators(selectedValidator.address);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        background: selectedValidatorTab === 'delegators' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: selectedValidatorTab === 'delegators' ? '#3B82F6' : '#6b7280',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <span className="emoji-support">👥</span> Delegators
                                    {validatorDetails[selectedValidator.address]?.loadingDelegators && (
                                        <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>...</span>
                                    )}
                                </button>
                                <button
                                    className={`validator-tab ${selectedValidatorTab === 'transactions' ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedValidatorTab('transactions');
                                        fetchValidatorTransactions(selectedValidator.address);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        background: selectedValidatorTab === 'transactions' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: selectedValidatorTab === 'transactions' ? '#3B82F6' : '#6b7280',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <span className="emoji-support">📜</span> Transactions
                                    {validatorDetails[selectedValidator.address]?.loadingTransactions && (
                                        <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>...</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div style={{ padding: '30px' }}>
                            {selectedValidatorTab === 'info' ? (
                                /* Validator Info Tab */
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', fontSize: '0.9rem', marginBottom: '20px' }}>
                                        <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                            <strong>
                                                <span className="emoji-support">🔑</span> Public Key:
                                            </strong><br />
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedValidator.publicKey}</span>
                                        </div>
                                        
                                        {selectedValidator.operatorAddress && (
                                            <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                                <strong>
                                                    <span className="emoji-support">🔑</span> Operator Address:
                                                </strong><br />
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedValidator.operatorAddress}</span>
                                            </div>
                                        )}
                                        
                                        {selectedValidator.consensusAddress && (
                                            <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                                <strong>
                                                    <span className="emoji-support">🔍</span> Consensus Address:
                                                </strong><br />
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedValidator.consensusAddress}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', fontSize: '0.9rem', marginBottom: '20px' }}>
                                        <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                            <strong>
                                                <span className="emoji-support">👥</span> Validator Address:
                                            </strong><br />
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedValidator.address}</span>
                                        </div>
                                        
                                        <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px' }}>
                                            <strong>
                                                <span className="emoji-support">🌟</span> Status:
                                            </strong> 
                                            <span style={{ color: selectedValidator.status === 'Aktif' ? '#059669' : '#F59E0B', fontWeight: 'bold', marginLeft: '5px' }}>
                                                {selectedValidator.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '20px' }}>
                                        <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '8px' }}>
                                            <strong>
                                                <span className="emoji-support">👤</span> Identity:
                                            </strong> {selectedValidator.identity || 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                        {selectedValidator.website && (
                                            <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                                <strong>
                                                    <span className="emoji-support">🌐</span> Website:
                                                </strong><br />
                                                <a href={selectedValidator.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', wordBreak: 'break-all' }}>
                                                    {selectedValidator.website}
                                                </a>
                                            </div>
                                        )}
                                        
                                        {selectedValidator.securityContact && (
                                            <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                <strong>
                                                    <span className="emoji-support">🔒</span> Security Contact:
                                                </strong><br />
                                                <span style={{ wordBreak: 'break-all' }}>{selectedValidator.securityContact}</span>
                                            </div>
                                        )}
                                    </div>

                                    {(selectedValidator.details || selectedValidator.description) && (
                                        <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                                            <strong>
                                                <span className="emoji-support">📝</span> Description:
                                            </strong>
                                            <p style={{ margin: '5px 0 0 0', lineHeight: '1.5' }}>
                                                {selectedValidator.details || selectedValidator.description}
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button style={{ 
                                            background: selectedValidator.status === 'Aktif' && !selectedValidator.jailed ? '#3B82F6' : '#9CA3AF', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '12px 24px', 
                                            borderRadius: '8px', 
                                            fontSize: '0.9rem', 
                                            cursor: selectedValidator.status === 'Aktif' && !selectedValidator.jailed ? 'pointer' : 'not-allowed',
                                            opacity: selectedValidator.status === 'Aktif' && !selectedValidator.jailed ? 1 : 0.6,
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => {
                                            if (selectedValidator.status === 'Aktif' && !selectedValidator.jailed) {
                                                setActiveTab('delegation');
                                                closeModal();
                                            }
                                        }}
                                        >
                                            {selectedValidator.status === 'Aktif' && !selectedValidator.jailed ? 
                                                <>
                                                    <span className="emoji-support">💰</span> Delegate
                                                </> : 
                                                <>
                                                    <span className="emoji-support">🔒</span> {selectedValidator.jailed ? 'Jailed' : 'Not Active'}
                                                </>
                                            }
                                        </button>
                                        
                                        {selectedValidator.website && (
                                            <button 
                                                onClick={() => window.open(selectedValidator.website, '_blank')}
                                                style={{ 
                                                    background: '#10B981', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    padding: '12px 24px', 
                                                    borderRadius: '8px', 
                                                    fontSize: '0.9rem', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <span className="emoji-support">🌐</span> Visit Website
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedValidator.address);
                                                alert('Validator address copied to clipboard!');
                                            }}
                                            style={{ 
                                                background: '#6B7280', 
                                                color: 'white', 
                                                border: 'none', 
                                                padding: '12px 24px', 
                                                borderRadius: '8px', 
                                                fontSize: '0.9rem', 
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <span className="emoji-support">📍</span> Copy Address
                                        </button>
                                    </div>
                                </div>
                            ) : selectedValidatorTab === 'delegators' ? (
                                /* 🆕 Delegators Tab */
                                <div>
                                    <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="emoji-support">👥</span> Delegators
                                    </h3>
                                    
                                    {validatorDetails[selectedValidator.address]?.loadingDelegators ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{
                                                width: '40px',
                                                height: '40px',
                                                border: '3px solid rgba(59, 130, 246, 0.3)',
                                                borderTop: '3px solid #3B82F6',
                                                borderRadius: '50%',
                                                margin: '0 auto 20px'
                                            }}></div>
                                            <p style={{ color: '#6b7280' }}>Loading delegators data...</p>
                                        </div>
                                    ) : validatorDetails[selectedValidator.address]?.errorDelegators ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#DC2626' }}>
                                            <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>❌</span>
                                            <p>Failed to load delegators: {validatorDetails[selectedValidator.address]?.errorDelegators}</p>
                                            <button
                                                onClick={() => fetchValidatorDelegators(selectedValidator.address)}
                                                style={{
                                                    background: '#3B82F6',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    marginTop: '10px'
                                                }}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : validatorDetails[selectedValidator.address]?.delegators ? (
                                        <div>
                                            {/* Delegators Summary */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                                                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6' }}>
                                                        {validatorDetails[selectedValidator.address]?.delegators?.total || 0}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Delegators</div>
                                                </div>
                                                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
                                                        {formatNumber(validatorDetails[selectedValidator.address]?.delegators?.totalStaked || 0)} 0G
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Delegated</div>
                                                </div>
                                            </div>

                                            {/* Delegators List */}
                                            {validatorDetails[selectedValidator.address]?.delegators?.list && validatorDetails[selectedValidator.address]?.delegators?.list.length > 0 ? (
                                                <div style={{ background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', gap: '15px', alignItems: 'center' }}>
                                                            <span>Rank</span>
                                                            <span>Delegator Address</span>
                                                            <span>Staked Amount</span>
                                                            <span>Percentage</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                        {validatorDetails[selectedValidator.address]?.delegators?.list.map((delegator: Delegator, index: number) => (
                                                            <div key={delegator.address} style={{
                                                                padding: '15px',
                                                                borderBottom: index === validatorDetails[selectedValidator.address]?.delegators?.list.length - 1 ? 'none' : '1px solid #e2e8f0',
                                                                background: index % 2 === 0 ? 'white' : '#f8fafc'
                                                            }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', gap: '15px', alignItems: 'center', fontSize: '0.9rem' }}>
                                                                    <span style={{ fontWeight: 'bold', color: delegator.rank <= 3 ? '#F59E0B' : '#6b7280' }}>
                                                                        #{delegator.rank}
                                                                    </span>
                                                                    <a 
                                                                        href={getAddressLink(delegator.address)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="address-link"
                                                                        style={{ fontSize: '0.8rem' }}
                                                                    >
                                                                        {delegator.shortAddress}
                                                                    </a>
                                                                    <span style={{ fontWeight: 'bold', color: '#059669' }}>
                                                                        {formatNumber(delegator.staked)} 0G
                                                                    </span>
                                                                    <span style={{ color: '#8B5CF6' }}>
                                                                        {delegator.percentage}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                    <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>👥</span>
                                                    <p>No delegators found for this validator</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                            <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>👥</span>
                                            <p>Click the Delegators tab to load data</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* 🆕 Transactions Tab */
                                <div>
                                    <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="emoji-support">📜</span> Transaction History
                                    </h3>
                                    
                                    {validatorDetails[selectedValidator.address]?.loadingTransactions ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{
                                                width: '40px',
                                                height: '40px',
                                                border: '3px solid rgba(59, 130, 246, 0.3)',
                                                borderTop: '3px solid #3B82F6',
                                                borderRadius: '50%',
                                                margin: '0 auto 20px'
                                            }}></div>
                                            <p style={{ color: '#6b7280' }}>Loading transaction history...</p>
                                        </div>
                                    ) : validatorDetails[selectedValidator.address]?.errorTransactions ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#DC2626' }}>
                                            <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>❌</span>
                                            <p>Failed to load transactions: {validatorDetails[selectedValidator.address]?.errorTransactions}</p>
                                            <button
                                                onClick={() => fetchValidatorTransactions(selectedValidator.address)}
                                                style={{
                                                    background: '#3B82F6',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    marginTop: '10px'
                                                }}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : validatorDetails[selectedValidator.address]?.transactions ? (
                                        <div>
                                            {/* Transaction Summary */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                                                {Object.entries(validatorDetails[selectedValidator.address]?.transactions?.categories || {}).map(([type, count]) => (
                                                    <div key={type} style={{
                                                        background: '#f8fafc',
                                                        padding: '12px',
                                                        borderRadius: '6px',
                                                        textAlign: 'center',
                                                        border: `2px solid ${getTransactionTypeColor(type)}`
                                                    }}>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: getTransactionTypeColor(type) }}>
                                                            {count}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{type}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Transactions List */}
                                            {validatorDetails[selectedValidator.address]?.transactions?.recent && validatorDetails[selectedValidator.address]?.transactions?.recent.length > 0 ? (
                                                <div style={{ background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 100px 120px 1fr 100px', gap: '10px', alignItems: 'center' }}>
                                                            <span>Tx Hash</span>
                                                            <span>Type</span>
                                                            <span>Status</span>
                                                            <span>Amount</span>
                                                            <span>Date</span>
                                                            <span>Block</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                                        {validatorDetails[selectedValidator.address]?.transactions?.recent.map((tx: Transaction, index: number) => (
                                                            <div key={tx.hash} style={{
                                                                padding: '12px 15px',
                                                                borderBottom: index === validatorDetails[selectedValidator.address]?.transactions?.recent.length - 1 ? 'none' : '1px solid #e2e8f0',
                                                                background: index % 2 === 0 ? 'white' : '#f8fafc'
                                                            }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 100px 120px 1fr 100px', gap: '10px', alignItems: 'center', fontSize: '0.8rem' }}>
                                                                    <a 
                                                                        href={getTransactionLink(tx.hash)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="tx-link"
                                                                        style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                                                    >
                                                                        {tx.shortHash}
                                                                    </a>
                                                                    <span style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 'bold',
                                                                        color: 'white',
                                                                        background: getTransactionTypeColor(tx.type),
                                                                        textAlign: 'center'
                                                                    }}>
                                                                        {tx.type}
                                                                    </span>
                                                                    <span style={{
                                                                        color: tx.status === 'SUCCESS' ? '#059669' : '#DC2626',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {tx.status}
                                                                    </span>
                                                                    <span style={{ fontWeight: 'bold' }}>
                                                                        {tx.amount} 0G
                                                                    </span>
                                                                    <span style={{ color: '#6b7280' }}>
                                                                        {new Date(tx.timestamp * 1000).toLocaleDateString()}
                                                                    </span>
                                                                    <span style={{ fontFamily: 'monospace', color: '#8B5CF6' }}>
                                                                        {tx.blockNumber.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                    <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📜</span>
                                                    <p>No transactions found for this validator</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                            <span className="emoji-support" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📜</span>
                                            <p>Click the Transactions tab to load data</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
