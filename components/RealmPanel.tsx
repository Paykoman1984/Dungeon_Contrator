
import React from 'react';
import { useGame } from '../services/GameContext';
import { REALM_CONFIG, REALM_MODIFIERS, MATERIALS, RARITY_COLORS } from '../constants';
import { calculateRealmXpRequired, getRealmBonuses, formatNumber, checkResourceCost } from '../utils/gameMath';
import { Globe, TrendingUp, Skull, Sparkles, Lock, Unlock, Crown, AlertOctagon, ArrowUpCircle, Key, Check } from 'lucide-react';

export const RealmPanel: React.FC = () => {
    const { state, toggleDungeonModifier } = useGame();
    const { realmRank, realmExperience, realmTier } = state.realm;
    const tier = realmTier || 1; 
    
    const xpRequired = calculateRealmXpRequired(realmRank + 1);
    const progressPercent = Math.min(100, (realmExperience / xpRequired) * 100);
    
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
                            <div className="flex justify-between text-sm p-2 bg-slate-950/50 rounded border border-slate-800">
                                <span className="text-slate-400">Enemy Power Scale</span>
                                <span className="text-red-400 font-bold">x{bonuses.enemyPowerMultiplier.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MUTATIONS LIST */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertOctagon size={20} className="text-purple-400" />
                        Realm Mutations
                    </h2>
                    <p className="text-xs text-slate-400">Unlock dangerous modifiers to boost rewards in specific dungeons.</p>
                </div>
                
                <div className="divide-y divide-slate-700/50">
                    {REALM_MODIFIERS.map(mod => {
                        const isUnlocked = state.realm.unlockedModifiers?.includes(mod.id);
                        const canUnlock = state.realm.realmRank >= mod.unlockRank;
                        const canAfford = checkResourceCost(state, mod.unlockCost);

                        return (
                            <div key={mod.id} className="p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between hover:bg-slate-700/20 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{mod.name}</h3>
                                        {!isUnlocked && !canUnlock && (
                                            <span className="text-[10px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                                <Lock size={10} /> Rank {mod.unlockRank}
                                            </span>
                                        )}
                                        {!isUnlocked && canUnlock && (
                                            <span className="text-[10px] bg-green-900/20 text-green-400 px-2 py-0.5 rounded border border-green-900/50 flex items-center gap-1">
                                                <Unlock size={10} /> Available
                                            </span>
                                        )}
                                        {isUnlocked && (
                                            <span className="text-[10px] bg-indigo-900/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/50 flex items-center gap-1">
                                                <Check size={10} /> Owned
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">{mod.description}</p>
                                    <div className="flex gap-3 mt-2 text-[10px]">
                                        <span className="text-red-400">Enemy Power x{mod.enemyPowerMult}</span>
                                        <span className="text-yellow-400">Loot Yield x{mod.lootYieldMult}</span>
                                    </div>
                                </div>

                                {!isUnlocked ? (
                                    <div className="flex flex-col items-end gap-2">
                                        {mod.unlockCost && (
                                            <div className="flex gap-2">
                                                {mod.unlockCost.map((cost, idx) => {
                                                    const mat = MATERIALS[cost.resourceId];
                                                    const owned = state.materials[cost.resourceId] || 0;
                                                    const has = owned >= cost.amount;
                                                    return (
                                                        <div key={idx} className={`text-xs px-2 py-1 rounded bg-slate-950 border ${has ? 'border-slate-700 text-slate-300' : 'border-slate-800 text-slate-600 opacity-60'}`}>
                                                            {cost.amount} {mat.name}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => toggleDungeonModifier('global', mod.id)} // Passing 'global' or any string as ID just to trigger the unlock logic which handles cost
                                            disabled={!canUnlock || !canAfford}
                                            className={`px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all
                                                ${!canUnlock 
                                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                                                    : !canAfford
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                                                }
                                            `}
                                        >
                                            <Key size={14} /> Unlock Mutation
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 italic px-4">
                                        Activate this mutation in the Contract menu.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
