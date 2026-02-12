
export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
}

export enum ItemType {
  WEAPON = 'Weapon',
  ARMOR = 'Armor',
  TRINKET = 'Trinket',
}

export enum ContractType {
    DUNGEON = 'Dungeon',
    GATHERING = 'Gathering',
    FISHING = 'Fishing'
}

export enum WeaponType {
  SWORD = 'Sword',
  BLUNT = 'Blunt', // Mace, Hammer
  DAGGER = 'Dagger',
  BOW = 'Bow',
  STAFF = 'Staff',
  BOOK = 'Book',
  NONE = 'None' // For Armor/Trinkets
}

export enum AdventurerRole {
  WARRIOR = 'Warrior',
  ROGUE = 'Rogue',
  MAGE = 'Mage',
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
}

// --- VISUAL IDENTITY SYSTEM ---

export type VisualEventType = 'DAMAGE' | 'HEAL' | 'GOLD' | 'XP' | 'CRIT' | 'LEVEL_UP' | 'DROP';

export interface FeedbackEvent {
    id: string;
    type: VisualEventType;
    value?: string | number;
    position?: { x: number; y: number }; // Percentage 0-100
    intensity: 'MINOR' | 'MAJOR' | 'EPIC';
    color?: string;
    icon?: string;
}

export interface RarityVisualDefinition {
    borderColor: string;
    bgColor: string;
    textColor: string;
    glowIntensity: string; // CSS box-shadow value
    animationClass?: string;
    particleColor: string;
}

export interface DungeonVisualDefinition {
    themeId: string;
    gradient: string;
    overlayColor: string;
    particleType: 'DUST' | 'EMBER' | 'SPORE' | 'VOID' | 'BUBBLE';
    accentColor: string;
}

// --- SPECIALIZATION SYSTEM ---

export type SpecializationType = 'COMBAT' | 'GATHERING' | 'FISHING' | 'HYBRID';

export interface SpecializationData {
    type: SpecializationType;
    label: string; // e.g., "Combat Specialist"
    scores: {
        combat: number;
        gathering: number;
        fishing: number;
    };
    efficiencyBonus: number; // 0.05 to 0.10
    color: string; // Hex or Tailwind class ref
}

// --- NEW TRAIT SYSTEM ---

export type TraitType = 'COMBAT' | 'GATHERING' | 'FISHING' | 'HYBRID';

export interface Trait {
    id: string;
    name: string;
    description: string;
    rarity: 'Common' | 'Rare' | 'Epic';
    type: TraitType;
    effect: (stats: any) => void;
}

export interface AdventurerTrait {
    id: string;
    name: string;
    description: string;
    effect: (stats: any, state: any) => void; 
}

export type SkillModifier = 
    | 'NONE'
    | 'WEAPON_MASTER' 
    | 'RESOURCE_SCAVENGER' 
    | 'GAMBLER' 
    | 'METHODICAL' 
    | 'RUSH' 
    | 'TITAN_GRIP' 
    | 'GLASS_CANNON' 
    | 'GOLDEN_TOUCH' 
    | 'SPEED_DEMON' 
    | 'BOSS_KILLER' 
    | 'LOGISTICIAN'; 

export interface SkillTemplate {
    name: string;
    description: string;
    icon: string;
    effectType: 'STAT' | 'ECONOMY' | 'SPEED' | 'MODIFIER';
    effectValue: number;
    statTarget?: string;
    exclusiveGroup?: string;
    modifier?: SkillModifier;
    poolType?: TraitType; // For generation bias
}

export interface SkillNode {
    id: string;
    name: string;
    description: string;
    icon: string; 
    x: number; 
    y: number; 
    requires: string[]; 
    maxLevel: number; 
    cost: number;
    effectType: 'STAT' | 'ECONOMY' | 'SPEED' | 'MODIFIER';
    effectValue: number; 
    statTarget?: string; 
    exclusiveGroup?: string; 
    modifier?: SkillModifier; 
}

// --- RESOURCE UTILIZATION SYSTEM ---

export interface ResourceCost {
    resourceId: string;
    amount: number;
}

export type ConsumableType = 'POWER' | 'SPEED' | 'GOLD' | 'XP';

export interface ConsumableDef {
    id: string;
    name: string;
    description: string;
    duration: number; // in ms
    effectType: ConsumableType;
    effectValue: number;
    cost: ResourceCost[];
    goldCost: number;
}

export interface ActiveConsumable {
    id: string;
    defId: string;
    startTime: number;
    endTime: number;
}

