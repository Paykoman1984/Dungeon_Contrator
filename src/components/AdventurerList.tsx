
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { calculateAdventurerPower, formatNumber, getAdventurerStats, areItemsEqual, getActiveModifiers, calculateAdventurerSpecialization } from '../utils/gameMath';
import { ItemType, AdventurerRole, Item, Adventurer } from '../types';
import { Sword, Shield, UserPlus, Heart, Zap, Crosshair, Sparkles, RefreshCw, Dna, GitMerge, PenLine, Check, X, Crown, Anchor, Leaf } from 'lucide-react';
import { RARITY_COLORS, ROLE_CONFIG, ADVENTURER_TRAITS } from '../constants';
import { Tooltip } from './Tooltip';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';
import { SkillTreeModal } from './SkillTreeModal';
import { RecruitmentModal } from './RecruitmentModal';
import { AdventurerAvatar } from './AdventurerAvatar';

export const AdventurerList: React.FC = () => {
  const { state, renameAdventurer } = useGame();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [skillTreeAdventurer, setSkillTreeAdventurer] = useState<Adventurer | null>(null);
  const [showRecruitment, setShowRecruitment] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleStartRename = (adv: Adventurer) => {
      setEditingId(adv.id);
      setEditName(adv.name);
  };

  const handleSaveRename = () => {
      if (editingId && editName.trim()) {
          renameAdventurer(editingId, editName);
      }
      setEditingId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {selectedItem && <ItemDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {skillTreeAdventurer && <SkillTreeModal adventurer={skillTreeAdventurer} onClose={() => setSkillTreeAdventurer(null)} />}
      {showRecruitment && <RecruitmentModal onClose={() => setShowRecruitment(false)} />}

      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-800">
        <div>
            <h2 className="text-xl font-bold text-slate-200">Contractor Roster</h2>
            <p className="text-sm text-slate-500">{state.adventurers.length} active contractors</p>
        </div>
        <button 
          onClick={() => setShowRecruitment(true)}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 transform hover:scale-105"
        >
            <UserPlus size={16} />
            Visit Tavern
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {state.adventurers.map((adv) => {
          const run = state.activeRuns.find(r => r.adventurerIds.includes(adv.id));
          const isBusy = !!run;
          const isEditing = editingId === adv.id;
          
          const snapshotAdv = run?.adventurerState?.[adv.id];

          // Use the LIVE adventurer for Roster display to provide immediate feedback on loadout changes
          const effectiveStats = getAdventurerStats(adv, state);
          const power = calculateAdventurerPower(adv, state);
          const activeModifiers = getActiveModifiers([adv.id], state);
          const isWeaponMaster = activeModifiers.includes('WEAPON_MASTER');

          const spec = calculateAdventurerSpecialization(adv);
          const specIcon = spec.type === 'COMBAT' ? <Sword size={12} /> 
                         : spec.type === 'GATHERING' ? <Leaf size={12} /> 
                         : spec.type === 'FISHING' ? <Anchor size={12} /> 
                         : <Crown size={12} />;

          const rarityBorder = {
              'Common': 'border-slate-700', 'Uncommon': 'border-green-900',
              'Rare': 'border-blue-900', 'Epic': 'border-purple-900', 'Legendary': 'border-orange-900',
          }[adv.rarity] || 'border-slate-700';

          return (
            <div key={adv.id} className={`bg-slate-800 border ${rarityBorder} rounded-lg shadow-xl overflow-hidden flex flex-col relative`}>
              <div className="p-3 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center group/card">
                  <div className="flex items-center gap-3 flex-grow min-w-0">
                       <AdventurerAvatar adventurer={adv} size="md" isBusy={isBusy} />
                       <div className="flex-grow min-w-0 pr-2">
                           {isEditing ? (
                               <div className="flex items-center gap-1">
                                   <input 
                                        type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                        className="bg-slate-950 border border-slate-600 rounded px-1 py-0.5 text-sm font-bold text-white w-full focus:outline-none focus:border-indigo-500"
                                        autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                                   />
                                   <button onClick={handleSaveRename} className="p-1 text-green-400 hover:bg-slate-700 rounded"><Check size={14}/></button>
                                   <button onClick={() => setEditingId(null)} className="p-1 text-red-400 hover:bg-slate-700 rounded"><X size={14}/></button>
                               </div>
                           ) : (
                               <div className="flex items-baseline gap-2 group/name">
                                   <div className={`text-base font-bold leading-none truncate ${RARITY_COLORS[adv.rarity]}`}>{adv.name}</div>
                                   <button onClick={() => handleStartRename(adv)} className="opacity-0 group-hover/name:opacity-100 text-slate-500 hover:text-white transition-opacity">
                                       <PenLine size={10} />
                                   </button>
                               </div>
                           )}
                           <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] text-slate-400 font-medium">Lvl {adv.level}</span>
                               <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-current bg-slate-950/50 ${spec.color}`}>
                                   {specIcon} <span>{spec.label}</span>
                               </div>
                           </div>
                       </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2 border-l border-slate-800">
                      <div className="text-lg font-mono font-bold text-slate-200">{formatNumber(power)} <span className="text-xs text-slate-500 font-sans font-normal">Pwr</span></div>
                      {isBusy && <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wide text-right">In Combat</div>}
                  </div>
              </div>

              <div className="p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2 bg-slate-900/30 p-2 rounded border border-slate-700/30">
                       <CompactStat icon={<Sword size={12}/>} value={formatNumber(effectiveStats.damage)} color="text-slate-300" />
                       <CompactStat icon={<Heart size={12}/>} value={formatNumber(effectiveStats.health)} color="text-red-400" />
                       <CompactStat icon={<Zap size={12}/>} value={effectiveStats.speed} color="text-blue-400" />
                       <CompactStat icon={<Crosshair size={12}/>} value={`${(effectiveStats.critChance * 100).toFixed(0)}%`} color="text-green-400" />
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                      <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (adv.xp / adv.xpToNextLevel) * 100)}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                       <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[65%]">
                           {adv.traits?.map(trait => (
                               <Tooltip key={trait.id} content={<div className="text-xs font-bold">{trait.name}: {trait.description}</div>}>
                                   <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border bg-slate-900 cursor-help ${trait.type === 'COMBAT' ? 'border-red-900/50 text-red-400' : 'border-emerald-900/50 text-emerald-400'}`}>
                                       <Dna size={12} />
                                   </div>
                               </Tooltip>
                           ))}
                       </div>
                       <button onClick={() => setSkillTreeAdventurer(adv)} className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-colors ${adv.level >= 5 ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50' : 'bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed'}`} disabled={adv.level < 5}>
                            <GitMerge size={10} /> <span>Talents</span>
                            {adv.skillPoints > 0 && <span className="bg-yellow-500 text-slate-900 font-bold px-1 rounded-full animate-pulse">{adv.skillPoints}</span>}
                       </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET].map(type => {
                        const item = adv.slots[type]; 
                        let isPending = false;
                        if (isBusy && snapshotAdv) {
                             const snapshotItem = snapshotAdv.slots[type];
                             const isModified = run.modifiedSlots?.[adv.id]?.includes(type);
                             if (isModified || !areItemsEqual(item, snapshotItem)) isPending = true;
                        }
                        const isDisabled = type === ItemType.TRINKET && isWeaponMaster;
                        return (
                            <button key={type} onClick={() => !isDisabled && item && setSelectedItem(item)} disabled={!item || isDisabled} className={`relative h-10 w-full rounded border flex items-center justify-center transition-all overflow-hidden ${isDisabled ? 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed' : item ? `${RARITY_COLORS[item.rarity]} bg-slate-800 border-slate-600 hover:border-indigo-500 hover:bg-slate-700 group` : 'text-slate-700 bg-slate-900/50 border-slate-800 border-dashed'}`}>
                                {isDisabled ? <Lock size={12} className="text-slate-600" /> : item ? <><ItemIcon item={item} size={14} /><div className="hidden group-hover:flex absolute inset-0 bg-slate-900/90 items-center justify-center text-[8px] font-bold text-white z-10">INSPECT</div>{isPending && <div className="absolute top-0 right-0 p-0.5 bg-amber-900/80 rounded-bl backdrop-blur-sm border-l border-b border-amber-500/30"><RefreshCw size={8} className="text-amber-400 animate-spin-slow-reverse" /></div>}</> : type === ItemType.ARMOR ? <Shield size={14} /> : type === ItemType.TRINKET ? <Sparkles size={14} /> : <Sword size={14} />}
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
