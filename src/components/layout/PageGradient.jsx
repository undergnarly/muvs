import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PageGradient.css';

const PageGradient = () => {
    const location = useLocation();

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

    return null;
};

export default PageGradient;
