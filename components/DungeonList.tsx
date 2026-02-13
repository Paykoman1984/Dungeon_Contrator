
import React, { useState, useEffect } from 'react';
import { useGame } from '../services/GameContext';
import { DUNGEONS, ENEMIES, MATERIALS, REALM_MODIFIERS, CONSUMABLES } from '../constants';
import { calculateAdventurerPower, calculateDungeonDuration, calculatePartyDps, formatNumber, calculateEffectiveDungeonStats, getEarlyGameBoost, applyDungeonMechanic } from '../utils/gameMath';
import { Timer, Skull, Users, Plus, X, AlertTriangle, Repeat, Activity, Power, Square, Swords, Leaf, Anchor, Lock, AlertOctagon, CheckSquare, Square as UncheckedSquare, Rocket, Zap, Ghost, Crosshair, Box, FlaskConical } from 'lucide-react';
import { ContractType, AdventurerRole, DungeonMechanicId, ActiveConsumable } from '../types';
import { DungeonProgressBar } from './DungeonProgressBar';
import { CombatStage } from './CombatStage'; // New Import

export const DungeonList: React.FC = () => {
  const { state, startDungeon, cancelDungeon, stopRepeat, toggleDungeonModifier } = useGame();
  const [configuringDungeon, setConfiguringDungeon] = useState<string | null>(null);
  const [selectedAdvIds, setSelectedAdvIds] = useState<string[]>([]);
  const [isAutoRepeat, setIsAutoRepeat] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ContractType>(ContractType.DUNGEON);

  // Early Game Boost Logic
  const boost = getEarlyGameBoost(state);

  const addToParty = (id: string) => {
      if (selectedAdvIds.length >= 3) return; // Limit party size to 3
      if (!selectedAdvIds.includes(id)) {
          setSelectedAdvIds([...selectedAdvIds, id]);
      }
  };

  const removeFromParty = (id: string) => {
      setSelectedAdvIds(selectedAdvIds.filter(advId => advId !== id));
  };

  const startConfiguration = (dungeonId: string) => {
      // Toggle off if clicking same
      if (configuringDungeon === dungeonId) {
          cancelConfiguration();
          return;
      }
      setConfiguringDungeon(dungeonId);
      setIsAutoRepeat(false); // Default to single run
      
      // Load last party or start empty
      const lastParty = state.lastParties[dungeonId];
      if (lastParty && lastParty.length > 0) {
          // Filter out IDs that no longer exist (fired adventurers) OR are busy
          // Also cap at 3 if legacy save had more
          const validIds = lastParty.filter(id => {
              const adv = state.adventurers.find(a => a.id === id);
              if (!adv) return false;
              // Check if busy in another run
              const isBusy = state.activeRuns.some(r => r.adventurerIds.includes(id));
              return !isBusy;
          }).slice(0, 3);
          setSelectedAdvIds(validIds);
      } else {
          setSelectedAdvIds([]); 
      }
  };

  const cancelConfiguration = () => {
      setConfiguringDungeon(null);
      setSelectedAdvIds([]);
      setIsAutoRepeat(false);
  };

  const filteredDungeons = DUNGEONS.filter(d => d.type === activeTab);

  const getRoleColor = (role: AdventurerRole) => {
      switch(role) {
          case AdventurerRole.WARRIOR: return 'bg-red-500';
          case AdventurerRole.ROGUE: return 'bg-emerald-500';
          case AdventurerRole.MAGE: return 'bg-blue-500';
          default: return 'bg-slate-500';
      }
  };

  // Helper to render mechanic visual
  const renderMechanicBadge = (id: DungeonMechanicId | undefined) => {
      if (!id || id === 'NONE') return null;

      let icon = <Activity size={12} />;
      let color = "text-slate-400 border-slate-500/30 bg-slate-900/50";
      let label: string = id;
      let details: string[] = [];

      switch (id) {
          case 'SWARM':
              icon = <Zap size={12} />;
              color = "text-lime-400 border-lime-500/30 bg-lime-900/20";
              label = "SWARM TACTICS";
              details = ["Enemy HP -50%", "Loot Volume +++", "XP/Gold per kill reduced"];
              break;
          case 'PACK_TACTICS':
              icon = <Users size={12} />;
              color = "text-orange-400 border-orange-500/30 bg-orange-900/20";
              label = "PACK TACTICS";
              details = ["Power Req +30%", "Gold Yield +50%"];
              break;
          case 'UNDEAD_RESILIENCE':
              icon = <Ghost size={12} />;
              color = "text-purple-400 border-purple-500/30 bg-purple-900/20";
              label = "UNDEAD RESILIENCE";
              details = ["Enemy HP +50%", "XP Yield +100%"];
              break;
          case 'RESOURCE_SURGE':
              icon = <Rocket size={12} />;
              color = "text-cyan-400 border-cyan-500/30 bg-cyan-900/20";
              label = "RESOURCE SURGE";
              details = ["Duration -20%", "Yield/Hour Increased"];
              break;
          case 'ELITE_HUNT':
              icon = <Crosshair size={12} />;
              color = "text-red-400 border-red-500/30 bg-red-900/20";
              label = "ELITE HUNT";
              details = ["High Power Req", "Loot Rolls +2", "XP/Gold +50%"];
              break;
      }

      return (
          <div className={`mt-2 p-2 rounded border ${color} text-xs`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                  {icon} {label}
              </div>
              <div className="flex flex-wrap gap-2 opacity-80 text-[10px]">
                  {details.map((d, i) => (
                      <span key={i} className="bg-black/20 px-1.5 py-0.5 rounded">{d}</span>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      
      {/* Tabs & Indicators */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
          <div className="flex space-x-2">
              <button
                onClick={() => { setActiveTab(ContractType.DUNGEON); cancelConfiguration(); }}
                className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === ContractType.DUNGEON ? 'bg-slate-800 text-slate-100 border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <Swords size={16} /> Combat
              </button>
              <button
                onClick={() => { setActiveTab(ContractType.GATHERING); cancelConfiguration(); }}
                className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === ContractType.GATHERING ? 'bg-slate-800 text-emerald-100 border-t border-x border-slate-700' : 'text-slate-500 hover:text-emerald-400'}`}
              >
                  <Leaf size={16} /> Gathering
              </button>
              <button
                onClick={() => { setActiveTab(ContractType.FISHING); cancelConfiguration(); }}
                className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === ContractType.FISHING ? 'bg-slate-800 text-blue-100 border-t border-x border-slate-700' : 'text-slate-500 hover:text-blue-400'}`}
              >
                  <Anchor size={16} /> Fishing
              </button>
          </div>

          {/* Early Game Boost Indicator */}
          {boost.active && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-full border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)] animate-pulse">
                  <Rocket size={14} className="text-orange-400" />
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wide">Rookie Rush Active</span>
                      <span className="text-[9px] text-orange-300/80">
                          XP x{boost.xpMult.toFixed(1)} • Gold x{boost.goldMult.toFixed(1)}
                      </span>
                  </div>
              </div>
          )}
      </div>

      {/* ACTIVE POTIONS BAR */}
      {state.activeConsumables.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
              {state.activeConsumables.map(active => (
                  <PotionBadge key={active.id} active={active} />
              ))}
          </div>
      )}

      <div className="grid gap-4">
        {filteredDungeons.map(dungeon => {
          // Get ALL active runs for this dungeon
          const dungeonRuns = state.activeRuns.filter(r => r.dungeonId === dungeon.id);
          const isConfiguring = configuringDungeon === dungeon.id;
          
          // MECHANIC LOGIC
          const mechanic = applyDungeonMechanic(dungeon.mechanicId, dungeon.tier, state.realm.realmRank);
          
          const baseDurationMs = dungeon.durationSeconds * 1000 * mechanic.durationMult; // Apply mechanic duration
          const duration = calculateDungeonDuration(baseDurationMs, state); // Apply player bonuses
          
          const enemy = ENEMIES[dungeon.enemyId];
          const isUnlocked = state.unlockedDungeons.includes(dungeon.id);

          // Stats Calculation (for setup)
          const currentPartyDps = calculatePartyDps(selectedAdvIds, state);
          const currentPartyPower = selectedAdvIds.reduce((sum, id) => {
              const adv = state.adventurers.find(a => a.id === id);
              return sum + (adv ? calculateAdventurerPower(adv, state) : 0);
          }, 0);
          
          const isCombat = dungeon.type === ContractType.DUNGEON;

          // Realm Effective Stats
          const realmStats = calculateEffectiveDungeonStats(dungeon, state.realm);
          const effectivePowerReq = realmStats.recommendedPower;

          // Estimate Kills / Yield
          const effectiveEnemyHp = enemy.hp * mechanic.enemyHpMult; // Apply Mechanic HP mod
          
          // FIX: duration is in ms, convert to seconds for calculation against DPS
          let estimatedKills = Math.floor((currentPartyDps * (duration / 1000)) / effectiveEnemyHp);
          
          if (!isCombat) {
              // For gathering, pretend 1 cycle per 2 "kills" worth of DPS to normalize
              estimatedKills = Math.max(1, Math.floor(estimatedKills / 2));
          }
          
          // Overpowered check (Diminishing Returns)
          const isOverpowered = currentPartyPower > (effectivePowerReq * 3);
          // Requirement check
          const meetsPowerRequirement = currentPartyPower >= effectivePowerReq;
          const lowPower = !isCombat && !meetsPowerRequirement; // Gathering allows low power but penalizes

          // Estimate Averages for display
          let avgGold = (enemy.goldMin + enemy.goldMax) / 2;
          let avgXp = (enemy.xpMin + enemy.xpMax) / 2;
          
          // Apply Modifiers
          avgGold *= realmStats.lootMultiplier * mechanic.goldYieldMult;
          avgXp *= realmStats.lootMultiplier * mechanic.xpYieldMult;

          // APPLY BOOST TO ESTIMATE
          if (boost.active) {
              avgGold *= boost.goldMult;
              avgXp *= boost.xpMult;
          }

          if (isCombat && isOverpowered) {
              avgGold = enemy.goldMin * realmStats.lootMultiplier * (boost.active ? boost.goldMult : 1);
              avgXp = (avgXp * 0.10); // Penalty is harsh on base
          }

          const totalEstGold = estimatedKills * avgGold;
          const totalEstXp = estimatedKills * avgXp;

          // Validation
          const busyMembers = state.adventurers.filter(a => selectedAdvIds.includes(a.id) && state.activeRuns.some(r => r.adventurerIds.includes(a.id)));
          const isPartyBusy = busyMembers.length > 0;

          // Available Modifiers for this dungeon
          const unlockedModifiers = REALM_MODIFIERS.filter(m => state.realm.realmRank >= m.unlockRank);
          const activeMods = state.realm.activeModifiers[dungeon.id] || [];

          // Render Locked State
          if (!isUnlocked) {
              const prevDungeon = dungeon.unlockReq?.previousDungeonId ? DUNGEONS.find(d => d.id === dungeon.unlockReq?.previousDungeonId) : null;
              
              return (
                  <div key={dungeon.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between opacity-60 grayscale group hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded bg-slate-950 flex items-center justify-center border border-slate-800">
                              <Lock size={20} className="text-slate-600" />
                          </div>
                          <div>
                              <h3 className="text-slate-400 font-bold flex items-center gap-2">
                                  {dungeon.name} 
                                  <span className="text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Tier {dungeon.tier}</span>
                              </h3>
                              <p className="text-xs text-slate-600">Locked Region</p>
                          </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 font-mono">
                          {dungeon.unlockReq?.minPower && <div>Requires {dungeon.unlockReq.minPower} Total Power</div>}
                          {dungeon.unlockReq?.minGuildLevel && <div>Requires Guild Level {dungeon.unlockReq.minGuildLevel}</div>}
                          {dungeon.unlockReq?.minAscension && <div>Requires Ascension {dungeon.unlockReq.minAscension}</div>}
                          {dungeon.unlockReq?.previousDungeonId && dungeon.unlockReq?.previousDungeonClears && (
                              <div>
                                  Req. {dungeon.unlockReq.previousDungeonClears} Clears of {prevDungeon?.name || 'Previous'} 
                                  <span className="text-slate-400"> ({state.statistics.dungeonClears[dungeon.unlockReq.previousDungeonId] || 0}/{dungeon.unlockReq.previousDungeonClears})</span>
                              </div>
                          )}
                      </div>
                  </div>
              )
          }

          // Render Unlocked State
          return (
            <div key={dungeon.id} className={`bg-slate-800 border ${isConfiguring ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700'} rounded-lg overflow-hidden group relative transition-all`}>
               
               <div className="p-4 relative z-10">
                   <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                {dungeon.name}
                                <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">Lvl {dungeon.level}</span>
                                {activeMods.length > 0 && (
                                    <span className="text-[10px] bg-red-900/30 text-red-300 px-2 py-0.5 rounded border border-red-900/50 flex items-center gap-1">
                                        <AlertOctagon size={10} /> {activeMods.length} Mutations
                                    </span>
                                )}
                            </h3>
                            <p className="text-slate-400 text-sm">{dungeon.description}</p>
                            
                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Timer size={12}/> {(duration / 1000).toFixed(0)}s</span>
                                {isCombat ? (
                                    <span className="flex items-center gap-1 text-red-300"><Skull size={12}/> {enemy.name} ({formatNumber(effectiveEnemyHp)} HP)</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-slate-400"><AlertTriangle size={12}/> Difficulty: {effectivePowerReq}</span>
                                )}
                                <span className={`flex items-center gap-1 border px-1.5 py-0.5 rounded ${isCombat ? 'text-orange-300 border-orange-900/50 bg-orange-900/20' : 'text-emerald-300 border-emerald-900/50 bg-emerald-900/20'}`}>
                                    {isCombat ? <Swords size={12}/> : <Leaf size={12} />} 
                                    {isCombat ? 'Rec.' : 'Req.'} {effectivePowerReq} Power
                                </span>
                            </div>
                            
                            {/* MECHANIC BADGE */}
                            {renderMechanicBadge(dungeon.mechanicId)}

                            {/* Reward Info */}
                            <div className="flex gap-3 mt-2 text-[10px] text-slate-600 border-t border-slate-700/30 pt-1">
                                <span>Base Rewards:</span>
                                {isCombat ? (
                                    <>
                                        <span className="text-yellow-600">{enemy.goldMin}-{enemy.goldMax} Gold</span>
                                        <span className="text-blue-600">{enemy.xpMin}-{enemy.xpMax} XP</span>
                                    </>
                                ) : (
                                    dungeon.lootTable?.map(mid => {
                                        const mat = MATERIALS[mid];
                                        return <span key={mid} className="text-slate-400">{mat?.name}</span>
                                    })
                                )}
                            </div>
                        </div>

                        {/* Status / Action Button */}
                        <div className="text-right">
                            {!isConfiguring ? (
                                <button
                                    onClick={() => startConfiguration(dungeon.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 text-sm font-semibold px-4 py-2 rounded transition-colors"
                                >
                                    {dungeonRuns.length > 0 ? 'New Contract' : 'Select'}
                                </button>
                            ) : (
                                <button
                                    onClick={cancelConfiguration}
                                    className="text-slate-400 hover:text-white text-sm px-2 py-1"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                   </div>

                   {/* Active Runs List */}
                   {dungeonRuns.length > 0 && (
                       <div className="mt-4 pt-4 border-t border-slate-700/50">
                           {/* VISUAL BATTLE STAGE */}
                           <div className="mb-4">
                               <CombatStage dungeonId={dungeon.id} adventurerIds={dungeonRuns[0].adventurerIds} />
                           </div>

                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                               <Activity size={12} className="text-green-400"/> Active Operations ({dungeonRuns.length})
                           </h4>
                           <div className="space-y-2">
                               {dungeonRuns.map((run) => {
                                   const activeAdventurers = state.adventurers.filter(a => run.adventurerIds.includes(a.id));
                                   const isInfinite = run.autoRepeat;
                                   
                                   // Real-time projected kills for this run (visual only)
                                   const runDps = calculatePartyDps(run.adventurerIds, state);
                                   let runEstKills = Math.floor((runDps * (run.duration/1000)) / effectiveEnemyHp);
                                   if(!isCombat) runEstKills = Math.max(1, Math.floor(runEstKills/2));

                                   return (
                                       <div key={run.id} className="bg-slate-900/50 rounded p-2 border border-slate-700/50 flex items-start gap-3 relative overflow-hidden group/run">
                                           {/* High Performance Progress Bar */}
                                           <DungeonProgressBar 
                                               startTime={run.startTime} 
                                               duration={run.duration} 
                                               isAutoRepeat={run.autoRepeat} 
                                           />
                                           
                                           <div className="flex-1 min-w-0">
                                               {/* Vertical Adventurer List */}
                                               <div className="mb-2">
                                                   <div className="flex items-center gap-2 mb-1">
                                                       <Users size={12} className="text-indigo-400"/>
                                                       <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Assigned Team</span>
                                                   </div>
                                                   <div className="flex flex-col gap-1 pl-1">
                                                       {activeAdventurers.map(a => (
                                                           <div key={a.id} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                                                               <div className={`w-1.5 h-1.5 rounded-full ${getRoleColor(a.role)}`}></div>
                                                               <span className="font-bold text-slate-200">{a.name}</span>
                                                               <span className="text-slate-500 text-[10px] sm:text-xs">
                                                                   (Lvl {a.level}, {formatNumber(calculateAdventurerPower(a, state))} Pwr, {a.role})
                                                               </span>
                                                           </div>
                                                       ))}
                                                   </div>
                                               </div>

                                               <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                                                   <Swords size={10} /> Total: {formatNumber(runDps)} Atk Pwr
                                                   <span className="text-slate-700">|</span>
                                                   {isCombat ? <Skull size={10} /> : <Leaf size={10} />} ~{runEstKills} {isCombat ? 'Kills' : 'Yield'}/Run
                                               </div>
                                           </div>
                                           
                                           <div className="flex flex-col items-end gap-2 mt-1 z-10">
                                                <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                                                    {isInfinite ? (
                                                        <span className="text-indigo-400 flex items-center gap-1 font-bold">
                                                            <Repeat size={10} className="animate-spin-slow" /> Auto
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-400 flex items-center gap-1 font-bold">
                                                            <Activity size={10} /> Running
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-1">
                                                    {/* Stop Loop Button */}
                                                    {isInfinite && (
                                                        <button 
                                                            onClick={() => stopRepeat(run.id)}
                                                            className="p-1 rounded bg-amber-900/20 border border-amber-700/50 text-amber-400 hover:bg-amber-900/40 text-xs transition-colors"
                                                            title="Finish this run and stop repeating"
                                                        >
                                                            <Square size={12} fill="currentColor" />
                                                        </button>
                                                    )}

                                                    {/* Force Cancel Button */}
                                                    <button 
                                                        onClick={() => cancelDungeon(run.id)}
                                                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/10 transition-colors"
                                                        title="Abort Immediately"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                           </div>
                                       </div>
                                   );
                               })}
                           </div>
                       </div>
                   )}

                   {/* Configuration Area */}
                   {isConfiguring && (
                       <div className="mt-6 pt-4 border-t border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                           
                           {/* World Mutators Section */}
                           {unlockedModifiers.length > 0 && (
                               <div className="mb-4 bg-cyan-950/20 p-3 rounded border border-cyan-900/30">
                                   <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                                       <AlertOctagon size={12} /> World Mutations
                                   </div>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                       {unlockedModifiers.map(mod => {
                                           const isActive = activeMods.includes(mod.id);
                                           return (
                                               <button
                                                   key={mod.id}
                                                   onClick={() => toggleDungeonModifier(dungeon.id, mod.id)}
                                                   className={`flex items-center justify-between p-2 rounded border text-left transition-all ${isActive ? 'bg-red-900/30 border-red-500/50 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                               >
                                                   <div>
                                                       <div className="text-xs font-bold">{mod.name}</div>
                                                       <div className="text-[10px] opacity-70">Diff x{mod.enemyPowerMult} • Loot x{mod.lootYieldMult}</div>
                                                   </div>
                                                   {isActive ? <CheckSquare size={14} className="text-red-400" /> : <UncheckedSquare size={14} />}
                                               </button>
                                           );
                                       })}
                                   </div>
                               </div>
                           )}

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                               {/* Assigned Party */}
                               <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex flex-col">
                                   <div className="flex justify-between items-center mb-3">
                                       <h4 className="text-sm font-bold text-indigo-300">Assigned Team <span className="text-slate-500">({selectedAdvIds.length}/3)</span></h4>
                                   </div>
                                   
                                   <div className="space-y-2 flex-grow">
                                       {selectedAdvIds.length === 0 ? (
                                           <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 italic py-6 border-2 border-dashed border-slate-800 rounded bg-slate-900/20">
                                               <Users size={24} className="mb-2 opacity-50"/>
                                               No contractors assigned.<br/>Add from roster.
                                           </div>
                                       ) : (
                                           selectedAdvIds.map(id => {
                                               const adv = state.adventurers.find(a => a.id === id);
                                               if(!adv) return null;
                                               const isBusy = state.activeRuns.some(r => r.adventurerIds.includes(adv.id));
                                               
                                               return (
                                                   <button 
                                                        key={adv.id}
                                                        onClick={() => removeFromParty(adv.id)}
                                                        className={`
                                                            w-full flex justify-between items-center p-2 rounded border group transition-all
                                                            ${isBusy 
                                                                ? 'bg-amber-900/10 border-amber-800/50 text-amber-200/50' 
                                                                : 'bg-indigo-900/30 border-indigo-500/30 text-indigo-100 hover:bg-red-900/30 hover:border-red-500/50'
                                                            }
                                                        `}
                                                   >
                                                       <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-amber-800' : 'bg-indigo-500'}`}></div>
                                                            <span className="text-sm font-medium">{adv.name}</span>
                                                            <span className="text-xs text-slate-500">Lvl {adv.level}</span>
                                                       </div>
                                                       <div className="flex items-center gap-3">
                                                           {isBusy && <span className="text-[10px] uppercase font-bold text-amber-500">Busy</span>}
                                                           <span className={`text-xs font-mono ${isBusy ? 'text-slate-600' : 'text-indigo-300'}`}>{calculateAdventurerPower(adv, state)} Pwr</span>
                                                           <X size={14} className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"/>
                                                       </div>
                                                   </button>
                                               );
                                           })
                                       )}
                                   </div>
                               </div>

                               {/* Available Roster */}
                               <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex flex-col">
                                   <div className="flex justify-between items-center mb-3">
                                       <h4 className="text-sm font-bold text-slate-400">Available Roster</h4>
                                   </div>
                                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                       {state.adventurers.filter(a => !selectedAdvIds.includes(a.id)).map(adv => {
                                           const isBusy = state.activeRuns.some(r => r.adventurerIds.includes(adv.id));
                                           if (isBusy) return null;
                                           const isFull = selectedAdvIds.length >= 3;

                                           return (
                                               <button 
                                                    key={adv.id}
                                                    onClick={() => addToParty(adv.id)}
                                                    disabled={isFull}
                                                    className={`
                                                        w-full flex justify-between items-center p-2 rounded border transition-all group
                                                        ${isFull 
                                                            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-60' 
                                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500'
                                                        }
                                                    `}
                                               >
                                                   <div className="flex items-center gap-2">
                                                       <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-green-400 transition-colors"></div>
                                                       <span className="text-sm">{adv.name}</span>
                                                       <span className="text-xs text-slate-500">Lvl {adv.level}</span>
                                                   </div>
                                                   <div className="flex items-center gap-2">
                                                       <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300">{calculateAdventurerPower(adv, state)} Pwr</span>
                                                       <Plus size={14} className={isFull ? 'hidden' : 'text-slate-600 group-hover:text-green-400 transition-colors'}/>
                                                   </div>
                                               </button>
                                           )
                                       })}
                                       {state.adventurers.filter(a => !selectedAdvIds.includes(a.id) && !state.activeRuns.some(r => r.adventurerIds.includes(a.id))).length === 0 && (
                                           <div className="text-xs text-slate-500 italic text-center py-6">
                                               No available contractors.
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>

                           {/* Prediction & Actions */}
                           <div className={`flex flex-col xl:flex-row items-center justify-between p-4 rounded-lg border gap-4 transition-colors ${isOverpowered ? 'bg-red-950/20 border-red-900/50' : 'bg-slate-950 border-slate-800'}`}>
                               
                               <div className="flex flex-col gap-2 w-full xl:w-auto">
                                   <div className="text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                       <div>
                                           <span className="text-slate-500 block text-xs uppercase tracking-wider">Party Power</span>
                                           <span className="text-white font-mono text-lg">{formatNumber(currentPartyPower)}</span>
                                       </div>
                                       <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                                       <div>
                                           <span className="text-slate-500 block text-xs uppercase tracking-wider">{isCombat ? 'Est. Kills' : 'Est. Yield'}</span>
                                           <span className={`font-bold text-lg ${estimatedKills > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                               {estimatedKills} <span className="text-sm font-normal text-slate-500">/ Run</span>
                                           </span>
                                       </div>
                                       <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                                       {isCombat && (
                                            <div className="text-xs text-slate-400">
                                                <div>Est. Gold: <span className={`${isOverpowered ? 'text-red-400' : 'text-yellow-400'}`}>~{formatNumber(totalEstGold)}</span></div>
                                                <div>Est. XP: <span className={`${isOverpowered ? 'text-red-400' : 'text-blue-400'}`}>~{formatNumber(totalEstXp)}</span></div>
                                            </div>
                                       )}
                                   </div>

                                   {isCombat && isOverpowered && (
                                       <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-900/30">
                                           <AlertTriangle size={12} />
                                           <span>Team Overpowered! Rewards reduced (Min Gold, 10% XP). Use weaker contractors.</span>
                                       </div>
                                   )}
                                   
                                   {isCombat && !meetsPowerRequirement && selectedAdvIds.length > 0 && (
                                       <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold bg-amber-900/20 px-2 py-1 rounded border border-amber-900/30">
                                           <AlertTriangle size={12} />
                                           <span>Insufficient Power! Recommended: {effectivePowerReq}</span>
                                       </div>
                                   )}
                                   
                                   {!isCombat && lowPower && selectedAdvIds.length > 0 && (
                                        <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold bg-amber-900/20 px-2 py-1 rounded border border-amber-900/30">
                                            <AlertTriangle size={12} />
                                            <span>Power too low! Yield reduced by 50%.</span>
                                        </div>
                                   )}
                               </div>

                               {/* Action Buttons */}
                               <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                                   
                                   {/* Auto-Repeat Toggle (Replaces 1x-5x) */}
                                   <button
                                        onClick={() => setIsAutoRepeat(!isAutoRepeat)}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all
                                            ${isAutoRepeat 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                                            }
                                        `}
                                   >
                                       <Repeat size={16} className={isAutoRepeat ? 'animate-spin-slow' : ''} />
                                       <span>{isAutoRepeat ? 'Looping' : 'Single'}</span>
                                   </button>

                                   {/* Start Button */}
                                   <button
                                        onClick={() => {
                                            startDungeon(dungeon.id, selectedAdvIds, isAutoRepeat);
                                            cancelConfiguration();
                                        }}
                                        disabled={selectedAdvIds.length === 0 || isPartyBusy || (isCombat && !meetsPowerRequirement)}
                                        className={`
                                            flex-1 xl:flex-none text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap
                                            ${selectedAdvIds.length === 0 || isPartyBusy || (isCombat && !meetsPowerRequirement)
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
                                                : isAutoRepeat 
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20 ring-2 ring-indigo-500/50'
                                                    : 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                                            }
                                        `}
                                   >
                                       {isPartyBusy ? (
                                           <>
                                            <AlertTriangle size={16} />
                                            <span>Busy</span>
                                           </>
                                       ) : (isCombat && !meetsPowerRequirement) ? (
                                            selectedAdvIds.length === 0 ? (
                                                <>
                                                 <Users size={16} />
                                                 <span>Assign Team</span>
                                                </>
                                            ) : (
                                                <>
                                                 <AlertTriangle size={16} />
                                                 <span>Need {effectivePowerReq} Power</span>
                                                </>
                                            )
                                       ) : (
                                           <>
                                            {isAutoRepeat ? <Repeat size={16} /> : <Power size={16} />}
                                            <span>Start {activeTab === ContractType.DUNGEON ? 'Contract' : 'Job'}</span>
                                           </>
                                       )}
                                   </button>
                                </div>
                           </div>
                       </div>
                   )}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Independent component to manage its own refresh rate for smooth countdown
const PotionBadge: React.FC<{ active: ActiveConsumable }> = ({ active }) => {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, active.endTime - Date.now()));
    
    useEffect(() => {
        const timer = setInterval(() => {
            const next = Math.max(0, active.endTime - Date.now());
            setTimeLeft(next);
        }, 1000); // 1-second precision
        return () => clearInterval(timer);
    }, [active.endTime]);

    if (timeLeft <= 0) return null;

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const def = CONSUMABLES.find(c => c.id === active.defId);

    return (
        <div className="bg-indigo-900/20 border border-indigo-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs shadow-sm animate-in fade-in">
            <FlaskConical size={12} className="text-indigo-400" />
            <span className="font-bold text-indigo-200">{def?.name}</span>
            <span className="font-mono text-indigo-400/80 text-[10px] w-8 text-right tabular-nums">
                {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};
