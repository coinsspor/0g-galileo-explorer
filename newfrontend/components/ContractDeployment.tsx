import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Rocket, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Loader2,
  FileJson,
  Terminal,
  BookOpen,
  Zap,
  Shield,
  BarChart3,
  Sparkles,
  Cpu,
  Database,
  GitBranch,
  Package,
  FileCode2,
  Wallet
} from 'lucide-react';

// Standalone solc-js kullanımı (en güvenilir yöntem)
async function compileWithSolcJs(
  source,
  filename = "MyToken.sol",
  evmVersion = "cancun"
) {
  return new Promise((resolve, reject) => {
    const workerCode = `
      let solcReady = false;
      
      // Standalone solc yükle
      async function initSolc() {
        try {
          // Direkt solc.js binary
          const response = await fetch('https://solc-bin.ethereum.org/wasm/soljson-v0.8.19+commit.7dd6d404.js');
          const solcCode = await response.text();
          
          // Global scope'da eval
          eval(solcCode + '; self.solc = Module;');
          
          // Solc hazır
          solcReady = true;
          return true;
        } catch (error) {
          throw new Error('Failed to load solc: ' + error.message);
        }
      }
      
      // Basit compile function
      function compileSolidity(source, filename, evmVersion) {
        if (!self.solc || !solcReady) {
          throw new Error('Solc not ready');
        }
        
        const input = JSON.stringify({
          language: 'Solidity',
          sources: {
            [filename]: { content: source }
          },
          settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: evmVersion,
            outputSelection: {
              '*': {
                '*': ['abi', 'evm.bytecode.object']
              }
            }
          }
        });
        
        const result = self.solc.cwrap('solidity_compile', 'string', ['string', 'number'])(input, 0);
        return JSON.parse(result);
      }
      
      self.onmessage = async function(e) {
        const { source, filename, evmVersion } = e.data;
        
        try {
          if (!solcReady) {
            self.postMessage({ type: 'status', message: 'Loading Solidity compiler...' });
            await initSolc();
            self.postMessage({ type: 'status', message: 'Compiler ready, compiling...' });
          }
          
          const output = compileSolidity(source, filename, evmVersion);
          
          // Error check
          const errors = (output.errors || []).filter(e => e.severity === 'error');
          if (errors.length) {
            throw new Error(errors.map(e => e.formattedMessage || e.message).join('\\n'));
          }
          
          // Extract contract
          if (!output.contracts || !output.contracts[filename]) {
            throw new Error('No contracts found');
          }
          
          const contractNames = Object.keys(output.contracts[filename]);
          if (!contractNames.length) {
            throw new Error('No contracts compiled');
          }
          
          const contractName = contractNames[0];
          const contract = output.contracts[filename][contractName];
          
          if (!contract.evm || !contract.evm.bytecode) {
            throw new Error('No bytecode generated');
          }
          
          const abi = contract.abi;
          const bytecode = '0x' + contract.evm.bytecode.object;
          
          // Validate bytecode
          if (!bytecode || bytecode === '0x' || !/^0x[0-9a-fA-F]*$/.test(bytecode)) {
            throw new Error('Invalid bytecode');
          }
          
          self.postMessage({
            type: 'result',
            success: true,
            result: {
              abi,
              bytecode,
              contractName,
              warnings: output.errors?.filter(e => e.severity === 'warning') || []
            }
          });
          
        } catch (error) {
          self.postMessage({
            type: 'result', 
            success: false,
            error: error.message
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Compilation timeout'));
    }, 60000);
    
    worker.onmessage = function(e) {
      if (e.data.type === 'status') {
        console.log('Compiler status:', e.data.message);
        return;
      }
      
      if (e.data.type === 'result') {
        clearTimeout(timeout);
        worker.terminate();
        
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      }
    };
    
    worker.onerror = function(error) {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error('Worker error: ' + error.message));
    };
    
    worker.postMessage({ source, filename, evmVersion });
  });
}

const Button = ({ children, onClick, disabled, size, variant, style, className, ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    style={{
      padding: size === 'sm' ? '0.25rem 0.5rem' : '0.5rem 1rem',
      borderRadius: '8px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.3s ease',
      background: variant === 'ghost' ? 'transparent' : undefined,
      ...style
    }}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, disabled, readOnly, style, ...props }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    readOnly={readOnly}
    style={{
      width: '100%',
      padding: '0.75rem',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#fff',
      fontSize: '1rem',
      fontFamily: 'inherit',
      ...style
    }}
    {...props}
  />
);

const Textarea = ({ value, onChange, placeholder, readOnly, style, ...props }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    readOnly={readOnly}
    style={{
      width: '100%',
      padding: '1rem',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical',
      minHeight: '200px',
      ...style
    }}
    {...props}
  />
);

const Label = ({ children, style }) => (
  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9CA3AF', fontSize: '0.9rem', ...style }}>
    {children}
  </label>
);

const Alert = ({ children, style }) => (
  <div style={{
    padding: '1.5rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    ...style
  }}>
    {children}
  </div>
);

const AlertDescription = ({ children }) => (
  <div>{children}</div>
);

const Tabs = ({ children, defaultValue, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const childrenArray = React.Children.toArray(children);
  const tabsList = childrenArray.find(child => child.type === TabsList);
  const tabsContent = childrenArray.filter(child => child.type === TabsContent);
  
  return (
    <div className={className}>
      {React.cloneElement(tabsList, { activeTab, setActiveTab })}
      {tabsContent.map(content => 
        React.cloneElement(content, { key: content.props.value, activeTab })
      )}
    </div>
  );
};

const TabsList = ({ children, activeTab, setActiveTab, style }) => (
  <div style={style}>
    {React.Children.map(children, child =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
);

const TabsTrigger = ({ children, value, activeTab, setActiveTab, style }) => (
  <button
    onClick={() => setActiveTab(value)}
    style={{
      background: activeTab === value ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
      color: activeTab === value ? '#00D4FF' : '#9CA3AF',
      border: 'none',
      cursor: 'pointer',
      ...style
    }}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value, activeTab, className }) => {
  if (activeTab !== value) return null;
  return <div className={className}>{children}</div>;
};

const toast = {
  success: (message) => {
    console.log('SUCCESS:', message);
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;top:20px;right:20px;background:#10B981;color:white;padding:12px 24px;border-radius:8px;z-index:9999;';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        document.body.removeChild(toastEl);
      }
    }, 3000);
  },
  error: (message) => {
    console.error('ERROR:', message);
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;top:20px;right:20px;background:#EF4444;color:white;padding:12px 24px;border-radius:8px;z-index:9999;';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        document.body.removeChild(toastEl);
      }
    }, 5000);
  },
  info: (message) => {
    console.info('INFO:', message);
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;top:20px;right:20px;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;z-index:9999;';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        document.body.removeChild(toastEl);
      }
    }, 3000);
  }
};

export function ContractDeployment() {
  const [address, setAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [contractCode, setContractCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MyToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    string public name = "My Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10**decimals;
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}`);
  
  const [bytecode, setBytecode] = useState('');
  const [abi, setAbi] = useState('');
  const [constructorArgs, setConstructorArgs] = useState('1000000');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [deployHash, setDeployHash] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        setAddress('');
        setIsConnected(false);
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      const interval = setInterval(checkWalletConnection, 2000);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        clearInterval(interval);
      };
    }
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.log('Error checking wallet connection:', error);
      }
    }
  };

  const handleCompile = async () => {
    if (!contractCode.trim()) {
      toast.error("Please enter contract code");
      return;
    }
    
    setIsCompiling(true);
    try {
      const out = await compileWithSolcJs(contractCode, "MyToken.sol", "istanbul");
      setAbi(JSON.stringify(out.abi, null, 2));
      setBytecode(out.bytecode);
      if (out.warnings.length) console.warn("solc warnings:", out.warnings);
      toast.success("Contract compiled successfully!");
    } catch (e) {
      toast.error("Compilation failed:\n" + e.message);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!bytecode || !abi) {
      toast.error("Please compile the contract first");
      return;
    }
    if (!window.ethereum) {
      toast.error("No Ethereum wallet detected");
      return;
    }

    setIsDeploying(true);
    setIsConfirming(true);
    try {
      // 0G testnet kontrolü
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      if (chainIdHex !== "0x40d9") {
        try {
          await window.ethereum.request({ 
            method: "wallet_switchEthereumChain", 
            params: [{ chainId: "0x40d9" }] 
          });
          toast.info('Switched to 0G Chain');
        } catch {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x40d9",
              chainName: "0G Testnet",
              nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
              rpcUrls: ["https://evmrpc-testnet.0g.ai"],
              blockExplorerUrls: ["https://scan-testnet.0g.ai"]
            }]
          });
          toast.success('0G Chain added to wallet');
        }
      }

      // Ethers v6 ile deployment
      const { BrowserProvider, ContractFactory } = await import("ethers");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const parsedABI = typeof abi === "string" ? JSON.parse(abi) : abi;
      const factory = new ContractFactory(parsedABI, bytecode, signer);

      // Constructor arguments
      const args = constructorArgs.trim() ? [BigInt(constructorArgs.trim())] : [];

      // Gas tahmini + buffer
      const deployTx = await factory.getDeployTransaction(...args);
      const est = await provider.estimateGas(deployTx);
      const gasLimit = (est * 12n) / 10n; // %20 buffer

      const sent = await signer.sendTransaction({ ...deployTx, gasLimit });
      setDeployHash(sent.hash);
      toast.success(`Deployment tx sent: ${sent.hash.slice(0,10)}...${sent.hash.slice(-8)}`);

      const rcpt = await sent.wait(); // onay bekle
      if (rcpt?.status !== 1) {
        throw new Error("Deployment transaction reverted");
      }
      
      setDeployedAddress(rcpt.contractAddress);
      toast.success("Contract deployed successfully!");

    } catch (e) {
      const msg = String(e?.message || e);
      if (e?.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (msg.toLowerCase().includes("insufficient")) {
        toast.error("Insufficient balance. Get testnet OG from faucet.");
      } else {
        toast.error("Deployment failed: " + msg);
      }
    } finally {
      setIsDeploying(false);
      setIsConfirming(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(label + ' copied to clipboard');
  };

  const deploymentTools = {
    hardhat: {
      name: 'Hardhat',
      icon: Package,
      color: '#FFC107',
      config: `// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    "0g-testnet": {
      url: "https://evmrpc-testnet.0g.ai/",
      chainId: 16601,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};`,
      deploy: `// scripts/deploy.js
async function main() {
  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy(1000000);
  await token.deployed();
  
  console.log("Token deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`,
      command: 'npx hardhat run scripts/deploy.js --network 0g-testnet'
    },
    foundry: {
      name: 'Foundry',
      icon: GitBranch,
      color: '#00D4FF',
      config: `# foundry.toml
[profile.default]
evm_version = "cancun"

[rpc_endpoints]
0g_testnet = "https://evmrpc-testnet.0g.ai/"`,
      deploy: `forge create --rpc-url https://evmrpc-testnet.0g.ai/ \\
  --private-key $PRIVATE_KEY \\
  --evm-version cancun \\
  src/MyToken.sol:MyToken \\
  --constructor-args 1000000`,
      command: 'forge create src/MyToken.sol:MyToken'
    },
    truffle: {
      name: 'Truffle',
      icon: Database,
      color: '#FF6B35',
      config: `// truffle-config.js
module.exports = {
  networks: {
    "0g_testnet": {
      provider: () => new HDWalletProvider(
        process.env.PRIVATE_KEY,
        "https://evmrpc-testnet.0g.ai/"
      ),
      network_id: 16601,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        evmVersion: "cancun"
      }
    }
  }
};`,
      deploy: `// migrations/2_deploy_token.js
module.exports = function(deployer) {
  deployer.deploy(MyToken, 1000000);
};`,
      command: 'truffle migrate --network 0g_testnet'
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f1f 50%, #0f0a1a 100%)',
      paddingTop: '2rem',
      paddingBottom: '4rem'
    }}>
      <div style={{
        position: 'fixed',
        top: '10%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'fixed',
        bottom: '10%',
        left: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(138, 43, 226, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '0 2rem',
        position: 'relative',
        zIndex: 1 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
              padding: '0.75rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Rocket style={{ width: '2rem', height: '2rem', color: 'white' }} />
            </div>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 50%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              0G Contract Deployer
            </h1>
          </div>
          
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#9CA3AF', 
            maxWidth: '600px', 
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Deploy smart contracts to 0G Testnet with ease. Compile Solidity code and deploy directly from your browser.
          </p>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#10B981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <div>
                <h3 style={{ color: '#00D4FF', fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>0G Testnet</h3>
                <p style={{ color: '#9CA3AF', fontSize: '0.9rem', margin: 0 }}>Chain ID: 16601 • RPC: evmrpc-testnet.0g.ai</p>
              </div>
            </div>
            
            {isConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#10B981',
                  borderRadius: '50%'
                }} />
                <span style={{ color: '#10B981', fontSize: '0.9rem' }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="deploy" style={{ width: '100%' }}>
          <TabsList style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '0.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <TabsTrigger
              value="deploy"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Rocket style={{ width: '1rem', height: '1rem' }} />
              Deploy Contract
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Terminal style={{ width: '1rem', height: '1rem' }} />
              CLI Tools
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <BookOpen style={{ width: '1rem', height: '1rem' }} />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deploy">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Code2 style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                  </div>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                    Smart Contract Code
                  </h3>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <Label>Solidity Contract</Label>
                  <Textarea
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    placeholder="Paste your Solidity contract code here..."
                    style={{ height: '400px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <Label>Constructor Arguments</Label>
                  <Input
                    value={constructorArgs}
                    onChange={(e) => setConstructorArgs(e.target.value)}
                    placeholder="e.g. 1000000"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <Button
                  onClick={handleCompile}
                  disabled={isCompiling || !contractCode.trim()}
                  style={{
                    background: isCompiling ? '#374151' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  {isCompiling ? (
                    <>
                      <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Zap style={{ width: '1rem', height: '1rem' }} />
                      Compile Contract
                    </>
                  )}
                </Button>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #8A2BE2 0%, #FF6B35 100%)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Rocket style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                  </div>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                    Deploy to 0G
                  </h3>
                </div>

                {bytecode && abi && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Alert style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem', color: '#10B981', flexShrink: 0 }} />
                      <AlertDescription style={{ color: '#10B981' }}>
                        Contract compiled successfully! Ready to deploy.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {deployedAddress && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Label>Deployed Contract Address</Label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Input
                        value={deployedAddress}
                        readOnly
                        style={{ fontFamily: 'monospace' }}
                      />
                      <Button
                        onClick={() => copyToClipboard(deployedAddress, 'Contract address')}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <Copy style={{ width: '1rem', height: '1rem', color: 'white' }} />
                      </Button>
                      <Button
                        onClick={() => window.open(`https://scan-testnet.0g.ai/address/${deployedAddress}`, '_blank')}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ExternalLink style={{ width: '1rem', height: '1rem', color: 'white' }} />
                      </Button>
                    </div>
                  </div>
                )}

                {deployHash && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Label>Transaction Hash</Label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Input
                        value={deployHash}
                        readOnly
                        style={{ fontFamily: 'monospace' }}
                      />
                      <Button
                        onClick={() => copyToClipboard(deployHash, 'Transaction hash')}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <Copy style={{ width: '1rem', height: '1rem', color: 'white' }} />
                      </Button>
                      <Button
                        onClick={() => window.open(`https://scan-testnet.0g.ai/tx/${deployHash}`, '_blank')}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <ExternalLink style={{ width: '1rem', height: '1rem', color: 'white' }} />
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || !isConnected || !bytecode || !abi}
                  style={{
                    background: isDeploying ? '#374151' : !isConnected ? '#6B7280' : 'linear-gradient(135deg, #8A2BE2 0%, #FF6B35 100%)',
                    color: 'white',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                      {isConfirming ? 'Confirming...' : 'Deploying...'}
                    </>
                  ) : (
                    <>
                      <Rocket style={{ width: '1rem', height: '1rem' }} />
                      {!isConnected ? 'Connect Wallet from Header' : 'Deploy Contract'}
                    </>
                  )}
                </Button>

                {!isConnected && (
                  <div style={{ 
                    padding: '1rem',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#FFC107', fontSize: '0.9rem', margin: 0 }}>
                      Please connect your wallet from the header to deploy contracts
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(bytecode || abi) && (
              <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem'
              }}>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCode2 style={{ width: '1.25rem', height: '1.25rem', color: '#00D4FF' }} />
                      <Label style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Bytecode</Label>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(bytecode, 'Bytecode')}
                      variant="ghost"
                      size="sm"
                      style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <Copy style={{ width: '1rem', height: '1rem', color: 'white' }} />
                    </Button>
                  </div>
                  <Textarea
                    value={bytecode}
                    readOnly
                    style={{
                      height: '200px',
                      fontSize: '11px',
                      background: 'rgba(0, 0, 0, 0.6)'
                    }}
                  />
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileJson style={{ width: '1.25rem', height: '1.25rem', color: '#8A2BE2' }} />
                      <Label style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>ABI</Label>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(abi, 'ABI')}
                      variant="ghost"
                      size="sm"
                      style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <Copy style={{ width: '1rem', height: '1rem', color: 'white' }} />
                    </Button>
                  </div>
                  <Textarea
                    value={abi}
                    readOnly
                    style={{
                      height: '200px',
                      fontSize: '11px',
                      background: 'rgba(0, 0, 0, 0.6)'
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '2rem'
            }}>
              {Object.entries(deploymentTools).map(([key, tool]) => (
                <div
                  key={key}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '16px',
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      background: tool.color,
                      padding: '0.5rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <tool.icon style={{ width: '1rem', height: '1rem', color: 'white' }} />
                    </div>
                    <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      {tool.name}
                    </h3>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <Label>Configuration</Label>
                    <Textarea
                      value={tool.config}
                      readOnly
                      style={{
                        height: '200px',
                        fontSize: '12px',
                        background: 'rgba(0, 0, 0, 0.6)'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <Label>Deploy Script</Label>
                    <Textarea
                      value={tool.deploy}
                      readOnly
                      style={{
                        height: '150px',
                        fontSize: '12px',
                        background: 'rgba(0, 0, 0, 0.6)'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      onClick={() => copyToClipboard(tool.config, `${tool.name} config`)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontWeight: '500',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                    >
                      <Copy style={{ width: '1rem', height: '1rem' }} />
                      Copy Config
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(tool.command, `${tool.name} command`)}
                      style={{
                        background: tool.color,
                        color: 'white',
                        fontWeight: '500',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                    >
                      <Terminal style={{ width: '1rem', height: '1rem' }} />
                      Copy Command
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="docs">
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                </div>
                <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                  0G Testnet Documentation
                </h3>
              </div>

              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Sparkles style={{ width: '1.25rem', height: '1.25rem', color: '#00D4FF' }} />
                  <h4 style={{ color: '#00D4FF', fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>
                    Quick Start Guide
                  </h4>
                </div>
                <ol style={{ color: '#9CA3AF', fontSize: '0.95rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li>Connect your MetaMask wallet using the header button</li>
                  <li>Get testnet OG tokens from: https://faucet-testnet.0g.ai</li>
                  <li>Paste your Solidity contract code in the editor</li>
                  <li>Click "Compile Contract" to generate bytecode and ABI</li>
                  <li>Set constructor arguments if needed</li>
                  <li>Click "Deploy Contract" to deploy to 0G Testnet</li>
                  <li>Monitor your transaction on the block explorer</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}