import React from 'react';
import './AnimatedGradient.css';

const AnimatedGradient = ({
    enabled = true,
    gradientColors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    animationSpeed = 10,
    type = 'morphing' // 'morphing' | 'shimmer' | 'pulse'
}) => {
    if (!enabled) return null;

    const gradientStyle = {
        '--gradient-1': gradientColors[0] || '#667eea',
        '--gradient-2': gradientColors[1] || '#764ba2',
        '--gradient-3': gradientColors[2] || '#f093fb',
        '--gradient-4': gradientColors[3] || '#4facfe',
        '--animation-speed': `${animationSpeed}s`
    };

    return (
        <div
            className={`animated-gradient animated-gradient--${type}`}
            style={gradientStyle}
        >
            <div className="gradient-blob blob-1"></div>
            <div className="gradient-blob blob-2"></div>
            <div className="gradient-blob blob-3"></div>
            <div className="gradient-blob blob-4"></div>
        </div>
    );
};

export default AnimatedGradient;
