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

        // Randomize each blob with smooth random movement
        return baseBlobs.map((blob, i) => {
            const random1 = seededRandom(randomSeed + i);
            const random2 = seededRandom(randomSeed + i + 100);
            const random3 = seededRandom(randomSeed + i + 200);
            const random4 = seededRandom(randomSeed + i + 300);
            const random5 = seededRandom(randomSeed + i + 400);

            // Size variation: 40% to 120% of base blob size (more subtle)
            const sizeMultiplier = 0.4 + random1 * 0.8;
            const finalSize = blob.size * sizeMultiplier * (blobSize / 50);

            // More random position offsets - can place anywhere on screen
            const top = blob.top !== undefined ? (random2 * 80 - 20) : undefined; // -20% to 60%
            const bottom = blob.bottom !== undefined ? (random2 * 80 - 20) : undefined;
            const left = blob.left !== undefined ? (random3 * 80 - 20) : undefined; // -20% to 60%
            const right = blob.right !== undefined ? (random3 * 80 - 20) : undefined;

            // Random animation speed offset - more variation for smoother effect
            const speedOffset = (random4 - 0.5) * 6; // -3s to +3s

            // Random movement direction - larger range but smoother
            const translateX = (random2 - 0.5) * 150; // -75px to 75px
            const translateY = (random3 - 0.5) * 150; // -75px to 75px

            // Add phase offset for each blob to make movements less synchronized
            const phaseOffset = random5 * Math.PI * 2; // 0 to 2π

            return {
                size: finalSize,
                top,
                bottom,
                left,
                right,
                speedOffset,
                translateX,
                translateY,
                phaseOffset
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
                        '--speed-offset': `${blob.speedOffset}s`,
                        '--phase-offset': blob.phaseOffset || 0
                    }}
                />
            ))}
        </div>
    );
};

export default AnimatedGradient;

