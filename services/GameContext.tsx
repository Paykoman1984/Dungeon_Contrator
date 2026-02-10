
import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import { GameState, Item, Adventurer, Dungeon, ActiveRun, ItemType, DungeonReport, AdventurerRole, Rarity, RunSnapshot, ContractType } from '../types';
import { DUNGEONS, INITIAL_GOLD, UPGRADES, INVENTORY_SIZE, ROLE_CONFIG, ENEMIES, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, ENCHANT_COST_BASE, REROLL_COST_BASE, ADVENTURER_RARITY_MULTIPLIERS, TIER_MULTIPLIERS, MATERIALS, ADVENTURER_TRAITS, TITLES_BY_ROLE } from '../constants';
import { calculateAdventurerPower, calculateDungeonDuration, generateItem, generateAdventurer, calculatePartyDps, calculatePartyStat, calculatePrestigeGain, generateRandomAffix, rollStatTier, ITEM_RARITY_MULTIPLIERS, calculateItemUpgradeCost, calculateRunSnapshot, calculateTotalSkillPoints, generateSkillTree } from '../utils/gameMath';

const STORAGE_KEY = 'idle_dungeon_contractor_save_v1';

// Initial State
const initialAdventurer = generateAdventurer('adv_1');
initialAdventurer.role = AdventurerRole.WARRIOR;
initialAdventurer.rarity = Rarity.COMMON;
initialAdventurer.baseStats = {
    damage: ROLE_CONFIG[AdventurerRole.WARRIOR].baseDmg,
    health: ROLE_CONFIG[AdventurerRole.WARRIOR].baseHp,
    speed: ROLE_CONFIG[AdventurerRole.WARRIOR].baseSpeed,
    critChance: ROLE_CONFIG[AdventurerRole.WARRIOR].baseCrit
};

const initialState: GameState = {
  gold: INITIAL_GOLD,
  prestigeCurrency: 0,
  adventurers: [initialAdventurer],
  inventory: [],
  materials: {}, // New field
  activeRuns: [],
  unlockedDungeons: ['rat_cellar'],
  upgrades: {},
  prestigeUpgrades: {},
  lastParties: {},
  recentReports: [],
  lastSaveTime: Date.now(),
  statistics: {
    totalGoldEarned: 0,
    monstersKilled: 0,
    dungeonsCleared: 0,
  },
};

