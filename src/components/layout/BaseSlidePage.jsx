import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import './BaseSlidePage.css';

const BaseSlidePage = ({
    coverContent,
    detailContent,
    textColor = 'white',
    // animationType prop is kept for API compatibility but we stick to one robust effect now
}) => {
    const { scrollY } = useScroll();

    // Animations drive by global scroll position
    // We animate over the first 100vh (approx 800-1000px)
    const scrollRange = [0, 800];

    // Zoom effect: scale down more dramatically to create depth
    const coverScale = useTransform(scrollY, scrollRange, [1, 0.5]);

    // Parallax text: Move text down faster than background
    const coverTextY = useTransform(scrollY, scrollRange, [0, 300]);
    const coverImageY = useTransform(scrollY, scrollRange, [0, 100]);

    // Fade out cover as it gets covered
    const coverOpacity = useTransform(scrollY, scrollRange, [1, 0.2]);

    // Scroll indicator fades out quickly
    const indicatorOpacity = useTransform(scrollY, [0, 100], [1, 0]);

    return (
        <div className="scroll-section">
            {/* Sticky Header Section */}
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

            {/* Scrolling Content Section - flows over the sticky header */}
            <div className="detail-section-flow">
                {detailContent}
            </div>
        </div>
    );
};

export default BaseSlidePage;
