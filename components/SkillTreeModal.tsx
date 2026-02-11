
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Adventurer, SkillNode } from '../types';
import { X, Check, Lock, Heart, Sword, Coins, Skull, Shield, Zap, Crosshair, Box, Eye, Sparkles, Flame, Book, Star, Crown, Beaker, MousePointerClick, Gem, AlertOctagon, Dices, RefreshCw } from 'lucide-react';
import { formatNumber } from '../utils/gameMath';

interface SkillTreeModalProps {
    adventurer: Adventurer;
    onClose: () => void;
}

const SkillIconMap: Record<string, React.FC<any>> = {
    'Heart': Heart,
    'Sword': Sword,
    'Coins': Coins,
    'Skull': Skull,
    'Shield': Shield,
    'Zap': Zap,
    'Crosshair': Crosshair,
    'Box': Box,
    'Eye': Eye,
    'Sparkles': Sparkles,
    'Flame': Flame,
    'Book': Book,
    'Star': Star,
    'Crown': Crown,
    'Beaker': Beaker,
    'Gem': Gem,
    'Dice': Dices,
    'Clock': RefreshCw,
};

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({ adventurer: initialAdventurer, onClose }) => {
    const { state, unlockSkill, respecAdventurer } = useGame();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Fetch live adventurer from state to ensure updates reflect instantly without closing modal
    const liveAdventurer = state.adventurers.find(a => a.id === initialAdventurer.id) || initialAdventurer;

    const tree = liveAdventurer.skillTree;
    if (!tree) return null;

    const selectedNode = tree.find(n => n.id === selectedNodeId);
    
    // Determine selection status
    let canUnlockSelected = false;
    let isSelectedUnlocked = false;
    
    if (selectedNode) {
        isSelectedUnlocked = liveAdventurer.unlockedSkills.includes(selectedNode.id);
        
        // Parent Logic: 
        // Check if ANY parent is unlocked or if requires is empty
        const hasParentUnlocked = selectedNode.requires.length === 0 || selectedNode.requires.some(req => liveAdventurer.unlockedSkills.includes(req));

        canUnlockSelected = !isSelectedUnlocked && hasParentUnlocked && liveAdventurer.skillPoints >= selectedNode.cost;
    }

    // Render Connections (Lines)
    const renderConnections = () => {
        return tree.map(node => {
            return node.requires.map(reqId => {
                const reqNode = tree.find(n => n.id === reqId);
                if (!reqNode) return null;
                
                // Use built-in x/y (0-100 scale)
                const start = { x: reqNode.x, y: reqNode.y };
                const end = { x: node.x, y: node.y };

                const isUnlocked = liveAdventurer.unlockedSkills.includes(node.id);
                const reqUnlocked = liveAdventurer.unlockedSkills.includes(reqNode.id);

                let lineColor = '#1e293b'; // Locked path
                if (isUnlocked) lineColor = '#6366f1'; // Full unlock
                else if (reqUnlocked) lineColor = '#475569'; // Reachable path

                return (
                    <line 
                        key={`${reqNode.id}-${node.id}`}
                        x1={`${start.x}%`} y1={`${start.y}%`}
                        x2={`${end.x}%`} y2={`${end.y}%`}
                        stroke={lineColor}
                        strokeWidth="2"
                    />
                );
            });
        });
    };

    const respecCost = liveAdventurer.level * 100;
    const canRespec = state.gold >= respecCost && liveAdventurer.unlockedSkills.length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            Passive Tree
                            <span className="text-sm font-normal text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {liveAdventurer.name}
                            </span>
                        </h2>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2">
                            <span>Role: <span className="text-slate-300">{liveAdventurer.role}</span></span>
                            {liveAdventurer.archetype && (
                                <>
                                    <span>•</span>
                                    <span>Specialization: <span className="text-indigo-400">{liveAdventurer.archetype}</span></span>
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    
                    {/* Left: Tree Visualizer */}
                    <div className="flex-1 bg-slate-900 relative flex justify-center items-center min-h-[400px] overflow-hidden md:border-r border-slate-800">
                        <div className="relative w-full h-full max-w-[500px] max-h-[500px]">
                            {/* SVG Layer for Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                {renderConnections()}
                            </svg>

                            {/* Nodes */}
                            {tree.map(node => {
                                const isUnlocked = liveAdventurer.unlockedSkills.includes(node.id);
                                const hasParentUnlocked = node.requires.length === 0 || node.requires.some(req => liveAdventurer.unlockedSkills.includes(req));
                                
                                const isReachable = !isUnlocked && hasParentUnlocked;
                                const canAfford = liveAdventurer.skillPoints >= node.cost;
                                const isLocked = !isUnlocked && !isReachable;
                                const isSelected = selectedNodeId === node.id;
                                const isModifier = node.effectType === 'MODIFIER';

                                const Icon = SkillIconMap[node.icon] || Star;

                                return (
                                    <div 
                                        key={node.id}
                                        className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center z-10"
                                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                    >
                                        <button
                                            onClick={() => setSelectedNodeId(node.id)}
                                            className={`
                                                relative w-full h-full rounded-full border-2 flex items-center justify-center transition-all shadow-lg group
                                                ${isSelected ? 'ring-4 ring-indigo-500/50 scale-110' : ''}
                                                ${isModifier && !isLocked ? 'rounded-md rotate-45' : ''} 
                                                ${isUnlocked 
                                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/50' 
                                                    : isReachable
                                                        ? canAfford 
                                                            ? 'bg-slate-800 border-yellow-500 text-yellow-500 hover:scale-105 cursor-pointer'
                                                            : 'bg-slate-800 border-slate-500 text-slate-500 hover:border-slate-400 cursor-pointer'
                                                        : 'bg-slate-900 border-slate-700 text-slate-700 cursor-not-allowed grayscale'
                                                }
                                            `}
                                        >
                                            <div className={isModifier && !isLocked ? "-rotate-45" : ""}>
                                                <Icon size={20} />
                                            </div>

                                            {isLocked && <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center"><Lock size={12} className="text-slate-400"/></div>}
                                            
                                            {isUnlocked && <div className="absolute -top-1 -right-1 bg-green-500 text-slate-900 rounded-full p-0.5 z-20"><Check size={8} strokeWidth={4} /></div>}
                                            
                                            {/* Cost Badge for non-unlocked */}
                                            {!isUnlocked && isReachable && (
                                                <div className={`absolute -bottom-2 px-1.5 py-0.5 rounded text-[8px] font-bold border z-20 ${canAfford ? 'bg-slate-900 text-yellow-500 border-yellow-500' : 'bg-slate-900 text-red-500 border-red-500'}`}>
                                                    {node.cost}
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Details Panel */}
                    <div className="w-full md:w-80 bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800 shrink-0">
                        {selectedNode ? (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-200">
                                <div className="mb-6">
                                    <div className="w-12 h-12 rounded bg-slate-900 border border-slate-700 flex items-center justify-center mb-4 text-slate-300">
                                        {React.createElement(SkillIconMap[selectedNode.icon] || Star, { size: 24 })}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{selectedNode.name}</h3>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${isSelectedUnlocked ? 'bg-green-900/20 text-green-400 border-green-900/50' : canUnlockSelected ? 'bg-slate-800 text-yellow-400 border-yellow-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                            {isSelectedUnlocked ? 'Learned' : canUnlockSelected ? 'Available' : 'Locked'}
                                        </span>
                                        {selectedNode.effectType === 'MODIFIER' && (
                                            <span className="text-[10px] text-purple-400 flex items-center gap-1 border border-purple-500/30 px-1 rounded bg-purple-900/20">
                                                <Crown size={10} /> Rule Change
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-slate-400 text-sm leading-relaxed border-t border-slate-800 pt-4">
                                        {selectedNode.description}
                                    </p>
                                </div>
                                
                                <div className="mt-auto space-y-4">
                                    {/* Cost Display */}
                                    {!isSelectedUnlocked && (
                                        <div className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800">
                                            <span className="text-sm text-slate-400">Cost</span>
                                            <span className={`font-bold ${liveAdventurer.skillPoints >= selectedNode.cost ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {selectedNode.cost} Skill Point{selectedNode.cost > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => unlockSkill(liveAdventurer.id, selectedNode.id)}
                                        disabled={!canUnlockSelected}
                                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                                            ${isSelectedUnlocked 
                                                ? 'bg-slate-800 text-green-500 border border-slate-700 cursor-default opacity-50' 
                                                : canUnlockSelected
                                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-900/20 active:scale-95'
                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {isSelectedUnlocked ? (
                                            <>
                                                <Check size={18} /> Learned
                                            </>
                                        ) : canUnlockSelected ? (
                                            <>
                                                <Star size={18} /> Learn Talent
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} /> {liveAdventurer.skillPoints < selectedNode.cost ? 'Need Points' : 'Locked'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-4 opacity-60">
                                <MousePointerClick size={48} className="mb-4 text-slate-700" />
                                <p className="font-bold mb-1">No Talent Selected</p>
                                <p className="text-sm">Click on a node in the tree to view details and unlock upgrades.</p>
                            </div>
                        )}
                        
                        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                             <div className="flex justify-between items-center">
                                 <span className="text-xs text-slate-500 uppercase tracking-wider">Available Points</span>
                                 <span className={`text-xl font-mono font-bold ${liveAdventurer.skillPoints > 0 ? 'text-yellow-400 animate-pulse' : 'text-slate-600'}`}>
                                     {liveAdventurer.skillPoints}
                                 </span>
                             </div>

                             {liveAdventurer.unlockedSkills.length > 0 && (
                                 <button
                                     onClick={() => respecAdventurer(liveAdventurer.id)}
                                     disabled={!canRespec}
                                     className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs border transition-all
                                         ${canRespec 
                                             ? 'bg-red-900/10 text-red-400 border-red-900/30 hover:bg-red-900/30 hover:text-red-200' 
                                             : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                         }
                                     `}
                                     title={`Refund all points for ${formatNumber(respecCost)}g`}
                                 >
                                     <span className="flex items-center gap-2"><RefreshCw size={12}/> Respec Talents</span>
                                     <span className="font-mono">{formatNumber(respecCost)}g</span>
                                 </button>
                             )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
