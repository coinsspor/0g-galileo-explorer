# 📚 0G Galileo Explorer API Documentation

## 🌐 Base URLs

- **Production**: https://0ggalileoexplorer.coinsspor.com
- **Local Development**: 
  - **Port 3001**: Validator & Delegation API (Main)
  - **Port 3002**: Blockchain Stats API (API v2)
  - **Port 3004**: Uptime Tracking API

## 🔑 Authentication

Currently, all API endpoints are public and do not require authentication.

---

## 📡 API 1 - Validator & Delegation API (Port 3001)

### Core Configuration
- **Staking Contract**: `0xea224dBB52F57752044c0C86aD50930091F561B9`
- **Delegation Contract**: `0xE37bfc9e900bC5cC3279952B90f6Be9A53ED6949`
- **Local RPC**: `http://localhost:14545`
- **Cache Update**: Every 45 seconds
- **Validator Detection**: 6-layer validation system

### Endpoints

#### GET `/api/validators`
Returns all validators with comprehensive data from memory cache.

**Response:**
```json
{
  "source": "blockchain_local_rpc",
  "retrievedAt": "2024-08-14T10:00:00Z",
  "validatorCount": 56,
  "activeValidatorCount": 50,
  "candidateValidatorCount": 6,
  "totalNetworkStake": 1000000.5,
  "validators": [
    {
      "address": "0x...",
      "ownerAddress": "0x...",
      "moniker": "Validator Name",
      "status": "Aktif",  // or "Kandidat"
      "avatarUrl": "https://s3.amazonaws.com/keybase_processed_uploads/...",
      "identity": "keybase_identity",
      "website": "https://validator.com",
      "securityContact": "security@validator.com",
      "details": "Validator description",
      "publicKey": "0x...",
      "totalStaked": 50000.5,
      "commissionRate": "5.00%",
      "votingPower": 5.2,
      "selfDelegation": 32000,
      "validationPassed": true
    }
  ],
  "cache_info": {
    "last_updated": "2024-08-14T10:00:00Z",
    "update_status": "ready",
    "update_count": 10,
    "cache_age_seconds": 30
  }
}
```

#### GET `/api/delegations/:walletAddress`
Detects all delegations for a specific wallet address.

**Parameters:**
- `walletAddress` (required): The wallet address to check

**Response:**
```json
{
  "success": true,
  "walletAddress": "0x...",
  "totalDelegated": 10000.5,
  "delegationCount": 3,
  "delegations": [
    {
      "validator": {
        "address": "0x...",
        "moniker": "Validator Name",
        "commissionRate": "5.00%",
        "status": "Aktif",
        "totalStaked": 50000
      },
      "delegation": {
        "shares": "1000000000000000000000",
        "tokens": 5000.5,
        "method": "getDelegation"
      }
    }
  ],
  "checkedValidators": 50,
  "availableValidators": 56,
  "summary": "Found 3 delegation(s) totaling 10000.5000 0G"
}
```

#### GET `/api/validator-delegators/:validatorAddress`
Returns all delegators for a specific validator with enhanced discovery.

**Response:**
```json
{
  "success": true,
  "delegators": {
    "validatorAddress": "0x...",
    "total": 150,
    "totalStaked": 100000.5,
    "scannedAddresses": 500,
    "eventsScanned": 5000,
    "list": [
      {
        "rank": 1,
        "address": "0x...",
        "staked": 5000.5,
        "percentage": "5.00",
        "shortAddress": "0x1234...5678"
      }
    ]
  }
}
```

#### GET `/api/validator-transactions/:validatorAddress`
Returns complete transaction history for a validator with 0G-specific categorization.

