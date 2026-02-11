
import React, { useEffect, useState } from 'react';
import { useGame } from '../services/GameContext';
import { RARITY_COLORS } from '../constants';
import { Coins, Star, X, CheckCircle, Skull, Box, Filter } from 'lucide-react';
import { formatNumber } from '../utils/gameMath';
import { ItemIcon } from './ItemIcon';

export const DungeonResultModal: React.FC = () => {
  const { state, dismissReport } = useGame();
  const [isPaused, setIsPaused] = useState(false);
  
  // Show the oldest report (queue style)
  const report = state.recentReports[0];

  // Auto-dismiss logic
  useEffect(() => {
    if (!report || isPaused) return;

    const timer = setTimeout(() => {
        dismissReport(report.id);
    }, 1000); // Changed from 4000ms to 1000ms (1s) as requested

    return () => clearTimeout(timer);
  }, [report, isPaused, dismissReport]);

  if (!report) return null;

  return (
    <div 
        key={report.id} // Forces re-mount when report changes to restart animation
        className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-slate-900/95 backdrop-blur shadow-2xl border border-slate-700 rounded-lg w-72 overflow-hidden relative group cursor-default">
        
        {/* Progress Bar for Timer (Visual indicator) */}
        {!isPaused && (
            <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/50 w-full animate-progress origin-left">
                <style>{`
                    @keyframes progress {
                        from { transform: scaleX(0); }
                        to { transform: scaleX(1); }
                    }
                    .animate-progress {
                        animation: progress 1s linear forwards;
                    }
                `}</style>
            </div>
        )}

        {/* Compact Content */}
        <div className="p-3 flex items-start gap-3">
            {/* Status Icon */}
            <div className={`mt-0.5 flex-shrink-0 ${report.success ? 'text-green-400' : 'text-red-400'}`}>
                {report.success ? <CheckCircle size={18} /> : <Skull size={18} />}
            </div>

            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-200 truncate pr-4">{report.dungeonName}</h4>
                    <button 
                        onClick={() => dismissReport(report.id)} 
                        className="text-slate-600 hover:text-slate-300 transition-colors absolute top-2 right-2"
                    >
                        <X size={14} />
                    </button>
                </div>

                {report.success ? (
                    <div className="mt-1 space-y-2">
                         {/* Currency/XP Line */}
                        <div className="flex gap-3 text-xs">
                             <span className="flex items-center gap-1 text-yellow-400 font-mono">
                                 <Coins size={12}/> +{formatNumber(report.goldEarned)}
                             </span>
                             <span className="flex items-center gap-1 text-blue-400 font-mono">
                                 <Star size={12}/> +{formatNumber(report.xpEarned)}
                             </span>
                        </div>

                        {/* Items Found (Compact List) */}
                        {report.itemsFound.length > 0 && (
                            <div className="space-y-1 mt-2">
                                {report.itemsFound.slice(0, 2).map(item => (
                                    <div key={item.id} className="flex items-center gap-1.5 text-[10px] bg-slate-800/50 px-1.5 py-1 rounded border border-slate-700/50">
                                         <div className="flex-shrink-0">
                                            <ItemIcon item={item} size={10} />
                                         </div>
                                         <span className={`truncate ${RARITY_COLORS[item.rarity]}`}>{item.name}</span>
                                    </div>
                                ))}
                                {report.itemsFound.length > 2 && (
                                    <div className="text-[10px] text-slate-500 pl-1">
                                        +{report.itemsFound.length - 2} more items...
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Auto-Salvage Report */}
                        {report.autoSalvagedCount > 0 && (
                            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-950/30 px-1.5 py-1 rounded border border-dashed border-slate-800">
                                <Filter size={10} />
                                <span>Filter: {report.autoSalvagedCount} salvaged (+{report.autoSalvagedGold}g)</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-red-300/80 mt-1">Mission failed. No rewards.</p>
                )}
            </div>
        </div>
        
        {/* Stack Indicator */}
        {state.recentReports.length > 1 && (
             <div className="absolute top-0 right-0 p-1">
                 <div className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 rounded-bl-lg shadow-sm">
                     +{state.recentReports.length - 1}
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};
