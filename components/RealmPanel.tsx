
import React from 'react';
import { useGame } from '../services/GameContext';
import { REALM_CONFIG, REALM_MODIFIERS } from '../constants';
import { calculateRealmXpRequired, getRealmBonuses, formatNumber } from '../utils/gameMath';
import { Globe, TrendingUp, Skull, Sparkles, Lock, Unlock, Crown, AlertOctagon } from 'lucide-react';

export const RealmPanel: React.FC = () => {
    const { state } = useGame();
    const { realmRank, realmExperience } = state.realm;
    
    const xpRequired = calculateRealmXpRequired(realmRank + 1);
    const progressPercent = Math.min(100, (realmExperience / xpRequired) * 100);
    
    // Calculate global bonuses
    const bonuses = getRealmBonuses(state.realm);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            
            {/* Header / XP Bar */}
            <div className="bg-slate-900 border border-cyan-900/50 rounded-xl overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 to-slate-950/0 pointer-events-none"></div>
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                <Globe size={32} className="text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                                    Eternal Realm
                                    <span className="text-sm font-normal bg-cyan-900/30 text-cyan-200 px-2 py-0.5 rounded border border-cyan-700/50">
                                        Rank {realmRank}
                                    </span>
                                </h1>
                                <p className="text-cyan-200/60 text-sm">The world evolves permanently as you conquer it.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase tracking-widest">Total Ascensions</div>
                            <div className="text-2xl font-mono font-bold text-slate-300">{state.ascensionCount || 0}</div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-cyan-500">Realm Experience</span>
                            <span className="text-slate-400">{formatNumber(realmExperience)} / {formatNumber(xpRequired)} XP</span>
                        </div>
                        <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-600 to-teal-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference">
                                {progressPercent.toFixed(1)}%
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 flex gap-4">
                            <span>• Earn XP by completing dungeons (Higher Tiers = More XP)</span>
                            <span>• Earn XP by Ascending</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Global Passive Effects */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 h-fit">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-cyan-400" />
                        World Constants
                    </h2>
                    <div className="space-y-4">
                        <BonusRow 
                            label="Global Enemy Strength"
                            value={`+${((bonuses.enemyPowerMultiplier - 1) * 100).toFixed(0)}%`}
                            desc="Base difficulty multiplier for all contracts."
                            icon={<Skull size={16} className="text-red-400"/>}
                        />
                        <BonusRow 
                            label="Bonus Loot Rolls"
                            value={`+${bonuses.additionalDropRollChance.toFixed(2)}`}
                            desc="Chance to roll for extra items per kill."
                            icon={<Sparkles size={16} className="text-yellow-400"/>}
                        />
                        <BonusRow 
                            label="Rarity Shift"
                            value={`+${bonuses.globalRarityShift.toFixed(1)}`}
                            desc="Permanent shift towards higher rarity loot."
                            icon={<Crown size={16} className="text-purple-400"/>}
                        />
                    </div>
                </div>

                {/* Right: Mutation Timeline */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertOctagon size={20} className="text-teal-400" />
                        Mutation Registry
                    </h2>
                    <p className="text-sm text-slate-400">
                        Unlock powerful modifiers that increase difficulty and rewards. Enable these in the Dungeon Configuration screen.
                    </p>

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
                                                Unlocks at Rank {mod.unlockRank}
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
        </div>
    );
};

const BonusRow: React.FC<{ label: string, value: string, desc: string, icon: React.ReactNode }> = ({ label, value, desc, icon }) => (
    <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
        <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                {icon} {label}
            </div>
            <div className="text-cyan-400 font-mono font-bold">{value}</div>
        </div>
        <div className="text-xs text-slate-500 leading-tight">
            {desc}
        </div>
    </div>
);