type Action =
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'IMPORT_SAVE'; payload: GameState }
  | { type: 'TICK'; payload: { currentTime: number } }
  | { type: 'START_DUNGEON'; payload: { dungeonId: string; adventurerIds: string[]; autoRepeat: boolean } }
  | { type: 'CANCEL_DUNGEON'; payload: { runId: string } }
  | { type: 'STOP_REPEAT'; payload: { runId: string } }
  | { type: 'COMPLETE_DUNGEON'; payload: { runId: string; success: boolean, kills: number } }
  | { type: 'DISMISS_REPORT'; payload: { reportId: string } }
  | { type: 'EQUIP_ITEM'; payload: { adventurerId: string; item: Item } }
  | { type: 'UNEQUIP_ITEM'; payload: { adventurerId: string; slot: ItemType } }
  | { type: 'SALVAGE_ITEM'; payload: { itemId: string } }
  | { type: 'SALVAGE_MANY_ITEMS'; payload: { itemIds: string[] } }
  | { type: 'BUY_UPGRADE'; payload: { upgradeId: string; cost: number } }
  | { type: 'RECRUIT_ADVENTURER'; payload: { cost: number } }
  | { type: 'PRESTIGE'; payload: { currencyAwarded: number } }
  | { type: 'BUY_PRESTIGE_UPGRADE'; payload: { upgradeId: string; cost: number } }
  | { type: 'ENCHANT_ITEM'; payload: { itemId: string } }
  | { type: 'REROLL_STAT'; payload: { itemId: string; statIndex: number } }
  | { type: 'UNLOCK_SKILL'; payload: { adventurerId: string; skillId: string } }
  | { type: 'RENAME_ADVENTURER'; payload: { adventurerId: string; newName: string } };

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'LOAD_GAME': {
      return { ...action.payload, lastSaveTime: Date.now() };
    }

    case 'IMPORT_SAVE': {
        const imported = action.payload;
        // Ensure new fields exist on imported saves
        if(!imported.materials) imported.materials = {};
        if(imported.adventurers) {
            imported.adventurers = imported.adventurers.map(a => {
                 // Hybrid System Migration
                 if (!a.traitId) {
                     const trait = ADVENTURER_TRAITS[Math.floor(Math.random() * ADVENTURER_TRAITS.length)];
                     a.traitId = trait.id;
                 }
                 if (a.skillPoints === undefined) {
                     // Recalculate skill points based on level
                     a.skillPoints = calculateTotalSkillPoints(a.level);
                 }
                 if (!a.unlockedSkills) {
                     a.unlockedSkills = [];
                 }
                 if (!a.skillTree) {
                     // Generate new tree structure with archetype
                     const { tree, archetype } = generateSkillTree(a.role);
                     a.skillTree = tree;
                     a.archetype = archetype;
                 }
                 // Name/Title Migration
                 if (!a.title) {
                     const titles = TITLES_BY_ROLE[a.role] || ["Mercenary"];
                     a.title = titles[0]; // Default to basic title if migrating
                 }

                 return {
                    ...a,
                    gatheringXp: a.gatheringXp || 0,
                    fishingXp: a.fishingXp || 0
                 };
            });
        }
        return {
            ...initialState,
            ...imported,
            lastSaveTime: Date.now()
        };
    }

    case 'TICK': {
      const now = action.payload.currentTime;
      return { ...state, lastSaveTime: now };
    }

    case 'START_DUNGEON': {
      // Safety Check: Are these adventurers already busy?
      const isBusy = action.payload.adventurerIds.some(id => 
        state.activeRuns.some(r => r.adventurerIds.includes(id))
      );
      if (isBusy) return state;

      const dungeon = DUNGEONS.find(d => d.id === action.payload.dungeonId);
      if (!dungeon) return state;
      
      const duration = calculateDungeonDuration(dungeon.durationSeconds, state, action.payload.adventurerIds) * 1000;
      
      // Calculate Snapshot
      const snapshot = calculateRunSnapshot(action.payload.adventurerIds, state);

      // Create Deep Copy of Adventurers for the Run Snapshot
      const adventurerState: Record<string, Adventurer> = {};
      action.payload.adventurerIds.forEach(id => {
          const adv = state.adventurers.find(a => a.id === id);
          if (adv) {
              adventurerState[id] = JSON.parse(JSON.stringify(adv));
          }
      });

      return {
        ...state,
        lastParties: {
            ...state.lastParties,
            [action.payload.dungeonId]: action.payload.adventurerIds
        },
        activeRuns: [
          ...state.activeRuns,
          {
            id: crypto.randomUUID(),
            dungeonId: dungeon.id,
            adventurerIds: action.payload.adventurerIds,
            startTime: Date.now(),
            duration: duration,
            runsRemaining: 1, 
            totalRuns: 1,     
            autoRepeat: action.payload.autoRepeat,
            snapshot: snapshot,
            adventurerState: adventurerState,
            modifiedSlots: {} // Init empty modifications
          },
        ],
      };
    }

    case 'CANCEL_DUNGEON': {
        return {
            ...state,
            activeRuns: state.activeRuns.filter(r => r.id !== action.payload.runId)
        };
    }

    case 'STOP_REPEAT': {
        return {
            ...state,
            activeRuns: state.activeRuns.map(r => 
                r.id === action.payload.runId 
                    ? { ...r, autoRepeat: false } 
                    : r
            )
        };
    }

    case 'COMPLETE_DUNGEON': {
      const { runId, success, kills } = action.payload;
      
      const run = state.activeRuns.find(r => r.id === runId);
      if (!run) return state;

      const dungeon = DUNGEONS.find(d => d.id === run.dungeonId);
      const enemy = dungeon ? ENEMIES[dungeon.enemyId] : null;
      if (!dungeon || !enemy) return state;

      let newGold = state.gold;
      let newInventory = [...state.inventory];
      let newMaterials = { ...state.materials }; // Copy materials
      let newStats = { ...state.statistics };
      let newAdventurers = [...state.adventurers];
      let goldGain = 0;
      let xpGain = 0;
      let droppedItems: Item[] = [];
      let foundMaterials: Record<string, number> = {};

      // Use Snapshot for Calculations
      const snapshot = run.snapshot || calculateRunSnapshot(run.adventurerIds, state); 
      
      const isCombat = dungeon.type === ContractType.DUNGEON;

      if (success && kills > 0) {
        
        // --- 1. COMBAT REWARDS (GOLD/GEAR/XP) ---
        if (isCombat) {
            let rawGold = 0;
            let rawXp = 0;

            const isOverpowered = snapshot.power > (dungeon.recommendedPower * 3);

            if (isOverpowered) {
                rawGold = kills * enemy.goldMin;
                if (kills > 500) {
                     const avgXp = ((enemy.xpMin + enemy.xpMax) / 2);
                     rawXp = (kills * avgXp) * 0.10;
                } else {
                     for(let i=0; i<kills; i++) {
                         const xpRoll = Math.floor(enemy.xpMin + Math.random() * (enemy.xpMax - enemy.xpMin + 1));
                         rawXp += xpRoll;
                     }
                     rawXp = Math.floor(rawXp * 0.10);
                }
            } else {
                if (kills > 500) {
                    rawGold = kills * ((enemy.goldMin + enemy.goldMax) / 2);
                    rawXp = kills * ((enemy.xpMin + enemy.xpMax) / 2);
                } else {
                    for(let i=0; i<kills; i++) {
                        rawGold += Math.floor(enemy.goldMin + Math.random() * (enemy.goldMax - enemy.goldMin + 1));
                        rawXp += Math.floor(enemy.xpMin + Math.random() * (enemy.xpMax - enemy.xpMin + 1));
                    }
                }
            }
            
            goldGain = Math.floor(rawGold * (1 + snapshot.goldBonus));
            xpGain = Math.floor(rawXp * (1 + snapshot.xpBonus));

            newGold += goldGain;
            newStats.totalGoldEarned += goldGain;
            newStats.dungeonsCleared += 1;
            newStats.monstersKilled += kills;

            // Loot Logic (Gear)
            const baseDropChance = dungeon.dropChance + snapshot.lootBonus;
            const extraRolls = Math.floor(kills / 10);
            const totalRolls = 1 + extraRolls;
            
            // Modifier Rules Check
            const activeModifiers = snapshot.activeModifiers || [];
            const isResourceScavenger = activeModifiers.includes('RESOURCE_SCAVENGER');
            const isGambler = activeModifiers.includes('GAMBLER');

            // Gambler Rule: Extra Rolls
            const adjustedTotalRolls = totalRolls + (isGambler ? 2 : 0);

            for (let i = 0; i < adjustedTotalRolls; i++) {
                 if (Math.random() < baseDropChance) {
                    
                    if (isResourceScavenger) {
                        // RULE: Drop Material Instead of Item
                        const matIds = Object.keys(MATERIALS);
                        const matId = matIds[Math.floor(Math.random() * matIds.length)]; // Generic scavenge
                        const currentQty = newMaterials[matId] || 0;
                        newMaterials[matId] = currentQty + 1;
                        foundMaterials[matId] = (foundMaterials[matId] || 0) + 1;
                    } else {
                        // Standard Item Drop
                        if (newInventory.length < INVENTORY_SIZE) {
                            const newItem = generateItem(dungeon.level, state.prestigeUpgrades);
                            newInventory.push(newItem);
                            droppedItems.push(newItem);

                            // Secondary drop logic (3% chance)
                            if (newInventory.length < INVENTORY_SIZE && Math.random() < 0.03) {
                                const bonusItem = generateItem(dungeon.level, state.prestigeUpgrades);
                                newInventory.push(bonusItem);
                                droppedItems.push(bonusItem);
                            }
                        }
                    }
                 }
            }
        } 
        
        // --- 2. GATHERING / FISHING REWARDS (MATERIALS) ---
        else {
             // Difficulty Calculation based on Power
             const difficultyRatio = snapshot.power / dungeon.recommendedPower;
             let yieldMultiplier = 1.0;
             if (difficultyRatio < 1.0) yieldMultiplier = 0.5; // Low power penalty
             if (difficultyRatio > 3.0) yieldMultiplier = 1.5; // Overpowered bonus (diminishing)
             
             const cycles = Math.max(1, Math.floor(kills / 2)); 
             
             // Material Drops
             if (dungeon.lootTable) {
                 for(let i=0; i<cycles; i++) {
                     if (Math.random() < (dungeon.dropChance * yieldMultiplier)) {
                         const matId = dungeon.lootTable[Math.floor(Math.random() * dungeon.lootTable.length)];
                         const currentQty = newMaterials[matId] || 0;
                         newMaterials[matId] = currentQty + 1;
                         
                         foundMaterials[matId] = (foundMaterials[matId] || 0) + 1;
                     }
                 }
             }

             // Proficiency XP
             const proficiencyXpGain = Math.floor(cycles * (dungeon.level * 2)); // 2xp per cycle * level
             
             run.adventurerIds.forEach(advId => {
                const adventurerIndex = state.adventurers.findIndex(a => a.id === advId);
                if (adventurerIndex > -1) {
                    const adv = { ...newAdventurers[adventurerIndex] };
                    if (dungeon.type === ContractType.GATHERING) {
                        adv.gatheringXp = (adv.gatheringXp || 0) + proficiencyXpGain;
                    } else if (dungeon.type === ContractType.FISHING) {
                        adv.fishingXp = (adv.fishingXp || 0) + proficiencyXpGain;
                    }
                    newAdventurers[adventurerIndex] = adv;
                }
             });
        }

        // Common XP Distribution (Combat XP) - ONLY for Combat Contracts
        if (isCombat) {
            run.adventurerIds.forEach(advId => {
                const adventurerIndex = state.adventurers.findIndex(a => a.id === advId);
                if (adventurerIndex > -1) {
                    const adv = { ...newAdventurers[adventurerIndex] };
                    const oldLevel = adv.level;
                    adv.xp += xpGain;
                    
                    while (adv.xp >= adv.xpToNextLevel) {
                        adv.level += 1;
                        adv.xp -= adv.xpToNextLevel;
                        adv.xpToNextLevel = Math.floor(adv.xpToNextLevel * 1.2);
                        adv.baseStats.damage += 1;
                        adv.baseStats.health += 5;
                    }
                    
                    // Skill Point Award Logic
                    const oldPoints = calculateTotalSkillPoints(oldLevel);
                    const newPoints = calculateTotalSkillPoints(adv.level);
                    const diff = newPoints - oldPoints;
                    
                    if (diff > 0) {
                        adv.skillPoints += diff;
                    }

                    newAdventurers[adventurerIndex] = adv;
                }
            });
        }
      }

      const report: DungeonReport = {
          id: crypto.randomUUID(),
          dungeonName: dungeon.name,
          success: kills > 0,
          kills: kills,
          goldEarned: goldGain,
          xpEarned: xpGain,
          itemsFound: droppedItems,
          materialsFound: foundMaterials,
          timestamp: Date.now()
      };

      // Remove the COMPLETED run
      let nextActiveRuns = state.activeRuns.filter(r => r.id !== runId);
      
      // Auto-Repeat Logic (Using the FRESH run object from state)
      if (run.autoRepeat || run.runsRemaining > 1) {
          // Recalculate snapshot based on NEW state (new gear applied)
          const nextSnapshot = calculateRunSnapshot(run.adventurerIds, { ...state, adventurers: newAdventurers, upgrades: state.upgrades });
          
          // Re-Capture Adventurer State for the NEW run
          const nextAdventurerState: Record<string, Adventurer> = {};
          run.adventurerIds.forEach(id => {
              const adv = newAdventurers.find(a => a.id === id);
              if (adv) {
                  nextAdventurerState[id] = JSON.parse(JSON.stringify(adv));
              }
          });

          const restartedRun: ActiveRun = {
              ...run,
              id: crypto.randomUUID(), 
              runsRemaining: run.autoRepeat ? 1 : run.runsRemaining - 1,
              startTime: Date.now(),
              duration: calculateDungeonDuration(dungeon.durationSeconds, state, run.adventurerIds) * 1000,
              snapshot: nextSnapshot, 
              adventurerState: nextAdventurerState,
              modifiedSlots: {} // Clear modifications for fresh run
          };
          nextActiveRuns = [...nextActiveRuns, restartedRun];
      }

      return {
        ...state,
        gold: newGold,
        inventory: newInventory,
        materials: newMaterials,
        statistics: newStats,
        adventurers: newAdventurers,
        recentReports: [...state.recentReports, report],
        activeRuns: nextActiveRuns,
      };
    }
    
    // ... existing cases ...
    case 'DISMISS_REPORT': {
        return {
            ...state,
            recentReports: state.recentReports.filter(r => r.id !== action.payload.reportId)
        };
    }
    // ... [Rest of file unchanged until default] ...

    case 'EQUIP_ITEM': {
        const { adventurerId, item } = action.payload;
        const advIndex = state.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return state;

        const adv = { ...state.adventurers[advIndex] };
        
        if (item.classRestriction && !item.classRestriction.includes(adv.role)) {
            return state;
        }

        const oldItem = adv.slots[item.type];
        
        adv.slots = { ...adv.slots, [item.type]: item };

        let newInv = state.inventory.filter(i => i.id !== item.id);
        if (oldItem) {
            newInv.push(oldItem);
        }

        const newAdvs = [...state.adventurers];
        newAdvs[advIndex] = adv;
        
        let newActiveRuns = state.activeRuns;
        const activeRunIndex = state.activeRuns.findIndex(r => r.adventurerIds.includes(adventurerId));
        if (activeRunIndex !== -1) {
            newActiveRuns = [...state.activeRuns];
            const run = { ...newActiveRuns[activeRunIndex] };
            const modifiedSlots = run.modifiedSlots ? { ...run.modifiedSlots } : {};
            const advMods = modifiedSlots[adventurerId] ? [...modifiedSlots[adventurerId]] : [];
            if (!advMods.includes(item.type)) advMods.push(item.type);
            modifiedSlots[adventurerId] = advMods;
            run.modifiedSlots = modifiedSlots;
            newActiveRuns[activeRunIndex] = run;
        }

        return { ...state, adventurers: newAdvs, inventory: newInv, activeRuns: newActiveRuns };
    }
    case 'UNEQUIP_ITEM': {
        const { adventurerId, slot } = action.payload;
        const advIndex = state.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return state;
        const adv = { ...state.adventurers[advIndex] };
        const item = adv.slots[slot];
        if (!item || state.inventory.length >= INVENTORY_SIZE) return state;

        adv.slots = { ...adv.slots, [slot]: null };
        const newAdvs = [...state.adventurers];
        newAdvs[advIndex] = adv;

        let newActiveRuns = state.activeRuns;
        const activeRunIndex = state.activeRuns.findIndex(r => r.adventurerIds.includes(adventurerId));
        if (activeRunIndex !== -1) {
             newActiveRuns = [...state.activeRuns];
             const run = { ...newActiveRuns[activeRunIndex] };
             const modifiedSlots = run.modifiedSlots ? { ...run.modifiedSlots } : {};
             const advMods = modifiedSlots[adventurerId] ? [...modifiedSlots[adventurerId]] : [];
             if (!advMods.includes(slot)) advMods.push(slot);
             modifiedSlots[adventurerId] = advMods;
             run.modifiedSlots = modifiedSlots;
             newActiveRuns[activeRunIndex] = run;
        }

        return { ...state, adventurers: newAdvs, inventory: [...state.inventory, item], activeRuns: newActiveRuns };
    }
    case 'SALVAGE_ITEM': {
        const item = state.inventory.find(i => i.id === action.payload.itemId);
        if (!item) return state;
        return { ...state, gold: state.gold + item.value, inventory: state.inventory.filter(i => i.id !== action.payload.itemId) };
    }
    case 'SALVAGE_MANY_ITEMS': {
        const { itemIds } = action.payload;
        const itemsToSalvage = state.inventory.filter(i => itemIds.includes(i.id));
        const totalValue = itemsToSalvage.reduce((sum, i) => sum + i.value, 0);
        return { ...state, gold: state.gold + totalValue, inventory: state.inventory.filter(i => !itemIds.includes(i.id)) };
    }
    case 'BUY_UPGRADE': {
        const { upgradeId, cost } = action.payload;
        if (state.gold < cost) return state;
        return { ...state, gold: state.gold - cost, upgrades: { ...state.upgrades, [upgradeId]: (state.upgrades[upgradeId] || 0) + 1 } };
    }
    case 'RECRUIT_ADVENTURER': {
       if (state.gold < action.payload.cost) return state;
       const newAdv = generateAdventurer(`adv_${Date.now()}`);
       return { ...state, gold: state.gold - action.payload.cost, adventurers: [...state.adventurers, newAdv] };
    }
    case 'PRESTIGE': {
        const currency = action.payload.currencyAwarded;
        return { ...initialState, prestigeCurrency: state.prestigeCurrency + currency, prestigeUpgrades: state.prestigeUpgrades, statistics: { totalGoldEarned: 0, monstersKilled: 0, dungeonsCleared: 0 } };
    }
    case 'BUY_PRESTIGE_UPGRADE': {
        const { upgradeId, cost } = action.payload;
        if (state.prestigeCurrency < cost) return state;
        return { ...state, prestigeCurrency: state.prestigeCurrency - cost, prestigeUpgrades: { ...state.prestigeUpgrades, [upgradeId]: (state.prestigeUpgrades[upgradeId] || 0) + 1 } };
    }
    case 'ENCHANT_ITEM': {
        const { itemId } = action.payload;
        const invIndex = state.inventory.findIndex(i => i.id === itemId);
        let itemToEnchant: Item | null = null;
        let location: 'INVENTORY' | 'EQUIPPED' = 'INVENTORY';
        let advId = '';
        let slot: ItemType | null = null;

        if (invIndex !== -1) { itemToEnchant = { ...state.inventory[invIndex] }; } 
        else {
            for (const adv of state.adventurers) {
                if (adv.slots.Weapon?.id === itemId) { itemToEnchant = { ...adv.slots.Weapon }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.WEAPON; break; }
                if (adv.slots.Armor?.id === itemId) { itemToEnchant = { ...adv.slots.Armor }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.ARMOR; break; }
                if (adv.slots.Trinket?.id === itemId) { itemToEnchant = { ...adv.slots.Trinket }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.TRINKET; break; }
            }
        }
        if (!itemToEnchant) return state;
        const maxStats = MAX_STATS_BY_RARITY[itemToEnchant.rarity];
        if (itemToEnchant.stats.length >= maxStats) return state;
        const cost = calculateItemUpgradeCost(itemToEnchant, 'ENCHANT');
        if (state.gold < cost) return state;

        const existingNames = itemToEnchant.stats.map(s => s.name);
        const newStat = generateRandomAffix(itemToEnchant.level, itemToEnchant.rarity, existingNames);
        itemToEnchant.stats = [...itemToEnchant.stats, newStat];
        itemToEnchant.value = Math.floor(itemToEnchant.value * 1.1);

        if (location === 'INVENTORY') {
            const newInventory = [...state.inventory];
            newInventory[invIndex] = itemToEnchant;
            return { ...state, gold: state.gold - cost, inventory: newInventory };
        } else if (location === 'EQUIPPED' && slot) {
             const advIndex = state.adventurers.findIndex(a => a.id === advId);
             if (advIndex === -1) return state;
             const newAdv = { ...state.adventurers[advIndex] };
             newAdv.slots = { ...newAdv.slots, [slot]: itemToEnchant };
             const newAdvs = [...state.adventurers];
             newAdvs[advIndex] = newAdv;
             return { ...state, gold: state.gold - cost, adventurers: newAdvs };
        }
        return state;
    }
    case 'REROLL_STAT': {
        const { itemId, statIndex } = action.payload;
        const invIndex = state.inventory.findIndex(i => i.id === itemId);
        let itemToReroll: Item | null = null;
        let location: 'INVENTORY' | 'EQUIPPED' = 'INVENTORY';
        let advId = '';
        let slot: ItemType | null = null;

        if (invIndex !== -1) { itemToReroll = { ...state.inventory[invIndex] }; } 
        else {
             for (const adv of state.adventurers) {
                if (adv.slots.Weapon?.id === itemId) { itemToReroll = { ...adv.slots.Weapon }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.WEAPON; break; }
                if (adv.slots.Armor?.id === itemId) { itemToReroll = { ...adv.slots.Armor }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.ARMOR; break; }
                if (adv.slots.Trinket?.id === itemId) { itemToReroll = { ...adv.slots.Trinket }; location = 'EQUIPPED'; advId = adv.id; slot = ItemType.TRINKET; break; }
            }
        }

        if (!itemToReroll) return state;
        if (statIndex < 0 || statIndex >= itemToReroll.stats.length) return state;
        const cost = calculateItemUpgradeCost(itemToReroll, 'REROLL');
        if (state.gold < cost) return state;

        const oldStat = itemToReroll.stats[statIndex];
        const newTier = rollStatTier();
        const tierMultiplier = TIER_MULTIPLIERS[newTier];
        let newStat;

        if (statIndex === 0) {
            const rarityMultiplier = ITEM_RARITY_MULTIPLIERS[itemToReroll.rarity] || 1;
            const baseBudget = 3 * itemToReroll.level * rarityMultiplier;
            const effectiveBudget = baseBudget * tierMultiplier;
            let val = 1;
            if (oldStat.name === 'Damage') {
                const multiplier = itemToReroll.type === ItemType.WEAPON ? 1.0 : 0.5;
                val = Math.max(1, Math.round(effectiveBudget * multiplier));
            } else if (oldStat.name === 'Health') {
                const multiplier = itemToReroll.type === ItemType.ARMOR ? 5.0 : 2.5;
                val = Math.max(5, Math.round(effectiveBudget * multiplier));
            }
            newStat = { ...oldStat, value: val, tier: newTier };
        } else {
            const existingNames = itemToReroll.stats.filter((_, idx) => idx !== statIndex).map(s => s.name);
            newStat = generateRandomAffix(itemToReroll.level, itemToReroll.rarity, existingNames);
        }
        const newStats = [...itemToReroll.stats];
        newStats[statIndex] = newStat;
        itemToReroll.stats = newStats;

        if (location === 'INVENTORY') {
            const newInventory = [...state.inventory];
            newInventory[invIndex] = itemToReroll;
            return { ...state, gold: state.gold - cost, inventory: newInventory };
        } else if (location === 'EQUIPPED' && slot) {
             const advIndex = state.adventurers.findIndex(a => a.id === advId);
             if (advIndex === -1) return state;
             const newAdv = { ...state.adventurers[advIndex] };
             newAdv.slots = { ...newAdv.slots, [slot]: itemToReroll };
             const newAdvs = [...state.adventurers];
             newAdvs[advIndex] = newAdv;
             return { ...state, gold: state.gold - cost, adventurers: newAdvs };
        }
        return state;
    }
    case 'UNLOCK_SKILL': {
        const { adventurerId, skillId } = action.payload;
        const advIndex = state.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return state;

        const adv = { ...state.adventurers[advIndex] };
        const node = adv.skillTree?.find(n => n.id === skillId);
        if (!node) return state;

        const cost = node.cost || 1;
        if (adv.skillPoints < cost) return state;
        if (adv.unlockedSkills.includes(skillId)) return state;

        if (node.exclusiveGroup) {
            const hasExclusiveSibling = adv.unlockedSkills.some(id => {
                const sibling = adv.skillTree?.find(n => n.id === id);
                return sibling && sibling.exclusiveGroup === node.exclusiveGroup;
            });
            if (hasExclusiveSibling) return state;
        }

        adv.skillPoints -= cost;
        adv.unlockedSkills = [...adv.unlockedSkills, skillId];
        const newAdvs = [...state.adventurers];
        newAdvs[advIndex] = adv;

        return { ...state, adventurers: newAdvs };
    }
    case 'RENAME_ADVENTURER': {
        const { adventurerId, newName } = action.payload;
        if (!newName.trim()) return state;
        
        const advIndex = state.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return state;

        const newAdvs = [...state.adventurers];
        newAdvs[advIndex] = { ...newAdvs[advIndex], name: newName.trim() };
        
        return { ...state, adventurers: newAdvs };
    }
    default:
      return state;
  }
};

