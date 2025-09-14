import { ethers } from 'ethers';
import Database from 'better-sqlite3';

const provider = new ethers.JsonRpcProvider('http://localhost:14545');
const db = new Database('explorer.db');

// SQLite optimizasyonları
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');
db.pragma('cache_size = 10000');
db.pragma('temp_store = MEMORY');

console.log('🚀 0G Explorer - Setup with smaller batches\n');

// Tablolar (aynı)
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    address TEXT PRIMARY KEY COLLATE NOCASE,
    type TEXT CHECK(type IN ('erc20', 'erc721', 'erc1155')),
    name TEXT,
    symbol TEXT,
    decimals INTEGER DEFAULT 18,
    total_supply TEXT,
    holder_count INTEGER DEFAULT 0,
    transfer_count INTEGER DEFAULT 0,
    deploy_block INTEGER,
    deployer TEXT,
    last_update INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_address TEXT COLLATE NOCASE,
    holder_address TEXT,
    balance TEXT,
    percentage REAL,
    rank INTEGER,
    last_update INTEGER,
    UNIQUE(token_address, holder_address),
    FOREIGN KEY (token_address) REFERENCES tokens(address)
  );
  
  CREATE TABLE IF NOT EXISTS transfer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_address TEXT COLLATE NOCASE,
    date TEXT,
    transfer_count INTEGER,
    unique_senders INTEGER,
    unique_receivers INTEGER,
    volume TEXT,
    UNIQUE(token_address, date)
  );
  
  CREATE TABLE IF NOT EXISTS nft_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_address TEXT COLLATE NOCASE,
    token_id TEXT,
    uri TEXT,
    name TEXT,
    description TEXT,
    image TEXT,
    attributes TEXT,
    owner TEXT,
    creator TEXT,
    minted_block INTEGER,
    last_update INTEGER,
    UNIQUE(token_address, token_id)
  );
  
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    data TEXT,
    expires INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_holders_token ON holders(token_address);
  CREATE INDEX IF NOT EXISTS idx_holders_balance ON holders(balance DESC);
  CREATE INDEX IF NOT EXISTS idx_history_token ON transfer_history(token_address);
  CREATE INDEX IF NOT EXISTS idx_nft_token ON nft_metadata(token_address, token_id);
  CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires);
