// Validator API Service
const API_BASE = '/api';
const API_V2_BASE = '/api/v2';

export interface Validator {
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

export interface DelegatorInfo {
  rank: number;
  address: string;
  staked: number;
  percentage: string;
  shortAddress: string;
}

export interface TransactionInfo {
  hash: string;
  type: string;
  status: string;
  amount: string;
  from: string;
  to: string;
  blockNumber: number;
  date: string;
}

export const validatorAPI = {
  // Get all validators
  async getValidators() {
    const response = await fetch(`${API_BASE}/validators`);
    if (!response.ok) throw new Error('Failed to fetch validators');
    return response.json();
  },

  // Get validator delegators
  async getValidatorDelegators(address: string) {
    const response = await fetch(`${API_BASE}/validator-delegators/${address}`);
    if (!response.ok) throw new Error('Failed to fetch delegators');
    return response.json();
  },

  // Get validator transactions
  async getValidatorTransactions(address: string) {
    const response = await fetch(`${API_BASE}/validator-transactions/${address}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  // Get wallet delegations
  async getWalletDelegations(address: string) {
    const response = await fetch(`${API_BASE}/delegations/${address}`);
    if (!response.ok) throw new Error('Failed to fetch delegations');
    return response.json();
  }
};

export const blockchainAPI = {
  // Get blockchain stats
  async getStats() {
    const response = await fetch(`${API_V2_BASE}/blockchain/stats`);
    if (!response.ok) throw new Error('Failed to fetch blockchain stats');
    return response.json();
  },

  // Get uptime grid
  async getUptimeGrid() {
    const response = await fetch(`${API_V2_BASE}/uptime/grid`);
    if (!response.ok) throw new Error('Failed to fetch uptime data');
    return response.json();
  }
};
