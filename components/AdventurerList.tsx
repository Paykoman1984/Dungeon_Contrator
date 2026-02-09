
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { calculateAdventurerPower, formatNumber, getAdventurerStats, areItemsEqual, calculateConservativePower, getEffectiveAdventurer } from '../utils/gameMath';
import { ItemType, AdventurerRole, Item, Adventurer } from '../types';
import { Sword, Shield, Gem, UserPlus, Heart, Zap, Crosshair, Sparkles, ShieldAlert, RefreshCw, Dna, GitMerge } from 'lucide-react';
import { RARITY_COLORS, ROLE_CONFIG, CLASS_SKILLS, ADVENTURER_TRAITS } from '../constants';
import { Tooltip, SkillTooltipContent } from './Tooltip';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';
import { SkillTreeModal } from './SkillTreeModal';

export const AdventurerList: React.FC = () => {
  const { state, recruitAdventurer } = useGame();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [skillTreeAdventurer, setSkillTreeAdventurer] = useState<Adventurer | null>(null);

  const recruitCost = 100 * Math.pow(5, state.adventurers.length - 1);
  const canRecruit = state.gold >= recruitCost;

  return (
    <div className="space-y-6 pb-20">
      
      {selectedItem && (
          <ItemDetailsModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
      )}

      {skillTreeAdventurer && (
          <SkillTreeModal 
            adventurer={skillTreeAdventurer} 
            onClose={() => setSkillTreeAdventurer(null)} 
          />
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-800">
        <div>
            <h2 className="text-xl font-bold text-slate-200">Contractor Roster</h2>
            <p className="text-sm text-slate-500">{state.adventurers.length} active contractors</p>
        </div>
        <button 
          onClick={recruitAdventurer}
          disabled={!canRecruit}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all shadow-lg ${
              canRecruit 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 transform hover:scale-105' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
            <UserPlus size={16} />
            Recruit ({formatNumber(recruitCost)}g)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {state.adventurers.map((adv) => {
          const run = state.activeRuns.find(r => r.adventurerIds.includes(adv.id));
          const isBusy = !!run;
          
          const snapshotAdv = run?.adventurerState?.[adv.id];

          // Calculate Power Conservatively using helper
          const power = calculateConservativePower(adv, state);

          // For stats display, we use the effective adventurer (Conservative Logic)
          // This ensures that stats update instantly when unequipping, but delay when equipping
          const activeAdv = getEffectiveAdventurer(adv, state);
          const effectiveStats = getAdventurerStats(activeAdv, state);
          
          const roleConfig = ROLE_CONFIG[adv.role];
          const skills = CLASS_SKILLS[adv.role];
          
          // Trait Lookup
          const trait = ADVENTURER_TRAITS.find(t => t.id === adv.traitId);
          
          // Rarity border color map
          const rarityBorder = {
              'Common': 'border-slate-700',
              'Uncommon': 'border-green-900',
              'Rare': 'border-blue-900',
              'Epic': 'border-purple-900',
              'Legendary': 'border-orange-900',
          }[adv.rarity] || 'border-slate-700';

          return (
            <div key={adv.id} className={`bg-slate-800 border ${rarityBorder} rounded-lg shadow-xl overflow-hidden flex flex-col relative`}>
              
              {/* Compact Header */}
              <div className="p-3 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                       {/* Compact Icon */}
                       <div className={`w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center ${roleConfig.color}`}>
                           {adv.role === AdventurerRole.WARRIOR && <ShieldAlert size={16} />}
                           {adv.role === AdventurerRole.ROGUE && <Crosshair size={16} />}
                           {adv.role === AdventurerRole.MAGE && <Sparkles size={16} />}
                       </div>
                       <div>
                           <div className={`text-sm font-bold leading-none ${RARITY_COLORS[adv.rarity]}`}>{adv.name}</div>
                           <div className="text-[10px] text-slate-500 mt-0.5 flex gap-1">
                               <span>Lvl {adv.level}</span>
                               <span>•</span>
                               <span>{adv.rarity} {adv.role}</span>
                           </div>
                       </div>
                  </div>
                  <div className="text-right">
                      <div className="text-lg font-mono font-bold text-slate-200">
                          {formatNumber(power)} <span className="text-xs text-slate-500 font-sans font-normal">Power</span>
                      </div>
                      {isBusy && <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">On Mission</div>}
                  </div>
              </div>

              {/* Compact Body */}
              <div className="p-3 space-y-3">
                  
                  {/* Stats Row (Tight Grid) */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-900/30 p-2 rounded border border-slate-700/30">
                       <CompactStat icon={<Sword size={12}/>} value={formatNumber(effectiveStats.damage)} color="text-slate-300" />
                       <CompactStat icon={<Heart size={12}/>} value={formatNumber(effectiveStats.health)} color="text-red-400" />
                       <CompactStat icon={<Zap size={12}/>} value={effectiveStats.speed} color="text-blue-400" />
                       <CompactStat icon={<Crosshair size={12}/>} value={`${(effectiveStats.critChance * 100).toFixed(0)}%`} color="text-green-400" />
                  </div>

                  {/* XP Bar (Thin) */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                      <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (adv.xp / adv.xpToNextLevel) * 100)}%` }}></div>
                  </div>

                  {/* Trait & Tree Access */}
                  <div className="flex items-center justify-between gap-2">
                       {/* Trait Pill */}
                       {trait ? (
                            <Tooltip content={<div className="text-xs"><div className="font-bold text-emerald-300">{trait.name}</div><div className="text-slate-400">{trait.description}</div></div>}>
                                <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-slate-900/60 border border-slate-700 text-emerald-300 cursor-help">
                                    <Dna size={10} />
                                    <span>{trait.name}</span>
                                </div>
                            </Tooltip>
                       ) : <div />}

                       {/* Tree Button */}
                       <button 
                            onClick={() => setSkillTreeAdventurer(adv)}
                            className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-colors
                                ${adv.level >= 5 
                                    ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50' 
                                    : 'bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed'
                                }
                            `}
                            disabled={adv.level < 5}
                       >
                            <GitMerge size={10} />
                            <span>Talents</span>
                            {adv.skillPoints > 0 && (
                                <span className="bg-yellow-500 text-slate-900 font-bold px-1 rounded-full animate-pulse">
                                    {adv.skillPoints}
                                </span>
                            )}
                       </button>
                  </div>

                  {/* Skills (Pills) - Legacy / Base Passives */}
                  <div className="flex flex-wrap gap-1.5">
                      {skills.map(skill => {
                          const isUnlocked = adv.level >= skill.unlockLevel;
                          return (
                              <Tooltip 
                                key={skill.id} 
                                content={<SkillTooltipContent skill={skill} unlocked={isUnlocked} />}
                              >
                                  <div className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help transition-opacity ${
                                      isUnlocked 
                                      ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' 
                                      : 'bg-slate-900/40 text-slate-600 border border-slate-800 opacity-60'
                                  }`}>
                                      <Sparkles size={8} />
                                      {skill.name}
                                  </div>
                              </Tooltip>
                          );
                      })}
                  </div>

                  {/* Loadout (Row of Boxes) */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET].map(type => {
                        const item = adv.slots[type]; // The item currently in the slot (could be pending)
                        
                        // Check pending status
                        let isPending = false;
                        if (isBusy && snapshotAdv) {
                             const snapshotItem = snapshotAdv.slots[type];
                             // Check if slot was modified directly (touched) or if content differs
                             const isModified = run.modifiedSlots?.[adv.id]?.includes(type);
                             if (isModified || !areItemsEqual(item, snapshotItem)) {
                                 isPending = true;
                             }
                        }

                        // Placeholder Icon if no item
                        let PlaceholderIcon = Sword;
                        if (type === ItemType.ARMOR) PlaceholderIcon = Shield;
                        if (type === ItemType.TRINKET) PlaceholderIcon = Sparkles;
                        
                        return (
                            <button 
                                key={type}
                                onClick={() => item && setSelectedItem(item)}
                                disabled={!item}
                                className={`
                                    relative h-10 w-full rounded border flex items-center justify-center transition-all overflow-hidden
                                    ${item 
                                        ? `${RARITY_COLORS[item.rarity]} bg-slate-800 border-slate-600 hover:border-indigo-500 hover:bg-slate-700 group cursor-pointer` 
                                        : 'text-slate-700 bg-slate-900/50 border-slate-800 border-dashed cursor-default'
                                    }
                                `}
                            >
                                {item ? (
                                    <>
                                       <ItemIcon item={item} size={14} />
                                       {/* Inspect Overlay */}
                                       <div className="hidden group-hover:flex absolute inset-0 bg-slate-900/90 items-center justify-center text-[8px] font-bold text-white rounded z-10">
                                           INSPECT
                                       </div>
                                       
                                       {/* Next Run Indicator - Only if this specific item slot changed */}
                                       {isPending && (
                                           <div className="absolute top-0 right-0 p-0.5 bg-amber-900/80 rounded-bl backdrop-blur-sm border-l border-b border-amber-500/30 z-0">
                                                <RefreshCw size={8} className="text-amber-400 animate-spin-slow-reverse" />
                                           </div>
                                       )}
                                    </>
                                ) : (
                                    <PlaceholderIcon size={14} />
                                )}
                            </button>
                        );
                    })}
                  </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CompactStat: React.FC<{ icon: React.ReactNode, value: string | number, color: string }> = ({ icon, value, color }) => (
    <div className="flex flex-col items-center justify-center">
        <div className={`text-slate-500 mb-0.5`}>{icon}</div>
        <div className={`text-xs font-bold font-mono ${color}`}>{value}</div>
    </div>
);
