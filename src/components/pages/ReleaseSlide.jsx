import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Button from '../ui/Button';
import SoundCloudPlayer from '../media/SoundCloudPlayer';
import BaseSlidePage from '../layout/BaseSlidePage';
import ReleaseDetails from '../media/ReleaseDetails';
import './ReleaseSlide.css';

const ReleaseSlide = ({ release }) => {
    const CoverContent = (
        <div className="release-cover-container">
            <motion.div
                className="release-cover-wrapper"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="cover-placeholder">
                    {/* Mock image if no real one */}
                    {release.coverImage.startsWith('/images') ? (
                        <div className="mock-cover">
                            <span>{release.title}</span>
                            <span className="mock-label">ARTWORK</span>
                        </div>
                    ) : (
                        <img src={release.coverImage} alt={`Cover for ${release.title}`} className="release-cover-img" />
                    )}
                </div>
            </motion.div>

            <motion.div
                className="release-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                <h1 className="main-title">{release.title}</h1>
                <p className="main-artist">MUVS</p>
            </motion.div>

            <SoundCloudPlayer url={release.soundcloudUrl} />
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
