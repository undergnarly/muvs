import React from 'react';
import { useLocation } from 'react-router-dom';
import GradualBlur from '../ui/GradualBlur';
import './TopBlur.css';

const TopBlur = () => {
    const location = useLocation();

    // Don't show blur on admin pages or login
    if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
        return null;
    }

    return (
        <>
            <div className="top-blur-gradient" />
            <GradualBlur
                target="page"
                position="top"
                height="14vh"
                strength={2}
                divCount={5}
                curve="bezier"
                exponential={true}
                opacity={1}
                zIndex={1999}
            />
        </>
    );
};

export default TopBlur;
