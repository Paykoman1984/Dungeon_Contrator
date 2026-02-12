
import { Adventurer, Item, ItemType, Rarity, ItemStat, GameState, AdventurerRole, WeaponType, RunSnapshot, SkillNode, Dungeon, Trait, TraitType, RealmState, DungeonReport, ContractType } from '../types';
import { UPGRADES, CLASS_SKILLS, ROLE_CONFIG, ADVENTURER_RARITY_MULTIPLIERS, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, TIER_WEIGHTS, TIER_MULTIPLIERS, CRAFTING_RARITY_MULTIPLIERS, ENCHANT_COST_BASE, REROLL_COST_BASE, STAT_POOLS, CAPSTONE_POOL, getRandomFromPool, ADVENTURER_NAMES, TITLES_BY_ROLE, BASE_DROP_CHANCE, MAX_DROP_CHANCE, BASE_RARITY_WEIGHTS, RARITY_CONFIG, TRAIT_POOL, REALM_CONFIG, REALM_MODIFIERS, XP_CURVE_CONFIG, MASTERY_BONUSES } from '../constants';

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return Math.floor(num).toString();
};

export const areItemsEqual = (itemA: Item | null, itemB: Item | null): boolean => {
    if (itemA === null && itemB === null) return true;
    if (itemA === null || itemB === null) return false;
    // Strict comparison of ID and Stats structure
    return itemA.id === itemB.id && JSON.stringify(itemA.stats) === JSON.stringify(itemB.stats);
};

// Helper to calculate total skill points available based on level
export const calculateTotalSkillPoints = (level: number): number => {
    if (level < 5) return 0;
    // Unlock at 5 (1 point), then 1 point every 3 levels (8, 11, 14, 17, 20...)
    return 1 + Math.floor((level - 5) / 3);
};

// --- REALM CALCULATIONS ---

export const calculateRealmXpRequired = (rank: number): number => {
    return Math.floor(REALM_CONFIG.baseXp * Math.pow(rank, REALM_CONFIG.scalingFactor));
};

export const getRealmBonuses = (realm: RealmState, dungeonId?: string) => {
    const rank = realm.realmRank;
    
    // Base Realm Effects
    let enemyMult = 1 + (rank * REALM_CONFIG.baseEnemyScaling);
    let lootRolls = rank * REALM_CONFIG.baseLootQuantity;
    let rarityShift = rank * REALM_CONFIG.baseRarityShift;
    let lootYieldMult = 1.0;

    // Apply Active Modifiers if dungeon provided
    if (dungeonId && realm.activeModifiers[dungeonId]) {
        realm.activeModifiers[dungeonId].forEach(modId => {
            const mod = REALM_MODIFIERS.find(m => m.id === modId);
            if (mod) {
                enemyMult *= mod.enemyPowerMult;
                lootYieldMult *= mod.lootYieldMult;
                rarityShift += mod.rarityShiftBonus;
            }
        });
    }

    return {
        enemyPowerMultiplier: enemyMult,
        additionalDropRollChance: lootRolls,
        globalRarityShift: rarityShift,
        lootYieldMultiplier: lootYieldMult
    };
};

export const calculateMasteryBonus = (state: GameState, type: 'COMBAT' | 'GATHERING' | 'FISHING') => {
    const mastery = state.guildMastery;
    if (!mastery) return { power: 1, efficiency: 1, yield: 1, rareChance: 0 };

    if (type === 'COMBAT') {
        const lvl = mastery.combat.level;
        return {
            power: 1 + (lvl * MASTERY_BONUSES.combat.powerPerLevel),
            damage: 1 + (lvl * MASTERY_BONUSES.combat.damagePerLevel),
            efficiency: 1,
            yield: 1,
            rareChance: 0
        };
    } else if (type === 'GATHERING') {
        const lvl = mastery.gathering.level;
        return {
            power: 1,
            efficiency: 1 + (lvl * MASTERY_BONUSES.gathering.efficiencyPerLevel),
            yield: 1 + (lvl * MASTERY_BONUSES.gathering.yieldPerLevel),
            rareChance: 0
        }
    } else {
        const lvl = mastery.fishing.level;
        return {
            power: 1,
            efficiency: 1 + (lvl * MASTERY_BONUSES.fishing.speedPerLevel),
            yield: 1,
            rareChance: lvl * MASTERY_BONUSES.fishing.rareChancePerLevel
        }
    }
};

