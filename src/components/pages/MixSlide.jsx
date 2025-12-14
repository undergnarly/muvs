import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import BaseSlidePage from '../layout/BaseSlidePage';
import MixDetails from '../media/MixDetails';
import './MixSlide.css';

const MixSlide = ({ mix, priority = false }) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const parallaxStrength = mix.parallaxStrength || 100;
    const yParallax = useTransform(scrollYProgress, [0, 1], [0, parallaxStrength]);

    const CoverContent = () => (
        <div className="mix-cover-container">
            {/* Background title text */}
            <motion.div
                data-cover-text
                className="mix-title-background"
                style={{
                    top: mix.textTopPosition || '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: mix.titleGap || '0px'
                }}
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <h1
                    className="mix-title-text"
                    style={{ fontSize: mix.titleFontSize || 'min(24vw, 120px)' }}
                >
                    {mix.title}
                </h1>
            </motion.div>

            {/* Cover image wrapper (constrained width) */}
            <motion.div
                data-cover-image
                className="mix-cover-wrapper"
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: priority ? 0 : 0.2 }}
            >
                {mix.backgroundImage && (
                    <div className="mix-image-placeholder">
                        <img
                            src={mix.backgroundImage}
                            alt="Mix background"
                            loading={priority ? "eager" : "lazy"}
                            fetchPriority={priority ? "high" : "auto"}
                            decoding="async"
                        />
                    </div>
                )}
            </motion.div>

            <motion.div
                className="mix-player-wrapper"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <iframe
                    width="100%"
                    height="166"
                    scrolling="no"
                    frameBorder="no"
                    allow="autoplay"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(mix.soundcloudUrl)}&color=%23ccff00&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
                    style={{ borderRadius: '12px' }}
                ></iframe>
            </motion.div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<MixDetails mix={mix} />}
            textColor="black"
            animationType="zoom-out"
        />
    );
};

export default MixSlide;
