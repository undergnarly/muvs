import { motion, useInView } from 'framer-motion';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ReleaseDetails from '../media/ReleaseDetails';
import './ReleaseSlide.css';

const ReleaseSlide = ({ release }) => {
    const CoverContent = (
        <div className="release-cover-container">
            {/* Background title text - BEFORE wrapper so z-index works */}
            <motion.div
                className="release-title-background"
                style={{ top: release.textTopPosition || '20%' }}
                initial={{ opacity: 0, scale: 0.95 }}
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

            {/* Cover image with transparency effect */}
            <motion.div
                className="release-cover-wrapper"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
                <div className="cover-placeholder">
                    {release.coverImage ? (
                        <img src={release.coverImage} alt={`Cover for ${release.title}`} className="release-cover-img" />
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
                {/* Artist name removed to avoid hardcoding */}
            </motion.div>

            {/* SoundCloud Player (moved from details) */}
            {release.soundcloudUrl ? (
                <div style={{ width: '100%', maxHeight: '30vh', marginTop: '24px', zIndex: 10 }}>
                    <iframe
                        width="100%"
                        height="300"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(release.soundcloudUrl)}&color=%23ccff00&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`}
                        style={{ borderRadius: '8px' }}
                    ></iframe>
                </div>
            ) : null}
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<ReleaseDetails release={release} />}
        />
    );
};

export default ReleaseSlide;