export const calculateEffectiveDungeonStats = (dungeon: Dungeon, realm: RealmState, gameState?: GameState) => {
    const bonuses = getRealmBonuses(realm, dungeon.id);
    let lootMult = bonuses.lootYieldMultiplier;

    // Apply Mastery if GameState is provided
    if (gameState) {
        if (dungeon.type === ContractType.GATHERING) {
            const m = calculateMasteryBonus(gameState, 'GATHERING');
            lootMult *= m.yield;
        } else if (dungeon.type === ContractType.FISHING) {
            // Fishing mastery affects rare chance primarily, but let's assume basic yield too
            const m = calculateMasteryBonus(gameState, 'FISHING');
            // Fishing yield logic is slightly different, usually 1 fish per catch
        }
    }
    
    return {
        recommendedPower: Math.floor(dungeon.recommendedPower * bonuses.enemyPowerMultiplier),
        dropChance: dungeon.dropChance, // Base chance remains, extra rolls handled separately
        lootMultiplier: lootMult
    };
};

// --- XP & LEVELING ---

export const calculateXpRequired = (level: number, type: 'ADVENTURER' | 'MASTERY'): number => {
    const config = type === 'ADVENTURER' ? XP_CURVE_CONFIG.adventurer : XP_CURVE_CONFIG.mastery;
    return Math.floor(config.base * Math.pow(level, config.exponent));
};

export const processXpGain = (currentLevel: number, currentXp: number, amount: number, type: 'ADVENTURER' | 'MASTERY') => {
    let newXp = currentXp + amount;
    let newLevel = currentLevel;
    let levelsGained = 0;
    
    let required = calculateXpRequired(newLevel, type);
    
    while (newXp >= required) {
        newXp -= required;
        newLevel++;
        levelsGained++;
        required = calculateXpRequired(newLevel, type);
    }
    
    return { newLevel, newXp, levelsGained, nextRequired: required };
};

// --- TRAIT GENERATION ---
export const generateTraits = (count: number = 3): Trait[] => {
    const traits: Trait[] = [];
    // Filter pools
    const common = TRAIT_POOL.filter(t => t.rarity === 'Common');
    const rare = TRAIT_POOL.filter(t => t.rarity === 'Rare');
    const epic = TRAIT_POOL.filter(t => t.rarity === 'Epic');

    for (let i = 0; i < count; i++) {
        const roll = Math.random();
        let pool = common;
        if (roll > 0.95) pool = epic;
        else if (roll > 0.70) pool = rare;

        const template = pool[Math.floor(Math.random() * pool.length)];
        
        // Ensure uniqueness per adventurer
        if (traits.some(t => t.name === template.name)) {
            i--; // Retry
            continue;
        }

        traits.push({
            id: crypto.randomUUID(),
            ...template
        });
    }
    return traits;
};

// --- PROCEDURAL TINY TREE GENERATION ---
export const generateSkillTree = (role: AdventurerRole): { tree: SkillNode[], archetype: string } => {
    const pools = STAT_POOLS[role];
    const capstones = CAPSTONE_POOL[role];
    
    // Helper to get nodes, allowing some randomness in pool selection for variety
    const getRoot = () => getRandomFromPool(Math.random() > 0.3 ? pools.root : pools.offense); 
    // Force some utility/gathering into the mix
    const getSide = () => getRandomFromPool(Math.random() > 0.5 ? pools.offense : pools.defense);
    const getExtension = () => getRandomFromPool(Math.random() > 0.5 ? pools.hybrid : pools.root);
    const getCap = () => getRandomFromPool(capstones);

    const rootTmpl = getRoot();
    const l1Tmpl = getSide();
    const r1Tmpl = getSide();
    const l2Tmpl = getExtension();
    const r2Tmpl = getExtension();
    const capTmpl = getCap();

    // Build the specific tree
    const tree: SkillNode[] = [
        // 1. Root
        { ...rootTmpl, id: 'root', x: 50, y: 90, requires: [], maxLevel: 1, cost: 1 },
        // 2. Tier 2 (Split) - MUTUALLY EXCLUSIVE
        { ...l1Tmpl, id: 't2_l', x: 30, y: 70, requires: ['root'], maxLevel: 1, cost: 1, exclusiveGroup: 'tier2' },
        { ...r1Tmpl, id: 't2_r', x: 70, y: 70, requires: ['root'], maxLevel: 1, cost: 1, exclusiveGroup: 'tier2' },
        // 3. Tier 3 (Extension)
        { ...l2Tmpl, id: 't3_l', x: 20, y: 45, requires: ['t2_l'], maxLevel: 1, cost: 2 },
        { ...r2Tmpl, id: 't3_r', x: 80, y: 45, requires: ['t2_r'], maxLevel: 1, cost: 2 },
        // 4. Capstone 
        { ...capTmpl, id: 'cap', x: 50, y: 20, requires: ['t3_l', 't3_r'], maxLevel: 1, cost: 3 }
    ];

    return { tree, archetype: capTmpl.name }; 
};