`);

async function discoverAndAnalyze() {
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}\n`);
  
  const TOTAL_BLOCKS = 3000; // Daha az blok
  const BATCH_SIZE = 500; // Her seferinde 500 blok
  
  console.log(`Scanning last ${TOTAL_BLOCKS} blocks in batches of ${BATCH_SIZE}...\n`);
  
  const sig20or721 = ethers.id('Transfer(address,address,uint256)');
  const sig1155s = ethers.id('TransferSingle(address,address,address,uint256,uint256)');
  const sig1155b = ethers.id('TransferBatch(address,address,address,uint256[],uint256[])');
  
  const allLogs = [];
  
  // Batch halinde topla
  for (let i = 0; i < TOTAL_BLOCKS; i += BATCH_SIZE) {
    const fromBlock = Math.max(0, currentBlock - TOTAL_BLOCKS + i);
    const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);
    
    console.log(`  Scanning blocks ${fromBlock} - ${toBlock}...`);
    
    try {
      const logs = await provider.getLogs({
        topics: [[sig20or721, sig1155s, sig1155b]],
        fromBlock,
        toBlock
      });
      
      allLogs.push(...logs);
      console.log(`    Found ${logs.length} events`);
      
      // RPC'yi fazla yormamak için kısa bekle
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`    Error in batch ${fromBlock}-${toBlock}: ${err.message}`);
      // Hata olsa bile devam et
    }
  }
  
  console.log(`\nTotal events found: ${allLogs.length}\n`);
  
  // Token verilerini organize et
  const tokenData = new Map();
  
  allLogs.forEach(log => {
    const token = log.address.toLowerCase();
    const topic0 = log.topics[0];
    
    if (!tokenData.has(token)) {
      tokenData.set(token, {
        holders: new Set(),
        transfers: [],
        nftIds: new Set(),
        firstBlock: log.blockNumber,
        transferCount: 0
      });
    }
    
    const data = tokenData.get(token);
    
    if (topic0 === sig20or721) {
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      
      if (to !== '0x0000000000000000000000000000000000000000') {
        data.holders.add(to);
      }
      
      if (log.topics.length === 4) {
        const tokenId = BigInt(log.topics[3]).toString();
        data.nftIds.add(tokenId);
      }
      
      data.transfers.push({ from, to, block: log.blockNumber, log });
      
    } else if (topic0 === sig1155s) {
      const from = '0x' + log.topics[2].slice(26);
      const to = '0x' + log.topics[3].slice(26);
      
      if (to !== '0x0000000000000000000000000000000000000000') {
        data.holders.add(to);
      }
      
      try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256', 'uint256'],
          log.data
        );
        const tokenId = decoded[0].toString();
        data.nftIds.add(tokenId);
      } catch {}
      
      data.transfers.push({ from, to, block: log.blockNumber, log });
      
    } else if (topic0 === sig1155b) {
      const from = '0x' + log.topics[2].slice(26);
      const to = '0x' + log.topics[3].slice(26);
      
      if (to !== '0x0000000000000000000000000000000000000000') {
        data.holders.add(to);
      }
      
      try {
        const [ids, values] = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256[]', 'uint256[]'], 
          log.data
        );
        
        for (let i = 0; i < Math.min(ids.length, 5); i++) {
          data.nftIds.add(ids[i].toString());
        }
      } catch {}
      
      data.transfers.push({ from, to, block: log.blockNumber, log });
    }
    
    data.transferCount++;
    data.firstBlock = Math.min(data.firstBlock, log.blockNumber);
  });
  
  console.log(`Found ${tokenData.size} unique token contracts\n`);
  
  let savedTokens = 0;
  
  // Token bilgilerini al ve kaydet
  for (const [address, data] of tokenData) {
    try {
      const code = await provider.getCode(address);
      if (code.length < 100) continue;
      
      const contract = new ethers.Contract(address, [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function supportsInterface(bytes4) view returns (bool)'
      ], provider);
      
      const name = await contract.name().catch(() => null);
      const symbol = await contract.symbol().catch(() => null);
      
      if (!name || !symbol) continue;
      
      const decimals = await contract.decimals().catch(() => 18);
      const totalSupply = await contract.totalSupply().catch(() => 0n);
      
      // Token type detection
      let type = 'erc20';
      try {
        if (await contract.supportsInterface('0x80ac58cd')) type = 'erc721';
        else if (await contract.supportsInterface('0xd9b67a26')) type = 'erc1155';
      } catch {
        if (code.includes('80ac58cd')) type = 'erc721';
        else if (code.includes('d9b67a26')) type = 'erc1155';
      }
      
      // Deployer
      let deployer = null;
      try {
        const firstLog = data.transfers[0]?.log;
        if (firstLog) {
          const tx = await provider.getTransaction(firstLog.transactionHash);
          deployer = tx?.from || null;
        }
      } catch {}
      
      db.prepare(`
        INSERT OR REPLACE INTO tokens 
        (address, type, name, symbol, decimals, total_supply, holder_count, transfer_count, deploy_block, deployer, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        address, type, name, symbol, decimals,
        totalSupply.toString(), data.holders.size, data.transferCount,
        data.firstBlock, deployer, Date.now()
      );
      
      savedTokens++;
      console.log(`✅ ${savedTokens}. ${name} (${symbol}) - ${type}`);
      
      // Top 10 holder
      const holderArray = Array.from(data.holders).slice(0, 10);
      for (const holderAddr of holderArray) {
        try {
          const balance = await contract.balanceOf(holderAddr);
          if (balance > 0n) {
            const percentage = totalSupply > 0n ? Number(balance * 10000n / totalSupply) / 100 : 0;
            
            db.prepare(`
              INSERT OR REPLACE INTO holders 
              (token_address, holder_address, balance, percentage, rank, last_update)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(address, holderAddr, balance.toString(), percentage, 0, Date.now());
          }
        } catch {}
      }
      
    } catch (err) {
      console.error(`Error processing ${address}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Setup complete: ${savedTokens} tokens saved`);
}

// Çalıştır
discoverAndAnalyze().catch(console.error).finally(() => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN type = 'erc20' THEN 1 ELSE 0 END) as erc20,
      SUM(CASE WHEN type = 'erc721' THEN 1 ELSE 0 END) as erc721,
      SUM(CASE WHEN type = 'erc1155' THEN 1 ELSE 0 END) as erc1155
    FROM tokens
  `).get();
  
  console.log('\n📊 Final Statistics:');
  console.log(`   Tokens: ${stats.total}`);
  console.log(`   ERC20: ${stats.erc20}`);
  console.log(`   ERC721: ${stats.erc721}`);
  console.log(`   ERC1155: ${stats.erc1155}`);
  
  db.close();
});
