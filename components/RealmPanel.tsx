
import React from 'react';
import { useGame } from '../services/GameContext';
import { REALM_CONFIG, REALM_MODIFIERS } from '../constants';
import { calculateRealmXpRequired, getRealmBonuses, formatNumber } from '../utils/gameMath';
import { Globe, TrendingUp, Skull, Sparkles, Lock, Unlock, Crown, AlertOctagon, ArrowUpCircle } from 'lucide-react';

export const RealmPanel: React.FC = () => {
    const { state } = useGame();
    const { realmRank, realmExperience, realmTier } = state.realm;
    const tier = realmTier || 1; // Fallback
    
    const xpRequired = calculateRealmXpRequired(realmRank + 1);
    const progressPercent = Math.min(100, (realmExperience / xpRequired) * 100);
    
    // Calculate global bonuses
    const bonuses = getRealmBonuses(state.realm);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* REWARDS (RANK) - Soft Progression */}
                <div className="bg-slate-900 border border-cyan-900/50 rounded-xl overflow-hidden relative shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 to-slate-950/0 pointer-events-none"></div>
                    <div className="p-6 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                    <Sparkles size={24} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        Exploration Rank
                                        <span className="text-xs font-normal bg-cyan-900/30 text-cyan-200 px-2 py-0.5 rounded border border-cyan-700/50">
                                            {realmRank}
                                        </span>
                                    </h1>
                                    <p className="text-cyan-200/60 text-xs">Soft Progression (Rewards)</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-cyan-500">Next Rank</span>
                                <span className="text-slate-400">{formatNumber(realmExperience)} / {formatNumber(xpRequired)} XP</span>
                            </div>
                            <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-600 to-teal-500 transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm p-2 bg-slate-950/50 rounded border border-slate-800">
                                <span className="text-slate-400">Bonus Loot Rolls</span>
                                <span className="text-cyan-400 font-bold">+{bonuses.additionalDropRollChance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm p-2 bg-slate-950/50 rounded border border-slate-800">
                                <span className="text-slate-400">Rarity Shift</span>
                                <span className="text-purple-400 font-bold">+{bonuses.globalRarityShift.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-sm p-2 bg-slate-950/50 rounded border border-slate-800">
                                <span className="text-slate-400">Loot Yield</span>
                                <span className="text-yellow-400 font-bold">x{bonuses.lootYieldMultiplier.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DIFFICULTY (TIER) - Hard Progression */}
                <div className="bg-slate-900 border border-red-900/50 rounded-xl overflow-hidden relative shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-slate-950/0 pointer-events-none"></div>
                    <div className="p-6 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-red-950 border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                                    <Skull size={24} className="text-red-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        World Tier
                                        <span className="text-xs font-normal bg-red-900/30 text-red-200 px-2 py-0.5 rounded border border-red-700/50">
                                            {tier}
                                        </span>
                                    </h1>
                                    <p className="text-red-200/60 text-xs">Hard Progression (Difficulty)</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Ascensions</div>
                                <div className="text-xl font-mono font-bold text-slate-300">{state.ascensionCount || 0}</div>
                            </div>
                        </div>

                        <div className="bg-red-900/10 p-4 rounded-lg border border-red-900/30 mb-4">
                            <p className="text-xs text-red-300 mb-2 leading-relaxed">
                                World Tier increases strictly upon <strong>Ascension</strong>. It permanently increases enemy strength, requiring you to optimize your guild to survive.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm p-3 bg-slate-950/50 rounded border border-red-900/50">
                                <span className="text-slate-300 font-bold flex items-center gap-2">
                                    <TrendingUp size={16} className="text-red-500" />
                                    Global Enemy Power
                                </span>
                                <span className="text-red-400 font-mono font-bold text-lg">
                                    +{(bonuses.enemyPowerMultiplier - 1) * 100}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Mutation Registry */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertOctagon size={20} className="text-teal-400" />
                        Mutation Registry
                    </h2>
                    <span className="text-xs text-slate-500">Modifiers unlock based on Exploration Rank</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {REALM_MODIFIERS.map(mod => {
                        const isUnlocked = realmRank >= mod.unlockRank;
                        return (
                            <div 
                                key={mod.id} 
                                className={`
                                    relative overflow-hidden rounded-lg border p-4 transition-all
                                    ${isUnlocked 
                                        ? 'bg-slate-800 border-slate-700 hover:border-cyan-500/30' 
                                        : 'bg-slate-900 border-slate-800 opacity-60'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg border ${isUnlocked ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                            {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                                {mod.name}
                                            </h3>
                                            <p className="text-sm text-slate-400 mb-2">{mod.description}</p>
                                            
                                            <div className="flex gap-2 text-xs">
                                                <span className="px-2 py-0.5 rounded bg-red-900/20 text-red-300 border border-red-900/30">
                                                    Enemies x{mod.enemyPowerMult}
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-yellow-900/20 text-yellow-300 border border-yellow-900/30">
                                                    Loot x{mod.lootYieldMult}
                                                </span>
                                                {mod.rarityShiftBonus > 0 && (
                                                    <span className="px-2 py-0.5 rounded bg-purple-900/20 text-purple-300 border border-purple-900/30">
                                                        Rarity +{mod.rarityShiftBonus}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!isUnlocked && (
                                        <div className="text-xs font-mono font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded border border-slate-800">
                                            Rank {mod.unlockRank}
                                        </div>
                                    )}
                                    
                                    {isUnlocked && (
                                        <div className="text-xs font-bold text-green-400 flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                            Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
