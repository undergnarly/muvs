import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import AnimatedGradient from '../ui/AnimatedGradient';
import './PageGradient.css';

const PageGradient = () => {
    const location = useLocation();
    const { siteSettings } = useData();

    useEffect(() => {
        // Don't apply gradient on admin pages or login
        if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
            document.body.classList.remove('public-gradient');
            return;
        }

        document.body.classList.add('public-gradient');

        return () => {
            document.body.classList.remove('public-gradient');
        };
    }, [location.pathname]);

    const lightGradientSettings = siteSettings?.lightGradientSettings || {};

    // Don't render animated gradient on admin pages
    if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
        return null;
    }

    return (
        <AnimatedGradient
            enabled={lightGradientSettings.enabled ?? false}
            gradientColors={lightGradientSettings.colors}
            animationSpeed={lightGradientSettings.speed}
            opacity={lightGradientSettings.opacity ?? 0.3}
            type={lightGradientSettings.type}
            blobSize={lightGradientSettings.blobSize ?? 50}
            randomize={lightGradientSettings.randomize ?? false}
            randomSeed={lightGradientSettings.randomSeed}
            className="light-background-gradient"
        />
    );
};

export default PageGradient;