// Determine "Class" Label based on Traits
const analyzeSpecialization = (role: AdventurerRole, traits: Trait[]): string => {
    let combatScore = 0;
    let gatherScore = 0;
    let fishScore = 0;

    traits.forEach(t => {
        if (t.type === 'COMBAT') combatScore++;
        if (t.type === 'GATHERING') gatherScore++;
        if (t.type === 'FISHING') fishScore++;
        if (t.type === 'HYBRID') { combatScore+=0.5; gatherScore+=0.5; }
    });

    if (gatherScore >= 2) return `${role} Scavenger`;
    if (fishScore >= 2) return `${role} Angler`;
    if (combatScore >= 3) return `Battle ${role}`;
    if (gatherScore > 0 && fishScore > 0) return `Survivalist ${role}`;
    
    // Default Role Titles
    if (role === AdventurerRole.WARRIOR) return "Vanguard";
    if (role === AdventurerRole.ROGUE) return "Operative";
    return "Arcanist";
};

// Factory Function
export const generateCandidate = (fixedRole?: AdventurerRole): Adventurer => {
    const roles = Object.values(AdventurerRole);
    const role = fixedRole || roles[Math.floor(Math.random() * roles.length)];
    const config = ROLE_CONFIG[role];

    const rand = Math.random();
    let rarity = Rarity.COMMON;
    if (rand > 0.98) rarity = Rarity.LEGENDARY;
    else if (rand > 0.90) rarity = Rarity.EPIC;
    else if (rand > 0.75) rarity = Rarity.RARE;
    else if (rand > 0.50) rarity = Rarity.UNCOMMON;

    const multiplier = ADVENTURER_RARITY_MULTIPLIERS[rarity];

    // Generate 3 Traits
    const traits = generateTraits(3);
    
    // Generate Tree
    const { tree, archetype } = generateSkillTree(role);

    // Calculate Specialization Label
    const specialization = analyzeSpecialization(role, traits);

    // Name & Title Generation
    const name = ADVENTURER_NAMES[Math.floor(Math.random() * ADVENTURER_NAMES.length)];
    
    // Determine title index based on rarity
    const titleOptions = TITLES_BY_ROLE[role];
    let titleIndex = 0;
    if (rarity === Rarity.LEGENDARY) titleIndex = Math.floor(Math.random() * 2) + 8; 
    else if (rarity === Rarity.EPIC) titleIndex = Math.floor(Math.random() * 2) + 6;
    else if (rarity === Rarity.RARE) titleIndex = Math.floor(Math.random() * 2) + 4;
    else if (rarity === Rarity.UNCOMMON) titleIndex = Math.floor(Math.random() * 2) + 2;
    else titleIndex = Math.floor(Math.random() * 2);
    
    titleIndex = Math.max(0, Math.min(titleIndex, titleOptions.length - 1));
    const title = titleOptions[titleIndex];

    const initialXpReq = calculateXpRequired(1, 'ADVENTURER');

    return {
        id: crypto.randomUUID(),
        name,
        title,
        role,
        rarity,
        level: 1, // Combat Level
        xp: 0,
        xpToNextLevel: initialXpReq,
        gatheringLevel: 1,
        gatheringXp: 0,
        fishingLevel: 1,
        fishingXp: 0,
        traits: traits,
        traitId: 'legacy', // Deprecated but kept for type safety
        specialization,
        skillPoints: 0,
        unlockedSkills: [],
        skillTree: tree, 
        archetype: archetype,
        slots: { [ItemType.WEAPON]: null, [ItemType.ARMOR]: null, [ItemType.TRINKET]: null },
        baseStats: {
            damage: Math.ceil(config.baseDmg * multiplier),
            health: Math.ceil(config.baseHp * multiplier),
            speed: parseFloat((config.baseSpeed * (1 + (multiplier - 1) * 0.1)).toFixed(2)),
            critChance: parseFloat((config.baseCrit * multiplier).toFixed(2))
        }
    };
};

// Helper to get active modifiers for a list of adventurers
export const getActiveModifiers = (adventurerIds: string[], state: GameState): string[] => {
    const modifiers: string[] = [];
    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv && adv.unlockedSkills) {
             adv.unlockedSkills.forEach(skillId => {
                 const node = adv.skillTree?.find(n => n.id === skillId);
                 if (node?.modifier && node.modifier !== 'NONE') modifiers.push(node.modifier);
             });
        }
    });
    return modifiers;
};

// --- ASCENSION BONUSES ---
export const getAscensionBonuses = (ascensionCount: number) => {
    return {
        powerGrowth: ascensionCount * 0.10, // +10% power per ascension
        goldGain: ascensionCount * 0.20, // +20% gold per ascension
        rarityShift: ascensionCount * 0.5, // +0.5 shift points per ascension
        durationReduction: Math.min(0.5, ascensionCount * 0.05) // -5% duration per ascension (cap 50%)
    };
};

