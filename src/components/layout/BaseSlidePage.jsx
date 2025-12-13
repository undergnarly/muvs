import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import './BaseSlidePage.css';

const BaseSlidePage = ({ coverContent, detailContent, theme = 'light', textColor = 'white' }) => {
    const containerRef = useRef(null);
    const coverRef = useRef(null);

    // Track scroll progress of the entire page
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Phase 1 (0 → 0.5): Cover elements scale down and move up
    const coverScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.5]);
    const coverY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
    const coverOpacity = useTransform(scrollYProgress, [0, 0.4, 0.5], [1, 0.9, 0.85]);

    // Scroll indicator fade out
    const indicatorOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    // Phase 2 (0.5 → 1): Detail section slides up from bottom
    const detailY = useTransform(scrollYProgress, [0, 0.5, 1], ['100vh', '100vh', '0vh']);

    return (
        <div className="base-page-wrapper" ref={containerRef}>
            {/* Cover Section - Sticky with scale/position effects */}
            <section className="cover-section-sticky">
                <motion.div
                    ref={coverRef}
                    className="cover-content-wrapper"
                    style={{
                        scale: coverScale,
                        y: coverY,
                        opacity: coverOpacity
                    }}
                >
                    {coverContent}
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

            {/* Detail Section - Slides up from bottom */}
            <motion.section
                className="detail-section-overlay"
                style={{ y: detailY }}
            >
                {detailContent}
            </motion.section>
        </div>
    );
};

export default BaseSlidePage;
