import React from 'react';
import { useLocation } from 'react-router-dom';
import './PageGradient.css';

const PageGradient = () => {
    const location = useLocation();

    // Don't show gradient on admin pages or login
    if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
        return null;
    }

    return <div className="page-top-gradient" />;
};

export default PageGradient;