interface EffectiveStats {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
    // Helper fields for calculation only
    goldGain: number;
    xpGain: number;
    lootLuck: number;
}

export const getAdventurerStats = (adventurer: Adventurer, state: GameState): EffectiveStats => {
    let stats: EffectiveStats = { 
        ...adventurer.baseStats,
        goldGain: 0,
        xpGain: 0,
        lootLuck: 0
    };

    // 1. Global Upgrades
    const trainingLevel = state.upgrades['recruit_training'] || 0;
    const trainingBonus = UPGRADES.find(u => u.id === 'recruit_training')?.effect(trainingLevel) || 0;
    stats.damage += trainingBonus;

    // 2. Class Skills (Legacy)
    const skills = CLASS_SKILLS[adventurer.role] || [];
    skills.forEach(skill => {
        if (adventurer.level >= skill.unlockLevel) {
            if (skill.id === 'war_1') stats.health += 30;
            if (skill.id === 'war_2') stats.damage *= 1.15;
            if (skill.id === 'war_3') { stats.health += 50; stats.damage *= 1.10; }
            
            if (skill.id === 'rog_1') stats.speed *= 1.10;
            if (skill.id === 'rog_2') stats.critChance += 0.10;
            if (skill.id === 'rog_3') { stats.damage *= 1.30; }

            if (skill.id === 'mag_1') stats.damage += 5;
            if (skill.id === 'mag_2') { stats.damage *= 1.20; stats.health *= 0.90; }
            if (skill.id === 'mag_3') stats.damage *= 1.40;
        }
    });

    // 3. Traits (New System)
    if (adventurer.traits) {
        adventurer.traits.forEach(trait => {
            // Fix: Rehydrate function if missing (loaded from JSON)
            if (typeof trait.effect === 'function') {
                trait.effect(stats);
            } else {
                const template = TRAIT_POOL.find(t => t.name === trait.name);
                if (template && typeof template.effect === 'function') {
                    template.effect(stats);
                }
            }
        });
    }

    // 4. Skill Tree (Stats & Modifiers)
    const activeModifiers: string[] = [];

    if (adventurer.unlockedSkills && adventurer.skillTree) {
        const tree = adventurer.skillTree;
        adventurer.unlockedSkills.forEach(skillId => {
            const node = tree.find(n => n.id === skillId);
            if (node) {
                // Modifiers
                if (node.effectType === 'MODIFIER' && node.modifier) {
                    activeModifiers.push(node.modifier);
                }

                // Apply node effects
                if (node.effectType === 'STAT') {
                    if (node.statTarget === 'damage' || node.statTarget === 'all') stats.damage *= (1 + node.effectValue);
                    if (node.statTarget === 'health' || node.statTarget === 'all') stats.health *= (1 + node.effectValue);
                    if (node.statTarget === 'speed' || node.statTarget === 'speed_crit') stats.speed *= (1 + node.effectValue);
                    if (node.statTarget === 'crit' || node.statTarget === 'speed_crit') stats.critChance += node.effectValue;
                }
                if (node.effectType === 'ECONOMY') {
                    if (node.statTarget === 'gold') stats.goldGain += node.effectValue;
                    if (node.statTarget === 'xp') stats.xpGain += node.effectValue;
                    if (node.statTarget === 'loot') stats.lootLuck += node.effectValue;
                }
            }
        });
    }

    // 5. Modifier Pre-Calculation (Base Stat alterations)
    if (activeModifiers.includes('RUSH')) {
        stats.speed *= 1.25;
        stats.health *= 0.85;
    }
    if (activeModifiers.includes('GLASS_CANNON')) {
        stats.damage *= 1.40;
        stats.health *= 0.80;
    }
    if (activeModifiers.includes('TITAN_GRIP')) {
        stats.damage *= 1.20;
        stats.health *= 1.20;
        stats.speed *= 0.90;
    }
    if (activeModifiers.includes('GOLDEN_TOUCH')) {
        stats.goldGain += 0.50;
        stats.damage *= 0.90;
    }
    if (activeModifiers.includes('SPEED_DEMON')) {
        stats.speed *= 1.15;
        stats.lootLuck -= 0.10;
    }
    if (activeModifiers.includes('BOSS_KILLER')) {
        stats.damage *= 1.20;
        stats.speed *= 0.90;
    }
    if (activeModifiers.includes('LOGISTICIAN')) {
         stats.xpGain -= 0.10;
    }

    // 6. Gear Stats
    const isWeaponMaster = activeModifiers.includes('WEAPON_MASTER');

    Object.values(adventurer.slots).forEach((item) => {
        if (item) {
          // Rule: Weapon Master disables Trinkets stats entirely (effectively unequipped)
          if (isWeaponMaster && item.type === ItemType.TRINKET) return;

          let multiplier = 1.0;
          if (isWeaponMaster && item.type === ItemType.WEAPON) multiplier = 2.0; // DOUBLE STATS

          item.stats.forEach((stat) => {
            if (stat.name === 'Damage') {
                if (stat.isPercentage) stats.damage *= (1 + (stat.value * multiplier) / 100);
                else stats.damage += (stat.value * multiplier);
            }
            if (stat.name === 'Health') {
                if (stat.isPercentage) stats.health *= (1 + (stat.value * multiplier) / 100);
                else stats.health += (stat.value * multiplier);
            }
            if (stat.name === 'Crit Chance') {
                stats.critChance += (stat.value * multiplier) / 100;
            }
            if (stat.name === 'Speed') {
                stats.speed += (stat.value * multiplier) / 100;
            }
            if (stat.name === 'Gold Gain') stats.goldGain += (stat.value * multiplier) / 100;
            if (stat.name === 'Loot Luck') stats.lootLuck += (stat.value * multiplier) / 100;
          });
        }
    });

    // 7. Ascension & Mastery Bonus
    const ascensionBonuses = getAscensionBonuses(state.ascensionCount || 0);
    const masteryBonus = calculateMasteryBonus(state, 'COMBAT');

    // Combine Multipliers
    const totalPowerMult = (1 + ascensionBonuses.powerGrowth) * masteryBonus.power;
    const totalDmgMult = masteryBonus.damage;

    stats.damage *= (totalPowerMult * totalDmgMult);
    stats.health *= totalPowerMult;

    return {
        damage: Math.floor(stats.damage),
        health: Math.floor(stats.health),
        speed: parseFloat(stats.speed.toFixed(2)),
        critChance: parseFloat(stats.critChance.toFixed(2)),
        goldGain: parseFloat(stats.goldGain.toFixed(2)),
        xpGain: parseFloat(stats.xpGain.toFixed(2)),
        lootLuck: parseFloat(stats.lootLuck.toFixed(2))
    };
};

