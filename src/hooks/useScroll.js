import { useState, useEffect } from 'react';

export const useScroll = (threshold = 100) => {
    const [scrolled, setScrolled] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrollY(currentScrollY);
            setScrolled(currentScrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    return { scrolled, scrollY };
};