**Response:**
```json
{
  "success": true,
  "transactions": {
    "validatorAddress": "0x...",
    "total": 250,
    "recent": [
      {
        "hash": "0x...",
        "type": "Delegate",  // or "Undelegate", "CreateValidator", "Withdraw", etc.
        "status": "SUCCESS",
        "amount": "1000.000000",
        "from": "0x...",
        "to": "0x...",
        "gasUsed": 50000,
        "gasPrice": 20000000000,
        "blockNumber": 3867000,
        "timestamp": 1699123456,
        "date": "2024-08-14 10:00:00",
        "shortHash": "0x1234...5678",
        "shortFrom": "0xabcd...efgh"
      }
    ],
    "summary": {
      "total": 250,
      "createValidator": 1,
      "delegate": 100,
      "undelegate": 50,
      "withdraw": 10,
      "updateCommission": 5,
      "redelegate": 20,
      "others": 64,
      "successful": 240,
      "failed": 10
    },
    "categories": {
      "CreateValidator": 1,
      "Delegate": 100,
      "Undelegate": 50,
      "Withdraw": 10,
      "UpdateCommission": 5,
      "Redelegate": 20,
      "Others": 64
    }
  }
}
```

#### GET `/api/validator-delegations/:validatorAddress`
Analyzes delegation statistics for a validator.

**Response:**
```json
{
  "success": true,
  "validator": {
    "address": "0x...",
    "moniker": "Validator Name",
    "totalStaked": 100000,
    "commissionRate": "5.00%"
  },
  "delegation_analysis": {
    "totalDelegated": 100000,
    "delegatorCount": 150,
    "scannedAddresses": 500,
    "activeDelegators": 150,
    "discoveryMethods": {
      "fromEvents": 140,
      "fromKnownChecks": 10
    }
  },
  "statistics": {
    "averageStake": 666.67,
    "medianStake": 500,
    "largestStake": 10000,
    "smallestStake": 10,
    "giniCoefficient": 0.45,
    "top10Percentage": 45.5,
    "concentration": "Somewhat concentrated",
    "stakingDistribution": {
      "Large (>10%)": 2,
      "Medium (1-10%)": 20,
      "Small (<1%)": 128
    }
  },
  "delegators": [...],
  "top10": [...]
}
```

#### GET `/api/cache/status`
Returns cache status and health information.

**Response:**
```json
{
  "cache_initialized": true,
  "last_update": "2024-08-14T10:00:00Z",
  "update_status": "ready",
  "update_count": 10,
  "cache_age_seconds": 30,
  "validator_count": 56,
  "active_validator_count": 50,
  "candidate_validator_count": 6,
  "next_update_in": 15000,
  "rpc_health": {
    "endpoint": "http://localhost:14545",
    "timeout": 500
  }
}
```

#### POST `/api/cache/refresh`
Forces manual cache refresh.

**Response:**
```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "validator_count": 56,
  "active_validator_count": 50,
  "candidate_validator_count": 6,
  "total_network_stake": 1000000.5
}
```

---

## 📡 API 2 - Blockchain Stats API (Port 3002)

### Architecture
- **Modular Design**: Routes, Services, Middleware separation
- **Advanced Caching**: TTL-based caching per endpoint
- **Rate Limiting**: 100 requests per minute

### Endpoints

#### GET `/api/v2/blockchain/stats`
Returns comprehensive blockchain statistics.

**Response:**
```json
{
  "blockHeight": 3867000,
  "timestamp": 1699123456000,
  "blockTime": 2.5,
  "gasUsed": 5000000,
  "gasLimit": 10000000,
  "gasPrice": 20000000000,
  "transactionCount": 150,
  "tps": 45.6,
  "chainId": "16600",
  "difficulty": "0x1234",
  "totalDifficulty": "0x5678",
  "retrievedAt": "2024-08-14T10:00:00Z"
}
```

#### GET `/api/v2/blockchain/blocks/:identifier`
Get block by number or hash.

**Parameters:**
- `identifier`: Block number or hash

