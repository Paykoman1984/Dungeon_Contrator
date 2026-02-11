
import React from 'react';
import { useGame } from '../services/GameContext';
import { Rarity, ItemType } from '../types';
import { RARITY_COLORS, RARITY_ORDER } from '../constants';
import { Filter, X, CheckSquare, Square, Shield, Sword, Sparkles, Settings } from 'lucide-react';

interface LootFilterModalProps {
    onClose: () => void;
}

export const LootFilterModal: React.FC<LootFilterModalProps> = ({ onClose }) => {
    const { state, updateLootFilter } = useGame();
    const filter = state.lootFilter;

    // Stat Options for "Whitelist"
    const STAT_OPTIONS = ['Crit Chance', 'Speed', 'Damage', 'Health', 'Gold Gain', 'Loot Luck'];

    const toggleType = (type: ItemType) => {
        const newTypes = filter.keepTypes.includes(type)
            ? filter.keepTypes.filter(t => t !== type)
            : [...filter.keepTypes, type];
        updateLootFilter({ keepTypes: newTypes });
    };

    const toggleStat = (stat: string) => {
        const newStats = filter.matchAnyStat.includes(stat)
            ? filter.matchAnyStat.filter(s => s !== stat)
            : [...filter.matchAnyStat, stat];
        updateLootFilter({ matchAnyStat: newStats });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Filter size={20} className="text-indigo-400" />
                        Loot Filter Settings
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    
                    {/* Master Switch */}
                    <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <div>
                            <div className="font-bold text-slate-200">Enable Filtering</div>
                            <div className="text-xs text-slate-400">Rejected items are automatically salvaged for gold.</div>
                        </div>
                        <button
                            onClick={() => updateLootFilter({ enabled: !filter.enabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${filter.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${filter.enabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    <div className={filter.enabled ? '' : 'opacity-50 pointer-events-none'}>
                        {/* Rarity Section */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Auto-Salvage Threshold</h3>
                            <div className="space-y-1">
                                {Object.values(Rarity).map((rarity) => (
                                    <button
                                        key={rarity}
                                        onClick={() => updateLootFilter({ minRarity: rarity })}
                                        className={`w-full flex items-center gap-3 p-2 rounded border transition-all ${filter.minRarity === rarity ? 'bg-red-900/30 border-red-500/50' : 'bg-slate-900 border-transparent hover:bg-slate-800'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${filter.minRarity === rarity ? 'border-red-400' : 'border-slate-600'}`}>
                                            {filter.minRarity === rarity && <div className="w-2 h-2 rounded-full bg-red-400"></div>}
                                        </div>
                                        <span className={`text-sm font-bold ${RARITY_COLORS[rarity]}`}>{rarity}</span>
                                        {filter.minRarity === rarity && <span className="ml-auto text-xs text-red-300 font-mono">Salvage & Below</span>}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">Items of this rarity AND LOWER will be automatically destroyed.</p>
                        </div>

                        {/* Slot Section */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Item Types to Keep</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET].map(type => {
                                    const isSelected = filter.keepTypes.includes(type);
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => toggleType(type)}
                                            className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${isSelected ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600 opacity-50'}`}
                                        >
                                            {type === ItemType.WEAPON && <Sword size={20} className="mb-1" />}
                                            {type === ItemType.ARMOR && <Shield size={20} className="mb-1" />}
                                            {type === ItemType.TRINKET && <Sparkles size={20} className="mb-1" />}
                                            <span className="text-xs font-bold">{type}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">Unselected types are always salvaged.</p>
                        </div>

                        {/* Stat Whitelist */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Settings size={12} />
                                Stat Whitelist
                            </h3>
                            <p className="text-[10px] text-slate-400 mb-3">
                                Always KEEP items containing ANY of these stats, ignoring Auto-Salvage rules.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {STAT_OPTIONS.map(stat => {
                                    const isSelected = filter.matchAnyStat.includes(stat);
                                    return (
                                        <button
                                            key={stat}
                                            onClick={() => toggleStat(stat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${isSelected ? 'bg-green-900/30 border-green-500/50 text-green-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                        >
                                            {isSelected ? <CheckSquare size={12}/> : <Square size={12} />}
                                            {stat}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
