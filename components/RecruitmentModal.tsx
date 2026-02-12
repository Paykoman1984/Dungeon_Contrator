
import React from 'react';
import { useGame } from '../services/GameContext';
import { Adventurer, AdventurerRole } from '../types';
import { RARITY_COLORS, ROLE_CONFIG } from '../constants';
import { calculateConservativePower, formatNumber, calculateAdventurerSpecialization } from '../utils/gameMath';
import { ShieldAlert, Crosshair, Sparkles, X, UserPlus, RefreshCw, Dna, Crown, Sword, Leaf, Anchor } from 'lucide-react';

interface RecruitmentModalProps {
    onClose: () => void;
}

export const RecruitmentModal: React.FC<RecruitmentModalProps> = ({ onClose }) => {
    const { state, refreshTavern, hireAdventurer } = useGame();
    const hireCost = 100 * Math.pow(5, state.adventurers.length); // Dynamic hiring cost
    const canRefresh = state.gold >= state.refreshCost;
    const canHire = state.gold >= hireCost;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="text-3xl">🍻</span> The Guild Tavern
                        </h2>
                        <p className="text-slate-400 text-sm">Review applications and hire new talent.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Candidates Body */}
                <div className="p-6 flex-1 overflow-y-auto bg-slate-950/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {state.recruitmentPool.map(candidate => (
                            <CandidateCard 
                                key={candidate.id} 
                                candidate={candidate} 
                                cost={hireCost}
                                onHire={() => {
                                    if(canHire) {
                                        hireAdventurer(candidate.id);
                                        onClose();
                                    }
                                }}
                                canHire={canHire}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-slate-400">
                        <span className="text-yellow-500 font-bold">Treasury: {formatNumber(state.gold)}g</span>
                    </div>
                    
                    <button 
                        onClick={refreshTavern}
                        disabled={!canRefresh}
                        className={`
                            px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all
                            ${canRefresh 
                                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600' 
                                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                            }
                        `}
                    >
                        <RefreshCw size={18} className={canRefresh ? "" : "opacity-50"} />
                        <span>Find New Candidates</span>
                        <span className="text-yellow-500 font-mono ml-2">-{formatNumber(state.refreshCost)}g</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const CandidateCard: React.FC<{ candidate: Adventurer; cost: number; onHire: () => void; canHire: boolean }> = ({ candidate, cost, onHire, canHire }) => {
    const power = calculateConservativePower(candidate, { ...useGame().state, activeRuns: [] }); // Dummy state for base power
    const roleConfig = ROLE_CONFIG[candidate.role];
    const spec = calculateAdventurerSpecialization(candidate);
    
    const specIcon = spec.type === 'COMBAT' ? <Sword size={12} /> 
                   : spec.type === 'GATHERING' ? <Leaf size={12} /> 
                   : spec.type === 'FISHING' ? <Anchor size={12} /> 
                   : <Crown size={12} />;

    return (
        <div className={`bg-slate-800 border-2 rounded-xl overflow-hidden flex flex-col shadow-xl transition-transform hover:-translate-y-1 ${RARITY_COLORS[candidate.rarity].replace('text-', 'border-')}`}>
            {/* Card Header */}
            <div className="p-4 bg-slate-900/80 border-b border-white/5 relative">
                <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-black/40 rounded text-slate-300 border border-white/10">
                    {candidate.rarity}
                </div>
                
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 border-slate-700 bg-slate-800 ${roleConfig.color}`}>
                        {candidate.role === AdventurerRole.WARRIOR && <ShieldAlert size={24} />}
                        {candidate.role === AdventurerRole.ROGUE && <Crosshair size={24} />}
                        {candidate.role === AdventurerRole.MAGE && <Sparkles size={24} />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${RARITY_COLORS[candidate.rarity]}`}>{candidate.name}</h3>
                        <div className={`flex items-center gap-1 text-xs font-bold ${spec.color}`}>
                            {specIcon}
                            {spec.label}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                    <div className="text-2xl font-mono font-bold text-white">{formatNumber(power)} <span className="text-xs text-slate-500 font-sans">PWR</span></div>
                    <div className="text-xs text-slate-500">Lvl {candidate.level} {candidate.role}</div>
                </div>
            </div>

            {/* Traits Section */}
            <div className="p-4 flex-1 bg-slate-800/50 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Genetic Traits</div>
                {candidate.traits.map(trait => (
                    <div key={trait.id} className="flex gap-2 p-2 rounded bg-slate-900/50 border border-slate-700/50">
                        <div className={`mt-0.5 ${trait.type === 'COMBAT' ? 'text-red-400' : trait.type === 'GATHERING' ? 'text-emerald-400' : trait.type === 'FISHING' ? 'text-blue-400' : 'text-purple-400'}`}>
                            <Dna size={14} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-200">{trait.name}</div>
                            <div className="text-xs text-slate-400 leading-tight">{trait.description}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div className="p-4 bg-slate-900 border-t border-slate-700">
                <button
                    onClick={onHire}
                    disabled={!canHire}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                        ${canHire 
                            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }
                    `}
                >
                    <UserPlus size={18} />
                    <span>Hire Contract</span>
                    <span className="bg-black/20 px-1.5 rounded text-xs font-mono">{formatNumber(cost)}g</span>
                </button>
            </div>
        </div>
    );
};
