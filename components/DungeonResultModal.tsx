
import React, { useEffect, useState } from 'react';
import { useGame } from '../services/GameContext';
import { RARITY_BG_COLORS, RARITY_COLORS, MATERIALS } from '../constants';
import { Coins, Star, X, CheckCircle, Skull, Filter, ArrowRight, Box } from 'lucide-react';
import { formatNumber, calculateItemRating } from '../utils/gameMath';
import { ItemIcon } from './ItemIcon';
import { motion, AnimatePresence } from 'framer-motion';

export const DungeonResultModal: React.FC = () => {
  const { state, dismissReport } = useGame();
  const [isHovered, setIsHovered] = useState(false);
  
  // Always show the most recent report (stack[0])
  const report = state.recentReports[0];

  useEffect(() => {
    if (!report || isHovered) return;
    const timer = setTimeout(() => {
        dismissReport(report.id);
    }, 4000); // 4 seconds auto-dismiss
    return () => clearTimeout(timer);
  }, [report, isHovered, dismissReport]);

  if (!report) return null;

  const totalLootCount = report.itemsFound.length + Object.keys(report.materialsFound).length;
  
  // Display Limit logic
  const MAX_DISPLAY = 4;
  const displayedItems = report.itemsFound.slice(0, MAX_DISPLAY);
  const remainingSlots = Math.max(0, MAX_DISPLAY - displayedItems.length);
  const displayedMats = Object.entries(report.materialsFound).slice(0, remainingSlots);
  const hiddenCount = totalLootCount - (displayedItems.length + displayedMats.length);

  return (
    <AnimatePresence>
        <motion.div 
            key={report.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-72"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`
                relative overflow-hidden rounded-lg shadow-2xl border-l-4 bg-slate-900
                ${report.success 
                    ? 'border-l-green-500 border-t border-r border-b border-slate-700' 
                    : 'border-l-red-500 border-red-900'
                }
            `}>
                {/* Compact Header */}
                <div className="flex justify-between items-center px-3 py-2 bg-slate-950/50 border-b border-slate-800">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {report.success ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" /> : <Skull size={14} className="text-red-400 flex-shrink-0" />}
                        <span className="text-xs font-bold text-slate-200 truncate">{report.dungeonName}</span>
                    </div>
                    <button onClick={() => dismissReport(report.id)} className="text-slate-600 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Compact Body */}
                <div className="p-3 space-y-3">
                    {report.success ? (
                        <>
                            {/* Gold & XP Row */}
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center justify-between px-2 py-1 bg-yellow-950/20 border border-yellow-900/30 rounded">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <Coins size={12} />
                                        <span className="text-[10px] font-bold uppercase">Gold</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-yellow-400"><CountUp end={report.goldEarned} /></span>
                                </div>
                                <div className="flex-1 flex items-center justify-between px-2 py-1 bg-blue-950/20 border border-blue-900/30 rounded">
                                    <div className="flex items-center gap-1 text-blue-500">
                                        <Star size={12} />
                                        <span className="text-[10px] font-bold uppercase">XP</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-blue-400"><CountUp end={report.xpEarned} /></span>
                                </div>
                            </div>

                            {/* Loot List (Vertical) */}
                            {totalLootCount > 0 && (
                                <div className="flex flex-col gap-1">
                                    {displayedItems.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 p-1.5 rounded bg-slate-950/30 border border-slate-800/50">
                                            <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border ${RARITY_BG_COLORS[item.rarity]} border-slate-700`}>
                                                <ItemIcon item={item} size={14} showRarityColor={true} />
                                            </div>
                                            <div className={`text-xs font-bold truncate flex-1 ${RARITY_COLORS[item.rarity]}`}>
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500">
                                                {calculateItemRating(item)} Pwr
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {displayedMats.map(([id, count]) => {
                                        const mat = MATERIALS[id];
                                        return (
                                            <div key={id} className="flex items-center gap-2 p-1.5 rounded bg-slate-950/30 border border-slate-800/50">
                                                <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center bg-slate-800 border border-slate-700">
                                                    <Box size={12} className="text-emerald-400"/>
                                                </div>
                                                <div className={`text-xs font-bold truncate flex-1 ${RARITY_COLORS[mat?.rarity || 'Common']}`}>
                                                    {mat?.name || id}
                                                </div>
                                                <div className="text-[10px] font-mono text-slate-400">
                                                    x{count as number}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {hiddenCount > 0 && (
                                        <div className="text-center text-[9px] text-slate-500 uppercase tracking-wider py-1 bg-slate-950/20 rounded">
                                            + {hiddenCount} more items
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Auto Salvage Footer */}
                            {report.autoSalvagedCount > 0 && (
                                <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 pt-1 border-t border-slate-800/50">
                                    <Filter size={10} />
                                    <span>Salvaged {report.autoSalvagedCount} items for</span>
                                    <span className="text-yellow-600 font-mono">{report.autoSalvagedGold}g</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-red-300 font-bold">Party Defeated</p>
                            <p className="text-[10px] text-red-500/70">No rewards recovered.</p>
                        </div>
                    )}
                </div>

                {/* Progress Bar (Visual Timer) */}
                {!isHovered && (
                    <motion.div 
                        className="h-0.5 bg-indigo-500 origin-left"
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: 4, ease: "linear" }}
                    />
                )}
            </div>
            
            {/* Queue Counter Badge */}
            {state.recentReports.length > 1 && (
                <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-slate-900 animate-pulse z-50">
                    +{state.recentReports.length - 1} More
                </div>
            )}
        </motion.div>
    </AnimatePresence>
  );
};

const CountUp: React.FC<{ end: number }> = ({ end }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const duration = 800; // Faster count up for smaller UI
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = end / steps;
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, stepTime);
        return () => clearInterval(timer);
    }, [end]);
    
    return <>{formatNumber(count)}</>;
};
