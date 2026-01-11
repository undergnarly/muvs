import React, { useMemo } from 'react';
import './AnimatedGradient.css';

// Simple seeded random for consistency
const seededRandom = (seed) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
};

const AnimatedGradient = ({
    enabled = true,
    gradientColors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    animationSpeed = 10,
    opacity = 0.8,
    type = 'morphing',
    className = '',
    blobSize = 50, // Base size in percentage
    randomize = false, // Enable randomization
    randomSeed = Date.now() // Seed for randomization
}) => {
    if (!enabled) return null;

    // Generate random sizes and positions if randomization is enabled
    const blobs = useMemo(() => {
        const baseBlobs = [
            { size: 60, top: -20, left: -10 },
            { size: 50, bottom: -10, right: -10 },
            { size: 40, top: 40, left: 40 },
            { size: 45, top: 30, right: 20 }
        ];

        if (!randomize) {
            return baseBlobs.map((blob, i) => ({
                ...blob,
                size: blob.size * (blobSize / 50),
                speedOffset: 0,
                translateX: 0,
                translateY: 0
            }));
        }

        // Randomize each blob
        return baseBlobs.map((blob, i) => {
            const random1 = seededRandom(randomSeed + i);
            const random2 = seededRandom(randomSeed + i + 100);
            const random3 = seededRandom(randomSeed + i + 200);

            // Size variation: 50% to 150% of base blob size
            const sizeMultiplier = 0.5 + random1 * 1.0;
            const finalSize = blob.size * sizeMultiplier * (blobSize / 50);

            // Random position offsets
            const positionOffset = 30;
            const top = blob.top !== undefined ? blob.top + (random2 - 0.5) * positionOffset : undefined;
            const bottom = blob.bottom !== undefined ? blob.bottom + (random2 - 0.5) * positionOffset : undefined;
            const left = blob.left !== undefined ? blob.left + (random3 - 0.5) * positionOffset : undefined;
            const right = blob.right !== undefined ? blob.right + (random3 - 0.5) * positionOffset : undefined;

            // Random animation speed offset
            const speedOffset = (random1 - 0.5) * 4; // -2s to +2s

            // Random movement direction
            const translateX = (random2 - 0.5) * 100; // -50px to 50px
            const translateY = (random3 - 0.5) * 100; // -50px to 50px

            return {
                size: finalSize,
                top,
                bottom,
                left,
                right,
                speedOffset,
                translateX,
                translateY
            };
        });
    }, [blobSize, randomize, randomSeed]);

    const gradientStyle = {
        '--gradient-1': gradientColors[0] || '#667eea',
        '--gradient-2': gradientColors[1] || '#764ba2',
        '--gradient-3': gradientColors[2] || '#f093fb',
        '--gradient-4': gradientColors[3] || '#4facfe',
        '--animation-speed': `${animationSpeed}s`,
        '--gradient-opacity': opacity
    };

    return (
        <div
            className={`animated-gradient animated-gradient--${type} ${className}`}
            style={gradientStyle}
        >
            {blobs.map((blob, i) => (
                <div
                    key={i}
                    className="gradient-blob"
                    style={{
                        width: `${blob.size}%`,
                        height: `${blob.size}%`,
                        top: blob.top !== undefined ? `${blob.top}%` : undefined,
                        bottom: blob.bottom !== undefined ? `${blob.bottom}%` : undefined,
                        left: blob.left !== undefined ? `${blob.left}%` : undefined,
                        right: blob.right !== undefined ? `${blob.right}%` : undefined,
                        '--custom-x': `${blob.translateX}px`,
                        '--custom-y': `${blob.translateY}px`,
                        '--speed-offset': `${blob.speedOffset}s`
                    }}
                />
            ))}
        </div>
    );
};

export default AnimatedGradient;