interface GameContextProps {
  state: GameState;
  startDungeon: (dungeonId: string, adventurerIds: string[], autoRepeat: boolean) => void;
  cancelDungeon: (runId: string) => void;
  stopRepeat: (runId: string) => void;
  dismissReport: (reportId: string) => void;
  equipItem: (adventurerId: string, item: Item) => void;
  unequipItem: (adventurerId: string, slot: ItemType) => void;
  salvageItem: (itemId: string) => void;
  salvageManyItems: (itemIds: string[]) => void;
  buyUpgrade: (upgradeId: string) => void;
  recruitAdventurer: () => void;
  importSave: (jsonString: string) => boolean;
  doPrestige: () => void;
  buyPrestigeUpgrade: (upgradeId: string) => void;
  enchantItem: (itemId: string) => void;
  rerollStat: (itemId: string, statIndex: number) => void;
  unlockSkill: (adventurerId: string, skillId: string) => void;
  renameAdventurer: (adventurerId: string, newName: string) => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Game
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migration logic...
        if (parsed.adventurers) {
            parsed.adventurers = parsed.adventurers.map((adv: any) => {
                if (!adv.role) adv.role = AdventurerRole.WARRIOR;
                if (!adv.rarity) adv.rarity = Rarity.COMMON;
                if (adv.baseStats) {
                    if (adv.baseStats.critChance === undefined) adv.baseStats.critChance = 0.05;
                }
                
                // V9 Migration: Add proficiency XP
                if (adv.gatheringXp === undefined) adv.gatheringXp = 0;
                if (adv.fishingXp === undefined) adv.fishingXp = 0;
                
                // V10 Hybrid System Migration
                if (!adv.traitId) {
                     const trait = ADVENTURER_TRAITS[Math.floor(Math.random() * ADVENTURER_TRAITS.length)];
                     adv.traitId = trait.id;
                }
                if (adv.skillPoints === undefined) {
                     adv.skillPoints = calculateTotalSkillPoints(adv.level || 1);
                }
                if (!adv.unlockedSkills) {
                     adv.unlockedSkills = [];
                }
                // V11: Unique Skill Tree Migration
                if (!adv.skillTree) {
                    const { tree, archetype } = generateSkillTree(adv.role);
                    adv.skillTree = tree;
                    adv.archetype = archetype;
                }
                // V12: Archetype Migration (Update old trees if needed, or simple assign empty archetype name if missing)
                if (!adv.archetype && adv.skillTree) {
                    adv.archetype = "Mercenary"; // Legacy fallback
                }

                // V13: Name/Title Migration
                if (!adv.title) {
                    const titles = TITLES_BY_ROLE[adv.role] || ["Mercenary"];
                    adv.title = titles[0]; // Default to basic title if migrating
                }

                // Patch equipped items for Tiers
                Object.values(ItemType).forEach(type => {
                    const item = adv.slots[type];
                    if (item && item.stats) {
                        item.stats = item.stats.map((s: any) => ({
                            ...s,
                            tier: s.tier || 7 // Default to Tier 7 (Worst) for old items
                        }));
                    }
                });

                return adv;
            });
        }
        
