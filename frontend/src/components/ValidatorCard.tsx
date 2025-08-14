import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Zap, ExternalLink } from 'lucide-react';

interface Validator {
  rank: number;
  moniker: string;
  consensus_address: string;
  voting_power: string;
  percentage: string;
  status: string;
  identity?: string;
  website?: string;
  avatarUrl?: string;
}

interface ValidatorCardProps {
  validator: Validator;
}

const ValidatorCard: React.FC<ValidatorCardProps> = ({ validator }) => {
  // Emoji destekli rank ikonu
  const getRankIcon = (rank: number): React.ReactElement | string => {
    if (rank === 1) return <span className="emoji">??</span>;
    if (rank === 2) return <span className="emoji">??</span>;
    if (rank === 3) return <span className="emoji">??</span>;
    return `#${rank}`;
  };

  // Avatar URL'i oluşturma
  const getAvatarUrl = (validator: Validator): string => {
    // Önce validator'ın kendi avatar URL'i varsa onu kullan
    if (validator.avatarUrl && validator.avatarUrl.startsWith('http')) {
      return validator.avatarUrl;
    }
    
    // Keybase identity varsa dene
    if (validator.identity) {
      return `https://keybase.io/${validator.identity}/picture`;
    }
    
    // Fallback SVG avatar
    const letter = validator.moniker ? validator.moniker.charAt(0).toUpperCase() : '?';
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const colorIndex = validator.moniker ? validator.moniker.charCodeAt(0) % colors.length : 0;
    const color = colors[colorIndex];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad${validator.rank}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="40" fill="url(#grad${validator.rank})"/>
        <text x="40" y="50" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${letter}</text>
      </svg>
    `)}`;
  };

  // Avatar yükleme hatası
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const target = e.target as HTMLImageElement;
    target.src = getAvatarUrl({ ...validator, identity: undefined, avatarUrl: undefined });
  };

  const formatVotingPower = (power: string): string => {
    return Number(power).toLocaleString();
  };



  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getRankIcon(validator.rank)}</span>
            <img
              src={getAvatarUrl(validator)}
              alt={`${validator.moniker} avatar`}
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 hover:scale-105 transition-transform"
              onError={handleAvatarError}
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{validator.moniker}</h3>
            <p className="text-sm text-gray-600">Validator #{validator.rank}</p>
            {validator.identity && (
              <p className="text-xs text-purple-600">
                <span className="emoji">??</span> {validator.identity}
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">{validator.percentage}</div>
          <div className="text-sm text-gray-500">Voting Power</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-600">
            {formatVotingPower(validator.voting_power)} VP
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-600">
            {validator.status === 'BOND_STATUS_BONDED' ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Trophy className="w-4 h-4 text-purple-500" />
          <span className="text-sm text-gray-600">Rank {validator.rank}</span>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            {validator.consensus_address.slice(0, 8)}...{validator.consensus_address.slice(-8)}
          </span>
          
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1">
              <span className="emoji">??</span>
              Delegate
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {validator.website && (
        <div className="mt-3 pt-3 border-t">
          <a 
            href={validator.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span className="emoji">??</span>
            Visit Website
          </a>
        </div>
      )}
    </motion.div>
  );
};

export default ValidatorCard;