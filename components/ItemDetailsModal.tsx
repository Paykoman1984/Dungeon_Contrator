
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Item, ItemType, Rarity, Adventurer } from '../types';
import { formatNumber, calculateAdventurerPower, calculateItemUpgradeCost, calculateRunSnapshot, areItemsEqual, calculateItemRating, calculateConservativePower, getActiveModifiers, checkResourceCost } from '../utils/gameMath';
import { Trash2, Ban, Hammer, RefreshCw, PlusCircle, Info, X, Check, Shirt, User, ArrowRight, Lock, AlertTriangle, Box } from 'lucide-react';
import { RARITY_COLORS, MAX_STATS_BY_RARITY, ADVENTURER_RARITY_MULTIPLIERS, STAT_TIER_COLORS, MATERIALS } from '../constants';
import { ItemIcon } from './ItemIcon';
import { AdventurerAvatar } from './AdventurerAvatar'; // New Import

interface ItemDetailsModalProps {
    item: Item | null;
    onClose: () => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, onClose }) => {
    const { state, equipItem, unequipItem, salvageItem, enchantItem, rerollStat } = useGame();
    const [tab, setTab] = useState<'MANAGE' | 'CRAFT'>('MANAGE');
    const [isConfirmingSalvage, setIsConfirmingSalvage] = useState(false);

    if (!item) return null;

    let holder: Adventurer | null = null;
    let slotType: ItemType | null = null;
    let isEquipped = false;

    for (const adv of state.adventurers) {
        if (adv.slots.Weapon?.id === item.id) { holder = adv; slotType = ItemType.WEAPON; break; }
        if (adv.slots.Armor?.id === item.id) { holder = adv; slotType = ItemType.ARMOR; break; }
        if (adv.slots.Trinket?.id === item.id) { holder = adv; slotType = ItemType.TRINKET; break; }
    }
    if (holder) isEquipped = true;

    const run = holder ? state.activeRuns.find(r => r.adventurerIds.includes(holder!.id)) : undefined;
    const isBusy = !!run;
    
    let isPending = false;
    if (holder && isBusy && run && run.adventurerState && slotType) {
        const snapshotAdv = run.adventurerState[holder.id];
        if (snapshotAdv) {
            const snapshotItem = snapshotAdv.slots[slotType];
            
            let liveItem = state.inventory.find(i => i.id === item.id);
            if (!liveItem && holder && slotType) {
                const currentHolder = state.adventurers.find(a => a.id === holder!.id);
                if (currentHolder) {
                    liveItem = currentHolder.slots[slotType];
                }
            }
            const checkItem = liveItem || item;

            const isModified = run.modifiedSlots?.[holder.id]?.includes(slotType);
            if (isModified || !areItemsEqual(checkItem, snapshotItem)) {
                isPending = true;
            }
        }
    }

    let liveItem: Item | undefined = state.inventory.find(i => i.id === item.id);
    if (!liveItem && holder && slotType) {
        const currentHolder = state.adventurers.find(a => a.id === holder!.id);
        if (currentHolder) {
            liveItem = currentHolder.slots[slotType];
        }
    }
    const currentItem = liveItem || item;

    const costs = {
        enchant: calculateItemUpgradeCost(currentItem, 'ENCHANT'),
        reroll: calculateItemUpgradeCost(currentItem, 'REROLL')
    };
    
    const rating = calculateItemRating(currentItem);

    const renderCostLabel = (costObj: { gold: number, resources: { resourceId: string, amount: number }[] }) => {
        return (
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                <span className={state.gold >= costObj.gold ? 'text-white' : 'text-slate-500'}>
                    {formatNumber(costObj.gold)}g
                </span>
                {costObj.resources.length > 0 && costObj.resources.map((res, i) => {
                    const mat = MATERIALS[res.resourceId];
                    const owned = state.materials[res.resourceId] || 0;
                    const hasEnough = owned >= res.amount;
                    return (
                        <span key={i} className={`flex items-center gap-1 bg-black/40 px-1 rounded ${hasEnough ? 'text-slate-300' : 'text-slate-600 border border-slate-800 opacity-50'}`}>
                            <Box size={8} /> 
                            {res.amount} {mat ? mat.name.split(' ')[0] : res.resourceId}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
                    <div className="flex gap-4">
                        <div className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center bg-slate-900 shadow-inner ${RARITY_COLORS[currentItem.rarity].replace('text-', 'border-')}`}>
                            <ItemIcon item={currentItem} size={32} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${RARITY_COLORS[currentItem.rarity]}`}>{currentItem.name}</h2>
                            <div className="flex gap-2 text-xs text-slate-400 mt-1">
                                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Lvl {currentItem.level}</span>
                                <span>{currentItem.rarity} {currentItem.type}</span>
                                {currentItem.subtype && currentItem.subtype !== 'None' && <span>({currentItem.subtype})</span>}
                            </div>
                            
                            {currentItem.classRestriction && (
                                <div className="flex gap-1 mt-2">
                                    {currentItem.classRestriction.map(r => (
                                        <span key={r} className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Item Power</div>
                            <div className="text-2xl font-mono font-bold text-indigo-400 leading-none">{formatNumber(rating)}</div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-900">
                    <button 
                        onClick={() => setTab('MANAGE')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${tab === 'MANAGE' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Shirt size={16} /> Management
                    </button>
                    <button 
                        onClick={() => setTab('CRAFT')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${tab === 'CRAFT' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Hammer size={16} /> Reforge & Enchant
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-900">
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                         {currentItem.stats.map((stat, idx) => {
                             const tier = stat.tier || 7;
                             return (
                                 <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
                                     <div className={`absolute top-0 right-0 px-1.5 py-0.5 text-[9px] font-bold rounded-bl bg-black/40 ${STAT_TIER_COLORS[tier]}`}>
                                         T{tier}
                                     </div>
                                     <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">{stat.name}</span>
                                     <span className={`text-lg font-mono font-bold ${STAT_TIER_COLORS[tier]}`}>
                                         +{stat.value}{stat.isPercentage ? '%' : ''}
                                     </span>
                                 </div>
                             )
                         })}
                    </div>

                    {tab === 'MANAGE' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            
                            <div className="bg-slate-950/50 border border-slate-800 rounded p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full overflow-hidden w-10 h-10 border border-slate-700">
                                        {isEquipped && holder ? (
                                            <AdventurerAvatar adventurer={holder} size="sm" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500"><User size={20} /></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-300">
                                            {isEquipped ? `Equipped by ${holder?.name}` : 'Currently in Inventory'}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {isEquipped ? 'Assigned to active roster' : 'Available for assignment'}
                                        </div>
                                    </div>
                                </div>
                                {isEquipped && isBusy && (
                                    isPending ? (
                                        <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-900/20 px-2 py-1 rounded border border-amber-900/50 font-bold">
                                            <RefreshCw size={12} className="animate-spin-slow-reverse" />
                                            <span>Changes Apply Next Run</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-green-500 bg-green-900/20 px-2 py-1 rounded border border-green-900/50 font-bold">
                                            Active (Current Gear)
                                        </div>
                                    )
                                )}
                            </div>

                            {isEquipped ? (
                                <button
                                    onClick={() => {
                                        if (holder && slotType) unequipItem(holder.id, slotType);
                                        onClose();
                                    }}
                                    className={`w-full py-3 rounded-lg font-bold border flex items-center justify-center gap-2 transition-all
                                        bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40 hover:text-red-200
                                    `}
                                >
                                    <X size={18} />
                                    Unequip Item
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Assign to Contractor</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                            {state.adventurers.map(adv => {
                                                const advBusy = state.activeRuns.some(r => r.adventurerIds.includes(adv.id));
                                                const compatible = !currentItem.classRestriction || currentItem.classRestriction.includes(adv.role);
                                                const currentEquipped = adv.slots[currentItem.type];
                                                const activeModifiers = getActiveModifiers([adv.id], state);
                                                const isWeaponMaster = activeModifiers.includes('WEAPON_MASTER');
                                                const isSlotDisabled = currentItem.type === ItemType.TRINKET && isWeaponMaster;

                                                let advPending = false;
                                                if(advBusy) {
                                                    const run = state.activeRuns.find(r => r.adventurerIds.includes(adv.id));
                                                    if(run && run.adventurerState) {
                                                        const snapshotAdv = run.adventurerState[adv.id];
                                                        if (snapshotAdv) {
                                                            const snapshotItem = snapshotAdv.slots[currentItem.type];
                                                            
                                                            const isModified = run.modifiedSlots?.[adv.id]?.includes(currentItem.type);
                                                            if (isModified || !areItemsEqual(currentItem, snapshotItem)) {
                                                                advPending = true;
                                                            }
                                                        }
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={adv.id}
                                                        onClick={() => {
                                                            equipItem(adv.id, currentItem);
                                                            onClose();
                                                        }}
                                                        disabled={!compatible || isSlotDisabled}
                                                        className={`
                                                            flex flex-col p-3 rounded border text-left transition-all
                                                            ${!compatible || isSlotDisabled
                                                                ? 'bg-slate-900/50 text-slate-600 border-slate-800 opacity-60' 
                                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500 hover:bg-slate-700'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-center w-full mb-2">
                                                            <span className="text-sm font-bold flex items-center gap-2">
                                                                {adv.name}
                                                                {compatible && !isSlotDisabled && !advBusy && <Check size={14} className="text-indigo-500" />}
                                                                {advBusy && advPending && <RefreshCw size={12} className="text-amber-500" />}
                                                                {isSlotDisabled && <Lock size={12} className="text-slate-500" />}
                                                            </span>
                                                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                                                                {calculateConservativePower(adv, state)} PWR
                                                            </span>
                                                        </div>

                                                        <div className="w-full bg-black/20 rounded p-2 text-xs">
                                                            {currentEquipped ? (
                                                                <>
                                                                    <div className="flex justify-between items-center mb-1 border-b border-white/5 pb-1">
                                                                        <span className={`${RARITY_COLORS[currentEquipped.rarity]} font-bold truncate`}>
                                                                            {currentEquipped.name}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-500 flex-shrink-0 ml-1">Lvl {currentEquipped.level}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                                                        {currentEquipped.stats.map((s, i) => (
                                                                            <div key={i} className="flex justify-between text-[10px]">
                                                                                <span className="text-slate-500 truncate">{s.name}</span>
                                                                                <span className={`${STAT_TIER_COLORS[s.tier || 7]} flex-shrink-0 ml-1`}>+{s.value}{s.isPercentage?'%':''}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-slate-500 italic py-1 text-center">Empty Slot</div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex gap-2 mt-2 justify-end">
                                                            {isSlotDisabled && <span className="text-[10px] text-red-500 font-bold uppercase">Locked (Weapon Master)</span>}
                                                            {!compatible && <span className="text-[10px] text-red-500 font-bold uppercase">{adv.role} Only</span>}
                                                            {advBusy && !isSlotDisabled && (
                                                                advPending ? (
                                                                    <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1"><RefreshCw size={10} /> Queued</span>
                                                                ) : (
                                                                    <span className="text-[10px] text-green-500 font-bold uppercase">Active</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {isConfirmingSalvage ? (
                                        <div className="pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-red-400 mb-2">
                                                <AlertTriangle size={16} />
                                                Confirm Destruction?
                                            </div>
                                            <p className="text-xs text-slate-500 text-center mb-3">This item will be destroyed permanently.</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setIsConfirmingSalvage(false)}
                                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors text-xs uppercase tracking-wide"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        salvageItem(currentItem.id);
                                                        onClose();
                                                    }}
                                                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 rounded font-bold transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                                                >
                                                    <Trash2 size={14} /> Confirm
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                                            <div className="text-sm text-slate-400">Scrap Value: <span className="text-yellow-500 font-mono font-bold">{currentItem.value}g</span></div>
                                            <button
                                                onClick={() => setIsConfirmingSalvage(true)}
                                                className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-900/30 rounded text-sm font-bold flex items-center gap-2 transition-all"
                                            >
                                                <Trash2 size={16} /> Salvage
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'CRAFT' && (
                         <div className="space-y-4 animate-in fade-in duration-200">
                             {isBusy && isPending && (
                                 <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded text-amber-200 text-sm flex items-center gap-2 mb-2">
                                     <RefreshCw size={16} className="animate-spin-slow-reverse" />
                                     Contractor is busy. Stat changes will apply to the next run.
                                 </div>
                             )}

                             <div className="space-y-2">
                                 {currentItem.stats.map((stat, idx) => {
                                     const tier = stat.tier || 7;
                                     const canAfford = state.gold >= costs.reroll.gold && checkResourceCost(state, costs.reroll.resources);
                                     return (
                                         <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
                                             <div>
                                                 <div className="text-[10px] text-slate-500 uppercase font-bold">{idx === 0 ? 'Main Stat' : 'Affix'}</div>
                                                 <div className="flex items-center gap-2">
                                                     <span className={`text-xs px-1.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold ${STAT_TIER_COLORS[tier]}`}>T{tier}</span>
                                                     <span className="text-sm text-slate-300 font-medium">{stat.name} <span className={STAT_TIER_COLORS[tier]}>+{stat.value}{stat.isPercentage ? '%' : ''}</span></span>
                                                 </div>
                                             </div>
                                             <button
                                                onClick={() => rerollStat(currentItem.id, idx)}
                                                disabled={!canAfford}
                                                className={`
                                                    px-3 py-1.5 rounded text-xs font-bold flex flex-col items-end border transition-colors min-w-[100px]
                                                    ${!canAfford
                                                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                                        : 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white'
                                                    }
                                                `}
                                             >
                                                 <span className="flex items-center gap-1"><RefreshCw size={10} /> Reforge</span>
                                                 {renderCostLabel(costs.reroll)}
                                             </button>
                                         </div>
                                     )
                                 })}

                                 {Array.from({ length: MAX_STATS_BY_RARITY[currentItem.rarity] - currentItem.stats.length }).map((_, idx) => {
                                      const canAfford = state.gold >= costs.enchant.gold && checkResourceCost(state, costs.enchant.resources);
                                      return (
                                          <div key={`empty-${idx}`} className="bg-slate-900/30 border border-dashed border-slate-700 p-3 rounded flex justify-between items-center">
                                              <div className="text-sm text-slate-500 italic flex items-center gap-2">
                                                  <PlusCircle size={16} /> Empty Enchantment Slot
                                              </div>
                                              <button
                                                onClick={() => enchantItem(currentItem.id)}
                                                disabled={!canAfford}
                                                className={`
                                                    px-3 py-1.5 rounded text-xs font-bold flex flex-col items-end border transition-colors min-w-[100px]
                                                    ${!canAfford
                                                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                                        : 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                                                    }
                                                `}
                                              >
                                                  <span className="flex items-center gap-1"><PlusCircle size={10} /> Enchant</span>
                                                  {renderCostLabel(costs.enchant)}
                                              </button>
                                          </div>
                                      )
                                 })}
                             </div>
                             
                             <div className="mt-4 p-3 bg-slate-800 rounded text-xs text-slate-400 flex gap-2">
                                 <Info size={16} className="flex-shrink-0 mt-0.5 text-indigo-400" />
                                 <div>
                                     Reforging a stat completely randomizes its <strong>Value</strong> and <strong>Tier</strong> (T1-T7).
                                     <br/>Enchanting adds a new random stat line. 
                                     <div className="mt-1 text-amber-400">Costs scale with Level, Potential, and Rarity. Uncommon+ items require materials.</div>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};
