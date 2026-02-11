
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

// --- REALM EVOLUTION SYSTEM ---

export interface RealmModifier {
    id: string;
    name: string;
    description: string;
    unlockRank: number;
    enemyPowerMult: number; // Multiplies base requirement
    lootYieldMult: number; // Multiplies gold/xp
    rarityShiftBonus: number; // Adds to rarity weights
}

export interface RealmState {
    realmRank: number;
    realmExperience: number;
    // Map of DungeonID -> Array of Active Modifier IDs
    activeModifiers: Record<string, string[]>;
}

// --- GUILD MASTERY SYSTEM (PERMANENT) ---

export interface MasteryTrack {
    level: number;
    xp: number;
}

export interface GuildMastery {
    combat: MasteryTrack;
    gathering: MasteryTrack;
    fishing: MasteryTrack;
}

// -------------------------------

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
  realmXpEarned?: number; // New field
}

export interface LootFilterSettings {
    unlocked: boolean;
    enabled: boolean;
    minRarity: Rarity; 
    keepTypes: ItemType[]; 
    matchAnyStat: string[]; 
}

export interface GameState {
  // --- RUN STATE ---
  gold: number;
  adventurers: Adventurer[];
  recruitmentPool: Adventurer[]; // TAVERN POOL
  refreshCost: number;
  inventory: Item[];
  activeRuns: ActiveRun[];
  materials: Record<string, number>;
  
  // --- META STATE ---
  prestigeCurrency: number;
  ascensionCount: number; 
  unlockedDungeons: string[]; 
  upgrades: { [id: string]: number }; 
  prestigeUpgrades: { [id: string]: number }; 
  guildMastery: GuildMastery; // Permanent Mastery Tracks
  
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
}
