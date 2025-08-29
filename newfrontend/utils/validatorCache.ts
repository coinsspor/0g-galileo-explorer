interface CachedData {
  validators: any[];
  timestamp: number;
  delegationsCache?: { [address: string]: { count: number; timestamp: number } };
}

const CACHE_KEY = 'validators_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 5 dakika

export const getValidatorsCache = (): CachedData | null => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const data = JSON.parse(cached);
  const now = Date.now();
  
  // Cache süresi dolmuşsa null döndür
  if (now - data.timestamp > CACHE_DURATION) {
    return null;
  }
  
  return data;
};

export const setValidatorsCache = (validators: any[]) => {
  const existing = getValidatorsCache();
  const data: CachedData = {
    validators,
    timestamp: Date.now(),
    delegationsCache: existing?.delegationsCache || {}
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
};

export const clearValidatorsCache = () => {
  localStorage.removeItem(CACHE_KEY);
};

// Delegation cache fonksiyonları
export const getCachedDelegation = (address: string): number | null => {
  const cached = getValidatorsCache();
  if (!cached?.delegationsCache?.[address]) return null;
  
  const delegation = cached.delegationsCache[address];
  const now = Date.now();
  
  if (now - delegation.timestamp > CACHE_DURATION) {
    return null;
  }
  
  return delegation.count;
};

export const setCachedDelegation = (address: string, count: number) => {
  const cached = getValidatorsCache() || { validators: [], timestamp: Date.now() };
  
  if (!cached.delegationsCache) {
    cached.delegationsCache = {};
  }
  
  cached.delegationsCache[address] = {
    count,
    timestamp: Date.now()
  };
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
};