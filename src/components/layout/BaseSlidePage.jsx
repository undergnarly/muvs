import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import { useData } from '../../context/DataContext';
import './BaseSlidePage.css';

const BaseSlidePage = ({
    coverContent,
    detailContent,
    textColor = 'white',
    zoomOutMax,
    textParallaxY,
    imageParallaxY,
}) => {
    const { siteSettings } = useData();
    const containerRef = useRef(null);

    // Use specific props if provided, otherwise global settings, otherwise hardcoded defaults
    const finalZoomOutMax = zoomOutMax ?? siteSettings?.scrollAnimation?.zoomOutMax ?? 0.5;
    const finalTextParallaxY = textParallaxY ?? siteSettings?.scrollAnimation?.textParallaxY ?? 300;
    const finalImageParallaxY = imageParallaxY ?? siteSettings?.scrollAnimation?.imageParallaxY ?? 100;
    const [scrollContainer, setScrollContainer] = React.useState(null);

    React.useLayoutEffect(() => {
        if (!containerRef.current) return;

        // Find nearest scrollable parent
        let parent = containerRef.current.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                setScrollContainer(parent);
                return;
            }
            parent = parent.parentElement;
        }
        // Fallback to window (standard behavior)
        setScrollContainer(document.body);
    }, []);

    const { scrollY } = useScroll({
        container: scrollContainer ? { current: scrollContainer } : undefined
    });

    // Animations drive by global scroll position
    // We animate over the first 100vh (approx 800-1000px)
    const scrollRange = [0, 800];

    // Zoom effect: scale down more dramatically to create depth
    const coverScale = useTransform(scrollY, scrollRange, [1, finalZoomOutMax]);

    // Parallax text: Move text down faster than background
    const coverTextY = useTransform(scrollY, scrollRange, [0, finalTextParallaxY]);
    const coverImageY = useTransform(scrollY, scrollRange, [0, finalImageParallaxY]);

    // Fade out cover as it gets covered
    const coverOpacity = useTransform(scrollY, scrollRange, [1, 0.2]);

    // Scroll indicator fades out quickly
    const indicatorOpacity = useTransform(scrollY, [0, 100], [1, 0]);

    return (
        <div className="scroll-section" ref={containerRef}>
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
                        ? coverContent({ coverTextY, coverImageY, coverScale, coverOpacity, scrollY })
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
