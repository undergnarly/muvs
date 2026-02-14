import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Header from '../layout/Header';
import { useData } from '../../context/DataContext';
import './TestPage.css';

const TestPage = () => {
    const { releases } = useData();
    const containerRef = useRef(null);
    const release = releases?.[0] || {};

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // === COVER: moves up to horizon and shrinks (logarithmic) ===
    const coverY = useTransform(
        scrollYProgress,
        [0, 0.15, 0.25, 0.35],
        [0, -100, -180, -220]
    );
    const coverScale = useTransform(
        scrollYProgress,
        [0, 0.1, 0.2, 0.3, 0.4],
        [1, 0.6, 0.35, 0.15, 0]
    );

    // === CRAWL: appears from bottom, moves up to horizon ===
    const crawlY = useTransform(
        scrollYProgress,
        [0.25, 0.4, 0.6, 0.8, 1],
        [400, 200, 0, -200, -400]
    );
    const crawlScale = useTransform(
        scrollYProgress,
        [0.25, 0.5, 0.75, 1],
        [1.3, 1, 0.6, 0.2]
    );
    const crawlOpacity = useTransform(
        scrollYProgress,
        [0.25, 0.35, 0.9, 1],
        [0, 1, 1, 0]
    );

    return (
        <div className="test-page" ref={containerRef}>
            <Header />

            {/* Single fixed container with static background */}
            <div className="perspective-container">
                <div className="horizon-line" />

                {/* Cover image */}
                <motion.div
                    className="perspective-cover"
                    style={{
                        y: coverY,
                        scale: coverScale,
                    }}
                >
                    <div className="cover-title-bg">
                        <h2 className="cover-artists">{release.artists || 'ARTIST'}</h2>
                        <h1 className="cover-title">{release.title || 'TITLE'}</h1>
                    </div>
                    {release.coverImage && (
                        <img
                            src={release.coverImage}
                            alt={release.title}
                            className="cover-img"
                        />
                    )}
                </motion.div>

                {/* Star Wars crawl */}
                <motion.div
                    className="crawl-container"
                    style={{
                        y: crawlY,
                        scale: crawlScale,
                        opacity: crawlOpacity,
                        rotateX: 55,
                    }}
                >
                    <div className="crawl-text">
                        <h2>EPISODE I</h2>
                        <h1>THE SONIC AWAKENING</h1>
                        <p>
                            In a galaxy far, far away, sound waves travel through the void of space,
                            carrying the echoes of ancient civilizations.
                        </p>
                        <p>
                            The rebel bass frequencies have escaped the imperial compression,
                            seeking refuge in vintage synthesizers.
                        </p>
                        <p>
                            Meanwhile, the drum machines continue their relentless rhythm,
                            a beacon of hope for all who seek the groove.
                        </p>
                        <p>
                            This is the story of sound. This is the journey of vibration.
                            This is where silence ends and rhythm begins...
                        </p>
                    </div>
                </motion.div>

                {/* Horizon fade overlay */}
                <div className="horizon-fade" />
            </div>
        </div>
    );
};

export default TestPage;
