
import React, { useEffect, useState } from 'react';
import { visualBus } from '../services/VisualContext';
import { FeedbackEvent } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

export const FloatingTextLayer: React.FC = () => {
    const [events, setEvents] = useState<FeedbackEvent[]>([]);

    useEffect(() => {
        const unsubscribe = visualBus.subscribe((event) => {
            // Only handle minor/combat events here. Major events go to RewardOverlay.
            if (['DAMAGE', 'HEAL', 'GOLD', 'XP', 'CRIT'].includes(event.type)) {
                setEvents(prev => [...prev, event]);
                
                // Cleanup
                setTimeout(() => {
                    setEvents(prev => prev.filter(e => e.id !== event.id));
                }, 1000);
            }
        });
        return unsubscribe;
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {events.map((ev) => {
                    const x = ev.position ? ev.position.x : 50;
                    const y = ev.position ? ev.position.y : 50;
                    
                    // Randomize slightly
                    const rx = (Math.random() - 0.5) * 10; 
                    const ry = (Math.random() - 0.5) * 10;

                    let color = 'text-white';
                    let scale = 1;
                    let text = ev.value;

                    if (ev.type === 'DAMAGE') { color = 'text-white'; scale = 0.8; }
                    if (ev.type === 'CRIT') { color = 'text-yellow-400 font-bold'; scale = 1.5; text = `Crit! ${ev.value}`; }
                    if (ev.type === 'HEAL') { color = 'text-green-400'; }
                    if (ev.type === 'XP') { color = 'text-blue-400 text-xs'; text = `+${ev.value} XP`; }
                    if (ev.type === 'GOLD') { color = 'text-amber-400 text-xs'; text = `+${ev.value} g`; }

                    return (
                        <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, x: `${x + rx}%`, y: `${y + ry}%`, scale: 0.5 }}
                            animate={{ opacity: [1, 1, 0], y: `${y - 15}%`, scale: scale }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`absolute font-mono pointer-events-none drop-shadow-md ${color}`}
                            style={{ 
                                left: 0, top: 0, // Positioning handled by translate in motion
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}
                        >
                            {text}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
