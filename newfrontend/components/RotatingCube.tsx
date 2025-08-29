import { useEffect, useState } from 'react';

export function RotatingCube({ stats }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return (
    <div className="flex items-center justify-center h-64 perspective-1000">
      <div 
        className="relative w-32 h-32 rotate-3d preserve-3d"
        style={{ 
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        {/* Front face - Block Number */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'translateZ(64px)' }}>
          <div className="text-center">
            <div className="text-green-400 text-xs font-mono">BLOCK</div>
            <div className="text-green-400 text-lg font-bold">#{stats?.latestBlock || 0}</div>
          </div>
        </div>
        
        {/* Back face - TPS */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 border border-secondary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'translateZ(-64px) rotateY(180deg)' }}>
          <div className="text-center">
            <div className="text-blue-400 text-xs font-mono">TPS</div>
            <div className="text-blue-400 text-lg font-bold">{stats?.tps?.toFixed?.(0) || 0}</div>
          </div>
        </div>
        
        {/* Right face - Gas Price */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'rotateY(90deg) translateZ(64px)' }}>
          <div className="text-center">
            <div className="text-yellow-400 text-xs font-mono">GAS</div>
            <div className="text-yellow-400 text-lg font-bold">{(stats?.gasPrice / 1e9)?.toFixed?.(2) || 0}</div>
          </div>
        </div>
        
        {/* Left face - Transactions */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-secondary/20 border border-accent/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'rotateY(-90deg) translateZ(64px)' }}>
          <div className="text-center">
            <div className="text-purple-400 text-xs font-mono">TXS</div>
            <div className="text-purple-400 text-lg font-bold">{stats?.blockTxs || 0}</div>
          </div>
        </div>
        
        {/* Top face - Validators */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 border border-secondary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'rotateX(90deg) translateZ(64px)' }}>
          <div className="text-center">
            <div className="text-cyan-400 text-xs font-mono">VALIDATORS</div>
            <div className="text-cyan-400 text-lg font-bold">{stats?.activeValidators || 0}</div>
          </div>
        </div>
        
        {/* Bottom face - Block Time */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
             style={{ transform: 'rotateX(-90deg) translateZ(64px)' }}>
          <div className="text-center">
            <div className="text-pink-400 text-xs font-mono">TIME</div>
            <div className="text-pink-400 text-lg font-bold">{stats?.avgBlockTime || 0}s</div>
          </div>
        </div>
      </div>
    </div>
  );
}