export const calculateAdventurerPower = (adventurer: Adventurer, state: GameState): number => {
  const stats = getAdventurerStats(adventurer, state);
  let power = stats.damage * (1 + stats.critChance) + (stats.health / 5);
  power *= stats.speed;
  return Math.floor(power);
};

export const getEffectiveAdventurer = (adventurer: Adventurer, state: GameState): Adventurer => {
    const run = state.activeRuns.find(r => r.adventurerIds.includes(adventurer.id));
    const effectiveAdv = { ...adventurer, slots: { ...adventurer.slots } };

    if (run && run.adventurerState) {
        const snapshotAdv = run.adventurerState[adventurer.id];
        if (snapshotAdv) {
             ([ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET] as ItemType[]).forEach(type => {
                const liveItem = effectiveAdv.slots[type];
                const snapshotItem = snapshotAdv.slots[type];
                
                const isModified = run.modifiedSlots?.[adventurer.id]?.includes(type);
                const isDifferent = !areItemsEqual(liveItem, snapshotItem);
                
                if (isModified || isDifferent) {
                    effectiveAdv.slots[type] = null;
                }
            });
        }
    }
    return effectiveAdv;
};

export const calculateConservativePower = (adventurer: Adventurer, state: GameState): number => {
    const effectiveAdv = getEffectiveAdventurer(adventurer, state);
    return calculateAdventurerPower(effectiveAdv, state);
};

export const calculateItemRating = (item: Item): number => {
    let score = 0;
    item.stats.forEach(stat => {
        if (stat.name === 'Damage') score += stat.value * 5; 
        else if (stat.name === 'Health') score += stat.value * 1; 
        else if (stat.name === 'Speed') score += stat.value * 10;
        else if (stat.name === 'Crit Chance') score += stat.value * 8;
        else if (stat.name === 'Gold Gain') score += stat.value * 3;
        else if (stat.name === 'Loot Luck') score += stat.value * 3;
        else score += stat.value;
    });
    return Math.floor(score);
};

export const calculateAdventurerDps = (adventurer: Adventurer, state: GameState): number => {
    const stats = getAdventurerStats(adventurer, state);
    return (stats.damage * (1 + stats.critChance)) * stats.speed;
};

export const calculatePartyDps = (adventurerIds: string[], state: GameState): number => {
    let totalDps = 0;
    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            totalDps += calculateAdventurerDps(adv, state);
        }
    });
    return totalDps;
};

export const calculatePartyStat = (adventurerIds: string[], state: GameState, statName: string): number => {
    let totalValue = 0;
    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            Object.values(adv.slots).forEach(item => {
                if (item) {
                    item.stats.forEach(stat => {
                        if (stat.name === statName) {
                            totalValue += stat.value;
                        }
                    });
                }
            });
        }
    });
    return totalValue;
};

