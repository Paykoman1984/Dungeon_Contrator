
import { Adventurer, Item, ItemType, Rarity, ItemStat, GameState, AdventurerRole, WeaponType, RunSnapshot, SkillNode, Dungeon, Trait, TraitType, RealmState, DungeonReport, ContractType, MechanicModifier, DungeonMechanicId, SpecializationData, SpecializationType, MasteryEffects, ResourceCost, ConsumableType, ActiveConsumable } from '../types';
import { UPGRADES, CLASS_SKILLS, ROLE_CONFIG, ADVENTURER_RARITY_MULTIPLIERS, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, TIER_WEIGHTS, TIER_MULTIPLIERS, CRAFTING_RARITY_MULTIPLIERS, ENCHANT_COST_BASE, REROLL_COST_BASE, STAT_POOLS, CAPSTONE_POOL, getRandomFromPool, ADVENTURER_NAMES, TITLES_BY_ROLE, BASE_DROP_CHANCE, MAX_DROP_CHANCE, BASE_RARITY_WEIGHTS, RARITY_CONFIG, TRAIT_POOL, REALM_CONFIG, REALM_MODIFIERS, XP_CURVE_CONFIG, MASTERY_CONFIG, ITEM_SETS, UNIQUE_EFFECT_REGISTRY, EARLY_GAME_CONFIG, CONSUMABLES, INITIAL_GOLD } from '../constants';

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return Math.floor(num).toString();
};

export const areItemsEqual = (itemA: Item | null, itemB: Item | null): boolean => {
    if (itemA === null && itemB === null) return true;
    if (itemA === null || itemB === null) return false;
    return itemA.id === itemB.id && JSON.stringify(itemA.stats) === JSON.stringify(itemB.stats);
};

export const calculateTotalSkillPoints = (level: number): number => {
    if (level < 5) return 0;
    return 1 + Math.floor((level - 5) / 3);
};

export const checkResourceCost = (state: GameState, costs: ResourceCost[] | undefined): boolean => {
    if (!costs || costs.length === 0) return true;
    return costs.every(cost => (state.materials[cost.resourceId] || 0) >= cost.amount);
};

export const deductResources = (materials: Record<string, number>, costs: ResourceCost[]): Record<string, number> => {
    const newMaterials = { ...materials };
    costs.forEach(cost => {
        const current = newMaterials[cost.resourceId] || 0;
        newMaterials[cost.resourceId] = Math.max(0, current - cost.amount);
    });
    return newMaterials;
};

export const calculateConsumableBonuses = (activeConsumables: ActiveConsumable[]) => {
    const bonuses = {
        POWER: 1.0, 
        SPEED: 1.0,
        GOLD: 1.0,
        XP: 1.0
    };

    activeConsumables.forEach(ac => {
        const def = CONSUMABLES.find(c => c.id === ac.defId);
        if (def) {
            if (def.effectType === 'POWER') bonuses.POWER += def.effectValue;
            if (def.effectType === 'GOLD') bonuses.GOLD += def.effectValue;
            if (def.effectType === 'XP') bonuses.XP += def.effectValue;
            if (def.effectType === 'SPEED') bonuses.SPEED -= def.effectValue; 
        }
    });

    return bonuses;
};

export const getEarlyGameBoost = (state: GameState) => {
    const isAscended = state.ascensionCount > 0;
    if (isAscended) {
        return { active: false, label: null, xpMult: 1.0, goldMult: 1.0, dropMult: 1.0 };
    }

    const now = Date.now();
    const startTime = state.startTime || now; 
    const elapsed = now - startTime;
    const durationMs = EARLY_GAME_CONFIG.durationMinutes * 60 * 1000;

    if (elapsed >= durationMs) {
        return { active: false, label: null, xpMult: 1.0, goldMult: 1.0, dropMult: 1.0 };
    }

    const progress = elapsed / durationMs;
    const decayFactor = 1.0 - progress;

    const xpMult = 1.0 + ((EARLY_GAME_CONFIG.maxXpMult - 1.0) * decayFactor);
    const goldMult = 1.0 + ((EARLY_GAME_CONFIG.maxGoldMult - 1.0) * decayFactor);
    const dropMult = 1.0 + ((EARLY_GAME_CONFIG.maxDropMult - 1.0) * decayFactor);

    return {
        active: true,
        label: "Rookie Rush",
        xpMult,
        goldMult,
        dropMult
    };
};

