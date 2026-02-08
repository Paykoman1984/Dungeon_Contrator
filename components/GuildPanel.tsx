import React from 'react';
import { useGame } from '../services/GameContext';
import { UPGRADES } from '../constants';
import { formatNumber, calculateGuildLevel } from '../utils/gameMath';
import { TrendingUp, Coins, Zap, Box, Activity, Crown, Scroll, Skull } from 'lucide-react';

export const GuildPanel: React.FC = () => {
  const { state, buyUpgrade } = useGame();

  const getIcon = (type: string) => {
      switch(type) {
          case 'ECONOMY': return <Coins size={20} className="text-yellow-400" />;
          case 'SPEED': return <Zap size={20} className="text-blue-400" />;
          case 'LOOT': return <Box size={20} className="text-purple-400" />;
          default: return <TrendingUp size={20} className="text-red-400" />;
      }
  };

  // Calculate Active Bonuses
  const getEffectValue = (id: string) => {
      const level = state.upgrades[id] || 0;
      const upgrade = UPGRADES.find(u => u.id === id);
      return upgrade ? upgrade.effect(level) : 0;
  };

  const damageBonus = getEffectValue('recruit_training');
  const goldBonus = getEffectValue('marketplace_connections') * 100; // Convert to %
  const speedBonus = Math.min(getEffectValue('logistics_network'), 0.5) * 100; // Cap at 50% visually as per math utils
  const lootBonus = getEffectValue('loot_logic') * 100;

  // Calculate Guild Level
  const guildLevel = calculateGuildLevel(state.statistics.totalGoldEarned);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
      {/* Left Column: Upgrades (2/3 width on large screens) */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Zap className="text-yellow-500" size={24}/>
            Operations Upgrade
        </h2>
        <div className="grid grid-cols-1 gap-4">
            {UPGRADES.map(upgrade => {
                const currentLevel = state.upgrades[upgrade.id] || 0;
                const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, currentLevel));
                const canAfford = state.gold >= cost;
                const isMax = currentLevel >= upgrade.maxLevel;

                return (
                    <div key={upgrade.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-600">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 shadow-inner">
                                {getIcon(upgrade.type)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 text-lg">{upgrade.name}</h3>
                                <p className="text-sm text-slate-400">{upgrade.description}</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                        Lvl {currentLevel} / {upgrade.maxLevel}
                                    </span>
                                    {/* Show next level effect preview if not max */}
                                    {!isMax && (
                                        <span className="text-xs text-green-400/80">
                                            Next: +{upgrade.effect(currentLevel + 1) - upgrade.effect(currentLevel) < 1 
                                                ? `${((upgrade.effect(currentLevel + 1) - upgrade.effect(currentLevel)) * 100).toFixed(0)}%`
                                                : upgrade.effect(currentLevel + 1) - upgrade.effect(currentLevel)
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => buyUpgrade(upgrade.id)}
                            disabled={!canAfford || isMax}
                            className={`
                                w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-bold flex flex-col items-center justify-center transition-all active:scale-95
                                ${isMax 
                                    ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-default' 
                                    : canAfford 
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }
                            `}
                        >
                            {isMax ? (
                                <span>MAX LEVEL</span>
                            ) : (
                                <>
                                    <span>UPGRADE</span>
                                    <span className={`text-xs font-mono ${canAfford ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {formatNumber(cost)} g
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )
            })}
        </div>
      </div>

      {/* Right Column: Guild Resume / Stats (1/3 width) */}
      <div className="space-y-6">
          {/* Active Effects Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-900/50 p-4 border-b border-slate-700">
                  <h3 className="font-bold text-slate-200 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-400"/>
                      Active Bonuses
                  </h3>
              </div>
              <div className="p-4 space-y-4">
                  <StatRow 
                    label="Revenue Multiplier" 
                    value={`+${goldBonus.toFixed(0)}%`} 
                    icon={<Coins size={14} className="text-yellow-400"/>}
                    desc="Gold from dungeons"
                  />
                  <StatRow 
                    label="Logistics Speed" 
                    value={`+${speedBonus.toFixed(0)}%`} 
                    icon={<Zap size={14} className="text-blue-400"/>}
                    desc="Reduced dungeon time"
                  />
                  <StatRow 
                    label="Combat Training" 
                    value={`+${damageBonus}`} 
                    icon={<TrendingUp size={14} className="text-red-400"/>}
                    desc="Flat damage to all units"
                  />
                  <StatRow 
                    label="Loot Chance" 
                    value={`+${lootBonus.toFixed(0)}%`} 
                    icon={<Box size={14} className="text-purple-400"/>}
                    desc="Drop rate bonus"
                  />
              </div>
          </div>

          {/* Lifetime Stats Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-900/50 p-4 border-b border-slate-700">
                  <h3 className="font-bold text-slate-200 flex items-center gap-2">
                      <Crown size={18} className="text-yellow-500"/>
                      Lifetime Records
                  </h3>
              </div>
              <div className="p-4 space-y-4">
                  <StatRow 
                    label="Contracts Closed" 
                    value={formatNumber(state.statistics.dungeonsCleared)}
                    icon={<Scroll size={14} className="text-slate-400"/>}
                  />
                  <StatRow 
                    label="Total Revenue" 
                    value={formatNumber(state.statistics.totalGoldEarned)}
                    icon={<Coins size={14} className="text-yellow-400"/>}
                  />
                  <StatRow 
                    label="Threats Neutralized" 
                    value={formatNumber(state.statistics.monstersKilled)}
                    icon={<Skull size={14} className="text-red-400"/>}
                  />
              </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
             
             <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 flex justify-between items-center">
                 <span>Guild Reputation</span>
                 <Crown size={12} className="text-yellow-500" />
             </p>
             
             <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-white">Level {guildLevel.level}</p>
             </div>
             
             {/* Progress Bar */}
             <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700 mb-2">
                 <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" 
                    style={{ width: `${guildLevel.progress}%` }}
                 ></div>
             </div>
             
             <p className="text-[10px] text-slate-500 flex justify-between">
                 <span>Next Level:</span>
                 <span className="text-indigo-300 font-mono">{formatNumber(guildLevel.remaining)}g required</span>
             </p>
          </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; icon: React.ReactNode; desc?: string }> = ({ label, value, icon, desc }) => (
    <div className="flex items-center justify-between group">
        <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 bg-slate-900 rounded text-slate-400 border border-slate-800 group-hover:border-slate-600 transition-colors">
                {icon}
            </div>
            <div>
                <div className="text-sm font-medium text-slate-300">{label}</div>
                {desc && <div className="text-[10px] text-slate-500">{desc}</div>}
            </div>
        </div>
        <div className="font-mono font-bold text-slate-100 text-lg">{value}</div>
    </div>
);