        if (parsed.inventory) {
             parsed.inventory = parsed.inventory.map((item: any) => {
                 if (item.stats) {
                     item.stats = item.stats.map((s: any) => ({
                         ...s,
                         tier: s.tier || 7 // Default to Tier 7 for old items
                     }));
                 }
                 return item;
             });
        }

        if (!parsed.prestigeUpgrades) parsed.prestigeUpgrades = {};
        if (parsed.prestigeCurrency === undefined) parsed.prestigeCurrency = 0;
        
        // V9 Migration: Materials
        if (!parsed.materials) parsed.materials = {};

        delete parsed.offlineSetup;
        delete parsed.offlineReport;

        if (parsed.activeRuns) {
            parsed.activeRuns = parsed.activeRuns.map((run: any) => {
                if (run.adventurerId && !run.adventurerIds) {
                    return { ...run, adventurerIds: [run.adventurerId], adventurerId: undefined };
                }
                if (!run.id) run.id = crypto.randomUUID();
                if (run.autoRepeat === undefined) run.autoRepeat = false;
                if (run.runsRemaining === undefined) {
                    return { ...run, runsRemaining: 1, totalRuns: 1 };
                }
                if (!run.snapshot) {
                }
                if (!run.adventurerState) {
                    run.adventurerState = {};
                }
                if (!run.modifiedSlots) {
                    run.modifiedSlots = {};
                }
                return run;
            });
        }
        