export const calculateDungeonDuration = (baseDuration: number, state: GameState, adventurerIds?: string[]): number => {
  const speedLevel = state.upgrades['logistics_network'] || 0;
  const reduction = UPGRADES.find(u => u.id === 'logistics_network')?.effect(speedLevel) || 0;
  const effectiveReduction = Math.min(reduction, 0.5);
  
  let duration = Math.max(1, baseDuration * (1 - effectiveReduction));

  if (adventurerIds) {
      const activeModifiers = getActiveModifiers(adventurerIds, state);
      
      const methodicalCount = activeModifiers.filter(m => m === 'METHODICAL').length;
      if (methodicalCount > 0) {
          duration *= (1 + (0.20 * methodicalCount));
      }

      const logisticianCount = activeModifiers.filter(m => m === 'LOGISTICIAN').length;
      if (logisticianCount > 0) {
          duration *= (1 - (0.10 * logisticianCount));
      }
  }

  // Mastery Bonus: Fishing speed
  const fishingMastery = calculateMasteryBonus(state, 'FISHING');
  // Only apply to duration generally if we knew context, but here we don't know dungeon type easily.
  // We'll apply it in context instead or if we had dungeon type passed in.
  // For now, let's keep logic simple: speed upgrades are global.

  const asc = getAscensionBonuses(state.ascensionCount || 0);
  duration *= (1 - asc.durationReduction);

  return duration;
};

export const calculateRunSnapshot = (adventurerIds: string[], state: GameState): RunSnapshot => {
    const dps = calculatePartyDps(adventurerIds, state);
    const power = adventurerIds.reduce((sum, id) => {
        const adv = state.adventurers.find(a => a.id === id);
        return sum + (adv ? calculateAdventurerPower(adv, state) : 0);
    }, 0);

    const activeModifiers = getActiveModifiers(adventurerIds, state);

    let partyGoldBonus = 0;
    let partyXpBonus = 0;
    let partyLootBonus = 0;

    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            const stats = getAdventurerStats(adv, state);
            partyGoldBonus += stats.goldGain;
            partyXpBonus += stats.xpGain;
            partyLootBonus += stats.lootLuck;
        }
    });
    
    const methodicalCount = activeModifiers.filter(m => m === 'METHODICAL').length;
    if (methodicalCount > 0) {
        partyGoldBonus += 0.50 * methodicalCount;
        partyXpBonus += 0.50 * methodicalCount;
        partyLootBonus += 0.50 * methodicalCount;
    }

    const gamblerCount = activeModifiers.filter(m => m === 'GAMBLER').length;
    if (gamblerCount > 0) {
        partyGoldBonus -= 0.50 * gamblerCount;
    }

    const ecoLevel = state.upgrades['marketplace_connections'] || 0;
    const ecoBonus = UPGRADES.find(u => u.id === 'marketplace_connections')?.effect(ecoLevel) || 0;
    const legacyLevel = state.prestigeUpgrades['legacy_wealth'] || 0;
    const legacyBonus = PRESTIGE_UPGRADES.find(u => u.id === 'legacy_wealth')?.effect(legacyLevel) || 0;
    
    const asc = getAscensionBonuses(state.ascensionCount || 0);

    const totalGoldBonus = ecoBonus + legacyBonus + partyGoldBonus + asc.goldGain;

    const renownLevel = state.prestigeUpgrades['renowned_guild'] || 0;
    const renownBonus = PRESTIGE_UPGRADES.find(u => u.id === 'renowned_guild')?.effect(renownLevel) || 0;
    const totalXpBonus = renownBonus + partyXpBonus; 

    const lootLevel = state.upgrades['loot_logic'] || 0;
    const lootBonus = UPGRADES.find(u => u.id === 'loot_logic')?.effect(lootLevel) || 0;
    const totalLootBonus = lootBonus + partyLootBonus;

    return {
        dps,
        power,
        goldBonus: totalGoldBonus,
        xpBonus: totalXpBonus,
        lootBonus: totalLootBonus,
        activeModifiers
    };
};

export const generateAdventurer = (id: string, _placeholderName?: string): Adventurer => {
    // This function is kept for backward compatibility but forwards to generateCandidate
    return generateCandidate();
};

export const calculateDropChance = (guildLootBonus: number, efficiencyStat: number): number => {
    const efficiencyBonus = efficiencyStat / 1000;
    let chance = BASE_DROP_CHANCE + guildLootBonus + efficiencyBonus;
    return Math.min(chance, MAX_DROP_CHANCE);
};