export interface CraftingRecipe {
    id: string;
    name: string;
    targetType: ItemType;
    targetSubtype?: WeaponType;
    targetRarity: Rarity;
    targetLevel: number; // Base level for crafted item
    cost: ResourceCost[];
    goldCost: number;
    description: string;
}

// --- REALM EVOLUTION SYSTEM ---

export interface RealmModifier {
    id: string;
    name: string;
    description: string;
    unlockRank: number;
    enemyPowerMult: number; // Multiplies base requirement
    lootYieldMult: number; // Multiplies gold/xp
    rarityShiftBonus: number; // Adds to rarity weights
    unlockCost?: ResourceCost[]; // Cost to unlock permanently
}

export interface RealmState {
    realmTier: number; // HARD PROGRESSION (Ascension Only)
    realmRank: number; // SOFT PROGRESSION (XP Based)
    realmExperience: number;
    // Map of DungeonID -> Array of Active Modifier IDs
    activeModifiers: Record<string, string[]>;
    // Permanently unlocked modifiers (by ID)
    unlockedModifiers: string[]; 
}

// --- DUNGEON MECHANICS ---

export type DungeonMechanicId = 'NONE' | 'SWARM' | 'PACK_TACTICS' | 'UNDEAD_RESILIENCE' | 'RESOURCE_SURGE' | 'ELITE_HUNT';

export interface MechanicModifier {
    enemyHpMult: number;      // Multiplies Enemy HP (Higher = Slower kills)
    powerReqMult: number;     // Multiplies Recommended Power
    xpYieldMult: number;      // Multiplies XP per kill
    goldYieldMult: number;    // Multiplies Gold per kill
    lootRollBonus: number;    // Adds flat loot rolls
    durationMult: number;     // Modifies run duration
    description: string;      // generated description of current effect
}

// --- GUILD MASTERY SYSTEM ---

export interface MasteryTrack {
    level: number;
    xp: number;
}

export interface GuildMastery {
    combat: MasteryTrack;
    gathering: MasteryTrack;
    fishing: MasteryTrack;
}

export interface MasteryEffects {
    combat: {
        durationReduction: number; 
        damageConsistency: number; 
        xpBonus: number; 
        milestones: string[];
    };
    gathering: {
        durationReduction: number;
        doubleYieldChance: number; 
        rareMaterialBonus: number; 
        milestones: string[];
    };
    fishing: {
        durationReduction: number;
        doubleCatchChance: number; 
        rareFishBonus: number;
        milestones: string[];
    };
}

// --- ITEM IDENTITY & SETS ---

export interface ItemSet {
    id: string;
    name: string;
    requiredPieces: number;
    description: string;
    effect: (stats: any) => void;
}

export interface UniqueEffect {
    id: string;
    name: string;
    description: string;
    effect?: (stats: any) => void; // Stat modifier if applicable
    trigger?: string; // e.g., "ON_KILL", "ON_HIT" (For engine use)
}

export interface ItemStat {
  name: string;
  value: number;
  isPercentage: boolean;
  tier: number; // 0 (Unique/Bonus), 1 (Best) to 7 (Worst)
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: WeaponType; 
  classRestriction: AdventurerRole[]; 
  rarity: Rarity;
  level: number;
  stats: ItemStat[];
  value: number;
  
  // New Identity Layer
  potential: number; // 0-100+ Score
  visualTier: 'S' | 'A' | 'B' | 'C' | 'D'; // Calculated from potential
  identityTag?: string; // "Ancient", "Pristine", etc.
  
  // Set & Unique
  setId?: string;
  uniqueEffectId?: string;
}

export interface Material {
    id: string;
    name: string;
    rarity: Rarity;
    description: string;
    value: number;
}

export interface Adventurer {
  id: string;
  name: string;
  title: string; 
  role: AdventurerRole;
  rarity: Rarity;
  
  // Combat Skill (Primary)
  level: number; 
  xp: number;
  xpToNextLevel: number;
  
  // Proficiency Skills
  gatheringLevel: number;
  gatheringXp: number;
  
  fishingLevel: number;
  fishingXp: number;

  // Hybrid System Fields
  traits: Trait[]; // The 3 generated traits
  specialization: string; // "Battle Mage", "Angler", etc.
  
  // Legacy support (to be deprecated or mapped)
  traitId: string; 

  skillPoints: number; 
  unlockedSkills: string[]; 
  skillTree: SkillNode[]; 
  archetype?: string; 

  slots: {
    [ItemType.WEAPON]: Item | null;
    [ItemType.ARMOR]: Item | null;
    [ItemType.TRINKET]: Item | null;
  };
  baseStats: {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
  };
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  xpMin: number;
  xpMax: number;
  goldMin: number;
  goldMax: number;
}

