import React from 'react';
import { motion } from 'framer-motion';
import BaseSlidePage from '../layout/BaseSlidePage';
import MixDetails from '../media/MixDetails';
import './MixSlide.css';

const MixSlide = ({ mix }) => {
    const CoverContent = (
        <div className="mix-cover-container">
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

            <motion.div
                className="mix-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                <h1 className="mix-main-title">{mix.title}</h1>
            </motion.div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<MixDetails mix={mix} />}
        />
    );
};

export default MixSlide;
