import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import './BaseSlidePage.css';

const BaseSlidePage = ({
    coverContent,
    detailContent,
    theme = 'light',
    textColor = 'white',
    animationType = 'overlay' // 'zoom-out' | 'overlay'
}) => {
    const containerRef = useRef(null);

    // Use Framer Motion useScroll - Lenis provides smooth scrolling
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end end']
    });

    const isZoomOut = animationType === 'zoom-out';

    // Zoom effect: scale down from 1 to 0.5
    const coverScale = useTransform(
        scrollYProgress,
        [0, 1],
        isZoomOut ? [1, 0.5] : [1, 1]
    );

    // Horizon effect: image up, text down
    const coverImageY = useTransform(
        scrollYProgress,
        [0, 1],
        isZoomOut ? [0, -100] : [0, 0]
    );
    const coverTextY = useTransform(
        scrollYProgress,
        [0, 1],
        isZoomOut ? [0, 50] : [0, 0]
    );

    // Fade slightly
    const coverOpacity = useTransform(
        scrollYProgress,
        [0, 1],
        [1, 0.85]
    );

    // Scroll indicator fade out
    const indicatorOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    // Detail section overlay - starts immediately and moves up
    const detailY = useTransform(
        scrollYProgress,
        [0, 1],
        ['0vh', '-100vh']
    );

    return (
        <>
            {/* Main container - creates scroll space */}
            <div className="scroll-section" ref={containerRef}>
                {/* Sticky container - stays fixed while scrolling */}
                <div className="sticky-container">
                    <motion.div
                        className="cover-content-wrapper"
                        style={{
                            scale: coverScale,
                            opacity: coverOpacity
                        }}
                    >
                        {typeof coverContent === 'function'
                            ? coverContent({ coverTextY, coverImageY })
                            : coverContent}
                    </motion.div>

                    <motion.div
                        className="scroll-indicator-wrapper"
                        style={{ opacity: indicatorOpacity }}
                    >
                        <span className="scroll-text" style={{ color: textColor }}>Check it out!</span>
                        <div className="scroll-arrow" style={{ color: textColor }}>
                            <BiChevronDown size={32} />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Detail Section - overlays from below */}
            <motion.section
                className="detail-section-flow"
                style={{
                    y: detailY
                }}
            >
                {detailContent}
            </motion.section>
        </>
    );
};

export default BaseSlidePage;
