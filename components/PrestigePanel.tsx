
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { calculatePrestigeGain, formatNumber } from '../utils/gameMath';
import { PRESTIGE_UPGRADES } from '../constants';
import { Crown, Sparkles, AlertTriangle, ArrowUpCircle } from 'lucide-react';

export const PrestigePanel: React.FC = () => {
    const { state, doPrestige, buyPrestigeUpgrade } = useGame();
    const [confirming, setConfirming] = useState(false);

    const potentialCurrency = calculatePrestigeGain(state.statistics.totalGoldEarned);
    const canPrestige = potentialCurrency > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
            {/* Left Col: Ascension Action */}
            <div className="space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500"></div>
                    
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-900/30 rounded-full border border-purple-500/30">
                            <Crown size={32} className="text-purple-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guild Ascension</h2>
                            <p className="text-sm text-slate-400">Reset for permanent power</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-6 text-center">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Current Prestige Currency</p>
                        <p className="text-3xl font-mono font-bold text-purple-400">{state.prestigeCurrency}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm p-3 bg-slate-900/30 rounded border border-slate-800">
                            <span className="text-slate-400">Lifetime Gold Earned</span>
                            <span className="font-mono text-yellow-500">{formatNumber(state.statistics.totalGoldEarned)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm p-3 bg-indigo-900/10 rounded border border-indigo-500/30">
                            <span className="text-indigo-300">Currency on Reset</span>
                            <span className="font-mono font-bold text-white">+{potentialCurrency}</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        {!confirming ? (
                            <button
                                onClick={() => setConfirming(true)}
                                disabled={!canPrestige}
                                className={`w-full py-3 rounded-lg font-bold transition-all shadow-lg
                                    ${canPrestige 
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20' 
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                Prestige Now
                            </button>
                        ) : (
                            <div className="animate-in fade-in duration-200">
                                <div className="bg-red-900/20 border border-red-500/50 p-3 rounded mb-3 text-xs text-red-200 flex items-start gap-2">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                    <p>Reset all Gold, Contractors, Items, and Standard Upgrades? This cannot be undone.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setConfirming(false)}
                                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            doPrestige();
                                            setConfirming(false);
                                        }}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg shadow-red-900/20"
                                    >
                                        Confirm Reset
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Col: Prestige Shop */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={24}/>
                    Ascension Upgrades
                </h2>
                <p className="text-sm text-slate-400 mb-4">These upgrades persist through resets.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRESTIGE_UPGRADES.map(upgrade => {
                        const currentLevel = state.prestigeUpgrades[upgrade.id] || 0;
                        const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, currentLevel));
                        const canAfford = state.prestigeCurrency >= cost;
                        const isMax = currentLevel >= upgrade.maxLevel;

                        return (
                            <div key={upgrade.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col justify-between hover:border-purple-500/30 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-200">{upgrade.name}</h3>
                                        <span className="text-xs font-mono bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                                            Lvl {currentLevel}/{upgrade.maxLevel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 min-h-[32px]">{upgrade.description}</p>
                                    
                                    <div className="mt-3 text-xs text-green-400 flex items-center gap-1">
                                        <ArrowUpCircle size={12} />
                                        Current Effect: +{(upgrade.effect(currentLevel) * 100).toFixed(0)}%
                                    </div>
                                </div>

                                <button
                                    onClick={() => buyPrestigeUpgrade(upgrade.id)}
                                    disabled={!canAfford || isMax}
                                    className={`
                                        w-full mt-4 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all
                                        ${isMax 
                                            ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-default' 
                                            : canAfford 
                                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20' 
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isMax ? 'MAXED' : (
                                        <>
                                            <span>Upgrade</span>
                                            <span className={`px-1.5 rounded bg-black/20 font-mono ${canAfford ? 'text-purple-200' : 'text-slate-400'}`}>
                                                {formatNumber(cost)}
                                            </span>
                                            <Crown size={12} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
