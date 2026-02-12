import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ReleaseDetails from '../media/ReleaseDetails';
import PulsingPlayButton from '../media/PulsingPlayButton';
import './ReleaseSlide.css';

const ReleaseSlide = ({ release, priority = false, allReleases, onNavigate, currentIndex }) => {
    const titleRef = useRef(null);
    const coverRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: titleRef,
        offset: ["start end", "end start"]
    });

    // Bass-reactive state — applied directly via ref for 60fps performance
    const handleBassUpdate = useCallback(({ scale, bright, contrast, tx, ty }) => {
        if (!coverRef.current) return;
        coverRef.current.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
        coverRef.current.style.filter = `brightness(${bright}) contrast(${contrast})`;
    }, []);

    // Parallax strength from release settings or default
    const parallaxStrength = release.parallaxStrength || 100;
    const yParallax = useTransform(scrollYProgress, [0, 1], [-parallaxStrength, parallaxStrength]);

    const bassEnabled = release.bassReactive !== false; // enabled by default

    const CoverContent = ({ coverTextY, coverImageY }) => (
        <div className="release-cover-container">
            {/* Background title text */}
            <motion.div
                ref={titleRef}
                className="release-title-background"
                style={{
                    top: release.textTopPosition || '20%',
                    x: '-50%',
                    y: coverTextY || yParallax,
                    gap: release.titleGap || '0px'
                }}
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {release.artists && (
                    <h2
                        className="title-background-artists"
                        style={{ fontSize: release.artistFontSize || 'min(12vw, 60px)' }}
                    >
                        {release.artists}
                    </h2>
                )}
                <h1
                    className="title-background-text"
                    style={{ fontSize: release.titleFontSize || 'min(24vw, 120px)' }}
                >
                    {release.title}
                </h1>
            </motion.div>

            {/* Cover image with bass-reactive transforms */}
            <motion.div
                className="release-cover-wrapper"
                style={{
                    y: coverImageY || 0
                }}
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: priority ? 0 : 0.2 }}
            >
                <div className="cover-placeholder" ref={coverRef}>
                    {release.coverImage ? (
                        <img
                            src={release.coverImage}
                            alt={`Cover for ${release.title}`}
                            className="release-cover-img"
                            loading={priority ? "eager" : "lazy"}
                            fetchPriority={priority ? "high" : "auto"}
                            decoding="async"
                        />
                    ) : (
                        <div className="mock-cover">
                            <span>{release.title}</span>
                        </div>
                    )}
                </div>
            </motion.div>

            <motion.div
                className="release-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
            </motion.div>

            <motion.div
                className="release-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
            </motion.div>

            {/* Pulsing Play Button with bass reactor */}
            <PulsingPlayButton
                audioUrl={release.audioPreview}
                bpm={release.bpm}
                onBassUpdate={bassEnabled ? handleBassUpdate : undefined}
                bassIntensity={release.bassIntensity || 5}
            />
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<ReleaseDetails release={release} allReleases={allReleases} onNavigate={onNavigate} />}
            textColor="black"
            animationType="zoom-out"
            zoomOutMax={release.zoomOutMax}
            textParallaxY={release.textParallaxY}
            imageParallaxY={release.imageParallaxY}
        />
    );
};

export default ReleaseSlide;