export const calculateRarityWeights = (
    dungeonTier: number, 
    rarityBonusPercent: number, 
    legendaryPity: number, 
    ascensionCount: number,
    realmState?: RealmState,
    dungeonId?: string
) => {
    const weights = { ...BASE_RARITY_WEIGHTS };
    const dungeonShift = dungeonTier * 2;
    const playerShift = (rarityBonusPercent * 100) * 0.5; 
    const asc = getAscensionBonuses(ascensionCount);
    
    // Realm Evolution Shifts
    let realmShift = 0;
    if (realmState) {
        const bonuses = getRealmBonuses(realmState, dungeonId);
        realmShift = bonuses.globalRarityShift;
    }
    
    const totalShift = dungeonShift + playerShift + asc.rarityShift + realmShift;

    weights[Rarity.COMMON] -= totalShift * 1;
    weights[Rarity.RARE] += totalShift * 0.6;
    weights[Rarity.EPIC] += totalShift * 0.3;
    weights[Rarity.LEGENDARY] += totalShift * 0.1;

    if (legendaryPity >= 50) {
        const extraShift = legendaryPity - 50;
        weights[Rarity.LEGENDARY] += extraShift;
        weights[Rarity.COMMON] -= extraShift;
    }

    (Object.keys(weights) as Rarity[]).forEach(r => {
        if (weights[r] < 0) weights[r] = 0;
    });

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    
    if (totalWeight === 0) {
        return { ...BASE_RARITY_WEIGHTS }; 
    }

    (Object.keys(weights) as Rarity[]).forEach(r => {
        weights[r] = (weights[r] / totalWeight) * 100;
    });

    return weights;
};

export const rollRarity = (weights: Record<Rarity, number>): Rarity => {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const r of [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]) {
        cumulative += weights[r];
        if (rand < cumulative) return r;
    }
    return Rarity.COMMON;
};

export const getStatBudget = (level: number, rarity: Rarity, prestigeUpgrades: { [id: string]: number }) => {
    const config = RARITY_CONFIG[rarity];
    const rarityMultiplier = config.statMult;

    const crafterLevel = prestigeUpgrades['master_crafters'] || 0;
    const crafterBonus = 1 + (PRESTIGE_UPGRADES.find(u => u.id === 'master_crafters')?.effect(crafterLevel) || 0);
    
    const baseBudget = 3 * level * rarityMultiplier * crafterBonus; 
    
    return baseBudget;
};

export const rollStatTier = (): number => {
    const totalWeight = TIER_WEIGHTS.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * totalWeight;
    
    for (const tier of TIER_WEIGHTS) {
        if (r < tier.weight) return tier.tier;
        r -= tier.weight;
    }
    return 7; // Fallback
};

const POSSIBLE_AFFIXES = [
    { name: 'Crit Chance', basePower: 1.5, weight: 1 },
    { name: 'Speed', basePower: 1.5, weight: 1 },
    { name: 'Damage', basePower: 2.0, weight: 1 }, // % Dmg
    { name: 'Health', basePower: 2.0, weight: 1 }, // % Health
    { name: 'Gold Gain', basePower: 2.0, weight: 0.5 }, // % Gold
    { name: 'Loot Luck', basePower: 1.0, weight: 0.3 }, // % Drop Rate
];

const UNIQUE_EFFECTS = [
    { name: 'Vampirism', value: 5, description: 'Life Steal' },
    { name: 'Executioner', value: 15, description: 'Dmg vs Low HP' },
    { name: 'Thorns', value: 10, description: 'Reflect Dmg' },
    { name: 'Greed', value: 50, description: 'Gold Find' },
    { name: 'Swiftness', value: 20, description: 'Move Speed' }
];

export const generateRandomAffix = (level: number, rarity: Rarity, excludeNames: string[] = []): ItemStat => {
    const available = POSSIBLE_AFFIXES.filter(a => !excludeNames.includes(a.name));
    const choice = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)] 
        : POSSIBLE_AFFIXES[Math.floor(Math.random() * POSSIBLE_AFFIXES.length)];

    const config = RARITY_CONFIG[rarity];
    const rarityMultiplier = config.statMult;
    
    const tier = rollStatTier();
    const tierMultiplier = TIER_MULTIPLIERS[tier];

    const levelScaling = 1 + (level * 0.1); 

    const rawVal = choice.basePower * levelScaling * rarityMultiplier * tierMultiplier;
    
    const finalVal = Math.max(1, Math.round(rawVal));

    return {
        name: choice.name,
        value: finalVal,
        isPercentage: true,
        tier: tier
    };
};

