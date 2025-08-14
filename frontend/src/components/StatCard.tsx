import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  emoji?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, emoji }) => {
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
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className="relative overflow-hidden rounded-xl p-6 shadow-lg bg-white/10 backdrop-blur-md border border-white/20"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-10`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-8 h-8 text-white/80" />
          {emoji && <span className="emoji text-2xl">{emoji}</span>}
        </div>
        
        <h3 className="text-lg font-semibold text-white/90 mb-2">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
      <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/5 rounded-full"></div>
    </motion.div>
  );
};

export default StatCard;