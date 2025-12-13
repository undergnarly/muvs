import React, { useRef, useEffect } from 'react';
import { motion, useScroll as useFramerScroll, useTransform, useSpring } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import './BaseSlidePage.css';

const BaseSlidePage = ({ coverContent, detailContent, theme = 'light', textColor = 'white' }) => {
    const containerRef = useRef(null);

    // Parallax or color transition logic can go here
    // For now, we rely on CSS for background transitions mostly, 
    // but we can trigger state changes if needed.

    return (
        <div className={`base-page ${theme}`} ref={containerRef}>
            <section className="slide-section cover-section">
                {coverContent}

                <div className="scroll-indicator-wrapper">
                    <span className="scroll-text" style={{ color: textColor }}>Check it out!</span>
                    <div className="scroll-arrow" style={{ color: textColor }}>
                        <BiChevronDown size={32} />
                    </div>
                </div>
            </section>

            <section className="slide-section detail-section">
                {detailContent}
            </section>
        </div>
    );
};

export default BaseSlidePage;