        if (!parsed.lastParties) parsed.lastParties = {};
        if (!parsed.recentReports) parsed.recentReports = [];

        dispatch({ type: 'LOAD_GAME', payload: parsed });
        
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  // Save Loop
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 5000); 
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [state]);

  // Game Loop (Tick)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Check active runs for completion
      state.activeRuns.forEach(run => {
         if (now >= run.startTime + run.duration) {
             const dungeon = DUNGEONS.find(d => d.id === run.dungeonId);
             
             if (dungeon) {
                // CALCULATE RESULTS
                const enemy = ENEMIES[dungeon.enemyId];
                if (enemy) {
                    // Use Snapshot if available (New Logic), fallback to real-time (Old Logic - Migration)
                    const dps = run.snapshot ? run.snapshot.dps : calculatePartyDps(run.adventurerIds, state);
                    const totalDamage = dps * (run.duration / 1000);
                    
                    let kills = Math.floor(totalDamage / enemy.hp);

                    // Fix for Gathering/Fishing: Ensure at least 1 "kill" (cycle) if time completed, 
                    // regardless of damage output vs HP threshold.
                    // BUT introduce a small flat failure chance (5%) for flavor.
                    if (dungeon.type !== ContractType.DUNGEON) {
                        if (Math.random() < 0.05) {
                            kills = 0; // Bad luck!
                        } else {
                            kills = Math.max(1, kills);
                        }
                    }

                    const success = kills > 0;

                    // Pass ID instead of object reference
                    dispatch({ type: 'COMPLETE_DUNGEON', payload: { runId: run.id, success, kills }});
                }
             }
         }
      });

      dispatch({ type: 'TICK', payload: { currentTime: now } });
    }, 200); 

    return () => clearInterval(interval);
  }, [state.activeRuns, state.adventurers, state.upgrades, state.prestigeUpgrades]);

  const startDungeon = useCallback((dungeonId: string, adventurerIds: string[], autoRepeat: boolean) => {
    dispatch({ type: 'START_DUNGEON', payload: { dungeonId, adventurerIds, autoRepeat } });
  }, []);

  const cancelDungeon = useCallback((runId: string) => {
      dispatch({ type: 'CANCEL_DUNGEON', payload: { runId } });
  }, []);

  const stopRepeat = useCallback((runId: string) => {
      dispatch({ type: 'STOP_REPEAT', payload: { runId } });
  }, []);
  
  const dismissReport = useCallback((reportId: string) => {
    dispatch({ type: 'DISMISS_REPORT', payload: { reportId } });
  }, []);

  const equipItem = useCallback((adventurerId: string, item: Item) => {
    dispatch({ type: 'EQUIP_ITEM', payload: { adventurerId, item } });
  }, []);

  const unequipItem = useCallback((adventurerId: string, slot: ItemType) => {
    dispatch({ type: 'UNEQUIP_ITEM', payload: { adventurerId, slot } });
  }, []);

  const salvageItem = useCallback((itemId: string) => {
    dispatch({ type: 'SALVAGE_ITEM', payload: { itemId } });
  }, []);

  const salvageManyItems = useCallback((itemIds: string[]) => {
    dispatch({ type: 'SALVAGE_MANY_ITEMS', payload: { itemIds } });
  }, []);

  const buyUpgrade = (upgradeId: string) => {
      const upg = UPGRADES.find(u => u.id === upgradeId);
      if(!upg) return;
      const currentLevel = state.upgrades[upgradeId] || 0;
      const cost = Math.floor(upg.cost * Math.pow(upg.costMultiplier, currentLevel));
      dispatch({ type: 'BUY_UPGRADE', payload: { upgradeId, cost }});
  };

  const recruitAdventurer = () => {
      const count = state.adventurers.length;
      const cost = 100 * Math.pow(5, count - 1);
      dispatch({ type: 'RECRUIT_ADVENTURER', payload: { cost }});
  };

  const importSave = (jsonString: string): boolean => {
      try {
          const parsed = JSON.parse(jsonString);
          if (typeof parsed.gold !== 'number' || !Array.isArray(parsed.adventurers)) {
              return false;
          }
          dispatch({ type: 'IMPORT_SAVE', payload: parsed });
          return true;
      } catch (e) {
          console.error("Invalid save string", e);
          return false;
      }
  };

  const doPrestige = useCallback(() => {
      const currency = calculatePrestigeGain(state.statistics.totalGoldEarned);
      dispatch({ type: 'PRESTIGE', payload: { currencyAwarded: currency }});
  }, [state.statistics.totalGoldEarned]);

  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
      const upg = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
      if(!upg) return;
      const currentLevel = state.prestigeUpgrades[upgradeId] || 0;
      const cost = Math.floor(upg.cost * Math.pow(upg.costMultiplier, currentLevel));
      dispatch({ type: 'BUY_PRESTIGE_UPGRADE', payload: { upgradeId, cost }});
  }, [state.prestigeUpgrades, state.prestigeCurrency]);

  const enchantItem = useCallback((itemId: string) => {
      dispatch({ type: 'ENCHANT_ITEM', payload: { itemId } });
  }, []);

  const rerollStat = useCallback((itemId: string, statIndex: number) => {
      dispatch({ type: 'REROLL_STAT', payload: { itemId, statIndex } });
  }, []);

  const unlockSkill = useCallback((adventurerId: string, skillId: string) => {
      dispatch({ type: 'UNLOCK_SKILL', payload: { adventurerId, skillId } });
  }, []);

  const renameAdventurer = useCallback((adventurerId: string, newName: string) => {
      dispatch({ type: 'RENAME_ADVENTURER', payload: { adventurerId, newName } });
  }, []);

  return (
    <GameContext.Provider value={{ state, startDungeon, cancelDungeon, stopRepeat, dismissReport, equipItem, unequipItem, salvageItem, salvageManyItems, buyUpgrade, recruitAdventurer, importSave, doPrestige, buyPrestigeUpgrade, enchantItem, rerollStat, unlockSkill, renameAdventurer }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
