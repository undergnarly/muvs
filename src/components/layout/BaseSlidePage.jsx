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
    const [scrollContainer, setScrollContainer] = useState(null);

    const manualProgress = useMotionValue(0);

    // Find parent scrollable container and track scroll manually
    useEffect(() => {
        if (!scrollSectionRef.current) return;

        let container = null;
        let parent = scrollSectionRef.current.parentElement;

        // Find scrollable parent
        while (parent && parent !== document.body) {
            const overflowY = window.getComputedStyle(parent).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                container = parent;
                console.log('[BaseSlidePage] Found scroll container:', parent.className);
                break;
            }
            parent = parent.parentElement;
        }

        if (!container) {
            console.log('[BaseSlidePage] No scroll container, using window scroll');
            return;
        }

        const section = scrollSectionRef.current;
        setScrollContainer(container);

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const containerHeight = container.clientHeight;

            // Calculate when section passes through viewport
            // Progress 0 = section top at container top
            // Progress 1 = section bottom at container top
            const start = sectionTop;
            const end = sectionTop + sectionHeight - containerHeight;
            const scrollDistance = end - start;

            const progress = scrollDistance > 0
                ? Math.max(0, Math.min(1, (scrollTop - start) / scrollDistance))
                : 0;

            manualProgress.set(progress);
            console.log('[BaseSlidePage] Manual progress:', progress.toFixed(3));
        };

        container.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial call

        return () => container.removeEventListener('scroll', handleScroll);
    }, [manualProgress]);

    // Use manual progress if container found, otherwise use standard useScroll
    const { scrollYProgress: autoProgress } = useScroll({
        target: scrollSectionRef,
        offset: ["start start", "end start"]
    });

    const scrollYProgress = scrollContainer ? manualProgress : autoProgress;

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

    // Detail section overlay effect - starts at 0.1 for all pages
    const overlayStart = 0.1;
    const detailY = useTransform(
        scrollYProgress,
        [0, overlayStart, 1],
        ['0vh', '0vh', '-100vh']
    );

    // Adjust scroll section height based on animation type
    // Reduced heights to prevent overscroll
    const scrollSectionHeight = isZoomOut ? '150vh' : '110vh';

    return (
        <>
            {/* Scroll section - creates scroll space for animation */}
            <div className="scroll-section" ref={scrollSectionRef} style={{ height: scrollSectionHeight }}>
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
