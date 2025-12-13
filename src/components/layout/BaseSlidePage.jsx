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
    const wrapperRef = useRef(null);
    const [scrollContainer, setScrollContainer] = useState(null);
    const manualScrollProgress = useMotionValue(0);

    // Find parent scrollable container
    useEffect(() => {
        if (wrapperRef.current) {
            let parent = wrapperRef.current.parentElement;
            while (parent) {
                const overflowY = window.getComputedStyle(parent).overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                    console.log('[BaseSlidePage] Found scroll container:', parent);
                    setScrollContainer(parent);
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }, []);

    // Manual scroll tracking for containers that don't work with useScroll
    useEffect(() => {
        if (!scrollContainer || !wrapperRef.current) return;

        const handleScroll = () => {
            const container = scrollContainer;
            const wrapper = wrapperRef.current;

            const containerRect = container.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();

            // Calculate progress based on wrapper position relative to container
            const containerHeight = containerRect.height;
            const wrapperHeight = wrapperRect.height;

            // How far the wrapper has scrolled relative to container top
            const scrolled = containerRect.top - wrapperRect.top;

            // Total scrollable distance
            const totalScroll = wrapperHeight - containerHeight;

            // Calculate progress (0 to 1)
            const progress = Math.max(0, Math.min(1, scrolled / totalScroll));

            manualScrollProgress.set(progress);

            if (animationType === 'zoom-out') {
                console.log('[BaseSlidePage] Manual scroll progress:', progress.toFixed(3));
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial call

        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [scrollContainer, animationType, manualScrollProgress]);

    // Use manual scroll progress if container found, otherwise use useScroll
    const { scrollYProgress: autoScrollProgress } = useScroll({
        target: wrapperRef,
        offset: ["start end", "end start"]
    });

    const scrollYProgress = scrollContainer ? manualScrollProgress : autoScrollProgress;

    // Zoom-out animation: Phase 1 (0 → 0.5) scale down, Phase 2 (0.5 → 1) overlay
    // Overlay animation: Immediate overlay (no scale)
    const isZoomOut = animationType === 'zoom-out';

    const coverScale = useTransform(
        scrollYProgress,
        isZoomOut ? [0, 0.5] : [0, 1],
        isZoomOut ? [1, 0.5] : [1, 1]
    );
    const coverY = useTransform(
        scrollYProgress,
        isZoomOut ? [0, 0.5] : [0, 1],
        isZoomOut ? [0, -100] : [0, 0]
    );
    const coverOpacity = useTransform(
        scrollYProgress,
        isZoomOut ? [0, 0.4, 0.5] : [0, 0.3, 1],
        isZoomOut ? [1, 0.9, 0.85] : [1, 0.95, 0.95]
    );

    // Scroll indicator fade out
    const indicatorOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    // Detail section: zoom-out starts at 0.5, overlay starts at 0
    const detailY = useTransform(
        scrollYProgress,
        isZoomOut ? [0.5, 1] : [0, 1],
        ['100vh', '0vh']
    );

    return (
        <div className="base-page-wrapper" ref={wrapperRef}>
            {/* Cover Section - Sticky with scale/position effects */}
            <section className="cover-section-sticky">
                <motion.div
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
