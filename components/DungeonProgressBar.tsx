
import React, { useEffect, useRef } from 'react';

interface DungeonProgressBarProps {
    startTime: number;
    duration: number;
    isAutoRepeat: boolean;
}

export const DungeonProgressBar: React.FC<DungeonProgressBarProps> = ({ startTime, duration, isAutoRepeat }) => {
    const barRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            if (barRef.current) {
                const now = Date.now();
                const elapsed = now - startTime;
                // Allow it to go slightly past 100% to avoid visual jitter before the logic tick catches up
                const percent = Math.min(100, (elapsed / duration) * 100);
                
                barRef.current.style.width = `${percent}%`;
            }
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [startTime, duration]);

    return (
        <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/30 w-full pointer-events-none">
            <div 
                ref={barRef}
                className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                style={{ width: '0%' }}
            ></div>
        </div>
    );
};