export const generateItem = (dungeonLevel: number, forcedRarity: Rarity, prestigeUpgrades: { [id: string]: number } = {}): Item => {
  const rarity = forcedRarity;
  const config = RARITY_CONFIG[rarity];

  const typeRoll = Math.random();
  const type = typeRoll < 0.33 ? ItemType.WEAPON : typeRoll < 0.66 ? ItemType.ARMOR : ItemType.TRINKET;

  let subtype = WeaponType.NONE;
  let classRestriction: AdventurerRole[] = [];
  let nameSuffix = "";

  if (type === ItemType.WEAPON) {
      const weaponTypes = [WeaponType.SWORD, WeaponType.BLUNT, WeaponType.DAGGER, WeaponType.BOW, WeaponType.STAFF, WeaponType.BOOK];
      subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      classRestriction = Object.keys(CLASS_WEAPONS).filter(role => 
          CLASS_WEAPONS[role as AdventurerRole].includes(subtype)
      ) as AdventurerRole[];
      nameSuffix = subtype;
  } else {
      classRestriction = Object.values(AdventurerRole);
      nameSuffix = type;
  }

  const stats: ItemStat[] = [];
  const statBudget = getStatBudget(dungeonLevel, rarity, prestigeUpgrades);

  const mainStatTier = rollStatTier();
  const mainStatTierMult = TIER_MULTIPLIERS[mainStatTier];
  
  const effectiveBudget = statBudget * mainStatTierMult;

  if (type === ItemType.WEAPON) {
      stats.push({ name: 'Damage', value: Math.max(1, Math.round(effectiveBudget)), isPercentage: false, tier: mainStatTier });
  } else if (type === ItemType.ARMOR) {
      stats.push({ name: 'Health', value: Math.max(5, Math.round(effectiveBudget * 5)), isPercentage: false, tier: mainStatTier });
  } else {
      if (Math.random() > 0.5) stats.push({ name: 'Damage', value: Math.max(1, Math.round(effectiveBudget * 0.5)), isPercentage: false, tier: mainStatTier });
      else stats.push({ name: 'Health', value: Math.max(5, Math.round(effectiveBudget * 2.5)), isPercentage: false, tier: mainStatTier });
  }

  const bonusCount = config.bonusStats;
  let affixesGenerated = 0;

  for (let i = 0; i < bonusCount; i++) {
     const existingNames = stats.map(s => s.name);
     stats.push(generateRandomAffix(dungeonLevel, rarity, existingNames));
     affixesGenerated++;
  }

  if (rarity === Rarity.LEGENDARY) {
      const unique = UNIQUE_EFFECTS[Math.floor(Math.random() * UNIQUE_EFFECTS.length)];
      stats.push({
          name: unique.name, 
          value: unique.value,
          isPercentage: true,
          tier: 0 
      });
  }

  const goldValue = Math.ceil(statBudget * 3 * (1 + affixesGenerated * 0.2));

  return {
    id: crypto.randomUUID(),
    name: `${rarity} ${nameSuffix}`, 
    type,
    subtype,
    classRestriction,
    rarity,
    level: dungeonLevel,
    stats,
    value: goldValue,
  };
};

export const calculateGuildLevel = (totalGold: number) => {
    const level = Math.floor(Math.sqrt(totalGold / 1000)) + 1;
    const currentLevelStart = 1000 * Math.pow(level - 1, 2);
    const nextLevelStart = 1000 * Math.pow(level, 2);
    const progress = (totalGold - currentLevelStart) / (nextLevelStart - currentLevelStart);
    
    return {
        level,
        progress: Math.min(100, Math.max(0, progress * 100)),
        nextLevelStart,
        remaining: nextLevelStart - totalGold
    };
};

export const calculatePrestigeGain = (totalLifetimeGold: number): number => {
    if (totalLifetimeGold < 100000) return 0;
    return Math.floor(Math.sqrt(totalLifetimeGold / 10000));
};

export const calculateItemUpgradeCost = (item: Item, type: 'ENCHANT' | 'REROLL'): number => {
    const rarityMult = CRAFTING_RARITY_MULTIPLIERS[item.rarity];
    
    if (type === 'ENCHANT') {
        const statsCount = item.stats.length;
        return Math.floor(ENCHANT_COST_BASE * item.level * rarityMult * statsCount);
    } else {
        return Math.floor(REROLL_COST_BASE * item.level * rarityMult);
    }
};

export const checkDungeonUnlock = (dungeon: Dungeon, state: GameState): boolean => {
    if (state.unlockedDungeons.includes(dungeon.id)) return true;

    const req = dungeon.unlockReq;
    if (!req) return true; 

    const totalPower = state.adventurers.reduce((sum, adv) => sum + calculateConservativePower(adv, state), 0);
    if (req.minPower && totalPower < req.minPower) return false;

    const guildInfo = calculateGuildLevel(state.statistics.totalGoldEarned);
    if (req.minGuildLevel && guildInfo.level < req.minGuildLevel) return false;

    if (req.minAscension && (state.ascensionCount || 0) < req.minAscension) return false;

    if (req.previousDungeonId && req.previousDungeonClears) {
        const clears = state.statistics.dungeonClears[req.previousDungeonId] || 0;
        if (clears < req.previousDungeonClears) return false;
    }

    return true;
};