export interface UnlockRequirements {
    minPower?: number;
    minGuildLevel?: number;
    minAscension?: number;
    previousDungeonId?: string;
    previousDungeonClears?: number;
    goldCost?: number;
}

export interface Dungeon {
  id: string;
  name: string;
  type: ContractType; 
  tier: number; 
  level: number; 
  description: string;
  durationSeconds: number;
  enemyId: string; 
  dropChance: number; 
  recommendedPower: number; 
  lootTable?: string[]; 
  unlockReq?: UnlockRequirements;
  mechanicId?: DungeonMechanicId; // NEW: Unique Identity
  visualTag?: string; // e.g., "CRYPT", "FOREST"
}

export interface RunSnapshot {
    dps: number;
    power: number;
    goldBonus: number;
    xpBonus: number;
    lootBonus: number;
    activeModifiers: string[]; 
}

export interface ActiveRun {
  id: string; 
  dungeonId: string;
  adventurerIds: string[]; 
  startTime: number;
  duration: number; 
  runsRemaining: number;
  totalRuns: number;
  autoRepeat: boolean; 
  snapshot: RunSnapshot;
  adventurerState: Record<string, Adventurer>;
  modifiedSlots?: Record<string, ItemType[]>;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  level: number;
  maxLevel: number;
  effect: (level: number) => number;
  type: 'ECONOMY' | 'COMBAT' | 'SPEED' | 'LOOT';
  // Optional Resource Cost per level
  resourceCost?: (level: number) => ResourceCost[];
}

export interface PrestigeUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number; 
    costMultiplier: number;
    level: number;
    maxLevel: number;
    effect: (level: number) => number;
}

export interface DungeonReport {
  id: string;
  dungeonName: string;
  success: boolean;
  kills: number; 
  goldEarned: number;
  xpEarned: number;
  itemsFound: Item[];
  materialsFound: Record<string, number>; 
  autoSalvagedCount: number; 
  autoSalvagedGold: number; 
  timestamp: number;
  realmXpEarned?: number; 
  bonusesTriggered?: string[]; 
}

export interface LootFilterSettings {
    unlocked: boolean;
    enabled: boolean;
    minRarity: Rarity; 
    keepTypes: ItemType[]; 
    matchAnyStat: string[]; 
}

// --- REWARD FEEDBACK SYSTEM ---

export enum RewardSeverity {
    MINOR = 'MINOR',
    MAJOR = 'MAJOR',
    EPIC = 'EPIC'
}

export enum RewardEventType {
    ITEM_DROP = 'ITEM_DROP',
    ADVENTURER_LEVEL_UP = 'ADVENTURER_LEVEL_UP',
    MASTERY_LEVEL_UP = 'MASTERY_LEVEL_UP',
    REALM_LEVEL_UP = 'REALM_LEVEL_UP',
    ASCENSION = 'ASCENSION',
    DUNGEON_UNLOCK = 'DUNGEON_UNLOCK'
}

export interface RewardEvent {
    id: string;
    type: RewardEventType;
    severity: RewardSeverity;
    message: string;
    entityId?: string; // ID of item, adventurer, etc.
    metadata?: Record<string, any>;
    timestamp: number;
}

export interface GameState {
  // --- RUN STATE ---
  startTime: number; 
  gold: number;
  adventurers: Adventurer[];
  recruitmentPool: Adventurer[]; 
  refreshCost: number;
  inventory: Item[];
  activeRuns: ActiveRun[];
  materials: Record<string, number>;
  activeConsumables: ActiveConsumable[]; // New
  
  // --- META STATE ---
  prestigeCurrency: number;
  ascensionCount: number; 
  unlockedDungeons: string[]; 
  upgrades: { [id: string]: number }; 
  prestigeUpgrades: { [id: string]: number }; 
  guildMastery: GuildMastery; 
  
  // --- WORLD EVOLUTION (PERMANENT) ---
  realm: RealmState;

  // --- SETTINGS / MISC ---
  lootFilter: LootFilterSettings; 
  lastParties: Record<string, string[]>; 
  recentReports: DungeonReport[]; 
  lastSaveTime: number;
  statistics: {
    totalGoldEarned: number;
    monstersKilled: number;
    dungeonsCleared: number;
    dungeonClears: Record<string, number>; 
  };
  legendaryPityCounter: number; 
  
  // --- EVENT SYSTEM ---
  rewardEventQueue: RewardEvent[];
}
