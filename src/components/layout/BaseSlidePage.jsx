import React, { useRef, useEffect } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
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
    const scrollProgress = useMotionValue(0);

    const isZoomOut = animationType === 'zoom-out';

    // Manual scroll tracking for nested scroll container
    useEffect(() => {
        if (!containerRef.current) return;

        // Find parent scroll container (SlideContainer)
        let scroller = null;
        let parent = containerRef.current.parentElement;

        while (parent && parent !== document.body) {
            const overflowY = window.getComputedStyle(parent).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                scroller = parent;
                break;
            }
            parent = parent.parentElement;
        }

        if (!scroller) {
            console.warn('[BaseSlidePage] No scroll container found');
            return;
        }

        const section = containerRef.current;
        let maxScrollReached = false;

        const handleScroll = () => {
            const scrollTop = scroller.scrollTop;
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const containerHeight = scroller.clientHeight;

            // Calculate progress from 0 to 1
            const start = sectionTop;
            const end = sectionTop + sectionHeight - containerHeight;
            const scrollDistance = end - start;

            const progress = scrollDistance > 0
                ? Math.max(0, Math.min(1, (scrollTop - start) / scrollDistance))
                : 0;

            scrollProgress.set(progress);

            // Debug logging
            console.log('[Scroll Debug]', {
                scrollTop: Math.round(scrollTop),
                sectionTop: Math.round(sectionTop),
                sectionHeight: Math.round(sectionHeight),
                containerHeight: Math.round(containerHeight),
                scrollDistance: Math.round(scrollDistance),
                progress: progress.toFixed(3),
                detailTransform: `${Math.round(progress * -10)}vh`
            });
        };

        scroller.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call

        return () => {
            scroller.removeEventListener('scroll', handleScroll);
        };
    }, [scrollProgress]);

    // Zoom effect: scale down from 1 to 0.5
    const coverScale = useTransform(
        scrollProgress,
        [0, 1],
        isZoomOut ? [1, 0.5] : [1, 1]
    );

    // Horizon effect: image up, text down
    const coverImageY = useTransform(
        scrollProgress,
        [0, 1],
        isZoomOut ? [0, -100] : [0, 0]
    );
    const coverTextY = useTransform(
        scrollProgress,
        [0, 1],
        isZoomOut ? [0, 50] : [0, 0]
    );

    // Fade slightly
    const coverOpacity = useTransform(
        scrollProgress,
        [0, 1],
        [1, 0.85]
    );

    // Scroll indicator fade out
    const indicatorOpacity = useTransform(scrollProgress, [0, 0.2], [1, 0]);

    // Detail section overlay - starts immediately and moves up
    const detailY = useTransform(
        scrollProgress,
        [0, 1],
        ['0vh', '-10vh']
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
