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
    const coverRef = useRef(null);

    // Simple scroll tracking - track cover section as it scrolls out of view
    const { scrollYProgress } = useScroll({
        target: coverRef,
        offset: ["start start", "end start"]
    });

    // Simple animations based on scroll progress (0 = top, 1 = scrolled past)
    const isZoomOut = animationType === 'zoom-out';

    // Zoom effect: scale down as cover scrolls up
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

    // Fade out as cover leaves viewport
    const coverOpacity = useTransform(
        scrollYProgress,
        [0, 0.8, 1],
        [1, 0.95, 0.85]
    );

    // Scroll indicator fade out quickly
    const indicatorOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        <div className="base-page-wrapper">
            {/* Cover Section - Fixed, stays on screen while detail scrolls over */}
            <section className="cover-section-fixed" ref={coverRef}>
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
            </section>

            {/* Detail Section - Normal flow, scrolls naturally */}
            <section className="detail-section-standard">
                {detailContent}
            </section>
        </div>
    );
};

export default BaseSlidePage;
