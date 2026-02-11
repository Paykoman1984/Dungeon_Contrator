
import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../services/GameContext';
import { Globe, X, TrendingUp, Sparkles } from 'lucide-react';
import { REALM_MODIFIERS } from '../constants';

export const RealmLevelUpModal: React.FC = () => {
    const { state } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const prevRank = useRef(state.realm.realmRank);

    useEffect(() => {
        if (state.realm.realmRank > prevRank.current) {
            setIsOpen(true);
            prevRank.current = state.realm.realmRank;
        } else if (state.realm.realmRank < prevRank.current) {
            // Handle prestige reset case: don't show modal, just sync ref
            prevRank.current = state.realm.realmRank; 
        }
    }, [state.realm.realmRank]);

    if (!isOpen) return null;

    // Check if a new modifier was unlocked
    const unlockedMod = REALM_MODIFIERS.find(m => m.unlockRank === state.realm.realmRank);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                
                {/* Background FX */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none"></div>
                
                <div className="p-8 text-center relative z-10">
                    <div className="w-20 h-20 bg-cyan-900/30 rounded-full border-2 border-cyan-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-900/50">
                        <Globe size={40} className="text-cyan-300" />
                    </div>
                    
                    <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-widest drop-shadow-md">
                        Realm Expanded
                    </h2>
                    <p className="text-cyan-400 font-mono text-lg mb-6">
                        Rank Increased to <span className="font-bold text-2xl">{state.realm.realmRank}</span>
                    </p>

                    <div className="space-y-3 mb-8">
                        <div className="bg-slate-950/50 p-3 rounded border border-cyan-900/30 flex items-center justify-between text-sm">
                            <span className="text-slate-400 flex items-center gap-2"><TrendingUp size={16}/> Enemy Power</span>
                            <span className="text-red-400 font-bold">Increased</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded border border-cyan-900/30 flex items-center justify-between text-sm">
                            <span className="text-slate-400 flex items-center gap-2"><Sparkles size={16}/> Loot Quality</span>
                            <span className="text-green-400 font-bold">Increased</span>
                        </div>
                        
                        {unlockedMod && (
                            <div className="bg-cyan-900/20 p-4 rounded border border-cyan-500/50 mt-4">
                                <p className="text-xs text-cyan-300 uppercase font-bold tracking-wider mb-1">New Mutation Unlocked</p>
                                <p className="text-white font-bold text-lg">{unlockedMod.name}</p>
                                <p className="text-xs text-slate-300 mt-1">{unlockedMod.description}</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/30 transition-all text-sm uppercase tracking-wide"
                    >
                        Continute
                    </button>
                </div>
            </div>
        </div>
    );
};
