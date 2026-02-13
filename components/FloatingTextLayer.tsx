
import React, { useEffect, useState } from 'react';
import { visualBus } from '../services/VisualContext';
import { FeedbackEvent } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface FloatingTextLayerProps {
    contextId?: string;
}

export const FloatingTextLayer: React.FC<FloatingTextLayerProps> = ({ contextId }) => {
    const [events, setEvents] = useState<FeedbackEvent[]>([]);

    useEffect(() => {
        const unsubscribe = visualBus.subscribe((event) => {
            // Context Scoping Logic
            if (contextId && event.contextId !== contextId) return;

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
    }, [contextId]);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {events.map((ev) => {
                    const baseX = ev.position ? ev.position.x : 50;
                    const baseY = ev.position ? ev.position.y : 50;
                    
                    // Randomize slightly
                    const rx = (Math.random() - 0.5) * 10; 
                    const ry = (Math.random() - 0.5) * 10;

                    const left = baseX + rx;
                    const top = baseY + ry;

                    let color = 'text-white';
                    let scale = 1;
                    let text = ev.value;
                    let fontSize = 'text-base'; // Default size

                    if (ev.type === 'DAMAGE') { color = 'text-white'; scale = 1.0; fontSize = 'text-xl font-bold'; }
                    if (ev.type === 'CRIT') { color = 'text-yellow-400'; scale = 1.5; text = `Crit! ${ev.value}`; fontSize = 'text-2xl font-black'; }
                    if (ev.type === 'HEAL') { color = 'text-green-400'; }
                    if (ev.type === 'XP') { color = 'text-blue-400'; text = `+${ev.value} XP`; fontSize = 'text-xs'; }
                    if (ev.type === 'GOLD') { color = 'text-amber-400'; text = `+${ev.value} g`; fontSize = 'text-xs'; }
                    
                    // Override color if provided in event
                    if (ev.color) color = ev.color;

                    return (
                        <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 1, 0], y: -50, scale: scale }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", times: [0, 0.1, 0.7, 1] }}
                            className={`absolute font-mono pointer-events-none drop-shadow-md ${color} ${fontSize}`}
                            style={{ 
                                left: `${left}%`, 
                                top: `${top}%`, 
                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                // Center the element point
                                transform: 'translate(-50%, -50%)'
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
