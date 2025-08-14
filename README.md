# 🚀 0G Galileo Explorer

<div align="center">
  <img src="frontend/public/0glogo.jpg" alt="0G Logo" width="120"/>
  
  [![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://0ggalileoexplorer.coinsspor.com)
  [![Validators](https://img.shields.io/badge/validators-50%2B-blue)](https://0ggalileoexplorer.coinsspor.com)
  [![Uptime](https://img.shields.io/badge/uptime-99.9%25-success)](https://0ggalileoexplorer.coinsspor.com)
  
  **The Most Comprehensive Blockchain Explorer for 0G Network**
  
  [🌐 Live Demo](https://0ggalileoexplorer.coinsspor.com) | [📚 Documentation](docs/API_DOCUMENTATION.md) | [🗺️ Roadmap](ROADMAP.md)
</div>

---

## 🏆 Wavehack Submission

- **Track**: DevTooling
- **Team**: CoinsSpor Team
- **Waves**: 1-6 (All waves)
- **Status**: Wave 1-2 Completed ✅ | Wave 3 In Progress 🚧

## 🌟 Key Features

### ✅ Completed (Wave 1-2)
- **Real-time Validator Tracking** - 50+ validators with 6-layer detection
- **Complete Delegation Management** - MetaMask integration
- **100-Block Uptime Analysis** - Real block proposer detection
- **Transaction History** - Complete TX analysis with categories
- **Advanced Analytics** - Delegator distribution, performance metrics
- **3-Layer API Architecture** - Modular microservices

### 🚧 In Development (Wave 3)
- RPC Scanner Tool
- Contract Deployment Helper
- Advanced Search

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/coinsspor/0g-galileo-explorer.git
cd 0g-galileo-explorer

# Install all dependencies
npm run install:all

# Start all services
npm run start:all

# Access:
# Frontend: http://localhost:5174
# API 1: http://localhost:3001
# API 2: http://localhost:3002
# API 3: http://localhost:3004
```

## 🏗️ Architecture

```
Frontend (React + TypeScript + Vite)
    ↓
3 Independent APIs
    ├── Validator API (3001) - Core validator data
    ├── Blockchain API (3002) - Network statistics
    └── Uptime API (3004) - Real-time uptime tracking
    ↓
0G Network RPC
```

## 📊 Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Response Time | <100ms | ✅ Excellent |
| Uptime | 99.9% | ✅ Excellent |
| Cache Hit Rate | 87% | ✅ Good |
| Validators Tracked | 50+ | ✅ Complete |
| Daily API Calls | 10,000+ | ✅ Active |

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts
- **Backend**: Node.js, Express, ethers.js
- **Blockchain**: 0G Network (EVM Compatible)
- **Deployment**: VPS with Nginx

## 📈 0G Integration

Using 0G's infrastructure:
- ✅ **0G Chain**: Full RPC integration for all blockchain data
- ✅ **Smart Contracts**: Direct interaction with staking contracts
- 🚧 **0G Storage**: Coming in Wave 4
- 🚧 **0G DA**: Coming in Wave 5

## 🤝 Contributing

We welcome contributions! Please check our [Contributing Guide](docs/CONTRIBUTING.md).

## 📞 Contact

- **Website**: [https://0ggalileoexplorer.coinsspor.com](https://0ggalileoexplorer.coinsspor.com)
- **GitHub**: [@coinsspor](https://github.com/coinsspor)
- **Discord**: [0G Labs](https://discord.gg/0glabs)

---

<div align="center">
  Built with ❤️ for the 0G Community
</div>
