import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import './BaseSlidePage.css';

const BaseSlidePage = ({
    coverContent,
    detailContent,
    theme = 'light',
    textColor = 'white',
    animationType = 'overlay' // 'zoom-out' | 'overlay'
}) => {
    const scrollSectionRef = useRef(null);

    // Track scroll progress of the scroll section (not window)
    const { scrollYProgress } = useScroll({
        target: scrollSectionRef,
        offset: ["start start", "end start"]
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

    return (
        <>
            {/* Scroll section - creates scroll space for animation */}
            <div className="scroll-section" ref={scrollSectionRef}>
                {/* Sticky container - pins to top while scroll section scrolls */}
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

            {/* Detail Section - Normal flow after scroll section */}
            <section className="detail-section-flow">
                {detailContent}
            </section>
        </>
    );
};

export default BaseSlidePage;