export const isEarlyGamePhase = (state: GameState): boolean => {
    return getEarlyGameBoost(state).active;
};

export const calculateRealmXpRequired = (rank: number): number => {
    return Math.floor(REALM_CONFIG.baseXp * Math.pow(rank, REALM_CONFIG.scalingFactor));
};

export const getRealmBonuses = (realm: RealmState, dungeonId?: string) => {
    const rank = realm.realmRank;
    const tier = realm.realmTier || 1; 
    let enemyMult = 1 + ((tier - 1) * REALM_CONFIG.tierEnemyScaling);
    let lootRolls = rank * REALM_CONFIG.rankLootQuantity;
    let rarityShift = rank * REALM_CONFIG.rankRarityShift;
    let lootYieldMult = 1 + (rank * REALM_CONFIG.rankLootYield);

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

export const calculateMasteryBonus = (state: GameState): MasteryEffects => {
    const { combat, gathering, fishing } = state.guildMastery;

    const getMilestones = (lvl: number, config: any) => {
        const achieved: string[] = [];
        Object.keys(config.milestones).forEach(mLevel => {
            if (lvl >= parseInt(mLevel)) achieved.push(config.milestones[mLevel]);
        });
        return achieved;
    };

    return {
        combat: {
            durationReduction: Math.min(0.5, combat.level * MASTERY_CONFIG.combat.durationRedPerLevel),
            damageConsistency: 1 + (combat.level >= 5 ? 0.1 : 0), 
            xpBonus: 1 + (combat.level * MASTERY_CONFIG.combat.xpBonusPerLevel),
            milestones: getMilestones(combat.level, MASTERY_CONFIG.combat)
        },
        gathering: {
            durationReduction: Math.min(0.5, gathering.level * MASTERY_CONFIG.gathering.durationRedPerLevel),
            doubleYieldChance: gathering.level * MASTERY_CONFIG.gathering.doubleYieldChancePerLevel,
            rareMaterialBonus: gathering.level >= 15 ? 1 : 0, 
            milestones: getMilestones(gathering.level, MASTERY_CONFIG.gathering)
        },
        fishing: {
            durationReduction: Math.min(0.5, fishing.level * MASTERY_CONFIG.fishing.durationRedPerLevel),
            doubleCatchChance: fishing.level * MASTERY_CONFIG.fishing.doubleCatchChancePerLevel,
            rareFishBonus: fishing.level * MASTERY_CONFIG.fishing.rareBonusPerLevel,
            milestones: getMilestones(fishing.level, MASTERY_CONFIG.fishing)
        }
    };
};

export const applyDungeonMechanic = (mechanicId: DungeonMechanicId | undefined, tier: number, rank: number): MechanicModifier => {
    const base: MechanicModifier = {
        enemyHpMult: 1.0,
        powerReqMult: 1.0,
        xpYieldMult: 1.0,
        goldYieldMult: 1.0,
        lootRollBonus: 0,
        durationMult: 1.0,
        description: ''
    };

    if (!mechanicId || mechanicId === 'NONE') return base;

    switch (mechanicId) {
        case 'SWARM':
            base.enemyHpMult = 0.5; 
            base.xpYieldMult = 0.6; 
            base.goldYieldMult = 0.6; 
            base.lootRollBonus = 1; 
            base.description = "Swarm: Enemy HP halved. Loot volume increased.";
            break;
        case 'PACK_TACTICS':
            base.powerReqMult = 1.30 + (tier * 0.05); 
            base.goldYieldMult = 1.50; 
            base.description = `Pack Tactics: Power Req +30%. Gold +50%.`;
            break;
        case 'UNDEAD_RESILIENCE':
            base.enemyHpMult = 1.50; 
            base.xpYieldMult = 2.00; 
            base.description = "Undead: Enemy HP +50%. XP Yield +100%.";
            break;
        case 'RESOURCE_SURGE':
            base.durationMult = 0.8; 
            base.description = "Surge: Contract duration -20%.";
            break;
        case 'ELITE_HUNT':
            base.powerReqMult = 1.5;
            base.lootRollBonus = 2; 
            base.xpYieldMult = 1.5;
            base.description = "Elite: High Power Req. +2 Loot Rolls.";
            break;
    }
    return base;
};

export const calculateEffectiveDungeonStats = (dungeon: Dungeon, realm: RealmState, gameState?: GameState) => {
    const bonuses = getRealmBonuses(realm, dungeon.id);
    let lootMult = bonuses.lootYieldMultiplier;
    const mech = applyDungeonMechanic(dungeon.mechanicId, dungeon.tier, realm.realmRank);
    let masteryXpBonus = 1.0;
    
    if (gameState) {
        const mastery = calculateMasteryBonus(gameState);
        if (dungeon.type === ContractType.DUNGEON) {
            masteryXpBonus = mastery.combat.xpBonus;
        }
    }
    
    const finalPower = Math.floor(dungeon.recommendedPower * bonuses.enemyPowerMultiplier * mech.powerReqMult);
    
    return {
        recommendedPower: finalPower,
        dropChance: dungeon.dropChance,
        lootMultiplier: lootMult, 
        mechanic: mech,
        masteryXpBonus
    };
};

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

export const generateTraits = (count: number = 3): Trait[] => {
    const traits: Trait[] = [];
    const common = TRAIT_POOL.filter(t => t.rarity === 'Common');
    const rare = TRAIT_POOL.filter(t => t.rarity === 'Rare');
    const epic = TRAIT_POOL.filter(t => t.rarity === 'Epic');

    for (let i = 0; i < count; i++) {
        const roll = Math.random();
        let pool = common;
        if (roll > 0.95) pool = epic;
        else if (roll > 0.70) pool = rare;

        const template = pool[Math.floor(Math.random() * pool.length)];
        
        if (traits.some(t => t.name === template.name)) {
            i--; 
            continue;
        }

        traits.push({
            id: crypto.randomUUID(),
            ...template
        });
    }
    return traits;
};

export const generateSkillTree = (role: AdventurerRole): { tree: SkillNode[], archetype: string } => {
    const pools = STAT_POOLS[role];
    const capstones = CAPSTONE_POOL[role];
    
    const getRoot = () => getRandomFromPool(Math.random() > 0.3 ? pools.root : pools.offense); 
    const getSide = () => getRandomFromPool(Math.random() > 0.5 ? pools.offense : pools.defense);
    const getExtension = () => getRandomFromPool(Math.random() > 0.5 ? pools.hybrid : pools.root);
    const getCap = () => getRandomFromPool(capstones);

    const rootTmpl = getRoot();
    const l1Tmpl = getSide();
    const r1Tmpl = getSide();
    const l2Tmpl = getExtension();
    const r2Tmpl = getExtension();
    const capTmpl = getCap();

    const tree: SkillNode[] = [
        { ...rootTmpl, id: 'root', x: 50, y: 90, requires: [], maxLevel: 1, cost: 1 },
        { ...l1Tmpl, id: 't2_l', x: 30, y: 70, requires: ['root'], maxLevel: 1, cost: 1, exclusiveGroup: 'tier2' },
        { ...r1Tmpl, id: 't2_r', x: 70, y: 70, requires: ['root'], maxLevel: 1, cost: 1, exclusiveGroup: 'tier2' },
        { ...l2Tmpl, id: 't3_l', x: 20, y: 45, requires: ['t2_l'], maxLevel: 1, cost: 2 },
        { ...r2Tmpl, id: 't3_r', x: 80, y: 45, requires: ['t2_r'], maxLevel: 1, cost: 2 },
        { ...capTmpl, id: 'cap', x: 50, y: 20, requires: ['t3_l', 't3_r'], maxLevel: 1, cost: 3 }
    ];

    return { tree, archetype: capTmpl.name }; 
};

export const calculateAdventurerSpecialization = (adventurer: Adventurer): SpecializationData => {
    // Removed inherent Combat bias (was 10) to allow traits to determine specialization fairly
    let combat = 0; 
    let gathering = 0;
    let fishing = 0;

    if (adventurer.traits) {
        adventurer.traits.forEach(t => {
            if (t.type === 'COMBAT') combat += 5;
            if (t.type === 'GATHERING') gathering += 5;
            if (t.type === 'FISHING') fishing += 5;
            if (t.type === 'HYBRID') { combat += 2; gathering += 2; fishing += 1; }
        });
    }

    if (adventurer.unlockedSkills && adventurer.skillTree) {
        adventurer.unlockedSkills.forEach(skillId => {
            const node = adventurer.skillTree.find(n => n.id === skillId);
            if (node) {
                if (['damage', 'health', 'crit', 'speed', 'speed_crit', 'all'].includes(node.statTarget || '')) combat += 2;
                if (['loot', 'gold'].includes(node.statTarget || '')) {
                    gathering += 2;
                    if (node.statTarget === 'loot') fishing += 1; 
                }
            }
        });
    }

    Object.values(adventurer.slots).forEach(item => {
        if (item) {
            item.stats.forEach(stat => {
                if (['Damage', 'Health', 'Crit Chance'].includes(stat.name)) combat += 2;
                if (['Gold Gain'].includes(stat.name)) gathering += 3;
                if (['Loot Luck'].includes(stat.name)) { gathering += 2; fishing += 3; }
            });
        }
    });

    const maxScore = Math.max(combat, gathering, fishing);
    let type: SpecializationType = 'HYBRID';
    let label = 'Hybrid';
    let color = 'text-purple-400';
    let bonus = 0.05;

    const scores = [combat, gathering, fishing].sort((a,b) => b-a);
    const secondBest = scores[1] || 0;

    // Adjusted logic: If maxScore matches exactly, priority is Combat > Gathering > Fishing
    // But if valid gap or dominant, pick that.
    
    // If no traits/stats (all 0), default to Hybrid
    if (maxScore === 0) {
        return {
            type: 'HYBRID',
            label: 'Novice',
            scores: { combat, gathering, fishing },
            efficiencyBonus: 0,
            color: 'text-slate-400'
        };
    }

    // Relaxed threshold: just needs to be strictly greater than second best, OR significantly high
    if (maxScore > secondBest) {
        if (maxScore === combat) {
            type = 'COMBAT';
            label = 'Combat Specialist';
            color = 'text-red-400';
            bonus = 0.10;
        } else if (maxScore === gathering) {
            type = 'GATHERING';
            label = 'Gathering Specialist';
            color = 'text-emerald-400';
            bonus = 0.10;
        } else if (maxScore === fishing) {
            type = 'FISHING';
            label = 'Fishing Specialist';
            color = 'text-blue-400';
            bonus = 0.10;
        }
    } else {
        // Tie or balanced
        type = 'HYBRID';
        label = 'Hybrid Expert';
        color = 'text-purple-400';
        bonus = 0.05;
    }

    return {
        type,
        label,
        scores: { combat, gathering, fishing },
        efficiencyBonus: bonus,
        color
    };
};

export const getSpecializationDisplayData = (adventurer: Adventurer) => {
    return calculateAdventurerSpecialization(adventurer);
};

export const getAscensionBonuses = (ascensionCount: number) => {
    return {
        powerGrowth: ascensionCount * 0.10, 
        goldGain: ascensionCount * 0.20, 
        rarityShift: ascensionCount * 0.5, 
        durationReduction: Math.min(0.5, ascensionCount * 0.05) 
    };
};

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
    const traits = generateTraits(3);
    const { tree, archetype } = generateSkillTree(role);
    const name = ADVENTURER_NAMES[Math.floor(Math.random() * ADVENTURER_NAMES.length)];
    
    const titleOptions = TITLES_BY_ROLE[role];
    const titleIndex = Math.floor(Math.random() * titleOptions.length);
    const title = titleOptions[titleIndex];
    const initialXpReq = calculateXpRequired(1, 'ADVENTURER');

    const tempAdv: Adventurer = {
        id: crypto.randomUUID(),
        name,
        title,
        role,
        rarity,
        level: 1, 
        xp: 0,
        xpToNextLevel: initialXpReq,
        gatheringLevel: 1,
        gatheringXp: 0,
        fishingLevel: 1,
        fishingXp: 0,
        traits: traits,
        traitId: 'legacy', 
        specialization: "Novice", // Will be calculated dynamically by UI
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
    
    // Pre-calculate just to set the string field for initial state data consistency
    const specData = calculateAdventurerSpecialization(tempAdv);
    tempAdv.specialization = specData.label;

    return tempAdv;
};

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

interface EffectiveStats {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
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

    const trainingLevel = state.upgrades['recruit_training'] || 0;
    const trainingBonus = UPGRADES.find(u => u.id === 'recruit_training')?.effect(trainingLevel) || 0;
    stats.damage += trainingBonus;

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

    if (adventurer.traits) {
        adventurer.traits.forEach(trait => {
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

    const activeModifiers: string[] = [];

    if (adventurer.unlockedSkills && adventurer.skillTree) {
        const tree = adventurer.skillTree;
        adventurer.unlockedSkills.forEach(skillId => {
            const node = tree.find(n => n.id === skillId);
            if (node) {
                if (node.effectType === 'MODIFIER' && node.modifier) {
                    activeModifiers.push(node.modifier);
                }
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

    const isWeaponMaster = activeModifiers.includes('WEAPON_MASTER');

    const equippedSets: Record<string, number> = {};

    Object.values(adventurer.slots).forEach((item) => {
        if (item) {
          if (item.setId) {
              equippedSets[item.setId] = (equippedSets[item.setId] || 0) + 1;
          }

          if (isWeaponMaster && item.type === ItemType.TRINKET) return;

          let multiplier = 1.0;
          if (isWeaponMaster && item.type === ItemType.WEAPON) multiplier = 2.0; 

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

          if (item.uniqueEffectId) {
              const unique = UNIQUE_EFFECT_REGISTRY.find(u => u.id === item.uniqueEffectId);
              if (unique && unique.effect) unique.effect(stats);
          }
        }
    });

    Object.entries(equippedSets).forEach(([setId, count]) => {
        const setDef = ITEM_SETS.find(s => s.id === setId);
        if (setDef && count >= setDef.requiredPieces) {
            setDef.effect(stats);
        }
    });

    const spec = calculateAdventurerSpecialization(adventurer);
    const bonus = 1 + spec.efficiencyBonus;

    if (spec.type === 'COMBAT') {
        stats.damage *= bonus;
        stats.health *= bonus;
    } else if (spec.type === 'GATHERING') {
        stats.goldGain = (stats.goldGain + 1) * bonus - 1; 
        stats.lootLuck += spec.efficiencyBonus; 
    } else if (spec.type === 'FISHING') {
        stats.lootLuck += spec.efficiencyBonus * 2; 
    } else if (spec.type === 'HYBRID') {
        stats.damage *= (1 + (spec.efficiencyBonus / 2));
        stats.goldGain += (spec.efficiencyBonus / 2);
    }

    const ascensionBonuses = getAscensionBonuses(state.ascensionCount || 0);
    const totalPowerMult = (1 + ascensionBonuses.powerGrowth);

    stats.damage *= totalPowerMult;
    stats.health *= totalPowerMult;

    const consumableBonuses = calculateConsumableBonuses(state.activeConsumables || []);
    stats.damage *= consumableBonuses.POWER;
    stats.goldGain = (stats.goldGain + 1) * consumableBonuses.GOLD - 1;
    stats.xpGain = (stats.xpGain + 1) * consumableBonuses.XP - 1;

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

export const calculateItemPotential = (item: Item): { score: number, tier: Item['visualTier'] } => {
    let score = 0;
    
    item.stats.forEach(stat => {
        let val = stat.value;
        if (stat.isPercentage) val *= 10; 
        
        if (stat.name === 'Damage') score += val * 1.5;
        else if (stat.name === 'Health') score += val * 0.5;
        else if (stat.name === 'Speed') score += val * 2.0;
        else if (stat.name === 'Crit Chance') score += val * 2.0;
        else score += val;
    });

    const rarityMult = {
        'Common': 1,
        'Uncommon': 1.2,
        'Rare': 1.5,
        'Epic': 2.0,
        'Legendary': 3.0
    }[item.rarity] || 1;

    if (item.setId) score *= 1.2;
    if (item.uniqueEffectId) score *= 1.5;

    const normalizedScore = Math.floor((score * rarityMult) / (1 + item.level * 0.5));

    let tier: Item['visualTier'] = 'D';
    if (normalizedScore > 150) tier = 'S';
    else if (normalizedScore > 100) tier = 'A';
    else if (normalizedScore > 60) tier = 'B';
    else if (normalizedScore > 30) tier = 'C';

    return { score: Math.floor(normalizedScore), tier };
};

export const calculateItemRating = (item: Item): number => {
    return calculateItemPotential(item).score; 
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

  const mastery = calculateMasteryBonus(state);
  const asc = getAscensionBonuses(state.ascensionCount || 0);
  duration *= (1 - asc.durationReduction);

  const consumableBonuses = calculateConsumableBonuses(state.activeConsumables || []);
  duration *= consumableBonuses.SPEED;

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

export const generateAdventurer = (id?: string, _placeholderName?: string): Adventurer => {
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
    return 7; 
};

const POSSIBLE_AFFIXES = [
    { name: 'Crit Chance', basePower: 1.5, weight: 1 },
    { name: 'Speed', basePower: 1.5, weight: 1 },
    { name: 'Damage', basePower: 2.0, weight: 1 },
    { name: 'Health', basePower: 2.0, weight: 1 },
    { name: 'Gold Gain', basePower: 2.0, weight: 0.5 },
    { name: 'Loot Luck', basePower: 1.0, weight: 0.3 },
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

export const generateItem = (dungeonLevel: number, forcedRarity: Rarity, prestigeUpgrades: { [id: string]: number } = {}, specificType?: ItemType, specificSubtype?: WeaponType): Item => {
  const rarity = forcedRarity;
  const config = RARITY_CONFIG[rarity];

  let type = specificType;
  if (!type) {
      const typeRoll = Math.random();
      type = typeRoll < 0.33 ? ItemType.WEAPON : typeRoll < 0.66 ? ItemType.ARMOR : ItemType.TRINKET;
  }

  let subtype = WeaponType.NONE;
  let classRestriction: AdventurerRole[] = [];
  let nameSuffix = "";

  if (type === ItemType.WEAPON) {
      if (specificSubtype) {
          subtype = specificSubtype;
      } else {
          const weaponTypes = [WeaponType.SWORD, WeaponType.BLUNT, WeaponType.DAGGER, WeaponType.BOW, WeaponType.STAFF, WeaponType.BOOK];
          subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      }
      
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

  let assignedSetId: string | undefined = undefined;
  let assignedUniqueId: string | undefined = undefined;
  let identityTag: string | undefined = undefined;

  if ((rarity === Rarity.RARE || rarity === Rarity.EPIC || rarity === Rarity.LEGENDARY) && Math.random() < 0.15) {
      const set = ITEM_SETS[Math.floor(Math.random() * ITEM_SETS.length)];
      assignedSetId = set.id;
      nameSuffix = `of ${set.name}`;
  }

  if (rarity === Rarity.LEGENDARY) {
      const unique = UNIQUE_EFFECT_REGISTRY[Math.floor(Math.random() * UNIQUE_EFFECT_REGISTRY.length)];
      assignedUniqueId = unique.id;
      nameSuffix = `of ${unique.name}`;
      identityTag = "Ancient Artifact";
  } else if (rarity === Rarity.EPIC && Math.random() < 0.2) {
      const uniqueStat = UNIQUE_EFFECTS[Math.floor(Math.random() * UNIQUE_EFFECTS.length)];
      stats.push({
          name: uniqueStat.name, 
          value: uniqueStat.value,
          isPercentage: true,
          tier: 0 
      });
  }

  if (!identityTag && mainStatTier <= 2) {
      identityTag = "Pristine";
  }

  const goldValue = Math.ceil(statBudget * 3 * (1 + affixesGenerated * 0.2) * (assignedSetId ? 1.5 : 1) * (assignedUniqueId ? 2 : 1));

  const tempItem: Item = {
    id: crypto.randomUUID(),
    name: `${rarity} ${nameSuffix}`, 
    type,
    subtype,
    classRestriction,
    rarity,
    level: dungeonLevel,
    stats,
    value: goldValue,
    potential: 0,
    visualTier: 'D',
    setId: assignedSetId,
    uniqueEffectId: assignedUniqueId,
    identityTag
  };

  const potential = calculateItemPotential(tempItem);

  return {
      ...tempItem,
      potential: potential.score,
      visualTier: potential.tier
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

export const calculateItemUpgradeCost = (item: Item, type: 'ENCHANT' | 'REROLL'): { gold: number, resources: ResourceCost[] } => {
    const rarityMult = CRAFTING_RARITY_MULTIPLIERS[item.rarity];
    const potentialMult = 1 + (item.potential / 200); 
    
    let gold = 0;
    const resources: ResourceCost[] = [];
    const matScale = Math.max(1, Math.floor(item.level / 5));

    if (type === 'ENCHANT') {
        const statsCount = Math.max(1, item.stats.length);
        gold = Math.floor(ENCHANT_COST_BASE * item.level * rarityMult * statsCount * potentialMult);
        
        if (item.rarity === Rarity.UNCOMMON) {
            resources.push({ resourceId: 'iron_ore', amount: 3 * matScale });
        } else if (item.rarity === Rarity.RARE) {
            resources.push({ resourceId: 'iron_ore', amount: 5 * matScale });
            resources.push({ resourceId: 'hardwood', amount: 3 * matScale });
        } else if (item.rarity === Rarity.EPIC) {
            resources.push({ resourceId: 'mystic_herb', amount: 2 * matScale });
            resources.push({ resourceId: 'prism_pearl', amount: 1 });
        } else if (item.rarity === Rarity.LEGENDARY) {
            resources.push({ resourceId: 'ancient_relic', amount: 1 });
            resources.push({ resourceId: 'prism_pearl', amount: 3 });
        }

    } else {
        gold = Math.floor(REROLL_COST_BASE * item.level * rarityMult * potentialMult);

        if (item.rarity === Rarity.UNCOMMON) {
            resources.push({ resourceId: 'iron_ore', amount: 1 * matScale });
        } else if (item.rarity === Rarity.RARE) {
            resources.push({ resourceId: 'iron_ore', amount: 2 * matScale });
            resources.push({ resourceId: 'hardwood', amount: 1 * matScale });
        } else if (item.rarity === Rarity.EPIC) {
            resources.push({ resourceId: 'mystic_herb', amount: 1 * matScale });
        } else if (item.rarity === Rarity.LEGENDARY) {
            resources.push({ resourceId: 'prism_pearl', amount: 1 });
        }
    }

    return { gold, resources };
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
