import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BiChevronDown } from 'react-icons/bi';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './BaseSlidePage.css';

gsap.registerPlugin(ScrollTrigger);

const BaseSlidePage = ({
    coverContent,
    detailContent,
    theme = 'light',
    textColor = 'white',
    animationType = 'overlay' // 'zoom-out' | 'overlay'
}) => {
    const containerRef = useRef(null);
    const coverWrapperRef = useRef(null);
    const detailRef = useRef(null);
    const indicatorRef = useRef(null);

    const isZoomOut = animationType === 'zoom-out';

    useEffect(() => {
        if (!containerRef.current) return;

        // Find parent scrollable container
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

        const scrollerElement = scroller || window;

        // Create GSAP timeline
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
                scroller: scrollerElement,
                // markers: true, // Uncomment for debugging
            }
        });

        // Animate scroll indicator fade out first (0-20%)
        tl.to(indicatorRef.current, {
            opacity: 0,
            duration: 0.2,
            ease: 'none'
        }, 0);

        if (isZoomOut) {
            // Zoom-out animation: scale down to 0.5 (0-100%)
            tl.to(coverWrapperRef.current, {
                scale: 0.5,
                opacity: 0.85,
                duration: 1,
                ease: 'none'
            }, 0);

            // Horizon effect for nested elements
            // Target specific child elements with data attributes
            const imageElements = coverWrapperRef.current.querySelectorAll('[data-cover-image]');
            const textElements = coverWrapperRef.current.querySelectorAll('[data-cover-text]');

            imageElements.forEach(el => {
                tl.to(el, {
                    y: -100,
                    duration: 1,
                    ease: 'none'
                }, 0);
            });

            textElements.forEach(el => {
                tl.to(el, {
                    y: 50,
                    duration: 1,
                    ease: 'none'
                }, 0);
            });
        }

        // Detail section overlay (starts at 10% progress)
        tl.to(detailRef.current, {
            y: '-100vh',
            duration: 0.9,
            ease: 'none'
        }, 0.1);

        return () => {
            tl.kill();
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, [isZoomOut]);

    return (
        <>
            {/* Main container for ScrollTrigger */}
            <div className="scroll-section" ref={containerRef}>
                {/* Sticky container - pins to top while scroll section scrolls */}
                <div className="sticky-container">
                    <motion.div
                        ref={coverWrapperRef}
                        className="cover-content-wrapper"
                        initial={{ opacity: 1, scale: 1 }}
                    >
                        {typeof coverContent === 'function'
                            ? coverContent({})
                            : coverContent}
                    </motion.div>

                    <div
                        ref={indicatorRef}
                        className="scroll-indicator-wrapper"
                    >
                        <span className="scroll-text" style={{ color: textColor }}>Check it out!</span>
                        <div className="scroll-arrow" style={{ color: textColor }}>
                            <BiChevronDown size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Section - Normal flow after scroll section */}
            <section
                ref={detailRef}
                className="detail-section-flow"
            >
                {detailContent}
            </section>
        </>
    );
};

export default BaseSlidePage;
