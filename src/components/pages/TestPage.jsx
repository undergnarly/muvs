import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Header from '../layout/Header';
import { useData } from '../../context/DataContext';
import './TestPage.css';

const TestPage = () => {
    const { releases } = useData();
    const containerRef = useRef(null);
    const release = releases[0] || {};

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Diminishing zoom - starts strong, then slows down
    // Using easeOut curve: scale goes 1 -> 0.6 but most change happens early
    const coverScale = useTransform(
        scrollYProgress,
        [0, 0.15, 0.3, 0.5, 1],
        [1, 0.85, 0.75, 0.68, 0.6]
    );

    // Image parallax - moves up as we scroll
    const coverY = useTransform(scrollYProgress, [0, 1], [0, -150]);

    // Title parallax
    const titleY = useTransform(scrollYProgress, [0, 1], [0, 200]);

    // Star Wars crawl text effect
    // Text starts invisible/below, then crawls up and "into" the screen
    const crawlY = useTransform(scrollYProgress, [0.1, 1], ['100%', '-100%']);
    const crawlOpacity = useTransform(scrollYProgress, [0.1, 0.2, 0.8, 1], [0, 1, 1, 0]);

    // Perspective rotation - text appears to be on a floor
    const crawlRotateX = useTransform(scrollYProgress, [0.1, 0.5], [60, 45]);

    // Counter-rotation for image - keeps it flat (no perspective distortion)
    const imageRotateX = useTransform(crawlRotateX, v => -v);

    return (
        <div className="test-page" ref={containerRef}>
            <Header />

            {/* Hero section - sticky background */}
            <div className="test-hero-sticky">
                <motion.div
                    className="test-hero-content"
                    style={{ scale: coverScale }}
                >
                    {/* Background title */}
                    <motion.div
                        className="test-title-bg"
                        style={{ y: titleY }}
                    >
                        <h2 className="test-artists">{release.artists || 'ARTIST'}</h2>
                        <h1 className="test-title">{release.title || 'TITLE'}</h1>
                    </motion.div>

                    {/* Cover image */}
                    <motion.div
                        className="test-cover-wrapper"
                        style={{ y: coverY }}
                    >
                        {release.coverImage && (
                            <img
                                src={release.coverImage}
                                alt={release.title}
                                className="test-cover-img"
                            />
                        )}
                    </motion.div>
                </motion.div>
            </div>

            {/* Star Wars crawl section */}
            <div className="test-crawl-section">
                <div className="test-crawl-perspective">
                    <motion.div
                        className="test-crawl-content"
                        style={{
                            y: crawlY,
                            opacity: crawlOpacity,
                            rotateX: crawlRotateX
                        }}
                    >
                        <div className="crawl-text">
                            {/* Cover image - NO perspective distortion, only scale */}
                            {release.coverImage && (
                                <motion.img
                                    src={release.coverImage}
                                    alt={release.title}
                                    className="crawl-cover-img"
                                    style={{ rotateX: imageRotateX }}
                                />
                            )}
                            <h2>EPISODE I</h2>
                            <h1>THE SONIC AWAKENING</h1>
                            <p>
                                In a galaxy far, far away, sound waves travel through the void of space,
                                carrying the echoes of ancient civilizations and the whispers of stars being born.
                            </p>
                            <p>
                                The rebel bass frequencies have escaped the imperial compression algorithms,
                                seeking refuge in the analog warmth of vintage synthesizers.
                            </p>
                            <p>
                                Meanwhile, the drum machines of the resistance continue their relentless rhythm,
                                a beacon of hope for all who seek the groove.
                            </p>
                            <p>
                                As the sub-bass trembles through the cosmos, a new era of sonic exploration begins.
                                The frequencies align, the waveforms harmonize, and the universe vibrates
                                with the eternal pulse of music.
                            </p>
                            <p>
                                This is the story of sound. This is the journey of vibration.
                                This is where silence ends and rhythm begins...
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* White floor continuation */}
            <div className="test-white-floor">
                <div className="floor-content">
                    <h2>The journey continues below...</h2>
                    <p>Scroll to explore more</p>
                </div>
            </div>
        </div>
    );
};

export default TestPage;
