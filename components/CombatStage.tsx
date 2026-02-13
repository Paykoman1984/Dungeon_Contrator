
import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../services/GameContext';
import { useVisuals } from '../services/VisualContext';
import { DUNGEONS, ENEMIES, DUNGEON_THEMES } from '../constants';
import { Skull, Zap, Ghost, Eye, Swords } from 'lucide-react';
import { getAdventurerStats, getRealmBonuses, applyDungeonMechanic } from '../utils/gameMath';
import { AdventurerAvatar } from './AdventurerAvatar';
import { FloatingTextLayer } from './FloatingTextLayer';

interface CombatStageProps {
    dungeonId: string;
    adventurerIds: string[];
}

export const CombatStage: React.FC<CombatStageProps> = ({ dungeonId, adventurerIds }) => {
    const { state } = useGame();
    const { emitFeedback } = useVisuals();
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    const enemy = dungeon ? ENEMIES[dungeon.enemyId] : null;
    const theme = dungeon?.visualTag ? DUNGEON_THEMES[dungeon.visualTag] : DUNGEON_THEMES['CAVE'];

    // Visual State
    const [isClashing, setIsClashing] = useState(false);
    const [heroState, setHeroState] = useState<Record<string, 'IDLE' | 'ATTACK' | 'HIT'>>({});
    const [enemyState, setEnemyState] = useState<'IDLE' | 'ATTACK' | 'HIT'>('IDLE');
    
    // We filter out any undefined adventurers to be safe
    const party = adventurerIds.map(id => state.adventurers.find(a => a.id === id)).filter(Boolean);
    const lastAttackTime = useRef<Record<string, number>>({});

    // Simulation Loop
    useEffect(() => {
        if (!party.length || !enemy || !dungeon) return;

        // Calculate Realm/Mechanic modifiers for Enemy Power
        const realmBonuses = getRealmBonuses(state.realm, dungeonId);
        const mech = applyDungeonMechanic(dungeon.mechanicId, dungeon.tier, state.realm.realmRank);
        const effectiveEnemyPower = Math.floor(dungeon.recommendedPower * realmBonuses.enemyPowerMultiplier * mech.powerReqMult);
        
        // Estimate Enemy Damage based on Power (approx Power / 6)
        const baseEnemyDmg = Math.max(1, Math.floor(effectiveEnemyPower / 6));

        const interval = setInterval(() => {
            const now = Date.now();

            // 1. Hero Attacks
            party.forEach((hero, idx) => {
                if (!hero) return;
                const stats = getAdventurerStats(hero, state);
                
                // Align speed with DPS formula: 1.0 Speed = 1 attack/sec = 1000ms delay
                const speedMs = 1000 / Math.max(0.1, stats.speed);
                const last = lastAttackTime.current[hero.id] || 0;

                if (now - last > speedMs) {
                    lastAttackTime.current[hero.id] = now + (Math.random() * 100); // Slight jitter to prevent perfect stacking
                    
                    // Animate Hero Lunge
                    setHeroState(prev => ({ ...prev, [hero.id]: 'ATTACK' }));
                    setTimeout(() => setHeroState(prev => ({ ...prev, [hero.id]: 'IDLE' })), 200);

                    // Clash center
                    setIsClashing(true);
                    setTimeout(() => setIsClashing(false), 150);

                    // Hit Enemy
                    setTimeout(() => {
                        setEnemyState('HIT');
                        setTimeout(() => setEnemyState('IDLE'), 150);
                        
                        const isCrit = Math.random() < stats.critChance;
                        const critMult = isCrit ? 1.5 : 1.0;
                        // Reduced variance: 0.9 to 1.1 multiplier
                        const variance = 0.9 + Math.random() * 0.2; 
                        
                        const dmg = Math.floor(stats.damage * critMult * variance);
                        
                        emitFeedback({
                            type: isCrit ? 'CRIT' : 'DAMAGE',
                            value: dmg,
                            intensity: isCrit ? 'MAJOR' : 'MINOR',
                            position: { x: 75, y: 40 + Math.random() * 20 },
                            contextId: dungeonId
                        });
                    }, 100);
                }
            });

            // 2. Enemy Attacks
            const enemyLast = lastAttackTime.current['enemy'] || 0;
            const enemySpeedMs = 2000; // Enemies attack slower by default (2s)

            if (now - enemyLast > enemySpeedMs) {
                lastAttackTime.current['enemy'] = now;
                setEnemyState('ATTACK');
                setTimeout(() => setEnemyState('IDLE'), 300);

                // Clash center
                setIsClashing(true);
                setTimeout(() => setIsClashing(false), 150);

                // Hit random hero
                const targetIdx = Math.floor(Math.random() * party.length);
                const target = party[targetIdx];
                if (target) {
                    setTimeout(() => {
                        setHeroState(prev => ({ ...prev, [target.id]: 'HIT' }));
                        setTimeout(() => setHeroState(prev => ({ ...prev, [target.id]: 'IDLE' })), 300);
                        
                        // Calculate damage based on Dungeon Power, not Player Health
                        const variance = 0.8 + Math.random() * 0.4;
                        const dmg = Math.max(1, Math.floor(baseEnemyDmg * variance));

                        // Emit damage on hero side (approximate position based on index)
                        emitFeedback({
                            type: 'DAMAGE',
                            value: dmg, 
                            intensity: 'MINOR',
                            color: 'text-red-500 font-bold',
                            position: { x: 20 + (targetIdx * 5), y: 50 },
                            contextId: dungeonId
                        });
                    }, 150);
                }
            }

        }, 100); 

        return () => clearInterval(interval);
    }, [party, enemy, state, emitFeedback, dungeonId, dungeon]); // Dependencies ensure fresh stats are used

    if (!dungeon || !enemy || !theme) return null;

    return (
        <div className="relative w-full h-32 rounded-lg mb-4 overflow-hidden border-2 border-stone-800 bg-black shadow-2xl group select-none flex items-center justify-between px-8">
            
            {/* --- BACKGROUND LAYERS --- */}
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-20`}></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] z-0 pointer-events-none"></div>

            {/* Floating Text Overlay */}
            <FloatingTextLayer contextId={dungeonId} />

            {/* --- LEFT: HEROES --- */}
            <div className="flex -space-x-4 items-center z-10 relative">
                {party.map((hero, idx) => {
                    if (!hero) return null;
                    const status = heroState[hero.id] || 'IDLE';
                    
                    let transform = 'translate-x-0 scale-100';
                    let filter = 'brightness-100';
                    
                    if (status === 'ATTACK') {
                        transform = 'translate-x-6 scale-110 rotate-3 z-50'; // Lunge right
                    } else if (status === 'HIT') {
                        transform = '-translate-x-2 scale-90 rotate-[-5deg]'; // Recoil left
                        filter = 'brightness-200 sepia saturate-200 hue-rotate-[-50deg]'; // Flash Red-ish
                    }

                    return (
                        <div 
                            key={hero.id} 
                            className={`transition-all duration-200 ease-out transform ${transform} ${filter}`}
                            style={{ zIndex: 10 + idx }}
                        >
                            <div className="relative group shadow-xl">
                                <AdventurerAvatar 
                                    adventurer={hero} 
                                    size="lg"
                                    className="border-2 border-stone-800 rounded bg-black"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- CENTER: FIGHT INDICATOR --- */}
            <div className="z-10 flex flex-col items-center justify-center opacity-80">
                <div className={`
                    text-stone-500 transition-all duration-100 transform
                    ${isClashing ? 'scale-150 text-red-500 rotate-12' : 'scale-100'}
                `}>
                    <Swords size={32} />
                </div>
            </div>

            {/* --- RIGHT: ENEMY --- */}
            <div className="z-10 relative">
                <div className={`
                    relative w-16 h-16 rounded border-2 border-red-900/50 bg-black overflow-hidden shadow-xl
                    transition-all duration-200 ease-out
                    ${enemyState === 'ATTACK' ? '-translate-x-6 scale-110 rotate-[-3deg]' : ''} 
                    ${enemyState === 'HIT' ? 'translate-x-2 scale-90 brightness-200 sepia saturate-200 hue-rotate-[-50deg]' : ''}
                    ${isClashing && enemyState === 'IDLE' ? 'translate-x-1' : ''}
                `}>
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50">
                            <EnemyVisual id={dungeon.enemyId} />
                    </div>
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                </div>
                
                {/* Nameplate */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest bg-black/80 px-2 py-0.5 rounded">
                        {enemy.name}
                    </span>
                </div>
            </div>

        </div>
    );
};

const EnemyVisual: React.FC<{ id: string }> = ({ id }) => {
    const style = "text-4xl filter sepia contrast-125 opacity-80";
    
    if (id.includes('rat')) return <span className={style}>🐀</span>;
    if (id.includes('goblin')) return <span className={style}>👺</span>;
    if (id.includes('wolf')) return <span className={style}>🐺</span>;
    if (id.includes('skeleton')) return <Skull size={32} className="text-stone-400 opacity-80" />;
    if (id.includes('dragon')) return <span className={style}>🐲</span>;
    if (id.includes('void')) return <Eye size={32} className="text-indigo-900 opacity-80" />;
    
    return <Ghost size={32} className="text-stone-600 opacity-60" />;
};
