
import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import { GameState, Item, Adventurer, Dungeon, ActiveRun, ItemType, DungeonReport, AdventurerRole, Rarity } from '../types';
import { DUNGEONS, INITIAL_GOLD, UPGRADES, INVENTORY_SIZE, ROLE_CONFIG, ENEMIES, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, ENCHANT_COST_BASE, REROLL_COST_BASE, ADVENTURER_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../constants';
import { calculateAdventurerPower, calculateDungeonDuration, generateItem, generateAdventurer, calculatePartyDps, calculatePartyStat, calculatePrestigeGain, generateRandomAffix, rollStatTier, ITEM_RARITY_MULTIPLIERS, calculateItemUpgradeCost } from '../utils/gameMath';

const STORAGE_KEY = 'idle_dungeon_contractor_save_v1';

// Initial State
const initialAdventurer = generateAdventurer('adv_1', 'Rookie');
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
  | { type: 'REROLL_STAT'; payload: { itemId: string; statIndex: number } };

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'LOAD_GAME': {
      return { ...action.payload, lastSaveTime: Date.now() };
    }

    case 'IMPORT_SAVE': {
        const imported = action.payload;
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
      
      const duration = calculateDungeonDuration(dungeon.durationSeconds, state) * 1000;
      
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
            autoRepeat: action.payload.autoRepeat
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
      
      // CRITICAL FIX: Find the run in the CURRENT state. 
      // Do not trust the 'run' object passed from useEffect, as it may be stale or modified (e.g. by Stop Repeat).
      const run = state.activeRuns.find(r => r.id === runId);
      
      // If run doesn't exist, it was probably cancelled or already completed.
      if (!run) return state;

      const dungeon = DUNGEONS.find(d => d.id === run.dungeonId);
      const enemy = dungeon ? ENEMIES[dungeon.enemyId] : null;
      if (!dungeon || !enemy) return state;

      let newGold = state.gold;
      let newInventory = [...state.inventory];
      let newStats = { ...state.statistics };
      let newAdventurers = [...state.adventurers];
      let goldGain = 0;
      let xpGain = 0;
      let droppedItems: Item[] = [];

      if (success && kills > 0) {
        let rawGold = 0;
        let rawXp = 0;

        const partyPower = run.adventurerIds.reduce((sum, id) => {
             const adv = state.adventurers.find(a => a.id === id);
             return sum + (adv ? calculateAdventurerPower(adv, state) : 0);
        }, 0);
        const isOverpowered = partyPower > (dungeon.recommendedPower * 3);

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
        
        // --- BONUS CALCULATIONS ---
        const ecoLevel = state.upgrades['marketplace_connections'] || 0;
        const ecoBonus = UPGRADES.find(u => u.id === 'marketplace_connections')?.effect(ecoLevel) || 0;
        const legacyLevel = state.prestigeUpgrades['legacy_wealth'] || 0;
        const legacyBonus = PRESTIGE_UPGRADES.find(u => u.id === 'legacy_wealth')?.effect(legacyLevel) || 0;
        const itemGoldBonus = calculatePartyStat(run.adventurerIds, state, 'Gold Gain') / 100;
        
        goldGain = Math.floor(rawGold * (1 + ecoBonus + legacyBonus + itemGoldBonus));

        const renownLevel = state.prestigeUpgrades['renowned_guild'] || 0;
        const renownBonus = PRESTIGE_UPGRADES.find(u => u.id === 'renowned_guild')?.effect(renownLevel) || 0;
        xpGain = Math.floor(rawXp * (1 + renownBonus));

        newGold += goldGain;
        newStats.totalGoldEarned += goldGain;
        newStats.dungeonsCleared += 1;
        newStats.monstersKilled += kills;

        // Loot Logic: 
        const lootLevel = state.upgrades['loot_logic'] || 0;
        const lootBonus = UPGRADES.find(u => u.id === 'loot_logic')?.effect(lootLevel) || 0;
        const itemLootBonus = calculatePartyStat(run.adventurerIds, state, 'Loot Luck') / 100;

        const baseDropChance = dungeon.dropChance + lootBonus + itemLootBonus;
        
        const extraRolls = Math.floor(kills / 10);
        const totalRolls = 1 + extraRolls;

        for (let i = 0; i < totalRolls; i++) {
             if (Math.random() < baseDropChance) {
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

        // XP Distribution
        run.adventurerIds.forEach(advId => {
            const adventurerIndex = state.adventurers.findIndex(a => a.id === advId);
            if (adventurerIndex > -1) {
                const adv = { ...newAdventurers[adventurerIndex] };
                adv.xp += xpGain;
                
                while (adv.xp >= adv.xpToNextLevel) {
                    adv.level += 1;
                    adv.xp -= adv.xpToNextLevel;
                    adv.xpToNextLevel = Math.floor(adv.xpToNextLevel * 1.2);
                    adv.baseStats.damage += 1;
                    adv.baseStats.health += 5;
                }
                newAdventurers[adventurerIndex] = adv;
            }
        });
      }

      const report: DungeonReport = {
          id: crypto.randomUUID(),
          dungeonName: dungeon.name,
          success: kills > 0,
          kills: kills,
          goldEarned: goldGain,
          xpEarned: xpGain,
          itemsFound: droppedItems,
          timestamp: Date.now()
      };

      // Remove the COMPLETED run
      let nextActiveRuns = state.activeRuns.filter(r => r.id !== runId);
      
      // Auto-Repeat Logic (Using the FRESH run object from state)
      if (run.autoRepeat || run.runsRemaining > 1) {
          const restartedRun: ActiveRun = {
              ...run,
              id: crypto.randomUUID(), 
              runsRemaining: run.autoRepeat ? 1 : run.runsRemaining - 1,
              startTime: Date.now(),
              duration: calculateDungeonDuration(dungeon.durationSeconds, state) * 1000
          };
          nextActiveRuns = [...nextActiveRuns, restartedRun];
      }

      return {
        ...state,
        gold: newGold,
        inventory: newInventory,
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

    case 'EQUIP_ITEM': {
        const { adventurerId, item } = action.payload;
        const advIndex = state.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return state;

        const adv = { ...state.adventurers[advIndex] };
        
        // CHECK RESTRICTIONS
        if (item.classRestriction && !item.classRestriction.includes(adv.role)) {
            // Should technically be prevented by UI, but safety check here
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

        return {
            ...state,
            adventurers: newAdvs,
            inventory: newInv,
        };
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

        return {
            ...state,
            adventurers: newAdvs,
            inventory: [...state.inventory, item]
        };
    }

    case 'SALVAGE_ITEM': {
        const item = state.inventory.find(i => i.id === action.payload.itemId);
        if (!item) return state;

        return {
            ...state,
            gold: state.gold + item.value,
            inventory: state.inventory.filter(i => i.id !== action.payload.itemId)
        };
    }

    case 'SALVAGE_MANY_ITEMS': {
        const { itemIds } = action.payload;
        const itemsToSalvage = state.inventory.filter(i => itemIds.includes(i.id));
        const totalValue = itemsToSalvage.reduce((sum, i) => sum + i.value, 0);

        return {
            ...state,
            gold: state.gold + totalValue,
            inventory: state.inventory.filter(i => !itemIds.includes(i.id))
        };
    }

    case 'BUY_UPGRADE': {
        const { upgradeId, cost } = action.payload;
        if (state.gold < cost) return state;

        return {
            ...state,
            gold: state.gold - cost,
            upgrades: {
                ...state.upgrades,
                [upgradeId]: (state.upgrades[upgradeId] || 0) + 1
            }
        };
    }
    
    case 'RECRUIT_ADVENTURER': {
       if (state.gold < action.payload.cost) return state;
       
       const newAdv = generateAdventurer(
           `adv_${Date.now()}`, 
           `Mercenary ${state.adventurers.length + 1}`
       );

       return {
         ...state,
         gold: state.gold - action.payload.cost,
         adventurers: [...state.adventurers, newAdv]
       };
    }

    case 'PRESTIGE': {
        const currency = action.payload.currencyAwarded;
        
        // Reset everything except prestigeCurrency and prestigeUpgrades
        return {
            ...initialState,
            prestigeCurrency: state.prestigeCurrency + currency,
            prestigeUpgrades: state.prestigeUpgrades,
            statistics: {
                totalGoldEarned: 0,
                monstersKilled: 0,
                dungeonsCleared: 0
            }
        };
    }

    case 'BUY_PRESTIGE_UPGRADE': {
        const { upgradeId, cost } = action.payload;
        if (state.prestigeCurrency < cost) return state;

        return {
            ...state,
            prestigeCurrency: state.prestigeCurrency - cost,
            prestigeUpgrades: {
                ...state.prestigeUpgrades,
                [upgradeId]: (state.prestigeUpgrades[upgradeId] || 0) + 1
            }
        };
    }

    case 'ENCHANT_ITEM': {
        const { itemId } = action.payload;
        
        // 1. Find Item
        const invIndex = state.inventory.findIndex(i => i.id === itemId);
        let itemToEnchant: Item | null = null;
        let location: 'INVENTORY' | 'EQUIPPED' = 'INVENTORY';
        let advId = '';
        let slot: ItemType | null = null;

        if (invIndex !== -1) {
            itemToEnchant = { ...state.inventory[invIndex] };
        } else {
            for (const adv of state.adventurers) {
                if (adv.slots.Weapon?.id === itemId) {
                    itemToEnchant = { ...adv.slots.Weapon };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.WEAPON;
                    break;
                }
                if (adv.slots.Armor?.id === itemId) {
                    itemToEnchant = { ...adv.slots.Armor };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.ARMOR;
                    break;
                }
                if (adv.slots.Trinket?.id === itemId) {
                    itemToEnchant = { ...adv.slots.Trinket };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.TRINKET;
                    break;
                }
            }
        }

        if (!itemToEnchant) return state;

        // 2. Validate Constraints
        const maxStats = MAX_STATS_BY_RARITY[itemToEnchant.rarity];
        if (itemToEnchant.stats.length >= maxStats) return state;

        // 3. Calculate Cost (Centralized Logic)
        const cost = calculateItemUpgradeCost(itemToEnchant, 'ENCHANT');
        if (state.gold < cost) return state;

        // 4. Perform Action
        const existingNames = itemToEnchant.stats.map(s => s.name);
        const newStat = generateRandomAffix(itemToEnchant.level, itemToEnchant.rarity, existingNames);
        itemToEnchant.stats = [...itemToEnchant.stats, newStat];
        itemToEnchant.value = Math.floor(itemToEnchant.value * 1.1);

        if (location === 'INVENTORY') {
            const newInventory = [...state.inventory];
            newInventory[invIndex] = itemToEnchant;
            return {
                ...state,
                gold: state.gold - cost,
                inventory: newInventory
            };
        } else if (location === 'EQUIPPED' && slot) {
             const advIndex = state.adventurers.findIndex(a => a.id === advId);
             if (advIndex === -1) return state;

             const newAdv = { ...state.adventurers[advIndex] };
             newAdv.slots = { ...newAdv.slots, [slot]: itemToEnchant };
             
             const newAdvs = [...state.adventurers];
             newAdvs[advIndex] = newAdv;
             
             return {
                 ...state,
                 gold: state.gold - cost,
                 adventurers: newAdvs
             };
        }
        
        return state;
    }

    case 'REROLL_STAT': {
        const { itemId, statIndex } = action.payload;
        
        // 1. Find Item
        const invIndex = state.inventory.findIndex(i => i.id === itemId);
        let itemToReroll: Item | null = null;
        let location: 'INVENTORY' | 'EQUIPPED' = 'INVENTORY';
        let advId = '';
        let slot: ItemType | null = null;

        if (invIndex !== -1) {
            itemToReroll = { ...state.inventory[invIndex] };
        } else {
             for (const adv of state.adventurers) {
                if (adv.slots.Weapon?.id === itemId) {
                    itemToReroll = { ...adv.slots.Weapon };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.WEAPON;
                    break;
                }
                if (adv.slots.Armor?.id === itemId) {
                    itemToReroll = { ...adv.slots.Armor };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.ARMOR;
                    break;
                }
                if (adv.slots.Trinket?.id === itemId) {
                    itemToReroll = { ...adv.slots.Trinket };
                    location = 'EQUIPPED';
                    advId = adv.id;
                    slot = ItemType.TRINKET;
                    break;
                }
            }
        }

        if (!itemToReroll) return state;
        if (statIndex < 0 || statIndex >= itemToReroll.stats.length) return state;

        // 2. Calculate Cost (Centralized Logic)
        const cost = calculateItemUpgradeCost(itemToReroll, 'REROLL');
        if (state.gold < cost) return state;

        // 3. Perform Reroll Logic
        const oldStat = itemToReroll.stats[statIndex];
        const newTier = rollStatTier();
        const tierMultiplier = TIER_MULTIPLIERS[newTier];
        let newStat;

        if (statIndex === 0) {
            // Main Stat Reroll
            // Formula: baseBudget * TierMult
            const rarityMultiplier = ITEM_RARITY_MULTIPLIERS[itemToReroll.rarity] || 1;
            const baseBudget = 3 * itemToReroll.level * rarityMultiplier; // Matches getStatBudget without crafter bonus for rerolls (simple)
            const effectiveBudget = baseBudget * tierMultiplier;
            
            let val = 1;
            // Matches generateItem multipliers
            if (oldStat.name === 'Damage') {
                const multiplier = itemToReroll.type === ItemType.WEAPON ? 1.0 : 0.5; // Weapon vs Trinket
                val = Math.max(1, Math.round(effectiveBudget * multiplier));
            } else if (oldStat.name === 'Health') {
                const multiplier = itemToReroll.type === ItemType.ARMOR ? 5.0 : 2.5; // Armor vs Trinket
                val = Math.max(5, Math.round(effectiveBudget * multiplier));
            }
            
            newStat = { ...oldStat, value: val, tier: newTier };
        } else {
            // Affix Reroll
            const existingNames = itemToReroll.stats.filter((_, idx) => idx !== statIndex).map(s => s.name);
            newStat = generateRandomAffix(itemToReroll.level, itemToReroll.rarity, existingNames);
        }

        const newStats = [...itemToReroll.stats];
        newStats[statIndex] = newStat;
        itemToReroll.stats = newStats;

        if (location === 'INVENTORY') {
            const newInventory = [...state.inventory];
            newInventory[invIndex] = itemToReroll;
            return {
                ...state,
                gold: state.gold - cost,
                inventory: newInventory
            };
        } else if (location === 'EQUIPPED' && slot) {
             const advIndex = state.adventurers.findIndex(a => a.id === advId);
             if (advIndex === -1) return state;

             const newAdv = { ...state.adventurers[advIndex] };
             newAdv.slots = { ...newAdv.slots, [slot]: itemToReroll };
             
             const newAdvs = [...state.adventurers];
             newAdvs[advIndex] = newAdv;
             
             return {
                 ...state,
                 gold: state.gold - cost,
                 adventurers: newAdvs
             };
        }

        return state;
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

        // Clean up offline props if they exist in save
        delete parsed.offlineSetup;
        delete parsed.offlineReport;

        // V5 logic...
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
                    const partyDps = calculatePartyDps(run.adventurerIds, state);
                    const totalDamage = partyDps * (run.duration / 1000);
                    const kills = Math.floor(totalDamage / enemy.hp);
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

  return (
    <GameContext.Provider value={{ state, startDungeon, cancelDungeon, stopRepeat, dismissReport, equipItem, unequipItem, salvageItem, salvageManyItems, buyUpgrade, recruitAdventurer, importSave, doPrestige, buyPrestigeUpgrade, enchantItem, rerollStat }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