**Response:**
```json
{
  "number": "0x3b0958",
  "hash": "0x...",
  "parentHash": "0x...",
  "miner": "0x...",
  "blockNumber": 3867000,
  "timestamp": 1699123456000,
  "gasUsed": 5000000,
  "gasLimit": 10000000,
  "size": 1024,
  "transactionCount": 10,
  "formattedTimestamp": "2024-08-14T10:00:00Z",
  "timeAgo": "5 minutes ago",
  "transactions": ["0x...", "0x..."]
}
```

#### GET `/api/v2/blockchain/txs/:txHash`
Get transaction details with receipt.

**Response:**
```json
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000.5",
  "gasPrice": 20000000000,
  "gasUsed": 50000,
  "gasLimit": 100000,
  "status": "SUCCESS",
  "blockNumber": 3867000,
  "transactionIndex": 5,
  "nonce": 10,
  "timestamp": 1699123456000,
  "formattedTimestamp": "2024-08-14T10:00:00Z",
  "timeAgo": "5 minutes ago",
  "receipt": {
    "status": "0x1",
    "gasUsed": "0xc350",
    "logs": [...]
  }
}
```

#### GET `/api/v2/blockchain/search`
Search for blocks, transactions, or addresses.

**Query Parameters:**
- `q`: Search query (tx hash, block number/hash, or address)

**Response:**
```json
[
  {
    "type": "transaction",
    "data": { ... }
  },
  {
    "type": "block",
    "data": { ... }
  },
  {
    "type": "address",
    "data": {
      "address": "0x...",
      "balance": "1000.5",
      "balanceWei": "1000500000000000000000"
    }
  }
]
```

#### GET `/api/v2/validators`
Validator endpoints (if implemented in routes).

#### GET `/api/v2/staking`
Staking operations (if implemented in routes).

#### GET `/api/v2/governance`
Governance data (if implemented in routes).

#### GET `/api/v2/wallet`
Wallet-related operations (if implemented in routes).

---

## 📡 API 3 - Uptime Tracking API (Port 3004)

### Configuration
- **RPC**: `https://0g-evmrpc-galileo.coinsspor.com/`
- **Validator API**: `http://localhost:3001/api/validators`
- **Analysis Window**: 100 blocks
- **Update Interval**: 60 seconds
- **Cache Duration**: 120 seconds

### Endpoints

#### GET `/api/v2/uptime/grid`
Returns uptime grid for all validators (100-block analysis).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "validator": "0x...",
      "moniker": "Validator Name",
      "identity": "keybase_id",
      "rank": 1,
      "signedBlocks": 95,
      "totalBlocks": 100,
      "missedBlocks": 5,
      "proposedBlocks": 2,
      "uptimePercentage": 95.0,
      "status": "excellent",
      "blockData": [
        {
          "height": 3867000,
          "signed": true,
          "proposer": false,
          "timestamp": 1699123456,
          "txCount": 10
        }
      ],
      "lastSeen": "2024-08-14T10:00:00Z",
      "calculatedAt": "2024-08-14T10:00:00Z",
      "method": "block_analysis",
      "uptimeRank": 1
    }
  ],
  "meta": {
    "totalValidators": 50,
    "averageUptime": "95.5",
    "blockRange": {
      "from": 3866900,
      "to": 3867000,
      "total": 101
    },
    "statusDistribution": {
      "excellent": 40,
      "good": 5,
      "warning": 3,
      "poor": 1,
      "critical": 1
    },
    "methodDistribution": {
      "block_analysis": 45,
      "statistical_fallback": 5
    }
  },
  "cache_info": {
    "last_updated": "2024-08-14T10:00:00Z",
    "update_status": "success",
    "cache_age_seconds": 30
  }
}
```

#### GET `/api/v2/uptime/validator/:address`
Returns uptime data for a specific validator.

**Parameters:**
- `address`: Validator address

**Response:**
```json
{
  "success": true,
  "data": {
    "validator": "0x...",
    "moniker": "Validator Name",
    "signedBlocks": 95,
    "totalBlocks": 100,
    "missedBlocks": 5,
    "proposedBlocks": 2,
    "uptimePercentage": 95.0,
    "status": "excellent",
    "blockData": [...],
    "lastSeen": "2024-08-14T10:00:00Z",
    "calculatedAt": "2024-08-14T10:00:00Z",
    "method": "block_analysis"
  },
  "source": "cache"
}
```

#### GET `/api/v2/uptime/stats`
Returns network uptime statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValidators": 50,
    "averageUptime": "95.5",
    "blockRange": {
      "from": 3866900,
      "to": 3867000,
      "total": 101
    },
    "statusDistribution": {
      "excellent": 40,
      "good": 5,
      "warning": 3,
      "poor": 1,
      "critical": 1
    },
    "methodDistribution": {
      "block_analysis": 45,
      "statistical_fallback": 5
    }
  },
  "last_updated": "2024-08-14T10:00:00Z",
  "update_status": "success"
}
```

