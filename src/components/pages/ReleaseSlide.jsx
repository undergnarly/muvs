import { motion, useInView } from 'framer-motion';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ReleaseDetails from '../media/ReleaseDetails';
import PulsingPlayButton from '../media/PulsingPlayButton';
import './ReleaseSlide.css';

const ReleaseSlide = ({ release }) => {
    const CoverContent = (
        <div className="release-cover-container">
            {/* Background title text - BEFORE wrapper so z-index works */}
            <motion.div
                className="release-title-background"
                style={{
                    top: release.textTopPosition || '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: release.titleGap || '0px'
                }}
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

            <motion.div
                className="release-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                {/* Artist name removed to avoid hardcoding */}
            </motion.div>

            {/* Pulsing Play Button Overlay */}
            <PulsingPlayButton audioUrl={release.audioPreview} bpm={release.bpm} />
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<ReleaseDetails release={release} />}
            textColor="black"
        />
    );
};

export default ReleaseSlide;
