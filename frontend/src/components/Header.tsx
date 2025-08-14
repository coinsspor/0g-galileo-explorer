import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Database, Cpu, Layers } from 'lucide-react';

const Header = () => {
  // Emoji font desteği için CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .emoji {
        font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', sans-serif !important;
        font-variant-emoji: emoji;
        font-feature-settings: "liga" 1, "calt" 1;
        display: inline-block;
        vertical-align: middle;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card p-8 rounded-2xl text-center mb-8"
      style={{ 
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 mr-4 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shadow-lg">
          0G
        </div>
        <h1 className="text-5xl font-bold text-white">
          <span className="emoji">??</span> Galileo Explorer
        </h1>
      </div>
      
      <p className="text-xl text-white/80 mb-6 font-medium">
        Ultra-modern explorer for 0G's EVM + AI + Storage ecosystem
      </p>
      
      {/* Feature badges */}
      <div className="flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full text-white bg-white/10 backdrop-blur-sm border border-white/20">
          <Zap className="w-4 h-4" />
          <span className="emoji">?</span>
          <span>2,500 TPS</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full text-white bg-white/10 backdrop-blur-sm border border-white/20">
          <Database className="w-4 h-4" />
          <span className="emoji">???</span>
          <span>Storage Network</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full text-white bg-white/10 backdrop-blur-sm border border-white/20">
          <Cpu className="w-4 h-4" />
          <span className="emoji">??</span>
          <span>AI Compute</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full text-white bg-white/10 backdrop-blur-sm border border-white/20">
          <Layers className="w-4 h-4" />
          <span className="emoji">??</span>
          <span>DA Layer</span>
        </div>
      </div>
      
      <div className="mt-6 text-white/70 text-sm">
        <span className="emoji">??</span> LIVE • Real-time blockchain data
      </div>
    </motion.div>
  );
};

export default Header;