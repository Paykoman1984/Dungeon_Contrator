import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../services/GameContext';
import { useVisuals } from '../services/VisualContext';
import { DUNGEONS, ENEMIES, ROLE_CONFIG, DUNGEON_THEMES } from '../constants';
import { Skull, ShieldAlert, Sparkles, Crosshair, Zap } from 'lucide-react';
import { getAdventurerStats } from '../utils/gameMath';
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
    const [heroState, setHeroState] = useState<Record<string, 'IDLE' | 'ATTACK' | 'HIT'>>({});
    const [enemyState, setEnemyState] = useState<'IDLE' | 'ATTACK' | 'HIT'>('IDLE');
    
    const party = adventurerIds.map(id => state.adventurers.find(a => a.id === id)).filter(Boolean);
    const lastAttackTime = useRef<Record<string, number>>({});

    // Simulation Loop
    useEffect(() => {
        if (!party.length || !enemy) return;

        const interval = setInterval(() => {
            const now = Date.now();

            // 1. Simulate Hero Attacks
            party.forEach(hero => {
                if (!hero) return;
                const stats = getAdventurerStats(hero, state);
                
                // Speed determines attack frequency (Visual only)
                // Base attack every 2000ms divided by speed
                const attackInterval = 2000 / stats.speed;
                const last = lastAttackTime.current[hero.id] || 0;

                if (now - last > attackInterval) {
                    // Trigger Attack
                    lastAttackTime.current[hero.id] = now + (Math.random() * 500); // jitter
                    
                    setHeroState(prev => ({ ...prev, [hero.id]: 'ATTACK' }));
                    setTimeout(() => setHeroState(prev => ({ ...prev, [hero.id]: 'IDLE' })), 300);

                    // Trigger Hit on Enemy slightly later
                    setTimeout(() => {
                        setEnemyState('HIT');
                        setTimeout(() => setEnemyState('IDLE'), 200);
                        
                        // Emit Damage Number
                        const isCrit = Math.random() < stats.critChance;
                        const dmg = Math.floor(stats.damage * (isCrit ? 1.5 : 1) * (0.8 + Math.random() * 0.4));
                        
                        emitFeedback({
                            type: isCrit ? 'CRIT' : 'DAMAGE',
                            value: dmg,
                            intensity: isCrit ? 'MAJOR' : 'MINOR',
                            position: { x: 75, y: 40 + Math.random() * 20 } // Target Enemy side
                        });

                    }, 200);
                }
            });

            // 2. Simulate Enemy Attacks
            // Simplified: Enemy attacks randomly every 2-4 seconds
            const enemyLast = lastAttackTime.current['enemy'] || 0;
            if (now - enemyLast > 3000) {
                lastAttackTime.current['enemy'] = now;
                setEnemyState('ATTACK');
                setTimeout(() => setEnemyState('IDLE'), 400);

                // Hit random hero
                const targetIdx = Math.floor(Math.random() * party.length);
                const target = party[targetIdx];
                if (target) {
                    setTimeout(() => {
                        setHeroState(prev => ({ ...prev, [target.id]: 'HIT' }));
                        setTimeout(() => setHeroState(prev => ({ ...prev, [target.id]: 'IDLE' })), 200);
                        
                        emitFeedback({
                            type: 'DAMAGE',
                            value: 'Hit!', // Or simulated damage
                            intensity: 'MINOR',
                            color: 'text-red-500',
                            position: { x: 20 + (targetIdx * 10), y: 50 } 
                        });
                    }, 200);
                }
            }

        }, 100); // Check loop

        return () => clearInterval(interval);
    }, [party, enemy, state]);

    if (!dungeon || !enemy || !theme) return null;

    return (
        <div className={`w-full h-40 rounded-xl mb-4 bg-gradient-to-r ${theme.gradient} relative overflow-hidden border border-white/10 flex items-center justify-between px-8 shadow-2xl group`}>
            
            {/* Visual Layers */}
            <div className={`absolute inset-0 ${theme.overlayColor} mix-blend-overlay`}></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
            
            {/* Particles (CSS Simulated) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute w-full h-full opacity-30 ${theme.particleType === 'EMBER' ? 'bg-ember-particles' : ''}`}></div>
            </div>

            {/* Floating Text Overlay */}
            <FloatingTextLayer />

            {/* --- LEFT SIDE: HEROES --- */}
            <div className="flex gap-4 z-10">
                {party.map((hero, idx) => {
                    if (!hero) return null;
                    const status = heroState[hero.id] || 'IDLE';
                    
                    let animClass = 'animate-float';
                    if (status === 'ATTACK') animClass = 'animate-lunge-right';
                    if (status === 'HIT') animClass = 'animate-shake-red';

                    return (
                        <div 
                            key={hero.id} 
                            className={`flex flex-col items-center justify-center transition-transform duration-100 ${animClass}`}
                            style={{ animationDelay: `${idx * 0.2}s` }}
                        >
                            {/* Hero Icon */}
                            <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2 relative
                                ${hero.role === 'Warrior' ? 'bg-red-900/90 border-red-500/50 text-red-200' : ''}
                                ${hero.role === 'Rogue' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-200' : ''}
                                ${hero.role === 'Mage' ? 'bg-blue-900/90 border-blue-500/50 text-blue-200' : ''}
                            `}>
                                {hero.role === 'Warrior' && <ShieldAlert size={24} />}
                                {hero.role === 'Rogue' && <Crosshair size={24} />}
                                {hero.role === 'Mage' && <Sparkles size={24} />}
                                
                                {/* Status Indicator */}
                                <div className="absolute -bottom-1 w-8 h-1 bg-black/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[90%]"></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* VS Effect */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 font-black text-8xl italic pointer-events-none text-white mix-blend-overlay">
                VS
            </div>

            {/* --- RIGHT SIDE: ENEMY --- */}
            <div className={`
                flex flex-col items-center justify-center z-10 relative
                ${enemyState === 'ATTACK' ? 'animate-lunge-left' : enemyState === 'HIT' ? 'animate-shake-white' : 'animate-float-slow'}
            `}>
                <div className={`
                    w-20 h-20 rounded-2xl border-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] relative bg-slate-950
                    ${enemyState === 'HIT' ? 'border-white' : 'border-red-900/50'}
                `}>
                    <EnemyIcon id={dungeon.enemyId} />
                    
                    {/* Level Badge */}
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900 shadow-lg">
                        {dungeon.level}
                    </div>
                </div>
                
                {/* Health Bar */}
                <div className="w-20 h-2 bg-slate-900/80 mt-3 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-gradient-to-r from-red-600 to-red-500 w-full animate-pulse-slow"></div>
                </div>
                
                <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded uppercase tracking-wider bg-black/60 ${theme.accentColor}`}>
                    {enemy.name}
                </span>
            </div>

        </div>
    );
};

const EnemyIcon: React.FC<{ id: string }> = ({ id }) => {
    if (id.includes('rat')) return <span className="text-4xl drop-shadow-md">🐀</span>;
    if (id.includes('goblin')) return <span className="text-4xl drop-shadow-md">👺</span>;
    if (id.includes('wolf')) return <span className="text-4xl drop-shadow-md">🐺</span>;
    if (id.includes('skeleton')) return <Skull size={40} className="text-slate-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />;
    if (id.includes('dragon')) return <span className="text-4xl drop-shadow-md">🐲</span>;
    if (id.includes('void')) return <Zap size={40} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.8)]" />;
    return <Skull size={40} className="text-red-500" />;
};