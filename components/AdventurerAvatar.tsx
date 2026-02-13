
import React from 'react';
import { Adventurer, AdventurerRole } from '../types';

interface AdventurerAvatarProps {
    adventurer: Adventurer;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    isBusy?: boolean;
    isDead?: boolean; // For future use or if HP is 0
}

export const AdventurerAvatar: React.FC<AdventurerAvatarProps> = ({ adventurer, size = 'md', className = "", isBusy, isDead }) => {
    // Generate a consistent seed based on ID
    const seed = adventurer.id;
    const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    const roleColors = {
        [AdventurerRole.WARRIOR]: 'border-red-900 bg-red-950/30 shadow-red-900/20',
        [AdventurerRole.ROGUE]: 'border-emerald-900 bg-emerald-950/30 shadow-emerald-900/20',
        [AdventurerRole.MAGE]: 'border-blue-900 bg-blue-950/30 shadow-blue-900/20',
    };

    const glowColors = {
        [AdventurerRole.WARRIOR]: 'shadow-[0_0_10px_rgba(127,29,29,0.5)]',
        [AdventurerRole.ROGUE]: 'shadow-[0_0_10px_rgba(6,78,59,0.5)]',
        [AdventurerRole.MAGE]: 'shadow-[0_0_10px_rgba(30,58,138,0.5)]',
    };

    return (
        <div className={`relative group ${sizeClasses[size]} ${className}`}>
            {/* Frame */}
            <div className={`
                absolute inset-0 rounded-lg border-2 z-10 overflow-hidden transition-all duration-300
                ${roleColors[adventurer.role]}
                ${glowColors[adventurer.role]}
                ${isBusy ? 'opacity-50 grayscale' : ''}
            `}>
                {/* Background Tint */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
            </div>

            {/* Avatar Image */}
            <img 
                src={url} 
                alt={adventurer.name} 
                className={`
                    w-full h-full object-cover rounded-lg transform transition-transform duration-500 group-hover:scale-110
                    ${isDead ? 'grayscale blur-sm' : 'contrast-125 saturate-50 sepia-[0.3]'} 
                `} 
            />

            {/* Role Icon Badge (Tiny) */}
            <div className={`
                absolute -bottom-1 -right-1 z-20 w-3 h-3 rounded-full border border-black
                ${adventurer.role === AdventurerRole.WARRIOR ? 'bg-red-500' : adventurer.role === AdventurerRole.ROGUE ? 'bg-emerald-500' : 'bg-blue-500'}
            `}></div>
        </div>
    );
};