#### POST `/api/v2/uptime/refresh`
Forces manual uptime analysis refresh.

**Response:**
```json
{
  "success": true,
  "message": "Simplified uptime analysis refreshed successfully",
  "validators_processed": 50,
  "network_average": "95.5",
  "method_distribution": {
    "block_analysis": 45,
    "statistical_fallback": 5
  }
}
```

#### GET `/api/v2/uptime/health`
Health check and feature information.

**Response:**
```json
{
  "success": true,
  "message": "🚀 Simplified Real Uptime Tracking API - Active!",
  "port": 3004,
  "timestamp": "2024-08-14T10:00:00Z",
  "status": "success",
  "last_update": "2024-08-14T10:00:00Z",
  "features": [
    "🎯 Block Proposer Analysis",
    "📊 Transaction Activity Detection",
    "💾 Fast Memory Cache",
    "🔄 Background Updates",
    "📈 Network Statistics",
    "🔍 Individual Validator Tracking",
    "🛡️ Robust Fallback Systems",
    "📊 Statistical Enhancement"
  ],
  "endpoints": [...],
  "config": {
    "uptime_blocks": 100,
    "update_interval": "60s",
    "validator_api": "http://localhost:3001/api/validators",
    "detection_methods": ["proposer_detection", "transaction_analysis", "statistical_enhancement"],
    "rate_limit_delay": "200ms"
  }
}
```

---

## 🔄 Common Features

### Rate Limiting
- **Default**: 100 requests per minute per IP
- **API v2**: Configurable via environment variables

### Caching Strategy
- **API 1**: 45-second memory cache
- **API 2**: TTL-based caching per service
- **API 3**: 2-minute cache with 60-second updates

### Error Responses
All APIs return standard error format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

### Status Codes
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error
- `503`: Service Unavailable (cache not ready)

---

## 🚨 0G Specific Function Signatures

### Delegation Operations
```javascript
// Delegate
"0x5c19a95c": "Delegate"

// Undelegate  
"0x4d99dd16": "Undelegate"

// Create Validator
"0x441a3e70": "CreateValidator"
"0x1f2f220e": "CreateValidator"
"0xe7740331": "createAndInitializeValidatorIfNecessary"

// Other Operations
"0xf25b3f99": "UpdateCommission"
"0xe6fd48bc": "Withdraw"
"0xa694fc3a": "Stake"
"0x6e512e26": "Redelegate"
```

---

## 📝 Notes

- All timestamps are in Unix format (seconds since epoch)
- All token amounts are returned in human-readable format (0G)
- Addresses should be checksummed Ethereum addresses
- Validator status can be "Aktif" (active) or "Kandidat" (candidate)
- Commission rates are shown as percentages (e.g., "5.00%")

---

## 🆘 Support

For API support or questions:
- GitHub Issues: https://github.com/coinsspor/0g-galileo-explorer/issues
- Discord: 0G Labs Discord
